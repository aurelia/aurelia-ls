import assert from "node:assert/strict";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { LocusKind, RepoRootLocus } from "../inquiry/locus.js";
import { ATLAS_WORK_ROUTES } from "../inquiry/runtime/atlas-work-router-route-catalog.js";
import type { AtlasWorkRouterValue } from "../inquiry/runtime/atlas-work-router-rows.js";
import type { Api } from "../session/index.js";

/** Exercise scoped route selection, route-local anchor labels, and page-local owners. */
export async function assertWorkRouterScope(api: Pick<Api, "ask">): Promise<void> {
  const name = "registerAureliaSemanticRuntimeTools";
  const filePath = "packages/mcp/src/tools.ts";
  const routeIds = ["mcp.aurelia-patterns-public-surface", "mcp.developer-preview-shell"];
  const selected = await api.ask({
    lens: LensId.AtlasWorkRouter, projection: "route-plan",
    locus: { kind: LocusKind.Symbol, name, filePath, packageName: "@aurelia-ls/mcp" },
    filters: { routeId: routeIds }, budget: { rows: 2, evidencePerSubject: 0 },
  });
  const plans = (selected.value as AtlasWorkRouterValue).routePlans ?? [];
  assert.equal(selected.outcome, OutcomeKind.Hit);
  assert.deepEqual(plans.map(plan => plan.routeId).sort(), routeIds);
  for (const plan of plans) {
    const expected = ATLAS_WORK_ROUTES.find(route => route.id === plan.routeId)?.anchors.find(anchor =>
      anchor.kind === "source" && anchor.filePath === filePath && anchor.symbolName === name,
    );
    assert.ok(expected);
    assert.deepEqual(plan.sourceAnchors[0]?.anchor, expected);
    assert.ok(plan.sourceAnchors[0]?.found);
  }

  // Other anchors in the same route really do refer to this second file.
  const wrongFile = await api.ask({
    lens: LensId.AtlasWorkRouter, projection: "route-plan",
    locus: { kind: LocusKind.Symbol, name, filePath: "packages/mcp/src/runtime-adapter.ts" },
    filters: { routeId: routeIds },
  });
  assert.equal(wrongFile.outcome, OutcomeKind.Miss);
  assert.equal(wrongFile.page?.total, 0);

  const conflict = await api.ask({
    lens: LensId.AtlasWorkRouter, projection: "routes",
    locus: { kind: LocusKind.SourceFile, filePath }, filters: { path: "packages/atlas" },
  });
  assert.equal(conflict.outcome, OutcomeKind.Reroute);

  const page = await api.ask({
    lens: LensId.AtlasWorkRouter, projection: "coverage", locus: RepoRootLocus,
    budget: { rows: 1, evidencePerSubject: 0 },
  });
  const value = page.value as AtlasWorkRouterValue;
  const owner = value.routeCoverage?.[0]?.routeId;
  assert.ok(owner);
  assert.ok(page.page?.nextCursor);
  assert.deepEqual(value.routes?.map(route => route.id), [owner]);
}
