import ts from "typescript";

import { countBy } from "../../collections.js";
import {
  requiredSourceFileIdentity,
  requiredSourceRangeForNode,
  firstArgumentText,
  ownerNameForNode,
  propertyNameText,
  SourceProjectMemo,
  type SourceProject,
} from "../../source/index.js";
import { compactExpressionText } from "../../source/semantic-surface/expression-text.js";
import type { SourceRange } from "../locus.js";
import { routerRelationshipsFromRows } from "./framework-router-relationships.js";
import {
  readFrameworkRouterSourceState,
  type FrameworkRouterSourceState,
} from "./framework-router-source-map.js";
import {
  ROUTER_FLOW_DESCRIPTORS,
  ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS,
} from "./framework-router-descriptor-map.js";

export const FRAMEWORK_ROUTER_ANALYSIS_VERSION = "framework-router-analysis.v1";

const frameworkRouterAnalysisMemo =
  new SourceProjectMemo<FrameworkRouterAnalysis>();

export type FrameworkRouterSurfaceKind =
  | "entity"
  | "configuration"
  | "route-context"
  | "route-tree"
  | "route-recognizer"
  | "viewport-agent"
  | "navigation"
  | "di"
  | "resource"
  | "lifecycle";

export type FrameworkRouterFlowStage =
  | "configuration-registration"
  | "url-parsing"
  | "route-config-authoring"
  | "route-config-resolution"
  | "route-config-context"
  | "recognizer-population"
  | "route-recognition"
  | "viewport-instruction"
  | "route-tree-compilation"
  | "component-context-creation"
  | "transition-lifecycle"
  | "router-resource"
  | "viewport-registration"
  | "component-lifecycle"
  | "navigation-model";

export type FrameworkRouterFlowIssueKind =
  | "source-baseline-mismatch"
  | "descriptor-count-mismatch"
  | "unmaterialized-descriptor"
  | "multi-materialized-descriptor"
  | "duplicate-sequence";

export type FrameworkRouteRecognizerMechanicIssueKind =
  | "source-baseline-mismatch"
  | "descriptor-count-mismatch"
  | "unmaterialized-descriptor"
  | "multi-materialized-descriptor";

export type FrameworkRouteRecognizerMechanicKind =
  | "contract"
  | "model"
  | "constant"
  | "storage"
  | "operation"
  | "state"
  | "segment"
  | "algorithm";

export type FrameworkRouteRecognizerMechanicPhase =
  | "route-input"
  | "path-grammar"
  | "state-graph"
  | "endpoint-registration"
  | "recognition-walk"
  | "candidate-selection"
  | "endpoint-materialization"
  | "cache-and-lookup";

export interface FrameworkRouterRollup {
  readonly packageCount: number;
  readonly sourceFileCount: number;
  readonly surfaceCount: number;
  readonly flowCount: number;
  readonly flowDescriptorCount: number;
  readonly flowIssueCount: number;
  readonly unmaterializedFlowDescriptorCount: number;
  readonly multiMaterializedFlowDescriptorCount: number;
  readonly duplicateFlowSequenceCount: number;
  readonly relationshipCount: number;
  readonly relationshipRelations: Readonly<Record<string, number>>;
  readonly relationshipMechanisms: Readonly<Record<string, number>>;
  readonly relationshipPhases: Readonly<Record<string, number>>;
  readonly routeRecognizerMechanicDescriptorCount: number;
  readonly routeRecognizerMechanicCount: number;
  readonly routeRecognizerMechanicIssueCount: number;
  readonly routeRecognizerMechanicUnmaterializedDescriptorCount: number;
  readonly routeRecognizerMechanicMultiMaterializedDescriptorCount: number;
  readonly routeRecognizerMechanicKinds: Readonly<Record<string, number>>;
  readonly routeRecognizerMechanicPhases: Readonly<Record<string, number>>;
  readonly routeRecognizerMechanicProducts: Readonly<Record<string, number>>;
  readonly entityCount: number;
  readonly configurationCount: number;
  readonly routeContextCount: number;
  readonly routeTreeCount: number;
  readonly routeRecognizerCount: number;
  readonly viewportAgentCount: number;
  readonly navigationCount: number;
  readonly diCount: number;
  readonly resourceCount: number;
  readonly lifecycleCount: number;
  readonly flowStages: Readonly<Record<FrameworkRouterFlowStage, number>>;
}

