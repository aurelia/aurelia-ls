import path from "node:path";
import * as ts from "typescript";
import type { TypeScriptProjectGeneration } from "../../typescript/programs/typescript-project-port.js";
import {
  createAnalysisContext,
  ResolvedValueKind,
  TypeScriptAnalysisClosureKind,
  resolveExpressionValue,
  type ResolvedValue
} from "../../typescript/analysis/resolved-value.js";
import type { RecognizedCustomElement } from "../resources/resource-definition.js";
import {
  AssociatedTemplateSource,
  TemplateAssociationClosureKind,
  TemplateSourceKind,
  TemplateViewStrategyKind,
  UnderclosedTemplateSourceAssociation
} from "../templates/template-source-association.js";

export class TemplateSourceAssociationScanResult {
  readonly #associationByKey: ReadonlyMap<string, AssociatedTemplateSource>;

  public constructor(
    associations: ReadonlyMap<string, AssociatedTemplateSource>,
    public readonly underclosedAssociations: readonly UnderclosedTemplateSourceAssociation[]
  ) {
    this.#associationByKey = associations;
  }

  public findAssociation(
    resource: RecognizedCustomElement
  ): AssociatedTemplateSource | undefined {
    return this.#associationByKey.get(createResourceKey(resource));
  }
}

export class TemplateSourceAssociationScanner {
  public scan(
    generation: TypeScriptProjectGeneration,
    resources: readonly RecognizedCustomElement[]
  ): TemplateSourceAssociationScanResult {
    const associations = new Map<string, AssociatedTemplateSource>();
    const underclosedAssociations: UnderclosedTemplateSourceAssociation[] = [];

    for (const resource of resources) {
      const association = this.resolveAssociation(resource, generation);
      if (association instanceof AssociatedTemplateSource) {
        associations.set(createResourceKey(resource), association);
        continue;
      }

      if (association !== undefined) {
        underclosedAssociations.push(association);
      }
    }

    return new TemplateSourceAssociationScanResult(
      associations,
      underclosedAssociations.sort(compareUnderclosedAssociations)
    );
  }

  private resolveAssociation(
    resource: RecognizedCustomElement,
    generation: TypeScriptProjectGeneration
  ): AssociatedTemplateSource | UnderclosedTemplateSourceAssociation | undefined {
    const sourceFile = generation.program.getSourceFile(resource.fileName);
    const context = createAnalysisContext(generation.checker);
    if (sourceFile !== undefined) {
      const explicitAssociation = readExplicitAssociation(
        sourceFile,
        resource,
        context
      );
      if (explicitAssociation !== undefined) {
        return materializeAssociation(resource, explicitAssociation);
      }
    }

    const conventionalTemplateFile = replaceFileExtension(resource.fileName, ".html");
    if (ts.sys.fileExists(conventionalTemplateFile)) {
      return new AssociatedTemplateSource(
        createTemplateSourceRef(resource, TemplateViewStrategyKind.ConventionalFile),
        TemplateViewStrategyKind.ConventionalFile,
        TemplateAssociationClosureKind.ConventionMediated,
        TemplateSourceKind.ExternalFile,
        conventionalTemplateFile
      );
    }

    return new UnderclosedTemplateSourceAssociation(
      resource.className,
      resource.exportName,
      resource.resourceName,
      resource.fileName,
      TemplateAssociationClosureKind.SourceAnalyzable,
      "Template-source association stayed underclosed inside the current bounded pairing ceiling."
    );
  }
}

type ExplicitAssociation =
  | {
      readonly viewStrategy: TemplateViewStrategyKind.NoView;
      readonly closureKind: TemplateAssociationClosureKind;
    }
  | {
      readonly viewStrategy: TemplateViewStrategyKind.InlineTemplate;
      readonly closureKind: TemplateAssociationClosureKind;
      readonly templateText: string;
    }
  | {
      readonly underclosedNote: string;
      readonly closureKind: TemplateAssociationClosureKind;
      readonly viewStrategy?: TemplateViewStrategyKind;
    };

function readExplicitAssociation(
  sourceFile: ts.SourceFile,
  resource: RecognizedCustomElement,
  context: ReturnType<typeof createAnalysisContext>
): ExplicitAssociation | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isClassDeclaration(statement) &&
      statement.name !== undefined &&
      statement.name.text === resource.className
    ) {
      const classAssociation = readClassAssociation(statement, context);
      if (classAssociation !== undefined) {
        return classAssociation;
      }
    }

    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        declaration.name.text !== resource.exportName ||
        declaration.initializer === undefined
      ) {
        continue;
      }

      const defineAssociation = readDefineAssociation(declaration.initializer, context);
      if (defineAssociation !== undefined) {
        return defineAssociation;
      }
    }
  }

  return undefined;
}

