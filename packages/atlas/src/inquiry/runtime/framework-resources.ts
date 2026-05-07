import ts from "typescript";

import {
  SourceProjectKeyedMemo,
  SourceDeclarationKind,
  type SourceTargetRow,
  type SourceProject,
  type TypeScriptExportNameEntry,
  type TypeScriptExportSurfaceEntry,
} from "../../source/index.js";
import { FrameworkResourceDefinitionKind } from "../../framework/index.js";
import {
  FrameworkResourceCarrierKind,
  type FrameworkResourceCarrierRow,
  type FrameworkResourceExportRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  exportSurfaceEntryForNamedDeclaration,
  exportSurfaceEntryForVariable,
  exportedClassDeclarations,
  exportedVariableDeclarations,
  frameworkPackageIdsForFilters,
  readFrameworkPackageNames,
  readFrameworkPublicExportSurface,
} from "./framework-package-exports.js";
import {
  externalFileIdentity,
  sourceRangeFromFileSpan,
  sourceSpan,
} from "./framework-support.js";
import {
  declarationNameText,
  declarationsForExpressionSymbol,
  uniqueById,
  valueDeclarationParts,
} from "./framework-symbols.js";
import {
  callExpressionsIn,
  calleeTail,
  hasStaticModifier,
  propertyNameText,
  readResourceName,
  readStaticBooleanProperty,
  readStaticStringArrayProperty,
  readStaticTypeNameProperty,
  targetNameFromExpression,
  unwrapExpression,
} from "./framework-ts-utils.js";

const resourceCarrierRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkResourceCarrierRow[]
>();
const resourceCarrierRowsByExport = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkResourceCarrierRow[]
>();
const resourceRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkResourceExportRow[]
>();
const resourceRowsByExport = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkResourceExportRow[]
>();

export function readFrameworkResourceCarriers(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkResourceCarrierRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows =
    filters.exportName === undefined
      ? packageIds.flatMap((packageId) =>
          readFrameworkResourcePackageCarrierRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
          ),
        )
      : packageIds.flatMap((packageId) =>
          readFrameworkResourceExportCarrierRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
            filters.exportName!,
          ),
        );
  return rows
    .filter(
      (row) =>
        filters.resourceKind === undefined ||
        row.resourceKind === filters.resourceKind,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.sourceExportName.includes(filters.query) ||
        row.resourceName?.includes(filters.query) === true ||
        row.targetName?.includes(filters.query) === true,
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.resourceKind.localeCompare(right.resourceKind) ||
        left.sourceExportName.localeCompare(right.sourceExportName) ||
        (left.resourceName ?? "").localeCompare(right.resourceName ?? ""),
    );
}

export function readFrameworkResourcePackageCarrierRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkResourceCarrierRow[] {
  return resourceCarrierRowsByPackage.read(sourceProject, packageId, () =>
    scanFrameworkResourcePackageCarrierRows(
      sourceProject,
      packageId,
      packageName,
    ),
  );
}

export function readFrameworkResourceExportCarrierRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkResourceCarrierRow[] {
  const packageCache = resourceCarrierRowsByPackage.get(
    sourceProject,
    packageId,
  );
  if (packageCache !== undefined) {
    return packageCache.filter((row) => row.sourceExportName === exportName);
  }
  const key = `${packageId}:${exportName}`;
  return resourceCarrierRowsByExport.read(sourceProject, key, () =>
    scanFrameworkResourcePackageCarrierRows(
      sourceProject,
      packageId,
      packageName,
      exportName,
    ),
  );
}

export function scanFrameworkResourcePackageCarrierRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkResourceCarrierRow[] {
  return sourceProject
    .ownedSourceFiles()
    .filter(
      (sourceFile) =>
        sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId,
    )
    .flatMap((sourceFile) => [
      ...exportedClassDeclarations(sourceFile).flatMap((declaration) => {
        const name = declaration.name?.text;
        return name === undefined ||
          (exportName !== undefined && name !== exportName)
          ? []
          : resourceCarriersForClass(
              sourceProject,
              sourceFile,
              declaration,
              packageId,
              packageName,
            );
      }),
      ...exportedVariableDeclarations(sourceFile)
        .filter(
          (
            declaration,
          ): declaration is ts.VariableDeclaration & {
            readonly name: ts.Identifier;
          } => ts.isIdentifier(declaration.name),
        )
        .flatMap((declaration) => {
          return exportName !== undefined &&
            declaration.name.text !== exportName
            ? []
            : resourceCarriersForVariable(
                sourceProject,
                sourceFile,
                declaration,
                packageId,
                packageName,
              );
        }),
      ...resourceCarriersForTopLevelDefineCalls(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        exportName,
      ),
    ])
    .sort(
      (left, right) =>
        left.resourceKind.localeCompare(right.resourceKind) ||
        left.sourceExportName.localeCompare(right.sourceExportName) ||
        (left.resourceName ?? "").localeCompare(right.resourceName ?? ""),
    );
}

export function readFrameworkResourceExports(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkResourceExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows =
    filters.exportName === undefined
      ? packageIds.flatMap((packageId) =>
          readFrameworkResourcePackageRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
          ),
        )
      : packageIds.flatMap((packageId) =>
          readFrameworkResourceExportRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
            filters.exportName!,
          ),
        );
  return rows
    .filter(
      (row) =>
        filters.resourceKind === undefined ||
        row.resourceKind === filters.resourceKind,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.exportEntry.exportName.includes(filters.query) ||
        row.carrier.sourceExportName.includes(filters.query) ||
        row.resourceName?.includes(filters.query) === true ||
        row.targetName?.includes(filters.query) === true,
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.resourceKind.localeCompare(right.resourceKind) ||
        left.exportEntry.exportName.localeCompare(
          right.exportEntry.exportName,
        ) ||
        (left.resourceName ?? "").localeCompare(right.resourceName ?? ""),
    );
}

export function readFrameworkResourcePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkResourceExportRow[] {
  return resourceRowsByPackage.read(sourceProject, packageId, () =>
    scanFrameworkResourcePackageRows(sourceProject, packageId, packageName),
  );
}

export function readFrameworkResourceExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkResourceExportRow[] {
  const packageCache = resourceRowsByPackage.get(sourceProject, packageId);
  if (packageCache !== undefined) {
    return packageCache.filter(
      (row) => row.exportEntry.exportName === exportName,
    );
  }
  const key = `${packageId}:${exportName}`;
  return resourceRowsByExport.read(sourceProject, key, () =>
    scanFrameworkResourcePackageRows(
      sourceProject,
      packageId,
      packageName,
      exportName,
    ),
  );
}

export function scanFrameworkResourcePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkResourceExportRow[] {
  const publicSurface = readFrameworkPublicExportSurface(
    sourceProject,
    packageId,
  );
  if (publicSurface.exportsByName.size === 0) {
    return [];
  }
  return readFrameworkResourcePackageCarrierRows(
    sourceProject,
    packageId,
    packageName,
  )
    .flatMap((carrier) => {
      const publicExport = publicSurface.exportsByName.get(
        carrier.sourceExportName,
      );
      return publicExport === undefined ||
        (exportName !== undefined && publicExport.exportName !== exportName)
        ? []
        : [resourceExportRowFromCarrier(carrier, publicExport)];
    })
    .sort(
      (left, right) =>
        left.resourceKind.localeCompare(right.resourceKind) ||
        left.exportEntry.exportName.localeCompare(
          right.exportEntry.exportName,
        ) ||
        (left.resourceName ?? "").localeCompare(right.resourceName ?? ""),
    );
}

