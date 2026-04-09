import * as ts from "typescript";
import {
  consumeAnalysisDepth,
  readReturnExpression,
  resolveCallable,
  type TypeScriptAnalysisContext
} from "./resolved-value.js";

export const enum FrameworkConfigurationRootKind {
  Router = 1,
  I18n = 2
}

export const enum FrameworkDirectRegistrationBuilderKind {
  RegistrationBuilder = 1,
  WrongDiHelper = 2
}

export const enum FrameworkRootWrapperKind {
  App = 1,
  Enhance = 2,
  Hydrate = 3
}

export const enum FrameworkRegisterReceiverKind {
  KernelRegistration = 1,
  RegistryInsertion = 2
}

const enum KnownFrameworkSurfaceKind {
  DI = 1,
  Registration = 2,
  Container = 3,
  AppTask = 4,
  RouterConfiguration = 5,
  I18nConfiguration = 6,
  Aurelia = 7
}

type KnownFrameworkSurfaceDescriptor = {
  readonly kind: KnownFrameworkSurfaceKind;
  readonly exactNames: readonly string[];
  readonly packageHints: readonly string[];
  readonly typeNames?: readonly string[];
};

const KNOWN_FRAMEWORK_SURFACES: readonly KnownFrameworkSurfaceDescriptor[] = [
  {
    kind: KnownFrameworkSurfaceKind.DI,
    exactNames: ["DI"],
    packageHints: ["packages/kernel/src/di.ts"]
  },
  {
    kind: KnownFrameworkSurfaceKind.Registration,
    exactNames: ["Registration"],
    packageHints: ["packages/kernel/src/di.registration.ts"]
  },
  {
    kind: KnownFrameworkSurfaceKind.Container,
    exactNames: ["IContainer", "Container", "ServiceContainer"],
    packageHints: ["packages/kernel/src/di.ts"],
    typeNames: ["IContainer", "Container", "ServiceContainer"]
  },
  {
    kind: KnownFrameworkSurfaceKind.AppTask,
    exactNames: ["AppTask"],
    packageHints: ["packages/runtime-html/src/app-task.ts"]
  },
  {
    kind: KnownFrameworkSurfaceKind.RouterConfiguration,
    exactNames: ["RouterConfiguration"],
    packageHints: ["packages/router/src/configuration.ts"]
  },
  {
    kind: KnownFrameworkSurfaceKind.I18nConfiguration,
    exactNames: ["I18nConfiguration"],
    packageHints: ["packages/i18n/src/configuration.ts"]
  },
  {
    kind: KnownFrameworkSurfaceKind.Aurelia,
    exactNames: ["Aurelia"],
    packageHints: ["packages/runtime-html/src/aurelia.ts"]
  }
] as const;

const REGISTRY_NAME_PATTERN = /(^|[./\\])([A-Za-z0-9]+Registry)$/i;
const DIRECT_REGISTRATION_BUILDER_METHOD_NAMES = new Set([
  "singleton",
  "transient",
  "instance"
]);
const APP_TASK_MEMBER_NAMES = new Set([
  "creating",
  "created",
  "activating",
  "activated",
  "hydrating",
  "hydrated",
  "deactivating",
  "deactivated"
]);
const ROOT_WRAPPER_MEMBER_KINDS = new Map<string, FrameworkRootWrapperKind>([
  ["app", FrameworkRootWrapperKind.App],
  ["enhance", FrameworkRootWrapperKind.Enhance],
  ["hydrate", FrameworkRootWrapperKind.Hydrate]
]);

export function resolveFrameworkConfigurationRootKind(
  expression: ts.Expression,
  context: TypeScriptAnalysisContext
): FrameworkConfigurationRootKind | undefined {
  const surface = resolveKnownFrameworkSurfaceFromExpression(
    expression,
    context
  );
  switch (surface) {
    case KnownFrameworkSurfaceKind.RouterConfiguration:
      return FrameworkConfigurationRootKind.Router;
    case KnownFrameworkSurfaceKind.I18nConfiguration:
      return FrameworkConfigurationRootKind.I18n;
    default:
      return undefined;
  }
}

