import * as ts from "typescript";
import type { TypeScriptProjectGeneration } from "../../typescript/programs/typescript-project-port.js";
import {
  createAnalysisContext,
  ResolvedValueKind,
  TypeScriptAnalysisClosureKind,
  resolveExpressionValue,
  type ResolvedValue,
} from "../../typescript/analysis/resolved-value.js";
import {
  RecognizedCustomElement,
  ResourceDeclarationClosureKind,
  ResourceDeclarationSurfaceKind,
  ResourceDefinitionKind,
  UnderclosedResourceDefinition
} from "../resources/resource-definition.js";

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

    const resourceName = resolveCustomElementName(
      expression,
      createAnalysisContext(generation.checker)
    );
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
          mapAnalysisClosureKind(resourceName.closureKind)
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
  context: ReturnType<typeof createAnalysisContext>
): ResolvedValue | undefined {
  const declarationValue = resolveExpressionValue(expression, context);
  if (declarationValue === undefined) {
    return undefined;
  }

  if (declarationValue.kind === ResolvedValueKind.String) {
    return declarationValue;
  }

  if (looksLikeStaticAuMetadata(expression)) {
    const typeProperty = declarationValue.readProperty("type");
    if (
      typeProperty?.kind !== ResolvedValueKind.String ||
      typeProperty.stringValue !== "custom-element"
    ) {
      return undefined;
    }
  }

  const nameProperty = declarationValue.readProperty("name");
  if (nameProperty?.kind !== ResolvedValueKind.String) {
    return undefined;
  }

  return nameProperty;
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

function mapAnalysisClosureKind(
  closureKind: TypeScriptAnalysisClosureKind
): ResourceDeclarationClosureKind {
  switch (closureKind) {
    case TypeScriptAnalysisClosureKind.DeclaredExplicit:
      return ResourceDeclarationClosureKind.DeclaredExplicit;
    case TypeScriptAnalysisClosureKind.SourceAnalyzable:
      return ResourceDeclarationClosureKind.SourceAnalyzable;
    default:
      return ResourceDeclarationClosureKind.RuntimeOnly;
  }
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
