/**
 * Tier 1A: Recognition — define(), BC, AP, convention pairs, local templates
 *
 * Continues the recognition matrix for forms and kinds not covered
 * in the primary 1A file.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  assertClaim,
  assertNotRecognized,
} from "./harness.js";

// =============================================================================
// define() — Form 3
// =============================================================================

describe("1A: define() recognition", () => {
  it("#19 CE define() at module scope", () => {
    const result = runInterpreter({
      "/src/ce-define-static.ts": `
        import { CustomElement } from 'aurelia';

        export class CeDefineStatic {}

        CustomElement.define({ name: 'ce-define-static' }, CeDefineStatic);
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-define-static",
      className: "CeDefineStatic",
      form: "define",
    });
  });

  it("#20 CA define() at module scope", () => {
    const result = runInterpreter({
      "/src/ca-define-static.ts": `
        import { CustomAttribute } from 'aurelia';

        export class CaDefineStatic {}

        CustomAttribute.define({ name: 'ca-define-static' }, CaDefineStatic);
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-define-static",
      className: "CaDefineStatic",
      form: "define",
    });
  });

  it("#21 TC define() with isTemplateController", () => {
    const result = runInterpreter({
      "/src/tc-define-static.ts": `
        import { CustomAttribute } from 'aurelia';

        export class TcDefineStatic {}

        CustomAttribute.define({ name: 'tc-define-static', isTemplateController: true }, TcDefineStatic);
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-define-static",
      className: "TcDefineStatic",
      form: "define",
    });
  });

  it("#22 VC define() at module scope", () => {
    const result = runInterpreter({
      "/src/vc-define-static.ts": `
        import { ValueConverter } from 'aurelia';

        export class VcDefineStatic {
          toView(value: unknown): unknown { return value; }
        }

        ValueConverter.define({ name: 'vcDefineStatic' }, VcDefineStatic);
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcDefineStatic",
      className: "VcDefineStatic",
      form: "define",
    });
  });

  it("#23 BB define() at module scope", () => {
    const result = runInterpreter({
      "/src/bb-define-static.ts": `
        import { BindingBehavior } from 'aurelia';

        export class BbDefineStatic {}

        BindingBehavior.define({ name: 'bbDefineStatic' }, BbDefineStatic);
      `,
    });

    assertClaim(result, {
      kind: "binding-behavior",
      name: "bbDefineStatic",
      className: "BbDefineStatic",
      form: "define",
    });
  });

  it("#25 CE define() inside conditional — declaration gap", () => {
    const result = runInterpreter({
      "/src/ce-define-dynamic.ts": `
        import { CustomElement } from 'aurelia';

        export class CeDefineDynamic {}

        declare const enableFeature: boolean;
        if (enableFeature) {
          CustomElement.define({ name: 'ce-define-dynamic' }, CeDefineDynamic);
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-define-dynamic",
      className: "CeDefineDynamic",
      form: "define",
    });
  });
});

// =============================================================================
// BC — Binding Command
// =============================================================================

describe("1A: BC recognition", () => {
  it("#6 BC decorator string arg", () => {
    const result = runInterpreter({
      "/src/bc-decorator-string.ts": `
        import { bindingCommand } from 'aurelia';

        @bindingCommand('bc-dec-str')
        export class BcDecStr {}
      `,
    });

    assertClaim(result, {
      kind: "binding-command",
      name: "bc-dec-str",
      className: "BcDecStr",
      form: "decorator",
    });
  });

  it("#12 BC decorator object arg", () => {
    const result = runInterpreter({
      "/src/bc-decorator-object.ts": `
        import { bindingCommand } from 'aurelia';

        @bindingCommand({ name: 'bc-dec-obj' })
        export class BcDecObj {}
      `,
    });

    assertClaim(result, {
      kind: "binding-command",
      name: "bc-dec-obj",
      className: "BcDecObj",
      form: "decorator",
    });
  });

  it("#24 BC define() at module scope", () => {
    const result = runInterpreter({
      "/src/bc-define-static.ts": `
        import { BindingCommand } from 'aurelia';

        export class BcDefineStatic {}

        BindingCommand.define({ name: 'bc-define-static' }, BcDefineStatic);
      `,
    });

    assertClaim(result, {
      kind: "binding-command",
      name: "bc-define-static",
      className: "BcDefineStatic",
      form: "define",
    });
  });

  it("#31 BC convention suffix", () => {
    const result = runInterpreter({
      "/src/bc-convention-suffix.ts": `
        export class BcConvSuffixBindingCommand {}
      `,
    });

    assertClaim(result, {
      kind: "binding-command",
      name: "bc-conv-suffix",
      className: "BcConvSuffixBindingCommand",
      form: "convention",
    });
  });
});

// =============================================================================
// AP — Attribute Pattern
// =============================================================================

describe("1A: AP recognition", () => {
  it("#13 AP decorator object arg", () => {
    const result = runInterpreter({
      "/src/ap-decorator.ts": `
        import { attributePattern } from 'aurelia';

        @attributePattern({ pattern: 'ap.$attr', symbols: '.' })
        export class ApDecorator {}
      `,
    });

    assertClaim(result, {
      kind: "attribute-pattern",
      name: "ap.$attr",
      className: "ApDecorator",
      form: "decorator",
    });
  });
});

// =============================================================================
// Convention pairs with HTML files
// =============================================================================

describe("1A: Convention pairs", () => {
  it("#32 CE convention suffix + paired HTML template", () => {
    const result = runInterpreter({
      "/src/ce-convention-pair.ts": `
        export class CeConvPairCustomElement {}
      `,
      "/src/ce-convention-pair.html": `
        <template>
          <div>Convention-paired template</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-conv-pair",
      className: "CeConvPairCustomElement",
      form: "convention",
    });
  });

  it("#34 local template produces two resources", () => {
    const result = runInterpreter({
      "/src/ce-local-template.ts": `
        export class CeLocalTemplateCustomElement {}
      `,
      "/src/ce-local-template.html": `
        <template>
          <template as-custom-element="my-local">
            <bindable property="value"></bindable>
            <div>\${value}</div>
          </template>

          <my-local value="hello"></my-local>
        </template>
      `,
    });

    // Host CE from convention suffix + HTML pair
    assertClaim(result, {
      kind: "custom-element",
      name: "ce-local-template",
      className: "CeLocalTemplateCustomElement",
      form: "convention",
    });

    // Local CE from as-custom-element attribute in HTML
    assertClaim(result, {
      kind: "custom-element",
      name: "my-local",
      className: "CeLocalTemplateCustomElement",
      form: "local-template",
    });
  });

  it("#35 template via module import", () => {
    const result = runInterpreter({
      "/src/ce-template-import.ts": `
        import { customElement } from 'aurelia';
        import template from './ce-template-import.html';

        @customElement({ name: 'ce-tpl-import', template })
        export class CeTemplateImport {}
      `,
      "/src/ce-template-import.html": `
        <template>
          <div>Imported template</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-tpl-import",
      className: "CeTemplateImport",
      form: "decorator",
    });
  });
});

// =============================================================================
// 1H: Diagnostic entries
// =============================================================================

describe("1H: Diagnostics", () => {
  it("#1H.3 decorator + $au on same class — diagnostic (D2)", () => {
    const result = runInterpreter({
      "/src/prec-dec-plus-au.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'from-decorator', template: '<div></div>' })
        export class PrecDecPlusAu {
          static $au = {
            type: 'custom-element' as const,
            name: 'from-au',
          };
        }
      `,
    });

    // D2: two identity forms on one class = hard error.
    // Both names must not coexist as independent resources.
    assertNotRecognized(result.graph, "custom-element", "from-au");
  });

  it("#1H.4 decorator + define() on same class — diagnostic (D2)", () => {
    const result = runInterpreter({
      "/src/prec-dec-plus-define.ts": `
        import { customElement, CustomElement } from 'aurelia';

        @customElement('from-decorator')
        export class PrecDecPlusDefine {}

        CustomElement.define({ name: 'from-define' }, PrecDecPlusDefine);
      `,
    });

    // D2: two identity forms targeting the same class.
    assertNotRecognized(result.graph, "custom-element", "from-define");
  });
});
