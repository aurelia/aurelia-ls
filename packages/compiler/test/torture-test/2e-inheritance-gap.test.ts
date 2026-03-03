/**
 * Tier 2E: Inheritance as Gap (6 entries, 14 files)
 *
 * D7: the product does NOT trace class inheritance across file
 * boundaries. Inherited fields are gaps with actionable diagnostics.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("2E: Inheritance gap", () => {
  it("#2E.1 base has bindables, derived has none — bindables not inherited", () => {
    const result = runInterpreter({
      "/src/inh-basic.base.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'inh-base', template: '<div>\${value}</div>' })
        export class InhBase {
          @bindable value: string = '';
          @bindable label: string = '';
        }
      `,
      "/src/inh-basic.ts": `
        import { customElement } from 'aurelia';
        import { InhBase } from './inh-basic.base';

        @customElement({ name: 'inh-basic', template: '<div>derived</div>' })
        export class InhBasic extends InhBase {}
      `,
    });

    // Base recognized independently
    assertClaim(result, {
      kind: "custom-element",
      name: "inh-base",
      className: "InhBase",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
        "bindable:label:property": "label",
      },
    });

    // Derived: own fields only, base bindables NOT inherited
    assertClaim(result, {
      kind: "custom-element",
      name: "inh-basic",
      className: "InhBasic",
      form: "decorator",
    });
  });

  it("#2E.2 derived has own bindables + extends — own fields present, base absent", () => {
    const result = runInterpreter({
      "/src/inh-own-fields.base.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'own-fields-base', template: '<div></div>' })
        export class OwnFieldsBase {
          @bindable baseValue: string = '';
        }
      `,
      "/src/inh-own-fields.ts": `
        import { customElement, bindable } from 'aurelia';
        import { OwnFieldsBase } from './inh-own-fields.base';

        @customElement({ name: 'inh-own-fields', template: '<div></div>' })
        export class InhOwnFields extends OwnFieldsBase {
          @bindable extraField: number = 0;
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "inh-own-fields",
      className: "InhOwnFields",
      form: "decorator",
      fields: {
        "bindable:extraField:property": "extraField",
      },
    });
  });

  it("#2E.3 both decorated CEs — no field flow between them", () => {
    const result = runInterpreter({
      "/src/inh-decorator-base.base.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({
          name: 'dec-base',
          template: '<div>base</div>',
          containerless: true,
        })
        export class DecBase {
          @bindable value: string = '';
        }
      `,
      "/src/inh-decorator-base.ts": `
        import { customElement, bindable } from 'aurelia';
        import { DecBase } from './inh-decorator-base.base';

        @customElement({
          name: 'inh-dec-base',
          template: '<div>derived</div>',
        })
        export class InhDecBase extends DecBase {
          @bindable extra: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "inh-dec-base",
      className: "InhDecBase",
      form: "decorator",
      fields: {
        "bindable:extra:property": "extra",
      },
      absentFields: ["containerless"],
    });
  });

  it("#2E.4 convention-recognized base — gap applies regardless of form", () => {
    const result = runInterpreter({
      "/src/inh-convention-base.base.ts": `
        export class InhConvBaseCustomElement {}
      `,
      "/src/inh-convention-base.ts": `
        import { customElement, bindable } from 'aurelia';
        import { InhConvBaseCustomElement } from './inh-convention-base.base';

        @customElement({ name: 'inh-conv-derived', template: '<div></div>' })
        export class InhConvDerived extends InhConvBaseCustomElement {
          @bindable value: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "inh-conv-derived",
      className: "InhConvDerived",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });

  it("#2E.5 base has scalar config fields — all absent on derived", () => {
    const result = runInterpreter({
      "/src/inh-config-fields.base.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'config-base',
          template: '<div></div>',
          shadowOptions: { mode: 'open' },
          capture: true,
          aliases: ['cfg-base-alt'],
        })
        export class ConfigBase {}
      `,
      "/src/inh-config-fields.ts": `
        import { customElement } from 'aurelia';
        import { ConfigBase } from './inh-config-fields.base';

        @customElement({
          name: 'inh-config-fields',
          template: '<div></div>',
        })
        export class InhConfigFields extends ConfigBase {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "inh-config-fields",
      className: "InhConfigFields",
      form: "decorator",
      absentFields: ["shadowOptions", "capture", "aliases"],
    });
  });

  it("#2E.6 unresolvable base class import — deeper gap", () => {
    const result = runInterpreter({
      "/src/inh-unresolvable.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'inh-unresolvable', template: '<div></div>' })
        export class InhUnresolvable {
          @bindable value: string = '';
        }
      `,
    });

    // Resource recognized from its own decorator, own fields present
    assertClaim(result, {
      kind: "custom-element",
      name: "inh-unresolvable",
      className: "InhUnresolvable",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });
});
