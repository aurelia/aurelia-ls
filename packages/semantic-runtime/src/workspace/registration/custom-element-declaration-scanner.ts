import * as ts from "typescript";
import type { TypeScriptProjectGeneration } from "../../typescript/programs/typescript-project-port.js";
import {
  RecognizedCustomElement,
  ResourceDeclarationClosureKind,
  ResourceDeclarationSurfaceKind,
  ResourceDefinitionKind,
  UnderclosedResourceDefinition
} from "../resources/resource-definition.js";

const MAX_ANALYSIS_DEPTH = 4;

const enum ResolvedDeclarationValueKind {
  String = 1,
  Object = 2
}

class ResolvedDeclarationValue {
  public constructor(
    public readonly kind: ResolvedDeclarationValueKind,
    public readonly closureKind: ResourceDeclarationClosureKind,
    public readonly stringValue?: string,
    public readonly objectProperties: ReadonlyMap<string, ResolvedDeclarationValue> = new Map()
  ) {}

  public static createString(
    value: string,
    closureKind: ResourceDeclarationClosureKind
  ): ResolvedDeclarationValue {
    return new ResolvedDeclarationValue(
      ResolvedDeclarationValueKind.String,
      closureKind,
      value
    );
  }

  public static createObject(
    properties: ReadonlyMap<string, ResolvedDeclarationValue>,
    closureKind: ResourceDeclarationClosureKind
  ): ResolvedDeclarationValue {
    return new ResolvedDeclarationValue(
      ResolvedDeclarationValueKind.Object,
      closureKind,
      undefined,
      properties
    );
  }

  public promote(
    closureKind: ResourceDeclarationClosureKind
  ): ResolvedDeclarationValue {
    const promotedClosure = maxClosureKind(this.closureKind, closureKind);
    if (promotedClosure === this.closureKind) {
      return this;
    }

    return new ResolvedDeclarationValue(
      this.kind,
      promotedClosure,
      this.stringValue,
      this.objectProperties
    );
  }

  public readProperty(name: string): ResolvedDeclarationValue | undefined {
    const property = this.objectProperties.get(name);
    if (property === undefined) {
      return undefined;
    }

    return property.promote(this.closureKind);
  }
}

type EvaluationContext = {
  readonly checker: ts.TypeChecker;
  readonly bindings: ReadonlyMap<string, ts.Expression>;
  readonly depth: number;
  readonly seenDeclarations: Set<string>;
};

export class CustomElementScanResult {
  public constructor(
    public readonly recognizedElements: readonly RecognizedCustomElement[],
    public readonly underclosedResources: readonly UnderclosedResourceDefinition[]
  ) {}
}

export class CustomElementDeclarationScanner {
  public scan(
    generation: TypeScriptProjectGeneration
  ): CustomElementScanResult {
    const recognizedByKey = new Map<string, RecognizedCustomElement>();
    const underclosedByKey = new Map<string, UnderclosedResourceDefinition>();

    for (const sourceFile of generation.listSemanticSourceFiles()) {
      this.scanSourceFile(
        sourceFile,
        generation,
        recognizedByKey,
        underclosedByKey
      );
    }

    return new CustomElementScanResult(
      [...recognizedByKey.values()].sort(compareRecognizedCustomElements),
      [...underclosedByKey.values()].sort(compareUnderclosedResources)
    );
  }