export function resourceCarriersForClass(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.ClassDeclaration,
  packageId: string,
  packageName: string,
): readonly FrameworkResourceCarrierRow[] {
  const rows: FrameworkResourceCarrierRow[] = [];
  const targetName = declaration.name?.text ?? "<anonymous-class>";
  const carrierEntry = exportSurfaceEntryForNamedDeclaration(
    sourceProject,
    sourceFile,
    declaration.name ?? declaration,
    declaration,
    SourceDeclarationKind.Class,
  );

  for (const decorator of ts.canHaveDecorators(declaration)
    ? ts.getDecorators(declaration) ?? []
    : []) {
    const calleeName = decoratorCalleeName(decorator);
    let resourceKind =
      calleeName === null ? null : resourceKindFromDecoratorName(calleeName);
    if (resourceKind === FrameworkResourceDefinitionKind.CustomAttribute) {
      const definitionExpression = decoratorDefinitionExpression(decorator);
      if (
        definitionExpression !== null &&
        readStaticBooleanProperty(
          definitionExpression,
          "isTemplateController",
        ) === true
      ) {
        resourceKind = FrameworkResourceDefinitionKind.TemplateController;
      }
    }
    if (resourceKind === null) {
      continue;
    }
    const definitionExpression = decoratorDefinitionExpression(decorator);
    rows.push(
      resourceCarrierRow(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        carrierEntry,
        resourceKind,
        FrameworkResourceCarrierKind.Decorator,
        decorator,
        {
          resourceName:
            definitionExpression === null
              ? null
              : readResourceName(sourceProject, definitionExpression),
          aliases:
            definitionExpression === null
              ? []
              : readStaticStringArrayProperty(
                  sourceProject,
                  definitionExpression,
                  "aliases",
                ),
          targetName,
        },
      ),
    );
  }

  const staticAu = staticAuInitializer(declaration);
  if (staticAu !== null) {
    let resourceKind = resourceKindFromDefinitionExpression(
      sourceProject,
      staticAu,
    );
    if (
      resourceKind === FrameworkResourceDefinitionKind.CustomAttribute &&
      readStaticBooleanProperty(staticAu, "isTemplateController") === true
    ) {
      resourceKind = FrameworkResourceDefinitionKind.TemplateController;
    }
    if (
      resourceKind !== null &&
      resourceKind !== FrameworkResourceDefinitionKind.AttributePattern
    ) {
      rows.push(
        resourceCarrierRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          carrierEntry,
          resourceKind,
          FrameworkResourceCarrierKind.StaticAu,
          staticAu,
          {
            resourceName: readResourceName(sourceProject, staticAu),
            aliases: readStaticStringArrayProperty(
              sourceProject,
              staticAu,
              "aliases",
            ),
            targetName,
          },
        ),
      );
    }
  }

  for (const member of declaration.members) {
    if (ts.isClassStaticBlockDeclaration(member)) {
      for (const call of callExpressionsIn(member)) {
        const defineKind = resourceKindFromDirectDefineCall(call);
        if (defineKind === null) {
          continue;
        }
        const definitionExpression = call.arguments[0] ?? null;
        rows.push(
          resourceCarrierRow(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            carrierEntry,
            defineKind,
            FrameworkResourceCarrierKind.DefineCall,
            call,
            {
              resourceName:
                definitionExpression === null
                  ? null
                  : readResourceName(sourceProject, definitionExpression),
              aliases:
                definitionExpression === null
                  ? []
                  : readStaticStringArrayProperty(
                      sourceProject,
                      definitionExpression,
                      "aliases",
                    ),
              targetName,
            },
          ),
        );
      }
      continue;
    }
    if (!ts.isPropertyDeclaration(member) || member.initializer === undefined) {
      continue;
    }
    for (const call of callExpressionsIn(member.initializer)) {
      if (!isAttributePatternCreateCall(call)) {
        continue;
      }
      rows.push(
        resourceCarrierRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          carrierEntry,
          FrameworkResourceDefinitionKind.AttributePattern,
          FrameworkResourceCarrierKind.AttributePatternCreate,
          call,
          {
            resourceName: null,
            aliases: [],
            targetName,
          },
        ),
      );
    }
  }

  return rows;
}

