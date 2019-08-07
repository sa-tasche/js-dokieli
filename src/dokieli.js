/** dokieli
 *
 * Sarven Capadisli <info@csarven.ca> http://csarven.ca/#i
 * http://www.apache.org/licenses/LICENSE-2.0.html Apache License, Version 2.0
 * https://dokie.li/
 * https://github.com/linkeddata/dokieli
 */

global.fetcher = require('./fetcher')
const doc = require('./doc')
const uri = require('./uri')
const graph = require('./graph')
const inbox = require('./inbox')
const util = require('./util')
window.MediumEditor = require('medium-editor')
window.MediumEditorTable = require('medium-editor-tables')
const storage = require('./storage')
global.auth = require('./auth')
global.template = require('./template')
const d3 = Object.assign({}, require("d3-selection"), require("d3-force"));

if(typeof DO === 'undefined'){
const ld = require('./simplerdf')
global.SimpleRDF = ld.SimpleRDF
var DO = {
  fetcher,

  C: require('./config'),

  U: {
    getResourceLabel: function(s) {
      return s.dctermstitle || s['http://purl.org/dc/elements/1.1/title'] || auth.getAgentName(s) || undefined;
    },


    getItemsList: function(url, options) {
      url = url || window.location.origin + window.location.pathname;
      options = options || {};
      options['resourceItems'] = options.resourceItems || [];
      options['headers'] = options.headers || {};

      DO.C['CollectionItems'] = DO.C['CollectionItems'] || {};
      DO.C['CollectionPages'] = ('CollectionPages' in DO.C && DO.C.CollectionPages.length > 0) ? DO.C.CollectionPages : [];

      var pIRI = uri.getProxyableIRI(url);

      return fetcher.getResourceGraph(pIRI, options.headers, options)
        .then(
          function(i) {
            var s = i.child(url);
            //XXX: First item is actually the Collection
            DO.C.CollectionPages.push(url);

            var items = [s.asitems, s.asorderedItems, s.ldpcontains];
            Object.keys(items).forEach(function(i) {
              items[i].forEach(function(resource){
                var types = s.child(resource).rdftype;
                //Include only non-container/collection
                if(types.indexOf(DO.C.Vocab['ldpContainer']["@id"]) < 0 &&
                   types.indexOf(DO.C.Vocab['asCollection']["@id"]) < 0 &&
                   types.indexOf(DO.C.Vocab['asOrderedCollection']["@id"]) < 0) {
                  DO.C.CollectionItems[resource] = s;
                  options.resourceItems.push(resource);
                }
              });
            });

            if (s.asfirst && DO.C.CollectionPages.indexOf(s.asfirst) < 0) {
              return DO.U.getItemsList(s.asfirst, options);
            }
            else if (s.asnext && DO.C.CollectionPages.indexOf(s.asnext) < 0) {
              return DO.U.getItemsList(s.asnext, options);
            }
            else {
              return util.uniqueArray(options.resourceItems);
            }
          },
          function(reason) {
            console.log(reason);
            return reason;
          }
        );
    },


    getNotifications: function(url) {
      url = url || window.location.origin + window.location.pathname;
      var notifications = [];
      var pIRI = uri.getProxyableIRI(url);

      DO.C.Inbox[url] = {};
      DO.C.Inbox[url]['Notifications'] = [];

      return graph.getGraph(pIRI)
        .then(
          function(i) {
            DO.C.Inbox[url]['Graph'] = i;

            var s = i.child(url);
            s.ldpcontains.forEach(function(resource) {
// console.log(resource);
              var types = s.child(resource).rdftype;
// console.log(types);
              if(types.indexOf(DO.C.Vocab['ldpContainer']["@id"]) < 0) {
                notifications.push(resource);
              }
            });
// console.log(notifications);
            if (notifications.length > 0) {
              DO.C.Inbox[url]['Notifications'] = notifications;
              return notifications;
            }
            else {
              var reason = {"message": "There are no notifications."};
              return Promise.reject(reason);
            }
          },
          function(reason) {
            console.log(reason);
            return reason;
          }
        );
    },

    showInboxNotifications: function() {
      if (typeof SimpleRDF !== 'undefined') {
        inbox.getEndpoint(DO.C.Vocab['ldpinbox']['@id']).then(
          function(i) {
            i.forEach(function(inboxURL) {
              if (!DO.C.Inbox[inboxURL]) {
                DO.U.showNotificationSources(inboxURL);
              }
            });
          },
          function(reason) {
// console.log(reason);
          }
        );
      }
    },

    showNotificationSources: function(url) {
      DO.U.getNotifications(url).then(
        function(i) {
          i.forEach(function(notification) {
            if (!DO.C.Notification[notification]) {
              DO.U.showActivities(notification);
            }
          });
        },
        function(reason) {
          console.log('No notifications');
          return reason;
        }
      );
    },

    showContactsActivities: function(e) {
      var showProgress = function(e){
        var rA = e.target.closest('.resource-activities')
        var i = rA.querySelector('.fa-bolt')
        rA.disabled = true;

        var icon = util.fragmentFromString(template.Icon[".fas.fa-circle-notch.fa-spin.fa-fw"].replace(/ fa\-fw/, ' fa-fw fa-2x'));
        i.parentNode.replaceChild(icon, i);
      }

      var removeProgress = function(e) {
        var rA = e.target.closest('.resource-activities')
        var i = rA.querySelector('.fa-spin')

        var icon = util.fragmentFromString(template.Icon[".fas.fa-circle.fa-2x"]);
        i.parentNode.replaceChild(icon, i);
      }

      if (e) {
        showProgress(e)
      }

      var promises = []

      if (DO.C.User.Storage && DO.C.User.Storage.length > 0) {
        if(DO.C.User.Outbox && DO.C.User.Outbox.length > 0) {
          if(DO.C.User.Storage[0] == DO.C.User.Outbox[0]) {
            DO.U.showActivitiesSources(DO.C.User.Outbox[0])
          }
          else {
            DO.U.showActivitiesSources(DO.C.User.Storage[0])
            DO.U.showActivitiesSources(DO.C.User.Outbox[0])
          }
        }
        else {
          DO.U.showActivitiesSources(DO.C.User.Storage[0])
        }
      }
      else if (DO.C.User.Outbox && DO.C.User.Outbox.length > 0) {
        DO.U.showActivitiesSources(DO.C.User.Outbox[0])
      }

      if (DO.C.User.Contacts && Object.keys(DO.C.User.Contacts).length > 0){
        var sAS = function(iri) {
          return DO.U.showActivitiesSources(iri)
            .catch(() => {
              return Promise.resolve()
            })
        }

        Object.keys(DO.C.User.Contacts).forEach(function(iri){
          var o = DO.C.User.Contacts[iri].Outbox
          if (o) {
            promises.push(sAS(o[0]))
          }

          var s = DO.C.User.Contacts[iri].Storage
          if (s) {
            promises.push(sAS(s[0]))
          }
        })

        return Promise.all(promises)
          .then(r => {
            removeProgress(e)
          });
      }
      else {
        return DO.U.updateContactsInfo(DO.C.User.IRI, { 'showActivitiesSources': true })
          .then(() => {
            removeProgress(e)
          })
          .catch(() => {
            removeProgress(e)
          });
      }
    },

    showActivitiesSources: function(url) {
      return DO.U.getActivities(url).then(
        function(items) {
          var promises = [];

          for (var i = 0; i < items.length && i < DO.C.CollectionItemsLimit; i++) {
            var pI = function(iri) {
              return DO.U.showActivities(iri)
                .catch(() => {
                  return Promise.resolve()
                })
            }

            promises.push(pI(items[i]));
          }

          return Promise.all(promises);
        },
        function(reason) {
          console.log('No activities');
          return reason;
        }
      );
    },

    getActivities: function(url, options) {
      url = url || window.location.origin + window.location.pathname;
      var pIRI = uri.getProxyableIRI(url);

      options = options || {};
      return DO.U.getItemsList(pIRI, options);
    },

    showActivities: function(url) {
      DO.C.Notification[url] = {};
      DO.C.Notification[url]['Activities'] = [];

      var pIRI = uri.getProxyableIRI(url);

      return fetcher.getResourceGraph(pIRI).then(
        function(g) {
          DO.C.Notification[url]['Graph'] = g;

// console.log(g);
          var subjects = [];
          g.graph().toArray().forEach(function(t){
            subjects.push(t.subject.nominalValue);
          });
          subjects = util.uniqueArray(subjects);
// console.log(subjects);

          subjects.forEach(function(i){
            var s = g.child(i)

            var types = s.rdftype._array || [];

            var currentPathURL = window.location.origin + window.location.pathname;

            if (types.length > 0) {
              var resourceTypes = types;
              if(resourceTypes.indexOf('https://www.w3.org/ns/activitystreams#Like') > -1 ||
                 resourceTypes.indexOf('https://www.w3.org/ns/activitystreams#Dislike') > -1){
                if(s.asobject && s.asobject.at(0)) {
                  if(s.ascontext && s.ascontext.at(0)){
                    if(DO.U.getPathURL(s.asobject.at(0)) == currentPathURL) {
                      var context = s.ascontext.at(0);
                      return DO.U.positionInteraction(context).then(
                        function(iri){
                          return iri;
                        },
                        function(reason){
                          console.log(context + ': Context is unreachable');
                        });
                    }
                  }
                  else {
                    var iri = s.iri().toString();
                    var targetIRI = s.asobject.at(0);
                    var motivatedBy = 'oa:assessing';
                    var id = String(Math.abs(DO.U.hashCode(iri)));
                    var refId = 'r-' + id;
                    var refLabel = id;

                    var bodyText = (resourceTypes.indexOf('https://www.w3.org/ns/activitystreams#Like') > -1) ? 'Liked' : 'Disliked';

                    var noteData = {
                      "type": 'article',
                      "mode": "read",
                      "motivatedByIRI": motivatedBy,
                      "id": id,
                      "refId": refId,
                      "refLabel": refLabel,
                      // "iri": iri,
                      "creator": {},
                      "target": {
                        "iri": targetIRI
                      },
                      "body": bodyText,
                      "license": {}
                    };

                    if (s.asactor){
                      noteData['creator'] = {
                        'iri': s.asactor
                      }
                      var a = g.child(noteData['creator']['iri']);
                      var actorName = auth.getAgentName(a);
                      var actorImage = auth.getAgentImage(a);

                      if(typeof actorName != 'undefined') {
                        noteData['creator']['name'] = actorName;
                      }
                      if(typeof actorImage != 'undefined') {
                        noteData['creator']['image'] = actorImage;
                      }
                    }
                    else if(type == 'https://www.w3.org/ns/activitystreams#Dislike'){
                      noteData['creator'] = {
                        'name': 'Anonymous Coward'
                      }
                    }
                    if (s.asupdated){
                      noteData['datetime'] = s.asupdated;
                    }
                    if (s.schemalicense){
                      noteData.license["iri"] = s.schemalicense;
                      noteData.license["name"] = DO.C.License[noteData.license["iri"]].name;
                    }

                    DO.U.addInteraction(noteData);
                  }
                }
              }
              else if(resourceTypes.indexOf('https://www.w3.org/ns/activitystreams#Relationship') > -1){
                if(s.assubject && s.assubject.at(0) && s.asrelationship && s.asrelationship.at(0) && s.asobject && s.asobject.at(0) && DO.U.getPathURL(s.asobject.at(0)) == currentPathURL) {
                  var subject = s.assubject.at(0);
                  return DO.U.positionInteraction(subject).then(
                    function(iri){
                      return iri;
                    },
                    function(reason){
                      console.log(subject + ': subject is unreachable');
                    });
                }
              }
              else if(resourceTypes.indexOf('https://www.w3.org/ns/activitystreams#Announce') > -1 || resourceTypes.indexOf('https://www.w3.org/ns/activitystreams#Create') > -1) {
                if(s.asobject && s.asobject.at(0) && s.astarget && s.astarget.at(0)) {
                  var options = {};

                  var targetPathURL = DO.U.getPathURL(s.astarget.at(0));

                  if (targetPathURL == currentPathURL) {
                    options['targetInOriginalResource'] = true;
                  }
                  else if (DO.C.ResourceInfo.graph.rellatestversion && targetPathURL == DO.U.getPathURL(DO.C.ResourceInfo.graph.rellatestversion)) {
                    options['targetInMemento'] = true;
                  }

                  if (options['targetInOriginalResource'] || options['targetInMemento']){
                    var object = s.asobject.at(0);

                    DO.C.Notification[url]['Activities'].push(i);
                    DO.C.Activity[object] = {};
                    DO.C.Activity[object]['Graph'] = s;

                    if (object.startsWith(url)) {
                      return DO.U.showAnnotation(object, s);
                    }
                    else {
                      return DO.U.positionInteraction(object, document.body, options).then(
                        function(iri){
                          return iri;
                        },
                        function(reason){
                          console.log(reason);
                          console.log(object + ': object is unreachable');
                        });
                    }
                  }
                }
              }
              else if(resourceTypes.indexOf('https://www.w3.org/ns/activitystreams#Add') > -1) {
                if(s.asobject && s.asobject.at(0)) {
                  var object = s.asobject.at(0);

                  if (object.startsWith(url)) {
                    return DO.U.showAnnotation(object, s);
                  }
                  else {
                    return DO.U.positionInteraction(object).then(
                      function(iri){
                        return iri;
                      },
                      function(reason){
                        console.log(object + ': object is unreachable');
                      });
                  }
                }
              }
              else if(resourceTypes.indexOf('http://www.w3.org/ns/oa#Annotation') > -1 && DO.U.getPathURL(s.oahasTarget) == currentPathURL) {

                return DO.U.showAnnotation(i, s);
              }
              else {
                // console.log(i + ' has unrecognised types: ' + resourceTypes);
                // return Promise.reject({'message': 'Unrecognised types ' + resourceTypes});
              }
            }
            else {
              // console.log('Skipping ' + i + ': No type.');
              // return Promise.reject({'message': 'Activity has no type. What to do?'});
            }
          });
        },
        function(reason) {
          console.log(url + ': is unreachable. ' + reason);
          return reason;
        }
      );
    },

    //Borrowed some of the d3 parts from https://bl.ocks.org/mbostock/4600693
    showVisualisationGraph: function(url, data, selector, options) {
      url = url || window.location.origin + window.location.pathname;
      data = data || doc.getDocument();
      selector = selector || 'body';
      options = options || {};
      options['contentType'] = options.contentType || 'text/html';
      options['subjectURI'] = options.subjectURI || url;
      options['license'] = options.license || 'https://creativecommons.org/licenses/by/4.0/';
      var width = options.width || '100%';
      var height = options.height || '100%';
      var nodeRadius = 6;

      var id = util.generateAttributeId();


      function positionLink(d) {
        return "M" + d[0].x + "," + d[0].y
             + "S" + d[1].x + "," + d[1].y
             + " " + d[2].x + "," + d[2].y;
      }

      function positionNode(d) {
        return "translate(" + d.x + "," + d.y + ")";
      }

      function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x, d.fy = d.y;
      }

      function dragged(d) {
        d.fx = d3.event.x, d.fy = d3.event.y;
      }

      function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null, d.fy = null;
      }

      // var color = d3.scaleOrdinal(d3.schemeCategory10);

      //Move this to config perhaps with terms eg. anchor, anchorInternal, warning
      var color = function(group) { 
        switch(group) {
          case 0: return '#fff';
          default:
          case 1: return '#000';
          case 2: return '#333';
          case 3: return '#777';
          case 4: return '#ccc';
          case 5: return '#ff0';
          case 6: return '#ff2900';
          case 7: return '#002af7';
          case 8: return '#00cc00';
          case 9: return '#00ffff';

          case 10: return '#800080';
        }
      }

      var svg = d3.select(selector).append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('id', id)
        .attr('class', 'graph')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('version', '1.1')
        .attr('xml:lang', 'en')
        .attr('prefix', 'rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns# rdfs: http://www.w3.org/2000/01/rdf-schema# xsd: http://www.w3.org/2001/XMLSchema# schema: http://schema.org/');

      var s = document.getElementById(id);
      width = options.width || parseInt(s.ownerDocument.defaultView.getComputedStyle(s, null)["width"]);
      height = options.height || parseInt(s.ownerDocument.defaultView.getComputedStyle(s, null)["height"]);

      svg.append('metadata')
        .append('tspan')
          .attr('rel', 'schema:creator')
          .attr('resource', 'https://dokie.li/');

      if('license' in options) {
        svg.select('metadata')
          .append('tspan')
            .attr('rel', 'schema:license')
            .attr('resource', options.license);
      }

      if('title' in options) {
        svg.append('title')
          .attr('property', 'schema:name')
          .text(options.title);
      }

      svg.append("defs").selectAll("marker")
          .data(["end"])
        .enter().append("marker")
          .attr("id", String)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 20)
          .attr("refY", -1)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .attr("fill", color(3))
        .append("path")
          .attr("d", "M0,-5L10,0L0,5");

      var simulation = d3.forceSimulation()
        .alphaDecay(0.025)
        // .velocityDecay(0.1)
        .force("link", d3.forceLink().distance(nodeRadius).strength(0.25))
        .force('collide', d3.forceCollide().radius(nodeRadius * 2).strength(0.25))
        // .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

      DO.U.getVisualisationGraphData(url, data, options).then(
        function(graph){
// console.log(graph);
          var nodes = graph.nodes;
          var nodeById = new Map();
          nodes.forEach(function(n){
            nodeById.set(n.id, n);
          })
          var links = graph.links;
          var bilinks = [];

// var foo = new Map(nodes);
// console.log(foo)
          var uniqueNodes = {};

          links.forEach(function(link) {
            var s = link.source = nodeById.get(link.source),
                t = link.target = nodeById.get(link.target),
                i = {}; // intermediate node
                // linkValue = link.value
            nodes.push(i);

            if (uniqueNodes[s.id] > -1) {
              s = uniqueNodes[s.id];
            }
            else {
              uniqueNodes[s.id] = s;
            }

            if (uniqueNodes[t.id] > -1) {
              t = uniqueNodes[t.id];
            }
            else {
              uniqueNodes[t.id] = t;
            }

            links.push({source: s, target: i}, {source: i, target: t});
            bilinks.push([s, i, t]);
          });

// console.log(links)
// console.log(uniqueNodes)
          var link = svg.selectAll(".link")
            .data(bilinks)
            .enter().append("path")
              // .attr("class", "link")
              .attr('fill', 'none')
              .attr('stroke', color(4))
              .attr("marker-end", "url(#end)");

          var node = svg.selectAll(".node")
            .data(nodes.filter(function(d) {
              if (uniqueNodes[d.id] && uniqueNodes[d.id].index == d.index) {
                return d.id;
              }
            }))
            .enter().append("circle")
              // .attr("class", "node")
              .attr("r", nodeRadius)
              .attr("fill", function(d) { return color(d.group); })
              .attr('stroke', color(2))
              // .call(d3.drag()
              //     .on("start", dragstarted)
              //     .on("drag", dragged)
              //     .on("end", dragended));

          node.append("title")
              .text(function(d) { return d.id; });

          simulation
              .nodes(nodes)
              .on("tick", ticked);

          simulation.force("link")
              .links(links);

          function ticked() {
            link.attr("d", positionLink);
            node.attr("transform", positionNode);
          }
        });
    },

    getVisualisationGraphData: function(url, data, options) {
      return new Promise(function(resolve, reject) {
        graph.getGraphFromData(data, options).then(
          function(g){
// console.log(g);
            var g = SimpleRDF(DO.C.Vocab, options['subjectURI'], g, ld.store).child(url);
            var graph = {"nodes":[], "links": []};
            var graphNodes = [];

            g.graph().toArray().forEach(function(t){
              if(
                // t.predicate.nominalValue == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first' ||
                // t.predicate.nominalValue == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest' ||
                t.object.nominalValue == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil'
                ) {
                return;
              }

              var sGroup = 8;
              var pGroup = 8;
              var oGroup = 8;

              switch(t.subject.interfaceName) {
                default: case 'NamedNode':
                  var documentURL = uri.stripFragmentFromString(url);
                  if (t.subject.nominalValue == documentURL) {
                    sGroup = 5;
                  }
                  else if (!t.subject.nominalValue.startsWith(documentURL)) {
                    sGroup = 7;
                  }
                  break;
                case 'BlankNode':
                  sGroup = 8;
                  break;
              }

              switch(t.object.interfaceName) {
                default: case 'NamedNode':
                  if (!t.object.nominalValue.startsWith(uri.stripFragmentFromString(document.location.href))) {
                    oGroup = 7;
                  }
                  break;
                case 'BlankNode':
                  oGroup = 8;
                  break;
                case 'Literal':
                  oGroup = 4;
                  break;
              }

              if (t.predicate.nominalValue == DO.C.Vocab['rdftype']['@id']){
                oGroup = 6;

                if (util.isActor(t.object.nominalValue)) {
                  sGroup = 10;
                }
              }
              if (t.predicate.nominalValue == DO.C.Vocab['foafknows']['@id']){
                sGroup = 10;
                oGroup = 10;
              }
              else if (t.predicate.nominalValue.startsWith('http://purl.org/spar/cito/')) {
                oGroup = 9;
              }

              if(graphNodes.indexOf(t.subject.nominalValue) == -1) {
                graphNodes.push(t.subject.nominalValue);
                graph.nodes.push({"id": t.subject.nominalValue, "group": sGroup});
              }
              if(graphNodes.indexOf(t.object.nominalValue) == -1) {
                graphNodes.push(t.object.nominalValue);
                graph.nodes.push({"id": t.object.nominalValue, "group": oGroup});
              }

              graph.links.push({"source": t.subject.nominalValue, "target": t.object.nominalValue, "value": t.predicate.nominalValue});
            });
// console.log(graphNodes)
// console.log(graph)

            delete graphNodes;
            return resolve(graph);
          }
        );
      });
    },

    showGraph: function(resources, selector, options){
      if (!DO.C.GraphViewerAvailable) { return; }

      options = options || {};
      options['contentType'] = options.contentType || 'text/html';
      options['subjectURI'] = options.subjectURI || location.href.split(location.search||location.hash||/[?#]/)[0];

      if (Array.isArray(resources)) {
        DO.U.showGraphResources(resources, selector, options);
      }
      else {
        var property = (resources && 'filter' in options && 'predicates' in options.filter && options.filter.predicates.length > 0) ? options.filter.predicates[0] : DO.C.Vocab['ldpinbox']['@id'];
        var iri = (resources) ? resources : location.href.split(location.search||location.hash||/[?#]/)[0];

        inbox.getEndpoint(property, iri).then(
          function(resources) {
            DO.U.showGraphResources(resources[0], selector, options);
          },
          function(reason) {
            console.log(reason);
          }
        );
      }
    },

    showGraphResources: function(resources, selector, options) {
      selector = selector || document.body;
      options = options || {};

      DO.U.processResources(resources, options).then(
        function(url) {
          var promises = [];
          url.forEach(function(u) {
            // console.log(u);
            // window.setTimeout(function () {
              var pIRI = uri.getProxyableIRI(u);
              promises.push(fetcher.getResourceGraph(pIRI));
            // }, 1000)
          });

          var dataGraph = SimpleRDF();

          Promise.all(promises)
            .then(function(graphs) {
              graphs.forEach(function(graph){
                graph = graph.graph();

                dataGraph.graph().addAll(graph);
              });

              if ('filter' in options) {
                dataGraph = dataGraph.graph().filter(function(g) {
                  if ('subjects' in options.filter && options.filter.subjects.length > 0 && options.filter.subjects.indexOf(g.subject.nominalValue) >= 0) {
                    return g;
                  }
                  if ('predicates' in options.filter && options.filter.predicates.length > 0 && options.filter.predicates.indexOf(g.predicate.nominalValue) >= 0) {
                    return g;
                  }
                });
              }

              graph.serializeGraph(dataGraph, { 'contentType': 'text/turtle' })
                .then(function(data){
                  options['contentType'] = 'text/turtle';
                  // options['subjectURI'] = url;
                  //FIXME: For multiple graphs (fetched resources), options.subjectURI is the last item, so it is inaccurate
                  DO.U.showVisualisationGraph(options.subjectURI, data, selector, options);
                });
            });
        });
    },

    processResources: function(resources, options) {
      if (Array.isArray(resources)) {
        return Promise.resolve(resources);
      }
      else {
        return DO.U.getItemsList(resources, options);
      }
    },

    urlParam: function(name) {
      //FIXME
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results===null){
         return null;
      }
      else{
         return results[1] || 0;
      }
    },

    getTextQuoteSelectorFromLocation: function(location) {
      var regexp = /#selector\(type=TextQuoteSelector,(.*)\)/;
      matches = location.hash.match(regexp);

      if (matches) {
        var selectorsArray = matches[1].split(',')
        var selector = {};

        selectorsArray.forEach(function(s){
          var kv = s.split('=');

          if (kv.length == 2) {
            switch(kv[0]) {
              case 'prefix':
                selector['prefix'] = decodeURIComponent(kv[1]);
                break;
              case 'exact':
                selector['exact'] = decodeURIComponent(kv[1]);
                break;
              case 'suffix':
                selector['suffix'] = decodeURIComponent(kv[1]);
                break;
            }
          }

        })

        return selector;
      }
    },

    showTextQuoteSelector: function(containerNode) {
      var motivatedBy = 'oa:highlighting';
      var selector = DO.U.getTextQuoteSelectorFromLocation(document.location);
      if (selector && selector.exact && selector.exact.length > 0) {
        //XXX: TODO: Copied from showAnnotation

        // refId = String(Math.abs(DO.U.hashCode(document.location.href)));
        var refId = document.location.hash.substring(1);
        var refLabel = DO.U.getReferenceLabel(motivatedBy);

        containerNode = containerNode || document.body;

        var docRefType = '<sup class="ref-highlighting"><a rel="oa:hasTarget" href="#' + refId + '">' + refLabel + '</a></sup>';

        var options = {
          'do': true,
          'mode': '#selector'
        };

        DO.U.importTextQuoteSelector(containerNode, selector, refId, motivatedBy, docRefType, options)
      }
    },

    importTextQuoteSelector: function(containerNode, selector, refId, motivatedBy, docRefType, options) {
      var containerNodeTextContent = containerNode.textContent;
      //XXX: Seems better?
      // var containerNodeTextContent = util.fragmentFromString(doc.getDocument(containerNode)).textContent.trim();


// console.log(containerNodeTextContent);
      options = options || {};

// console.log(selector)
      var prefix = selector.prefix || '';
      var exact = selector.exact || '';
      var suffix = selector.suffix || '';

      var phrase = util.escapeRegExp(prefix.toString() + exact.toString() + suffix.toString());
// console.log(phrase);

      var selectedParentNode;

      var textMatches = DO.U.matchAllIndex(containerNodeTextContent, new RegExp(phrase, 'g'));
// console.log(textMatches)

      textMatches.forEach(function(item) {
// console.log('phrase:')
// console.log(phrase)
// console.log(item)
        var selectorIndex = item.index;
// console.log('selectorIndex:')
// console.log(selectorIndex)
      // var selectorIndex = containerNodeTextContent.indexOf(prefix + exact + suffix);
// console.log(selectorIndex);
      // if (selectorIndex >= 0) {
        var exactStart = selectorIndex + prefix.length
        var exactEnd = selectorIndex + prefix.length + exact.length;
        var selection = { start: exactStart, end: exactEnd };
// console.log('selection:')
// console.log(selection)
        var ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType, options);
// console.log('containerNode:')
// console.log(containerNode)
        MediumEditor.selection.importSelection(selection, containerNode, document);

        //XXX: Review
        var selection = window.getSelection();
// console.log(selection)
        var r = selection.getRangeAt(0);
        selection.removeAllRanges();
        selection.addRange(r);
        r.collapse(true);
// console.log(r)
// console.log('r.commonAncestorContainer:')
// console.log(r.commonAncestorContainer)
        selectedParentNode = r.commonAncestorContainer.parentNode;
// console.log('selectedParentNode:')
// console.log(selectedParentNode)
        var selectedParentNodeValue = r.commonAncestorContainer.nodeValue;
// console.log(selectedParentNodeValue)

// console.log(selectedParentNodeValue.substr(0, r.startOffset) + ref + selectedParentNodeValue.substr(r.startOffset + exact.length))
        var selectionUpdated = util.fragmentFromString(selectedParentNodeValue.substr(0, r.startOffset) + ref + selectedParentNodeValue.substr(r.startOffset + exact.length));
// console.log(selectionUpdated)

        //XXX: Review. This feels a bit dirty
        for(var i = 0; i < selectedParentNode.childNodes.length; i++) {
          var n = selectedParentNode.childNodes[i];
          if (n.nodeType === 3 && n.nodeValue === selectedParentNodeValue) {
            selectedParentNode.replaceChild(selectionUpdated, n);
          }
        }
// console.log('---')
      })

      return selectedParentNode;
    },

    initUser: function() {
      storage.getLocalStorageProfile().then(user => {
        if (user && 'object' in user) {
          user.object.describes.Role = (DO.C.User.IRI && user.object.describes.Role) ? user.object.describes.Role : 'social';
          user.object.describes.ContactsOutboxChecked = (DO.C.User.IRI && user.object.describes.ContactsOutboxChecked);

          DO.C['User'] = user.object.describes;
        }
      })
    },

    setDocumentMode: function(mode) {
      var style = DO.U.urlParam('style');

      if (style) {
        var title = style.lastIndexOf('/');
        title = (title > -1) ? style.substr(title + 1) : style; 

        if (style.startsWith('http')) {
          var pIRI = uri.getProxyableIRI(style);
          var link = '<link class="do" href="' + pIRI + '" media="all" rel="stylesheet" title="' + title + '" />'
          document.querySelector('head').insertAdjacentHTML('beforeend', link);
        }

        window.history.replaceState({}, null, document.location.href.substr(0, document.location.href.lastIndexOf('?')));
        var stylesheets = document.querySelectorAll('head link[rel~="stylesheet"][title]:not([href$="dokieli.css"])');
        DO.U.updateSelectedStylesheets(stylesheets, title);
      }

      var open = DO.U.urlParam('open');
      if (open) {
        open = decodeURIComponent(open);
        doc.showActionMessage(document.documentElement, '<span class="progress">' + template.Icon[".fas.fa-circle-notch.fa-spin.fa-fw"] + ' Opening <a href="' + open + '" target="_blank">' + open + '</a></span>', {'timer': 10000});

        DO.U.openResource(open);

        window.history.replaceState({}, null, document.location.href.substr(0, document.location.href.lastIndexOf('?')));
      }

      if (DO.C.EditorAvailable) {
        if (DO.U.urlParam('author') == 'true' || DO.U.urlParam('social') == 'true') {
          if (DO.U.urlParam('social') == 'true') {
            mode = 'social';
          }
          else if (DO.U.urlParam('author') == 'true') {
            mode = 'author';
          }
          var url = document.location.href;
          window.history.replaceState({}, null, url.substr(0, url.lastIndexOf('?')));
        }

        if (mode !== 'author') {
          var content = doc.selectArticleNode(document);
          content = util.fragmentFromString(doc.domToString(content)).textContent.trim();
          if (content.length == 0) {
            mode = 'author';
          }
        }

        switch(mode || '') {
          case 'social': default:
            DO.U.Editor.enableEditor('social');
            break;
          case 'author':
            DO.U.Editor.enableEditor('author');
            break;
        }
      }
    },

    //TODO: Refactor
    initDocumentActions: function() {
      //Fugly
      function checkResourceInfo() {
        if (DO.C.ResourceInfo) {
          processPotentialAction(DO.C.ResourceInfo);
        }
        else {
          window.setTimeout(checkResourceInfo, 100);
        }
      }

      function processPotentialAction(resourceInfo) {
        var g = resourceInfo.graph;
        var triples = g._graph;
        triples.forEach(function(t){
          var s = t.subject.nominalValue;
          var p = t.predicate.nominalValue;
          var o = t.object.nominalValue;

          if(p == DO.C.Vocab['schemapotentialAction']['@id']) {
            var subject = g.child(s);
            var potentialActions = subject.schemapotentialAction;
// console.log(potentialActions)
            potentialActions.forEach(function(action){
// console.log(action);
              var originPathname = document.location.origin + document.location.pathname;
// console.log(originPathname)
// console.log(action.startsWith(originPathname + '#'))
              if (action.startsWith(originPathname)) {
                document.addEventListener('click', function(e) {
                  var fragment = action.substr(action.lastIndexOf('#'));
// console.log(fragment)
                  if (fragment) {
                    var selector = '[about="' + fragment  + '"][typeof="schema:ViewAction"], [href="' + fragment  + '"][typeof="schema:ViewAction"], [resource="' + fragment  + '"][typeof="schema:ViewAction"]';
// console.log(selector)
                    // var element = document.querySelectorAll(selector);
                    var element = e.target.closest(selector);
// console.log(element)
                    if (element) {
                      e.preventDefault();
                      e.stopPropagation();

                      var so = g.child(action).schemaobject;
                      if (typeof so !== 'undefined') {
                        so = so.iri().toString();
                        selector = '#' + element.closest('[id]').id;
// console.log(selector)

                        var svgGraph = document.querySelector(selector + ' svg.graph');
                        if (svgGraph) {
                          svgGraph.parentNode.removeChild(svgGraph);
                        }
                        else {
                          graph.serializeGraph(g, { 'contentType': 'text/turtle' })
                            .then(function(data){
                              var options = {};
                              options['subjectURI'] = so;
                              options['contentType'] = 'text/turtle';
                              DO.U.showVisualisationGraph(options.subjectURI, data, selector, options);
                            });
                        }
                      }
                    }
                  }
                });
              }
            });
          }
        });
      }

      var resourceInfo = checkResourceInfo();

      document.addEventListener('click', function(e) {
        if (e.target.closest('[about="#document-menu"][typeof="schema:ActivateAction"], [href="#document-menu"][typeof="schema:ActivateAction"], [resource="#document-menu"][typeof="schema:ActivateAction"]')) {
          e.preventDefault();
          e.stopPropagation();

          if (document.body.classList.contains('on-document-menu')) {
            DO.U.hideDocumentMenu(e);
          }
          else {
            DO.U.showDocumentMenu(e);
          }
        }
      });

      var annotationRights = document.querySelectorAll('[about="#annotation-rights"][typeof="schema:ChooseAction"], [href="#annotation-rights"][typeof="schema:ChooseAction"], [resource="#annotation-rights"][typeof="schema:ChooseAction"]');
      for (var i = 0; i < annotationRights.length; i++){
        annotationRights[i].parentNode.replaceChild(util.fragmentFromString('<select>' + DO.U.getLicenseOptionsHTML() + '</select>'), annotationRights[i]);
      }
    },

    showDocumentInfo: function() {
      document.documentElement.appendChild(util.fragmentFromString('<menu id="document-menu" class="do"><button class="show" title="Open menu">' + template.Icon[".fas.fa-bars"] + '</button><header></header><div></div><footer><dl><dt>About</dt><dd id="about-dokieli"><img alt="" height="16" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAn1BMVEUAAAAAjwAAkAAAjwAAjwAAjwAAjwAAjwAAkAAAdwAAjwAAjQAAcAAAjwAAjwAAiQAAjwAAjAAAjwAAjwAAjwAAjwAAkAAAjwAAjwAAjwAAjQAAjQAAhQAAhQAAkAAAkAAAkAAAjgAAjwAAiQAAhAAAkAAAjwAAjwAAkAAAjwAAjgAAjgAAjQAAjwAAjQAAjwAAkAAAjwAAjQAAiwAAkABp3EJyAAAANHRSTlMA+fH89enaabMF4iADxJ4SiSa+uXztyoNvQDcsDgvl3pRiXBcH1M+ppJlWUUpFMq6OdjwbMc1+ZgAABAhJREFUeNrt29nSmkAQBeAGZBMUxH3f993/vP+zJZVKVZKCRhibyc3/XVt6SimYPjPSt28Vmt5W/fu2T/9B9HIf7Tp+0RsgDC6DY6OLvzxJj8341DnsakgZUNUmo2XsORYYS6rOeugukhnyragiq56JIs5UEQ/FXKgidRTzompEKOhG1biioDFV44mCAqrGAQWtqRptA8VMqCpR6zpo9iy84VO1opWHPBZVb9QAzyQN/D1YNungJ+DMSYsbOFvSIwGjR3p0wGiQHkMw2qRHC4w76RGBcSA9NmAcSY8QjAdpYiFbTJoYyNYnTWrI1iFNusj2JE1sZBuQJtyE5pImc3Y21cRhZ1NNtsh2Ik127HCsSY8djjVpINuVhPnjVefobee2adXqu2S/6FyivABDEjQ9Lxo1pDlNd5wg24ikRK5ngKGhHhg1DSgZk4RrD6pa9LlRAnUBfWp6xCe+6EOvOT6yrmrigZaCZHPAp6b0gaiBFKvRd0/D1rr1OrvxDqiyoZmmPt9onib0t/VybyEXqdu0Cw16rUNVAfZFlzdjr5KOaoAUK6JsrgWGQapuBlIS4gy70gEmTrk1fuAgU40UxWXv6wvZAC2Dqfx0BfBK1z1H0aJ0WH7Ub4oG8JDlpBCgK1l5tSjHQSoAf0HVfMqxF+yqpzVk2ZGuAGdk8ijPHZlmpOCg0vh5cgE2JtN3qQSoU3lXpbKlLRegrzTpt+U2TNpKY2YiFiA0kS1Q6QccweZ/oinASm2B3RML0AGDNAU4qq3udmIXYVttD3YrFsBR24N1xG5EJpTeaiYWwILS5WRKBfChFsCSehpOwKi/yS0V4AsMWym3TWUFgMqIsRYL8AVOSDlaYgEitbZnDKll+UatchyJBSC1c3lDuQA2VHYAL3KneHpgLCjHSS7AHYyEciwh1g88wDB94rlyAVxwhsR7ygW4gRMTry8XwDdUDkXFgjVdD5wRsRaCAWJwPGI1Baval8Ie3Hqn8AjjhHbZr2DzrInumDTBGlCG8xy8QPY3MNLX4TiRP1q+BWs2pn9ECwu5+qTABc+80h++28UbTkjlTW3wrM6Ufrtu8d5J9Svg1Vch/RTcUYQdUHm+g1z1x2gSGyjGGVN5F7xjoTCjE0ndC3jJMzfCftmiciZ1lNGe3vCGufOWVMLIQHHehi3X1O8JJxR236SalUzninbu937BlwfV/I3k4KdGk2xm+MHuLa8Z0i9TC280qLRrF+8cw9RSjrOg8oIG8j2YgULsbGPomsgR0x9nsOzkOLh+kZr1owZGbfC2JJl78fIV0Wei/gxZDl85XWVtt++cxhuSEQ6bdfzLjlvM86PbaD4vQUjSglV8385My7CdXtO9+ZSyrLcf7nBN376V8gMpRztyq6RXYQAAAABJRU5ErkJggg==" width="16" /><a href="https://dokie.li/" target="_blank">dokieli</a> is an ' + template.Icon[".fab.fa-osi"] + ' <a href="https://github.com/linkeddata/dokieli" target="_blank">open source</a> project. There is ' + template.Icon[".fas.fa-flask"] + ' <a href="https://dokie.li/docs" target="_blank">documentation</a> and public ' + template.Icon[".fas.fa-comments"] + ' <a href="https://gitter.im/linkeddata/dokieli" target="_blank">chat</a>. Made with fun.</dd></dl></footer></menu>'));
      document.querySelector('#document-menu').addEventListener('click', function(e) {
        var button = e.target.closest('button');
        if(button){
          if (button.classList.contains('show')) {
            DO.U.showDocumentMenu(e);
          }
          else if (button.classList.contains('hide')) {
            DO.U.hideDocumentMenu(e);
          }
        }
      });
    },

    showDocumentMenu: function showDocumentMenu (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      DO.U.getResourceInfo().then(function(resourceInfo){
        var body = document.body;
        var dMenu = document.querySelector('#document-menu.do');

        if(dMenu) {
          var dMenuButton = dMenu.querySelector('button');
          var dHead = dMenu.querySelector('header');
          var dInfo = dMenu.querySelector('div');

          dMenuButton.classList.remove('show');
          dMenuButton.classList.add('hide');
          dMenuButton.setAttribute('title', 'Hide Menu');
          dMenuButton.innerHTML = template.Icon[".fas.fa-minus"];
          dMenu.classList.add('on');
          body.classList.add('on-document-menu');

          auth.showUserSigninSignout(dHead);
          DO.U.showDocumentDo(dInfo);
          DO.U.showViews(dInfo);

          if(!body.classList.contains('on-slideshow')) {
            DO.U.showDocumentItems();
          }

          // document.addEventListener('click', DO.U.eventLeaveDocumentMenu);
        }
        else {
          DO.U.showDocumentInfo();
          DO.U.showDocumentMenu();
        }
      });
    },

    hideDocumentMenu: function(e) {
      // document.removeEventListener('click', DO.U.eventLeaveDocumentMenu);

      var body = document.body;
      var dMenu = document.querySelector('#document-menu.do');
      var dMenuButton = dMenu.querySelector('button');

      dMenu.classList.remove('on');
      var sections = dMenu.querySelectorAll('section');
      for (var i = 0; i < sections.length; i++) {
        if(sections[i].id != 'user-info' && !sections[i].querySelector('button.signin-user')) {
          sections[i].parentNode.removeChild(sections[i]);
        }
      };
      var buttonSigninUser = dMenu.querySelector('button.signin-user');
      if(buttonSigninUser) {
        dMenu.querySelector('button.signin-user').disabled = false;
      }
      body.classList.remove('on-document-menu');
      dMenuButton.classList.remove('hide');
      dMenuButton.classList.add('show');
      dMenuButton.setAttribute('title', 'Open Menu');
      dMenuButton.innerHTML = template.Icon[".fas.fa-bars"];

      var removeElementsList = ['document-items', 'embed-data-entry', 'create-new-document', 'open-document', 'source-view', 'save-as-document', 'user-identity-input', 'resource-browser', 'share-resource', 'reply-to-resource', 'memento-document', 'graph-view', 'robustify-links'];
      removeElementsList.forEach(function(id) {
        var element = document.getElementById(id);
        if(element) {
          element.parentNode.removeChild(element);
        }
      });
    },

    setPolyfill: function() {
      if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector;
      }

      if (!Element.prototype.closest) {
        Element.prototype.closest = function (selector) {
          var el = this;
          while (el) {
            if (el.matches(selector)) {
              return el;
            }
            el = el.parentElement;
          }
        };
      }
    },

    matchAllIndex: function(string, regexp) {
      //XXX: This used to be String.protocol.matchAll from https://web.archive.org/web/20180407184826/http://cwestblog.com/2013/02/26/javascript-string-prototype-matchall/ and returns an Array, but it is being repurposed. Firefox Nightly 66.0a1 (around 2018-12-24) started to support String.prototype.matchAll and returns an RegExp String Iterator. Changing it to matchAllIndex to not conflict

      // if (!String.prototype.matchAll) {
        // String.prototype.matchAll = function(regexp) {
          var matches = [];
          // this.replace(regexp, function() {
          string.replace(regexp, function() {
            var arr = ([]).slice.call(arguments, 0);
            var extras = arr.splice(-2);
            arr.index = extras[0];
            arr.input = extras[1];
            matches.push(arr);
          });
          return matches.length ? matches : null;
        // };
      // }
    },

    showXHRProgressHTML: function(http, options) {
      if ('progress' in options) {
        http.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            options.progress.value = (e.loaded / e.total) * 100;
            options.progress.textContent = options.progress.value; // Fallback for unsupported browsers.
          }
        };
      }
    },

    setDocRefType: function() {
      var link = document.querySelector('head link[rel="stylesheet"][title]');
      if (link) {
        DO.C.DocRefType = link.getAttribute('title');
      }
      if (Object.keys(DO.C.RefType).indexOf(DO.C.DocRefType) == -1) {
        DO.C.DocRefType = 'LNCS';
      }
    },

    getCurrentLinkStylesheet: function() {
      return document.querySelector('head link[rel="stylesheet"][title]:not([href$="dokieli.css"]):not([disabled])');
    },

    showViews: function(node) {
      if(document.querySelector('#document-views')) { return; }

      var stylesheets = document.querySelectorAll('head link[rel~="stylesheet"][title]:not([href$="dokieli.css"])');

      var s = '<section id="document-views" class="do"><h2>Views</h2>' + template.Icon[".fas.fa-magic"] + '<ul>';
      if (DO.C.GraphViewerAvailable) {
        s += '<li><button class="resource-visualise" title="Change to graph view">Graph</button></li>';
      }
      s += '<li><button title="Change to native device/browser view">Native</button></li>';

      if (stylesheets.length > 0) {
        for (var i = 0; i < stylesheets.length; i++) {
          var stylesheet = stylesheets[i];
          var view = stylesheet.getAttribute('title');
          if(stylesheet.closest('[rel~="alternate"]')) {
            s += '<li><button title="Change to ‘' + view + '’ view">' + view + '</button></li>';
          }
          else {
            s += '<li><button disabled="disabled" title="Current style">' + view + '</button></li>';
          }
        }
      }

      s += '</ul></section>';
      node.insertAdjacentHTML('beforeend', s);

      var viewButtons = document.querySelectorAll('#document-views.do button:not([class~="resource-visualise"])');
      for (var i = 0; i < viewButtons.length; i++) {
        viewButtons[i].removeEventListener('click', DO.U.initCurrentStylesheet);
        viewButtons[i].addEventListener('click', DO.U.initCurrentStylesheet);
      }

      if(DO.C.GraphViewerAvailable) {
        document.querySelector('#document-views.do').addEventListener('click', function(e){
          if (e.target.closest('.resource-visualise')) {
            if(document.querySelector('#graph-view')) { return; }

            if (e) {
              e.target.disabled = true;
            }

            document.documentElement.appendChild(util.fragmentFromString('<aside id="graph-view" class="do on">' + DO.C.Button.Close + '<h2>Graph view</h2></aside>'));

            var graphView = document.getElementById('graph-view');
            graphView.addEventListener('click', function(e) {
              if (e.target.closest('button.close')) {
                var rv = document.querySelector('#document-views .resource-visualise');
                if (rv) {
                  rv.disabled = false;
                }
              }
            });

            var optionsNormalisation = DO.C.DOMNormalisation;
            delete optionsNormalisation['skipNodeWithClass'];

            DO.U.showVisualisationGraph(document.location.href, doc.getDocument(null, optionsNormalisation), '#graph-view');
          }
        });
      }
    },

    updateSelectedStylesheets: function(stylesheets, selected) {
      var selected = selected.toLowerCase();

      for (var j = 0; j < stylesheets.length; j++) {
        (function(stylesheet) {
          if (stylesheet.getAttribute('title').toLowerCase() != selected) {
              stylesheet.disabled = true;
              stylesheet.setAttribute('rel', 'stylesheet alternate');
          }
        })(stylesheets[j]);
      };
      for (var j = 0; j < stylesheets.length; j++) {
        (function(stylesheet) {
          if (stylesheet.getAttribute('title').toLowerCase() == selected) {
              stylesheet.setAttribute('rel', 'stylesheet');
              stylesheet.disabled = false;
          }
        })(stylesheets[j]);
      }
    },

    initCurrentStylesheet: function(e) {
      var currentStylesheet = DO.U.getCurrentLinkStylesheet();
      currentStylesheet = (currentStylesheet) ? currentStylesheet.getAttribute('title') : '';
      var selected = (e && e.target) ? e.target.textContent.toLowerCase() : currentStylesheet.toLowerCase();
      var stylesheets = document.querySelectorAll('head link[rel~="stylesheet"][title]:not([href$="dokieli.css"])');

      DO.U.updateSelectedStylesheets(stylesheets, selected);

      var bd = document.querySelectorAll('#document-views.do button');
      for(var j = 0; j < bd.length; j++) {
        bd[j].disabled = (e && e.target && (e.target.textContent == bd[j].textContent)) ? true : false;
      }

      DO.U.showRefs();

      if (selected == 'shower') {
        var slides = document.querySelectorAll('.slide');
        for(var j = 0; j < slides.length; j++) {
          slides[j].classList.add('do');
        }
        document.body.classList.add('on-slideshow', 'list');
        document.querySelector('head').insertAdjacentHTML('beforeend', '<meta name="viewport" content="width=792, user-scalable=no" />');


        var body = document.body;
        var dMenu = document.querySelector('#document-menu.do');

        if(dMenu) {
          var dMenuButton = dMenu.querySelector('button');
          var dHead = dMenu.querySelector('header');
          var dInfo = dMenu.querySelector('div');

          dMenuButton.classList.remove('show');
          dMenuButton.classList.add('hide');
          dMenuButton.setAttribute('title', 'Open Menu');
          dMenuButton.innerHTML = template.Icon[".fas.fa-minus"];
          dMenu.classList.remove('on');
          body.classList.remove('on-document-menu');

          var dMenuSections = dMenu.querySelectorAll('section');
          for (var j = 0; j < dMenuSections.length; j++) {
            dMenuSections[j].parentNode.removeChild(dMSections[j]);
          }
        }

        var toc = document.getElementById('table-of-contents');
        toc = (toc) ? toc.parentNode.removeChild(toc) : false;

        shower.initRun();
      }
      if (currentStylesheet.toLowerCase() == 'shower') {
        var slides = document.querySelectorAll('.slide');
        for (var c = 0; c < slides.length; c++){
          slides[c].classList.remove('do');
        }
        document.body.classList.remove('on-slideshow', 'list', 'full');
        document.body.removeAttribute('style');
        var mV = document.querySelector('head meta[name="viewport"][content="width=792, user-scalable=no"]');
        mV = (mV) ? mV.parentNode.removeChild(mV) : false;

        history.pushState(null, null, window.location.pathname);

        shower.removeEvents();
      }
    },

    showEmbedData: function(e) {
      if(document.querySelector('#embed-data-in-html')) { return; }

      // var eventEmbedData = function(e) {
        e.target.setAttribute('disabled', 'disabled');
        var scriptCurrent = document.querySelectorAll('head script[id^="meta-"]');

        var scriptType = {
          'meta-turtle': {
            scriptStart: '<script id="meta-turtle" title="Turtle" type="text/turtle">',
            cdataStart: '# ' + DO.C.CDATAStart + '\n',
            cdataEnd: '\n# ' + DO.C.CDATAEnd,
            scriptEnd: '</script>'
          },
          'meta-json-ld': {
            scriptStart: '<script id="meta-json-ld" title="JSON-LD" type="application/ld+json">',
            cdataStart: DO.C.CDATAStart + '\n',
            cdataEnd: '\n' + DO.C.CDATAEnd,
            scriptEnd: '</script>'
          },
          'meta-trig': {
            scriptStart: '<script id="meta-trig" title="TriG" type="application/trig">',
            cdataStart: '# ' + DO.C.CDATAStart + '\n',
            cdataEnd: '\n# ' + DO.C.CDATAEnd,
            scriptEnd: '</script>'
          }
        }

        var scriptCurrentData = {};
        if (scriptCurrent.length > 0) {
          for(var i = 0; i < scriptCurrent.length; i++) {
            var v = scriptCurrent[i];
            var id = v.id;
            scriptCurrentData[id] = v.innerHTML.split(/\r\n|\r|\n/);
            scriptCurrentData[id].shift();
            scriptCurrentData[id].pop();
            scriptCurrentData[id] = {
              'type': v.getAttribute('type') || '',
              'title': v.getAttribute('title') || '',
              'content' : scriptCurrentData[id].join('\n')
            };
          }
        }

        var embedMenu = '<aside id="embed-data-entry" class="do on tabs">' + DO.C.Button.Close + '\n\
        <h2>Embed Data</h2>\n\
        <nav><ul><li class="selected"><a href="#embed-data-turtle">Turtle</a></li><li><a href="#embed-data-json-ld">JSON-LD</a></li><li><a href="#embed-data-trig">TriG</a></li></ul></nav>\n\
        <div id="embed-data-turtle" class="selected"><textarea placeholder="Enter data in Turtle" name="meta-turtle" cols="80" rows="24">' + ((scriptCurrentData['meta-turtle']) ? scriptCurrentData['meta-turtle'].content : '') + '</textarea><button class="save" title="Embed data into document">Save</button></div>\n\
        <div id="embed-data-json-ld"><textarea placeholder="Enter data in JSON-LD" name="meta-json-ld" cols="80" rows="24">' + ((scriptCurrentData['meta-json-ld']) ? scriptCurrentData['meta-json-ld'].content : '') + '</textarea><button class="save" title="Embed data into document">Save</button></div>\n\
        <div id="embed-data-trig"><textarea placeholder="Enter data in TriG" name="meta-trig" cols="80" rows="24">' + ((scriptCurrentData['meta-trig']) ? scriptCurrentData['meta-trig'].content : '') + '</textarea><button class="save" title="Embed data into document">Save</button></div>\n\
        </aside>';

        document.documentElement.appendChild(util.fragmentFromString(embedMenu));
        document.querySelector('#embed-data-turtle textarea').focus();
        var a = document.querySelectorAll('#embed-data-entry nav a');
        for(var i = 0; i < a.length; i++) {
          a[i].addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            var li = e.target.parentNode;
            if(!li.classList.contains('selected')) {
              document.querySelector('#embed-data-entry nav li.selected').classList.remove('selected');
              li.classList.add('selected');
              document.querySelector('#embed-data-entry > div.selected').classList.remove('selected');
              var d = document.querySelector('#embed-data-entry > div' + e.target.hash);
              d.classList.add('selected');
              d.querySelector('textarea').focus();
            }
          });
        }

        document.querySelector('#embed-data-entry button.close').addEventListener('click', function(e) {
          document.querySelector('button.embed-data-meta').removeAttribute('disabled');
        });

        var buttonSave = document.querySelectorAll('#embed-data-entry button.save');
        for (var i = 0; i < buttonSave.length; i++) {
          buttonSave[i].addEventListener('click', function(e) {
            var textarea = e.target.parentNode.querySelector('textarea');
            var name = textarea.getAttribute('name');
            var scriptEntry = textarea.value;
            var script = document.getElementById(name);

            if (scriptEntry.length > 0) {
              //If there was a script already
              if (script) {
                var scriptContent = scriptType[name].cdataStart + scriptEntry + scriptType[name].cdataEnd;
                script.innerHTML = scriptContent;
              }
              else {
                var scriptContent = '  ' + scriptType[name].scriptStart + scriptType[name].cdataStart + scriptEntry + scriptType[name].cdataEnd + scriptType[name].scriptEnd;
                document.querySelector('head').insertAdjacentHTML('beforeend', scriptContent);
              }
            }
            else {
              //Remove if no longer used
              script.parentNode.removeChild(script);
            }

            var ede = document.getElementById('embed-data-entry');
            ede.parentNode.removeChild(ede);
            document.querySelector('.embed-data-meta').removeAttribute('disabled');
          });
        };
      // };

      // var edih = document.querySelector('button.embed-data-meta');
      // edih.removeEventListener('click', eventEmbedData);
      // edih.addEventListener('click', eventEmbedData);
    },

    htmlEntities: function(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    showDocumentMetadata: function(node) {
      if(document.querySelector('#document-metadata')) { return; }

      var content = doc.selectArticleNode(document);
      var count = DO.U.contentCount(content);
      var authors = [], contributors = [], editors = [];
      var citationsTo = [];

      var data = doc.getDocument();
      var subjectURI = window.location.origin + window.location.pathname;
      var options = {'contentType': 'text/html', 'subjectURI': subjectURI };

      // graph.getGraphFromData(data, options).then(
      //   function(i){
      //     var s = SimpleRDF(DO.C.Vocab, options['subjectURI'], i, ld.store);
          var s = DO.C.ResourceInfo.graph;
// console.log(s)

          var triples = s._graph;
          var citations = Object.keys(DO.C.Citation).concat(DO.C.Vocab["schemacitation"]["@id"]);
// console.log(citations)
          triples.forEach(function(t){
            var s = t.subject.nominalValue;
            var p = t.predicate.nominalValue;
            var o = t.object.nominalValue;

            if(citations.indexOf(p) > -1) {
              citationsTo.push(t); 
            }
          });
// console.log(citationsTo)
          citations = '<tr class="citations"><th>Citations</th><td>' + citationsTo.length + '</td></tr>';

          var statements = '<tr class="statements"><th>Statements</th><td>' + triples.length + '</td></tr>';

          var g = s.child(options['subjectURI']);
// console.log(g)

          if(g.schemaeditor._array.length > 0) {
            g.schemaeditor.forEach(function(s){
              var label = DO.U.getResourceLabel(g.child(s));
              if(typeof label !== 'undefined'){
                editors.push('<li>' + label + '</li>');
              }
            });
            if(editors.length > 0){
              editors = '<tr class="people"><th>Editors</th><td><ul class="editors">' + editors.join('') + '</ul></td></tr>';
            }
          }

          if(g.schemaauthor._array.length > 0) {
            g.schemaauthor.forEach(function(s){
              var label = DO.U.getResourceLabel(g.child(s));
              if(typeof label !== 'undefined'){
                authors.push('<li>' + label + '</li>');
              }
            });
            if(authors.length > 0){
              authors = '<tr class="people"><th>Authors</th><td><ul class="authors">' + authors.join('') + '</ul></td></tr>';
            }
          }

          if(g.schemacontributor._array.length > 0) {
            g.schemacontributor.forEach(function(s){
              var label = DO.U.getResourceLabel(g.child(s));
              if(typeof label !== 'undefined'){
                contributors.push('<li>' + label + '</li>');
              }
            });
            if(contributors.length > 0){
              contributors = '<tr class="people"><th>Contributors</th><td><ul class="contributors">' + contributors.join('') + '</ul></td></tr>';
            }
          }

          var data = authors + editors + contributors + citations + statements;

          // return authors + editors + contributors + citations + statements;
        // }).then(
        // function(data){
              // <tr><th>Lines</th><td>' + count.lines + '</td></tr>\n\
              // <tr><th>A4 Pages</th><td>' + count.pages.A4 + '</td></tr>\n\
              // <tr><th>US Letter</th><td>' + count.pages.USLetter + '</td></tr>\n\
          var s = '<section id="document-metadata" class="do"><table>\n\
            <caption>Document Metadata</caption>\n\
            <tbody>\n\
              ' + data + '\n\
              <tr><th>Reading time</th><td>' + count.readingTime + ' minutes</td></tr>\n\
              <tr><th>Characters</th><td>' + count.chars + '</td></tr>\n\
              <tr><th>Words</th><td>' + count.words + '</td></tr>\n\
              <tr><th>Bytes</th><td>' + count.bytes + '</td></tr>\n\
            </tbody>\n\
          </table></section>';

          node.insertAdjacentHTML('beforeend', s);
        // });
    },

    contentCount: function contentCount (c) {
      var content = util.fragmentFromString(doc.domToString(c)).textContent.trim();
      var contentCount = { readingTime:1, words:0, chars:0, lines:0, pages:{A4:1, USLetter:1}, bytes:0 };
      if (content.length > 0) {
        var lineHeight = c.ownerDocument.defaultView.getComputedStyle(c, null)["line-height"];
        var linesCount = Math.ceil(c.clientHeight / parseInt(lineHeight));
        contentCount = {
          readingTime: Math.ceil(content.split(' ').length / 200),
          words: content.match(/\S+/g).length,
          chars: content.length,
          lines: linesCount,
          pages: { A4: Math.ceil(linesCount / 47), USLetter: Math.ceil(linesCount / 63) },
          bytes: encodeURI(document.documentElement.outerHTML).split(/%..|./).length - 1
        };
      }
      return contentCount;
    },

    showDocumentItems: function() {
      var documentItems = document.getElementById('document-items');
      if (!documentItems) {
        document.documentElement.appendChild(util.fragmentFromString('<aside id="document-items" class="do on">' + DO.C.Button.Close + '</aside>'));
        documentItems = document.getElementById('document-items');
      }

      var sections = document.querySelectorAll('h1 ~ div > section:not([class~="slide"]):not([id^=table-of]):not([id^=list-of])');

      if (sections.length > 0) {
        DO.U.showListOfStuff(documentItems);

        DO.U.showTableOfContents(documentItems, sections)

        if(DO.C.SortableList && DO.C.EditorEnabled) {
          DO.U.sortToC();
        }
      }

      DO.U.showDocumentMetadata(documentItems);
    },

    showListOfStuff: function(node) {
      if (!node) { return; }

      var disabledInput = '', s = [];
      if (!DO.C.EditorEnabled) {
        disabledInput = ' disabled="disabled"';
      }

      Object.keys(DO.C.ListOfStuff).forEach(function(id) {
        var checkedInput = '';
        var label = DO.C.ListOfStuff[id].label;
        var selector = DO.C.ListOfStuff[id].selector;

        var item = document.getElementById(id);

        if(item) {
          checkedInput = ' checked="checked"';

          // DO.U.buildListOfStuff(id);
        }

        s.push('<li><input id="l-o-s-' + id +'" type="checkbox"' + disabledInput + checkedInput + '/><label for="l-o-s-' + id + '">' + label + '</label></li>');
      });

      if (s.length > 0) {
        node.insertAdjacentHTML('beforeend', '<section id="list-of-stuff" class="do"><h2>List of Stuff</h2><ul>' + s.join('') + '</ul></section>');

        if(DO.C.EditorEnabled) {
          document.getElementById('list-of-stuff').addEventListener('click', function(e){
            if (e.target.closest('input')) {
              var id = e.target.id.slice(6);
              if(!e.target.getAttribute('checked')) {
                DO.U.buildListOfStuff(id);
                e.target.setAttribute('checked', 'checked');
                window.location.hash = '#' + id;
              }
              else {
                var tol = document.getElementById(id);
                if(tol) {
                  tol.parentNode.removeChild(tol);
                }
                e.target.removeAttribute('checked');
                window.history.replaceState(null, null, window.location.pathname);
              }
            }
          });
        }
      }
    },

    showTableOfContents: function(node, sections, options) {
      options = options || {}
      var sortable = (DO.C.SortableList && DO.C.EditorEnabled) ? ' sortable' : '';

      if (!node) { return; }

      var toc = '<section id="table-of-contents-i" class="do"' + sortable + '><h2>' + DO.C.ListOfStuff['table-of-contents'].label + '</h2><ol class="toc' + sortable + '">';
      toc += DO.U.getListOfSections(sections, {'sortable': DO.C.SortableList});
      toc += '</ol></section>';

      node.insertAdjacentHTML('beforeend', toc);
    },


    sortToC: function() {
    },

    getListOfSections: function(sections, options) {
      options = options || {};
      var s = '', attributeClass = '';
      if (options.sortable == true) { attributeClass = ' class="sortable"'; }

      for (var i = 0; i < sections.length; i++) {
        var section = sections[i];
        if(section.id) {
          var heading = section.querySelector('h1, h2, h3, h4, h5, h6, header h1, header h2, header h3, header h4, header h5, header h6') || { 'textContent': section.id };
          var currentHash = '';
          var dataId = ' data-id="' + section.id +'"';

          if (!options.raw) {
            currentHash = (document.location.hash == '#' + section.id) ? ' class="selected"' : '';
            attributeClass = '';
          }

          if (heading) {
            s += '<li' + currentHash + dataId + '><a href="#' + section.id + '">' + heading.textContent + '</a>';
            var subsections = section.parentNode.querySelectorAll('[id="' + section.id + '"] > div > section[rel*="hasPart"]:not([class~="slide"]), [id="' + section.id + '"] > section[rel*="hasPart"]:not([class~="slide"])');

            if (subsections.length > 0) {
              s += '<ol'+ attributeClass +'>';
              s += DO.U.getListOfSections(subsections, options);
              s += '</ol>';
            }
            s += '</li>';
          }
        }
      }

      return s;
    },

    buildListOfStuff: function(id) {
      var s = '';

      if(id == 'references'){
        DO.U.buildReferences();
      }
      else {
        var label = DO.C.ListOfStuff[id].label;
        var selector = DO.C.ListOfStuff[id].selector;
        var titleSelector = DO.C.ListOfStuff[id].titleSelector;

        var nodes = document.querySelectorAll('section:not([class~="do"]) ' + selector);

        if (id == 'table-of-contents' || nodes.length > 0) {
          var tId = document.getElementById(id);
          if(tId) { tId.parentNode.removeChild(tId); }

          if (id == 'list-of-abbreviations') {
            s += '<section id="' + id + '">';
            s += '<h2>' + label + '</h2>';
            s += '<div><dl>';
          }
          else if(id == 'list-of-quotations') {
            s += '<section id="' + id + '">';
            s += '<h2>' + label + '</h2>';
            s += '<div><ul>';
          }
          else {
            s += '<nav id="' + id + '">';
            s += '<h2>' + label + '</h2>';
            s += '<div><ol class="toc">';
          }

          if (id == 'table-of-contents') {
            s += DO.U.getListOfSections(document.querySelectorAll('h1 ~ div > section:not([class~="slide"])'), {'raw': true});
          }
          else {
            if (id == 'list-of-abbreviations') {
              if (nodes.length > 0) {
                nodes = [].slice.call(nodes);
                nodes.sort(function(a, b) {
                  return a.textContent.toLowerCase().localeCompare(b.textContent.toLowerCase());
                });
              }

              var processed = [];
              for (var i = 0; i < nodes.length; i++) {
                if (processed.indexOf(nodes[i].textContent) < 0) {
                  s += '<dt>' + nodes[i].textContent + '</dt>';
                  s += '<dd>' + nodes[i].getAttribute(titleSelector) + '</dd>';
                  processed.push(nodes[i].textContent);
                }
              };
            }
            //list-of-figures, list-of-tables, list-of-quotations
            else {
              var processed = [];
              for (var i = 0; i < nodes.length; i++) {
                var title, textContent;

                if (id == 'list-of-quotations') {
                  title = nodes[i].getAttribute(titleSelector);
                }
                else {
                  title = nodes[i].querySelector(titleSelector);
                }

                if (title) {
                  if (id == 'list-of-quotations') {
                    textContent = doc.removeSelectorFromNode(nodes[i], '.do').textContent;
                  }
                  else {
                    textContent = doc.removeSelectorFromNode(title, '.do').textContent;
                  }

                  if (processed.indexOf(textContent) < 0) {
                    if (id == 'list-of-quotations') {
                      s += '<li><q>' + textContent + '</q>, <a href="' + title + '">' + title + '</a></li>';
                    }
                    else if(nodes[i].id){
                      s += '<li><a href="#' + nodes[i].id +'">' + textContent +'</a></li>';
                    }
                    else {
                      s += '<li>' + textContent +'</li>';
                    }

                    processed.push(textContent);
                  }
                }
              }
            }
          }

          if (id == 'list-of-quotations'){
            s += '</ul></div>';
            s += '</section>';
          }
          else if (id == 'list-of-abbreviations'){
            s += '</dl></div>';
            s += '</section>';
          } else {
            s += '</ol></div>';
            s += '</nav>';
          }
        }
      }

      doc.insertDocumentLevelHTML(document, s, { 'id': id });
    },

    setDocumentStatus: function(rootNode, options) {
      rootNode = rootNode || document;
      options = options || {};

      var s = DO.U.getDocumentStatusHTML(rootNode, options);

      rootNode = doc.insertDocumentLevelHTML(rootNode, s, options);

      return rootNode;
    },

    getDocumentStatusHTML: function(rootNode, options) {
      rootNode = rootNode || document;
      options = options || {};
      options['mode'] = ('mode' in options) ? options.mode : '';
      options['id'] = ('id' in options) ? options.id : 'document-status';
      var subjectURI = ('subjectURI' in options) ? ' about="' + options.subjectURI + '"' : '';
      var typeLabel = '', typeOf = '';

      switch(options.type) {
        default:
          definitionTitle = 'Document Status';
          break;
        case 'mem:Memento':
          definitionTitle = 'Resource State';
          typeLabel = 'Memento';
          typeOf = ' typeof="' + options.type + '"';
          break;
      }

      var id = ' id="' + options.id + '"';
      var c = ('class' in options && options.class.length > 0) ? ' class="' + options.class + '"' : '';
      // var datetime = ('datetime' in options) ? options.datetime : util.getDateTimeISO();

      var dd = '<dd><span' + subjectURI + typeOf + '>' + typeLabel + '</span></dd>';

      var s = '';
      var dl = rootNode.querySelector('#' + options.id);

      //FIXME: mode should be an array of operations.

      //TODO: s/update/append
      switch (options.mode) {
        case 'create': default:
          s = '<dl'+c+id+'><dt>' + definitionTitle + '</dt>' + dd + '</dl>';
          break;

        case 'update':
          if(dl) {
            var clone = dl.cloneNode(true);
            dl.parentNode.removeChild(dl);
            clone.insertAdjacentHTML('beforeend', dd);
            s = clone.outerHTML;
          }
          else  {
            s = '<dl'+c+id+'><dt>' + definitionTitle + '</dt>' + dd + '</dl>';
          }
          break;

        case 'delete':
          if(dl) {
            var clone = dl.cloneNode(true);
            dl.parentNode.removeChild(dl);

            var t = clone.querySelector('[typeof="' + options.type + '"]');
            if (t) {
              t.closest('dl').removeChild(t.parentNode);
            }

            var cloneDD = clone.querySelectorAll('#' + options.id + ' dd');
            if (cloneDD.length > 0) {
              s = clone.outerHTML;
            }
          }
          break;
      }

// console.log(s);
      return s;
    },

    buttonClose: function() {
      document.addEventListener('click', function(e) {
        var button = e.target.closest('button.close')
        if (button) {
          var parent = button.parentNode;
          parent.parentNode.removeChild(parent);
        }
      });
    },

    eventEscapeDocumentMenu: function(e) {
      if (e.keyCode == 27) { // Escape
        DO.U.hideDocumentMenu(e);
      }
    },

    eventLeaveDocumentMenu: function(e) {
      if (!e.target.closest('.do.on')) {
        DO.U.hideDocumentMenu(e);
      }
    },

    updateDocumentTitle: function(e) {
      var h1 = document.querySelector('h1');
      if (h1) {
        document.title = h1.textContent.trim();
      }
    },

    utf8Tob64: function(s) {
      return window.btoa(encodeURIComponent(s));
    },

    b64Toutf8: function(s) {
      return unescape(decodeURIComponent(window.atob(s)));
    },

    getSelectorSign: function(node) {
      if(!node) {
        return DO.C.SelectorSign["*"];
      }

      if (typeof node === 'object') {
        var nodeName = node.nodeName.toLowerCase();
        var nodeId = '';

        if(node.id) {
          switch(nodeName) {
            default: break;
            case 'section': case 'dl':
              nodeId = '#' + node.id;
              break;
          }
        }

        return DO.C.SelectorSign[nodeName + nodeId] || DO.C.SelectorSign[nodeName] || DO.C.SelectorSign["*"];
      }

      return DO.C.SelectorSign["*"];
    },

    showFragment: function(selector) {
      var ids = (selector) ? document.querySelectorAll(selector) : document.querySelectorAll('main *[id]:not(input):not(textarea):not(select):not(#content)');

      for(var i = 0; i < ids.length; i++){
        ids[i].addEventListener('mouseenter', function(e){
          var fragment = document.querySelector('*[id="' + e.target.id + '"] > .do.fragment');
          if (!fragment && e.target.parentNode.nodeName.toLowerCase() != 'aside'){
            sign = DO.U.getSelectorSign(e.target);

            e.target.insertAdjacentHTML('afterbegin', '<span class="do fragment"><a href="#' + e.target.id + '">' + sign + '</a></span>');
            fragment = document.querySelector('[id="' + e.target.id + '"] > .do.fragment');
            var fragmentClientWidth = fragment.clientWidth;

            var fragmentOffsetLeft = DO.U.getOffset(e.target).left;
            var bodyOffsetLeft = DO.U.getOffset(document.body).left;

            var offsetLeft = 0;
            if ((fragmentOffsetLeft - bodyOffsetLeft) > 200) {
              offsetLeft = e.target.offsetLeft;
            }

            fragment.style.top = Math.ceil(e.target.offsetTop) + 'px';
            fragment.style.left = (offsetLeft - fragmentClientWidth) + 'px';
            fragment.style.height = e.target.clientHeight + 'px';
            fragment.style.width = (fragmentClientWidth - 10) + 'px';
          }
        });

        ids[i].addEventListener('mouseleave', function(e){
          var fragment = document.querySelector('[id="' + e.target.id + '"] > .do.fragment');
          fragment.parentNode.removeChild(fragment);
        });
      }
    },

    showRobustLinksDecoration: function(node) {
      node = node || document;
// console.log(node)
      var nodes = node.querySelectorAll('[data-versionurl], [data-originalurl]');
// console.log(nodes)
      nodes.forEach(function(i){
        if (i.nextElementSibling && i.nextElementSibling.classList.contains('do') && i.nextElementSibling.classList.contains('robustlinks')) {
          return;
        }

        var href = i.getAttribute('href');

        var originalurl = i.getAttribute('data-originalurl');
        originalurl = (originalurl) ? originalurl.trim() : undefined;
        originalurl = (originalurl) ? '<span>Original</span><span><a href="' + originalurl + '" target="_blank">' + originalurl + '</a></span>' : '';

        var versionurl = i.getAttribute('data-versionurl');
        versionurl = (versionurl) ? versionurl.trim() : undefined;
        var versiondate = i.getAttribute('data-versiondate');
        var nearlinkdateurl = '';

        if (versiondate) {
          versiondate = versiondate.trim();
          versiondateNumeric = versiondate.replace(/\D/g, '');
          nearlinkdateurl = 'http://timetravel.mementoweb.org/memento/' + versiondateNumeric + '/' + href;
          nearlinkdateurl = '<span>Near Link Date</span><span><a href="' + nearlinkdateurl + '" target="_blank">' + versiondate + '</a></span>'
        }
        else if (versionurl) {
          versiondate = versionurl;
        }

        versionurl = (versionurl) ? '<span>Version</span><span><a href="' + versionurl + '" target="_blank">' + versiondate + '</a></span>' : '';


        var citations = Object.keys(DO.C.Citation).concat(DO.C.Vocab["schemacitation"]["@id"]);
        //FIXME: This is ultimately inaccurate because it should be obtained through RDF parser
        var citation = '';
        var citationLabels = [];
        var iri;
        var citationType;
        var rel = i.getAttribute('rel');

        if (rel) {
          rel.split(' ').forEach(term=>{
            if (DO.C.Citation[term]){
              citationLabels.push(DO.C.Citation[term]);
            }
            else {
              var s = term.split(':');
              if (s.length == 2) {
                citations.forEach(c=>{
                  if (s[1] == DO.U.getURLLastPath(c)) {
                    citationLabels.push(DO.C.Citation[c])
                  }
                });
              }
            }
          });

          if(citationLabels.length > 0) {
            var citationType = citationLabels.join(', ');
            citation = '<span>Citation Reason</span><span>' + citationType + '</span>';
          }
        }

        i.insertAdjacentHTML('afterend', '<span class="do robustlinks"><button title="Show Robust Links">🔗</button><span>' + citation + originalurl + versionurl + nearlinkdateurl + '</span></span>');
      });

      document.querySelectorAll('.do.robustlinks').forEach(function(i){
        i.addEventListener('click', function(e){
          if (e.target.closest('button')) {
            var pN = e.target.parentNode;
            if (pN.classList.contains('on')){
              pN.classList.remove('on');
            }
            else {
              pN.classList.add('on');
            }
          }
        });
      });
    },

    getOffset: function(el) {
      var box = el.getBoundingClientRect();

      return {
        top: box.top + window.pageYOffset - document.documentElement.clientTop,
        left: box.left + window.pageXOffset - document.documentElement.clientLeft
      }
    },

    forceTrailingSlash: function(aString) {
      if (aString.slice(-1) == "/") return aString;
      return aString + "/";
    },

    getUrlPath: function(aString) {
      return aString.split("/");
    },

    exportAsHTML: function() {
      var data = doc.getDocument();
      //XXX: Encodes strings as UTF-8. Consider storing bytes instead?
      var blob = new Blob([data], {type:'text/html;charset=utf-8'});
      var pattern = /[^\w]+/ig;
      var h1 = document.querySelector('h1');
      var title = (h1) ? h1.textContent.toLowerCase().replace(pattern, '-') : "index";
      var timestamp = util.getDateTimeISO().replace(pattern, '') || "now";

      var fileName = title + '.' + timestamp + '.html';

      var a = document.createElement("a");
      a.download = fileName;

      a.href = window.URL.createObjectURL(blob);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    showRobustLinks: function(e, selector) {
      if (e) {
        e.target.closest('button').disabled = true;
      }

      var robustLinks = selector || document.querySelectorAll('cite > a[href^="http"][data-versionurl][data-versiondate]');

      document.documentElement.appendChild(util.fragmentFromString('<aside id="robustify-links" class="do on">' + DO.C.Button.Close + '<h2>Robustify Links</h2><div id="robustify-links-input"><p><input id="robustify-links-select-all" type="checkbox" value="true"/><label for="robustify-links-select-all">Select all</label></p><p><input id="robustify-links-reuse" type="checkbox" value="true" checked="checked"/><label for="robustify-links-reuse">Reuse Robustifed</label></p><ul id="robustify-links-list"></ul></div><button class="robustify" title="Robustify Links">Robustify</button></aside>'));

      //TODO: Move unique list of existing RL's to ResourceInfo?
      var robustLinksUnique = {};
      robustLinks.forEach(function(i){
        if (!robustLinksUnique[i.href]) {
          robustLinksUnique[i.href] = {
            "node": i,
            "data-versionurl": i.getAttribute("data-versionurl"),
            "data-versiondate": i.getAttribute("data-versiondate")
          };
        }
        else {
          // console.log(i);
        }
      });

// console.log('robustLinks: ' + robustLinks.length);
// console.log(robustLinksUnique)
// console.log('<robustLinksUnique:  ' + Object.keys(robustLinksUnique).length);

      var rlCandidates = document.querySelectorAll('cite > a[href^="http"]:not([data-versionurl]):not([data-versiondate])');
// console.log(rlCandidates)
      var rlInput = document.querySelector('#robustify-links-input');

      rlInput.insertAdjacentHTML('afterbegin', '<p class="count"><data>' + rlCandidates.length + '</data> candidates.</p>');

      var rlUL = document.querySelector('#robustify-links-list');
      rlCandidates.forEach(function(i){
        var html = '<li><input id="' + i.href + '" type="checkbox" value="' + i.href + '" /> <label for="' + i.href + '"><a href="' + i.href + '" target="_blank" title="' + i.textContent + '">' + i.href + '</a></label>';

          //TODO: addEventListener
//         if(robustLinksUnique[i.href]) {
//           //Reuse RL
// // console.log('Reuse Robust Link? ' + robustLinksUnique[i.href]["data-versionurl"]);
//           html += '<button class="robustlinks-reuse" title="' + robustLinksUnique[i.href]["data-versionurl"] + '">' + template.Icon[".fas.fa-recycle"] + '</button>';
//         }

        html += '</li>';
        rlUL.insertAdjacentHTML('beforeend', html);
      });


      var robustifyLinks = document.getElementById('robustify-links');
      robustifyLinks.addEventListener('click', function (e) {
        if (e.target.closest('button.close')) {
          var rs = document.querySelector('#document-do .robustify-links');
          if (rs) {
            rs.disabled = false;
          }
        }

        if (e.target.closest('button.robustify')) {
          e.target.disabled = true;

          var rlChecked = document.querySelectorAll('#robustify-links-list input:checked');

          var promises = [];

          rlChecked.forEach(function(i){
// console.log('Robustifying: ' + i.value)
// console.log(i);

            var options = {};
            options['showRobustLinksDecoration'] = false;
            options['showActionMessage'] = false;
            var node = document.querySelector('cite > a[href="' + i.value + '"]:not([data-versionurl]):not([data-versiondate])');

// console.log(node);

            i.parentNode.insertAdjacentHTML('beforeend', '<span class="progress" data-to="' + i.value + '">' + template.Icon[".fas.fa-circle-notch.fa-spin.fa-fw"] + '</span>')

            // window.setTimeout(function () {
// console.log(i.value);

            var progress = document.querySelector('#robustify-links-list .progress[data-to="' + i.value + '"]');

            var robustLinkFound = false;

            var robustifyLinksReuse = document.querySelector('#robustify-links-reuse');
            if (robustifyLinksReuse.checked) {
              Object.keys(robustLinksUnique).forEach(function(url){
                if (i.value == url) {
// console.log(robustLinksUnique[url])
                  progress.innerHTML = '<a href="' + robustLinksUnique[url]["data-versionurl"] + '" target="_blank">' + template.Icon[".fas.fa-archive"] + '</a>';
// console.log(node)
                  node.setAttribute("data-versionurl", robustLinksUnique[url]["data-versionurl"]);
                  node.setAttribute("data-versiondate", robustLinksUnique[url]["data-versiondate"]);

                  DO.U.showRobustLinksDecoration(node.closest('cite'));

                  robustLinkFound = true;
                }
              });
            }
            
            if (!robustLinkFound) {
              DO.U.createRobustLink(i.value, node, options).then(
                function(rl){
                  var versionURL = ("data-versionurl" in rl) ? rl["data-versionurl"] : rl.href;

                  if ("data-versionurl" in rl && "data-versiondate" in rl) {
                    robustLinksUnique[i.value] = {
                      "node": node,
                      "data-versionurl": rl["data-versionurl"],
                      "data-versiondate": rl["data-versiondate"]
                    }
// console.log('Add    robustLinksUnique: ' + Object.keys(robustLinksUnique).length);
                  }

                  progress.innerHTML = '<a href="' + versionURL + '" target="_blank">' + template.Icon[".fas.fa-archive"] + '</a>';

                  DO.U.showRobustLinksDecoration(node.closest('cite'));
                })
                .catch(function(r){
                  progress.innerHTML = template.Icon[".fas.fa-times-circle"] + ' Unable to archive. Try later.';
                });
            }
// console.log('</robustLinksUnique: ' + Object.keys(robustLinksUnique).length);
            e.target.disabled = false;
          });
        }

        if (e.target.closest('#robustify-links-select-all')) {
          var rlInput = document.querySelectorAll('#robustify-links-list input');
          // console.log(rlInput.value)
          // console.log(e.target.checked)
          if (e.target.checked) {
            rlInput.forEach(function(i) {
              i.setAttribute('checked', 'checked');
              i.checked = true;
            });
          }
          else {
            rlInput.forEach(function(i) {
              i.removeAttribute('checked');
              i.checked = false;
            });
          }
        }

        if (e.target.closest('#robustify-links-list input')) {
          // console.log(e.target)
          if(e.target.getAttribute('checked')) {
            e.target.removeAttribute('checked');
          }
          else {
            e.target.setAttribute('checked', 'checked');
          }
          // console.log(e.target);
        }
      });
    },

    createRobustLink: function(uri, node, options){
      return DO.U.snapshotAtEndpoint(undefined, uri, 'https://web.archive.org/save/', '', {'Accept': '*/*', 'showActionMessage': false })
        .then(function(r){
// console.log(r)
          //FIXME TODO: Doesn't handle relative URLs in Content-Location from w3.org or something. Getting Overview.html but base is lost.
          if (r) {
            var o = {
              "href": uri
            };
            var versionURL = r.location;

            if (typeof versionURL === 'string') {
              var vD = versionURL.split('/')[4];
              if (vD) {
                var versionDate = vD.substr(0,4) + '-' + vD.substr(4,2) + '-' + vD.substr(6,2) + 'T' + vD.substr(8,2) + ':' + vD.substr(10,2) + ':' + vD.substr(12,2) + 'Z';

                node.setAttribute('data-versionurl', versionURL);
                node.setAttribute('data-versiondate', versionDate);

                o["data-versionurl"] = versionURL;
                o["data-versiondate"] = versionDate;
              }
            }

            options['showActionMessage'] = ('showActionMessage' in options) ? options.showActionMessage : true;
            if (options.showActionMessage) {
              doc.showActionMessage(document.documentElement, '<p>Archived <a href="' + uri + '">' + uri + '</a> at <a href="' + versionURL + '">' + versionURL + '</a> and created RobustLink.</p>');
            }

            if (options.showRobustLinksDecoration) {
              DO.U.showRobustLinksDecoration();
            }

            return o;
          }
          else {
            return Promise.reject();
          }
        });
    },

    snapshotAtEndpoint: function snapshotAtEndpoint (e, iri, endpoint, noteData, options = {}) {
      iri = iri || window.location.origin + window.location.pathname;
      endpoint = endpoint || 'https://pragma.archivelab.org/';
      options.noCredentials = true

      var progress, svgFail, messageArchivedAt;
      options['showActionMessage'] = ('showActionMessage' in options) ? options.showActionMessage : true;

      //TODO: Move to Config?
      var svgFail = template.Icon[".fas.fa-times-circle.fa-fw"];

      var messageArchivedAt = template.Icon[".fas.fa-archive"] + ' Archived at ';

      var responseMessages = {
        "403": svgFail + ' Archive unavailable. Please try later.',
        "504": svgFail + ' Archive timeout. Please try later.'
      }

      // if(note.length > 0) {
      //   noteData.annotation["message"] = note;
      // }

      if (options.showActionMessage) {
        var button = e.target.closest('button');

        if (typeof e !== 'undefined' && button) {
          if (button.disabled) { return; }
          else { button.disabled = true; }

          var archiveNode = button.parentNode;
          archiveNode.insertAdjacentHTML('beforeend', ' <span class="progress">' + template.Icon[".fas.fa-circle-notch.fa-spin.fa-fw"] + ' Archiving in progress.</span>');
        }

        progress = archiveNode.querySelector('.progress');
      }

      var handleError = function(response) {
        if (options.showActionMessage) {
          progress.innerHTML = responseMessages[response.status];
        }

        return Promise.reject(responseMessages[response.status]);
      }

      var handleSuccess = function(o) {
// console.log(o)
        if (options.showActionMessage) {
          progress.innerHTML = messageArchivedAt + '<a target="_blank" href="' + o.location + '">' + o.location + '</a>'
        }

        return Promise.resolve(o);
      }

      var checkLinkHeader = function(response) {
        var link = response.headers.get('Link');

        if (link && link.length > 0) {
          var rels = fetcher.parseLinkHeader(link);
          if ('memento' in rels && rels.memento.length > 0) {
            var o = {
              "response": response,
              "location": rels.memento[0]
            }
            return handleSuccess(o);
          }
        }

        return handleError(response);
      }


      //TODO: See also https://archive.org/help/wayback_api.php

      switch (endpoint) {
        case 'https://web.archive.org/save/':
          var headers = { 'Accept': '*/*' };
// options['mode'] = 'no-cors';
          var pIRI = endpoint + iri;
          // i = 'https://web.archive.org/save/https://example.org/';

          pIRI = (DO.C.WebExtension) ? pIRI : uri.getProxyableIRI(pIRI, {'forceProxy': true});
          // pIRI = uri.getProxyableIRI(pIRI, {'forceProxy': true})
// console.log(pIRI)
          return fetcher.getResource(pIRI, headers, options)
            .then(response => {
// console.log(response)
// for(var key of response.headers.keys()) {
//   console.log(key + ': ' + response.headers.get(key))
// }

              let location = response.headers.get('Content-Location');
// console.log(location)
              if (location && location.length > 0) {
                //XXX: Scrape Internet Archive's HTML
                if (location.startsWith('/web/')) {
                  var o = {
                    "response": response,
                    "location": 'https://web.archive.org' + location
                  }
                  return handleSuccess(o);
                }
                else {
                  return response.text()
                    .then(data => {
// console.log(data)
                      var regexp = /var redirUrl = "([^"]*)";/;
                      var match = data.match(regexp);
// console.log(match)
                      if (match && match[1].startsWith('/web/')) {
                        var o = {
                          "response": response,
                          "location": 'https://web.archive.org' + match[1]
                        }
                        return handleSuccess(o);
                      }
                      else {
                        return checkLinkHeader(response);
                      }
                    })
                }
              }
              else {
// response.text().then(data => { console.log(data) })

                return checkLinkHeader(response);
              }
            })
            .catch(response => {
// console.log(response)
              return handleError(response);
            })

        case 'https://pragma.archivelab.org/':
        default:
          noteData = noteData || {
            "url": iri,
            "annotation": {
              "@context": "http://www.w3.org/ns/anno.jsonld",
              "@type": "Annotation",
              "motivation": "linking",
              "target": iri,
              "rights": "https://creativecommons.org/publicdomain/zero/1.0/"
            }
          };

          if (DO.C.User.IRI) {
            noteData.annotation['creator'] = {};
            noteData.annotation.creator["@id"] = DO.C.User.IRI;
          }
          if (DO.C.User.Name) {
            noteData.annotation.creator["http://schema.org/name"] = DO.C.User.Name;
          }
          if (DO.C.User.Image) {
            noteData.annotation.creator["http://schema.org/image"] = DO.C.User.Image;
          }
          if (DO.C.User.URL) {
            noteData.annotation.creator["http://schema.org/url"] = DO.C.User.URL;
          }

          if(!('contentType' in options)){
            options['contentType'] = 'application/json';
          }

          return fetcher.postResource(endpoint, '', JSON.stringify(noteData), options.contentType, null, options)

          .then(response => response.json())

          .then(response => {
            if (response['wayback_id']) {
              let location = 'https://web.archive.org' + response.wayback_id

              if (options.showActionMessage) {
                progress.innerHTML = messageArchivedAt + '<a target="_blank" href="' + location + '">' + location + '</a>'
              }

              return { "response": response, "location": location };
            }
            else {
              if (options.showActionMessage) {
                progress.innerHTML = responseMessages[response.status]
              }

              return Promise.reject(responseMessages[response.status])
            }
          })

          .catch(() => {
            if (options.showActionMessage) {
              progress.innerHTML = responseMessages[response.status]
            }
          })
      }
    },

    mementoDocument: function(e) {
      if(typeof e !== 'undefined') {
        var b = e.target.closest('button');
        if(b.disabled) { return; }
        else { b.disabled = true; }
      }

      var buttonDisabled = '';
      if (document.location.protocol === 'file:') {
        buttonDisabled = ' disabled="disabled"';
      }

      var iri = uri.stripFragmentFromString(document.location.href);

      var li = [];
      li.push('<li><button class="create-version"' + buttonDisabled +
        ' title="Version this article">' + template.Icon[".fas.fa-code-branch.fa-2x"] + 'Version</button></li>');
      li.push('<li><button class="create-immutable"' + buttonDisabled +
        ' title="Make this article immutable and version it">' + template.Icon[".far.fa-snowflake.fa-2x"] + 'Immutable</button></li>');
      li.push('<li><button class="robustify-links"' + buttonDisabled +
        ' title="Robustify Links">' + template.Icon[".fas.fa-link.fa-2x"] + 'Robustify Links</button></li>');
      li.push('<li><button class="snapshot-internet-archive"' + buttonDisabled +
        ' title="Capture with Internet Archive">' + template.Icon[".fas.fa-archive.fa-2x"] + 'Internet Archive</button></li>');
      li.push('<li><button class="export-as-html" title="Export and save to file">' + template.Icon[".fas.fa-external-link-alt.fa-2x"] + 'Export</button></li>');

      e.target.closest('button').insertAdjacentHTML('afterend', '<ul id="memento-items" class="on">' + li.join('') + '</ul>');

      var mementoItems = document.getElementById('memento-items');

      DO.U.showTimeMap();

      mementoItems.addEventListener('click', function(e) {
        if (e.target.closest('button.resource-save') ||
            e.target.closest('button.create-version') ||
            e.target.closest('button.create-immutable')) {
          DO.U.resourceSave(e);
        }

        if (e.target.closest('button.export-as-html')) {
          DO.U.exportAsHTML(e);
        }

        if (e.target.closest('button.robustify-links')){
          DO.U.showRobustLinks(e);
        }

        if (e.target.closest('button.snapshot-internet-archive')){
          // DO.U.snapshotAtEndpoint(e, iri, 'https://pragma.archivelab.org/', '', {'contentType': 'application/json'});
          DO.U.snapshotAtEndpoint(e, iri, 'https://web.archive.org/save/', '', {'Accept': '*/*', 'showActionMessage': true });
        }
      });
    },

    showTimeMap: function(node, url) {
      url = url || DO.C.OriginalResourceInfo['timemap']
      if(!url) { return; }

      var elementId = 'memento-document';

      var displayMemento = '';

      fetcher.getTriplesFromGraph(url)
        .then(triples => {
// console.log(triples)
          if (!node) {
            node = document.getElementById(elementId);
            if(!node) {
              document.documentElement.appendChild(util.fragmentFromString('<aside id="' + elementId + '" class="do on"><h2>Memento</h2>' + DO.C.Button.Close + '<dl><dt>TimeMap</dt><dd><a href="' + url + '">' + url + '</a></dd></dl></aside>'));
              node = document.getElementById(elementId);
            }
          }

          var timemap = node.querySelector('.timemap');
          if (timemap) {
            node.removeChild(timemap);
          }

          triples = DO.U.sortTriples(triples, { sortBy: 'object' });

          var items = [];
          triples.forEach(function(t){
            var s = t.subject.nominalValue;
            var p = t.predicate.nominalValue;
            var o = t.object.nominalValue;

            if(p === DO.C.Vocab['schemadateCreated']) {
              items.push('<li><a href="' + s + '" target="_blank">' + o + '</a></li>');
            }
          });

          var html = '<dl class="memento"><dt>Memento</dt><dd><ul>' + items.join('') + '</ul></dd></dl>';

          node.insertAdjacentHTML('beforeend', html);
        })
        .catch(error => {
// console.error(error)
        });
    },

    updateTimeMap: function(url, insertBGP, options) {
      return fetcher.patchResource(url, null, insertBGP);
    },

    showDocumentDo: function showDocumentDo (node) {
      if (document.getElementById('document-do')) { return; }

      var buttonDisabled = '';

      var s = '<section id="document-do" class="do"><h2>Do</h2><ul>';
      s += '<li><button class="resource-share" title="Share resource">' + template.Icon[".fas.fa-bullhorn.fa-2x"] + 'Share</button></li>';
      s += '<li><button class="resource-reply" title="Reply">' + template.Icon[".fas.fa-reply.fa-2x"] + 'Reply</button></li>';

      buttonDisabled = (DO.C.User.IRI) ? '' : ' disabled="disabled"';

      var activitiesIcon = template.Icon[".fas.fa-bolt.fa-2x"];

      if (DO.C.User['ContactsOutboxChecked']) {
        activitiesIcon = template.Icon[".fas.fa-circle.fa-2x"];
        buttonDisabled = ' disabled="disabled"';
      }

      s += '<li><button class="resource-activities"' + buttonDisabled +
        ' title="Show activities">' + activitiesIcon + 'Activities</button></li>';

      s += '<li><button class="resource-new" title="Create new article">' + template.Icon[".far.fa-lightbulb.fa-2x"] + 'New</button></li>';

      s += '<li><button class="resource-open" title="Open article">' + template.Icon[".fas.fa-coffee.fa-2x"] + 'Open</button></li>';

      buttonDisabled = (document.location.protocol === 'file:') ? ' disabled="disabled"' : '';

      s += '<li><button class="resource-save"' + buttonDisabled +
        ' title="Save article">' + template.Icon[".fas.fa-life-ring.fa-2x"] + 'Save</button></li>';

      s += '<li><button class="resource-save-as" title="Save as article">' + template.Icon[".far.fa-paper-plane.fa-2x"] + 'Save As</button></li>';

      s += '<li><button class="resource-memento" title="Memento article">' + template.Icon[".far.fa-clock.fa-2x"] + 'Memento</button></li>';

      if (DO.C.EditorAvailable) {
        var editFile = (DO.C.EditorEnabled && DO.C.User.Role == 'author')
          ? DO.C.Editor.DisableEditorButton
          : DO.C.Editor.EnableEditorButton;
        s += '<li>' + editFile + '</li>';
      }

      s += '<li><button class="resource-source" title="Edit article source code">' + template.Icon[".fas.fa-code.fa-2x"] + 'Source</button></li>';

      s += '<li><button class="embed-data-meta" title="Embed structured data (Turtle, JSON-LD, TriG)">' + template.Icon [".fas.fa-table.fa-2x"] + 'Embed Data</button></li>';

      s += '</ul></section>';

      node.insertAdjacentHTML('beforeend', s);

      var eD = node.querySelector('.editor-disable');
      if (eD) {
        storage.showAutoSaveStorage(eD.closest('li'));
      }

      var dd = document.getElementById('document-do');

      dd.addEventListener('click', e => {
        if (e.target.closest('.resource-share')) {
          DO.U.shareResource(e);
        }

        if (e.target.closest('.resource-reply')) {
          DO.U.replyToResource(e);
        }

        var b;
        if (DO.C.EditorAvailable) {
          b = e.target.closest('button.editor-disable');
          var documentURL = uri.stripFragmentFromString(document.location.href);
          if (b) {
            var node = b.closest('li');
            b.outerHTML = DO.C.Editor.EnableEditorButton;
            DO.U.Editor.enableEditor('social', e);
            storage.hideAutoSaveStorage(node.querySelector('#autosave-items'), documentURL);
          }
          else {
            b = e.target.closest('button.editor-enable');
            if (b) {
              var node = b.closest('li');
              b.outerHTML = DO.C.Editor.DisableEditorButton;
              DO.U.Editor.enableEditor('author', e);
              storage.showAutoSaveStorage(node, documentURL);
            }
          }
        }

        if (e.target.closest('.resource-activities')) {
          DO.U.showContactsActivities(e);
        }

        if (e.target.closest('.resource-new')) {
          DO.U.createNewDocument(e);
        }

        if (e.target.closest('.resource-open')) {
          DO.U.openDocument(e);
        }

        if (e.target.closest('.resource-source')) {
          DO.U.viewSource(e);
        }

        if (e.target.closest('.embed-data-meta')) {
          DO.U.showEmbedData(e);
        }

        if (e.target.closest('.resource-save')){
          DO.U.resourceSave(e);
        }

        if (e.target.closest('.resource-save-as')) {
          DO.U.saveAsDocument(e);
        }

        if (e.target.closest('.resource-memento')) {
          DO.U.mementoDocument(e);
        }
      });
    },

    resourceSave: function(e, options) {
      var url = window.location.origin + window.location.pathname;
      var data = doc.getDocument();
      options = options || {};

      DO.U.getResourceInfo(data, options).then(function(i) {
        if (e.target.closest('.create-version')) {
          DO.U.createMutableResource(url);
        }
        else if (e.target.closest('.create-immutable')) {
          DO.U.createImmutableResource(url);
        }
        else if (e.target.closest('.resource-save')) {
          DO.U.updateMutableResource(url);
        }
      });
    },

    createImmutableResource: function(url, data, options) {
      if(!url) return;

      var uuid = util.generateUUID();
      var containerIRI = url.substr(0, url.lastIndexOf('/') + 1);
      var immutableURL = containerIRI + uuid;

      var rootNode = document.documentElement.cloneNode(true);

      var date = new Date();
      rootNode = doc.setDate(rootNode, { 'id': 'document-created', 'property': 'schema:dateCreated', 'title': 'Created', 'datetime': date });

      var resourceState = rootNode.querySelector('#' + 'document-resource-state');
      if(!resourceState){
        var rSO = {
          'id': 'document-resource-state',
          'subjectURI': '',
          'type': 'mem:Memento',
          'mode': 'create'
        }

        rootNode = DO.U.setDocumentStatus(rootNode, rSO);
      }

      var r, o;

      o = { 'id': 'document-identifier', 'title': 'Identifier' };
      r = { 'rel': 'owl:sameAs', 'href': immutableURL };
      rootNode = DO.U.setDocumentRelation(rootNode, [r], o);

      o = { 'id': 'document-original', 'title': 'Original resource' };
      if (DO.C.OriginalResourceInfo['state'] == DO.C.Vocab['memMemento']['@id']
        && DO.C.OriginalResourceInfo['profile'] == DO.C.Vocab['memOriginalResource']['@id']) {
        r = { 'rel': 'mem:original', 'href': immutableURL };
      }
      else {
        r = { 'rel': 'mem:original', 'href': url };
      }
      rootNode = DO.U.setDocumentRelation(rootNode, [r], o);

      //TODO document-timegate

      var timeMapURL = DO.C.OriginalResourceInfo['timemap'] || url + '.timemap';
      o = { 'id': 'document-timemap', 'title': 'TimeMap' };
      r = { 'rel': 'mem:timemap', 'href': timeMapURL };
      rootNode = DO.U.setDocumentRelation(rootNode, [r], o);

      // Create URI-M
      data = doc.getDocument(rootNode);
      DO.U.processSave(containerIRI, uuid, data, options);


      var timeMapURL = DO.C.OriginalResourceInfo['timemap'] || url + '.timemap';


      //Update URI-R
      if (DO.C.OriginalResourceInfo['state'] != DO.C.Vocab['memMemento']['@id']) {
        doc.setDate(document, { 'id': 'document-created', 'property': 'schema:dateCreated', 'title': 'Created', 'datetime': date });

        o = { 'id': 'document-identifier', 'title': 'Identifier' };
        r = { 'rel': 'owl:sameAs', 'href': url };
        DO.U.setDocumentRelation(document, [r], o);

        o = { 'id': 'document-latest-version', 'title': 'Latest Version' };
        r = { 'rel': 'mem:memento rel:latest-version', 'href': immutableURL };
        DO.U.setDocumentRelation(document, [r], o);

        if(DO.C.OriginalResourceInfo['latest-version']) {
          o = { 'id': 'document-predecessor-version', 'title': 'Predecessor Version' };
          r = { 'rel': 'mem:memento rel:predecessor-version', 'href': DO.C.OriginalResourceInfo['latest-version'] };
          DO.U.setDocumentRelation(document, [r], o);
        }

        //TODO document-timegate

        o = { 'id': 'document-timemap', 'title': 'TimeMap' };
        r = { 'rel': 'mem:timemap', 'href': timeMapURL };
        DO.U.setDocumentRelation(document, [r], o);

        // Create URI-R
        data = doc.getDocument();
        DO.U.processSave(url, null, data, options);
      }


      //Update URI-T
      var insertBGP = '@prefix mem: <http://mementoweb.org/ns#> .\n\
@prefix schema: <http://schema.org/> .\n\
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\
<' + url + '> mem:memento <' + immutableURL + '> .\n\
<' + immutableURL + '> schema:dateCreated "' + date.toISOString() + '"^^xsd:dateTime .';

      DO.U.updateTimeMap(timeMapURL, insertBGP).then(() =>{
        DO.U.showTimeMap(null, timeMapURL)
      });

      DO.U.getResourceInfo(null, { 'mode': 'update' });
    },

    createMutableResource: function(url, data, options) {
      if(!url) return;

      doc.setDate(document, { 'id': 'document-created', 'property': 'schema:dateCreated', 'title': 'Created' } );

      var uuid = util.generateUUID();
      var containerIRI = url.substr(0, url.lastIndexOf('/') + 1);
      var mutableURL = containerIRI + uuid;

      var r, o;

      o = { 'id': 'document-identifier', 'title': 'Identifier' };
      r = { 'rel': 'owl:sameAs', 'href': mutableURL };
      DO.U.setDocumentRelation(document, [r], o);

      o = { 'id': 'document-latest-version', 'title': 'Latest Version' };
      r = { 'rel': 'rel:latest-version', 'href': mutableURL };
      DO.U.setDocumentRelation(document, [r], o);

      if(DO.C.OriginalResourceInfo['latest-version']) {
        o = { 'id': 'document-predecessor-version', 'title': 'Predecessor Version' };
        r = { 'rel': 'rel:predecessor-version', 'href': DO.C.OriginalResourceInfo['latest-version'] };
        DO.U.setDocumentRelation(document, [r], o);
      }

      data = doc.getDocument();
      DO.U.processSave(containerIRI, uuid, data, options);


      o = { 'id': 'document-identifier', 'title': 'Identifier' };
      r = { 'rel': 'owl:sameAs', 'href': url };
      DO.U.setDocumentRelation(document, [r], o);

      data = doc.getDocument();
      DO.U.processSave(url, null, data, options).then(() => {
        DO.U.getResourceInfo(null, { 'mode': 'update' });
      });
    },

    updateMutableResource: function(url, data, options) {
      if(!url) return;
      options = options || {};

      if (!('datetime' in options)) {
        options['datetime'] = new Date();
      }

      doc.setDate(document, { 'id': 'document-modified', 'property': 'schema:dateModified', 'title': 'Modified', 'datetime': options.datetime } );
      DO.U.setEditSelections(options);

      data = doc.getDocument();
      DO.U.processSave(url, null, data, options).then(() => {
        DO.U.getResourceInfo(null, { 'mode': 'update' });
      });
    },

    processSave: function(url, slug, data, options) {
      options = options || {};
      var request = (slug)
                    ? fetcher.postResource(url, slug, data)
                    : fetcher.putResource(url, data)

      return request
        .then(response => {
          doc.showActionMessage(document.documentElement, 'Saved')
          return response
        })
        .catch(error => {
          console.log(error)

          let message

          switch (error.status) {
            case 401:
              message = 'Need to authenticate before saving'
              break

            case 403:
              message = 'You are not authorized to save'
              break

            case 405:
            default:
              message = 'Server doesn\'t allow this resource to be rewritten'
              break
          }

          doc.showActionMessage(document.documentElement, message)
        })
    },

    replyToResource: function replyToResource (e, iri) {
      iri = iri || fetcher.currentLocation()

      e.target.closest('button').disabled = true

      document.documentElement.appendChild(util.fragmentFromString('<aside id="reply-to-resource" class="do on">' + DO.C.Button.Close + '<h2>Reply to this</h2><div id="reply-to-resource-input"><p>Reply to <code>' +
        iri +'</code></p><ul><li><p><label for="reply-to-resource-note">Quick reply (plain text note)</label></p><p><textarea id="reply-to-resource-note" rows="10" cols="40" name="reply-to-resource-note" placeholder="Great article!"></textarea></p></li><li><label for="reply-to-resource-language">Language</label> <select id="reply-to-resource-language" name="reply-to-resource-language">' +
        DO.U.getLanguageOptionsHTML() + '</select></li><li><label for="reply-to-resource-license">License</label> <select id="reply-to-resource-license" name="reply-to-resource-license">' +
        DO.U.getLicenseOptionsHTML() + '</select></li></ul></div>'))

      // TODO: License
      // TODO: ACL - can choose whether to make this reply private (to self), visible only to article author(s), visible to own contacts, public
      // TODO: Show name and face of signed in user reply is from, or 'anon' if article can host replies

      var replyToResource = document.getElementById('reply-to-resource')

      var id = 'location-reply-to'
      var action = 'write'

      DO.U.setupResourceBrowser(replyToResource, id, action)
      document.getElementById(id).insertAdjacentHTML('afterbegin', '<p>Choose a location to save your reply.</p>')

      replyToResource.insertAdjacentHTML('beforeend', '<p>Your reply will be saved at <samp id="' + id +'-' + action +
        '">https://example.org/path/to/article</samp></p>')

      var bli = document.getElementById(id + '-input')
      bli.focus()
      bli.placeholder = 'https://example.org/path/to/article'
      replyToResource.insertAdjacentHTML('beforeend', '<button class="reply" title="Send your reply">Send</button>')

      replyToResource.addEventListener('click', e => {
        if (e.target.closest('button.close')) {
          document.querySelector('#document-do .resource-reply').disabled = false
        }

        if (e.target.closest('button.reply')) {
          var note = document
            .querySelector('#reply-to-resource #reply-to-resource-note')
            .value.trim()

          var rm = replyToResource.querySelector('.response-message')
          if (rm) {
            rm.parentNode.removeChild(rm)
          }
        }

        replyToResource.insertAdjacentHTML('beforeend', '<div class="response-message"></div>')

        if (!iri || !note) {
          document.querySelector('#reply-to-resource .response-message')
            .innerHTML = '<p class="error">Need a note and a location to save it.</p>'
          return
        }

        var datetime = util.getDateTimeISO()
        var attributeId = util.generateAttributeId()
        var noteIRI = document.querySelector('#reply-to-resource #' + id +
          '-' + action).innerText.trim()
        var motivatedBy = "oa:replying"
        var noteData = {
          "type": 'article',
          "mode": "write",
          "motivatedByIRI": motivatedBy,
          "id": attributeId,
          // "iri": noteIRI, //e.g., https://example.org/path/to/article
          "creator": {},
          "datetime": datetime,
          "target": {
            "iri": iri
          },
          "body": note, // content
          "language": {},
          "license": {}
        }
        if (DO.C.User.IRI) {
          noteData.creator["iri"] = DO.C.User.IRI
        }
        if (DO.C.User.Name) {
          noteData.creator["name"] = DO.C.User.Name
        }
        if (DO.C.User.Image) {
          noteData.creator["image"] = DO.C.User.Image
        }
        if (DO.C.User.URL) {
          noteData.creator["url"] = DO.C.User.URL
        }

        var language = document.querySelector('#reply-to-resource-language')
        if (language && language.length > 0) {
          noteData.language["code"] = language.value.trim()
        }

        var license = document.querySelector('#reply-to-resource-license')
        if (license && license.length > 0) {
          noteData.license["iri"] = license.value.trim()
          noteData.license["name"] = DO.C.License[license.value.trim()].name
        }

        var note = DO.U.createNoteDataHTML(noteData)

        var data = doc.createHTML('', note)

        fetcher.putResource(noteIRI, data)

          .catch(error => {
            console.log('Could not save reply:')
            console.error(error)

            let message

            switch (error.status) {
              case 0:
              case 405:
                message = 'this location is not writable.'
                break
              case 401:
                message = 'you are not authorized.'
                if(!DO.C.User.IRI){
                  message += ' Try signing in.';
                }
                break;
              case 403:
                message = 'you do not have permission to write here.'
                break
              case 406:
                message = 'enter a name for your resource.'
                break
              default:
                // some other reason
                message = error.message
                break
            }

            // re-throw, to break out of the promise chain
            throw new Error('Cannot save your reply: ', message)
          })

          .then(response => {
            replyToResource
              .querySelector('.response-message')
              .innerHTML = '<p class="success"><a target="_blank" href="' + response.url + '">Reply saved!</a></p>'

            // Determine the inbox endpoint, to send the notification to
            return inbox.getEndpoint(DO.C.Vocab['ldpinbox']['@id'])
              .catch(error => {
                console.error('Could not fetch inbox endpoint:', error)

                // re-throw
                throw new Error('Could not determine the author inbox endpoint')
              })
          })

          .then(inboxes => {
            if (!inboxes) {
              throw new Error('Author inbox endpoint is empty or missing')
            }

            var inboxURL = inboxes[0]

            let notificationStatements = '    <dl about="' + noteIRI +
              '">\n<dt>Object type</dt><dd><a about="' +
              noteIRI + '" typeof="oa:Annotation" href="' +
              DO.C.Vocab['oaAnnotation']['@id'] +
              '">Annotation</a></dd>\n<dt>Motivation</dt><dd><a href="' +
              DO.C.Prefixes[motivatedBy.split(':')[0]] +
              motivatedBy.split(':')[1] + '" property="oa:motivation">' +
              motivatedBy.split(':')[1] + '</a></dd>\n</dl>\n'

            let notificationData = {
              "type": ['as:Announce'],
              "inbox": inboxURL,
              "object": noteIRI,
              "target": iri,
              "license": noteData.license["iri"],
              "statements": notificationStatements
            }

            return inbox.notifyInbox(notificationData)
              .catch(error => {
                console.error('Failed sending notification to ' + inboxURL + ' :', error)

                throw new Error('Failed sending notification to author inbox')
              })
          })

          .then(response => {  // Success!
            var notificationSent = 'Notification sent'
            var location = response.headers.get('Location')

            if (location) {
              notificationSent = '<a target="_blank" href="' + location.trim() + '">' + notificationSent + '</a>!'
            }
            else {
              notificationSent = notificationSent + ", but location unknown."
            }

            replyToResource
              .querySelector('.response-message')
              .innerHTML += '<p class="success">' + notificationSent + '</p>'
          })

          .catch(error => {
            // Catch-all error, actually notify the user
            replyToResource
              .querySelector('.response-message')
              .innerHTML += '<p class="error">' +
                'We could not notify the author of your reply:' +
                error.message + '</p>'
          })
      })
    },

    shareResource: function shareResource (e, iri) {
      iri = iri || fetcher.currentLocation();
      if (e) {
        e.target.disabled = true;
      }

      var addContactsButtonDisable = '', noContactsText = '';
      if (!DO.C.User.IRI && !(DO.C.User.Graph && ((DO.C.User.Knows && DO.C.User.Knows.length > 0) || (DO.C.User.Graph.owlsameAs && DO.C.User.Graph.owlsameAs._array.length > 0)))) {
        addContactsButtonDisable = ' disabled="disabled"';
        noContactsText = '<p>Sign in to select from your list of contacts, alternatively, enter contacts individually:</p>';
      }

      var shareResourceLinkedResearch = '';
      if (DO.C.User.IRI && DO.C.OriginalResourceInfo['rdftype'] && DO.C.OriginalResourceInfo.rdftype.indexOf(DO.C.Vocab['schemaScholarlyArticle']['@id']) > -1) {
        shareResourceLinkedResearch = '<li><input id="share-resource-linked-research" type="checkbox" value="https://linkedresearch.org/cloud" /><label for="share-resource-linked-research">Notify <a href="https://linkedresearch.org/cloud">Linked Open Research Cloud</a></label></li>';
      }

      document.documentElement.appendChild(util.fragmentFromString('<aside id="share-resource" class="do on">' + DO.C.Button.Close + '<h2>Share resource</h2><div id="share-resource-input"><p>Send a notification about <code>' + iri +'</code></p><ul><li id="share-resource-address-book"></li>' + shareResourceLinkedResearch + '<li><label for="share-resource-to">To</label> <textarea id="share-resource-to" rows="2" cols="40" name="share-resource-to" placeholder="WebID or article IRI (one per line)"></textarea></li><li><label for="share-resource-note">Note</label> <textarea id="share-resource-note" rows="2" cols="40" name="share-resource-note" placeholder="Check this out!"></textarea></li></ul></div><button class="share" title="Share resource">Share</button></aside>'));

      var li = document.getElementById('share-resource-address-book');

      if (DO.C.User.Contacts && Object.keys(DO.C.User.Contacts).length > 0) {
        DO.U.selectContacts(li, DO.C.User.IRI);
      }
      else {
        li.insertAdjacentHTML('beforeend', '<button class="add"' + addContactsButtonDisable + ' title="Add and select contacts from your profile">' + template.Icon[".far.fa-address-book"] + ' Add from contacts</button>' + noContactsText);
      }

      var shareResource = document.getElementById('share-resource');
      shareResource.addEventListener('click', function (e) {
        if (e.target.closest('button.close')) {
          var rs = document.querySelector('#document-do .resource-share');
          if (rs) {
            rs.disabled = false;
          }
        }

        if (DO.C.User.IRI && e.target.closest('button.add')) {
          e.preventDefault();
          e.stopPropagation();
          var li = e.target.closest('li');
          li.insertAdjacentHTML('beforeend', template.Icon[".fas.fa-circle-notch.fa-spin.fa-fw"]);
          DO.U.selectContacts(li, DO.C.User.IRI);
        }

        if (e.target.closest('button.share')) {
          var tos = document.querySelector('#share-resource #share-resource-to').value.trim();
          tos = (tos.length > 0) ? tos.split(/\r\n|\r|\n/) : [];
          var note = document.querySelector('#share-resource #share-resource-note').value.trim();

          var ps = document.querySelectorAll('#share-resource-contacts .progress');
          ps.forEach(function(p){
            p.parentNode.removeChild(p);
          });

          var srlr = document.querySelector('#share-resource-linked-research:checked');
          if(srlr) {
            tos.push(srlr.value);
          }

          var srci = document.querySelectorAll('#share-resource-contacts input:checked');
          if (srci.length > 0) {
            for(var i = 0; i < srci.length; i++) {
              tos.push(srci[i].value);
            }
          }

          if (!iri) {
            return
          }

          // var rm = shareResource.querySelector('.response-message');
          // if (rm) {
          //   rm.parentNode.removeChild(rm);
          // }
          // shareResource.insertAdjacentHTML('beforeend', '<div class="response-message"></div>');

          return inbox.sendNotifications(tos, note, iri, shareResource)
        }
      });
    },

    selectContacts: function(node, url) {
      node.innerHTML = '<p>Select from contacts</p><ul id="share-resource-contacts"></ul>';
      var shareResourceNode = document.getElementById('share-resource-contacts');

      if (DO.C.User.Contacts && Object.keys(DO.C.User.Contacts).length > 0){
        Object.keys(DO.C.User.Contacts).forEach(function(iri){
          if (DO.C.User.Contacts[iri].Inbox) {
            DO.U.addShareResourceContactInput(shareResourceNode, DO.C.User.Contacts[iri].Graph);
          }
        });
      }
      else {
        DO.U.updateContactsInfo(url, {'addShareResourceContactInput': shareResourceNode});
      }
    },

    updateContactsInfo: function(url, options) {
      options = options || {};

      return auth.getUserContacts(url).then(
        function(contacts) {
          if(contacts.length > 0) {
            var promises = [];

            //Get Contacts' profile
            var gC = function(url) {
              return fetcher.getResourceGraph(url).then(i => {
                // console.log(i);
                var s = i.child(url);

                //Keep a local copy
                DO.C.User.Contacts[url] = {};
                DO.C.User.Contacts[url]['Graph'] = s;

                var uCA = function(url, s) {
                  var outbox = DO.C.User.Contacts[url]['Outbox'] = auth.getAgentOutbox(s);
                  var storage = DO.C.User.Contacts[url]['Storage'] = auth.getAgentStorage(s);
                  if ('showActivitiesSources' in options) {
                    if (storage && storage.length > 0) {
                      if(outbox && outbox.length > 0) {
                        if(storage[0] == outbox[0]) {
                          DO.U.showActivitiesSources(outbox[0])
                        }
                        else {
                          DO.U.showActivitiesSources(storage[0])
                          DO.U.showActivitiesSources(outbox[0])
                        }
                      }
                      else {
                        DO.U.showActivitiesSources(storage[0])
                      }
                    }
                    else if (outbox && outbox.length > 0) {
                      DO.U.showActivitiesSources(outbox[0])
                    }
                  }
                  return Promise.resolve();
                }

                var uCI = function(url, s) {
                  return DO.U.updateContactsInbox(url, s)
                    .then(() => {
                      if ('addShareResourceContactInput' in options) {
                        DO.U.addShareResourceContactInput(options.addShareResourceContactInput, s);
                      }
                      return Promise.resolve();
                    })
                    .catch(() => {})
                }

                //XXX: Holy crap this is fugly.
                if ('showActivitiesSources' in options) {
                  uCI(url, s);
                  return uCA(url, s)
                }
                else if ('addShareResourceContactInput' in options) {
                  uCA(url, s)
                  return uCI(url, s)
                }

              }).catch(err => {
// console.log(err)
                return Promise.resolve();
              });
            }

            contacts.forEach(function(url) {
              promises.push(gC(url))
            });

            DO.C.User['ContactsOutboxChecked'] = true;

            return Promise.all(promises)
          }
          else {
            if ('addShareResourceContactInput' in options) {
              options.addShareResourceContactInput.innerHTML = 'No contacts with ' + template.Icon[".fas.fa-inbox"] + ' inbox found in your profile, but you can enter contacts individually:';
            }

            return Promise.resolve()
          }
        },
        function(reason) {
console.log(reason);
        }
      )
    },

    addShareResourceContactInput: function(node, s) {
      var iri = s.iri().toString();
// console.log(iri.toString());
      var id = encodeURIComponent(iri);
      var name = auth.getAgentName(s) || iri;
      var img = auth.getAgentImage(s);
      img = (img && img.length > 0) ? '<img alt="" height="32" src="' + img + '" width="32" />' : '';
      var input = '<li><input id="share-resource-contact-' + id + '" type="checkbox" value="' + iri + '" /><label for="share-resource-contact-' + id + '">' + img + '<a href="' + iri + '" target="_blank">' + name + '</a></label></li>';

      node.insertAdjacentHTML('beforeend', input);
    },

    updateContactsInbox: function(iri, s) {
      var checkInbox = function(s) {
        var aI = auth.getAgentInbox(s);

        if (aI) {
          return Promise.resolve(aI);
        }
        // else if (iri.indexOf('#') < 0) {
        else {
          return inbox.getEndpointFromHead(DO.C.Vocab['ldpinbox']['@id'], iri).then(
            function(i) {
              return i;
            },
            function(reason){
              //XXX: This should be optimised so that we don't have to HEAD again
              return inbox.getEndpointFromHead(DO.C.Vocab['asinbox']['@id'], iri)
            });
        }
      }

      return checkInbox(s)
        .then(inboxes => {
          DO.C.User.Contacts[iri]['Inbox'] = inboxes;
        })
    },

    nextLevelButton: function(button, url, id, action) {
      var actionNode = document.getElementById(id + '-' + action);

      button.addEventListener('click', function(){
        if(button.parentNode.classList.contains('container')){
          fetcher.getResourceGraph(url).then(function(g){
              actionNode.textContent = (action == 'write') ? url + util.generateAttributeId() : url;
              return DO.U.generateBrowserList(g, url, id, action);
            },
            function(reason){
              var inputBox = document.getElementById(id);
              var statusCode = ('status' in reason) ? reason.status : 0;
              statusCode = (typeof statusCode === 'string') ? parseInt(reason.slice(-3)) : statusCode;
// console.log(statusCode)

              var msgs = inputBox.querySelectorAll('.response-message');
              for(var i = 0; i < msgs.length; i++){
                msgs[i].parentNode.removeChild(msgs[i]);
              }

              switch(statusCode) {
                default:
                  inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">Unable to access ('+ reason.statusText +').</p>');
                  break;
                case 404:
                  inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">Not found.</p></div>');
                  break;
                case 401:
                  var msg = 'You are not authorized.';
                  if(!DO.C.User.IRI){
                    msg += ' Try signing in.';
                  }
                  inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">' + msg + '</p></div>');
                  break;
                case 403:
                  var msg = 'You don\'t have permission to access this location.';
                  inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">' + msg + '</p></div>');
                  break;
              }
            }
          );
        }
        else {
          document.getElementById(id + '-input').value = url;
          var alreadyChecked = button.parentNode.querySelector('input[type="radio"]').checked;
          var radios = button.parentNode.parentNode.querySelectorAll('input[checked="true"]');

          actionNode.textContent =  url;

          for(var i = 0; i < radios.length; i++){
            radios[i].removeAttribute('checked');
          }
          if(alreadyChecked){
            button.parentNode.querySelector('input[type="radio"]').removeAttribute('checked');
          }
          else{
            button.parentNode.querySelector('input[type="radio"]').setAttribute('checked', 'true');
          }
        }
      }, false);
    },

    generateBrowserList: function(g, url, id, action) {
      return new Promise(function(resolve, reject){
        document.getElementById(id + '-input').value = url;

        var msgs = document.getElementById(id).querySelectorAll('.response-message');
        for(var i = 0; i < msgs.length; i++){
          msgs[i].parentNode.removeChild(msgs[i]);
        }

        var list = document.getElementById(id + '-ul');
        list.innerHTML = '';

        var urlPath = DO.U.getUrlPath(url);
        if(urlPath.length > 4){ // This means it's not the base URL
          urlPath.splice(-2,2);
          var prevUrl = DO.U.forceTrailingSlash(urlPath.join("/"));
          var upBtn = '<li class="container"><input type="radio" name="containers" value="' + prevUrl + '" id="' + prevUrl + '" /><label for="' + prevUrl + '" id="browser-up">..</label></li>';
          list.insertAdjacentHTML('afterbegin', upBtn);
        }

        var current = g.child(url);
        var contains = current.ldpcontains;
        var containersLi = Array();
        var resourcesLi = Array();
        contains.forEach(function(c){
          var cg = g.child(c);
          var types = cg.rdftype;
          var resourceTypes = [];
          types.forEach(function(type){
            resourceTypes.push(type);
          });

          var path = DO.U.getUrlPath(c);
          if(resourceTypes.indexOf('http://www.w3.org/ns/ldp#Container') > -1){
            var slug = path[path.length-2];
            containersLi.push('<li class="container"><input type="radio" name="resources" value="' + c + '" id="' + slug + '"/><label for="' + slug + '">' + slug + '</label></li>');
          }
          else {
            var slug = path[path.length-1];
            resourcesLi.push('<li><input type="radio" name="resources" value="' + c + '" id="' + slug + '"/><label for="' + slug + '">' + slug + '</label></li>');
          }

        });
        containersLi.sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        resourcesLi.sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        var liHTML = containersLi.join('\n') + resourcesLi.join('\n');
        list.insertAdjacentHTML('beforeend', liHTML);

        var buttons = list.querySelectorAll('label');
        if(buttons.length <= 1){
          list.insertAdjacentHTML('beforeend', '<p><em>(empty)</em></p>');
        }

        for(var i = 0; i < buttons.length; i++) {
          var nextUrl = buttons[i].parentNode.querySelector('input').value;
          DO.U.nextLevelButton(buttons[i], nextUrl, id, action);
        }

        return resolve(list);
      });
    },

    initBrowse: function(storageUrl, input, browseButton, id, action){
      input.value = storageUrl;
      fetcher.getResourceGraph(storageUrl).then(function(g){
        DO.U.generateBrowserList(g, storageUrl, id, action);
      }).then(function(i){
        document.getElementById(id + '-' + action).textContent = (action == 'write') ? input.value + util.generateAttributeId() : input.value;
      });

      browseButton.addEventListener('click', function(){
        DO.U.triggerBrowse(input.value, id, action);
      }, false);
    },

    triggerBrowse: function(url, id, action){
      var inputBox = document.getElementById(id);
      if (url.length > 10 && url.match(/^https?:\/\//g) && url.slice(-1) == "/"){
console.log(url)
        fetcher.getResourceGraph(url).then(function(g){
          DO.U.generateBrowserList(g, url, id, action).then(function(l){
            return l;
          },
          function(reason){
            console.log('???? ' + reason); // Probably no reason for it to get to here
          });
        },
        function(reason){
          var list = document.getElementById(id + '-ul');
          var statusCode = ('status' in reason) ? reason.status : 0;
          statusCode = (typeof statusCode === 'string') ? parseInt(reason.slice(-3)) : statusCode;
// console.log(statusCode)

          var msgs = inputBox.querySelectorAll('.response-message');
          for(var i = 0; i < msgs.length; i++){
            msgs[i].parentNode.removeChild(msgs[i]);
          }

          switch(statusCode) {
            default:
              inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">Unable to access ('+ reason.statusText +').</p>');
              break;
            case 404:
              inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">Not found.</p></div>');
              break;
            case 401:
              var msg = 'You are not authorized.';
              if(!DO.C.User.IRI){
                msg += ' Try signing in.';
              }
              inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">' + msg + '</p></div>');
              break;
            case 403:
              var msg = 'You don\'t have permission to access this location.';
              inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">' + msg + '</p></div>');
              break;

          }
        });
      }
      else{
        inputBox.insertAdjacentHTML('beforeend', '<div class="response-message"><p class="error">This is not a valid location.</p></div>');
      }
    },

    setupResourceBrowser: function(parent, id, action){
      id = id || 'browser-location';
      action = action || 'write';

      parent.insertAdjacentHTML('beforeend', '<div id="' + id + '"><label for="' + id +'-input">URL</label> <input type="text" id="' + id +'-input" name="' + id + '-input" placeholder="https://example.org/path/to/" /><button id="' + id +'-update" disabled="disabled" title="Browse location">Browse</button></div>\n\
      <div id="' + id +'-listing"></div>');

      var inputBox = document.getElementById(id);
      var storageBox = document.getElementById(id + '-listing');
      var input = document.getElementById(id + '-input');
      var browseButton = document.getElementById(id + '-update');

      input.addEventListener('keyup', function(e){
        var msgs = document.getElementById(id).querySelectorAll('.response-message');
        for(var i = 0; i < msgs.length; i++){
          msgs[i].parentNode.removeChild(msgs[i]);
        }

        var actionNode = document.getElementById(id + '-' + action);
        if (input.value.length > 10 && input.value.match(/^https?:\/\//g) && input.value.slice(-1) == "/") {
          browseButton.removeAttribute('disabled');
          if(e.which == 13){
            DO.U.triggerBrowse(input.value, id, action);
          }
          if(action){
            action.textContent = input.value + util.generateAttributeId();
          }
        }
        else {
          browseButton.disabled = 'disabled';
          if(actionNode) {
            actionNode.textContent = input.value;
          }
        }
      }, false);

      var browserul = document.getElementById(id + '-ul');
      if(!browserul){
        browserul = document.createElement('ul');
        browserul.id = id + '-ul';

        storageBox.appendChild(browserul);
      }

      var storageUrl;

      if(DO.C.User.Storage && DO.C.User.Storage.length > 0) {
        storageUrl = DO.U.forceTrailingSlash(DO.C.User.Storage[0]); // TODO: options for multiple storage
      }

      if(storageUrl){
        DO.U.initBrowse(storageUrl, input, browseButton, id, action);
      }
      else {
        inbox.getEndpoint(DO.C.Vocab['oaannotationService']['@id']).then(
          function(storageUrl) {
            DO.U.initBrowse(storageUrl[0], input, browseButton, id, action);
          },
          function(){
            browseButton.addEventListener('click', function(){
              DO.U.triggerBrowse(input.value, id, action);
            }, false);
          }
        )
      }
    },

    showResourceBrowser: function(id, action) {
      id = id || 'location-' + util.generateAttributeId();
      action = action || 'write';

      var browserHTML = '<aside id="resource-browser-' + id + '" class="do on">' + DO.C.Button.Close + '<h2>Resource Browser</h2></aside>';
      document.documentElement.appendChild(util.fragmentFromString(browserHTML));

      DO.U.setupResourceBrowser(document.getElementById('resource-browser-' + id), id, action);
      document.getElementById('resource-browser-' + id).insertAdjacentHTML('beforeend', '<p><samp id="' + id + '-' + action + '"></samp></p>');
    },

    openInputFile: function(e) {
      var file = e.target.files[0];
// console.log(file);
      var contentType = file.type;

      var reader = new FileReader();
      reader.onload = function(){
// console.log(reader);

        DO.U.spawnDokieli(reader.result, contentType, 'file:' + file.name);
      };
      reader.readAsText(file);
    },

    openDocument: function (e) {
      if(typeof e !== 'undefined') {
        e.target.disabled = true;
      }
      document.documentElement.appendChild(util.fragmentFromString('<aside id="open-document" class="do on">' + DO.C.Button.Close + '<h2>Open Document</h2><p><label for="open-local-file">Open local file</label> <input type="file" id="open-local-file" name="open-local-file" /></p></aside>'));

      var id = 'location-open-document';
      var action = 'read';

      var openDocument = document.getElementById('open-document');
      DO.U.setupResourceBrowser(openDocument , id, action);
      var idSamp = (typeof DO.C.User.Storage == 'undefined') ? '' : '<p><samp id="' + id + '-' + action + '">https://example.org/path/to/article</samp></p>';
      openDocument.insertAdjacentHTML('beforeend', idSamp + '<button class="open" title="Open document">Open</button>');

      openDocument.addEventListener('click', function (e) {
        if (e.target.closest('button.close')) {
          document.querySelector('#document-do .resource-open').disabled = false;
        }

        if (e.target.closest('#open-local-file')){
          e.target.addEventListener('change', DO.U.openInputFile, false);
        }

        if (e.target.closest('button.open')) {
          var openDocument = document.getElementById('open-document');
          var rm = openDocument.querySelector('.response-message');
          if (rm) {
            rm.parentNode.removeChild(rm);
          }

          var bli = document.getElementById(id + '-input');
          var iri = bli.value;

          var options = {};

          DO.U.openResource(iri, options);
        }
      });
    },

    openResource: function(iri, options) {
      options = options || {};
      var headers = { 'Accept': fetcher.setAcceptRDFTypes() };
      var pIRI = uri.getProxyableIRI(iri);
      if (pIRI.slice(0, 5).toLowerCase() == 'http:') {
        options['noCredentials'] = true;
      }

      var handleResource = function handleResource (pIRI, headers, options) {
        return fetcher.getResource(pIRI, headers, options)
          .catch(error => {
            if (error.status === 0) {
              // retry with proxied uri
              var pIRI = uri.getProxyableIRI(iri, {'forceProxy': true});
              return handleResource(pIRI, headers, options);
            }

            throw error  // else, re-throw the error
          })
          .then(response => {
            var cT = response.headers.get('Content-Type');
            var options = {};
            options['contentType'] = (cT) ? cT.split(';')[0].trim() : 'text/turtle';
            options['subjectURI'] = iri;

            return response.text()
              .then(data => {
                DO.U.buildResourceView(data, options)
                  .then(o => {
// console.log(o)
                    var spawnOptions = {};
                    spawnOptions['defaultStylesheet'] = ('defaultStylesheet' in o) ? o.defaultStylesheet : false;

                    DO.U.spawnDokieli(o.data, o.options['contentType'], o.options['subjectURI'], spawnOptions);                        
                  })
              })
          })
      }

      handleResource(pIRI, headers, options);
    },

    buildResourceView: function(data, options) {
      return graph.getGraphFromData(data, options).then(
        function(i){
          var s = SimpleRDF(DO.C.Vocab, options['subjectURI'], i, ld.store).child(options['subjectURI']);
// console.log(s)
          var title = DO.U.getResourceLabel(s) || options.subjectURI;
          var h1 = '<a href="' +  options.subjectURI + '">' + title + '</a>';

          var types = s.rdftype._array;
// console.log(types)
          if(types.indexOf(DO.C.Vocab['ldpContainer']["@id"]) >= 0 ||
             types.indexOf(DO.C.Vocab['asCollection']["@id"]) >= 0 ||
             types.indexOf(DO.C.Vocab['asOrderedCollection']["@id"]) >= 0) {

            return DO.U.processResources(options['subjectURI'], options).then(
              function(url) {

                var promises = [];
                url.forEach(function(u) {
                  // console.log(u);
                  // window.setTimeout(function () {
                    var pIRI = uri.getProxyableIRI(u);
                    promises.push(fetcher.getResourceGraph(pIRI));
                  // }, 1000)
                });

                return Promise.all(promises.map(p => p.catch(e => e)))
                  .then(function(graphs) {
                    var items = [];

                    graphs.filter(result => !(result instanceof Error));

                    graphs.forEach(function(graph){
                      var html = DO.U.generateIndexItemHTML(graph);
                      if (typeof html === 'string' && html != '') {
                        items.push(html);
                      }
                    })

                    //TODO: Show createNewDocument button.
                    var createNewDocument = '';

                    var listItems = '';

                    if (items.length > 0) {
                      listItems = `
            <ul>
              <li>` + items.join('</li>\n<li>') + `</li>
            </ul>`;
                    }

                    var html = `      <article about="" typeof="as:Collection">
        <h1 property="schema:name">` + h1 + `</h1>
        <div datatype="rdf:HTML" property="schema:description">
          <section>` + createNewDocument + listItems + `
          </section>
        </div>
      </article>`;

                    return {
                      'data': doc.createHTML('Collection: ' + options.subjectURI, html),
                      'options': {
                        'subjectURI': options.subjectURI,
                        'contentType': 'text/html'
                      },
                      'defaultStylesheet': true
                    };
                  })
                  .catch(e => {
                    // console.log(e)
                  });
              });
          }
          else {
            return {"data": data, "options": options};
          }

        });
    },

    generateIndexItemHTML: function(graph, options) {
      if (typeof graph.iri === 'undefined') return;

// console.log(graph);
      options = options || {};
      var name = '';
      var published = ''

      name = DO.U.getResourceLabel(graph) || graph.iri().toString();
      name = '<a href="' + graph.iri().toString() + '">' + name + '</a>';

      var datePublished = graph.schemadatePublished || graph.dctermsissued || graph.dctermsdate || graph.aspublished || graph.schemadateCreated || graph.dctermscreated || graph.provgeneratedAtTime || graph.dctermsmodified || graph.asupdated || '';

      if (datePublished) {
        published = ', <time datetime="' + datePublished + '">' + datePublished.substr(0,10) + '</time>';
      }

      var summary = '';

      if (graph.oahasBody) {
        summary = graph.child(graph.oahasBody).rdfvalue;
      }
      else {
        summary = graph.schemaabstract || graph.dctermsdescription || graph.rdfvalue || graph.assummary || graph.schemadescription || graph.ascontent || '';
      }

      if (summary) {
        summary = '<div>' + summary + '</div>';
      }

      return name + published + summary;
    },

    spawnDokieli: function(data, contentType, iri, options){
      options =  options || {};

      if(DO.C.AvailableMediaTypes.indexOf(contentType) > -1) {
        var tmpl = document.implementation.createHTMLDocument('template');
// console.log(tmpl);

        switch(contentType){
          case 'text/html': case 'application/xhtml+xml':
            tmpl.documentElement.innerHTML = data;
            break;

          default:
            tmpl.documentElement.innerHTML = '<pre>' + data.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
            break;
        }

// console.log(tmpl);

        var documentHasDokieli = tmpl.querySelectorAll('head script[src$="/dokieli.js"]');
// console.log(documentHasDokieli);
// console.log(documentHasDokieli.length)
        if(documentHasDokieli.length == 0) {
          var doFiles = ['dokieli.css', 'dokieli.js'];

          if (options.defaultStylesheet) {
            doFiles.push('basic.css');
          }

          doFiles.forEach(function(i){
// console.log(i);
            var media = i.endsWith('.css') ? tmpl.querySelectorAll('head link[rel~="stylesheet"][href$="/' + i + '"]') : tmpl.querySelectorAll('head script[src$="/' + i + '"]');
// console.log(media);
// console.log(media.length)
            if (media.length == 0) {
              switch(i) {
                case 'dokieli.css':
                  tmpl.querySelector('head').insertAdjacentHTML('beforeend', '<link href="https://dokie.li/media/css/' + i + '" media="all" rel="stylesheet" />');
                  break;
                case 'basic.css':
                  tmpl.querySelector('head').insertAdjacentHTML('beforeend', '<link href="https://dokie.li/media/css/' + i + '" media="all" rel="stylesheet" />');
                case 'dokieli.js':
                  tmpl.querySelector('head').insertAdjacentHTML('beforeend', '<script src="https://dokie.li/scripts/' + i + '"></script>')
                  break;
              }
            }
// console.log(tmpl)
          });

          var nodes = tmpl.querySelectorAll('head link, [src], object[data]');
          nodes = DO.U.rewriteBaseURL(nodes, {'baseURLType': 'base-url-absolute', 'iri': iri});

          document.documentElement.removeAttribute('id');
          document.documentElement.removeAttribute('class');
        }
        else if(!iri.startsWith('file:')) {
          window.open(iri, '_blank');
          return;
        }

        document.documentElement.innerHTML = tmpl.documentElement.innerHTML;

// console.log(document.location.protocol);
        if(!iri.startsWith('file:')){
          var iriHost = iri.split('//')[1].split('/')[0];
          var iriProtocol = iri.split('//')[0];
// console.log(iriHost);
// console.log(iriProtocol);
          if(document.location.protocol == iriProtocol && document.location.host == iriHost) {
            try {
              history.pushState(null, null, iri);
            }
            catch(e) { console.log('Cannot change pushState due to cross-origin.'); }
          }
        }
        DO.C.init();
      }
      else {
console.log('//TODO: Handle server returning wrong Response/Content-Type for the Request/Accept');
      }
    },


    createNewDocument: function createNewDocument (e) {
      e.target.disabled = true
      document.documentElement.appendChild(util.fragmentFromString('<aside id="create-new-document" class="do on">' + DO.C.Button.Close + '<h2>Create New Document</h2></aside>'))

      var newDocument = document.getElementById('create-new-document')
      newDocument.addEventListener('click', e => {
        if (e.target.closest('button.close')) {
          document.querySelector('#document-do .resource-new').disabled = false
        }
      })

      var id = 'location-new'
      var action = 'write'

      DO.U.setupResourceBrowser(newDocument, id, action)
      document.getElementById(id).insertAdjacentHTML('afterbegin', '<p>Choose a location to save your new article.</p>')
      var baseURLSelection = (document.location.protocol == 'file:') ? '' : DO.U.getBaseURLSelection()

      newDocument.insertAdjacentHTML('beforeend', baseURLSelection +
        '<p>Your new document will be saved at <samp id="' + id + '-' + action +
        '">https://example.org/path/to/article</samp></p><button class="create" title="Create new document">Create</button>')

      var bli = document.getElementById(id + '-input')
      bli.focus()
      bli.placeholder = 'https://example.org/path/to/article'

      newDocument.addEventListener('click', e => {
        if (!e.target.closest('button.create')) {
          return
        }

        var newDocument = document.getElementById('create-new-document')
        var storageIRI = newDocument.querySelector('#' + id + '-' + action).innerText.trim()
        var title = (storageIRI.length > 0) ? DO.U.getURLLastPath(storageIRI) : ''
        title = DO.U.generateLabelFromString(title);

        var rm = newDocument.querySelector('.response-message')
        if (rm) {
          rm.parentNode.removeChild(rm)
        }

        var html = document.documentElement.cloneNode(true)
        var baseURLSelectionChecked = newDocument.querySelector('select[name="base-url"]')
        // console.log(baseURLSelectionChecked);

        if (baseURLSelectionChecked.length > 0) {
          var baseURLType = baseURLSelectionChecked.value
          var nodes = html.querySelectorAll('head link, [src], object[data]')
          if (baseURLType == 'base-url-relative') {
            DO.U.copyRelativeResources(storageIRI, nodes)
          }
          nodes = DO.U.rewriteBaseURL(nodes, {'baseURLType': baseURLType})
        }

        html.querySelector('body').innerHTML = '<main><article about="" typeof="schema:Article"><h1 property="schema:name">' + title + '</h1></article></main>'
        html.querySelector('head title').innerHTML = title
        html = doc.getDocument(html)

        fetcher.putResource(storageIRI, html)
          .then(() => {
            var documentMode = (DO.C.WebExtension) ? '' : '?author=true'

            newDocument.insertAdjacentHTML('beforeend',
              '<div class="response-message"><p class="success">' +
              'New document created at <a href="' + storageIRI +
              documentMode + '">' + storageIRI + '</a></p></div>'
            )

            window.open(storageIRI + documentMode, '_blank')
          })

          .catch(error => {
            console.log('Error creating a new document:')
            console.error(error)

            let message

            switch (error.status) {
              case 0:
              case 405:
                message = 'this location is not writable.'
                break
              case 401:
                message = 'you are not authorized.'
                if(!DO.C.User.IRI){
                  message += ' Try signing in.';
                }
                break
              case 403:
                message = 'you do not have permission to write here.'
                break
              case 406:
                message = 'enter a name for your resource.'
                break
              default:
                message = error.message
                break
            }

            newDocument.insertAdjacentHTML('beforeend',
              '<div class="response-message"><p class="error">' +
              'Could not create new document: ' + message + '</p>'
            )
          })
      })
    },

    saveAsDocument: function saveAsDocument (e) {
      e.target.disabled = true;
      document.documentElement.appendChild(util.fragmentFromString('<aside id="save-as-document" class="do on">' + DO.C.Button.Close + '<h2>Save As Document</h2></aside>'));

      var saveAsDocument = document.getElementById('save-as-document');
      saveAsDocument.addEventListener('click', function(e) {
        if (e.target.closest('button.close')) {
          document.querySelector('#document-do .resource-save-as').disabled = false;
        }
      });

      var fieldset = '';

      locationInboxId = 'location-inbox';
      locationInboxAction = 'read';
      saveAsDocument.insertAdjacentHTML('beforeend', '<div><input id="' + locationInboxId + '-set" name="' + locationInboxId + '-set" type="checkbox" /> <label for="' + locationInboxId + '-set">Set Inbox</label></div>');

      saveAsDocument.addEventListener('click', function(e) {
        if (e.target.closest('input#' + locationInboxId + '-set')) {
          if (e.target.getAttribute('checked')) {
            e.target.removeAttribute('checked');

            fieldset = saveAsDocument.querySelector('#' + locationInboxId + '-fieldset');
            fieldset.parentNode.removeChild(fieldset);
          }
          else {
            e.target.setAttribute('checked', 'checked');

            e.target.nextElementSibling.insertAdjacentHTML('afterend', '<fieldset id="' + locationInboxId + '-fieldset"></fieldset>');
            fieldset = saveAsDocument.querySelector('#' + locationInboxId + '-fieldset');
            DO.U.setupResourceBrowser(fieldset, locationInboxId, locationInboxAction);
            fieldset.insertAdjacentHTML('beforeend', '<p>Article\'s <em>inbox</em> will be set to: <samp id="' + locationInboxId + '-' + locationInboxAction + '"></samp></p>');
            var lii = document.getElementById(locationInboxId + '-input');
            lii.focus();
            lii.placeholder = 'https://example.org/path/to/inbox/';
          }
        }
      });

      locationAnnotationServiceId = 'location-annotation-service';
      locationAnnotationServiceAction = 'read';
      saveAsDocument.insertAdjacentHTML('beforeend', '<div><input id="' + locationAnnotationServiceId + '-set" name="' + locationAnnotationServiceId + '-set" type="checkbox" /> <label for="' + locationAnnotationServiceId + '-set">Set Annotation Service</label></div>');

      saveAsDocument.addEventListener('click', function(e) {
        if (e.target.closest('input#' + locationAnnotationServiceId + '-set')) {
          if (e.target.getAttribute('checked')) {
            e.target.removeAttribute('checked');

            fieldset = saveAsDocument.querySelector('#' + locationAnnotationServiceId + '-fieldset');
            fieldset.parentNode.removeChild(fieldset);
          }
          else {
            e.target.setAttribute('checked', 'checked');

            e.target.nextElementSibling.insertAdjacentHTML('afterend', '<fieldset id="' + locationAnnotationServiceId + '-fieldset"></fieldset>');
            fieldset = saveAsDocument.querySelector('#' + locationAnnotationServiceId + '-fieldset');
            DO.U.setupResourceBrowser(fieldset, locationAnnotationServiceId, locationAnnotationServiceAction);
            fieldset.insertAdjacentHTML('beforeend', '<p>Article\'s <em>annotation service</em> will be set to: <samp id="' + locationAnnotationServiceId + '-' + locationAnnotationServiceAction + '"></samp></p>');
            var lasi = document.getElementById(locationAnnotationServiceId + '-input');
            lasi.focus();
            lasi.placeholder = 'https://example.org/path/to/annotation/';
          }
        }
      });

      var id = 'location-save-as';
      var action = 'write';
      saveAsDocument.insertAdjacentHTML('beforeend', '<fieldset id="' + id + '-fieldset"><legend>Save to</legend></fieldset>');
      fieldset = saveAsDocument.querySelector('fieldset#' + id + '-fieldset');
      DO.U.setupResourceBrowser(fieldset, id, action);
      fieldset.insertAdjacentHTML('beforeend', '<p>Article will be saved at: <samp id="' + id + '-' + action + '"></samp></p>' + DO.U.getBaseURLSelection() + '<p><input type="checkbox" id="derivation-data" name="derivation-data" checked="checked" /><label for="derivation-data">Derivation data</label></p><button class="create" title="Save to destination">Save</button>');
      var bli = document.getElementById(id + '-input');
      bli.focus();
      bli.placeholder = 'https://example.org/path/to/article';


      saveAsDocument.addEventListener('click', e => {
        if (!e.target.closest('button.create')) {
          return
        }

        var currentDocumentURL = uri.stripFragmentFromString(document.location.href)
        var saveAsDocument = document.getElementById('save-as-document')
        var storageIRI = saveAsDocument.querySelector('#' + id + '-' + action).innerText.trim()

        var rm = saveAsDocument.querySelector('.response-message')
        if (rm) {
          rm.parentNode.removeChild(rm)
        }

        if(!storageIRI.length) {
          saveAsDocument.insertAdjacentHTML('beforeend',
            '<div class="response-message"><p class="error">' +
            'Specify the location to save the article to, and optionally set its <em>inbox</em> or <em>annotation service</em>.</p></div>'
          )

          return
        }

        var html = document.documentElement.cloneNode(true)
        var o, r

        var wasDerived = document.querySelector('#derivation-data')
        if (wasDerived.checked) {
          o = { 'id': 'document-derived-from', 'title': 'Derived From' };
          r = { 'rel': 'prov:wasDerivedFrom', 'href': currentDocumentURL };
          html = DO.U.setDocumentRelation(html, [r], o);

          html = doc.setDate(html, { 'id': 'document-derived-on', 'property': 'prov:generatedAtTime', 'title': 'Derived On' });

          o = { 'id': 'document-identifier', 'title': 'Identifier' };
          r = { 'rel': 'owl:sameAs', 'href': storageIRI };
          html = DO.U.setDocumentRelation(html, [r], o);
        }

        var inboxLocation = saveAsDocument.querySelector('#' + locationInboxId + '-' + locationInboxAction);
        if (inboxLocation) {
          inboxLocation = inboxLocation.innerText.trim();
          o = { 'id': 'document-inbox', 'title': 'Notifications Inbox' };
          r = { 'rel': 'ldp:inbox', 'href': inboxLocation };
          html = DO.U.setDocumentRelation(html, [r], o);
        }

        var annotationServiceLocation = saveAsDocument.querySelector('#' + locationAnnotationServiceId + '-' + locationAnnotationServiceAction)
        if (annotationServiceLocation) {
          annotationServiceLocation = annotationServiceLocation.innerText.trim();
          o = { 'id': 'document-annotation-service', 'title': 'Annotation Service' };
          r = { 'rel': 'oa:annotationService', 'href': annotationServiceLocation };
          html = DO.U.setDocumentRelation(html, [r], o);
        }

        var baseURLSelectionChecked = saveAsDocument.querySelector('select[name="base-url"]')
        if (baseURLSelectionChecked.length > 0) {
          var baseURLType = baseURLSelectionChecked.value
          var nodes = html.querySelectorAll('head link, [src], object[data]')
          if (baseURLType == 'base-url-relative') {
            DO.U.copyRelativeResources(storageIRI, nodes)
          }
          nodes = DO.U.rewriteBaseURL(nodes, {'baseURLType': baseURLType})
        }

        html = doc.getDocument(html)

        var progress = saveAsDocument.querySelector('progress')
        if(progress) {
          progress.parentNode.removeChild(progress)
        }
        e.target.insertAdjacentHTML('afterend', '<progress min="0" max="100" value="0"></progress>')
        progress = saveAsDocument.querySelector('progress')

        fetcher.putResource(storageIRI, html, null, null, { 'progress': progress })
          .then(response => {
            progress.parentNode.removeChild(progress)

            let url = response.url || storageIRI

            var documentMode = (DO.C.WebExtension) ? '' : '?author=true'

            saveAsDocument.insertAdjacentHTML('beforeend',
              '<div class="response-message"><p class="success">' +
              'Document saved at <a href="' + url + documentMode + '">' + url + '</a></p></div>'
            )

            window.open(url + documentMode, '_blank')
          })

          .catch(error => {
            console.log('Error saving document:')
            console.error(error)

            progress.parentNode.removeChild(progress)

            let message

            switch (error.status) {
              case 0:
              case 405:
                message = 'this location is not writable.'
                break
              case 401:
                message = 'you are not authorized.'
                if(!DO.C.User.IRI){
                  message += ' Try signing in.';
                }
                break
              case 403:
                message = 'you do not have permission to write here.'
                break
              case 406:
                message = 'enter a name for your resource.'
                break
              default:
                message = error.message
                break
            }

            saveAsDocument.insertAdjacentHTML('beforeend',
              '<div class="response-message"><p class="error">' +
              'Unable to save: ' + message + '</p></div>'
            )
          })
      })
    },

    viewSource: function(e) {
      e.target.disabled = true;

      var buttonDisabled = (document.location.protocol === 'file:') ? ' disabled="disabled"' : '';

      document.documentElement.appendChild(util.fragmentFromString('<aside id="source-view" class="do on">' + DO.C.Button.Close + '<h2>Source</h2><textarea id="source-edit" rows="24" cols="80"></textarea><p><button class="create"'+ buttonDisabled + ' title="Update source">Update</button></p></aside>'));
      var sourceBox = document.getElementById('source-view');
      var input = document.getElementById('source-edit');
      input.value = doc.getDocument();

      sourceBox.addEventListener('click', function(e) {
        if (e.target.closest('button.create')) {
          var url = window.location.origin + window.location.pathname;
          var data = document.getElementById('source-edit').value;
          document.documentElement.innerHTML = data;
          DO.U.showDocumentInfo();
          DO.U.showDocumentMenu(e);
          DO.U.viewSource();
          document.querySelector('#document-do .resource-source').disabled = true;
        }

        if (e.target.closest('button.close')) {
          document.querySelector('#document-do .resource-source').disabled = false;
        }
      });
    },

    getBaseURLSelection: function() {
      return '<div id="base-url-selection"><label>Location of media resources:</label>\n\
      <select name="base-url">\n\
      <option id="base-url-absolute" value="base-url-absolute" selected="selected">Use references as is</option>\n\
      <option id="base-url-relative" value="base-url-relative">Copy to your storage</option>\n\
      </select>\n\
      </div>';
    },

    rewriteBaseURL: function(nodes, options) {
      options = options || {};
      if (typeof nodes === 'object' && nodes.length > 0) {
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var url, ref;
          switch(node.tagName.toLowerCase()) {
            default:
              url = node.getAttribute('src');
              ref = 'src';
              break;
            case 'link':
              url = node.getAttribute('href');
              ref = 'href';
              break;
            case 'object':
              url = node.getAttribute('data');
              ref = 'data';
              break;
          }

          var s = url.split(':')[0];
          if (s != 'http' && s != 'https' && s != 'file' && s != 'data' && s != 'urn' && document.location.protocol != 'file:') {
            url = DO.U.setBaseURL(url, options);
          }
          else if (url.startsWith('http:') && node.tagName.toLowerCase()) {
            var proxyURL = ('proxyURL' in options) ? options.proxyURL : DO.C.ProxyURL
            url = proxyURL + uri.encodeString(url)
          }
          node.setAttribute(ref, url);
        };
      }

      return nodes;
    },

    setBaseURL: function(url, options) {
      options = options || {};
      var urlType = ('baseURLType' in options) ? options.baseURLType : 'base-url-absolute';

      var matches = [];
      var regexp = /(https?:\/\/([^\/]*)\/|file:\/\/\/|data:|urn:|\/\/)?(.*)/;

      matches = url.match(regexp);

      if (matches) {
        switch(urlType) {
          case 'base-url-absolute': default:
            if(matches[1] == '//' && 'iri' in options){
              url = options.iri.split(':')[0] + ':' + url;
            }
            else {
              href = ('iri' in options) ? uri.getProxyableIRI(options.iri) : document.location.href;
              url = DO.U.getBaseURL(href) + matches[3].replace(/^\//g, '');
            }
            break;
          case 'base-url-relative':
            url = matches[3].replace(/^\//g, '');
            break;
        }
      }

      return url;
    },

    getBaseURL: function(url) {
      if(typeof url === 'string') {
        url = url.substr(0, url.lastIndexOf('/') + 1);
      }

      return url;
    },

    getPathURL: function(url) {
      if(typeof url === 'string') {
        var i  = url.indexOf('?');
        if(i > -1) {
          url = url.substr(0, i);
        }
        i = url.indexOf('#');
        if(i > -1) {
          url = url.substr(0, i);
        }
      }

      return url;
    },

    getURLLastPath: function(url) {
      if(typeof url === 'string') {
        url = DO.U.getPathURL(url);
        url = url.substr(url.lastIndexOf('/') + 1);
      }

      return url;
    },

    generateLabelFromString: function(s) {
      if (typeof s === 'string' && s.length > 0) {
        s = s.replace(/-/g, ' ');
        s = (s !== '.html' && s.endsWith('.html')) ? s.substr(0, s.lastIndexOf('.html')) : s;
        s = (s !== '.' && s.endsWith('.')) ? s.substr(0, s.lastIndexOf('.')) : s;

        s = s.charAt(0).toUpperCase() + s.slice(1);
      }

      return s;
    },

    copyRelativeResources: function copyRelativeResources (storageIRI, relativeNodes) {
      var ref = '';
      var baseURL = DO.U.getBaseURL(storageIRI);

      for (var i = 0; i < relativeNodes.length; i++) {
        var node = relativeNodes[i];
        switch(node.tagName.toLowerCase()) {
          default:
            ref = 'src';
            break;
          case 'link':
            ref = 'href';
            break;
          case 'object':
            ref = 'data';
            break;
        }

        var fromURL = x = node.getAttribute(ref).trim();
        var pathToFile = '';
        var s = fromURL.split(':')[0];

        if (s != 'http' && s != 'https' && s != 'file' && s != 'data' && s != 'urn' && s != 'urn') {
          if (fromURL.startsWith('//')) {
            fromURL = document.location.protocol + fromURL
            toURL = baseURL + fromURL.substr(2)
          }
          else if (fromURL.startsWith('/')) {
            pathToFile = DO.U.setBaseURL(fromURL, {'baseURLType': 'base-url-relative'});
            fromURL = document.location.origin + fromURL
            toURL = baseURL + pathToFile
          }
          else {
            pathToFile = DO.U.setBaseURL(fromURL, {'baseURLType': 'base-url-relative'});
            fromURL = DO.U.getBaseURL(document.location.href) + fromURL
            toURL = baseURL + pathToFile
          }

          fetcher.copyResource(fromURL, toURL);
        }
      };
    },

    createAttributeDateTime: function(element) {
      //Creates datetime attribute.
      //TODO: Include @data-author for the signed in user e.g., WebID or URL.
      var a = util.getDateTimeISO();

      switch(element) {
        case 'mark': case 'article':
          a = 'data-datetime="' + a + '"';
          break;
        case 'del': case 'ins':
          a = 'datetime="' + a + '"';
          break;
        default:
          a = '';
          break;
      }

      return a;
    },

    getCitation: function(i, options) {
      options = options || {};
      var iri = i;
      // if (typeof options !== 'undefined' && 'type' in options && options.type == 'doi') {
      if (i.toLowerCase().slice(0,4) !== 'http') {
//        iri = 'http://dx.doi.org/' + i.trim();
        iri = 'http://data.crossref.org/' + i.trim();
      }
      else {
        var x = iri.toLowerCase().trim().split('/');
        if (x[2] == 'doi.org' || x[2] == 'dx.doi.org') {
          var y = x[0] + '//' + x[2] + '/';
          iri = 'http://data.crossref.org/' + iri.substr(y.length, iri.length);
        }
      }
//console.log(iri);

      return fetcher.getResourceGraph(iri);
    },

    getCitationHTML: function(citationGraph, citationURI, options) {
      options = options || {};
      // var citationId = ('citationId' in options) ? options.citationId : citationURI;
      var subject = citationGraph.child(citationURI);
// console.log(citationGraph);
// console.log('citationGraph.iri().toString(): ' + citationGraph.iri().toString());
// console.log('citationGraph.toString(): ' + citationGraph.toString());
// console.log('options.citationId: ' + options.citationId);
// console.log('citationURI: ' + citationURI);
// console.log('subject.iri().toString(): ' + subject.iri().toString());

      var title = DO.U.getResourceLabel(subject);
      //FIXME: This is a stupid hack because RDFa parser is not setting the base properly.
      if(typeof title == 'undefined') {
        subject = citationGraph.child(options.citationId);

        title = DO.U.getResourceLabel(subject) || '';
      }
      title = title.replace(/ & /g, " &amp; ");
      title = (title.length > 0) ? '<cite>' + title + '</cite>, ' : '';
      var datePublished = subject.schemadatePublished || subject.dctermsissued || subject.dctermsdate || subject.schemadateCreated || subject.dctermscreated || '';
      var dateVersion = subject.schemadateModified || datePublished;
      datePublished = (datePublished) ? datePublished.substr(0,4) + ', ' : '';
      var dateAccessed = 'Accessed: ' + util.getDateTimeISO();
      var authors = [], authorList = [];
// console.log(subject);
// console.log(subject.biboauthorList);
// console.log(subject.schemaauthor);
// console.log(subject.dctermscreator);

      //XXX: FIXME: Putting this off for now because SimpleRDF is not finding the bnode for some reason in citationGraph.child(item), or at least authorItem.rdffirst (undefined)
//       if (subject.biboauthorList) {
//         var traverseRDFList = function(item) {
//           var authorItem = citationGraph.child(item);
// // console.log(authorItem);
// // console.log(authorItem.iri().toString());
// // console.log(authorItem.rdffirst);
// // console.log(authorItem.rdfrest);
//           if (authorItem.rdffirst) {
//             authorList.push(authorItem.rdffirst);
//           }
//           if (authorItem.rdfrest && authorItem.rdfrest !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil') {
//             traverseRDFList(authorItem.rdfrest);
//           }
//         };

//         traverseRDFList(subject.biboauthorList);
//       }
//       else
      if (subject.schemaauthor && subject.schemaauthor._array.length > 0) {
        subject.schemaauthor.forEach(function(a) {
          authorList.push(a);
        });
      }
      else if (subject.dctermscreator && subject.dctermscreator._array.length > 0) {
        subject.dctermscreator.forEach(function(a) {
          authorList.push(a);
        });
      }
      else if (subject.asactor && subject.asactor._array.length > 0) {
        subject.asactor.forEach(function(a) {
          authorList.push(a);
        });
      }
// console.log(authorList);

      if(authorList.length > 0) {
        authorList.forEach(function(authorIRI) {
          var s = subject.child(authorIRI);
          var author = auth.getAgentName(s);

          if (s.schemafamilyName && s.schemafamilyName.length > 0 && s.schemagivenName && s.schemagivenName.length > 0) {
            author = DO.U.createRefName(s.schemafamilyName, s.schemagivenName);
          }
          else if (s.foaffamilyName && s.foaffamilyName.length > 0 && s.foafgivenName && s.foafgivenName.length > 0) {
            author = DO.U.createRefName(s.foaffamilyName, s.foafgivenName);
          }

          if (author !== '') {
            authors.push(author);
          }
          else {
            authors.push(authorIRI);
          }
        });
        authors = authors.join(', ') + ': ';
      }

      var dataVersionURL;
      if (subject.memmemento) {
        dataVersionURL = subject.memmemento;
      }
      else if (subject.rellatestversion) {
        dataVersionURL = subject.rellatestversion;
      }
      dataVersionURL = (dataVersionURL) ? ' data-versionurl="' + dataVersionURL + '"' : '';

      var dataVersionDate = (dateVersion) ? ' data-versiondate="' + dateVersion + '"' : '';

      var content = ('content' in options && options.content.length > 0) ? options.content + ', ' : '';

      var citationReason = 'Reason: ' + DO.C.Citation[options.citationRelation];

      var citationHTML = authors + title + datePublished + content + '<a about="#' + options.refId + '"' + dataVersionDate + dataVersionURL + ' href="' + options.citationId + '" rel="schema:citation ' + options.citationRelation  + '" title="' + DO.C.Citation[options.citationRelation] + '">' + options.citationId + '</a> [' + dateAccessed + ', ' + citationReason + ']';
//console.log(citationHTML);
      return citationHTML;
    },

    createRefName: function(familyName, givenName, refType) {
      refType = refType || DO.C.DocRefType;
      switch(refType) {
        case 'LNCS': default:
          return familyName + ', ' + givenName.slice(0,1) + '.';
          break;
        case 'ACM':
          return givenName.slice(0,1) + '. ' + familyName;
          break;
        case 'fullName':
          return givenName + ' ' + familyName;
          break;
      }
    },

    buildReferences: function(node, id, citation) {
      if (!node) {
        var nodeInsertLocation = doc.selectArticleNode(document);
        var section = '<section id="references"><h2>References</h2><div><ol></ol></div></section>';
        nodeInsertLocation.insertAdjacentHTML('beforeend', section);
      }

      DO.U.updateReferences();
      node = document.querySelector('#references ol');

      if(citation) {
        var citationItem = '<li id="' + id + '">' + citation + '</li>';
        node.insertAdjacentHTML('beforeend', citationItem);
      }
    },

    updateReferences: function(options){
      options = options || {};
      options['external'] = options.external || true;
      options['internal'] = options.internal || false;

      var references = document.querySelector('#references');
      var referencesOl = references.querySelector('ol');
      var citeA = document.querySelectorAll('body *:not([id="references"]) cite > a');
      var uniqueCitations = [];
      var lis = [];

      var docURL = document.location.origin + document.location.pathname;

      citeA.forEach(function(a){
        if (uniqueCitations.indexOf(a.outerHTML) < 0) {
          uniqueCitations.push(a.outerHTML);

          // var rel = a.getAttribute('rel');
          // var property = a.getAttribute('property');

          if ((options.external && !a.href.startsWith(docURL + '#')) ||
              (options.internal && a.href.startsWith(docURL + '#'))) {

            var versionDate = a.getAttribute('data-versiondate');
            var versionURL = a.getAttribute('data-versionurl');

            //Create Robust Link
            if(!versionDate && !versionURL
               && (a.href.startsWith('http:') || a.href.startsWith('https:'))) {
              // console.log(a);

              // var aVersionDateURL = document.querySelector('a[href="' + a.href + '"][data-versiondate][data-versionurl]');
              // if (aVersionDateURL){
              //   a.setAttribute('data-versiondate', aVersionDateURL.getAttribute('data-versiondate'));
              //   a.setAttribute('data-versionurl', aVersionDateURL.getAttribute('data-versionurl'));
              // }

              //DO.U.createRobustLink(a.href, a);
            }

            lis.push('<li><cite>' + a.textContent + '</cite>, <a href="' + a.href + '">' + a.href + '</a></li>');
          }
        }
      })

      var updatedList = util.fragmentFromString('<ol>' + lis.join('') + '</ol>');
      referencesOl.parentNode.replaceChild(updatedList, referencesOl);
    },

    highlightItems: function() {
      var highlights = document.body.querySelectorAll('*[class*="highlight-"]');
      for (var i = 0; i < highlights.length; i++) {
        highlights[i].addEventListener('mouseenter', function(e) {
          var c = e.target.getAttribute('class').split(' ')
                    .filter(function(s) { return s.startsWith('highlight-'); });
          var highlightsX = document.body.querySelectorAll('*[class~="'+ c[0] +'"]');
          for (var j = 0; j < highlightsX.length; j++) {
            highlightsX[j].classList.add('do', 'highlight');
          }
        });

        highlights[i].addEventListener('mouseleave', function(e) {
          var c = e.target.getAttribute('class');
          var c = e.target.getAttribute('class').split(' ')
                    .filter(function(s) { return s.startsWith('highlight-'); });
          var highlightsX = document.body.querySelectorAll('*[class~="'+ c[0] +'"]');
          for (var j = 0; j < highlightsX.length; j++) {
            highlightsX[j].classList.remove('do', 'highlight');
          }
        });
      }
    },

    //From http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
    hashCode: function(s){
      var hash = 0;
      if (s.length == 0) return hash;
      for (i = 0; i < s.length; i++) {
        var char = s.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    },

    SPARQLQueryURL: {
      getResourcesOfTypeWithLabel: function(sparqlEndpoint, resourceType, textInput, options) {
        options = options || {};
        var labelsPattern = '', resourcePattern = '';

        if(!('lang' in options)) {
          options['lang'] = 'en';
        }

        if ('filter' in options) {
          if(resourceType == '<http://purl.org/linked-data/cube#DataSet>' || resourceType == 'qb:DataSet'
            && 'dimensionRefAreaNotation' in options.filter) {
              var dimensionPattern, dimensionDefault = '';
              var dataSetPattern = "\n\
    [] qb:dataSet ?resource";
            if ('dimensionProperty' in options.filter) {
              dimensionPattern = " ; " + options.filter.dimensionProperty;
            }
            else {
              var dimensionDefault = " .\n\
  { SELECT DISTINCT ?propertyRefArea WHERE { ?propertyRefArea rdfs:subPropertyOf* sdmx-dimension:refArea . } }";
              dimensionPattern = " ; ?propertyRefArea ";

            }
            var notationPattern = " [ skos:notation '" + options.filter.dimensionRefAreaNotation.toUpperCase() + "' ] ."
          }
          resourcePattern = dimensionDefault + dataSetPattern + dimensionPattern + notationPattern;
        }

        labelsPattern = "\n\
  ";
        if ('optional' in options) {
          if('prefLabels' in options.optional) {
            if (options.optional.prefLabels.length == 1) {
              labelsPattern += "  ?resource " + options.optional.prefLabels[0] + " ?prefLabel .";
            }
            else {
              labelsPattern += "  VALUES ?labelProperty {";
              options.optional.prefLabels.forEach(function(property){
                labelsPattern += ' ' + property;
              });
              labelsPattern += " } ?resource ?labelProperty ?prefLabel .";
            }
          }
        }
        else {
          labelsPattern += "  ?resource rdfs:label ?prefLabel .";
        }


//  FILTER (!STRSTARTS(STR(?resource), 'http://purl.org/linked-data/sdmx/'))\n\
      var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n\
PREFIX dcterms: <http://purl.org/dc/terms/>\n\
PREFIX qb: <http://purl.org/linked-data/cube#>\n\
PREFIX sdmx-dimension: <http://purl.org/linked-data/sdmx/2009/dimension#>\n\
PREFIX sdmx-measure: <http://purl.org/linked-data/sdmx/2009/measure#>\n\
CONSTRUCT {\n\
  ?resource skos:prefLabel ?prefLabel .\n\
}\n\
WHERE {\n\
  ?resource a " + resourceType + " ."
+ labelsPattern + "\n\
  FILTER (CONTAINS(LCASE(?prefLabel), '" + textInput + "') && (LANG(?prefLabel) = '' || LANGMATCHES(LANG(?prefLabel), '" + options.lang + "')))"
+ resourcePattern + "\n\
}";
       return sparqlEndpoint + "?query=" + uri.encodeString(query);
      },

      getObservationsWithDimension: function(sparqlEndpoint, dataset, paramDimension, options) {
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n\
PREFIX dcterms: <http://purl.org/dc/terms/>\n\
PREFIX qb: <http://purl.org/linked-data/cube#>\n\
PREFIX sdmx-dimension: <http://purl.org/linked-data/sdmx/2009/dimension#>\n\
PREFIX sdmx-measure: <http://purl.org/linked-data/sdmx/2009/measure#>\n\
CONSTRUCT {\n\
  ?observation sdmx-dimension:refPeriod ?refPeriod .\n\
  ?observation sdmx-measure:obsValue ?obsValue .\n\
}\n\
WHERE {\n\
  ?observation qb:dataSet <" + dataset + "> .\n\
  " + paramDimension + "\n\
  ?propertyRefPeriod rdfs:subPropertyOf* sdmx-dimension:refPeriod .\n\
  ?observation ?propertyRefPeriod ?refPeriod .\n\
  ?propertyMeasure rdfs:subPropertyOf* sdmx-measure:obsValue .\n\
  ?observation ?propertyMeasure ?obsValue .\n\
}";

        return sparqlEndpoint + "?query=" + uri.encodeString(query);
      },
    },

    getSparkline: function(data, options) {
      options = options || {};
      if(!('cssStroke' in options)) {
        options['cssStroke'] = '#000';
      }

      var svg = '<svg height="100%" prefix="rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns# rdfs: http://www.w3.org/2000/01/rdf-schema# xsd: http://www.w3.org/2001/XMLSchema# qb: http://purl.org/linked-data/cube# prov: http://www.w3.org/ns/prov# schema: http://schema.org/" version="1.1" width="100%" xmlns="http://www.w3.org/2000/svg" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xlink="http://www.w3.org/1999/xlink">';

      svg += DO.U.drawSparklineGraph(data, options);
      svg += '</svg>';

      return svg;
    },

    drawSparklineGraph: function(data, options) {
      options = options || {};
      if(!('cssStroke' in options)) {
        options['cssStroke'] = '#000';
      }
      var svg= '';

      var obsValue = 'http://purl.org/linked-data/sdmx/2009/measure#obsValue';
      var observation = 'http://purl.org/linked-data/cube#Observation';

      var dotSize = 1;
      var values = data.map(function(n) { return n[obsValue]; }),
        min = Math.min.apply(null, values),
        max = Math.max.apply(null, values);

      var new_max = 98;
      var new_min = 0;
      var range = new_max - new_min;

      var parts = values.map(function (v) {
        return (new_max - new_min) / (max - min) * (v - min) + new_min || 0;
      });

      var div = 100 / parts.length;
      var x1 = 0, y1 = 0, x2 = div / 2, y2 = range - parts[0];

      var lines = '';
      for (var i=0; i < parts.length; i++) {
        x1 = x2; y1 = y2;
        x2 = range * (i / parts.length) + (div / 2);
        y2 = range - parts[i];

        lines += '<a rel="rdfs:seeAlso" resource="' + data[i][observation] + '" target="_blank" xlink:href="' + data[i][observation] + '"><line' +
          ' x1="' + x1 + '%"' +
          ' x2="' + x2 + '%"' +
          ' y1="' + y1 + '%"' +
          ' y2="' + y2 + '%"' +
          ' stroke="' + options.cssStroke + '"' +
          ' /></a>';

        //Last data item
        if(i+1 === parts.length) {
          lines += '<a target="_blank" xlink:href="' + data[i][observation] + '"><circle' +
            ' cx="' + x2 + '%"' +
            ' cy="' + y2 + '%"' +
            ' r="' + dotSize + '"' +
            ' stroke="#f00"' +
            ' fill:#f00' +
            ' /></a>';
        }
      }

      var wasDerivedFrom = '';
      if(options && 'url' in options) {
        wasDerivedFrom = ' rel="prov:wasDerivedFrom" resource="' + options.url + '"';
      }
      svg += '<g' + wasDerivedFrom + '>';
      svg += '<metadata rel="schema:license" resource="https://creativecommons.org/publicdomain/zero/1.0/"></metadata>';
      if (options && 'title' in options) {
        svg += '<title property="schema:name">' + options['title'] + '</title>';
      }
      svg += lines + '</g>';

      return svg;
    },

    sortTriples: function(triples, options) {
      options = options || {};
      if(!('sortBy' in options)) {
        options['sortBy'] = 'object';
      }

      triples._graph.sort(function (a, b) {
        return a[options.sortBy].nominalValue.toLowerCase().localeCompare(b[options.sortBy].nominalValue.toLowerCase());
      });

      return triples;
    },

    getListHTMLFromTriples: function(triples, options) {
      options = options || {element: 'ul'};
      var elementId = ('elementId' in options) ? ' id="' + options.elementId + '"' : '';
      var elementName = ('elementId' in options) ? ' name="' + options.elementId + '"' : '';
      var elementTitle = ('elementId' in options) ? options.elementId : '';
      var items = '';
      triples.forEach(function(t){
        var s = t.subject.nominalValue;
        var o = t.object.nominalValue;
        switch(options.element) {
          case 'ol': case 'ul': default:
            items += '<li><a href="' + s + '">' + o + '</a></li>';
            break;
          case 'dl':
            items += '<dd><a href="' + s + '">' + o + '</a></dd>';
            break;
          case 'select':
            items += '<option value="' +   s + '">' + o + '</option>';
            break;
        }
      });

      switch(options.element) {
        case 'ul': default:
          return '<ul' + elementId + '>' + items + '</ul>';
        case 'ol':
          return '<ol' + elementId + '>' + items + '</ol>';
        case 'dl':
          return '<dl' + elementId + '><dt>' + elementTitle + '</dt>' + items + '</dl>';
        case 'select':
          return '<select' + elementId + elementName + '>' + items + '</select>';
      }
    },

    showAsTabs: function(selector) {
      selector = selector || '.tabs';
      var nodes = document.querySelectorAll(selector);

      nodes.forEach(function(node){
        var li = node.querySelectorAll('nav li.selected');
        var figure = node.querySelectorAll('figure.selected');

        if (li.length == 0 && figure.length == 0) {
          node.querySelector('nav li').classList.add('selected');
          node.querySelector('figure').classList.add('selected');
        }

        node.querySelector('nav').addEventListener('click', function(e) {
          var a = e.target;
          if (a.closest('a')) {
            e.preventDefault();
            e.stopPropagation();

            var li = a.parentNode;
            if(!li.classList.contains('class')) {
              var navLi = node.querySelectorAll('nav li');
              for (var i = 0; i < navLi.length; i++) {
                navLi[i].classList.remove('selected');
              }
              li.classList.add('selected');
              var figures = node.querySelectorAll('figure');
              for (var i = 0; i < figures.length; i++) {
                figures[i].classList.remove('selected');
              }
              node.querySelector('figure' + a.hash).classList.add('selected');
            }
          }
        });

      })
    },

    getReferenceLabel: function(motivatedBy) {
      var s = '#';
      motivatedBy = motivatedBy || '';
      //TODO: uriToPrefix
      motivatedBy = (motivatedBy.length > 0 && motivatedBy.slice(0, 4) == 'http' && motivatedBy.indexOf('#') > -1) ? 'oa:' + motivatedBy.substr(motivatedBy.lastIndexOf('#') + 1) : motivatedBy;

      switch(motivatedBy) {
        default: break;
        case 'oa:assessing':     s = '✪'; break;
        case 'oa:bookmarking':   s = '🔖'; break;
        case 'oa:commenting':    s = '🗨'; break;
        case 'oa:describing':    s = '※'; break;
        case 'oa:highlighting':  s = '#'; break;
        case 'oa:linking':       s = '※'; break;
        case 'oa:questioning':   s = '?'; break;
        case 'oa:replying':      s = '💬'; break;
      }

      return s;
    },

    showRefs: function() {
      var refs = document.querySelectorAll('span.ref');
      for (var i = 0; i < refs.length; i++) {
// console.log(this);
        var ref = refs[i].querySelector('mark[id]');
// console.log(ref);
        if (ref) {
          var refId = ref.id;
// console.log(refId);
          var refA = refs[i].querySelectorAll('[class*=ref-] a');
// console.log(refA);
          for (var j = 0; j < refA.length; j++) {
            //XXX: Assuming this is always an internal anchor?
            var noteId = refA[j].getAttribute('href').substr(1);
// console.log(noteId);
            var refLabel = refA[j].textContent;
// console.log(refLabel);

// console.log(refId + ' ' +  refLabel + ' ' + noteId);
            DO.U.positionNote(refId, refLabel, noteId);
          }
        }
      }
    },

    getTextQuoteHTML: function(refId, motivatedBy, exact, docRefType, options){
      options = options || {};

      var doMode = (options.do) ? ' do' : '';

      var refOpen = '<span class="ref' + doMode + '" rel="schema:hasPart" resource="#' + refId + '" typeof="dcterms:Text">';
      var refClose = '</span>';
      if (motivatedBy == 'oa:highlighting') {
        refOpen = '<span class="ref' + doMode + '" rel="schema:hasPart" resource="#h-' + refId + '" typeof="oa:Annotation"><span rel="oa:motivatedBy" resource="oa:highlighting"></span><span rel="oa:hasTarget" resource="#' + refId + '" typeof="dcterms:Text">';
        refClose = '</span></span>';
      }
      var mark = '<mark datatype="rdf:HTML" id="'+ refId +'" property="rdf:value">' + exact + '</mark>';

      return refOpen + mark + docRefType + refClose;
    },

    positionNote: function(refId, refLabel, noteId) {
      var ref = document.getElementById(refId);
      var note = document.getElementById(noteId);

      if (note.hasAttribute('style')) {
        note.removeAttribute('style');
      }

      //TODO: If there are articles already in the aside.note , the subsequent top values should come after one another
      var style = [
        'top: ' + Math.ceil(ref.parentNode.offsetTop) + 'px'
      ].join('; ');
      note.setAttribute('style', style);
    },

    positionInteraction: function(noteIRI, containerNode, options) {
      containerNode = containerNode || document.body;

      return fetcher.getResourceGraph(noteIRI).then(
        function(g){
          DO.U.showAnnotation(noteIRI, g, containerNode, options);
        });
    },

    showAnnotation: function(noteIRI, g, containerNode, options) {
      containerNode = containerNode || document.body;
      options = options || {};

      var documentURL = uri.stripFragmentFromString(document.location.href);

      var note = g.child(noteIRI);
      if (note.asobject && note.asobject.at(0)) {
        note = g.child(note.asobject.at(0))
      }
// console.log(noteIRI)
// console.log(note.toString())
// console.log(note)

      var id = String(Math.abs(DO.U.hashCode(noteIRI)));
      var refId = 'r-' + id;
      var refLabel = id;

      var inboxIRI = (note.ldpinbox && note.ldpinbox.at(0)) ? note.ldpinbox.at(0) : undefined;
      if (inboxIRI) {
        // console.log('inboxIRI:')
        // console.log(inboxIRI)
        // console.log('DO.C.Inbox:')
        // console.log(DO.C.Inbox)
        // console.log('DO.C.Notification:')
        // console.log(DO.C.Notification)
        // console.log('DO.C.Activity:')
        // console.log(DO.C.Activity)
        if (DO.C.Inbox[inboxIRI]) {
          DO.C.Inbox[inboxIRI]['Notifications'].forEach(function(notification) {
// console.log(notification)
            if (DO.C.Notification[notification] && DO.C.Notification[notification]['Activities']) {
              DO.C.Notification[notification]['Activities'].forEach(function(activity){
// console.log('   ' + activity)
                if (!document.querySelector('[about="' + activity + '"]') && DO.C.Activity[activity] && DO.C.Activity[activity]) {
                  DO.U.showAnnotation(activity, DO.C.Activity[activity]['Graph']);
                }
              })
            }
          });
        }
        else {
          DO.U.showNotificationSources(inboxIRI);
        }
      }

      var datetime = note.schemadatePublished || note.dctermscreated || note.aspublished;
// console.log(datetime);
      var annotatedBy = note.schemacreator || note.dctermscreator || note.asactor;
      var annotatedByIRI;
// console.log(annotatedBy);
      if (annotatedBy && annotatedBy.at(0)) {
        annotatedByIRI = annotatedBy.at(0);
// console.log(annotatedByIRI);
        annotatedBy = g.child(annotatedByIRI);
// console.log(annotatedBy);
      }
      var annotatedByName = auth.getAgentName(annotatedBy);
// console.log(annotatedByName);
      var annotatedByImage = auth.getAgentImage(annotatedBy);
// console.log(annotatedByImage);
      var annotatedByURL = annotatedBy.schemaurl || '';
      annotatedByURL = (annotatedByURL) ? annotatedByURL : undefined;

      var lang = note.dctermslanguage || undefined;
      var licenseIRI = note.schemalicense || note.dctermsrights || undefined;
// console.log(licenseIRI);

      var motivatedBy = 'oa:replying';

      var bodyText = note.schemadescription;
      if(!bodyText) {
        bodyText = note.dctermsdescription;
        if(!bodyText)  {
          bodyText = note.ascontent;
        }
      }

      var types = note.rdftype;
// console.log(types);
      var resourceTypes = [];
      types.forEach(function(type){
        resourceTypes.push(type);
// console.log(type);
      });

      if(resourceTypes.indexOf('http://www.w3.org/ns/oa#Annotation') > -1) {
        var body = g.child(note.oahasBody);
// console.log(body);
        var bodyLanguage = body.schemainLanguage || body.dctermslanguage || undefined;
        var bodyLicenseIRI = body.schemalicense || body.dctermsrights || undefined;
// console.log(bodyLicenseIRI);
        bodyText = body.rdfvalue;
// console.log(bodyText);

// console.log(documentURL)
        if (note.oahasTarget && !(note.oahasTarget.startsWith(documentURL) || 'targetInMemento' in options)){
          // return Promise.reject();
          return;
        }

        var target = g.child(note.oahasTarget);
// console.log(target);
        var targetIRI = target.iri().toString();
// console.log(targetIRI);

        var source = target.oahasSource;
// console.log(source);
// console.log(note.oamotivatedBy);

        if(note.oamotivatedBy) {
          motivatedBy = note.oamotivatedBy;
          refLabel = DO.U.getReferenceLabel(motivatedBy);
        }

        var exact, prefix, suffix;
        var selector = target.oahasSelector;
        if(selector) {
          selector = g.child(selector);
// console.log(selector);

// console.log(selector.rdftype);
// console.log(selector.rdftype._array);
          //FIXME: This is taking the first rdf:type. There could be multiple.
          var selectorTypes;
          if (selector.rdftype && selector.rdftype.at(0)) {
            selectorTypes = selector.rdftype.at(0);
          }
// console.log(selectorTypes == 'http://www.w3.org/ns/oa#FragmentSelector');
          if(selectorTypes == 'http://www.w3.org/ns/oa#TextQuoteSelector') {
            exact = selector.oaexact;
            prefix = selector.oaprefix;
            suffix = selector.oasuffix;
          }
          else if (selectorTypes == 'http://www.w3.org/ns/oa#FragmentSelector') {
            var refinedBy = g.child(selector.oarefinedBy);
// console.log(refinedBy)
            exact = refinedBy.oaexact;
            prefix = refinedBy.oaprefix;
            suffix = refinedBy.oasuffix;
// console.log(selector.rdfvalue)
            if (selector.rdfvalue && selector.rdfvalue !== '' && selector.dctermsconformsTo && selector.dctermsconformsTo.endsWith('://tools.ietf.org/html/rfc3987')) {
              var fragment = selector.rdfvalue;
// console.log(fragment)
              fragment = (fragment.indexOf('#') == 0) ? uri.getFragmentFromString(fragment) : fragment;

              if (fragment !== '') {
                containerNode = document.getElementById(fragment) || document.body;
              }
            }
          }
        }
// console.log(exact);
// console.log(prefix);
// console.log(suffix);
// console.log('----')
        var docRefType = '<sup class="ref-annotation"><a rel="cito:hasReplyFrom" href="#' + id + '" resource="' + noteIRI + '">' + refLabel + '</a></sup>';

        var containerNodeTextContent = containerNode.textContent;
        //XXX: Seems better?
        // var containerNodeTextContent = util.fragmentFromString(doc.getDocument(containerNode)).textContent.trim();

//console.log(containerNodeTextContent);
// console.log(prefix + exact + suffix);
        var selectorIndex = containerNodeTextContent.indexOf(prefix + exact + suffix);
// console.log(selectorIndex);
        if (selectorIndex >= 0) {
          var selector =  {
            "prefix": prefix,
            "exact": exact,
            "suffix": suffix
          };

          var selectedParentNode = DO.U.importTextQuoteSelector(containerNode, selector, refId, motivatedBy, docRefType, { 'do': true });

          var parentNodeWithId = selectedParentNode.closest('[id]');
          var targetIRI = (parentNodeWithId) ? documentURL + '#' + parentNodeWithId.id : documentURL;

          var noteData = {
            "type": 'article',
            "mode": "read",
            "motivatedByIRI": motivatedBy,
            "id": id,
            "refId": refId,
            "iri": noteIRI, //e.g., https://example.org/path/to/article
            "creator": {},
            "datetime": datetime,
            "target": {
              "iri": targetIRI,
              "source": source,
              "selector": {
                "exact": exact,
                "prefix": prefix,
                "suffix": suffix
              }
              //TODO: state
            },
            "body": bodyText,
            "language": {},
            "license": {}
          }
          if (annotatedByIRI) {
            noteData.creator["iri"] = annotatedByIRI;
          }
          if (annotatedByName) {
            noteData.creator["name"] = annotatedByName;
          }
          if (annotatedByImage) {
            noteData.creator["image"] = annotatedByImage;
          }
          if (annotatedByURL) {
            noteData.creator["url"] = annotatedByURL;
          }
          if (bodyLanguage) {
            noteData.language["code"] = bodyLanguage;
          }
          if (licenseIRI) {
            noteData.license["iri"] = licenseIRI;
          }

          if (inboxIRI) {
            noteData.inbox = inboxIRI;
          }
// console.log(noteData);
          var note = DO.U.createNoteDataHTML(noteData);
          var nES = selectedParentNode.nextElementSibling;
          var asideNote = '\n\
<aside class="note do">\n\
<blockquote cite="' + noteIRI + '">'+ note + '</blockquote>\n\
</aside>\n\
';
          var asideNode = util.fragmentFromString(asideNote);
          var parentSection = doc.getClosestSectionNode(selectedParentNode);
          parentSection.appendChild(asideNode);
          //XXX: Keeping this comment around for emergency
//                selectedParentNode.parentNode.insertBefore(asideNode, selectedParentNode.nextSibling);


          if(DO.C.User.IRI) {
            var noteDelete = document.querySelector('aside.do blockquote[cite="' + noteIRI + '"] article button.delete');
            if (noteDelete) {
              noteDelete.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                fetcher.deleteResource(noteIRI)
                  .then(() => {
                    var aside = noteDelete.closest('aside.do')
                    aside.parentNode.removeChild(aside)
                    var span = document.querySelector('span[resource="#' + refId + '"]')
                    span.outerHTML = span.querySelector('mark').textContent
                    // TODO: Delete notification or send delete activity
                  })
              });
            }
          }
          DO.U.positionNote(refId, refLabel, id);

          DO.C.Activity[noteIRI]['Graph'] = g;

          //Perhaps return something more useful?
          return noteIRI;
        }

        //XXX: Annotation without a selection
        else {
          var noteData = {
            "type": 'article',
            "mode": "read",
            "motivatedByIRI": motivatedBy,
            "id": id,
            "refId": refId,
            "refLabel": refLabel,
            "iri": noteIRI,
            "creator": {},
            "datetime": datetime,
            "target": {
              "iri": targetIRI
            },
            "body": bodyText,
            "language": {},
            "license": {}
          };

          if (annotatedByIRI) {
            noteData.creator["iri"] = annotatedByIRI;
          }
          if (annotatedByName) {
            noteData.creator["name"] = annotatedByName;
          }
          if (annotatedByImage) {
            noteData.creator["image"] = annotatedByImage;
          }
          if (bodyLanguage) {
            noteData.language["code"] = bodyLanguage;
          }
          if (licenseIRI) {
            noteData.license["iri"] = licenseIRI;
            noteData.license["name"] = DO.C.License[noteData.license["iri"]].name;
          }
          if (datetime) {
            noteData.datetime = datetime;
          }
// console.log(noteData)
          DO.U.addInteraction(noteData);

          DO.C.Activity[noteIRI]['Graph'] = g;
        }
      }
      else {
        var inReplyTo, inReplyToRel;
        if (note.asinReplyTo && note.asinReplyTo.at(0)) {
          inReplyTo = note.asinReplyTo.at(0);
          inReplyToRel = 'as:inReplyTo';
        }
        else if(note.siocreplyof && note.siocreplyof.at(0)) {
          inReplyTo = note.siocreplyof.at(0);
          inReplyToRel = 'sioc:reply_of';
        }

        if(inReplyTo && inReplyTo.indexOf(window.location.origin + window.location.pathname) >= 0) {
          var noteData = {
            "type": 'article',
            "mode": "read",
            "motivatedByIRI": motivatedBy,
            "id": id,
            "refId": refId,
            "refLabel": refLabel,
            "iri": noteIRI,
            "creator": {},
            "inReplyTo": {
              'iri': inReplyTo,
              'rel': inReplyToRel
            },
            "body": bodyText,
            "language": {},
            "license": {}
          };
          if (annotatedByIRI) {
            noteData.creator["iri"] = annotatedByIRI;
          }
          if (annotatedByName) {
            noteData.creator["name"] = annotatedByName;
          }
          if (annotatedByImage) {
            noteData.creator["image"] = annotatedByImage;
          }
          if (bodyLanguage) {
            noteData.language["code"] = bodyLanguage;
          }
          if (licenseIRI) {
            noteData.license["iri"] = licenseIRI;
          }
          if (datetime) {
            noteData.datetime = datetime;
          }
          DO.U.addInteraction(noteData);

          DO.C.Activity[noteIRI]['Graph'] = g;
        }
        else {
          console.log('Source is not an oa:Annotation and it is not a reply to');
        }
      }
    },

    addInteraction: function(noteData) {
      var interaction = DO.U.createNoteDataHTML(noteData);
      var interactions = document.getElementById('document-interactions');

      if(!interactions) {
        interactions = doc.selectArticleNode(document);
        var interactionsSection = '<section id="document-interactions"><h2>Interactions</h2><div>';
// interactionsSection += '<p class="count"><data about="" datatype="xsd:nonNegativeInteger" property="sioc:num_replies" value="' + interactionsCount + '">' + interactionsCount + '</data> interactions</p>';
        interactionsSection += '</div></section>';
        interactions.insertAdjacentHTML('beforeend', interactionsSection);
      }

      interactions = document.querySelector('#document-interactions > div');
      interactions.insertAdjacentHTML('beforeend', interaction);
    },

    getRDFaPrefixHTML: function(prefixes){
      return Object.keys(prefixes).map(function(i){ return i + ': ' + prefixes[i]; }).join(' ');
    },

    createNoteDataHTML: function(n) {
// console.log(n);
      var published = '';
      var lang = '', xmlLang = '', language = '';
      var license = '';
      var creator = '', authors = '', creatorImage = '', creatorNameIRI = '', creatorURLNameIRI = '';
      var hasTarget = '', annotationTextSelector = '', target = '';
      var inbox = '';
      var heading, hX;
      var aAbout = '', aPrefix = '';
      var noteType = '';
      var body = '';
      var buttonDelete = '';
      var note = '';
      var targetLabel = '';
      var articleClass = '';
      var prefixes = ' prefix="rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns# schema: http://schema.org/ dcterms: http://purl.org/dc/terms/ oa: http://www.w3.org/ns/oa# as: https://www.w3.org/ns/activitystreams# ldp: http://www.w3.org/ns/ldp#"';

      var canonicalId = n.canonical || 'urn:uuid:' + util.generateUUID();

      var motivatedByIRI = n.motivatedByIRI || '';
      var motivatedByLabel = '';
      switch(motivatedByIRI) {
        case 'oa:replying': default:
          motivatedByIRI = 'oa:replying';
          motivatedByLabel = 'replies';
          targetLabel = 'In reply to';
          aAbout = ('mode' in n && n.mode == 'object') ? '#' + n.id : '';
          aPrefix = prefixes;
          break;
        case 'oa:assessing':
          motivatedByLabel = 'reviews';
          targetLabel = 'Review of';
          aAbout = ('mode' in n && n.mode == 'object') ? '#' + n.id : '';
          aPrefix = prefixes;
          break;
        case 'oa:questioning':
          motivatedByLabel = 'questions';
          targetLabel = 'Questions';
          aAbout = ('mode' in n && n.mode == 'object') ? '#' + n.id : '';
          aPrefix = prefixes;
          break;
        case 'oa:describing':
          motivatedByLabel = 'describes';
          targetLabel = 'Describes';
          aAbout = '#' + n.id;
          break;
        case 'oa:commenting':
          motivatedByLabel = 'comments';
          targetLabel = 'Comments on';
          aAbout = '#' + n.id;
          break;
        case 'oa:bookmarking':
          motivatedByLabel = 'bookmarks';
          targetLabel = 'Bookmarked';
          aAbout = ('mode' in n && n.mode == 'object') ? '#' + n.id : '';
          aPrefix = prefixes;
          break;
      }

      switch(n.mode) {
        default: case 'read':
          hX = 3;
          if ('creator' in n && 'iri' in n.creator && n.creator.iri == DO.C.User.IRI) {
            buttonDelete = '<button class="delete" title="Delete item">' + template.Icon[".fas.fa-trash-alt"] + '</button>' ;
          }
          articleClass = (motivatedByIRI == 'oa:commenting') ? '': ' class="do"';
          aAbout = ('iri' in n) ? n.iri : '';
          break;
        case 'write':
          hX = 1;
          break;
        case 'object':
          hX = 2;
          break;
      }

      var creatorName = '';
      var creatorIRI = '#agent';
      if ('creator' in n) {
        if ('image' in n.creator) {
          var img = (n.mode == 'read') ? uri.getProxyableIRI(n.creator.image) : n.creator.image;
          creatorImage = '<img alt="" height="48" rel="schema:image" src="' + img + '" width="48" /> ';
        }
        if('iri' in n.creator) {
          creatorIRI = n.creator.iri;
        }
        if('name' in n.creator) {
          creatorName = n.creator.name;
          creatorNameIRI = '<span about="' + creatorIRI + '" property="schema:name">' + creatorName + '</span>';
        }
        else {
          creatorNameIRI = DO.C.SecretAgentNames[Math.floor(Math.random() * DO.C.SecretAgentNames.length)];
        }

        creatorURLNameIRI = ('url' in n.creator) ? '<a href="' + n.creator.url + '" rel="schema:url">' + creatorNameIRI + '</a>' : '<a href="' + creatorIRI + '">' + creatorNameIRI + '</a>';

        creator = '<span about="' + creatorIRI + '" typeof="schema:Person">' + creatorImage + creatorURLNameIRI + '</span>';

        authors = '<dl class="author-name"><dt>Authors</dt><dd><span rel="schema:creator">' + creator + '</span></dd></dl>';
      }

      heading = '<h' + hX + ' property="schema:name">' + creatorName + ' <span rel="oa:motivatedBy" resource="' + motivatedByIRI + '">' + motivatedByLabel + '</span></h' + hX + '>';

      if ('inbox' in n && typeof n.inbox !== 'undefined') {
        inbox = '<dl class="inbox"><dt>Notifications Inbox</dt><dd><a href="' + n.inbox + '" rel="ldp:inbox">' + n.inbox + '</a></dd></dl>';
      }

      if ('datetime' in n && typeof n.datetime !== 'undefined'){
        var time = '<time datetime="' + n.datetime + '" datatype="xsd:dateTime" property="schema:datePublished" content="' + n.datetime + '">' + n.datetime.substr(0,19).replace('T', ' ') + '</time>';
        var timeLinked = ('iri' in n) ? '<a href="' + n.iri + '">' + time + '</a>' : time;
        published = '<dl class="published"><dt>Published</dt><dd>' + timeLinked + '</dd></dl>';
      }

      if (n.language && 'code' in n.language) {
        language = DO.U.createLanguageHTML(n.language, {property:'dcterms:language', label:'Language'});
        lang = ' lang="' +  n.language.code + '"';
        xmlLang = ' xml:lang="' +  n.language.code + '"';
      }
      if (n.license && 'iri' in n.license) {
        license = DO.U.createLicenseHTML(n.license, {rel:'dcterms:rights', label:'Rights'});
      }

      switch(n.type) {
        case 'article': case 'note': case 'bookmark': case 'approve': case 'disapprove': case 'specificity':
          if (typeof n.target !== 'undefined' || typeof n.inReplyTo !== 'undefined') { //note, annotation, reply
            //FIXME: Could resourceIRI be a fragment URI or *make sure* it is the document URL without the fragment?
            //TODO: Use n.target.iri?

            if (typeof n.body !== 'undefined') {
              if(typeof n.body === 'object' && 'purpose' in n.body) {
                if ('describing' in n.body.purpose && 'text' in n.body.purpose.describing) {
                  body += '<section id="note-' + n.id + '" rel="oa:hasBody" resource="#note-' + n.id + '"><h' + (hX+1) + ' property="schema:name" rel="oa:hasPurpose" resource="oa:describing">Note</h' + (hX+1) + '>' + language + '<div datatype="rdf:HTML"' + lang + ' property="rdf:value schema:description" resource="#note-' + n.id + '" typeof="oa:TextualBody"' + xmlLang + '>' + n.body.purpose.describing.text + '</div></section>';
                }
                if ('tagging' in n.body.purpose && 'text' in n.body.purpose.tagging) {
                  var tagsArray = [];
                  n.body.purpose.tagging.text.split(',').forEach(function(i){
                    var tag = DO.U.htmlEntities(i.trim());
                    if(tag.length > 0) {
                      tagsArray.push(tag);
                    }
                  });
                  if (tagsArray.length > 0){
                    tagsArray = util.uniqueArray(tagsArray);

                    body += '<dl id="tags" class="tags"><dt>Tags</dt><dd><ul rel="oa:hasBody">';
                    tagsArray.forEach(function(i){
                      body += '<li about="#tag-' + util.generateAttributeId(null, i) + '" typeof="oa:TextualBody" property="rdf:value" rel="oa:hasPurpose" resource="oa:tagging" datatype="rdf:HTML">' + i + '</li>';
                    })
                    body += '</ul></dd></dl>';
                  }
                }
              }
              else if (n.body.length > 0) {
                body += '<section id="note-' + n.id + '" rel="oa:hasBody" resource="#note-' + n.id + '"><h' + (hX+1) + ' property="schema:name">Note</h' + (hX+1) + '>' + language + license + '<div datatype="rdf:HTML"' + lang + ' property="rdf:value schema:description" resource="#note-' + n.id + '" typeof="oa:TextualBody"' + xmlLang + '>' + n.body + '</div></section>';
              }
            }

            var targetIRI = '';
            var targetRelation = 'oa:hasTarget';
            if (typeof n.target !== 'undefined' && 'iri' in n.target) {
              targetIRI = n.target.iri;
              var targetIRIFragment = uri.getFragmentFromString(n.target.iri);
              //TODO: Handle when there is no fragment
              //TODO: Languages should be whatever is target's (not necessarily 'en')
              if (typeof n.target.selector !== 'undefined') {
                var selectionLanguage = ('language' in n.target.selector && n.target.selector.language) ? n.target.selector.language : '';

                annotationTextSelector = '<div rel="oa:hasSelector" resource="#fragment-selector" typeof="oa:FragmentSelector"><dl class="conformsto"><dt>Fragment selector conforms to</dt><dd><a content="' + targetIRIFragment + '" lang="" property="rdf:value" rel="dcterms:conformsTo" href="https://tools.ietf.org/html/rfc3987" xml:lang="">RFC 3987</a></dd></dl><dl rel="oa:refinedBy" resource="#text-quote-selector" typeof="oa:TextQuoteSelector"><dt>Refined by</dt><dd><span lang="' + selectionLanguage + '" property="oa:prefix" xml:lang="' + selectionLanguage + '">' + n.target.selector.prefix + '</span><mark lang="' + selectionLanguage + '" property="oa:exact" xml:lang="' + selectionLanguage + '">' + n.target.selector.exact + '</mark><span lang="' + selectionLanguage + '" property="oa:suffix" xml:lang="' + selectionLanguage + '">' + n.target.selector.suffix + '</span></dd></dl></div>';
              }
            }
            else if(typeof n.inReplyTo !== 'undefined' && 'iri' in n.inReplyTo) {
              targetIRI = n.inReplyTo.iri;
              targetRelation = ('rel' in n.inReplyTo) ? n.inReplyTo.rel : 'as:inReplyTo';
              // TODO: pass document title and maybe author so they can be displayed on the reply too.
            }

            hasTarget = '<a href="' + targetIRI + '" rel="' + targetRelation + '">' + targetLabel + '</a>';
            if (typeof n.target !== 'undefined' && typeof n.target.source !== 'undefined') {
              hasTarget += ' (<a about="' + n.target.iri + '" href="' + n.target.source +'" rel="oa:hasSource" typeof="oa:SpecificResource">part of</a>)';
            }

            var targetLanguage = ('language' in n.target && n.target) ? '<dl><dt>Language</dt><dd><span lang="" property="dcterms:language" xml:lang="">' + n.target.language + '</span></dd></dl>': '';

            target ='<dl class="target"><dt>' + hasTarget + '</dt>';
            if (typeof n.target !== 'undefined' && typeof n.target.selector !== 'undefined') {
              target += '<dd><blockquote about="' + targetIRI + '" cite="' + targetIRI + '">' + targetLanguage + annotationTextSelector + '</blockquote></dd>';
            }
            target += '</dl>';

            target += '<dl class="renderedvia"><dt>Rendered via</dt><dd><a about="' + targetIRI + '" href="https://dokie.li/" rel="oa:renderedVia">dokieli</a></dd></dl>';

            var canonical = '<dl class="canonical"><dt>Canonical</dt><dd rel="oa:canonical" resource="' + canonicalId + '">' + canonicalId + '</dd></dl>';

            note = '<article about="' + aAbout + '" id="' + n.id + '" typeof="oa:Annotation' + noteType + '"' + aPrefix + articleClass + '>'+buttonDelete+'\n\
  ' + heading + '\n\
  ' + authors + '\n\
  ' + published + '\n\
  ' + license + '\n\
  ' + inbox + '\n\
  ' + canonical + '\n\
  ' + target + '\n\
  ' + body + '\n\
</article>';
          }
          break;

        case 'ref-footnote':
          var citationURL = (typeof n.citationURL !== 'undefined' && n.citationURL != '') ? '<a href="' + n.citationURL + '" rel="rdfs:seeAlso">' + n.citationURL + '</a>' : '';
          var body = (typeof n.body !== 'undefined' && n.body != '') ? ((citationURL) ? ', ' + n.body : n.body) : '';

          note = '\n\
<dl about="#' + n.id +'" id="' + n.id +'" typeof="oa:Annotation">\n\
  <dt><a href="#' + n.refId + '" rel="oa:hasTarget">' + n.refLabel + '</a><meta rel="oa:motivation" resource="' + motivatedByIRI + '" /></dt>\n\
  <dd rel="oa:hasBody" resource="#n-' + n.id + '"><div datatype="rdf:HTML" property="rdf:value" resource="#n-' + n.id + '" typeof="oa:TextualBody">' + citationURL + body + '</div></dd>\n\
</dl>\n\
';
          break;

        default:
          break;
      }

      return note;
    },

    createLicenseHTML: function(n, options) {
      var license = '';
      var rel = (options && options.rel) ? options.rel : 'schema:license';
      var label = (options && options.label) ? options.label : 'License';

      if (typeof n.iri !== 'undefined') {
        license = '<dl class="' + label.toLowerCase() + '"><dt>' + label + '</dt><dd>';
        if('name' in n) {
          var title = ('description' in n) ? ' title="' + n.description + '"' : '';
          license += '<a href="' + n.iri + '" rel="' + rel + '"' + title + '>' + n.name + '</a>';
        }
        else {
          var licenseName = n.iri, licenseDescription = n.iri;
          if (n.iri in DO.C.License) {
            licenseName = DO.C.License[n.iri].name;
            licenseDescription = DO.C.License[n.iri].description;
          }
          license += '<a href="' + n.iri + '" rel="' + rel + '" title="' + licenseDescription + '">' + licenseName + '</a>';
        }
        license += '</dd></dl>';
      }

      return license;
    },

    createLanguageHTML: function(n, options) {
      var language = '';
      var property = (options && options.language) ? options.language : 'dcterms:language';
      var label = (options && options.label) ? options.label : 'Language';

      if (typeof n.code !== 'undefined') {
        n['name'] = n.name || DO.C.Languages[n.code] || n.code;
        language = '<dl class="' + label.toLowerCase() + '"><dt>' + label + '</dt><dd>';
        language += '<span content="' + n.code + '" lang="" property="' + property + '" xml:lang="">' + n.name + '</span>';
        language += '</dd></dl>';
      }

      return language;
    },

    createRDFaHTML: function(r, mode) {
      var s = '', about = '', property = '', rel = '', resource = '', href = '', content = '', langDatatype = '', typeOf = '', idValue = '', id = '';

      if ('rel' in r && r.rel != '') {
        rel = ' rel="' + r.rel + '"';
      }

      if ('href' in r && r.href != '') {
        href = ' href="' + r.href + '"';
      }

      if(mode == 'expanded') {
        idValue = util.generateAttributeId();
        id = ' id="' + idValue + '"';

        if ('about' in r && r.about != '') {
          about = ' about="' + r.about + '"';
        }
        else {
          about = ' about="#' + idValue + '"';
        }

        if ('property' in r && r.property != '') {
          property = ' property="' + r.property + '"';
        }
        else {
          //TODO: Figure out how to use user's preferred vocabulary.
          property = ' property="rdfs:label"';
        }

        if ('resource' in r && r.resource != '') {
          resource = ' resource="' + r.resource + '"';
        }

        if ('content' in r && r.content != '') {
          content = ' content="' + r.content + '"';
        }

        if ('lang' in r && r.lang != '') {
          langDatatype = ' lang="' + r.lang + '" xml:lang="' + r.lang + '"';
        }
        else {
          if ('datatype' in r && r.datatype != '') {
            langDatatype = ' datatype="' + r.datatype + '"';
          }
        }

        if ('typeOf' in r && r.typeOf != '') {
          typeOf = ' typeof="' + r.typeOf + '"';
        }
      }

      var element = ('datatype' in r && r.datatype == 'xsd:dateTime') ? 'time' : ((href == '') ? 'span' : 'a');
      var textContent = r.textContent || r.href || '';

      s = '<' + element + about + content + href + id + langDatatype + property + rel + resource + typeOf + '>' + textContent + '</' + element + '>';

      return s;
    },

    getAnnotationInboxLocationHTML: function() {
      var s = '', inputs = [], checked = '';
      if (DO.C.User.TypeIndex && DO.C.User.TypeIndex[DO.C.Vocab['asAnnounce']['@id']]) {
        if (DO.C.User.UI && DO.C.User.UI['annotationInboxLocation'] && DO.C.User.UI.annotationInboxLocation['checked']) {
          checked = ' checked="checked"';
        }
        s = '<input type="checkbox" id="annotation-inbox" name="annotation-inbox"' + checked + ' /><label for="annotation-inbox">Inbox</label>';
      }

      return s;
    },

    getAnnotationLocationHTML: function() {
      var s = '', inputs = [], checked = '';
      if(typeof DO.C.AnnotationService !== 'undefined') {
        if (DO.C.User.Storage && DO.C.User.Storage.length > 0 || DO.C.User.Outbox && DO.C.User.Outbox.length > 0) {
          if (DO.C.User.UI && DO.C.User.UI['annotationLocationService'] && DO.C.User.UI.annotationLocationService['checked']) {
            checked = ' checked="checked"';
          }
        }
        else {
          checked = ' checked="checked" disabled="disabled"';
        }

        inputs.push('<input type="checkbox" id="annotation-location-service" name="annotation-location-service"' + checked + ' /><label for="annotation-location-service">Annotation service</label>');
      }

      checked = ' checked="checked"';
      if(DO.C.User.Storage && DO.C.User.Storage.length > 0 || DO.C.User.Outbox && DO.C.User.Outbox.length > 0) {
        if (DO.C.User.UI && DO.C.User.UI['annotationLocationPersonalStorage'] && !DO.C.User.UI.annotationLocationPersonalStorage['checked']) {
            checked = '';
        }

        inputs.push('<input type="checkbox" id="annotation-location-personal-storage" name="annotation-location-personal-storage"' + checked + ' /><label for="annotation-location-personal-storage">Personal storage</label>');
      }
      s = 'Store at: ' + inputs.join('');
      return s;
    },

    getPublicationStatusOptionsHTML: function(options) {
      options = options || {};
      var s = '', selectedIRI = '';

      if ('selected' in options) {
        selectedIRI = options.selected;
        if (selectedIRI == '') {
          s += '<option selected="selected" value="">Choose a publication status</option>';
        }
      }
      else {
        selectedIRI = DO.C.Vocab['psodraft']['@id'];
      }

      Object.keys(DO.C.PublicationStatus).forEach(function(iri){
        var selected = (iri == selectedIRI) ? ' selected="selected"' : '';
        s += '<option value="' + iri + '" title="' + DO.C.PublicationStatus[iri].description  + '"' + selected + '>' + DO.C.PublicationStatus[iri].name  + '</option>';
      })

      return s;
    },


    getLanguageOptionsHTML: function(options) {
      options = options || {};
      var s = '', selectedLang = '';

      if ('selected' in options) {
        selectedLang = options.selected;
        if (selectedLang == '') {
          s += '<option selected="selected" value="">Choose a language</option>';
        }
      }
      else if(typeof DO.C.User.UI.Language !== 'undefined') {
        selectedLang = DO.C.User.UI.Language;
      }
      else {
        selectedLang = 'en';
      }

      Object.keys(DO.C.Languages).forEach(function(lang){
        selected = (lang == selectedLang) ? ' selected="selected"' : '';
        s += '<option' + selected + ' value="' + lang + '">' + DO.C.Languages[lang] + '</option>';
      });

      return s;
    },

    getLicenseOptionsHTML: function(options) {
      options = options || {};
      var s = '', selectedIRI = '';

      if ('selected' in options) {
        selectedIRI = options.selected;
        if (selectedIRI == '') {
          s += '<option selected="selected" value="">Choose a license</option>';
        }
      }
      else if(typeof DO.C.User.UI.License !== 'undefined') {
        selectedIRI = DO.C.User.UI.License;
      }
      else {
        selectedIRI = 'https://creativecommons.org/licenses/by/4.0/';
      }

      Object.keys(DO.C.License).forEach(function(iri){
        if(iri != 'NoLicense') {
          var selected = (iri == selectedIRI) ? ' selected="selected"' : '';
          s += '<option value="' + iri + '" title="' + DO.C.License[iri].description  + '"' + selected + '>' + DO.C.License[iri].name  + '</option>';
        }
      })

      return s;
    },

    getCitationOptionsHTML: function(type) {
      var type = type || 'cites';

      var s = '';
      Object.keys(DO.C.Citation).forEach(function(iri){
        s += '<option value="' + iri + '">' + DO.C.Citation[iri]  + '</option>';
      })

      return s;
    },

    initMath: function(config) {
      if (!DO.C.MathAvailable) { return; }

      config = config || {
        skipTags: ["script","noscript","style","textarea","pre","code", "math"],
        ignoreClass: "equation",
        MathML: {
          useMathMLspacing: true
        },
        tex2jax: {
          inlineMath: [["$","$"],["\\(","\\)"]],
          processEscapes: true
        },
        asciimath2jax: {
          delimiters: [['$','$'], ['`','`']]
        }
      }

      MathJax.Hub.Config(config);

      MathJax.Hub.Register.StartupHook("End Jax",function () {
        var BROWSER = MathJax.Hub.Browser;
        var jax = "SVG";
        if (BROWSER.isMSIE && BROWSER.hasMathPlayer) jax = "NativeMML";
        if (BROWSER.isFirefox) jax = "NativeMML";
        if (BROWSER.isSafari && BROWSER.versionAtLeast("5.0")) jax = "NativeMML";

        MathJax.Hub.setRenderer(jax);
      });
    },

    setDocumentRelation: function(rootNode, data, options) {
      rootNode = rootNode || document;
      if(!data || !options) { return; }

      var h = [];

      var dl = rootNode.querySelector('#' + options.id);

      data.forEach(function(d){
        var documentRelation = '<dd>' + DO.U.createRDFaHTML(d) + '</dd>';

        if(dl) {
          if (DO.C.DocumentItems.indexOf(options.id) > -1) {
            dd = dl.querySelector('dd');
            dl.removeChild(dd);
          }
          else {
            var relation = dl.querySelector('[rel="' + d.rel +  '"][href="' + d.href  + '"]');

            if(relation) {
              dd = relation.closest('dd');
              if(dd) {
                dl.removeChild(dd);
              }
            }
          }
          dl.insertAdjacentHTML('beforeend', documentRelation);
        }
        else {
          h.push(documentRelation);
        }
      });

      if(h.length > 0) {
        var html = '<dl id="' + options.id + '"><dt>' + options.title + '</dt>' + h.join('') + '</dl>';
        rootNode = doc.insertDocumentLevelHTML(rootNode, html, { 'id': options.id });
      }

      return rootNode;
    },

    setEditSelections: function(options) {
      var options = options || {};

      if (!('datetime' in options)) {
        options['datetime'] = new Date();
      }

      var documentAuthor = 'authors';
      var documentAuthorName = 'author-name';
      var dA = document.getElementById(documentAuthor);

      if(dA) {
        if (dA.classList && dA.classList.contains('do') > -1) {
          dA.removeAttribute('class');
        }
        dA.removeAttribute('contenteditable');
      }

      var dANS = document.querySelectorAll('#' + documentAuthorName + ' .selected');
      dANS.forEach(function(authorNameSelected) {
        authorNameSelected.removeAttribute('class');
        authorNameSelected.removeAttribute('contenteditable');
      });

      var dANE = document.querySelectorAll('#' + documentAuthorName + ' .do');
      dANE.forEach(function(i){
        i.parentNode.removeChild(i);
      });

      var dd = document.querySelectorAll('#' + documentAuthorName + ' dd');
      if(dA && dd.length == 0) {
        dA = document.getElementById(documentAuthor);
        dA.parentNode.removeChild(dA);
      }


      var documentLanguage = 'document-language';
      var dLangS = document.querySelector('#' + documentLanguage + ' option:checked');

      if (dLangS) {
        var languageValue = dLangS.value;

        var dl = dLangS.closest('#' + documentLanguage);
        dl.removeAttribute('contenteditable');

        if(languageValue == '') {
          dl.parentNode.removeChild(dl);
        }
        else {
          dl.removeAttribute('class');
          var dd = dLangS.closest('dd');
          dd.parentNode.removeChild(dd);
          dd = '<dd><span content="' + languageValue + '" lang="" property="dcterms:language" xml:lang="">' + DO.C.Languages[languageValue] + '</span></dd>';
          dl.insertAdjacentHTML('beforeend', dd);
        }
      }


      var documentLicense = 'document-license';
      var dLS = document.querySelector('#' + documentLicense + ' option:checked');

      if (dLS) {
        var licenseIRI = dLS.value;

        var dl = dLS.closest('#' + documentLicense);
        dl.removeAttribute('contenteditable');

        if(licenseIRI == '') {
          dl.parentNode.removeChild(dl);
        }
        else {
          dl.removeAttribute('class');
          var dd = dLS.closest('dd');
          dd.parentNode.removeChild(dd);
          dd = '<dd><a href="' + licenseIRI+ '" rel="schema:license" title="' + DO.C.License[licenseIRI].description + '">' + DO.C.License[licenseIRI].name + '</a></dd>';
          dl.insertAdjacentHTML('beforeend', dd);
        }
      }


      var documentStatus = 'document-status';
      var dLS = document.querySelector('#' + documentStatus + ' option:checked');

      if (dLS) {
        var statusIRI = dLS.value;

        var dl = dLS.closest('#' + documentStatus);
        dl.removeAttribute('contenteditable');

        if(statusIRI == '') {
          dl.parentNode.removeChild(dl);
        }
        else {
          dl.removeAttribute('class');
          var dd = dLS.closest('dd');
          dd.parentNode.removeChild(dd);
          dd = '<dd prefix="pso: http://purl.org/spar/pso/" rel="pso:holdsStatusInTime" resource="#' + util.generateAttributeId() + '"><span rel="pso:withStatus" resource="' + statusIRI  + '" typeof="pso:PublicationStatus">' + DO.C.PublicationStatus[statusIRI].name + '</span></dd>';

          dl.insertAdjacentHTML('beforeend', dd);

          if (statusIRI == 'http://purl.org/spar/pso/published') {
            doc.setDate(document, { 'id': 'document-published', 'property': 'schema:datePublished', 'title': 'Published', 'datetime': options.datetime });
          }
        }
      }
    },

    getResourceInfo: function(data, options) {
      data = data || doc.getDocument();

      var info = {
        'state': DO.C.Vocab['ldpRDFSource']['@id'],
        'profile': DO.C.Vocab['ldpRDFSource']['@id']
      };

      options = options || {};

      options['contentType'] = ('contentType' in options) ? options.contentType : 'text/html';
      options['subjectURI'] = ('subjectURI' in options) ? options.subjectURI : uri.stripFragmentFromString(document.location.href);

      return graph.getGraphFromData(data, options).then(
        function(i){
          var s = SimpleRDF(DO.C.Vocab, options['subjectURI'], i, ld.store).child(options['subjectURI']);
// console.log(s);

          info['graph'] = s;
          info['rdftype'] = s.rdftype._array;
          info['profile'] = DO.C.Vocab['ldpRDFSource']['@id'];

          //Check if the resource is immutable
          s.rdftype.forEach(function(resource) {
            if (resource == DO.C.Vocab['memMemento']['@id']) {
              info['state'] = DO.C.Vocab['memMemento']['@id'];
            }
          });

          if (s.reloriginal) {
            info['state'] = DO.C.Vocab['memMemento']['@id'];
            info['original'] = s.memoriginal;

            if (s.reloriginal == options['subjectURI']) {
              //URI-R (The Original Resource is a Fixed Resource)

              info['profile'] = DO.C.Vocab['memOriginalResource']['@id'];
            }
            else {
              //URI-M

              info['profile'] = DO.C.Vocab['memMemento']['@id'];
            }
          }

          if (s.memmemento) {
            //URI-R

            info['profile'] = DO.C.Vocab['memOriginalResource']['@id'];
            info['memento'] = s.memmemento;
          }

          if(s.memoriginal && s.memmemento && s.memoriginal != s.memmemento) {
            //URI-M (Memento without a TimeGate)

            info['profile'] = DO.C.Vocab['memMemento']['@id'];
            info['original'] = s.memoriginal;
            info['memento'] = s.memmemento;
          }

          if(s.rellatestversion) {
            info['latest-version'] = s.rellatestversion;
          }

          if(s.relpredecessorversion) {
            info['predecessor-version'] = s.relpredecessorversion;
          }

          if(s.memtimemap) {
            info['timemap'] = s.memtimemap;
          }

          if(s.memtimegate) {
            info['timegate'] = s.memtimegate;
          }

// console.log(info);

          if(!DO.C.OriginalResourceInfo || ('mode' in options && options.mode == 'update' )) {
            DO.C['OriginalResourceInfo'] = info;
          }

          DO.C['ResourceInfo'] = info;

          return info;
      });
    },

    Editor: {
      disableEditor: function(e) {
    //    _mediumEditors[1].destroy();
        DO.C.EditorEnabled = false;
        DO.C.User.Role = 'social';
        DO.U.updateDocumentTitle();
        // document.removeEventListener('click', DO.U.updateDocumentTitle);
        return DO.U.Editor.MediumEditor.destroy();
      },

      enableEditor: function(editorMode, e, selector) {
        if (typeof DO.U.Editor.MediumEditor !== 'undefined') {
          DO.U.Editor.disableEditor();
        }

        if (e || (typeof e === 'undefined' && editorMode == 'author')) {
          doc.showActionMessage(document.documentElement, 'Activated <strong>' + editorMode + '</strong> mode.');
        }

        if (!document.getElementById('document-editor')) {
          document.documentElement.appendChild(util.fragmentFromString('<aside id="document-editor" class="do"></aside>'))
        }

        var editorOptions = {
          author: {
            id: 'author',
            elementsContainer: document.getElementById('document-editor'),
            placeholder: {
              text: ["Make it so!", "This is not a Paper", "Cogito Ergo Sum", "Do One Thing and Do It Well", "Free Your Mind", "Do or Do Not"][Math.floor(Math.random() * 6)]
            },
            disableDoubleReturn: true,
            paste: {
              forcePlainText: false,
              cleanPastedHTML: true,
              cleanReplacements: [],
              cleanAttrs: ['class', 'style', 'dir'],
              cleanTags: ['area', 'basefont', 'br', 'font', 'hr', 'isindex', 'link', 'script', 'style', 'wbr']
            },
            buttonLabels: DO.C.Editor.ButtonLabelType,
            toolbar: {
              buttons: ['h2', 'h3', 'h4', 'em', 'strong', 'orderedlist', 'unorderedlist', 'code', 'pre', 'anchor', 'q', 'image', 'sparkline', 'rdfa', 'cite', 'note'],
              diffLeft: 0,
              diffTop: -10,
              allowMultiParagraphSelection: false
            },
            anchorPreview: false,
            extensions: {
              'h2': new DO.U.Editor.Button({action:'h2', label:'h2'}),
              'h3': new DO.U.Editor.Button({action:'h3', label:'h3'}),
              'h4': new DO.U.Editor.Button({action:'h4', label:'h4'}),
              'em': new DO.U.Editor.Button({action:'em', label:'em'}),
              'strong': new DO.U.Editor.Button({action:'strong', label:'strong'}),
              'code': new DO.U.Editor.Button({action:'code', label:'code'}),
              'q': new DO.U.Editor.Button({action:'q', label:'q'}),
              'image': new DO.U.Editor.Button({action:'image', label:'image'}),
              'sparkline': new DO.U.Editor.Note({action:'sparkline', label:'sparkline'}),
              'rdfa': new DO.U.Editor.Note({action:'rdfa', label:'rdfa'}),
              'cite': new DO.U.Editor.Note({action:'cite', label:'cite'}),
              'note': new DO.U.Editor.Note({action:'note', label:'note'})
            }
          },

          social: {
            id: 'social',
            elementsContainer: document.getElementById('document-editor'),
            buttonLabels: DO.C.Editor.ButtonLabelType,
            toolbar: {
              buttons: ['selector', 'share', 'approve', 'disapprove', 'specificity', 'bookmark', 'note'],
              allowMultiParagraphSelection: false
            },
            disableEditing: true,
            anchorPreview: false,
            extensions: {
              'selector': new DO.U.Editor.Note({action:'selector', label:'selector'}),
              'share': new DO.U.Editor.Note({action:'share', label:'share'}),
              'bookmark': new DO.U.Editor.Note({action:'bookmark', label:'bookmark'}),
              'approve': new DO.U.Editor.Note({action:'approve', label:'approve'}),
              'disapprove': new DO.U.Editor.Note({action:'disapprove', label:'disapprove'}),
              'specificity': new DO.U.Editor.Note({action:'specificity', label:'specificity'}),
              'note': new DO.U.Editor.Note({action:'article', label:'note'})
            }
          }
        };

        if('MathJax' in window) {
          editorOptions.author.extensions['math'] = new DO.U.Editor.Button({action:'math', label:'math'});
          editorOptions.author.toolbar.buttons.splice(7, 0, 'math');
        }

        if('MediumEditorTable' in window) {
          editorOptions.author.extensions['table'] = new MediumEditorTable();
          editorOptions.author.toolbar.buttons.splice(10, 0, 'table');
        }

        var eNodes = selector || doc.selectArticleNode(document);
        var eOptions = editorOptions[editorMode];
        DO.C.User.Role = editorMode;
        storage.updateLocalStorageProfile(DO.C.User);

        if (typeof MediumEditor !== 'undefined') {
          DO.U.Editor.MediumEditor = new MediumEditor(eNodes, eOptions);
          DO.C.EditorEnabled = true;

          if (e && e.target.closest('button.editor-enable')) {
            DO.C.ContentEditable = true;
            // document.addEventListener('click', DO.U.updateDocumentTitle);
            DO.U.updateDocumentTitle();

            //FIXME: This is a horrible way of hacking MediumEditorTable
            document.querySelectorAll('i.fa-table, i.fa-link, i.fa-picture-o').forEach(function(i){
              var icon = template.Icon[".fas.fa-table.fa-2x"].replace(/ fa\-2x/, '');

              if (i.classList.contains('fa-link') > 0) {
                icon = template.Icon[".fas.fa-link"];
              }
              else if (i.classList.contains('fa-image') > 0) {
                icon = template.Icon[".fas.fa-image"];
              }

              i.parentNode.replaceChild(util.fragmentFromString(icon), i);
            });

            var documentAuthors = 'authors';
            var authors = document.getElementById(documentAuthors);
            var authorName = 'author-name';

            if (!authors) {
              var authors = '<div class="do" id="' + documentAuthors + '"><dl id="' + authorName + '"><dt>Authors</dt></dl></div>';
              doc.insertDocumentLevelHTML(document, authors, { 'id': documentAuthors });
              authors = document.getElementById(documentAuthors);
            }

            var documentAuthorName = document.getElementById(authorName);

            var sa = DO.C['ResourceInfo'].graph.schemaauthor;

            //If not one of the authors, offer to add self
            if(DO.C.User.IRI && sa.indexOf(DO.C.User.IRI) < 0){
              var userHTML = auth.getUserHTML({'avatarSize': 32});
              var authorId = (DO.C.User.Name) ? ' id="' + util.generateAttributeId(null, DO.C.User.Name) + '"' : '';

              documentAuthorName.insertAdjacentHTML('beforeend', '<dd class="do"' + authorId + ' inlist="" rel="bibo:authorList" resource="' + DO.C.User.IRI + '"><span about="" rel="schema:author">' + userHTML + '</span><button class="add-author-name" contenteditable="false" title="Add author">' + template.Icon[".fas.fa-plus"] + '</button></dd>');
            }

            //Invite other authors
            documentAuthorName.insertAdjacentHTML('beforeend', '<dd class="do"><button class="invite-author" contenteditable="false" title="Invite people to author">' + template.Icon[".fas.fa-bullhorn"] + '</button></dd>');
            authors = document.getElementById(documentAuthors);

            authors.addEventListener('click', function(e){
              var button = e.target.closest('button.add-author-name');
              if(button){
                e.target.closest('dd').classList.add('selected');
                button.parentNode.removeChild(button);
              }

              if (e.target.closest('button.invite-author')) {
                DO.U.shareResource(e);
                e.target.removeAttribute('disabled');
              }
            });

            var documentLanguage = 'document-language';
            var language = document.getElementById(documentLanguage);
            if(!language) {
              var dl = '        <dl class="do" id="' + documentLanguage + '"><dt>Language</dt><dd><select contenteditable="false" name="language">' + DO.U.getLanguageOptionsHTML({ 'selected': '' }) + '</select></dd></dl>';
              doc.insertDocumentLevelHTML(document, dl, { 'id': documentLanguage });

              var dLangS = document.querySelector('#' + documentLanguage + ' select');
              dLangS.addEventListener('change', function(e){
                dLangS.querySelectorAll('option').forEach(function(o){
                  o.removeAttribute('selected');
                });
                dLangS.querySelector('option[value="' + e.target.value + '"]').setAttribute('selected', 'selected');
              });
            }

            var documentLicense = 'document-license';
            var license = document.getElementById(documentLicense);
            if(!license) {
              var dl = '        <dl class="do" id="' + documentLicense + '"><dt>License</dt><dd><select contenteditable="false" name="license">' + DO.U.getLicenseOptionsHTML({ 'selected': '' }) + '</select></dd></dl>';
              doc.insertDocumentLevelHTML(document, dl, { 'id': documentLicense });

              var dLS = document.querySelector('#' + documentLicense + ' select');
              dLS.addEventListener('change', function(e){
                dLS.querySelectorAll('option').forEach(function(o){
                  o.removeAttribute('selected');
                });
                dLS.querySelector('option[value="' + e.target.value + '"]').setAttribute('selected', 'selected');
              });
            }

            var documentStatus = 'document-status';
            var status = document.getElementById(documentStatus);
            if(!status) {
              var dl = '        <dl class="do" id="' + documentStatus + '"><dt>Document Status</dt><dd><select contenteditable="false" name="status">' + DO.U.getPublicationStatusOptionsHTML({ 'selected': '' }) + '</select></dd></dl>';
              doc.insertDocumentLevelHTML(document, dl, { 'id': documentStatus });

              var dSS = document.querySelector('#' + documentStatus + ' select');
              dSS.addEventListener('change', function(e){
                dSS.querySelectorAll('option').forEach(function(o){
                  o.removeAttribute('selected');
                });
                dSS.querySelector('option[value="' + e.target.value + '"]').setAttribute('selected', 'selected');
              });
            }
          }
          else if (e && e.target.closest('button.editor-disable')) {
            DO.U.setEditSelections();
          }

          document.querySelectorAll('.do').forEach(function(node){
            node.setAttribute('contenteditable', 'false');
          })

          return DO.U.Editor.MediumEditor;
        }
      },

      Button: (function () {
        if (typeof MediumEditor !== 'undefined') {
          MediumEditor.extensions.button.prototype.defaults.unorderedlist.contentFA = template.Icon[".fas.fa-link-ul"];

          MediumEditor.extensions.button.prototype.defaults.orderedlist.contentFA = template.Icon[".fas.fa-link-ol"];

          MediumEditor.extensions.button.prototype.defaults.image.contentFA = template.Icon[".fas.fa-image"];

          MediumEditor.extensions.button.prototype.defaults.pre.contentFA = template.Icon[".fas.fa-code"];

          return MediumEditor.extensions.button.extend({
            init: function () {
              this.name = this.label;
              this.action = this.action;
              this.aria = this.label;
              this.tagNames = [this.action];
              this.useQueryState = true;
              this.contentDefault = '<b>' + this.label + '</b>';

              switch(this.action) {
                case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': this.contentFA = template.Icon[".fas.fa-header"] + parseInt(this.action.slice(-1)); break;

                case 'em': this.contentFA = template.Icon[".fas.fa-italic"]; break;

                case 'strong': this.contentFA = template.Icon[".fas.fa-bold"]; break;

                case 'image': this.contentFA = template.Icon[".fas.fa-image"]; break;

                case 'q': this.contentFA = template.Icon[".fas.fa-quote-right"]; break;

                case 'math': this.contentFA = template.Icon[".fas.fa-calculator"]; break;
                default: break;
              }

              this.button = this.createButton();
              this.on(this.button, 'click', this.handleClick.bind(this));

              //TODO: Listen to section hX changes and update section @id and span @class do.fragment
            },

            // getButton: function() {
            //   console.log('DO.U.Editor.Button.Note.getButton()');
            //   return this.button;
            // },

            handleClick: function(event) { //, editable
        //console.log('DO.U.Editor.Button.handleClick()');
// console.log(this);
              event.preventDefault();
              event.stopPropagation();

              var action = this.getAction();
              var tagNames = this.getTagNames();
              var button = this.getButton();

              if (this.isActive()) {
                return this.base.execAction('removeFormat');
              }
              else {
                var datetime = ' ' + DO.U.createAttributeDateTime(this.action);

                this.base.selectedDocument = this.document;
                this.base.selection = MediumEditor.selection.getSelectionHtml(this.base.selectedDocument);
                //.replace(DO.C.Editor.regexEmptyHTMLTags, '');
// console.log('this.base.selection:');
// console.log(this.base.selection);

                var selectedParentElement = this.base.getSelectedParentElement();
// console.log('getSelectedParentElement:');
// console.log(selectedParentElement);
                var parentSection = MediumEditor.util.getClosestTag(selectedParentElement, 'section');
// console.log(parentSection);

                //XXX: DO NOT REMOVE. Saving the selection should be before inserting/updating HTML.
                this.base.saveSelection();

                switch(this.action) {
                  case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                    //XXX: Which heading level are we at?
                    var parentSectionHeading = '';
                    for (var i = 0; i < parentSection.childNodes.length; i++) {
                      parentSectionHeading = parentSection.childNodes[i].nodeName.toLowerCase();
                      if(DO.C.Editor.headings.indexOf(parentSectionHeading) > 0) {
// console.log(parentSectionHeading);
                        break;
                      }
                    }
                    var pSH = parseInt(parentSectionHeading.slice(-1));

                    //XXX: Which heading level is the action?
                    var cSH = parseInt(this.action.slice(-1));
// console.log("parentH: " + pSH);
// console.log("currentH: " + cSH);
// console.log(cSH-pSH);

                    var closePreviousSections = '';
                    // if (cSH > pSH) {}
                    for (i = 0; i <= (pSH-cSH); i++) {
                      console.log("i: " + i);
                      closePreviousSections += '</div></section>';
                    }
// console.log(closePreviousSections);
// console.log(this.base.selection);
// var doc = this.document;
                    var selection = window.getSelection();
// console.log(this.base.selection);
// console.log(selection);

                    if (selection.rangeCount) {
                      range = selection.getRangeAt(0);
                      parent = selectedParentElement;

// console.log(range);
                      //Section
                      var sectionId = util.generateAttributeId(null, this.base.selection);
                      var section = document.createElement('section');
                      section.id = sectionId;
                      section.setAttribute('rel', 'schema:hasPart');
                      section.setAttribute('resource', '#' + sectionId);
// console.log(section);


                      //Heading
                      var heading = document.createElement(tagNames[0]);
                      heading.setAttribute('property', 'schema:name');
                      heading.innerHTML = this.base.selection;
// console.log(heading);
// console.log(selection);


                      var divDescription = parentSection.getElementsByTagName('div')[0];
// console.log(divDescription);
// console.log(divDescription.innerHTML);
// console.log(divDescription.childNodes);
// console.log(divDescription.length);
// console.log(selectedParentElement);
// console.log(selectedParentElement.childNodes);
// console.log(selectedParentElement.lastChild);
// console.log(selectedParentElement.lastChild.length);

                      r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startContainer);
// console.log(r.startOffset);
// console.log(r.endOffset);
                      //Remaining nodes
                      var r = document.createRange();
                      r.setStart(selection.focusNode, selection.focusOffset);
                      r.setEnd(selectedParentElement.lastChild, selectedParentElement.lastChild.length);
// console.log(r.commonAncestorContainer.nodeType);

// console.log(r.startContainer);
// console.log(r.endContainer);
// console.log(selection.anchorNode);
// selection.removeAllRanges(); //XXX: is this doing anything?
// selection.addRange(r);

// console.log(selection.anchorNode);
                      var fragment = r.extractContents();
// console.log(fragment);
// console.log(selection);
// r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startContainer);
// console.log(r.startOffset);
// console.log(r.endOffset);
                      if (fragment.firstChild.nodeType === 3) {
                        //TODO: trim only if there is one child which is a textnode
                        // fragment.firstChild.nodeValue = fragment.firstChild.nodeValue.trim();

// console.log(fragment);
                        var sPE = selectedParentElement.nodeName.toLowerCase();
                        switch(sPE) {
                          case "p": default:
                            var xSPE = document.createElement(sPE);
                            xSPE.appendChild(fragment.cloneNode(true));
                            fragment = util.fragmentFromString(xSPE.outerHTML);
                            break;
                          //TODO: Other cases?
                        }
                      }
// console.log(fragment);
// console.log(selection);

                      r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startContainer);
// console.log(r.startOffset);
// console.log(r.endOffset);
// var remainingNodes = document.createElement('div');
// remainingNodes.appendChild(fragment.cloneNode(true));
// console.log(remainingNodes);


                      //Description
                      var div = document.createElement('div');
                      div.setAttribute('property', 'schema:description');
                      div.appendChild(fragment.cloneNode(true));

                      //Put it together
                      section.appendChild(heading);
                      section.appendChild(div);
// console.log(range.startContainer);

                      var selectionUpdated = document.createElement('div');
                      selectionUpdated.appendChild(section);
                      selectionUpdated = selectionUpdated.innerHTML;
// console.log(selectionUpdated);
// range.deleteContents();
// MediumEditor.util.insertHTMLCommand(this.document, closePreviousSections);
// MediumEditor.extensions.paste(closePreviousSections);

                      //Sub-section
                      if (cSH-pSH > 0) {
                        MediumEditor.util.insertHTMLCommand(this.base.selectedDocument, selectionUpdated);

                        // This doesn't seem to be needed anymore?
                        // MediumEditor.selection.select(this.base.selectedDocument, heading, 0);
                      }
                      else {
// console.log(selection);
// console.log(parentSection);
                        MediumEditor.selection.selectNode(parentSection, document);
                        r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startOffset);
// console.log(r.endOffset);


                        //This selection is based off previous operations; handling remaining Nodes after the selection. So, this is not accurate per se.. the range might be accurate.
                        selection = window.getSelection();
// console.log(selection);
                        r = selection.getRangeAt(0);
// console.log(r);
// console.log(r.startOffset);
// console.log(r.endOffset);


                        r = document.createRange();
                        r.setStartAfter(parentSection);
// console.log(r);
                        r.setEndAfter(parentSection);
// console.log(r);
                        r.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(r);
// console.log(selection);
                        var foo = document.createElement('div');
                        foo.appendChild(parentSection);
                        parentSection = foo.innerHTML;
// console.log(parentSection + selectionUpdated);
                        MediumEditor.util.insertHTMLCommand(this.base.selectedDocument, parentSection + selectionUpdated);

                        // MediumEditor.selection.select(this.base.selectedDocument, heading, 0);
                        // parentSection.parentNode.insertBefore(section, parentSection.nextSibling);
                      }
                    }

                    this.base.restoreSelection();
                    this.base.checkSelection();
                    break;

                  case 'math':
                    var QUEUE = MathJax.Hub.Queue;  // shorthand for the queue
                    var math = null;                // the element jax for the math output.

                    var selection = this.base.selection;

                    var selectionId = util.generateAttributeId();

                    var selectionUpdated = '<span id="' + selectionId + '">$$</span>';

                    MediumEditor.util.insertHTMLCommand(this.base.selectedDocument, selectionUpdated);

                    MathJax.Hub.Queue(["Typeset", MathJax.Hub, selectionId]);
                    var math = MathJax.Hub.getAllJax(selectionId)[0];
                    MathJax.Hub.Queue(["Text", math, selection]);

                    MediumEditor.selection.selectNode(document.getElementById(selectionId), document);
                    break;

                  //XXX: This is used for non-built-in buttons
                  default:
                    var selectionUpdated = '<' + tagNames[0] + datetime + '>' + this.base.selection + '</' + tagNames[0] + '>';

                    if (this.action == 'image') {
                      var imgOptions = this.base.selection.split("|");

                      var src = imgOptions[0];
                      var alt = '';
                      var width = '';
                      var height = '';

                      //https://example/foo.jpg|figure|480x320|Hello world
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
                          var widthHeight = imgOptions[2].split('x');

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

                    MediumEditor.util.insertHTMLCommand(this.base.selectedDocument, selectionUpdated);
                    this.base.restoreSelection();
                    this.base.checkSelection();

                    break;
                }

                this.setActive();
              }
            }
          });
        }
      })(),

      //Adapted from MediumEditor's Anchor Form
      Note: (function() {
        if (typeof MediumEditor !== 'undefined') {
          return MediumEditor.extensions.form.extend({
            /* Textarea Form Options */

            /* customClassOption: [string]  (previously options.anchorButton + options.anchorButtonClass)
             * Custom class name the user can optionally have added to their created links (ie 'button').
             * If passed as a non-empty string, a checkbox will be displayed allowing the user to choose
             * whether to have the class added to the created link or not.
             */
            customClassOption: null,

            /* customClassOptionText: [string]
             * text to be shown in the checkbox when the __customClassOption__ is being used.
             */
            customClassOptionText: 'Button',

            /* linkValidation: [boolean]  (previously options.checkLinkFormat)
             * enables/disables check for common URL protocols on anchor links.
             */
            linkValidation: false,

            /* placeholderText: [string]  (previously options.anchorInputPlaceholder)
             * text to be shown as placeholder of the anchor input.
             */
            placeholderText: "What’s up?",

            /* targetCheckbox: [boolean]  (previously options.anchorTarget)
             * enables/disables displaying a "Open in new window" checkbox, which when checked
             * changes the `target` attribute of the created link.
             */
            targetCheckbox: false,

            /* targetCheckboxText: [string]  (previously options.anchorInputCheckboxLabel)
             * text to be shown in the checkbox enabled via the __targetCheckbox__ option.
             */
            targetCheckboxText: 'Open in new window',

            // Options for the Button base class
            // name: this.name,
            // action: 'createLink',
            // aria: 'link',
            // tagNames: ['a'],
            // contentDefault: '<b>#</b>',
            // contentFA: '<i class="fa fa-sticky-note"></i>',

            init: function () {
              this.name = this.label;
              this.action = this.action;
              this.aria = this.label;
              this.tagNames = [this.action];
              this.useQueryState = true;
              this.contentDefault = '<b>' + this.label + '</b>';
              this.signInRequired = false;

              switch(this.action) {
                case 'cite': default:
                  this.contentFA = template.Icon[".fas.fa-hashtag"];
                  break;
                case 'article':
                  this.contentFA = template.Icon[".fas.fa-sticky-note"];
                  this.signInRequired = true;
                  break;
                case 'note':
                  this.contentFA = template.Icon[".fas.fa-sticky-note"];
                  break;
                case 'rdfa':
                  this.contentFA = template.Icon[".fas.fa-rocket"];
                  break;
                case 'selector':
                  this.contentFA = template.Icon[".fas.fa-anchor"];
                  break;
                case 'bookmark':
                  this.contentFA = template.Icon[".fas.fa-bookmark"];
                  this.signInRequired = true;
                  break;
                case 'share':
                  this.contentFA = template.Icon[".fas.fa-bullhorn"];
                  this.signInRequired = true;
                  break;
                case 'approve':
                  this.contentFA = template.Icon[".fas.fa-thumbs-up"];
                  this.signInRequired = true;
                  break;
                case 'disapprove':
                  this.contentFA = template.Icon[".fas.fa-thumbs-down"];
                  this.signInRequired = true;
                  break;
                case 'specificity':
                  this.contentFA = template.Icon[".fas.fa-crosshairs"];
                  this.signInRequired = true;
                  break;
                case 'sparkline':
                  this.contentFA = template.Icon[".fas.fa-chart-line"];
                  break;
              }
              MediumEditor.extensions.form.prototype.init.apply(this, arguments);

        //TODO: Change this bind key
        //      this.subscribe('editableKeydown', this.handleKeydown.bind(this));
        //      this.on(this.button, 'click', this.handleClick.bind(this));
            },

            // Called when the button the toolbar is clicked
            // Overrides ButtonExtension.handleClick
            handleClick: function (event) {
              event.preventDefault();
              event.stopPropagation();
              var _this = this;
              var showAction = function() {
                switch(_this.action) {
                  default:
                    var range = MediumEditor.selection.getSelectionRange(_this.document);

                    if (range.startContainer.nodeName.toLowerCase() === 'a' ||
                      range.endContainer.nodeName.toLowerCase() === 'a' ||
                      MediumEditor.util.getClosestTag(MediumEditor.selection.getSelectedParentElement(range), 'a')) {
                      return _this.execAction('unlink');
                    }

                    if (DO.U.Editor.MediumEditor.options.id == 'social' && _this.action == 'selector'){
                      var opts = {
                        license: 'https://creativecommons.org/licenses/by/4.0/',
                        content: 'Liked'
                      }
                      _this.completeFormSave(opts);
                    }
                    else if (!_this.isDisplayed()) {
                      _this.showForm();
                    }
                    break;

                  case 'share':
                    _this.base.restoreSelection();
                    var resourceIRI = uri.stripFragmentFromString(document.location.href);
                    var node = _this.base.getSelectedParentElement().closest('[id]');
                    resourceIRI = (node && node.id) ? resourceIRI + '#' + node.id : resourceIRI;
                    _this.window.getSelection().removeAllRanges();
                    _this.base.checkSelection();
                    DO.U.shareResource(null, resourceIRI);
                    break;
                }
              };

              var updateAnnotationServiceForm = function() {
                var annotationServices = document.querySelectorAll('.annotation-location-selection');
                for (var i = 0; i < annotationServices.length; i++) {
                  annotationServices[i].innerHTML = DO.U.getAnnotationLocationHTML();
                }
              };

              var updateAnnotationInboxForm = function() {
                var annotationInbox = document.querySelectorAll('.annotation-inbox');
                for (var i = 0; i < annotationInbox.length; i++) {
                  annotationInbox[i].innerHTML = DO.U.getAnnotationInboxLocationHTML();
                }
              };

              updateAnnotationServiceForm();
              updateAnnotationInboxForm();

              return inbox.getEndpoint(DO.C.Vocab['oaannotationService']['@id']).then(
                function(url) {
                  DO.C.AnnotationService = url[0];
                  showAction();
                },
                function(reason) {
                  if(_this.signInRequired && !DO.C.User.IRI) {
                    auth.showUserIdentityInput();
                  }
                  else {
                    showAction();
                  }
                }
              );
            },

            // Called when user hits the defined shortcut (CTRL / COMMAND + K)
            handleKeydown: function (event) {
              if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.K) && MediumEditor.util.isMetaCtrlKey(event) && !event.shiftKey) {
                this.handleClick(event);
              }
            },

            // Called by medium-editor to append form to the toolbar
            getForm: function () {
              if (!this.form) {
                this.form = this.createForm();
              }
              return this.form;
            },

            getTemplate: function () {
              var tmpl = [];
              switch(this.action) {
                case 'rdfa':
                  tmpl = [
                  '<label for="rdfa-about">about</label><input id="rdfa-about" class="medium-editor-toolbar-input" placeholder="https://example.org/foo#bar" /><br/>',
                  '<label for="rdfa-resource">resource</label><input id="rdfa-resource" class="medium-editor-toolbar-input" placeholder="https://example.net/baz" /><br/>',
                  '<label for="rdfa-typeof">typeof</label><input id="rdfa-typeof" class="medium-editor-toolbar-input" placeholder="https://example.net/baz" /><br/>',
                  '<label for="rdfa-rel">rel</label><input id="rdfa-rel" class="medium-editor-toolbar-input" placeholder="schema:url"><br/>',
                  '<label for="rdfa-property">property</label><input id="rdfa-property" class="medium-editor-toolbar-input" placeholder="schema:name" /><br/>',
                  '<label for="rdfa-href">href</label><input id="rdfa-href" class="medium-editor-toolbar-input" placeholder="https://example.net/baz" /><br/>',
                  '<label for="rdfa-content">content</label><input id="rdfa-content" class="medium-editor-toolbar-input" placeholder="Baz" /><br/>',
                  '<label for="rdfa-language">language</label><input id="rdfa-language" class="medium-editor-toolbar-input" placeholder="en" /><br/>',
                  '<label for="rdfa-datatype">datatype</label><input id="rdfa-datatype" class="medium-editor-toolbar-input" placeholder="https://example.net/baz" /><br/>'
                  ];
                  break;
                case 'article':
                  tmpl = [
                  '<textarea id="article-content" name="content" cols="20" rows="5" class="medium-editor-toolbar-textarea" placeholder="', this.placeholderText, '"></textarea>',
                  '<select id="article-language" name="language" class="medium-editor-toolbar-select">', DO.U.getLanguageOptionsHTML(), '</select>',
                  '<select id="article-license" name="license" class="medium-editor-toolbar-select">',
                  DO.U.getLicenseOptionsHTML(),
                  '</select>',
                  '<span class="annotation-location-selection">' + DO.U.getAnnotationLocationHTML() + '</span>',
                  '<span class="annotation-inbox">' + DO.U.getAnnotationInboxLocationHTML() + '</span>'
                  ];
                  break;
                case 'note':
                  tmpl = [
                  '<label for="bookmark-tagging">Tags</label> <input id="bookmark-tagging" class="medium-editor-toolbar-input" placeholder="Separate tags with commas" /><br/>',
                  '<textarea id="article-content" name="content" cols="20" rows="1" class="medium-editor-toolbar-textarea" placeholder="', this.placeholderText, '"></textarea>',
                  '<select id="article-language" name="language" class="medium-editor-toolbar-select">', DO.U.getLanguageOptionsHTML(), '</select>',
                  '<select id="article-license" name="license" class="medium-editor-toolbar-select">',
                  DO.U.getLicenseOptionsHTML(),
                  '</select>'
                  ];
                  break;
                case 'approve':
                  tmpl = [
                  '<textarea id="approve-content" name="content" cols="20" rows="2" class="medium-editor-toolbar-textarea" placeholder="Strong point? Convincing argument?"></textarea>',
                  '<select id="article-language" name="language" class="medium-editor-toolbar-select">', DO.U.getLanguageOptionsHTML(), '</select>',
                  '<select id="approve-license" name="license" class="medium-editor-toolbar-select">',
                  DO.U.getLicenseOptionsHTML(),
                  '</select>',
                  '<span class="annotation-location-selection">' + DO.U.getAnnotationLocationHTML() + '</span>',
                  '<span class="annotation-inbox">' + DO.U.getAnnotationInboxLocationHTML() + '</span>'
                  ];
                  break;
                case 'disapprove':
                  tmpl = [
                  '<textarea id="disapprove-content" name="content" cols="20" rows="2" class="medium-editor-toolbar-textarea" placeholder="Weak point? Error? Inaccurate?"></textarea>',
                  '<select id="article-language" name="language" class="medium-editor-toolbar-select">', DO.U.getLanguageOptionsHTML(), '</select>',
                  '<select id="disapprove-license" name="license" class="medium-editor-toolbar-select">',
                  DO.U.getLicenseOptionsHTML(),
                  '</select>',
                  '<span class="annotation-location-selection">' + DO.U.getAnnotationLocationHTML() + '</span>',
                  '<span class="annotation-inbox">' + DO.U.getAnnotationInboxLocationHTML() + '</span>'
                  ];
                  break;
                case 'specificity':
                  tmpl = [
                  '<textarea id="specificity-content" name="content" cols="20" rows="2" class="medium-editor-toolbar-textarea" placeholder="Citation or specificity needed?"></textarea>',
                  '<select id="article-language" name="language" class="medium-editor-toolbar-select">', DO.U.getLanguageOptionsHTML(), '</select>',
                  '<select id="specificity-license" name="license" class="medium-editor-toolbar-select">',
                  DO.U.getLicenseOptionsHTML(),
                  '</select>',
                  '<span class="annotation-location-selection">' + DO.U.getAnnotationLocationHTML() + '</span>',
                  '<span class="annotation-inbox">' + DO.U.getAnnotationInboxLocationHTML() + '</span>'
                  ];
                  break;
                case 'cite':
                  tmpl = [
                  '<input type="radio" name="citation-type" value="ref-footnote" id="ref-footnote" /> <label for="ref-footnote">Footnote</label>',
                  '<input type="radio" name="citation-type" value="ref-reference" id="ref-reference" /> <label for="ref-reference">Reference</label>',
                  '<select id="citation-relation" name="citation-relation" class="medium-editor-toolbar-select">',
                  DO.U.getCitationOptionsHTML(),
                  '</select>',
                  '<input type="text" name="citation-url" value="" id="citation-url" class="medium-editor-toolbar-input" placeholder="http://example.org/article#results" />',
                  '<textarea id="citation-content" cols="20" rows="1" class="medium-editor-toolbar-textarea" placeholder="', this.placeholderText, '"></textarea>',
                  '<select id="article-language" name="language" class="medium-editor-toolbar-select">', DO.U.getLanguageOptionsHTML(), '</select>',
                  ];
                  break;
                case 'bookmark':
                  tmpl = [
                  '<label for="bookmark-tagging">Tags</label> <input id="bookmark-tagging" class="medium-editor-toolbar-input" placeholder="Separate tags with commas" /><br/>',
                  '<textarea id="bookmark-content" name="content" cols="20" rows="2" class="medium-editor-toolbar-textarea" placeholder="Description"></textarea>',
                  '<select id="article-language" name="language" class="medium-editor-toolbar-select">', DO.U.getLanguageOptionsHTML(), '</select>',
                  ];
                  break;
                case 'sparkline':
                  tmpl = [
                  '<input type="text" name="sparkline-search" value="" id="sparkline-search" class="medium-editor-toolbar-input" placeholder="Enter search terms" /><br/>',
                  '<input type="hidden" name="sparkline-selection-dataset" value="" id="sparkline-selection-dataset" />',
                  '<input type="hidden" name="sparkline-selection-refarea" value="" id="sparkline-selection-refarea" />'
                  ];
                  break;
                default:
                  tmpl = [
                  '<textarea cols="20" rows="1" class="medium-editor-toolbar-textarea" placeholder="', this.placeholderText, '"></textarea>'
                  ];
                  break;
              }

              tmpl.push(
                '<a href="#" class="medium-editor-toolbar-save" title="Save">',
                this.getEditorOption('buttonLabels') === 'fontawesome' ? template.Icon[".fas.fa-check"] : this.formSaveLabel,
                '</a>'
              );

              tmpl.push(
                '<a href="#" class="medium-editor-toolbar-close" title="Close">',
                this.getEditorOption('buttonLabels') === 'fontawesome' ? template.Icon[".fas.fa-times"] : this.formCloseLabel,
                '</a>'
              );

              // both of these options are slightly moot with the ability to
              // override the various form buildup/serialize functions.

              if (this.targetCheckbox) {
                // fixme: ideally, this targetCheckboxText would be a formLabel too,
                // figure out how to deprecate? also consider `fa-` icon default implcations.
                tmpl.push(
                  '<div class="medium-editor-toolbar-form-row">',
                  '<input type="checkbox" class="medium-editor-toolbar-textarea-target">',
                  '<label>',
                  this.targetCheckboxText,
                  '</label>',
                  '</div>'
                );
              }

              if (this.customClassOption) {
                // fixme: expose this `Button` text as a formLabel property, too
                // and provide similar access to a `fa-` icon default.
                tmpl.push(
                  '<div class="medium-editor-toolbar-form-row">',
                  '<input type="checkbox" class="medium-editor-toolbar-textarea-button">',
                  '<label>',
                  this.customClassOptionText,
                  '</label>',
                  '</div>'
                );
              }

              return tmpl.join('');

            },

            // Used by medium-editor when the default toolbar is to be displayed
            isDisplayed: function () {
              return this.getForm().style.display === 'block';
            },

            hideForm: function () {
              this.getForm().style.display = 'none';
              this.getInput().value = '';
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
                    Object.keys(DO.C.RefAreas).forEach(function(key) {
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
                    Object.keys(DO.C.RefAreas).forEach(function(key) {
                      refAreas += '<option value="' + key + '">' + key + ' - ' + DO.C.RefAreas[key] + '</option>';
                    });
                    form.querySelector('.medium-editor-toolbar-save').insertAdjacentHTML('beforebegin', '<div id="' + sparklineGraphId + '">`' + textInputB + '` is not available. Try: ' + '<select name="refAreas"><option>Select a reference area</option>' + refAreas + '</select></div>');
                    var rA = document.querySelector('#' + sparklineGraphId + ' select[name="refAreas"]');
                    rA.addEventListener('change', function(e) {
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

                  queryURL = uri.getProxyableIRI(queryURL);

                  form.querySelector('.medium-editor-toolbar-save').insertAdjacentHTML('beforebegin', '<div id="' + sparklineGraphId + '"></div>' + template.Icon[".fas.fa-circle-notch.fa-spin.fa-fw"]);
                  sG = document.getElementById(sparklineGraphId);

                  fetcher.getTriplesFromGraph(queryURL)
                    .then(function(triples){
                      sG.removeAttribute('class');
                      triples = DO.U.sortTriples(triples, { sortBy: 'object' });
                      return DO.U.getListHTMLFromTriples(triples, {element: 'select', elementId: resultContainerId});
                    })
                    .then(function(listHTML){
                      sG.innerHTML = listHTML;
                      form.removeChild(form.querySelector('.fas.fa-circle-notch.fa-spin.fa-fw'));
                    })
                    .then(function(x){
                      var rC = document.getElementById(resultContainerId);
                      rC.addEventListener('change', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var sparkline = sG.querySelectorAll('.sparkline, .sparkline-info');
                        for (var i = 0; i < sparkline.length; i++) {
                          sparkline[i].parentNode.removeChild(sparkline[i]);
                        }
                        form.querySelector('.medium-editor-toolbar-save').insertAdjacentHTML('beforebegin', template.Icon[".fas.fa-circle-notch.fa-spin.fa-fw"]);

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
                        queryURL = uri.getProxyableIRI(queryURL);

                        fetcher.getTriplesFromGraph(queryURL)
                          .then(function(triples){
// console.log(triples);
                            if(triples.length > 0) {
                              var observations = {};
                              triples.forEach(function(t){
                                var s = t.subject.nominalValue;
                                var p = t.predicate.nominalValue;
                                var o = t.object.nominalValue;
                                observations[s] = observations[s] || {};
                                observations[s][p] = o;
                              });
// console.log(observations);
                              var list = [], item;
                              Object.keys(observations).forEach(function(key) {
                                item = {};
                                observations[key]['http://purl.org/linked-data/cube#Observation'] = key;
                                item[key] = observations[key];
                                list.push(item[key]);
                              });
                              var sortByKey = 'http://purl.org/linked-data/sdmx/2009/dimension#refPeriod';
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
                case 'bookmark':
                  input.content.focus();
                  break;
                default:
                  input.focus();
                  break;
              }

              // If we have a target checkbox, we want it to be checked/unchecked
              // based on whether the existing link has target=_blank
              if (targetCheckbox) {
                targetCheckbox.checked = opts.target === '_blank';
              }

              // If we have a custom class checkbox, we want it to be checked/unchecked
              // based on whether an existing link already has the class
              if (buttonCheckbox) {
                var classList = opts.buttonClass ? opts.buttonClass.split(' ') : [];
                buttonCheckbox.checked = (classList.indexOf(this.customClassOption) !== -1);
              }
            },

            // Called by core when tearing down medium-editor (destroy)
            destroy: function () {
              if (!this.form) {
                return false;
              }

              if (this.form.parentNode) {
                this.form.parentNode.removeChild(this.form);
              }

              delete this.form;
            },

            // core methods

            getFormOpts: function () {
              // no notion of private functions? wanted `_getFormOpts`
              var targetCheckbox = this.getAnchorTargetCheckbox(),
                buttonCheckbox = this.getAnchorButtonCheckbox();
              var opts = {};

              switch(this.action) {
                case 'rdfa':
                  opts.about = this.getInput().about.value;
                  opts.rel = this.getInput().rel.value;
                  opts.href = this.getInput().href.value;
                  opts.typeOf = this.getInput().typeOf.value;
                  opts.resource = this.getInput().resource.value;
                  opts.property = this.getInput().property.value;
                  opts.content = this.getInput().content.value;
                  opts.datatype = this.getInput().datatype.value;
                  opts.language = this.getInput().language.value;
                  break;
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
                  opts.language = this.getInput().language.value;
                  opts.license = this.getInput().license.value;
                  break;
                case 'note':
                  opts.content = this.getInput().content.value;
                  opts.tagging = this.getInput().tagging.value;
                  opts.language = this.getInput().language.value;
                  opts.license = this.getInput().license.value;
                  break;
                case 'cite':
                  opts.citationType = this.getInput().citationType.value;
                  opts.citationRelation = this.getInput().citationRelation.value;
                  opts.url = this.getInput().url.value;
                  opts.content = this.getInput().content.value;
                  opts.language = this.getInput().language.value;
                  break;
                case 'bookmark':
                  opts.content = this.getInput().content.value;
                  opts.tagging = this.getInput().tagging.value;
                  opts.language = this.getInput().language.value;
                  break;
                case 'sparkline':
                  opts.search = this.getInput().search.value;
                  opts.select = this.getInput().select.value;
                  opts.sparkline = this.getInput().sparkline.innerHTML;
                  opts.selectionDataSet = this.getInput().selectionDataSet.value;
                  opts.selectionRefArea = this.getInput().selectionRefArea.value;
                  break;
                default:
                  opts.url = this.getInput().value;
                  break;

              }

              if (typeof opts.language !== 'undefined') {
                DO.C.User.UI['Language'] = opts.language;
              }
              if (typeof opts.license !== 'undefined') {
                DO.C.User.UI['License'] = opts.license;
              }

              storage.updateLocalStorageProfile(DO.C.User);

              opts.target = '_self';
              if (targetCheckbox && targetCheckbox.checked) {
                opts.target = '_blank';
              }

              if (buttonCheckbox && buttonCheckbox.checked) {
                opts.buttonClass = this.customClassOption;
              }

              Object.keys(opts).forEach(function(key) {
                if(typeof opts[key] === 'string') {
                  opts[key] = opts[key].trim();
                }
              });

              return opts;
            },

            doFormSave: function () {
              var opts = this.getFormOpts();
              this.completeFormSave(opts);
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
              prefix = DO.U.htmlEntities(prefix);

              var suffixEnd = Math.min(selectedParentElement.textContent.length, end + DO.C.ContextLength);
// console.log('sE ' + suffixEnd);
              var suffix = selectedParentElement.textContent.substr(end, suffixEnd - end);
// console.log('-' + suffix + '-');
              suffix = DO.U.htmlEntities(suffix);

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

              var datetime = util.getDateTimeISO();
              var id = util.generateAttributeId();
              var refId = 'r-' + id;
              // var noteId = 'i-' + id;

              var resourceIRI = uri.stripFragmentFromString(document.location.href);
              var containerIRI = window.location.href;

              var selectorIRI = resourceIRI + '#selector(type=TextQuoteSelector,prefix=' + encodeURIComponent(prefix) + ',exact=' + encodeURIComponent(exact) + ',suffix=' + encodeURIComponent(suffix) +')';

              var contentType = 'text/html';
              var noteIRI, noteURL;
              var profile;
              var options = {};
              var annotationDistribution = [] , aLS = {};

              if((opts.annotationLocationPersonalStorage && DO.C.User.Outbox) || (!opts.annotationLocationPersonalStorage && !opts.annotationLocationService && DO.C.User.Outbox)) {
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
                if (typeof DO.C.User.Storage === 'undefined') {
                  aLS['canonical'] = true;
                }

                aLS = Object.assign(aLS, contextProfile)

                annotationDistribution.push(aLS);
              }

              //XXX: Use this as the canonical if available. Note how noteIRI is treated later
              if((opts.annotationLocationPersonalStorage && DO.C.User.Storage) || (!opts.annotationLocationPersonalStorage && !opts.annotationLocationService && DO.C.User.Storage)) {
                containerIRI = DO.C.User.Storage[0];

                var fromContentType = 'text/html';
                // contentType = 'text/html';
                contentType = fromContentType;

                noteURL = noteIRI = containerIRI + id;
                var contextProfile = {
                  // 'subjectURI': noteIRI,
                };
                aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'canonical': true, 'annotationInbox': annotationInbox };

                annotationDistribution.push(aLS);
              }

              if(opts.annotationLocationService && typeof DO.C.AnnotationService !== 'undefined') {
                containerIRI = DO.C.AnnotationService;
                var fromContentType = 'text/html';
                // contentType = 'application/ld+json';
                contentType = fromContentType;

                var contextProfile = {
                  '@context': [
                    'http://www.w3.org/ns/anno.jsonld',
                    { 'as': 'https://www.w3.org/ns/activitystreams#', 'schema': 'http://schema.org/' }
                  ],
                  // 'subjectURI': noteIRI,
                  'profile': 'http://www.w3.org/ns/anno.jsonld'
                };

                if(!opts.annotationLocationPersonalStorage && opts.annotationLocationService) {
                  noteURL = noteIRI = containerIRI + id;
                  aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'canonical': true,'annotationInbox': annotationInbox };
                }
                else if(opts.annotationLocationPersonalStorage) {
                  noteURL = containerIRI + id;
                  aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'annotationInbox': annotationInbox };
                }
                else {
                  noteURL = noteIRI = containerIRI + id;
                  aLS = { 'id': id, 'containerIRI': containerIRI, 'noteURL': noteURL, 'noteIRI': noteIRI, 'fromContentType': fromContentType, 'contentType': contentType, 'canonical': true, 'annotationInbox': annotationInbox };
                }

                aLS = Object.assign(aLS, contextProfile)

                annotationDistribution.push(aLS);
              }

// console.log(annotationDistribution);

              //XXX: Defaulting to id but overwritten by motivation symbol
              var refLabel = id;

              var parentNodeWithId = selectedParentElement.closest('[id]');

              var targetIRI = (parentNodeWithId) ? resourceIRI + '#' + parentNodeWithId.id : resourceIRI;
              var latestVersion = DO.C.ResourceInfo.graph.rellatestversion;
              if (latestVersion) {
                resourceIRI = latestVersion;
                targetIRI = (parentNodeWithId) ? latestVersion + '#' + parentNodeWithId.id : latestVersion;
                options['targetInMemento'] = true;
              }
// console.log(latestVersion)
// console.log(resourceIRI)
// console.log(targetIRI)

              var targetLanguage = doc.getNodeLanguage(parentNodeWithId);
              var selectionLanguage = doc.getNodeLanguage(selectedParentElement);
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
              var language = '';
              var licenseIRI = '';
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
                    var figureIRI = util.generateAttributeId(null, opts.selectionDataSet);
                    ref = '<span rel="schema:hasPart" resource="#figure-' + figureIRI + '">\n\
                    <a href="' + opts.select + '" property="schema:name" rel="prov:wasDerivedFrom" resource="' + opts.select + '" typeof="qb:DataSet">' + opts.selectionDataSet + '</a> [' + DO.U.htmlEntities(DO.C.RefAreas[opts.selectionRefArea]) + ']\n\
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
                    language = opts.language;
                    licenseIRI = opts.license;

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
                      },
                      "body": opts.content,
                      "language": {},
                      "license": {}
                    };
                    if (DO.C.User.IRI) {
                      noteData.creator["iri"] = DO.C.User.IRI;
                    }
                    if (DO.C.User.Name) {
                      noteData.creator["name"] = DO.C.User.Name;
                    }
                    if (DO.C.User.Image) {
                      noteData.creator["image"] = DO.C.User.Image;
                    }
                    if (DO.C.User.URL) {
                      noteData.creator["url"] = DO.C.User.URL;
                    }
                    if (opts.language.length > 0) {
                      noteData.language["code"] = opts.language;
                    }
                    if (opts.license.length > 0) {
                      noteData.license["iri"] = opts.license;
                    }
                    if (opts.annotationInboxLocation && DO.C.User.TypeIndex && DO.C.User.TypeIndex[DO.C.Vocab['asAnnounce']['@id']]) {
                      noteData.inbox = DO.C.User.TypeIndex[DO.C.Vocab['asAnnounce']['@id']];
                    }

                    // note = DO.U.createNoteDataHTML(noteData);
                    break;

                  //Internal Note
                  case 'note':
                    motivatedBy = "oa:commenting";
                    refLabel = DO.U.getReferenceLabel(motivatedBy);
                    docRefType = '<sup class="ref-comment"><a rel="cito:isCitedBy" href="#' + id + '">' + refLabel + '</a></sup>';
                    noteType = 'note';
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
                      },
                      "body": {
                        "purpose": {
                          "describing": {
                            "text": opts.content
                          },
                          "tagging": {
                            "text": opts.tagging
                          }
                        }
                      },
                      "language": {},
                      "license": {}
                    };
                    if (DO.C.User.IRI) {
                      noteData.creator["iri"] = DO.C.User.IRI;
                    }
                    if (DO.C.User.Name) {
                      noteData.creator["name"] = DO.C.User.Name;
                    }
                    if (DO.C.User.Image) {
                      noteData.creator["image"] = DO.C.User.Image;
                    }
                    if (DO.C.User.URL) {
                      noteData.creator["url"] = DO.C.User.URL;
                    }
                    if (opts.language.length > 0) {
                      noteData.language["code"] = opts.language;
                    }
                    if (opts.license.length > 0) {
                      noteData.license["iri"] = opts.license;
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
                          "body": opts.content,
                          "citationURL": opts.url,
                          "language": {}
                        };

                        if (opts.language.length > 0) {
                          noteData.language["code"] = opts.language;
                        }

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
                    ref = DO.U.createRDFaHTML(noteData, 'expanded');
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
                      },
                      "body": {
                        "purpose": {
                          "describing": {
                            "text": opts.content
                          },
                          "tagging": {
                            "text": opts.tagging
                          }
                        }
                      },
                      "language": {},
                      "license": {}
                    };
                    if (DO.C.User.IRI) {
                      noteData.creator["iri"] = DO.C.User.IRI;
                    }
                    if (DO.C.User.Name) {
                      noteData.creator["name"] = DO.C.User.Name;
                    }
                    if (DO.C.User.Image) {
                      noteData.creator["image"] = DO.C.User.Image;
                    }
                    if (DO.C.User.URL) {
                      noteData.creator["url"] = DO.C.User.URL;
                    }
                    if (opts.language.length > 0) {
                      noteData.language["code"] = opts.language;
                    }
                    // note = DO.U.createNoteDataHTML(noteData);
                    ref = DO.U.getTextQuoteHTML(refId, motivatedBy, exact, docRefType, { 'do': true });
                    break;
                }

                var selectionUpdated = ref;
                MediumEditor.util.insertHTMLCommand(_this.base.selectedDocument, selectionUpdated);

                return noteData;
              }

              var createNotificationData = function(annotation, options) {
                options = options || {};
                var notificationType, notificationObject, notificationContext, notificationTarget, notificationStatements;

                var noteIRI = (options.relativeObject) ? '#' + id : annotation['noteIRI'];

                notificationStatements = '    <dl about="' + noteIRI + '">\n\
  <dt>Object type</dt><dd><a about="' + noteIRI + '" typeof="oa:Annotation" href="' + DO.C.Vocab['oaAnnotation']['@id'] + '">Annotation</a></dd>\n\
  <dt>Motivation</dt><dd><a href="' + DO.C.Prefixes[motivatedBy.split(':')[0]] + motivatedBy.split(':')[1] + '" property="oa:motivation">' + motivatedBy.split(':')[1] + '</a></dd>\n\
</dl>\n\
';

                switch(_this.action) {
                  default: case 'article': case 'specificity':
                    notificationType = ['as:Create'];
                    notificationObject = noteIRI;
                    notificationTarget = targetIRI;
                    break;
                  case 'approve':
                    notificationType = ['as:Like'];
                    notificationObject = targetIRI;
                    notificationContext = noteIRI;
                    break;
                  case 'disapprove':
                    notificationType = ['as:Dislike'];
                    notificationObject = targetIRI;
                    notificationContext = noteIRI;
                    break;
                  case 'bookmark':
                    notificationType = ['as:Add'];
                    notificationObject = noteIRI;
                    notificationTarget = annotation['containerIRI'];
                    break;
                }

                var notificationData = {
                  "type": notificationType,
                  "slug": id,
                  "object": notificationObject,
                  "license": opts.license
                };

                if(typeof notificationContext !== 'undefined') {
                  notificationData['context'] = notificationContext;
                }

                if(typeof notificationTarget !== 'undefined') {
                  notificationData['target'] = notificationTarget;
                }

                notificationData['statements'] = notificationStatements;

                return notificationData;
              }

              var positionActivity = function(annotation, options) {
                if (!annotation['canonical']) {
                  return Promise.resolve();
                }

                if ('profile' in annotation && annotation.profile == 'https://www.w3.org/ns/activitystreams') {
                  return DO.U.showActivities(annotation['noteIRI'])
                    .catch(() => {
                      return Promise.resolve()
                    })
                }
                else {
                  return DO.U.positionInteraction(annotation[ 'noteIRI' ], document.body, options)
                    .catch(() => {
                      return Promise.resolve()
                    })
                }
              }

              var sendNotification = function(annotation, options) {
                if (!annotation['canonical']) {
                  return Promise.resolve();
                }

                if (annotation.annotationInbox) {
                  inboxPromise = Promise.resolve([annotation.annotationInbox])
                }
                else {
                  inboxPromise = inbox.getEndpoint(DO.C.Vocab['ldpinbox']['@id']);
                }

                return inboxPromise
                  .catch(error => {
                    console.log('Error fetching ldp:inbox endpoint:', error)
                    throw error
                  })
                  .then(inboxes => {
                    // TODO: resourceIRI for getEndpoint should be the
                    // closest IRI (not necessarily the document).

                    if (inboxes.length > 0) {
                      var notificationData = createNotificationData(annotation);

                      notificationData['inbox'] = inboxes[0];

                      // notificationData['type'] = ['as:Announce'];
// console.log(annotation)
// console.log(notificationData)
                      return inbox.notifyInbox(notificationData)
                        .catch(error => {
                          console.log('Error notifying the inbox:', error)
                        })
                    }
                  })
              }

              switch(this.action) {
                case 'article': case 'approve': case 'disapprove': case 'specificity': case 'bookmark':
                  annotationDistribution.forEach(annotation => {
                    var data = '';

                    var notificationData = createNotificationData(annotation, { 'relativeObject': true });

                    var noteData = createNoteData(annotation)
                    if ('profile' in annotation && annotation.profile == 'https://www.w3.org/ns/activitystreams') {
                      notificationData['statements'] = DO.U.createNoteDataHTML(noteData);
                      note = doc.createActivityHTML(notificationData);
                    }
                    else {
                      note = DO.U.createNoteDataHTML(noteData);
                    }
                    data = doc.createHTML('', note);
// console.log(noteData)
// console.log(note)
// console.log(data)
// console.log(annotation)

                    fetcher.postActivity(annotation['containerIRI'], id, data, annotation)
                      .catch(error => {
                        // console.log('Error serializing annotation:', error)
                        // console.log(error)
                        throw error  // re-throw, break out of promise chain
                      })

                      .then(response => {
                        var location = response.headers.get('Location')

                        if (location) {
                          location = uri.getAbsoluteIRI(annotation['containerIRI'], location)
                          annotation['noteIRI'] = annotation['noteURL'] = location
                        }

// console.log(annotation)
                        return positionActivity(annotation, options)
                       })

                      .then(() => {
                        if (this.action != 'bookmark') {
                          return sendNotification(annotation, options)
                        }
                      })

                      .catch(() => {  // catch-all
                        // suppress the error, it was already logged to the console above
                        // nothing else needs to be done, the loop will proceed
                        // to the next annotation
                      })
                  })
                  break;

                case 'note':
                  var noteData = createNoteData({'id': id})
                  note = DO.U.createNoteDataHTML(noteData);
                  // var nES = selectedParentElement.nextElementSibling;
                  var asideNote = '\n\
<aside class="note">\n\
'+ note + '\n\
</aside>';
                  var asideNode = util.fragmentFromString(asideNote);
                  var parentSection = doc.getClosestSectionNode(selectedParentElement);
                  parentSection.appendChild(asideNode);

                  if(DO.C.User.IRI) {
                    var idEscape = (id.match(/^\d/)) ? "\\\\" : '';
                    var noteDelete = document.querySelector('aside.note article#' + idEscape + id + ' button.delete');

                    if (noteDelete) {
                      noteDelete.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var aside = noteDelete.closest('aside.note')
                        aside.parentNode.removeChild(aside)
                        var span = document.querySelector('span[resource="#' + refId + '"]')
                        span.outerHTML = span.querySelector('mark').textContent
                      });
                    }
                  }

                  DO.U.positionNote(refId, refLabel, id);
                  break;

                case 'selector':
                  window.history.replaceState({}, null, selectorIRI);
                  doc.showActionMessage(document.documentElement, 'Copy URL from address bar')
                  // util.copyTextToClipboard(encodeURI(selectorIRI));
                  break;

                case 'cite': //footnote reference
                  //TODO: Refactor this what's in positionInteraction

                  var noteData = createNoteData({'id': id})
                  note = DO.U.createNoteDataHTML(noteData);

                  switch(opts.citationType) {
                    case 'ref-footnote': default:
                      var nES = selectedParentElement.nextElementSibling;
                      var asideNote = '\n\
<aside class="note">\n\
'+ note + '\n\
</aside>';
                      var asideNode = util.fragmentFromString(asideNote);
                      var parentSection = doc.getClosestSectionNode(selectedParentElement);
                      parentSection.appendChild(asideNode);

                      DO.U.positionNote(refId, refLabel, id);
                      break;

                    case 'ref-reference':
                      var options = opts;
                      options['citationId'] = opts.url;
                      options['refId'] = refId;

                      DO.U.getCitation(opts.url, options).then(function(citationGraph) {
                        var citationURI = '';
// console.log(citationGraph)
// console.log(citationGraph.toString())
// console.log(options.citationId)
// console.log(uri.getProxyableIRI(options.citationId))
                        if(opts.url.match(/^10\.\d+\//)) {
                          citationURI = 'http://dx.doi.org/' + opts.url;
                          options.citationId = citationURI;
                        }
                        //FIXME: subjectIRI shouldn't be set here. Bug in RDFaProcessor (see also SimpleRDF ES5/6). See also: https://github.com/linkeddata/dokieli/issues/132
                        else if (opts.url.toLowerCase().indexOf('//dx.doi.org/') >= 0) {
                          citationURI = opts.url;
                          if (opts.url.toLowerCase().startsWith('https:')) {
                            citationURI = opts.url.replace(/^https/, 'http');
                          }
                        }
                        // else if (uri.stripFragmentFromString(options.citationId) !== uri.getProxyableIRI(options.citationId)) {
                        //   citationURI = window.location.origin + window.location.pathname;
                        // }
                        else {
                          citationURI = options.citationId;
                        }

                        var citation = DO.U.getCitationHTML(citationGraph, citationURI, options);

                        var node = document.querySelector('#references ol');

                        DO.U.buildReferences(node, id, citation);

                        options['showRobustLinksDecoration'] = true;
                        var node = document.querySelector('[id="' + id + '"] a[about]');

                        var robustLink = DO.U.createRobustLink(citationURI, node, options);

// console.log(options.url);
                        var s = citationGraph.child(citationURI);
                        if(s.ldpinbox._array.length == 0) {
                          s = citationGraph.child(options.citationId);
                        }

                        if (s.ldpinbox._array.length > 0) {
                          var inboxURL = s.ldpinbox.at(0);
// console.log(inboxURL);

                          var citedBy = location.href.split(location.search||location.hash||/[?#]/)[0] + '#' + options.refId;

                          var notificationStatements = '    <dl about="' + citedBy + '">\n\
      <dt>Action</dt><dd>Citation</dd>\n\
      <dt>Cited by</dt><dd><a href="' + citedBy + '">' + citedBy + '</a></dd>\n\
      <dt>Cites</dt><dd><a href="' + options.url + '" property="' + options.citationRelation + '">' + options.url + '</a></dd>\n\
      <dt>Citation type</dt><dd><a href="' + options.url + '">' + DO.C.Citation[options.citationRelation] + '</a></dd>\n\
    </dl>\n\
';

                          var notificationData = {
                            "type": ['as:Announce'],
                            "inbox": inboxURL,
                            "object": citedBy,
                            "target": options.url,
                            "statements": notificationStatements
                          };

                          inbox.notifyInbox(notificationData).then(
                            function(s){
                              console.log('Sent Linked Data Notification to ' + inboxURL);
                            });
                        }
                      });
                      break;
                  }
                  break;

                case 'rdfa':
                  //This only updates the DOM. Nothing further. The 'id' is not used.
                  var noteData = createNoteData({'id': id});
                  break;
              }

              this.window.getSelection().removeAllRanges();
              this.base.checkSelection();
            },

            checkLinkFormat: function (value) {
              var re = /^(https?|ftps?|rtmpt?):\/\/|mailto:/;
              return (re.test(value) ? '' : 'http://') + value;
            },

            doFormCancel: function () {
              this.base.restoreSelection();
              this.base.checkSelection();
            },

            // form creation and event handling
            attachFormEvents: function (form) {
              var close = form.querySelector('.medium-editor-toolbar-close'),
                save = form.querySelector('.medium-editor-toolbar-save');

              this.on(form, 'click', this.handleFormClick.bind(this));
              this.on(close, 'click', this.handleCloseClick.bind(this));
              this.on(save, 'click', this.handleSaveClick.bind(this), true);
            },

            createForm: function () {
              var doc = this.document,
                form = doc.createElement('div');

              // Anchor Form (div)
              form.className = 'medium-editor-toolbar-form';
              //FIXME
              form.id = 'medium-editor-toolbar-form-textarea-' + this.getEditorId();
              form.innerHTML = this.getTemplate();
              this.attachFormEvents(form);

              return form;
            },

            getInput: function () {
              var r = {};
              switch(this.action) {
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
                case 'article':
                  r.content = this.getForm().querySelector('#article-content.medium-editor-toolbar-textarea');
                  r.annotationLocationService = this.getForm().querySelector('#annotation-location-service');
                  r.annotationLocationPersonalStorage = this.getForm().querySelector('#annotation-location-personal-storage');
                  r.annotationInboxLocation = this.getForm().querySelector('#annotation-inbox');
                  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
                  r.license = this.getForm().querySelector('#article-license.medium-editor-toolbar-select');
                  break;
                case 'note':
                  r.content = this.getForm().querySelector('#article-content.medium-editor-toolbar-textarea');
                  r.tagging = this.getForm().querySelector('#bookmark-tagging.medium-editor-toolbar-input');
                  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
                  r.license = this.getForm().querySelector('#article-license.medium-editor-toolbar-select');
                  break;
                case 'approve':
                  r.content = this.getForm().querySelector('#approve-content.medium-editor-toolbar-textarea');
                  r.annotationLocationService = this.getForm().querySelector('#annotation-location-service');
                  r.annotationLocationPersonalStorage = this.getForm().querySelector('#annotation-location-personal-storage');
                  r.annotationInboxLocation = this.getForm().querySelector('#annotation-inbox');
                  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
                  r.license = this.getForm().querySelector('#approve-license.medium-editor-toolbar-select');
                  break;
                case 'disapprove':
                  r.content = this.getForm().querySelector('#disapprove-content.medium-editor-toolbar-textarea');
                  r.annotationLocationService = this.getForm().querySelector('#annotation-location-service');
                  r.annotationLocationPersonalStorage = this.getForm().querySelector('#annotation-location-personal-storage');
                  r.annotationInboxLocation = this.getForm().querySelector('#annotation-inbox');
                  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
                  r.license = this.getForm().querySelector('#disapprove-license.medium-editor-toolbar-select');
                  break;
                case 'specificity':
                  r.content = this.getForm().querySelector('#specificity-content.medium-editor-toolbar-textarea');
                  r.annotationLocationService = this.getForm().querySelector('#annotation-location-service');
                  r.annotationLocationPersonalStorage = this.getForm().querySelector('#annotation-location-personal-storage');
                  r.annotationInboxLocation = this.getForm().querySelector('#annotation-inbox');
                  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
                  r.license = this.getForm().querySelector('#specificity-license.medium-editor-toolbar-select');
                  break;
                case 'cite':
                  r.citationType = this.getForm().querySelector('input[name="citation-type"]:checked');
                  r.citationRelation = this.getForm().querySelector('#citation-relation.medium-editor-toolbar-select');
                  r.url = this.getForm().querySelector('#citation-url.medium-editor-toolbar-input');
                  r.content = this.getForm().querySelector('#citation-content.medium-editor-toolbar-textarea');
                  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
                  break;
                case 'bookmark':
                  r.content = this.getForm().querySelector('#bookmark-content.medium-editor-toolbar-textarea');
                  r.tagging = this.getForm().querySelector('#bookmark-tagging.medium-editor-toolbar-input');
                  r.language = this.getForm().querySelector('#article-language.medium-editor-toolbar-select');
                  break;
                case 'sparkline':
                  r.search = this.getForm().querySelector('#sparkline-search.medium-editor-toolbar-input');
                  r.select = this.getForm().querySelector('#sparkline-select');
                  r.sparkline = this.getForm().querySelector('#sparkline-graph .sparkline');
                  r.selectionDataSet = this.getForm().querySelector('#sparkline-selection-dataset');
                  r.selectionRefArea = this.getForm().querySelector('#sparkline-selection-refarea');
                  break;

                default:
                  r = this.getForm().querySelector('textarea.medium-editor-toolbar-textarea');
                  break;
              }

              return r;
            },

            getAnchorTargetCheckbox: function () {
              return this.getForm().querySelector('.medium-editor-toolbar-textarea-target');
            },

            getAnchorButtonCheckbox: function () {
              return this.getForm().querySelector('.medium-editor-toolbar-textarea-button');
            },

            handleTextboxKeyup: function (event) {
              // For ENTER -> create the anchor
              if (event.keyCode === MediumEditor.util.keyCode.ENTER) {
                event.preventDefault();
                this.doFormSave();
                return;
              }

              // For ESCAPE -> close the form
              if (event.keyCode === MediumEditor.util.keyCode.ESCAPE) {
                event.preventDefault();
                this.doFormCancel();
              }
            },

            handleFormClick: function (event) {
              // make sure not to hide form when clicking inside the form
              event.stopPropagation();
            },

            handleSaveClick: function (event) {
              // Clicking Save -> create the anchor
              event.preventDefault();
              this.doFormSave();
            },

            handleCloseClick: function (event) {
              // Click Close -> close the form
              event.preventDefault();
              this.doFormCancel();
            }
          });
        }
      })()

    } //DO.U.Editor
  } //DO.U
}; //DO

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function(){ DO.C.init(); });
  }
}

module.exports = DO