  private scanSourceFile(
    sourceFile: ts.SourceFile,
    generation: TypeScriptProjectGeneration,
    recognizedByKey: Map<string, RecognizedCustomElement>,
    underclosedByKey: Map<string, UnderclosedResourceDefinition>
  ): void {
    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement) && statement.name !== undefined && isExported(statement)) {
        this.scanClassDeclaration(
          sourceFile,
          statement,
          generation,
          recognizedByKey,
          underclosedByKey
        );
      }

      this.scanDefineStyleDeclaration(
        sourceFile,
        statement,
        generation,
        recognizedByKey,
        underclosedByKey
      );
    }
  }

  private scanClassDeclaration(
    sourceFile: ts.SourceFile,
    declaration: ts.ClassDeclaration,
    generation: TypeScriptProjectGeneration,
    recognizedByKey: Map<string, RecognizedCustomElement>,
    underclosedByKey: Map<string, UnderclosedResourceDefinition>
  ): void {
    const decoratorArgument = readCustomElementDecoratorArgument(declaration);
    if (decoratorArgument !== undefined) {
      this.recordDeclarationSurface(
        sourceFile,
        declaration.name?.text,
        declaration.name?.text,
        decoratorArgument,
        ResourceDeclarationSurfaceKind.Decorator,
        generation,
        recognizedByKey,
        underclosedByKey
      );
    }

    const staticMetadata = readStaticAuMetadataArgument(declaration);
    if (staticMetadata !== undefined) {
      this.recordDeclarationSurface(
        sourceFile,
        declaration.name?.text,
        declaration.name?.text,
        staticMetadata,
        ResourceDeclarationSurfaceKind.StaticMetadata,
        generation,
        recognizedByKey,
        underclosedByKey
      );
    }
  }

  private scanDefineStyleDeclaration(
    sourceFile: ts.SourceFile,
    statement: ts.Statement,
    generation: TypeScriptProjectGeneration,
    recognizedByKey: Map<string, RecognizedCustomElement>,
    underclosedByKey: Map<string, UnderclosedResourceDefinition>
  ): void {
    if (!ts.isVariableStatement(statement) || !isExported(statement)) {
      return;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
        continue;
      }

      const defineCall = readCustomElementDefineCall(declaration.initializer);
      if (defineCall === undefined) {
        continue;
      }

      const className = readDefineClassName(defineCall.classExpression, declaration.name.text);
      this.recordDeclarationSurface(
        sourceFile,
        className,
        declaration.name.text,
        defineCall.definitionExpression,
        ResourceDeclarationSurfaceKind.DefineCall,
        generation,
        recognizedByKey,
        underclosedByKey
      );
    }
  }

  private recordDeclarationSurface(
    sourceFile: ts.SourceFile,
    className: string | undefined,
    exportName: string | undefined,
    expression: ts.Expression,
    surfaceKind: ResourceDeclarationSurfaceKind,
    generation: TypeScriptProjectGeneration,
    recognizedByKey: Map<string, RecognizedCustomElement>,
    underclosedByKey: Map<string, UnderclosedResourceDefinition>
  ): void {
    if (className === undefined || exportName === undefined) {
      return;
    }

    const context = createEvaluationContext(generation.checker);
    const resourceName = resolveCustomElementName(expression, context);
    if (resourceName !== undefined) {
      const resourceText = resourceName.stringValue;
      if (resourceText === undefined) {
        return;
      }

      recognizedByKey.set(
        createRecognizedKey(sourceFile.fileName, exportName, resourceText),
        new RecognizedCustomElement(
          className,
          exportName,
          resourceText,
          sourceFile.fileName,
          surfaceKind,
          resourceName.closureKind
        )
      );
      return;
    }

    underclosedByKey.set(
      createUnderclosedKey(sourceFile.fileName, exportName, surfaceKind),
      new UnderclosedResourceDefinition(
        ResourceDefinitionKind.CustomElement,
        className,
        exportName,
        sourceFile.fileName,
        surfaceKind,
        inferCandidateClosureKind(expression),
        createUnderclosedNote(surfaceKind)
      )
    );
  }
}

function createEvaluationContext(
  checker: ts.TypeChecker,
  bindings: ReadonlyMap<string, ts.Expression> = new Map(),
  depth = MAX_ANALYSIS_DEPTH,
  seenDeclarations: Set<string> = new Set()
): EvaluationContext {
  return {
    checker,
    bindings,
    depth,
    seenDeclarations
  };
}

function createRecognizedKey(
  fileName: string,
  exportName: string,
  resourceName: string
): string {
  return `${fileName}:${exportName}:${resourceName}`;
}

function createUnderclosedKey(
  fileName: string,
  exportName: string,
  surfaceKind: ResourceDeclarationSurfaceKind
): string {
  return `${fileName}:${exportName}:surface-${surfaceKind}`;
}

