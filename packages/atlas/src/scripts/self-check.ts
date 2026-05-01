import { OutcomeKind } from "../inquiry/answer.js";
import { LensId, LensStage } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { NavigationRelation } from "../inquiry/navigation.js";
import { RepoAreaId } from "../inquiry/terrain.js";
import { createApi } from "../session/index.js";
import { SourcePackageId } from "../source/index.js";

const api = createApi({ idleTtlMs: 30_000 });
const mapAnswer = await api.map();
const map = mapAnswer.value;
const status = await api.status();

if (mapAnswer.outcome !== OutcomeKind.Hit || map === undefined) {
  throw new Error("The inquiry API did not return a surface map hit.");
}

if (map.packageName !== "@aurelia-ls/atlas") {
  throw new Error("Unexpected package identity.");
}

if (!map.lenses.some((lens) => lens.id === LensId.RepoMap && lens.stage === LensStage.Implemented)) {
  throw new Error("The active repo.map lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.RepoTerrain && lens.stage === LensStage.Implemented)) {
  throw new Error("The active repo.terrain lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.AtlasSelf && lens.stage === LensStage.Implemented)) {
  throw new Error("The active atlas.self lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.FrameworkDiscovery && lens.stage === LensStage.Implemented)) {
  throw new Error("The active framework.discovery lens is missing.");
}

if (!map.lenses.some((lens) => lens.id === LensId.FrameworkDi)) {
  throw new Error("The planned framework.di lens is missing.");
}

if (!map.navigation.routes.some((route) => route.relation === NavigationRelation.MirrorTargetOf)) {
  throw new Error("The navigation grammar must expose auLink mirror target routes.");
}

const navigationRelations = new Set(map.navigation.routes.map((route) => route.relation));

for (const lens of map.lenses) {
  if (lens.stage === LensStage.Implemented && !(await api.isImplemented(lens.id))) {
    throw new Error(`Lens ${lens.id} is marked implemented but is missing a runtime implementation.`);
  }

  for (const substrateId of lens.requiredSubstrates) {
    if (!map.substrates.some((substrate) => substrate.id === substrateId)) {
      throw new Error(`Lens ${lens.id} requires unknown substrate ${substrateId}.`);
    }
  }
}

const vocabularyKeys = new Set<string>();
for (const definition of map.vocabulary) {
  if (vocabularyKeys.has(definition.key)) {
    throw new Error(`Duplicate Atlas vocabulary key: ${definition.key}`);
  }
  vocabularyKeys.add(definition.key);
}

if (!map.activeTerrain.some((area) => area.id === RepoAreaId.SemanticRuntime)) {
  throw new Error("The semantic-runtime terrain is not active.");
}

if (!status.world.sourceProject.packages.some((entry) => entry.id === SourcePackageId.Atlas && entry.sourceFileCount > 0)) {
  throw new Error("The hot source project did not admit inquiry package source files.");
}

if (!status.world.sourceProject.packages.some((entry) => entry.id === SourcePackageId.SemanticRuntime && entry.sourceFileCount > 0)) {
  throw new Error("The hot source project did not admit semantic-runtime source files.");
}

if (!map.contractShape.outcomes.includes(OutcomeKind.Open)) {
  throw new Error("The answer algebra must keep open seams first-class.");
}

const terrainAnswer = await api.ask({
  lens: LensId.RepoTerrain,
  locus: RepoRootLocus,
  projection: "areas",
});

if (terrainAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The repo.terrain runtime lens did not return a hit.");
}

const selfAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "summary",
});

if (selfAnswer.outcome !== OutcomeKind.Hit && selfAnswer.outcome !== OutcomeKind.Partial) {
  throw new Error("The atlas.self runtime lens did not return a coherent maintenance answer.");
}

const frameworkDiscoveryAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "anchors",
  filters: { packageId: "runtime-html" },
  budget: { rows: 3 },
});

