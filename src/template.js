'use strict'

import { generateAttributeId } from './util.js';

export function createRDFaHTML(r, mode) {
  var s = '', about = '', property = '', rel = '', resource = '', href = '', content = '', langDatatype = '', typeOf = '', idValue = '', id = '';

  if ('rel' in r && r.rel != '') {
    rel = ' rel="' + r.rel + '"';
  }

  if ('href' in r && r.href != '') {
    href = ' href="' + r.href + '"';
  }

  if(mode == 'expanded') {
    idValue = generateAttributeId();
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
}
