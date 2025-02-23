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

  toggleEditor: function(editorMode, e, selector) {
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


  //Adapted from MediumEditor's Anchor Form
  Note: (function() {
    if (typeof MediumEditor !== 'undefined') {
      return MediumEditor.extensions.form.extend({

        // Called when the button the toolbar is clicked
        // Overrides ButtonExtension.handleClick
        handleClick: function (event) {
          var updateAnnotationServiceForm = function() {
            var annotationServices = document.querySelectorAll('.annotation-location-selection');
            for (var i = 0; i < annotationServices.length; i++) {
              annotationServices[i].innerHTML = getAnnotationLocationHTML();
            }
          };

          var updateAnnotationInboxForm = function() {
            var annotationInbox = document.querySelectorAll('.annotation-inbox');
            for (var i = 0; i < annotationInbox.length; i++) {
              annotationInbox[i].innerHTML = getAnnotationInboxLocationHTML();
            }
          };

          updateAnnotationInboxForm();

          return getLinkRelation(ns.oa.annotationService.value, null, getDocument()).then(
            function(url) {
              DO.C.AnnotationService = url[0];
              updateAnnotationServiceForm();
              showAction();
            },
            function(reason) {
              if(_this.signInRequired && !DO.C.User.IRI) {
                showUserIdentityInput();
              }
              else {
                updateAnnotationServiceForm();
                showAction();
              }
            }
          );
        },

        showForm: function (opts) {
          var _this = this;
          var input = this.getInput(),
            targetCheckbox = this.getAnchorTargetCheckbox(),
            buttonCheckbox = this.getAnchorButtonCheckbox();

          opts = opts || { url: '' };
          // TODO: This is for backwards compatability
          // We don't need to support the 'string' argument in 6.0.0
          if (typeof opts === 'string') {
            opts = {
              url: opts
            };
          }

          var initialSelectedParentElement = this.base.getSelectedParentElement();
          var initialSelectionState = MediumEditor.selection.exportSelection(initialSelectedParentElement, this.document);

          //XXX: Get this before getForm.
          var selection = MediumEditor.selection.getSelectionHtml(this.document).trim();
          this.base.saveSelection();
          this.hideToolbarDefaultActions();
          var form = this.getForm();
          form.style.display = 'block';
          this.setToolbarPosition();

          input.value = opts.url;

          switch(this.action) {
            case 'rdfa':
              input.about.focus();
              break;
            case 'article': case 'note': case 'approve': case 'disapprove': case 'specificity':
              input.content.focus();
              break;
            case 'cite':
              input.search.focus();
              input.search.value = selection;

              var specrefSearchResults = document.querySelector('.specref-search-results');
              if(specrefSearchResults) {
                specrefSearchResults.innerHTML = '';
              }

              var specref = document.querySelector('#specref-search-submit');
              specref.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
// console.log(e);

                var keyword = input.search.value.trim();
                var url = 'https://api.specref.org/search-refs?q=' + keyword;
                var headers = {'Accept': 'application/json'};
                var options = {'noCredentials': true};

                getResource(url, headers, options).then(response => {
                  // console.log(response);
                  return response.text();
                }).then(data => {
                  data = JSON.parse(data);
// console.log(data);

                  var searchResultsHTML = '';
                  var searchResultsItems = [];

                  var href, title, publisher, date, status;

                  //TODO: Clean input data

                  Object.keys(data).forEach(key => {
// console.log(data[key])
                    if ('href' in data[key] &&
                        !('aliasOf' in data[key]) && !('versionOf' in data[key]) &&

                      //fugly WG21
                        (!('publisher' in data[key]) || ((data[key].publisher.toLowerCase() != 'wg21') || ((data[key].href.startsWith('https://wg21.link/n') || data[key].href.startsWith('https://wg21.link/p') || data[key].href.startsWith('https://wg21.link/std')) && !data[key].href.endsWith('.yaml') && !data[key].href.endsWith('/issue') && !data[key].href.endsWith('/github') && !data[key].href.endsWith('/paper'))))

                        ) {

                      href = data[key].href;
                      title = data[key].title || href;
                      publisher = data[key].publisher || '';
                      date = data[key].date || '';
                      status = data[key].status || '';

                      if (publisher) {
                        publisher = '. ' + publisher;
                      }
                      if (date) {
                        date = '. ' + date;
                      }
                      if (status) {
                        status = '. ' + status;
                      }

                      searchResultsItems.push('<li><input type="radio" name="specref-item" value="' + key + '" id="ref-' + key + '" /> <label for="ref-' + key + '"><a href="' + href + '" target="_blank">' + title + '</a>' + publisher + date + status + '</label></li>');
                    }
                  });

                  searchResultsHTML = '<ul>' + searchResultsItems.join('') + '</ul>';

                  if (searchResultsItems) {
                    specrefSearchResults = document.querySelector('.specref-search-results');
                    if(specrefSearchResults) {
                      specrefSearchResults.innerHTML = searchResultsHTML;
                    }

                    //XXX: Assigning 'change' action to ul because it gets removed when there is a new search result / replaced. Perhaps it'd be nicer (but more expensive?) to destroy/create .specref-search-results node?
                    specrefSearchResults.querySelector('ul').addEventListener('change', (e) => {
                      var checkedCheckbox = e.target.closest('input');
                      if (checkedCheckbox) {
// console.log(e.target);
                        document.querySelector('#citation-url').value = data[checkedCheckbox.value].href;
                      }
                    });
                  }
                });

              });

              input.url.focus();
              document.querySelector('.medium-editor-toolbar-form input[name="citation-type"]').checked = true;
              break;
            case 'sparkline':
              input.search.focus();
              input.search.value = selection;

              var inputSearch = function(e){
                if(e.which == 13) {
                  e.preventDefault();
                  e.stopPropagation();
                  _this.base.restoreSelection();
                  MediumEditor.util.insertHTMLCommand(document, e.target.value);
                  var selection = { start: initialSelectionState.start, end: (initialSelectionState.start + e.target.value.length) };
                  MediumEditor.selection.importSelection(selection, initialSelectedParentElement, document);
                  _this.base.checkSelection();
                  e.target.setAttribute('data-event-keyup-enter', true);
                  _this.showForm();
                  return;
                }
              }
              if(!input.search.getAttribute('data-event-keyup-enter')) {
                input.search.addEventListener('keyup', inputSearch, false);
              }

              var sparqlEndpoint = 'http://worldbank.270a.info/';
              var resourceType = '<http://purl.org/linked-data/cube#DataSet>';
              var sparklineGraphId = 'sparkline-graph';
              var resultContainerId = 'sparkline-select';
              //TODO: This should be from user's preference?
              var lang = 'en';

              //TODO: What's the best way for user input? ' of '
              var textInputA = selection.split(' of ')[0];
              var textInputB = selection.substr(selection.indexOf(' of ') + 4);

              if(!DO.C.RefAreas[textInputB.toUpperCase()]) {
                Object.keys(DO.C.RefAreas).forEach(key => {
                  if(DO.C.RefAreas[key].toLowerCase() == textInputB.toLowerCase()) {
                    textInputB = key;
                  }
                });
              }

              var sG = document.getElementById(sparklineGraphId);
              if(sG) {
                sG.parentNode.removeChild(sG);
              }

              if(!DO.C.RefAreas[textInputB.toUpperCase()]) {
                var refAreas;
                Object.keys(DO.C.RefAreas).forEach(key => {
                  refAreas += '<option value="' + key + '">' + key + ' - ' + DO.C.RefAreas[key] + '</option>';
                });
                form.querySelector('.medium-editor-toolbar-save').insertAdjacentHTML('beforebegin', '<div id="' + sparklineGraphId + '">`' + textInputB + '` is not available. Try: ' + '<select name="refAreas"><option>Select a reference area</option>' + refAreas + '</select></div>');
                var rA = document.querySelector('#' + sparklineGraphId + ' select[name="refAreas"]');
                rA.addEventListener('change', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  textInputB = e.target.value;
                  input.search.value = textInputA + ' of ' + textInputB;
                  form.querySelector('#sparkline-selection-dataset').value = textInputA;
                  form.querySelector('#sparkline-selection-refarea').value = textInputB;

                  _this.base.restoreSelection();
                  MediumEditor.util.insertHTMLCommand(document, input.search.value);
                  var selection = { start: initialSelectionState.start, end: (initialSelectionState.start + input.search.value.length) };
                  MediumEditor.selection.importSelection(selection, initialSelectedParentElement, document);
                  _this.base.checkSelection();
                  _this.showForm();
                });
                return;
              }

              var options = {};
              options.filter = {
                dimensionProperty: 'sdmx-dimension:refArea',
                dimensionRefAreaNotation: textInputB
              };
              options.optional = { prefLabels: ["dcterms:title"] };

              var queryURL = DO.U.SPARQLQueryURL.getResourcesOfTypeWithLabel(sparqlEndpoint, resourceType, textInputA.toLowerCase(), options);

              queryURL = getProxyableIRI(queryURL);

              form.querySelector('.medium-editor-toolbar-save').insertAdjacentHTML('beforebegin', '<div id="' + sparklineGraphId + '"></div>' + Icon[".fas.fa-circle-notch.fa-spin.fa-fw"]);
              sG = document.getElementById(sparklineGraphId);

              getResourceGraph(queryURL)
                .then(g => {
                  sG.removeAttribute('class');
                  var triples = sortGraphTriples(g, { sortBy: 'object' });
                  return DO.U.getListHTMLFromTriples(triples, {element: 'select', elementId: resultContainerId});
                })
                .then(listHTML => {
                  sG.innerHTML = listHTML;
                  form.removeChild(form.querySelector('.fas.fa-circle-notch.fa-spin.fa-fw'));
                })
                .then(x => {
                  var rC = document.getElementById(resultContainerId);
                  rC.addEventListener('change', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    var sparkline = sG.querySelectorAll('.sparkline, .sparkline-info');
                    for (var i = 0; i < sparkline.length; i++) {
                      sparkline[i].parentNode.removeChild(sparkline[i]);
                    }
                    form.querySelector('.medium-editor-toolbar-save').insertAdjacentHTML('beforebegin', Icon[".fas.fa-circle-notch.fa-spin.fa-fw"]);

                    var dataset = e.target.value;
                    var title = e.target.querySelector('*[value="' + e.target.value + '"]').textContent.trim();
                    //XXX: Should this replace the initial search term?
                    form.querySelector('#sparkline-selection-dataset').value = title;
                    form.querySelector('#sparkline-selection-refarea').value = textInputB.toUpperCase();

                    var refArea = textInputB.toUpperCase();
                    var paramDimension = "\n\
?propertyRefArea rdfs:subPropertyOf* sdmx-dimension:refArea .\n\
?observation ?propertyRefArea [ skos:notation '" + refArea + "' ] .";

// console.log(dataset);
// console.log(refArea);
                    var queryURL = DO.U.SPARQLQueryURL.getObservationsWithDimension(sparqlEndpoint, dataset, paramDimension);
// console.log(queryURL);
                    queryURL = getProxyableIRI(queryURL);

                    getResourceGraph(queryURL)
                      .then(g => {
                        var triples = sortGraphTriples(g, { sortBy: 'object' });
// console.log(triples);
                        if (triples.length) {
                          var observations = {};
                          triples.forEach(t => {
                            var s = t.subject.value;
                            var p = t.predicate.value;
                            var o = t.object.value;
                            observations[s] = observations[s] || {};
                            observations[s][p] = o;
                          });
// console.log(observations);
                          var list = [], item;
                          Object.keys(observations).forEach(key => {
                            item = {};
                            observations[key][ns.qb.Observation.value] = key;
                            item[key] = observations[key];
                            list.push(item[key]);
                          });
                          var sortByKey = ns['sdmx-dimension'].refPeriod;
                          list.sort(function (a, b) {
                            return a[sortByKey].toLowerCase().localeCompare(b[sortByKey].toLowerCase());
                          });
// console.log(list);
                          var options = {
                            url: dataset,
                            title: title
                          };
                          var sparkline = DO.U.getSparkline(list, options);
                          sG.insertAdjacentHTML('beforeend', '<span class="sparkline">' + sparkline + '</span> <span class="sparkline-info">' + triples.length + ' observations</span>');
                            form.removeChild(form.querySelector('.fas.fa-circle-notch.fa-spin.fa-fw'));
                        }
                        else {
                          //This shouldn't happen.
                          sG.insertAdjacentHTML('beforeend', '<span class="sparkline-info">0 observations. Select another.</span>');
                        }
                      });
                  });
                });
              break;
          }

        },


        getFormOpts: function () {
          switch(this.action) {

            case 'article': case 'approve': case 'disapprove': case 'specificity':
              opts.content = this.getInput().content.value;
              var aLS = this.getInput().annotationLocationService;
              DO.C.User.UI['annotationLocationService'] = { checked: false }
              if(aLS) {
                DO.C.User.UI.annotationLocationService.checked = opts.annotationLocationService = aLS.checked;
              }
              var aLPS = this.getInput().annotationLocationPersonalStorage;
              DO.C.User.UI['annotationLocationPersonalStorage'] = { checked: false }
              if(aLPS) {
                DO.C.User.UI.annotationLocationPersonalStorage.checked = opts.annotationLocationPersonalStorage = aLPS.checked;
              }
              var aIL = this.getInput().annotationInboxLocation;
              DO.C.User.UI['annotationInboxLocation'] = { checked: false }
              if(aIL) {
                DO.C.User.UI.annotationInboxLocation.checked = opts.annotationInboxLocation = aIL.checked;
              }

              break;
          }


        },

        completeFormSave: function (opts) {
          var _this = this;
// console.log(this.base)
// console.log(opts);
// console.log('completeFormSave() with this.action: ' + this.action);
          this.base.restoreSelection();
          var range = MediumEditor.selection.getSelectionRange(this.document);
          var selectedParentElement = this.base.getSelectedParentElement();
// console.log('getSelectedParentElement:');
// console.log(selectedParentElement);

          //Mark the text which the note was left for (with reference to the note?)
          this.base.selectedDocument = this.document;
          this.base.selection = MediumEditor.selection.getSelectionHtml(this.base.selectedDocument); //.replace(DO.C.Editor.regexEmptyHTMLTags, '');
// console.log('this.base.selection:');
// console.log(this.base.selection);

          var exact = this.base.selection;
          var selectionState = MediumEditor.selection.exportSelection(selectedParentElement, this.document);
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

          //Annotating an annotation
          //FIXME: A bit hacky - should use RDF
          var annotationInbox = selectedParentElement.closest('.do[typeof="oa:Annotation"]');
          if (annotationInbox) {
            annotationInbox = annotationInbox.querySelector('[rel="ldp:inbox"]');
            if (annotationInbox) {
              annotationInbox = annotationInbox.href || annotationInbox.getAttribute('resource')
              annotationInbox = decodeURIComponent(annotationInbox);
            }
          }

          var datetime = getDateTimeISO();
          var id = generateAttributeId();
          var refId = 'r-' + id;
          // var noteId = 'i-' + id;

          var resourceIRI = DO.C.DocumentURL;
          var containerIRI = window.location.href;

          var selectorIRI = resourceIRI + '#selector(type=TextQuoteSelector,prefix=' + encodeURIComponent(prefix) + ',exact=' + encodeURIComponent(exact) + ',suffix=' + encodeURIComponent(suffix) +')';

          var contentType = 'text/html';
          var noteIRI, noteURL;
          var profile;
          var options = {};
          var annotationDistribution = [] , aLS = {};

          var activityTypeMatched = false;
          var activityIndex = DO.C.ActionActivityIndex[_this.action];

          function isDuplicateLocation(annotationDistribution, containerIRI) {
            return Object.keys(annotationDistribution).some(
              item => annotationDistribution[item].containerIRI == containerIRI
            );
          }

          //Use if (activityIndex) when all _this.action values are taken into account e.g., `note` in author mode
          if (_this.action !== 'selector') {
            //XXX: Use TypeIndex location as canonical if available, otherwise storage. Note how noteIRI is treated later
            if((opts.annotationLocationPersonalStorage && DO.C.User.TypeIndex) || (!opts.annotationLocationPersonalStorage && !opts.annotationLocationService && DO.C.User.TypeIndex)) {

              //TODO: Preferring publicTypeIndex for now. Refactor this when the UI allows user to decide whether to have it public or private.

              var publicTypeIndexes = DO.C.User.TypeIndex[ns.solid.publicTypeIndex.value];
              var privateTypeIndexes = DO.C.User.TypeIndex[ns.solid.privateTypeIndex.value];

              if (publicTypeIndexes) {
                var publicTIValues = Object.values(publicTypeIndexes);
// console.log(publicTIValues)
                publicTIValues.forEach(ti => {
                  //XXX: For now, we are only sending the annotation to one location that's already matched
                  if (activityTypeMatched) return;

                  var forClass = ti[ns.solid.forClass.value];
                  var instanceContainer = ti[ns.solid.instanceContainer.value];
                  var instance = ti[ns.solid.instance.value];

                  if (activityIndex?.includes(forClass)) {
                    if (instanceContainer) {
                      activityTypeMatched = true;

                      containerIRI = instanceContainer;

                      fromContentType = 'text/html';
                      // contentType = 'text/html';
                      contentType = fromContentType;
      
                      noteURL = noteIRI = containerIRI + id;
                      contextProfile = {
                        // 'subjectURI': noteIRI,
                      };
                      aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'canonical': true, 'annotationInbox': annotationInbox };

                      annotationDistribution.push(aLS);
                    }
                    //TODO: Not handling instance yet.
                  }
                })

              }
              else if (privateTypeIndexes) {

              }
            }

            if ((opts.annotationLocationPersonalStorage && DO.C.User.Outbox) || (!opts.annotationLocationPersonalStorage && !opts.annotationLocationService && DO.C.User.Outbox)) {
              containerIRI = DO.C.User.Outbox[0];

              var fromContentType = 'text/html';
              // contentType = 'application/ld+json';
              contentType = fromContentType;

              noteURL = noteIRI = containerIRI + id;
              var contextProfile = {
                '@context': [
                  'https://www.w3.org/ns/activitystreams',
                  { 'oa': 'http://www.w3.org/ns/oa#', 'schema': 'http://schema.org/' }
                ],
                // 'subjectURI': noteIRI,
                'profile': 'https://www.w3.org/ns/activitystreams'
              };
              aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'annotationInbox': annotationInbox };
              if (typeof DO.C.User.Storage === 'undefined' && !activityTypeMatched) {
                aLS['canonical'] = true;
              }

              aLS = Object.assign(aLS, contextProfile)

              if (!isDuplicateLocation(annotationDistribution, containerIRI)) {
                annotationDistribution.push(aLS);
              }
            }

            if (!activityTypeMatched && ((opts.annotationLocationPersonalStorage && DO.C.User.Storage) || (!opts.annotationLocationPersonalStorage && !opts.annotationLocationService && DO.C.User.Storage))) {
              containerIRI = DO.C.User.Storage[0];

              fromContentType = 'text/html';
              // contentType = 'text/html';
              contentType = fromContentType;

              noteURL = noteIRI = containerIRI + id;
              contextProfile = {
                // 'subjectURI': noteIRI,
              };
              aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'canonical': true, 'annotationInbox': annotationInbox };

              if (!isDuplicateLocation(annotationDistribution, containerIRI)) {
                annotationDistribution.push(aLS);
              }
            }

            if (opts.annotationLocationService && typeof DO.C.AnnotationService !== 'undefined') {
              containerIRI = DO.C.AnnotationService;
              fromContentType = 'text/html';
              // contentType = 'application/ld+json';
              contentType = fromContentType;

              contextProfile = {
                '@context': [
                  'http://www.w3.org/ns/anno.jsonld',
                  { 'as': 'https://www.w3.org/ns/activitystreams#', 'schema': 'http://schema.org/' }
                ],
                // 'subjectURI': noteIRI,
                'profile': 'http://www.w3.org/ns/anno.jsonld'
              };

              if (!opts.annotationLocationPersonalStorage && opts.annotationLocationService) {
                noteURL = noteIRI = containerIRI + id;
                aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'canonical': true,'annotationInbox': annotationInbox };
              }
              else if (opts.annotationLocationPersonalStorage) {
                noteURL = containerIRI + id;
                aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'annotationInbox': annotationInbox };
              }
              else {
                noteURL = noteIRI = containerIRI + id;
                aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'canonical': true, 'annotationInbox': annotationInbox };
              }

              aLS = Object.assign(aLS, contextProfile)

              if (!isDuplicateLocation(annotationDistribution, containerIRI)) {
                annotationDistribution.push(aLS);
              }
            }
          }//if (_this.action !== 'selector') {

