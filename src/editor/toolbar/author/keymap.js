import { deleteSelection, splitBlock, newlineInCode, joinBackward } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";

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

function showToolbar(view) {
  const toolbar = document.querySelector(".editor-toolbar");
  if (!toolbar) {
    console.warn("Toolbar element not found.");
    return;
  }

  const { state } = view;
  const { selection } = state;
  const { $from } = selection;

  // todo: find out why in some nodes it positions top of the node instead of near cursor
  // cursor coordinates
  const coords = view.coordsAtPos($from.pos);

  toolbar.style.position = "absolute";
  toolbar.style.left = `${coords.left}px`;
  toolbar.style.top = `${coords.top + 25}px`; 
  toolbar.classList.add("editor-toolbar-active");
}

function hideToolbar() {
  const toolbar = document.querySelector(".editor-toolbar");
  if (toolbar) {
    toolbar.classList.remove("editor-toolbar-active");
  }
}

function checkForSlashCommand(view) {
  const { selection } = view.state;
  const { $from } = selection;

  // text before cursor position within the node
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\n");

  if (textBefore === "/") {
    showToolbar(view);
  }
  else {
    hideToolbar();
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
