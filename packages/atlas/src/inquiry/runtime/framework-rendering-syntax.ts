import ts from "typescript";

import {
  readTypeScriptExpressionFact,
  requiredSourceFileIdentity,
  sourceRangeForSourceFileNode,
  SourceProjectKeyedMemo,
  type SourceProject,
} from "../../source/index.js";
import {
  FrameworkResourceDefinitionKind,
  FrameworkSyntaxProducerKind,
  FrameworkSyntaxProductKind,
} from "../../framework/index.js";
import type {
  FrameworkResourceCarrierRow,
  FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  exportedVariableDeclarations,
  frameworkPackageIdsForFilters,
  readFrameworkPackageNames,
} from "./framework-package-exports.js";
import {
  bindingCreationExpressionsIn,
  bindingNameFromCreationExpression,
  functionExpressionProducerName,
  instructionNameFromExpressionContext,
  instructionNameFromRenderMethod,
  instructionProductExpressionsForBuildMethod,
  instructionSlotNameFromText,
  instructionTargetFromReturnedExpression,
  rendererClassExpression,
  rendererTargetExpression,
  sourceFileProducerName,
} from "./framework-rendering-inspection.js";
import {
  isRendererHelperCall,
  readFrameworkResourcePackageCarrierRows,
} from "./framework-resources.js";
import { uniqueById } from "./framework-symbols.js";
import { callExpressionsIn, propertyNameText } from "./framework-ts-utils.js";

const syntaxProductRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkSyntaxProductRow[]
>();

export function readFrameworkSyntaxProducts(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkSyntaxProductRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkSyntaxProductPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.exportName === undefined ||
        row.producerName === filters.exportName,
    )
    .filter(
      (row) =>
        filters.resourceKind === undefined ||
        row.resourceCarrier?.resourceKind === filters.resourceKind,
    )
    .filter(
      (row) =>
        filters.producerKind === undefined ||
        row.producerKind === filters.producerKind,
    )
    .filter(
      (row) =>
        filters.productKind === undefined ||
        row.productKind === filters.productKind,
    )
    .filter(
      (row) =>
        filters.bindingName === undefined ||
        row.bindingName === filters.bindingName,
    )
    .filter(
      (row) =>
        filters.instructionName === undefined ||
        row.instructionName === filters.instructionName,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.producerName.includes(filters.query) ||
        row.instructionName?.includes(filters.query) === true ||
        row.instructionTarget?.includes(filters.query) === true ||
        row.bindingName?.includes(filters.query) === true,
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.producerKind.localeCompare(right.producerKind) ||
        left.producerName.localeCompare(right.producerName) ||
        left.productKind.localeCompare(right.productKind) ||
        (left.instructionName ?? "").localeCompare(
          right.instructionName ?? "",
        ) ||
        (left.bindingName ?? "").localeCompare(right.bindingName ?? ""),
    );
}

