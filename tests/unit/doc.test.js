import { JSDOM } from "jsdom";
import {
  domToString,
  escapeCharacters,
  cleanEscapeCharacters,
  fixBrokenHTML,
  getNodeWithoutClasses,
  getDocument,
  getDocumentNodeFromString,
  createHTML,
  createFeedXML,
  dumpNode,
  getDoctype,
  getDocumentContentNode,
  createActivityHTML,
  getClosestSectionNode,
  removeSelectorFromNode,
  getNodeLanguage,
  addMessageToLog,
  selectArticleNode,
  insertDocumentLevelHTML,
  setDate,
  createDateHTML,
  getRDFaPrefixHTML,
  getDocumentStatusHTML,
  getGraphData,
} from "../../src/doc";
import Config from "../../src/config";
import MockGrapoi from "../utils/mockGrapoi";

const ns = Config.ns;

const htmlContent = `
<!DOCTYPE html>
<html lang="en" xml:lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <title></title>
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <link href="https://dokie.li/media/css/basic.css" media="all" rel="stylesheet" title="Basic" />
    <link href="https://dokie.li/media/css/dokieli.css" media="all" rel="stylesheet" />
    <script src="https://dokie.li/scripts/dokieli.js"></script>
  </head>

  <body about="" prefix="rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns# rdfs: http://www.w3.org/2000/01/rdf-schema# owl: http://www.w3.org/2002/07/owl# xsd: http://www.w3.org/2001/XMLSchema# rdfa: http://www.w3.org/ns/rdfa# dcterms: http://purl.org/dc/terms/ dctypes: http://purl.org/dc/dcmitype/ foaf: http://xmlns.com/foaf/0.1/ pimspace: http://www.w3.org/ns/pim/space# skos: http://www.w3.org/2004/02/skos/core# prov: http://www.w3.org/ns/prov# mem: http://mementoweb.org/ns# qb: http://purl.org/linked-data/cube# schema: http://schema.org/ void: http://rdfs.org/ns/void# rsa: http://www.w3.org/ns/auth/rsa# cert: http://www.w3.org/ns/auth/cert# wgs: http://www.w3.org/2003/01/geo/wgs84_pos# bibo: http://purl.org/ontology/bibo/ sioc: http://rdfs.org/sioc/ns# doap: http://usefulinc.com/ns/doap# dbr: http://dbpedia.org/resource/ dbp: http://dbpedia.org/property/ sio: http://semanticscience.org/resource/ opmw: http://www.opmw.org/ontology/ deo: http://purl.org/spar/deo/ doco: http://purl.org/spar/doco/ cito: http://purl.org/spar/cito/ fabio: http://purl.org/spar/fabio/ oa: http://www.w3.org/ns/oa# as: https://www.w3.org/ns/activitystreams# ldp: http://www.w3.org/ns/ldp# solid: http://www.w3.org/ns/solid/terms# acl: http://www.w3.org/ns/auth/acl# earl: http://www.w3.org/ns/earl# spec: http://www.w3.org/ns/spec# odrl: http://www.w3.org/ns/odrl/2/ dio: https://w3id.org/dio# rel: https://www.w3.org/ns/iana/link-relations/relation#" typeof="schema:CreativeWork prov:Entity">
    <main>
      <article about="" typeof="schema:Article">
        <p><code id="foo">&lt;script id="meta-json-ld" type="application/ld+json" title="JSON-LD"&gt;&lt;/script&gt;</code>.</p>
      </article>
    </main>
  </body>
</html>
`;

const dom = new JSDOM(htmlContent.trim());

//FIXME: Skipping for now.
describe.skip("domToString", () => {
  it("converts DOM to string correctly", () => {
    expect(domToString(dom.window.document.documentElement).trim()).toBe(
      htmlContent.replace(/<!DOCTYPE html>/i, "").trim()
    );
  });
});

describe("escapeCharacters", () => {
  it("escapes special characters correctly", () => {
    const input = "<div>&\"'</div>";
    const expectedOutput = "&lt;div&gt;&amp;&quot;&apos;&lt;/div&gt;";
    expect(escapeCharacters(input)).toBe(expectedOutput);
  });
});

