/**
 * Tier 3A: Cross-Source Claims with Evidence Ranking (11 claims)
 *
 * Conclusion claims where observations at different evidence ranks
 * converge cleanly. Higher rank wins per field; lower rank provides
 * backfill for fields the higher rank doesn't cover.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  injectFixture,
  assertClaim,
  pullValue,
} from "./harness.js";

describe("3A: Basic cross-source merge", () => {
  it("#3A.1 manifest overrides containerless, analysis provides template via backfill", () => {
    const result = runInterpreter({
      "/src/rank-ce-basic.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'rank-ce-basic',
          template: '<div>source template</div>',
          containerless: false
        })
        export class RankCeBasic {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-ce-basic", kind: "custom-element", className: "RankCeBasic" },
      fields: { containerless: true },
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "rank-ce-basic",
      className: "RankCeBasic",
      form: "manifest",
      fields: {
        containerless: true,
        inlineTemplate: "<div>source template</div>",
      },
    });
  });

  it("#3A.2 backfill-dominated — manifest carries only aliases", () => {
    const result = runInterpreter({
      "/src/rank-ce-backfill.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'rank-ce-backfill',
          template: '<span>analysis provides everything</span>',
          containerless: true,
        })
        export class RankCeBackfill {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-ce-backfill", kind: "custom-element", className: "RankCeBackfill" },
      fields: { aliases: ["backfill-alt"] },
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "rank-ce-backfill",
      className: "RankCeBackfill",
      form: "manifest",
      fields: {
        inlineTemplate: "<span>analysis provides everything</span>",
        containerless: true,
        aliases: ["backfill-alt"],
      },
    });
  });

  it("#3A.3 convention + manifest — manifest complements convention's narrower field set", () => {
    const result = runInterpreter({
      "/src/rank-ce-conv.ts": `
        export class RankCeConvCustomElement {}
      `,
      "/src/rank-ce-conv.html": `
        <template>
          <div>convention template</div>
        </template>
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-ce-conv", kind: "custom-element", className: "RankCeConvCustomElement" },
      fields: { containerless: true, aliases: ["conv-alt"] },
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "rank-ce-conv",
      className: "RankCeConvCustomElement",
      form: "manifest",
      fields: {
        containerless: true,
        aliases: ["conv-alt"],
      },
      absentFields: ["capture", "shadowOptions", "processContent"],
    });
  });

  it("#3A.4 explicit-config overrides analysis", () => {
    const result = runInterpreter({
      "/src/rank-ce-config.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'rank-ce-config',
          template: '<div>will be overridden</div>',
          containerless: false
        })
        export class RankCeConfig {}
      `,
    });

    injectFixture(result, {
      tier: "explicit-config",
      resource: { name: "rank-ce-config", kind: "custom-element", className: "RankCeConfig" },
      fields: {
        inlineTemplate: "<div>config override</div>",
        containerless: true,
      },
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "rank-ce-config",
      className: "RankCeConfig",
      form: "explicit-config",
      fields: {
        inlineTemplate: "<div>config override</div>",
        containerless: true,
      },
    });
  });

  it("#3A.5 CA fields — manifest overrides noMultiBindings", () => {
    const result = runInterpreter({
      "/src/rank-ca-manifest.ts": `
        import { customAttribute, bindable } from 'aurelia';

        @customAttribute({ name: 'rank-ca', noMultiBindings: false })
        export class RankCa {
          @bindable value: string = '';
          @bindable mode: string = 'default';
        }
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-ca", kind: "custom-attribute", className: "RankCa" },
      fields: { noMultiBindings: true },
    });

    assertClaim(result, {
      kind: "custom-attribute",
      name: "rank-ca",
      className: "RankCa",
      form: "manifest",
      fields: {
        noMultiBindings: true,
        "bindable:value:property": "value",
        "bindable:mode:property": "mode",
      },
    });
  });
});

describe("3A: Operator-specific merge behavior", () => {
  it("#3A.6 stable-union merges aliases additively across ranks", () => {
    const result = runInterpreter({
      "/src/rank-union.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'rank-union',
          template: '<div></div>',
          aliases: ['union-alpha', 'union-beta']
        })
        export class RankUnion {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-union", kind: "custom-element", className: "RankUnion" },
      fields: { aliases: ["union-gamma", "union-alpha"] },
    });

    // stable-union: all contributions collected, deduplicated.
    // union-alpha appears in both → one copy.
    assertClaim(result, {
      kind: "custom-element",
      name: "rank-union",
      className: "RankUnion",
      form: "manifest",
      fields: {
        aliases: ["union-alpha", "union-beta", "union-gamma"],
        inlineTemplate: "<div></div>",
      },
    });
  });

  it("#3A.7 patch-object merges bindable keys across ranks", () => {
    const result = runInterpreter({
      "/src/rank-bindables.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({ name: 'rank-bindables', template: '<div></div>' })
        export class RankBindables {
          @bindable value: string = '';
          @bindable count: number = 0;
        }
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-bindables", kind: "custom-element", className: "RankBindables" },
      fields: {
        "bindable:value:property": "value",
        "bindable:value:attribute": "value",
        "bindable:label:property": "label",
        "bindable:label:attribute": "label",
      },
    });

    // patch-object: shared key (value) uses higher-rank per-key values.
    // Unique keys preserved from each observation.
    assertClaim(result, {
      kind: "custom-element",
      name: "rank-bindables",
      className: "RankBindables",
      form: "manifest",
      fields: {
        "bindable:value:property": "value",
        "bindable:count:property": "count",
        "bindable:label:property": "label",
      },
    });
  });

  it("#3A.8 three observations — pairwise fold (config + manifest + analysis)", () => {
    const result = runInterpreter({
      "/src/rank-three-obs.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'rank-three-obs',
          template: '<div>from source</div>',
          containerless: false,
          aliases: ['three-src']
        })
        export class RankThreeObs {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-three-obs", kind: "custom-element", className: "RankThreeObs" },
      fields: { containerless: true, aliases: ["three-manifest"] },
    });

    injectFixture(result, {
      tier: "explicit-config",
      resource: { name: "rank-three-obs", kind: "custom-element", className: "RankThreeObs" },
      fields: { inlineTemplate: "<div>config wins</div>" },
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "rank-three-obs",
      className: "RankThreeObs",
      form: "explicit-config",
      fields: {
        inlineTemplate: "<div>config wins</div>",
        containerless: true,
        aliases: ["three-src", "three-manifest"],
      },
    });
  });
});

describe("3A: Gap behavior through convergence", () => {
  it("#3A.9 manifest closes a gathering gap via known-over-unknown", () => {
    const result = runInterpreter({
      "/src/rank-gap-closed.ts": `
        import { customElement } from 'aurelia';

        function makeTemplate() { return '<div>dynamic</div>'; }

        @customElement({
          name: 'rank-gap-closed',
          template: makeTemplate(),
          containerless: false
        })
        export class RankGapClosed {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-gap-closed", kind: "custom-element", className: "RankGapClosed" },
      fields: { inlineTemplate: "<div>manifest template</div>" },
    });

    // Analysis has unknown template (makeTemplate() ceiling hit).
    // Manifest provides known template → gap closed.
    assertClaim(result, {
      kind: "custom-element",
      name: "rank-gap-closed",
      className: "RankGapClosed",
      form: "manifest",
      fields: {
        inlineTemplate: "<div>manifest template</div>",
        containerless: false,
      },
    });
  });

  it("#3A.10 gap survives — neither observation has known template", () => {
    const result = runInterpreter({
      "/src/rank-gap-survives.ts": `
        import { customElement } from 'aurelia';

        function makeTemplate() { return '<div>dynamic</div>'; }

        @customElement({
          name: 'rank-gap-survives',
          template: makeTemplate(),
          containerless: false
        })
        export class RankGapSurvives {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-gap-survives", kind: "custom-element", className: "RankGapSurvives" },
      fields: { containerless: true },
      // manifest does NOT carry template — absent, not known
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "rank-gap-survives",
      className: "RankGapSurvives",
      form: "manifest",
      fields: {
        containerless: true,
      },
    });
    // template should remain unknown (gap from analysis, manifest absent)
  });

  it("#3A.11 operator-dependent gap: scalar closed, collection survives", () => {
    const result = runInterpreter({
      "/src/rank-gap-mixed.ts": `
        import { customElement } from 'aurelia';

        function getDeps() { return []; }
        function makeTemplate() { return '<div></div>'; }

        @customElement({
          name: 'rank-gap-mixed',
          template: makeTemplate(),
          dependencies: getDeps(),
          containerless: false,
          aliases: ['mixed-src']
        })
        export class RankGapMixed {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: { name: "rank-gap-mixed", kind: "custom-element", className: "RankGapMixed" },
      fields: {
        inlineTemplate: "<div>manifest provides</div>",
        aliases: ["mixed-manifest"],
      },
    });

    // template (known-over-unknown): analysis unknown + manifest known → closed
    // dependencies (stable-union): analysis unknown + manifest absent → survives
    // aliases (stable-union): analysis known + manifest known → union
    // containerless (known-over-unknown): manifest absent → backfill from analysis
    assertClaim(result, {
      kind: "custom-element",
      name: "rank-gap-mixed",
      className: "RankGapMixed",
      form: "manifest",
      fields: {
        inlineTemplate: "<div>manifest provides</div>",
        containerless: false,
        aliases: ["mixed-src", "mixed-manifest"],
      },
    });
  });
});
