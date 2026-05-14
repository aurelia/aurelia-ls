import ts from "typescript";

import {
  FrameworkExportCapability,
  isCreateInterfaceCall,
} from "../../framework/index.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  readAureliaFrameworkPackageNames,
  readExportNames,
  readExportSurface,
  readTypeScriptCallSiteEntry,
  requiredSourceFileIdentity,
  SourceProjectKeyedMemo,
  SourceDeclarationKind,
  SourceSelectorScheme,
  SourceTargetKind,
  hasExportModifier,
  sourceSpanForNode,
  type SourceProject,
  type TypeScriptCallSiteEntry,
  type TypeScriptExportNameEntry,
  type TypeScriptExportSurfaceEntry,
} from "../../source/index.js";
import type {
  FrameworkDiInterfaceExportRow,
  FrameworkPackageExportRow,
  FrameworkRegistryExportRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  callExpressionsIn,
  callReturnTypeText,
  unwrapExpression,
} from "./framework-ts-utils.js";

const diInterfaceRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkDiInterfaceExportRow[]
>();
const diInterfaceRowsByExport = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkDiInterfaceExportRow[]
>();
const frameworkPackageExportRowsByFilter = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkPackageExportRow[]
>();
const packageExportRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkPackageExportRow[]
>();
const publicExportSurfaceByPackage = new SourceProjectKeyedMemo<
  string,
  FrameworkPublicExportSurface
>();
const registryRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkRegistryExportRow[]
>();
const registryRowsByExport = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkRegistryExportRow[]
>();

export interface FrameworkPublicExportSurface {
  readonly exportsByName: ReadonlyMap<string, TypeScriptExportNameEntry>;
}

export function readFrameworkPackageNames(
  sourceProject: SourceProject,
): ReadonlyMap<string, string> {
  return readAureliaFrameworkPackageNames(sourceProject);
}

export function frameworkPackageIdsForFilters(
  packageNames: ReadonlyMap<string, string>,
  filters: FrameworkDiscoveryFilters,
): readonly string[] {
  if (filters.packageId === undefined) {
    return [...packageNames.keys()];
  }
  return packageNames.has(filters.packageId) ? [filters.packageId] : [];
}

export function readFrameworkPackageExports(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkPackageExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  if (
    filters.exportName === undefined &&
    filters.query === undefined &&
    filters.memberName === undefined
  ) {
    return frameworkPackageIdsForFilters(packageNames, filters)
      .flatMap((packageId) =>
        readFrameworkPackageExportPackageRows(
          sourceProject,
          packageId,
          packageNames.get(packageId) ?? packageId,
        ),
      )
      .sort(
        (left, right) =>
          left.packageId.localeCompare(right.packageId) ||
          left.exportEntry.exportName.localeCompare(
            right.exportEntry.exportName,
          ),
      );
  }
  const cacheKey = frameworkPackageExportFilterCacheKey(filters);
  return frameworkPackageExportRowsByFilter.read(sourceProject, cacheKey, () => {
    const admittedFrameworkPackageIds = new Set(AURELIA_FRAMEWORK_PACKAGE_IDS);
    const selector =
      filters.packageId === undefined
        ? ({ scheme: SourceSelectorScheme.Workspace } as const)
        : ({
            scheme: SourceSelectorScheme.Package,
            packageId: filters.packageId,
          } as const);
    const exports = readExportSurface(
      sourceProject,
      {
        ...selector,
      },
      {
        limit: 100_000,
        offset: 0,
        query: filters.query ?? filters.exportName,
        memberName: filters.memberName,
      },
    ).exports;
    return exports
      .filter((exportEntry) => exportEntry.surfaceFile.packageId !== null)
      .filter((exportEntry) =>
        admittedFrameworkPackageIds.has(
          exportEntry.surfaceFile.packageId as never,
        ),
      )
      .filter(
        (exportEntry) =>
          filters.packageId === undefined ||
          exportEntry.surfaceFile.packageId === filters.packageId,
      )
      .filter(
        (exportEntry) =>
          filters.exportName === undefined ||
          exportEntry.exportName === filters.exportName,
      )
      .map((exportEntry) => {
        const packageId = exportEntry.surfaceFile.packageId!;
        return {
          id: `framework-export:${packageId}:${exportEntry.exportName}`,
          packageId,
          packageName: packageNames.get(packageId) ?? packageId,
          exportEntry,
        };
      })
      .sort(
        (left, right) =>
          left.packageId.localeCompare(right.packageId) ||
          left.exportEntry.exportName.localeCompare(
            right.exportEntry.exportName,
          ),
      );
  });
}

