import { deleteSelection, splitBlock, newlineInCode, joinBackward } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { SlashMenu } from "../../slashmenu/slashmenu.js";
import { TextSelection } from "prosemirror-state";
import { wrapInList } from "prosemirror-schema-list";

let backspaceCount = 0;
let Slash;

function customEnterCommand(state, dispatch) {
  const { selection } = state;
  const { $from } = selection;
  const { schema, tr } = state;

  let isCodeBlock = false;
  let isListItem = false;
  let listItemDepth = null;
  let node;

  for (let depth = $from.depth; depth > 0; depth--) {
    node = $from.node(depth);

    var nodeName = node.type.name.toLowerCase();

    if (nodeName === 'pre') {
      isCodeBlock = true;
      break;
    }
    else if (nodeName === 'li' || nodeName === 'dt' || nodeName === 'dd') {
      isListItem = true;
      listItemDepth = depth;
      break;
    }
  }

  if (isCodeBlock) {
    return newlineInCode(state, dispatch);
  }

  if (isListItem && listItemDepth !== null) {
    let liType = node.type;

    switch (node.type) {
      case "li":
        liType = node.type;
        break;
      case "dd": 
        liType = schema.nodes.dt;
        break;
      case "dt":
        liType = schema.nodes.dd;
        break;
    }

    const paragraphType = schema.nodes.p;

    const newListItem = liType.create(
      {}, 
      paragraphType.create()
    );

    const insertPos = $from.after(listItemDepth);

    tr.insert(insertPos, newListItem);

    dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + 2)));

    return true;
  }

  return splitBlock(state, dispatch);
}

function checkForSlashCommand(view) {
  const { selection } = view.state;
  const { $from } = selection;

  Slash = new SlashMenu(view);

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\n");

  const domNode = view.domAtPos($from.pos).node;

  if (textBefore === "/" || textBefore.substring(textBefore.length - 2) === " /") {
    //TODO: Perhaps checkForSlashCommand is called twice and domNode is defined (and with nodeType == 1 or 3) but when it is nodeType 3 it fails because of getBoundingClientRect
    console.log(domNode)

    if (!domNode && domNode.nodeType != 1) return;

    const rect = domNode.getBoundingClientRect();

    const cursorX = rect.left + window.scrollX;
    const cursorY = rect.top + window.scrollY;

    Slash.showMenu(cursorX, cursorY);
  }
  else {
    Slash.hideMenu();
  }
}


function customBackspaceCommand(state, dispatch) {
  const { selection } = state;
  const { $from } = selection;
  const { schema } = state;
  const listItemTypes = [schema.nodes.li, schema.nodes.dd, schema.nodes.dt];
  const listTypes = [schema.nodes.ul, schema.nodes.ol, schema.nodes.dl];
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\n");
  let node;

  if (textBefore === "/") {
    Slash.hideMenu()
  }

  if (!selection.empty) {
    return deleteSelection(state, dispatch);
  }

  let insideList = false;
  let listDepth = null;
  let parentList = null;
  let parentListPos = null;

  for (let depth = $from.depth; depth > 0; depth--) {
    node = $from.node(depth);
    if (listItemTypes.includes(node.type)) {
      insideList = true;
      listDepth = depth;
    }
    if (listTypes.includes(node.type)) {
      parentList = node;
      parentListPos = $from.before(depth);
      break;
    }
  }

  console.log(insideList, node.type, backspaceCount)

  if ($from.parentOffset === 0 && !insideList ||  backspaceCount === 1) {
    return joinBackward(state, dispatch);
  }
  
  if (insideList && $from.index(listDepth) === 1 && backspaceCount === 0) {
    backspaceCount += 1;
    if (dispatch) {
      let tr = state.tr;
      tr.lift($from.blockRange(), listDepth);
      dispatch(tr);
    }
    return true;
  }

  if (!insideList && parentList) {
    if (dispatch) {
      return wrapInList(parentList.type)(state, dispatch);
    }
    return true;
  }
  else {
    return joinBackward(state, dispatch);
  }
}

function customSlashCommand(state, dispatch, view) {
  setTimeout(() => checkForSlashCommand(view), 50);
  return false; 
}

export const keymapPlugin = keymap({
  "Backspace": customBackspaceCommand,
  "Enter": customEnterCommand,
  "/": (state, dispatch, view) => customSlashCommand(state, dispatch, view)
});
