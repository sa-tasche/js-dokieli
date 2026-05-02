import { Plugin } from "prosemirror-state";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findFirstHeading(sectionNode) {
  let result = null;
  sectionNode.forEach((child, offset) => {
    if (result) return;
    if (child.type.name === "heading") {
      result = { node: child, offset };
    }
  });
  return result;
}

export const autoIdPlugin = new Plugin({
  appendTransaction(transactions, oldState, newState) {
    if (!transactions.length) return null;

    const usedIds = new Set();
    newState.doc.descendants((node) => {
      const id = node.attrs?.originalAttributes?.id;
      if (id) usedIds.add(id);
    });

    const updates = [];
    newState.doc.descendants((node, pos) => {
      if (node.type.name !== "section") return;
      const heading = findFirstHeading(node);
      if (!heading) return;

      const headingPos = pos + 1 + heading.offset;
      const headingEnd = headingPos + heading.node.nodeSize;
      const sel = newState.selection;
      // Wait until the user moves the cursor out of the heading.
      if (sel.from <= headingEnd - 1 && sel.to >= headingPos + 1) return;

      const text = heading.node.textContent.trim();
      if (!text) return;

      const slug = slugify(text);
      if (!slug) return;

      const currentAttrs = node.attrs.originalAttributes || {};
      const currentId = currentAttrs.id;
      if (currentId === slug) return;

      let finalSlug = slug;
      let n = 2;
      while (usedIds.has(finalSlug) && finalSlug !== currentId) {
        finalSlug = `${slug}-${n++}`;
      }
      if (finalSlug === currentId) return;

      updates.push({ pos, node, finalSlug, currentAttrs });
      if (currentId) usedIds.delete(currentId);
      usedIds.add(finalSlug);
    });

    if (!updates.length) return null;

    let tr = newState.tr;
    for (const { pos, node, finalSlug, currentAttrs } of updates) {
      const next = { ...currentAttrs, id: finalSlug };
      if (currentAttrs.resource === "#" + (currentAttrs.id || "")) {
        next.resource = "#" + finalSlug;
      }
      tr = tr.setNodeMarkup(pos, null, { ...node.attrs, originalAttributes: next });
    }

    tr.setMeta("addToHistory", false);
    return tr;
  }
});
