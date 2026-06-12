import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId, LensStage } from "../inquiry/lens.js";
import { LocusKind } from "../inquiry/locus.js";
import { isRouterExportName } from "../inquiry/runtime/aurelia-source-imports.js";
import type { AtlasMemoryValue } from "../inquiry/runtime/atlas-memory-lenses.js";
import type { AtlasWorkRouterValue } from "../inquiry/runtime/atlas-work-router-rows.js";
import type { FrameworkRouterValue } from "../inquiry/runtime/framework-router-lenses.js";
import {
  FrameworkBundleKind,
  type FrameworkDiscoveryValue,
} from "../inquiry/runtime/framework-entities.js";
import type { FrameworkResourcesValue } from "../inquiry/runtime/framework-resource-lenses.js";
import type { SelfValue } from "../inquiry/runtime/self-value.js";
import type { PluginArchitectureValue } from "../inquiry/runtime/plugin-architecture-lenses.js";
import type { WorkspaceArchitectureValue } from "../inquiry/runtime/workspace-architecture-lenses.js";
import { createApi } from "../session/index.js";
import { findRepoRoot } from "../source/index.js";

const api = createApi({ idleTtlMs: 30_000, requestTimeoutMs: 180_000 });

const mapAnswer = await api.map("script-self-check");
const map = mapAnswer.value;
const sessionCheck = await api.selfCheck();
const workspaceSummary = await api.ask({
  lens: LensId.WorkspaceArchitecture,
  locus: { kind: LocusKind.Repo },
  projection: "summary",
  budget: { rows: 1, evidencePerSubject: 0 },
});
const routerSurfaces = await api.ask({
  lens: LensId.FrameworkRouter,
  locus: { kind: LocusKind.Repo },
  projection: "surfaces",
  budget: { rows: 1_000, evidencePerSubject: 0 },
});
const frameworkBundles = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: { kind: LocusKind.Repo },
  projection: "bundles",
  budget: { rows: 1_000, evidencePerSubject: 0 },
});
const frameworkResources = await api.ask({
  lens: LensId.FrameworkResources,
  locus: { kind: LocusKind.Repo },
  projection: "convergence",
  budget: { rows: 50, evidencePerSubject: 0 },
});
const pluginSurfaces = await api.ask({
  lens: LensId.PluginArchitecture,
  locus: { kind: LocusKind.Repo },
  projection: "surfaces",
  budget: { rows: 1_000, evidencePerSubject: 0 },
});
const semanticRouteSummary = await api.ask({
  lens: LensId.AtlasSelf,
  locus: { kind: LocusKind.Repo },
  projection: "semantic-routes",
  budget: { rows: 1_000, evidencePerSubject: 0 },
});
const atlasMemorySummary = await api.ask({
  lens: LensId.AtlasMemory,
  locus: { kind: LocusKind.Repo },
  projection: "summary",
  budget: { rows: 1, evidencePerSubject: 0 },
});
const verifiedContinuationCoverage = await api.ask({
  lens: LensId.AtlasWorkRouter,
  locus: { kind: LocusKind.Repo },
  projection: "coverage",
  filters: {
    coverageDimension: "intent-aware-continuations",
    coverageState: "covered",
    coverageDepth: "verified",
  },
  budget: { rows: 20, evidencePerSubject: 0 },
});
const impossibleContinuationCoverage = await api.ask({
  lens: LensId.AtlasWorkRouter,
  locus: { kind: LocusKind.Repo },
  projection: "coverage",
  filters: {
    coverageDimension: "intent-aware-continuations",
    coverageState: "missing",
    coverageDepth: "verified",
  },
  budget: { rows: 20, evidencePerSubject: 0 },
});

if (mapAnswer.outcome !== OutcomeKind.Hit || map === undefined) {
  throw new Error("Atlas did not return a surface map hit.");
}

if (map.packageName !== "@aurelia-ls/atlas") {
  throw new Error("Unexpected Atlas package identity.");
}

for (const lens of map.lenses) {
  if (
    lens.stage === LensStage.Implemented &&
    !(await api.isImplemented(lens.id))
  ) {
    throw new Error(
      `Lens ${lens.id} is marked implemented but has no runtime implementation.`,
    );
  }

  for (const substrateId of lens.requiredSubstrates) {
    if (!map.substrates.some((substrate) => substrate.id === substrateId)) {
      throw new Error(
        `Lens ${lens.id} requires unknown substrate ${substrateId}.`,
      );
    }
  }
}

for (const requiredLens of [
  LensId.RepoMap,
  LensId.RepoTerrain,
  LensId.AtlasSelf,
  LensId.FrameworkDiscovery,
  LensId.FrameworkDi,
  LensId.FrameworkAdmission,
] as const) {
  if (
    !map.lenses.some(
      (lens) =>
        lens.id === requiredLens && lens.stage === LensStage.Implemented,
    )
  ) {
    throw new Error(`Required Atlas lens ${requiredLens} is not implemented.`);
  }
}