export function resourceCarriersForVariable(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: ts.VariableDeclaration & { readonly name: ts.Identifier },
  packageId: string,
  packageName: string,
): readonly FrameworkResourceCarrierRow[] {
  const initializer = declaration.initializer;
  if (initializer === undefined) {
    return [];
  }
  const carrierEntry = exportSurfaceEntryForVariable(
    sourceProject,
    sourceFile,
    declaration,
  );
  const rows: FrameworkResourceCarrierRow[] = [];
  for (const call of callExpressionsIn(initializer)) {
    if (isRendererHelperCall(call)) {
      const targetName =
        targetNameFromExpression(sourceProject, call.arguments[0]) ??
        declaration.name.text;
      rows.push(
        resourceCarrierRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          carrierEntry,
          FrameworkResourceDefinitionKind.Renderer,
          FrameworkResourceCarrierKind.RendererHelper,
          call,
          {
            resourceName: targetName,
            aliases: [],
            targetName,
          },
        ),
      );
      continue;
    }
    const defineKind = resourceKindFromDefineCall(call);
    if (defineKind !== null) {
      const definitionExpression = call.arguments[0] ?? null;
      rows.push(
        resourceCarrierRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          carrierEntry,
          defineKind,
          FrameworkResourceCarrierKind.DefineCall,
          call,
          {
            resourceName:
              definitionExpression === null
                ? null
                : readResourceName(sourceProject, definitionExpression),
            aliases:
              definitionExpression === null
                ? []
                : readStaticStringArrayProperty(
                    sourceProject,
                    definitionExpression,
                    "aliases",
                  ),
            targetName:
              targetNameFromExpression(sourceProject, call.arguments[1]) ??
              declaration.name.text,
          },
        ),
      );
      continue;
    }
    if (isAttributePatternCreateCall(call)) {
      rows.push(
        resourceCarrierRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          carrierEntry,
          FrameworkResourceDefinitionKind.AttributePattern,
          FrameworkResourceCarrierKind.AttributePatternCreate,
          call,
          {
            resourceName: null,
            aliases: [],
            targetName:
              targetNameFromExpression(sourceProject, call.arguments[1]) ??
              declaration.name.text,
          },
        ),
      );
    }
  }
  return rows;
}

export function resourceCarriersForTopLevelDefineCalls(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkResourceCarrierRow[] {
  const rows: FrameworkResourceCarrierRow[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement)) {
      continue;
    }
    const expression = unwrapExpression(statement.expression);
    if (!ts.isCallExpression(expression)) {
      continue;
    }
    const resourceKind = resourceKindFromDefinitionCall(expression);
    const targetExpression =
      resourceTargetExpressionFromDefinitionCall(expression);
    if (resourceKind === null || targetExpression === null) {
      continue;
    }
    const targetDeclarations = declarationsForExpressionSymbol(
      sourceProject,
      targetExpression,
    ).filter(
      (declaration) =>
        sourceProject.packageForFileName(declaration.getSourceFile().fileName)
          ?.id === packageId,
    );
    for (const declaration of targetDeclarations) {
      const value = valueDeclarationParts(declaration);
      const name = declarationNameText(declaration);
      if (
        value === null ||
        name === null ||
        (exportName !== undefined && name !== exportName)
      ) {
        continue;
      }
      const carrierEntry = exportSurfaceEntryForNamedDeclaration(
        sourceProject,
        declaration.getSourceFile(),
        value.nameNode,
        value.declarationNode,
        value.declarationKind,
      );
      rows.push(
        resourceCarrierRow(
          sourceProject,
          sourceFile,
          packageId,
          packageName,
          carrierEntry,
          resourceKind,
          FrameworkResourceCarrierKind.DefineCall,
          expression,
          {
            resourceName: readResourceName(
              sourceProject,
              expression.arguments[0] ?? expression,
            ),
            aliases: readStaticStringArrayProperty(
              sourceProject,
              expression.arguments[0] ?? expression,
              "aliases",
            ),
            targetName: name,
          },
        ),
      );
    }
  }
  return uniqueById(rows);
}

