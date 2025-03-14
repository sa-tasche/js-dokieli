import { schema } from "../schema/base.js"
import { buttonIcons } from "../../ui/button-icons.js"
import { getAnnotationInboxLocationHTML, getAnnotationLocationHTML, getDocumentContentNode, getLanguageOptionsHTML, getLicenseOptionsHTML, getReferenceLabel } from "../../doc.js";
import { getTextQuoteHTML, cloneSelection, restoreSelection } from "../utils/annotation.js";
import { escapeRegExp, matchAllIndex, fragmentFromString } from "../../util.js";


export class ToolbarView {
  constructor(mode, buttons, editorView) {
    this.mode = mode;
    this.toolbarCommands = this.getToolbarCommands();

    this.toolbarPopups = this.getToolbarPopups()
    this.selection = null;

    this.buttons = buttons.map(button => { return { button, command: this.toolbarCommands[button], dom: () => fragmentFromString(getButtonHTML(button)).firstChild } })

    this.populateForms = this.getPopulateForms();

    // Default empty formHandlers, listeners (subclasses should override)
    this.formHandlers = this.getFormHandlers();

    // Bind event handlers
    this.bindFormHandlers();

    this.formEventListeners = this.getFormEventListeners();

    // for PM stuff
    this.editorView = editorView;

    // for DOM stuff
    this.documentBody = editorView?.dom.parentNode ?? document.body;

    this.dom = document.createElement("div");
    this.dom.id = 'document-editor';
    this.dom.className = 'do editor-toolbar editor-toolbar-view-transition';

    this.addToolbar();

    this.selectionHandler = (e) => this.selectionUpdate(editorView);

    this.updateToolbarVisibilityHandler = (e) => this.updateToolbarVisibility(e);
    // Attach the event listener only in social mode, find a better way of doing this
    // this is still being attached on author mode, or not cleaned up properly
    // if (mode !== "author") {
    //   document.addEventListener("selectionchange", this.selectionHandler);
    // }

    document.removeEventListener("keyup", this.selectionHandler);
    document.removeEventListener("mouseup", this.selectionHandler);


    document.addEventListener("keyup", this.selectionHandler); 
    document.addEventListener("mouseup", this.selectionHandler); 
    this.updateToolbarVisibility = this.updateToolbarVisibility.bind(this);
    this.formClickHandler = this.formClickHandler.bind(this);
    // this.cleanupToolbar = this.cleanupToolbar.bind(this);
    // this.clearToolbarForm = this.clearToolbarForm.bind(this);

    document.removeEventListener("mousedown", this.updateToolbarVisibilityHandler);
    document.addEventListener("mousedown", this.updateToolbarVisibilityHandler);
  }

  // TODO: define default behavior for all of these methods

  replaceSelectionWithFragment() {

  }

  getSelectionAsHTML() {

  }

  
  getToolbarPopups() {
    return {}
  }

  getToolbarCommands() {
    return {}
  }

  getFormHandlers() {
    return [];
  }

  bindFormHandlers() {
    this.getFormHandlers().forEach(handler => {
      this[handler.name] = handler.fn.bind(this);
    });
  }

  getFormEventListeners() {
    return {};
  }

  updateToolbarVisibility() {
    return;
  }

