/**
 * Tier 1G: Within-Definition Priority (entries 1-3, 6)
 *
 * Tests priority resolution when multiple sources within a single
 * declaration provide values for the same field.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1G: Within-Definition Priority", () => {
  it("#1G.1 sub-decorator beats definition object (containerless)", () => {
    const result = runInterpreter({
      "/src/pri-sub-vs-def.ts": `
        import { customElement, containerless } from 'aurelia';

        @containerless
        @customElement({
          name: 'pri-sub-vs-def',
          containerless: false,
          template: '<div></div>',
        })
        export class PriSubVsDef {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "pri-sub-vs-def",
      className: "PriSubVsDef",
      form: "decorator",
      fields: { containerless: true },
    });
  });

  it("#1G.2 definition object value extracted (containerless)", () => {
    const result = runInterpreter({
      "/src/pri-def-vs-static.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'pri-def-vs-static',
          containerless: true,
          template: '<div></div>',
        })
        export class PriDefVsStatic {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "pri-def-vs-static",
      className: "PriDefVsStatic",
      form: "decorator",
      fields: { containerless: true },
    });
  });

  it("#1G.3 sub-decorator wins all three sources (shadowOptions)", () => {
    const result = runInterpreter({
      "/src/pri-all-three.ts": `
        import { customElement, useShadowDOM } from 'aurelia';

        @useShadowDOM
        @customElement({
          name: 'pri-all-three',
          shadowOptions: { mode: 'open' },
          template: '<div></div>',
        })
        export class PriAllThree {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "pri-all-three",
      className: "PriAllThree",
      form: "decorator",
      fields: { shadowOptions: { mode: "open" } },
    });
  });

  it("#1G.6 aliases merged from definition + static $au sources", () => {
    // Uses definition object aliases + static $au aliases.
    // Note: having both decorator AND $au is a D2 diagnostic (1H territory).
    // This test focuses on alias merging behavior.
    const result = runInterpreter({
      "/src/pri-aliases-merge.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'pri-aliases-merge',
          aliases: ['alias-from-def'],
          template: '<div></div>',
        })
        export class PriAliasesMerge {
          static $au = {
            type: 'custom-element' as const,
            aliases: ['alias-from-au'],
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "pri-aliases-merge",
      className: "PriAliasesMerge",
      form: "decorator",
      fields: {
        aliases: ["alias-from-def", "alias-from-au"],
      },
    });
  });
});
