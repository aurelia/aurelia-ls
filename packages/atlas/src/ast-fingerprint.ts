import ts from "typescript";
import { unwrapExpression } from "./source/index.js";
import { stableTextFingerprint } from "./text-fingerprint.js";

type CanonicalBindingKind = "param" | "local" | "function";

type FunctionBodyNode =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

/** Fingerprint a function body by canonical AST/control-flow shape rather than raw text. */
export function functionBodyShapeFingerprint(
  node: FunctionBodyNode,
  sourceFile: ts.SourceFile,
): string {
  const canonical = canonicalFunctionLike(node, sourceFile);
  return stableTextFingerprint(canonical);
}

class CanonicalScope {
  readonly #bindings = new Map<string, string>();
  readonly #counters: Map<CanonicalBindingKind, number>;

  public constructor(
    readonly parent: CanonicalScope | null = null,
    counters?: Map<CanonicalBindingKind, number>,
  ) {
    // Bindings are lexical, but generated ids must be unique across descendants.
    this.#counters = counters ?? (parent === null ? new Map() : parent.#counters);
  }

  public child(): CanonicalScope {
    return new CanonicalScope(this, this.#counters);
  }

  public declare(name: string, kind: CanonicalBindingKind): string {
    const existing = this.#bindings.get(name);
    if (existing !== undefined) {
      return existing;
    }
    const next = this.#counters.get(kind) ?? 0;
    this.#counters.set(kind, next + 1);
    const canonical = `${kind}:${next}`;
    this.#bindings.set(name, canonical);
    return canonical;
  }

  public resolve(name: string): string | null {
    return this.#bindings.get(name) ?? this.parent?.resolve(name) ?? null;
  }
}

function canonicalFunctionLike(
  node: FunctionBodyNode,
  sourceFile: ts.SourceFile,
): string {
  return canonicalFunctionLikeInScope(node, sourceFile, new CanonicalScope());
}

function canonicalStatements(
  statements: readonly ts.Statement[],
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): string {
  const parts: string[] = [];
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index]!;
    const next = statements[index + 1];
    const afterNext = statements[index + 2];
    const aliasReturn = foldedAliasReturn(statement, next, sourceFile, scope);
    if (aliasReturn != null) {
      parts.push(aliasReturn.text);
      index += aliasReturn.consumed;
      continue;
    }
    const assignedConditionalReturn = foldedAssignedConditionalReturn(
      statement,
      next,
      afterNext,
      sourceFile,
      scope,
    );
    if (assignedConditionalReturn != null) {
      parts.push(assignedConditionalReturn.text);
      index += assignedConditionalReturn.consumed;
      continue;
    }
    const folded = foldedIfCompletion(statement, next, sourceFile, scope);
    if (folded != null) {
      parts.push(folded.text);
      index += folded.consumedNext ? 1 : 0;
      continue;
    }
    parts.push(canonicalStatement(statement, sourceFile, scope));
  }
  return `block(${parts.join(";")})`;
}

function foldedIfCompletion(
  statement: ts.Statement,
  next: ts.Statement | undefined,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): { readonly text: string; readonly consumedNext: boolean } | null {
  if (!ts.isIfStatement(statement)) {
    return null;
  }

  const thenCompletion = statementCompletion(statement.thenStatement);
  const elseCompletion = statement.elseStatement == null
    ? null
    : statementCompletion(statement.elseStatement);
  if (
    thenCompletion != null &&
    elseCompletion != null &&
    thenCompletion.kind === elseCompletion.kind
  ) {
    return {
      text: canonicalCompletionText(thenCompletion.kind, canonicalConditionalExpression(
        statement.expression,
        thenCompletion.expression,
        elseCompletion.expression,
        sourceFile,
        scope,
      )),
      consumedNext: false,
    };
  }

  const nextCompletion = next == null ? null : statementCompletion(next);
  if (
    thenCompletion != null &&
    statement.elseStatement == null &&
    nextCompletion != null &&
    thenCompletion.kind === nextCompletion.kind &&
    thenCompletion.kind !== "expr"
  ) {
    return {
      text: canonicalCompletionText(thenCompletion.kind, canonicalConditionalExpression(
        statement.expression,
        thenCompletion.expression,
        nextCompletion.expression,
        sourceFile,
        scope,
      )),
      consumedNext: true,
    };
  }

  return null;
}