  addToolbar() {
    var ul = document.querySelector('.editor-toolbar-actions');

    if (ul) { 
      ul.parentNode.removeChild(ul); 
    }

    const toolbarForms = this.dom.getElementsByClassName('editor-toolbar-form');

    Array.from(toolbarForms).forEach((form) => {
      this.dom.removeChild(form);
    });

    this.ul = document.createElement('ul');
    this.ul.classList.add('editor-toolbar-actions');
    this.dom.appendChild(this.ul);
    this.documentBody.appendChild(this.dom);

    this.buttons.forEach(({ button, command, dom }) => {
      const buttonNode = dom();
      buttonNode.id = 'editor-button-' + button;

      const li = document.createElement("li");
      li.appendChild(buttonNode);
      document.querySelector('.editor-toolbar-actions').appendChild(li);

      // TODO: figure this out, perhaps if updateButtonState[mode] or something
    //   // if (pm) {
      this.updateButtonState(schema, buttonNode, button,this.editorView);
    // // }
      const formControlsHTML = this.toolbarPopups[button];

      if (formControlsHTML) {
        const toolbarForm = document.createElement('form');
        toolbarForm.classList.add('editor-toolbar-form');
        toolbarForm.id = 'editor-toolbar-form-' + button;
        toolbarForm.appendChild(fragmentFromString(`<fieldset>${formControlsHTML({ button })}</fieldset>`));

        this.dom.appendChild(toolbarForm);

        // Populate forms where applicable
        if (this.populateForms[button]) {
          const state = this.editorView ? this.editorView.state : null;
          this.populateForms[button](button, toolbarForm, state);
        }

        // Add event listeners where applicable
        if (this.formEventListeners[button]) {
          this.formEventListeners[button].forEach((listener) => {
            toolbarForm.addEventListener(listener.event, listener.callback);
          })
        }
      }

      buttonNode.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        var buttonActive = e.target.closest('button');

        if (buttonActive) {
          this.editorView?.focus();

          buttonActive.classList.toggle('editor-button-active');

          //If button is connected to a ProseMirror command (see `toolbarCommands`), we call it.
          if (command) {
            command(this.editorView.state, this.editorView.dispatch, this.editorView);
          }

          //Update active class on non-clicked buttons to see if they should be active or not
          this.buttons.forEach(({button: btn}) => {
            const btnNode = this.dom.querySelector(`#${'editor-button-' + btn}`);

            if (this.toolbarPopups[btn]) {
              //Except the one that we've just clicked.
              if (btn === button) return;
              //Clean up all or any that's active.
              btnNode.classList.remove('editor-button-active');
            }
            else {
              //Checks if the other buttons are connected to an applied node/mark, then make active.
              // TODO: if pm do this
              this.updateButtonState(schema, btnNode, btn, this.editorView);
            }
          })

          //If there is a popup (toolbarForm) associated with this button.
          if (this.toolbarPopups[button]) {
            const toolbarForm = this.dom.querySelector(`#editor-toolbar-form-${button}`);
            // Loop over popups to hide non-active ones.
            this.buttons.forEach(({ button: b}) => {
              // Ignore current popup (corresponding to clicked button).
              if (b === button) return;

              // Hide all other popups.
              else if (this.toolbarPopups[b]) {
                this.dom.querySelector(`#editor-toolbar-form-${b}`).classList.remove('editor-toolbar-form-active');
              }
            })

            const margin = 10;

            // Toggle visibility of current popup.
            toolbarForm.classList.toggle('editor-toolbar-form-active');

            //Position it now because it needs to be near the button that was clicked.
            const toolbarHeight = this.dom.offsetHeight;
            const toolbarWidth = this.dom.offsetWidth;
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const selectionPosition = range.getBoundingClientRect();

            toolbarForm.style.left = `${(toolbarWidth / 2 ) - (toolbarForm.offsetWidth / 2)}px`;

            toolbarForm.style.right = 'initial';

            // 1. if there is space for toolbar above selection, and space for popup below selection, do that - when selection is in the middle, ideal scenario
            if ((selectionPosition.top >= toolbarHeight + (margin * 2)) && (window.innerHeight - selectionPosition.bottom >= toolbarForm.offsetHeight + (margin * 2))) { // this condition is right but
// console.log("condition 1")
              toolbarForm.style.top = `${toolbarHeight + selectionPosition.height + (margin * 1.5)}px`;
            }
            // 2. if there is space for toolbar above selection, but no space for popup below, it's a given that there's space for popup above toolbar (because it means the selection is very close to the bottom) - when selection is very close to the bottom
            else if (selectionPosition.top >= toolbarHeight + (margin * 2) && (window.innerHeight - selectionPosition.bottom < toolbarForm.offsetHeight + (margin * 2))) {
// console.log("condition 2")
              toolbarForm.style.top = `-${toolbarForm.offsetHeight + (margin / 2)}px`;
            }
            // 3. if no space for toolbar above selection, put it below selection, and popup below toolbar - when selection is very close to the top
            else {
// console.log("condition 3")
              toolbarForm.style.top = `${toolbarHeight + (margin / 2)}px`;
            }
          }
        }
      });
    });

    // this.updateToolbarVisibility();
  }

  getPopulateForms() {
    return {};
  }

  signInRequired(button) {
    return;
  }

  // hides toolbar, updates state of all buttons, hides and resets all forms. 
  cleanupToolbar() {
    this.dom.classList.remove("editor-toolbar-active");

// update buttons
    this.buttons.forEach(({button}) => {
      this.clearToolbarButton(button);
// clear forms
      if (this.toolbarPopups[button]) {
        const toolbarForm = document.querySelector('#editor-toolbar-form-' + button + '.editor-toolbar-form-active');
        if (toolbarForm) {
          this.clearToolbarForm(toolbarForm);
        }
      }
    })
  }

  //TODO: Clear active buttons where applicable (not active marks) after clicking away, hide popups. one fn to clear eveything.
  //FIXME: select text from right to left of a paragraph. while still click is held, let go on the left outside of the selected text. the selection disappears.
  updateToolbarVisibility() {
    return;
  }

  updateButtonState () {
    return;
  }

  // Called when there is a state change, e.g., added something to the DOM or selection change.
  update(view) {
    return;
  }

  // check for selection changes to position toolbar and attach event listeners to the popups, which need to have the latest selection
  selectionUpdate(view) {
    // const handleSelectionEnd = () => {


      const selection = window.getSelection();
      const isSelection = selection && !selection.isCollapsed;
      // Hide the toolbar when there is no selection
      if (!isSelection) {
        // if (this.dom.classList.contains('editor-toolbar-active')) {
        //   // this.dom.classList.remove("editor-toolbar-active");
        //   // console.log("selection update, cleanup toolbar")
        //   // this.cleanupToolbar();
        // }
        return;
      }

      //If selection is empty string or a new line
      if (!selection.rangeCount || !selection.toString().length || selection.toString().charCodeAt(0) === 10) {
        return;
      }

      
      //TODO: Revisit
      // const allowMultiNodeSelection = false;
      // if (allowMultiNodeSelection) {
      //   return;
      // }

      if (!this.isSelectionsStartEndRangesWithinSameParent(selection)) {
        return;
      }

      this.selection = cloneSelection();

      //Get information on the selection to position the toolbar.
      const range = selection.getRangeAt(0);
      const selectedPosition = range.getBoundingClientRect();
      const toolbarHeight = this.dom.offsetHeight;
      const toolbarWidth = this.dom.offsetWidth;
      const margin = 10;

      // Display the toolbar
      this.dom.classList.add("editor-toolbar-active");

      this.dom.style.left = `${selectedPosition.left + (selectedPosition.width / 2 ) - (toolbarWidth / 2)}px`;

      // Cleanup the arrow from previous toolbar poisitioning
      this.dom.classList.remove("toolbar-arrow-over", "toolbar-arrow-under");

      //Normally we want to position the toolbar above the selection, otherwise below the selection.
      //Put the toolbar above the selection if there is enough space in the viewport above the position of the selected text's rectangle.
  
      //1 & 2
      if (selectedPosition.top >= toolbarHeight + (margin * 2)) {
        this.dom.style.top = `${selectedPosition.top + window.scrollY - toolbarHeight - margin}px`;
        //This is just the arrow below the toolbar pointing at the selection.
        this.dom.classList.add("toolbar-arrow-under");
      }
      //Put the toolbar below the selection.
      // 3
      else {
        this.dom.style.top = `${selectedPosition.bottom + window.scrollY + margin}px`;
        this.dom.classList.add("toolbar-arrow-over");
      }

      this.dom.style.right = 'initial';
    // }

    // document.addEventListener("keyup", handleSelectionEnd); 
    // document.addEventListener("mouseup", handleSelectionEnd); 
  }

  isSelectionsStartEndRangesWithinSameParent(selection) {
    selection = selection || window.getSelection();

    const startParentNode = selection.getRangeAt(0).startContainer.parentNode;
    const endParentNode = selection.getRangeAt(selection.rangeCount - 1).endContainer.parentNode;

    console.log(startParentNode, endParentNode)
    return startParentNode === endParentNode; // Returns true if both are the same
  }

  clearToolbarButton(button) {
    const btnNode = this.dom.querySelector(`#${'editor-button-' + button}`);

    if (this.toolbarPopups[button]) {
      //Clean up all or any that's active.
      btnNode.classList.remove('editor-button-active');
    }

    //Checks if the other buttons are connected to an applied node/mark, then make active.
    this.updateButtonState(schema, btnNode, button, this.editorView);

  }

  clearToolbarForm(toolbarForm) {
    toolbarForm.classList.remove('editor-toolbar-form-active');
    toolbarForm.removeAttribute('style');
    toolbarForm.reset();
    // TOD
    // if (toolbarForm is editor mode) {
    // this.editorView.focus();
    // }
  }

  formClickHandler(e, button) {
    var buttonNode = e.target.closest('button');
    
    if (buttonNode) {
      var buttonClasses = buttonNode.classList;
      
      if (buttonNode.type !== 'submit') {
        e.preventDefault();
        e.stopPropagation();
      }

      if (buttonClasses.contains('editor-toolbar-cancel')) {
        const toolbarForm = buttonNode.closest('form');
        this.clearToolbarForm(toolbarForm);
        this.clearToolbarButton(button);
      }
    }
  }

  importTextQuoteSelector(containerNode, selector, refId, motivatedBy, docRefType, options) {
    // console.log(containerNode)
    // console.log(selector)
    // console.log(refId)
    // console.log(motivatedBy)
    // console.log(docRefType)
    // console.log(options)
    var containerNodeTextContent = containerNode.textContent;
      //XXX: Seems better?
      // var containerNodeTextContent = fragmentFromString(getDocument(containerNode)).textContent.trim();
    // console.log(containerNodeTextContent);
    options = options || {};

    // console.log(selector)
    var prefix = selector.prefix || '';
    var exact = selector.exact || '';
    var suffix = selector.suffix || '';

    var phrase = escapeRegExp(prefix.toString() + exact.toString() + suffix.toString());
    // console.log(phrase);

    var selectedParentNode;

    var textMatches = matchAllIndex(containerNodeTextContent, new RegExp(phrase, 'g'));
    // console.log(textMatches)

    textMatches.forEach(item => {
      // console.log('phrase:')
      // console.log(phrase)
      // console.log(item)
      var selectorIndex = item.index;
      // console.log('selectorIndex:')
      // console.log(selectorIndex)
      // var selectorIndex = containerNodeTextContent.indexOf(prefix + exact + suffix);
      // console.log(selectorIndex);

      // if (selectorIndex >= 0) {
      var exactStart = selectorIndex + prefix.length
      var exactEnd = selectorIndex + prefix.length + exact.length;
      var selection = { start: exactStart, end: exactEnd };
      // console.log('selection:')
      // console.log(selection)
      var ref = getTextQuoteHTML(refId, motivatedBy, exact, docRefType, options);
      // console.log('containerNode:')
      // console.log(containerNode)

      // TODO: we think this is equivalent to restoreSelection
      // MediumEditor.selection.importSelection(selection, containerNode, document);
      restoreSelection(this.selection);
  
      //XXX: Review
      selection = window.getSelection();
      // console.log(selection)
      var r = selection.getRangeAt(0);
      selection.removeAllRanges();
      selection.addRange(r);
      r.collapse(true);
      // console.log(r)
      // console.log('r.commonAncestorContainer: r.commonAncestorContainer);

      selectedParentNode = r.commonAncestorContainer.parentNode;
      // console.log('selectedParentNode:')
      // console.log(selectedParentNode)
      var selectedParentNodeValue = r.commonAncestorContainer.nodeValue;
      // console.log(selectedParentNodeValue)
  
      var selectionUpdated = fragmentFromString(selectedParentNodeValue.substr(0, r.startOffset) + ref + selectedParentNodeValue.substr(r.startOffset + exact.length));
      // console.log(selectionUpdated)
  
      //XXX: Review. This feels a bit dirty
      for(var i = 0; i < selectedParentNode.childNodes.length; i++) {
        var n = selectedParentNode.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue === selectedParentNodeValue) {
          selectedParentNode.replaceChild(selectionUpdated, n);
        }
      }

      // console.log('---')
    })

    return selectedParentNode;
  }

  destroy() {
    //this.dom is #document-toolbar
    //TODO: Also remove itself
    this.documentBody.removeChild(this.dom);
    document.removeEventListener("selectionchange", this.selectionHandler);
  }
}

