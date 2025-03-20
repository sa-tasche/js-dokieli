import { getLanguageOptionsHTML, getLicenseOptionsHTML, getResourceTypeOptionsHTML, insertDocumentLevelHTML } from "../../doc.js";
import { Icon } from "../../ui/icons.js";
import { fragmentFromString } from "../../util.js";
import { getButtonHTML } from "../toolbar/toolbar.js";
import { formHandlerLanguage, formHandlerLicense, formHandlerInbox, formHandlerInReplyTo, formHandlerResourceType } from "./handlers.js";
import { TextSelection } from "prosemirror-state";
import { DOMParser } from "prosemirror-model";

export class SlashMenu {
  constructor(editorView) {
    this.editorView = editorView;
    this.menuContainer = document.createElement("div");
    this.menuContainer.id = 'document-slashmenu';
    this.menuContainer.classList.add("editor-slashmenu");
    this.menuContainer.style.display = "none";
    this.menuContainer.style.position = "absolute";

    const slashMenuButtonLabels = {
      'language': 'Language',
      'license': 'License',
      'inbox': 'Inbox',
      'in-reply-to': 'In reply to',
      'resource-type': 'Type',
    }

    this.slashMenuButtons = ['language', 'license', 'inbox', 'in-reply-to', 'resource-type'].map(button => ({
      button,
      dom: () => fragmentFromString(getButtonHTML(button, null, null, slashMenuButtonLabels[button])).firstChild,
    }));

    this.createMenuItems();

    this.formHandlerLanguage = formHandlerLanguage.bind(this);
    this.formHandlerLicense = formHandlerLicense.bind(this);
    this.formHandlerInbox = formHandlerInbox.bind(this);
    this.formHandlerInReplyTo = formHandlerInReplyTo.bind(this);
    this.formHandlerResourceType = formHandlerResourceType.bind(this);

    this.formEventListeners = {
      language: [ { event: 'submit', callback: this.formHandlerLanguage }, { event: 'click', callback: (e) => this.formClickHandler(e, 'language') } ],
      license: [ { event: 'submit', callback: this.formHandlerLicense }, { event: 'click', callback: (e) => this.formClickHandler(e, 'license') } ],
      inbox: [ { event: 'submit', callback: this.formHandlerInbox }, { event: 'click', callback: (e) => this.formClickHandler(e, 'inbox') } ],
      'in-reply-to': [ { event: 'submit', callback: this.formHandlerInReplyTo }, { event: 'click', callback: (e) => this.formClickHandler(e, 'in-reply-to') } ],
      'resource-type': [ { event: 'submit', callback: this.formHandlerResourceType }, { event: 'click', callback: (e) => this.formClickHandler(e, 'resource-type') } ],
    }

    document.body.appendChild(this.menuContainer);
    this.bindHideEvents();
  }

  showMenu(cursorX, cursorY) {
    this.menuContainer.style.display = "block";
    
    this.menuContainer.style.left = `${cursorX}px`;
    this.menuContainer.style.top = `${cursorY}px`;
  }

  hideMenu() {
    this.menuContainer.style.display = "none";
    this.menuContainer.innerHTML = ""; 
  }

  formClickHandler(e, button) {
    var buttonNode = e.target.closest('button');
    
    if (buttonNode) {
      var buttonClasses = buttonNode.classList;
      
      if (buttonNode.type !== 'submit') {
        e.preventDefault();
        e.stopPropagation();
      }

      if (buttonClasses.contains('editor-form-cancel')) {
        this.hideMenu();
      }
    }
  }

