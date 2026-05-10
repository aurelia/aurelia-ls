import { readdirSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import ts from "typescript";

import {
  countBy,
  countByWhere,
  countWhere,
  uniqueSortedStrings,
} from "../../collections.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  AURELIA_PLUGIN_PACKAGE_ID_PREFIX,
  EXTERNAL_SOURCE_PACKAGE_ID_PREFIX,
  assignmentTargetReceiverName,
  declarationInitializer,
  firstArgumentText,
  hasStaticModifier,
  objectLiteralStringPropertyValue,
  ownerNameForNode,
  propertyNameText,
  requiredSourceFileIdentity,
  requiredSourceRangeForNode,
  SourcePackageId,
  SourceProjectMemo,
  type SourcePackageSummary,
  type SourceProject,
} from "../../source/index.js";
import { compactExpressionText } from "../../source/semantic-surface/expression-text.js";
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
  aureliaResolveFirstArgument,
  aureliaRegistrationFactoryMechanismForCall,
  isContainerLookupMethodName,
  isAureliaContainerReference,
  isAureliaContainerReceiverTypeNode,
  isAureliaConstructorReference,
  isAureliaKernelReference,
  isAureliaReceiverEntityName,
  isInsideCommonJsRequireDeclaration,
  isInsideImportDeclaration,
  isImportedRouterConfigurationExpression,
  isImportedRouterDecorator,
  isReceiverDeclaration,
  isRouterInstanceMethodName,
  isRouterReceiverInitializer,
  isRouterReceiverTypeNode,
  isRouterReceiverValueExpression,
  readAureliaSourceImportsInto,
  readCommonJsRequireModuleSpecifier,
  type ReceiverDeclaration,
} from "./aurelia-source-imports.js";
import {
  aureliaConventionResourceForClass,
  aureliaResourceNameFromDecorator,
} from "./aurelia-resource-conventions.js";
import { readAureliaTemplateReference } from "./aurelia-template-references.js";
import {
  isAureliaPackageSpecifier,
  isAureliaPluginSpecifier,
  isWorkspaceScriptSignal,
  readWorkspacePackageManifest,
  type WorkspacePackageManifestSummary,
} from "./workspace-package-manifest.js";

/** Version marker for admitted workspace topology analysis. */
export const WORKSPACE_ARCHITECTURE_ANALYSIS_VERSION =
  "workspace-architecture-analysis.v1";

const workspaceArchitectureMemo =
  new SourceProjectMemo<WorkspaceArchitectureAnalysis>();

const WORKSPACE_FILE_INVENTORY_EXCLUDED_DIRECTORIES = new Set([
  ".aurelia-artifacts",
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

/** Package admission role: where the package entered the Atlas source world. */
export type WorkspaceAdmissionRole =
  | "atlas"
  | "semantic-runtime"
  | "aurelia-framework"
  | "public-plugin"
  | "external"
  | "workspace";

/** Aurelia project shape inferred from source and manifest integration signals. */
export type WorkspaceAureliaShape =
  | "aurelia-app"
  | "aurelia-resource-library"
  | "aurelia-package"
  | "non-aurelia";

/** Coarse role of one admitted source file before app/runtime semantics are interpreted. */
export type WorkspaceSourceRole =
  | "app-source"
  | "template"
  | "style"
  | "package-manifest"
  | "test-source"
  | "example-source"
  | "tooling-config"
  | "declaration"
  | "generated"
  | "unknown";

/** Source or manifest surface family that helps orient app/workspace pressure. */
export type WorkspaceSurfaceKind =
  | "source-role"
  | "manifest-dependency"
  | "manifest-script"
  | "aurelia-import"
  | "app-entrypoint"
  | "resource"
  | "bindable"
  | "watch"
  | "configuration"
  | "registration"
  | "di-resolution"
  | "router"
  | "template-reference";

/** Compact rollup for the workspace architecture lens. */
export interface WorkspaceArchitectureRollup {
  readonly packageCount: number;
  readonly externalPackageCount: number;
  readonly aureliaPackageCount: number;
  readonly appPackageCount: number;
  readonly publicPluginPackageCount: number;
  readonly sourceFileCount: number;
  readonly surfaceCount: number;
  readonly entrypointCount: number;
  readonly resourceCount: number;
  readonly bindableCount: number;
  readonly registrationCount: number;
  readonly routerSurfaceCount: number;
  readonly templateReferenceCount: number;
  readonly appSourceFileCount: number;
  readonly templateFileCount: number;
  readonly styleFileCount: number;
  readonly testSourceFileCount: number;
  readonly exampleSourceFileCount: number;
  readonly toolingConfigFileCount: number;
  readonly declarationSourceFileCount: number;
  readonly generatedSourceFileCount: number;
  readonly configDiagnosticCount: number;
  readonly surfaceKinds: Readonly<Record<string, number>>;
  readonly surfaceMechanisms: Readonly<Record<string, number>>;
  readonly appEntrypointMechanisms: Readonly<Record<string, number>>;
  readonly manifestDependencyMechanisms: Readonly<Record<string, number>>;
  readonly resourceMechanisms: Readonly<Record<string, number>>;
  readonly configurationMechanisms: Readonly<Record<string, number>>;
  readonly registrationMechanisms: Readonly<Record<string, number>>;
  readonly diResolutionMechanisms: Readonly<Record<string, number>>;
  readonly routerMechanisms: Readonly<Record<string, number>>;
  readonly routerRouteConfigFacets: Readonly<Record<string, number>>;
  readonly templateReferenceMechanisms: Readonly<Record<string, number>>;
  readonly packageAdmissionRoles: Readonly<Record<string, number>>;
  readonly packageAureliaShapes: Readonly<Record<string, number>>;
  readonly packageManagers: Readonly<Record<string, number>>;
  readonly buildToolHints: Readonly<Record<string, number>>;
}

/** One measured phase inside a workspace architecture analysis run. */
export interface WorkspaceArchitectureProfilePhase {
  readonly name: string;
  readonly milliseconds: number;
  readonly rowCount: number;
}

/** Coarse phase timings for external-root workspace pressure runs. */
export interface WorkspaceArchitectureProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly WorkspaceArchitectureProfilePhase[];
}

/** One admitted package row with manifest and source-surface counts. */
export interface WorkspacePackageRow {
  readonly id: string;
  readonly packageName: string;
  readonly rootPath: string;
  readonly tsconfigPath: string;
  readonly external: boolean;
  readonly admissionRole: WorkspaceAdmissionRole;
  readonly aureliaShape: WorkspaceAureliaShape;
  readonly sourceFileCount: number;
  readonly rootFileCount: number;
  readonly declarationCount: number;
  readonly hasPackageJson: boolean;
  readonly packageManager: string | null;
  readonly scriptCount: number;
  readonly dependencyCount: number;
  readonly aureliaDependencyCount: number;
  readonly pluginDependencyCount: number;
  readonly buildToolHints: readonly string[];
  readonly surfaceCount: number;
  readonly aureliaImportCount: number;
  readonly entrypointCount: number;
  readonly resourceCount: number;
  readonly bindableCount: number;
  readonly watchCount: number;
  readonly configurationCount: number;
  readonly registrationCount: number;
  readonly diResolutionCount: number;
  readonly routerSurfaceCount: number;
  readonly templateReferenceCount: number;
  readonly appSourceFileCount: number;
  readonly templateFileCount: number;
  readonly styleFileCount: number;
  readonly testSourceFileCount: number;
  readonly exampleSourceFileCount: number;
  readonly toolingConfigFileCount: number;
  readonly declarationSourceFileCount: number;
  readonly generatedSourceFileCount: number;
  readonly summary: string;
}

/** One manifest or source-backed workspace surface row. */
export interface WorkspaceSurfaceRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly admissionRole: WorkspaceAdmissionRole;
  readonly aureliaShape: WorkspaceAureliaShape;
  readonly kind: WorkspaceSurfaceKind;
  readonly mechanism: string;
  readonly name: string | null;
  readonly facets?: readonly string[];
  readonly filePath: string | null;
  readonly source?: SourceRange;
  readonly summary: string;
}

