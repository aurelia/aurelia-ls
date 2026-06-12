import ts from "typescript";

import { propertyNameText } from "../../source/semantic-surface/index.js";

/** Source-file-local Aurelia imports shared by workspace and public-plugin architecture lenses. */
export class AureliaSourceImports {
  readonly aureliaImportedNames = new Map<string, string>();
  readonly aureliaNamespaces = new Set<string>();
  readonly aureliaDecoratorImportedNames = new Map<string, string>();
  readonly aureliaDecoratorNamespaces = new Set<string>();
  readonly aureliaKernelImportedNames = new Map<string, string>();
  readonly aureliaKernelNamespaces = new Set<string>();
  hasRouterPackageImport = false;
  readonly routerIdentifiers = new Set<string>();
  readonly routerImportedNames = new Map<string, string>();
  readonly routerNamespaces = new Set<string>();
  readonly routerReceiverNames = new Set<string>();
}

export type ReceiverDeclaration =
  | ts.VariableDeclaration
  | ts.ParameterDeclaration
  | ts.PropertyDeclaration;

export function isReceiverDeclaration(node: ts.Node): node is ReceiverDeclaration {
  return ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isPropertyDeclaration(node);
}

export function readAureliaSourceImportsInto(
  sourceFile: ts.SourceFile,
  bindings: AureliaSourceImports,
): void {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    const namedBindings = statement.importClause?.namedBindings;

    if (isAureliaBootstrapPackageSpecifier(specifier)) {
      if (statement.importClause?.name !== undefined) {
        bindings.aureliaImportedNames.set(statement.importClause.name.text, "Aurelia");
      }
      if (namedBindings !== undefined && ts.isNamespaceImport(namedBindings)) {
        bindings.aureliaNamespaces.add(namedBindings.name.text);
      }
      if (namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          const importedName = (element.propertyName ?? element.name).text;
          if (importedName === "Aurelia") {
            bindings.aureliaImportedNames.set(element.name.text, importedName);
          }
        }
      }
    }

    if (isAureliaDecoratorPackageSpecifier(specifier)) {
      if (namedBindings !== undefined && ts.isNamespaceImport(namedBindings)) {
        bindings.aureliaDecoratorNamespaces.add(namedBindings.name.text);
      }
      if (namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          const importedName = (element.propertyName ?? element.name).text;
          if (isAureliaDecoratorExportName(importedName)) {
            bindings.aureliaDecoratorImportedNames.set(element.name.text, importedName);
          }
        }
      }
    }

    if (isAureliaKernelApiPackageSpecifier(specifier)) {
      if (namedBindings !== undefined && ts.isNamespaceImport(namedBindings)) {
        bindings.aureliaKernelNamespaces.add(namedBindings.name.text);
      }
      if (namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          const importedName = (element.propertyName ?? element.name).text;
          if (isAureliaKernelApiExportName(importedName)) {
            bindings.aureliaKernelImportedNames.set(element.name.text, importedName);
          }
        }
      }
    }

    if (isAureliaRouterPackageSpecifier(specifier)) {
      bindings.hasRouterPackageImport = true;
      if (namedBindings === undefined) {
        continue;
      }
      if (ts.isNamespaceImport(namedBindings)) {
        bindings.routerNamespaces.add(namedBindings.name.text);
        continue;
      }
      for (const element of namedBindings.elements) {
        const importedName = (element.propertyName ?? element.name).text;
        if (isRouterExportName(importedName)) {
          bindings.routerIdentifiers.add(element.name.text);
          bindings.routerImportedNames.set(element.name.text, importedName);
        }
      }
    }
  }
  readCommonJsAureliaRequiresInto(sourceFile, bindings);
}

function readCommonJsAureliaRequiresInto(
  sourceFile: ts.SourceFile,
  bindings: AureliaSourceImports,
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) {
      readCommonJsRequireDeclarationInto(node, bindings);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
}

