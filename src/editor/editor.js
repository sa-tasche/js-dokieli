import { EditorView } from "prosemirror-view";
import { DOMParser, DOMSerializer } from "prosemirror-model";
import { Plugin, EditorState } from "prosemirror-state"
import { history } from 'prosemirror-history';
import { schema } from "./schema/base.js"
import { keymapPlugin } from "./toolbar/author/keymap.js";
import { AuthorToolbar } from "./toolbar/author/author.js";
import { SocialToolbar } from "./toolbar/social/social.js";
import Config from "./../config.js";
import { addMessageToLog, getAgentHTML, getLanguageOptionsHTML, getLicenseOptionsHTML, getPublicationStatusOptionsHTML, getResourceTypeOptionsHTML, insertDocumentLevelHTML, selectArticleNode, setDate, setEditSelections, showActionMessage } from "../doc.js";
import { getAgentName, getGraphImage, getGraphInbox, getGraphTypes, getResourceGraph } from "../graph.js";
import { fragmentFromString, generateAttributeId } from "../util.js";
import { updateLocalStorageProfile } from "../storage.js";
import rdf from 'rdf-ext';
import { Icon } from "../ui/icons.js";

const ns = Config.ns;

export class Editor {
  constructor(mode, node) {
    this.mode = mode || Config.mode;
    //TODO: Look into replacing document.body with selectArticleNode(document) so that main > article, article, or body is used?
    // if body is used, take care to filter out do elements at this point
    // TODO: When choosing the editor node, we need to filter out these items from the content of the editor node. we also need to restore the body to its original form WITH the do elements.
    this.node = node || document.body;
    this.editorView = null;
    this.socialToolbarView = null;
    this.authorToolbarView = null;

    this.hasRunTextQuoteSelector = false;
  }

  // Initialize editor and toolbar based on the default editor mode
  init(mode, node) {
    this.mode = mode || this.mode;
    this.node = node || this.node;

    switch (this.mode) {
      case 'author':
        this.destroySocialToolbar();
        this.authorToolbarView = this.createEditor(this.node);
        break;

      case 'social':
      default:
        this.destroyEditor();
        this.createSocialToolbar(this.node);
        break;
    }

    if (!this.hasRunTextQuoteSelector && (this.socialToolbarView || this.authorToolbarView)) {
      this.showTextQuoteSelectorFromLocation();
      this.hasRunTextQuoteSelector = true;
    }
  }

  showEditorModeActionMessage(e, mode) {
    if (e || (typeof e === 'undefined' && mode == 'author')) {
      var message = 'Activated <em>' + mode + '</em> mode.';
      message = {
        'content': message,
        'type': 'info'
      }
      addMessageToLog(message, Config.MessageLog);
      showActionMessage(document.documentElement, message);
    }
  }

  toggleEditor(mode, e) {
    Config.User.Role = mode;
    updateLocalStorageProfile(Config.User);
    const node = document.body;
    this.init(mode, node);
    this.showEditorModeActionMessage(e, mode);
    Config.EditorEnabled = (mode === 'author');

    // this.setEditorDataItems(e);
  }

  importTextQuoteSelector(containerNode, selector, refId, motivatedBy, docRefType, options) {
    const toolbarView = this.authorToolbarView || this.socialToolbarView;
    return toolbarView?.importTextQuoteSelector(containerNode, selector, refId, motivatedBy, docRefType, options)
  }

  showTextQuoteSelectorFromLocation() {
    const toolbarView = this.authorToolbarView || this.socialToolbarView;
    return toolbarView?.showTextQuoteSelectorFromLocation();
  }

  replaceSelectionWithFragment(fragment){
    console.log(this)
    const toolbarView = this.authorToolbarView || this.socialToolbarView;
    console.log(toolbarView)
    console.log(toolbarView?.replaceSelectionWithFragment)
    return toolbarView?.replaceSelectionWithFragment(fragment)
  }


