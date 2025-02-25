import { schema } from "../../schema/base.js"
import { highlightText as pmHighlightText, getTextQuoteHTML, restoreSelection } from "../../utils/annotation.js";
import { toggleBlockquote } from "../../utils/dom.js";
import { getRandomUUID, getFormValues } from "../../../util.js"
import { fragmentFromString } from "../../../doc.js";

export function formHandlerA(e) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);
  const href = formValues['link-a-href'];
  const title = formValues['link-a-title'];

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
  const cite = formValues['link-blockquote-cite'];

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

  const src = formValues['link-img-src'];
  const alt = formValues['link-img-alt'];
  const title = formValues['link-img-figcaption'];

  let width, height;

  const preview = e.target.querySelector('.link-img-preview');
  const previewImageNode = preview.querySelector('img[src]');

  if (previewImageNode) {
    width = previewImageNode.width;
    height = previewImageNode.height;
  }

  //TODO: Warn about missing alt / description
  // if (alt.length) {
  //  altInput.classList.toggle('.warning');
  // }

  //TODO: MOVE THIS? Consider using a separate form control to mark <figure><img /><figcaption>{$title}</figcaption</figure>. For now link-img-figcaption is used for `title` attribute.
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

export function formHandlerQ(e) {
  e.preventDefault();
  e.stopPropagation();

  const formValues = getFormValues(e.target);
  const cite = formValues['link-q-cite'];

  const attrs = { cite };

  this.updateMarkWithAttributes(schema, 'q', attrs)(this.editorView.state, this.editorView.dispatch);

  this.clearToolbarForm(e.target);
  this.clearToolbarButton('q');
}


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
  r.about = this.getForm().querySelector('#rdfa-about.medium-editor-toolbar-input');
  r.rel = this.getForm().querySelector('#rdfa-rel.medium-editor-toolbar-input');
  r.href = this.getForm().querySelector('#rdfa-href.medium-editor-toolbar-input');
  r.typeOf = this.getForm().querySelector('#rdfa-typeof.medium-editor-toolbar-input');
  r.resource = this.getForm().querySelector('#rdfa-resource.medium-editor-toolbar-input');
  r.property = this.getForm().querySelector('#rdfa-property.medium-editor-toolbar-input');
  r.content = this.getForm().querySelector('#rdfa-content.medium-editor-toolbar-input');
  r.datatype = this.getForm().querySelector('#rdfa-datatype.medium-editor-toolbar-input');
  r.language = this.getForm().querySelector('#rdfa-language.medium-editor-toolbar-input');
  break;

case 'cite':
  r.search = this.getForm().querySelector('#specref-search.medium-editor-toolbar-input');
  r.select = this.getForm().querySelector('input[name="specref-item"]:checked');
  r.citationType = this.getForm().querySelector('input[name="citation-type"]:checked');
  r.citationRelation = this.getForm().querySelector('#citation-relation.medium-editor-toolbar-select');
  r.url = this.getForm().querySelector('#citation-url.medium-editor-toolbar-input');
  r.content = this.getForm().querySelector('#citation-content.medium-editor-toolbar-textarea');
  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
  break;

case 'sparkline':
  r.search = this.getForm().querySelector('#sparkline-search.medium-editor-toolbar-input');
  r.select = this.getForm().querySelector('#sparkline-select');
  r.sparkline = this.getForm().querySelector('#sparkline-graph .sparkline');
  r.selectionDataSet = this.getForm().querySelector('#sparkline-selection-dataset');
  r.selectionRefArea = this.getForm().querySelector('#sparkline-selection-refarea');
  break;


  */

export function processAction(action, options = {}) {
//TODO: Need to get values for id, refId, opts, 

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
      parentSection = getClosestSectionNode(selectedParentElement);
      parentSection.appendChild(asideNode);

      DO.U.positionNote(refId, id);
      break;

    case 'cite': //footnote reference
      //TODO: Refactor this what's in positionInteraction

      noteData = createNoteData({'id': id})
      note = DO.U.createNoteDataHTML(noteData);

      switch(opts.citationType) {
        case 'ref-footnote': default:
          // var nES = selectedParentElement.nextElementSibling;
          asideNote = '\n\
<aside class="note">\n\
'+ note + '\n\
</aside>';
          asideNode = fragmentFromString(asideNote);
          parentSection = getClosestSectionNode(selectedParentElement);
          parentSection.appendChild(asideNode);

          DO.U.positionNote(refId, id);
          break;

        case 'ref-reference':
          options = opts;
          opts.url = opts.url.trim(); //XXX: Perhaps use escapeCharacters()?
          options['citationId'] = opts.url;
          options['refId'] = refId;

          //TODO: offline mode
          DO.U.getCitation(opts.url, options)
            .then(citationGraph => {
              var citationURI = opts.url;
              // console.log(citationGraph)
              // console.log(citationGraph.toString())
              // console.log(options.citationId)
              // console.log( getProxyableIRI(options.citationId))
              if (isValidISBN(opts.url)) {
                citationURI = citationGraph.term.value;
                // options.citationId = citationURI;
              }
              else if(opts.url.match(/^10\.\d+\//)) {
                citationURI = 'http://dx.doi.org/' + opts.url;
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

    case 'rdfa':
      //This only updates the DOM. Nothing further. The 'id' is not used.
      noteData = createNoteData({'id': id});
      break;

  }



}
