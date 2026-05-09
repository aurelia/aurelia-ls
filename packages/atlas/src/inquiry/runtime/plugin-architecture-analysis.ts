import ts from "typescript";

import { countBy, countByWhere } from "../../collections.js";
import {
  AURELIA_PLUGIN_PACKAGE_ID_PREFIX,
  assignmentTargetReceiverName,
  declarationInitializer,
  firstArgumentText,
  ownerNameForNode,
  requiredSourceFileIdentity,
  requiredSourceRangeForNode,
  SourceProjectMemo,
  type SourceProject,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import {
  aureliaBindableDecoratorMechanism,
  aureliaResourceDefinitionBindablesMechanism,
  aureliaStaticBindablesPropertyMechanism,
} from "./aurelia-bindable-carriers.js";
import {
  AureliaSourceImports,
  aureliaAppTaskMechanismForCall,
  aureliaDecoratorExportNameForExpression,
  aureliaRegistrationFactoryMechanismForCall,
  isContainerLookupMethodName,
  isInsideImportDeclaration,
  isInsideCommonJsRequireDeclaration,
  isAureliaKernelReference,
  isRouterInstanceMethodName,
  isRouterReceiverInitializer,
  isRouterReceiverTypeNode,
  isRouterReceiverValueExpression,
  readAureliaSourceImportsInto,
} from "./aurelia-source-imports.js";
import {
  aureliaConventionResourceForClass,
  aureliaResourceNameFromDecorator,
} from "./aurelia-resource-conventions.js";
import { readAureliaTemplateReference } from "./aurelia-template-references.js";

/** Version marker for the public Aurelia plugin source-shape analysis. */
export const PLUGIN_ARCHITECTURE_ANALYSIS_VERSION =
  "plugin-architecture-analysis.v1";

const pluginArchitectureMemo =
  new SourceProjectMemo<PluginArchitectureAnalysis>();

/** Broad source-surface families that pressure semantic-runtime app analysis. */
export type PluginSurfaceKind =
  | "resource"
  | "bindable"
  | "watch"
  | "registry"
  | "container-registration"
  | "di-registration"
  | "app-task"
  | "resolve-call"
  | "router-integration"
  | "template-reference";

/** Rollup counts for the plugin architecture lens. */
export interface PluginArchitectureRollup {
  readonly packageCount: number;
  readonly sourceFileCount: number;
  readonly surfaceCount: number;
  readonly resourceCount: number;
  readonly registryCount: number;
  readonly diRegistrationCount: number;
  readonly appTaskCount: number;
  readonly resolveCallCount: number;
  readonly routerIntegrationCount: number;
  readonly templateReferenceCount: number;
  readonly surfaceKinds: Readonly<Record<string, number>>;
  readonly surfaceMechanisms: Readonly<Record<string, number>>;
  readonly bindableMechanisms: Readonly<Record<string, number>>;
  readonly resourceMechanisms: Readonly<Record<string, number>>;
  readonly routerMechanisms: Readonly<Record<string, number>>;
  readonly templateReferenceMechanisms: Readonly<Record<string, number>>;
}

/** One admitted public plugin package row. */
export interface PluginPackageRow {
  readonly id: string;
  readonly packageName: string;
  readonly rootPath: string;
  readonly sourceFileCount: number;
  readonly surfaceCount: number;
  readonly resourceCount: number;
  readonly bindableCount: number;
  readonly watchCount: number;
  readonly registryCount: number;
  readonly containerRegistrationCount: number;
  readonly diRegistrationCount: number;
  readonly appTaskCount: number;
  readonly resolveCallCount: number;
  readonly routerIntegrationCount: number;
  readonly templateReferenceCount: number;
  readonly summary: string;
}

/** One source-backed public plugin surface row. */
export interface PluginSurfaceRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly kind: PluginSurfaceKind;
  readonly mechanism: string;
  readonly name: string | null;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Analysis product for public Aurelia plugin source packages. */
export interface PluginArchitectureAnalysis {
  readonly version: typeof PLUGIN_ARCHITECTURE_ANALYSIS_VERSION;
  readonly rollup: PluginArchitectureRollup;
  readonly packages: readonly PluginPackageRow[];
  readonly surfaces: readonly PluginSurfaceRow[];
}

/** Read public Aurelia plugin package source surfaces from the hot SourceProject. */
export function readPluginArchitectureAnalysis(
  sourceProject: SourceProject,
): PluginArchitectureAnalysis {
  return pluginArchitectureMemo.read(sourceProject, () =>
    buildPluginArchitectureAnalysis(sourceProject),
  );
}

function buildPluginArchitectureAnalysis(
  sourceProject: SourceProject,
): PluginArchitectureAnalysis {
  const pluginPackages = sourceProject
    .snapshot()
    .summary.packages.filter((sourcePackage) =>
      sourcePackage.id.startsWith(AURELIA_PLUGIN_PACKAGE_ID_PREFIX),
    );
  const packageRows = new Map<string, MutablePluginPackageRow>();
  for (const sourcePackage of pluginPackages) {
    packageRows.set(sourcePackage.id, {
      id: sourcePackage.id,
      packageName: sourcePackage.packageName,
      rootPath: sourcePackage.rootPath,
      sourceFileCount: sourcePackage.sourceFileCount,
      surfaceCount: 0,
      resourceCount: 0,
      bindableCount: 0,
      watchCount: 0,
      registryCount: 0,
      containerRegistrationCount: 0,
      diRegistrationCount: 0,
      appTaskCount: 0,
      resolveCallCount: 0,
      routerIntegrationCount: 0,
      templateReferenceCount: 0,
    });
  }

  const surfaces: PluginSurfaceRow[] = [];
  for (const sourceFile of sourceProject.ownedSourceFiles()) {
    const sourcePackage = sourceProject.packageForFileName(sourceFile.fileName);
    if (
      sourcePackage === null ||
      !sourcePackage.id.startsWith(AURELIA_PLUGIN_PACKAGE_ID_PREFIX)
    ) {
      continue;
    }
    scanPluginSourceFile(
      sourceProject,
      sourceFile,
      sourcePackage.id,
      sourcePackage.packageName,
      surfaces,
    );
  }

  for (const row of surfaces) {
    const packageRow = packageRows.get(row.packageId);
    if (packageRow === undefined) {
      continue;
    }
    packageRow.surfaceCount += 1;
    switch (row.kind) {
      case "resource":
        packageRow.resourceCount += 1;
        break;
      case "bindable":
        packageRow.bindableCount += 1;
        break;
      case "watch":
        packageRow.watchCount += 1;
        break;
      case "registry":
        packageRow.registryCount += 1;
        break;
      case "container-registration":
        packageRow.containerRegistrationCount += 1;
        break;
      case "di-registration":
        packageRow.diRegistrationCount += 1;
        break;
      case "app-task":
        packageRow.appTaskCount += 1;
        break;
      case "resolve-call":
        packageRow.resolveCallCount += 1;
        break;
      case "router-integration":
        packageRow.routerIntegrationCount += 1;
        break;
      case "template-reference":
        packageRow.templateReferenceCount += 1;
        break;
    }
  }

  const packages = [...packageRows.values()].map(pluginPackageRow);
  const sortedSurfaces = surfaces.sort(comparePluginSurfaceRows);
  const rollup = pluginRollupForRows(packages, sortedSurfaces);

  return {
    version: PLUGIN_ARCHITECTURE_ANALYSIS_VERSION,
    rollup,
    packages,
    surfaces: sortedSurfaces,
  };
}

/** Build a filter-aware public-plugin source-shape rollup. */
export function pluginRollupForRows(
  packages: readonly PluginPackageRow[],
  surfaces: readonly PluginSurfaceRow[],
): PluginArchitectureRollup {
  return {
    packageCount: packages.length,
    sourceFileCount: packages.reduce((sum, row) => sum + row.sourceFileCount, 0),
    surfaceCount: surfaces.length,
    resourceCount: countSurfaceKind(surfaces, "resource"),
    registryCount: countSurfaceKind(surfaces, "registry"),
    diRegistrationCount: countSurfaceKind(surfaces, "di-registration"),
    appTaskCount: countSurfaceKind(surfaces, "app-task"),
    resolveCallCount: countSurfaceKind(surfaces, "resolve-call"),
    routerIntegrationCount: countSurfaceKind(surfaces, "router-integration"),
    templateReferenceCount: countSurfaceKind(surfaces, "template-reference"),
    surfaceKinds: countBy(surfaces, (row) => row.kind),
    surfaceMechanisms: countBy(surfaces, (row) => row.mechanism),
    bindableMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "bindable",
      (row) => row.mechanism,
    ),
    resourceMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "resource",
      (row) => row.mechanism,
    ),
    routerMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "router-integration",
      (row) => row.mechanism,
    ),
    templateReferenceMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "template-reference",
      (row) => row.mechanism,
    ),
  };
}

