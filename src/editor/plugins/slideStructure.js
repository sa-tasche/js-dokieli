/*!
Copyright 2012-2026 Sarven Capadisli <https://csarven.ca/>
Copyright 2023-2026 Virginia Balseiro <https://virginiabalseiro.com/>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Plugin } from "prosemirror-state";

function isSlideSection(node) {
  if (node.type.name !== "section") return false;
  const cls = node.attrs.originalAttributes?.class || "";
  return cls.split(/\s+/).includes("slide");
}

function findFirstHeadingIndex(section) {
  for (let i = 0; i < section.childCount; i++) {
    if (section.child(i).type.name === "heading") return i;
  }
  return -1;
}

function isNormalized(section) {
  const headingIdx = findFirstHeadingIndex(section);
  if (headingIdx === -1) return true;
  const after = section.childCount - headingIdx - 1;
  if (after === 0) return true;
  if (after === 1) return section.child(headingIdx + 1).type.name === "descriptionDiv";
  return false;
}

function buildNormalizedContent(section, schema) {
  const headingIdx = findFirstHeadingIndex(section);
  if (headingIdx === -1) return null;

  const head = [];
  for (let i = 0; i <= headingIdx; i++) head.push(section.child(i));

  let descAttrs = null;
  const descContent = [];
  for (let i = headingIdx + 1; i < section.childCount; i++) {
    const child = section.child(i);
    if (child.type.name === "descriptionDiv") {
      if (!descAttrs) descAttrs = child.attrs.originalAttributes || {};
      child.content.forEach((c) => descContent.push(c));
    } else {
      descContent.push(child);
    }
  }

  if (!descAttrs) {
    descAttrs = { datatype: "rdf:HTML", property: "schema:description" };
  }
  if (descContent.length === 0) {
    descContent.push(schema.nodes.p.create());
  }

  const descDiv = schema.nodes.descriptionDiv.create(
    { originalAttributes: descAttrs },
    descContent
  );

  return [...head, descDiv];
}

export const slideStructurePlugin = new Plugin({
  appendTransaction(transactions, oldState, newState) {
    if (!transactions.length) return null;

    const updates = [];
    newState.doc.descendants((node, pos) => {
      if (!isSlideSection(node)) return;
      if (isNormalized(node)) return;
      const next = buildNormalizedContent(node, newState.schema);
      if (!next) return;
      updates.push({ pos, node, next });
    });

    if (!updates.length) return null;

    let tr = newState.tr;
    for (let i = updates.length - 1; i >= 0; i--) {
      const { pos, node, next } = updates[i];
      const start = pos + 1;
      const end = pos + 1 + node.content.size;
      tr = tr.replaceWith(start, end, next);
    }

    tr.setMeta("addToHistory", false);
    return tr;
  },
});
