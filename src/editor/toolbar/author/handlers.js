import { schema } from "../../schema/base.js"
import { createNoteData, getSelectedParentElement, getTextQuoteHTML, restoreSelection } from "../../utils/annotation.js";
import { toggleBlockquote } from "../../utils/dom.js";
import { getRandomUUID, getFormValues } from "../../../util.js"
import { fragmentFromString } from "../../../util.js"
import { getResource } from "../../../fetcher.js";
import { getFormActionData } from "../social/handlers.js";

export function formHandlerA(e) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);
  const href = formValues['a-href'];
  const title = formValues['a-title'];

  const attrs = title ? { href, title } : { href };

  this.updateMarkWithAttributes(schema, 'a', attrs)(this.editorView.state, this.editorView.dispatch);

  this.clearToolbarForm(e.target);
  this.clearToolbarButton('a');
}

export function formHandlerBlockquote(e) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);
console.log(formValues)
  const cite = formValues['blockquote-cite'];

  const attrs = { cite };
console.log(attrs)
  toggleBlockquote(schema, attrs)(this.editorView.state, this.editorView.dispatch);

  this.clearToolbarForm(e.target);
  this.clearToolbarButton('blockquote');
}

export function formHandlerImg(e) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);

  const p = fragmentFromString('<p>Drag an image here</p>');

  const src = formValues['img-src'];
  const alt = formValues['img-alt'];
  const title = formValues['img-figcaption'];

  let width, height;

  const preview = e.target.querySelector('.img-preview');
  const previewImageNode = preview.querySelector('img[src]');

  if (previewImageNode) {
    width = previewImageNode.width;
    height = previewImageNode.height;
  }

  //TODO: Warn about missing alt / description
  // if (alt.length) {
  //  altInput.classList.toggle('.warning');
  // }

  //TODO: MOVE THIS? Consider using a separate form control to mark <figure><img /><figcaption>{$title}</figcaption</figure>. For now img-figcaption is used for `title` attribute.
  // if (title.length) {
  // }

  const attrs = {
    alt,
    ...(height !== undefined && height !== null ? { height } : {}),
    src,
    ...(width !== undefined && width !== null ? { width } : {}),
    title
  };

  this.insertImage(attrs)(this.editorView.state, this.editorView.dispatch);

  preview.replaceChildren(p);
  this.clearToolbarForm(e.target);
  this.clearToolbarButton('img');
}


//select text
//open popup
//click toolbar button
//populate form
//fill out form
//submit form
//validate form
//gather initial data related to the form action
//processAction
  //copy to localStorage
//mark the highlight text --> positionActivity (using highlightText)
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

export function formHandlerQ(e) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);
  const cite = formValues['q-cite'];

  const attrs = { cite };

  this.updateMarkWithAttributes(schema, 'q', attrs)(this.editorView.state, this.editorView.dispatch);

  this.clearToolbarForm(e.target);
  this.clearToolbarButton('q');
}

// UPDATE this with what's in social/handlers.js; consider moving to one location and refer to processActions particular to each subclass
export function formHandlerAnnotate(e, action) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);

  // const tagging = formValues[`${action}-tagging`];
  // const content = formValues[`${action}-content`];
  // const language = formValues[`${action}-language`];
  // const license = formValues[`${action}-license`];

  // console.log(tagging, content, language, license);

  //TODO: Mark the selection after successful comment. Move out.
  //TODO: Use node.textBetween to determine prefix, exact, suffix + parentnode with closest id
  
  // process actions
  processAction()
  //Mark the selected content in the document
  // this.clearToolbarForm(e.target);
  // this.clearToolbarButton(action);
  this.cleanupToolbar()
}

//TODO: 
export function formHandlerCitation(e, action) {
  e.preventDefault();
  e.stopPropagation();

  restoreSelection(this.selection);
  const selection = window.getSelection();

  const range = selection.getRangeAt(0);
  const selectedParentElement = getSelectedParentElement(range);

  const formValues = getFormValues(e.target);

console.log(formValues);

  //TODO: Mark the selection after successful comment. Move out.
  //TODO: Use node.textBetween to determine prefix, exact, suffix + parentnode with closest id
  //Mark the selected content in the document
  const selector = this.getTextQuoteSelector();

  const selectionData = {
    selection,
    selector,
    selectedParentElement,
    selectedContent: this.getSelectionAsHTML()
  };

  processAction(action, formValues, selectionData);

  this.clearToolbarButton('citation');
}