if (sessionCheck.mapOutcome !== OutcomeKind.Hit) {
  throw new Error("Session self-check did not return a map hit.");
}

if (sessionCheck.terrainOutcome !== OutcomeKind.Hit) {
  throw new Error("Session self-check did not return a terrain hit.");
}

if (
  sessionCheck.selfOutcome !== OutcomeKind.Hit &&
  sessionCheck.selfOutcome !== OutcomeKind.Partial
) {
  throw new Error("Session self-check did not return a coherent self answer.");
}

const workspaceValue = workspaceSummary.value as WorkspaceArchitectureValue | null | undefined;
if (workspaceSummary.outcome !== OutcomeKind.Hit || workspaceValue == null) {
  throw new Error("Workspace architecture summary did not return a hit.");
}

const suspiciousWorkspaceMechanisms = Object.keys(
  workspaceValue.rollup.surfaceMechanisms,
).filter((mechanism) => mechanism.length > 80 || /[\n{};]/.test(mechanism));
if (suspiciousWorkspaceMechanisms.length > 0) {
  throw new Error(
    `Workspace architecture exposed non-compact mechanism(s): ${suspiciousWorkspaceMechanisms.slice(0, 3).join(", ")}`,
  );
}

const routerSurfaceValue = routerSurfaces.value as FrameworkRouterValue | null | undefined;
if (routerSurfaces.outcome !== OutcomeKind.Hit || routerSurfaceValue == null) {
  throw new Error("Framework router surface projection did not return a hit.");
}

if (routerSurfaceValue.rollup.flowIssueCount !== 0) {
  throw new Error(
    `Framework router flow self-audit reported ${routerSurfaceValue.rollup.flowIssueCount} issue row(s).`,
  );
}

if (routerSurfaceValue.sourceState.status === "drifted") {
  throw new Error(routerSurfaceValue.sourceState.summary);
}

const missingRouterPublicExports = routerPublicExportNames().filter(
  (name) => !isRouterExportName(name),
);
if (missingRouterPublicExports.length > 0) {
  throw new Error(
    `Workspace router import admission missed public @aurelia/router export(s): ${missingRouterPublicExports.slice(0, 5).join(", ")}`,
  );
}

const suspiciousRouterMechanisms = (routerSurfaceValue.surfaces ?? [])
  .map((row) => row.mechanism)
  .filter((mechanism) => mechanism.length > 80 || /[\n{};]/.test(mechanism));
if (suspiciousRouterMechanisms.length > 0) {
  throw new Error(
    `Framework router exposed non-compact mechanism(s): ${suspiciousRouterMechanisms.slice(0, 3).join(", ")}`,
  );
}

const pluginSurfaceValue = pluginSurfaces.value as PluginArchitectureValue | null | undefined;
if (pluginSurfaces.outcome !== OutcomeKind.Hit || pluginSurfaceValue == null) {
  throw new Error("Plugin architecture surface projection did not return a hit.");
}

const suspiciousPluginMechanisms = (pluginSurfaceValue.surfaces ?? [])
  .map((row) => row.mechanism)
  .filter((mechanism) => mechanism.length > 80 || /[\n{};]/.test(mechanism));
if (suspiciousPluginMechanisms.length > 0) {
  throw new Error(
    `Plugin architecture exposed non-compact mechanism(s): ${suspiciousPluginMechanisms.slice(0, 3).join(", ")}`,
  );
}

if (
  !(pluginSurfaceValue.surfaces ?? []).some(
    (row) => row.kind === "resource" && row.mechanism.startsWith("convention:"),
  )
) {
  throw new Error("Plugin architecture did not expose convention resource rows.");
}

const importOnlyPluginRouterRows = (pluginSurfaceValue.surfaces ?? []).filter(
  (row) => row.kind === "router-integration" && row.name === null,
);
if (importOnlyPluginRouterRows.length > 0) {
  throw new Error("Plugin architecture exposed import-only router integration rows.");
}

const frameworkBundleValue = frameworkBundles.value as FrameworkDiscoveryValue | null | undefined;
if (frameworkBundles.outcome !== OutcomeKind.Hit || frameworkBundleValue == null) {
  throw new Error("Framework bundle projection did not return a hit.");
}

const bundleRows = frameworkBundleValue.bundles ?? [];
const bundleIds = new Set(
  bundleRows.map((row) => `${row.packageId}:${row.exportEntry.exportName}`),
);
for (const bundleId of [
  "runtime-html:StandardConfiguration",
  "runtime-html:DefaultComponents",
  "runtime-html:DefaultResources",
  "runtime-html:DefaultRenderers",
  "router:RouterConfiguration",
] as const) {
  if (!bundleIds.has(bundleId)) {
    throw new Error(`Framework bundle projection missed ${bundleId}.`);
  }
}
if (
  !bundleRows.some(
    (row) =>
      row.bundleKind === FrameworkBundleKind.RegistrationCatalog &&
      row.catalogElementCount !== undefined &&
      row.catalogElementCount > 0,
  )
) {
  throw new Error("Framework bundle projection did not expose registration catalogs.");
}
if (
  bundleRows.some(
    (row) => row.exportEntry.type?.startsWith("InterfaceSymbol<") === true,
  )
) {
  throw new Error("Framework bundle projection leaked DI InterfaceSymbol registry rows.");
}

