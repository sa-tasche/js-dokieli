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

// this is one of the possibilities of highlight text (when creating a new annotation)
export function replaceSelectionWithDOMFragment(view, domFragment, options = {}) {
  const { state, dispatch } = view;
  const { selection, schema } = state;
  
  // Convert DOM fragment to a ProseMirror node
  let node = DOMParser.fromSchema(schema).parse(domFragment);

  // Apply the transformation to insert the node at selection
  let tr = state.tr.replaceSelectionWith(node);
  dispatch(tr);
}

//Input ProseMirror doc and selection from and to positions, and return HTML string including all nodes.
export function docSelectionToHtml(doc, from, to) {
  const selectedSlice = doc.slice(from, to);
  const serializer = DOMSerializer.fromSchema(doc.type.schema);
  const fragment = serializer.serializeFragment(selectedSlice.content);
  const selectedContent = new XMLSerializer().serializeToString(fragment);
  return selectedContent;
}