interface MutablePluginPackageRow {
  readonly id: string;
  readonly packageName: string;
  readonly rootPath: string;
  readonly sourceFileCount: number;
  surfaceCount: number;
  resourceCount: number;
  bindableCount: number;
  watchCount: number;
  registryCount: number;
  containerRegistrationCount: number;
  diRegistrationCount: number;
  appTaskCount: number;
  resolveCallCount: number;
  routerIntegrationCount: number;
  templateReferenceCount: number;
}

class PluginSourceBindings extends AureliaSourceImports {
  readonly containerReceiverNames = new Set<string>();
}

function readPluginSourceBindings(sourceFile: ts.SourceFile): PluginSourceBindings {
  const bindings = new PluginSourceBindings();
  readAureliaSourceImportsInto(sourceFile, bindings);
  collectPluginReceiverBindings(sourceFile, bindings);
  return bindings;
}

type PluginReceiverDeclaration =
  | ts.VariableDeclaration
  | ts.ParameterDeclaration
  | ts.PropertyDeclaration;

function collectPluginReceiverBindings(
  sourceFile: ts.SourceFile,
  bindings: PluginSourceBindings,
): void {
  const visit = (node: ts.Node): void => {
    if (isPluginReceiverDeclaration(node) && ts.isIdentifier(node.name)) {
      if (declarationHasContainerReceiverShape(node, bindings)) {
        bindings.containerReceiverNames.add(node.name.text);
      }
      if (pluginDeclarationHasRouterReceiverShape(node, bindings)) {
        bindings.routerReceiverNames.add(node.name.text);
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const targetName = assignmentTargetReceiverName(node.left);
      if (targetName !== null) {
        if (isContainerReceiverValueExpression(node.right, bindings)) {
          bindings.containerReceiverNames.add(targetName);
        }
        if (isRouterReceiverValueExpression(node.right, bindings)) {
          bindings.routerReceiverNames.add(targetName);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function isPluginReceiverDeclaration(node: ts.Node): node is PluginReceiverDeclaration {
  return ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isPropertyDeclaration(node);
}

function pluginPackageRow(row: MutablePluginPackageRow): PluginPackageRow {
  return {
    ...row,
    summary: `${row.packageName}: ${row.resourceCount} resource(s), ${row.registryCount} registry method(s), ${row.diRegistrationCount} DI registration(s), ${row.appTaskCount} AppTask(s), ${row.routerIntegrationCount} router integration row(s).`,
  };
}

function scanPluginSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  surfaces: PluginSurfaceRow[],
): void {
  const bindings = readPluginSourceBindings(sourceFile);
  const visit = (node: ts.Node): void => {
    for (const surface of pluginSurfacesForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
      bindings,
    )) {
      surfaces.push(surface);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function pluginSurfacesForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  bindings: PluginSourceBindings,
): readonly PluginSurfaceRow[] {
  const rows: PluginSurfaceRow[] = [];
  if (ts.canHaveDecorators(node)) {
    for (const decorator of ts.getDecorators(node) ?? []) {
      const row = pluginSurfaceRowForDecorator(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        decorator,
        node,
        bindings,
      );
      if (row !== null) {
        rows.push(row);
      }
    }
  }

  if (ts.isClassDeclaration(node) && node.name !== undefined) {
    const convention = pluginConventionResourceRowForClass(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
      bindings,
    );
    if (convention !== null) {
      rows.push(convention);
    }
  }

  if (ts.isPropertyDeclaration(node)) {
    const mechanism = aureliaStaticBindablesPropertyMechanism(node);
    if (mechanism !== null) {
      const row = rowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        node.name,
        "bindable",
        mechanism,
        ownerNameForNode(node),
      );
      if (row !== null) {
        rows.push(row);
      }
    }
  }

  if (ts.isPropertyAssignment(node)) {
    const mechanism = aureliaResourceDefinitionBindablesMechanism(node, bindings);
    if (mechanism !== null) {
      const row = rowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        node.name,
        "bindable",
        mechanism,
        ownerNameForNode(node),
      );
      if (row !== null) {
        rows.push(row);
      }
    }
  }

  if (ts.isMethodDeclaration(node) && node.name.getText(sourceFile) === "register" && registerMethodHasContainerParameter(node, bindings)) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
      "registry",
      "register-method",
      ownerNameForNode(node),
    );
    if (row !== null) {
      rows.push(row);
    }
  }

  if (ts.isCallExpression(node)) {
    const callRows = pluginSurfaceRowsForCallExpression(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
      bindings,
    );
    rows.push(...callRows);
  }

  if (
    ts.isIdentifier(node) &&
    bindings.routerImportedNames.has(node.text) &&
    !isInsideImportDeclaration(node) &&
    !isInsideCommonJsRequireDeclaration(node)
  ) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
      "router-integration",
      node.text,
      ownerNameForNode(node),
    );
    if (row !== null) {
      rows.push(row);
    }
  }

  const templateReference = readAureliaTemplateReference(node);
  if (templateReference !== null) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
      "template-reference",
      templateReference.mechanism,
      templateReference.name,
    );
    if (row !== null) {
      rows.push(row);
    }
  }

  return rows;
}

function pluginConventionResourceRowForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.ClassDeclaration,
  bindings: PluginSourceBindings,
): PluginSurfaceRow | null {
  const convention = aureliaConventionResourceForClass(sourceFile, node, bindings);
  if (convention === null) {
    return null;
  }
  return rowForNode(
    sourceProject,
    sourceFile,
    packageId,
    packageName,
    node,
    "resource",
    convention.mechanism,
    convention.name,
  );
}

function pluginSurfaceRowForDecorator(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  decorator: ts.Decorator,
  decoratedNode: ts.Node,
  bindings: PluginSourceBindings,
): PluginSurfaceRow | null {
  const expression = decorator.expression;
  const call =
    ts.isCallExpression(expression) ? expression : undefined;
  const decoratorName = aureliaDecoratorExportNameForExpression(
    call?.expression ?? expression,
    bindings,
  );
  switch (decoratorName) {
    case "customElement":
      return rowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        decorator,
        "resource",
        "customElement",
        aureliaResourceNameFromDecorator(call, decoratedNode, sourceFile),
      );
    case "customAttribute":
    case "valueConverter":
    case "bindingBehavior":
      return rowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        decorator,
        "resource",
        decoratorName,
        aureliaResourceNameFromDecorator(call, decoratedNode, sourceFile),
      );
    case "bindable":
      return rowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        decorator,
        "bindable",
        aureliaBindableDecoratorMechanism(sourceProject, call, decoratedNode),
        ownerNameForNode(decoratedNode),
      );
    case "watch":
      return rowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        decorator,
        "watch",
        "watch",
        ownerNameForNode(decoratedNode),
      );
    default:
      return null;
  }
}

