import ts from "typescript";

import { type SourceProject } from "../../source/index.js";
import { sourceSpan } from "./framework-support.js";
import {
  calleeTail,
  containingCallbackParameterScope,
  isNestedExecutionBoundary,
  newExpressionsIn,
  objectProperty,
  propertyNameText,
  returnExpressions,
  unwrapExpression,
} from "./framework-ts-utils.js";

export type BindingCreationExpression = ts.NewExpression | ts.CallExpression;

export interface BindingInstructionProductExpression {
  readonly instructionName: string | null;
  readonly instructionTarget: string | null;
  readonly expression: ts.Expression;
}

export function bindingNameFromBindingExpression(
  sourceProject: SourceProject,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isNewExpression(current) || ts.isCallExpression(current)) {
    const bindingName = bindingNameFromCreationExpression(current);
    if (bindingName !== null) {
      return bindingName;
    }
  }
  return bindingNameFromType(sourceProject, current);
}

export function bindingNameFromType(
  sourceProject: SourceProject,
  node: ts.Node,
): string | null {
  const type = sourceProject.checker.getTypeAtLocation(node);
  const symbolName =
    type.aliasSymbol?.getName() ?? type.symbol?.getName() ?? null;
  if (isBindingProductName(symbolName)) {
    return symbolName;
  }
  return bindingNameFromTypeText(
    sourceProject.checker.typeToString(type, node),
  );
}

export function bindingNameFromTypeText(text: string): string | null {
  const match = /\b([A-Z][$_0-9A-Za-z]*Binding)\b/u.exec(text);
  const name = match?.[1] ?? null;
  return isBindingProductName(name) ? name : null;
}

export function collectionFactoryExpressionForCallbackParameter(
  sourceProject: SourceProject,
  identifier: ts.Identifier,
): { readonly bindingName: string; readonly expression: ts.Expression } | null {
  const callback = containingCallbackParameterScope(identifier);
  if (callback === null) {
    return null;
  }
  let current: ts.Node | undefined = callback.parent;
  while (current !== undefined) {
    if (
      ts.isCallExpression(current) &&
      current.arguments.some((argument) => argument === callback)
    ) {
      const expression = unwrapExpression(current.expression);
      if (
        ts.isPropertyAccessExpression(expression) &&
        expression.name.text === "forEach"
      ) {
        const collectionExpression = unwrapExpression(expression.expression);
        const bindingName = bindingNameFromBindingExpression(
          sourceProject,
          collectionExpression,
        );
        return bindingName === null
          ? null
          : {
              bindingName,
              expression: collectionExpression,
            };
      }
    }
    if (isNestedExecutionBoundary(current) && current !== callback) {
      return null;
    }
    current = current.parent;
  }
  return null;
}

export function functionExpressionProducerName(
  node: ts.FunctionExpression | ts.ArrowFunction,
): string | null {
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent)) {
    return propertyNameText(parent.name);
  }
  return null;
}