export interface FrameworkRouterPackageRow {
  readonly id: string;
  readonly packageName: string;
  readonly sourceFileCount: number;
  readonly surfaceCount: number;
  readonly flowCount: number;
  readonly entityCount: number;
  readonly configurationCount: number;
  readonly routeContextCount: number;
  readonly routeTreeCount: number;
  readonly routeRecognizerCount: number;
  readonly viewportAgentCount: number;
  readonly navigationCount: number;
  readonly diCount: number;
  readonly resourceCount: number;
  readonly lifecycleCount: number;
  readonly summary: string;
}

export interface FrameworkRouterSurfaceRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly kind: FrameworkRouterSurfaceKind;
  readonly mechanism: string;
  readonly ownerName: string | null;
  readonly name: string | null;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkRouteRecognizerMechanicRow {
  readonly id: string;
  readonly descriptorKey: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly kind: FrameworkRouteRecognizerMechanicKind;
  readonly phase: FrameworkRouteRecognizerMechanicPhase;
  readonly product: string;
  readonly ownerName: string | null;
  readonly name: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkRouteRecognizerMechanicIssueRow {
  readonly id: string;
  readonly kind: FrameworkRouteRecognizerMechanicIssueKind;
  readonly descriptorKey: string;
  readonly ownerName: string | null;
  readonly name: string;
  readonly count: number;
  readonly summary: string;
}

export interface FrameworkRouterFlowRow {
  readonly id: string;
  readonly descriptorKey: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly sequence: number;
  readonly stage: FrameworkRouterFlowStage;
  readonly actor: string;
  readonly flowRelation: string;
  readonly target: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkRouterFlowIssueRow {
  readonly id: string;
  readonly kind: FrameworkRouterFlowIssueKind;
  readonly descriptorKey: string | null;
  readonly sequence: number | null;
  readonly actor: string | null;
  readonly count: number;
  readonly summary: string;
}

export interface FrameworkRouterAnalysis {
  readonly version: typeof FRAMEWORK_ROUTER_ANALYSIS_VERSION;
  readonly sourceState: FrameworkRouterSourceState;
  readonly rollup: FrameworkRouterRollup;
  readonly packages: readonly FrameworkRouterPackageRow[];
  readonly surfaces: readonly FrameworkRouterSurfaceRow[];
  readonly flows: readonly FrameworkRouterFlowRow[];
  readonly flowIssues: readonly FrameworkRouterFlowIssueRow[];
  readonly routeRecognizerMechanics: readonly FrameworkRouteRecognizerMechanicRow[];
  readonly routeRecognizerMechanicIssues: readonly FrameworkRouteRecognizerMechanicIssueRow[];
}

export function readFrameworkRouterAnalysis(
  sourceProject: SourceProject,
): FrameworkRouterAnalysis {
  return frameworkRouterAnalysisMemo.read(sourceProject, () =>
    buildFrameworkRouterAnalysis(sourceProject),
  );
}

function buildFrameworkRouterAnalysis(
  sourceProject: SourceProject,
): FrameworkRouterAnalysis {
  const sourceState = readFrameworkRouterSourceState(sourceProject.repoRoot);
  const packageRows = new Map<string, MutableFrameworkRouterPackageRow>();
  const surfaces: FrameworkRouterSurfaceRow[] = [];
  const flows: FrameworkRouterFlowRow[] = [];
  const routeRecognizerMechanics: FrameworkRouteRecognizerMechanicRow[] = [];

  for (const sourcePackage of sourceProject.snapshot().summary.packages) {
    if (!isRouterPackageId(sourcePackage.id)) {
      continue;
    }
    packageRows.set(sourcePackage.id, {
      id: sourcePackage.id,
      packageName: sourcePackage.packageName,
      sourceFileCount: 0,
      surfaceCount: 0,
      flowCount: 0,
      entityCount: 0,
      configurationCount: 0,
      routeContextCount: 0,
      routeTreeCount: 0,
      routeRecognizerCount: 0,
      viewportAgentCount: 0,
      navigationCount: 0,
      diCount: 0,
      resourceCount: 0,
      lifecycleCount: 0,
    });
  }

  for (const sourceFile of sourceProject.ownedSourceFiles()) {
    const sourcePackage = sourceProject.packageForFileName(sourceFile.fileName);
    if (sourcePackage === null || !isRouterPackageId(sourcePackage.id) || isDeclarationFile(sourceFile.fileName)) {
      continue;
    }
    const packageRow = packageRows.get(sourcePackage.id);
    if (packageRow !== undefined) {
      packageRow.sourceFileCount += 1;
    }
    scanRouterSourceFile(
      sourceProject,
      sourceFile,
      sourcePackage.id,
      sourcePackage.packageName,
      surfaces,
      flows,
      routeRecognizerMechanics,
    );
  }

  for (const row of surfaces) {
    const packageRow = packageRows.get(row.packageId);
    if (packageRow === undefined) {
      continue;
    }
    packageRow.surfaceCount += 1;
    switch (row.kind) {
      case "entity":
        packageRow.entityCount += 1;
        break;
      case "configuration":
        packageRow.configurationCount += 1;
        break;
      case "route-context":
        packageRow.routeContextCount += 1;
        break;
      case "route-tree":
        packageRow.routeTreeCount += 1;
        break;
      case "route-recognizer":
        packageRow.routeRecognizerCount += 1;
        break;
      case "viewport-agent":
        packageRow.viewportAgentCount += 1;
        break;
      case "navigation":
        packageRow.navigationCount += 1;
        break;
      case "di":
        packageRow.diCount += 1;
        break;
      case "resource":
        packageRow.resourceCount += 1;
        break;
      case "lifecycle":
        packageRow.lifecycleCount += 1;
        break;
    }
  }

  for (const row of flows) {
    const packageRow = packageRows.get(row.packageId);
    if (packageRow !== undefined) {
      packageRow.flowCount += 1;
    }
  }

  const relationships = routerRelationshipsFromRows(flows, routeRecognizerMechanics);
  const flowIssues = flowIssueRows(sourceState, flows);
  const routeRecognizerMechanicIssues = routeRecognizerMechanicIssueRows(sourceState, routeRecognizerMechanics);
  const packages = [...packageRows.values()].map(frameworkRouterPackageRow);
  return {
    version: FRAMEWORK_ROUTER_ANALYSIS_VERSION,
    sourceState,
    rollup: {
      packageCount: packages.length,
      sourceFileCount: packages.reduce((sum, row) => sum + row.sourceFileCount, 0),
      surfaceCount: surfaces.length,
      flowCount: flows.length,
      flowDescriptorCount: ROUTER_FLOW_DESCRIPTORS.size,
      flowIssueCount: flowIssues.length,
      unmaterializedFlowDescriptorCount: flowIssues.filter((row) => row.kind === "unmaterialized-descriptor").length,
      multiMaterializedFlowDescriptorCount: flowIssues.filter((row) => row.kind === "multi-materialized-descriptor").length,
      duplicateFlowSequenceCount: flowIssues.filter((row) => row.kind === "duplicate-sequence").length,
      relationshipCount: relationships.length,
      relationshipRelations: countBy(relationships, (row) => row.relation),
      relationshipMechanisms: countBy(relationships, (row) => row.mechanism),
      relationshipPhases: countBy(relationships, (row) => row.phase),
      routeRecognizerMechanicDescriptorCount: ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS.size,
      routeRecognizerMechanicCount: routeRecognizerMechanics.length,
      routeRecognizerMechanicIssueCount: routeRecognizerMechanicIssues.length,
      routeRecognizerMechanicUnmaterializedDescriptorCount: routeRecognizerMechanicIssues.filter((row) => row.kind === "unmaterialized-descriptor").length,
      routeRecognizerMechanicMultiMaterializedDescriptorCount: routeRecognizerMechanicIssues.filter((row) => row.kind === "multi-materialized-descriptor").length,
      routeRecognizerMechanicKinds: countBy(routeRecognizerMechanics, (row) => row.kind),
      routeRecognizerMechanicPhases: countBy(routeRecognizerMechanics, (row) => row.phase),
      routeRecognizerMechanicProducts: countBy(routeRecognizerMechanics, (row) => row.product),
      entityCount: packages.reduce((sum, row) => sum + row.entityCount, 0),
      configurationCount: packages.reduce((sum, row) => sum + row.configurationCount, 0),
      routeContextCount: packages.reduce((sum, row) => sum + row.routeContextCount, 0),
      routeTreeCount: packages.reduce((sum, row) => sum + row.routeTreeCount, 0),
      routeRecognizerCount: packages.reduce((sum, row) => sum + row.routeRecognizerCount, 0),
      viewportAgentCount: packages.reduce((sum, row) => sum + row.viewportAgentCount, 0),
      navigationCount: packages.reduce((sum, row) => sum + row.navigationCount, 0),
      diCount: packages.reduce((sum, row) => sum + row.diCount, 0),
      resourceCount: packages.reduce((sum, row) => sum + row.resourceCount, 0),
      lifecycleCount: packages.reduce((sum, row) => sum + row.lifecycleCount, 0),
      flowStages: countFlowStages(flows),
    },
    packages,
    surfaces: surfaces.sort(compareFrameworkRouterSurfaceRows),
    flows: flows.sort(compareFlowRows),
    flowIssues,
    routeRecognizerMechanics: routeRecognizerMechanics.sort(compareRouteRecognizerMechanicRows),
    routeRecognizerMechanicIssues,
  };
}

interface MutableFrameworkRouterPackageRow {
  readonly id: string;
  readonly packageName: string;
  sourceFileCount: number;
  surfaceCount: number;
  flowCount: number;
  entityCount: number;
  configurationCount: number;
  routeContextCount: number;
  routeTreeCount: number;
  routeRecognizerCount: number;
  viewportAgentCount: number;
  navigationCount: number;
  diCount: number;
  resourceCount: number;
  lifecycleCount: number;
}

function scanRouterSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  rows: FrameworkRouterSurfaceRow[],
  flows: FrameworkRouterFlowRow[],
  recognizerMechanics: FrameworkRouteRecognizerMechanicRow[],
): void {
  const visit = (node: ts.Node): void => {
    const row = routerSurfaceForNode(sourceProject, sourceFile, packageId, packageName, node);
    if (row !== null) {
      rows.push(row);
    }
    const flow = routerFlowForNode(sourceProject, sourceFile, packageId, packageName, node);
    if (flow !== null) {
      flows.push(flow);
    }
    const recognizerMechanic = routeRecognizerMechanicForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
    );
    if (recognizerMechanic !== null) {
      recognizerMechanics.push(recognizerMechanic);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function routerSurfaceForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
): FrameworkRouterSurfaceRow | null {
  if (isNamedDeclaration(node)) {
    const name = node.name?.getText(sourceFile) ?? null;
    const kind = name == null ? null : routerEntityKind(name);
    if (kind !== null) {
      return frameworkRouterSourceRowForNode(sourceProject, sourceFile, packageId, packageName, node.name ?? node, kind, "declaration", ownerNameForNode(node), name);
    }
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    const kind = routerEntityKind(node.name.text);
    if (kind !== null) {
      return frameworkRouterSourceRowForNode(sourceProject, sourceFile, packageId, packageName, node.name, kind, "declaration", ownerNameForNode(node), node.name.text);
    }
  }

  if (ts.isCallExpression(node)) {
    const mechanism = compactExpressionText(node.expression, sourceFile);
    const kind = routerCallKind(mechanism);
    if (kind !== null) {
      return frameworkRouterSourceRowForNode(sourceProject, sourceFile, packageId, packageName, node, kind, mechanism, ownerNameForNode(node), firstArgumentText(node, sourceFile));
    }
  }

  if (ts.isNewExpression(node)) {
    const mechanism = `new ${compactExpressionText(node.expression, sourceFile)}`;
    const kind = routerCallKind(mechanism);
    if (kind !== null) {
      return frameworkRouterSourceRowForNode(sourceProject, sourceFile, packageId, packageName, node, kind, mechanism, ownerNameForNode(node), firstArgumentText(node, sourceFile));
    }
  }

  return null;
}

function routerFlowForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
): FrameworkRouterFlowRow | null {
  const key = flowNodeKey(node, sourceFile);
  if (key === null) {
    return null;
  }
  const descriptor = ROUTER_FLOW_DESCRIPTORS.get(key);
  if (descriptor === undefined) {
    return null;
  }
  const source = requiredSourceRangeForNode(sourceProject, node);
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  return {
    id: [
      "framework-router-flow",
      packageId,
      descriptor.sequence,
      descriptor.stage,
      source.filePath,
      source.start.line,
      source.start.character,
    ].join(":"),
    descriptorKey: key,
    packageId,
    packageName,
    sequence: descriptor.sequence,
    stage: descriptor.stage,
    actor: descriptor.actor,
    flowRelation: descriptor.flowRelation,
    target: descriptor.target,
    filePath: file.repoPath,
    source,
    summary: descriptor.summary,
  };
}

function routeRecognizerMechanicForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
): FrameworkRouteRecognizerMechanicRow | null {
  const key = routeRecognizerMechanicKey(node, sourceFile);
  if (key === null) {
    return null;
  }
  const descriptor = ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS.get(key);
  if (descriptor === undefined) {
    return null;
  }
  const source = requiredSourceRangeForNode(sourceProject, node);
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  return {
    id: [
      "framework-route-recognizer",
      packageId,
      descriptor.phase,
      descriptor.product,
      source.filePath,
      source.start.line,
      source.start.character,
    ].join(":"),
    descriptorKey: key,
    packageId,
    packageName,
    kind: descriptor.kind,
    phase: descriptor.phase,
    product: descriptor.product,
    ownerName: descriptor.ownerName,
    name: descriptor.name,
    filePath: file.repoPath,
    source,
    summary: descriptor.summary,
  };
}

