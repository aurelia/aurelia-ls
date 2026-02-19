/**
 * Define Pattern Tests
 *
 * Coverage for imperative `.define()` resource declarations.
 */

import { describe, it, expect } from "vitest";
import type { NormalizedPath, TextSpan } from "@aurelia-ls/compiler";
import { matchDefine } from "../../../src/project-semantics/recognize/define.js";
import {
  array,
  classVal,
  importVal,
  literal,
  object,
  ref,
  type AnalyzableValue,
  type BindableMember,
} from "../../../src/project-semantics/evaluate/value/types.js";
import { unwrapSourced } from "../../../src/project-semantics/assemble/sourced.js";

// =============================================================================
// Test Helpers
// =============================================================================

const FILE = "/src/resources.ts" as NormalizedPath;
const SPAN: TextSpan = { start: 0, end: 1 };

function defineCall(
  resourceType: "CustomElement" | "CustomAttribute" | "ValueConverter" | "BindingBehavior",
  definition: AnalyzableValue,
  classRef: AnalyzableValue
) {
  return { resourceType, definition, classRef, span: SPAN };
}

// =============================================================================
// Custom Element
// =============================================================================

describe("matchDefine - CustomElement", () => {
  it("handles string-only definition", () => {
    const result = matchDefine(
      defineCall("CustomElement", literal("FancyCard"), ref("FancyCard")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("custom-element");
    expect(unwrapSourced(result.resource?.name)).toBe("fancy-card");
    expect(unwrapSourced(result.resource?.className)).toBe("FancyCard");
  });

  it("handles object definition with aliases, bindables, and template", () => {
    const def = object(new Map([
      ["name", literal("FancyCard")],
      ["aliases", array([literal("AliasOne"), literal("fancy-card")])],
      ["bindables", array([
        literal("value"),
        object(new Map([
          ["name", literal("active")],
          ["mode", literal("twoWay")],
          ["primary", literal(true)],
          ["attribute", literal("active")],
        ])),
      ])],
      ["containerless", literal(true)],
      ["template", literal("<template>Hi</template>")],
    ]));

    const result = matchDefine(
      defineCall("CustomElement", def, ref("FancyCard")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("custom-element");
    expect(unwrapSourced(result.resource?.name)).toBe("fancy-card");
    expect(result.resource?.aliases.map((alias) => alias.value)).toEqual([
      "alias-one",
      "fancy-card",
    ]);

    const bindables = result.resource?.bindables ?? {};
    expect(Object.keys(bindables).sort()).toEqual(["active", "value"]);
    expect(unwrapSourced(bindables.active?.primary)).toBe(true);
    expect(unwrapSourced(bindables.active?.mode)).toBe("twoWay");
    expect(unwrapSourced(bindables.active?.attribute)).toBe("active");
    expect(unwrapSourced(bindables.value?.primary)).toBe(false);
    expect(unwrapSourced(bindables.value?.attribute)).toBe("value");

    expect(unwrapSourced(result.resource?.containerless)).toBe(true);
    expect(unwrapSourced(result.resource?.inlineTemplate)).toBe("<template>Hi</template>");
  });

  it("handles bindables object form (aurelia2-plugins style)", () => {
    const def = object(new Map([
      ["name", literal("au-field")],
      ["bindables", object(new Map([
        ["value", object(new Map([
          ["primary", literal(true)],
          ["mode", literal("twoWay")],
        ]))],
        ["format", object(new Map([
          ["attribute", literal("format")],
        ]))],
      ]))],
    ]));

    const result = matchDefine(
      defineCall("CustomElement", def, ref("AuField")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("custom-element");
    expect(unwrapSourced(result.resource?.name)).toBe("au-field");

    const bindables = result.resource?.bindables ?? {};
    expect(Object.keys(bindables).sort()).toEqual(["format", "value"]);
    expect(unwrapSourced(bindables.value?.primary)).toBe(true);
    expect(unwrapSourced(bindables.value?.mode)).toBe("twoWay");
    expect(unwrapSourced(bindables.format?.attribute)).toBe("format");
  });

  it("uses bindable key spans from object form", () => {
    const keySpan: TextSpan = { start: 10, end: 18 };
    const bindablesObject = object(
      new Map([["value", object(new Map())]]),
      new Map(),
      undefined,
      new Map([["value", keySpan]]),
    );

    const def = object(new Map([
      ["name", literal("au-card")],
      ["bindables", bindablesObject],
    ]));

    const result = matchDefine(
      defineCall("CustomElement", def, ref("AuCard")),
      FILE
    );

    const bindables = result.resource?.bindables ?? {};
    expect(bindables.value?.property.location?.pos).toBe(keySpan.start);
    expect(bindables.value?.property.location?.end).toBe(keySpan.end);
  });

  it("accepts classRef imports as class names", () => {
    const result = matchDefine(
      defineCall(
        "CustomElement",
        literal("imported-element"),
        importVal("@aurelia/runtime-html", "ImportedElement")
      ),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(unwrapSourced(result.resource?.className)).toBe("ImportedElement");
    expect(unwrapSourced(result.resource?.name)).toBe("imported-element");
  });

  it("merges static and member bindables with define bindables", () => {
    const staticBindables = object(new Map([
      ["value", object(new Map([
        ["mode", literal("twoWay")],
        ["attribute", literal("static-value")],
      ]))],
      ["staticOnly", object(new Map([
        ["mode", literal("toView")],
      ]))],
    ]));

    const memberBindables: BindableMember[] = [
      {
        name: "value",
        args: [object(new Map([
          ["mode", literal("oneTime")],
          ["attribute", literal("member-value")],
        ]))],
        type: "string",
        span: SPAN,
      },
      {
        name: "memberOnly",
        args: [],
        type: "number",
        span: SPAN,
      },
    ];

    const cls = classVal(
      "FancyCard",
      FILE,
      [],
      new Map([["bindables", staticBindables]]),
      memberBindables,
      [],
      SPAN
    );

    const def = object(new Map([
      ["name", literal("FancyCard")],
      ["bindables", array([
        object(new Map([
          ["name", literal("value")],
          ["mode", literal("fromView")],
          ["attribute", literal("def-value")],
        ])),
        literal("defOnly"),
      ])],
    ]));

    const result = matchDefine(
      defineCall("CustomElement", def, ref("FancyCard")),
      FILE,
      [cls]
    );

    const bindables = result.resource?.bindables ?? {};
    expect(Object.keys(bindables).sort()).toEqual(["defOnly", "memberOnly", "staticOnly", "value"]);
    expect(unwrapSourced(bindables.value?.mode)).toBe("fromView");
    expect(unwrapSourced(bindables.value?.attribute)).toBe("def-value");
    expect(unwrapSourced(bindables.value?.type)).toBe("string");
    expect(unwrapSourced(bindables.staticOnly?.mode)).toBe("toView");
    expect(unwrapSourced(bindables.staticOnly?.attribute)).toBe("static-only");
    expect(unwrapSourced(bindables.memberOnly?.type)).toBe("number");
  });

  it("includes class bindables for string-only definitions", () => {
    const staticBindables = object(new Map([
      ["value", object(new Map([
        ["mode", literal("twoWay")],
      ]))],
    ]));

    const memberBindables: BindableMember[] = [
      {
        name: "memberOnly",
        args: [],
        span: SPAN,
      },
    ];

    const cls = classVal(
      "AlertCard",
      FILE,
      [],
      new Map([["bindables", staticBindables]]),
      memberBindables,
      [],
      SPAN
    );

    const result = matchDefine(
      defineCall("CustomElement", literal("alert-card"), ref("AlertCard")),
      FILE,
      [cls]
    );

    const bindables = result.resource?.bindables ?? {};
    expect(Object.keys(bindables).sort()).toEqual(["memberOnly", "value"]);
    expect(unwrapSourced(bindables.value?.mode)).toBe("twoWay");
  });
});

// =============================================================================
// Custom Attribute / Template Controller
// =============================================================================

describe("matchDefine - CustomAttribute", () => {
  it("infers primary bindable when a single bindable exists", () => {
    const def = object(new Map([
      ["name", literal("router-link")],
      ["bindables", array([literal("href")])],
    ]));

    const result = matchDefine(
      defineCall("CustomAttribute", def, ref("RouterLink")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("custom-attribute");
    expect(unwrapSourced(result.resource?.primary)).toBe("href");

    const bindables = result.resource?.bindables ?? {};
    expect(unwrapSourced(bindables.href?.primary)).toBe(true);
  });

  it("respects explicit primary bindable without defaultProperty", () => {
    const def = object(new Map([
      ["name", literal("tooltip")],
      ["bindables", array([
        object(new Map([
          ["name", literal("text")],
          ["primary", literal(true)],
        ])),
        literal("placement"),
      ])],
    ]));

    const result = matchDefine(
      defineCall("CustomAttribute", def, ref("Tooltip")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("custom-attribute");
    expect(unwrapSourced(result.resource?.primary)).toBe("text");

    const bindables = result.resource?.bindables ?? {};
    expect(unwrapSourced(bindables.text?.primary)).toBe(true);
    expect(unwrapSourced(bindables.placement?.primary)).toBe(false);
  });

  it("maps template controllers with defaultProperty to primary bindable", () => {
    const def = object(new Map([
      ["name", literal("if")],
      ["isTemplateController", literal(true)],
      ["defaultProperty", literal("value")],
      ["noMultiBindings", literal(true)],
    ]));

    const result = matchDefine(
      defineCall("CustomAttribute", def, ref("If")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("template-controller");
    expect(unwrapSourced(result.resource?.name)).toBe("if");
    expect(unwrapSourced(result.resource?.noMultiBindings)).toBe(true);

    const bindables = result.resource?.bindables ?? {};
    expect(Object.keys(bindables)).toEqual(["value"]);
    expect(unwrapSourced(bindables.value?.primary)).toBe(true);
  });

  it("uses defaultProperty for custom attributes", () => {
    const def = object(new Map([
      ["name", literal("foo-bar")],
      ["defaultProperty", literal("primary-prop")],
      ["bindables", array([literal("primaryProp"), literal("other")])],
    ]));

    const result = matchDefine(
      defineCall("CustomAttribute", def, ref("FooBar")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("custom-attribute");
    expect(unwrapSourced(result.resource?.name)).toBe("foo-bar");
    expect(unwrapSourced(result.resource?.primary)).toBe("primaryProp");

    const bindables = result.resource?.bindables ?? {};
    expect(unwrapSourced(bindables.primaryProp?.primary)).toBe(true);
    expect(unwrapSourced(bindables.other?.primary)).toBe(false);
  });
});

// =============================================================================
// Value Converter / Binding Behavior
// =============================================================================

describe("matchDefine - Simple Resources", () => {
  it("handles value converters with object definition", () => {
    const def = object(new Map([["name", literal("JSON")]]));
    const result = matchDefine(
      defineCall("ValueConverter", def, ref("JsonValueConverter")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("value-converter");
    expect(unwrapSourced(result.resource?.name)).toBe("json");
  });

  it("handles binding behaviors with string definition", () => {
    const result = matchDefine(
      defineCall("BindingBehavior", literal("Throttle"), importVal("@aurelia/runtime", "ThrottleBindingBehavior")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("binding-behavior");
    expect(unwrapSourced(result.resource?.name)).toBe("throttle");
  });

  it("falls back to className when name is omitted", () => {
    const result = matchDefine(
      defineCall("ValueConverter", object(new Map()), ref("MyJsonConverter")),
      FILE
    );

    expect(result.gaps.length).toBe(0);
    expect(result.resource?.kind).toBe("value-converter");
    expect(unwrapSourced(result.resource?.name)).toBe("myjsonconverter");
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe("matchDefine - error handling", () => {
  it("reports a gap for dynamic class references", () => {
    const result = matchDefine(
      defineCall("CustomElement", literal("foo-bar"), literal("NotAClass")),
      FILE
    );

    expect(result.resource).toBeNull();
    expect(result.gaps.length).toBe(1);
    expect(result.gaps[0]?.why.kind).toBe("dynamic-value");
    // R1: pre-recognition gap — className unknown, identity honestly absent
    expect(result.gaps[0]?.resource).toBeUndefined();
  });

  it("reports a gap for non-object definitions", () => {
    const result = matchDefine(
      defineCall("CustomElement", literal(123), ref("FooBar")),
      FILE
    );

    expect(result.resource).toBeNull();
    expect(result.gaps.length).toBe(1);
    expect(result.gaps[0]?.why.kind).toBe("dynamic-value");
    // R1: gap carries resource identity (className known, kind from context)
    expect(result.gaps[0]?.resource?.kind).toBe("custom-element");
    expect(result.gaps[0]?.resource?.name).toBe("FooBar");
  });

  it("reports a gap for empty names", () => {
    const result = matchDefine(
      defineCall("CustomElement", literal(""), ref("EmptyName")),
      FILE
    );

    expect(result.resource).toBeNull();
    expect(result.gaps.length).toBe(1);
    expect(result.gaps[0]?.why.kind).toBe("invalid-resource-name");
    // R1: invalidNameGap carries resource identity
    expect(result.gaps[0]?.resource?.kind).toBe("custom-element");
    expect(result.gaps[0]?.resource?.name).toBe("EmptyName");
  });
});
