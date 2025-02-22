import { schema } from "../../schema/base.js"
import { highlightText as pmHighlightText, getTextQuoteHTML } from "../../utils/annotation.js";
import { restoreSelection } from "../../utils/selection.js"
import { getRandomUUID, getFormValues } from "../../../util.js"
import { fragmentFromString } from "../../../doc.js";

//select text
//open popup
//click toolbar button
//populate form
//fill out form
//submit form

//validate form
//post to external location(s)
//copy to localStorage
//mark the highlight text
//add the note as an aside
//update message log
//do other things...

// TODO: refactor to generalize listeners on form
// addListeners([type, callback]) {
// [listeners] => addlistener(type, callback)}
// callback { updateUI, sendfetch}

//actions = ['approve', 'disapprove', 'specificity', 'bookmark', 'comment', 'note']

//actions = ['approve', 'disapprove', 'specificity'] //Review
//actions = ['selector', 'approve', 'disapprove', 'specificity', 'bookmark', 'comment'] //Social
//actions = ['note'] //Author


function getSelectionAsHTML(selection) {
  selection = selection || window.getSelection();
  if (!selection.rangeCount) return "";

  const div = document.createElement("div");

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const fragment = range.cloneContents();

    // console.log("RANGE CONTENTS:");
    // fragment.childNodes.forEach(node => {
    //   console.log("Child:", node);
    //   if (node.children) {
    //     Array.from(node.children).forEach(child => console.log("Grandchild:", child));
    //   }
    // });

    div.appendChild(fragment);
  }

  return div.innerHTML;
}

function replaceSelectionWithFragment(selection, fragment) {
  if (!selection.rangeCount) return;
  const ranges = [];

  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i));
  }

  const mergedRange = document.createRange();
  mergedRange.setStart(ranges[0].startContainer, ranges[0].startOffset);
  mergedRange.setEnd(ranges[ranges.length - 1].endContainer, ranges[ranges.length - 1].endOffset);

  selection.removeAllRanges();

  mergedRange.deleteContents();

  mergedRange.collapse(true);

  mergedRange.insertNode(fragment);

  selection.removeAllRanges();
}



function wrapSelectionInMark(selection) {
  selection = selection || window.getSelection();

  const selectedContent = getSelectionAsHTML(selection);
console.log(selectedContent)
var id = getRandomUUID();

  var refId = 'r-' + id;
  var refLabel = id; 
  var noteIRI = 'https://csarven.solidcommunity.net/bfffac84-e174-49ad-98f2-0308367906d8.ttl';
  var motivatedBy = 'oa:replying';
  if (motivatedBy) {
    refLabel = '💬';
    // refLabel = DO.U.getReferenceLabel(motivatedBy);
  }

  var docRefType = '<sup class="ref-annotation"><a href="#' + id + '" rel="cito:hasReplyFrom" resource="' + noteIRI + '">' + refLabel + '</a></sup>';
  var options = { do: true };

  const htmlString = getTextQuoteHTML(refId, motivatedBy, selectedContent, docRefType, options);

  replaceSelectionWithFragment(selection, fragmentFromString(htmlString))
  // processHighlightNode.outerHTML = fragmentFromString(htmlString);
}


export function formHandlerAnnotate(e, action) {
  e.preventDefault();
  e.stopPropagation();

  const highlightText = async () => {
    if (this.editorView) {
      return pmHighlightText(schema, this.editorView)(this.editorView.state, this.editorView.dispatch)
    }
    else {
console.log(this.selection);
      restoreSelection(this.selection);
      // const options = {};
      // const textQuoteSelectors = await getTextQuoteSelector(selection, options);
      // return highlightSelectorTarget(textQuoteSelectors)

      const selection = window.getSelection();
console.log(selection);
      return wrapSelectionInMark(selection);
    }
  }

  const formValues = getFormValues(e.target);

  const tagging = formValues[`${action}-tagging`];
  const content = formValues[`${action}-content`];
  const language = formValues[`${action}-language`];
  const license = formValues[`${action}-license`];

  console.log(tagging, content, language, license);

  //TODO: Mark the selection after successful comment. Move out.
  //TODO: Use node.textBetween to determine prefix, exact, suffix + parentnode with closest id
  //Mark the selected content in the document
  highlightText();

  // this.clearToolbarForm(e.target);
  // this.clearToolbarButton(action);
  this.cleanupToolbar()
}
