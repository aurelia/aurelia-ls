/**
 * Tier 1H: Declaration Precedence & Diagnostics (entries 1-7)
 *
 * Tests inter-form precedence and diagnostic generation.
 * Uses assertClaim for recognized resources, assertNotRecognized for
 * suppressed convention matches.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  assertClaim,
  assertNotRecognized,
  isRecognized,
} from "./harness.js";
import { expect } from "vitest";

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

  it("#1H.3 decorator + $au on same class — diagnostic (D2)", () => {
    // This is expected to either:
    // a) Produce a diagnostic (the correct behavior per D2), or
    // b) Use the first-recognized form (current interpreter behavior)
    // Either way, both resource keys should NOT coexist independently.
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

    // Current behavior: decorator wins (first in priority order).
    // The $au form is not tried because decorator already matched.
    // Correct behavior would also produce a diagnostic — not yet tested.
    expect(isRecognized(result.graph, "custom-element", "from-decorator")).toBe(true);
    expect(isRecognized(result.graph, "custom-element", "from-au")).toBe(false);
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

    // Decorator kind wins — recognized as CA, not CE
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
