import { toggleMark, setBlockType } from "prosemirror-commands"
import { wrapInList, liftListItem } from "prosemirror-schema-list"
import { schema, allowedEmptyAttributes } from "./../../schema/base.js"
import { buttonIcons } from "../../button-icons.js"
import { formHandlerA, formHandlerAnnotate, formHandlerBlockquote, formHandlerImg, formHandlerQ } from "./handlers.js"
import { ToolbarView } from "../toolbar.js"

export class AuthorToolbar extends ToolbarView {
  constructor(mode, buttons, editorView) {
    super(mode, buttons, editorView)
    this.editorView = editorView;
  }

  getFormEventListeners() {
    return {
      a: [ { event: 'submit', callback: this.formHandlerA }, { event: 'click', callback: (e) => this.formClickHandler(e, 'a') } ],
      q: [ { event: 'submit', callback: this.formHandlerQ }, { event: 'click', callback: (e) => this.formClickHandler(e, 'q') } ],
      blockquote: [ { event: 'submit', callback: this.formHandlerBlockquote }, { event: 'click', callback: (e) => this.formClickHandler(e, 'blockquote') } ],
      img: [ { event: 'submit', callback: this.formHandlerImg }, { event: 'click', callback: (e) => this.formClickHandler(e, 'img') } ],
      note: [ { event: 'submit', callback: (e) => this.formHandlerAnnotate(e, 'note') }, { event: 'click', callback: (e) => this.formClickHandler(e, 'note') } ],
    }
  }

 getFormHandlers() {
    return [
      { name: 'formHandlerA', fn: formHandlerA },
      { name: 'formHandlerQ', fn: formHandlerQ },
      { name: 'formHandlerBlockquote', fn: formHandlerBlockquote },
      { name: 'formHandlerImg', fn: formHandlerImg },
      { name: 'formHandlerAnnotate', fn: formHandlerAnnotate },
    ];
  }

  getToolbarCommands() {
    const toolbarCommands = {
      p: setBlockType(schema.nodes.p),
      h1: toggleHeading(schema, 1),
      h2: toggleHeading(schema, 2),
      h3: toggleHeading(schema, 3),
      h4: toggleHeading(schema, 4),
      em: toggleMark(schema.marks.em),
      strong: toggleMark(schema.marks.strong),
      ul: toggleList(schema, 'ul'),
      ol: toggleList(schema, 'ol'),
      // blockquote: setBlockType(schema.nodes.blockquote),
      // q: toggleMark(schema.marks.q),
      pre: setBlockType(schema.nodes.pre),
      code: toggleMark(schema.marks.code),
      // math: toggleMark(schema.marks.math), //prosemirror-math
      // cite: citeForm(),
      // semantics: semanticsForm()
    }

    return toolbarCommands;
  }

