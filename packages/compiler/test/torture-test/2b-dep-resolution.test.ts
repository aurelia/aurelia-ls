/**
 * Tier 2B: Dependency Array Resolution (11 entries, 25 files)
 *
 * Tests that class references in dependencies arrays resolve to
 * resource identities through cross-file evaluation.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim, isRecognized } from "./harness.js";

describe("2B: Per-kind dependency resolution", () => {
  it("#2B.1 single CE dependency", () => {
    const result = runInterpreter({
      "/src/dep-single-ce.child.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'child-el', template: '<span>child</span>' })
        export class ChildEl {}
      `,
      "/src/dep-single-ce.ts": `
        import { customElement } from 'aurelia';
        import { ChildEl } from './dep-single-ce.child';

        @customElement({
          name: 'dep-single-ce',
          template: '<child-el></child-el>',
          dependencies: [ChildEl],
        })
        export class DepSingleCe {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "dep-single-ce",
      className: "DepSingleCe",
      form: "decorator",
    });
    assertClaim(result, {
      kind: "custom-element",
      name: "child-el",
      className: "ChildEl",
      form: "decorator",
    });
  });

  it("#2B.2 single CA dependency", () => {
    const result = runInterpreter({
      "/src/dep-single-ca.child.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute('child-attr')
        export class ChildAttr {}
      `,
      "/src/dep-single-ca.ts": `
        import { customElement } from 'aurelia';
        import { ChildAttr } from './dep-single-ca.child';

        @customElement({
          name: 'dep-single-ca',
          template: '<div child-attr></div>',
          dependencies: [ChildAttr],
        })
        export class DepSingleCa {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "dep-single-ca",
      className: "DepSingleCa",
      form: "decorator",
    });
    assertClaim(result, {
      kind: "custom-attribute",
      name: "child-attr",
      className: "ChildAttr",
      form: "decorator",
    });
  });

  it("#2B.3 single VC dependency (camelCase name)", () => {
    const result = runInterpreter({
      "/src/dep-single-vc.child.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter('childFormat')
        export class ChildFormat {
          toView(value: unknown): unknown { return value; }
        }
      `,
      "/src/dep-single-vc.ts": `
        import { customElement } from 'aurelia';
        import { ChildFormat } from './dep-single-vc.child';

        @customElement({
          name: 'dep-single-vc',
          template: '<div>\${value | childFormat}</div>',
          dependencies: [ChildFormat],
        })
        export class DepSingleVc {}
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "childFormat",
      className: "ChildFormat",
      form: "decorator",
    });
  });

  it("#2B.4 single TC dependency (product kind = template-controller)", () => {
    const result = runInterpreter({
      "/src/dep-single-tc.child.ts": `
        import { templateController, bindable } from 'aurelia';

        @templateController('child-tc')
        export class ChildTc {
          @bindable value: unknown;
        }
      `,
      "/src/dep-single-tc.ts": `
        import { customElement } from 'aurelia';
        import { ChildTc } from './dep-single-tc.child';

        @customElement({
          name: 'dep-single-tc',
          template: '<div child-tc.bind="items"></div>',
          dependencies: [ChildTc],
        })
        export class DepSingleTc {}
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "child-tc",
      className: "ChildTc",
      form: "decorator",
    });
  });
});

describe("2B: Multiple and mixed dependencies", () => {
  it("#2B.5 multiple deps from different files", () => {
    const result = runInterpreter({
      "/src/dep-multiple.child-a.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'child-a', template: '<span>A</span>' })
        export class ChildA {}
      `,
      "/src/dep-multiple.child-b.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'child-b', template: '<span>B</span>' })
        export class ChildB {}
      `,
      "/src/dep-multiple.ts": `
        import { customElement } from 'aurelia';
        import { ChildA } from './dep-multiple.child-a';
        import { ChildB } from './dep-multiple.child-b';

        @customElement({
          name: 'dep-multiple',
          template: '<child-a></child-a><child-b></child-b>',
          dependencies: [ChildA, ChildB],
        })
        export class DepMultiple {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "child-a",
      className: "ChildA",
      form: "decorator",
    });
    assertClaim(result, {
      kind: "custom-element",
      name: "child-b",
      className: "ChildB",
      form: "decorator",
    });
  });

  it("#2B.6 mixed resource kinds in one deps array", () => {
    const result = runInterpreter({
      "/src/dep-mixed-kinds.ce.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'mixed-child', template: '<span></span>' })
        export class MixedChild {}
      `,
      "/src/dep-mixed-kinds.ca.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute('mixed-attr')
        export class MixedAttr {}
      `,
      "/src/dep-mixed-kinds.vc.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter('mixedFormat')
        export class MixedFormat {
          toView(value: unknown): unknown { return value; }
        }
      `,
      "/src/dep-mixed-kinds.ts": `
        import { customElement } from 'aurelia';
        import { MixedChild } from './dep-mixed-kinds.ce';
        import { MixedAttr } from './dep-mixed-kinds.ca';
        import { MixedFormat } from './dep-mixed-kinds.vc';

        @customElement({
          name: 'dep-mixed-kinds',
          template: '<mixed-child mixed-attr>\${value | mixedFormat}</mixed-child>',
          dependencies: [MixedChild, MixedAttr, MixedFormat],
        })
        export class DepMixedKinds {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "mixed-child", className: "MixedChild", form: "decorator" });
    assertClaim(result, { kind: "custom-attribute", name: "mixed-attr", className: "MixedAttr", form: "decorator" });
    assertClaim(result, { kind: "value-converter", name: "mixedFormat", className: "MixedFormat", form: "decorator" });
  });
});

describe("2B: Cross-form dependency resolution", () => {
  it("#2B.7 convention-recognized dependency target", () => {
    const result = runInterpreter({
      "/src/dep-convention.child.ts": `
        export class DepConvChildCustomElement {}
      `,
      "/src/dep-convention.ts": `
        import { customElement } from 'aurelia';
        import { DepConvChildCustomElement } from './dep-convention.child';

        @customElement({
          name: 'dep-convention',
          template: '<dep-conv-child></dep-conv-child>',
          dependencies: [DepConvChildCustomElement],
        })
        export class DepConvention {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "dep-conv-child",
      className: "DepConvChildCustomElement",
      form: "convention",
    });
  });

  it("#2B.8 $au-declared dependency target", () => {
    const result = runInterpreter({
      "/src/dep-au.child.ts": `
        export class DepAuChild {
          static $au = {
            type: 'custom-element' as const,
            name: 'dep-au-child',
            template: '<span>au child</span>',
          };
        }
      `,
      "/src/dep-au.ts": `
        import { customElement } from 'aurelia';
        import { DepAuChild } from './dep-au.child';

        @customElement({
          name: 'dep-au',
          template: '<dep-au-child></dep-au-child>',
          dependencies: [DepAuChild],
        })
        export class DepAu {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "dep-au-child",
      className: "DepAuChild",
      form: "static-$au",
    });
  });

  it("#2B.9 non-resource class in deps — resolution gap", () => {
    const result = runInterpreter({
      "/src/dep-non-resource.util.ts": `
        export class MyHelper {
          static doStuff(): string { return 'help'; }
        }
      `,
      "/src/dep-non-resource.ts": `
        import { customElement } from 'aurelia';
        import { MyHelper } from './dep-non-resource.util';

        @customElement({
          name: 'dep-non-resource',
          template: '<div></div>',
          dependencies: [MyHelper],
        })
        export class DepNonResource {}
      `,
    });

    // The parent resource is recognized
    assertClaim(result, {
      kind: "custom-element",
      name: "dep-non-resource",
      className: "DepNonResource",
      form: "decorator",
    });
    // MyHelper is NOT a resource
    // (no decorator, no $au, no convention suffix)
  });

  it("#2B.10 inline + imported deps in one array", () => {
    const result = runInterpreter({
      "/src/dep-inline-plus-import.child.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'imported-child', template: '<span></span>' })
        export class ImportedChild {}
      `,
      "/src/dep-inline-plus-import.ts": `
        import { customElement } from 'aurelia';
        import { ImportedChild } from './dep-inline-plus-import.child';

        @customElement({ name: 'inline-dep', template: '<span>inline</span>' })
        class InlineDep {}

        @customElement({
          name: 'dep-inline-plus',
          template: '<inline-dep></inline-dep><imported-child></imported-child>',
          dependencies: [InlineDep, ImportedChild],
        })
        export class DepInlinePlus {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "inline-dep", className: "InlineDep", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "imported-child", className: "ImportedChild", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "dep-inline-plus", className: "DepInlinePlus", form: "decorator" });
  });

  it("#2B.11 define()-declared dependency target", () => {
    const result = runInterpreter({
      "/src/dep-define-target.child.ts": `
        import { CustomElement } from 'aurelia';

        export class DefineChild {}

        CustomElement.define(
          { name: 'define-child', template: '<span>defined</span>' },
          DefineChild,
        );
      `,
      "/src/dep-define-target.ts": `
        import { customElement } from 'aurelia';
        import { DefineChild } from './dep-define-target.child';

        @customElement({
          name: 'dep-define-target',
          template: '<define-child></define-child>',
          dependencies: [DefineChild],
        })
        export class DepDefineTarget {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "define-child",
      className: "DefineChild",
      form: "define",
    });
  });
});