export function resolveFrameworkConfigurationRootKindFromSymbol(
  symbol: ts.Symbol | undefined,
  context: TypeScriptAnalysisContext
): FrameworkConfigurationRootKind | undefined {
  const surface = resolveKnownFrameworkSurfaceFromSymbol(symbol, context);
  switch (surface) {
    case KnownFrameworkSurfaceKind.RouterConfiguration:
      return FrameworkConfigurationRootKind.Router;
    case KnownFrameworkSurfaceKind.I18nConfiguration:
      return FrameworkConfigurationRootKind.I18n;
    default:
      return undefined;
  }
}

export function resolveFrameworkDirectRegistrationBuilderKind(
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): FrameworkDirectRegistrationBuilderKind | undefined {
  if (!ts.isPropertyAccessExpression(expression.expression)) {
    return undefined;
  }

  const memberName = expression.expression.name.text;
  if (memberName === "aliasTo" && ts.isCallExpression(expression.expression.expression)) {
    return resolveFrameworkDirectRegistrationBuilderKind(
      expression.expression.expression,
      context
    );
  }

  if (!DIRECT_REGISTRATION_BUILDER_METHOD_NAMES.has(memberName)) {
    return undefined;
  }

  const surface = resolveKnownFrameworkSurfaceFromExpression(
    expression.expression.expression,
    context
  );
  switch (surface) {
    case KnownFrameworkSurfaceKind.Registration:
      return FrameworkDirectRegistrationBuilderKind.RegistrationBuilder;
    case KnownFrameworkSurfaceKind.DI:
      return FrameworkDirectRegistrationBuilderKind.WrongDiHelper;
    default:
      return undefined;
  }
}

export function resolveFrameworkRegisterReceiverKind(
  expression: ts.Expression,
  context: TypeScriptAnalysisContext
): FrameworkRegisterReceiverKind | undefined {
  const surface = resolveKnownFrameworkSurfaceFromExpression(
    expression,
    context
  );
  if (
    surface === KnownFrameworkSurfaceKind.DI ||
    surface === KnownFrameworkSurfaceKind.Registration ||
    surface === KnownFrameworkSurfaceKind.Container
  ) {
    return FrameworkRegisterReceiverKind.KernelRegistration;
  }

  const names = readExpressionAndTypeNames(expression, context);
  return names.some((name) => REGISTRY_NAME_PATTERN.test(name))
    ? FrameworkRegisterReceiverKind.RegistryInsertion
    : undefined;
}

export function resolveFrameworkRootWrapperKind(
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): FrameworkRootWrapperKind | undefined {
  if (!ts.isPropertyAccessExpression(expression.expression)) {
    return undefined;
  }

  const memberKind = ROOT_WRAPPER_MEMBER_KINDS.get(expression.expression.name.text);
  if (memberKind === undefined) {
    return undefined;
  }

  return resolveKnownFrameworkSurfaceFromExpression(
    expression.expression.expression,
    context
  ) === KnownFrameworkSurfaceKind.Aurelia
    ? memberKind
    : undefined;
}

export function isFrameworkAppTaskCall(
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): boolean {
  return ts.isPropertyAccessExpression(expression.expression) &&
    APP_TASK_MEMBER_NAMES.has(expression.expression.name.text) &&
    resolveKnownFrameworkSurfaceFromExpression(
      expression.expression.expression,
      context
    ) === KnownFrameworkSurfaceKind.AppTask;
}

export function isFrameworkConfigurationCustomizeCall(
  expression: ts.CallExpression,
  context: TypeScriptAnalysisContext
): FrameworkConfigurationRootKind | undefined {
  if (
    !ts.isPropertyAccessExpression(expression.expression) ||
    expression.expression.name.text !== "customize"
  ) {
    return undefined;
  }

  return resolveFrameworkConfigurationRootKind(
    expression.expression.expression,
    context
  );
}

export function resolveKnownFrameworkSurfaceFromExpression(
  expression: ts.Expression,
  context: TypeScriptAnalysisContext
): KnownFrameworkSurfaceKind | undefined {
  const unwrappedExpression = unwrapExpression(expression);

  if (ts.isIdentifier(unwrappedExpression) || ts.isPropertyAccessExpression(unwrappedExpression)) {
    return resolveKnownFrameworkSurfaceFromSymbol(
      resolveExpressionSymbol(unwrappedExpression, context),
      context
    );
  }

  if (ts.isCallExpression(unwrappedExpression)) {
    const callable = resolveCallable(unwrappedExpression.expression, context);
    const returnExpression = callable === undefined
      ? undefined
      : readReturnExpression(callable);
    return returnExpression === undefined
      ? undefined
      : resolveKnownFrameworkSurfaceFromExpression(
          returnExpression,
          consumeAnalysisDepth(context)
        );
  }

  const type = context.checker.getTypeAtLocation(unwrappedExpression);
  return resolveKnownFrameworkSurfaceFromTypeSymbol(type.getSymbol());
}