  getToolbarPopups() {
    const toolbarPopups = {
      a: (options) => `<legend>Add a link</legend>
        <label for="link-a-href">URL</label> <input class="editor-toolbar-input" id="link-a-href" name="link-a-href" required="" placeholder="Paste or type a link (URL)" type="url" />
        <label for="link-a-title">Title</label> <input class="editor-toolbar-input" id="link-a-title" name="link-a-title" placeholder="Add advisory information for the tooltip." type="text" />
        ${getButtonHTML('submit', 'editor-toolbar-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-toolbar-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      `,

      blockquote: (options) => `<legend>Add the source of the blockquote</legend>
        <label for="link-blockquote-cite">URL</label> <input class="editor-toolbar-input" id="link-blockquote-cite" name="link-blockquote-cite" placeholder="Paste or type a link (URL)" type="url"  pattern="https?://.+" oninvalid="setCustomValidity('Please enter a valid URL')" 
        oninput="setCustomValidity('')" />
        ${getButtonHTML('submit', 'editor-toolbar-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-toolbar-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      `,

      q: (options) => `<legend>Add the source of the quote</legend>
        <label for="link-q-cite">URL</label> <input class="editor-toolbar-input" id="link-q-cite" name="link-q-cite" placeholder="Paste or type a link (URL)" type="url" pattern="https?://.+" oninvalid="setCustomValidity('Please enter a valid URL')" 
        oninput="setCustomValidity('')"  />
        ${getButtonHTML('submit', 'editor-toolbar-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-toolbar-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      `,

      // TODO: captions
      // TODO: draggable area in this widget
      //TODO: browse storage
      img: (options) => `<legend>Add an image with a description</legend>
        <figure class="link-img-preview"><p>Drag an image here</p></figure>
        <label for="link-img-file">Upload</label> <input class="editor-toolbar-input" id="link-img-file" name="link-img-file" type="file" />
        <label for="link-img-src">URL</label> <input class="editor-toolbar-input" id="link-img-src" name="link-img-src" placeholder="https://example.org/path/to/image.jpg" required="" type="text" />
        <label for="link-img-alt">Description</label> <input class="editor-toolbar-input" id="link-img-alt" name="link-img-alt" placeholder="Describe the image for people who are blind or have low vision." />
        <label for="link-img-figcaption">Caption</label> <input class="editor-toolbar-input" id="link-img-figcaption" name="link-img-figcaption" placeholder="A caption or legend for the figure." />
        ${getButtonHTML('submit', 'editor-toolbar-submit', 'Save', 'Save', { type: 'submit' })}
        ${getButtonHTML('cancel', 'editor-toolbar-cancel', 'Cancel', 'Cancel', { type: 'button' })}
      `,
    note: (options) => annotateFormControls(options), // FIXME: this actually belongs in the other one
    }


  function annotateFormControls(options) {
    return `
      <label for="${options.button}-tagging">Tags</label> <input class="editor-toolbar-input" id="${options.button}-tagging" name="comment-tagging" placeholder="Separate tags with commas" />
      <textarea class="editor-toolbar-textarea" cols="20" id="${options.button}-content" name="${options.button}-content" placeholder="${options.placeholder ? options.placeholder : 'What do you think?'}" required="" rows="5"></textarea>
  <!-- getLanguageOptionsHTML() getLicenseOptionsHTML() -->
      <select class="editor-toolbar-select" name="${options.button}-language"><option selected="selected" value="">Choose a language</option><option value="en">English</option></select>
      <select class="editor-toolbar-select" name="${options.button}-license"><option selected="selected" value="">Choose a license</option><option value="https://creativecommons.org/licenses/by/4.0/">CC-BY</option></select>
  
      <span class="annotation-location-selection">{getAnnotationLocationHTML}</span>
  
      <span class="annotation-inbox">{getAnnotationInboxLocationHTML}</span>
  
      ${getButtonHTML('submit', 'editor-toolbar-submit', 'Post', 'Post', { type: 'submit' })}
      ${getButtonHTML('cancel', 'editor-toolbar-cancel', 'Cancel', 'Cancel', { type: 'button' })}
    `
  }


    return toolbarPopups;
  }

  // Called when there is a state change, e.g., added something to the DOM or selection change.
  update(view) {
    this.selectionUpdate(view);
    const selection = window.getSelection();
    const isSelection = selection && !selection.isCollapsed;
    // Hide the toolbar when there is no selection
    if (!isSelection) {
      if (this.dom.classList.contains('editor-toolbar-active')) {
        // this.dom.classList.remove("editor-toolbar-active");
        // console.log("selection update, cleanup toolbar")
        this.cleanupToolbar();
      }
      return;
    }
  }  

  updateToolbarVisibility(e) {
    // document.addEventListener('click', (e) => {
      // FIXME
      // console.log(this.editorView, this.mode)
    if (this.dom.classList.contains('editor-toolbar-active') && !e.target.closest('.do') && e.target.closest('input[type]')?.type !== 'file' &&  !this.editorView.dom.contains(e.target)) {
      // Click outside editor and not on functionality-related items
        this.cleanupToolbar();
    }
    // })
  }

  insertImage(attrs) {
    return (state, dispatch) => {
      const { schema, tr } = state;

      // TODO: find a way to pass all the attributes in the attributes object without the need for a property with a copy
      const imageNode = schema.nodes.img.create({ originalAttributes: attrs });
  console.log(attrs)
  console.log(imageNode)
  
      tr.replaceSelectionWith(imageNode);
  
      dispatch(tr);
      return true;
    };
  }
  