//Given a button action, generates an HTML string for the button including an icon and text.
function getButtonHTML(button, buttonClass, buttonTitle, buttonTextContent, options = {}) {
  if (!button) {
    throw new Error('Need to pass button.');
  }

  const textContent = buttonTextContent || buttonIcons[button].textContent;
  const title = buttonTitle || buttonIcons[button].title;
  const icon = buttonIcons[button].icon;

  const buttonContent = (!icon && !textContent) ? button : `${icon ? icon : ''} ${textContent ? `<span>${textContent}</span>` : ''}`;

  return `<button${buttonClass ? ` class="${buttonClass}"` : ''} title="${title}"${options.type ? ` type="${options.type}"` : ''}>${buttonContent}</button>`;
}

// Consider putting this elsewhere or making it part of the class
export function annotateFormControls(options) {
  return `
    <label for="${options.button}-tagging">Tags</label> <input class="editor-toolbar-input" id="${options.button}-tagging" name="comment-tagging" placeholder="Separate tags with commas" />
    <textarea class="editor-toolbar-textarea" cols="20" id="${options.button}-content" name="${options.button}-content" placeholder="${options.placeholder ? options.placeholder : 'What do you think?'}" required="" rows="5"></textarea>
    <select class="editor-toolbar-select" name="${options.button}-language">${getLanguageOptionsHTML()}</select>
    <select class="editor-toolbar-select" name="${options.button}-license">${getLicenseOptionsHTML()}</select>
    <span class="annotation-location-selection">${getAnnotationLocationHTML(options.button)}</span>
    <span class="annotation-inbox">${getAnnotationInboxLocationHTML(options.button)}</span>

    ${getButtonHTML('submit', 'editor-toolbar-submit', 'Post', 'Post', { type: 'submit' })}
    ${getButtonHTML('cancel', 'editor-toolbar-cancel', 'Cancel', 'Cancel', { type: 'button' })}
  `
}