if (frameworkDiscoveryAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery runtime lens did not return seed anchors.");
}

const frameworkDiscoveryValue = frameworkDiscoveryAnswer.value as { readonly anchorResolution?: { readonly resolved?: number } } | undefined;
if ((frameworkDiscoveryValue?.anchorResolution?.resolved ?? 0) === 0) {
  throw new Error("The framework.discovery lens did not resolve any seed anchors through the source index.");
}

if (!frameworkDiscoveryAnswer.continuations.some((continuation) => continuation.route?.relation === NavigationRelation.SourceFor)) {
  throw new Error("The framework.discovery lens must expose source navigation route claims.");
}

const frameworkCallEdgesAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "call-edges",
  filters: { flow: "world-formation" },
  budget: { rows: 3 },
});

if (frameworkCallEdgesAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery lens did not return precomputed world-formation call edges.");
}

const frameworkCallTargetsAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "call-targets",
  filters: { flow: "world-formation", direction: "outgoing" },
  budget: { rows: 3 },
});

if (frameworkCallTargetsAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery lens did not return grouped world-formation call targets.");
}

const frameworkObserverAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "observers",
  filters: { observerKind: "observer-locator" },
  budget: { rows: 10, evidencePerSubject: 2 },
});

if (frameworkObserverAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery lens did not return observer-locator entity rows.");
}

const frameworkObserverRows = (frameworkObserverAnswer.value as { readonly observers?: readonly { readonly packageId: string; readonly exportEntry: { readonly exportName: string } }[] } | undefined)?.observers ?? [];
if (!frameworkObserverRows.some((row) => row.packageId === "runtime" && row.exportEntry.exportName === "IObserverLocator")) {
  throw new Error("The framework.discovery observer catalog did not include runtime:IObserverLocator.");
}
if (!frameworkObserverRows.some((row) => row.packageId === "runtime" && row.exportEntry.exportName === "ObserverLocator")) {
  throw new Error("The framework.discovery observer catalog did not include runtime:ObserverLocator.");
}

const frameworkAppTaskAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "app-tasks",
  filters: { appTaskKind: "app-task-factory" },
  budget: { rows: 10, evidencePerSubject: 1 },
});
if (frameworkAppTaskAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery lens did not return AppTask entity rows.");
}
const frameworkAppTaskRows = (frameworkAppTaskAnswer.value as { readonly appTasks?: readonly { readonly packageId: string; readonly exportEntry: { readonly exportName: string } }[] } | undefined)?.appTasks ?? [];
if (!frameworkAppTaskRows.some((row) => row.packageId === "runtime-html" && row.exportEntry.exportName === "AppTask")) {
  throw new Error("The framework.discovery AppTask catalog did not include runtime-html:AppTask.");
}

const frameworkRouterAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "router-entities",
  filters: { routerKind: "router" },
  budget: { rows: 20, evidencePerSubject: 1 },
});
if (frameworkRouterAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery lens did not return router entity rows.");
}
const frameworkRouterRows = (frameworkRouterAnswer.value as { readonly routerEntities?: readonly { readonly packageId: string; readonly exportEntry: { readonly exportName: string } }[] } | undefined)?.routerEntities ?? [];
if (!frameworkRouterRows.some((row) => row.packageId === "router" && row.exportEntry.exportName === "Router")) {
  throw new Error("The framework.discovery router catalog did not include router:Router.");
}

const frameworkExpressionAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "expression-entities",
  filters: { expressionKind: "parser" },
  budget: { rows: 20, evidencePerSubject: 1 },
});
if (frameworkExpressionAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery lens did not return expression entity rows.");
}
const frameworkExpressionRows = (frameworkExpressionAnswer.value as { readonly expressionEntities?: readonly { readonly packageId: string; readonly exportEntry: { readonly exportName: string } }[] } | undefined)?.expressionEntities ?? [];
if (!frameworkExpressionRows.some((row) => row.packageId === "expression-parser" && row.exportEntry.exportName === "ExpressionParser")) {
  throw new Error("The framework.discovery expression catalog did not include expression-parser:ExpressionParser.");
}