  //Creating a ProseMirror editor view at a specified this.node
  createEditor() {
    this.authorToolbarView = new AuthorToolbar('author', ['p', 'h1', 'h2', 'h3', 'h4', 'em', 'strong', 'a', 'img', 'ol', 'ul', 'pre', 'code', 'blockquote', 'q', 'semantics', 'citation', 'note']);
    const editorToolbarPlugin = new Plugin({
      // this editorView is passed onto the Plugin - not this.editorView
      view(editorView) {
        // Create new class to hold editor and internal state such as editorView, HTML DOM elements, commands

        console.log(editorView);

        //TODO: 'math', 'sparkline',
        this.authorToolbarView.initEditorView(editorView);

        // Append DOM portion of toolbar to current editor.
        // editorView.dom.parentNode.appendChild(toolbarView.dom);

        // Return toolbar class. Caller will call its update method in every editor update.
        console.log(this.authorToolbarView)
        return this.authorToolbarView;
      }
    });

    const state = EditorState.create({
      doc: DOMParser.fromSchema(schema).parse(this.node),
      plugins: [history(), keymapPlugin, editorToolbarPlugin]
    });

    this.node.replaceChildren();

    this.editorView = new EditorView(this.node, { 
      state, 
      editable: () => true,
     });

    console.log("Editor created. Mode:", this.mode);
  }

  destroyEditor() {
    if (this.editorView) {
      console.log(this.editorView.state.doc.content);
      const content = DOMSerializer.fromSchema(schema).serializeFragment(this.editorView.state.doc.content);
      // const serializer = DOMSerializer.fromSchema(schema);

      // const fragment = serializer.serializeFragment(view.state.doc.content);

      // const htmlString = new XMLSerializer().serializeToString(fragment);
      // document.body.innerHTML = htmlString;

      this.editorView.destroy();
      this.editorView = null;
      //FIXME: DO NOT USE innerHTML
      // TODO: is there HTML serializer? 
      this.node.innerHTML = new XMLSerializer().serializeToString(content);
      //TODO: Test below for above.
      // document.body.replaceChildren(new DOMParser().parseFromString(content, "text/html").body);

      console.log("Editor destroyed. Mode:", this.mode);
    }
  }

  createSocialToolbar() {
    // Create and initialize the SocialToolbar only when in social mode
    console.log("creating social toolbar")
    this.socialToolbarView = new SocialToolbar('social', ['share', 'approve', 'disapprove', 'specificity', 'bookmark', 'comment']);
    document.body.appendChild(this.socialToolbarView.dom); // idk why this is needed? or is it not?
    console.log("SocialToolbar created. Mode:", this.mode);
  }
  

  destroySocialToolbar() {
    if (this.socialToolbarView) {
      this.socialToolbarView.destroy();
      this.socialToolbarView = null;
      console.log("SocialToolbar destroyed. Mode:", this.mode);
    }
  }


  updateDocumentTitle() {
    var h1 = document.querySelector('h1');
    if (h1) {
      document.title = h1.textContent.trim();
    }
  }

