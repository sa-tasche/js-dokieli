import { Icon} from "./icons.js";

export const buttonIcons = {
  p: {
    title: 'paragraph',
    icon: Icon['.fas.fa-paragraph']
  },
  em: {
    title:'emphasise',
    icon: Icon['.fas.fa-italic']
  },
  strong: {
    title:'strongly emphasise',
    icon: Icon['.fas.fa-bold']
  },
  ol: {
    title:'ordered list',
    icon: Icon['.fas.fa-link-ol']
  },
  ul: {
    title:'unordered list',
    icon: Icon['.fas.fa-link-ul']
  },
  ...['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].reduce((acc, heading) => {
    acc[heading] = {
      title: `heading level ${heading[1]}`,
      icon: `${Icon['.fas.fa-header']}`,
      textContent: heading[1]
    };
    return acc;
  }, {}),
  a: {
    title: 'link',
    icon: Icon['.fas.fa-link']
  },
  citation: {
    title: 'cite',
    icon: Icon['.fas.fa-hashtag']
  },
  //TODO: Change annotate or note's icon
  comment: {
    title: 'comment',
    icon: Icon['.fas.fa-comment']
  },
  note: {
    title: 'note (internal)',
    icon: Icon['.fas.fa-sticky-note']
  },
  semantics: {
    title: 'semantics',
    icon: Icon['.fas.fa-rocket']
  },
  sparkline: {
    title: 'sparkline',
    icon: Icon['.fas.fa-chart-line']
  },
  img: {
    title: 'image',
    icon: Icon['.fas.fa-image']
  },
  pre: {
    title: 'code (block)',
    icon: Icon['.fas.fa-code']
  },
  code: {
    title: 'code (inline)',
    // icon: Icon['.fas.fa-code']
    textContent: 'code'
  },
  blockquote: {
    title: 'blockquote (with source)',
    icon: Icon['.fas.fa-angle-right']
  },
  q: {
    title: 'quote (with source)',
    icon: Icon['.fas.fa-quote-right']
  },
  math: {
    title: 'math',
    icon: Icon['.fas.fa-calculator']
  },

  highlight: {
    title: 'highlight',
    icon: Icon['.fas.fa-anchor']
  },
  bookmark: {
    title: 'bookmark',
    icon: Icon['.fas.fa-bookmark']
  },
  share: {
    title: 'share',
    icon: Icon['.fas.fa-bullhorn']
  },
  approve: {
    title: 'approve',
    icon: Icon['.fas.fa-thumbs-up']
  },
  disapprove: {
    title: 'disapprove',
    icon: Icon['.fas.fa-thumbs-down']
  },
  specificity: {
    title: 'specificity',
    icon: Icon['.fas.fa-crosshairs']
  },
  close: {
    title: 'Close',
    icon: Icon['.fas.fa-times.fa-2x']
  },
  submit: {
    title: 'Submit',
    icon: Icon['.fas.fa-check']
  },
  cancel: {
    title: 'Cancel',
    icon: Icon['.fas.fa-times']
  },
  delete: {
    title: 'Delete',
    icon: Icon['.fas.fa-trash-alt']
  },
  toggle: {
    title: 'Show/Hide',
    icon: Icon['.fas.fa-angle-right']
  },
  more: {
    title: 'Show more',
    icon: Icon['.fas.fa-rotate']
  },
  cursor: {
    title: 'Cursor',
    icon: Icon['.fas.fa-i-cursor.fa-2x']
  }, 
  spock: {
    title: 'Live long and prosper',
    icon: Icon['.far.fa-spock-hand']
  },
  astronaut: {
    title: 'Sign in',
    icon: Icon['.fas.fa-user-astronaut.fa-2x']
  },
  license: {
    title: 'License',
    icon: Icon['.fas.fa-certificate']
  },
  language: {
    title: 'Language',
    icon: Icon['.fas.fa-language']
  },
  'document-type': {
    title: 'Document type',
    icon: Icon['.fas.fa-shape']
  },
  inbox: {
    title: 'Inbox',
    icon: Icon['.fas.fa-inbox']
  },
  'in-reply-to': {
    title: 'In reply to',
    icon: Icon['.fas.fa-reply.fa-2x']
  }
}