function canonicalStatement(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): string {
  if (ts.isBlock(statement)) {
    return canonicalStatements(statement.statements, sourceFile, scope.child());
  }
  if (ts.isFunctionDeclaration(statement)) {
    const name = statement.name == null
      ? "<anonymous>"
      : scope.declare(statement.name.text, "function");
    return `function-declaration(${name}=${canonicalFunctionLikeWithParentScope(statement, sourceFile, scope)})`;
  }
  if (ts.isReturnStatement(statement)) {
    return `return(${statement.expression == null ? "" : canonicalExpression(statement.expression, sourceFile, scope)})`;
  }
  if (ts.isThrowStatement(statement)) {
    return `throw(${canonicalExpression(statement.expression, sourceFile, scope)})`;
  }
  if (ts.isIfStatement(statement)) {
    const elseText = statement.elseStatement == null
      ? ""
      : canonicalStatement(unwrapSingleStatementBlock(statement.elseStatement), sourceFile, scope.child());
    return [
      "if(",
      canonicalExpression(statement.expression, sourceFile, scope),
      ")",
      canonicalStatement(unwrapSingleStatementBlock(statement.thenStatement), sourceFile, scope.child()),
      "else(",
      elseText,
      ")",
    ].join("");
  }
  if (ts.isExpressionStatement(statement)) {
    return `expr(${canonicalExpression(statement.expression, sourceFile, scope)})`;
  }
  if (ts.isVariableStatement(statement)) {
    return `var(${statement.declarationList.declarations.map((declaration) =>
      `${canonicalBindingName(declaration.name, sourceFile, scope, "local")}=${
        declaration.initializer == null ? "" : canonicalExpression(declaration.initializer, sourceFile, scope)
      }`
    ).join(",")})`;
  }
  return canonicalNode(statement, sourceFile, scope);
}

function canonicalExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): string {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return scope.resolve(current.text) ?? `id:${current.text}`;
  }
  if (ts.isStringLiteralLike(current)) {
    return `str:${current.text}`;
  }
  if (ts.isNumericLiteral(current)) {
    return `num:${current.text}`;
  }
  if (ts.isRegularExpressionLiteral(current)) {
    return `regexp:${current.text}`;
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword || current.kind === ts.SyntaxKind.FalseKeyword) {
    return current.kind === ts.SyntaxKind.TrueKeyword ? "bool:true" : "bool:false";
  }
  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return "null";
  }
  if (current.kind === ts.SyntaxKind.ThisKeyword) {
    return "this";
  }
  if (current.kind === ts.SyntaxKind.SuperKeyword) {
    return "super";
  }
  if (ts.isConditionalExpression(current)) {
    return canonicalConditionalExpression(
      current.condition,
      current.whenTrue,
      current.whenFalse,
      sourceFile,
      scope,
    );
  }
  if (ts.isPropertyAccessExpression(current)) {
    return `prop(${canonicalExpression(current.expression, sourceFile, scope)},${current.name.text})`;
  }
  if (ts.isElementAccessExpression(current)) {
    return `elem(${canonicalExpression(current.expression, sourceFile, scope)},${
      current.argumentExpression == null ? "" : canonicalExpression(current.argumentExpression, sourceFile, scope)
    })`;
  }
  if (ts.isCallExpression(current)) {
    return `call(${canonicalExpression(current.expression, sourceFile, scope)},${current.arguments.map((argument) =>
      canonicalExpression(argument, sourceFile, scope)
    ).join(",")})`;
  }
  if (ts.isNewExpression(current)) {
    return `new(${canonicalExpression(current.expression, sourceFile, scope)},${(current.arguments ?? []).map((argument) =>
      canonicalExpression(argument, sourceFile, scope)
    ).join(",")})`;
  }
  if (ts.isBinaryExpression(current)) {
    return `bin(${ts.tokenToString(current.operatorToken.kind) ?? ts.SyntaxKind[current.operatorToken.kind]},${canonicalExpression(current.left, sourceFile, scope)},${canonicalExpression(current.right, sourceFile, scope)})`;
  }
  if (ts.isPrefixUnaryExpression(current)) {
    return `prefix(${ts.tokenToString(current.operator) ?? ts.SyntaxKind[current.operator]},${canonicalExpression(current.operand, sourceFile, scope)})`;
  }
  if (ts.isPostfixUnaryExpression(current)) {
    return `postfix(${ts.tokenToString(current.operator) ?? ts.SyntaxKind[current.operator]},${canonicalExpression(current.operand, sourceFile, scope)})`;
  }
  if (ts.isArrayLiteralExpression(current)) {
    return `array(${current.elements.map((element) => canonicalExpression(element, sourceFile, scope)).join(",")})`;
  }
  if (ts.isObjectLiteralExpression(current)) {
    return `object(${current.properties.map((property) => canonicalObjectLiteralElement(property, sourceFile, scope)).join(",")})`;
  }
  if (ts.isTemplateExpression(current)) {
    return `template(${current.head.text};${current.templateSpans.map((span) =>
      `${canonicalExpression(span.expression, sourceFile, scope)}:${span.literal.text}`
    ).join(";")})`;
  }
  if (ts.isTaggedTemplateExpression(current)) {
    return `tagged-template(${canonicalExpression(current.tag, sourceFile, scope)},${canonicalNode(current.template, sourceFile, scope)})`;
  }
  if (ts.isAwaitExpression(current)) {
    return `await(${canonicalExpression(current.expression, sourceFile, scope)})`;
  }
  if (ts.isYieldExpression(current)) {
    return `yield(${current.asteriskToken == null ? "" : "*"}${current.expression == null ? "" : canonicalExpression(current.expression, sourceFile, scope)})`;
  }
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return canonicalFunctionLikeWithParentScope(current, sourceFile, scope);
  }
  return canonicalNode(current, sourceFile, scope);
}

function canonicalConditionalExpression(
  condition: ts.Expression,
  whenTrue: ts.Expression,
  whenFalse: ts.Expression,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): string {
  const unwrapped = unwrapExpression(condition);
  if (ts.isPrefixUnaryExpression(unwrapped) && unwrapped.operator === ts.SyntaxKind.ExclamationToken) {
    return `conditional(${canonicalExpression(unwrapped.operand, sourceFile, scope)},${canonicalExpression(whenFalse, sourceFile, scope)},${canonicalExpression(whenTrue, sourceFile, scope)})`;
  }
  return `conditional(${canonicalExpression(unwrapped, sourceFile, scope)},${canonicalExpression(whenTrue, sourceFile, scope)},${canonicalExpression(whenFalse, sourceFile, scope)})`;
}

function canonicalObjectLiteralElement(
  element: ts.ObjectLiteralElementLike,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): string {
  if (ts.isPropertyAssignment(element)) {
    return `prop:${propertyName(element.name, sourceFile, scope)}=${canonicalExpression(element.initializer, sourceFile, scope)}`;
  }
  if (ts.isShorthandPropertyAssignment(element)) {
    return `shorthand:${element.name.text}=${canonicalExpression(element.name, sourceFile, scope)}`;
  }
  if (ts.isSpreadAssignment(element)) {
    return `spread:${canonicalExpression(element.expression, sourceFile, scope)}`;
  }
  if (ts.isMethodDeclaration(element)) {
    return `method:${propertyName(element.name, sourceFile, scope)}=${canonicalFunctionLikeWithParentScope(element, sourceFile, scope)}`;
  }
  if (ts.isGetAccessorDeclaration(element) || ts.isSetAccessorDeclaration(element)) {
    return `accessor:${propertyName(element.name, sourceFile, scope)}=${canonicalFunctionLikeWithParentScope(element, sourceFile, scope)}`;
  }
  return canonicalNode(element, sourceFile, scope);
}

