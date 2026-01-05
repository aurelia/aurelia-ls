import { test, describe, expect } from "vitest";

import { AttrSyntax, AttributeParser, createDefaultSyntax, registerBuiltins } from "@aurelia-ls/compiler";
import type { AttributePatternConfig } from "@aurelia-ls/compiler";

describe("attribute parser / built-ins", () => {
  test("parses dot binding (PART.PART)", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("value.bind", "1");

    expect(attr.rawName).toBe("value.bind");
    expect(attr.rawValue).toBe("1");
    expect(attr.target).toBe("value");
    expect(attr.command).toBe("bind");
    expect(attr.parts).toBe(null);
    // Standard PART.PART pattern has no mode override
    expect(attr.mode).toBe(null);
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
    // PART.capture:PART has injectCommand: false - parts are passed through as matched
    expect(attr.parts).toEqual(["click", "once"]);
  });

  test("parses colon-prefixed bind with toView mode", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse(":class", "active");

    expect(attr.target).toBe("class");
    expect(attr.command).toBe("bind");
    expect(attr.parts).toBe(null);
    // Colon shorthand produces mode "toView" (not "default") via pattern config
    expect(attr.mode).toBe("toView");
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

  test("parses i18n t pattern", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("t", "greeting.hello");

    expect(attr.rawName).toBe("t");
    expect(attr.rawValue).toBe("greeting.hello");
    expect(attr.target).toBe("");
    expect(attr.command).toBe("t");
    expect(attr.parts).toBe(null);
  });

  test("parses i18n t.bind pattern", () => {
    const parser = createDefaultSyntax();
    const attr = parser.parse("t.bind", "translationKey");

    expect(attr.rawName).toBe("t.bind");
    expect(attr.rawValue).toBe("translationKey");
    expect(attr.target).toBe("");
    expect(attr.command).toBe("t.bind");
    expect(attr.parts).toBe(null);
  });
});

describe("attribute parser / precedence and lifecycle", () => {
  test("prefers more statics over dynamics", () => {
    const parser = new AttributeParser();
    parser.registerPatterns([
      { pattern: "foo.PART", symbols: ".", interpret: { kind: "fixed", target: "dynamic-target", command: "dynamic" } },
      { pattern: "foo.bar", symbols: ".", interpret: { kind: "fixed", target: "static-target", command: "static" } },
    ]);

    const attr = parser.parse("foo.bar", "v");
    expect(attr.command).toBe("static");
    expect(attr.target).toBe("static-target");
  });

  test("rejects registrations after first parse", () => {
    const parser = registerBuiltins(new AttributeParser());
    parser.parse("value.bind", "v");

    expect(
      () => parser.registerPatterns([
        { pattern: "x", symbols: "", interpret: { kind: "fixed", target: "x", command: "x" } },
      ]),
    ).toThrow(/AttributeParser already used/);
  });

  test("rejects duplicate patterns", () => {
    const parser = new AttributeParser();
    parser.registerPatterns([
      { pattern: "foo", symbols: "", interpret: { kind: "fixed", target: "foo", command: null } },
    ]);

    expect(
      () => parser.registerPatterns([
        { pattern: "foo", symbols: "", interpret: { kind: "fixed", target: "dup", command: null } },
      ]),
    ).toThrow(/Duplicate attribute pattern "foo"/);
  });

  test("interpretation is deterministic (pure function of config + parts)", () => {
    const parser = new AttributeParser();
    parser.registerPatterns([
      { pattern: "x", symbols: "", interpret: { kind: "fixed-command", command: "x" } },
    ]);

    // Parse same name with different values - target should be consistent
    const first = parser.parse("x", "a");
    const second = parser.parse("x", "b");

    expect(first.target).toBe("x");
    expect(second.target).toBe("x");
    expect(first.rawValue).toBe("a");
    expect(second.rawValue).toBe("b");
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
    parser.registerPatterns([
      { pattern: "a.PART:PART", symbols: ".:", interpret: { kind: "fixed", target: "dot-form", command: "more-symbols" } },
      { pattern: "aPART:PART", symbols: ":", interpret: { kind: "fixed", target: "plain", command: "fewer-symbols" } },
    ]);

    const attr = parser.parse("a.foo:bar", "v");

    expect(attr.command).toBe("more-symbols");
    expect(attr.target).toBe("dot-form");
    // With fixed interpret, parts is null
    expect(attr.parts).toBe(null);
  });
});