/** Workspace topology and app-integration product. */
export interface WorkspaceArchitectureAnalysis {
  readonly version: typeof WORKSPACE_ARCHITECTURE_ANALYSIS_VERSION;
  readonly rollup: WorkspaceArchitectureRollup;
  readonly packages: readonly WorkspacePackageRow[];
  readonly surfaces: readonly WorkspaceSurfaceRow[];
  readonly profile: WorkspaceArchitectureProfile;
}

/** Read admitted workspace topology and Aurelia integration surfaces. */
export function readWorkspaceArchitectureAnalysis(
  sourceProject: SourceProject,
): WorkspaceArchitectureAnalysis {
  return workspaceArchitectureMemo.read(sourceProject, () =>
    buildWorkspaceArchitectureAnalysis(sourceProject),
  );
}

function buildWorkspaceArchitectureAnalysis(
  sourceProject: SourceProject,
): WorkspaceArchitectureAnalysis {
  const started = performance.now();
  const phases: WorkspaceArchitectureProfilePhase[] = [];
  const summary = measureWorkspaceArchitecturePhase(
    phases,
    "source project summary",
    () => sourceProject.snapshot().summary,
    (summary) => summary.packageCount,
  );
  const declarationCounts = measureWorkspaceArchitecturePhase(
    phases,
    "declaration counts by package",
    () => declarationCountsByPackage(sourceProject),
    (counts) => counts.size,
  );
  const mutablePackages = new Map<string, MutableWorkspacePackageRow>();
  const surfaces: WorkspaceSurfaceRow[] = [];

  measureWorkspaceArchitecturePhase(
    phases,
    "package manifests and file inventory",
    () => {
      for (const sourcePackage of summary.packages) {
        const manifest = readWorkspacePackageManifest(sourceProject, sourcePackage);
        const fileInventory = readWorkspacePackageFileInventory(sourceProject, sourcePackage.rootPath);
        const packageRow: MutableWorkspacePackageRow = {
          id: sourcePackage.id,
          packageName: sourcePackage.packageName,
          rootPath: sourcePackage.rootPath,
          tsconfigPath: sourcePackage.tsconfigPath,
          external: sourcePackage.external,
          admissionRole: admissionRoleForPackage(sourcePackage),
          aureliaShape: "non-aurelia",
          sourceFileCount: sourcePackage.sourceFileCount,
          rootFileCount: sourcePackage.rootFileCount,
          declarationCount: declarationCounts.get(sourcePackage.id) ?? 0,
          hasPackageJson: manifest.hasPackageJson,
          packageManager: manifest.packageManager,
          scriptCount: manifest.scriptNames.length,
          dependencyCount: manifest.dependencyNames.length,
          aureliaDependencyCount: manifest.aureliaDependencyNames.length,
          pluginDependencyCount: manifest.pluginDependencyNames.length,
          buildToolHints: manifest.buildToolHints,
          surfaceCount: 0,
          aureliaImportCount: 0,
          entrypointCount: 0,
          resourceCount: 0,
          bindableCount: 0,
          watchCount: 0,
          configurationCount: 0,
          registrationCount: 0,
          diResolutionCount: 0,
          routerSurfaceCount: 0,
          templateReferenceCount: 0,
          appSourceFileCount: 0,
          templateFileCount: fileInventory.templateFileCount,
          styleFileCount: fileInventory.styleFileCount,
          testSourceFileCount: 0,
          exampleSourceFileCount: 0,
          toolingConfigFileCount: 0,
          declarationSourceFileCount: 0,
          generatedSourceFileCount: 0,
        };
        mutablePackages.set(sourcePackage.id, packageRow);
        surfaces.push(...manifestSurfacesForPackage(sourcePackage, manifest));
      }
    },
    () => mutablePackages.size,
  );

  measureWorkspaceArchitecturePhase(
    phases,
    "source file scans",
    () => {
      let scannedFiles = 0;
      for (const sourcePackage of summary.packages) {
        const packageRow = mutablePackages.get(sourcePackage.id);
        if (packageRow === undefined) {
          continue;
        }
        for (const sourceFile of sourceProject.ownedSourceFilesForPackage(sourcePackage.id)) {
          scannedFiles += 1;
          const sourceRole = inferWorkspaceSourceRole(sourceFile.fileName);
          countSourceRole(packageRow, sourceRole);
          surfaces.push(
            ...scanWorkspaceSourceFile(
              sourceProject,
              sourceFile,
              sourcePackage.id,
              sourcePackage.packageName,
              sourceRole,
            ),
          );
        }
      }
      return scannedFiles;
    },
    (scannedFiles) => scannedFiles,
  );

  measureWorkspaceArchitecturePhase(
    phases,
    "surface attribution",
    () => {
      for (const surface of surfaces) {
        const packageRow = mutablePackages.get(surface.packageId);
        if (packageRow === undefined) {
          continue;
        }
        countWorkspaceSurface(packageRow, surface);
      }
    },
    () => surfaces.length,
  );

  const { packages, typedSurfaces } = measureWorkspaceArchitecturePhase(
    phases,
    "profile inference and sorting",
    () => {
      const packages = [...mutablePackages.values()]
        .map((row) => workspacePackageRow({ ...row, aureliaShape: inferAureliaShape(row) }))
        .sort(comparePackageRows);
      const packageAxes = new Map(
        packages.map((row) => [
          row.id,
          {
            admissionRole: row.admissionRole,
            aureliaShape: row.aureliaShape,
          },
        ]),
      );
      const typedSurfaces = surfaces
        .map((row) => ({
          ...row,
          admissionRole: packageAxes.get(row.packageId)?.admissionRole ?? row.admissionRole,
          aureliaShape: packageAxes.get(row.packageId)?.aureliaShape ?? row.aureliaShape,
        }))
        .sort(compareWorkspaceSurfaceRows);
      return { packages, typedSurfaces };
    },
    (result) => result.packages.length + result.typedSurfaces.length,
  );

  const rollup = measureWorkspaceArchitecturePhase(
    phases,
    "rollup",
    () => workspaceRollupForRows(
      packages,
      typedSurfaces,
      summary.configDiagnosticCount,
    ),
    (rollup) => rollup.surfaceCount,
  );

  return {
    version: WORKSPACE_ARCHITECTURE_ANALYSIS_VERSION,
    rollup,
    packages,
    surfaces: typedSurfaces,
    profile: {
      totalMilliseconds: performance.now() - started,
      phases,
    },
  };
}