function routerEntityKind(name: string): FrameworkRouterSurfaceKind | null {
  if (name.includes("Configuration") || name === "RouterOptions" || name === "NavigationOptions") {
    return "configuration";
  }
  if (name.includes("RouteConfigContext") || name === "RouteContext" || name === "IRouteContext" || name === "ContextRouter") {
    return "route-context";
  }
  if (name.includes("RouteTree") || name === "RouteNode") {
    return "route-tree";
  }
  if (name.includes("Recognizer") || name === "RecognizedRoute") {
    return "route-recognizer";
  }
  if (
    name.includes("ViewportAgent") ||
    name.includes("ViewportInstruction") ||
    name === "ViewportRequest"
  ) {
    return "viewport-agent";
  }
  if (name === "Router" || name === "IRouter" || name.includes("Navigation")) {
    return "navigation";
  }
  return isRouterNamedEntity(name) ? "entity" : null;
}

function routerCallKind(mechanism: string): FrameworkRouterSurfaceKind | null {
  if (mechanism.includes("Registration.") || mechanism.includes("container.register") || mechanism.includes("container.get")) {
    return "di";
  }
  if (mechanism.includes("AppTask.")) {
    return "lifecycle";
  }
  if (mechanism.includes("CustomElement.") || mechanism.includes("resolveRouteConfiguration")) {
    return "resource";
  }
  if (mechanism.includes("RouteRecognizer") || mechanism.includes("_recognizer.")) {
    return "route-recognizer";
  }
  if (mechanism.includes("RouteConfigContext") || mechanism.includes("RouteContext") || mechanism.includes("_getRouteContext")) {
    return "route-context";
  }
  if (mechanism.includes("RouteTree") || mechanism.includes("RouteNode") || mechanism.includes("createAndAppendNodes")) {
    return "route-tree";
  }
  if (mechanism.includes("ViewportAgent") || mechanism.includes("ViewportInstruction") || mechanism.includes("_createComponentAgent")) {
    return "viewport-agent";
  }
  if (mechanism.includes("RouterConfiguration") || mechanism.includes("RouterOptions") || mechanism.includes("NavigationOptions")) {
    return "configuration";
  }
  if (mechanism.includes("router") || mechanism.includes("Router") || mechanism.includes("load") || mechanism.includes("generatePath")) {
    return "navigation";
  }
  return null;
}

function frameworkRouterSourceRowForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  kind: FrameworkRouterSurfaceKind,
  mechanism: string,
  ownerName: string | null,
  name: string | null,
): FrameworkRouterSurfaceRow | null {
  const source = requiredSourceRangeForNode(sourceProject, node);
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  return {
    id: ["framework-router", packageId, kind, source.filePath, source.start.line, source.start.character].join(":"),
    packageId,
    packageName,
    kind,
    mechanism,
    ownerName,
    name,
    filePath: file.repoPath,
    source,
    summary: `${packageName} router ${kind} via ${mechanism}${name == null ? "" : ` (${name})`}.`,
  };
}

function frameworkRouterPackageRow(row: MutableFrameworkRouterPackageRow): FrameworkRouterPackageRow {
  return {
    ...row,
    summary: `${row.packageName} exposes ${row.surfaceCount} router architecture surface(s) and ${row.flowCount} route flow row(s): ${row.entityCount} entities, ${row.routeContextCount} route-context rows, ${row.routeTreeCount} route-tree rows, ${row.routeRecognizerCount} route-recognizer rows, and ${row.viewportAgentCount} viewport-agent rows.`,
  };
}

function compareFrameworkRouterSurfaceRows(
  left: FrameworkRouterSurfaceRow,
  right: FrameworkRouterSurfaceRow,
): number {
  return left.packageId.localeCompare(right.packageId)
    || left.kind.localeCompare(right.kind)
    || left.filePath.localeCompare(right.filePath)
    || left.source.start.line - right.source.start.line
    || left.source.start.character - right.source.start.character;
}

