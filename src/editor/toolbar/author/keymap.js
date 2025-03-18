import { deleteSelection, splitBlock, newlineInCode, joinBackward } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { SlashMenu } from "../../slashmenu/slashmenu.js";

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

  const Slash = new SlashMenu(view);

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\n");
  console.log(textBefore);

  const domNode = view.domAtPos($from.pos).node;
  console.log(domNode)

  if (textBefore === "/" || textBefore.substring(textBefore.length - 2) === " /") {

    const rect = domNode.getBoundingClientRect();
    console.log("Bounding Rect: ", rect);

    const cursorX = rect.left + window.scrollX;
    const cursorY = rect.top + window.scrollY;

    console.log("Adjusted Position: ", cursorX, cursorY);

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
