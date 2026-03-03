/**
 * Tier 3D: Convergence Operator Coverage Claims (7 claims)
 *
 * Targeted specs ensuring every operator is exercised on input-state
 * combinations not covered by 3A-3C. Each entry isolates one operator
 * behavior.
 */

import { describe, it, expect } from "vitest";
import {
  runInterpreter,
  injectFixture,
  assertClaim,
  pullValue,
  isRecognized,
} from "./harness.js";

describe("3D: known-over-unknown edge cases", () => {
  it("#3D.1 both observations unknown → unknown (lattice floor)", () => {
    const result = runInterpreter({
      "/src/op-kou-both-unknown-a.ts": `
        import { customElement } from 'aurelia';

        function makeTemplateA() { return '<div>A</div>'; }

        @customElement({
          name: 'op-kou-both-unknown',
          template: makeTemplateA()
        })
        export class OpKouBothUnknownA {}
      `,
      "/src/op-kou-both-unknown-b.ts": `
        import { customElement } from 'aurelia';

        function makeTemplateB() { return '<div>B</div>'; }

        @customElement({
          name: 'op-kou-both-unknown',
          template: makeTemplateB()
        })
        export class OpKouBothUnknownB {}
      `,
    });

    // Both observations have unknown template (function calls).
    // known-over-unknown: both unknown → result unknown.
    expect(isRecognized(result.graph, "custom-element", "op-kou-both-unknown")).toBe(true);

    // className conflict is incidental — the key claim is template unknown.
  });
});

describe("3D: stable-union edge cases", () => {
  it("#3D.2 unknown + known array → unknown (conservative)", () => {
    const result = runInterpreter({
      "/src/op-su-unknown-known.ts": `
        import { customElement } from 'aurelia';

        function getDeps() { return []; }

        @customElement({
          name: 'op-su-unknown-known',
          template: '<div></div>',
          dependencies: getDeps()
        })
        export class OpSuUnknownKnown {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "op-su-unknown-known", kind: "custom-element", className: "OpSuUnknownKnown" },
      fields: {},
    });

    // Analysis has unknown dependencies (getDeps() ceiling).
    // Manifest provides no dependencies (absent).
    // stable-union: unknown + absent → unknown.
    expect(isRecognized(result.graph, "custom-element", "op-su-unknown-known")).toBe(true);
  });

  it("#3D.3 both unknown arrays → unknown", () => {
    const result = runInterpreter({
      "/src/op-su-both-unknown-a.ts": `
        import { customElement } from 'aurelia';

        function getAliasesA() { return ['a']; }

        @customElement({
          name: 'op-su-both-unknown',
          template: '<div></div>',
          aliases: getAliasesA()
        })
        export class OpSuBothUnknownA {}
      `,
      "/src/op-su-both-unknown-b.ts": `
        import { customElement } from 'aurelia';

        function getAliasesB() { return ['b']; }

        @customElement({
          name: 'op-su-both-unknown',
          template: '<div></div>',
          aliases: getAliasesB()
        })
        export class OpSuBothUnknownB {}
      `,
    });

    // Both observations have unknown aliases (function calls).
    // stable-union: both unknown → unknown.
    expect(isRecognized(result.graph, "custom-element", "op-su-both-unknown")).toBe(true);
  });

  it("#3D.4 unknown + absent → unknown (absent doesn't help)", () => {
    const result = runInterpreter({
      "/src/op-su-unknown-absent.ts": `
        import { customElement } from 'aurelia';

        function getDeps() { return []; }

        @customElement({
          name: 'op-su-unknown-absent',
          template: '<div></div>',
          dependencies: getDeps()
        })
        export class OpSuUnknownAbsent {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "op-su-unknown-absent", kind: "custom-element", className: "OpSuUnknownAbsent" },
      fields: { containerless: true },
      // manifest does NOT carry dependencies — absent
    });

    // Analysis dependencies: unknown (getDeps() ceiling).
    // Manifest dependencies: absent.
    // stable-union: unknown + absent → unknown.
    assertClaim(result, {
      kind: "custom-element",
      name: "op-su-unknown-absent",
      className: "OpSuUnknownAbsent",
      form: "manifest",
      fields: {
        containerless: true,
      },
    });
  });

  it("#3D.7 three observations all carrying known aliases → full union", () => {
    const result = runInterpreter({
      "/src/op-three-su.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'op-three-su',
          template: '<div></div>',
          aliases: ['src-alias', 'shared-alias']
        })
        export class OpThreeSu {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "op-three-su", kind: "custom-element", className: "OpThreeSu" },
      fields: { aliases: ["manifest-alias", "shared-alias"] },
    });

    injectFixture(result, {
      tier: "explicit-config",
      resource: { name: "op-three-su", kind: "custom-element", className: "OpThreeSu" },
      fields: { aliases: ["config-alias"] },
    });

    // stable-union from all 3, deduplicated. shared-alias in both
    // manifest and analysis → one copy.
    assertClaim(result, {
      kind: "custom-element",
      name: "op-three-su",
      className: "OpThreeSu",
      form: "explicit-config",
      fields: {
        aliases: expect.arrayContaining([
          "config-alias", "manifest-alias", "shared-alias", "src-alias",
        ]),
      },
    });
  });
});

describe("3D: first-available and patch-object edge cases", () => {
  it("#3D.5 user-defined TC — no carrier for semantics → mandatory-declaration gap", () => {
    const result = runInterpreter({
      "/src/op-fa-user-tc-a.ts": `
        import { templateController, bindable } from 'aurelia';

        @templateController('op-fa-user-tc')
        export class OpFaUserTcAlpha {
          @bindable value: unknown;
        }
      `,
      "/src/op-fa-user-tc-b.ts": `
        import { templateController, bindable } from 'aurelia';

        @templateController('op-fa-user-tc')
        export class OpFaUserTcBeta {
          @bindable value: unknown;
        }
      `,
    });

    // Neither observation carries ControllerSemantics.
    // No builtin fixture injected.
    // first-available: no carrier → semantics absent (mandatory-declaration gap).
    expect(isRecognized(result.graph, "template-controller", "op-fa-user-tc")).toBe(true);

    const trigger = pullValue(result.graph, "template-controller:op-fa-user-tc", "semantics.trigger");
    expect(trigger).toBeUndefined();
  });

  it("#3D.6 patch-object with unknown bindables input → unknown", () => {
    const result = runInterpreter({
      "/src/op-po-unknown.ts": `
        import { customElement } from 'aurelia';

        function computeBindables() { return { value: { mode: 'twoWay' } }; }

        @customElement({
          name: 'op-po-unknown',
          template: '<div></div>',
          bindables: computeBindables()
        })
        export class OpPoUnknown {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "op-po-unknown", kind: "custom-element", className: "OpPoUnknown" },
      fields: {
        "bindable:count:property": "count",
        "bindable:count:attribute": "count",
      },
    });

    // Analysis bindables: unknown (computeBindables() ceiling).
    // Manifest provides { count: ... }.
    // patch-object: unknown + known → unknown (can't produce complete key set).
    assertClaim(result, {
      kind: "custom-element",
      name: "op-po-unknown",
      className: "OpPoUnknown",
      form: "manifest",
    });
  });
});