  updateMarkWithAttributes(schema, markType, attrs) {
    return (state, dispatch) => {
// console.log(state, dispatch)

      const safeAttributes = Object.fromEntries(
        Object.entries(attrs).filter(
          ([key, value]) => value.length || allowedEmptyAttributes.includes(key)
        )
      );
      const { tr, selection } = this.editorView.state;
      const { $from, $to } = selection;
      const mark = schema.marks[markType];
  
      // const result = toggleMark(schema.marks[markType])(this.editorView.state,dispatch)
      // console.log(result)
  
      // console.log(tr.before.eq(state.doc))
  
      if (!mark) return false;
  
      const hasMark = isMarkActive(state, schema.marks[markType]);
  
      if (hasMark) {
        tr.removeMark($from.pos, $to.pos, mark);
        // if (dispatch) dispatch(tr);
      }
  
      tr.addMark($from.pos, $to.pos, mark.create({originalAttributes: attrs}));
  
      if (dispatch) dispatch(tr);
      return true;
    }
  }

  clearToolbarButton(button) {
    const btnNode = this.dom.querySelector(`#${'editor-button-' + button}`);

    if (this.toolbarPopups[button]) {
      //Clean up all or any that's active.
      btnNode.classList.remove('editor-button-active');
    }
    // else {
      //Checks if the other buttons are connected to an applied node/mark, then make active.
      this.updateButtonState(schema, btnNode, button, this.editorView);
    // }
  }

  clearToolbarForm(toolbarForm) {
    toolbarForm.classList.remove('editor-toolbar-form-active');
    toolbarForm.removeAttribute('style');
    toolbarForm.reset();
    this.editorView.focus();
  }

  // populateForms takes form node and editorView.state
  populateFormImg(node, state) {
    const fileInput = node.querySelector('[name="link-img-file"]');
    const altInput = node.querySelector('[name="link-img-alt"]');

    // TODO: prepopulate alt from selection
    altInput.value = state.doc.textBetween(state.selection.from, state.selection.to, "\n");

    fileInput.addEventListener("change", async (e) => {
      const preview = node.querySelector('.link-img-preview');

      await updateImagePreview(e, fileInput, preview);

      const previewImageNode = preview.querySelector('img[src]');

      if (previewImageNode) {
        const srcInput = node.querySelector('[name="link-img-src"]');
        srcInput.value = previewImageNode.src;
      }
    });
  }

  //TODO function getTransactionHistory()

  getPopulateForms() {
    return {
    img: this.populateFormImg,
    }
  }

  updateButtonState(schema, buttonNode, button, editorView) {
    const nodeType = getSchemaTypeFromButton(schema, button);
    let isActive;
  
    if (nodeType) {
      if (nodeType.type === "mark") {
        isActive = isMarkActive(editorView.state, nodeType.schema);
      }
      else if (nodeType.type === "node") {
        isActive = isNodeActive(editorView.state, nodeType.schema, { level: nodeType.level });
      }
    } 
  
    if (isActive !== undefined) {
      if (isActive) {
        buttonNode.classList.add('editor-button-active');
      }
      else {
        buttonNode.classList.remove('editor-button-active');
      }
    }
  } 
}

//Checks whether a given a mark schema is applied / active to the current selection.
function isMarkActive(state, type) {
  const { from, $from, to, empty } = state.selection;
  if (empty) {
    return type.isInSet(state.storedMarks || $from.marks());
  }
  else {
    return state.doc.rangeHasMark(from, to, type);
  }
}

//Checks whether a given a node schema is applied / active to the current selection.
function isNodeActive(state, type, attrs = {}) {
  const { selection } = state;
  const { $from, to, node } = selection;

  if (node) {
    return node.type === type && Object.entries(attrs).every(([key, value]) => node.attrs[key] === value);
  }

  const parent = $from.parent;

  return (
    to <= $from.end() &&
    parent.type === type &&
    Object.entries(attrs).every(([key, value]) => parent.attrs[key] === value)
  );
}

//Given a button action (string), e.g., h1-h6, a, section, ul, returns the associated schema. If there is no associated schema, returns null.
function getSchemaTypeFromButton(schema, button) {
  if (!schema || !button) return null;

  const headingMatch = button.match(/^h([1-6])$/);
  if (headingMatch) {
    return { 
      type: "node",
      schema: schema.nodes.heading,
      level: parseInt(headingMatch[1], 10) 
    };
  }

  if (schema.marks[button]) {
    return { type: "mark", schema: schema.marks[button] };
  }

  if (schema.nodes[button]) {
    return { type: "node", schema: schema.nodes[button] };
  }

  return null;
}

//Given button node, update it active class based on whether associated mark/node is applied to the selection.
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