export function readFrameworkPackageExportPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkPackageExportRow[] {
  return packageExportRowsByPackage.read(sourceProject, packageId, () =>
    readExportSurface(
      sourceProject,
      {
        scheme: SourceSelectorScheme.Package,
        packageId,
      },
      {
        limit: 100_000,
        offset: 0,
      },
    )
      .exports.filter(
        (exportEntry) => exportEntry.surfaceFile.packageId === packageId,
      )
      .map((exportEntry) => ({
        id: `framework-export:${packageId}:${exportEntry.exportName}`,
        packageId,
        packageName,
        exportEntry,
      }))
      .sort((left, right) =>
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
      ),
  );
}

export function frameworkPackageExportFilterCacheKey(
  filters: FrameworkDiscoveryFilters,
): string {
  return [
    filters.packageId ?? "*",
    filters.exportName ?? "",
    filters.query ?? "",
    filters.memberName ?? "",
  ].join("\u0000");
}

export function readFrameworkRegistryExports(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkRegistryExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const memberName = filters.memberName ?? "register";
  const rows =
    filters.exportName === undefined
      ? packageIds.flatMap((packageId) =>
          readFrameworkRegistryPackageRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
            memberName,
          ),
        )
      : packageIds.flatMap((packageId) =>
          readFrameworkRegistryExportRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
            memberName,
            filters.exportName!,
          ),
        );
  return rows
    .filter(
      (row) =>
        filters.query === undefined ||
        row.exportEntry.exportName.includes(filters.query) ||
        row.capabilities.some((capability) =>
          capability.includes(filters.query!),
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function readFrameworkRegistryPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  memberName: string,
): readonly FrameworkRegistryExportRow[] {
  const key = `${packageId}:${memberName}`;
  return registryRowsByPackage.read(sourceProject, key, () =>
    scanFrameworkRegistryPackageRows(
      sourceProject,
      packageId,
      packageName,
      memberName,
    ),
  );
}

export function readFrameworkRegistryExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  memberName: string,
  exportName: string,
): readonly FrameworkRegistryExportRow[] {
  const packageCache = registryRowsByPackage.get(
    sourceProject,
    `${packageId}:${memberName}`,
  );
  if (packageCache !== undefined) {
    return packageCache.filter(
      (row) => row.exportEntry.exportName === exportName,
    );
  }
  const key = `${packageId}:${memberName}:${exportName}`;
  return registryRowsByExport.read(sourceProject, key, () =>
    scanFrameworkRegistryPackageRows(
      sourceProject,
      packageId,
      packageName,
      memberName,
      exportName,
    ),
  );
}