export function workspaceRollupForRows(
  packages: readonly WorkspacePackageRow[],
  surfaces: readonly WorkspaceSurfaceRow[],
  configDiagnosticCount: number,
): WorkspaceArchitectureRollup {
  return {
    packageCount: packages.length,
    externalPackageCount: packages.filter((row) => row.external).length,
    aureliaPackageCount: packages.filter(isAureliaPackage).length,
    appPackageCount: packages.filter((row) => row.aureliaShape === "aurelia-app").length,
    publicPluginPackageCount: packages.filter((row) => row.admissionRole === "public-plugin").length,
    sourceFileCount: packages.reduce((sum, row) => sum + row.sourceFileCount, 0),
    surfaceCount: surfaces.length,
    entrypointCount: countWhere(surfaces, (row) => row.kind === "app-entrypoint"),
    resourceCount: countWhere(surfaces, (row) => row.kind === "resource"),
    bindableCount: countWhere(surfaces, (row) => row.kind === "bindable"),
    registrationCount: countWhere(surfaces, (row) => row.kind === "registration"),
    routerSurfaceCount: countWhere(surfaces, (row) => row.kind === "router"),
    templateReferenceCount: countWhere(surfaces, (row) => row.kind === "template-reference"),
    appSourceFileCount: packages.reduce((sum, row) => sum + row.appSourceFileCount, 0),
    templateFileCount: packages.reduce((sum, row) => sum + row.templateFileCount, 0),
    styleFileCount: packages.reduce((sum, row) => sum + row.styleFileCount, 0),
    testSourceFileCount: packages.reduce((sum, row) => sum + row.testSourceFileCount, 0),
    exampleSourceFileCount: packages.reduce((sum, row) => sum + row.exampleSourceFileCount, 0),
    toolingConfigFileCount: packages.reduce((sum, row) => sum + row.toolingConfigFileCount, 0),
    declarationSourceFileCount: packages.reduce((sum, row) => sum + row.declarationSourceFileCount, 0),
    generatedSourceFileCount: packages.reduce((sum, row) => sum + row.generatedSourceFileCount, 0),
    configDiagnosticCount,
    surfaceKinds: countBy(surfaces, (row) => row.kind),
    surfaceMechanisms: countBy(surfaces, (row) => row.mechanism),
    appEntrypointMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "app-entrypoint",
      (row) => row.mechanism,
    ),
    manifestDependencyMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "manifest-dependency",
      (row) => row.mechanism,
    ),
    resourceMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "resource",
      (row) => row.mechanism,
    ),
    configurationMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "configuration",
      (row) => row.mechanism,
    ),
    registrationMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "registration",
      (row) => row.mechanism,
    ),
    diResolutionMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "di-resolution",
      (row) => row.mechanism,
    ),
    routerMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "router",
      (row) => row.mechanism,
    ),
    routerRouteConfigFacets: countSurfaceFacets(
      surfaces,
      "router",
      "route-config.",
    ),
    templateReferenceMechanisms: countByWhere(
      surfaces,
      (row) => row.kind === "template-reference",
      (row) => row.mechanism,
    ),
    packageAdmissionRoles: countBy(packages, (row) => row.admissionRole),
    packageAureliaShapes: countBy(packages, (row) => row.aureliaShape),
    packageManagers: countBy(
      packages.filter((row) => row.packageManager !== null),
      (row) => row.packageManager ?? "unknown",
    ),
    buildToolHints: countBy(
      packages.flatMap((row) =>
        row.buildToolHints.map((hint) => ({ hint })),
      ),
      (row) => row.hint,
    ),
  };
}

function measureWorkspaceArchitecturePhase<TResult>(
  phases: WorkspaceArchitectureProfilePhase[],
  name: string,
  run: () => TResult,
  rowCount: (result: TResult) => number,
): TResult {
  const started = performance.now();
  const result = run();
  phases.push({
    name,
    milliseconds: performance.now() - started,
    rowCount: rowCount(result),
  });
  return result;
}

function countWorkspaceSurface(
  packageRow: MutableWorkspacePackageRow,
  surface: WorkspaceSurfaceRow,
): void {
  packageRow.surfaceCount += 1;
  switch (surface.kind) {
    case "aurelia-import":
      packageRow.aureliaImportCount += 1;
      break;
    case "app-entrypoint":
      packageRow.entrypointCount += 1;
      break;
    case "resource":
      packageRow.resourceCount += 1;
      break;
    case "bindable":
      packageRow.bindableCount += 1;
      break;
    case "watch":
      packageRow.watchCount += 1;
      break;
    case "configuration":
      packageRow.configurationCount += 1;
      break;
    case "registration":
      packageRow.registrationCount += 1;
      break;
    case "di-resolution":
      packageRow.diResolutionCount += 1;
      break;
    case "router":
      packageRow.routerSurfaceCount += 1;
      break;
    case "template-reference":
      packageRow.templateReferenceCount += 1;
      break;
    case "source-role":
    case "manifest-dependency":
    case "manifest-script":
      break;
  }
}

type MutableWorkspacePackageRow = {
  -readonly [K in keyof Omit<WorkspacePackageRow, "summary">]: Omit<
    WorkspacePackageRow,
    "summary"
  >[K];
};

function declarationCountsByPackage(sourceProject: SourceProject): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const declaration of sourceProject.declarationRows()) {
    const packageId = declaration.file.packageId;
    if (packageId !== null) {
      counts.set(packageId, (counts.get(packageId) ?? 0) + 1);
    }
  }
  return counts;
}

interface WorkspacePackageFileInventory {
  readonly templateFileCount: number;
  readonly styleFileCount: number;
}

function readWorkspacePackageFileInventory(
  sourceProject: SourceProject,
  rootPath: string,
): WorkspacePackageFileInventory {
  const packageRoot = path.isAbsolute(rootPath)
    ? path.resolve(rootPath)
    : path.join(sourceProject.repoRoot, rootPath);
  let templateFileCount = 0;
  let styleFileCount = 0;
  const visit = (directory: string, depth: number): void => {
    if (depth > 8) {
      return;
    }
    for (const entry of safeReadDirectoryEntries(directory)) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !WORKSPACE_FILE_INVENTORY_EXCLUDED_DIRECTORIES.has(entry.name)) {
          visit(absolutePath, depth + 1);
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (isTemplateFileExtension(extension)) {
        templateFileCount += 1;
      }
      if (isStyleFileExtension(extension)) {
        styleFileCount += 1;
      }
    }
  };
  visit(packageRoot, 0);
  return { templateFileCount, styleFileCount };
}

