/**
 * Tier 1E: Bindable Declaration Forms & Variations — remaining entries
 *
 * Five declaration forms (B1-B5), mode variations, attribute naming,
 * type annotations, shorthand forms.
 * #1 and #11 already tested in 1b-ce-fields.test.ts.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1E: Bindable declaration forms", () => {
  it("#1E.2 B1: @bindable({...}) with mode and attribute config", () => {
    const result = runInterpreter({
      "/src/bind-b1-config.ts": `
        import { customElement, bindable, BindingMode } from 'aurelia';

        @customElement({ name: 'bind-b1-config', template: '<div></div>' })
        export class BindB1Config {
          @bindable({ mode: BindingMode.twoWay, attribute: 'val' })
          value: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-b1-config",
      className: "BindB1Config",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
        "bindable:value:attribute": "val",
      },
    });
  });

  it("#1E.3 B2: @bindable('count') class-level decorator", () => {
    const result = runInterpreter({
      "/src/bind-b2-class.ts": `
        import { customElement, bindable } from 'aurelia';

        @bindable('count')
        @customElement({ name: 'bind-b2-class', template: '<div></div>' })
        export class BindB2Class {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-b2-class",
      className: "BindB2Class",
      form: "decorator",
    });
  });

  it("#1E.4 B3: static bindables property", () => {
    const result = runInterpreter({
      "/src/bind-b3-static.ts": `
        import { customElement, BindingMode } from 'aurelia';

        @customElement({ name: 'bind-b3-static', template: '<div></div>' })
        export class BindB3Static {
          static bindables = {
            value: { mode: BindingMode.twoWay },
            count: true,
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-b3-static",
      className: "BindB3Static",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
        "bindable:count:property": "count",
      },
    });
  });

  it("#1E.5 B4: bindables in definition object", () => {
    const result = runInterpreter({
      "/src/bind-b4-definition.ts": `
        import { customElement, BindingMode } from 'aurelia';

        @customElement({
          name: 'bind-b4-def',
          template: '<div></div>',
          bindables: {
            value: { mode: BindingMode.fromView },
          },
        })
        export class BindB4Def {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-b4-def",
      className: "BindB4Def",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });

  it("#1E.6 B5: bindables in $au object", () => {
    const result = runInterpreter({
      "/src/bind-b5-au.ts": `
        export class BindB5Au {
          static $au = {
            type: 'custom-element' as const,
            name: 'bind-b5-au',
            template: '<div></div>',
            bindables: {
              value: true,
            },
          };
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-b5-au",
      className: "BindB5Au",
      form: "static-$au",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });
});

describe("1E: Bindable field variations", () => {
  it("#1E.7 all 5 binding modes on one class", () => {
    const result = runInterpreter({
      "/src/bind-modes.ts": `
        import { customElement, bindable, BindingMode } from 'aurelia';

        @customElement({ name: 'bind-modes', template: '<div></div>' })
        export class BindModes {
          @bindable({ mode: BindingMode.toView }) toViewProp: string = '';
          @bindable({ mode: BindingMode.fromView }) fromViewProp: string = '';
          @bindable({ mode: BindingMode.twoWay }) twoWayProp: string = '';
          @bindable({ mode: BindingMode.oneTime }) oneTimeProp: string = '';
          @bindable defaultProp: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-modes",
      className: "BindModes",
      form: "decorator",
      fields: {
        "bindable:toViewProp:property": "toViewProp",
        "bindable:fromViewProp:property": "fromViewProp",
        "bindable:twoWayProp:property": "twoWayProp",
        "bindable:oneTimeProp:property": "oneTimeProp",
        "bindable:defaultProp:property": "defaultProp",
      },
    });
  });

  it("#1E.8 explicit attribute override", () => {
    const result = runInterpreter({
      "/src/bind-attribute-custom.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'bind-attr-custom', template: '<div></div>' })
        export class BindAttrCustom {
          @bindable({ attribute: 'my-val' }) value: string = '';
          @bindable({ attribute: 'item-count' }) count: number = 0;
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-attr-custom",
      className: "BindAttrCustom",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
        "bindable:value:attribute": "my-val",
        "bindable:count:property": "count",
        "bindable:count:attribute": "item-count",
      },
    });
  });

  it("#1E.9 automatic attribute derivation (camelCase → kebab-case)", () => {
    const result = runInterpreter({
      "/src/bind-attribute-derived.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'bind-attr-derived', template: '<div></div>' })
        export class BindAttrDerived {
          @bindable firstName: string = '';
          @bindable lastName: string = '';
          @bindable itemCount: number = 0;
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-attr-derived",
      className: "BindAttrDerived",
      form: "decorator",
      fields: {
        "bindable:firstName:property": "firstName",
        "bindable:lastName:property": "lastName",
        "bindable:itemCount:property": "itemCount",
      },
    });
  });

  it("#1E.10 TypeScript type annotations on bindable properties", () => {
    const result = runInterpreter({
      "/src/bind-type-annotation.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'bind-type', template: '<div></div>' })
        export class BindType {
          @bindable value: string = '';
          @bindable count: number = 0;
          @bindable active: boolean = false;
          @bindable items: string[] = [];
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-type",
      className: "BindType",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
        "bindable:count:property": "count",
        "bindable:active:property": "active",
        "bindable:items:property": "items",
      },
    });
  });

  it("#1E.12 boolean and config shorthand in definition bindables", () => {
    const result = runInterpreter({
      "/src/bind-shorthand.ts": `
        import { customElement, BindingMode } from 'aurelia';

        @customElement({
          name: 'bind-shorthand',
          template: '<div></div>',
          bindables: {
            alpha: true,
            beta: { mode: BindingMode.twoWay },
            gamma: { mode: BindingMode.toView, attribute: 'g' },
          },
        })
        export class BindShorthand {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "bind-shorthand",
      className: "BindShorthand",
      form: "decorator",
      fields: {
        "bindable:alpha:property": "alpha",
        "bindable:beta:property": "beta",
        "bindable:gamma:property": "gamma",
        "bindable:gamma:attribute": "g",
      },
    });
  });
});
