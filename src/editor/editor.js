import { EditorView } from "prosemirror-view";
import { DOMParser, DOMSerializer } from "prosemirror-model";
import { Plugin, EditorState } from "prosemirror-state"
import { schema } from "./schema/base.js"
import { keymapPlugin } from "./toolbar/author/keymap.js";
import { AuthorToolbar } from "./toolbar/author.js";
import { SocialToolbar } from "./toolbar/social.js";

var editorNode = document.body;
let editorMode = "social";
let view = null;
let socialToolbarView = null; // Initialize the toolbarView

const editorToolbarPlugin = new Plugin({
  view(editorView) {
    // Create new class to hold editor and internal state such as editorView, HTML Dom elements, commands

    console.log(editorView);

    let toolbarView = new AuthorToolbar('author', ['p', 'h1', 'h2', 'h3', 'h4', 'em', 'strong', 'a', 'img', 'ol', 'ul', 'pre', 'code', 'blockquote', 'q', 'math', 'sparkline', 'semantics', 'cite', 'note'], editorView);

    // Append DOM portion of toolbar to current editor.
    // editorView.dom.parentNode.appendChild(toolbarView.dom);

    // Return toolbar class. Caller will call its update method in every editor update.
    return toolbarView;
  }
});

function createEditor() {
  const state = EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(editorNode),
    plugins: [keymapPlugin, editorToolbarPlugin]
  });

  editorNode.innerHTML = ""; // Clear the editor node

  view = new EditorView(editorNode, { state, editable: () => true });
  console.log("Editor created. Mode:", editorMode);
}

function destroyEditor() {
  if (view) {
    console.log(view.state.doc.content);
    const content = DOMSerializer.fromSchema(schema).serializeFragment(view.state.doc.content);
    // const serializer = DOMSerializer.fromSchema(schema);

    // const fragment = serializer.serializeFragment(view.state.doc.content);

    // const htmlString = new XMLSerializer().serializeToString(fragment);
    // document.body.innerHTML = htmlString;

    view.destroy();
    view = null;
    //FIXME: DO NOT USE innerHTML
    document.body.innerHTML = new XMLSerializer().serializeToString(content);

    console.log("Editor destroyed. Mode:", editorMode);
  }
}

function createSocialToolbar() {
  // Create and initialize the SocialToolbar only when in social mode
  console.log("creating social toolbar")
  socialToolbarView = new SocialToolbar('social', ['highlight', 'share', 'approve', 'disapprove', 'specificity', 'bookmark', 'comment']);
  document.body.appendChild(socialToolbarView.dom); // idk why this is needed? or is it not?
  console.log("SocialToolbar created. Mode:", editorMode);
}

function destroySocialToolbar() {
  if (socialToolbarView) {
    socialToolbarView.destroy();
    socialToolbarView = null;
    console.log("SocialToolbar destroyed. Mode:", editorMode);
  }
}

//XXX: Temp
function XXXaddEditorModeToggle() {
  const editorModeToggle = document.createElement("button");
  editorModeToggle.textContent = "Edit";
  editorModeToggle.style.padding = "1em";
  editorModeToggle.style.fontWeight = "bold";
  editorModeToggle.style.fontSize = "1em";
  editorModeToggle.classList.add("do", "editor-mode-toggle");

  const topContainer = document.createElement("div");
  topContainer.style.position = "fixed";
  topContainer.style.top = "10px";
  topContainer.style.left = "50%";
  topContainer.style.transform = "translateX(-50%)";
  topContainer.style.zIndex = "1000"; 
  topContainer.appendChild(editorModeToggle);

  document.documentElement.prepend(topContainer);

  editorModeToggle.addEventListener("click", () => {
    console.log("Mode toggled");
    editorMode = editorMode === "social" ? "author" : "social";
    
    if (editorMode === "author") {
      // If in author mode, create the editor and remove toolbar
      destroySocialToolbar(); // social
      createEditor(); // pm
    }
    else {
      // If in social mode, create the toolbar and remove editor
      destroyEditor();
      createSocialToolbar(); // social
    }
  });
}

// Initialize editor and toolbar based on the default editor mode
function initializeEditor(mode) {
  switch(mode) {
    case 'author':
      createEditor();
      break;
    case 'social':
    default:
      createSocialToolbar();
      break;
  }
}

XXXaddEditorModeToggle();
initializeEditor(editorMode);
