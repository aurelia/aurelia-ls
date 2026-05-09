import ts from "typescript";

import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  AURELIA_PLUGIN_PACKAGE_ID_PREFIX,
  EXTERNAL_SOURCE_PACKAGE_ID_PREFIX,
  hasStaticModifier,
  propertyNameText,
  SourcePackageId,
  unwrapExpression,
  type SourceProject,
} from "../../source/index.js";
import {
  AureliaSourceImports,
  aureliaDecoratorExportNameForExpression,
} from "./aurelia-source-imports.js";

/** Return the framework-shaped mechanism for one `@bindable` decorator carrier. */
export function aureliaBindableDecoratorMechanism(
  sourceProject: SourceProject,
  call: ts.CallExpression | undefined,
  decoratedNode: ts.Node,
): string {
  return [
    "bindable.decorator",
    bindableDecoratorTargetKind(decoratedNode),
    bindableDecoratorArgumentKind(sourceProject, call),
  ].join(".");
}

/** Return the mechanism for a static `bindables` class property, when the node is one. */
export function aureliaStaticBindablesPropertyMechanism(
  node: ts.PropertyDeclaration,
): string | null {
  return propertyNameText(node.name) === "bindables" && hasStaticModifier(node)
    ? `bindable.static-property.${bindablesInitializerShape(node.initializer)}`
    : null;
}

/** Return the mechanism for `bindables` inside an Aurelia resource definition object, when applicable. */
export function aureliaResourceDefinitionBindablesMechanism(
  node: ts.PropertyAssignment,
  bindings: AureliaSourceImports,
): string | null {
  if (propertyNameText(node.name) !== "bindables") {
    return null;
  }
  const definitionKind = resourceDefinitionObjectKind(node.parent, bindings);
  return definitionKind === null
    ? null
    : `bindable.definition-object.${definitionKind}.${bindablesInitializerShape(node.initializer)}`;
}

function bindableDecoratorTargetKind(decoratedNode: ts.Node): string {
  if (ts.isClassDeclaration(decoratedNode)) {
    return "class";
  }
  if (ts.isGetAccessor(decoratedNode)) {
    return "getter";
  }
  if (ts.isSetAccessor(decoratedNode)) {
    return "setter";
  }
  if (ts.isPropertyDeclaration(decoratedNode) || ts.isPropertySignature(decoratedNode)) {
    return "property";
  }
  return "other-target";
}

function bindableDecoratorArgumentKind(
  sourceProject: SourceProject,
  call: ts.CallExpression | undefined,
): string {
  if (call === undefined) {
    return "bare";
  }
  const first = call.arguments[0];
  if (first === undefined) {
    return "empty";
  }
  if (ts.isStringLiteralLike(first)) {
    return "name";
  }
  const expression = unwrapExpression(first);
  if (ts.isObjectLiteralExpression(expression)) {
    return "config-object";
  }
  if (ts.isIdentifier(expression)) {
    return `identifier.${identifierBindableArgumentKind(sourceProject, expression)}`;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return "member";
  }
  return "expression";
}

function identifierBindableArgumentKind(
  sourceProject: SourceProject,
  identifier: ts.Identifier,
): string {
  const symbol = sourceProject.checker.getSymbolAtLocation(identifier);
  if (symbol === undefined) {
    return "unresolved";
  }
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (declaration === undefined) {
    return "unresolved";
  }
  if (isImportBindingDeclaration(declaration)) {
    return `import.${importedIdentifierProvenanceKind(sourceProject, symbol)}`;
  }
  if (ts.isVariableDeclaration(declaration)) {
    return `local-${bindablesInitializerShape(declaration.initializer)}`;
  }
  if (ts.isParameter(declaration)) {
    return "parameter";
  }
  return "declaration";
}

function isImportBindingDeclaration(node: ts.Declaration): boolean {
  return ts.isImportSpecifier(node) ||
    ts.isImportClause(node) ||
    ts.isNamespaceImport(node) ||
    ts.isImportEqualsDeclaration(node);
}

function importedIdentifierProvenanceKind(
  sourceProject: SourceProject,
  symbol: ts.Symbol,
): string {
  const aliased = resolveAliasSymbol(sourceProject, symbol);
  const declaration = aliased.valueDeclaration ?? aliased.declarations?.[0];
  if (declaration === undefined) {
    return "unresolved";
  }
  const sourcePackage = sourceProject.packageForFileName(
    declaration.getSourceFile().fileName,
  );
  if (sourcePackage === null) {
    return "external-library";
  }
  if (sourcePackage.id === SourcePackageId.Atlas) {
    return "atlas";
  }
  if (sourcePackage.id === SourcePackageId.SemanticRuntime) {
    return "semantic-runtime";
  }
  if ((AURELIA_FRAMEWORK_PACKAGE_IDS as readonly string[]).includes(sourcePackage.id)) {
    return "framework";
  }
  if (sourcePackage.id.startsWith(AURELIA_PLUGIN_PACKAGE_ID_PREFIX)) {
    return "public-plugin";
  }
  if (sourcePackage.id.startsWith(EXTERNAL_SOURCE_PACKAGE_ID_PREFIX)) {
    return "external-source";
  }
  return "workspace";
}

function resolveAliasSymbol(sourceProject: SourceProject, symbol: ts.Symbol): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? sourceProject.checker.getAliasedSymbol(symbol)
    : symbol;
}

function resourceDefinitionObjectKind(
  object: ts.ObjectLiteralExpression,
  bindings: AureliaSourceImports,
): "customElement" | "customAttribute" | null {
  const parent = object.parent;
  if (!ts.isCallExpression(parent) || parent.arguments[0] !== object) {
    return null;
  }
  const decoratorName = aureliaDecoratorExportNameForExpression(parent.expression, bindings);
  if (decoratorName === "customElement" || decoratorName === "customAttribute") {
    return decoratorName;
  }
  return resourceDefinitionDefineKindForExpression(parent.expression, bindings);
}

function resourceDefinitionDefineKindForExpression(
  expression: ts.Expression,
  bindings: AureliaSourceImports,
): "customElement" | "customAttribute" | null {
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== "define") {
    return null;
  }
  const receiver = expression.expression;
  if (ts.isIdentifier(receiver)) {
    switch (bindings.aureliaDecoratorImportedNames.get(receiver.text)) {
      case "CustomElement":
        return "customElement";
      case "CustomAttribute":
        return "customAttribute";
      default:
        return null;
    }
  }
  if (
    ts.isPropertyAccessExpression(receiver) &&
    ts.isIdentifier(receiver.expression) &&
    bindings.aureliaDecoratorNamespaces.has(receiver.expression.text)
  ) {
    switch (receiver.name.text) {
      case "CustomElement":
        return "customElement";
      case "CustomAttribute":
        return "customAttribute";
      default:
        return null;
    }
  }
  return null;
}

function bindablesInitializerShape(expression: ts.Expression | undefined): string {
  if (expression === undefined) {
    return "missing";
  }
  const unwrapped = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(unwrapped)) {
    return "array";
  }
  if (ts.isObjectLiteralExpression(unwrapped)) {
    return "record";
  }
  if (ts.isIdentifier(unwrapped)) {
    return "identifier";
  }
  return "expression";
}
