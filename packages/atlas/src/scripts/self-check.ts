import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { OutcomeKind } from "../inquiry/answer.js";
import {
  SemanticClaimPredicate,
  type SemanticCompositionValue,
} from "../inquiry/composition.js";
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
import type { BridgeAuLinkValue } from "../inquiry/runtime/bridge-lenses.js";
import type { FrameworkCapabilitiesValue } from "../inquiry/runtime/framework-capability-lenses.js";
import {
  FrameworkCoverageBasisClosure,
} from "../inquiry/runtime/framework-capability-territory.js";
import type { SelfValue } from "../inquiry/runtime/self-value.js";
import type { PluginArchitectureValue } from "../inquiry/runtime/plugin-architecture-lenses.js";
import type { WorkspaceArchitectureValue } from "../inquiry/runtime/workspace-architecture-lenses.js";
import { createApi } from "../session/index.js";
import {
  AuLinkFacetState,
  auLinkFacetFromDecoratorCall,
  findRepoRoot,
} from "../source/index.js";

const api = createApi({ idleTtlMs: 30_000, requestTimeoutMs: 180_000 });

assertAuLinkFacetParsing();

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
const observerFacetAnchors = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "anchors",
  filters: { facet: "observer-selection-semantics" },
  budget: { rows: 50, evidencePerSubject: 0 },
});
const observerFacetUsageComparison = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "usage-comparison",
  filters: { linkId: "runtime:ComputedObserver" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const observerFacetMemberSurface = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "member-surface",
  filters: { linkId: "runtime:ComputedObserver" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const observerFacetUsageMembers = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "usage-members",
  filters: { linkId: "runtime:ComputedObserver" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const catalogOnlyUsageComparison = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "usage-comparison",
  filters: { linkId: "runtime-html:IController" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const observerFacetClaims = await api.ask({
  lens: LensId.FrameworkComposition,
  locus: { kind: LocusKind.Repo },
  projection: "claims",
  filters: { facet: "observer-selection-semantics" },
  budget: { rows: 50, evidencePerSubject: 0 },
});
const unresolvedFacetAnchors = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "anchors",
  filters: { facetState: AuLinkFacetState.Unresolved },
  budget: { rows: 50, evidencePerSubject: 0 },
});
const unresolvedFacetGaps = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "gaps",
  filters: { facetState: AuLinkFacetState.Unresolved },
  budget: { rows: 50, evidencePerSubject: 0 },
});
const scopeUnqualifiedAnchors = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: { kind: LocusKind.Repo },
  projection: "anchors",
  filters: {
    linkId: "runtime:Scope",
    facetState: AuLinkFacetState.Unqualified,
  },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const scopeUnqualifiedClaims = await api.ask({
  lens: LensId.FrameworkComposition,
  locus: { kind: LocusKind.Repo },
  projection: "claims",
  filters: { query: "runtime:Scope" },
  budget: { rows: 20, evidencePerSubject: 0 },
});
const frameworkReverseCoverage = await api.ask({
  lens: LensId.FrameworkCapabilities,
  locus: { kind: LocusKind.Repo },
  projection: "reverse-coverage",
  budget: { rows: 20, evidencePerSubject: 0 },
});
const frameworkReverseCoverageFirstPage = await api.ask({
  lens: LensId.FrameworkCapabilities,
  locus: { kind: LocusKind.Repo },
  projection: "reverse-coverage",
  budget: { rows: 1, evidencePerSubject: 0 },
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

const observerFacetAnchorValue = observerFacetAnchors.value as BridgeAuLinkValue | null | undefined;
const observerAnchors = observerFacetAnchorValue?.anchors ?? [];
const observerAnchorIds = new Set(observerAnchors.map((row) => row.linkId));
const expectedObserverAnchorIds = new Set([
  "runtime-html:NodeObserverLocator",
  "runtime-html:DataAttributeAccessor",
  "runtime-html:AttributeNSAccessor",
  "runtime-html:ValueAttributeObserver",
  "runtime-html:CheckedObserver",
  "runtime-html:SelectValueObserver",
  "runtime:IObserverLocator",
  "runtime:ObserverLocator",
  "runtime:PropertyAccessor",
  "runtime:SetterObserver",
  "runtime:ComputedObserver",
  "runtime:ControlledComputedObserver",
  "runtime:CollectionLengthObserver",
  "runtime:CollectionSizeObserver",
  "runtime:ArrayIndexObserver",
]);
if (
  observerFacetAnchors.outcome !== OutcomeKind.Hit
  || observerAnchorIds.size !== expectedObserverAnchorIds.size
  || [...expectedObserverAnchorIds].some((linkId) => !observerAnchorIds.has(linkId))
  || observerAnchors.some(
    (row) =>
      row.facet !== "observer-selection-semantics"
      || row.facetState !== AuLinkFacetState.Exact
      || (row.target.name !== "ObserverLocator" && row.target.name !== "NodeObserverLocator"),
  )
) {
  throw new Error("auLink did not preserve observer-selection facets on the real selector owners.");
}

const observerFacetUsageValue =
  observerFacetUsageComparison.value as BridgeAuLinkValue | null | undefined;
const observerFacetMemberSurfaceValue =
  observerFacetMemberSurface.value as BridgeAuLinkValue | null | undefined;
const observerFacetUsageMembersValue =
  observerFacetUsageMembers.value as BridgeAuLinkValue | null | undefined;
const catalogOnlyUsageValue =
  catalogOnlyUsageComparison.value as BridgeAuLinkValue | null | undefined;
if (
  (observerFacetUsageValue?.usageComparison?.length ?? 0) !== 0
  || (observerFacetMemberSurfaceValue?.memberSurface?.length ?? 0) !== 0
  || (observerFacetUsageMembersValue?.usageMembers?.length ?? 0) !== 0
  || (catalogOnlyUsageValue?.usageComparison?.length ?? 0) !== 0
) {
  throw new Error("auLink usage-pressure projections admitted a facet-only or catalog-only target.");
}

const observerFacetClaimValue =
  observerFacetClaims.value as SemanticCompositionValue | null | undefined;
const facetClaims = observerFacetClaimValue?.claims ?? [];
if (
  observerFacetClaims.outcome !== OutcomeKind.Hit
  || facetClaims.length === 0
  || facetClaims.some(
    (claim) =>
      claim.predicate !== SemanticClaimPredicate.ModelsFrameworkFacet
      || claim.facet !== "observer-selection-semantics",
  )
  || !observerFacetClaims.continuations.some(
    (continuation) =>
      continuation.inquiry.lens === LensId.BridgeAuLink
      && continuation.inquiry.filters?.packageId !== undefined
      && continuation.inquiry.filters?.facet === "observer-selection-semantics"
      && continuation.inquiry.filters?.facetState === AuLinkFacetState.Exact,
  )
) {
  throw new Error("Framework composition did not retain observer-selection semantic-facet claims.");
}

const unresolvedAnchorValue =
  unresolvedFacetAnchors.value as BridgeAuLinkValue | null | undefined;
const unresolvedGapValue = unresolvedFacetGaps.value as BridgeAuLinkValue | null | undefined;
if (
  (unresolvedAnchorValue?.anchors?.length ?? 0) !== 0
  || (unresolvedGapValue?.gaps?.length ?? 0) !== 0
) {
  throw new Error("Current auLink source contains an unresolved authored facet.");
}

const scopeAnchorValue =
  scopeUnqualifiedAnchors.value as BridgeAuLinkValue | null | undefined;
const scopeAnchors = scopeAnchorValue?.anchors ?? [];
if (
  scopeUnqualifiedAnchors.outcome !== OutcomeKind.Hit
  || scopeAnchors.length !== 1
  || scopeAnchors[0]?.linkId !== "runtime:Scope"
  || scopeAnchors[0]?.facet !== null
  || scopeAnchors[0]?.facetState !== AuLinkFacetState.Unqualified
) {
  throw new Error("auLink did not preserve the explicit unqualified correspondence state.");
}

const scopeClaimValue =
  scopeUnqualifiedClaims.value as SemanticCompositionValue | null | undefined;
const scopeClaims = (scopeClaimValue?.claims ?? []).filter(
  (claim) => claim.object.packageId === "runtime" && claim.object.name === "Scope",
);
if (
  scopeClaims.length !== 1
  || scopeClaims[0]?.predicate !== SemanticClaimPredicate.CorrespondsToFrameworkTarget
  || scopeClaims[0]?.facet !== undefined
  || !scopeUnqualifiedClaims.continuations.some(
    (continuation) =>
      continuation.inquiry.lens === LensId.BridgeAuLink
      && continuation.inquiry.filters?.packageId === "runtime"
      && continuation.inquiry.filters?.facetState === AuLinkFacetState.Unqualified,
  )
) {
  throw new Error("Framework composition did not retain unqualified auLink correspondence provenance.");
}

const reverseCoverageValue =
  frameworkReverseCoverage.value as FrameworkCapabilitiesValue | null | undefined;
const reverseCoverageRows = reverseCoverageValue?.reverseCoverageRows ?? [];
const observationCoverage = reverseCoverageRows.find((row) => row.family === "observation");
if (
  frameworkReverseCoverage.outcome !== OutcomeKind.Hit
  || reverseCoverageRows.length === 0
  || reverseCoverageRows.some(
    (row) =>
      row.basisClosure !== FrameworkCoverageBasisClosure.Complete
      || row.mappingBasisClosure !== FrameworkCoverageBasisClosure.Complete
      || row.unresolvedMappings !== 0,
  )
  || observationCoverage === undefined
  || !observationCoverage.facetOnlyByShape.some(
    (group) =>
      group.symbols.includes("runtime:ComputedObserver")
      && group.symbols.includes("runtime:ObserverLocator"),
  )
) {
  throw new Error("Framework reverse coverage lost package-qualified facet or basis-closure honesty.");
}
if (
  frameworkReverseCoverageFirstPage.page?.nextCursor === undefined
  || !frameworkReverseCoverageFirstPage.continuations.some(
    (continuation) =>
      continuation.id === "framework.capabilities:reverse-coverage:next-page"
      && continuation.inquiry.page?.cursor === frameworkReverseCoverageFirstPage.page?.nextCursor,
  )
) {
  throw new Error("Framework reverse coverage did not preserve its family-page continuation.");
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

function assertAuLinkFacetParsing(): void {
  const cases = [
    {
      options: undefined,
      facet: null,
      facetState: AuLinkFacetState.Unqualified,
    },
    {
      options: '{ facet: "exact" }',
      facet: "exact",
      facetState: AuLinkFacetState.Exact,
    },
    {
      options: '{ ["facet"]: "computed-literal" }',
      facet: "computed-literal",
      facetState: AuLinkFacetState.Exact,
    },
    {
      options: '{ ...options, facet: "later-exact" }',
      facet: "later-exact",
      facetState: AuLinkFacetState.Exact,
    },
    {
      options: '{ facet: "overridden", ...options }',
      facet: null,
      facetState: AuLinkFacetState.Unresolved,
    },
    {
      options: '{ facet: "possibly-overridden", [dynamicKey]: "unknown" }',
      facet: null,
      facetState: AuLinkFacetState.Unresolved,
    },
    {
      options: '{ [dynamicKey]: "unknown", facet: "later-exact" }',
      facet: "later-exact",
      facetState: AuLinkFacetState.Exact,
    },
    {
      options: "{ facet }",
      facet: null,
      facetState: AuLinkFacetState.Unresolved,
    },
  ] as const;

  for (const testCase of cases) {
    const sourceText = testCase.options === undefined
      ? 'auLink("runtime:Example");'
      : `auLink("runtime:Example", ${testCase.options});`;
    const sourceFile = ts.createSourceFile(
      "aulink-facet-self-check.ts",
      sourceText,
      ts.ScriptTarget.ES2023,
      true,
      ts.ScriptKind.TS,
    );
    const statement = sourceFile.statements[0];
    if (
      statement === undefined
      || !ts.isExpressionStatement(statement)
      || !ts.isCallExpression(statement.expression)
    ) {
      throw new Error("Could not parse synthetic auLink facet self-check input.");
    }
    const metadata = auLinkFacetFromDecoratorCall(statement.expression);
    if (
      metadata.facet !== testCase.facet
      || metadata.facetState !== testCase.facetState
    ) {
      throw new Error(
        `auLink facet parser misclassified ${testCase.options ?? "an omitted options argument"}.`,
      );
    }
  }
}