function resolveKnownFrameworkSurfaceFromSymbol(
  symbol: ts.Symbol | undefined,
  context: TypeScriptAnalysisContext
): KnownFrameworkSurfaceKind | undefined {
  if (symbol === undefined) {
    return undefined;
  }

  const resolvedSymbol = resolveAliasedSymbol(symbol, context);
  const declarationPaths = readDeclarationPaths(resolvedSymbol);
  for (const descriptor of KNOWN_FRAMEWORK_SURFACES) {
    if (matchesFrameworkSurfaceDescriptor(
      descriptor,
      resolvedSymbol.name,
      declarationPaths
    )) {
      return descriptor.kind;
    }
  }

  const location = resolvedSymbol.valueDeclaration ?? resolvedSymbol.declarations?.[0];
  if (location === undefined) {
    return undefined;
  }

  return resolveKnownFrameworkSurfaceFromTypeSymbol(
    context.checker.getTypeOfSymbolAtLocation(resolvedSymbol, location).getSymbol()
  );
}

function resolveKnownFrameworkSurfaceFromTypeSymbol(
  symbol: ts.Symbol | undefined
): KnownFrameworkSurfaceKind | undefined {
  if (symbol === undefined) {
    return undefined;
  }

  const declarationPaths = readDeclarationPaths(symbol);
  for (const descriptor of KNOWN_FRAMEWORK_SURFACES) {
    if (
      descriptor.typeNames?.includes(symbol.name) ||
      matchesFrameworkSurfaceDescriptor(descriptor, symbol.name, declarationPaths)
    ) {
      return descriptor.kind;
    }
  }

  return undefined;
}

function matchesFrameworkSurfaceDescriptor(
  descriptor: KnownFrameworkSurfaceDescriptor,
  symbolName: string,
  declarationPaths: readonly string[]
): boolean {
  if (declarationPaths.some((path) =>
    descriptor.packageHints.some((hint) => path.includes(hint))
  )) {
    return descriptor.exactNames.includes(symbolName) ||
      descriptor.typeNames?.includes(symbolName) === true;
  }

  return descriptor.exactNames.includes(symbolName) ||
    descriptor.typeNames?.includes(symbolName) === true;
}

function readExpressionAndTypeNames(
  expression: ts.Expression,
  context: TypeScriptAnalysisContext
): readonly string[] {
  const names = new Set<string>();
  const unwrappedExpression = unwrapExpression(expression);
  if (ts.isIdentifier(unwrappedExpression)) {
    names.add(unwrappedExpression.text);
  } else if (ts.isPropertyAccessExpression(unwrappedExpression)) {
    names.add(unwrappedExpression.name.text);
  }

  const symbol = ts.isIdentifier(unwrappedExpression) || ts.isPropertyAccessExpression(unwrappedExpression)
    ? resolveExpressionSymbol(unwrappedExpression, context)
    : undefined;
  const resolvedSymbol = symbol === undefined
    ? undefined
    : resolveAliasedSymbol(symbol, context);
  if (resolvedSymbol !== undefined) {
    names.add(resolvedSymbol.name);
  }

  const type = context.checker.getTypeAtLocation(unwrappedExpression);
  const typeSymbol = type.getSymbol();
  if (typeSymbol !== undefined) {
    names.add(typeSymbol.name);
  }

  return [...names];
}

function resolveExpressionSymbol(
  expression: ts.Identifier | ts.PropertyAccessExpression,
  context: TypeScriptAnalysisContext
): ts.Symbol | undefined {
  return ts.isIdentifier(expression)
    ? context.checker.getSymbolAtLocation(expression)
    : (
        context.checker.getSymbolAtLocation(expression.name) ??
        context.checker.getSymbolAtLocation(expression)
      );
}

function resolveAliasedSymbol(
  symbol: ts.Symbol,
  context: TypeScriptAnalysisContext
): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? context.checker.getAliasedSymbol(symbol)
    : symbol;
}

function readDeclarationPaths(symbol: ts.Symbol): readonly string[] {
  return (symbol.declarations ?? [])
    .map((declaration) => declaration.getSourceFile().fileName.replace(/\\/g, "/"));
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
