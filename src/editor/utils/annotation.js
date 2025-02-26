import { Plugin, TextSelection, NodeSelection, EditorState } from "prosemirror-state"
import { replaceSelectionWithDOMFragment, docSelectionToHtml } from "./dom.js";
import { getRandomUUID, fragmentFromString } from "./../../util.js";
import { escapeCharacters } from "./../../doc.js";

// 1. new annotation
  // replace the selection with fragment 
// 2. old annotation
  // take textQuoteSelector
  // calculate to anchorand head --> anchor will be the index of the first character of anchor and so on
  // create a new (PM) selection
// now that we have a selection --> docSelectionToHTML --> fragmentFromString --> replaceSelectionWithDOMFragment


//replaceSelection
//highlightSelection

//update DOM ()


// this function should take from and to and just insert fragment wherever OR replace a selection
export function highlightText(schema, view) {
  return (state, dispatch) => {
    const tr = state.tr;

    const { selection, doc } = tr;
    if (!(selection instanceof TextSelection) || selection.empty) return;

    const { from, to } = selection;

    //TODO: When highlighting within the same text node, just the selected string is simple.
    //When selected content starts and ends at different nodes, there are two cases, e.g., in the same paragraph but crossing over a mark, e.g., "foo <em>bar</em> baz", and the other is like the selection is crossing over two paragraphs.

    const selectedContent = docSelectionToHtml(doc, from, to);

    // const htmlString = getTextQuoteHTML(refId, motivatedBy, selectedContent, docRefType, options);
    const textQuoteSelector = getTextQuoteSelectorAuthor(view)(view);
    // now take prefix and suffix and calculate from and to

    console.log(textQuoteSelector)

    const htmlString = `<span class="do ref" rel="schema:hasPart" resource="#r-a268d7c2-fbcc-4659-84fd-ddda1501dde8" typeof="http://purl.org/dc/dcmitype/Text"><mark datatype="rdf:HTML" id="r-a268d7c2-fbcc-4659-84fd-ddda1501dde8" property="rdf:value">${selectedContent}</mark><sup class="ref-annotation"><a href="#a268d7c2-fbcc-4659-84fd-ddda1501dde8" rel="cito:hasReplyFrom" resource="https://csarven.solidcommunity.net/bfffac84-e174-49ad-98f2-0308367906d8.ttl">💬</a></sup></span>`;

    // <span class="ref do" rel="schema:hasPart" resource="#h-selector(type=TextQuoteSelector,prefix=engaging%20content%2C%20such%20as%20maps%2C%20,exact=expert%20insights,suffix=%20for%20your%20reviews%2C%20nutritional%20i)" typeof="oa:Annotation" contenteditable="false"><span rel="oa:motivatedBy" resource="oa:highlighting"></span><span rel="oa:hasTarget" resource="#selector(type=TextQuoteSelector,prefix=engaging%20content%2C%20such%20as%20maps%2C%20,exact=expert%20insights,suffix=%20for%20your%20reviews%2C%20nutritional%20i)" typeof="http://purl.org/dc/dcmitype/Text"><mark datatype="rdf:HTML" id="selector(type=TextQuoteSelector,prefix=engaging%20content%2C%20such%20as%20maps%2C%20,exact=expert%20insights,suffix=%20for%20your%20reviews%2C%20nutritional%20i)" property="rdf:value">expert insights</mark><sup class="ref-highlighting"><a rel="oa:hasTarget" href="#selector(type=TextQuoteSelector,prefix=engaging%20content%2C%20such%20as%20maps%2C%20,exact=expert%20insights,suffix=%20for%20your%20reviews%2C%20nutritional%20i)">#</a></sup></span></span>


    var node = fragmentFromString(htmlString);

    // // const options = { inheritMarks: true }

    // either use existing sselection (if new annotation) or create a new selection object (somehow) from from and to
    replaceSelectionWithDOMFragment(view, node);

    return true;
  };
}

