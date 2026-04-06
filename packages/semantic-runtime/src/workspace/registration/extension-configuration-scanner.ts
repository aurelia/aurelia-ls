import * as ts from "typescript";
import type { TypeScriptProjectGeneration } from "../../typescript/programs/typescript-project-port.js";
import {
  consumeAnalysisDepth,
  createAnalysisContext,
  readReturnExpression,
  resolveCallable,
  resolveExpressionValue,
  TypeScriptAnalysisClosureKind,
  type TypeScriptAnalysisContext
} from "../../typescript/analysis/resolved-value.js";
import {
  ActiveExtensionActivation,
  ExtensionAdmissionClosureKind,
  ExtensionConfigurationProfileKind,
  ExtensionFamilyKind,
  GeneratedTemplateVocabularyKind,
  GeneratedTemplateVocabularyMember,
  UnderclosedExtensionActivation
} from "../extensions/extension-activation.js";

type I18nActivationState = {
  readonly family: ExtensionFamilyKind.I18n;
  readonly profiles: readonly ExtensionConfigurationProfileKind[];
  readonly packageQualifier: string;
  readonly registrationFileName: string;
  readonly closureKind: ExtensionAdmissionClosureKind;
  readonly aliasNames?: readonly string[];
  readonly underclosedNote?: string;
};

export class ExtensionConfigurationScanResult {
  public readonly generatedVocabulary: readonly GeneratedTemplateVocabularyMember[];
  public readonly activeExtensionCount: number;
  public readonly admittedGeneratedVocabularyCount: number;
  public readonly underclosedGeneratedVocabularyCount: number;

  public constructor(
    public readonly activeExtensions: readonly ActiveExtensionActivation[],
    public readonly underclosedExtensions: readonly UnderclosedExtensionActivation[]
  ) {
    this.generatedVocabulary = activeExtensions.flatMap(
      (activation) => activation.generatedVocabulary
    );
    this.activeExtensionCount = activeExtensions.length;
    this.admittedGeneratedVocabularyCount = this.generatedVocabulary.length;
    this.underclosedGeneratedVocabularyCount = underclosedExtensions.length;
  }
}

export class ExtensionConfigurationScanner {
  public scan(
    generation: TypeScriptProjectGeneration
  ): ExtensionConfigurationScanResult {
    const activeByKey = new Map<string, ActiveExtensionActivation>();
    const underclosedByKey = new Map<string, UnderclosedExtensionActivation>();

    for (const sourceFile of generation.listSemanticSourceFiles()) {
      this.scanSourceFile(
        sourceFile,
        generation,
        activeByKey,
        underclosedByKey
      );
    }

    return new ExtensionConfigurationScanResult(
      [...activeByKey.values()].sort(compareActiveExtensions),
      [...underclosedByKey.values()].sort(compareUnderclosedExtensions)
    );
  }

  private scanSourceFile(
    sourceFile: ts.SourceFile,
    generation: TypeScriptProjectGeneration,
    activeByKey: Map<string, ActiveExtensionActivation>,
    underclosedByKey: Map<string, UnderclosedExtensionActivation>
  ): void {
    const context = createAnalysisContext(generation.checker);

    for (const statement of sourceFile.statements) {
      this.scanActivationNode(
        statement,
        sourceFile.fileName,
        context,
        activeByKey,
        underclosedByKey
      );
    }
  }

