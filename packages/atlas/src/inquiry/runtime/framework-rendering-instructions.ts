import ts from "typescript";

import {
  readTypeScriptExpressionFact,
  requiredSourceFileIdentity,
  sourceRangeForSourceFileNode,
  SourceProjectKeyedMemo,
  SourceProjectMemo,
  SourceDeclarationKind,
  type SourceFileIdentity,
  type SourceProject,
} from "../../source/index.js";
import {
  FrameworkSyntaxProducerKind,
  FrameworkSyntaxProductKind,
} from "../../framework/index.js";
import {
  type FrameworkInstructionDeclarationRow,
  type FrameworkInstructionDispatchRow,
  type FrameworkInstructionSlotRow,
  type FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  frameworkPackageIdsForFilters,
  readFrameworkPackageNames,
} from "./framework-package-exports.js";
import {
  entityNameTail,
  instructionSlotNameFromText,
  isInstructionSlotName,
} from "./framework-rendering-inspection.js";
import { readFrameworkSyntaxProducts } from "./framework-rendering-syntax.js";
import { uniqueById } from "./framework-symbols.js";
import {
  calleeTail,
  propertyNameText,
  unwrapExpression,
} from "./framework-ts-utils.js";

const instructionSlotRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkInstructionSlotRow[]
>();
const instructionDispatchRows = new SourceProjectMemo<
  readonly FrameworkInstructionDispatchRow[]
>();

export function readFrameworkInstructionSlots(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkInstructionSlotRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const syntaxProducts = readFrameworkSyntaxProducts(sourceProject, {});
  const rows = packageIds.flatMap((packageId) =>
    readFrameworkInstructionSlotPackageRows(
      sourceProject,
      packageId,
      packageNames.get(packageId) ?? packageId,
      syntaxProducts,
    ),
  );
  return rows
    .filter(
      (row) =>
        filters.slotName === undefined || row.slotName === filters.slotName,
    )
    .filter(
      (row) =>
        filters.instructionName === undefined ||
        row.instructionDeclarations.some(
          (declaration) =>
            declaration.instructionName === filters.instructionName,
        ),
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.slotName.includes(filters.query) ||
        row.instructionDeclarations.some((declaration) =>
          declaration.instructionName.includes(filters.query!),
        ) ||
        row.syntaxProducts.some(
          (product) =>
            product.producerName.includes(filters.query!) ||
            product.instructionName?.includes(filters.query!) === true ||
            product.bindingName?.includes(filters.query!) === true,
        ),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        (left.slotValue ?? Number.MAX_SAFE_INTEGER) -
          (right.slotValue ?? Number.MAX_SAFE_INTEGER) ||
        left.slotName.localeCompare(right.slotName),
    );
}

export function readFrameworkInstructionDispatches(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkInstructionDispatchRow[] {
  const rows = instructionDispatchRows.read(sourceProject, () =>
    createFrameworkInstructionDispatchRows(sourceProject),
  );
  return rows
    .filter(
      (row) =>
        filters.packageId === undefined || row.packageId === filters.packageId,
    )
    .filter(
      (row) =>
        filters.slotName === undefined || row.slotName === filters.slotName,
    )
    .filter(
      (row) =>
        filters.instructionName === undefined ||
        row.instructionName === filters.instructionName,
    )
    .filter(
      (row) =>
        filters.query === undefined ||
        row.slotName.includes(filters.query) ||
        row.rendererName.includes(filters.query) ||
        row.instructionName?.includes(filters.query) === true,
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        (left.slotValue ?? Number.MAX_SAFE_INTEGER) -
          (right.slotValue ?? Number.MAX_SAFE_INTEGER) ||
        left.slotName.localeCompare(right.slotName) ||
        left.rendererName.localeCompare(right.rendererName),
    );
}

export function createFrameworkInstructionDispatchRows(
  sourceProject: SourceProject,
): readonly FrameworkInstructionDispatchRow[] {
  const rows: FrameworkInstructionDispatchRow[] = [];
  for (const slot of readFrameworkInstructionSlots(sourceProject, {})) {
    for (const product of slot.syntaxProducts) {
      if (
        product.producerKind !== FrameworkSyntaxProducerKind.Renderer ||
        product.productKind !== FrameworkSyntaxProductKind.HandlesInstruction
      ) {
        continue;
      }
      rows.push({
        id: `framework-instruction-dispatch:${product.packageId}:${slot.slotName}:${product.producerName}:${product.source.start.line}:${product.source.start.character}`,
        packageId: product.packageId,
        packageName: product.packageName,
        slotName: slot.slotName,
        slotValue: slot.slotValue,
        instructionName: product.instructionName,
        rendererName: product.producerName,
        rendererProduct: product,
        instructionSlot: slot,
        source: product.source,
      });
    }
  }
  return uniqueById(rows);
}

export function readFrameworkInstructionSlotPackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  syntaxProducts: readonly FrameworkSyntaxProductRow[],
): readonly FrameworkInstructionSlotRow[] {
  return instructionSlotRowsByPackage.read(sourceProject, packageId, () => {
    const sourceFiles = sourceProject
      .ownedSourceFiles()
      .filter(
        (sourceFile) =>
          !sourceFile.isDeclarationFile &&
          sourceProject.packageForFileName(sourceFile.fileName)?.id ===
            packageId,
      );
    const declarationsBySlot = instructionDeclarationsBySlot(
      sourceProject,
      sourceFiles,
    );
    return uniqueById(
      sourceFiles.flatMap((sourceFile) =>
        instructionSlotVariablesIn(sourceFile)
          .map((declaration) =>
            instructionSlotRow(
              sourceProject,
              sourceFile,
              packageId,
              packageName,
              declaration,
              declarationsBySlot,
              syntaxProducts,
            ),
          )
          .filter((row): row is FrameworkInstructionSlotRow => row !== null),
      ),
    );
  });
}

