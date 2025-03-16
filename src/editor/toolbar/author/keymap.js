import { deleteSelection, splitBlock, newlineInCode, joinBackward } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { SlashMenu } from '../../slashMenu/slashMenu.js'

function customEnterCommand(state, dispatch) {
  const { selection } = state;
  const { $from, $to } = selection;

  const isCodeBlock = $from.node($from.depth).type.name === "pre";

  if (isCodeBlock && state.selection.empty) {
    return newlineInCode(state, dispatch);
  }
  else {
    return splitBlock(state, dispatch);
  }
}

function checkForSlashCommand(view) {
  const { selection } = view.state;
  const { $from } = selection;

  // text before cursor position within the node
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\n");
  const Slash = new SlashMenu('author', ['language', 'license', 'documentType', 'inbox', 'inReplyTo'], view);

  if (textBefore === "/") {
    const cursorCoords = $from.pos;
    const coords = view.coordsAtPos(cursorCoords);
console.log(coords)
    Slash.showMenu(coords.left, coords.bottom);
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
