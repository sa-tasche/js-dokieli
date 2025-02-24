import { EditorView } from "prosemirror-view";
import { DOMParser, DOMSerializer } from "prosemirror-model";
import { Plugin, EditorState } from "prosemirror-state"
import { schema } from "./schema/base.js"
import { keymapPlugin } from "./toolbar/author/keymap.js";
import { AuthorToolbar } from "./toolbar/author.js";
import { SocialToolbar } from "./toolbar/social.js";

// import { selectArticleNode } from '../doc.js'

export class Editor {
  constructor(mode, node) {
    this.mode = mode;
    //TODO: Look into replacing document.body with selectArticleNode(document) so that main > article, article, or body is used?
    this.node = node || document.body;
    this.editorView = null;
    this.socialToolbarView = null;
    this.authorToolbarView = null;
  }

  // Initialize editor and toolbar based on the default editor mode
  init(mode, node) {
    this.mode = mode || this.mode;
    this.node = node || this.node;
    switch (this.mode) {
      case 'author':
        this.destroySocialToolbar();
        this.createEditor(this.node);
        break;
      case 'social':
      default:
        this.destroyEditor();
        this.createSocialToolbar(this.node);
        break;
    }
  }

  //Creating a ProseMirror editor view at a specified this.node
  createEditor() {
    const editorToolbarPlugin = new Plugin({
      // this editorView is passed onto the Plugin - not this.editorView
      view(editorView) {
        // Create new class to hold editor and internal state such as editorView, HTML DOM elements, commands

        console.log(editorView);

        this.authorToolbarView = new AuthorToolbar('author', ['p', 'h1', 'h2', 'h3', 'h4', 'em', 'strong', 'a', 'img', 'ol', 'ul', 'pre', 'code', 'blockquote', 'q', 'math', 'sparkline', 'semantics', 'cite', 'note'], editorView);

        // Append DOM portion of toolbar to current editor.
        // editorView.dom.parentNode.appendChild(toolbarView.dom);

        // Return toolbar class. Caller will call its update method in every editor update.
        return this.authorToolbarView;
      }
    });

    const state = EditorState.create({
      doc: DOMParser.fromSchema(schema).parse(this.node),
      plugins: [keymapPlugin, editorToolbarPlugin]
    });

    this.node.replaceChildren();

    this.editorView = new EditorView(this.node, { state, editable: () => true });

    console.log("Editor created. Mode:", editorMode);
  }

  restoreSelection(mode) {
    const toolbarView = this.authorToolbarView || this.socialToolbarView;
    return toolbarView.restoreSelection()
  }

  destroyEditor() {
    if (this.editorView) {
      console.log(this.editorView.state.doc.content);
      const content = DOMSerializer.fromSchema(schema).serializeFragment(view.state.doc.content);
      // const serializer = DOMSerializer.fromSchema(schema);

      // const fragment = serializer.serializeFragment(view.state.doc.content);

      // const htmlString = new XMLSerializer().serializeToString(fragment);
      // document.body.innerHTML = htmlString;

      this.editorView.destroy();
      this.editorView = null;
      //FIXME: DO NOT USE innerHTML
      this.node.innerHTML = new XMLSerializer().serializeToString(content);
      //TODO: Test below for above.
      // document.body.replaceChildren(new DOMParser().parseFromString(content, "text/html").body);

      console.log("Editor destroyed. Mode:", this.mode);
    }
  }

  createSocialToolbar() {
    // Create and initialize the SocialToolbar only when in social mode
    console.log("creating social toolbar")
    this.socialToolbarView = new SocialToolbar('social', ['highlight', 'share', 'approve', 'disapprove', 'specificity', 'bookmark', 'comment']);
    document.body.appendChild(this.socialToolbarView.dom); // idk why this is needed? or is it not?
    console.log("SocialToolbar created. Mode:", this.mode);
  }

  destroySocialToolbar() {
    if (this.socialToolbarView) {
      this.socialToolbarView.destroy();
      this.socialToolbarView = null;
      console.log("SocialToolbar destroyed. Mode:", this.mode);
    }
  }
}