export function scanFrameworkRegistryPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  _packageName: string,
  memberName: string,
  exportName?: string,
): readonly FrameworkRegistryExportRow[] {
  return readFrameworkPackageExports(sourceProject, {
    packageId,
    memberName,
    exportName,
  })
    .map((row) => ({
      ...row,
      capabilities: capabilitiesForPackageExport(row),
    }))
    .filter((row) => row.capabilities.length > 0)
    .sort((left, right) =>
      left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function readFrameworkDiInterfaces(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkDiInterfaceExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  if (filters.exportName !== undefined) {
    return packageIds
      .flatMap((packageId) =>
        readFrameworkDiInterfaceExportRows(
          sourceProject,
          packageId,
          packageNames.get(packageId) ?? packageId,
          filters.exportName!,
        ),
      )
      .filter(
        (row) =>
          filters.query === undefined ||
          row.exportEntry.exportName.includes(filters.query) ||
          row.interfaceKey.includes(filters.query),
      )
      .sort(
        (left, right) =>
          left.packageId.localeCompare(right.packageId) ||
          left.exportEntry.exportName.localeCompare(
            right.exportEntry.exportName,
          ) ||
          left.interfaceKey.localeCompare(right.interfaceKey),
      );
  }
  return packageIds
    .flatMap((packageId) =>
      readFrameworkDiInterfacePackageRows(
        sourceProject,
        packageId,
        packageNames.get(packageId) ?? packageId,
      ),
    )
    .filter(
      (row) =>
        filters.exportName === undefined ||
        row.exportEntry.exportName === filters.exportName,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.exportEntry.exportName.includes(filters.query) ||
        row.interfaceKey.includes(filters.query),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.exportEntry.exportName.localeCompare(
          right.exportEntry.exportName,
        ) ||
        left.interfaceKey.localeCompare(right.interfaceKey),
    );
}

export function readFrameworkDiInterfacePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkDiInterfaceExportRow[] {
  return diInterfaceRowsByPackage.read(sourceProject, packageId, () =>
    scanFrameworkDiInterfacePackageRows(sourceProject, packageId, packageName),
  );
}

export function readFrameworkDiInterfaceExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkDiInterfaceExportRow[] {
  const packageCache = diInterfaceRowsByPackage.get(sourceProject, packageId);
  if (packageCache !== undefined) {
    return packageCache.filter(
      (row) => row.exportEntry.exportName === exportName,
    );
  }
  const key = `${packageId}:${exportName}`;
  return diInterfaceRowsByExport.read(sourceProject, key, () =>
    scanFrameworkDiInterfacePackageRows(
      sourceProject,
      packageId,
      packageName,
      exportName,
    ),
  );
}

export function scanFrameworkDiInterfacePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkDiInterfaceExportRow[] {
  const publicSurface = readFrameworkPublicExportSurface(
    sourceProject,
    packageId,
  );
  if (publicSurface.exportsByName.size === 0) {
    return [];
  }
  return sourceProject
    .ownedImplementationSourceFilesForPackage(packageId)
    .flatMap((sourceFile) =>
      exportedVariableDeclarations(sourceFile)
        .filter(
          (
            declaration,
          ): declaration is ts.VariableDeclaration & {
            readonly name: ts.Identifier;
          } => ts.isIdentifier(declaration.name),
        )
        .filter(
          (declaration) =>
            exportName === undefined || declaration.name.text === exportName,
        )
        .flatMap((declaration) => {
          const publicExport = publicSurface.exportsByName.get(
            declaration.name.text,
          );
          return publicExport === undefined
            ? []
            : diInterfaceRowsForVariable(
                sourceProject,
                sourceFile,
                declaration,
                packageId,
                packageName,
                publicExport,
              );
        }),
    )
    .sort(
      (left, right) =>
        left.exportEntry.exportName.localeCompare(
          right.exportEntry.exportName,
        ) || left.interfaceKey.localeCompare(right.interfaceKey),
    );
}

export function readFrameworkPublicExportSurface(
  sourceProject: SourceProject,
  packageId: string,
): FrameworkPublicExportSurface {
  return publicExportSurfaceByPackage.read(sourceProject, packageId, () => {
    const entries = readExportNames(
      sourceProject,
      {
        scheme: SourceSelectorScheme.Package,
        packageId,
      },
      {
        limit: 100_000,
        offset: 0,
      },
    ).exports;
    return {
      exportsByName: new Map(entries.map((entry) => [entry.exportName, entry])),
    };
  });
}

export function exportedClassDeclarations(
  sourceFile: ts.SourceFile,
): readonly ts.ClassDeclaration[] {
  return sourceFile.statements.filter(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) &&
      statement.name !== undefined &&
      hasExportModifier(statement),
  );
}

export function exportedVariableDeclarations(
  sourceFile: ts.SourceFile,
): readonly ts.VariableDeclaration[] {
  const declarations: ts.VariableDeclaration[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) {
      continue;
    }
    declarations.push(...statement.declarationList.declarations);
  }
  return declarations;
}

export function diInterfaceRowsForVariable(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.VariableDeclaration,
  packageId: string,
  packageName: string,
  publicExport?: TypeScriptExportNameEntry,
): readonly FrameworkDiInterfaceExportRow[] {
  if (
    !ts.isIdentifier(declaration.name) ||
    declaration.initializer === undefined
  ) {
    return [];
  }
  const namedDeclaration = declaration as ts.VariableDeclaration & {
    readonly name: ts.Identifier;
  };
  const exportEntry = exportSurfaceEntryForVariable(
    sourceProject,
    sourceFile,
    namedDeclaration,
    publicExport,
  );
  const checker = sourceProject.checker;
  const calls = callExpressionsIn(declaration.initializer);
  const createInterfaceCalls = calls
    .filter((call) => isCreateInterfaceCall(sourceProject, call))
    .map((call) => readTypeScriptCallSiteEntry(sourceProject, sourceFile, call))
    .filter(
      (callSite): callSite is TypeScriptCallSiteEntry => callSite !== null,
    );
  if (createInterfaceCalls.length === 0) {
    return [];
  }
  const builderCalls = calls
    .filter((call) => isResolverBuilderCall(checker, call))
    .map((call) => readTypeScriptCallSiteEntry(sourceProject, sourceFile, call))
    .filter(
      (callSite): callSite is TypeScriptCallSiteEntry => callSite !== null,
    );
  return createInterfaceCalls.map(
    (createInterfaceCall, index): FrameworkDiInterfaceExportRow => ({
      id: `framework-export:${packageId}:${exportEntry.exportName}:di-interface:${index}`,
      packageId,
      packageName,
      exportEntry,
      interfaceKey: interfaceKeyForCreateInterfaceCall(
        exportEntry.exportName,
        createInterfaceCall,
      ),
      createInterfaceCall,
      builderCalls,
      indirect:
        createInterfaceCall.span.start !==
        declaration.initializer!.getStart(sourceFile),
    }),
  );
}