export function resourceCarrierRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  carrierEntry: TypeScriptExportSurfaceEntry,
  resourceKind: FrameworkResourceDefinitionKind,
  carrierKind: FrameworkResourceCarrierKind,
  carrierNode: ts.Node,
  values: {
    readonly resourceName: string | null;
    readonly aliases: readonly string[];
    readonly targetName: string | null;
  },
): FrameworkResourceCarrierRow {
  const file =
    sourceProject.sourceFileIdentity(sourceFile) ??
    externalFileIdentity(sourceProject, sourceFile);
  const span = sourceSpan(sourceFile, carrierNode);
  return {
    id: `framework-resource-carrier:${packageId}:${carrierEntry.exportName}:${resourceKind}:${span.start}`,
    packageId,
    packageName,
    sourceExportName: carrierEntry.exportName,
    carrierEntry,
    resourceKind,
    carrierKind,
    resourceName: values.resourceName,
    aliases: values.aliases,
    targetName: values.targetName,
    source: sourceRangeFromFileSpan(file.repoPath, span),
    declarationSource: declarationSourceForCarrier(carrierEntry),
  };
}

export function resourceExportRowFromCarrier(
  carrier: FrameworkResourceCarrierRow,
  publicExport: TypeScriptExportNameEntry,
): FrameworkResourceExportRow {
  const exportEntry: TypeScriptExportSurfaceEntry = {
    ...carrier.carrierEntry,
    id: `export:${publicExport.surfaceFile.repoPath}:${publicExport.exportName}`,
    exportName: publicExport.exportName,
    surfaceFile: publicExport.surfaceFile,
    alias: publicExport.alias,
    resolvedName: publicExport.resolvedName,
    symbolFlags: publicExport.symbolFlags,
    fullyQualifiedName: publicExport.fullyQualifiedName,
  };
  return {
    id: `framework-resource:${carrier.packageId}:${publicExport.exportName}:${carrier.resourceKind}:${carrier.source.start.line}:${carrier.source.start.character}`,
    packageId: carrier.packageId,
    packageName: carrier.packageName,
    exportEntry,
    carrier,
    resourceKind: carrier.resourceKind,
    carrierKind: carrier.carrierKind,
    resourceName: carrier.resourceName,
    aliases: carrier.aliases,
    targetName: carrier.targetName,
    source: carrier.source,
    declarationSource: carrier.declarationSource,
  };
}

function declarationSourceForCarrier(
  carrierEntry: TypeScriptExportSurfaceEntry,
): ReturnType<typeof sourceRangeFromFileSpan> | null {
  const target = carrierEntry.targets.find(hasSourceTargetRange);
  return target === undefined
    ? null
    : sourceRangeFromFileSpan(target.file.repoPath, target.span);
}

function hasSourceTargetRange(
  target: SourceTargetRow,
): target is SourceTargetRow & {
  readonly file: NonNullable<SourceTargetRow["file"]>;
  readonly span: NonNullable<SourceTargetRow["span"]>;
} {
  return target.file !== undefined && target.span !== undefined;
}

export function decoratorCalleeName(decorator: ts.Decorator): string | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    return calleeTail(expression.expression);
  }
  return calleeTail(expression);
}

export function decoratorDefinitionExpression(
  decorator: ts.Decorator,
): ts.Expression | null {
  const expression = unwrapExpression(decorator.expression);
  return ts.isCallExpression(expression)
    ? expression.arguments[0] ?? null
    : null;
}

export function staticAuInitializer(
  declaration: ts.ClassDeclaration,
): ts.Expression | null {
  for (const member of declaration.members) {
    if (
      !hasStaticModifier(member) ||
      !ts.isPropertyDeclaration(member) ||
      member.initializer === undefined
    ) {
      continue;
    }
    if (propertyNameText(member.name) === "$au") {
      return member.initializer;
    }
  }
  return null;
}

export function resourceKindFromDecoratorName(
  name: string,
): FrameworkResourceDefinitionKind | null {
  switch (name) {
    case "customElement":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "customAttribute":
      return FrameworkResourceDefinitionKind.CustomAttribute;
    case "templateController":
      return FrameworkResourceDefinitionKind.TemplateController;
    case "valueConverter":
      return FrameworkResourceDefinitionKind.ValueConverter;
    case "bindingBehavior":
      return FrameworkResourceDefinitionKind.BindingBehavior;
    case "bindingCommand":
      return FrameworkResourceDefinitionKind.BindingCommand;
    case "attributePattern":
      return FrameworkResourceDefinitionKind.AttributePattern;
    default:
      return null;
  }
}

