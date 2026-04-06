import * as ts from "typescript";

const DEFAULT_ANALYSIS_DEPTH = 6;

export const enum TypeScriptAnalysisClosureKind {
  DeclaredExplicit = 1,
  SourceAnalyzable = 2,
  RuntimeOnly = 3
}

export const enum ResolvedValueKind {
  String = 1,
  Boolean = 2,
  Object = 3,
  Array = 4
}

export class ResolvedValue {
  public constructor(
    public readonly kind: ResolvedValueKind,
    public readonly closureKind: TypeScriptAnalysisClosureKind,
    public readonly stringValue?: string,
    public readonly booleanValue?: boolean,
    public readonly objectProperties: ReadonlyMap<string, ResolvedValue> = new Map(),
    public readonly arrayElements: readonly ResolvedValue[] = []
  ) {}

  public static createString(
    value: string,
    closureKind: TypeScriptAnalysisClosureKind
  ): ResolvedValue {
    return new ResolvedValue(
      ResolvedValueKind.String,
      closureKind,
      value
    );
  }

  public static createBoolean(
    value: boolean,
    closureKind: TypeScriptAnalysisClosureKind
  ): ResolvedValue {
    return new ResolvedValue(
      ResolvedValueKind.Boolean,
      closureKind,
      undefined,
      value
    );
  }

  public static createObject(
    properties: ReadonlyMap<string, ResolvedValue>,
    closureKind: TypeScriptAnalysisClosureKind
  ): ResolvedValue {
    return new ResolvedValue(
      ResolvedValueKind.Object,
      closureKind,
      undefined,
      undefined,
      properties
    );
  }

  public static createArray(
    elements: readonly ResolvedValue[],
    closureKind: TypeScriptAnalysisClosureKind
  ): ResolvedValue {
    return new ResolvedValue(
      ResolvedValueKind.Array,
      closureKind,
      undefined,
      undefined,
      new Map(),
      elements
    );
  }

  public promote(
    closureKind: TypeScriptAnalysisClosureKind
  ): ResolvedValue {
    const promotedClosure = maxClosureKind(this.closureKind, closureKind);
    if (promotedClosure === this.closureKind) {
      return this;
    }

    return new ResolvedValue(
      this.kind,
      promotedClosure,
      this.stringValue,
      this.booleanValue,
      this.objectProperties,
      this.arrayElements
    );
  }

  public readProperty(name: string): ResolvedValue | undefined {
    const property = this.objectProperties.get(name);
    if (property === undefined) {
      return undefined;
    }

    return property.promote(this.closureKind);
  }

  public readStringArray(): readonly string[] | undefined {
    if (this.kind !== ResolvedValueKind.Array) {
      return undefined;
    }

    const strings: string[] = [];
    for (const element of this.arrayElements) {
      if (element.kind !== ResolvedValueKind.String || element.stringValue === undefined) {
        return undefined;
      }

      strings.push(element.stringValue);
    }

    return strings;
  }
}

export type TypeScriptAnalysisContext = {
  readonly checker: ts.TypeChecker;
  readonly bindings: ReadonlyMap<string, ts.Expression>;
  readonly depth: number;
  readonly seenDeclarations: Set<string>;
};

export function createAnalysisContext(
  checker: ts.TypeChecker,
  bindings: ReadonlyMap<string, ts.Expression> = new Map(),
  depth = DEFAULT_ANALYSIS_DEPTH,
  seenDeclarations: Set<string> = new Set()
): TypeScriptAnalysisContext {
  return {
    checker,
    bindings,
    depth,
    seenDeclarations
  };
}

export function consumeAnalysisDepth(
  context: TypeScriptAnalysisContext
): TypeScriptAnalysisContext {
  return createAnalysisContext(
    context.checker,
    context.bindings,
    context.depth - 1,
    context.seenDeclarations
  );
}

export function resolveExpressionValue(
  expression: ts.Expression,
  context: TypeScriptAnalysisContext
): ResolvedValue | undefined {
  if (context.depth <= 0) {
    return undefined;
  }

  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return ResolvedValue.createString(
      expression.text,
      TypeScriptAnalysisClosureKind.DeclaredExplicit
    );
  }

  if (
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return ResolvedValue.createBoolean(
      expression.kind === ts.SyntaxKind.TrueKeyword,
      TypeScriptAnalysisClosureKind.DeclaredExplicit
    );
  }

  if (ts.isArrayLiteralExpression(expression)) {
    const elements: ResolvedValue[] = [];
    for (const element of expression.elements) {
      if (!ts.isExpression(element)) {
        return undefined;
      }

      const resolvedElement = resolveExpressionValue(element, context);
      if (resolvedElement === undefined) {
        return undefined;
      }

      elements.push(resolvedElement);
    }

    return ResolvedValue.createArray(
      elements,
      TypeScriptAnalysisClosureKind.DeclaredExplicit
    );
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const properties = new Map<string, ResolvedValue>();
    for (const property of expression.properties) {
      if (ts.isShorthandPropertyAssignment(property)) {
        const propertyValue = resolveExpressionValue(
          property.name,
          consumeAnalysisDepth(context)
        );
        if (propertyValue !== undefined) {
          properties.set(property.name.text, propertyValue);
        }
        continue;
      }

      if (!ts.isPropertyAssignment(property)) {
        continue;
      }

      const propertyName = readPropertyName(property.name);
      if (propertyName === undefined) {
        continue;
      }

      const propertyValue = resolveExpressionValue(property.initializer, context);
      if (propertyValue === undefined) {
        continue;
      }

      properties.set(propertyName, propertyValue);
    }

    return ResolvedValue.createObject(
      properties,
      TypeScriptAnalysisClosureKind.DeclaredExplicit
    );
  }

  if (ts.isIdentifier(expression)) {
    const boundExpression = context.bindings.get(expression.text);
    if (boundExpression !== undefined) {
      return resolveExpressionValue(boundExpression, consumeAnalysisDepth(context))
        ?.promote(TypeScriptAnalysisClosureKind.SourceAnalyzable);
    }

    return resolveSymbolValue(
      context.checker.getSymbolAtLocation(expression),
      consumeAnalysisDepth(context)
    );
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return resolveExpressionValue(expression.expression, consumeAnalysisDepth(context))
      ?.readProperty(expression.name.text)
      ?.promote(TypeScriptAnalysisClosureKind.SourceAnalyzable);
  }

  if (ts.isCallExpression(expression)) {
    return resolveFunctionCallValue(expression, consumeAnalysisDepth(context));
  }

  if (ts.isParenthesizedExpression(expression)) {
    return resolveExpressionValue(expression.expression, context);
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return resolveExpressionValue(expression.expression, context);
  }

  return undefined;
}

