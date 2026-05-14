import ts from "typescript";

import { propertyNameText } from "./semantic-surface/index.js";
import type { TypeScriptEnumUseRole } from "./enum-usage.js";

interface EnumRawValueContextProfiler {
  measureRepeated<T>(
    phase: string,
    summary: string,
    read: () => T,
  ): T;
}

const emptyEnumNameSet: ReadonlySet<string> = new Set<string>();

/** Resolves checker-backed enum context for raw literals that overlap enum member values. */
export class TypeScriptEnumRawValueContext {
  readonly #checker: ts.TypeChecker;
  readonly #profiler: EnumRawValueContextProfiler;
  readonly #enumNamesForType: (type: ts.Type) => ReadonlySet<string>;
  readonly #callArgumentContextualEnumNames = new WeakMap<
    ts.Expression,
    ReadonlySet<string>
  >();
  readonly #callExpressionSignatures = new WeakMap<
    ts.CallExpression | ts.NewExpression,
    ts.Signature | null
  >();
  readonly #objectLiteralContextualTypes = new WeakMap<
    ts.ObjectLiteralExpression,
    ts.Type | null
  >();

  constructor(
    checker: ts.TypeChecker,
    profiler: EnumRawValueContextProfiler,
    enumNamesForType: (type: ts.Type) => ReadonlySet<string>,
  ) {
    this.#checker = checker;
    this.#profiler = profiler;
    this.#enumNamesForType = enumNamesForType;
  }

  expectedEnumNamesForLiteral(
    node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.NumericLiteral,
    role: TypeScriptEnumUseRole,
  ): ReadonlySet<string> | null {
    switch (role) {
      case "assignment":
        return this.#assignmentEnumNames(node);
      case "call-argument":
        return this.#callArgumentEnumNames(node);
      case "case-label":
        return this.#caseLabelEnumNames(node);
      case "comparison":
        return this.#comparisonEnumNames(node);
      case "object-value":
        return this.#objectValueEnumNames(node);
      case "return-expression":
        return this.#returnExpressionEnumNames(node);
      case "expression":
        return null;
      case "enum-member-initializer":
      case "literal-type":
      case "module-specifier":
      case "object-key":
      case "type-reference":
        return emptyEnumNameSet;
    }
  }