//getTextQuoteHTML modified from dokieli.js
export function getTextQuoteHTML(refId, motivatedBy, exact, docRefType, options) {
  if (typeof exact !== "string") { throw new Error(`getTextQuoteHTML: exact is of type ${typeof exact}`) }
  if (!exact.length) { throw new Error(`getTextQuoteHTML: exact is empty`) }

  refId = refId || getRandomUUID();
  motivatedBy = motivatedBy || 'oa:replying';
  docRefType = docRefType || '';
  options = options || {};

  var doMode = (options.do) ? ' do' : '';

  var refOpen = '<span class="ref' + doMode + '" rel="schema:hasPart" resource="#' + refId + '" typeof="http://purl.org/dc/dcmitype/Text">';
  var refClose = '</span>';
  if (motivatedBy == 'oa:highlighting') {
    refOpen = '<span class="ref' + doMode + '" rel="schema:hasPart" resource="#h-' + refId + '" typeof="oa:Annotation"><span rel="oa:motivatedBy" resource="oa:highlighting"></span><span rel="oa:hasTarget" resource="#' + refId + '" typeof="http://purl.org/dc/dcmitype/Text">';
    refClose = '</span></span>';
  }
  var mark = '<mark datatype="rdf:HTML" id="'+ refId +'" property="rdf:value">' + exact + '</mark>';

  return refOpen + mark + docRefType + refClose;
}


//Outputs:
// {
//   type: 'TextQuoteSelector',
//   exact: 'ipsum',
//   prefix: 'Lorem ',
//   suffix: ' dolor'
// }
//TODO: Lo
// FIXME: refactor . do not pass around Editor instance, maybe pass the restoreSelection fn when needed 'onRestoreSelection' or similar; or put Editor in DO.C.Editor
export function getTextQuoteSelector(editor, mode, view, options) {
  if (!editor) return;

  switch (mode) {
    case "author":
      return getTextQuoteSelectorAuthor(view, options);
    case "social": default:
      return getTextQuoteSelectorSocial(editor);
  }
}

/**
 * @param {Object} editor - The Editor instance
 * @param {Object} view - The ProseMirror Editor view
 * @param {Object} options
 */
export function getTextQuoteSelectorAuthor(view, options = {}) {

  //ProseMirror state.selection
  const { selection , doc } = view.state;
  const { from, to } = selection;
  //TODO: Use DO.C.ContextLength
  const contextLength = options.contextLength || 32;

  var exact = doc.textBetween(from, to); // consider \n
  const textNode = view.domAtPos(from).node;
  const selectedParentElement = textNode.parentNode;
  console.log(selectedParentElement)

  // var selectionState = MediumEditor.selection.exportSelection(selectedParentElement, this.document);
  // var prefixStart = Math.max(0, start - DO.C.ContextLength);
  // console.log('pS ' + prefixStart);
  // var prefix = selectedParentElement.textContent.substr(prefixStart, start - prefixStart);
  let prefix = doc.textBetween(from - contextLength, from)  // consider \n
  // console.log('-' + prefix + '-');
  prefix = escapeCharacters(prefix);
  
  // var suffixEnd = Math.min(selectedParentElement.textContent.length, end + DO.C.ContextLength);
  // console.log('sE ' + suffixEnd);
  let suffix =  doc.textBetween(to, to + contextLength)  // consider \n
  // console.log('-' + suffix + '-');
  suffix = escapeCharacters(suffix);

  return {
    type: 'TextQuoteSelector',
    exact,
    prefix,
    suffix
  }
}

/**
 * @param {Object} editor - The Editor instance
 * @param {Object} options
 */
export function getTextQuoteSelectorSocial(editor, options = {}) {
  if (!editor) return;
  // FIXME: refactor this
  editor.restoreSelection();

  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  var selectedParentElement = getSelectedParentElement(range);
// console.log('getSelectedParentElement:', selectedParentElement);

  const selectionHTML = getSelectionAsHTML(selection); //.replace(DO.C.Editor.regexEmptyHTMLTags, '');

  var exact = selectionHTML;
  // var selectionState = MediumEditor.selection.exportSelection(selectedParentElement, document);
  const selectionState = exportSelection(selectedParentElement, selection);
  var start = selectionState.start;
  var end = selectionState.end;
  var prefixStart = Math.max(0, start - DO.C.ContextLength);
// console.log('pS ' + prefixStart);
  var prefix = selectedParentElement.textContent.substr(prefixStart, start - prefixStart);
// console.log('-' + prefix + '-');
  prefix = escapeCharacters(prefix);

  var suffixEnd = Math.min(selectedParentElement.textContent.length, end + DO.C.ContextLength);
// console.log('sE ' + suffixEnd);
  var suffix = selectedParentElement.textContent.substr(end, suffixEnd - end);
// console.log('-' + suffix + '-');
  suffix = escapeCharacters(suffix);

  return {
    type: 'TextQuoteSelector',
    exact,
    prefix,
    suffix
  }
}