export function formHandlerSemantics(e, action) {
  e.preventDefault();
  e.stopPropagation();

  restoreSelection(this.selection);
  const selection = window.getSelection();

  const range = selection.getRangeAt(0);
  const selectedParentElement = getSelectedParentElement(range);
console.log(e.target)
  const formValues = getFormValues(e.target);

console.log(formValues);

  //TODO: Mark the selection after successful comment. Move out.
  //TODO: Use node.textBetween to determine prefix, exact, suffix + parentnode with closest id
  //Mark the selected content in the document
  const selector = this.getTextQuoteSelector();

  const selectionData = {
    selection,
    selector,
    selectedParentElement,
    selectedContent: this.getSelectionAsHTML()
  };

  processAction(action, formValues, selectionData);

  // const formData = getFormActionData(action, formValues, selectionData);

  this.clearToolbarButton('semantics');
}

//TODO
// export function formHandlerSparkline(e) {
//   input.search.focus();
//   input.search.value = selection;

//   var inputSearch = function(e){
//     if(e.which == 13) {
//       e.preventDefault();
//       e.stopPropagation();
//       _this.base.restoreSelection();
//       MediumEditor.util.insertHTMLCommand(document, e.target.value);
//       var selection = { start: initialSelectionState.start, end: (initialSelectionState.start + e.target.value.length) };
//       MediumEditor.selection.importSelection(selection, initialSelectedParentElement, document);
//       _this.base.checkSelection();
//       e.target.setAttribute('data-event-keyup-enter', true);
//       _this.showForm();
//       return;
//     }
//   }
//   if(!input.search.getAttribute('data-event-keyup-enter')) {
//     input.search.addEventListener('keyup', inputSearch, false);
//   }

//   var sparqlEndpoint = 'http://worldbank.270a.info/';
//   var resourceType = '<http://purl.org/linked-data/cube#DataSet>';
//   var sparklineGraphId = 'sparkline-graph';
//   var resultContainerId = 'sparkline-select';
//   //TODO: This should be from user's preference?
//   var lang = 'en';

//   //TODO: What's the best way for user input? ' of '
//   var textInputA = selection.split(' of ')[0];
//   var textInputB = selection.substr(selection.indexOf(' of ') + 4);

//   if(!DO.C.RefAreas[textInputB.toUpperCase()]) {
//     Object.keys(DO.C.RefAreas).forEach(key => {
//       if(DO.C.RefAreas[key].toLowerCase() == textInputB.toLowerCase()) {
//         textInputB = key;
//       }
//     });
//   }

//   var sG = document.getElementById(sparklineGraphId);
//   if(sG) {
//     sG.parentNode.removeChild(sG);
//   }

//   if(!DO.C.RefAreas[textInputB.toUpperCase()]) {
//     var refAreas;
//     Object.keys(DO.C.RefAreas).forEach(key => {
//       refAreas += '<option value="' + key + '">' + key + ' - ' + DO.C.RefAreas[key] + '</option>';
//     });
//     form.querySelector('.medium-editor-form-save').insertAdjacentHTML('beforebegin', '<div id="' + sparklineGraphId + '">`' + textInputB + '` is not available. Try: ' + '<select name="refAreas"><option>Select a reference area</option>' + refAreas + '</select></div>');
//     var rA = document.querySelector('#' + sparklineGraphId + ' select[name="refAreas"]');
//     rA.addEventListener('change', (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       textInputB = e.target.value;
//       input.search.value = textInputA + ' of ' + textInputB;
//       form.querySelector('#sparkline-selection-dataset').value = textInputA;
//       form.querySelector('#sparkline-selection-refarea').value = textInputB;

//       _this.base.restoreSelection();
//       MediumEditor.util.insertHTMLCommand(document, input.search.value);
//       var selection = { start: initialSelectionState.start, end: (initialSelectionState.start + input.search.value.length) };
//       MediumEditor.selection.importSelection(selection, initialSelectedParentElement, document);
//       _this.base.checkSelection();
//       _this.showForm();
//     });
//     return;
//   }

