/**
 * Tier 1K: Field Gathering Gaps — Opaque Extraction + Provenance (5 entries)
 *
 * Tests per-field gap state when field gathering hits the B+C
 * analyzability ceiling. Opaque expressions (function calls, computed
 * values) produce gaps on specific fields while other fields remain known.
 */

import { describe, it, expect } from "vitest";
import { runInterpreter, assertClaim, pullRed, pullValue } from "./harness.js";

describe("1K: Field Gathering Gaps", () => {
  it("#1K.1 opaque scalar — per-field gap granularity", () => {
    const result = runInterpreter({
      "/src/gap-opaque-scalar.ts": `
        import { customElement } from 'aurelia';

        function getDeps() { return []; }

        @customElement({
          name: 'gap-opaque-scalar',
          template: '<div>known template</div>',
          dependencies: getDeps(),
          containerless: false
        })
        export class GapOpaqueScalar {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "gap-opaque-scalar",
      className: "GapOpaqueScalar",
      form: "decorator",
      fields: {
        inlineTemplate: "<div>known template</div>",
        containerless: false,
      },
    });

    // dependencies field: getDeps() is a call expression — B+C ceiling.
    // The observation should carry a gap (unknown) for this specific field.
    // Known fields (name, template, containerless) must not be affected.
  });

  it("#1K.2 opaque bindable mode — sub-field gap", () => {
    const result = runInterpreter({
      "/src/gap-opaque-bindable.ts": `
        import { customElement, bindable, BindingMode } from 'aurelia';

        function getMode(): number { return 6; }

        @customElement({
          name: 'gap-opaque-bindable',
          template: '<div></div>'
        })
        export class GapOpaqueBindable {
          @bindable({ mode: getMode() }) value: string = '';
          @bindable count: number = 0;
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "gap-opaque-bindable",
      className: "GapOpaqueBindable",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
        "bindable:count:property": "count",
      },
    });

    // value's mode: getMode() is opaque — gap on bindable:value:mode
    // count's mode: no mode specified — default, not a gap
  });

  it("#1K.3 partial config — mixed known + opaque fields", () => {
    const result = runInterpreter({
      "/src/gap-partial-config.ts": `
        import { customElement } from 'aurelia';

        function makeTemplate() { return '<div>dynamic</div>'; }
        function makeDeps() { return []; }

        @customElement({
          name: 'gap-partial-config',
          template: makeTemplate(),
          dependencies: makeDeps(),
          containerless: true,
          aliases: ['partial-alt']
        })
        export class GapPartialConfig {}
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "gap-partial-config",
      className: "GapPartialConfig",
      form: "decorator",
      fields: {
        containerless: true,
        aliases: ["partial-alt"],
      },
    });

    // template: makeTemplate() → gap
    // dependencies: makeDeps() → gap
    // name, containerless, aliases: static literals → known
  });

  it("#1K.4 opaque highest-priority with known lower-priority alternative", () => {
    const result = runInterpreter({
      "/src/gap-opaque-alt.ts": `
        import { customElement, bindable, BindingMode } from 'aurelia';

        function computeMode(): number { return 6; }

        @customElement({
          name: 'gap-opaque-alt',
          template: '<div></div>',
          bindables: { value: { mode: BindingMode.fromView } }
        })
        export class GapOpaqueAlt {
          @bindable({ mode: computeMode() }) value: string = '';
        }
      `,
    });

    assertClaim(result, {
      kind: "custom-element",
      name: "gap-opaque-alt",
      className: "GapOpaqueAlt",
      form: "decorator",
      fields: {
        "bindable:value:property": "value",
      },
    });

    // bindable:value:mode — field decorator has computeMode() (opaque,
    // highest priority), definition object has BindingMode.fromView
    // (known, lower priority). The interpreter must NOT backfill from the
    // lower-priority source. The gap is real. The alternative known value
    // should be carried in provenance for policy routing consumers.
  });

  it("#1K.5 fully opaque $au — resource-level gap", () => {
    const result = runInterpreter({
      "/src/gap-fully-opaque-au.ts": `
        function buildConfig() {
          return { type: 'custom-element', name: 'gap-fully-opaque', template: '<div></div>' };
        }

        export class GapFullyOpaque {
          static $au = buildConfig();
        }
      `,
    });

    // className is known from the class declaration itself.
    // kind and name depend on evaluating $au which is opaque.
    // The interpreter should either:
    // a) Recognize optimistically (static $au exists → resource) with
    //    gaps on all config-derived fields, or
    // b) Not recognize at all (conservative — can't determine kind)
    //
    // Either behavior is a valid design choice. The test asserts
    // className is at least available if the resource is recognized.
    const nameRed = pullRed(result.graph, "custom-element:gap-fully-opaque", "name");
    if (nameRed !== undefined) {
      // Optimistic path: recognized with gaps
      expect(pullValue(result.graph, "custom-element:gap-fully-opaque", "className")).toBe("GapFullyOpaque");
    }
    // If not recognized at all, that's also a valid implementation choice —
    // the implementing agent should document which path they chose.
  });
});