export function resolveSymbolValue(
  symbol: ts.Symbol | undefined,
  context: TypeScriptAnalysisContext
): ResolvedValue | undefined {
  if (symbol === undefined || context.depth <= 0) {
    return undefined;
  }

  const resolvedSymbol = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? context.checker.getAliasedSymbol(symbol)
    : symbol;
  for (const declaration of resolvedSymbol.declarations ?? []) {
    const declarationKey = `${declaration.getSourceFile().fileName}:${declaration.pos}`;
    if (context.seenDeclarations.has(declarationKey)) {
      continue;
    }

    context.seenDeclarations.add(declarationKey);
    const declarationValue = resolveDeclarationNodeValue(
      declaration,
      consumeAnalysisDepth(context)
    );
    if (declarationValue !== undefined) {
      return declarationValue.promote(TypeScriptAnalysisClosureKind.SourceAnalyzable);
    }
  }

  return undefined;
}

export function resolveCallable(
  expression: ts.LeftHandSideExpression,
  context: TypeScriptAnalysisContext
): ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression | undefined {
  if (ts.isIdentifier(expression)) {
    return resolveCallableFromSymbol(
      context.checker.getSymbolAtLocation(expression),
      context
    );
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return resolveCallableFromSymbol(
      context.checker.getSymbolAtLocation(expression.name) ??
        context.checker.getSymbolAtLocation(expression),
      context
    );
  }

  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
    return expression;
  }

  return undefined;
}

export function readPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

export function readReturnExpression(
  callable: ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression
): ts.Expression | undefined {
  if (callable.body === undefined) {
    return undefined;
  }

  if (ts.isExpression(callable.body)) {
    return callable.body;
  }

  if (callable.body.statements.length !== 1) {
    return undefined;
  }

  const [statement] = callable.body.statements;
  if (statement === undefined || !ts.isReturnStatement(statement) || statement.expression === undefined) {
    return undefined;
  }

  return statement.expression;
}

function resolveDeclarationNodeValue(
  declaration: ts.Declaration,
  context: TypeScriptAnalysisContext
): ResolvedValue | undefined {
  if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
    return resolveExpressionValue(declaration.initializer, context);
  }

  if (ts.isPropertyAssignment(declaration)) {
    return resolveExpressionValue(declaration.initializer, context);
  }

  if (ts.isBindingElement(declaration) && declaration.initializer !== undefined) {
    return resolveExpressionValue(declaration.initializer, context);
  }

  if (ts.isEnumMember(declaration) && declaration.initializer !== undefined) {
    return resolveExpressionValue(declaration.initializer, context);
  }

  if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) {
    const returnExpression = readReturnExpression(declaration);
    if (returnExpression === undefined) {
      return undefined;
    }

    return resolveExpressionValue(returnExpression, context);
  }

  return undefined;
}

function resolveFunctionCallValue(
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): ResolvedValue | undefined {
  const callable = resolveCallable(expression.expression, context);
  if (callable === undefined) {
    return undefined;
  }

  const returnExpression = readReturnExpression(callable);
  if (returnExpression === undefined) {
    return undefined;
  }

  const bindings = new Map(context.bindings);
  for (let index = 0; index < callable.parameters.length; index += 1) {
    const parameter = callable.parameters[index];
    if (parameter === undefined || !ts.isIdentifier(parameter.name)) {
      return undefined;
    }

    const argument = expression.arguments[index];
    if (argument !== undefined) {
      bindings.set(parameter.name.text, argument);
    }
  }

  return resolveExpressionValue(
    returnExpression,
    createAnalysisContext(
      context.checker,
      bindings,
      context.depth - 1,
      context.seenDeclarations
    )
  )?.promote(TypeScriptAnalysisClosureKind.SourceAnalyzable);
}

function resolveCallableFromSymbol(
  symbol: ts.Symbol | undefined,
  context: TypeScriptAnalysisContext
): ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression | undefined {
  if (symbol === undefined) {
    return undefined;
  }

  const resolvedSymbol = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? context.checker.getAliasedSymbol(symbol)
    : symbol;
  for (const declaration of resolvedSymbol.declarations ?? []) {
    if (
      ts.isFunctionDeclaration(declaration) ||
      ts.isMethodDeclaration(declaration) ||
      ts.isArrowFunction(declaration) ||
      ts.isFunctionExpression(declaration)
    ) {
      return declaration;
    }

    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
        return declaration.initializer;
      }
    }
  }

  return undefined;
}

function maxClosureKind(
  left: TypeScriptAnalysisClosureKind,
  right: TypeScriptAnalysisClosureKind
): TypeScriptAnalysisClosureKind {
  return left >= right ? left : right;
}
