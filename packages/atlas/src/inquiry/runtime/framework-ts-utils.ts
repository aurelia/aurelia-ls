import ts from "typescript";

import {
  EvaluationValueKind,
  StaticEvaluator,
  type ModuleEvaluationResult,
} from "../../evaluation/index.js";
import {
  SourceProjectKeyedMemo,
  type SourceProject,
  type TypeScriptExpressionFact,
} from "../../source/index.js";

const moduleEvaluationByFile = new SourceProjectKeyedMemo<
  string,
  ModuleEvaluationResult
>();

export function localVariableInitializerForIdentifier(
  identifier: ts.Identifier,
): ts.Expression | null {
  const identifierPosition = identifier.getStart(identifier.getSourceFile());
  let scope: ts.Node | undefined = containingExecutionScope(identifier);
  while (scope !== undefined) {
    const initializer = variableInitializerInScope(
      scope,
      identifier.text,
      identifierPosition,
    );
    if (initializer !== null) {
      return initializer;
    }
    scope = containingExecutionScope(scope);
  }
  return null;
}

export function variableInitializerInScope(
  scope: ts.Node,
  name: string,
  beforePosition: number,
): ts.Expression | null {
  let match: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (match !== null) {
      return;
    }
    if (node !== scope && isNestedExecutionBoundary(node)) {
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer !== undefined &&
      node.getStart(node.getSourceFile()) < beforePosition
    ) {
      match = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return match;
}

export function containingExecutionScope(node: ts.Node): ts.Node | undefined {
  let current = node.parent;
  while (current !== undefined) {
    if (
      ts.isSourceFile(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isConstructorDeclaration(current) ||
      ts.isGetAccessorDeclaration(current) ||
      ts.isSetAccessorDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

export function containingCallbackParameterScope(
  identifier: ts.Identifier,
): ts.FunctionExpression | ts.ArrowFunction | null {
  let current: ts.Node | undefined = identifier.parent;
  while (current !== undefined) {
    if (
      (ts.isFunctionExpression(current) || ts.isArrowFunction(current)) &&
      current.parameters.some(
        (parameter) =>
          ts.isIdentifier(parameter.name) &&
          parameter.name.text === identifier.text,
      )
    ) {
      return current;
    }
    if (isNestedExecutionBoundary(current)) {
      return null;
    }
    current = current.parent;
  }
  return null;
}

export function newExpressionsIn(node: ts.Node): readonly ts.NewExpression[] {
  const expressions: ts.NewExpression[] = [];
  const visit = (current: ts.Node): void => {
    if (current !== node && isNestedExecutionBoundary(current)) {
      return;
    }
    if (ts.isNewExpression(current)) {
      expressions.push(current);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return expressions;
}

export function isNestedExecutionBoundary(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isClassLike(node)
  );
}

export function arrayLiteralForExpression(
  _sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[],
): {
  readonly name: string | null;
  readonly sourceFile: ts.SourceFile;
  readonly expression: ts.ArrayLiteralExpression;
} | null {
  const current = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(current)) {
    return { name: null, sourceFile, expression: current };
  }
  const declaration = declarations.find(
    (candidate): candidate is ts.VariableDeclaration =>
      ts.isVariableDeclaration(candidate) &&
      candidate.initializer !== undefined &&
      ts.isArrayLiteralExpression(unwrapExpression(candidate.initializer)),
  );
  if (declaration === undefined || declaration.initializer === undefined) {
    return null;
  }
  return {
    name: ts.isIdentifier(declaration.name) ? declaration.name.text : null,
    sourceFile: declaration.getSourceFile(),
    expression: unwrapExpression(
      declaration.initializer,
    ) as ts.ArrayLiteralExpression,
  };
}

export function expressionForFact(
  sourceFile: ts.SourceFile,
  fact: TypeScriptExpressionFact,
): ts.Expression | null {
  let best: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (
      node.getStart(sourceFile) === fact.span.start &&
      node.getEnd() === fact.span.end &&
      ts.isExpression(node)
    ) {
      if (
        best === null ||
        node.getWidth(sourceFile) <= best.getWidth(sourceFile)
      ) {
        best = node;
      }
    }
    if (
      node.getStart(sourceFile) <= fact.span.start &&
      node.getEnd() >= fact.span.end
    ) {
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return best;
}

export function registrationHelperName(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const callee = unwrapExpression(current.expression);
  if (
    ts.isPropertyAccessExpression(callee) &&
    calleeTail(callee.expression) === "Registration" &&
    isKernelRegistrationMethod(callee.name.text)
  ) {
    return `Registration.${callee.name.text}`;
  }
  const name = calleeTail(current.expression);
  return name !== null && /Registration$/u.test(name) ? name : null;
}

export function isKernelRegistrationMethod(name: string): boolean {
  return [
    "singleton",
    "transient",
    "instance",
    "callback",
    "cachedCallback",
    "aliasTo",
  ].includes(name);
}

export function appTaskHelperName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const callee = unwrapExpression(current.expression);
  return ts.isPropertyAccessExpression(callee) &&
    calleeTail(callee.expression) === "AppTask" &&
    isAppTaskMethod(callee.name.text)
    ? `AppTask.${callee.name.text}`
    : null;
}

export function isAppTaskMethod(name: string): boolean {
  return [
    "creating",
    "hydrating",
    "hydrated",
    "activating",
    "activated",
    "deactivating",
    "deactivated",
    "disposing",
  ].includes(name);
}

export function appTaskKeyExpression(
  call: ts.CallExpression,
): ts.Expression | null {
  const first = call.arguments[0];
  if (first === undefined || ts.isSpreadElement(first)) {
    return null;
  }
  const current = unwrapExpression(first);
  return isFunctionExpressionLike(current) ? null : current;
}

export function variableInitializerForExpression(
  expression: ts.Expression,
  declarations: readonly ts.Declaration[],
): ts.Expression | null {
  const current = unwrapExpression(expression);
  if (!ts.isIdentifier(current)) {
    return null;
  }
  const declaration = declarations.find(
    (candidate): candidate is ts.VariableDeclaration =>
      ts.isVariableDeclaration(candidate) &&
      candidate.initializer !== undefined &&
      candidate.name.getText(candidate.getSourceFile()) === current.text,
  );
  return declaration?.initializer === undefined
    ? null
    : unwrapExpression(declaration.initializer);
}

export function localFunctionDeclarationForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): ts.FunctionDeclaration | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isIdentifier(expression)) {
    return null;
  }
  const symbol = sourceProject.checker.getSymbolAtLocation(expression);
  const declaration = symbol
    ?.getDeclarations()
    ?.find(
      (candidate): candidate is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(candidate) &&
        candidate.body !== undefined &&
        candidate.getSourceFile().fileName === sourceFile.fileName,
    );
  return declaration ?? null;
}

export function returnExpressions(body: ts.Block): readonly ts.Expression[] {
  const expressions: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isClassLike(node)
    ) {
      return;
    }
    if (ts.isReturnStatement(node) && node.expression !== undefined) {
      expressions.push(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return expressions;
}

export function isFunctionExpressionLike(
  node: ts.Node,
): node is ts.FunctionExpression | ts.ArrowFunction {
  return ts.isFunctionExpression(node) || ts.isArrowFunction(node);
}

export function visibleExpressionName(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  if (
    (ts.isClassExpression(current) || ts.isFunctionExpression(current)) &&
    current.name !== undefined
  ) {
    return current.name.text;
  }
  if (ts.isCallExpression(current)) {
    return calleeTail(current.expression);
  }
  return null;
}

export function visibleExpressionNameText(text: string): string | null {
  const match = /[$_A-Za-z][$_0-9A-Za-z]*/u.exec(text);
  return match?.[0] ?? null;
}

export function readStaticTypeNameProperty(
  sourceProject: SourceProject,
  expression: ts.Expression,
  propertyName: string,
): string | null {
  const current = unwrapExpression(expression);
  const property = objectProperty(current, propertyName);
  if (property !== null && ts.isPropertyAssignment(property)) {
    return readStaticStringLikeExpression(
      sourceProject,
      property.initializer,
      true,
    );
  }
  return readTypeStringLiteralProperty(sourceProject, current, propertyName);
}

export function readResourceName(
  sourceProject: SourceProject,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  return (
    readStaticStringProperty(sourceProject, expression, "name") ??
    readEvaluatedStringProperty(sourceProject, current, "name")
  );
}

export function readStaticStringProperty(
  sourceProject: SourceProject,
  expression: ts.Expression,
  propertyName: string,
): string | null {
  const property = objectProperty(unwrapExpression(expression), propertyName);
  if (property === null || !ts.isPropertyAssignment(property)) {
    return null;
  }
  return readStaticStringLikeExpression(
    sourceProject,
    property.initializer,
    false,
  );
}

export function readStaticStringLikeExpression(
  sourceProject: SourceProject,
  expression: ts.Expression,
  allowIdentifierText: boolean,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  const constant = sourceProject.checker.getConstantValue(
    current as
      | ts.EnumMember
      | ts.PropertyAccessExpression
      | ts.ElementAccessExpression,
  );
  if (typeof constant === "string") {
    return constant;
  }
  const type = sourceProject.checker.getTypeAtLocation(current);
  if (type.isStringLiteral()) {
    return type.value;
  }
  return allowIdentifierText && ts.isIdentifier(current) ? current.text : null;
}

export function readStaticBooleanProperty(
  expression: ts.Expression,
  propertyName: string,
): boolean | null {
  const property = objectProperty(unwrapExpression(expression), propertyName);
  if (property === null || !ts.isPropertyAssignment(property)) {
    return null;
  }
  const initializer = unwrapExpression(property.initializer);
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

export function readStaticStringArrayProperty(
  sourceProject: SourceProject,
  expression: ts.Expression,
  propertyName: string,
): readonly string[] {
  const property = objectProperty(unwrapExpression(expression), propertyName);
  if (property === null || !ts.isPropertyAssignment(property)) {
    return [];
  }
  const initializer = unwrapExpression(property.initializer);
  if (!ts.isArrayLiteralExpression(initializer)) {
    return [];
  }
  return initializer.elements
    .map((element) =>
      readStaticStringLikeExpression(sourceProject, element, false),
    )
    .filter((element): element is string => element !== null);
}

export function readTypeStringLiteralProperty(
  sourceProject: SourceProject,
  expression: ts.Expression,
  propertyName: string,
): string | null {
  const type = sourceProject.checker.getTypeAtLocation(
    unwrapExpression(expression),
  );
  const property = type.getProperty(propertyName);
  if (property === undefined) {
    return null;
  }
  const propertyType = sourceProject.checker.getTypeOfSymbolAtLocation(
    property,
    expression,
  );
  if (propertyType.isStringLiteral()) {
    return propertyType.value;
  }
  if (propertyType.isUnion()) {
    const literals = propertyType.types.filter((candidate) =>
      candidate.isStringLiteral(),
    );
    return literals.length === 1 ? literals[0]!.value : null;
  }
  return null;
}

export function readEvaluatedStringProperty(
  sourceProject: SourceProject,
  expression: ts.Expression,
  propertyName: string,
): string | null {
  const sourceFile = expression.getSourceFile();
  const moduleEvaluation = readModuleEvaluation(sourceProject, sourceFile);
  const evaluator = new StaticEvaluator(sourceProject);
  const result = evaluator.evaluateExpressionInEnvironment(
    expression,
    moduleEvaluation.environment,
    sourceFile.fileName,
  );
  if (result.value.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const property = result.value.properties.get(propertyName);
  return property?.value.kind === EvaluationValueKind.String
    ? property.value.value
    : null;
}

export function readModuleEvaluation(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): ModuleEvaluationResult {
  return moduleEvaluationByFile.read(sourceProject, sourceFile.fileName, () => {
    const evaluator = new StaticEvaluator(sourceProject);
    return evaluator.evaluateSourceFile(sourceFile, sourceFile.fileName);
  });
}

export function objectProperty(
  expression: ts.Expression,
  propertyName: string,
): ts.ObjectLiteralElementLike | null {
  if (!ts.isObjectLiteralExpression(expression)) {
    return null;
  }
  return (
    expression.properties.find(
      (property) => propertyNameText(property.name) === propertyName,
    ) ?? null
  );
}

export function propertyNameText(
  name: ts.PropertyName | undefined,
): string | null {
  if (name === undefined) {
    return null;
  }
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return null;
}

export function hasStaticModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    ts
      .getModifiers(node)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ===
      true
  );
}

export function calleeTail(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

export function targetNameFromExpression(
  sourceProject: SourceProject,
  expression: ts.Expression | undefined,
): string | null {
  if (expression === undefined) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (
    (ts.isClassExpression(current) || ts.isFunctionExpression(current)) &&
    current.name !== undefined
  ) {
    return current.name.text;
  }
  if (ts.isObjectLiteralExpression(current)) {
    return readStaticStringProperty(sourceProject, current, "name");
  }
  return null;
}

export function callExpressionsIn(node: ts.Node): readonly ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (current: ts.Node): void => {
    if (ts.isCallExpression(current)) {
      calls.push(current);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return calls;
}

export function callReturnTypeText(
  checker: ts.TypeChecker,
  call: ts.CallExpression,
): string {
  const signature = checker.getResolvedSignature(call);
  const type =
    signature === undefined
      ? checker.getTypeAtLocation(call)
      : checker.getReturnTypeOfSignature(signature);
  return checker.typeToString(type, call);
}

export function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}
