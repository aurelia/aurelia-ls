/**
 * Tier 1J: Full Field Gathering — Multi-Site Assembly (3 entries)
 *
 * Tests the interpreter assembling one observation from multiple
 * syntactic sites simultaneously. The integration tests for 1E/1G.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1J: Full Field Gathering", () => {
  it("#1J.1 CE: 4 sites — decorator + field decorators + sub-decorator + static", () => {
    const result = runInterpreter({
      "/src/gather-ce-full.ts": `
        import { customElement, bindable, containerless } from 'aurelia';

        @containerless
        @customElement({
          name: 'gather-ce-full',
          template: '<div>\${value} \${count}</div>',
          containerless: false,
          aliases: ['gather-alt'],
          bindables: { value: { mode: 'twoWay' } }
        })
        export class GatherCeFull {
          @bindable count: number = 0;
          static aliases = ['gather-static'];
          static containerless = false;
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "gather-ce-full",
      className: "GatherCeFull",
      form: "decorator",
      fields: {
        containerless: true,
        aliases: ["gather-alt", "gather-static"],
        "bindable:value:property": "value",
        "bindable:count:property": "count",
      },
      absentFields: ["capture"],
    });
  });

  it("#1J.2 CE convention: suffix + paired HTML + meta elements + static", () => {
    const result = runInterpreter({
      "/src/gather-ce-conv.ts": `
        export class GatherCeConvCustomElement {
          static aliases = ['conv-gather-alt'];
        }
      `,
      "/src/gather-ce-conv.html": `
        <template>
          <bindable property="value" mode="two-way"></bindable>
          <bindable property="label"></bindable>
          <div>\${value}: \${label}</div>
        </template>
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "gather-ce-conv",
      className: "GatherCeConvCustomElement",
      form: "convention",
      fields: {
        aliases: ["conv-gather-alt"],
        "bindable:value:property": "value",
        "bindable:label:property": "label",
      },
      absentFields: ["containerless", "capture"],
    });
  });

  it("#1J.3 CA: 4 sites — decorator + field decorators + static bindables", () => {
    const result = runInterpreter({
      "/src/gather-ca-full.ts": `
        import { customAttribute, bindable } from 'aurelia';

        @customAttribute({
          name: 'gather-ca-full',
          noMultiBindings: true,
          bindables: {
            value: { mode: 'fromView' },
            extra: { mode: 'toView' }
          }
        })
        export class GatherCaFull {
          @bindable({ mode: 'twoWay' }) value: string = '';
          @bindable count: number = 0;
          static bindables = { value: { mode: 'oneTime' } };
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "gather-ca-full",
      className: "GatherCaFull",
      form: "decorator",
      fields: {
        noMultiBindings: true,
        "bindable:value:property": "value",
        "bindable:extra:property": "extra",
        "bindable:count:property": "count",
      },
    });
  });
});
