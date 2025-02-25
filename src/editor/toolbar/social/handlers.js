import { schema } from "../../schema/base.js"
import { highlightText as pmHighlightText, getTextQuoteHTML, wrapSelectionInMark, restoreSelection, getSelectedParentElement } from "../../utils/annotation.js";
import { getRandomUUID, getFormValues } from "../../../util.js"
import { fragmentFromString } from "../../../doc.js"
import { stripFragmentFromString } from "../../../uri.js"
import Config from "../../../config.js"
import { postActivity } from "../../../inbox.js"

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

  restoreSelection(this.selection);
  const selection = window.getSelection();

  const range = selection.getRangeAt(0);
  const selectedParentElement = getselectedParentElement(range)

  const formValues = getFormValues(e.target);

  const tagging = formValues[`${action}-tagging`];
  const content = formValues[`${action}-content`];
  const language = formValues[`${action}-language`];
  const license = formValues[`${action}-license`];

  console.log(tagging, content, language, license);

  //TODO: Mark the selection after successful comment. Move out.
  //TODO: Use node.textBetween to determine prefix, exact, suffix + parentnode with closest id
  //Mark the selected content in the document
  const selector = getTextQuoteSelector(editor, mode, view, options)
  processAction(action, selector, formValues, selectedParentElement)

  // highlightText();
  wrapSelectionInMark(selection);

  const annotationInbox = getInboxOfAnnotation(getSelectedParentElement);

  this.cleanupToolbar();
}


export function processAction(action, selector, formValues, selectedParentElement) {
  //TODO:

  const generalData = getFormActionGeneralData(action, selector, formValues, selectedParentElement);
  const annotationDistribution = getAnnotationDistribution(action, formValues);

  //process the rest of the action (below)

  switch(action) {
    case 'article': case 'approve': case 'disapprove': case 'specificity': case 'bookmark':
      annotationDistribution.forEach(annotation => {
        var data = '';

        var noteData = createNoteData(annotation);
        annotation['motivatedByIRI'] = noteData['motivatedByIRI']

        if ('profile' in annotation && annotation.profile == 'https://www.w3.org/ns/activitystreams') {
          var notificationData = createActivityData(annotation, { 'relativeObject': true });
          notificationData['statements'] = DO.U.createNoteDataHTML(noteData);
          note = createActivityHTML(notificationData);
        }
        else {
          note = DO.U.createNoteDataHTML(noteData);
        }

        data = createHTML('', note);

        // console.log(noteData)
        // console.log(note)
        // console.log(data)
        // console.log(annotation)

        postActivity(annotation['containerIRI'], id, data, annotation)
          .catch(error => {
            // console.log('Error serializing annotation:', error)
            // console.log(error)
            throw error  // re-throw, break out of promise chain
          })

          .then(response => {
            var location = response.headers.get('Location')

            if (location) {
              location = getAbsoluteIRI(annotation['containerIRI'], location)
              annotation['noteIRI'] = annotation['noteURL'] = location
            }

            // console.log(annotation, options)

            return positionActivity(annotation, options)
           })

          .then(function() {
            if (this.action != 'bookmark') {
              return sendNotification(annotation, options)
            }
          })

          .catch(e => {  // catch-all
            // suppress the error, it was already logged to the console above
            // nothing else needs to be done, the loop will proceed
            // to the next annotation
          });
      });
      break;

    case 'selector':
      window.history.replaceState({}, null, selectorIRI);
    
      var message = 'Copy URL from address bar.';
      message = {
        'content': message,
        'type': 'info',
        'timer': 3000
      }
      addMessageToLog(message, Config.MessageLog);
      showActionMessage(document.documentElement, message);
      // TODO: Perhaps use something like setCopyToClipboard instead. Use as `encodeURI(selectorIRI)` as input.

      //TODO: 

      break;
  }
}




//TODO: MOVE

export function getFormActionGeneralData(action, selector, options, selectedParentElement) {
  const data = {
    id: generateAttributeId(),
    datetime: getDateTimeISO(),
    resourceIRI: Config.DocumentURL,
    containerIRI: window.location.href,
    contentType: 'text/html',
    noteIRI: null,
    noteURL: null,
    profile: null,
    options: {},
    annotationDistribution: [],

    activityTypeMatched: false,
    activityIndex: Config.ActionActivityIndex[action],

    //XXX: Defaulting to id but overwritten by motivation symbol
    refLabel: id,

    parentNodeWithId: selectedParentElement.closest('[id]'),

    //Role/Capability for Authors/Editors
    ref: '',
    refType: '', //TODO: reference types. UI needs input
    //TODO: replace refId and noteIRI IRIs

    //This class is added if it is only for display purposes e.g., loading an external annotation for view, but do not want to save it later on (as it will be stripped when 'do' is found)
    doClass: '',

    //TODO: oa:TimeState's datetime should equal to hasSource value. Same for oa:HttpRequestState's rdfs:value
    // <span about="[this:#' + refId + ']" rel="oa:hasState">(timeState: <time typeof="oa:TimeState" datetime="' + datetime +'" datatype="xsd:dateTime"property="oa:sourceDate">' + datetime + '</time>)</span>\n\

    noteData: {},
    note: '',
    language: formValues.language,
    license: formValues.license,
    rights: '',
    motivatedBy: 'oa:replying'
  };

  data.refId = 'r-' + data.id;
  data.selectorIRI = getAnnotationSelectorStateURI(data.resourceIRI, selector);

  data.targetIRI = (data.parentNodeWithId) ? data.resourceIRI + '#' + data.parentNodeWithId.id : data.resourceIRI;
  
  data.latestVersion = DO.C.Resource[data.resourceIRI].graph.out(ns.rel['latest-version']).values[0];

  if (data.latestVersion) {
    data.resourceIRI = data.latestVersion;
    data.targetIRI = (data.parentNodeWithId) ? data.latestVersion + '#' + data.parentNodeWithId.id : data.latestVersion;
    data.options.targetInMemento = true;
  }

  // console.log(latestVersion)
  // console.log(resourceIRI)
  // console.log(targetIRI)

  data.targetLanguage = getNodeLanguage(data.parentNodeWithId);
  data.selectionLanguage = getNodeLanguage(data.selectedParentElement);
  // console.log(targetLanguage, selectionLanguage)

  return data;
}