//   var options = {};
//   options.filter = {
//     dimensionProperty: 'sdmx-dimension:refArea',
//     dimensionRefAreaNotation: textInputB
//   };
//   options.optional = { prefLabels: ["dcterms:title"] };

//   var queryURL = DO.U.SPARQLQueryURL.getResourcesOfTypeWithLabel(sparqlEndpoint, resourceType, textInputA.toLowerCase(), options);

//   queryURL = getProxyableIRI(queryURL);

//   form.querySelector('.medium-editor-form-save').insertAdjacentHTML('beforebegin', '<div id="' + sparklineGraphId + '"></div>' + Icon[".fas.fa-circle-notch.fa-spin.fa-fw"]);
//   sG = document.getElementById(sparklineGraphId);

//   getResourceGraph(queryURL)
//     .then(g => {
//       sG.removeAttribute('class');
//       var triples = sortGraphTriples(g, { sortBy: 'object' });
//       return DO.U.getListHTMLFromTriples(triples, {element: 'select', elementId: resultContainerId});
//     })
//     .then(listHTML => {
//       sG.innerHTML = listHTML;
//       form.removeChild(form.querySelector('.fas.fa-circle-notch.fa-spin.fa-fw'));
//     })
//     .then(x => {
//       var rC = document.getElementById(resultContainerId);
//       rC.addEventListener('change', (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         var sparkline = sG.querySelectorAll('.sparkline, .sparkline-info');
//         for (var i = 0; i < sparkline.length; i++) {
//           sparkline[i].parentNode.removeChild(sparkline[i]);
//         }
//         form.querySelector('.medium-editor-form-save').insertAdjacentHTML('beforebegin', Icon[".fas.fa-circle-notch.fa-spin.fa-fw"]);

//         var dataset = e.target.value;
//         var title = e.target.querySelector('*[value="' + e.target.value + '"]').textContent.trim();
//         //XXX: Should this replace the initial search term?
//         form.querySelector('#sparkline-selection-dataset').value = title;
//         form.querySelector('#sparkline-selection-refarea').value = textInputB.toUpperCase();

//         var refArea = textInputB.toUpperCase();
//         var paramDimension = "\n\
// ?propertyRefArea rdfs:subPropertyOf* sdmx-dimension:refArea .\n\
// ?observation ?propertyRefArea [ skos:notation '" + refArea + "' ] .";

// // console.log(dataset);
// // console.log(refArea);
//         var queryURL = DO.U.SPARQLQueryURL.getObservationsWithDimension(sparqlEndpoint, dataset, paramDimension);
// // console.log(queryURL);
//         queryURL = getProxyableIRI(queryURL);

//         getResourceGraph(queryURL)
//           .then(g => {
//             var triples = sortGraphTriples(g, { sortBy: 'object' });
// // console.log(triples);
//             if (triples.length) {
//               var observations = {};
//               triples.forEach(t => {
//                 var s = t.subject.value;
//                 var p = t.predicate.value;
//                 var o = t.object.value;
//                 observations[s] = observations[s] || {};
//                 observations[s][p] = o;
//               });
// // console.log(observations);
//               var list = [], item;
//               Object.keys(observations).forEach(key => {
//                 item = {};
//                 observations[key][ns.qb.Observation.value] = key;
//                 item[key] = observations[key];
//                 list.push(item[key]);
//               });
//               var sortByKey = ns['sdmx-dimension'].refPeriod;
//               list.sort(function (a, b) {
//                 return a[sortByKey].toLowerCase().localeCompare(b[sortByKey].toLowerCase());
//               });
// // console.log(list);
//               var options = {
//                 url: dataset,
//                 title: title
//               };
//               var sparkline = DO.U.getSparkline(list, options);
//               sG.insertAdjacentHTML('beforeend', '<span class="sparkline">' + sparkline + '</span> <span class="sparkline-info">' + triples.length + ' observations</span>');
//                 form.removeChild(form.querySelector('.fas.fa-circle-notch.fa-spin.fa-fw'));
//             }
//             else {
//               //This shouldn't happen.
//               sG.insertAdjacentHTML('beforeend', '<span class="sparkline-info">0 observations. Select another.</span>');
//             }
//           });
//       });
//     });
// }