/** Read only syntax products owned by rendering-time products and dispatch. */
export function readFrameworkRenderingSyntaxProducts(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkSyntaxProductRow[] {
  return readFrameworkSyntaxProducts(sourceProject, filters).filter(
    isFrameworkRenderingSyntaxProduct,
  );
}

/** Read only syntax products that produce compiler instruction records. */
export function readFrameworkCompilerSyntaxProducts(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkSyntaxProductRow[] {
  return readFrameworkSyntaxProducts(sourceProject, filters).filter(
    isFrameworkCompilerInstructionProduct,
  );
}

/** Whether a syntax product belongs to the compiler instruction-production side. */
export function isFrameworkCompilerInstructionProduct(
  row: FrameworkSyntaxProductRow,
): boolean {
  if (row.instructionName === null) {
    return false;
  }
  return (
    row.productKind === FrameworkSyntaxProductKind.BuildsInstruction ||
    row.productKind === FrameworkSyntaxProductKind.EmitsInstruction
  );
}

/** Whether a syntax product belongs to the rendering side after compilation. */
export function isFrameworkRenderingSyntaxProduct(
  row: FrameworkSyntaxProductRow,
): boolean {
  return (
    row.productKind === FrameworkSyntaxProductKind.HandlesInstruction ||
    row.productKind === FrameworkSyntaxProductKind.CreatesBinding
  );
}

export function readFrameworkSyntaxProductPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkSyntaxProductRow[] {
  return syntaxProductRowsByPackage.read(sourceProject, packageId, () => {
    const resourceCarriers = readFrameworkResourcePackageCarrierRows(
      sourceProject,
      packageId,
      packageName,
    );
    return uniqueById(
      sourceProject
        .ownedSourceFiles()
        .filter(
          (sourceFile) =>
            sourceProject.packageForFileName(sourceFile.fileName)?.id ===
            packageId,
        )
        .flatMap((sourceFile) => [
          ...syntaxProductsForBindingCommandClasses(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            resourceCarriers,
          ),
          ...syntaxProductsForRendererVariables(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            resourceCarriers,
          ),
          ...syntaxProductsForInstructionFactories(
            sourceProject,
            sourceFile,
            packageId,
            packageName,
            resourceCarriers,
          ),
        ]),
    );
  });
}

export function syntaxProductsForBindingCommandClasses(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
): readonly FrameworkSyntaxProductRow[] {
  return sourceFile.statements
    .filter(
      (statement): statement is ts.ClassDeclaration =>
        ts.isClassDeclaration(statement) && statement.name !== undefined,
    )
    .flatMap((declaration) => {
      const producerName = declaration.name?.text;
      const buildMethod = declaration.members.find(
        (member): member is ts.MethodDeclaration =>
          ts.isMethodDeclaration(member) &&
          propertyNameText(member.name) === "build" &&
          member.body !== undefined,
      );
      if (producerName === undefined || buildMethod?.body === undefined) {
        return [];
      }
      const products = instructionProductExpressionsForBuildMethod(
        sourceProject,
        sourceFile,
        buildMethod,
      );
      if (products.length === 0) {
        return [];
      }
      const resourceCarrier = resourceCarrierForProducer(
        resourceCarriers,
        producerName,
        FrameworkResourceDefinitionKind.BindingCommand,
      );
      return products.map((product) =>
        syntaxProductRow(sourceProject, sourceFile, packageId, packageName, {
          producerName,
          producerKind: FrameworkSyntaxProducerKind.BindingCommand,
          productKind: FrameworkSyntaxProductKind.BuildsInstruction,
          resourceCarrier,
          instructionName: product.instructionName,
          instructionTarget: product.instructionTarget,
          bindingName: null,
          expression: product.expression,
        }),
      );
    });
}

export function syntaxProductsForRendererVariables(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
): readonly FrameworkSyntaxProductRow[] {
  return exportedVariableDeclarations(sourceFile)
    .filter(
      (
        declaration,
      ): declaration is ts.VariableDeclaration & {
        readonly name: ts.Identifier;
      } =>
        ts.isIdentifier(declaration.name) &&
        declaration.initializer !== undefined,
    )
    .flatMap((declaration) => {
      const producerName = declaration.name.text;
      const rendererCall = callExpressionsIn(declaration.initializer!).find(
        (call) => isRendererHelperCall(call),
      );
      const rendererClass =
        rendererCall === undefined
          ? null
          : rendererClassExpression(rendererCall);
      if (rendererCall === undefined || rendererClass === null) {
        return [];
      }
      const resourceCarrier = resourceCarrierForProducer(
        resourceCarriers,
        producerName,
        FrameworkResourceDefinitionKind.Renderer,
      );
      const renderMethod = rendererClass.members.find(
        (member): member is ts.MethodDeclaration =>
          ts.isMethodDeclaration(member) &&
          propertyNameText(member.name) === "render" &&
          member.body !== undefined,
      );
      const targetExpression = rendererTargetExpression(rendererClass);
      const instructionName =
        renderMethod === undefined
          ? null
          : instructionNameFromRenderMethod(sourceProject, renderMethod);
      const rows: FrameworkSyntaxProductRow[] = [];
      if (targetExpression !== null || instructionName !== null) {
        rows.push(
          syntaxProductRow(sourceProject, sourceFile, packageId, packageName, {
            producerName,
            producerKind: FrameworkSyntaxProducerKind.Renderer,
            productKind: FrameworkSyntaxProductKind.HandlesInstruction,
            resourceCarrier,
            instructionName,
            instructionTarget:
              targetExpression === null
                ? null
                : targetExpression.getText(sourceFile),
            bindingName: null,
            expression: targetExpression ?? rendererCall,
          }),
        );
      }
      if (renderMethod?.body !== undefined) {
        for (const expression of bindingCreationExpressionsIn(
          renderMethod.body,
        )) {
          rows.push(
            syntaxProductRow(
              sourceProject,
              sourceFile,
              packageId,
              packageName,
              {
                producerName,
                producerKind: FrameworkSyntaxProducerKind.Renderer,
                productKind: FrameworkSyntaxProductKind.CreatesBinding,
                resourceCarrier,
                instructionName,
                instructionTarget:
                  targetExpression === null
                    ? null
                    : targetExpression.getText(sourceFile),
                bindingName: bindingNameFromCreationExpression(expression),
                expression,
              },
            ),
          );
        }
      }
      return rows;
    });
}

export function syntaxProductsForInstructionFactories(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
): readonly FrameworkSyntaxProductRow[] {
  if (sourceFile.isDeclarationFile) {
    return [];
  }
  const rows: FrameworkSyntaxProductRow[] = [];
  const bindingCommandClassNames = new Set(
    resourceCarriers
      .filter(
        (carrier) =>
          carrier.resourceKind ===
          FrameworkResourceDefinitionKind.BindingCommand,
      )
      .flatMap((carrier) => [carrier.sourceExportName, carrier.targetName])
      .filter((name): name is string => name !== null),
  );

  const visit = (node: ts.Node, producerName: string): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      if (bindingCommandClassNames.has(node.name.text)) {
        return;
      }
      for (const member of node.members) {
        visit(member, node.name.text);
      }
      return;
    }
    if (ts.isClassExpression(node)) {
      const nextProducerName = node.name?.text ?? producerName;
      for (const member of node.members) {
        visit(member, nextProducerName);
      }
      return;
    }
    if (ts.isMethodDeclaration(node) && node.body !== undefined) {
      const methodName = propertyNameText(node.name);
      visit(
        node.body,
        methodName === null ? producerName : `${producerName}.${methodName}`,
      );
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.body !== undefined) {
      visit(node.body, node.name?.text ?? producerName);
      return;
    }
    if (
      (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
      ts.isBlock(node.body)
    ) {
      visit(node.body, functionExpressionProducerName(node) ?? producerName);
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      const instructionTarget = instructionTargetFromReturnedExpression(
        sourceFile,
        node,
      );
      if (instructionSlotNameFromText(instructionTarget) !== null) {
        rows.push(
          syntaxProductRow(sourceProject, sourceFile, packageId, packageName, {
            producerName,
            producerKind: FrameworkSyntaxProducerKind.InstructionFactory,
            productKind: FrameworkSyntaxProductKind.EmitsInstruction,
            instructionName: instructionNameFromExpressionContext(
              sourceProject,
              node,
            ),
            instructionTarget,
            bindingName: null,
            expression: node,
          }),
        );
      }
    }
    ts.forEachChild(node, (child) => visit(child, producerName));
  };

  visit(sourceFile, sourceFileProducerName(sourceFile));
  return rows;
}

export function syntaxProductRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  values: {
    readonly producerName: string;
    readonly producerKind: FrameworkSyntaxProducerKind;
    readonly productKind: FrameworkSyntaxProductKind;
    readonly resourceCarrier?: FrameworkResourceCarrierRow;
    readonly instructionName: string | null;
    readonly instructionTarget: string | null;
    readonly bindingName: string | null;
    readonly expression: ts.Expression;
  },
): FrameworkSyntaxProductRow {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const span = values.expression.getStart(sourceFile);
  return {
    id: `framework-syntax-product:${packageId}:${values.producerName}:${
      values.productKind
    }:${span}:${
      values.instructionName ??
      values.bindingName ??
      values.instructionTarget ??
      "product"
    }`,
    packageId,
    packageName,
    producerName: values.producerName,
    producerKind: values.producerKind,
    productKind: values.productKind,
    resourceCarrier: values.resourceCarrier,
    instructionName: values.instructionName,
    instructionTarget: values.instructionTarget,
    bindingName: values.bindingName,
    expression: readTypeScriptExpressionFact(
      sourceProject,
      sourceFile,
      values.expression,
    ),
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, values.expression),
  };
}

export function resourceCarrierForProducer(
  resourceCarriers: readonly FrameworkResourceCarrierRow[],
  producerName: string,
  resourceKind: FrameworkResourceDefinitionKind,
): FrameworkResourceCarrierRow | undefined {
  return resourceCarriers.find(
    (row) =>
      row.resourceKind === resourceKind &&
      (row.sourceExportName === producerName ||
        row.targetName === producerName ||
        row.carrierEntry.exportName === producerName ||
        row.carrierEntry.resolvedName === producerName),
  );
}