export function sourceFileProducerName(sourceFile: ts.SourceFile): string {
  return sourceFile.fileName
    .replace(/\\/gu, "/")
    .replace(/^.*\//u, "")
    .replace(/\.tsx?$/u, "");
}

export function instructionNameFromExpressionContext(
  sourceProject: SourceProject,
  expression: ts.Expression,
): string | null {
  let current: ts.Node = expression;
  while (current.parent !== undefined) {
    const parent = current.parent;
    if (
      ts.isAsExpression(parent) ||
      ts.isSatisfiesExpression(parent) ||
      ts.isTypeAssertionExpression(parent)
    ) {
      const name = instructionNameFromTypeNode(parent.type, sourceProject);
      if (name !== null) {
        return name;
      }
    }
    if (ts.isReturnStatement(parent)) {
      const containing = containingFunctionWithReturnType(parent);
      if (containing?.type !== undefined) {
        const name = instructionNameFromTypeNode(
          containing.type,
          sourceProject,
        );
        if (name !== null) {
          return name;
        }
      }
    }
    if (
      ts.isVariableDeclaration(parent) &&
      parent.initializer === current &&
      parent.type !== undefined
    ) {
      const name = instructionNameFromTypeNode(parent.type, sourceProject);
      if (name !== null) {
        return name;
      }
    }
    current = parent;
  }
  return null;
}

export function containingFunctionWithReturnType(
  node: ts.Node,
): (ts.FunctionLikeDeclarationBase & { readonly type?: ts.TypeNode }) | null {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isArrowFunction(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

export function instructionProductExpressionsForBuildMethod(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  buildMethod: ts.MethodDeclaration,
): readonly BindingInstructionProductExpression[] {
  const body = buildMethod.body;
  if (body === undefined) {
    return [];
  }
  const products: BindingInstructionProductExpression[] = [];
  for (const expression of newExpressionsIn(body)) {
    const instructionName = instructionNameFromNewExpression(expression);
    if (instructionName !== null) {
      products.push({
        instructionName,
        instructionTarget: null,
        expression,
      });
    }
  }
  for (const expression of returnExpressions(body)) {
    const instructionName = instructionNameFromReturnedExpression(
      sourceProject,
      buildMethod,
      expression,
    );
    const instructionTarget = instructionTargetFromReturnedExpression(
      sourceFile,
      expression,
    );
    if (instructionName !== null || instructionTarget !== null) {
      products.push({
        instructionName,
        instructionTarget,
        expression,
      });
    }
  }
  return uniqueInstructionProducts(products);
}

export function uniqueInstructionProducts(
  products: readonly BindingInstructionProductExpression[],
): readonly BindingInstructionProductExpression[] {
  const byKey = new Map<string, BindingInstructionProductExpression>();
  for (const product of products) {
    const span = sourceSpan(
      product.expression.getSourceFile(),
      product.expression,
    );
    byKey.set(
      `${span.start}:${span.end}:${product.instructionName ?? ""}:${
        product.instructionTarget ?? ""
      }`,
      product,
    );
  }
  return [...byKey.values()];
}

export function instructionNameFromReturnedExpression(
  sourceProject: SourceProject,
  buildMethod: ts.MethodDeclaration,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isNewExpression(current)) {
    return instructionNameFromNewExpression(current);
  }
  const annotatedName =
    buildMethod.type === undefined
      ? null
      : instructionNameFromTypeNode(buildMethod.type, sourceProject);
  if (annotatedName !== null) {
    return annotatedName;
  }
  return instructionNameFromType(sourceProject, current);
}

export function instructionNameFromNewExpression(
  expression: ts.NewExpression,
): string | null {
  const name = calleeTail(expression.expression);
  return isConcreteInstructionName(name) ? name : null;
}

export function instructionNameFromType(
  sourceProject: SourceProject,
  node: ts.Node,
): string | null {
  const type = sourceProject.checker.getTypeAtLocation(node);
  const symbolName =
    type.aliasSymbol?.getName() ?? type.symbol?.getName() ?? null;
  if (isConcreteInstructionName(symbolName)) {
    return symbolName;
  }
  return instructionNameFromTypeText(
    sourceProject.checker.typeToString(type, node),
  );
}

export function instructionNameFromTypeNode(
  type: ts.TypeNode,
  sourceProject?: SourceProject,
): string | null {
  if (ts.isTypeReferenceNode(type)) {
    const name = entityNameTail(type.typeName);
    if (isConcreteInstructionName(name)) {
      return name;
    }
    if (
      sourceProject !== undefined &&
      isNamedInstructionSubtype(
        sourceProject,
        name,
        sourceProject.checker.getTypeFromTypeNode(type),
      )
    ) {
      return name;
    }
  }
  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
    for (const candidate of type.types) {
      const name = instructionNameFromTypeNode(candidate, sourceProject);
      if (name !== null) {
        return name;
      }
    }
  }
  return instructionNameFromTypeText(type.getText(type.getSourceFile()));
}

export function entityNameTail(name: ts.EntityName): string {
  return ts.isIdentifier(name) ? name.text : name.right.text;
}

export function instructionNameFromTypeText(text: string): string | null {
  const match = /\b([A-Z][$_0-9A-Za-z]*Instruction)\b/u.exec(text);
  const name = match?.[1] ?? null;
  return isConcreteInstructionName(name) ? name : null;
}

export function isConcreteInstructionName(name: string | null): name is string {
  return name !== null && name !== "IInstruction" && /Instruction$/u.test(name);
}

export function isNamedInstructionSubtype(
  sourceProject: SourceProject,
  name: string,
  type: ts.Type,
): boolean {
  return (
    name !== "IInstruction" &&
    instructionTypeExtendsIInstruction(sourceProject, type)
  );
}

export function instructionTypeExtendsIInstruction(
  sourceProject: SourceProject,
  type: ts.Type,
  seen = new Set<ts.Type>(),
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  const symbolName =
    type.aliasSymbol?.getName() ?? type.symbol?.getName() ?? null;
  if (symbolName === "IInstruction") {
    return true;
  }
  const baseTypes = (type as ts.InterfaceType).getBaseTypes?.() ?? [];
  if (
    baseTypes.some((baseType) =>
      instructionTypeExtendsIInstruction(sourceProject, baseType, seen),
    )
  ) {
    return true;
  }
  const declarations =
    (type.aliasSymbol ?? type.symbol)?.getDeclarations() ?? [];
  return declarations.some(
    (declaration) =>
      ts.isInterfaceDeclaration(declaration) &&
      declaration.heritageClauses?.some((clause) =>
        clause.types.some(
          (heritageType) =>
            heritageExpressionTail(heritageType.expression) ===
              "IInstruction" ||
            instructionTypeExtendsIInstruction(
              sourceProject,
              sourceProject.checker.getTypeAtLocation(heritageType.expression),
              seen,
            ),
        ),
      ) === true,
  );
}

export function heritageExpressionTail(
  expression: ts.ExpressionWithTypeArguments["expression"],
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

export function instructionTargetFromReturnedExpression(
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return null;
  }
  const property = objectProperty(current, "type");
  if (property === null || !ts.isPropertyAssignment(property)) {
    return null;
  }
  return unwrapExpression(property.initializer).getText(sourceFile);
}

export function rendererClassExpression(
  call: ts.CallExpression,
): ts.ClassExpression | null {
  const first = call.arguments[0];
  if (first === undefined || ts.isSpreadElement(first)) {
    return null;
  }
  const current = unwrapExpression(first);
  return ts.isClassExpression(current) ? current : null;
}

export function rendererTargetExpression(
  declaration: ts.ClassExpression,
): ts.Expression | null {
  for (const member of declaration.members) {
    if (
      !ts.isPropertyDeclaration(member) ||
      propertyNameText(member.name) !== "target" ||
      member.initializer === undefined
    ) {
      continue;
    }
    return unwrapExpression(member.initializer);
  }
  return null;
}

export function instructionNameFromRenderMethod(
  sourceProject: SourceProject,
  method: ts.MethodDeclaration,
): string | null {
  const namedInstruction = method.parameters.find(
    (parameter) =>
      ts.isIdentifier(parameter.name) && parameter.name.text === "instruction",
  );
  const instructionParameter = namedInstruction ?? method.parameters[2];
  return instructionParameter?.type === undefined
    ? null
    : instructionNameFromTypeNode(instructionParameter.type, sourceProject);
}

export function bindingCreationExpressionsIn(
  node: ts.Node,
): readonly BindingCreationExpression[] {
  const expressions: BindingCreationExpression[] = [];
  const visit = (current: ts.Node): void => {
    if (current !== node && isNestedExecutionBoundary(current)) {
      return;
    }
    if (
      (ts.isNewExpression(current) || ts.isCallExpression(current)) &&
      bindingNameFromCreationExpression(current) !== null
    ) {
      expressions.push(current);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return expressions;
}

export function bindingNameFromCreationExpression(
  expression: BindingCreationExpression,
): string | null {
  if (ts.isNewExpression(expression)) {
    const name = calleeTail(expression.expression);
    return isBindingProductName(name) ? name : null;
  }
  const callee = unwrapExpression(expression.expression);
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === "create") {
    const receiverName = calleeTail(callee.expression);
    return isBindingProductName(receiverName) ? receiverName : null;
  }
  return null;
}

export function isBindingProductName(name: string | null): name is string {
  return name !== null && name !== "Binding" && /Binding$/u.test(name);
}

export function instructionSlotNameFromText(
  text: string | null,
): string | null {
  if (text === null) {
    return null;
  }
  const match = /\b(it[$_0-9A-Za-z]+)\b/u.exec(text);
  const name = match?.[1] ?? null;
  return isInstructionSlotName(name) ? name : null;
}

export function isInstructionSlotName(name: string | null): name is string {
  return name !== null && /^it[A-Z]/u.test(name);
}