function compareFlowRows(
  left: FrameworkRouterFlowRow,
  right: FrameworkRouterFlowRow,
): number {
  return left.sequence - right.sequence
    || left.packageId.localeCompare(right.packageId)
    || left.filePath.localeCompare(right.filePath)
    || left.source.start.line - right.source.start.line
    || left.source.start.character - right.source.start.character;
}

function compareRouteRecognizerMechanicRows(
  left: FrameworkRouteRecognizerMechanicRow,
  right: FrameworkRouteRecognizerMechanicRow,
): number {
  return left.packageId.localeCompare(right.packageId)
    || left.phase.localeCompare(right.phase)
    || left.product.localeCompare(right.product)
    || left.kind.localeCompare(right.kind)
    || left.filePath.localeCompare(right.filePath)
    || left.source.start.line - right.source.start.line
    || left.source.start.character - right.source.start.character;
}

function flowIssueRows(
  sourceState: FrameworkRouterSourceState,
  rows: readonly FrameworkRouterFlowRow[],
): readonly FrameworkRouterFlowIssueRow[] {
  const issues: FrameworkRouterFlowIssueRow[] = [];
  const rowsByDescriptor = new Map<string, FrameworkRouterFlowRow[]>();
  const rowsBySequence = new Map<number, FrameworkRouterFlowRow[]>();

  if (sourceState.status !== "matched") {
    issues.push({
      id: `framework-router-flow-issue:source-baseline-mismatch:${sourceState.status}`,
      kind: "source-baseline-mismatch",
      descriptorKey: null,
      sequence: null,
      actor: null,
      count: 1,
      summary: sourceState.summary,
    });
  }

  if (ROUTER_FLOW_DESCRIPTORS.size !== sourceState.baseline.flowDescriptorCount) {
    issues.push({
      id: "framework-router-flow-issue:descriptor-count-mismatch",
      kind: "descriptor-count-mismatch",
      descriptorKey: null,
      sequence: null,
      actor: null,
      count: ROUTER_FLOW_DESCRIPTORS.size,
      summary: `Router flow descriptor map has ${ROUTER_FLOW_DESCRIPTORS.size} entries, but the source baseline records ${sourceState.baseline.flowDescriptorCount}; update framework-router-source-map.ts when descriptor inventory changes intentionally.`,
    });
  }

  for (const row of rows) {
    rowsByDescriptor.set(row.descriptorKey, [...(rowsByDescriptor.get(row.descriptorKey) ?? []), row]);
    rowsBySequence.set(row.sequence, [...(rowsBySequence.get(row.sequence) ?? []), row]);
  }

  for (const [descriptorKey, descriptor] of ROUTER_FLOW_DESCRIPTORS) {
    const materializedRows = rowsByDescriptor.get(descriptorKey) ?? [];
    if (materializedRows.length === 0) {
      issues.push({
        id: `framework-router-flow-issue:unmaterialized-descriptor:${descriptorKey}`,
        kind: "unmaterialized-descriptor",
        descriptorKey,
        sequence: descriptor.sequence,
        actor: descriptor.actor,
        count: 0,
        summary: `Router flow descriptor ${descriptorKey} did not materialize from the admitted framework source.`,
      });
      continue;
    }
    if (materializedRows.length > 1) {
      issues.push({
        id: `framework-router-flow-issue:multi-materialized-descriptor:${descriptorKey}`,
        kind: "multi-materialized-descriptor",
        descriptorKey,
        sequence: descriptor.sequence,
        actor: descriptor.actor,
        count: materializedRows.length,
        summary: `Router flow descriptor ${descriptorKey} materialized ${materializedRows.length} time(s); the curated flow may need a more specific key.`,
      });
    }
  }

  for (const [sequence, sequenceRows] of rowsBySequence) {
    if (sequenceRows.length <= 1) {
      continue;
    }
    issues.push({
      id: `framework-router-flow-issue:duplicate-sequence:${sequence}`,
      kind: "duplicate-sequence",
      descriptorKey: null,
      sequence,
      actor: null,
      count: sequenceRows.length,
      summary: `Router flow sequence ${sequence} is shared by ${sequenceRows.length} materialized row(s): ${sequenceRows.map((row) => row.actor).join(", ")}.`,
    });
  }

  return issues.sort(compareFlowIssueRows);
}