const frameworkRenderingStructureAnswer = await api.ask({
  lens: LensId.FrameworkDiscovery,
  locus: RepoRootLocus,
  projection: "rendering-structures",
  filters: { renderingStructureKind: "view-factory" },
  budget: { rows: 20, evidencePerSubject: 1 },
});
if (frameworkRenderingStructureAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error("The framework.discovery lens did not return rendering structure entity rows.");
}
const frameworkRenderingStructureRows = (frameworkRenderingStructureAnswer.value as { readonly renderingStructures?: readonly { readonly packageId: string; readonly exportEntry: { readonly exportName: string } }[] } | undefined)?.renderingStructures ?? [];
if (!frameworkRenderingStructureRows.some((row) => row.packageId === "runtime-html" && row.exportEntry.exportName === "ViewFactory")) {
  throw new Error("The framework.discovery rendering structure catalog did not include runtime-html:ViewFactory.");
}

for (const continuation of frameworkDiscoveryAnswer.continuations) {
  if (continuation.route !== undefined && !navigationRelations.has(continuation.route.relation)) {
    throw new Error(`Continuation ${continuation.id ?? continuation.kind} claims undeclared route relation ${continuation.route.relation}.`);
  }
}

for (const continuation of frameworkCallEdgesAnswer.continuations) {
  if (continuation.route !== undefined && !navigationRelations.has(continuation.route.relation)) {
    throw new Error(`Framework call-edge continuation ${continuation.id ?? continuation.kind} claims undeclared route relation ${continuation.route.relation}.`);
  }
}

for (const continuation of frameworkCallTargetsAnswer.continuations) {
  if (continuation.route !== undefined && !navigationRelations.has(continuation.route.relation)) {
    throw new Error(`Framework call-target continuation ${continuation.id ?? continuation.kind} claims undeclared route relation ${continuation.route.relation}.`);
  }
}

for (const continuation of frameworkObserverAnswer.continuations) {
  if (continuation.route !== undefined && !navigationRelations.has(continuation.route.relation)) {
    throw new Error(`Framework observer continuation ${continuation.id ?? continuation.kind} claims undeclared route relation ${continuation.route.relation}.`);
  }
}

for (const answer of [frameworkAppTaskAnswer, frameworkRouterAnswer, frameworkExpressionAnswer, frameworkRenderingStructureAnswer]) {
  for (const continuation of answer.continuations) {
    if (continuation.route !== undefined && !navigationRelations.has(continuation.route.relation)) {
      throw new Error(`Framework catalog continuation ${continuation.id ?? continuation.kind} claims undeclared route relation ${continuation.route.relation}.`);
    }
  }
}

const firstContinuation = mapAnswer.continuations[0];
if (firstContinuation === undefined) {
  throw new Error("The surface map must expose at least one continuation.");
}

for (const continuation of mapAnswer.continuations) {
  if (continuation.route !== undefined && !navigationRelations.has(continuation.route.relation)) {
    throw new Error(`Surface-map continuation ${continuation.id ?? continuation.kind} claims undeclared route relation ${continuation.route.relation}.`);
  }
}

const followedAnswer = await api.follow(firstContinuation);
if (followedAnswer.outcome !== OutcomeKind.Hit && followedAnswer.outcome !== OutcomeKind.Partial) {
  throw new Error("The inquiry API could not follow a surface-map continuation.");
}

console.log(
  `atlas self-check passed through session ${status.pid}: ${map.lenses.length} lens contract(s), ${map.substrates.length} substrate contract(s), ${map.terrain.length} terrain area(s), ${map.vocabulary.length} vocabulary definition(s), ${map.navigation.routes.length} navigation route(s).`,
);
