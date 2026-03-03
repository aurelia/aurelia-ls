/**
 * Tier 1B: CE Field Extraction + 1E Bindable smoke
 *
 * Full claim specs: kind, name, className, form, field values, gap profile.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1B: CE Field Extraction", () => {
  it("#1B.5 template inline string", () => {
    const result = runInterpreter({
      "/src/ce-template-inline.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-template-inline',
          template: '<div><span>inline content</span></div>',
        })
        export class CeTemplateInline {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-template-inline",
      className: "CeTemplateInline",
      form: "decorator",
      fields: {
        inlineTemplate: "<div><span>inline content</span></div>",
      },
    });
  });

  it("#1B.2 capture boolean true", () => {
    const result = runInterpreter({
      "/src/ce-capture-bool.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-capture-bool',
          capture: true,
          template: '<div></div>',
        })
        export class CeCaptureBool {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-capture-bool",
      className: "CeCaptureBool",
      form: "decorator",
      fields: { capture: true },
    });
  });

  it("#1B.9 containerless via object config", () => {
    const result = runInterpreter({
      "/src/ce-containerless.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-containerless',
          containerless: true,
          template: '<div>no host element</div>',
        })
        export class CeContainerless {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-containerless",
      className: "CeContainerless",
      form: "decorator",
      fields: { containerless: true },
    });
  });

  it("#1B.10 containerless via @containerless sub-decorator", () => {
    const result = runInterpreter({
      "/src/ce-containerless-sub.ts": `
        import { customElement, containerless } from 'aurelia';

        @containerless
        @customElement({ name: 'ce-containerless-sub', template: '<div></div>' })
        export class CeContainerlessSub {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-containerless-sub",
      className: "CeContainerlessSub",
      form: "decorator",
      fields: { containerless: true },
    });
  });

  it("#1B.11 shadowOptions open", () => {
    const result = runInterpreter({
      "/src/ce-shadow-open.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-shadow-open',
          shadowOptions: { mode: 'open' },
          template: '<div>shadow open</div>',
        })
        export class CeShadowOpen {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-shadow-open",
      className: "CeShadowOpen",
      form: "decorator",
      fields: { shadowOptions: { mode: "open" } },
    });
  });

  it("#1B.12 shadowOptions closed", () => {
    const result = runInterpreter({
      "/src/ce-shadow-closed.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-shadow-closed',
          shadowOptions: { mode: 'closed' },
          template: '<div>shadow closed</div>',
        })
        export class CeShadowClosed {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-shadow-closed",
      className: "CeShadowClosed",
      form: "decorator",
      fields: { shadowOptions: { mode: "closed" } },
    });
  });

  it("#1B.1 aliases array", () => {
    const result = runInterpreter({
      "/src/ce-aliases.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'ce-aliases',
          aliases: ['alt-one', 'alt-two'],
          template: '<div></div>',
        })
        export class CeAliases {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-aliases",
      className: "CeAliases",
      form: "decorator",
      fields: { aliases: ["alt-one", "alt-two"] },
    });
  });

  it("#1B.23 minimal decorator string arg — gap profile", () => {
    const result = runInterpreter({
      "/src/ce-minimal.ts": `
        import { customElement } from 'aurelia';

        @customElement('ce-minimal')
        export class CeMinimal {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-minimal",
      className: "CeMinimal",
      form: "decorator",
      absentFields: [
        "inlineTemplate", "aliases", "containerless",
        "shadowOptions", "capture", "processContent", "enhance",
      ],
    });
  });

  it("#1B.24 convention suffix — gap profile", () => {
    const result = runInterpreter({
      "/src/ce-gap-convention.ts": `
        export class CeGapConvCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-gap-conv",
      className: "CeGapConvCustomElement",
      form: "convention",
      absentFields: [
        "inlineTemplate", "aliases", "containerless",
        "shadowOptions", "capture", "processContent", "enhance",
      ],
    });
  });
});

describe("1E: Bindable Extraction (smoke)", () => {
  it("#1E.1 @bindable plain field decorator", () => {
    const result = runInterpreter({
      "/src/bind-b1-plain.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'bind-b1-plain', template: '<div>\${value}</div>' })
        export class BindB1Plain {
          @bindable value: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-b1-plain",
      className: "BindB1Plain",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });

  it("#1E.11 multiple @bindable fields", () => {
    const result = runInterpreter({
      "/src/bind-multiple.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'bind-multi', template: '<div></div>' })
        export class BindMulti {
          @bindable first: string = '';
          @bindable second: string = '';
          @bindable third: boolean = false;
          @bindable fourth: unknown;
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-multi",
      className: "BindMulti",
      form: "decorator",
      fields: {
        "bindable:first:property": "first",
        "bindable:second:property": "second",
        "bindable:third:property": "third",
        "bindable:fourth:property": "fourth",
      },
    });
  });
});