function compareFlowIssueRows(
  left: FrameworkRouterFlowIssueRow,
  right: FrameworkRouterFlowIssueRow,
): number {
  return left.kind.localeCompare(right.kind)
    || (left.sequence ?? 0) - (right.sequence ?? 0)
    || (left.descriptorKey ?? "").localeCompare(right.descriptorKey ?? "");
}

function routeRecognizerMechanicIssueRows(
  sourceState: FrameworkRouterSourceState,
  rows: readonly FrameworkRouteRecognizerMechanicRow[],
): readonly FrameworkRouteRecognizerMechanicIssueRow[] {
  const issues: FrameworkRouteRecognizerMechanicIssueRow[] = [];
  const rowsByDescriptor = new Map<string, FrameworkRouteRecognizerMechanicRow[]>();

  if (sourceState.status !== "matched") {
    issues.push({
      id: `framework-route-recognizer-mechanic-issue:source-baseline-mismatch:${sourceState.status}`,
      kind: "source-baseline-mismatch",
      descriptorKey: "source-baseline",
      ownerName: null,
      name: "framework.router source baseline",
      count: 1,
      summary: sourceState.summary,
    });
  }

  if (ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS.size !== sourceState.baseline.routeRecognizerMechanicDescriptorCount) {
    issues.push({
      id: "framework-route-recognizer-mechanic-issue:descriptor-count-mismatch",
      kind: "descriptor-count-mismatch",
      descriptorKey: "route-recognizer-descriptor-count",
      ownerName: null,
      name: "route-recognizer descriptor inventory",
      count: ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS.size,
      summary: `Route-recognizer mechanic descriptor map has ${ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS.size} entries, but the source baseline records ${sourceState.baseline.routeRecognizerMechanicDescriptorCount}; update framework-router-source-map.ts when descriptor inventory changes intentionally.`,
    });
  }

  for (const row of rows) {
    rowsByDescriptor.set(row.descriptorKey, [...(rowsByDescriptor.get(row.descriptorKey) ?? []), row]);
  }

  for (const [descriptorKey, descriptor] of ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS) {
    const materializedRows = rowsByDescriptor.get(descriptorKey) ?? [];
    if (materializedRows.length === 0) {
      issues.push({
        id: `framework-route-recognizer-mechanic-issue:unmaterialized-descriptor:${descriptorKey}`,
        kind: "unmaterialized-descriptor",
        descriptorKey,
        ownerName: descriptor.ownerName,
        name: descriptor.name,
        count: 0,
        summary: `Route-recognizer mechanic descriptor ${descriptorKey} did not materialize from the admitted framework source.`,
      });
      continue;
    }
    if (materializedRows.length > 1) {
      issues.push({
        id: `framework-route-recognizer-mechanic-issue:multi-materialized-descriptor:${descriptorKey}`,
        kind: "multi-materialized-descriptor",
        descriptorKey,
        ownerName: descriptor.ownerName,
        name: descriptor.name,
        count: materializedRows.length,
        summary: `Route-recognizer mechanic descriptor ${descriptorKey} materialized ${materializedRows.length} time(s); the recognizer projection may need a more specific key.`,
      });
    }
  }

  return issues.sort(compareRouteRecognizerMechanicIssueRows);
}

