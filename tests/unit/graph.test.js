import { getResourceGraph } from "../../src/graph";
import { setupMockFetch, resetMockFetch, mockFetch } from "../utils/mockFetch";
import MockGrapoi from "../utils/mockGrapoi";
import Config from "../../src/config";

const ns = Config.ns;

describe("graph", () => {
  describe("getResourceGraph", () => {
    beforeEach(() => {
      jest.spyOn(global, "fetch").mockImplementation(mockFetch);
    });

    afterEach(() => {
      resetMockFetch();
    });

    test("should return undefined if graph cannot be returned", async () => {
      const iri = "http://example.com/nonexistent-resource";
      const headers = { Accept: "text/turtle" };
      const options = {};

      setupMockFetch({
        "http://example.com/nonexistent-resource": {
          ok: false,
          status: 404,
          statusText: "Not Found",
        },
      });

      await expect(
        getResourceGraph(iri, headers, options)
      ).resolves.toBeUndefined();
    });

    test("should return a resource", async () => {
      const iri = "http://example.com/Person1";
      const headers = { Accept: "text/turtle" };
      const options = {};
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: () => "text/turtle",
        },
        text: () => `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<http://example.com/Person1> rdf:type <http://example.com/Person> ;
  foaf:name "John Doe" .
`,
      });

      const result = await getResourceGraph(iri, headers, options);

      expect(result.out().values).toHaveLength(2);

      expect(result.out().values).toEqual(["http://example.com/Person", "John Doe"]);

      const johnDoeQuad = result.out(ns.foaf.name).values;
      expect(johnDoeQuad).toEqual(["John Doe"]);
    });
  });
});