function safeReadDirectoryEntries(directory: string): readonly DirentLike[] {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

interface DirentLike {
  readonly name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

function isTemplateFileExtension(extension: string): boolean {
  return extension === ".html";
}

function isStyleFileExtension(extension: string): boolean {
  switch (extension) {
    case ".css":
    case ".scss":
    case ".sass":
    case ".less":
    case ".styl":
      return true;
    default:
      return false;
  }
}

function manifestSurfacesForPackage(
  sourcePackage: SourcePackageSummary,
  manifest: WorkspacePackageManifestSummary,
): readonly WorkspaceSurfaceRow[] {
  const rows: WorkspaceSurfaceRow[] = [];
  for (const name of manifest.aureliaDependencyNames) {
    rows.push(manifestSurface(
      sourcePackage,
      "manifest-dependency",
      isAureliaPluginSpecifier(name)
        ? "aurelia-plugin-dependency"
        : "aurelia-framework-dependency",
      name,
    ));
  }
  for (const name of manifest.scriptNames.filter(isWorkspaceScriptSignal)) {
    rows.push(manifestSurface(sourcePackage, "manifest-script", "package-script", name));
  }
  return rows;
}

function manifestSurface(
  sourcePackage: SourcePackageSummary,
  kind: WorkspaceSurfaceKind,
  mechanism: string,
  name: string,
): WorkspaceSurfaceRow {
  return {
    id: ["workspace-surface", sourcePackage.id, kind, mechanism, name].join(":"),
    packageId: sourcePackage.id,
    packageName: sourcePackage.packageName,
    admissionRole: admissionRoleForPackage(sourcePackage),
    aureliaShape: "non-aurelia",
    kind,
    mechanism,
    name,
    filePath: null,
    summary: `${sourcePackage.packageName} ${kind} via ${mechanism} (${name}).`,
  };
}

class WorkspaceSourceBindings extends AureliaSourceImports {
  readonly aureliaReceiverNames = new Set<string>();
  readonly aureliaContainerReceiverNames = new Set<string>();
}

function readWorkspaceSourceBindings(sourceFile: ts.SourceFile): WorkspaceSourceBindings {
  const bindings = new WorkspaceSourceBindings();
  readAureliaSourceImportsInto(sourceFile, bindings);
  collectAureliaReceiverBindings(sourceFile, bindings);
  collectAureliaContainerReceiverBindings(sourceFile, bindings);
  collectRouterReceiverBindings(sourceFile, bindings);
  return bindings;
}

function collectAureliaReceiverBindings(
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): void {
  const visit = (node: ts.Node): void => {
    if (isReceiverDeclaration(node) && ts.isIdentifier(node.name) && declarationHasAureliaReceiverShape(node, bindings)) {
      bindings.aureliaReceiverNames.add(node.name.text);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const receiverName = assignmentTargetReceiverName(node.left);
      if (receiverName !== null && isAureliaReceiverValueExpression(node.right, bindings)) {
        bindings.aureliaReceiverNames.add(receiverName);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function collectAureliaContainerReceiverBindings(
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): void {
  const visit = (node: ts.Node): void => {
    if (isReceiverDeclaration(node) && ts.isIdentifier(node.name) && declarationHasAureliaContainerReceiverShape(node, bindings)) {
      bindings.aureliaContainerReceiverNames.add(node.name.text);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const receiverName = assignmentTargetReceiverName(node.left);
      if (receiverName !== null && isAureliaContainerReceiverValueExpression(node.right, bindings)) {
        bindings.aureliaContainerReceiverNames.add(receiverName);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function declarationHasAureliaContainerReceiverShape(
  node: ReceiverDeclaration,
  bindings: WorkspaceSourceBindings,
): boolean {
  return (
    isAureliaContainerReceiverTypeNode(node.type, bindings) ||
    isAureliaContainerReceiverInitializer(declarationInitializer(node), bindings)
  );
}

function isAureliaContainerReceiverInitializer(
  expression: ts.Expression | undefined,
  bindings: WorkspaceSourceBindings,
): boolean {
  if (expression === undefined) {
    return false;
  }
  if (
    ts.isCallExpression(expression) &&
    isAureliaKernelReference(expression.expression, "resolve", bindings)
  ) {
    const first = expression.arguments[0];
    return first !== undefined && isAureliaContainerReference(first, bindings);
  }
  return isAureliaContainerReceiverValueExpression(expression, bindings);
}

function isAureliaContainerReceiverValueExpression(
  expression: ts.Expression,
  bindings: WorkspaceSourceBindings,
): boolean {
  return (
    (ts.isIdentifier(expression) && bindings.aureliaContainerReceiverNames.has(expression.text)) ||
    (
      ts.isPropertyAccessExpression(expression) &&
      expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      bindings.aureliaContainerReceiverNames.has(expression.name.text)
    )
  );
}

function declarationHasAureliaReceiverShape(
  node: ReceiverDeclaration,
  bindings: WorkspaceSourceBindings,
): boolean {
  return (
    isAureliaReceiverTypeNode(node.type, bindings) ||
    isAureliaReceiverInitializer(declarationInitializer(node), bindings)
  );
}

function isAureliaReceiverTypeNode(
  type: ts.TypeNode | undefined,
  bindings: WorkspaceSourceBindings,
): boolean {
  return type !== undefined
    && ts.isTypeReferenceNode(type)
    && isAureliaReceiverEntityName(type.typeName, bindings);
}

function isAureliaReceiverInitializer(
  expression: ts.Expression | undefined,
  bindings: WorkspaceSourceBindings,
): boolean {
  return expression !== undefined && isAureliaBootstrapExpression(expression, bindings);
}

function isAureliaReceiverValueExpression(
  expression: ts.Expression,
  bindings: WorkspaceSourceBindings,
): boolean {
  return (
    (ts.isIdentifier(expression) && bindings.aureliaReceiverNames.has(expression.text)) ||
    (
      ts.isPropertyAccessExpression(expression) &&
      expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      bindings.aureliaReceiverNames.has(expression.name.text)
    ) ||
    (ts.isNewExpression(expression) && isAureliaConstructorReference(expression.expression, bindings))
  );
}

function collectRouterReceiverBindings(
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): void {
  const visit = (node: ts.Node): void => {
    if (isReceiverDeclaration(node) && ts.isIdentifier(node.name) && workspaceDeclarationHasRouterReceiverShape(node, sourceFile, bindings)) {
      bindings.routerReceiverNames.add(node.name.text);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const receiverName = assignmentTargetReceiverName(node.left);
      if (receiverName !== null && isRouterReceiverValueExpression(node.right, bindings)) {
        bindings.routerReceiverNames.add(receiverName);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function workspaceDeclarationHasRouterReceiverShape(
  node: ReceiverDeclaration,
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): boolean {
  return (
    isRouterReceiverTypeNode(node.type, bindings) ||
    isRouterReceiverInitializer(declarationInitializer(node), bindings)
  );
}

function scanWorkspaceSourceFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  role: WorkspaceSourceRole,
): readonly WorkspaceSurfaceRow[] {
  const rows: WorkspaceSurfaceRow[] = sourceRoleSurfacesForFile(
    sourceProject,
    sourceFile,
    packageId,
    packageName,
    role,
  );
  if (!shouldScanWorkspaceAureliaSurfaces(role)) {
    return rows;
  }
  const bindings = readWorkspaceSourceBindings(sourceFile);
  const visit = (node: ts.Node): void => {
    rows.push(...workspaceSurfacesForNode(sourceProject, sourceFile, packageId, packageName, node, bindings));
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function shouldScanWorkspaceAureliaSurfaces(role: WorkspaceSourceRole): boolean {
  return role === "app-source";
}

function sourceRoleSurfacesForFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  role: WorkspaceSourceRole,
): WorkspaceSurfaceRow[] {
  if (
    role === "app-source" ||
    role === "template" ||
    role === "style" ||
    role === "package-manifest"
  ) {
    return [];
  }
  return [
    workspaceSourceRowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      sourceFile,
      "source-role",
      role,
      path.basename(sourceFile.fileName),
    ),
  ].filter((row): row is WorkspaceSurfaceRow => row !== null);
}

function workspaceSurfacesForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  bindings: WorkspaceSourceBindings,
): readonly WorkspaceSurfaceRow[] {
  const rows: WorkspaceSurfaceRow[] = [];
  rows.push(...aureliaImportRowsForNode(sourceProject, sourceFile, packageId, packageName, node));
  rows.push(...resourceRowsForNode(sourceProject, sourceFile, packageId, packageName, node, bindings));
  if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
    return rows;
  }
  if (ts.isCallExpression(node)) {
    rows.push(...workspaceSurfaceRowsForCallExpression(sourceProject, sourceFile, packageId, packageName, node, bindings));
  }
  pushIfPresent(rows, entrypointRowForNode(sourceProject, sourceFile, packageId, packageName, node, bindings));
  rows.push(...routerRowsForNode(sourceProject, sourceFile, packageId, packageName, node, bindings));
  pushIfPresent(rows, templateReferenceRowForNode(sourceProject, sourceFile, packageId, packageName, node));
  return rows;
}

function aureliaImportRowsForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
): readonly WorkspaceSurfaceRow[] {
  if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
    return isAureliaPackageSpecifier(node.moduleSpecifier.text)
      ? [
        workspaceSourceRowForNode(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          node.moduleSpecifier,
          "aurelia-import",
          "import-module",
          node.moduleSpecifier.text,
        ),
      ].filter((row): row is WorkspaceSurfaceRow => row !== null)
      : [];
  }
  if (!ts.isCallExpression(node)) {
    return [];
  }
  const specifier = readCommonJsRequireModuleSpecifier(node);
  return specifier !== null && isAureliaPackageSpecifier(specifier)
    ? [
      workspaceSourceRowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        node,
        "aurelia-import",
        "require-module",
        specifier,
      ),
    ].filter((row): row is WorkspaceSurfaceRow => row !== null)
    : [];
}

function resourceRowsForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  bindings: WorkspaceSourceBindings,
): readonly WorkspaceSurfaceRow[] {
  const rows: WorkspaceSurfaceRow[] = [];
  if (ts.canHaveDecorators(node)) {
    for (const decorator of ts.getDecorators(node) ?? []) {
      pushIfPresent(rows,
        workspaceSurfaceRowForDecorator(sourceProject, sourceFile, packageId, packageName, decorator, node, bindings),
      );
    }
  }
  if (ts.isClassDeclaration(node) && node.name !== undefined) {
    pushIfPresent(rows,
      workspaceConventionResourceRowForClass(sourceProject, sourceFile, packageId, packageName, node, bindings),
    );
  }
  if (ts.isPropertyDeclaration(node)) {
    const mechanism = aureliaStaticBindablesPropertyMechanism(node);
    pushIfPresent(rows,
      mechanism === null
        ? null
        : workspaceSourceRowForNode(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            node.name,
            "bindable",
            mechanism,
            ownerNameForNode(node),
          ),
    );
  }
  if (ts.isPropertyAssignment(node) && propertyNameText(node.name) === "bindables") {
    const mechanism = aureliaResourceDefinitionBindablesMechanism(node, bindings);
    pushIfPresent(rows,
      mechanism === null
        ? null
        : workspaceSourceRowForNode(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          node.name,
          "bindable",
          mechanism,
          ownerNameForNode(node),
        ),
    );
  }
  return rows;
}

function entrypointRowForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  bindings: WorkspaceSourceBindings,
): WorkspaceSurfaceRow | null {
  return ts.isNewExpression(node) && isAureliaConstructorReference(node.expression, bindings)
    ? workspaceSourceRowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      node,
      "app-entrypoint",
      "new-aurelia",
      ownerNameForNode(node),
    )
    : null;
}

function routerRowsForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  bindings: WorkspaceSourceBindings,
): readonly WorkspaceSurfaceRow[] {
  const rows: WorkspaceSurfaceRow[] = [];
  if (ts.isPropertyAssignment(node)) {
    const routeConfigMechanism = routeConfigPropertyMechanism(node, bindings);
    if (routeConfigMechanism !== null) {
      pushIfPresent(rows,
        workspaceSourceRowForNode(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          node.name,
          "router",
          routeConfigMechanism,
          routeConfigPropertyValuePreview(node.initializer, sourceFile),
          routeConfigPropertyFacets(node, routeConfigMechanism, sourceFile),
        ),
      );
    }
  }
  if (ts.isObjectLiteralExpression(node)) {
    const routeObjectMechanism = routeConfigObjectMechanism(node, bindings);
    if (routeObjectMechanism !== null) {
      pushIfPresent(rows,
        workspaceSourceRowForNode(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          node,
          "router",
          routeObjectMechanism,
          routeConfigObjectPreview(node, sourceFile),
          routeConfigObjectFacets(node, routeObjectMechanism),
        ),
      );
    }
  }
  if (ts.isMethodDeclaration(node) && isGetRouteConfigMethod(node)) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        node.name,
        "router",
        "route-config.getRouteConfig",
        ownerNameForNode(node),
        ["route-config.carrier:getRouteConfig"],
      ),
    );
  }
  if (ts.isPropertyDeclaration(node) && isStaticRouteConfigPropertyDeclaration(node, sourceFile, bindings)) {
    const propertyName = propertyNameText(node.name) ?? "unknown";
    pushIfPresent(rows,
      workspaceSourceRowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        node.name,
        "router",
        `route-config.static.${propertyName}`,
        node.initializer === undefined ? ownerNameForNode(node) : routeConfigPropertyValuePreview(node.initializer, sourceFile),
        [
          "route-config.carrier:static-property",
          `route-config.property:${propertyName}`,
          ...(node.initializer === undefined
            ? ["route-config.static-property.value-kind:missing"]
            : [`route-config.${propertyName}.value-kind:${routeConfigValueKind(node.initializer)}`]),
        ],
      ),
    );
  }
  if (
    ts.isIdentifier(node) &&
    bindings.routerIdentifiers.has(node.text) &&
    !isInsideImportDeclaration(node) &&
    !isInsideCommonJsRequireDeclaration(node)
  ) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        node,
        "router",
        node.text,
        ownerNameForNode(node),
      ),
    );
  }
  return rows;
}

function templateReferenceRowForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
): WorkspaceSurfaceRow | null {
  const templateReference = readAureliaTemplateReference(node);
  return templateReference === null
    ? null
    : workspaceSourceRowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        node,
        "template-reference",
        templateReference.mechanism,
        templateReference.name,
      );
}

function workspaceConventionResourceRowForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.ClassDeclaration,
  bindings: WorkspaceSourceBindings,
): WorkspaceSurfaceRow | null {
  const convention = aureliaConventionResourceForClass(sourceFile, node, bindings);
  if (convention === null) {
    return null;
  }
  return workspaceSourceRowForNode(
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

function workspaceSurfaceRowForDecorator(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  decorator: ts.Decorator,
  decoratedNode: ts.Node,
  bindings: WorkspaceSourceBindings,
): WorkspaceSurfaceRow | null {
  const expression = decorator.expression;
  const call = ts.isCallExpression(expression) ? expression : undefined;
  if (isImportedRouterDecorator(call?.expression ?? expression, bindings)) {
    return workspaceSourceRowForNode(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      decorator,
      "router",
      "route-decorator",
      routeNameFromDecorator(call, decoratedNode, sourceFile),
    );
  }
  const decoratorExportName = aureliaDecoratorExportNameForExpression(
    call?.expression ?? expression,
    bindings,
  );
  switch (decoratorExportName) {
    case "customElement":
    case "customAttribute":
    case "valueConverter":
    case "bindingBehavior":
      return workspaceSourceRowForNode(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        decorator,
        "resource",
        decoratorExportName,
        aureliaResourceNameFromDecorator(call, decoratedNode, sourceFile),
      );
    case "bindable":
      return workspaceSourceRowForNode(
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
      return workspaceSourceRowForNode(
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

function workspaceSurfaceRowsForCallExpression(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
  bindings: WorkspaceSourceBindings,
): readonly WorkspaceSurfaceRow[] {
  const rows: WorkspaceSurfaceRow[] = [];
  const diResolutionMechanism = workspaceDiResolutionMechanismForCall(call, bindings);
  if (diResolutionMechanism !== null) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(sourceProject, sourceFile, packageId, packageName, call, "di-resolution", diResolutionMechanism, firstArgumentText(call, sourceFile)),
    );
  }
  const registrationMechanism = registrationMechanismForCall(call, bindings);
  if (registrationMechanism !== null) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(sourceProject, sourceFile, packageId, packageName, call, "registration", registrationMechanism, firstArgumentText(call, sourceFile)),
    );
  }
  const registrationFactoryMechanism = aureliaRegistrationFactoryMechanismForCall(call, bindings);
  if (registrationFactoryMechanism !== null) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(sourceProject, sourceFile, packageId, packageName, call, "registration", registrationFactoryMechanism, firstArgumentText(call, sourceFile)),
    );
  }
  const appTaskMechanism = aureliaAppTaskMechanismForCall(call, bindings);
  if (appTaskMechanism !== null) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(sourceProject, sourceFile, packageId, packageName, call, "configuration", appTaskMechanism, firstArgumentText(call, sourceFile)),
    );
  }
  const configurationMechanism = configurationMechanismForCall(call, sourceFile);
  if (configurationMechanism !== null) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(sourceProject, sourceFile, packageId, packageName, call, "configuration", configurationMechanism, firstArgumentText(call, sourceFile)),
    );
  }
  const appEntrypointMechanism = appEntrypointMechanismForCall(call, bindings);
  if (appEntrypointMechanism !== null) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(sourceProject, sourceFile, packageId, packageName, call, "app-entrypoint", appEntrypointMechanism, ownerNameForNode(call)),
    );
  }
  const routerMechanism = workspaceRouterMechanismForCall(call, sourceFile, bindings);
  if (routerMechanism !== null) {
    pushIfPresent(rows,
      workspaceSourceRowForNode(sourceProject, sourceFile, packageId, packageName, call, "router", routerMechanism, firstArgumentText(call, sourceFile)),
    );
  }
  return rows;
}

