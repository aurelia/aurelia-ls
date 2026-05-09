import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type { SourceRange } from "../locus.js";
import type {
  FrameworkRouterFlowRow,
  FrameworkRouterFlowStage,
  FrameworkRouteRecognizerMechanicRow,
} from "./framework-router-analysis.js";

export interface FrameworkRouterRelationshipFilters {
  readonly packageId?: string;
  readonly stage?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly query?: string;
}

/** Normalized router relationship row derived from the ordered router flow spine. */
export interface FrameworkRouterRelationshipRow {
  readonly id: string;
  readonly family: FrameworkRelationshipFamily.Router;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase;
  readonly packageId: string;
  readonly packageName: string;
  readonly flowStage: FrameworkRouterFlowStage;
  readonly descriptorKey: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly source: SourceRange;
  readonly sourceRowId: string;
  readonly summary: string;
}

export function routerRelationshipsFromFlowRows(
  rows: readonly FrameworkRouterFlowRow[],
  filters: FrameworkRouterRelationshipFilters = {},
): readonly FrameworkRouterRelationshipRow[] {
  return rows
    .map(routerRelationshipFromFlowRow)
    .filter((row) => routerRelationshipMatches(row, filters))
    .sort(compareRouterRelationshipRows);
}

export function routerRelationshipsFromRows(
  flowRows: readonly FrameworkRouterFlowRow[],
  recognizerRows: readonly FrameworkRouteRecognizerMechanicRow[],
  filters: FrameworkRouterRelationshipFilters = {},
): readonly FrameworkRouterRelationshipRow[] {
  return [
    ...routerRelationshipsFromFlowRows(flowRows, filters),
    ...routerRelationshipsFromRouteRecognizerMechanicRows(recognizerRows, filters),
  ].sort(compareRouterRelationshipRows);
}

export function routerRelationshipsFromRouteRecognizerMechanicRows(
  rows: readonly FrameworkRouteRecognizerMechanicRow[],
  filters: FrameworkRouterRelationshipFilters = {},
): readonly FrameworkRouterRelationshipRow[] {
  return rows
    .map(routerRelationshipFromRouteRecognizerMechanicRow)
    .filter((row) => routerRelationshipMatches(row, filters))
    .sort(compareRouterRelationshipRows);
}