function pluginSurfaceRowsForCallExpression(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
  bindings: PluginSourceBindings,
): readonly PluginSurfaceRow[] {
  const rows: PluginSurfaceRow[] = [];
  const diResolutionMechanism = pluginDiResolutionMechanismForCall(call, bindings);
  if (diResolutionMechanism !== null) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      call,
      "resolve-call",
      diResolutionMechanism,
      firstArgumentText(call, sourceFile),
    );
    if (row !== null) {
      rows.push(row);
    }
  }
  if (isContainerRegisterCall(call, bindings)) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      call,
      "container-registration",
      "container.register",
      ownerNameForNode(call),
    );
    if (row !== null) {
      rows.push(row);
    }
  }
  const registrationFactoryMechanism = aureliaRegistrationFactoryMechanismForCall(call, bindings);
  if (registrationFactoryMechanism !== null) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      call,
      "di-registration",
      registrationFactoryMechanism,
      firstArgumentText(call, sourceFile),
    );
    if (row !== null) {
      rows.push(row);
    }
  }
  const appTaskMechanism = aureliaAppTaskMechanismForCall(call, bindings);
  if (appTaskMechanism !== null) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      call,
      "app-task",
      appTaskMechanism,
      firstArgumentText(call, sourceFile),
    );
    if (row !== null) {
      rows.push(row);
    }
  }
  const routerMechanism = pluginRouterMechanismForCall(call, sourceFile, bindings);
  if (routerMechanism !== null) {
    const row = rowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      call,
      "router-integration",
      routerMechanism,
      firstArgumentText(call, sourceFile),
    );
    if (row !== null) {
      rows.push(row);
    }
  }
  return rows;
}

function rowForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  kind: PluginSurfaceKind,
  mechanism: string,
  name: string | null,
): PluginSurfaceRow | null {
  const source = requiredSourceRangeForNode(sourceProject, node);
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const id = [
    "plugin-surface",
    packageId,
    kind,
    source.filePath,
    source.start.line,
    source.start.character,
  ].join(":");
  return {
    id,
    packageId,
    packageName,
    kind,
    mechanism,
    name,
    filePath: file.repoPath,
    source,
    summary: `${packageName} ${kind} via ${mechanism}${name === null ? "" : ` (${name})`}.`,
  };
}

function registerMethodHasContainerParameter(
  node: ts.MethodDeclaration,
  bindings: PluginSourceBindings,
): boolean {
  return node.parameters.some((parameter) =>
    isContainerReceiverTypeNode(parameter.type, bindings),
  );
}

function declarationHasContainerReceiverShape(
  node: PluginReceiverDeclaration,
  bindings: PluginSourceBindings,
): boolean {
  return (
    isContainerReceiverTypeNode(node.type, bindings) ||
    isContainerReceiverInitializer(declarationInitializer(node), bindings)
  );
}

function pluginDeclarationHasRouterReceiverShape(
  node: PluginReceiverDeclaration,
  bindings: PluginSourceBindings,
): boolean {
  return (
    isRouterReceiverTypeNode(node.type, bindings) ||
    isRouterReceiverInitializer(declarationInitializer(node), bindings)
  );
}

function isContainerReceiverTypeNode(
  type: ts.TypeNode | undefined,
  bindings: PluginSourceBindings,
): boolean {
  return type !== undefined &&
    ts.isTypeReferenceNode(type) &&
    isContainerReference(type.typeName, bindings);
}

function isContainerReceiverInitializer(
  expression: ts.Expression | undefined,
  bindings: PluginSourceBindings,
): boolean {
  if (expression === undefined) {
    return false;
  }
  if (
    ts.isCallExpression(expression) &&
    isAureliaKernelReference(expression.expression, "resolve", bindings)
  ) {
    const first = expression.arguments[0];
    return first !== undefined && isContainerReference(first, bindings);
  }
  return isContainerReceiverValueExpression(expression, bindings);
}

function isContainerReceiverValueExpression(
  expression: ts.Expression,
  bindings: PluginSourceBindings,
): boolean {
  return (
    (ts.isIdentifier(expression) && bindings.containerReceiverNames.has(expression.text)) ||
    (
      ts.isPropertyAccessExpression(expression) &&
      expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      bindings.containerReceiverNames.has(expression.name.text)
    )
  );
}

function isContainerRegisterCall(
  call: ts.CallExpression,
  bindings: PluginSourceBindings,
): boolean {
  return ts.isPropertyAccessExpression(call.expression) &&
    call.expression.name.text === "register" &&
    isContainerReceiverValueExpression(call.expression.expression, bindings);
}

function pluginDiResolutionMechanismForCall(
  call: ts.CallExpression,
  bindings: PluginSourceBindings,
): string | null {
  if (isAureliaKernelReference(call.expression, "resolve", bindings)) {
    return "kernel.resolve";
  }
  const expression = call.expression;
  if (
    ts.isPropertyAccessExpression(expression) &&
    isContainerLookupMethodName(expression.name.text) &&
    isContainerReceiverValueExpression(expression.expression, bindings)
  ) {
    return `container.${expression.name.text}`;
  }
  return null;
}

function pluginRouterMechanismForCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  bindings: PluginSourceBindings,
): string | null {
  const expression = call.expression;
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  if (!isRouterInstanceMethodName(expression.name.text)) {
    return null;
  }
  return isRouterReceiverValueExpression(expression.expression, bindings)
    ? `router.${expression.name.text}`
    : null;
}

function isContainerReference(
  expression: ts.Expression | ts.EntityName,
  bindings: PluginSourceBindings,
): boolean {
  return isAureliaKernelReference(expression, "IContainer", bindings);
}

function comparePluginSurfaceRows(
  left: PluginSurfaceRow,
  right: PluginSurfaceRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    left.source.start.character - right.source.start.character ||
    left.kind.localeCompare(right.kind) ||
    left.mechanism.localeCompare(right.mechanism)
  );
}

function countSurfaceKind(
  rows: readonly PluginSurfaceRow[],
  kind: PluginSurfaceKind,
): number {
  return rows.filter((row) => row.kind === kind).length;
}
