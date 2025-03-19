import { deleteSelection, splitBlock, newlineInCode, joinBackward } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { SlashMenu } from "../../slashmenu/slashmenu.js";
import { TextSelection } from "prosemirror-state";

function customEnterCommand(state, dispatch) {
  const { selection } = state;
  const { $from } = selection;
  const { schema, tr } = state;

  let isCodeBlock = false;
  let isListItem = false;
  let listItemDepth = null;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "pre") {
      isCodeBlock = true;
      break;
    }
    if (node.type.name === "li") {
      isListItem = true;
      listItemDepth = depth;
      break;
    }
  }

  if (isCodeBlock) {
    return newlineInCode(state, dispatch);
  }
  if (isListItem && listItemDepth !== null) {
    const liType = schema.nodes.li;
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

  const Slash = new SlashMenu(view);

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\n");

  const domNode = view.domAtPos($from.pos).node;

  if (textBefore === "/" || textBefore.substring(textBefore.length - 2) === " /") {

    const rect = domNode.getBoundingClientRect();

    const cursorX = rect.left + window.scrollX;
    const cursorY = rect.top + window.scrollY;

    Slash.showMenu(cursorX, cursorY);
  } else {
    Slash.hideMenu();
  }
}

function customBackspaceCommand(state, dispatch) {
  const { $from } = state.selection;

  // if position of cursor within parent node is at beginning of paragraph
  if ($from.parentOffset === 0) {
    return joinBackward(state, dispatch);
  }
  else {
    return deleteSelection(state, dispatch);
  }
}

function customSlashCommand(state, dispatch, view) {
  setTimeout(() => checkForSlashCommand(view), 50); // delay to allow typing
  return false; 
}

export const keymapPlugin = keymap({
  "Backspace": customBackspaceCommand,
  "Enter": customEnterCommand,
  "/": (state, dispatch, view) => customSlashCommand(state, dispatch, view)
});