function readCustomElementDecoratorArgument(
  declaration: ts.ClassDeclaration
): ts.Expression | undefined {
  const decorators = ts.canHaveDecorators(declaration)
    ? ts.getDecorators(declaration)
    : undefined;
  if (decorators === undefined) {
    return undefined;
  }

  for (const decorator of decorators) {
    if (!ts.isCallExpression(decorator.expression)) {
      continue;
    }

    if (!ts.isIdentifier(decorator.expression.expression) || decorator.expression.expression.text !== "customElement") {
      continue;
    }

    return decorator.expression.arguments[0];
  }

  return undefined;
}

function readStaticAuMetadataArgument(
  declaration: ts.ClassDeclaration
): ts.Expression | undefined {
  for (const member of declaration.members) {
    if (!ts.isPropertyDeclaration(member) || member.initializer === undefined) {
      continue;
    }

    if (!hasStaticModifier(member)) {
      continue;
    }

    if (!ts.isIdentifier(member.name) || member.name.text !== "$au") {
      continue;
    }

    return member.initializer;
  }

  return undefined;
}

function readCustomElementDefineCall(
  expression: ts.Expression
): {
  readonly definitionExpression: ts.Expression;
  readonly classExpression?: ts.Expression;
} | undefined {
  if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression)) {
    return undefined;
  }

  if (!ts.isIdentifier(expression.expression.expression) || expression.expression.expression.text !== "CustomElement") {
    return undefined;
  }

  if (expression.expression.name.text !== "define") {
    return undefined;
  }

  const [definitionExpression, classExpression] = expression.arguments;
  if (definitionExpression === undefined) {
    return undefined;
  }

  return {
    definitionExpression,
    classExpression
  };
}

function readDefineClassName(
  expression: ts.Expression | undefined,
  fallbackName: string
): string {
  if (expression === undefined) {
    return fallbackName;
  }

  if ((ts.isClassExpression(expression) || ts.isClassDeclaration(expression)) && expression.name !== undefined) {
    return expression.name.text;
  }

  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  return fallbackName;
}

function resolveCustomElementName(
  expression: ts.Expression,
  context: EvaluationContext
): ResolvedDeclarationValue | undefined {
  const declarationValue = resolveExpressionValue(expression, context);
  if (declarationValue === undefined) {
    return undefined;
  }

  if (declarationValue.kind === ResolvedDeclarationValueKind.String) {
    return declarationValue;
  }

  if (looksLikeStaticAuMetadata(expression)) {
    const typeProperty = declarationValue.readProperty("type");
    if (
      typeProperty?.kind !== ResolvedDeclarationValueKind.String ||
      typeProperty.stringValue !== "custom-element"
    ) {
      return undefined;
    }
  }

  const nameProperty = declarationValue.readProperty("name");
  if (nameProperty?.kind !== ResolvedDeclarationValueKind.String) {
    return undefined;
  }

  return nameProperty;
}

function resolveExpressionValue(
  expression: ts.Expression,
  context: EvaluationContext
): ResolvedDeclarationValue | undefined {
  if (context.depth <= 0) {
    return undefined;
  }

  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return ResolvedDeclarationValue.createString(
      expression.text,
      ResourceDeclarationClosureKind.DeclaredExplicit
    );
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const properties = new Map<string, ResolvedDeclarationValue>();
    for (const property of expression.properties) {
      if (ts.isShorthandPropertyAssignment(property)) {
        const propertyValue = resolveExpressionValue(
          property.name,
          consumeDepth(context)
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

    return ResolvedDeclarationValue.createObject(
      properties,
      ResourceDeclarationClosureKind.DeclaredExplicit
    );
  }

  if (ts.isIdentifier(expression)) {
    const boundExpression = context.bindings.get(expression.text);
    if (boundExpression !== undefined) {
      return resolveExpressionValue(boundExpression, consumeDepth(context))
        ?.promote(ResourceDeclarationClosureKind.SourceAnalyzable);
    }

    return resolveSymbolValue(
      context.checker.getSymbolAtLocation(expression),
      consumeDepth(context)
    );
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return resolveExpressionValue(expression.expression, consumeDepth(context))
      ?.readProperty(expression.name.text)
      ?.promote(ResourceDeclarationClosureKind.SourceAnalyzable);
  }

  if (ts.isCallExpression(expression)) {
    return resolveFunctionCallValue(expression, consumeDepth(context));
  }

  if (ts.isParenthesizedExpression(expression)) {
    return resolveExpressionValue(expression.expression, context);
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return resolveExpressionValue(expression.expression, context);
  }

  return undefined;
}

function resolveSymbolValue(
  symbol: ts.Symbol | undefined,
  context: EvaluationContext
): ResolvedDeclarationValue | undefined {
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
      consumeDepth(context)
    );
    if (declarationValue !== undefined) {
      return declarationValue.promote(ResourceDeclarationClosureKind.SourceAnalyzable);
    }
  }

  return undefined;
}