  private scanActivationNode(
    node: ts.Node,
    registrationFileName: string,
    context: TypeScriptAnalysisContext,
    activeByKey: Map<string, ActiveExtensionActivation>,
    underclosedByKey: Map<string, UnderclosedExtensionActivation>
  ): void {
    if (context.depth <= 0) {
      return;
    }

    if (ts.isExpressionStatement(node)) {
      this.scanActivationExpression(
        node.expression,
        registrationFileName,
        context,
        activeByKey,
        underclosedByKey
      );
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (declaration.initializer === undefined) {
          continue;
        }

        this.scanActivationExpression(
          declaration.initializer,
          registrationFileName,
          context,
          activeByKey,
          underclosedByKey
        );
      }
    }
  }

  private scanActivationExpression(
    expression: ts.Expression,
    registrationFileName: string,
    context: TypeScriptAnalysisContext,
    activeByKey: Map<string, ActiveExtensionActivation>,
    underclosedByKey: Map<string, UnderclosedExtensionActivation>
  ): void {
    if (context.depth <= 0) {
      return;
    }

    const unwrappedExpression = unwrapExpression(expression);
    if (!ts.isCallExpression(unwrappedExpression)) {
      return;
    }

    if (isRegisterCall(unwrappedExpression)) {
      this.recordRegisterCall(
        unwrappedExpression,
        registrationFileName,
        context,
        activeByKey,
        underclosedByKey
      );
      return;
    }

    const callable = resolveCallable(unwrappedExpression.expression, context);
    if (callable === undefined) {
      return;
    }

    const callContext = bindCallArguments(
      callable,
      unwrappedExpression,
      context
    );
    if (callContext === undefined) {
      return;
    }

    this.scanCallableBody(
      callable,
      registrationFileName,
      callContext,
      activeByKey,
      underclosedByKey
    );
  }

  private scanCallableBody(
    callable: ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression,
    registrationFileName: string,
    context: TypeScriptAnalysisContext,
    activeByKey: Map<string, ActiveExtensionActivation>,
    underclosedByKey: Map<string, UnderclosedExtensionActivation>
  ): void {
    if (callable.body === undefined) {
      return;
    }

    if (ts.isExpression(callable.body)) {
      this.scanActivationExpression(
        callable.body,
        registrationFileName,
        context,
        activeByKey,
        underclosedByKey
      );
      return;
    }

    for (const statement of callable.body.statements) {
      this.scanActivationNode(
        statement,
        registrationFileName,
        context,
        activeByKey,
        underclosedByKey
      );
    }
  }

  private recordRegisterCall(
    expression: ts.CallExpression,
    registrationFileName: string,
    context: TypeScriptAnalysisContext,
    activeByKey: Map<string, ActiveExtensionActivation>,
    underclosedByKey: Map<string, UnderclosedExtensionActivation>
  ): void {
    for (const argument of expression.arguments) {
      if (!ts.isExpression(argument)) {
        continue;
      }

      const resolvedActivation = resolveRegisteredExtension(
        argument,
        registrationFileName,
        consumeAnalysisDepth(context)
      );
      if (resolvedActivation === undefined) {
        continue;
      }

      if (resolvedActivation.underclosedNote !== undefined) {
        if (resolvedActivation.family !== undefined) {
          const activeActivation = new ActiveExtensionActivation(
            resolvedActivation.family,
            resolvedActivation.profiles,
            resolvedActivation.packageQualifier,
            resolvedActivation.registrationFileName,
            resolvedActivation.closureKind,
            []
          );
          activeByKey.set(
            createActiveKey(activeActivation),
            activeActivation
          );
        }

        const activation = new UnderclosedExtensionActivation(
          resolvedActivation.family,
          resolvedActivation.profiles,
          resolvedActivation.packageQualifier,
          resolvedActivation.registrationFileName,
          resolvedActivation.closureKind,
          resolvedActivation.underclosedNote
        );
        underclosedByKey.set(
          createUnderclosedKey(activation),
          activation
        );
        continue;
      }

      const activation = new ActiveExtensionActivation(
        resolvedActivation.family,
        resolvedActivation.profiles,
        resolvedActivation.packageQualifier,
        resolvedActivation.registrationFileName,
        resolvedActivation.closureKind,
        createGeneratedVocabulary(resolvedActivation)
      );
      activeByKey.set(
        createActiveKey(activation),
        activation
      );
    }
  }
}

