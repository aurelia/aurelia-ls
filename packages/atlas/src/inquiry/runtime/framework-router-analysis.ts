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
  | "unmaterialized-descriptor"
  | "multi-materialized-descriptor"
  | "duplicate-sequence";

export type FrameworkRouteRecognizerMechanicIssueKind =
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
  const flowIssues = flowIssueRows(flows);
  const routeRecognizerMechanicIssues = routeRecognizerMechanicIssueRows(routeRecognizerMechanics);
  const packages = [...packageRows.values()].map(frameworkRouterPackageRow);
  return {
    version: FRAMEWORK_ROUTER_ANALYSIS_VERSION,
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
  if (name.includes("ViewportAgent") || name.includes("ViewportInstruction")) {
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
  rows: readonly FrameworkRouterFlowRow[],
): readonly FrameworkRouterFlowIssueRow[] {
  const issues: FrameworkRouterFlowIssueRow[] = [];
  const rowsByDescriptor = new Map<string, FrameworkRouterFlowRow[]>();
  const rowsBySequence = new Map<number, FrameworkRouterFlowRow[]>();

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
  rows: readonly FrameworkRouteRecognizerMechanicRow[],
): readonly FrameworkRouteRecognizerMechanicIssueRow[] {
  const issues: FrameworkRouteRecognizerMechanicIssueRow[] = [];
  const rowsByDescriptor = new Map<string, FrameworkRouteRecognizerMechanicRow[]>();

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

interface RouterFlowDescriptor {
  readonly sequence: number;
  readonly stage: FrameworkRouterFlowStage;
  readonly actor: string;
  readonly flowRelation: string;
  readonly target: string;
  readonly summary: string;
}

interface RouteRecognizerMechanicDescriptor {
  readonly kind: FrameworkRouteRecognizerMechanicKind;
  readonly phase: FrameworkRouteRecognizerMechanicPhase;
  readonly product: string;
  readonly ownerName: string | null;
  readonly name: string;
  readonly summary: string;
}

const ROUTE_RECOGNIZER_MECHANIC_DESCRIPTORS = new Map<string, RouteRecognizerMechanicDescriptor>(
  [
    recognizerMechanic("interface:IConfigurableRoute", "contract", "route-input", "configurable-route", null, "IConfigurableRoute", "IConfigurableRoute is the public route-recognizer input record: path, optional case sensitivity, and handler payload."),
    recognizerMechanic("class:ConfigurableRoute", "model", "route-input", "configurable-route", null, "ConfigurableRoute", "ConfigurableRoute stores the normalized route path, case-sensitivity flag, and handler used by endpoints."),
    recognizerMechanic("class:Parameter", "model", "path-grammar", "parameter", null, "Parameter", "Parameter stores route parameter name, optional/star flags, and optional constraint pattern."),
    recognizerMechanic("Parameter.satisfiesPattern", "operation", "path-grammar", "parameter", "Parameter", "satisfiesPattern", "Parameter.satisfiesPattern resets and tests the optional parameter constraint RegExp."),
    recognizerMechanic("const:RESIDUE", "constant", "path-grammar", "residue-parameter", null, "RESIDUE", "RESIDUE is the reserved catch-all parameter name used for residual endpoint routes."),
    recognizerMechanic("const:routeParameterPattern", "constant", "path-grammar", "route-parameter-pattern", null, "routeParameterPattern", "routeParameterPattern parses dynamic route parameters, inline constraints, and optional markers."),

    recognizerMechanic("class:Endpoint", "model", "endpoint-registration", "endpoint", null, "Endpoint", "Endpoint joins a ConfigurableRoute to parsed route parameters and an optional residual endpoint."),
    recognizerMechanic("Endpoint.get residualEndpoint", "operation", "endpoint-registration", "endpoint", "Endpoint", "get residualEndpoint", "Endpoint.residualEndpoint exposes the optional residual catch-all endpoint."),
    recognizerMechanic("Endpoint.set residualEndpoint", "operation", "endpoint-registration", "endpoint", "Endpoint", "set residualEndpoint", "Endpoint.residualEndpoint enforces one-time residual endpoint assignment."),
    recognizerMechanic("Endpoint.equalsOrResidual", "operation", "endpoint-registration", "endpoint", "Endpoint", "equalsOrResidual", "Endpoint.equalsOrResidual treats the primary endpoint and its residual endpoint as the same route family."),
    recognizerMechanic("class:RecognizedRoute", "model", "endpoint-materialization", "recognized-route", null, "RecognizedRoute", "RecognizedRoute decodes parameters, trims residual path suffixes, and stores the recognized path."),
    recognizerMechanic("RecognizedRoute._getFirstNonEmptyPath", "operation", "endpoint-materialization", "recognized-route", "RecognizedRoute", "_getFirstNonEmptyPath", "RecognizedRoute._getFirstNonEmptyPath provides parent-path material for relative recognition."),

    recognizerMechanic("class:RouteRecognizer", "model", "state-graph", "recognizer", null, "RouteRecognizer", "RouteRecognizer owns the state graph, recognition cache, and endpoint lookup."),
    recognizerMechanic("RouteRecognizer.rootState", "storage", "state-graph", "state", "RouteRecognizer", "rootState", "RouteRecognizer.rootState starts the separator-state graph for registered routes."),
    recognizerMechanic("RouteRecognizer.cache", "storage", "cache-and-lookup", "recognition-cache", "RouteRecognizer", "cache", "RouteRecognizer.cache memoizes absolute and relative recognition results by path."),
    recognizerMechanic("RouteRecognizer.endpointLookup", "storage", "cache-and-lookup", "endpoint-lookup", "RouteRecognizer", "endpointLookup", "RouteRecognizer.endpointLookup provides direct endpoint lookup for path generation."),
    recognizerMechanic("RouteRecognizer.add", "operation", "endpoint-registration", "endpoint", "RouteRecognizer", "add", "RouteRecognizer.add accepts one or many configurable routes, optionally creates residual endpoints, and clears the recognition cache."),
    recognizerMechanic("RouteRecognizer.$add", "algorithm", "endpoint-registration", "state-graph", "RouteRecognizer", "$add", "RouteRecognizer.$add normalizes a route path, parses parameter/star/static segments, appends states, assigns endpoints, and updates endpoint lookup."),
    recognizerMechanic("RouteRecognizer.recognize", "operation", "recognition-walk", "recognized-route", "RouteRecognizer", "recognize", "RouteRecognizer.recognize handles cache lookup, absolute paths, relative recognition, and parent-path combination."),
    recognizerMechanic("RouteRecognizer.$recognize", "algorithm", "recognition-walk", "candidate", "RouteRecognizer", "$recognize", "RouteRecognizer.$recognize normalizes the incoming path, advances candidate chains character by character, and asks for the winning solution."),
    recognizerMechanic("RouteRecognizer.getEndpoint", "operation", "cache-and-lookup", "endpoint-lookup", "RouteRecognizer", "getEndpoint", "RouteRecognizer.getEndpoint returns a registered endpoint by exact path."),

    recognizerMechanic("type:StaticState", "state", "state-graph", "state", null, "StaticState", "StaticState narrows State to static segment states."),
    recognizerMechanic("type:DynamicState", "state", "state-graph", "state", null, "DynamicState", "DynamicState narrows State to dynamic parameter states."),
    recognizerMechanic("type:StarState", "state", "state-graph", "state", null, "StarState", "StarState narrows State to star and residue states."),
    recognizerMechanic("type:SeparatorState", "state", "state-graph", "state", null, "SeparatorState", "SeparatorState represents slash separators as non-segment states."),
    recognizerMechanic("type:AnyState", "state", "state-graph", "state", null, "AnyState", "AnyState is the union of all recognizer state variants."),
    recognizerMechanic("type:SegmentToState", "state", "state-graph", "state", null, "SegmentToState", "SegmentToState maps a segment kind to the narrowed state type produced by append."),
    recognizerMechanic("class:State", "state", "state-graph", "state", null, "State", "State stores graph transitions, endpoint assignment, segment flags, length, and match behavior."),
    recognizerMechanic("State.nextStates", "storage", "state-graph", "state-transition", "State", "nextStates", "State.nextStates stores outgoing state transitions."),
    recognizerMechanic("State.endpoint", "storage", "endpoint-registration", "endpoint", "State", "endpoint", "State.endpoint stores the endpoint reached by this state."),
    recognizerMechanic("State.constructor", "operation", "state-graph", "state", "State", "constructor", "State.constructor derives separator, dynamic, optional, constrained, and length flags from the segment."),
    recognizerMechanic("State.append", "operation", "state-graph", "state-transition", "State", "append", "State.append creates or reuses an outgoing transition keyed by separator value or segment equality."),
    recognizerMechanic("State.setEndpoint", "operation", "endpoint-registration", "endpoint", "State", "setEndpoint", "State.setEndpoint assigns an endpoint and propagates it through optional parameter states."),
    recognizerMechanic("State.isMatch", "operation", "recognition-walk", "state", "State", "isMatch", "State.isMatch decides whether one path character can advance through this state."),
    recognizerMechanic("State.satisfiesConstraint", "operation", "recognition-walk", "parameter", "State", "satisfiesConstraint", "State.satisfiesConstraint delegates constrained dynamic parameter checks to the segment pattern."),

    recognizerMechanic("enum:SegmentKind", "constant", "path-grammar", "segment-kind", null, "SegmentKind", "SegmentKind orders residue, star, dynamic, and static segments for candidate precedence."),
    recognizerMechanic("type:AnySegment", "segment", "path-grammar", "segment", null, "AnySegment", "AnySegment is the union of static, dynamic, and star/residue segment models."),
    recognizerMechanic("class:StaticSegment", "segment", "path-grammar", "static-segment", null, "StaticSegment", "StaticSegment models literal path text and case sensitivity."),
    recognizerMechanic("StaticSegment.appendTo", "operation", "endpoint-registration", "state-graph", "StaticSegment", "appendTo", "StaticSegment.appendTo adds character-by-character static transitions, using upper/lower value sets for case-insensitive paths."),
    recognizerMechanic("StaticSegment.equals", "operation", "state-graph", "segment", "StaticSegment", "equals", "StaticSegment.equals reuses existing static states only when value and case-sensitivity match."),
    recognizerMechanic("class:DynamicSegment", "segment", "path-grammar", "dynamic-segment", null, "DynamicSegment", "DynamicSegment models named dynamic parameters, optionality, and optional constraint patterns."),
    recognizerMechanic("DynamicSegment.appendTo", "operation", "endpoint-registration", "state-graph", "DynamicSegment", "appendTo", "DynamicSegment.appendTo adds the dynamic parameter transition from a separator state."),
    recognizerMechanic("DynamicSegment.equals", "operation", "state-graph", "segment", "DynamicSegment", "equals", "DynamicSegment.equals reuses dynamic segment states by name and optionality."),
    recognizerMechanic("DynamicSegment.satisfiesPattern", "operation", "recognition-walk", "parameter", "DynamicSegment", "satisfiesPattern", "DynamicSegment.satisfiesPattern resets and tests a constrained dynamic segment."),
    recognizerMechanic("class:StarSegment", "segment", "path-grammar", "star-segment", null, "StarSegment", "StarSegment models catch-all and residual route parameters."),
    recognizerMechanic("StarSegment.appendTo", "operation", "endpoint-registration", "state-graph", "StarSegment", "appendTo", "StarSegment.appendTo adds the star/residue transition from a separator state."),
    recognizerMechanic("StarSegment.equals", "operation", "state-graph", "segment", "StarSegment", "equals", "StarSegment.equals reuses star/residue segment states by name."),

    recognizerMechanic("class:RecognizeResult", "model", "candidate-selection", "recognize-result", null, "RecognizeResult", "RecognizeResult owns the current candidate set for one recognition walk."),
    recognizerMechanic("RecognizeResult.get isEmpty", "operation", "candidate-selection", "recognize-result", "RecognizeResult", "get isEmpty", "RecognizeResult.isEmpty indicates that all candidate chains have died."),
    recognizerMechanic("RecognizeResult.constructor", "operation", "candidate-selection", "candidate", "RecognizeResult", "constructor", "RecognizeResult starts a recognition walk with a root candidate."),
    recognizerMechanic("RecognizeResult.getSolution", "algorithm", "candidate-selection", "candidate", "RecognizeResult", "getSolution", "RecognizeResult.getSolution filters endpoint candidates, finalizes constraints, sorts by precedence, and returns the winning candidate."),
    recognizerMechanic("RecognizeResult.add", "operation", "candidate-selection", "candidate", "RecognizeResult", "add", "RecognizeResult.add branches the active candidate set."),
    recognizerMechanic("RecognizeResult.remove", "operation", "candidate-selection", "candidate", "RecognizeResult", "remove", "RecognizeResult.remove drops a dead candidate."),
    recognizerMechanic("RecognizeResult.advance", "operation", "recognition-walk", "candidate", "RecognizeResult", "advance", "RecognizeResult.advance advances every candidate by one character."),
    recognizerMechanic("function:hasEndpoint", "operation", "candidate-selection", "candidate", null, "hasEndpoint", "hasEndpoint filters candidates whose head state has an endpoint."),
    recognizerMechanic("function:compareChains", "operation", "candidate-selection", "candidate", null, "compareChains", "compareChains orders candidates with Candidate.compareTo."),

    recognizerMechanic("class:Candidate", "model", "candidate-selection", "candidate", null, "Candidate", "Candidate stores the path characters, matched states, skipped optional states, and current endpoint during recognition."),
    recognizerMechanic("Candidate.constructor", "operation", "candidate-selection", "candidate", "Candidate", "constructor", "Candidate.constructor initializes the head state and current endpoint from the state chain."),
    recognizerMechanic("Candidate.advance", "algorithm", "recognition-walk", "candidate", "Candidate", "advance", "Candidate.advance consumes one character, follows matching transitions, branches when multiple states match, and removes itself if no match survives."),
    recognizerMechanic("Candidate._finalize", "algorithm", "candidate-selection", "candidate", "Candidate", "_finalize", "Candidate._finalize collects skipped optional endpoint states and validates constrained dynamic parameters."),
    recognizerMechanic("Candidate._getRoutes", "algorithm", "endpoint-materialization", "recognized-route", "Candidate", "_getRoutes", "Candidate._getRoutes walks matched states backward, satisfies endpoint requirements, and materializes recognized parent/child routes."),
    recognizerMechanic("Candidate.compareTo", "algorithm", "candidate-selection", "candidate", "Candidate", "compareTo", "Candidate.compareTo orders candidate chains segment-by-segment with static routes outranking dynamic/star routes."),

    recognizerMechanic("class:EndpointRequirement", "model", "endpoint-materialization", "endpoint-requirement", null, "EndpointRequirement", "EndpointRequirement tracks parameter and static segment fulfillment for one endpoint while walking a candidate backward."),
    recognizerMechanic("EndpointRequirement.constructor", "operation", "endpoint-materialization", "endpoint-requirement", "EndpointRequirement", "constructor", "EndpointRequirement.constructor initializes parameter and static-segment fulfillment from an endpoint."),
    recognizerMechanic("EndpointRequirement.consume", "algorithm", "endpoint-materialization", "endpoint-requirement", "EndpointRequirement", "consume", "EndpointRequirement.consume accumulates matched parameter/static characters and checks dynamic constraints at segment boundaries."),
    recognizerMechanic("EndpointRequirement.isFulfilled", "operation", "endpoint-materialization", "endpoint-requirement", "EndpointRequirement", "isFulfilled", "EndpointRequirement.isFulfilled verifies required parameters and static segment fulfillment."),
    recognizerMechanic("EndpointRequirement.toRecognizedRoute", "operation", "endpoint-materialization", "recognized-route", "EndpointRequirement", "toRecognizedRoute", "EndpointRequirement.toRecognizedRoute creates a RecognizedRoute from fulfilled endpoint parameters."),
    recognizerMechanic("EndpointRequirement.isDifferentRecognizedRoute", "operation", "endpoint-materialization", "endpoint-requirement", "EndpointRequirement", "isDifferentRecognizedRoute", "EndpointRequirement.isDifferentRecognizedRoute checks whether an existing recognized route belongs to a different endpoint."),
    recognizerMechanic("EndpointRequirement.isDifferentEndpoint", "operation", "endpoint-materialization", "endpoint-requirement", "EndpointRequirement", "isDifferentEndpoint", "EndpointRequirement.isDifferentEndpoint compares endpoint handler identity for route-chain materialization."),
  ],
);

const ROUTER_FLOW_DESCRIPTORS = new Map<string, RouterFlowDescriptor>(
  [
    flowDescriptor("function:configure", 10, "configuration-registration", "RouterConfiguration.configure", "registers", "router DI, AppTasks, components, and resources", "RouterConfiguration builds the router world by registering options, lifecycle AppTasks, router services, and router resources."),
    flowDescriptor("RouterConfiguration.register", 11, "configuration-registration", "RouterConfiguration.register", "delegates-to", "configure", "RouterConfiguration.register installs the default router configuration."),
    flowDescriptor("RouterConfiguration.customize", 12, "configuration-registration", "RouterConfiguration.customize", "captures-options-for", "configure", "RouterConfiguration.customize returns a registry that applies caller-provided router options."),
    flowDescriptor("function:route", 20, "route-config-authoring", "route decorator", "adds-initializer-for", "Route.configure", "The route decorator defers static route configuration to Route.configure through a class initializer."),
    flowDescriptor("Route.configure", 21, "route-config-authoring", "Route.configure", "stores-metadata", "RouteConfig", "Route.configure normalizes authored config and stores it as route metadata on the component type."),
    flowDescriptor("RouteConfig._create", 22, "route-config-authoring", "RouteConfig._create", "normalizes", "IRouteConfig | IChildRouteConfig | path", "RouteConfig._create normalizes strings, route objects, static properties, child routes, and navigation strategy inputs into RouteConfig."),
    flowDescriptor("RouteConfig._applyChildRouteConfig", 23, "route-config-authoring", "RouteConfig._applyChildRouteConfig", "overlays", "parent child-route config", "Child route config overlays clone the component route config without mutating the original route metadata."),
    flowDescriptor("RouteConfig._applyFromConfigurationHook", 24, "route-config-authoring", "RouteConfig._applyFromConfigurationHook", "applies", "IRouteViewModel.getRouteConfig", "Instance getRouteConfig hooks can override RouteConfig fields after route component creation."),
    flowDescriptor("Route.getConfig", 30, "route-config-resolution", "Route.getConfig", "reads-or-creates", "route metadata", "Route.getConfig reads route metadata and creates metadata from static properties when no decorator metadata exists."),
    flowDescriptor("function:resolveRouteConfiguration", 31, "route-config-resolution", "resolveRouteConfiguration", "resolves", "Routeable -> RouteConfig", "resolveRouteConfiguration converts routeable inputs, redirect configs, navigation strategies, child configs, and getRouteConfig hooks into RouteConfig."),
    flowDescriptor("function:resolveCustomElementDefinition", 32, "route-config-resolution", "resolveCustomElementDefinition", "resolves", "routeable component -> CustomElementDefinition", "resolveCustomElementDefinition resolves routeable component forms through dependencies, resource lookup, instances, and lazy modules."),
    flowDescriptor("RouteConfigContext.getOrCreate", 40, "route-config-context", "RouteConfigContext.getOrCreate", "caches-or-creates", "RouteConfigContext", "RouteConfigContext.getOrCreate resolves the active RouteConfig and reuses or creates the route-config context for that config."),
    flowDescriptor("RouteConfigContext.constructor", 41, "route-config-context", "RouteConfigContext", "initializes", "recognizer, path, navigation model", "RouteConfigContext initializes parent/root topology, route recognizer ownership, optional navigation model, and child-route processing."),
    flowDescriptor("RouteConfigContext._processConfig", 42, "route-config-context", "RouteConfigContext._processConfig", "processes", "RouteConfig.routes", "RouteConfigContext._processConfig resolves configured child routes, feeds the recognizer, and tracks lazy child-route completion."),
    flowDescriptor("RouteConfigContext._addRoute", 50, "recognizer-population", "RouteConfigContext._addRoute", "resolves-and-adds", "child route", "RouteConfigContext._addRoute resolves a routeable child and registers each resulting path."),
    flowDescriptor("RouteConfigContext._$addRoute", 51, "recognizer-population", "RouteConfigContext._$addRoute", "adds", "RouteRecognizer endpoint", "RouteConfigContext._$addRoute pushes configured paths into the current or inherited RouteRecognizer."),
    flowDescriptor("RouteConfigContext._eagerLoadChildRouteConfigContext", 52, "route-config-context", "RouteConfigContext._eagerLoadChildRouteConfigContext", "recursively-creates", "child RouteConfigContext", "Eager loading walks child RouteConfigs and pre-creates child route-config contexts, avoiding self-recursion."),
    flowDescriptor("RouteRecognizer.add", 53, "recognizer-population", "RouteRecognizer.add", "adds", "configurable routes", "RouteRecognizer.add registers one or more configurable routes, creates residual endpoints when requested, and clears recognition cache."),
    flowDescriptor("RouteRecognizer.$add", 54, "recognizer-population", "RouteRecognizer.$add", "normalizes-and-indexes", "route path segments", "RouteRecognizer.$add normalizes route paths, builds segment states, records route parameters, and stores endpoint lookup entries."),
    flowDescriptor("State.append", 55, "recognizer-population", "State.append", "adds-or-reuses", "recognizer state transition", "State.append creates or reuses the next recognizer state for a static, dynamic, star, residue, or separator segment."),
    flowDescriptor("State.setEndpoint", 56, "recognizer-population", "State.setEndpoint", "assigns", "Endpoint", "State.setEndpoint assigns the endpoint reached by a completed route pattern."),
    flowDescriptor("StaticSegment.appendTo", 57, "recognizer-population", "StaticSegment.appendTo", "appends", "static state", "StaticSegment.appendTo appends a case-sensitive or insensitive static segment to the recognizer state graph."),
    flowDescriptor("DynamicSegment.appendTo", 58, "recognizer-population", "DynamicSegment.appendTo", "appends", "dynamic parameter state", "DynamicSegment.appendTo appends route parameter states, including optional and constrained parameters."),
    flowDescriptor("StarSegment.appendTo", 59, "recognizer-population", "StarSegment.appendTo", "appends", "star or residue state", "StarSegment.appendTo appends catch-all or residual route parameter states."),
    flowDescriptor("RouteConfigContext._resolveLazy", 60, "route-config-resolution", "RouteConfigContext._resolveLazy", "loads", "lazy route module", "RouteConfigContext._resolveLazy maps lazy modules to default, named, or conventional HTML custom element definitions."),
    flowDescriptor("TypedNavigationInstruction.create", 62, "viewport-instruction", "TypedNavigationInstruction.create", "normalizes", "NavigationInstruction -> TypedNavigationInstruction", "TypedNavigationInstruction.create normalizes strings, viewport instructions, route view models, custom element definitions, promises, and navigation strategies."),
    flowDescriptor("TypedNavigationInstruction.equals", 63, "viewport-instruction", "TypedNavigationInstruction.equals", "compares", "typed navigation instruction", "TypedNavigationInstruction.equals compares typed navigation instruction variants by type and value."),
    flowDescriptor("TypedNavigationInstruction._clone", 64, "viewport-instruction", "TypedNavigationInstruction._clone", "clones", "TypedNavigationInstruction", "TypedNavigationInstruction._clone preserves typed navigation instruction type and value for route-tree rewriting."),
    flowDescriptor("TypedNavigationInstruction.toUrlComponent", 65, "viewport-instruction", "TypedNavigationInstruction.toUrlComponent", "serializes", "typed navigation instruction", "TypedNavigationInstruction.toUrlComponent serializes string instructions and leaves non-url component instructions empty."),
    flowDescriptor("RouteRecognizer.getEndpoint", 69, "viewport-instruction", "RouteRecognizer.getEndpoint", "looks-up", "Endpoint", "RouteRecognizer.getEndpoint provides direct endpoint lookup for eager path generation."),
    flowDescriptor("RouteConfigContext._generateViewportInstruction", 70, "viewport-instruction", "RouteConfigContext._generateViewportInstruction", "generates", "ViewportInstruction", "RouteConfigContext._generateViewportInstruction maps eager route ids/components plus params to recognized viewport instructions and query residue."),
    flowDescriptor("RouteConfigContext.recognize", 71, "route-recognition", "RouteConfigContext.recognize", "recognizes", "path", "RouteConfigContext.recognize asks the current recognizer and can climb ancestors when configured."),
    flowDescriptor("RouteRecognizer.recognize", 72, "route-recognition", "RouteRecognizer.recognize", "recognizes", "path with cache and relative context", "RouteRecognizer.recognize handles root and relative path recognition, cache lookup, and parent path combination."),
    flowDescriptor("RouteRecognizer.$recognize", 73, "route-recognition", "RouteRecognizer.$recognize", "walks", "state graph", "RouteRecognizer.$recognize normalizes a path, advances recognition state for each character, and returns the winning candidate routes."),
    flowDescriptor("RecognizeResult.advance", 74, "route-recognition", "RecognizeResult.advance", "advances", "candidate set", "RecognizeResult.advance advances all candidate recognizer chains by one character."),
    flowDescriptor("RecognizeResult.getSolution", 75, "route-recognition", "RecognizeResult.getSolution", "selects", "best candidate", "RecognizeResult.getSolution finalizes endpoint candidates and sorts them by route precedence."),
    flowDescriptor("Candidate.advance", 76, "route-recognition", "Candidate.advance", "branches", "matching recognizer states", "Candidate.advance consumes one character, branches when multiple states match, and removes dead candidates."),
    flowDescriptor("Candidate._finalize", 77, "route-recognition", "Candidate._finalize", "validates", "optional and constrained states", "Candidate._finalize gathers skipped optional endpoint states and validates dynamic segment constraints."),
    flowDescriptor("Candidate._getRoutes", 78, "route-recognition", "Candidate._getRoutes", "materializes", "recognized route chain", "Candidate._getRoutes walks matched states backward to materialize recognized parent and child routes."),
    flowDescriptor("EndpointRequirement.consume", 79, "route-recognition", "EndpointRequirement.consume", "collects", "matched params and static segments", "EndpointRequirement.consume collects parameter values and static segment fulfillment for one endpoint."),
    flowDescriptor("EndpointRequirement.toRecognizedRoute", 80, "route-recognition", "EndpointRequirement.toRecognizedRoute", "creates", "RecognizedRoute", "EndpointRequirement.toRecognizedRoute converts fulfilled endpoint requirements into a RecognizedRoute."),
    flowDescriptor("Router.constructor", 85, "transition-lifecycle", "Router", "initializes", "empty ViewportInstructionTree", "Router starts with an empty viewport-instruction tree and registers its concrete instance into the container."),
    flowDescriptor("Router.load", 86, "transition-lifecycle", "Router.load", "creates-and-enqueues", "ViewportInstructionTree", "Router.load turns navigation instructions into a viewport-instruction tree and enqueues a transition."),
    flowDescriptor("Router.generatePath", 87, "viewport-instruction", "Router.generatePath", "generates-url-from", "eager viewport instructions", "Router.generatePath creates eager viewport instructions and serializes them back to a URL."),
    flowDescriptor("Router.createViewportInstructions", 88, "viewport-instruction", "Router.createViewportInstructions", "delegates-to", "IRouteContext.createViewportInstructions", "Router.createViewportInstructions resolves navigation context before delegating instruction creation to RouteContext."),
    flowDescriptor("RouteContext.createViewportInstructions", 89, "viewport-instruction", "RouteContext.createViewportInstructions", "creates", "ViewportInstructionTree", "RouteContext.createViewportInstructions creates viewport instruction trees relative to the active route context."),
    flowDescriptor("Router._enqueue", 90, "transition-lifecycle", "Router._enqueue", "schedules", "Transition", "Router._enqueue schedules transitions, handles promise reuse, and prepares the mutable route tree for navigation."),
    flowDescriptor("Router._run", 91, "transition-lifecycle", "Router._run", "runs", "route tree and viewport lifecycle", "Router._run updates the route tree, runs guard/load/swap lifecycle batches, finalizes instructions, history, and events."),
    flowDescriptor("ContextRouter.load", 92, "transition-lifecycle", "ContextRouter.load", "delegates-to", "Router.load", "ContextRouter.load forwards navigation instructions to the root router with its route context as the relative navigation context."),
    flowDescriptor("ContextRouter.generatePath", 93, "viewport-instruction", "ContextRouter.generatePath", "delegates-to", "Router.generatePath", "ContextRouter.generatePath forwards path generation to the root router with its route context."),
    flowDescriptor("ContextRouter.createViewportInstructions", 94, "viewport-instruction", "ContextRouter.createViewportInstructions", "delegates-to", "Router.createViewportInstructions", "ContextRouter.createViewportInstructions forwards viewport-instruction creation with its route context."),
    flowDescriptor("ContextRouter.isActive", 95, "navigation-model", "ContextRouter.isActive", "checks", "active route tree", "ContextRouter.isActive asks the root router whether instructions are active relative to its route context."),
    flowDescriptor("ContextRouter._copyWith", 96, "component-context-creation", "ContextRouter._copyWith", "creates", "ContextRouter", "ContextRouter._copyWith creates a context-local router facade for another route context."),
    flowDescriptor("function:updateNode", 100, "route-tree-compilation", "updateNode", "updates", "RouteTree node", "updateNode compiles viewport instructions into route nodes and drills into nested route contexts."),
    flowDescriptor("function:createAndAppendNodes", 101, "route-tree-compilation", "createAndAppendNodes", "compiles", "ViewportInstruction -> RouteNode", "createAndAppendNodes recognizes paths, handles route ids, residue, fallback, and appends configured nodes."),
    flowDescriptor("function:createConfiguredNode", 102, "component-context-creation", "createConfiguredNode", "creates", "child RouteContext and RouteNode", "createConfiguredNode resolves the component, viewport agent, child route context, and RouteNode for a recognized route."),
    flowDescriptor("function:createFallbackNode", 103, "route-recognition", "createFallbackNode", "handles", "unknown route fallback", "createFallbackNode resolves viewport or route fallback before creating a configured node or throwing an unknown route error."),
    flowDescriptor("function:appendNode", 104, "route-tree-compilation", "appendNode", "appends-and-schedules", "RouteNode update", "appendNode attaches the child RouteNode and schedules the viewport agent update."),
    flowDescriptor("RouteNode.create", 105, "route-tree-compilation", "RouteNode.create", "materializes", "RouteNode", "RouteNode.create freezes recognized params/query/data and records unresolved residue for later nested routing."),
    flowDescriptor("RouteNode._finalizeInstruction", 106, "route-tree-compilation", "RouteNode._finalizeInstruction", "finalizes", "ViewportInstruction", "RouteNode._finalizeInstruction recursively converts the current route tree back into finalized viewport instructions."),
    flowDescriptor("RouteTree._finalizeInstructions", 107, "route-tree-compilation", "RouteTree._finalizeInstructions", "finalizes", "ViewportInstructionTree", "RouteTree._finalizeInstructions returns the canonical post-navigation instruction tree."),
    flowDescriptor("Router._getRouteContext", 110, "component-context-creation", "Router._getRouteContext", "gets-or-creates", "RouteContext", "Router._getRouteContext joins viewport agent, component definition, container, parent config, and RouteConfigContext into a runtime RouteContext."),
    flowDescriptor("RouteContext.setRoot", 111, "component-context-creation", "RouteContext.setRoot", "creates", "root RouteContext", "RouteContext.setRoot creates the application root route context during the router hydrated AppTask."),
    flowDescriptor("RouteContext._createComponentAgent", 112, "component-context-creation", "RouteContext._createComponentAgent", "creates", "ComponentAgent", "RouteContext._createComponentAgent creates the child container and component agent for a routed component."),
    flowDescriptor("RouteContext.resolve", 113, "route-config-context", "RouteContext.resolve", "resolves", "context-like value", "RouteContext.resolve maps null, RouteContext, node, view model, or controller inputs to the nearest route context."),
    flowDescriptor("RouteContext._registerViewport", 120, "viewport-registration", "RouteContext._registerViewport", "registers", "ViewportAgent", "RouteContext._registerViewport creates and tracks a ViewportAgent for an au-viewport in this context."),
    flowDescriptor("RouteContext._unregisterViewport", 121, "viewport-registration", "RouteContext._unregisterViewport", "unregisters", "ViewportAgent", "RouteContext._unregisterViewport removes the ViewportAgent owned by a disposing au-viewport."),
    flowDescriptor("ViewportCustomElement.hydrated", 122, "viewport-registration", "au-viewport.hydrated", "registers", "viewport with route context", "ViewportCustomElement.hydrated registers au-viewport with the injected route context."),
    flowDescriptor("ViewportCustomElement.attaching", 123, "viewport-registration", "au-viewport.attaching", "activates", "ViewportAgent", "ViewportCustomElement.attaching activates the viewport agent from its host controller."),
    flowDescriptor("ViewportCustomElement.dispose", 124, "viewport-registration", "au-viewport.dispose", "unregisters", "ViewportAgent", "ViewportCustomElement.dispose unregisters and disposes the viewport agent."),
    flowDescriptor("LoadCustomAttribute.valueChanged", 130, "router-resource", "load.valueChanged", "creates", "link ViewportInstructionTree", "LoadCustomAttribute.valueChanged resolves route, params, and context into instructions and href state."),
    flowDescriptor("LoadCustomAttribute.binding", 131, "router-resource", "load.binding", "subscribes", "navigation-end active state", "LoadCustomAttribute.binding wires click handling and active-class updates."),
    flowDescriptor("LoadCustomAttribute.attaching", 132, "router-resource", "load.attaching", "waits-for", "route config resolution", "LoadCustomAttribute.attaching refreshes href state after route config promises settle."),
    flowDescriptor("LoadCustomAttribute.onClick", 133, "router-resource", "load.onClick", "loads", "precomputed viewport instructions", "LoadCustomAttribute click handling prevents ordinary internal links and calls the context router."),
    flowDescriptor("HrefCustomAttribute.valueChanged", 140, "router-resource", "href.valueChanged", "creates", "href and ViewportInstructionTree", "HrefCustomAttribute.valueChanged treats external URLs separately and creates internal router instructions for href."),
    flowDescriptor("HrefCustomAttribute._onClick", 141, "router-resource", "href._onClick", "loads", "internal href instructions", "HrefCustomAttribute click handling delegates internal anchor clicks to the context router."),
    flowDescriptor("ComponentAgent._canLoad", 150, "component-lifecycle", "ComponentAgent._canLoad", "runs", "canLoad hooks", "ComponentAgent._canLoad runs component and lifecycle-hook canLoad guards for routed components."),
    flowDescriptor("ComponentAgent._loading", 151, "component-lifecycle", "ComponentAgent._loading", "runs", "loading hooks", "ComponentAgent._loading applies getRouteConfig and runs loading hooks before activation."),
    flowDescriptor("ComponentAgent._loaded", 152, "component-lifecycle", "ComponentAgent._loaded", "runs", "loaded hooks", "ComponentAgent._loaded runs loaded hooks after routed component loading."),
    flowDescriptor("NavigationModel._addRoute", 160, "navigation-model", "NavigationModel._addRoute", "adds", "NavigationRoute", "NavigationModel._addRoute maintains route rows, including async placeholders, for navigation-model consumers."),
    flowDescriptor("NavigationRoute._setIsActive", 161, "navigation-model", "NavigationRoute._setIsActive", "checks", "active route tree", "NavigationRoute._setIsActive computes active state by comparing generated instruction trees to the current router route tree."),
  ],
);

function flowDescriptor(
  key: string,
  sequence: number,
  stage: FrameworkRouterFlowStage,
  actor: string,
  flowRelation: string,
  target: string,
  summary: string,
): readonly [string, RouterFlowDescriptor] {
  return [key, { sequence, stage, actor, flowRelation, target, summary }];
}

function recognizerMechanic(
  key: string,
  kind: FrameworkRouteRecognizerMechanicKind,
  phase: FrameworkRouteRecognizerMechanicPhase,
  product: string,
  ownerName: string | null,
  name: string,
  summary: string,
): readonly [string, RouteRecognizerMechanicDescriptor] {
  return [key, { kind, phase, product, ownerName, name, summary }];
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