//Heading is a schema (as opposed to h1-h6). This is an intermediary step to find out how to apply setBlockType (which level of heading). If heading is applied, it either toggles to new heading or to paragraph.
function toggleHeading(schema, level) {
  return (state, dispatch) => {
    const { nodes } = schema;
    const { $from } = state.selection;
    const nodeType = nodes.heading;
    
    if ($from.node().type === nodeType && $from.node().attrs.level === level) {
      return setBlockType(nodes.p)(state, dispatch);
    }
    else {
      return setBlockType(nodeType, { level })(state, dispatch);
    }
  };
}

/*
TODO: Heading sectioning

          switch(this.action) {
              case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                //XXX: Which heading level are we at?
                var parentSectionHeading = '';
                for (var i = 0; i < parentSection.childNodes.length; i++) {
                  parentSectionHeading = parentSection.childNodes[i].nodeName.toLowerCase();
                  if(DO.C.Editor.headings.indexOf(parentSectionHeading) > 0) {
// console.log(parentSectionHeading);
                    break;
                  }
                }
                var pSH = parseInt(parentSectionHeading.slice(-1));

                //XXX: Which heading level is the action?
                var cSH = parseInt(this.action.slice(-1));
// console.log("parentH: " + pSH);
// console.log("currentH: " + cSH);
// console.log(cSH-pSH);

                var closePreviousSections = '';
                // if (cSH > pSH) {}
                for (i = 0; i <= (pSH-cSH); i++) {
                  console.log("i: " + i);
                  closePreviousSections += '</div></section>';
                }
// console.log(closePreviousSections);
// console.log(this.base.selection);

                var selection = window.getSelection();
// console.log(this.base.selection);
// console.log(selection);

                if (selection.rangeCount) {
                  // FIXME: Seem ununsed. Remove later. 
                  // range = selection.getRangeAt(0);
                  // parent = selectedParentElement;

// console.log(range);
                  //Section
                  var sectionId = generateAttributeId(null, this.base.selection);
                  var section = document.createElement('section');
                  section.id = sectionId;
                  section.setAttribute('rel', 'schema:hasPart');
                  section.setAttribute('resource', '#' + sectionId);
// console.log(section);


                  //Heading
                  var heading = document.createElement(tagNames[0]);
                  heading.setAttribute('property', 'schema:name');
                  heading.innerHTML = this.base.selection;
// console.log(heading);
// console.log(selection);


                  var divDescription = parentSection.getElementsByTagName('div')[0];
// console.log(divDescription);
// console.log(divDescription.innerHTML);
// console.log(divDescription.childNodes);
// console.log(divDescription.length);
// console.log(selectedParentElement);
// console.log(selectedParentElement.childNodes);
// console.log(selectedParentElement.lastChild);
// console.log(selectedParentElement.lastChild.length);

                  r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startContainer);
// console.log(r.startOffset);
// console.log(r.endOffset);
                  //Remaining nodes
                  var r = document.createRange();
                  r.setStart(selection.focusNode, selection.focusOffset);
                  r.setEnd(selectedParentElement.lastChild, selectedParentElement.lastChild.length);
// console.log(r.commonAncestorContainer.nodeType);

// console.log(r.startContainer);
// console.log(r.endContainer);
// console.log(selection.anchorNode);
// selection.removeAllRanges(); //XXX: is this doing anything?
// selection.addRange(r);

// console.log(selection.anchorNode);
                  var fragment = r.extractContents();
// console.log(fragment);
// console.log(selection);
// console.log(r);
// console.log(r.startContainer);
// console.log(r.startOffset);
// console.log(r.endOffset);
                  if (fragment.firstChild.nodeType === 3) {
                    //TODO: trim only if there is one child which is a textnode:  // fragment.firstChild.nodeValue = fragment.firstChild.nodeValue.trim();

// console.log(fragment);
                    var sPE = selectedParentElement.nodeName.toLowerCase();
                    switch(sPE) {
                      case "p": default:
                        var xSPE = document.createElement(sPE);
                        xSPE.appendChild(fragment.cloneNode(true));
                        fragment = fragmentFromString(xSPE.outerHTML);
                        break;
                      //TODO: Other cases?
                    }
                  }
// console.log(fragment);
// console.log(selection);

                  r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startContainer);
// console.log(r.startOffset);
// console.log(r.endOffset);

                  //Description
                  var div = document.createElement('div');
                  div.setAttribute('property', 'schema:description');
                  div.appendChild(fragment.cloneNode(true));

                  //Put it together
                  section.appendChild(heading);
                  section.appendChild(div);
// console.log(range.startContainer);

                  var selectionUpdated = document.createElement('div');
                  selectionUpdated.appendChild(section);
                  selectionUpdated = selectionUpdated.innerHTML;
// console.log(selectionUpdated);


                  //Sub-section
                  if (cSH-pSH > 0) {
                    MediumEditor.util.insertHTMLCommand(this.base.selectedDocument, selectionUpdated);
                  }
                  else {
// console.log(selection);
// console.log(parentSection);
                    MediumEditor.selection.selectNode(parentSection, document);
                    r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startOffset);
// console.log(r.endOffset);


                    //This selection is based off previous operations; handling remaining Nodes after the selection. So, this is not accurate per se.. the range might be accurate.
                    selection = window.getSelection();
// console.log(selection);
                    r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startOffset);
// console.log(r.endOffset);


                    r = document.createRange();
                    r.setStartAfter(parentSection);
// console.log(r);
                    r.setEndAfter(parentSection);
// console.log(r);
                    r.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(r);
// console.log(selection);
                    var foo = document.createElement('div');
                    foo.appendChild(parentSection);
                    parentSection = foo.innerHTML;
// console.log(parentSection + selectionUpdated);
                    MediumEditor.util.insertHTMLCommand(this.base.selectedDocument, parentSection + selectionUpdated);
                  }
                }

*/


