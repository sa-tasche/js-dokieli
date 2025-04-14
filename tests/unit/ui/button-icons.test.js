import { getButtonHTML, buttonIcons } from 'src/ui/button-icons'; 

describe('getButtonHTML', () => {
  beforeEach(() => {
    // mock SVG for all icons to avoid testing actual markup
    Object.keys(buttonIcons).forEach(key => {
      buttonIcons[key].icon = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z"/></svg>';
    });
  });

  it('throws an error if no button is provided', () => {
    expect(() => getButtonHTML({})).toThrow('Need to pass button.');
  });

  it('generates button HTML with icon and default title', () => {
    const html = getButtonHTML({ button: 'p' });
    expect(html).toContain('<button');
    expect(html).toContain('title="paragraph"');
    expect(html).toContain('<svg');
  });

  it('uses custom title and class', () => {
    const html = getButtonHTML({
      button: 'p',
      buttonTitle: 'Custom Title',
      buttonClass: 'btn-custom'
    });
    expect(html).toContain('title="Custom Title"');
    expect(html).toContain('class="btn-custom"');
  });

  it('adds textContent if available', () => {
    const html = getButtonHTML({ button: 'h2' });
    expect(html).toContain('<span>2</span>');
  });

  it('adds type and disabled attributes', () => {
    const html = getButtonHTML({
      button: 'p',
      buttonType: 'submit',
      buttonDisabled: true
    });
    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled');
  });

  it('adds iconSize class to SVG if specified', () => {
    const html = getButtonHTML({
      button: 'p',
      iconSize: 'icon-small'
    });
    expect(html).toContain('class="icon-small"');
  });

  it('returns button with only icon and no text if no textContent', () => {
    buttonIcons['test-icon-only'] = {
      title: 'test icon',
      icon: '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    };
    const html = getButtonHTML({ button: 'test-icon-only' });
    expect(html).toContain('<svg');
    expect(html).not.toContain('<span>');
  });

  it('uses fallback button name if no icon or textContent', () => {
    buttonIcons['fallback-test'] = { title: 'Fallback', icon: null };
    const html = getButtonHTML({ button: 'fallback-test' });
    expect(html).toContain('>fallback-test<');
  });
});