export function resourceKindFromDefineCall(
  call: ts.CallExpression,
): FrameworkResourceDefinitionKind | null {
  const expression = unwrapExpression(call.expression);
  if (
    !ts.isPropertyAccessExpression(expression) ||
    expression.name.text !== "define"
  ) {
    return null;
  }
  switch (calleeTail(expression.expression)) {
    case "CustomElement":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "CustomAttribute":
      return FrameworkResourceDefinitionKind.CustomAttribute;
    case "ValueConverter":
      return FrameworkResourceDefinitionKind.ValueConverter;
    case "BindingBehavior":
      return FrameworkResourceDefinitionKind.BindingBehavior;
    case "BindingCommand":
      return FrameworkResourceDefinitionKind.BindingCommand;
    default:
      return null;
  }
}

export function resourceKindFromDefinitionCall(
  call: ts.CallExpression,
): FrameworkResourceDefinitionKind | null {
  return (
    resourceKindFromDefineCall(call) ??
    (isAttributePatternCreateCall(call)
      ? FrameworkResourceDefinitionKind.AttributePattern
      : null)
  );
}

export function resourceTargetExpressionFromDefinitionCall(
  call: ts.CallExpression,
): ts.Expression | null {
  const expression = unwrapExpression(call.expression);
  if (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "define"
  ) {
    const target = call.arguments[1];
    return target === undefined || ts.isSpreadElement(target)
      ? null
      : unwrapExpression(target);
  }
  if (isAttributePatternCreateCall(call)) {
    const target = call.arguments[1];
    return target === undefined || ts.isSpreadElement(target)
      ? null
      : unwrapExpression(target);
  }
  return null;
}

export function targetNameFromResourceDefinitionCall(
  sourceProject: SourceProject,
  call: ts.CallExpression,
): string | null {
  return (
    targetNameFromExpression(
      sourceProject,
      resourceTargetExpressionFromDefinitionCall(call) ?? undefined,
    ) ?? readResourceName(sourceProject, call.arguments[0] ?? call)
  );
}

export function resourceKindFromDirectDefineCall(
  call: ts.CallExpression,
): FrameworkResourceDefinitionKind | null {
  switch (calleeTail(call.expression)) {
    case "defineElement":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "defineAttribute": {
      const definitionExpression =
        call.arguments[0] === undefined || ts.isSpreadElement(call.arguments[0])
          ? null
          : unwrapExpression(call.arguments[0]);
      return definitionExpression !== null &&
        readStaticBooleanProperty(
          definitionExpression,
          "isTemplateController",
        ) === true
        ? FrameworkResourceDefinitionKind.TemplateController
        : FrameworkResourceDefinitionKind.CustomAttribute;
    }
    default:
      return null;
  }
}

export function isAttributePatternCreateCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "create" &&
    calleeTail(expression.expression) === "AttributePattern"
  );
}

export function isRendererHelperCall(call: ts.CallExpression): boolean {
  return calleeTail(call.expression) === "renderer";
}

export function resourceKindFromDefinitionExpression(
  sourceProject: SourceProject,
  expression: ts.Expression,
): FrameworkResourceDefinitionKind | null {
  const raw = readStaticTypeNameProperty(sourceProject, expression, "type");
  switch (raw) {
    case "custom-element":
    case "elementTypeName":
      return FrameworkResourceDefinitionKind.CustomElement;
    case "custom-attribute":
    case "attrTypeName":
      return FrameworkResourceDefinitionKind.CustomAttribute;
    case "template-controller":
      return FrameworkResourceDefinitionKind.TemplateController;
    case "value-converter":
    case "converterTypeName":
      return FrameworkResourceDefinitionKind.ValueConverter;
    case "binding-behavior":
    case "behaviorTypeName":
      return FrameworkResourceDefinitionKind.BindingBehavior;
    case "binding-command":
    case "bindingCommandTypeName":
      return FrameworkResourceDefinitionKind.BindingCommand;
    case "attribute-pattern":
      return FrameworkResourceDefinitionKind.AttributePattern;
    default:
      return null;
  }
}