interface StatementCompletion {
  readonly kind: "return" | "throw" | "expr";
  readonly expression: ts.Expression;
}

function statementCompletion(statement: ts.Statement): StatementCompletion | null {
  const current = unwrapSingleStatementBlock(statement);
  if (ts.isReturnStatement(current)) {
    return current.expression == null ? null : { kind: "return", expression: current.expression };
  }
  if (ts.isThrowStatement(current)) {
    return { kind: "throw", expression: current.expression };
  }
  if (ts.isExpressionStatement(current)) {
    return { kind: "expr", expression: current.expression };
  }
  return null;
}

function unwrapSingleStatementBlock(statement: ts.Statement): ts.Statement {
  return ts.isBlock(statement) && statement.statements.length === 1
    ? statement.statements[0]!
    : statement;
}

function foldedAliasReturn(
  statement: ts.Statement,
  next: ts.Statement | undefined,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): { readonly text: string; readonly consumed: number } | null {
  const aliasInitializer = singleInitializedIdentifierDeclaration(statement);
  if (aliasInitializer == null || next == null) {
    return null;
  }
  const returnedIdentifier = returnedIdentifierName(next);
  if (returnedIdentifier !== aliasInitializer.name) {
    return null;
  }
  return {
    text: `return(${canonicalExpression(aliasInitializer.initializer, sourceFile, scope)})`,
    consumed: 1,
  };
}

function foldedAssignedConditionalReturn(
  statement: ts.Statement,
  next: ts.Statement | undefined,
  afterNext: ts.Statement | undefined,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): { readonly text: string; readonly consumed: number } | null {
  const declarationName = singleUninitializedIdentifierDeclaration(statement);
  if (declarationName == null || next == null || afterNext == null || !ts.isIfStatement(next)) {
    return null;
  }
  const returnedIdentifier = returnedIdentifierName(afterNext);
  if (returnedIdentifier !== declarationName) {
    return null;
  }
  const thenAssignment = branchAssignmentToIdentifier(next.thenStatement, declarationName);
  const elseAssignment = next.elseStatement == null
    ? null
    : branchAssignmentToIdentifier(next.elseStatement, declarationName);
  if (thenAssignment == null || elseAssignment == null) {
    return null;
  }
  return {
    text: `return(${canonicalConditionalExpression(
      next.expression,
      thenAssignment,
      elseAssignment,
      sourceFile,
      scope,
    )})`,
    consumed: 2,
  };
}

function canonicalFunctionLikeWithParentScope(
  node: FunctionBodyNode,
  sourceFile: ts.SourceFile,
  parentScope: CanonicalScope,
): string {
  return canonicalFunctionLikeInScope(node, sourceFile, parentScope.child());
}

function canonicalFunctionLikeInScope(
  node: FunctionBodyNode,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): string {
  const parameters = "parameters" in node
    ? node.parameters.map((parameter) => canonicalParameter(parameter, sourceFile, scope)).join(",")
    : "";
  const flags = canonicalFunctionFlags(node);
  if (!("body" in node) || node.body == null) {
    return `function(${flags};${parameters})${canonicalNode(node, sourceFile, scope)}`;
  }
  if (ts.isBlock(node.body)) {
    return `function(${flags};${parameters})${canonicalStatements(node.body.statements, sourceFile, scope)}`;
  }
  return `function(${flags};${parameters})return(${canonicalExpression(node.body, sourceFile, scope)})`;
}

function canonicalParameter(
  parameter: ts.ParameterDeclaration,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
): string {
  const initializer = parameter.initializer == null
    ? ""
    : canonicalExpression(parameter.initializer, sourceFile, scope);
  return `${parameter.dotDotDotToken == null ? "" : "..."}${
    canonicalBindingName(parameter.name, sourceFile, scope, "param")
  }=${initializer}`;
}