function togglePreCodeWrap(schema) {
  return (state, dispatch) => {
    const { nodes } = schema;
    const { $from } = state.selection;
    const nodeType = nodes.pre;

    // state.selection -> break it up on newlines

    // iterate over each license
  

    // wrapIn(code) --> Array

    // return wrapIn(pre)
    
    // if ($from.node().type === nodeType) {
    //   return wrapIn(nodes.p)(state, dispatch);
    // }
    // else {
    //   return wrapIn(nodeType)(state, dispatch);
    // }
  };
}

//Switch between paragraph and lityTypes: ol, ul
// FIX: list not toggling on existing paragraph, only on new lines
function toggleList(schema, listType) {
  return (state, dispatch) => {
    const { nodes } = schema;
    const nodeType = nodes[listType];
    const { $from } = state.selection;

    const grandparent = $from.node(-1);

    if (grandparent && grandparent.type === nodes.li) {
      return liftListItem(nodes.li)(state, dispatch);
    }
    else {
      return wrapInList(nodeType)(state, dispatch);
    }
  };
}

const fileTypes = [
  "image/apng",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/svg+xml",
  "image/tiff",
  "image/webp",
  "image/x-icon",
];

function validFileType(file) {
  return fileTypes.includes(file.type);
}

async function updateImagePreview(e, input, preview) {
  while (preview.firstChild) {
    preview.removeChild(preview.firstChild);
  }

  const curFiles = input.files;

  if (curFiles.length === 0) {
    const para = document.createElement("p");
    para.textContent = "No files currently selected for upload.";
    preview.appendChild(para);
  }
  else {
    const list = document.createElement("ol");
    preview.appendChild(list);

    for (const file of curFiles) {
      const listItem = document.createElement("li");
      const para = document.createElement("p");

      if (validFileType(file)) {
        const image = document.createElement("img");
        image.src = URL.createObjectURL(file);
        image.alt = image.title = file.name;

        const dimensions = await getImageDimensions(image.src)
          image.width = dimensions.width;
          image.height = dimensions.height;

        para.textContent = `
          File name: ${file.name}.
          Size: ${returnFileSize(file.size)}.
          Dimensions: ${image.width}x${image.height}px.`;

        listItem.appendChild(image);
        listItem.appendChild(para);
        list.appendChild(listItem);
      }
      else {
        para.textContent = `File name ${file.name}: Not a valid file type. Update your selection.`;
        listItem.appendChild(para);
      }

      list.appendChild(listItem);
    }
  }
}

function returnFileSize(number) {
  if (number < 1e3) {
    return `${number} bytes`;
  }
  else if (number >= 1e3 && number < 1e6) {
    return `${(number / 1e3).toFixed(1)} KB`;
  }
  else {
    return `${(number / 1e6).toFixed(1)} MB`;
  }
}

async function getImageDimensions(blobUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = function () {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = function () {
      reject(new Error('Error loading image'));
    };
  
    img.src = blobUrl;
  })
}