// console.log(annotationDistribution);

          //XXX: Defaulting to id but overwritten by motivation symbol
          var refLabel = id;

          var parentNodeWithId = selectedParentElement.closest('[id]');

          var targetIRI = (parentNodeWithId) ? resourceIRI + '#' + parentNodeWithId.id : resourceIRI;
          var documentURL = resourceIRI;
          var latestVersion = DO.C.Resource[documentURL].graph.out(ns.rel['latest-version']).values[0];
          if (latestVersion) {
            resourceIRI = latestVersion;
            targetIRI = (parentNodeWithId) ? latestVersion + '#' + parentNodeWithId.id : latestVersion;
            options['targetInMemento'] = true;
          }
// console.log(latestVersion)
// console.log(resourceIRI)
// console.log(targetIRI)

          var targetLanguage = getNodeLanguage(parentNodeWithId);
          var selectionLanguage = getNodeLanguage(selectedParentElement);
// console.log(targetLanguage)
// console.log(selectionLanguage)

          //Role/Capability for Authors/Editors
          var ref = '', refType = ''; //TODO: reference types. UI needs input
          //TODO: replace refId and noteIRI IRIs

          //This class is added if it is only for display purposes e.g., loading an external annotation for view, but do not want to save it later on (as it will be stripped when 'do' is found)
          var doClass = '';

          //TODO: oa:TimeState's datetime should equal to hasSource value. Same for oa:HttpRequestState's rdfs:value
          // <span about="[this:#' + refId + ']" rel="oa:hasState">(timeState: <time typeof="oa:TimeState" datetime="' + datetime +'" datatype="xsd:dateTime"property="oa:sourceDate">' + datetime + '</time>)</span>\n\

          var noteData = {};
          var note = '';
          var language = opts.language;
          var license = opts.license;
          var rights = '';
          var motivatedBy = 'oa:replying';

          var createNoteData = function(annotation) {
            var id = annotation.id;
            var note = '';
            var mode = '';

            if (annotation && 'profile' in annotation && annotation.profile == 'https://www.w3.org/ns/activitystreams') {
              mode = 'object'
            }
            else {
              mode = 'write'
            }

            switch(_this.action) {
              case 'sparkline':
                var figureIRI = generateAttributeId(null, opts.selectionDataSet);
                ref = '<span rel="schema:hasPart" resource="#figure-' + figureIRI + '">\n\
                <a href="' + opts.select + '" property="schema:name" rel="prov:wasDerivedFrom" resource="' + opts.select + '" typeof="qb:DataSet">' + opts.selectionDataSet + '</a> [' + escapeCharacters(DO.C.RefAreas[opts.selectionRefArea]) + ']\n\
                <span class="sparkline" rel="schema:image" resource="#' + figureIRI + '">' + opts.sparkline + '</span></span>';
                break;

              //External Note
              case 'article': case 'approve': case 'disapprove': case 'specificity':
                if (_this.action === 'approve' || _this.action === 'disapprove') {
                  motivatedBy = 'oa:assessing';
                }
                if (_this.action === 'specificity') {
                  motivatedBy = 'oa:questioning';
                }
                if (_this.action !== 'article') {
                  refLabel = DO.U.getReferenceLabel(motivatedBy);
                }

                ref = _this.base.selection;

                noteData = {
                  "type": _this.action,
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

                if (DO.C.User.IRI) {
                  noteData.creator["iri"] = DO.C.User.IRI;
                }
                if (DO.C.User.Name) {
                  noteData.creator["name"] = DO.C.User.Name;
                }
                noteData.creator["image"] = DO.C.User.Image || generateDataURI('image/svg+xml', 'base64', Icon['.fas.fa-user-secret']);
                if (DO.C.User.URL) {
                  noteData.creator["url"] = DO.C.User.URL;
                }
                if (opts.annotationInboxLocation && DO.C.User.TypeIndex && DO.C.User.TypeIndex[ns.as.Announce.value]) {
                  noteData.inbox = DO.C.User.TypeIndex[ns.as.Announce.value];
                }

                // note = DO.U.createNoteDataHTML(noteData);
                break;

              //Internal Note
              case 'note':
                motivatedBy = "oa:commenting";
                refLabel = DO.U.getReferenceLabel(motivatedBy);
                var docRefType = '<sup class="ref-comment"><a rel="cito:isCitedBy" href="#' + id + '">' + refLabel + '</a></sup>';
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

                if (DO.C.User.IRI) {
                  noteData.creator["iri"] = DO.C.User.IRI;
                }
                if (DO.C.User.Name) {
                  noteData.creator["name"] = DO.C.User.Name;
                }
                noteData.creator["image"] = DO.C.User.Image || generateDataURI('image/svg+xml', 'base64', Icon['.fas.fa-user-secret']);
                if (DO.C.User.URL) {
                  noteData.creator["url"] = DO.C.User.URL;
                }

                // note = DO.U.createNoteDataHTML(noteData);

                ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType);
                break;

              case 'cite': //footnote reference
                switch(opts.citationType) {
                  case 'ref-footnote': default:
                    motivatedBy = "oa:describing";
                    refLabel = DO.U.getReferenceLabel(motivatedBy);
                    docRefType = '<sup class="' + opts.citationType + '"><a rel="cito:isCitedBy" href="#' + id + '">' + refLabel + '</a></sup>';
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
                    docRefType = '<span class="' + opts.citationType + '">' + DO.C.RefType[DO.C.DocRefType].InlineOpen + '<a href="#' + id + '">' + refLabel + '</a>' + DO.C.RefType[DO.C.DocRefType].InlineClose + '</span>';
                    break;
                }

                ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType);
                break;
              // case 'reference':
              //   ref = '<span class="ref" about="[this:#' + refId + ']" typeof="dctypes:Text"><span id="'+ refId +'" property="schema:description">' + this.base.selection + '</span> <span class="ref-reference">' + DO.C.RefType[DO.C.DocRefType].InlineOpen + '<a rel="cito:isCitedBy" href="#' + id + '">' + refLabel + '</a>' + DO.C.RefType[DO.C.DocRefType].InlineClose + '</span></span>';
//                  break;

              case 'rdfa':
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

                if (DO.C.User.IRI) {
                  noteData.creator["iri"] = DO.C.User.IRI;
                }
                if (DO.C.User.Name) {
                  noteData.creator["name"] = DO.C.User.Name;
                }
                noteData.creator["image"] = DO.C.User.Image || generateDataURI('image/svg+xml', 'base64', Icon['.fas.fa-user-secret']);
                if (DO.C.User.URL) {
                  noteData.creator["url"] = DO.C.User.URL;
                }

                // note = DO.U.createNoteDataHTML(noteData);
                ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType, { 'do': true });
                break;
            }

            var selectionUpdated = ref;
            MediumEditor.util.insertHTMLCommand(_this.base.selectedDocument, selectionUpdated);

            return noteData;
          }

          var createActivityData = function(annotation, options = {}) {
// console.log(annotation, options)
            var noteIRI = (options.relativeObject) ? '#' + id : annotation['noteIRI'];

            var notificationStatements = '    <dl about="' + noteIRI + '">\n\
<dt>Object type</dt><dd><a about="' + noteIRI + '" typeof="oa:Annotation" href="' + ns.oa.Annotation.value + '">Annotation</a></dd>\n\
<dt>Motivation</dt><dd><a href="' + DO.C.Prefixes[annotation.motivatedByIRI.split(':')[0]] + annotation.motivatedByIRI.split(':')[1] + '" property="oa:motivation">' + annotation.motivatedByIRI.split(':')[1] + '</a></dd>\n\
</dl>\n\
';

            var notificationData = {
              "slug": id,
              "license": opts.license,
              "statements": notificationStatements
            };
// console.log(_this.action)

            if (options.announce) {
              notificationData['type'] = ['as:Announce'];
              notificationData['object'] = noteIRI;
              notificationData['inReplyTo'] = targetIRI;
            }
            else {
              switch(_this.action) {
                default: case 'article': case 'specificity':
                  notificationData['type'] = ['as:Create'];
                  notificationData['object'] = noteIRI;
                  notificationData['inReplyTo'] = targetIRI;
                  break;
                case 'approve':
                  notificationData['type'] = ['as:Like'];
                  notificationData['object'] = targetIRI;
                  notificationData['context'] = noteIRI;
                  break;
                case 'disapprove':
                  notificationData['type'] = ['as:Dislike'];
                  notificationData['object'] = targetIRI;
                  notificationData['context'] = noteIRI;
                  break;
                case 'bookmark':
                  notificationData['type'] = ['as:Add'];
                  notificationData['object'] = noteIRI;
                  notificationData['target'] = annotation['containerIRI'];
                  break;
              }
            }

// console.log(notificationData);
            return notificationData;
          }

          var positionActivity = function(annotation, options) {
            if (!annotation['canonical']) {
              return Promise.resolve();
            }

            if ('profile' in annotation && annotation.profile == 'https://www.w3.org/ns/activitystreams') {
              return DO.U.showActivities(annotation['noteIRI'])
                .catch((error) => {
                  console.log('Error showing activities:', error)
                  return Promise.resolve()
                })
            }
            else {
// console.log(options)
              return DO.U.showActivities(annotation[ 'noteIRI' ], options)
                .catch((error) => {
                  console.log('Error showing activities:', error)
                  return Promise.resolve()
                })
            }
          }

          var sendNotification = function(annotation, options) {
            if (!annotation['canonical']) {
              return Promise.resolve();
            }

            var inboxPromise;

            if (annotation.annotationInbox) {
              inboxPromise = Promise.resolve([annotation.annotationInbox])
            }
            else {
              if ('inbox' in DO.C.Resource[documentURL] && DO.C.Resource[documentURL].inbox.length) {
                inboxPromise = Promise.resolve(DO.C.Resource[documentURL].inbox)
              }
              else {
                inboxPromise =
                  getLinkRelation(ns.ldp.inbox.value, documentURL)
                    .catch(() => {
                      return getLinkRelationFromRDF(ns.as.inbox.value, documentURL);
                    });
              }
            }

            return inboxPromise
              .catch(error => {
                // console.log('Error fetching ldp:inbox and as:inbox endpoint:', error)
                throw error
              })
              .then(inboxes => {
                // TODO: resourceIRI for getLinkRelation should be the
                // closest IRI (not necessarily the document).
// console.log(inboxes)
                if (inboxes.length) {
                  var notificationData = createActivityData(annotation, { 'announce': true });

                  notificationData['inbox'] = inboxes[0];

                  // notificationData['type'] = ['as:Announce'];
// console.log(annotation)
// console.log(notificationData)
                  return notifyInbox(notificationData)
                    .catch(error => {
                      console.log('Error notifying the inbox:', error)
                    })
                }
              })
          }
