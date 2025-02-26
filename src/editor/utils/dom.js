import { wrapIn } from "prosemirror-commands"
import { DOMParser, DOMSerializer } from "prosemirror-model";

// FIXME: wrapIn appears to not be applying attributes
export function toggleBlockquote(schema, attrs) {
  return (state, dispatch) => {
    const { nodes } = schema;
    const { $from } = state.selection;
    const nodeType = nodes.blockquote;
console.log(attrs)
    if ($from.node().type === nodeType) {
console.log(nodes.p)
      return wrapIn(nodes.p, attrs)(state, dispatch);
    }
    else {
console.log(nodeType)
      return wrapIn(nodeType, attrs)(state, dispatch);
    }
  };
}

//Input ProseMirror doc and selection from and to positions, and return HTML string including all nodes.
export function docSelectionToHtml(doc, from, to) {
  const selectedSlice = doc.slice(from, to);
  const serializer = DOMSerializer.fromSchema(doc.type.schema);
  const fragment = serializer.serializeFragment(selectedSlice.content);
  const selectedContent = new XMLSerializer().serializeToString(fragment);
  return selectedContent;
}