function workspaceSourceRowForNode(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  node: ts.Node,
  kind: WorkspaceSurfaceKind,
  mechanism: string,
  name: string | null,
  facets: readonly string[] = [],
): WorkspaceSurfaceRow | null {
  const source = requiredSourceRangeForNode(sourceProject, node);
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  return {
    id: [
      "workspace-surface",
      packageId,
      kind,
      source.filePath,
      source.start.line,
      source.start.character,
    ].join(":"),
    packageId,
    packageName,
    admissionRole: "workspace",
    aureliaShape: "non-aurelia",
    kind,
    mechanism,
    name,
    ...(facets.length === 0 ? {} : { facets: uniqueSortedStrings(facets) }),
    filePath: file.repoPath,
    source,
    summary: `${packageName} ${kind} via ${mechanism}${name === null ? "" : ` (${name})`}.`,
  };
}

function inferAureliaShape(row: MutableWorkspacePackageRow): WorkspaceAureliaShape {
  if (row.entrypointCount > 0) {
    return "aurelia-app";
  }
  if (
    row.resourceCount > 0 ||
    row.bindableCount > 0 ||
    row.templateReferenceCount > 0 ||
    (
      row.aureliaDependencyCount > 0 &&
      (row.templateFileCount > 0 || row.styleFileCount > 0)
    )
  ) {
    return "aurelia-resource-library";
  }
  if (
    row.aureliaDependencyCount > 0 ||
    row.aureliaImportCount > 0 ||
    row.configurationCount > 0 ||
    row.registrationCount > 0 ||
    row.routerSurfaceCount > 0
  ) {
    return "aurelia-package";
  }
  return "non-aurelia";
}

function admissionRoleForPackage(
  sourcePackage: Pick<SourcePackageSummary, "id" | "external">,
): WorkspaceAdmissionRole {
  if (sourcePackage.id === SourcePackageId.Atlas) {
    return "atlas";
  }
  if (sourcePackage.id === SourcePackageId.SemanticRuntime) {
    return "semantic-runtime";
  }
  if ((AURELIA_FRAMEWORK_PACKAGE_IDS as readonly string[]).includes(sourcePackage.id)) {
    return "aurelia-framework";
  }
  if (sourcePackage.id.startsWith(AURELIA_PLUGIN_PACKAGE_ID_PREFIX)) {
    return "public-plugin";
  }
  return sourcePackage.external ? "external" : "workspace";
}

function workspacePackageRow(row: MutableWorkspacePackageRow): WorkspacePackageRow {
  return {
    ...row,
    summary: `${row.packageName}: ${row.admissionRole}/${row.aureliaShape}, ${row.sourceFileCount} TypeScript source file(s), ${row.appSourceFileCount} app source file(s), ${row.templateFileCount} template file(s), ${row.styleFileCount} style file(s), ${row.testSourceFileCount} test source file(s), ${row.exampleSourceFileCount} example source file(s), ${row.entrypointCount} entrypoint signal(s), ${row.resourceCount} resource row(s), ${row.registrationCount} registration row(s).`,
  };
}

function isAureliaPackage(row: WorkspacePackageRow): boolean {
  return row.aureliaShape !== "non-aurelia";
}

function inferWorkspaceSourceRole(fileName: string): WorkspaceSourceRole {
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  const segments = normalized.split("/");
  const baseName = segments.at(-1) ?? normalized;
  const extension = path.extname(baseName);

  if (segments.includes(".aurelia-artifacts")) {
    return "generated";
  }
  if (isDeclarationFileName(baseName)) {
    return "declaration";
  }
  if (isExampleSourcePath(segments, baseName)) {
    return "example-source";
  }
  if (isTestSourcePath(segments, baseName)) {
    return "test-source";
  }
  if (isToolingConfigPath(baseName)) {
    return "tooling-config";
  }
  if (baseName === "package.json") {
    return "package-manifest";
  }

  switch (extension) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "app-source";
    case ".html":
      return "template";
    case ".css":
      return "style";
    case ".json":
      return "tooling-config";
    default:
      return "unknown";
  }
}

function countSourceRole(row: MutableWorkspacePackageRow, role: WorkspaceSourceRole): void {
  switch (role) {
    case "app-source":
      row.appSourceFileCount += 1;
      break;
    case "test-source":
      row.testSourceFileCount += 1;
      break;
    case "example-source":
      row.exampleSourceFileCount += 1;
      break;
    case "tooling-config":
      row.toolingConfigFileCount += 1;
      break;
    case "declaration":
      row.declarationSourceFileCount += 1;
      break;
    case "generated":
      row.generatedSourceFileCount += 1;
      break;
    case "template":
    case "style":
    case "package-manifest":
    case "unknown":
      break;
  }
}

function isDeclarationFileName(baseName: string): boolean {
  return baseName.endsWith(".d.ts") || baseName.endsWith(".d.mts") || baseName.endsWith(".d.cts");
}

function isTestSourcePath(segments: readonly string[], baseName: string): boolean {
  return (
    segments.some((segment) =>
      segment === "__tests__" ||
      segment === "test" ||
      segment === "tests" ||
      segment === "spec" ||
      segment === "specs" ||
      segment === "e2e"
    ) ||
    /\.(spec|test|e2e|cy)\.[cm]?[tj]sx?$/.test(baseName)
  );
}

function isExampleSourcePath(segments: readonly string[], baseName: string): boolean {
  return (
    segments.some((segment) =>
      segment === "story" ||
      segment === "stories" ||
      segment === "demo" ||
      segment === "demos"
    ) ||
    /\.(story|stories)\.[cm]?[tj]sx?$/.test(baseName)
  );
}

function isToolingConfigPath(baseName: string): boolean {
  return (
    /^(vite|vitest|webpack|rollup|jest|playwright|karma|tsup|eslint|prettier|postcss|tailwind|babel|commitlint)\.config\./.test(baseName) ||
    /^\.(eslint|prettier|commitlint|babel|stylelint|lintstaged)rc(?:\.[cm]?[jt]s(?:x)?|\.json)?$/.test(baseName) ||
    /^karma\.conf\.[cm]?js$/.test(baseName) ||
    baseName === "tsconfig.json" ||
    baseName.startsWith("tsconfig.") ||
    baseName === "jsconfig.json" ||
    baseName === "nx.json" ||
    baseName === "turbo.json"
  );
}

function configurationMechanismForCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
): string | null {
  const name = compactExpressionText(call.expression, sourceFile);
  if (name === "ContainerConfiguration.from") {
    return "container-configuration.from";
  }
  if (name.endsWith(".customize")) {
    return "configuration.customize";
  }
  if (name.includes("Configuration")) {
    return "configuration-call";
  }
  return null;
}

function registrationMechanismForCall(
  call: ts.CallExpression,
  bindings: WorkspaceSourceBindings,
): string | null {
  const expression = call.expression;
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== "register") {
    return null;
  }
  if (isAureliaBootstrapExpression(expression.expression, bindings)) {
    return "aurelia.register";
  }
  return isAureliaContainerReceiverExpression(expression.expression, bindings)
    ? "container.register"
    : null;
}

function workspaceDiResolutionMechanismForCall(
  call: ts.CallExpression,
  bindings: WorkspaceSourceBindings,
): string | null {
  if (isAureliaKernelReference(call.expression, "resolve", bindings)) {
    return "kernel.resolve";
  }
  const expression = call.expression;
  if (
    ts.isPropertyAccessExpression(expression) &&
    isContainerLookupMethodName(expression.name.text) &&
    isAureliaContainerReceiverExpression(expression.expression, bindings)
  ) {
    return `container.${expression.name.text}`;
  }
  return null;
}

function workspaceRouterMechanismForCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): string | null {
  const expression = call.expression;
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  if (isImportedRouterConfigurationExpression(expression.expression, bindings)) {
    return `RouterConfiguration.${expression.name.text}`;
  }
  if (isRouterInstanceMethodName(expression.name.text) && isRouterReceiverValueExpression(expression.expression, bindings)) {
    return `router.${expression.name.text}`;
  }
  return null;
}

function appEntrypointMechanismForCall(
  call: ts.CallExpression,
  bindings: WorkspaceSourceBindings,
): string | null {
  const expression = call.expression;
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  switch (expression.name.text) {
    case "app":
    case "enhance":
      return isAureliaBootstrapExpression(expression.expression, bindings)
        ? `aurelia.${expression.name.text}`
        : null;
    case "start":
      return aureliaStartMechanism(expression.expression, bindings);
    default:
      return null;
  }
}

function aureliaStartMechanism(
  expression: ts.Expression,
  bindings: WorkspaceSourceBindings,
): string | null {
  if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression)) {
    return null;
  }
  const methodName = expression.expression.name.text;
  return (methodName === "app" || methodName === "enhance") && isAureliaBootstrapExpression(expression.expression.expression, bindings)
    ? `aurelia.${methodName}().start`
    : null;
}

function isAureliaBootstrapExpression(
  expression: ts.Expression,
  bindings: WorkspaceSourceBindings,
): boolean {
  if (ts.isNewExpression(expression)) {
    return isAureliaConstructorReference(expression.expression, bindings);
  }
  if (ts.isIdentifier(expression)) {
    return bindings.aureliaReceiverNames.has(expression.text) ||
      bindings.aureliaImportedNames.get(expression.text) === "Aurelia";
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    expression.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return bindings.aureliaReceiverNames.has(expression.name.text);
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    bindings.aureliaNamespaces.has(expression.expression.text) &&
    expression.name.text === "Aurelia"
  ) {
    return true;
  }
  if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression)) {
    return false;
  }
  const methodName = expression.expression.name.text;
  return (methodName === "register" || methodName === "app" || methodName === "enhance") &&
    isAureliaBootstrapExpression(expression.expression.expression, bindings);
}

function routeConfigPropertyMechanism(
  node: ts.PropertyAssignment,
  bindings: WorkspaceSourceBindings,
): string | null {
  const name = propertyNameText(node.name);
  if (name === null || !isRouteConfigPropertyName(name)) {
    return null;
  }
  if (isInsideImportedRouteDecorator(node, bindings)) {
    return `route-config.${name}`;
  }
  if (isInsideStaticRoutesProperty(node, bindings)) {
    return `route-config.static-routes.${name}`;
  }
  if (isInsideGetRouteConfigMethod(node)) {
    return `route-config.getRouteConfig.${name}`;
  }
  return null;
}

function routeConfigObjectMechanism(
  node: ts.ObjectLiteralExpression,
  bindings: WorkspaceSourceBindings,
): string | null {
  if (!hasRouteConfigAnchorProperty(node)) {
    return null;
  }
  if (isInsideImportedRouteDecorator(node, bindings)) {
    return "route-config.route-object";
  }
  if (isInsideStaticRoutesProperty(node, bindings)) {
    return "route-config.static-routes.route-object";
  }
  if (isInsideGetRouteConfigMethod(node)) {
    return "route-config.getRouteConfig.route-object";
  }
  return null;
}

function hasRouteConfigAnchorProperty(node: ts.ObjectLiteralExpression): boolean {
  return node.properties.some((property) =>
    ts.isPropertyAssignment(property) &&
    isRouteConfigAnchorPropertyName(propertyNameText(property.name)),
  );
}

function isStaticRouteConfigPropertyDeclaration(
  node: ts.PropertyDeclaration,
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): boolean {
  const name = propertyNameText(node.name);
  return name !== null
    && isRouteConfigPropertyName(name)
    && hasStaticModifier(node)
    && isRouteBearingClassMember(node, sourceFile, bindings);
}

function isGetRouteConfigMethod(node: ts.MethodDeclaration): boolean {
  const name = propertyNameText(node.name);
  return name === "getRouteConfig";
}

function isRouteBearingClassMember(
  node: ts.ClassElement,
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): boolean {
  const klass = node.parent;
  return ts.isClassDeclaration(klass)
    && (
      bindings.hasRouterPackageImport ||
      classHasGetRouteConfigMethod(klass) ||
      classHasImportedRouteDecorator(klass, sourceFile, bindings)
    );
}

function classHasGetRouteConfigMethod(klass: ts.ClassDeclaration): boolean {
  return klass.members.some((member) =>
    ts.isMethodDeclaration(member) && isGetRouteConfigMethod(member)
  );
}

function classHasImportedRouteDecorator(
  klass: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  bindings: WorkspaceSourceBindings,
): boolean {
  for (const decorator of ts.getDecorators(klass) ?? []) {
    const expression = decorator.expression;
    const call = ts.isCallExpression(expression) ? expression : undefined;
    if (isImportedRouterDecorator(call?.expression ?? expression, bindings)) {
      return true;
    }
  }
  return false;
}