function readCommonJsRequireDeclarationInto(
  declaration: ts.VariableDeclaration,
  bindings: AureliaSourceImports,
): void {
  const initializer = declaration.initializer;
  if (initializer === undefined) {
    return;
  }
  const requireRead = readCommonJsRequireExpression(initializer);
  if (requireRead === null) {
    return;
  }

  if (ts.isIdentifier(declaration.name)) {
    if (requireRead.propertyName === null) {
      admitCommonJsNamespaceBinding(bindings, declaration.name.text, requireRead.specifier);
      return;
    }
    admitCommonJsNamedBinding(bindings, declaration.name.text, requireRead.propertyName, requireRead.specifier);
    return;
  }

  if (requireRead.propertyName !== null || !ts.isObjectBindingPattern(declaration.name)) {
    return;
  }
  for (const element of declaration.name.elements) {
    if (!ts.isIdentifier(element.name)) {
      continue;
    }
    const importedName = element.propertyName === undefined
      ? element.name.text
      : propertyNameText(element.propertyName);
    if (importedName === null) {
      continue;
    }
    admitCommonJsNamedBinding(bindings, element.name.text, importedName, requireRead.specifier);
  }
}

function readCommonJsRequireExpression(
  expression: ts.Expression,
): { readonly specifier: string; readonly propertyName: string | null } | null {
  if (ts.isCallExpression(expression)) {
    return readCommonJsRequireCall(expression);
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const call = readCommonJsRequireCall(expression.expression);
    return call === null ? null : {
      specifier: call.specifier,
      propertyName: expression.name.text,
    };
  }
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined) {
    const call = readCommonJsRequireCall(expression.expression);
    if (call === null || !ts.isStringLiteralLike(expression.argumentExpression)) {
      return null;
    }
    return {
      specifier: call.specifier,
      propertyName: expression.argumentExpression.text,
    };
  }
  return null;
}

export function readCommonJsRequireModuleSpecifier(
  expression: ts.Expression,
): string | null {
  return readCommonJsRequireCall(expression)?.specifier ?? null;
}