  createMenuItems() {
    const ul = document.createElement('ul');

    this.slashMenuButtons.forEach(({ button, dom }) => {
      const menuItem = this.createMenuItem(button, dom);
      ul.appendChild(menuItem);
      
      menuItem.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePopups(button);
      });
    });

    this.menuContainer.appendChild(ul);
  }

  createMenuItem(button, domFunction) {
    const buttonNode = domFunction();
    buttonNode.id = "editor-button-" + button;

    const labelNode = document.createElement("span");
    const menuItem = document.createElement("li");
    menuItem.appendChild(buttonNode);
    return menuItem;
  }

  handlePopups(button) {
    let popupContent = {
      language: this.createLanguageWidgetHTML(),
      license: this.createLicenseWidgetHTML(),
      inbox: this.createInboxWidgetHTML(),
      'in-reply-to': this.createInReplyToWidgetHTML(),
      'resource-type': this.createResourceTypeWidgetHTML(),
    }

    const popup = fragmentFromString(`<form class="editor-form editor-form-active">${popupContent[button]}</form>`);
    this.openPopup(popup, button);
  }

  createLanguageWidgetHTML() {
    var html = `
      <fieldset>
        <legend>Add a language</legend>
        <label for="language">Language</label> <select name="language" required="">${getLanguageOptionsHTML({ 'selected': '' })}</select>
        ${getButtonHTML('submit', 'editor-form-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-form-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      </fieldset>
    `;

    return html;
  }

  createLicenseWidgetHTML() {
    var html = `
      <fieldset>
        <legend>Add a license</legend>
        <label for="license">License</label> <select name="license" required="">${getLicenseOptionsHTML({ 'selected': '' })}</select>
        ${getButtonHTML('submit', 'editor-form-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-form-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      </fieldset>
    `;

    return html;
  }

  createInboxWidgetHTML() {
    var html = `
      <fieldset>
        <legend>Add an inbox</legend>
        <label for="inbox">Inbox</label> <input contenteditable="false" name="inbox" placeholder="https://example.net/inbox/" pattern="https?://.+" placeholder="Paste or type a link (URL)" oninput="setCustomValidity('')" oninvalid="setCustomValidity('Please enter a valid URL')" required="" type="url" value="" />
        ${getButtonHTML('submit', 'editor-form-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-form-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      </fieldset>
    `;
    return html;
  }

  createInReplyToWidgetHTML() {
    var html = `
      <fieldset>
        <legend>Add an in reply to URL</legend>
        <label for="in-reply-to">In reply to</label> <input contenteditable="false" name="in-reply-to" pattern="https?://.+" placeholder="Paste or type a link (URL)" oninput="setCustomValidity('')" oninvalid="setCustomValidity('Please enter a valid URL')" required="" type="url" value="" />
        ${getButtonHTML('submit', 'editor-form-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-form-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      </fieldset>
    `;

    return html;
  }

  createResourceTypeWidgetHTML() {
    var html = `
      <fieldset>
        <legend>Add a type</legend>
        <label for="resource-type">Resource type</label> <select name="resource-type" required="">${getResourceTypeOptionsHTML({ 'selected': '' })}</select>
        ${getButtonHTML('submit', 'editor-form-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-form-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      </fieldset>
    `;

    return html;
  }

  openPopup(popup, button) {
    this.menuContainer.replaceChildren();
    this.menuContainer.appendChild(popup);

    const popupForm = this.menuContainer.querySelector('form');

    if (this.formEventListeners[button]) {
      this.formEventListeners[button].forEach(({ event, callback }) => {
        popupForm.addEventListener(event, callback);
      });
    }

    this.menuContainer.style.display = "block";
  }

  // this function is duplicated from the Author toolbar. The reason is that 1. the editor instance is not accessible from everywhere (although that could be solved) and 2. the toolbar might not be initialized when we trigger this menu yet. it might be better to keep this somewhere common to every menu/toolbar using the author mode functions (prosemirror transactions) and re-use. and 3. for the specific case of the slash menu i need to update the selection so that it includes (and replaces) the slash
  // this function is duplicated from the Author toolbar. The reason is that 1. the editor instance is not accessible from everywhere (although that could be solved) and 2. the toolbar might not be initialized when we trigger this menu yet. it might be better to keep this somewhere common to every menu/toolbar using the author mode functions (prosemirror transactions) and re-use. and 3. for the specific case of the slash menu i need to update the selection so that it includes (and replaces) the slash
  replaceSelectionWithFragment(fragment) {
    const { state, dispatch } = this.editorView;
    const { selection, schema } = state;
  
    // if (!selection.empty) return; // not sure we need this
  
    const newSelection = TextSelection.create(state.doc, Math.max(selection.from - 1, 0), selection.from);
  
    let node = DOMParser.fromSchema(schema).parse(fragment);
  
    let tr = state.tr.setSelection(newSelection).replaceSelectionWith(node);
    
    dispatch(tr);
  }
  bindHideEvents() {
    this.editorView.setProps({
      handleTextInput: (view, from, to, text) => {
        if (text !== "/") this.hideMenu();
        return false;
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Escape") this.hideMenu();
        return false;
      },
    });

    document.addEventListener("click", (e) => {
      if (!this.menuContainer.contains(e.target)) {
        this.hideMenu();
      }
    });
  }
}
