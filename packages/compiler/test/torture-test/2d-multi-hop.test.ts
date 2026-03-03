/**
 * Tier 2D: Multi-Hop Chains (7 entries, 21 files)
 *
 * Tests resolution through chains where intermediate files are real
 * evaluation targets (resources with declarations), not transparent
 * re-exports.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("2D: Value and dependency chains", () => {
  it("#2D.1 value flows through two evaluation hops", () => {
    const result = runInterpreter({
      "/src/hop-value-chain.orig.ts": `
        export const DEEP_TEMPLATE = '<div>from the deep</div>';
      `,
      "/src/hop-value-chain.mid.ts": `
        import { customElement } from 'aurelia';
        import { DEEP_TEMPLATE } from './hop-value-chain.orig';

        @customElement({ name: 'hop-mid', template: DEEP_TEMPLATE })
        export class HopMid {}
      `,
      "/src/hop-value-chain.ts": `
        import { customElement } from 'aurelia';
        import { DEEP_TEMPLATE } from './hop-value-chain.orig';
        import { HopMid } from './hop-value-chain.mid';

        @customElement({
          name: 'hop-value-chain',
          template: DEEP_TEMPLATE,
          dependencies: [HopMid],
        })
        export class HopValueChain {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "hop-mid",
      className: "HopMid",
      form: "decorator",
    });
    assertClaim(result, {
      kind: "custom-element",
      name: "hop-value-chain",
      className: "HopValueChain",
      form: "decorator",
    });
  });

  it("#2D.2 dependency chain A→B→C", () => {
    const result = runInterpreter({
      "/src/hop-dep-chain.leaf.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'leaf-el', template: '<span>leaf</span>' })
        export class LeafEl {}
      `,
      "/src/hop-dep-chain.mid.ts": `
        import { customElement } from 'aurelia';
        import { LeafEl } from './hop-dep-chain.leaf';

        @customElement({
          name: 'mid-el',
          template: '<leaf-el></leaf-el>',
          dependencies: [LeafEl],
        })
        export class MidEl {}
      `,
      "/src/hop-dep-chain.ts": `
        import { customElement } from 'aurelia';
        import { MidEl } from './hop-dep-chain.mid';

        @customElement({
          name: 'hop-dep-chain',
          template: '<mid-el></mid-el>',
          dependencies: [MidEl],
        })
        export class HopDepChain {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "leaf-el", className: "LeafEl", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "mid-el", className: "MidEl", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "hop-dep-chain", className: "HopDepChain", form: "decorator" });
  });

  it("#2D.3 template through TS intermediary from HTML", () => {
    const result = runInterpreter({
      "/src/hop-template-chain.provider.html": `
        <template>
          <div>provided through chain</div>
        </template>
      `,
      "/src/hop-template-chain.provider.ts": `
        import template from './hop-template-chain.provider.html';

        export { template };
      `,
      "/src/hop-template-chain.ts": `
        import { customElement } from 'aurelia';
        import { template } from './hop-template-chain.provider';

        @customElement({ name: 'hop-tpl-chain', template })
        export class HopTplChain {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "hop-tpl-chain",
      className: "HopTplChain",
      form: "decorator",
    });
  });

  it("#2D.4 config object accumulation through chain", () => {
    const result = runInterpreter({
      "/src/hop-config-chain.base.ts": `
        export const BASE = {
          containerless: true,
        };
      `,
      "/src/hop-config-chain.extend.ts": `
        import { BASE } from './hop-config-chain.base';

        export const EXTENDED = {
          ...BASE,
          capture: true,
        };
      `,
      "/src/hop-config-chain.ts": `
        import { customElement } from 'aurelia';
        import { EXTENDED } from './hop-config-chain.extend';

        @customElement({
          ...EXTENDED,
          name: 'hop-config-chain',
          template: '<div></div>',
        })
        export class HopConfigChain {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "hop-config-chain",
      className: "HopConfigChain",
      form: "decorator",
      fields: {
        containerless: true,
        capture: true,
      },
    });
  });
});

describe("2D: Cross-form and depth tests", () => {
  it("#2D.5 cross-form chain: decorator → convention → decorator", () => {
    const result = runInterpreter({
      "/src/hop-mixed-forms.conv-dep.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'conv-dep-el',
          template: '<span>conv dep</span>',
        })
        export class ConvDepEl {}
      `,
      "/src/hop-mixed-forms.conv.ts": `
        import { ConvDepEl } from './hop-mixed-forms.conv-dep';

        export class HopMixedConvCustomElement {
          static dependencies = [ConvDepEl];
        }
      `,
      "/src/hop-mixed-forms.ts": `
        import { customElement } from 'aurelia';
        import { HopMixedConvCustomElement } from './hop-mixed-forms.conv';

        @customElement({
          name: 'hop-mixed-forms',
          template: '<hop-mixed-conv></hop-mixed-conv>',
          dependencies: [HopMixedConvCustomElement],
        })
        export class HopMixedForms {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "conv-dep-el", className: "ConvDepEl", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "hop-mixed-conv", className: "HopMixedConvCustomElement", form: "convention" });
    assertClaim(result, { kind: "custom-element", name: "hop-mixed-forms", className: "HopMixedForms", form: "decorator" });
  });

  it("#2D.6 depth-3 dependency chain A→B→C→D", () => {
    const result = runInterpreter({
      "/src/hop-three-deep.d.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'deep-d', template: '<span>D</span>' })
        export class DeepD {}
      `,
      "/src/hop-three-deep.c.ts": `
        import { customElement } from 'aurelia';
        import { DeepD } from './hop-three-deep.d';

        @customElement({
          name: 'deep-c',
          template: '<deep-d></deep-d>',
          dependencies: [DeepD],
        })
        export class DeepC {}
      `,
      "/src/hop-three-deep.b.ts": `
        import { customElement } from 'aurelia';
        import { DeepC } from './hop-three-deep.c';

        @customElement({
          name: 'deep-b',
          template: '<deep-c></deep-c>',
          dependencies: [DeepC],
        })
        export class DeepB {}
      `,
      "/src/hop-three-deep.ts": `
        import { customElement } from 'aurelia';
        import { DeepB } from './hop-three-deep.b';

        @customElement({
          name: 'hop-three-deep',
          template: '<deep-b></deep-b>',
          dependencies: [DeepB],
        })
        export class HopThreeDeep {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "deep-d", className: "DeepD", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "deep-c", className: "DeepC", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "deep-b", className: "DeepB", form: "decorator" });
    assertClaim(result, { kind: "custom-element", name: "hop-three-deep", className: "HopThreeDeep", form: "decorator" });
  });

  it("#2D.7 define() with imported class mid-chain", () => {
    const result = runInterpreter({
      "/src/hop-define-chain.target.ts": `
        export class HopDefineTarget {}
      `,
      "/src/hop-define-chain.factory.ts": `
        import { CustomElement } from 'aurelia';
        import { HopDefineTarget } from './hop-define-chain.target';

        CustomElement.define(
          { name: 'hop-define-factory', template: '<div>factory</div>' },
          HopDefineTarget,
        );

        export { HopDefineTarget };
      `,
      "/src/hop-define-chain.ts": `
        import { customElement } from 'aurelia';
        import { HopDefineTarget } from './hop-define-chain.factory';

        @customElement({
          name: 'hop-define-chain',
          template: '<hop-define-factory></hop-define-factory>',
          dependencies: [HopDefineTarget],
        })
        export class HopDefineChain {}
      `,
    });

    assertClaim(result, { kind: "custom-element", name: "hop-define-factory", className: "HopDefineTarget", form: "define" });
    assertClaim(result, { kind: "custom-element", name: "hop-define-chain", className: "HopDefineChain", form: "decorator" });
  });
});