describe("cleanEscapeCharacters", () => {
  it("cleans double escaped characters correctly", () => {
    const input = "&amp;lt;&amp;gt;&amp;apos;&amp;quot;&amp;amp;";
    const expectedOutput = "&lt;&gt;&apos;&quot;&amp;";
    expect(cleanEscapeCharacters(input)).toBe(expectedOutput);
  });
});

describe("fixBrokenHTML", () => {
  it("fixes img", () => {
    const input = '<img src="image.jpg"></img>';
    const expectedOutput = '<img src="image.jpg"/>';
    expect(fixBrokenHTML(input)).toBe(expectedOutput);
  });
});

describe("getNodeWithoutClasses", () => {
  it("removes specified classes from node", () => {
    const node = dom.window.document.createElement("div");
    node.innerHTML =
      '<span class="remove-me">Text</span><span class="keep-me">Text</span>';
    const resultNode = getNodeWithoutClasses(node, "remove-me");
    expect(resultNode.querySelector(".remove-me")).toBeNull();
    expect(resultNode.querySelector(".keep-me")).not.toBeNull();
  });
});

describe("getDocument", () => {
  it("returns document as string", () => {
    const result = getDocument(dom.window.document.documentElement);
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain(
      '<html lang="en" xml:lang="en" xmlns="http://www.w3.org/1999/xhtml">'
    );
  });
});

describe("getDocumentNodeFromString", () => {
  it("parses string to document node", () => {
    const resultNode = getDocumentNodeFromString(htmlContent);
    expect(resultNode.querySelector("title")).not.toBeNull();
  });
});

describe("createHTML", () => {
  it("creates HTML string with given title and main content", () => {
    const title = "title";
    const main = "<p>content</p>";
    const result = createHTML(title, main);

    const normalizedResult = result.replace(/\s+/g, "").trim();
    const expectedTitle = "<title>title</title>";
    const expectedMain = "<main><p>content</p></main>";

    expect(normalizedResult).toContain(expectedTitle);
    expect(normalizedResult).toContain(expectedMain);
  });
});

describe("createFeedXML", () => {
  const feed = {
    language: "en",
    title: "Test Feed",
    self: "https://example.com/feed",
    origin: "https://example.com",
    description: "Test feed description",
    author: {
      uri: "https://example.com/author",
      name: "Author Name"
    },
    items: {
      "https://example.com/item1": {
        title: "Item 1",
        description: "Description of item 1",
        published: "2024-10-17T10:00:00Z",
        updated: "2024-10-17T11:00:00Z",
        author: [
          { uri: "https://example.com/author", name: "Author Name", email: "author@example.com" }
        ]
      },
      "https://example.com/item2": {
        title: "Item 2",
        description: "Description of item 2",
        updated: "2024-10-16T10:00:00Z",
      }
    }
  };

  it("creates Atom XML feed", () => {
    const result = createFeedXML(feed, { contentType: "application/atom+xml" });
    const year = new Date().getFullYear();

    expect(result).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(result).toContain('<title>Test Feed</title>');
    expect(result).toContain('<link href="https://example.com/feed" rel="self" />');
    expect(result).toContain(`<rights>Copyright ${year} Author Name . Rights and license are feed only.</rights>`);
    expect(result).toContain('<generator uri="https://dokie.li/">dokieli</generator>');

    expect(result).toContain('<entry>');
    expect(result).toContain('<id>https://example.com/item1</id>');
    expect(result).toContain('<title>Item 1</title>');
    expect(result).toContain('<published>2024-10-17T10:00:00Z</published>');
    expect(result).toContain('<updated>2024-10-17T11:00:00Z</updated>');
    expect(result).toContain('<author>');
    expect(result).toContain('<name>Author Name</name>');
    expect(result).toContain('<email>author@example.com</email>');
    expect(result).toContain('</entry>');

    expect(result).toContain('<entry>');
    expect(result).toContain('<id>https://example.com/item2</id>');
    expect(result).toContain('<title>Item 2</title>');
    expect(result).toContain('<updated>2024-10-16T10:00:00Z</updated>');
    expect(result).toContain('</entry>');
  });

  it("creates RSS XML feed", () => {
    const result = createFeedXML(feed, { contentType: "application/rss+xml" });    
    const year = new Date().getFullYear();

    expect(result).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(result).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">');
    expect(result).toContain('<channel>');
    expect(result).toContain('<title>Test Feed</title>');
    expect(result).toContain('<link>https://example.com</link>');
    expect(result).toContain('<description>Test feed description</description>');
    expect(result).toContain(`<copyright>Copyright ${year} Author Name . Rights and license are feed only.</copyright>`);
    expect(result).toContain('<generator>https://dokie.li/</generator>');

    expect(result).toContain('<item>');
    expect(result).toContain('<guid>https://example.com/item1</guid>');
    expect(result).toContain('<title>Item 1</title>');
    expect(result).toContain('<pubDate>Thu, 17 Oct 2024 11:00:00 GMT</pubDate>');
    expect(result).toContain('<description>Description of item 1</description>');
    expect(result).toContain('<author>author@example.com (Author Name)</author>');
    expect(result).toContain('</item>');

    expect(result).toContain('<item>');
    expect(result).toContain('<guid>https://example.com/item2</guid>');
    expect(result).toContain('<title>Item 2</title>');
    expect(result).toContain('<pubDate>Wed, 16 Oct 2024 10:00:00 GMT</pubDate>');
    expect(result).toContain('<description>Description of item 2</description>');
    expect(result).toContain('</item>');
  });
});


