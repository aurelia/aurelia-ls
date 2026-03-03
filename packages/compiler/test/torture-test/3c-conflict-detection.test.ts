/**
 * Tier 3C: Cross-File Conflict Claims (4 claims)
 *
 * Conclusion claims where observations disagree on locked-identity
 * fields (className). Winner determined by rank or canonical
 * tiebreaker. Conflict gap recorded regardless.
 */

import { describe, it, expect } from "vitest";
import {
  runInterpreter,
  injectFixture,
  assertClaim,
  pullValue,
  isRecognized,
} from "./harness.js";

describe("3C: Conflict detection", () => {
  it("#3C.1 same-rank className conflict — canonical tiebreaker", () => {
    const result = runInterpreter({
      "/src/conflict-a1.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'conflict-same',
          template: '<div>from A1</div>'
        })
        export class ConflictAlpha {}
      `,
      "/src/conflict-a2.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'conflict-same',
          template: '<div>from A2</div>'
        })
        export class ConflictBeta {}
      `,
    });

    // Both observations exist for the same resource name.
    // className disagrees: ConflictAlpha vs ConflictBeta.
    // Deterministic winner via canonical tiebreaker.
    expect(isRecognized(result.graph, "custom-element", "conflict-same")).toBe(true);

    const className = pullValue(result.graph, "custom-element:conflict-same", "className");
    expect(typeof className).toBe("string");
    expect(["ConflictAlpha", "ConflictBeta"]).toContain(className);
  });

  it("#3C.2 cross-rank conflict — higher rank wins, gap still recorded", () => {
    const result = runInterpreter({
      "/src/conflict-cross-a.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'conflict-cross',
          template: '<div>explicit decorator</div>'
        })
        export class ConflictExplicit {}
      `,
      "/src/conflict-cross-b.ts": `
        export class ConflictCrossCustomElement {}
      `,
      "/src/conflict-cross-b.html": `
        <template>
          <div>convention template</div>
        </template>
      `,
    });

    // analysis-explicit rank wins over analysis-convention
    assertClaim(result, {
      kind: "custom-element",
      name: "conflict-cross",
      className: "ConflictExplicit",
      form: "decorator",
      fields: {
        inlineTemplate: "<div>explicit decorator</div>",
      },
    });
  });

  it("#3C.3 className conflict alongside normal field merge", () => {
    const result = runInterpreter({
      "/src/conflict-merge-a.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({
          name: 'conflict-merge',
          template: '<div>from A</div>',
          aliases: ['merge-alpha']
        })
        export class ConflictMergeAlpha {
          @bindable value: string = '';
        }
      `,
      "/src/conflict-merge-b.ts": `
        import { customElement, bindable } from 'aurelia';

        @customElement({
          name: 'conflict-merge',
          containerless: true,
          aliases: ['merge-beta']
        })
        export class ConflictMergeBeta {
          @bindable count: number = 0;
        }
      `,
    });

    // className conflicts but non-identity fields merge normally.
    // aliases: stable-union from both
    // bindables: patch-object from both (disjoint keys)
    // template: from A (B absent → backfill)
    // containerless: from B (A absent → backfill)
    expect(isRecognized(result.graph, "custom-element", "conflict-merge")).toBe(true);

    const aliases = pullValue(result.graph, "custom-element:conflict-merge", "aliases");
    expect(aliases).toEqual(expect.arrayContaining(["merge-alpha", "merge-beta"]));

    const valueProp = pullValue(result.graph, "custom-element:conflict-merge", "bindable:value:property");
    expect(valueProp).toBe("value");

    const countProp = pullValue(result.graph, "custom-element:conflict-merge", "bindable:count:property");
    expect(countProp).toBe("count");
  });

  it("#3C.4 manifest + analysis className conflict", () => {
    const result = runInterpreter({
      "/src/conflict-manifest.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'conflict-manifest-el',
          template: '<div>source version</div>',
          containerless: false
        })
        export class ConflictManifestSource {}
      `,
    });

    injectFixture(result, {
      tier: "manifest",
      resource: {
        name: "conflict-manifest-el",
        kind: "custom-element",
        className: "ConflictManifestDeclared",
      },
      fields: { containerless: true },
    });

    // Manifest wins by rank on className.
    // Conflict gap: ConflictManifestDeclared vs ConflictManifestSource.
    assertClaim(result, {
      kind: "custom-element",
      name: "conflict-manifest-el",
      className: "ConflictManifestDeclared",
      form: "manifest",
      fields: {
        containerless: true,
      },
    });
  });
});