function compareRouteRecognizerMechanicIssueRows(
  left: FrameworkRouteRecognizerMechanicIssueRow,
  right: FrameworkRouteRecognizerMechanicIssueRow,
): number {
  return left.kind.localeCompare(right.kind)
    || left.descriptorKey.localeCompare(right.descriptorKey);
}

function isRouterPackageId(packageId: string): boolean {
  return packageId === "router" || packageId === "route-recognizer";
}

function isDeclarationFile(fileName: string): boolean {
  return fileName.endsWith(".d.ts");
}

function isNamedDeclaration(node: ts.Node): node is ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.FunctionDeclaration {
  return ts.isClassDeclaration(node)
    || ts.isInterfaceDeclaration(node)
    || ts.isTypeAliasDeclaration(node)
    || ts.isFunctionDeclaration(node);
}

function isRouterNamedEntity(name: string): boolean {
  return name.startsWith("IViewport")
    || name.startsWith("IRoute")
    || name.startsWith("INavigation")
    || name.includes("Instruction")
    || name.includes("Transition")
    || name.includes("Hook");
}

function routeRecognizerMechanicKey(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  if (ts.isClassDeclaration(node) && node.name !== undefined) {
    return `class:${node.name.text}`;
  }
  if (ts.isInterfaceDeclaration(node) && node.name !== undefined) {
    return `interface:${node.name.text}`;
  }
  if (ts.isTypeAliasDeclaration(node) && node.name !== undefined) {
    return `type:${node.name.text}`;
  }
  if (ts.isEnumDeclaration(node) && node.name !== undefined) {
    return `enum:${node.name.text}`;
  }
  if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
    return `function:${node.name.text}`;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return `const:${node.name.text}`;
  }
  if (ts.isConstructorDeclaration(node)) {
    const owner = classOwnerName(node);
    return owner === null ? null : `${owner}.constructor`;
  }
  if (ts.isMethodDeclaration(node)) {
    const name = propertyNameText(node.name, sourceFile);
    const owner = memberOwnerName(node);
    return name === null || owner === null ? null : `${owner}.${name}`;
  }
  if (ts.isGetAccessorDeclaration(node)) {
    const name = propertyNameText(node.name, sourceFile);
    const owner = memberOwnerName(node);
    return name === null || owner === null ? null : `${owner}.get ${name}`;
  }
  if (ts.isSetAccessorDeclaration(node)) {
    const name = propertyNameText(node.name, sourceFile);
    const owner = memberOwnerName(node);
    return name === null || owner === null ? null : `${owner}.set ${name}`;
  }
  if (ts.isPropertyDeclaration(node)) {
    const name = propertyNameText(node.name, sourceFile);
    const owner = memberOwnerName(node);
    return name === null || owner === null ? null : `${owner}.${name}`;
  }
  return null;
}