describe("dumpNode", () => {
  let options, skipAttributes, voidElements, noEsc;

  beforeEach(() => {
    options = {
      skipNodeWithId: [],
      classWithChildText: {
        class: "child-class",
        element: "span",
      },
      skipNodeWithClass: "",
      replaceClassItemWith: {
        source: ["old-class"],
        target: "new-class",
      },
      sortAttributes: true,
      skipEscapingDataBlockTypes: [],
    };
    skipAttributes = [];
    voidElements = [
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "keygen",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ];
    noEsc = [];
  });

  it("should return empty string for non-nodes", () => {
    const s = "Sample non-node";
    expect(dumpNode(s, options, skipAttributes, voidElements, noEsc)).toBe("");
  });

  it("should handle element nodes correctly", () => {
    const divNode = document.createElement("div");
    divNode.setAttribute("id", "test");
    divNode.setAttribute("class", "test-class");

    const spanNode = document.createElement("span");
    spanNode.textContent = "Hello";
    divNode.appendChild(spanNode);

    const result = dumpNode(
      divNode,
      options,
      skipAttributes,
      voidElements,
      noEsc
    );
    expect(result).toBe(
      '<div class="test-class" id="test"><span>Hello</span></div>'
    );
  });

  it("should skip nodes with specific IDs", () => {
    options.skipNodeWithId.push("test");
    const divNode = document.createElement("div");
    divNode.setAttribute("id", "test");

    const result = dumpNode(
      divNode,
      options,
      skipAttributes,
      voidElements,
      noEsc
    );
    expect(result).toBe("");
  });
});

describe("getDoctype", () => {
  it("should return correct DOCTYPE string", () => {
    document.implementation.createHTMLDocument();
    expect(getDoctype()).toBe("<!DOCTYPE html>");
  });
});

describe("getDocumentContentNode", () => {
  it("should return body for HTMLDocument", () => {
    const htmlDoc = document.implementation.createHTMLDocument();
    expect(getDocumentContentNode(htmlDoc)).toBe(htmlDoc.body);
  });

  it("should return first child for DocumentFragment", () => {
    const fragment = document.createDocumentFragment();
    const divNode = document.createElement("div");
    fragment.appendChild(divNode);
    expect(getDocumentContentNode(fragment)).toBe(divNode);
  });

  it("should return undefined for unknown document types", () => {
    const unknownNode = {};
    expect(getDocumentContentNode(unknownNode)).toBeUndefined();
  });
});
describe("createActivityHTML", () => {
  it("createActivityHTML returns correct HTML structure", () => {
    const o = {
      type: ["as:Create", "schema:Person"],
      object: "https://example.com/object",
      objectTypes: ["as:Note"],
      objectLicense: "https://example.com/license",
      inReplyTo: "https://example.com/replyTo",
      context: "https://example.com/context",
      target: "https://example.com/target",
      summary: "This is a summary",
      content: "This is content",
      to: "https://example.com/to",
    };

    const result = createActivityHTML(o);

    expect(result).toContain("<h1>Notification: Created</h1>");
    expect(result).toContain('typeof="as:Create"');
    expect(result).toContain('property="as:object"');
    expect(result).toContain('property="as:summary"');
    expect(result).toContain('property="as:inReplyTo"');
  });
});

