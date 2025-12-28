import { test, describe } from "vitest";
import assert from "node:assert/strict";

import { AttrSyntax, AttributeParser, createDefaultSyntax, registerBuiltins } from "../../out/compiler/index.js";

describe("attribute parser / built-ins", () => {
  test("parses dot binding (PART.PART)", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("value.bind", "1");

    assert.equal(attr.rawName, "value.bind");
    assert.equal(attr.rawValue, "1");
    assert.equal(attr.target, "value");
    assert.equal(attr.command, "bind");
    assert.equal(attr.parts, null);
  });

  test("parses triple-part binding (PART.PART.PART)", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("foo.bar.two-way", "v");

    assert.equal(attr.target, "foo.bar");
    assert.equal(attr.command, "two-way");
    assert.equal(attr.parts, null);
  });

  test("normalizes view-model.ref to component.ref", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("view-model.ref", "vm");

    assert.equal(attr.target, "component");
    assert.equal(attr.command, "ref");
  });

  test("parses event capture with modifier", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("click.capture:once", "handler");

    assert.equal(attr.target, "click");
    assert.equal(attr.command, "capture");
    assert.deepEqual(attr.parts, ["click", "once"]);
  });

  test("parses colon-prefixed bind", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse(":class", "active");

    assert.equal(attr.target, "class");
    assert.equal(attr.command, "bind");
    assert.equal(attr.parts, null);
  });

  test("prefers @PART:PART over @PART and preserves trigger shape", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("@click:once", "onClick");

    assert.equal(attr.target, "click");
    assert.equal(attr.command, "trigger");
    assert.deepEqual(attr.parts, ["click", "trigger", "once"]);
  });

  test("falls back to identity when no pattern matches", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("data-foo", "bar");

    assert.equal(attr.target, "data-foo");
    assert.equal(attr.command, null);
    assert.equal(attr.parts, null);
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
    assert.equal(attr.command, "static");
    assert.equal(attr.target, "static-target");
  });

  test("rejects registrations after first parse", () => {
    const parser = registerBuiltins(new AttributeParser());
    parser.parse("value.bind", "v");

    assert.throws(
      () => parser.registerPattern([{ pattern: "x", symbols: "" }], {
        x: (rawName, rawValue, parts) => new AttrSyntax(rawName, rawValue, parts[0] ?? "x", "x"),
      }),
      /AttributeParser already used/,
    );
  });

  test("rejects duplicate patterns", () => {
    const parser = new AttributeParser();
    parser.registerPattern([{ pattern: "foo", symbols: "" }], {
      foo: (rawName, rawValue) => new AttrSyntax(rawName, rawValue, "foo", null),
    });

    assert.throws(
      () => parser.registerPattern([{ pattern: "foo", symbols: "" }], {
        foo: (rawName, rawValue) => new AttrSyntax(rawName, rawValue, "dup", null),
      }),
      /Duplicate attribute pattern "foo"/,
    );
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

    assert.equal(calls, 2);
    assert.equal(first.target, "a");
    assert.equal(second.target, "b");
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
    assert.equal(impl.seenThis, impl);
  });

  test("dynamic segments must be non-empty", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("value..bind", "v");

    assert.equal(attr.command, null);
    assert.equal(attr.target, "value..bind");
    assert.equal(attr.parts, null);
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

    assert.equal(attr.command, "more-symbols");
    assert.equal(attr.target, "dot-form");
    assert.deepEqual(attr.parts, ["foo", "bar"]); // picked the pattern that splits at the dot
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
            assert.equal(attr.command, null);
            assert.equal(attr.target, raw);
            assert.equal(attr.parts, null);
            return;
          }

          const expectedParts = normalizeParts(match, parts);
          assert.equal(attr.command, match);
          assert.equal(attr.target, `target:${match}`);
          assert.deepEqual(attr.parts, expectedParts);
        });
      }
    });
  }
});