export function isResolverBuilderCall(
  checker: ts.TypeChecker,
  call: ts.CallExpression,
): boolean {
  const callee = unwrapExpression(call.expression);
  if (
    !ts.isPropertyAccessExpression(callee) ||
    ![
      "singleton",
      "transient",
      "instance",
      "callback",
      "cachedCallback",
      "aliasTo",
    ].includes(callee.name.text)
  ) {
    return false;
  }
  return callReturnTypeText(checker, call).includes("IResolver");
}

export function interfaceKeyForCreateInterfaceCall(
  exportName: string,
  callSite: TypeScriptCallSiteEntry,
): string {
  const first = callSite.arguments[0]?.expression;
  return typeof first?.literalValue === "string"
    ? first.literalValue
    : exportName;
}

export function exportSurfaceEntryForNamedDeclaration(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  nameNode: ts.Node,
  declaration: ts.Node,
  declarationKind: SourceDeclarationKind,
  publicExport?: TypeScriptExportNameEntry,
): TypeScriptExportSurfaceEntry {
  const checker = sourceProject.checker;
  const symbol = checker.getSymbolAtLocation(nameNode);
  const targetFile = requiredSourceFileIdentity(sourceProject, sourceFile);
  const surfaceFile = publicExport?.surfaceFile ?? targetFile;
  const span = sourceSpanForNode(sourceFile, declaration);
  const localName = nameNode.getText(sourceFile);
  const exportName = publicExport?.exportName ?? localName;
  return {
    id: `export:${surfaceFile.repoPath}:${exportName}`,
    exportName,
    surfaceFile,
    alias: publicExport?.alias ?? false,
    resolvedName: publicExport?.resolvedName ?? symbol?.getName() ?? localName,
    symbolFlags: publicExport?.symbolFlags ?? symbol?.flags ?? 0,
    fullyQualifiedName:
      publicExport === undefined
        ? symbol === undefined
          ? null
          : checker.getFullyQualifiedName(symbol)
        : publicExport.fullyQualifiedName,
    type: null,
    memberNames: [],
    targets: [
      {
        kind: SourceTargetKind.Symbol,
        id: `declaration:${targetFile.repoPath}:${span.start}:${span.end}:${localName}`,
        label: localName,
        file: targetFile,
        span,
        declarationKind,
        symbolKey: symbol === undefined ? undefined : checker.getFullyQualifiedName(symbol),
      },
    ],
  };
}

export function exportSurfaceEntryForVariable(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.VariableDeclaration & { readonly name: ts.Identifier },
  publicExport?: TypeScriptExportNameEntry,
): TypeScriptExportSurfaceEntry {
  return exportSurfaceEntryForNamedDeclaration(
    sourceProject,
    sourceFile,
    declaration.name,
    declaration,
    SourceDeclarationKind.Variable,
    publicExport,
  );
}

export function capabilitiesForPackageExport(
  row: FrameworkPackageExportRow,
): readonly FrameworkExportCapability[] {
  const members = new Set(row.exportEntry.memberNames);
  const capabilities: FrameworkExportCapability[] = [];
  if (members.has("register")) {
    capabilities.push(FrameworkExportCapability.Register);
  }
  if (members.has("customize")) {
    capabilities.push(FrameworkExportCapability.Customize);
  }
  if (members.has("init")) {
    capabilities.push(FrameworkExportCapability.Init);
  }
  if (members.has("withStore")) {
    capabilities.push(FrameworkExportCapability.WithStore);
  }
  if (members.has("withChild")) {
    capabilities.push(FrameworkExportCapability.WithChild);
  }
  if (members.has("optionsProvider")) {
    capabilities.push(FrameworkExportCapability.OptionsProvider);
  }
  return capabilities;
}