export function updateAnnotationServiceForm(action) {
  var annotationServices = document.querySelectorAll('.do.editor-toolbar .annotation-location-selection');
  for (var i = 0; i < annotationServices.length; i++) {
    annotationServices[i].replaceChildren(fragmentFromString(getAnnotationLocationHTML(action)));
  }
};

export function updateAnnotationInboxForm(action) {
  var annotationInbox = document.querySelectorAll('.do.editor-toolbar .annotation-inbox');
  for (var i = 0; i < annotationInbox.length; i++) {
    annotationInbox[i].replaceChildren(fragmentFromString(getAnnotationInboxLocationHTML(action)));
  }
};

export function getTextQuoteSelectorFromLocation(location) {
  var regexp = /#selector\(type=TextQuoteSelector,(.*)\)/;
  const matches = location.hash.match(regexp);

  if (matches) {
    var selectorsArray = matches[1].split(',');

    var selector = {
      type: 'TextQuoteSelector'
    };

    selectorsArray.forEach(s => {
      var kv = s.split('=');

      if (kv.length == 2) {
        switch(kv[0]) {
          case 'prefix':
            selector['prefix'] = decodeURIComponent(kv[1]);
            break;
          case 'exact':
            selector['exact'] = decodeURIComponent(kv[1]);
            break;
          case 'suffix':
            selector['suffix'] = decodeURIComponent(kv[1]);
            break;
        }
      }

    })

    return selector;
  }
}


export function showTextQuoteSelector(containerNode) {
  var motivatedBy = 'oa:highlighting';
  var selector = getTextQuoteSelectorFromLocation(document.location);
  if (selector && selector.exact && selector.exact.length) {
    //XXX: TODO: Copied from showAnnotation

    var refId = document.location.hash.substring(1);
    var refLabel = getReferenceLabel(motivatedBy);

    containerNode = containerNode || getDocumentContentNode(document);

    var docRefType = '<sup class="ref-highlighting"><a rel="oa:hasTarget" href="#' + refId + '">' + refLabel + '</a></sup>';

    var options = {
      'do': true,
      'mode': '#selector'
    };
// console.log(selector)
// console.log(refId)
    importTextQuoteSelector(containerNode, selector, refId, motivatedBy, docRefType, options)
  }
}