//TODO: MOVE. Incorporate into Image handler?
//For some buttons we'll have both a popup and a command (custom, not pm). If selection matches a pattern, we call replaceSelectionWithImg with the values from the selection
/*
export function inputRuleImage(selection) {
  selection = selection || window.getSelection();
  const selectedContent = selection.toString();

  var imgOptions = selectedContent.split("|");

  var src = imgOptions[0];
  var alt = '';
  var width = '';
  var height = '';

  //https://csarven.ca/media/images/sarven-capadisli.jpg|alt text|480x320|Hello world long description
  switch (imgOptions.length) {
    case 1: default:
      src = imgOptions[0];
      break;

    case 2:
      alt = imgOptions[1];
      break;

    case 3:
      width = ' width="' + imgOptions[1] + '"';
      var widthHeight = imgOptions[1].split('x');

      if (widthHeight.length == 2) {
        width = ' width="' + widthHeight[0] + '"';
        height = ' height="' + widthHeight[1] + '"';
      }

      alt = imgOptions[2];
      break;

    case 4:
      var figure = imgOptions[1];
      //if imgOptions[1] == 'figure'

      width = ' width="' + imgOptions[2] + '"';
      widthHeight = imgOptions[2].split('x');

      if (widthHeight.length == 2) {
        width = ' width="' + widthHeight[0] + '"';
        height = ' height="' + widthHeight[1] + '"';
      }

      alt = imgOptions[3];
      break;
  }

  selectionUpdated = '<img alt="'+ alt +'"' + height + ' src="' + src + '"' + width + ' />';
  if (imgOptions.length == 4) {
    selectionUpdated = '<figure>' + selectionUpdated + '<figcaption>' + alt + '</figcaption></figure>';
  }
}
  */

/*
TODO:

case 'rdfa':
  r.about = this.getForm().querySelector('#rdfa-about.medium-editor-form-input');
  r.rel = this.getForm().querySelector('#rdfa-rel.medium-editor-form-input');
  r.href = this.getForm().querySelector('#rdfa-href.medium-editor-form-input');
  r.typeOf = this.getForm().querySelector('#rdfa-typeof.medium-editor-form-input');
  r.resource = this.getForm().querySelector('#rdfa-resource.medium-editor-form-input');
  r.property = this.getForm().querySelector('#rdfa-property.medium-editor-form-input');
  r.content = this.getForm().querySelector('#rdfa-content.medium-editor-form-input');
  r.datatype = this.getForm().querySelector('#rdfa-datatype.medium-editor-form-input');
  r.language = this.getForm().querySelector('#rdfa-language.medium-editor-form-input');
  break;

case 'sparkline':
  r.search = this.getForm().querySelector('#sparkline-search.medium-editor-form-input');
  r.select = this.getForm().querySelector('#sparkline-select');
  r.sparkline = this.getForm().querySelector('#sparkline-graph .sparkline');
  r.selectionDataSet = this.getForm().querySelector('#sparkline-selection-dataset');
  r.selectionRefArea = this.getForm().querySelector('#sparkline-selection-refarea');
  break;


  */

