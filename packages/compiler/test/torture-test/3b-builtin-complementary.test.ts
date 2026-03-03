/**
 * Tier 3B: Builtin + Source-Derived Complementary Claims (4 claims)
 *
 * Conclusion claims where a builtin observation (behavioral fields)
 * and a source-derived observation (structural fields) merge across
 * strata. Only template controllers have behavioral fields (stratum 2).
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  injectFixture,
  assertClaim,
} from "./harness.js";

describe("3B: Builtin TC complementary merge", () => {
  it("#3B.1 if — value trigger, no scope, no contextuals", () => {
    const result = runInterpreter({
      "/src/builtin-if.src.ts": `
        export class If {
          static $au = {
            type: 'custom-attribute',
            name: 'if',
            isTemplateController: true,
            bindables: ['value']
          };

          value: boolean = false;
        }
      `,
    });

    injectFixture(result, {
      tier: "builtin",
      resource: { name: "if", kind: "template-controller", className: "If" },
      fields: {
        "semantics.trigger": "value",
        "semantics.scope": "reuse",
        "semantics.cardinality": "zero-one",
      },
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "if",
      className: "If",
      form: "static-$au",
      fields: {
        "bindable:value:property": "value",
        "semantics.trigger": "value",
        "semantics.scope": "reuse",
        "semantics.cardinality": "zero-one",
      },
    });
  });

  it("#3B.2 repeat — iterator trigger, scope creation, 8 contextuals", () => {
    const result = runInterpreter({
      "/src/builtin-repeat.src.ts": `
        export class Repeat {
          static $au = {
            type: 'custom-attribute',
            name: 'repeat',
            isTemplateController: true,
            bindables: ['items', 'local', 'key'],
            defaultProperty: 'items'
          };

          items: unknown;
          local: string = 'item';
          key: string | null = null;
        }
      `,
    });

    injectFixture(result, {
      tier: "builtin",
      resource: { name: "repeat", kind: "template-controller", className: "Repeat" },
      fields: {
        "semantics.trigger": "iterator",
        "semantics.scope": "overlay",
        "semantics.cardinality": "zero-many",
      },
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "repeat",
      className: "Repeat",
      form: "static-$au",
      fields: {
        "bindable:items:property": "items",
        "bindable:local:property": "local",
        "bindable:key:property": "key",
        "semantics.trigger": "iterator",
        "semantics.scope": "overlay",
        "semantics.cardinality": "zero-many",
      },
    });
  });

  it("#3B.3 else — branch relationship (sibling → if)", () => {
    const result = runInterpreter({
      "/src/builtin-else.src.ts": `
        export class Else {
          static $au = {
            type: 'custom-attribute',
            name: 'else',
            isTemplateController: true,
            bindables: []
          };
        }
      `,
    });

    injectFixture(result, {
      tier: "builtin",
      resource: { name: "else", kind: "template-controller", className: "Else" },
      fields: {
        "semantics.trigger": "branch",
        "semantics.scope": "reuse",
        "semantics.cardinality": "zero-one",
      },
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "else",
      className: "Else",
      form: "static-$au",
      fields: {
        "semantics.trigger": "branch",
        "semantics.scope": "reuse",
        "semantics.cardinality": "zero-one",
      },
    });
  });

  it("#3B.4 promise — scope creation without contextuals", () => {
    const result = runInterpreter({
      "/src/builtin-promise.src.ts": `
        export class PromiseTemplateController {
          static $au = {
            type: 'custom-attribute',
            name: 'promise',
            isTemplateController: true,
            bindables: ['value']
          };

          value: unknown;
        }
      `,
    });

    injectFixture(result, {
      tier: "builtin",
      resource: { name: "promise", kind: "template-controller", className: "PromiseTemplateController" },
      fields: {
        "semantics.trigger": "value",
        "semantics.scope": "overlay",
        "semantics.cardinality": "zero-one",
      },
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "promise",
      className: "PromiseTemplateController",
      form: "static-$au",
      fields: {
        "bindable:value:property": "value",
        "semantics.trigger": "value",
        "semantics.scope": "overlay",
        "semantics.cardinality": "zero-one",
      },
    });
  });
});