function resolveRegisteredExtension(
  expression: ts.Expression,
  registrationFileName: string,
  context: TypeScriptAnalysisContext
): I18nActivationState | undefined {
  if (context.depth <= 0) {
    return undefined;
  }

  const unwrappedExpression = unwrapExpression(expression);
  if (ts.isIdentifier(unwrappedExpression)) {
    const symbol = context.checker.getSymbolAtLocation(unwrappedExpression);
    return resolveRegisteredExtensionFromSymbol(
      symbol,
      registrationFileName,
      context
    );
  }

  if (ts.isCallExpression(unwrappedExpression)) {
    const customizeState = resolveI18nCustomizeCall(
      unwrappedExpression,
      registrationFileName,
      context
    );
    if (customizeState !== undefined) {
      return customizeState;
    }

    const callable = resolveCallable(unwrappedExpression.expression, context);
    if (callable === undefined) {
      return undefined;
    }

    const returnExpression = readReturnExpression(callable);
    if (returnExpression === undefined) {
      return undefined;
    }

    const callContext = bindCallArguments(
      callable,
      unwrappedExpression,
      context
    );
    if (callContext === undefined) {
      return undefined;
    }

    return resolveRegisteredExtension(
      returnExpression,
      registrationFileName,
      callContext
    );
  }

  return undefined;
}

function resolveRegisteredExtensionFromSymbol(
  symbol: ts.Symbol | undefined,
  registrationFileName: string,
  context: TypeScriptAnalysisContext
): I18nActivationState | undefined {
  if (symbol === undefined || context.depth <= 0) {
    return undefined;
  }

  const resolvedSymbol = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? context.checker.getAliasedSymbol(symbol)
    : symbol;
  const family = resolveKnownExtensionFamily(resolvedSymbol);
  if (family === ExtensionFamilyKind.I18n) {
    return createBaseI18nActivation(registrationFileName);
  }

  for (const declaration of resolvedSymbol.declarations ?? []) {
    if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
      return resolveRegisteredExtension(
        declaration.initializer,
        registrationFileName,
        consumeAnalysisDepth(context)
      );
    }

    if (
      ts.isFunctionDeclaration(declaration) ||
      ts.isMethodDeclaration(declaration)
    ) {
      const returnExpression = readReturnExpression(declaration);
      if (returnExpression === undefined) {
        continue;
      }

      return resolveRegisteredExtension(
        returnExpression,
        registrationFileName,
        consumeAnalysisDepth(context)
      );
    }
  }

  return undefined;
}

function resolveI18nCustomizeCall(
  expression: ts.CallExpression,
  registrationFileName: string,
  context: TypeScriptAnalysisContext
): I18nActivationState | undefined {
  if (!ts.isPropertyAccessExpression(expression.expression) || expression.expression.name.text !== "customize") {
    return undefined;
  }

  const baseActivation = resolveRegisteredExtension(
    expression.expression.expression,
    registrationFileName,
    consumeAnalysisDepth(context)
  );
  if (baseActivation?.family !== ExtensionFamilyKind.I18n) {
    return undefined;
  }

  const provider = expression.arguments[0];
  if (provider === undefined) {
    return baseActivation;
  }

  const aliasResolution = resolveI18nAliasResolution(
    provider,
    context
  );

  if (aliasResolution.kind === I18nAliasResolutionKind.NoAssignment) {
    return baseActivation;
  }

  if (aliasResolution.kind === I18nAliasResolutionKind.ExplicitAliases) {
    return {
      ...baseActivation,
      aliasNames: aliasResolution.aliases,
      closureKind: aliasResolution.closureKind
    };
  }

  return {
    ...baseActivation,
    aliasNames: undefined,
    closureKind: aliasResolution.closureKind,
    underclosedNote: aliasResolution.note
  };
}

const enum I18nAliasResolutionKind {
  NoAssignment = 1,
  ExplicitAliases = 2,
  Underclosed = 3
}

type I18nAliasResolution =
  | {
      readonly kind: I18nAliasResolutionKind.NoAssignment;
    }
  | {
      readonly kind: I18nAliasResolutionKind.ExplicitAliases;
      readonly aliases: readonly string[];
      readonly closureKind: ExtensionAdmissionClosureKind;
    }
  | {
      readonly kind: I18nAliasResolutionKind.Underclosed;
      readonly closureKind: ExtensionAdmissionClosureKind;
      readonly note: string;
    };