function isInsideImportedRouteDecorator(
  node: ts.Node,
  bindings: WorkspaceSourceBindings,
): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isDecorator(current)) {
      const expression = current.expression;
      const call = ts.isCallExpression(expression) ? expression : undefined;
      return isImportedRouterDecorator(call?.expression ?? expression, bindings);
    }
    if (ts.isClassDeclaration(current) || ts.isSourceFile(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function isInsideStaticRoutesProperty(
  node: ts.Node,
  bindings: WorkspaceSourceBindings,
): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isPropertyDeclaration(current)) {
      const name = propertyNameText(current.name);
      return name === "routes"
        && hasStaticModifier(current)
        && isRouteBearingClassMember(current, current.getSourceFile(), bindings);
    }
    if (ts.isClassDeclaration(current) || ts.isSourceFile(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function isInsideGetRouteConfigMethod(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isMethodDeclaration(current)) {
      return isGetRouteConfigMethod(current);
    }
    if (ts.isClassDeclaration(current) || ts.isSourceFile(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function isRouteConfigPropertyName(name: string): boolean {
  switch (name) {
    case "id":
    case "path":
    case "component":
    case "routes":
    case "redirectTo":
    case "title":
    case "nav":
    case "caseSensitive":
    case "transitionPlan":
    case "viewport":
    case "fallback":
    case "data":
      return true;
    default:
      return false;
  }
}

function isRouteConfigAnchorPropertyName(name: string | null): boolean {
  switch (name) {
    case "id":
    case "path":
    case "component":
    case "routes":
    case "redirectTo":
      return true;
    default:
      return false;
  }
}

function routeConfigObjectPreview(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): string | null {
  for (const preferredName of ["id", "path", "redirectTo", "title"] as const) {
    const value = objectLiteralPropertyValue(node, preferredName);
    if (value !== null) {
      return routeConfigPropertyValuePreview(value, sourceFile);
    }
  }
  return `${node.properties.length} route field(s)`;
}

function routeConfigObjectFacets(
  node: ts.ObjectLiteralExpression,
  mechanism: string,
): readonly string[] {
  const fields = routeConfigObjectFieldNames(node);
  return uniqueSortedStrings([
    `route-config.carrier:${routeConfigCarrierForMechanism(mechanism)}`,
    `route-config.object.field-count:${countBucket(fields.length)}`,
    `route-config.object.fields:${fields.length === 0 ? "none" : fields.join("+")}`,
    ...fields.map((field) => `route-config.object.has:${field}`),
  ]);
}

function routeConfigPropertyFacets(
  node: ts.PropertyAssignment,
  mechanism: string,
  sourceFile: ts.SourceFile,
): readonly string[] {
  const name = propertyNameText(node.name) ?? "unknown";
  const facets = [
    `route-config.carrier:${routeConfigCarrierForMechanism(mechanism)}`,
    `route-config.property:${name}`,
    `route-config.${name}.value-kind:${routeConfigValueKind(node.initializer)}`,
    ...routeConfigCardinalityFacets(name, node.initializer),
  ];
  if (containsDynamicImport(node.initializer)) {
    facets.push(`route-config.${name}.dynamic-import:present`);
  }
  return uniqueSortedStrings(facets);
}

function routeConfigObjectFieldNames(
  node: ts.ObjectLiteralExpression,
): readonly string[] {
  return uniqueSortedStrings(
    node.properties.flatMap((property) => {
      if (!ts.isPropertyAssignment(property)) {
        return [];
      }
      const name = propertyNameText(property.name);
      return name !== null && isRouteConfigPropertyName(name) ? [name] : [];
    }),
  );
}

function routeConfigCarrierForMechanism(mechanism: string): string {
  if (mechanism.startsWith("route-config.static-routes.")) {
    return "static-routes";
  }
  if (
    mechanism === "route-config.getRouteConfig" ||
    mechanism.startsWith("route-config.getRouteConfig.")
  ) {
    return "getRouteConfig";
  }
  if (mechanism.startsWith("route-config.static.")) {
    return "static-property";
  }
  return "decorator";
}

function routeConfigCardinalityFacets(
  name: string,
  expression: ts.Expression,
): readonly string[] {
  const current = unwrapRouteConfigExpression(expression);
  if (name !== "routes" || !ts.isArrayLiteralExpression(current)) {
    return [];
  }
  return [
    `route-config.routes.array-length:${countBucket(current.elements.length)}`,
  ];
}

function routeConfigValueKind(expression: ts.Expression): string {
  const current = unwrapRouteConfigExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return "string-literal";
  }
  if (ts.isNumericLiteral(current)) {
    return "numeric-literal";
  }
  if (
    current.kind === ts.SyntaxKind.TrueKeyword ||
    current.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return "boolean-literal";
  }
  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return "null";
  }
  if (ts.isArrayLiteralExpression(current)) {
    return "array-literal";
  }
  if (ts.isObjectLiteralExpression(current)) {
    return "object-literal";
  }
  if (ts.isIdentifier(current)) {
    return "identifier";
  }
  if (ts.isPropertyAccessExpression(current)) {
    return "property-access";
  }
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return containsDynamicImport(current)
      ? "dynamic-import-factory"
      : "function";
  }
  if (ts.isCallExpression(current)) {
    return isDynamicImportCall(current) ? "dynamic-import-call" : "call";
  }
  if (ts.isNewExpression(current)) {
    return "new";
  }
  if (
    ts.isNoSubstitutionTemplateLiteral(current) ||
    ts.isTemplateExpression(current)
  ) {
    return "template";
  }
  if (ts.isConditionalExpression(current)) {
    return "conditional";
  }
  return "expression";
}

function unwrapRouteConfigExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  for (;;) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isSatisfiesExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

function containsDynamicImport(node: ts.Node): boolean {
  if (ts.isCallExpression(node) && isDynamicImportCall(node)) {
    return true;
  }
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isCallExpression(current) && isDynamicImportCall(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

function isDynamicImportCall(node: ts.CallExpression): boolean {
  return node.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function countBucket(count: number): string {
  if (count <= 0) {
    return "0";
  }
  if (count === 1) {
    return "1";
  }
  if (count <= 5) {
    return "2-5";
  }
  return "6+";
}

function objectLiteralPropertyValue(
  node: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of node.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      propertyNameText(property.name) === propertyName
    ) {
      return property.initializer;
    }
  }
  return null;
}

function routeConfigPropertyValuePreview(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): string | null {
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
    return expression.text;
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return "true";
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return "false";
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return `${expression.elements.length} route(s)`;
  }
  return compactExpressionText(expression, sourceFile);
}

function isAureliaContainerReceiverExpression(
  expression: ts.Expression,
  bindings: WorkspaceSourceBindings,
): boolean {
  if (ts.isIdentifier(expression)) {
    return bindings.aureliaContainerReceiverNames.has(expression.text);
  }
  return ts.isPropertyAccessExpression(expression)
    && expression.expression.kind === ts.SyntaxKind.ThisKeyword
    && bindings.aureliaContainerReceiverNames.has(expression.name.text);
}

function routeNameFromDecorator(
  call: ts.CallExpression | undefined,
  decoratedNode: ts.Node,
  sourceFile: ts.SourceFile,
): string | null {
  const first = call?.arguments[0];
  if (first !== undefined) {
    if (ts.isStringLiteralLike(first)) {
      return first.text;
    }
    if (ts.isObjectLiteralExpression(first)) {
      return objectLiteralStringPropertyValue(first, "id", sourceFile) ??
        objectLiteralStringPropertyValue(first, "path", sourceFile) ??
        ownerNameForNode(decoratedNode);
    }
  }
  return ownerNameForNode(decoratedNode);
}

function countSurfaceFacets(
  rows: readonly WorkspaceSurfaceRow[],
  kind: WorkspaceSurfaceKind,
  prefix: string,
): Readonly<Record<string, number>> {
  return countBy(
    rows
      .filter((row) => row.kind === kind)
      .flatMap((row) =>
        (row.facets ?? [])
          .filter((facet) => facet.startsWith(prefix))
          .map((facet) => ({ facet })),
      ),
    (row) => row.facet,
  );
}

function comparePackageRows(left: WorkspacePackageRow, right: WorkspacePackageRow): number {
  return left.rootPath.localeCompare(right.rootPath) || left.id.localeCompare(right.id);
}

function compareWorkspaceSurfaceRows(left: WorkspaceSurfaceRow, right: WorkspaceSurfaceRow): number {
  return (
    (left.filePath ?? left.packageId).localeCompare(right.filePath ?? right.packageId) ||
    (left.source?.start.line ?? 0) - (right.source?.start.line ?? 0) ||
    left.kind.localeCompare(right.kind) ||
    left.mechanism.localeCompare(right.mechanism)
  );
}

function pushIfPresent<T>(target: T[], value: T | null): void {
  if (value !== null) {
    target.push(value);
  }
}