function canonicalBindingName(
  name: ts.BindingName,
  sourceFile: ts.SourceFile,
  scope: CanonicalScope,
  kind: CanonicalBindingKind,
): string {
  if (ts.isIdentifier(name)) {
    return scope.declare(name.text, kind);
  }
  if (ts.isObjectBindingPattern(name)) {
    return `object-pattern(${name.elements.map((element) =>
      `${element.dotDotDotToken == null ? "" : "..."}${element.propertyName == null ? "" : `${propertyName(element.propertyName, sourceFile, scope)}:`}${
        canonicalBindingName(element.name, sourceFile, scope, kind)
      }${element.initializer == null ? "" : `=${canonicalExpression(element.initializer, sourceFile, scope)}`}`
    ).join(",")})`;
  }
  if (ts.isArrayBindingPattern(name)) {
    return `array-pattern(${name.elements.map((element) => {
      if (ts.isOmittedExpression(element)) {
        return "";
      }
      return `${element.dotDotDotToken == null ? "" : "..."}${canonicalBindingName(element.name, sourceFile, scope, kind)}${
        element.initializer == null ? "" : `=${canonicalExpression(element.initializer, sourceFile, scope)}`
      }`;
    }).join(",")})`;
  }
  return canonicalNode(name, sourceFile, scope);
}

function propertyName(name: ts.PropertyName, sourceFile: ts.SourceFile, scope: CanonicalScope): string {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  if (ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name)) {
    return `computed:${canonicalExpression(name.expression, sourceFile, scope)}`;
  }
  return canonicalNode(name, sourceFile, scope);
}

function canonicalNode(node: ts.Node, sourceFile: ts.SourceFile, scope: CanonicalScope): string {
  const children: string[] = [];
  node.forEachChild((child) => {
    children.push(ts.isExpression(child)
      ? canonicalExpression(child, sourceFile, scope)
      : ts.isStatement(child)
        ? canonicalStatement(child, sourceFile, scope)
        : canonicalNode(child, sourceFile, scope));
  });
  return `${ts.SyntaxKind[node.kind]}(${children.join(",")})`;
}

function canonicalCompletionText(kind: StatementCompletion["kind"], expressionText: string): string {
  return kind === "expr" ? `expr(${expressionText})` : `${kind}(${expressionText})`;
}

function singleInitializedIdentifierDeclaration(
  statement: ts.Statement,
): { readonly name: string; readonly initializer: ts.Expression } | null {
  if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
    return null;
  }
  const declaration = statement.declarationList.declarations[0]!;
  if (!ts.isIdentifier(declaration.name) || declaration.initializer == null) {
    return null;
  }
  return { name: declaration.name.text, initializer: declaration.initializer };
}

function singleUninitializedIdentifierDeclaration(statement: ts.Statement): string | null {
  if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
    return null;
  }
  const declaration = statement.declarationList.declarations[0]!;
  if (!ts.isIdentifier(declaration.name) || declaration.initializer != null) {
    return null;
  }
  return declaration.name.text;
}

function returnedIdentifierName(statement: ts.Statement): string | null {
  const current = unwrapSingleStatementBlock(statement);
  if (!ts.isReturnStatement(current) || current.expression == null) {
    return null;
  }
  const expression = unwrapExpression(current.expression);
  return ts.isIdentifier(expression) ? expression.text : null;
}

function branchAssignmentToIdentifier(
  statement: ts.Statement,
  name: string,
): ts.Expression | null {
  const current = unwrapSingleStatementBlock(statement);
  if (!ts.isExpressionStatement(current)) {
    return null;
  }
  const expression = unwrapExpression(current.expression);
  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken
  ) {
    return null;
  }
  const left = unwrapExpression(expression.left);
  if (!ts.isIdentifier(left) || left.text !== name) {
    return null;
  }
  return expression.right;
}

function canonicalFunctionFlags(node: FunctionBodyNode): string {
  const flags: string[] = [];
  if ("modifiers" in node && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true) {
    flags.push("async");
  }
  if ("asteriskToken" in node && node.asteriskToken != null) {
    flags.push("generator");
  }
  return flags.join("|");
}