export function processAction(action, formValues, selectionData) {
  console.log(action, formValues, selectionData)

  const formData = getFormActionData(action, formValues, selectionData);
console.log(formData);
  // const { annotationDistribution, ...otherFormData } = formData;

//TODO: Need to get values for id, refId, opts, 
//FIXME: Some keys are shared e.g., content: citationContent and semanticsContent. And, some keys dont exist?
const { id, refId, type: citationType, url: citationUrl, content: citationContent, language:  citationLanguage } = formData;

  var noteData, note, asideNote, asideNode, parentSection;

  switch(action) {
    case 'note':
      noteData = createNoteData({'id': id})
      note = DO.U.createNoteDataHTML(noteData);
      // var nES = selectedParentElement.nextElementSibling;
      asideNote = '\n\
      <aside class="note">\n\
      '+ note + '\n\
      </aside>';
      asideNode = fragmentFromString(asideNote);
      parentSection = getClosestSectionNode(selectionData.selectedParentElement);
      parentSection.appendChild(asideNode);

      DO.U.positionNote(refId, id);
      break;

    case 'cite': //footnote reference
      //TODO: Refactor this what's in positionInteraction

      noteData = createNoteData({'id': id})
      note = DO.U.createNoteDataHTML(noteData);

      switch(citationType) {
        case 'ref-footnote': default:
          // var nES = selectedParentElement.nextElementSibling;
          asideNote = '\n\
<aside class="note">\n\
'+ note + '\n\
</aside>';
          asideNode = fragmentFromString(asideNote);
          parentSection = getClosestSectionNode(selectionData.selectedParentElement);
          parentSection.appendChild(asideNode);

          DO.U.positionNote(refId, id);
          break;

        case 'ref-reference':
          var options = {};
          citationUrl = citationUrl.trim(); //XXX: Perhaps use escapeCharacters()?
          options['citationId'] = citationUrl;
          options['refId'] = refId;

          //TODO: offline mode
          DO.U.getCitation(citationUrl, options)
            .then(citationGraph => {
              var citationURI = citationUrl;
              // console.log(citationGraph)
              // console.log(citationGraph.toString())
              // console.log(options.citationId)
              // console.log( getProxyableIRI(options.citationId))
              if (isValidISBN(citationUrl)) {
                citationURI = citationGraph.term.value;
                // options.citationId = citationURI;
              }
              else if(citationUrl.match(/^10\.\d+\//)) {
                citationURI = 'http://dx.doi.org/' + citationUrl;
                // options.citationId = citationURI;
              }
              //FIXME: subjectIRI shouldn't be set here. Bug in RDFaProcessor (see also SimpleRDF ES5/6). See also: https://github.com/dokieli/dokieli/issues/132

              citationURI = citationURI.replace(/(https?:\/\/(dx\.)?doi\.org\/)/i, 'http://dx.doi.org/');

              //XXX: I don't know what this is going on about...
              // else if (stripFragmentFromString(options.citationId) !==  getProxyableIRI(options.citationId)) {
              //   citationURI = currentLocation();
              // }

              var citation = DO.U.getCitationHTML(citationGraph, citationURI, options);

              //TODO: references nodes, e.g., references, normative-references, informative-references
              var references = document.querySelector('#references');
              var referencesList = references?.querySelector('dl, ol, ul') || references;

              buildReferences(referencesList, id, citation);

              options['showRobustLinksDecoration'] = true;

              // var node = document.querySelector('[id="' + id + '"] a[about]');

              // var robustLink = DO.U.createRobustLink(citationURI, node, options);

              // console.log(citationURI, citation, options)
              var s = citationGraph.node(rdf.namedNode(citationURI));
              var inboxes = getGraphInbox(s);

              if (!inboxes) {
                s = citationGraph.node(rdf.namedNode(stripFragmentFromString(citationURI)));
              }

              inboxes = getGraphInbox(s);

              if (!inboxes) {
                s = citationGraph.node(rdf.namedNode(options.citationId));
              }
              else {
                var inboxURL = inboxes[0];

                var citedBy = location.href.split(location.search||location.hash||/[?#]/)[0] + '#' + options.refId;

                var notificationStatements = '<dl about="' + citedBy + '">\n\
  <dt>Action</dt><dd>Citation</dd>\n\
  <dt>Cited by</dt><dd><a href="' + citedBy + '">' + citedBy + '</a></dd>\n\
  <dt>Citation type</dt><dd><a href="' + options.url + '">' + DO.C.Citation[options.citationRelation] + '</a></dd>\n\
  <dt>Cites</dt><dd><a href="' + options.url + '" property="' + options.citationRelation + '">' + options.url + '</a></dd>\n\
</dl>\n\
';

                var notificationData = {
                  "type": ['as:Announce'],
                  "inbox": inboxURL,
                  "object": citedBy,
                  "target": options.url,
                  "statements": notificationStatements
                };

                notifyInbox(notificationData);
                //XXX: Inform the user that a notification was sent?
              }
            });
          break;
      }
      break;

    case 'semantics':
      //This only updates the DOM. Nothing further. The 'id' is not used.
      noteData = createNoteData({'id': id});
      break;

  }



}
