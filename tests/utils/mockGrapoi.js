export default function MockGrapoi(triples = []) {
    this.triples = triples;
    this.currentSubject = triples[0]?.subject;  // Safeguard in case of empty triples
  }
  
  MockGrapoi.prototype.node = function (subject) {
    this.currentSubject = subject;
    return this;
  };
  
  MockGrapoi.prototype.out = function (predicate) {
    if (!this.currentSubject) {
      throw new Error("No subject selected. Use `.node(subject)` first.");
    }
  
    const results = Array.from(this.triples)
      .filter((triple) => triple.subject === this.currentSubject)
      .map((triple) => triple.object);
  
    if (predicate) {
      const predicates = Array.isArray(predicate) ? predicate : [predicate];
      return {
        values: results.filter((result, index) =>
          predicates.some(p => p.equals(this.triples[index].predicate))
        ),
        quads: () => this.triples.filter((triple) =>
          predicates.some(p => p.equals(triple.predicate)) && triple.subject === this.currentSubject
        ).map(triple => ({
          subject: { value: triple.subject },
          predicate: { value: triple.predicate },
          object: { value: triple.object }
        })),
        distinct: () => ({ values: [...new Set(results)] }),
      };
    }
  
    return {
      values: results,
      quads: () => this.triples.filter((triple) =>
        triple.subject === this.currentSubject
      ).map(triple => ({
        subject: { value: triple.subject },
        predicate: { value: triple.predicate },
        object: { value: triple.object }
      })),
      distinct: () => ({ values: [...new Set(results)] }),
    };
  };
  
  MockGrapoi.prototype.add = function (subject, predicate, object) {
    this.triples.push({ subject, predicate, object });
    return this;
  };
  
  MockGrapoi.prototype.debug = function () {
    return JSON.stringify(this.triples, null, 2);
  };
  