import ts from "typescript";

import { propertyNameText } from "../../source/index.js";

/** Classified template reference evidence from Aurelia-shaped source. */
export interface AureliaTemplateReference {
  readonly mechanism:
    | "html-import"
    | "html-dynamic-import"
    | "html-require"
    | "template-property"
    | "template-url-property";
  readonly name: string;
}

/** Read one source node as a template reference when it carries an HTML template path. */
export function readAureliaTemplateReference(
  node: ts.Node,
): AureliaTemplateReference | null {
  if (ts.isStringLiteralLike(node) && isHtmlTemplateSpecifier(node.text)) {
    if (ts.isImportDeclaration(node.parent) && node.parent.moduleSpecifier === node) {
      return { mechanism: "html-import", name: node.text };
    }
    if (isDynamicImportArgument(node)) {
      return { mechanism: "html-dynamic-import", name: node.text };
    }
    if (isRequireArgument(node)) {
      return null;
    }
    if (isTemplatePropertyInitializer(node)) {
      return null;
    }
    return null;
  }

  if (ts.isCallExpression(node)) {
    const specifier = requireHtmlTemplateSpecifier(node);
    return specifier === null ? null : { mechanism: "html-require", name: specifier };
  }

  if (ts.isPropertyAssignment(node)) {
    const mechanism = templatePropertyMechanism(node.name);
    if (
      mechanism !== null &&
      ts.isStringLiteralLike(node.initializer) &&
      isHtmlTemplateSpecifier(node.initializer.text)
    ) {
      return { mechanism, name: node.initializer.text };
    }
  }

  return null;
}

function requireHtmlTemplateSpecifier(call: ts.CallExpression): string | null {
  if (
    !ts.isIdentifier(call.expression) ||
    call.expression.text !== "require" ||
    call.arguments.length !== 1
  ) {
    return null;
  }
  const specifier = call.arguments[0];
  return specifier !== undefined &&
    ts.isStringLiteralLike(specifier) &&
    isHtmlTemplateSpecifier(specifier.text)
    ? specifier.text
    : null;
}

function isRequireArgument(node: ts.StringLiteralLike): boolean {
  const parent = node.parent;
  return ts.isCallExpression(parent) &&
    parent.arguments.length === 1 &&
    parent.arguments[0] === node &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === "require";
}

function isDynamicImportArgument(node: ts.StringLiteralLike): boolean {
  const parent = node.parent;
  return ts.isCallExpression(parent) &&
    parent.arguments.length === 1 &&
    parent.arguments[0] === node &&
    parent.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function isTemplatePropertyInitializer(node: ts.StringLiteralLike): boolean {
  return ts.isPropertyAssignment(node.parent) &&
    node.parent.initializer === node &&
    templatePropertyMechanism(node.parent.name) !== null;
}

function templatePropertyMechanism(name: ts.PropertyName): AureliaTemplateReference["mechanism"] | null {
  const text = propertyNameText(name);
  switch (text) {
    case "template":
      return "template-property";
    case "templateUrl":
    case "templateURL":
      return "template-url-property";
    default:
      return null;
  }
}

function isHtmlTemplateSpecifier(text: string): boolean {
  if (
    text === ".html" ||
    text.includes("*") ||
    text.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
  ) {
    return false;
  }
  return /\.html(?:[?#].*)?$/i.test(text) || /\.html[?#]/i.test(text);
}
