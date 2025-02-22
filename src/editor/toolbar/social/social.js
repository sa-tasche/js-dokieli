import { formHandlerAnnotate } from "./handlers.js";
import { ToolbarView } from "../toolbar.js";

export class SocialToolbar extends ToolbarView {
  constructor(mode, buttons, editorView) {
    super(mode, buttons, editorView)
    console.log(mode)

    this.editorView = editorView;
  }

  // FIXME: this doesn't work properly 
  updateToolbarVisibility(e) {
    if (this.dom.classList.contains('editor-toolbar-active') && !e.target.closest('.do') && e.target.closest('input[type]')?.type !== 'file') { 
console.log('------here now-----')
      this.cleanupToolbar();
    }
  }

  getFormEventListeners() {
    return {
      approve: [ { event: 'submit', callback: (e) => this.formHandlerAnnotate(e, 'approve') }, { event: 'click', callback: (e) => this.formClickHandler(e, 'approve') } ],
      disapprove: [ { event: 'submit', callback: (e) => this.formHandlerAnnotate(e, 'disapprove') }, { event: 'click', callback: (e) => this.formClickHandler(e, 'disapprove') } ],
      specificity: [ { event: 'submit', callback: (e) => this.formHandlerAnnotate(e, 'specificity') }, { event: 'click', callback: (e) => this.formClickHandler(e, 'specificity') } ],
      bookmark: [ { event: 'submit', callback: (e) => this.formHandlerAnnotate(e, 'bookmark') }, { event: 'click', callback: (e) => this.formClickHandler(e, 'bookmark') } ],
      comment: [ { event: 'submit', callback: (e) => this.formHandlerAnnotate(e, 'comment') }, { event: 'click', callback: (e) => this.formClickHandler(e, 'comment') } ],
    }
  }

  getFormHandlers() {
    return [
      { name: 'formHandlerAnnotate', fn: formHandlerAnnotate },
    ];
  }

  getToolbarPopups() {
    const toolbarPopups = {
      approve: (options) => annotateFormControls(options),
      disapprove: (options) => annotateFormControls(options),
      specificity: (options) => annotateFormControls(options),
      bookmark: (options) => annotateFormControls(options),
      comment: (options) => annotateFormControls(options),
      // note: (options) => annotateFormControls(options), // FIXME: this actually belongs in the other one
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

  clearToolbarButton(button) {
    const btnNode = this.dom.querySelector(`#${'editor-button-' + button}`);

    if (this.toolbarPopups[button]) {
      //Clean up all or any that's active.
      btnNode.classList.remove('editor-button-active');
    }
  }

  clearToolbarForm(toolbarForm) {
    toolbarForm.classList.remove('editor-toolbar-form-active');
    toolbarForm.removeAttribute('style');
    toolbarForm.reset();
  }
}