  #assignmentEnumNames(node: ts.Node): ReadonlySet<string> {
    const parent = node.parent;
    if (
      parent === undefined ||
      !ts.isBinaryExpression(parent) ||
      parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
      parent.right !== node
    ) {
      return emptyEnumNameSet;
    }
    return this.#enumNamesForTypeAtLocation(
      parent.left,
      "checker.getTypeAtLocation.assignment-target",
      "TypeChecker target type lookup for raw enum-like assignment literals.",
    );
  }

  #callArgumentEnumNames(node: ts.Expression): ReadonlySet<string> {
    const parent = node.parent;
    if (
      parent === undefined ||
      (!ts.isCallExpression(parent) && !ts.isNewExpression(parent))
    ) {
      return emptyEnumNameSet;
    }
    if (parent.arguments?.includes(node) !== true) {
      return emptyEnumNameSet;
    }
    let argumentEnumNames = this.#callArgumentContextualEnumNames.get(node);
    if (argumentEnumNames === undefined) {
      argumentEnumNames = this.#enumNamesForCallArgumentContext(node);
      this.#callArgumentContextualEnumNames.set(node, argumentEnumNames);
    }
    return argumentEnumNames;
  }

  #enumNamesForCallArgumentContext(
    node: ts.Expression,
  ): ReadonlySet<string> {
    const call = node.parent;
    if (
      call === undefined ||
      (!ts.isCallExpression(call) && !ts.isNewExpression(call)) ||
      call.arguments === undefined
    ) {
      return emptyEnumNameSet;
    }
    const argumentIndex = call.arguments.indexOf(node);
    if (argumentIndex < 0) {
      return emptyEnumNameSet;
    }
    const signature = this.#signatureForCallExpression(call);
    if (signature === null) {
      return emptyEnumNameSet;
    }
    const parameter = parameterForArgumentIndex(signature, argumentIndex);
    if (parameter === null) {
      return emptyEnumNameSet;
    }
    const parameterType = this.#profiler.measureRepeated(
      "checker.getTypeOfSymbolAtLocation.call-parameter",
      "TypeChecker call parameter type lookup for raw enum-like call arguments.",
      () => this.#checker.getTypeOfSymbolAtLocation(parameter, node),
    );
    return this.#enumNamesForType(parameterType);
  }

  #signatureForCallExpression(
    node: ts.CallExpression | ts.NewExpression,
  ): ts.Signature | null {
    const cached = this.#callExpressionSignatures.get(node);
    if (cached !== undefined) {
      return cached;
    }
    const signature = this.#profiler.measureRepeated(
      "checker.getResolvedSignature.call-expression",
      "TypeChecker resolved signature lookup for call expressions with raw enum-like arguments.",
      () => this.#checker.getResolvedSignature(node) ?? null,
    );
    this.#callExpressionSignatures.set(node, signature);
    return signature;
  }

  #caseLabelEnumNames(node: ts.Node): ReadonlySet<string> {
    const caseClause = node.parent;
    const switchStatement = caseClause?.parent?.parent;
    if (
      caseClause === undefined ||
      !ts.isCaseClause(caseClause) ||
      caseClause.expression !== node ||
      switchStatement === undefined ||
      !ts.isSwitchStatement(switchStatement)
    ) {
      return emptyEnumNameSet;
    }
    return this.#enumNamesForTypeAtLocation(
      switchStatement.expression,
      "checker.getTypeAtLocation.switch-expression",
      "TypeChecker switch expression type lookup for raw enum-like case labels.",
    );
  }

  #comparisonEnumNames(node: ts.Node): ReadonlySet<string> {
    const parent = node.parent;
    if (parent === undefined || !ts.isBinaryExpression(parent)) {
      return emptyEnumNameSet;
    }
    if (!isEnumRawValueComparisonOperator(parent.operatorToken.kind)) {
      return emptyEnumNameSet;
    }
    const counterpart =
      parent.left === node
        ? parent.right
        : parent.right === node
        ? parent.left
        : undefined;
    if (counterpart === undefined) {
      return emptyEnumNameSet;
    }
    return this.#enumNamesForTypeAtLocation(
      counterpart,
      "checker.getTypeAtLocation.comparison-counterpart",
      "TypeChecker counterpart type lookup for raw enum-like comparison literals.",
    );
  }

  #objectValueEnumNames(node: ts.Node): ReadonlySet<string> {
    const property = node.parent;
    if (
      property === undefined ||
      !ts.isPropertyAssignment(property) ||
      property.initializer !== node
    ) {
      return emptyEnumNameSet;
    }
    const objectType = this.#contextualTypeForObjectLiteral(property.parent);
    if (objectType === null) {
      return emptyEnumNameSet;
    }
    const propertyName = propertyNameText(property.name, property.getSourceFile());
    if (propertyName === null) {
      return emptyEnumNameSet;
    }
    const symbol = objectType.getProperty(propertyName);
    if (symbol === undefined) {
      return emptyEnumNameSet;
    }
    const propertyType = this.#profiler.measureRepeated(
      "checker.getTypeOfSymbolAtLocation.object-value",
      "TypeChecker property type lookup for raw enum-like object property literals.",
      () => this.#checker.getTypeOfSymbolAtLocation(symbol, property.name),
    );
    return this.#enumNamesForType(propertyType);
  }

  #contextualTypeForObjectLiteral(
    node: ts.ObjectLiteralExpression,
  ): ts.Type | null {
    const cached = this.#objectLiteralContextualTypes.get(node);
    if (cached !== undefined) {
      return cached;
    }
    const type = this.#profiler.measureRepeated(
      "checker.getContextualType.object-literal",
      "TypeChecker contextual object type lookup for raw enum-like object property literals.",
      () => this.#checker.getContextualType(node) ?? null,
    );
    this.#objectLiteralContextualTypes.set(node, type);
    return type;
  }

  #returnExpressionEnumNames(node: ts.Node): ReadonlySet<string> {
    const statement = node.parent;
    if (
      statement === undefined ||
      !ts.isReturnStatement(statement) ||
      statement.expression !== node
    ) {
      return emptyEnumNameSet;
    }
    const owner = nearestFunctionLikeDeclaration(statement);
    if (owner === null) {
      return emptyEnumNameSet;
    }
    const signature = this.#profiler.measureRepeated(
      "checker.getSignatureFromDeclaration.return-expression",
      "TypeChecker signature lookup for raw enum-like return literals.",
      () => this.#checker.getSignatureFromDeclaration(owner),
    );
    if (signature === undefined) {
      return emptyEnumNameSet;
    }
    const returnType = this.#profiler.measureRepeated(
      "checker.getReturnTypeOfSignature.return-expression",
      "TypeChecker return type lookup for raw enum-like return literals.",
      () => this.#checker.getReturnTypeOfSignature(signature),
    );
    return this.#enumNamesForType(returnType);
  }

  #enumNamesForTypeAtLocation(
    node: ts.Node,
    phase: string,
    summary: string,
  ): ReadonlySet<string> {
    const type = this.#profiler.measureRepeated(
      phase,
      summary,
      () => this.#checker.getTypeAtLocation(node),
    );
    return this.#enumNamesForType(type);
  }
}

function parameterForArgumentIndex(
  signature: ts.Signature,
  argumentIndex: number,
): ts.Symbol | null {
  const parameters = signature.getParameters();
  if (parameters.length === 0) {
    return null;
  }
  return parameters[argumentIndex] ?? parameters[parameters.length - 1] ?? null;
}

function isEnumRawValueComparisonOperator(kind: ts.SyntaxKind): boolean {
  switch (kind) {
    case ts.SyntaxKind.EqualsEqualsToken:
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
    case ts.SyntaxKind.QuestionQuestionToken:
    case ts.SyntaxKind.BarBarToken:
    case ts.SyntaxKind.AmpersandAmpersandToken:
      return true;
    default:
      return false;
  }
}

function nearestFunctionLikeDeclaration(
  node: ts.Node,
): ts.SignatureDeclaration | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isFunctionLike(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}