function resolveDeclarationNodeValue(
  declaration: ts.Declaration,
  context: EvaluationContext
): ResolvedDeclarationValue | undefined {
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
  context: EvaluationContext
): ResolvedDeclarationValue | undefined {
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
    createEvaluationContext(
      context.checker,
      bindings,
      context.depth - 1,
      context.seenDeclarations
    )
  )?.promote(ResourceDeclarationClosureKind.SourceAnalyzable);
}

function resolveCallable(
  expression: ts.LeftHandSideExpression,
  context: EvaluationContext
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

function resolveCallableFromSymbol(
  symbol: ts.Symbol | undefined,
  context: EvaluationContext
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

function readReturnExpression(
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

function looksLikeStaticAuMetadata(expression: ts.Expression): boolean {
  if (!ts.isObjectLiteralExpression(expression)) {
    return false;
  }

  return expression.properties.some((property) =>
    ts.isPropertyAssignment(property) &&
    readPropertyName(property.name) === "type"
  );
}

function readPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function hasStaticModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ?? false;
}

function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function consumeDepth(
  context: EvaluationContext
): EvaluationContext {
  return createEvaluationContext(
    context.checker,
    context.bindings,
    context.depth - 1,
    context.seenDeclarations
  );
}

function inferCandidateClosureKind(
  expression: ts.Expression
): ResourceDeclarationClosureKind {
  if (
    ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(expression) ||
    ts.isCallExpression(expression) ||
    ts.isObjectLiteralExpression(expression)
  ) {
    return ResourceDeclarationClosureKind.SourceAnalyzable;
  }

  return ResourceDeclarationClosureKind.RuntimeOnly;
}

function createUnderclosedNote(
  surfaceKind: ResourceDeclarationSurfaceKind
): string {
  switch (surfaceKind) {
    case ResourceDeclarationSurfaceKind.Decorator:
      return "Decorator-shaped custom-element declaration stayed underclosed inside the current bounded analysis ceiling.";
    case ResourceDeclarationSurfaceKind.StaticMetadata:
      return "Static $au metadata stayed underclosed inside the current bounded analysis ceiling.";
    case ResourceDeclarationSurfaceKind.DefineCall:
      return "Define-style custom-element declaration stayed underclosed inside the current bounded analysis ceiling.";
    default:
      return "Custom-element declaration stayed underclosed inside the current bounded analysis ceiling.";
  }
}

function maxClosureKind(
  left: ResourceDeclarationClosureKind,
  right: ResourceDeclarationClosureKind
): ResourceDeclarationClosureKind {
  return left >= right ? left : right;
}

function compareRecognizedCustomElements(
  left: RecognizedCustomElement,
  right: RecognizedCustomElement
): number {
  return left.resourceName.localeCompare(right.resourceName) ||
    left.fileName.localeCompare(right.fileName) ||
    left.exportName.localeCompare(right.exportName);
}

function compareUnderclosedResources(
  left: UnderclosedResourceDefinition,
  right: UnderclosedResourceDefinition
): number {
  return left.fileName.localeCompare(right.fileName) ||
    left.exportName.localeCompare(right.exportName) ||
    left.declarationSurface - right.declarationSurface;
}