export function isInsideCommonJsRequireDeclaration(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isVariableDeclaration(current) && current.initializer !== undefined && readCommonJsRequireExpression(current.initializer) !== null) {
      return true;
    }
    if (ts.isSourceFile(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

export function isInsideImportDeclaration(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isImportDeclaration(current)) {
      return true;
    }
    if (ts.isSourceFile(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function readCommonJsRequireCall(
  expression: ts.Expression,
): { readonly specifier: string; readonly propertyName: null } | null {
  if (
    !ts.isCallExpression(expression) ||
    !ts.isIdentifier(expression.expression) ||
    expression.expression.text !== "require"
  ) {
    return null;
  }
  const specifier = expression.arguments[0];
  return specifier !== undefined && ts.isStringLiteralLike(specifier)
    ? { specifier: specifier.text, propertyName: null }
    : null;
}

function admitCommonJsNamespaceBinding(
  bindings: AureliaSourceImports,
  localName: string,
  specifier: string,
): void {
  if (isAureliaBootstrapPackageSpecifier(specifier)) {
    bindings.aureliaNamespaces.add(localName);
  }
  if (isAureliaDecoratorPackageSpecifier(specifier)) {
    bindings.aureliaDecoratorNamespaces.add(localName);
  }
  if (isAureliaKernelApiPackageSpecifier(specifier)) {
    bindings.aureliaKernelNamespaces.add(localName);
  }
  if (isAureliaRouterPackageSpecifier(specifier)) {
    bindings.hasRouterPackageImport = true;
    bindings.routerNamespaces.add(localName);
  }
}

function admitCommonJsNamedBinding(
  bindings: AureliaSourceImports,
  localName: string,
  importedName: string,
  specifier: string,
): void {
  if (isAureliaBootstrapPackageSpecifier(specifier) && importedName === "Aurelia") {
    bindings.aureliaImportedNames.set(localName, importedName);
  }
  if (isAureliaDecoratorPackageSpecifier(specifier) && isAureliaDecoratorExportName(importedName)) {
    bindings.aureliaDecoratorImportedNames.set(localName, importedName);
  }
  if (isAureliaKernelApiPackageSpecifier(specifier) && isAureliaKernelApiExportName(importedName)) {
    bindings.aureliaKernelImportedNames.set(localName, importedName);
  }
  if (isAureliaRouterPackageSpecifier(specifier)) {
    bindings.hasRouterPackageImport = true;
    if (isRouterExportName(importedName)) {
      bindings.routerIdentifiers.add(localName);
      bindings.routerImportedNames.set(localName, importedName);
    }
  }
}

export function aureliaDecoratorExportNameForExpression(
  expression: ts.Expression | undefined,
  bindings: AureliaSourceImports,
): string | null {
  if (expression == null) {
    return null;
  }
  if (ts.isIdentifier(expression)) {
    return bindings.aureliaDecoratorImportedNames.get(expression.text) ?? null;
  }
  return ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    bindings.aureliaDecoratorNamespaces.has(expression.expression.text) &&
    isAureliaDecoratorExportName(expression.name.text)
    ? expression.name.text
    : null;
}

export function isAureliaKernelReference(
  expression: ts.Expression | ts.EntityName,
  exportName: string,
  bindings: AureliaSourceImports,
): boolean {
  if (ts.isIdentifier(expression)) {
    return bindings.aureliaKernelImportedNames.get(expression.text) === exportName;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return ts.isIdentifier(expression.expression) &&
      bindings.aureliaKernelNamespaces.has(expression.expression.text) &&
      expression.name.text === exportName;
  }
  if (ts.isQualifiedName(expression)) {
    return ts.isIdentifier(expression.left) &&
      bindings.aureliaKernelNamespaces.has(expression.left.text) &&
      expression.right.text === exportName;
  }
  return false;
}

export function isAureliaContainerReference(
  expression: ts.Expression | ts.EntityName,
  bindings: AureliaSourceImports,
): boolean {
  return isAureliaKernelReference(expression, "IContainer", bindings);
}

export function isAureliaContainerReceiverTypeNode(
  type: ts.TypeNode | undefined,
  bindings: AureliaSourceImports,
): boolean {
  return type !== undefined &&
    ts.isTypeReferenceNode(type) &&
    isAureliaContainerReference(type.typeName, bindings);
}

export function aureliaResolveFirstArgument(
  expression: ts.Expression | undefined,
  bindings: AureliaSourceImports,
): ts.Expression | null {
  if (
    expression === undefined ||
    !ts.isCallExpression(expression) ||
    !isAureliaKernelReference(expression.expression, "resolve", bindings)
  ) {
    return null;
  }
  const first = expression.arguments[0];
  return first === undefined || ts.isSpreadElement(first) ? null : first;
}

export function isAureliaConstructorReference(
  expression: ts.Expression,
  bindings: AureliaSourceImports,
): boolean {
  if (ts.isIdentifier(expression)) {
    return bindings.aureliaImportedNames.get(expression.text) === "Aurelia";
  }
  return ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "Aurelia" &&
    ts.isIdentifier(expression.expression) &&
    bindings.aureliaNamespaces.has(expression.expression.text);
}

export function isAureliaReceiverEntityName(
  name: ts.EntityName,
  bindings: AureliaSourceImports,
): boolean {
  if (ts.isIdentifier(name)) {
    return bindings.aureliaImportedNames.get(name.text) === "Aurelia";
  }
  return ts.isIdentifier(name.left) &&
    bindings.aureliaNamespaces.has(name.left.text) &&
    name.right.text === "Aurelia";
}

export function isImportedRouterDecorator(
  expression: ts.Expression | undefined,
  bindings: AureliaSourceImports,
): boolean {
  if (expression == null) {
    return false;
  }
  if (ts.isIdentifier(expression)) {
    return bindings.routerImportedNames.get(expression.text) === "route";
  }
  return ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "route" &&
    ts.isIdentifier(expression.expression) &&
    bindings.routerNamespaces.has(expression.expression.text);
}

export function isImportedRouterConfigurationExpression(
  expression: ts.Expression,
  bindings: AureliaSourceImports,
): boolean {
  if (ts.isIdentifier(expression)) {
    return bindings.routerImportedNames.get(expression.text) === "RouterConfiguration";
  }
  return ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "RouterConfiguration" &&
    ts.isIdentifier(expression.expression) &&
    bindings.routerNamespaces.has(expression.expression.text);
}

export function isRouterReceiverReference(
  expression: ts.Expression | ts.EntityName,
  bindings: AureliaSourceImports,
): boolean {
  if (ts.isIdentifier(expression)) {
    return isRouterReceiverExportName(bindings.routerImportedNames.get(expression.text) ?? "");
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return ts.isIdentifier(expression.expression) &&
      bindings.routerNamespaces.has(expression.expression.text) &&
      isRouterReceiverExportName(expression.name.text);
  }
  if (ts.isQualifiedName(expression)) {
    return ts.isIdentifier(expression.left) &&
      bindings.routerNamespaces.has(expression.left.text) &&
      isRouterReceiverExportName(expression.right.text);
  }
  return false;
}

export function isRouterReceiverTypeNode(
  type: ts.TypeNode | undefined,
  bindings: AureliaSourceImports,
): boolean {
  return type !== undefined &&
    ts.isTypeReferenceNode(type) &&
    isRouterReceiverReference(type.typeName, bindings);
}

export function isRouterReceiverInitializer(
  expression: ts.Expression | undefined,
  bindings: AureliaSourceImports,
): boolean {
  if (expression === undefined) {
    return false;
  }
  if (ts.isNewExpression(expression)) {
    return isRouterReceiverReference(expression.expression, bindings);
  }
  const resolved = aureliaResolveFirstArgument(expression, bindings);
  if (resolved !== null) {
    return isRouterReceiverReference(resolved, bindings);
  }
  return isStoredRouterReceiverExpression(expression, bindings);
}

export function isRouterReceiverValueExpression(
  expression: ts.Expression,
  bindings: AureliaSourceImports,
): boolean {
  return isStoredRouterReceiverExpression(expression, bindings) ||
    isRouterReceiverInitializer(expression, bindings);
}

function isStoredRouterReceiverExpression(
  expression: ts.Expression,
  bindings: AureliaSourceImports,
): boolean {
  return (
    (ts.isIdentifier(expression) && bindings.routerReceiverNames.has(expression.text)) ||
    (
      ts.isPropertyAccessExpression(expression) &&
      expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      bindings.routerReceiverNames.has(expression.name.text)
    )
  );
}

export function isAureliaDecoratorExportName(text: string): boolean {
  switch (text) {
    case "customElement":
    case "customAttribute":
    case "valueConverter":
    case "bindingBehavior":
    case "bindable":
    case "watch":
    case "CustomElement":
    case "CustomAttribute":
      return true;
    default:
      return false;
  }
}

export function isAureliaKernelApiExportName(text: string): boolean {
  switch (text) {
    case "resolve":
    case "Registration":
    case "AppTask":
    case "IContainer":
      return true;
    default:
      return false;
  }
}

export function isContainerLookupMethodName(name: string): boolean {
  switch (name) {
    case "get":
    case "getAll":
    case "has":
      return true;
    default:
      return false;
  }
}

export function isRegistrationFactoryMethodName(name: string): boolean {
  switch (name) {
    case "instance":
    case "singleton":
    case "transient":
    case "callback":
    case "cachedCallback":
    case "aliasTo":
      return true;
    default:
      return false;
  }
}

export function aureliaRegistrationFactoryMechanismForCall(
  call: ts.CallExpression,
  bindings: AureliaSourceImports,
): string | null {
  const expression = call.expression;
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  if (!isRegistrationFactoryMethodName(expression.name.text)) {
    return null;
  }
  return isAureliaKernelReference(expression.expression, "Registration", bindings)
    ? `Registration.${expression.name.text}`
    : null;
}

export function aureliaAppTaskMechanismForCall(
  call: ts.CallExpression,
  bindings: AureliaSourceImports,
): string | null {
  const expression = call.expression;
  return ts.isPropertyAccessExpression(expression) &&
    isAureliaKernelReference(expression.expression, "AppTask", bindings)
    ? `AppTask.${expression.name.text}`
    : null;
}

export function isRouterExportName(text: string): boolean {
  switch (text) {
    case "AST":
    case "AuNavId":
    case "ComponentExpression":
    case "CompositeSegmentExpression":
    case "ContextRouter":
    case "DefaultComponents":
    case "DefaultResources":
    case "ExpressionKind":
    case "FallbackFunction":
    case "fragmentUrlParser":
    case "HistoryStrategy":
    case "HrefCustomAttribute":
    case "HrefCustomAttributeRegistration":
    case "IChildRouteConfig":
    case "IContextRouter":
    case "ICurrentRoute":
    case "ILocationManager":
    case "INavigationModel":
    case "INavigationOptions":
    case "INavigationRoute":
    case "IRouteConfig":
    case "IRouteContext":
    case "IRouteNodeInitializationOptions":
    case "IRouter":
    case "IRouterConfigurationOptions":
    case "IRouterEvents":
    case "IRouterOptions":
    case "IRouteViewModel":
    case "IStateManager":
    case "ITypedNavigationInstruction":
    case "ITypedNavigationInstruction_CustomElementDefinition":
    case "ITypedNavigationInstruction_IRouteViewModel":
    case "ITypedNavigationInstruction_Promise":
    case "ITypedNavigationInstruction_string":
    case "ITypedNavigationInstruction_ViewportInstruction":
    case "IUrlParser":
    case "IViewport":
    case "IViewportInstruction":
    case "isManagedState":
    case "LoadCustomAttribute":
    case "LoadCustomAttributeRegistration":
    case "LocationChangeEvent":
    case "ManagedState":
    case "NavigationCancelEvent":
    case "NavigationEndEvent":
    case "NavigationErrorEvent":
    case "NavigationInstruction":
    case "NavigationOptions":
    case "NavigationStartEvent":
    case "NavigationStrategy":
    case "ParameterExpression":
    case "ParameterInformation":
    case "ParameterListExpression":
    case "Params":
    case "pathUrlParser":
    case "Route":
    case "Routeable":
    case "RouteableComponent":
    case "route":
    case "RouteConfig":
    case "RouteContext":
    case "RouteExpression":
    case "RouteNode":
    case "RouteParameterMergeStrategy":
    case "RouteParametersOptions":
    case "RouteParameterValue":
    case "Router":
    case "RouterConfiguration":
    case "RouterEvent":
    case "RouterOptions":
    case "RouterRegistration":
    case "RouteTree":
    case "RouteType":
    case "ScopedSegmentExpression":
    case "SegmentExpression":
    case "SegmentGroupExpression":
    case "ServerLocationManager":
    case "toManagedState":
    case "Transition":
    case "ViewportAgent":
    case "ViewportCustomElement":
    case "ViewportCustomElementRegistration":
    case "ViewportExpression":
    case "ViewportInstruction":
      return true;
    default:
      return false;
  }
}

export function isRouterInstanceMethodName(name: string): boolean {
  switch (name) {
    case "load":
    case "generatePath":
    case "createViewportInstructions":
    case "isActive":
    case "subscribe":
      return true;
    default:
      return false;
  }
}

export function isRouterReceiverExportName(text: string): boolean {
  switch (text) {
    case "IContextRouter":
    case "IRouteContext":
    case "IRouter":
    case "IRouterEvents":
    case "ContextRouter":
    case "RouteContext":
    case "Router":
      return true;
    default:
      return false;
  }
}

function isAureliaBootstrapPackageSpecifier(specifier: string): boolean {
  return specifier === "aurelia" || specifier === "@aurelia/runtime-html";
}

function isAureliaDecoratorPackageSpecifier(specifier: string): boolean {
  return specifier === "aurelia" ||
    specifier === "@aurelia/runtime" ||
    specifier === "@aurelia/runtime-html";
}

function isAureliaKernelApiPackageSpecifier(specifier: string): boolean {
  return specifier === "aurelia" ||
    specifier === "@aurelia/kernel" ||
    specifier === "@aurelia/runtime-html";
}

function isAureliaRouterPackageSpecifier(specifier: string): boolean {
  return specifier === "@aurelia/router";
}
