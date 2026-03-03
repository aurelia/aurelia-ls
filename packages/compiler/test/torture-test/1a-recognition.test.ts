/**
 * Tier 1A: Recognition Matrix — Form × Kind
 *
 * Each test asserts all six dimensions from the manifest:
 * kind, name, className, form, fields (where applicable), gaps (absent fields).
 *
 * The gap profile for string-arg decorators is "name+class only" — all
 * other fields must be absent. For object-arg and $au, "full: all S1
 * available" — but whether the interpreter actually extracts them is
 * separate from recognition.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  assertClaim,
  assertNotRecognized,
} from "./harness.js";

/** Fields that must be absent for string-arg decorator (name+class only) */
const STRING_ARG_ABSENT = [
  "inlineTemplate", "aliases", "containerless", "shadowOptions",
  "capture", "processContent", "enhance",
];

/** Fields that must be absent for convention suffix (name+class only) */
const CONVENTION_SUFFIX_ABSENT = [
  "inlineTemplate", "aliases", "containerless", "shadowOptions",
  "capture", "processContent", "enhance",
];

// =============================================================================
// CE — Custom Element (entries 1, 7, 14, 26, 33)
// =============================================================================

describe("1A: CE Recognition", () => {
  it("#1 CE decorator string arg", () => {
    const result = runInterpreter({
      "/src/ce-decorator-string.ts": `
        import { customElement } from 'aurelia';

        @customElement('ce-dec-str')
        export class CeDecStr {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-dec-str",
      className: "CeDecStr",
      form: "decorator",
      absentFields: STRING_ARG_ABSENT,
    });
  });

  it("#7 CE decorator object arg", () => {
    const result = runInterpreter({
      "/src/ce-decorator-object.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'ce-dec-obj', template: '<div>hello</div>' })
        export class CeDecObj {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-dec-obj",
      className: "CeDecObj",
      form: "decorator",
      fields: {
        inlineTemplate: "<div>hello</div>",
      },
    });
  });

  it("#14 CE static $au", () => {
    const result = runInterpreter({
      "/src/ce-static-au.ts": `
        export class CeStaticAu {
          static $au = {
            type: 'custom-element' as const,
            name: 'ce-static-au',
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-static-au",
      className: "CeStaticAu",
      form: "static-$au",
      absentFields: STRING_ARG_ABSENT,
    });
  });

  it("#26 CE convention suffix (no HTML pair)", () => {
    const result = runInterpreter({
      "/src/ce-convention-suffix.ts": `
        export class CeConvSuffixCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "ce-conv-suffix",
      className: "CeConvSuffixCustomElement",
      form: "convention",
      absentFields: CONVENTION_SUFFIX_ABSENT,
    });
  });

  it("#33 CE convention filename match (no suffix)", () => {
    const result = runInterpreter({
      "/src/my-comp.ts": `
        export class MyComp {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "my-comp",
      className: "MyComp",
      form: "convention",
      absentFields: CONVENTION_SUFFIX_ABSENT,
    });
  });
});

// =============================================================================
// CA — Custom Attribute (entries 2, 8, 15, 27)
// =============================================================================

describe("1A: CA Recognition", () => {
  it("#2 CA decorator string arg", () => {
    const result = runInterpreter({
      "/src/ca-decorator-string.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute('ca-dec-str')
        export class CaDecStr {}
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-dec-str",
      className: "CaDecStr",
      form: "decorator",
    });
  });

  it("#8 CA decorator object arg", () => {
    const result = runInterpreter({
      "/src/ca-decorator-object.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute({ name: 'ca-dec-obj' })
        export class CaDecObj {}
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-dec-obj",
      className: "CaDecObj",
      form: "decorator",
    });
  });

  it("#15 CA static $au", () => {
    const result = runInterpreter({
      "/src/ca-static-au.ts": `
        export class CaStaticAu {
          static $au = {
            type: 'custom-attribute' as const,
            name: 'ca-static-au',
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-static-au",
      className: "CaStaticAu",
      form: "static-$au",
    });
  });

  it("#27 CA convention suffix", () => {
    const result = runInterpreter({
      "/src/ca-convention-suffix.ts": `
        export class CaConvSuffixCustomAttribute {}
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-conv-suffix",
      className: "CaConvSuffixCustomAttribute",
      form: "convention",
    });
  });
});

// =============================================================================
// TC — Template Controller (entries 3, 9, 16, 28)
// =============================================================================

describe("1A: TC Recognition", () => {
  it("#3 TC decorator string arg", () => {
    const result = runInterpreter({
      "/src/tc-decorator-string.ts": `
        import { templateController } from 'aurelia';

        @templateController('tc-dec-str')
        export class TcDecStr {}
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-dec-str",
      className: "TcDecStr",
      form: "decorator",
    });
  });

  it("#9 TC decorator object arg", () => {
    const result = runInterpreter({
      "/src/tc-decorator-object.ts": `
        import { templateController } from 'aurelia';

        @templateController({ name: 'tc-dec-obj' })
        export class TcDecObj {}
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-dec-obj",
      className: "TcDecObj",
      form: "decorator",
    });
  });

  it("#16 TC static $au (isTemplateController)", () => {
    const result = runInterpreter({
      "/src/tc-static-au.ts": `
        export class TcStaticAu {
          static $au = {
            type: 'custom-attribute' as const,
            isTemplateController: true,
            name: 'tc-static-au',
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-static-au",
      className: "TcStaticAu",
      form: "static-$au",
    });
  });

  it("#28 TC convention suffix", () => {
    const result = runInterpreter({
      "/src/tc-convention-suffix.ts": `
        export class TcConvSuffixTemplateController {}
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-conv-suffix",
      className: "TcConvSuffixTemplateController",
      form: "convention",
    });
  });
});

// =============================================================================
// VC — Value Converter (entries 4, 10, 17, 29)
// =============================================================================

describe("1A: VC Recognition", () => {
  it("#4 VC decorator string arg", () => {
    const result = runInterpreter({
      "/src/vc-decorator-string.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter('vcDecStr')
        export class VcDecStr {
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcDecStr",
      className: "VcDecStr",
      form: "decorator",
    });
  });

  it("#10 VC decorator object arg", () => {
    const result = runInterpreter({
      "/src/vc-decorator-object.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter({ name: 'vcDecObj' })
        export class VcDecObj {
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcDecObj",
      className: "VcDecObj",
      form: "decorator",
    });
  });

  it("#17 VC static $au", () => {
    const result = runInterpreter({
      "/src/vc-static-au.ts": `
        export class VcStaticAu {
          static $au = {
            type: 'value-converter' as const,
            name: 'vcStaticAu',
          };
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcStaticAu",
      className: "VcStaticAu",
      form: "static-$au",
    });
  });

  it("#29 VC convention suffix", () => {
    const result = runInterpreter({
      "/src/vc-convention-suffix.ts": `
        export class VcConvSuffixValueConverter {
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcConvSuffix",
      className: "VcConvSuffixValueConverter",
      form: "convention",
    });
  });
});

// =============================================================================
// BB — Binding Behavior (entries 5, 11, 18, 30)
// =============================================================================

describe("1A: BB Recognition", () => {
  it("#5 BB decorator string arg", () => {
    const result = runInterpreter({
      "/src/bb-decorator-string.ts": `
        import { bindingBehavior } from 'aurelia';

        @bindingBehavior('bbDecStr')
        export class BbDecStr {}
      `,
    });

    assertClaim(result, {
      kind: "binding-behavior",
      name: "bbDecStr",
      className: "BbDecStr",
      form: "decorator",
    });
  });

  it("#11 BB decorator object arg", () => {
    const result = runInterpreter({
      "/src/bb-decorator-object.ts": `
        import { bindingBehavior } from 'aurelia';

        @bindingBehavior({ name: 'bbDecObj' })
        export class BbDecObj {}
      `,
    });

    assertClaim(result, {
      kind: "binding-behavior",
      name: "bbDecObj",
      className: "BbDecObj",
      form: "decorator",
    });
  });

  it("#18 BB static $au", () => {
    const result = runInterpreter({
      "/src/bb-static-au.ts": `
        export class BbStaticAu {
          static $au = {
            type: 'binding-behavior' as const,
            name: 'bbStaticAu',
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "binding-behavior",
      name: "bbStaticAu",
      className: "BbStaticAu",
      form: "static-$au",
    });
  });

  it("#30 BB convention suffix", () => {
    const result = runInterpreter({
      "/src/bb-convention-suffix.ts": `
        export class BbConvSuffixBindingBehavior {}
      `,
    });

    assertClaim(result, {
      kind: "binding-behavior",
      name: "bbConvSuffix",
      className: "BbConvSuffixBindingBehavior",
      form: "convention",
    });
  });
});

// =============================================================================
// 1F: Naming Normalization (entries 1-8)
// =============================================================================

describe("1F: Naming Normalization", () => {
  it("#1F.1 FooBar → foo-bar (CE kebab)", () => {
    const result = runInterpreter({
      "/src/name-simple-ce.ts": `
        export class FooBarCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "foo-bar",
      className: "FooBarCustomElement",
      form: "convention",
    });
  });

  it("#1F.2 JSONParser → json-parser (CE acronym kebab)", () => {
    const result = runInterpreter({
      "/src/name-acronym-ce.ts": `
        export class JSONParserCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "json-parser",
      className: "JSONParserCustomElement",
      form: "convention",
    });
  });

  it("#1F.3 HTMLParser → html-parser (CE longer acronym)", () => {
    const result = runInterpreter({
      "/src/name-long-acronym-ce.ts": `
        export class HTMLParserCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "html-parser",
      className: "HTMLParserCustomElement",
      form: "convention",
    });
  });

  it("#1F.4 URL → url (CE all-caps single word)", () => {
    const result = runInterpreter({
      "/src/name-allcaps-ce.ts": `
        export class URLCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "url",
      className: "URLCustomElement",
      form: "convention",
    });
  });

  it("#1F.5 DateFormat → dateFormat (VC camelCase)", () => {
    const result = runInterpreter({
      "/src/name-vc.ts": `
        export class DateFormatValueConverter {
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "dateFormat",
      className: "DateFormatValueConverter",
      form: "convention",
    });
  });

  it("#1F.6 JSON → json (VC all-caps, NOT jSON)", () => {
    const result = runInterpreter({
      "/src/name-allcaps-vc.ts": `
        export class JSONValueConverter {
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "json",
      className: "JSONValueConverter",
      form: "convention",
    });
  });

  it("#1F.7 HTMLParser → htmlParser (VC acronym, NOT hTMLParser)", () => {
    const result = runInterpreter({
      "/src/name-acronym-vc.ts": `
        export class HTMLParserValueConverter {
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "htmlParser",
      className: "HTMLParserValueConverter",
      form: "convention",
    });
  });

  it("#1F.8 MyTc → my-tc (TC uses kebab-case)", () => {
    const result = runInterpreter({
      "/src/name-tc.ts": `
        export class MyTcTemplateController {}
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "my-tc",
      className: "MyTcTemplateController",
      form: "convention",
    });
  });
});

// =============================================================================
// 1H: Declaration Precedence (entries 1-2, 5-7)
// =============================================================================

describe("1H: Declaration Precedence", () => {
  it("#1H.1 decorator overrides convention suffix (same kind)", () => {
    const result = runInterpreter({
      "/src/prec-dec-over-conv.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'explicit-name', template: '<div></div>' })
        export class PrecDecOverConvCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "explicit-name",
      className: "PrecDecOverConvCustomElement",
      form: "decorator",
    });
    assertNotRecognized(result.graph, "custom-element", "prec-dec-over-conv");
  });

  it("#1H.2 decorator name wins over convention-derived name", () => {
    const result = runInterpreter({
      "/src/prec-dec-diff-name.ts": `
        import { customElement } from 'aurelia';

        @customElement('totally-different')
        export class SomeWidgetCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "totally-different",
      className: "SomeWidgetCustomElement",
      form: "decorator",
    });
    assertNotRecognized(result.graph, "custom-element", "some-widget");
  });

  it("#1H.5 multiple exported classes — independent recognition", () => {
    const result = runInterpreter({
      "/src/prec-multi-export.ts": `
        import { customElement, customAttribute } from 'aurelia';

        @customElement({ name: 'first-el', template: '<div>first</div>' })
        export class FirstElement {}

        @customAttribute('second-attr')
        export class SecondAttr {}

        export class ThirdWidgetCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "first-el",
      className: "FirstElement",
      form: "decorator",
    });
    assertClaim(result, {
      kind: "custom-attribute",
      name: "second-attr",
      className: "SecondAttr",
      form: "decorator",
    });
    assertClaim(result, {
      kind: "custom-element",
      name: "third-widget",
      className: "ThirdWidgetCustomElement",
      form: "convention",
    });
  });

  it("#1H.6 kind mismatch: suffix says CE, decorator says CA", () => {
    const result = runInterpreter({
      "/src/prec-kind-mismatch.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute('my-widget')
        export class MyWidgetCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "my-widget",
      className: "MyWidgetCustomElement",
      form: "decorator",
    });
    assertNotRecognized(result.graph, "custom-element", "my-widget");
  });

  it("#1H.7 convention match alone — clean recognition (D1)", () => {
    const result = runInterpreter({
      "/src/prec-conv-clean.ts": `
        export class PrecConvCleanCustomElement {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "prec-conv-clean",
      className: "PrecConvCleanCustomElement",
      form: "convention",
    });
  });
});