export function instructionSlotVariablesIn(
  sourceFile: ts.SourceFile,
): readonly (ts.VariableDeclaration & {
  readonly name: ts.Identifier;
  readonly initializer: ts.Expression;
})[] {
  const declarations: (ts.VariableDeclaration & {
    readonly name: ts.Identifier;
    readonly initializer: ts.Expression;
  })[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer !== undefined &&
        isInstructionSlotName(declaration.name.text)
      ) {
        declarations.push(
          declaration as ts.VariableDeclaration & {
            readonly name: ts.Identifier;
            readonly initializer: ts.Expression;
          },
        );
      }
    }
  }
  return declarations;
}

export function instructionDeclarationsBySlot(
  sourceProject: SourceProject,
  sourceFiles: readonly ts.SourceFile[],
): ReadonlyMap<string, readonly FrameworkInstructionDeclarationRow[]> {
  const bySlot = new Map<string, FrameworkInstructionDeclarationRow[]>();
  for (const sourceFile of sourceFiles) {
    const file = requiredSourceFileIdentity(sourceProject, sourceFile);
    for (const statement of sourceFile.statements) {
      const declaration = instructionDeclarationForStatement(
        sourceFile,
        file,
        statement,
      );
      if (declaration === null) {
        continue;
      }
      const rows = bySlot.get(declaration.slotName) ?? [];
      rows.push(declaration.row);
      bySlot.set(declaration.slotName, rows);
    }
  }
  return bySlot;
}

export function instructionDeclarationForStatement(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  statement: ts.Statement,
): {
  readonly slotName: string;
  readonly row: FrameworkInstructionDeclarationRow;
} | null {
  if (ts.isInterfaceDeclaration(statement)) {
    const typeProperty = statement.members.find(
      (member): member is ts.PropertySignature =>
        ts.isPropertySignature(member) &&
        propertyNameText(member.name) === "type",
    );
    const slotName =
      typeProperty?.type === undefined
        ? null
        : instructionSlotNameFromTypeNode(typeProperty.type);
    return slotName === null || typeProperty === undefined
      ? null
      : {
          slotName,
          row: instructionDeclarationRow(
            sourceFile,
            file,
            statement.name.text,
            SourceDeclarationKind.Interface,
            statement,
            typeProperty,
          ),
        };
  }
  if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
    const typeProperty = statement.members.find(
      (member): member is ts.PropertyDeclaration =>
        ts.isPropertyDeclaration(member) &&
        propertyNameText(member.name) === "type",
    );
    const slotName =
      typeProperty === undefined
        ? null
        : instructionSlotNameFromPropertyDeclaration(typeProperty);
    return slotName === null || typeProperty === undefined
      ? null
      : {
          slotName,
          row: instructionDeclarationRow(
            sourceFile,
            file,
            statement.name.text,
            SourceDeclarationKind.Class,
            statement,
            typeProperty,
          ),
        };
  }
  if (
    ts.isTypeAliasDeclaration(statement) &&
    ts.isTypeLiteralNode(statement.type)
  ) {
    const typeProperty = statement.type.members.find(
      (member): member is ts.PropertySignature =>
        ts.isPropertySignature(member) &&
        propertyNameText(member.name) === "type",
    );
    const slotName =
      typeProperty?.type === undefined
        ? null
        : instructionSlotNameFromTypeNode(typeProperty.type);
    return slotName === null || typeProperty === undefined
      ? null
      : {
          slotName,
          row: instructionDeclarationRow(
            sourceFile,
            file,
            statement.name.text,
            SourceDeclarationKind.TypeAlias,
            statement,
            typeProperty,
          ),
        };
  }
  return null;
}

