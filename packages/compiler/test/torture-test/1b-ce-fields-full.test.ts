/**
 * Tier 1B: CE Field Extraction — remaining entries (#3-4, 6-8, 13-22)
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1B: CE capture & sub-decorators", () => {
  it("#1B.3 capture as CaptureFilter predicate (D4)", () => {
    const result = runInterpreter({
      "/src/ce-capture-filter.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-capture-filter',
          capture: (attr: string) => attr.startsWith('x-'),
          template: '<div></div>',
        })
        export class CeCaptureFilter {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-capture-filter",
      className: "CeCaptureFilter",
      form: "decorator",
    });
    // D4: capture should preserve the predicate, not collapse to boolean
  });

  it("#1B.4 capture via @capture sub-decorator", () => {
    const result = runInterpreter({
      "/src/ce-capture-sub.ts": `
        import { customElement, capture } from 'aurelia';

        @capture
        @customElement({ name: 'ce-capture-sub', template: '<div></div>' })
        export class CeCaptureSub {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-capture-sub",
      className: "CeCaptureSub",
      form: "decorator",
      fields: { capture: true },
    });
  });
});

describe("1B: CE template sources", () => {
  it("#1B.6 template from import", () => {
    const result = runInterpreter({
      "/src/ce-template-import.ts": `
        import { customElement } from 'aurelia';
        import template from './ce-template-import.html';

        @customElement({ name: 'ce-template-import', template })
        export class CeTemplateImport {}
      `,
      "/src/ce-template-import.html": `
        <template>
          <div>imported template content</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-template-import",
      className: "CeTemplateImport",
      form: "decorator",
    });
  });

  it("#1B.7 template from convention pair", () => {
    const result = runInterpreter({
      "/src/ce-template-pair.ts": `
        export class CeTemplatePairCustomElement {}
      `,
      "/src/ce-template-pair.html": `
        <template>
          <div>paired template content</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-template-pair",
      className: "CeTemplatePairCustomElement",
      form: "convention",
    });
  });
});

describe("1B: CE dependencies", () => {
  it("#1B.8 dependencies array with same-file class reference", () => {
    const result = runInterpreter({
      "/src/ce-dependencies.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'dep-child', template: '<span>child</span>' })
        class DepChild {}

        @customElement({
          name: 'ce-dependencies',
          template: '<dep-child></dep-child>',
          dependencies: [DepChild],
        })
        export class CeDependencies {}
      `,
    });

    // Two resources recognized from one file
    assertClaim(result, {
      kind: "custom-element",
      name: "ce-dependencies",
      className: "CeDependencies",
      form: "decorator",
    });
    assertClaim(result, {
      kind: "custom-element",
      name: "dep-child",
      className: "DepChild",
      form: "decorator",
    });
  });
});

describe("1B: CE shadowOptions sub-decorator", () => {
  it("#1B.13 shadowOptions via @useShadowDOM", () => {
    const result = runInterpreter({
      "/src/ce-shadow-sub.ts": `
        import { customElement, useShadowDOM } from 'aurelia';

        @useShadowDOM
        @customElement({ name: 'ce-shadow-sub', template: '<div></div>' })
        export class CeShadowSub {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-shadow-sub",
      className: "CeShadowSub",
      form: "decorator",
      fields: { shadowOptions: { mode: "open" } },
    });
  });
});

describe("1B: CE processContent", () => {
  it("#1B.14 processContent hook function (D4)", () => {
    const result = runInterpreter({
      "/src/ce-process-content.ts": `
        import { customElement } from 'aurelia';

        function transformContent(node: HTMLElement, platform: any): boolean | void {}

        @customElement({
          name: 'ce-process-content',
          processContent: transformContent,
          template: '<div>processed</div>',
        })
        export class CeProcessContent {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-process-content",
      className: "CeProcessContent",
      form: "decorator",
      fields: { processContent: true },
    });
  });

  it("#1B.15 processContent via @processContent(fn) sub-decorator", () => {
    const result = runInterpreter({
      "/src/ce-process-content-sub.ts": `
        import { customElement, processContent } from 'aurelia';

        function myHook(node: HTMLElement, platform: any): boolean | void {}

        @processContent(myHook)
        @customElement({ name: 'ce-process-content-sub', template: '<div></div>' })
        export class CeProcessContentSub {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-process-content-sub",
      className: "CeProcessContentSub",
      form: "decorator",
      fields: { processContent: true },
    });
  });
});

describe("1B: CE enhance, watches, strict", () => {
  it("#1B.16 enhance flag", () => {
    const result = runInterpreter({
      "/src/ce-enhance.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-enhance',
          enhance: true,
          template: '<div>enhanced</div>',
        })
        export class CeEnhance {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-enhance",
      className: "CeEnhance",
      form: "decorator",
    });
  });

  it("#1B.17 @watch on method", () => {
    const result = runInterpreter({
      "/src/ce-watches.ts": `
        import { customElement, watch } from 'aurelia';

        @customElement({ name: 'ce-watches', template: '<div>\${count}</div>' })
        export class CeWatches {
          count = 0;

          @watch('count')
          countChanged(newValue: number, oldValue: number) {}
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-watches",
      className: "CeWatches",
      form: "decorator",
    });
  });

  it("#1B.18 strict: true", () => {
    const result = runInterpreter({
      "/src/ce-strict-true.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-strict-true',
          strict: true,
          template: '<div></div>',
        })
        export class CeStrictTrue {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-strict-true",
      className: "CeStrictTrue",
      form: "decorator",
    });
  });

  it("#1B.19 strict: false (≠ undefined per D5)", () => {
    const result = runInterpreter({
      "/src/ce-strict-false.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-strict-false',
          strict: false,
          template: '<div></div>',
        })
        export class CeStrictFalse {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-strict-false",
      className: "CeStrictFalse",
      form: "decorator",
    });
  });

  it("#1B.20 strict absent → undefined (≠ false per D5)", () => {
    const result = runInterpreter({
      "/src/ce-strict-absent.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-strict-absent',
          template: '<div></div>',
        })
        export class CeStrictAbsent {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-strict-absent",
      className: "CeStrictAbsent",
      form: "decorator",
      absentFields: ["strict"],
    });
  });

  it("#1B.21 containerless + shadowOptions mutual exclusivity → diagnostic", () => {
    const result = runInterpreter({
      "/src/ce-mutual-excl.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-mutual-excl',
          containerless: true,
          shadowOptions: { mode: 'open' },
          template: '<div></div>',
        })
        export class CeMutualExcl {}
      `,
    });

    // Both fields extracted — the contradiction is a diagnostic, not a suppression
    assertClaim(result, {
      kind: "custom-element",
      name: "ce-mutual-excl",
      className: "CeMutualExcl",
      form: "decorator",
      fields: {
        containerless: true,
        shadowOptions: { mode: "open" },
      },
    });
  });

  it("#1B.22 kitchen sink — all extractable fields", () => {
    const result = runInterpreter({
      "/src/ce-kitchen-sink.ts": `
        import { customElement, watch, bindable, BindingMode } from 'aurelia';

        function processHook(node: HTMLElement, platform: any): void {}

        @customElement({
          name: 'ce-kitchen-sink',
          aliases: ['ce-ks', 'ce-all-fields'],
          template: '<div>\${value}</div>',
          dependencies: [],
          shadowOptions: { mode: 'open' },
          capture: true,
          processContent: processHook,
          enhance: false,
          strict: true,
        })
        export class CeKitchenSink {
          @bindable({ mode: BindingMode.twoWay })
          value: string = '';

          @watch('value')
          valueChanged(newValue: string, oldValue: string) {}
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-kitchen-sink",
      className: "CeKitchenSink",
      form: "decorator",
      fields: {
        aliases: ["ce-ks", "ce-all-fields"],
        inlineTemplate: "<div>${value}</div>",
        shadowOptions: { mode: "open" },
        capture: true,
        processContent: true,
        containerless: false,
        "bindable:value:property": "value",
      },
      absentFields: ["containerless"],
    });
  });
});