function resolveI18nAliasResolution(
  providerExpression: ts.Expression,
  context: TypeScriptAnalysisContext
): I18nAliasResolution {
  const unwrappedProvider = unwrapExpression(providerExpression);
  const callable = (
    ts.isArrowFunction(unwrappedProvider) ||
    ts.isFunctionExpression(unwrappedProvider)
  )
    ? unwrappedProvider
    : (
        ts.isIdentifier(unwrappedProvider) ||
        ts.isPropertyAccessExpression(unwrappedProvider)
      )
      ? resolveCallable(unwrappedProvider, context)
      : undefined;
  if (callable === undefined) {
    return {
      kind: I18nAliasResolutionKind.Underclosed,
      closureKind: ExtensionAdmissionClosureKind.SourceAnalyzable,
      note: "I18nConfiguration customize() callback could not be resolved inside the current bounded builder-history ceiling."
    };
  }

  const optionsParameter = callable.parameters[0];
  if (optionsParameter === undefined || !ts.isIdentifier(optionsParameter.name)) {
    return {
      kind: I18nAliasResolutionKind.Underclosed,
      closureKind: ExtensionAdmissionClosureKind.SourceAnalyzable,
      note: "I18nConfiguration customize() callback used a non-identifier options parameter that stayed underclosed."
    };
  }

  const assignment = readLatestPropertyAssignment(
    callable,
    optionsParameter.name.text,
    "translationAttributeAliases"
  );
  if (assignment === undefined) {
    return {
      kind: I18nAliasResolutionKind.NoAssignment
    };
  }

  const aliasValue = resolveExpressionValue(
    assignment.rightHandSide,
    consumeAnalysisDepth(context)
  );
  const resolvedAliases = aliasValue?.readStringArray();
  if (resolvedAliases === undefined) {
    return {
      kind: I18nAliasResolutionKind.Underclosed,
      closureKind: mapAnalysisClosureKind(assignment.closureKind),
      note: "I18nConfiguration customize() exposed active generated-vocabulary pressure, but the alias set stayed underclosed inside the current bounded builder-history ceiling."
    };
  }

  return {
    kind: I18nAliasResolutionKind.ExplicitAliases,
    aliases: resolvedAliases,
    closureKind: mapAnalysisClosureKind(
      aliasValue?.closureKind ?? TypeScriptAnalysisClosureKind.SourceAnalyzable
    )
  };
}

function readLatestPropertyAssignment(
  callable: ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  parameterName: string,
  propertyName: string
): {
  readonly rightHandSide: ts.Expression;
  readonly closureKind: TypeScriptAnalysisClosureKind;
} | undefined {
  if (callable.body === undefined) {
    return undefined;
  }

  const assignments: ts.Expression[] = [];

  if (ts.isExpression(callable.body)) {
    const bodyAssignment = readPropertyAssignmentExpression(
      callable.body,
      parameterName,
      propertyName
    );
    if (bodyAssignment !== undefined) {
      assignments.push(bodyAssignment);
    }
  } else {
    for (const statement of callable.body.statements) {
      if (!ts.isExpressionStatement(statement)) {
        continue;
      }

      const statementAssignment = readPropertyAssignmentExpression(
        statement.expression,
        parameterName,
        propertyName
      );
      if (statementAssignment !== undefined) {
        assignments.push(statementAssignment);
      }
    }
  }

  const latestAssignment = assignments.at(-1);
  if (latestAssignment === undefined) {
    return undefined;
  }

  return {
    rightHandSide: latestAssignment,
    closureKind: inferAssignmentClosureKind(latestAssignment)
  };
}

function readPropertyAssignmentExpression(
  expression: ts.Expression,
  parameterName: string,
  propertyName: string
): ts.Expression | undefined {
  const unwrappedExpression = unwrapExpression(expression);
  if (
    !ts.isBinaryExpression(unwrappedExpression) ||
    unwrappedExpression.operatorToken.kind !== ts.SyntaxKind.EqualsToken
  ) {
    return undefined;
  }

  if (
    !ts.isPropertyAccessExpression(unwrappedExpression.left) ||
    !ts.isIdentifier(unwrappedExpression.left.expression) ||
    unwrappedExpression.left.expression.text !== parameterName ||
    unwrappedExpression.left.name.text !== propertyName
  ) {
    return undefined;
  }

  return unwrappedExpression.right;
}

