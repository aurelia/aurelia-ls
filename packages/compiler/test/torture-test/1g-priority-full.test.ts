/**
 * Tier 1G: Within-Definition Priority — remaining entries (#4, 5, 7)
 *
 * Bindable priority (most-specific wins) and dependencies merge.
 * Entries 1-3 and 6 already in 1g-priority.test.ts.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1G: Bindable priority", () => {
  it("#1G.4 bindable: field decorator overrides definition object", () => {
    const result = runInterpreter({
      "/src/pri-bindable-override.ts": `
        import { customElement, bindable, BindingMode } from 'aurelia';

        @customElement({
          name: 'pri-bind-override',
          template: '<div></div>',
          bindables: {
            value: { mode: BindingMode.fromView },
          },
        })
        export class PriBindOverride {
          @bindable({ mode: BindingMode.twoWay }) value: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "pri-bind-override",
      className: "PriBindOverride",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });

  it("#1G.5 bindable: field decorator overrides static property", () => {
    const result = runInterpreter({
      "/src/pri-bindable-static.ts": `
        import { customElement, bindable, BindingMode } from 'aurelia';

        @customElement({ name: 'pri-bind-static', template: '<div></div>' })
        export class PriBindStatic {
          @bindable({ mode: BindingMode.twoWay }) value: string = '';

          static bindables = {
            value: { mode: BindingMode.toView },
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "pri-bind-static",
      className: "PriBindStatic",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });
});

describe("1G: Array merge", () => {
  it("#1G.7 dependencies merged from definition + static", () => {
    const result = runInterpreter({
      "/src/pri-deps-merge.ts": `
        import { customElement } from 'aurelia';

        class DepFromDef {}
        class DepFromStatic {}

        @customElement({
          name: 'pri-deps-merge',
          template: '<div></div>',
          dependencies: [DepFromDef],
        })
        export class PriDepsMerge {
          static dependencies = [DepFromStatic];
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "pri-deps-merge",
      className: "PriDepsMerge",
      form: "decorator",
    });
  });
});
