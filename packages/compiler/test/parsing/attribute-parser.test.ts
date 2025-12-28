import { test, describe, expect } from "vitest";

import { AttrSyntax, AttributeParser, createDefaultSyntax, registerBuiltins } from "@aurelia-ls/compiler";

describe("attribute parser / built-ins", () => {
  test("parses dot binding (PART.PART)", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("value.bind", "1");

    expect(attr.rawName).toBe("value.bind");
    expect(attr.rawValue).toBe("1");
    expect(attr.target).toBe("value");
    expect(attr.command).toBe("bind");
    expect(attr.parts).toBe(null);
  });

  test("parses triple-part binding (PART.PART.PART)", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("foo.bar.two-way", "v");

    expect(attr.target).toBe("foo.bar");
    expect(attr.command).toBe("two-way");
    expect(attr.parts).toBe(null);
  });

  test("normalizes view-model.ref to component.ref", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("view-model.ref", "vm");

    expect(attr.target).toBe("component");
    expect(attr.command).toBe("ref");
  });

  test("parses event capture with modifier", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("click.capture:once", "handler");

    expect(attr.target).toBe("click");
    expect(attr.command).toBe("capture");
    expect(attr.parts).toEqual(["click", "once"]);
  });

  test("parses colon-prefixed bind", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse(":class", "active");

    expect(attr.target).toBe("class");
    expect(attr.command).toBe("bind");
    expect(attr.parts).toBe(null);
  });

  test("prefers @PART:PART over @PART and preserves trigger shape", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("@click:once", "onClick");

    expect(attr.target).toBe("click");
    expect(attr.command).toBe("trigger");
    expect(attr.parts).toEqual(["click", "trigger", "once"]);
  });

  test("falls back to identity when no pattern matches", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("data-foo", "bar");

    expect(attr.target).toBe("data-foo");
    expect(attr.command).toBe(null);
    expect(attr.parts).toBe(null);
  });
});

describe("attribute parser / precedence and lifecycle", () => {
  test("prefers more statics over dynamics", () => {
    const parser = new AttributeParser();
    parser.registerPattern([{ pattern: "foo.PART", symbols: "." }], {
      "foo.PART": (rawName, rawValue, parts) => new AttrSyntax(rawName, rawValue, `dynamic:${parts[0]}`, "dynamic"),
    });
    parser.registerPattern([{ pattern: "foo.bar", symbols: "." }], {
      "foo.bar": (rawName, rawValue) => new AttrSyntax(rawName, rawValue, "static-target", "static"),
    });

    const attr = parser.parse("foo.bar", "v");
    expect(attr.command).toBe("static");
    expect(attr.target).toBe("static-target");
  });

  test("rejects registrations after first parse", () => {
    const parser = registerBuiltins(new AttributeParser());
    parser.parse("value.bind", "v");

    expect(
      () => parser.registerPattern([{ pattern: "x", symbols: "" }], {
        x: (rawName, rawValue, parts) => new AttrSyntax(rawName, rawValue, parts[0] ?? "x", "x"),
      }),
    ).toThrow(/AttributeParser already used/);
  });

  test("rejects duplicate patterns", () => {
    const parser = new AttributeParser();
    parser.registerPattern([{ pattern: "foo", symbols: "" }], {
      foo: (rawName, rawValue) => new AttrSyntax(rawName, rawValue, "foo", null),
    });

    expect(
      () => parser.registerPattern([{ pattern: "foo", symbols: "" }], {
        foo: (rawName, rawValue) => new AttrSyntax(rawName, rawValue, "dup", null),
      }),
    ).toThrow(/Duplicate attribute pattern "foo"/);
  });

  test("calls handler even when cache hits (value-dependent)", () => {
    const parser = new AttributeParser();
    let calls = 0;
    parser.registerPattern([{ pattern: "x", symbols: "" }], {
      x: (rawName, rawValue) => {
        calls++;
        return new AttrSyntax(rawName, rawValue, rawValue, "x");
      },
    });

    const first = parser.parse("x", "a");
    const second = parser.parse("x", "b");

    expect(calls).toBe(2);
    expect(first.target).toBe("a");
    expect(second.target).toBe("b");
  });

  test("binds handlers to their implementation object", () => {
    const parser = new AttributeParser();
    const impl = {
      seenThis: null,
      foo(rawName, rawValue, parts) {
        this.seenThis = this;
        return new AttrSyntax(rawName, rawValue, parts[0] ?? "x", "foo");
      },
    };
    parser.registerPattern([{ pattern: "foo", symbols: "" }], impl);

    parser.parse("foo", "v");
    expect(impl.seenThis).toBe(impl);
  });

  test("dynamic segments must be non-empty", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("value..bind", "v");

    expect(attr.command).toBe(null);
    expect(attr.target).toBe("value..bind");
    expect(attr.parts).toBe(null);
  });

  test("ties favor more symbol runs when statics/dynamics equal", () => {
    const parser = new AttributeParser();
    parser.registerPattern([
      { pattern: "a.PART:PART", symbols: ".:" },   // symbols=2 ('.' and ':')
      { pattern: "aPART:PART", symbols: ":" },     // symbols=1 (only ':')
    ], {
      "a.PART:PART": (rawName, rawValue, parts) => new AttrSyntax(rawName, rawValue, "dot-form", "more-symbols", parts),
      "aPART:PART": (rawName, rawValue, parts) => new AttrSyntax(rawName, rawValue, "plain", "fewer-symbols", parts),
    });

    const attr = parser.parse("a.foo:bar", "v");

    expect(attr.command).toBe("more-symbols");
    expect(attr.target).toBe("dot-form");
    expect(attr.parts).toEqual(["foo", "bar"]); // picked the pattern that splits at the dot
  });
});