describe("attribute parser / legacy parity matrices", () => {
  /**
   * These matrices test pattern *matching* behavior, not interpretation.
   * Each pattern uses a config that makes match/parts easy to verify:
   * - target becomes "target:{pattern}"
   * - command becomes the pattern name
   * - parts come from a target-command interpretation
   */
  const matrices: Array<{
    defs: Array<{ pattern: string; symbols: string }>;
    cases: Array<{ raw: string; match: string | null; parts: string[] }>;
  }> = [
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
        { raw: "t", match: "t", parts: [] },  // literal pattern, no PART
        { raw: "tt.bind", match: "PART.PART", parts: ["tt", "bind"] },
        { raw: "t.bind", match: "t.PART", parts: ["bind"] },  // "t" is literal, only PART extracted
        { raw: "then", match: "then", parts: [] },  // literal pattern, no PART
        { raw: "t-params.bind", match: "t-params.bind", parts: [] },  // literal pattern, no PART
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
        { raw: "t", match: "t", parts: [] },  // literal pattern
        { raw: "th", match: "th", parts: [] },  // literal pattern
        { raw: "the", match: "the", parts: [] },  // literal pattern
        { raw: "then", match: "then", parts: [] },  // literal pattern
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
        { raw: "then", match: "then", parts: [] },  // literal pattern
        { raw: "the", match: "the", parts: [] },  // literal pattern
        { raw: "th", match: "th", parts: [] },  // literal pattern
        { raw: "t", match: "t", parts: [] },  // literal pattern
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
        { raw: "then", match: "then", parts: [] },  // literal pattern
        { raw: "the", match: "the", parts: [] },  // literal pattern
        { raw: "th", match: "th", parts: [] },  // literal pattern
        { raw: "t", match: "t", parts: [] },  // literal pattern
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
        { raw: "t", match: "t", parts: [] },  // literal pattern
        { raw: "th", match: "th", parts: [] },  // literal pattern
        { raw: "the", match: "the", parts: [] },  // literal pattern
        { raw: "then", match: "then", parts: [] },  // literal pattern
        { raw: "tt", match: null, parts: [] },
      ],
    },
  ];

  /**
   * Convert a simple def into an AttributePatternConfig for testing.
   * Uses "passthrough" interpretation that:
   * - Makes the pattern name visible in output (command = pattern)
   * - Preserves matched parts for verification
   * This tests pattern *matching*, not interpretation semantics.
   */
  function toConfig(def: { pattern: string; symbols: string }): AttributePatternConfig {
    // All patterns use passthrough interpretation with pattern name as command
    // This makes it easy to verify which pattern matched AND what parts were extracted
    return {
      pattern: def.pattern,
      symbols: def.symbols,
      interpret: { kind: "passthrough", target: `target:${def.pattern}`, command: def.pattern },
    };
  }

  for (const { defs, cases } of matrices) {
    describe(`patterns [${defs.map((d) => d.pattern).join(", ")}]`, () => {
      const parser = (() => {
        const p = new AttributeParser();
        p.registerPatterns(defs.map(toConfig));
        return p;
      })();

      for (const { raw, match, parts: expectedParts } of cases) {
        test(`parse ${raw} -> ${match ?? "no match"}`, () => {
          const attr = parser.parse(raw, "foo");

          if (match === null) {
            // No pattern matched - identity fallback
            expect(attr.command).toBe(null);
            expect(attr.target).toBe(raw);
            expect(attr.parts).toBe(null);
            return;
          }

          // Verify the pattern matched by checking command equals pattern name
          expect(attr.command).toBe(match);
          // All patterns use passthrough interpretation: target is "target:{pattern}"
          expect(attr.target).toBe(`target:${match}`);
          // Verify the extracted parts match expected
          expect(attr.parts).toEqual(expectedParts);
        });
      }
    });
  }
});