  setEditorDataItems(e) {
    if (e && e.target.closest('button.editor-enable')) {
      this.updateDocumentTitle();
      var documentURL = Config.DocumentURL;

      //XXX: THIS MAY NO LONGER BE NEEDED
      //FIXME: This is a horrible way of hacking MediumEditorTable
      // document.querySelectorAll('i.fa-table, i.fa-link, i.fa-picture-o').forEach(i => {
      //   var icon = Icon[".fas.fa-table.fa-2x"].replace(/ fa\-2x/, '');

      //   if (i.classList.contains('fa-link') > 0) {
      //     icon = Icon[".fas.fa-link"];
      //   }
      //   else if (i.classList.contains('fa-image') > 0) {
      //     icon = Icon[".fas.fa-image"];
      //   }

      //   i.parentNode.replaceChild(fragmentFromString(icon), i);
      // });


      var s = Config.Resource[documentURL].graph.node(rdf.namedNode(documentURL));

      Config.ContributorRoles.forEach(contributorRole => {
      // console.log(contributorRole)
        var contributorNodeId = 'document-' + contributorRole + 's';
        var contributorNode = document.getElementById(contributorNodeId);
        if (!contributorNode) {
          var contributorTitle = contributorRole.charAt(0).toUpperCase() + contributorRole.slice(1) + 's';
          contributorNode = '        <dl id="' + contributorNodeId + '"><dt>' + contributorTitle + '</dt></dl>';
          insertDocumentLevelHTML(document, contributorNode, { 'id': contributorNodeId })
          contributorNode = document.getElementById(contributorNodeId);
        }

        //User can add themselves as a contributor
        if (Config.User.IRI && !s.out(ns.schema[contributorRole]).values.includes(Config.User.IRI)){
          var contributorId;
          var contributorName = Config.User.Name || Config.User.IRI;
          if (Config.User.Name) {
            contributorId = generateAttributeId(null, Config.User.Name);
            if (document.getElementById(contributorId)) {
              contributorId = generateAttributeId(null, Config.User.Name, contributorRole);
            }
          }
          else {
            contributorId = generateAttributeId(null, Config.User.IRI);
          }
          contributorId = ' id="' + contributorId + '"';

          var contributorInList = (Config.Resource[documentURL].rdftype.includes(ns.schema.ScholarlyArticle.value)) ?
            ' inlist="" rel="bibo:' + contributorRole + 'List" resource="' + Config.User.IRI + '"' : '';

          var userHTML = '<dd class="do"' + contributorId + contributorInList + '><span about="" rel="schema:' + contributorRole + '">' + getAgentHTML({'avatarSize': 32}) + '</span><button class="add-' + contributorRole + '" contenteditable="false" title="Add ' + contributorName + ' as ' + contributorRole + '">' + Icon[".fas.fa-plus"] + '</button></dd>';

          contributorNode.insertAdjacentHTML('beforeend', userHTML);
        }

        //User can enter a contributor's WebID
        contributorNode.insertAdjacentHTML('beforeend', '<dd class="do"><button class="enter-' + contributorRole + '" contenteditable="false" title="Enter ' + contributorRole +'">' + Icon[".fas.fa-user-plus"] + '</button></dd>');

        //User can invite a contributor from their contacts
        contributorNode.insertAdjacentHTML('beforeend', '<dd class="do"><button class="invite-' + contributorRole + '" contenteditable="false" title="Invite ' + contributorRole +'">' + Icon[".fas.fa-bullhorn"] + '</button></dd>');

        contributorNode = document.getElementById(contributorNodeId);
        contributorNode.addEventListener('click', (e) => {
          var button = e.target.closest('button.add-' + contributorRole);
          if (button){
            var n = e.target.closest('.do');
            if (n) {
              n.classList.add('selected');
            }
            button.parentNode.removeChild(button);
          }

          button = e.target.closest('button.enter-' + contributorRole);
          //TODO: This input field can behave like the one in js showUserIdentityInput for enableDisableButton to button.commit
          if (button){
            n = e.target.closest('.do');
            n.insertAdjacentHTML('beforebegin', '<dd class="do" contenteditable="false"><input contenteditable="false" name="enter-' + contributorRole + '" placeholder="https://csarven.ca/#i" type="text" value="" /> <button class="commit-' + contributorRole + '" contenteditable="false" title="Commit ' + contributorRole + '">' + Icon[".fas.fa-plus"] + '</button></dd>');
          }

          button = e.target.closest('button.commit-' + contributorRole);
          if (button){
            n = e.target.closest('.do');
            if (n) {
              n.classList.add('selected');

              var input = n.querySelector('input');
              var iri = input.value.trim();

              //TODO:
              // button.disabled = true;
              // button.parentNode.disabled = true;
              // button.querySelector('svg').classList.add('fa-spin');

              if (iri.startsWith('http')) {
                //TODO: Refactor. There is overlap with addShareResourceContactInput and getAgentHTML
                getResourceGraph(iri).then(s => {
                  // var iri = s.iri().toString();
                  // var id = encodeURIComponent(iri);

                  var name = getAgentName(s) || iri;
                  var img = getGraphImage(s);

                  img = (img && img.length) ? '<img alt="" height="32" rel="schema:image" src="' + img + '" width="32" /> ' : '';
                  var userHTML = fragmentFromString('<span about="" rel="schema:' + contributorRole + '"><span about="' + iri + '" typeof="schema:Person">' + img + '<a href="' + iri + '" rel="schema:url">' + name + '</a></span></span>');

                  n.replaceChild(userHTML, input);
                  button.parentNode.removeChild(button);
                });
              }
              else {
                input.focus();
              }
            }
          }

          if (e.target.closest('button.invite-' + contributorRole)) {
            //TODO: Temporarily disabled. Below is the intended place. Bring it back when shareResource (and related stuff) is moved from DO.U. to editor.js or related file.
            // DO.U.shareResource(e);
            console.log("TODO: Temporarily disabled. Check 'button.invite-' + contributorRole")
            e.target.removeAttribute('disabled');
          }
        });

        //TODO: Show 'Remove' button for selected contributor (before exiting edit mode).

        //TODO: Update getResourceInfo() so that Config.Resource[documentURL] can be used to check other contributors while still in edit.
      })

      var documentModified = 'document-modified';
      var modified = document.getElementById(documentModified);
      var lastModified = Config.Resource[Config.DocumentURL]?.headers?.['last-modified']?.['field-value'];
      if(!modified && lastModified) {
        lastModified = new Date(lastModified);
        setDate(document, { 'id': 'document-modified', 'property': 'schema:dateModified', 'title': 'Modified', 'datetime': lastModified } );
      }

      var documentLanguage = 'document-language';
      var language = document.getElementById(documentLanguage);
      if(!language) {
        var dl = '        <dl class="do" id="' + documentLanguage + '"><dt>Language</dt><dd><select contenteditable="false" name="language">' + getLanguageOptionsHTML({ 'selected': '' }) + '</select></dd></dl>';
        insertDocumentLevelHTML(document, dl, { 'id': documentLanguage });

        var dLangS = document.querySelector('#' + documentLanguage + ' select');
        dLangS.addEventListener('change', (e) => {
          dLangS.querySelectorAll('option').forEach(o => {
            o.removeAttribute('selected');
          });
          dLangS.querySelector('option[value="' + e.target.value + '"]').setAttribute('selected', 'selected');
        });
      }

      var documentLicense = 'document-license';
      var license = document.getElementById(documentLicense);
      if(!license) {
        dl = '        <dl class="do" id="' + documentLicense + '"><dt>License</dt><dd><select contenteditable="false" name="license">' + getLicenseOptionsHTML({ 'selected': '' }) + '</select></dd></dl>';
        insertDocumentLevelHTML(document, dl, { 'id': documentLicense });

        var dLS = document.querySelector('#' + documentLicense + ' select');
        dLS.addEventListener('change', (e) => {
          dLS.querySelectorAll('option').forEach(o => {
            o.removeAttribute('selected');
          });
          dLS.querySelector('option[value="' + e.target.value + '"]').setAttribute('selected', 'selected');
        });
      }

      var documentType = 'document-type';
      var type = document.getElementById(documentType);
      if(!type) {
        dl = '        <dl class="do" id="' + documentType + '"><dt>Document Type</dt><dd><select contenteditable="false" name="document-type">' + getResourceTypeOptionsHTML({ 'selected': '' }) + '</select></dd></dl>';
        insertDocumentLevelHTML(document, dl, { 'id': documentType });

        var dTypeS = document.querySelector('#' + documentType + ' select');
        dTypeS.addEventListener('change', (e) => {
          dTypeS.querySelectorAll('option').forEach(o => {
            o.removeAttribute('selected');
          });
          dTypeS.querySelector('option[value="' + e.target.value + '"]').setAttribute('selected', 'selected');
        });
      }

      var documentStatus = 'document-status';
      var status = document.getElementById(documentStatus);
      if(!status) {
        dl = '        <dl class="do" id="' + documentStatus + '"><dt>Document Status</dt><dd><select contenteditable="false" name="status">' + getPublicationStatusOptionsHTML({ 'selected': '' }) + '</select></dd></dl>';
        insertDocumentLevelHTML(document, dl, { 'id': documentStatus });

        var dSS = document.querySelector('#' + documentStatus + ' select');
        dSS.addEventListener('change', (e) => {
          dSS.querySelectorAll('option').forEach(o => {
            o.removeAttribute('selected');
          });
          dSS.querySelector('option[value="' + e.target.value + '"]').setAttribute('selected', 'selected');
        });
      }

      if (getGraphTypes(s).includes(ns.doap.Specification.value)) {
        var documentTestSuite = 'document-test-suite';
        var testSuite = document.getElementById(documentTestSuite);
        if (!testSuite) {
          // <!--<button class="add-test-suite" contenteditable="false" title="Add test suite">' + Icon[".fas.fa-plus"] + '</button>-->
          dl = '        <dl class="do" id="' + documentTestSuite + '"><dt>Test Suite</dt><dd><input contenteditable="false" name="test-suite" placeholder="https://example.net/test-suite" type="text" value="" /></dd></dl>';
          insertDocumentLevelHTML(document, dl, { 'id': documentTestSuite });

          //XXX: This is a workaround until we understand why the input value is not available in setEditSelections() where it is using `document.querySelector` to get the value fresh. The following catches the blur event and sets the input value back to itself, and that seems to be available setEditSelections().
          var dTS = document.querySelector('#' + documentTestSuite + ' input');
          dTS.addEventListener('blur', (e) => {
            dTS.setAttribute('value', dTS.value)
          });
        }
      }

      var inbox = getGraphInbox(s);
      if (!inbox?.length) {
        var documentInbox = 'document-inbox';
        var inbox = document.getElementById(documentInbox);
        if (!inbox) {
          //XXX: <!--<button class="add-inbox" contenteditable="false" title="Add inbox">' + Icon[".fas.fa-plus"] + '</button>-->
          dl = '        <dl class="do" id="' + documentInbox + '"><dt>Inbox</dt><dd><input contenteditable="false" name="inbox" placeholder="https://example.net/inbox/" type="text" value="" /></dd></dl>';
          insertDocumentLevelHTML(document, dl, { 'id': documentInbox });

          //XXX: Same as above comment about workaround for setEditSelections
          var dI = document.querySelector('#' + documentInbox + ' input');
          dI.addEventListener('blur', (e) => {
            dI.setAttribute('value', dI.value);
          });
        }
      }

      if (!s.out(ns.as.inReplyTo).values.length) {
        var documentInReplyTo = 'document-in-reply-to';
        var inReplyTo = document.getElementById(documentInReplyTo);
        if (!inReplyTo) {
          //XXX: <!--<button class="add-in-reply-to" contenteditable="false" title="Add in-reply-to">' + Icon[".fas.fa-plus"] + '</button>-->
          dl = '        <dl class="do" id="' + documentInReplyTo + '"><dt>In Reply To</dt><dd><input contenteditable="false" name="in-reply-to" placeholder="https://example.net/article" type="text" value="" /></dd></dl>';
          insertDocumentLevelHTML(document, dl, { 'id': documentInReplyTo });

          //XXX: Same as above comment about workaround for setEditSelections
          var dIRT = document.querySelector('#' + documentInReplyTo + ' input');
          dIRT.addEventListener('blur', (e) => {
            dIRT.setAttribute('value', dI.value);
          });
        }
      }
    }
    else if (e && e.target.closest('button.editor-disable')) {
      setEditSelections();
    }
  }
}