function readClassAssociation(
  declaration: ts.ClassDeclaration,
  context: ReturnType<typeof createAnalysisContext>
): ExplicitAssociation | undefined {
  const decoratorArgument = readCustomElementDecoratorArgument(declaration);
  if (decoratorArgument !== undefined) {
    const decoratorAssociation = resolveViewStrategy(decoratorArgument, context);
    if (decoratorAssociation !== undefined) {
      return decoratorAssociation;
    }
  }

  const staticMetadata = readStaticAuMetadataArgument(declaration);
  if (staticMetadata !== undefined) {
    return resolveViewStrategy(staticMetadata, context);
  }

  return undefined;
}

function readDefineAssociation(
  expression: ts.Expression,
  context: ReturnType<typeof createAnalysisContext>
): ExplicitAssociation | undefined {
  const defineCall = readCustomElementDefineCall(expression);
  if (defineCall === undefined) {
    return undefined;
  }

  return resolveViewStrategy(defineCall.definitionExpression, context);
}

function resolveViewStrategy(
  expression: ts.Expression,
  context: ReturnType<typeof createAnalysisContext>
): ExplicitAssociation | undefined {
  const definitionValue = resolveExpressionValue(expression, context);
  if (definitionValue?.kind !== ResolvedValueKind.Object) {
    return undefined;
  }

  const noViewValue = definitionValue.readProperty("noView");
  if (noViewValue?.kind === ResolvedValueKind.Boolean) {
    return noViewValue.booleanValue === true
      ? {
          viewStrategy: TemplateViewStrategyKind.NoView,
          closureKind: mapClosureKind(noViewValue.closureKind)
        }
      : undefined;
  }

  if (noViewValue !== undefined) {
    return {
      underclosedNote: "Explicit noView strategy stayed underclosed inside the current bounded pairing ceiling.",
      closureKind: mapClosureKind(noViewValue.closureKind),
      viewStrategy: TemplateViewStrategyKind.NoView
    };
  }

  const templateValue = definitionValue.readProperty("template");
  if (templateValue?.kind === ResolvedValueKind.String && templateValue.stringValue !== undefined) {
    return {
      viewStrategy: TemplateViewStrategyKind.InlineTemplate,
      closureKind: mapClosureKind(templateValue.closureKind),
      templateText: templateValue.stringValue
    };
  }

  if (templateValue !== undefined) {
    return {
      underclosedNote: "Explicit template strategy stayed underclosed inside the current bounded pairing ceiling.",
      closureKind: mapClosureKind(templateValue.closureKind),
      viewStrategy: TemplateViewStrategyKind.InlineTemplate
    };
  }

  return undefined;
}

function materializeAssociation(
  resource: RecognizedCustomElement,
  association: ExplicitAssociation
): AssociatedTemplateSource | UnderclosedTemplateSourceAssociation {
  if ("underclosedNote" in association) {
    return new UnderclosedTemplateSourceAssociation(
      resource.className,
      resource.exportName,
      resource.resourceName,
      resource.fileName,
      association.closureKind,
      association.underclosedNote,
      association.viewStrategy
    );
  }

  if (association.viewStrategy === TemplateViewStrategyKind.NoView) {
    return new AssociatedTemplateSource(
      undefined,
      association.viewStrategy,
      association.closureKind
    );
  }

  return new AssociatedTemplateSource(
    createTemplateSourceRef(resource, association.viewStrategy),
    association.viewStrategy,
    association.closureKind,
    TemplateSourceKind.InlineText,
    undefined,
    association.templateText
  );
}

function createResourceKey(
  resource: RecognizedCustomElement
): string {
  return `${resource.fileName}:${resource.exportName}:${resource.resourceName}`;
}

function createTemplateSourceRef(
  resource: RecognizedCustomElement,
  strategy: TemplateViewStrategyKind
): string {
  const strategyLabel = strategy === TemplateViewStrategyKind.ConventionalFile
    ? "convention"
    : "inline";
  return `template-source:${resource.resourceName}:${strategyLabel}`;
}

function replaceFileExtension(
  fileName: string,
  extension: string
): string {
  const directory = path.dirname(fileName);
  const baseName = path.basename(fileName, path.extname(fileName));
  return path.join(directory, `${baseName}${extension}`);
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

  const [definitionExpression] = expression.arguments;
  if (definitionExpression === undefined) {
    return undefined;
  }

  return {
    definitionExpression
  };
}

function hasStaticModifier(
  node: ts.Node
): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ?? false;
}

function mapClosureKind(
  closureKind: TypeScriptAnalysisClosureKind
): TemplateAssociationClosureKind {
  switch (closureKind) {
    case TypeScriptAnalysisClosureKind.DeclaredExplicit:
      return TemplateAssociationClosureKind.DeclaredExplicit;
    case TypeScriptAnalysisClosureKind.SourceAnalyzable:
      return TemplateAssociationClosureKind.SourceAnalyzable;
    default:
      return TemplateAssociationClosureKind.RuntimeOnly;
  }
}

function compareUnderclosedAssociations(
  left: UnderclosedTemplateSourceAssociation,
  right: UnderclosedTemplateSourceAssociation
): number {
  return left.fileName.localeCompare(right.fileName) ||
    left.exportName.localeCompare(right.exportName) ||
    left.resourceName.localeCompare(right.resourceName);
}