function flowNodeKey(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  if (ts.isFunctionDeclaration(node) && node.name !== undefined && node.body !== undefined) {
    return `function:${node.name.text}`;
  }
  if (ts.isConstructorDeclaration(node) && node.body !== undefined) {
    const owner = classOwnerName(node);
    return owner === null ? null : `${owner}.constructor`;
  }
  if (ts.isMethodDeclaration(node) && node.body !== undefined) {
    const name = propertyNameText(node.name, sourceFile);
    const owner = memberOwnerName(node);
    return name === null || owner === null ? null : `${owner}.${name}`;
  }
  if (ts.isPropertyDeclaration(node) && node.initializer !== undefined) {
    const name = propertyNameText(node.name, sourceFile);
    const owner = memberOwnerName(node);
    if (name === null || owner === null) {
      return null;
    }
    return ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)
      ? `${owner}.${name}`
      : null;
  }
  return null;
}

function classOwnerName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isClassDeclaration(current) && current.name !== undefined) {
      return current.name.text;
    }
    current = current.parent;
  }
  return null;
}

function memberOwnerName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isClassDeclaration(current) && current.name !== undefined) {
      return current.name.text;
    }
    if (ts.isObjectLiteralExpression(current)) {
      const owner = objectLiteralOwnerName(current);
      if (owner !== null) {
        return owner;
      }
    }
    if (isFunctionBoundary(current)) {
      return null;
    }
    current = current.parent;
  }
  return null;
}

function isFunctionBoundary(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node);
}

function objectLiteralOwnerName(node: ts.ObjectLiteralExpression): string | null {
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isCallExpression(parent)) {
    return objectLiteralCallOwnerName(parent);
  }
  if (ts.isPropertyAssignment(parent)) {
    const propertyName = propertyNameText(parent.name, parent.getSourceFile());
    const outerOwner = parent.parent !== undefined && ts.isObjectLiteralExpression(parent.parent)
      ? objectLiteralOwnerName(parent.parent)
      : null;
    if (propertyName !== null && outerOwner !== null) {
      return `${outerOwner}.${propertyName}`;
    }
  }
  return null;
}

function objectLiteralCallOwnerName(call: ts.CallExpression): string | null {
  const parent = call.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent)) {
    const propertyName = propertyNameText(parent.name, parent.getSourceFile());
    const outerOwner = parent.parent !== undefined && ts.isObjectLiteralExpression(parent.parent)
      ? objectLiteralOwnerName(parent.parent)
      : null;
    if (propertyName !== null && outerOwner !== null) {
      return `${outerOwner}.${propertyName}`;
    }
  }
  return null;
}

function countFlowStages(
  rows: readonly FrameworkRouterFlowRow[],
): Readonly<Record<FrameworkRouterFlowStage, number>> {
  const counts: Record<FrameworkRouterFlowStage, number> = {
    "configuration-registration": 0,
    "url-parsing": 0,
    "route-config-authoring": 0,
    "route-config-resolution": 0,
    "route-config-context": 0,
    "recognizer-population": 0,
    "route-recognition": 0,
    "viewport-instruction": 0,
    "route-tree-compilation": 0,
    "component-context-creation": 0,
    "transition-lifecycle": 0,
    "router-resource": 0,
    "viewport-registration": 0,
    "component-lifecycle": 0,
    "navigation-model": 0,
  };
  for (const row of rows) {
    counts[row.stage] += 1;
  }
  return counts;
}