export function instructionDeclarationRow(
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  instructionName: string,
  declarationKind: SourceDeclarationKind,
  declaration: ts.Node,
  typeProperty: ts.Node,
): FrameworkInstructionDeclarationRow {
  return {
    instructionName,
    declarationKind,
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, declaration),
    typePropertySource: sourceRangeForSourceFileNode(file.repoPath, sourceFile, typeProperty),
  };
}

export function instructionSlotNameFromPropertyDeclaration(
  property: ts.PropertyDeclaration,
): string | null {
  if (property.initializer !== undefined) {
    const slotName = instructionSlotNameFromExpression(property.initializer);
    if (slotName !== null) {
      return slotName;
    }
  }
  return property.type === undefined
    ? null
    : instructionSlotNameFromTypeNode(property.type);
}

export function instructionSlotNameFromTypeNode(
  type: ts.TypeNode,
): string | null {
  if (ts.isTypeQueryNode(type)) {
    const name = entityNameTail(type.exprName);
    return isInstructionSlotName(name) ? name : null;
  }
  return null;
}

export function instructionSlotNameFromExpression(
  expression: ts.Expression,
): string | null {
  const name = calleeTail(expression);
  return isInstructionSlotName(name) ? name : null;
}

export function instructionSlotRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.VariableDeclaration & {
    readonly name: ts.Identifier;
    readonly initializer: ts.Expression;
  },
  declarationsBySlot: ReadonlyMap<
    string,
    readonly FrameworkInstructionDeclarationRow[]
  >,
  syntaxProducts: readonly FrameworkSyntaxProductRow[],
): FrameworkInstructionSlotRow | null {
  const slotValue = readStaticNumberExpression(
    sourceProject,
    declaration.initializer,
  );
  if (slotValue === null) {
    return null;
  }
  const slotName = declaration.name.text;
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const declarations = declarationsBySlot.get(slotName) ?? [];
  const declarationNames = new Set(
    declarations.map((entry) => entry.instructionName),
  );
  const products = syntaxProducts.filter(
    (product) =>
      instructionSlotNameFromText(product.instructionTarget) === slotName ||
      (product.instructionName !== null &&
        declarationNames.has(product.instructionName)),
  );
  const span = declaration.getStart(sourceFile);
  return {
    id: `framework-instruction-slot:${packageId}:${slotName}:${span}`,
    packageId,
    packageName,
    slotName,
    slotValue,
    valueExpression: readTypeScriptExpressionFact(
      sourceProject,
      sourceFile,
      declaration.initializer,
    ),
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, declaration),
    instructionDeclarations: declarations,
    syntaxProducts: products,
  };
}

export function readStaticNumberExpression(
  sourceProject: SourceProject,
  expression: ts.Expression,
): number | null {
  const current = unwrapExpression(expression);
  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }
  if (
    ts.isPrefixUnaryExpression(current) &&
    current.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(current.operand)
  ) {
    return -Number(current.operand.text);
  }
  const constant = sourceProject.checker.getConstantValue(
    current as
      | ts.EnumMember
      | ts.PropertyAccessExpression
      | ts.ElementAccessExpression,
  );
  if (typeof constant === "number") {
    return constant;
  }
  const type = sourceProject.checker.getTypeAtLocation(current);
  return (type.flags & ts.TypeFlags.NumberLiteral) !== 0
    ? (type as ts.NumberLiteralType).value
    : null;
}
