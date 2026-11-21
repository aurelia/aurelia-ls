import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createInMemoryApi } from "../inquiry/runtime/api.js";
import type { FrameworkCapabilitiesValue } from "../inquiry/runtime/framework-capability-lenses.js";
import type { FrameworkResourcesValue } from "../inquiry/runtime/framework-resource-lenses.js";
import type { Api } from "../session/api.js";
import { createSourceProject } from "../source/index.js";

/** Keep resource selection, evidence navigation and the enumeration boundary observable. */
export async function assertFrameworkTerrain(api: Pick<Api, "ask" | "follow">): Promise<void> {
  const resources = (filters: Record<string, string>) => api.ask({
    lens: LensId.FrameworkResources, projection: "definitions", locus: RepoRootLocus,
    filters, budget: { rows: 20, evidencePerSubject: 0 },
  });
  const match = await resources({ bindingName: "PropertyBinding" });
  const carriers = (match.value as FrameworkResourcesValue).convergenceRows;
  assert(carriers?.length && carriers.every((row) => row.bindingNames.includes("PropertyBinding")));
  const absent = await resources({ bindingName: "PropertyBinding", instructionName: "__NoSuchInstruction__" });
  assert.equal(absent.outcome, OutcomeKind.Miss);
  assert.equal(absent.page?.total, 0);

  const trace = await api.ask({
    lens: LensId.FrameworkCapabilities, projection: "evidence-trace", locus: RepoRootLocus,
    filters: { capabilityId: "expression:value-converter-call" }, budget: { rows: 1 },
  });
  const first = (trace.value as FrameworkCapabilitiesValue).evidenceTraceRows?.[0];
  assert(first?.targetEvidenceSamples.some((row) =>
    row.source?.filePath === "aurelia/packages/runtime-html/src/binding/binding-utils.ts"));
  const next = trace.continuations.find((row) => row.id === "framework.capabilities:evidence-trace:next-page");
  assert(next);
  const guide = await api.follow(next);
  assert((guide.value as FrameworkCapabilitiesValue).evidenceTraceRows?.[0]?.targetEvidenceSamples.some((row) =>
    row.source?.filePath === "aurelia/docs/user-docs/templates/value-converters.md"));

  await assertIncompleteTerritory();
}

async function assertIncompleteTerritory(): Promise<void> {
  // A source lens with one real, uniquely located class just beyond the default input limit.
  const root = mkdtempSync(path.join(tmpdir(), "atlas-terrain-self-check-"));
  const pkg = "aurelia/packages/runtime-html";
  const folder = path.join(root, pkg, "src");
  const element = (name: string) => `export class ${name} { static $au = {type: 'custom-element', name: '${name.toLowerCase()}'}; }`;
  try {
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(root, pkg, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ESNext", moduleResolution: "bundler" }, include: ["src"],
    }));
    writeFileSync(path.join(folder, "catalog.ts"), Array.from({ length: 600 },
      (_, i) => element(`Demo${String(i).padStart(3, "0")}`)).join("\n"));
    writeFileSync(path.join(folder, "late.ts"), element("ZLast"));
    writeFileSync(path.join(folder, "index.ts"), "export * from './catalog'; export * from './late';");
    const api = createInMemoryApi({
      sourceProject: createSourceProject({ repoRoot: root, packages: [{
        id: "runtime-html", packageName: "@aurelia/runtime-html",
        rootPath: pkg, tsconfigPath: pkg + "/tsconfig.json",
      }] }),
    });
    for (const projection of ["inventory", "clusters"]) {
      const derived = await api.ask({
        lens: LensId.FrameworkCapabilities, locus: RepoRootLocus, projection,
        budget: { rows: 1000, evidencePerSubject: 0 },
      });
      assert.equal(derived.outcome, OutcomeKind.Partial);
      assert.equal(derived.page?.nextCursor, undefined, "The derived page itself is exhausted.");
      assert(derived.openSeams.length > 0, "A source-page seam survives a zero evidence-display budget.");
      const value = derived.value as FrameworkCapabilitiesValue;
      const source = value.inputPages?.find((page) => page.family === "resources");
      assert.deepEqual([source?.returned, source?.total, source?.next?.page?.cursor], [600, 601, "600"]);
      const names = projection === "inventory"
        ? value.inventoryRows?.map((row) => row.symbol)
        : value.clusterRows?.flatMap((row) => row.members);
      assert(names?.includes("Demo000") && !names.includes("ZLast"));
      const next = derived.continuations.find((c) => c.inquiry.lens === LensId.FrameworkResources);
      assert(next, "Resume the owner page that can disprove an absence.");
      const last = await api.follow(next);
      assert.deepEqual((last.value as FrameworkResourcesValue).convergenceRows?.map((row) => row.targetName), ["ZLast"]);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