//From https://github.com/yabwe/medium-editor/blob/master/src/js/selection.js
export function getSelectedParentElement(range) {
  if (!range) {
      return null;
  }

  // Selection encompasses a single element
  if (rangeSelectsSingleNode(range) && range.startContainer.childNodes[range.startOffset].nodeType !== 3) {
      return range.startContainer.childNodes[range.startOffset];
  }

  // Selection range starts inside a text node, so get its parent
  if (range.startContainer.nodeType === 3) {
      return range.startContainer.parentNode;
  }

  // Selection starts inside an element
  return range.startContainer;
}

//From https://github.com/yabwe/medium-editor/blob/master/src/js/selection.js
//http://stackoverflow.com/questions/15867542/range-object-get-selection-parent-node-chrome-vs-firefox
export function rangeSelectsSingleNode (range) {
  var startNode = range.startContainer;
  return startNode === range.endContainer &&
      startNode.hasChildNodes() &&
      range.endOffset === range.startOffset + 1;
}

export function getSelectionAsHTML(selection) {
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

  return div.getHTML();
}

export function replaceSelectionWithFragment(selection, fragment) {
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

export function exportSelection(selectedParentElement, selection) {
  if (!selection.rangeCount) return;

  const ranges = [];

  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i));
  }

  const mergedRange = document.createRange();
  mergedRange.setStart(ranges[0].startContainer, ranges[0].startOffset);
  mergedRange.setEnd(ranges[ranges.length - 1].endContainer, ranges[ranges.length - 1].endOffset);
  
  const preSelectionRange = mergedRange.cloneRange();
  preSelectionRange.selectNodeContents(selectedParentElement);
  preSelectionRange.setEnd(mergedRange.startContainer, mergedRange.startOffset);
  const start = preSelectionRange.toString().length;

  const selectionState = {
    start: start,
    end: start + mergedRange.toString().length
  };

  return selectionState;
}



export function wrapSelectionInMark(selection) {
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

export function cloneSelection() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const clonedSelection = [];

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i).cloneRange(); 
    const fragment = range.cloneContents();
    clonedSelection.push({ range, fragment });
  }

  return clonedSelection;
}

//XXX: Note Firefox bug handling contenteditable true/false differently: https://bugzilla.mozilla.org/show_bug.cgi?id=818515
export function restoreSelection(clonedSelection) {
  const selection = window.getSelection();
  selection.removeAllRanges(); // Clear existing selection

  clonedSelection.forEach(({ range }) => {
    selection.addRange(range);
  });
}

//FIXME: A bit hacky - should use RDF?
//TODO: Move to inbox.js
/**
 * Finds the inbox URL (`ldp:inbox` or `as:inbox`) of the closest ancestor matching the given selector.
 *
 * @param {Element} node - The starting DOM node to search from.
 * @param {string} selector - A CSS selector to identify the ancestor element, e.g., `.do[typeof="oa:Annotation"]`
 * @returns {string|null} The decoded inbox URL if found, otherwise `null`.
 */
export function getInboxOfClosestNodeWithSelector(node, selector) {
  if (!selector) { return; }

  node = node || document.body;

  let inbox = null;
  const nodeWithSelector = node.closest(selector);

  if (nodeWithSelector) {
    inbox = nodeWithSelector.querySelector('[rel="ldp:inbox"], [rel="as:inbox"]');

    if (inbox) {
      inbox = inbox.href || inbox.getAttribute('resource');
      inbox = decodeURIComponent(inbox);
    }
  }

  return inbox;
}