describe("getClosestSectionNode", () => {
  it(" returns the closest section node", () => {
    document.body.innerHTML = `
    <div>
      <article>
        <section id="section1">
          <div id="testNode"></div>
        </section>
      </article>
    </div>`;

    const node = document.getElementById("testNode");
    const result = getClosestSectionNode(node);

    expect(result.tagName.toLowerCase()).toBe("section");
  });
});

it("removeSelectorFromNode removes the specified selector from node", () => {
  document.body.innerHTML = `
    <div>
      <p class="removeMe">Text1</p>
      <p>Text2</p>
    </div>`;

  const node = document.querySelector("div");
  const clone = removeSelectorFromNode(node, ".removeMe");

  expect(clone.querySelector(".removeMe")).toBeNull();
  expect(clone.querySelectorAll("p").length).toBe(1);
});

describe("getNodeLanguage", () => {
  it("getNodeLanguage returns the correct language attribute", () => {
    document.body.innerHTML = `
    <div lang="en">
      <p lang="fr" id="testNode">Text</p>
    </div>`;

    const node = document.getElementById("testNode");
    const result = getNodeLanguage(node);

    expect(result).toBe("fr");
  });
});

describe("addMessageToLog", () => {
  it("addMessageToLog adds a message with dateTime to Config.MessageLog", () => {
    const Config = { MessageLog: [] };

    const message = { content: "New message" };
    addMessageToLog(message, Config.MessageLog);

    expect(Config.MessageLog.length).toBe(1);
    expect(Config.MessageLog[0]).toHaveProperty("dateTime");
    expect(Config.MessageLog[0].content).toBe("New message");
  });
});
describe("selectArticleNode", () => {
  it("should select the last matching article node", () => {
    const document = dom.window.document;
    const result = selectArticleNode(document.body);
    expect(result.nodeName).toBe("ARTICLE");
  });

  it("should return default content node when no article node is found", () => {
    const d = new JSDOM(`<body><section></section></body>`);
    document = d.window.document;

    const result = selectArticleNode(document.body);
    expect(result).toBe(document.body);
  });
});

describe("insertDocumentLevelHTML", () => {
  document = dom.window.document;
  dom.window.Config = {
    DocumentItems: ["doc-item"],
  };
  const rootNode = document.body;

  it("should insert HTML after the identified document node", () => {
    insertDocumentLevelHTML(rootNode, "<p>New Content</p>", { id: "doc-item" });
    expect(rootNode.innerHTML).toContain("<p>New Content</p>");
  });

  it("should insert HTML at the beginning when no matching document item is found", () => {
    insertDocumentLevelHTML(rootNode, "<p>New Content</p>", {
      id: "non-existent",
    });
    expect(rootNode.innerHTML).toContain("<p>New Content</p>");
  });
});

describe("setDate", () => {
  it("should update an existing time element with the correct datetime", () => {
    const d = new JSDOM(`
      <div id="rootNode">
        <div id="document-created">
          <time datetime="2023-01-01"></time>
        </div>
      </div>
    `);
    const rootNode = d.window.document.getElementById("rootNode");

    setDate(rootNode, {
      datetime: new Date("2024-10-15T00:00:00Z"),
      id: "document-created",
    });

    const timeNode = rootNode.querySelector("time");
    expect(timeNode.getAttribute("datetime")).toBe("2024-10-15T00:00:00.000Z");
    expect(timeNode.textContent).toBe("2024-10-15");
  });

  it("should insert new time HTML if no existing time element is found", () => {
    const d = new JSDOM(
      `<div id="rootNode"><div id="document-created"></div></div>`
    );
    const rootNode = d.window.document.getElementById("rootNode");

    setDate(rootNode, {
      datetime: new Date("2024-10-15T00:00:00Z"),
      id: "document-created",
    });
    console.log(rootNode.innerHTML);
    expect(rootNode.innerHTML).toContain(
      '<time datetime="2024-10-15T00:00:00.000Z">2024-10-15</time>'
    );
  });
});