function routerRelationshipFromFlowRow(
  row: FrameworkRouterFlowRow,
): FrameworkRouterRelationshipRow {
  const relation = routerRelationForFlow(row);
  const mechanism = routerMechanismForStage(row.stage);
  const phase = routerPhaseForFlow(row);
  return {
    id: `${row.id}:router-relationship:${relation}`,
    family: FrameworkRelationshipFamily.Router,
    relation,
    mechanism,
    phase,
    packageId: row.packageId,
    packageName: row.packageName,
    flowStage: row.stage,
    descriptorKey: row.descriptorKey,
    from: routerMethodEndpoint(row),
    to: routerTargetEndpoint(row),
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.actor} ${relation} ${row.target} during ${row.stage}: ${row.summary}`,
  };
}

function routerRelationshipFromRouteRecognizerMechanicRow(
  row: FrameworkRouteRecognizerMechanicRow,
): FrameworkRouterRelationshipRow {
  const relation = routerRelationForRecognizerMechanic(row);
  return {
    id: `${row.id}:router-relationship:${relation}`,
    family: FrameworkRelationshipFamily.Router,
    relation,
    mechanism: FrameworkRelationshipMechanism.RouteRecognizer,
    phase: FrameworkRelationshipPhase.Routing,
    packageId: row.packageId,
    packageName: row.packageName,
    flowStage: recognizerFlowStageForMechanic(row),
    descriptorKey: row.descriptorKey,
    from: recognizerMechanicEndpoint(row),
    to: recognizerProductEndpoint(row),
    source: row.source,
    sourceRowId: row.id,
    summary: `${row.name} ${relation} ${row.product} through route-recognizer ${row.phase}: ${row.summary}`,
  };
}

function routerRelationForFlow(
  row: FrameworkRouterFlowRow,
): FrameworkRelationshipRelation {
  switch (row.stage) {
    case "configuration-registration":
      return FrameworkRelationshipRelation.ConfiguresRouter;
    case "route-config-authoring":
      return FrameworkRelationshipRelation.ConfiguresRoute;
    case "route-config-resolution":
      return FrameworkRelationshipRelation.ResolvesRoute;
    case "route-config-context":
      return createsRouteContext(row)
        ? FrameworkRelationshipRelation.CreatesRouteContext
        : FrameworkRelationshipRelation.ConfiguresRoute;
    case "recognizer-population":
      return FrameworkRelationshipRelation.IndexesRoute;
    case "route-recognition":
      return FrameworkRelationshipRelation.RecognizesRoute;
    case "viewport-instruction":
      return FrameworkRelationshipRelation.ProducesViewportInstruction;
    case "route-tree-compilation":
      return FrameworkRelationshipRelation.UpdatesRouteTree;
    case "component-context-creation":
      return FrameworkRelationshipRelation.CreatesRouteContext;
    case "transition-lifecycle":
      return FrameworkRelationshipRelation.RunsRouterTransition;
    case "router-resource":
      return invokesNavigation(row)
        ? FrameworkRelationshipRelation.InvokesNavigation
        : FrameworkRelationshipRelation.ProducesViewportInstruction;
    case "viewport-registration":
      return unregistersViewport(row)
        ? FrameworkRelationshipRelation.UnregistersViewport
        : FrameworkRelationshipRelation.RegistersViewport;
    case "component-lifecycle":
      return FrameworkRelationshipRelation.InvokesLifecycle;
    case "navigation-model":
      return FrameworkRelationshipRelation.UpdatesNavigationModel;
  }
}

function routerRelationForRecognizerMechanic(
  row: FrameworkRouteRecognizerMechanicRow,
): FrameworkRelationshipRelation {
  switch (row.phase) {
    case "endpoint-registration":
    case "state-graph":
      return FrameworkRelationshipRelation.IndexesRoute;
    case "recognition-walk":
    case "candidate-selection":
    case "endpoint-materialization":
    case "cache-and-lookup":
      return FrameworkRelationshipRelation.RecognizesRoute;
    case "route-input":
    case "path-grammar":
      return FrameworkRelationshipRelation.DefinesRouterEntity;
  }
}

function recognizerFlowStageForMechanic(
  row: FrameworkRouteRecognizerMechanicRow,
): FrameworkRouterFlowStage {
  switch (row.phase) {
    case "endpoint-registration":
    case "path-grammar":
    case "route-input":
    case "state-graph":
      return "recognizer-population";
    case "cache-and-lookup":
    case "candidate-selection":
    case "endpoint-materialization":
    case "recognition-walk":
      return "route-recognition";
  }
}

function routerMechanismForStage(
  stage: FrameworkRouterFlowStage,
): FrameworkRelationshipMechanism {
  switch (stage) {
    case "configuration-registration":
      return FrameworkRelationshipMechanism.RouterConfiguration;
    case "route-config-authoring":
    case "route-config-resolution":
      return FrameworkRelationshipMechanism.RouterConfiguration;
    case "route-config-context":
      return FrameworkRelationshipMechanism.RouteConfigContext;
    case "recognizer-population":
    case "route-recognition":
      return FrameworkRelationshipMechanism.RouteRecognizer;
    case "viewport-instruction":
      return FrameworkRelationshipMechanism.ViewportInstruction;
    case "route-tree-compilation":
      return FrameworkRelationshipMechanism.RouteTree;
    case "component-context-creation":
      return FrameworkRelationshipMechanism.RouteContext;
    case "transition-lifecycle":
      return FrameworkRelationshipMechanism.RouterTransition;
    case "router-resource":
      return FrameworkRelationshipMechanism.RouterResource;
    case "viewport-registration":
      return FrameworkRelationshipMechanism.ViewportAgent;
    case "component-lifecycle":
      return FrameworkRelationshipMechanism.RouterLifecycle;
    case "navigation-model":
      return FrameworkRelationshipMechanism.NavigationModel;
  }
}

function routerPhaseForFlow(row: FrameworkRouterFlowRow): FrameworkRelationshipPhase {
  switch (row.stage) {
    case "configuration-registration":
      return FrameworkRelationshipPhase.Registration;
    case "route-config-authoring":
      return FrameworkRelationshipPhase.Definition;
    case "route-config-resolution":
      return FrameworkRelationshipPhase.Resolution;
    case "component-lifecycle":
      return FrameworkRelationshipPhase.Lifecycle;
    case "viewport-registration":
      return FrameworkRelationshipPhase.Hydration;
    case "transition-lifecycle":
    case "router-resource":
    case "navigation-model":
      return FrameworkRelationshipPhase.Navigation;
    case "route-config-context":
    case "recognizer-population":
    case "route-recognition":
    case "viewport-instruction":
    case "route-tree-compilation":
    case "component-context-creation":
      return FrameworkRelationshipPhase.Routing;
  }
}

function createsRouteContext(row: FrameworkRouterFlowRow): boolean {
  return row.flowRelation.includes("creates") || row.flowRelation === "initializes";
}

function invokesNavigation(row: FrameworkRouterFlowRow): boolean {
  return row.flowRelation === "loads" || row.actor.endsWith("onClick") || row.actor.endsWith("_onClick");
}

function unregistersViewport(row: FrameworkRouterFlowRow): boolean {
  return row.flowRelation === "unregisters" || row.actor.endsWith("dispose");
}

function routerMethodEndpoint(row: FrameworkRouterFlowRow): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Method,
    name: row.actor,
    packageId: row.packageId,
    packageName: row.packageName,
    source: row.source,
  };
}

function routerTargetEndpoint(row: FrameworkRouterFlowRow): FrameworkRelationshipEndpoint {
  return {
    kind: routerTargetEndpointKind(row.target),
    name: row.target,
    packageId: row.packageId,
    packageName: row.packageName,
  };
}

function recognizerMechanicEndpoint(
  row: FrameworkRouteRecognizerMechanicRow,
): FrameworkRelationshipEndpoint {
  const name = row.ownerName == null ? row.name : `${row.ownerName}.${row.name}`;
  return {
    kind: recognizerMechanicEndpointKind(row),
    name,
    packageId: row.packageId,
    packageName: row.packageName,
    source: row.source,
  };
}

function recognizerProductEndpoint(
  row: FrameworkRouteRecognizerMechanicRow,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Concept,
    name: row.product,
    packageId: row.packageId,
    packageName: row.packageName,
  };
}

function recognizerMechanicEndpointKind(
  row: FrameworkRouteRecognizerMechanicRow,
): FrameworkRelationshipEndpointKind {
  switch (row.kind) {
    case "operation":
    case "algorithm":
      return FrameworkRelationshipEndpointKind.Method;
    case "storage":
      return FrameworkRelationshipEndpointKind.ContainerSlot;
    case "contract":
    case "model":
    case "constant":
    case "state":
    case "segment":
      return FrameworkRelationshipEndpointKind.Symbol;
  }
}

function routerTargetEndpointKind(target: string): FrameworkRelationshipEndpointKind {
  if (isRouterMethodTarget(target)) {
    return FrameworkRelationshipEndpointKind.Method;
  }
  if (isRouterSymbolTarget(target)) {
    return FrameworkRelationshipEndpointKind.Symbol;
  }
  return FrameworkRelationshipEndpointKind.Concept;
}

function isRouterMethodTarget(target: string): boolean {
  return /^[A-ZI][A-Za-z0-9_]*\.[A-Za-z_$][A-Za-z0-9_$]*$/.test(target);
}

function isRouterSymbolTarget(target: string): boolean {
  return /^[A-ZI][A-Za-z0-9_]*$/.test(target);
}

function routerRelationshipMatches(
  row: FrameworkRouterRelationshipRow,
  filters: FrameworkRouterRelationshipFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.stage === undefined || row.flowStage === filters.stage) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.mechanism === undefined || row.mechanism === filters.mechanism) &&
    (filters.phase === undefined || row.phase === filters.phase) &&
    (filters.query === undefined ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.descriptorKey.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}

function compareRouterRelationshipRows(
  left: FrameworkRouterRelationshipRow,
  right: FrameworkRouterRelationshipRow,
): number {
  return left.phase.localeCompare(right.phase)
    || left.relation.localeCompare(right.relation)
    || left.mechanism.localeCompare(right.mechanism)
    || left.flowStage.localeCompare(right.flowStage)
    || left.from.name.localeCompare(right.from.name)
    || left.to.name.localeCompare(right.to.name)
    || left.id.localeCompare(right.id);
}
