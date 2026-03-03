/**
 * Tier 2C: Re-exports and Indirection (8 entries, 22 files)
 *
 * Tests that the product follows re-export chains to find original
 * declarations. Re-exporting files are transparent intermediaries.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("2C: Basic re-export forms", () => {
  it("#2C.1 named re-export", () => {
    const result = runInterpreter({
      "/src/reex-named.orig.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'reex-named-orig', template: '<div>original</div>' })
        export class ReexNamedOrig {}
      `,
      "/src/reex-named.barrel.ts": `
        export { ReexNamedOrig } from './reex-named.orig';
      `,
      "/src/reex-named.ts": `
        import { customElement } from 'aurelia';
        import { ReexNamedOrig } from './reex-named.barrel';

        @customElement({
          name: 'reex-named',
          template: '<reex-named-orig></reex-named-orig>',
          dependencies: [ReexNamedOrig],
        })
        export class ReexNamed {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "reex-named-orig", className: "ReexNamedOrig", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "reex-named", className: "ReexNamed", form: "decorator" });
  });

  it("#2C.2 renamed re-export (export { X as Y })", () => {
    const result = runInterpreter({
      "/src/reex-renamed.orig.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'reex-renamed-orig', template: '<div></div>' })
        export class OriginalName {}
      `,
      "/src/reex-renamed.barrel.ts": `
        export { OriginalName as RenamedExport } from './reex-renamed.orig';
      `,
      "/src/reex-renamed.ts": `
        import { customElement } from 'aurelia';
        import { RenamedExport } from './reex-renamed.barrel';

        @customElement({
          name: 'reex-renamed',
          template: '<reex-renamed-orig></reex-renamed-orig>',
          dependencies: [RenamedExport],
        })
        export class ReexRenamed {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "reex-renamed-orig", className: "OriginalName", form: "decorator" });
  });

  it("#2C.3 namespace re-export (export * from)", () => {
    const result = runInterpreter({
      "/src/reex-namespace.orig.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'reex-ns-orig', template: '<div>ns</div>' })
        export class ReexNsOrig {}
      `,
      "/src/reex-namespace.barrel.ts": `
        export * from './reex-namespace.orig';
      `,
      "/src/reex-namespace.ts": `
        import { customElement } from 'aurelia';
        import { ReexNsOrig } from './reex-namespace.barrel';

        @customElement({
          name: 'reex-namespace',
          template: '<reex-ns-orig></reex-ns-orig>',
          dependencies: [ReexNsOrig],
        })
        export class ReexNamespace {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "reex-ns-orig", className: "ReexNsOrig", form: "decorator" });
  });
});

describe("2C: Cross-section combinations", () => {
  it("#2C.4 re-exported const value for field population", () => {
    const result = runInterpreter({
      "/src/reex-value.orig.ts": `
        export const SHARED_TEMPLATE = '<div>shared through barrel</div>';
      `,
      "/src/reex-value.barrel.ts": `
        export { SHARED_TEMPLATE } from './reex-value.orig';
      `,
      "/src/reex-value.ts": `
        import { customElement } from 'aurelia';
        import { SHARED_TEMPLATE } from './reex-value.barrel';

        @customElement({ name: 'reex-value', template: SHARED_TEMPLATE })
        export class ReexValue {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "reex-value",
      className: "ReexValue",
      form: "decorator",
      fields: {
        inlineTemplate: "<div>shared through barrel</div>",
      },
    });
  });

  it("#2C.5 re-exported class for dependency resolution", () => {
    const result = runInterpreter({
      "/src/reex-dep.orig.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute('reex-dep-attr')
        export class ReexDepAttr {}
      `,
      "/src/reex-dep.barrel.ts": `
        export { ReexDepAttr } from './reex-dep.orig';
      `,
      "/src/reex-dep.ts": `
        import { customElement } from 'aurelia';
        import { ReexDepAttr } from './reex-dep.barrel';

        @customElement({
          name: 'reex-dep',
          template: '<div reex-dep-attr></div>',
          dependencies: [ReexDepAttr],
        })
        export class ReexDep {}
      `,
    });

    assertClaim(result, { kind: "custom-attribute", name: "reex-dep-attr", className: "ReexDepAttr", form: "decorator" });
  });
});

describe("2C: Chain depth and barrel patterns", () => {
  it("#2C.6 chained re-exports (2 hops)", () => {
    const result = runInterpreter({
      "/src/reex-chain.orig.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'reex-chain-orig', template: '<div>deep</div>' })
        export class ReexChainOrig {}
      `,
      "/src/reex-chain.mid.ts": `
        export { ReexChainOrig } from './reex-chain.orig';
      `,
      "/src/reex-chain.ts": `
        import { customElement } from 'aurelia';
        import { ReexChainOrig } from './reex-chain.mid';

        @customElement({
          name: 'reex-chain',
          template: '<reex-chain-orig></reex-chain-orig>',
          dependencies: [ReexChainOrig],
        })
        export class ReexChain {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "reex-chain-orig", className: "ReexChainOrig", form: "decorator" });
  });

  it("#2C.7 barrel with own resource + re-exports", () => {
    const result = runInterpreter({
      "/src/reex-mixed.orig.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'reex-mixed-orig', template: '<div>orig</div>' })
        export class ReexMixedOrig {}
      `,
      "/src/reex-mixed.barrel.ts": `
        import { customElement } from 'aurelia';

        export { ReexMixedOrig } from './reex-mixed.orig';

        @customElement({ name: 'barrel-local', template: '<div>local to barrel</div>' })
        export class BarrelLocal {}
      `,
      "/src/reex-mixed.ts": `
        import { customElement } from 'aurelia';
        import { ReexMixedOrig, BarrelLocal } from './reex-mixed.barrel';

        @customElement({
          name: 'reex-mixed',
          template: '<reex-mixed-orig></reex-mixed-orig><barrel-local></barrel-local>',
          dependencies: [ReexMixedOrig, BarrelLocal],
        })
        export class ReexMixed {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "reex-mixed-orig", className: "ReexMixedOrig", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "barrel-local", className: "BarrelLocal", form: "decorator" });
  });

  it("#2C.8 multi-resource barrel", () => {
    const result = runInterpreter({
      "/src/reex-multi-barrel.a.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'barrel-child-a', template: '<span>A</span>' })
        export class BarrelChildA {}
      `,
      "/src/reex-multi-barrel.b.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute('barrel-attr-b')
        export class BarrelAttrB {}
      `,
      "/src/reex-multi-barrel.barrel.ts": `
        export { BarrelChildA } from './reex-multi-barrel.a';
        export { BarrelAttrB } from './reex-multi-barrel.b';
      `,
      "/src/reex-multi-barrel.ts": `
        import { customElement } from 'aurelia';
        import { BarrelChildA, BarrelAttrB } from './reex-multi-barrel.barrel';

        @customElement({
          name: 'reex-multi-barrel',
          template: '<barrel-child-a barrel-attr-b></barrel-child-a>',
          dependencies: [BarrelChildA, BarrelAttrB],
        })
        export class ReexMultiBarrel {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "barrel-child-a", className: "BarrelChildA", form: "decorator" });
    assertClaim(result, { kind: "custom-attribute", name: "barrel-attr-b", className: "BarrelAttrB", form: "decorator" });
  });
});