describe("createDateHTML", () => {
  it("should create HTML with default values when no options are provided", () => {
    const result = createDateHTML();
    expect(result).toContain('id="document-created"');
    expect(result).toContain('<time datetime="');
    expect(result).toContain("<dt>Created</dt>");
  });

  it("should create HTML with provided options", () => {
    const options = {
      title: "Test Title",
      id: "custom-id",
      class: "test-class",
      datetime: new Date("2024-10-15T00:00:00Z"),
      property: "schema:dateCreated",
    };
    const result = createDateHTML(options);
    expect(result).toContain('id="custom-id"');
    expect(result).toContain('class="test-class"');
    expect(result).toContain('datetime="2024-10-15T00:00:00.000Z"');
    expect(result).toContain("<dt>Test Title</dt>");
  });

  it("should create time element without property if not provided", () => {
    const options = {
      datetime: new Date("2024-10-15T00:00:00Z"),
    };
    const result = createDateHTML(options);
    expect(result).toContain(
      '<time datetime="2024-10-15T00:00:00.000Z">2024-10-15</time>'
    );
  });

  it("should create time element with property if provided", () => {
    const options = {
      property: "schema:dateCreated",
      datetime: new Date("2024-10-15T00:00:00Z"),
    };
    const result = createDateHTML(options);
    expect(result).toContain(
      '<time content="2024-10-15T00:00:00.000Z" datatype="xsd:dateTime" datetime="2024-10-15T00:00:00.000Z" property="schema:dateCreated">2024-10-15</time>'
    );
  });
});

describe("getRDFaPrefixHTML", () => {
  it("should return formatted prefix HTML", () => {
    const prefixes = {
      foaf: "http://xmlns.com/foaf/0.1/",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    };
    const result = getRDFaPrefixHTML(prefixes);
    expect(result).toContain("foaf: http://xmlns.com/foaf/0.1/");
    expect(result).toContain(
      "rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    );
  });

  it("should handle empty prefix object", () => {
    const result = getRDFaPrefixHTML({});
    expect(result).toBe("");
  });
});

describe("getDocumentStatusHTML", () => {
  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  it("should generate correct HTML for create mode", () => {
    const options = { mode: "create" };
    const resultHTML = getDocumentStatusHTML(rootNode, options);

    expect(resultHTML).toContain(
      '<dl id="document-status"><dt>Document Status</dt><dd><span></span></dd></dl>'
    );
  });

  it("should generate correct HTML for update mode", () => {
    const createOptions = {
      mode: "create",
      id: "document-status",
    };
    getDocumentStatusHTML(rootNode, createOptions);

    const updateOptions = {
      mode: "update",
      id: "document-status",
    };
    const resultHTML = getDocumentStatusHTML(rootNode, updateOptions);

    expect(resultHTML).toContain(
      '<dl id="document-status"><dt>Document Status</dt><dd><span></span></dd></dl>'
    );
  });

  it("should generate correct HTML for delete mode", () => {
    const createOptions = {
      mode: "create",
      id: "document-status",
    };
    getDocumentStatusHTML(rootNode, createOptions);

    const deleteOptions = {
      mode: "delete",
      id: "document-status",
    };
    const resultHTML = getDocumentStatusHTML(rootNode, deleteOptions);

    expect(resultHTML).toBe("");
  });

  it("should handle default options correctly", () => {
    const options = {};
    const resultHTML = getDocumentStatusHTML(rootNode, options);

    expect(resultHTML).toContain(
      '<dl id="document-status"><dt>Document Status</dt><dd><span></span></dd></dl>'
    );
  });
});

describe("getGraphData", () => {
  const Config = {
    Vocab: {
      ldpRDFSource: { "@id": "http://www.w3.org/ns/ldp#RDFSource" },
      memMemento: { "@id": "http://example.com/memMemento" },
      memOriginalResource: { "@id": "http://example.com/memOriginalResource" },
    },
    DocumentURL: "http://example.com/document",
    Resource: {},
  };

  it("should return correct graph data information", () => {
    
    const data = [
      {
        subject: "http://example.com/document",
        predicate: ns.rdf.type.value,
        object: "http://www.w3.org/ns/ldp#RDFSource",
      },
    ];
    
    const s = new MockGrapoi(data)

    const options = { subjectURI: "http://example.com/document" };

    const result = getGraphData(s, options);

    expect(result).toHaveProperty("graph", s);
  });
});