const frameworkResourceValue = frameworkResources.value as FrameworkResourcesValue | null | undefined;
if (frameworkResources.outcome !== OutcomeKind.Hit || frameworkResourceValue == null) {
  throw new Error("Framework resource convergence projection did not return a hit.");
}

const frameworkResourceRows = frameworkResourceValue.convergenceRows ?? [];
const rowsMissingDefinitionSourceSite = frameworkResourceRows.filter(
  (row) => !row.sourceSites.some((site) => site.role === "definition-carrier"),
);
if (rowsMissingDefinitionSourceSite.length > 0) {
  throw new Error(
    `Framework resource convergence rows missed definition source-site provenance: ${rowsMissingDefinitionSourceSite.slice(0, 3).map((row) => row.id).join(", ")}`,
  );
}
const rowsWithLegacySourceField = frameworkResourceRows.filter(
  (row) => Object.hasOwn(row as object, "source"),
);
if (rowsWithLegacySourceField.length > 0) {
  throw new Error(
    `Framework resource convergence rows exposed legacy generic source fields: ${rowsWithLegacySourceField.slice(0, 3).map((row) => row.id).join(", ")}`,
  );
}
if (
  frameworkResourceValue.sourceSiteRoles["definition-carrier"] !==
  frameworkResourceValue.resourceConvergenceCount
) {
  throw new Error("Framework resource convergence source-site rollup did not account for every definition carrier.");
}

const selfValue = semanticRouteSummary.value as SelfValue | null | undefined;
if (semanticRouteSummary.outcome !== OutcomeKind.Hit || selfValue == null) {
  throw new Error("Atlas semantic route summary did not return a hit.");
}

const atlasMemoryValue = atlasMemorySummary.value as AtlasMemoryValue | null | undefined;
if (atlasMemorySummary.outcome !== OutcomeKind.Hit || atlasMemoryValue?.rollup == null) {
  throw new Error("Atlas memory summary did not return a hit.");
}

if (atlasMemoryValue.rollup.recordCount === 0) {
  throw new Error("Atlas memory store did not expose any durable records.");
}

if (atlasMemoryValue.rollup.storageIssueCount !== 0) {
  throw new Error(
    `Atlas memory store reported ${atlasMemoryValue.rollup.storageIssueCount} storage issue(s).`,
  );
}

const verifiedContinuationCoverageValue = verifiedContinuationCoverage.value as AtlasWorkRouterValue | null | undefined;
if (
  verifiedContinuationCoverage.outcome !== OutcomeKind.Hit ||
  (verifiedContinuationCoverageValue?.routeCoverage?.length ?? 0) === 0
) {
  throw new Error("Work Router coverage projection did not return verified intent-aware continuation rows.");
}

const impossibleContinuationCoverageValue = impossibleContinuationCoverage.value as AtlasWorkRouterValue | null | undefined;
if ((impossibleContinuationCoverageValue?.routeCoverage?.length ?? 0) !== 0) {
  throw new Error(
    "Work Router coverage filters matched coverage state and depth from different rows.",
  );
}

const semanticRouteIds = new Set(
  (selfValue.semanticRoutes ?? []).map((row) => row.semanticRouteId),
);
for (const routeId of [
  "framework.route.router.rendering-hydration-flow",
  "framework.route.router.rendering-controller-creations",
  "framework.route.router.lifecycle-controller-calls",
  "framework.route.router.materialization-resource-instantiations",
] as const) {
  if (!semanticRouteIds.has(routeId)) {
    throw new Error(`Missing framework router semantic route ${routeId}.`);
  }
}

console.log(
  `atlas self-check passed through session ${sessionCheck.status.pid}: ${map.lenses.length} lens contract(s), ${map.substrates.length} substrate contract(s), ${map.terrain.length} terrain area(s), ${map.vocabulary.length} vocabulary definition(s), ${map.navigation.routes.length} navigation route(s), ${semanticRouteIds.size} semantic route(s), ${atlasMemoryValue.rollup.recordCount} memory record(s).`,
);

function routerPublicExportNames(): readonly string[] {
  const fileName = path.join(
    findRepoRoot(),
    "aurelia",
    "packages",
    "router",
    "src",
    "index.ts",
  );
  const sourceFile = ts.createSourceFile(
    fileName,
    readFileSync(fileName, "utf8"),
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );
  const names: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) {
      continue;
    }
    const exportClause = statement.exportClause;
    if (exportClause === undefined || !ts.isNamedExports(exportClause)) {
      continue;
    }
    for (const element of exportClause.elements) {
      names.push(element.name.text);
    }
  }
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}
