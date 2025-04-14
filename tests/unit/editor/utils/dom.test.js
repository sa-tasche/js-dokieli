import { DOMParser } from 'prosemirror-model';
import { docSelectionToHtml } from 'src/editor/utils/dom.js'; 
import { schema } from 'src/editor/schema/base.js'; 
import { fragmentFromString } from 'src/util.js';

// Note: this function is not actually used anywhere anymore so perhaps we should remove
describe('docSelectionToHtml', () => {
  it('serializes selected content to HTML', () => {
    const dom = document.createElement('div');
    dom.replaceChildren(fragmentFromString('<p>Hello <strong>world</strong>!</p>'));
    const doc = DOMParser.fromSchema(schema).parse(dom);
    const from = 0;
    const to = 12; 
    const html = docSelectionToHtml(doc, from, to);
    expect(html).toContain('<p');
    expect(html).toContain('Hello');
    expect(html).toContain('<strong>world</strong>');
    expect(html).not.toContain('!'); 
    expect(html).toContain('</p>');
  });
});