// console.log(annotationDistribution)
          switch(this.action) {
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
                  })
              })
              break;

            case 'note':
              noteData = createNoteData({'id': id})
              note = DO.U.createNoteDataHTML(noteData);
              // var nES = selectedParentElement.nextElementSibling;
              var asideNote = '\n\
<aside class="note">\n\
'+ note + '\n\
</aside>';
              var asideNode = fragmentFromString(asideNote);
              var parentSection = getClosestSectionNode(selectedParentElement);
              parentSection.appendChild(asideNode);

              DO.U.positionNote(refId, id);
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
              break;

            case 'cite': //footnote reference
              //TODO: Refactor this what's in positionInteraction

              noteData = createNoteData({'id': id})
              note = DO.U.createNoteDataHTML(noteData);

              switch(opts.citationType) {
                case 'ref-footnote': default:
                  var nES = selectedParentElement.nextElementSibling;
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
                  DO.U.getCitation(opts.url, options).then(citationGraph => {
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
                    var node = document.querySelector('[id="' + id + '"] a[about]');

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

                      var notificationStatements = '    <dl about="' + citedBy + '">\n\
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

                      notifyInbox(notificationData)
                        // .then(
                        //   function(s){
                        //     console.log('Sent notification to ' + inboxURL);
                        // });
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

          this.window.getSelection().removeAllRanges();
          this.base.checkSelection();
        }


      });
    }
  })()

} //DO.U.Editor