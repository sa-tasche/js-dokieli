import { schema } from "../../schema/base.js"
import { highlightText as pmHighlightText, getTextQuoteHTML, wrapSelectionInMark, restoreSelection } from "../../utils/annotation.js";
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

export function formHandlerAnnotate(e, action) {
  e.preventDefault();
  e.stopPropagation();

  const highlightText = async () => {
console.log(this.selection);
      restoreSelection(this.selection);
      // const options = {};
      // const textQuoteSelectors = await getTextQuoteSelector(selection, options);
      // return highlightSelectorTarget(textQuoteSelectors)

      const selection = window.getSelection();
      return wrapSelectionInMark(selection);
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