function bindCallArguments(
  callable: ts.FunctionLikeDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): TypeScriptAnalysisContext | undefined {
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

  return createAnalysisContext(
    context.checker,
    bindings,
    context.depth - 1,
    context.seenDeclarations
  );
}

function createBaseI18nActivation(
  registrationFileName: string
): I18nActivationState {
  return {
    family: ExtensionFamilyKind.I18n,
    profiles: [
      ExtensionConfigurationProfileKind.CustomizedDefault,
      ExtensionConfigurationProfileKind.GeneratedSyntax
    ],
    packageQualifier: "i18n",
    registrationFileName,
    closureKind: ExtensionAdmissionClosureKind.GeneratedExplicit,
    aliasNames: ["t"]
  };
}

function createGeneratedVocabulary(
  activation: I18nActivationState
): readonly GeneratedTemplateVocabularyMember[] {
  const aliasNames = activation.aliasNames ?? [];
  return aliasNames.flatMap((aliasName) => [
    new GeneratedTemplateVocabularyMember(
      activation.family,
      GeneratedTemplateVocabularyKind.AttributePattern,
      aliasName,
      "t",
      activation.closureKind
    ),
    new GeneratedTemplateVocabularyMember(
      activation.family,
      GeneratedTemplateVocabularyKind.BindingCommand,
      `${aliasName}.bind`,
      "t.bind",
      activation.closureKind
    )
  ]);
}

function createActiveKey(
  activation: ActiveExtensionActivation
): string {
  return `${activation.registrationFileName}:${activation.family}:${activation.packageQualifier}`;
}

function createUnderclosedKey(
  activation: UnderclosedExtensionActivation
): string {
  return `${activation.registrationFileName}:${activation.family ?? 0}:${activation.packageQualifier ?? "unknown"}`;
}

function resolveKnownExtensionFamily(
  symbol: ts.Symbol
): ExtensionFamilyKind | undefined {
  return symbol.name === "I18nConfiguration"
    ? ExtensionFamilyKind.I18n
    : undefined;
}

function mapAnalysisClosureKind(
  closureKind: TypeScriptAnalysisClosureKind
): ExtensionAdmissionClosureKind {
  switch (closureKind) {
    case TypeScriptAnalysisClosureKind.DeclaredExplicit:
      return ExtensionAdmissionClosureKind.GeneratedExplicit;
    case TypeScriptAnalysisClosureKind.SourceAnalyzable:
      return ExtensionAdmissionClosureKind.SourceAnalyzable;
    default:
      return ExtensionAdmissionClosureKind.RuntimeOnly;
  }
}

function inferAssignmentClosureKind(
  expression: ts.Expression
): TypeScriptAnalysisClosureKind {
  if (
    ts.isArrayLiteralExpression(expression) ||
    ts.isObjectLiteralExpression(expression) ||
    ts.isStringLiteralLike(expression)
  ) {
    return TypeScriptAnalysisClosureKind.DeclaredExplicit;
  }

  if (
    ts.isIdentifier(expression) ||
    ts.isPropertyAccessExpression(expression) ||
    ts.isCallExpression(expression)
  ) {
    return TypeScriptAnalysisClosureKind.SourceAnalyzable;
  }

  return TypeScriptAnalysisClosureKind.RuntimeOnly;
}

function isRegisterCall(
  expression: ts.CallExpression
): boolean {
  return ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "register";
}

function unwrapExpression(
  expression: ts.Expression
): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function compareActiveExtensions(
  left: ActiveExtensionActivation,
  right: ActiveExtensionActivation
): number {
  return left.registrationFileName.localeCompare(right.registrationFileName) ||
    left.family - right.family;
}

function compareUnderclosedExtensions(
  left: UnderclosedExtensionActivation,
  right: UnderclosedExtensionActivation
): number {
  return left.registrationFileName.localeCompare(right.registrationFileName) ||
    (left.family ?? 0) - (right.family ?? 0);
}
