/**
 * Tier 1C: CA/TC Field Extraction (10 entries)
 *
 * CA-specific: noMultiBindings, defaultProperty.
 * TC-specific: containerStrategy, semantics (behavioral gap).
 * Also tests defaultProperty → primary derivation on bindables.
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1C: CA fields", () => {
  it("#1C.1 noMultiBindings boolean", () => {
    const result = runInterpreter({
      "/src/ca-no-multi-bindings.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute({ name: 'ca-no-multi', noMultiBindings: true })
        export class CaNoMulti {}
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-no-multi",
      className: "CaNoMulti",
      form: "decorator",
      fields: { noMultiBindings: true },
    });
  });

  it("#1C.2 defaultProperty non-default value", () => {
    const result = runInterpreter({
      "/src/ca-default-property.ts": `
        import { customAttribute, bindable } from 'aurelia';

        @customAttribute({ name: 'ca-default-prop', defaultProperty: 'items' })
        export class CaDefaultProp {
          @bindable items: unknown;
          @bindable count: number = 0;
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-default-prop",
      className: "CaDefaultProp",
      form: "decorator",
      fields: {
        "bindable:items:property": "items",
        "bindable:count:property": "count",
      },
    });
  });

  it("#1C.3 CA aliases array", () => {
    const result = runInterpreter({
      "/src/ca-aliases.ts": `
        import { customAttribute } from 'aurelia';

        @customAttribute({ name: 'ca-aliases', aliases: ['tip', 'tooltip'] })
        export class CaAliases {}
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-aliases",
      className: "CaAliases",
      form: "decorator",
      fields: { aliases: ["tip", "tooltip"] },
    });
  });

  it("#1C.4 defaultProperty → existing bindable gets primary", () => {
    const result = runInterpreter({
      "/src/ca-default-existing.ts": `
        import { customAttribute, bindable, BindingMode } from 'aurelia';

        @customAttribute({ name: 'ca-def-existing', defaultProperty: 'value' })
        export class CaDefExisting {
          @bindable({ mode: BindingMode.twoWay }) value: string = '';
          @bindable label: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-def-existing",
      className: "CaDefExisting",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
        "bindable:label:property": "label",
      },
    });
  });

  it("#1C.5 defaultProperty → implicit bindable created", () => {
    const result = runInterpreter({
      "/src/ca-default-implicit.ts": `
        import { customAttribute, bindable } from 'aurelia';

        @customAttribute({ name: 'ca-def-implicit', defaultProperty: 'data' })
        export class CaDefImplicit {
          @bindable label: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "ca-def-implicit",
      className: "CaDefImplicit",
      form: "decorator",
      fields: {
        "bindable:label:property": "label",
      },
    });
  });
});

describe("1C: TC fields", () => {
  it("#1C.6 TC structural fields (CA-inherited)", () => {
    const result = runInterpreter({
      "/src/tc-structural.ts": `
        import { templateController, bindable } from 'aurelia';

        @templateController({
          name: 'tc-structural',
          aliases: ['tc-str'],
          defaultProperty: 'condition',
        })
        export class TcStructural {
          @bindable condition: boolean = false;
        }
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-structural",
      className: "TcStructural",
      form: "decorator",
      fields: {
        aliases: ["tc-str"],
        "bindable:condition:property": "condition",
      },
    });
  });

  it("#1C.7 containerStrategy: reuse", () => {
    const result = runInterpreter({
      "/src/tc-container-reuse.ts": `
        import { templateController, bindable } from 'aurelia';

        @templateController({
          name: 'tc-reuse',
          containerStrategy: 'reuse',
        })
        export class TcReuse {
          @bindable value: unknown;
        }
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-reuse",
      className: "TcReuse",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });

  it("#1C.8 containerStrategy: new", () => {
    const result = runInterpreter({
      "/src/tc-container-new.ts": `
        import { templateController, bindable } from 'aurelia';

        @templateController({
          name: 'tc-new',
          containerStrategy: 'new',
        })
        export class TcNew {
          @bindable value: unknown;
        }
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-new",
      className: "TcNew",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });
  });

  it("#1C.9 user-defined TC — behavioral gap (no semantics)", () => {
    const result = runInterpreter({
      "/src/tc-user-no-semantics.ts": `
        import { templateController, bindable } from 'aurelia';

        @templateController('tc-user-bare')
        export class TcUserBare {
          @bindable value: unknown;
        }
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-user-bare",
      className: "TcUserBare",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
      absentFields: ["semantics"],
    });
  });

  it("#1C.10 TC kitchen sink — all structural fields", () => {
    const result = runInterpreter({
      "/src/tc-kitchen-sink.ts": `
        import { templateController, bindable, BindingMode } from 'aurelia';

        @templateController({
          name: 'tc-kitchen-sink',
          aliases: ['tc-ks'],
          defaultProperty: 'items',
          noMultiBindings: true,
          containerStrategy: 'new',
        })
        export class TcKitchenSink {
          @bindable({ mode: BindingMode.toView }) items: unknown;
          @bindable index: number = 0;
        }
      `,
    });

    assertClaim(result, {
      kind: "template-controller",
      name: "tc-kitchen-sink",
      className: "TcKitchenSink",
      form: "decorator",
      fields: {
        aliases: ["tc-ks"],
        noMultiBindings: true,
        "bindable:items:property": "items",
        "bindable:index:property": "index",
      },
      absentFields: ["semantics"],
    });
  });
});
