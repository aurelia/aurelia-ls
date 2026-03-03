/**
 * Tier 2A: Cross-File Value Resolution (11 entries, 22 files)
 *
 * Tests that imported values correctly populate declaration fields.
 * Each entry has a source file declaring a resource and a dependency
 * file exporting a value. The import creates a data edge.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("2A: String value resolution", () => {
  it("#2A.1 const string import for resource name", () => {
    const result = runInterpreter({
      "/src/val-const-name.dep.ts": `
        export const MY_NAME = 'const-name-el';
      `,
      "/src/val-const-name.ts": `
        import { customElement } from 'aurelia';
        import { MY_NAME } from './val-const-name.dep';

        @customElement({ name: MY_NAME, template: '<div></div>' })
        export class ValConstName {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "const-name-el",
      className: "ValConstName",
      form: "decorator",
    });
  });

  it("#2A.2 template string from TS export", () => {
    const result = runInterpreter({
      "/src/val-tpl-ts.dep.ts": `
        export const TEMPLATE = '<div><span>from dep file</span></div>';
      `,
      "/src/val-tpl-ts.ts": `
        import { customElement } from 'aurelia';
        import { TEMPLATE } from './val-tpl-ts.dep';

        @customElement({ name: 'val-tpl-ts', template: TEMPLATE })
        export class ValTplTs {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-tpl-ts",
      className: "ValTplTs",
      form: "decorator",
      fields: {
        inlineTemplate: "<div><span>from dep file</span></div>",
      },
    });
  });
});

describe("2A: Object spread resolution", () => {
  it("#2A.3 imported config object spread into decorator", () => {
    const result = runInterpreter({
      "/src/val-config-spread.dep.ts": `
        export const BASE_CONFIG = {
          template: '<div>from config</div>',
          containerless: true,
          capture: true,
        };
      `,
      "/src/val-config-spread.ts": `
        import { customElement } from 'aurelia';
        import { BASE_CONFIG } from './val-config-spread.dep';

        @customElement({ ...BASE_CONFIG, name: 'val-config-spread' })
        export class ValConfigSpread {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-config-spread",
      className: "ValConfigSpread",
      form: "decorator",
      fields: {
        inlineTemplate: "<div>from config</div>",
        containerless: true,
        capture: true,
      },
    });
  });

  it("#2A.4 partial config from import + local fields", () => {
    const result = runInterpreter({
      "/src/val-config-partial.dep.ts": `
        export const SHARED_CONFIG = {
          aliases: ['shared-alias'],
          containerless: true,
        };
      `,
      "/src/val-config-partial.ts": `
        import { customElement, bindable } from 'aurelia';
        import { SHARED_CONFIG } from './val-config-partial.dep';

        @customElement({
          ...SHARED_CONFIG,
          name: 'val-config-partial',
          template: '<div>\${value}</div>',
        })
        export class ValConfigPartial {
          @bindable value: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-config-partial",
      className: "ValConfigPartial",
      form: "decorator",
      fields: {
        aliases: ["shared-alias"],
        containerless: true,
        "bindable:value:property": "value",
      },
    });
  });
});

describe("2A: Collection and function references", () => {
  it("#2A.5 imported array for aliases", () => {
    const result = runInterpreter({
      "/src/val-aliases.dep.ts": `
        export const EXTRA_ALIASES = ['alias-a', 'alias-b'];
      `,
      "/src/val-aliases.ts": `
        import { customElement } from 'aurelia';
        import { EXTRA_ALIASES } from './val-aliases.dep';

        @customElement({
          name: 'val-aliases',
          aliases: EXTRA_ALIASES,
          template: '<div></div>',
        })
        export class ValAliases {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-aliases",
      className: "ValAliases",
      form: "decorator",
      fields: {
        aliases: ["alias-a", "alias-b"],
      },
    });
  });

  it("#2A.6 imported processContent hook function", () => {
    const result = runInterpreter({
      "/src/val-process-content.dep.ts": `
        export function transformContent(
          node: HTMLElement,
          platform: any,
        ): boolean | void {}
      `,
      "/src/val-process-content.ts": `
        import { customElement } from 'aurelia';
        import { transformContent } from './val-process-content.dep';

        @customElement({
          name: 'val-pc-import',
          processContent: transformContent,
          template: '<div>processed</div>',
        })
        export class ValProcessContent {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-pc-import",
      className: "ValProcessContent",
      form: "decorator",
    });
  });

  it("#2A.7 imported CaptureFilter predicate (D4 fidelity)", () => {
    const result = runInterpreter({
      "/src/val-capture-filter.dep.ts": `
        export const myFilter = (attr: string) => attr.startsWith('x-');
      `,
      "/src/val-capture-filter.ts": `
        import { customElement } from 'aurelia';
        import { myFilter } from './val-capture-filter.dep';

        @customElement({
          name: 'val-capture-filter',
          capture: myFilter,
          template: '<div></div>',
        })
        export class ValCaptureFilter {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-capture-filter",
      className: "ValCaptureFilter",
      form: "decorator",
    });
  });
});

describe("2A: Scalar consts and enum values", () => {
  it("#2A.8 boolean + object consts from same dep", () => {
    const result = runInterpreter({
      "/src/val-scalars.dep.ts": `
        export const IS_CONTAINERLESS = true;
        export const SHADOW_OPTS = { mode: 'open' as const };
      `,
      "/src/val-scalars.ts": `
        import { customElement } from 'aurelia';
        import { IS_CONTAINERLESS, SHADOW_OPTS } from './val-scalars.dep';

        @customElement({
          name: 'val-scalars',
          containerless: IS_CONTAINERLESS,
          shadowOptions: SHADOW_OPTS,
          template: '<div></div>',
        })
        export class ValScalars {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-scalars",
      className: "ValScalars",
      form: "decorator",
      fields: {
        containerless: true,
        shadowOptions: { mode: "open" },
      },
    });
  });

  it("#2A.9 re-exported framework enum const for bindable mode", () => {
    const result = runInterpreter({
      "/src/val-bind-mode.dep.ts": `
        import { BindingMode } from 'aurelia';

        export const TWO_WAY = BindingMode.twoWay;
      `,
      "/src/val-bind-mode.ts": `
        import { customElement, bindable } from 'aurelia';
        import { TWO_WAY } from './val-bind-mode.dep';

        @customElement({ name: 'val-bind-mode', template: '<div></div>' })
        export class ValBindMode {
          @bindable({ mode: TWO_WAY }) value: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-bind-mode",
      className: "ValBindMode",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });
});

describe("2A: Multiple imports and cross-file define", () => {
  it("#2A.10 three fields from one dep file", () => {
    const result = runInterpreter({
      "/src/val-multi-import.dep.ts": `
        export const EL_NAME = 'val-multi';
        export const EL_TEMPLATE = '<div>multi-import</div>';
        export const EL_ALIASES = ['val-multi-alt'];
      `,
      "/src/val-multi-import.ts": `
        import { customElement } from 'aurelia';
        import { EL_NAME, EL_TEMPLATE, EL_ALIASES } from './val-multi-import.dep';

        @customElement({
          name: EL_NAME,
          template: EL_TEMPLATE,
          aliases: EL_ALIASES,
        })
        export class ValMultiImport {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-multi",
      className: "ValMultiImport",
      form: "decorator",
      fields: {
        inlineTemplate: "<div>multi-import</div>",
        aliases: ["val-multi-alt"],
      },
    });
  });

  it("#2A.11 define() targeting an imported class", () => {
    const result = runInterpreter({
      "/src/val-cross-define.dep.ts": `
        export class ValCrossDefineTarget {}
      `,
      "/src/val-cross-define.ts": `
        import { CustomElement } from 'aurelia';
        import { ValCrossDefineTarget } from './val-cross-define.dep';

        CustomElement.define(
          { name: 'val-cross-define', template: '<div>defined</div>' },
          ValCrossDefineTarget,
        );
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "val-cross-define",
      className: "ValCrossDefineTarget",
      form: "define",
    });
  });
});