describe("attribute parser / legacy parity matrices", () => {
  const matrices = [
    {
      defs: [
        { pattern: "PART.PART", symbols: "." },
      ],
      cases: [
        { raw: "value.bind", match: "PART.PART", parts: ["value", "bind"] },
        { raw: ".bind", match: null, parts: [] },
        { raw: "bind", match: null, parts: [] },
        { raw: "value.", match: null, parts: [] },
        { raw: "value", match: null, parts: [] },
        { raw: ".", match: null, parts: [] },
      ],
    },
    {
      defs: [
        { pattern: "PART.PART", symbols: "." },
        { pattern: "asdf.PART", symbols: "." },
        { pattern: "PART.asdf", symbols: "." },
      ],
      cases: [
        { raw: "value.bind", match: "PART.PART", parts: ["value", "bind"] },
        { raw: ".bind", match: null, parts: [] },
        { raw: "bind", match: null, parts: [] },
        { raw: "value.", match: null, parts: [] },
        { raw: "value", match: null, parts: [] },
        { raw: ".", match: null, parts: [] },
      ],
    },
    {
      defs: [
        { pattern: "PART.PART", symbols: "." },
        { pattern: ":PART", symbols: ":" },
      ],
      cases: [
        { raw: "value.bind", match: "PART.PART", parts: ["value", "bind"] },
        { raw: ":.:", match: "PART.PART", parts: [":", ":"] },
        { raw: ":value.bind", match: "PART.PART", parts: [":value", "bind"] },
        { raw: "value.bind:", match: "PART.PART", parts: ["value", "bind:"] },
        { raw: ":value", match: ":PART", parts: ["value"] },
        { raw: ":.", match: ":PART", parts: ["."] },
        { raw: ":value.", match: ":PART", parts: ["value."] },
        { raw: ".bind", match: null, parts: [] },
        { raw: "bind", match: null, parts: [] },
        { raw: "value.", match: null, parts: [] },
        { raw: "value", match: null, parts: [] },
        { raw: "value:", match: null, parts: [] },
        { raw: ".", match: null, parts: [] },
        { raw: ":", match: null, parts: [] },
        { raw: "::", match: null, parts: [] },
        { raw: "..", match: null, parts: [] },
        { raw: ".:", match: null, parts: [] },
        { raw: ".value:", match: null, parts: [] },
        { raw: "value:bind", match: null, parts: [] },
      ],
    },
    {
      defs: [
        { pattern: "PART.PART", symbols: "." },
        { pattern: "@PART", symbols: "@" },
      ],
      cases: [
        { raw: "value.bind", match: "PART.PART", parts: ["value", "bind"] },
        { raw: "@.@", match: "PART.PART", parts: ["@", "@"] },
        { raw: "@value.bind", match: "PART.PART", parts: ["@value", "bind"] },
        { raw: "value.bind@", match: "PART.PART", parts: ["value", "bind@"] },
        { raw: "@value", match: "@PART", parts: ["value"] },
        { raw: "@.", match: "@PART", parts: ["."] },
        { raw: "@value.", match: "@PART", parts: ["value."] },
        { raw: ".bind", match: null, parts: [] },
        { raw: "bind", match: null, parts: [] },
        { raw: "value.", match: null, parts: [] },
        { raw: "value", match: null, parts: [] },
        { raw: "value@", match: null, parts: [] },
        { raw: ".", match: null, parts: [] },
        { raw: "@", match: null, parts: [] },
        { raw: "@@", match: null, parts: [] },
        { raw: "..", match: null, parts: [] },
        { raw: ".@", match: null, parts: [] },
        { raw: ".value@", match: null, parts: [] },
        { raw: "value@bind", match: null, parts: [] },
      ],
    },
    {
      defs: [
        { pattern: "PART.PART", symbols: "." },
        { pattern: "@PART", symbols: "@" },
        { pattern: ":PART", symbols: ":" },
      ],
      cases: [
        { raw: "value.bind", match: "PART.PART", parts: ["value", "bind"] },
        { raw: ":value", match: ":PART", parts: ["value"] },
        { raw: "@value", match: "@PART", parts: ["value"] },
        { raw: ":.:", match: "PART.PART", parts: [":", ":"] },
        { raw: "@.@", match: "PART.PART", parts: ["@", "@"] },
        { raw: ":value.bind", match: "PART.PART", parts: [":value", "bind"] },
        { raw: "@value.bind", match: "PART.PART", parts: ["@value", "bind"] },
        { raw: "@:value.bind", match: "PART.PART", parts: ["@:value", "bind"] },
        { raw: ":@value.bind", match: "PART.PART", parts: [":@value", "bind"] },
        { raw: "@:value", match: "@PART", parts: [":value"] },
        { raw: ":@value", match: ":PART", parts: ["@value"] },
        { raw: "value.bind:", match: "PART.PART", parts: ["value", "bind:"] },
        { raw: "value.bind@", match: "PART.PART", parts: ["value", "bind@"] },
        { raw: ":value.", match: ":PART", parts: ["value."] },
        { raw: "@value.", match: "@PART", parts: ["value."] },
        { raw: ".bind", match: null, parts: [] },
        { raw: "bind", match: null, parts: [] },
        { raw: "value.", match: null, parts: [] },
        { raw: "value", match: null, parts: [] },
        { raw: "value:", match: null, parts: [] },
        { raw: "value@", match: null, parts: [] },
        { raw: ".", match: null, parts: [] },
        { raw: "..", match: null, parts: [] },
        { raw: ":", match: null, parts: [] },
        { raw: "@", match: null, parts: [] },
        { raw: "::", match: null, parts: [] },
        { raw: "@@", match: null, parts: [] },
        { raw: ".:", match: null, parts: [] },
        { raw: ".@", match: null, parts: [] },
        { raw: ".value:", match: null, parts: [] },
        { raw: ".value@", match: null, parts: [] },
        { raw: "value:bind", match: null, parts: [] },
        { raw: "value@bind", match: null, parts: [] },
      ],
    },
    {
      defs: [
        { pattern: "promise.resolve", symbols: "" },
        { pattern: "then", symbols: "" },
        { pattern: "catch", symbols: "" },
        { pattern: "ref", symbols: "" },
        { pattern: "PART.ref", symbols: "." },
        { pattern: "PART.PART", symbols: "." },
        { pattern: "PART.PART.PART", symbols: "." },
        { pattern: "t.PART", symbols: "." },
        { pattern: "PART.t", symbols: "." },
        { pattern: "t", symbols: "" },
        { pattern: "t.bind", symbols: "" },
        { pattern: "t-params.bind", symbols: "" },
      ],
      cases: [
        { raw: "t", match: "t", parts: ["t"] },
        { raw: "tt.bind", match: "PART.PART", parts: ["tt", "bind"] },
        { raw: "t.bind", match: "t.PART", parts: ["t", "bind"] },
        { raw: "then", match: "then", parts: ["then"] },
        { raw: "t-params.bind", match: "t-params.bind", parts: ["t-params.bind"] },
      ],
    },
    {
      defs: [
        { pattern: "then", symbols: "" },
        { pattern: "the", symbols: "" },
        { pattern: "th", symbols: "" },
        { pattern: "t", symbols: "" },
        { pattern: "t.PART", symbols: "." },
      ],
      cases: [
        { raw: "tt", match: null, parts: [] },
        { raw: "t", match: "t", parts: ["t"] },
        { raw: "th", match: "th", parts: ["th"] },
        { raw: "the", match: "the", parts: ["the"] },
        { raw: "then", match: "then", parts: ["then"] },
      ],
    },
    {
      defs: [
        { pattern: "then", symbols: "" },
        { pattern: "the", symbols: "" },
        { pattern: "th", symbols: "" },
        { pattern: "t", symbols: "" },
        { pattern: "t.PART", symbols: "." },
      ],
      cases: [
        { raw: "then", match: "then", parts: ["then"] },
        { raw: "the", match: "the", parts: ["the"] },
        { raw: "th", match: "th", parts: ["th"] },
        { raw: "t", match: "t", parts: ["t"] },
        { raw: "tt", match: null, parts: [] },
      ],
    },
    {
      defs: [
        { pattern: "t", symbols: "" },
        { pattern: "th", symbols: "" },
        { pattern: "the", symbols: "" },
        { pattern: "then", symbols: "" },
        { pattern: "t.PART", symbols: "." },
      ],
      cases: [
        { raw: "then", match: "then", parts: ["then"] },
        { raw: "the", match: "the", parts: ["the"] },
        { raw: "th", match: "th", parts: ["th"] },
        { raw: "t", match: "t", parts: ["t"] },
        { raw: "tt", match: null, parts: [] },
      ],
    },
    {
      defs: [
        { pattern: "t", symbols: "" },
        { pattern: "th", symbols: "" },
        { pattern: "the", symbols: "" },
        { pattern: "then", symbols: "" },
        { pattern: "t.PART", symbols: "." },
      ],
      cases: [
        { raw: "t", match: "t", parts: ["t"] },
        { raw: "th", match: "th", parts: ["th"] },
        { raw: "the", match: "the", parts: ["the"] },
        { raw: "then", match: "then", parts: ["then"] },
        { raw: "tt", match: null, parts: [] },
      ],
    },
  ];

  function countParts(pattern) {
    return (pattern.match(/PART/g) ?? []).length;
  }

  function normalizeParts(pattern, expectedParts) {
    const partCount = countParts(pattern);
    if (partCount === 0) return [];
    return expectedParts.slice(expectedParts.length - partCount);
  }

  for (const { defs, cases } of matrices) {
    describe(`patterns [${defs.map((d) => d.pattern).join(", ")}]`, () => {
      const parser = (() => {
        const p = new AttributeParser();
        const impl = {};
        for (const def of defs) {
          impl[def.pattern] = (rawName, rawValue, parts) =>
            new AttrSyntax(rawName, rawValue, `target:${def.pattern}`, def.pattern, parts);
        }
        p.registerPattern(defs, impl);
        return p;
      })();

      for (const { raw, match, parts } of cases) {
        test(`parse ${raw} -> ${match ?? "no match"}`, () => {
          const attr = parser.parse(raw, "foo");

          if (match === null) {
            expect(attr.command).toBe(null);
            expect(attr.target).toBe(raw);
            expect(attr.parts).toBe(null);
            return;
          }

          const expectedParts = normalizeParts(match, parts);
          expect(attr.command).toBe(match);
          expect(attr.target).toBe(`target:${match}`);
          expect(attr.parts).toEqual(expectedParts);
        });
      }
    });
  }
});
