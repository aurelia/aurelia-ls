/**
 * Tier 1I: Convention Meta Elements (8 entries, 16 files)
 *
 * Tests HTML-sourced fields from meta elements in convention-paired
 * HTML templates: <bindable>, <containerless>, <use-shadow-dom>, <capture>.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1I: Convention Meta Elements", () => {
  it("#1I.1 <bindable> minimal — property only", () => {
    const result = runInterpreter({
      "/src/meta-bindable-min.ts": `
        export class MetaBindableMinCustomElement {}
      `,
      "/src/meta-bindable-min.html": `
        <template>
          <bindable property="value"></bindable>
          <div>\${value}</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "meta-bindable-min",
      className: "MetaBindableMinCustomElement",
      form: "convention",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });

  it("#1I.2 <bindable> full — property, attribute, mode", () => {
    const result = runInterpreter({
      "/src/meta-bindable-full.ts": `
        export class MetaBindableFullCustomElement {}
      `,
      "/src/meta-bindable-full.html": `
        <template>
          <bindable property="value" attribute="val" mode="two-way"></bindable>
          <div>\${value}</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "meta-bindable-full",
      className: "MetaBindableFullCustomElement",
      form: "convention",
      fields: {
        "bindable:value:property": "value",
        "bindable:value:attribute": "val",
      },
    });
  });

  it("#1I.3 multiple <bindable> elements", () => {
    const result = runInterpreter({
      "/src/meta-bindable-multi.ts": `
        export class MetaBindableMultiCustomElement {}
      `,
      "/src/meta-bindable-multi.html": `
        <template>
          <bindable property="first"></bindable>
          <bindable property="second" mode="two-way"></bindable>
          <bindable property="third" attribute="item"></bindable>
          <div>\${first} \${second} \${third}</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "meta-bindable-multi",
      className: "MetaBindableMultiCustomElement",
      form: "convention",
      fields: {
        "bindable:first:property": "first",
        "bindable:second:property": "second",
        "bindable:third:property": "third",
        "bindable:third:attribute": "item",
      },
    });
  });

  it("#1I.4 <containerless> meta element", () => {
    const result = runInterpreter({
      "/src/meta-containerless.ts": `
        export class MetaContainerlessCustomElement {}
      `,
      "/src/meta-containerless.html": `
        <template>
          <containerless></containerless>
          <div>no host element</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "meta-containerless",
      className: "MetaContainerlessCustomElement",
      form: "convention",
      fields: { containerless: true },
    });
  });

  it("#1I.5 <use-shadow-dom> default mode (open)", () => {
    const result = runInterpreter({
      "/src/meta-shadow-default.ts": `
        export class MetaShadowDefaultCustomElement {}
      `,
      "/src/meta-shadow-default.html": `
        <template>
          <use-shadow-dom></use-shadow-dom>
          <div>shadow DOM open</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "meta-shadow-default",
      className: "MetaShadowDefaultCustomElement",
      form: "convention",
      fields: { shadowOptions: { mode: "open" } },
    });
  });

  it("#1I.6 <use-shadow-dom mode='closed'>", () => {
    const result = runInterpreter({
      "/src/meta-shadow-closed.ts": `
        export class MetaShadowClosedCustomElement {}
      `,
      "/src/meta-shadow-closed.html": `
        <template>
          <use-shadow-dom mode="closed"></use-shadow-dom>
          <div>shadow DOM closed</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "meta-shadow-closed",
      className: "MetaShadowClosedCustomElement",
      form: "convention",
      fields: { shadowOptions: { mode: "closed" } },
    });
  });

  it("#1I.7 <capture> meta element", () => {
    const result = runInterpreter({
      "/src/meta-capture.ts": `
        export class MetaCaptureCustomElement {}
      `,
      "/src/meta-capture.html": `
        <template>
          <capture></capture>
          <div>captures attribute bindings</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "meta-capture",
      className: "MetaCaptureCustomElement",
      form: "convention",
      fields: { capture: true },
    });
  });

  it("#1I.8 meta inside local template scoped to local CE", () => {
    const result = runInterpreter({
      "/src/meta-inside-local.ts": `
        export class MetaInsideLocalCustomElement {}
      `,
      "/src/meta-inside-local.html": `
        <template>
          <template as-custom-element="inner-local">
            <bindable property="localValue"></bindable>
            <containerless></containerless>
            <div>\${localValue}</div>
          </template>

          <inner-local local-value="test"></inner-local>
        </template>
      `,
    });

    // Parent CE: meta elements inside local template must NOT leak up
    assertClaim(result, {
      kind: "custom-element",
      name: "meta-inside-local",
      className: "MetaInsideLocalCustomElement",
      form: "convention",
      absentFields: ["containerless"],
    });
  });
});
