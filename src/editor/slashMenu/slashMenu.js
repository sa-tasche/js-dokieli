import { Icon } from "../../ui/icons.js";
import { fragmentFromString } from "../../util.js";

const buttonIcons = {
  license: {
    title: 'license',
    icon: Icon['.fas.fa-paragraph']
  },
  language: {
    title: 'language',
    icon: Icon['.fas.fa-italic']
  },
  documentType: {
    title: 'document type',
    icon: Icon['.fas.fa-file-alt']
  },
  inbox: {
    title: 'inbox',
    icon: Icon['.fas.fa-inbox']
  },
  inReplyTo: {
    title: 'in-reply-to',
    icon: Icon['.fas.fa-reply']
  }
}

export function getButtonHTML(button, buttonClass, buttonTitle, buttonTextContent, options = {}) {
  if (!button) {
    throw new Error('Need to pass button.');
  }

  const textContent = buttonTextContent || buttonIcons[button].textContent;
  const title = buttonTitle || buttonIcons[button].title;
  const icon = buttonIcons[button].icon;

  const buttonContent = (!icon && !textContent) ? button : `${icon ? icon : ''} ${textContent ? `<span>${textContent}</span>` : ''}`;

  return `<button${buttonClass ? ` class="${buttonClass}"` : ''} title="${title}"${options.type ? ` type="${options.type}"` : ''}>${buttonContent}</button>`;
}

export class SlashMenu {
  constructor(mode, buttons, editorView) {
    this.mode = mode;
    this.editorView = editorView;
    this.menuContainer = document.createElement("div");
    this.menuContainer.classList.add("slash-menu-container", "slash-menu-toolbar");
    this.menuContainer.style.display = "none";
    this.menuContainer.style.position = "absolute";
    
    this.slashMenuButtons = buttons.map(button => ({
      button,
      dom: () => fragmentFromString(getButtonHTML(button)).firstChild
    }));

    document.body.appendChild(this.menuContainer);
    this.bindHideEvents();
  }

  showMenu(cursorX, cursorY) {
    this.menuContainer.style.display = "block";
    this.createMenuItems();
    
    this.menuContainer.style.left = `${cursorX}px`;
    this.menuContainer.style.top = `${cursorY}px`;
  }

  hideMenu() {
    this.menuContainer.style.display = "none";
    this.menuContainer.innerHTML = ""; 
  }

  createMenuItems() {
    this.slashMenuButtons.forEach(({ button, dom }) => {
      const menuItem = this.createMenuItem(button, dom);
      this.menuContainer.appendChild(menuItem);
      
      menuItem.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePopups(button);
      });
    });
  }

  createMenuItem(button, domFunction) {
    const buttonNode = domFunction();
    buttonNode.id = "editor-button-" + button;
    const menuItem = document.createElement("div");
    menuItem.classList.add("slash-menu-item");
    menuItem.appendChild(buttonNode);
    return menuItem;
  }

  handlePopups(button) {
    let popupContent = [];
    
    if (button === "language") {
      popupContent = ["English", "Spanish", "French", "German"];
    } else if (button === "license") {
      popupContent = ["MIT", "GPL-3.0", "Apache-2.0", "BSD-3"];
    } else if (button === "documentType") {
      popupContent = ["Blogpost", "Recipe", "Article"];
    } else if (button === "inbox") {
      popupContent = [this.createInboxInput()];
    } else if (button === "inReplyTo") {
      popupContent = [this.createInReplyToInput()];
    }

    const popup = this.createPopup(popupContent, button);
    this.openPopup(popup);
  }

  createPopup(items, button) {
    const popup = document.createElement("div");
    popup.classList.add("popup-container");

    const list = document.createElement("ul");
    items.forEach(item => {
      const listItem = document.createElement("li");
      if (typeof item === 'string') {
        listItem.textContent = item;
        listItem.addEventListener("click", () => {
          this.insertSelection(item, button);
          this.hideMenu();
        });
      } else {
        listItem.appendChild(item);
      }
      list.appendChild(listItem);
    });

    popup.appendChild(list);
    return popup;
  }

  createInboxInput() {
    const inputContainer = document.createElement("div");
    const input = document.createElement("input");
    input.placeholder = "Enter inbox URL...";
    const button = document.createElement("button");
    button.textContent = "Add Inbox";
    button.addEventListener("click", () => {
      this.insertSelection(`Inbox: ${input.value}`, "inbox");
      this.hideMenu();
    });
    inputContainer.appendChild(input);
    inputContainer.appendChild(button);
    return inputContainer;
  }

  createInReplyToInput() {
    const inputContainer = document.createElement("div");
    const input = document.createElement("input");
    input.placeholder = "Enter URL to reply to...";
    const button = document.createElement("button");
    button.textContent = "Add Reply";
    button.addEventListener("click", () => {
      this.insertSelection(`In Reply to: ${input.value}`, "inReplyTo");
      this.hideMenu();
    });
    inputContainer.appendChild(input);
    inputContainer.appendChild(button);
    return inputContainer;
  }

  openPopup(popup) {
    this.menuContainer.innerHTML = "";
    this.menuContainer.appendChild(popup);
    this.menuContainer.style.display = "block";
  }

  insertSelection(selection, button) {
    const { state, dispatch } = this.editorView;
    const selectionRange = window.getSelection().getRangeAt(0);
    
  let label = '';
  switch (button) {
    case 'license':
      label = 'License: ';
      break;
    case 'documentType':
      label = 'Document Type: ';
      break;
    case 'language':
      label = 'Language: ';
      break;
    // case 'inbox':
    //   label = 'Inbox: ';
    //   break;
    // case 'replyTo':
    //   label = 'In Reply To: ';
    //   break;
    default:
      label = '';
  }

  const transaction = state.tr.replaceSelectionWith(state.schema.text(`${label}${selection}`));
     dispatch(transaction);

    console.log(`Inserted ${button}:`, selection);
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