//TODO: This function returns noteData and also replaces the selection with an HTML reference to the note. Make it so that the reference related stuff is done elsewehere.
export function createNoteData(annotation) {
  const { action, id, datetime, profile, selectionData, refId, refLabel, targetIRI, resourceIRI, selectionLanguage, targetLanguage } = annotation;

  var note = '';
  var mode = '';
  var ref;

  //TODO: This should be an object elsewhere?
  switch(profile) {
    case 'https://www.w3.org/ns/activitystreams':
      mode = 'object';
      break;
    default:
      mode = 'write';
      break;
  }

  let motivatedBy;

  switch(action) {
    // case 'sparkline':
    //   var figureIRI = generateAttributeId(null, opts.selectionDataSet);
    //   ref = '<span rel="schema:hasPart" resource="#figure-' + figureIRI + '">\n\
    //   <a href="' + opts.select + '" property="schema:name" rel="prov:wasDerivedFrom" resource="' + opts.select + '" typeof="qb:DataSet">' + opts.selectionDataSet + '</a> [' + escapeCharacters(Config.RefAreas[opts.selectionRefArea]) + ']\n\
    //   <span class="sparkline" rel="schema:image" resource="#' + figureIRI + '">' + opts.sparkline + '</span></span>';
    //   break;

    //External Note
    case 'approve': case 'disapprove': case 'specificity': case 'comment':
      if (action === 'approve' || action === 'disapprove') {
        motivatedBy = 'oa:assessing';
      }
      else if (action === 'specificity') {
        motivatedBy = 'oa:questioning';
      }
      else if (action === 'comment') {
        motivatedBy = 'oa:replying';
      }

      if (action !== 'article') {
        refLabel = DO.U.getReferenceLabel(motivatedBy);
      }

      ref = selectionData.selection;

      noteData = {
        "type": action,
        "mode": mode,
        "motivatedByIRI": motivatedBy,
        "id": id,
        "canonical": 'urn:uuid:' + id,
        "refId": refId,
        "refLabel": refLabel,
        // "iri": noteIRI, //e.g., https://example.org/path/to/article
        "creator": {},
        "datetime": datetime,
        "target": {
          "iri": targetIRI,
          "source": resourceIRI,
          "selector": {
            "exact": selectionData.selector.exact,
            "prefix": selectionData.selector.prefix,
            "suffix": selectionData.selector.suffix,
            "language": selectionLanguage
          },
          "language": targetLanguage
          //TODO: state
        }
      };

      var bodyObject = {
        "value": opts.content
      };

      if (language) {
        noteData["language"] = language;
        bodyObject["language"] = language;
      }
      if (license) {
        noteData["rights"] = noteData["license"] = license;
        bodyObject["rights"] = bodyObject["license"] = license;
      }

      noteData["body"] = [bodyObject].concat(DO.U.tagsToBodyObjects(opts.tagging));

      if (Config.User.IRI) {
        noteData.creator["iri"] = Config.User.IRI;
      }
      if (Config.User.Name) {
        noteData.creator["name"] = Config.User.Name;
      }
      noteData.creator["image"] = Config.User.Image || generateDataURI('image/svg+xml', 'base64', Icon['.fas.fa-user-secret']);
      if (Config.User.URL) {
        noteData.creator["url"] = Config.User.URL;
      }
      if (opts.annotationInboxLocation && Config.User.TypeIndex && Config.User.TypeIndex[ns.as.Announce.value]) {
        noteData.inbox = Config.User.TypeIndex[ns.as.Announce.value];
      }

      // note = DO.U.createNoteDataHTML(noteData);
      break;

    //Internal Note
    case 'note':
      motivatedBy = "oa:commenting";
      refLabel = DO.U.getReferenceLabel(motivatedBy);
      var docRefType = '<sup class="ref-comment"><a href="#' + id + '"rel="cito:isCitedBy">' + refLabel + '</a></sup>';
      var noteType = 'note';
      noteData = {
        "type": noteType,
        "mode": "read",
        "motivatedByIRI": motivatedBy,
        "id": id,
        "refId": refId,
        "refLabel": refLabel,
        // "iri": noteIRI, //e.g., https://example.org/path/to/article
        "creator": {},
        "datetime": datetime,
        "target": {
          "iri": targetIRI,
          "source": resourceIRI,
          "selector": {
            "exact": exact,
            "prefix": prefix,
            "suffix": suffix,
            "language": selectionLanguage
          },
          "language": targetLanguage
          //TODO: state
        }
      };

      var bodyObject = {
        "purpose": "describing",
        "value": opts.content
      };

      if (language) {
        noteData["language"] = language;
        bodyObject["language"] = language;
      }
      if (license) {
        noteData["rights"] = noteData["license"] = license;
        bodyObject["rights"] = bodyObject["license"] = license;
      }

      noteData["body"] = [bodyObject].concat(DO.U.tagsToBodyObjects(opts.tagging));

      if (Config.User.IRI) {
        noteData.creator["iri"] = Config.User.IRI;
      }
      if (Config.User.Name) {
        noteData.creator["name"] = Config.User.Name;
      }
      noteData.creator["image"] = Config.User.Image || generateDataURI('image/svg+xml', 'base64', Icon['.fas.fa-user-secret']);
      if (Config.User.URL) {
        noteData.creator["url"] = Config.User.URL;
      }

      // note = DO.U.createNoteDataHTML(noteData);

      ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType);
      break;

    case 'cite': //footnote reference
      switch(opts.citationType) {
        case 'ref-footnote': default:
          motivatedBy = "oa:describing";
          refLabel = DO.U.getReferenceLabel(motivatedBy);
          docRefType = '<sup class="' + opts.citationType + '"><a href="#' + id + '" rel="cito:isCitedBy">' + refLabel + '</a></sup>';
          noteData = {
            "type": opts.citationType,
            "mode": mode,
            "motivatedByIRI": motivatedBy,
            "id": id,
            "refId": refId,
            "refLabel": refLabel,
            // "iri": noteIRI,
            "datetime": datetime,
            "citationURL": opts.url
          };

          var bodyObject = {
            "value": opts.content
          };

          if (language) {
            noteData["language"] = language;
            bodyObject["language"] = language;
          }
          if (license) {
            noteData["rights"] = noteData["license"] = license;
            bodyObject["rights"] = bodyObject["license"] = license;
          }

          noteData["body"] = [bodyObject];

          // note = DO.U.createNoteDataHTML(noteData);
          break;

        case 'ref-reference':
          motivatedBy = 'oa:linking';
          refLabel = DO.U.getReferenceLabel('oa:linking');
          docRefType = '<span class="' + opts.citationType + '">' + Config.RefType[Config.DocRefType].InlineOpen + '<a href="#' + id + '">' + refLabel + '</a>' + Config.RefType[Config.DocRefType].InlineClose + '</span>';
          break;
      }

      ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType);
      break;
      // case 'reference':
      //   ref = '<span class="ref" about="[this:#' + refId + ']" typeof="dctypes:Text"><span id="'+ refId +'" property="schema:description">' + this.base.selection + '</span> <span class="ref-reference">' + Config.RefType[Config.DocRefType].InlineOpen + '<a rel="cito:isCitedBy" href="#' + id + '">' + refLabel + '</a>' + Config.RefType[Config.DocRefType].InlineClose + '</span></span>';
      // break;

    case 'semantics':
      //TODO: inlist, prefix
      //TODO: lang/xmlllang
      noteData = {
        about: opts.about,
        typeOf: opts.typeOf,
        rel: opts.rel,
        href: opts.href,
        resource: opts.resource,
        property: opts.property,
        content: opts.content,
        datatype: opts.datatype,
        lang: opts.language,
        textContent: _this.base.selection
      };
      ref = createRDFaHTML(noteData, 'expanded');
      break;

    case 'bookmark':
      noteType = 'bookmark';
      motivatedBy = "oa:bookmarking";
      refLabel = DO.U.getReferenceLabel(motivatedBy);
      docRefType = '';
      noteData = {
        "type": noteType,
        "mode": mode,
        "motivatedByIRI": motivatedBy,
        "id": id,
        "canonical": 'urn:uuid:' + id,
        "refId": refId,
        "refLabel": refLabel,
        // "iri": noteIRI, //e.g., https://example.org/path/to/article
        "creator": {},
        "datetime": datetime,
        "target": {
          "iri": targetIRI,
          "source": resourceIRI,
          "selector": {
            "exact": exact,
            "prefix": prefix,
            "suffix": suffix,
            "language": selectionLanguage
          },
          "language": targetLanguage
          //TODO: state
        }
      };

      var bodyObject = {
        "purpose": "describing",
        "value": opts.content
      };

      if (language) {
        noteData["language"] = language;
        bodyObject["language"] = language;
      }
      if (license) {
        noteData["rights"] = noteData["license"] = license;
        bodyObject["rights"] = bodyObject["license"] = license;
      }

      noteData["body"] = [bodyObject].concat(DO.U.tagsToBodyObjects(opts.tagging));

      if (Config.User.IRI) {
        noteData.creator["iri"] = Config.User.IRI;
      }
      if (Config.User.Name) {
        noteData.creator["name"] = Config.User.Name;
      }
      noteData.creator["image"] = Config.User.Image || generateDataURI('image/svg+xml', 'base64', Icon['.fas.fa-user-secret']);
      if (Config.User.URL) {
        noteData.creator["url"] = Config.User.URL;
      }

      // note = DO.U.createNoteDataHTML(noteData);
      ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType, { 'do': true });
      break;
  }

  DO.Editor.replaceSelectionWithFragment(fragmentFromString(ref));

  return noteData;
}
