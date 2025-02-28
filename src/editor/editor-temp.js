export const Editor = {
  showEditorModeActionMessage: function(e, mode) {
    if (e || (typeof e === 'undefined' && mode == 'author')) {
      var message = 'Activated <em>' + mode + '</em> mode.';
      message = {
        'content': message,
        'type': 'info'
      }
      addMessageToLog(message, Config.MessageLog);
      showActionMessage(document.documentElement, message);
    }
  },

  setEditorDataItems(e) {
    if (e && e.target.closest('button.editor-enable')) {
      DO.C.ContentEditable = true;
      // document.addEventListener('click', DO.U.updateDocumentTitle);
      DO.U.updateDocumentTitle();
      var documentURL = DO.C.DocumentURL;

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


      var s = DO.C.Resource[documentURL].graph.node(rdf.namedNode(documentURL));

      DO.C.ContributorRoles.forEach(contributorRole => {
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
        if (DO.C.User.IRI && !s.out(ns.schema[contributorRole]).values.includes(DO.C.User.IRI)){
          var contributorId;
          var contributorName = DO.C.User.Name || DO.C.User.IRI;
          if (DO.C.User.Name) {
            contributorId = generateAttributeId(null, DO.C.User.Name);
            if (document.getElementById(contributorId)) {
              contributorId = generateAttributeId(null, DO.C.User.Name, contributorRole);
            }
          }
          else {
            contributorId = generateAttributeId(null, DO.C.User.IRI);
          }
          contributorId = ' id="' + contributorId + '"';

          var contributorInList = (DO.C.Resource[documentURL].rdftype.includes(ns.schema.ScholarlyArticle.value)) ?
            ' inlist="" rel="bibo:' + contributorRole + 'List" resource="' + DO.C.User.IRI + '"' : '';

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
            DO.U.shareResource(e);
            e.target.removeAttribute('disabled');
          }
        });

        //TODO: Show 'Remove' button for selected contributor (before exiting edit mode).

        //TODO: Update getResourceInfo() so that DO.C.Resource[documentURL] can be used to check other contributors while still in edit.
      })

      var documentModified = 'document-modified';
      var modified = document.getElementById(documentModified);
      var lastModified = DO.C.Resource[DO.C.DocumentURL]?.headers?.['last-modified']?.['field-value'];
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
  },

  toggleEditor: function(mode, e, selector) {
    DO.C.User.Role = mode;
    updateLocalStorageProfile(DO.C.User);
    Editor.init(mode);
    DO.U.showEditorModeActionMessage(e, mode);
    DO.C.EditorEnabled = (mode === 'author');

    setEditorDataItems(e);

    //XXX: This should be perhaps limited to certain nodes?
    document.querySelectorAll('.do').forEach(node => {
      node.setAttribute('contenteditable', 'false');
    });
  },

} //DO.U.Editor