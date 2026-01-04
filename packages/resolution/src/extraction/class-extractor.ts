import ts from "typescript";
import type {
  ClassFacts,
  DecoratorFact,
  DecoratorArgFact,
  PropertyValueFact,
  StaticAuFact,
  StaticDependenciesFact,
  BindableMemberFact,
  BindableDefFact,
  BindingMode,
  DependencyRef,
} from "./types.js";
import {
  unwrapDecorator,
  decoratorsOf,
  getProp,
  readStringProp,
  readBooleanProp,
  readStringArrayProp,
  inferTypeName,
  hasStaticModifier,
} from "../util/ast-helpers.js";
import { canonicalBindableName } from "../util/naming.js";

/**
 * Extract all facts from a class declaration.
 */
export function extractClassFacts(node: ts.ClassDeclaration, checker: ts.TypeChecker): ClassFacts {
  return {
    name: node.name?.text ?? "anonymous",
    decorators: extractDecorators(node),
    staticAu: extractStaticAu(node),
    staticDependencies: extractStaticDependencies(node),
    bindableMembers: extractBindableMembers(node, checker),
  };
}

function extractDecorators(node: ts.ClassDeclaration): DecoratorFact[] {
  const result: DecoratorFact[] = [];
  for (const dec of decoratorsOf(node)) {
    const unwrapped = unwrapDecorator(dec);
    if (!unwrapped) continue;
    result.push({
      name: unwrapped.name,
      args: unwrapped.args[0] ? extractDecoratorArg(unwrapped.args[0]) : null,
    });
  }
  return result;
}

function extractDecoratorArg(expr: ts.Expression): DecoratorArgFact {
  if (ts.isStringLiteralLike(expr)) {
    return { kind: "string", value: expr.text };
  }
  if (ts.isObjectLiteralExpression(expr)) {
    const properties: Record<string, PropertyValueFact> = {};
    for (const prop of expr.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const name = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteralLike(prop.name)
          ? prop.name.text
          : null;
      if (!name) continue;
      properties[name] = extractPropertyValue(prop.initializer);
    }
    return { kind: "object", properties };
  }
  return { kind: "string", value: "" }; // Fallback for other expressions
}

function extractPropertyValue(expr: ts.Expression): PropertyValueFact {
  if (ts.isStringLiteralLike(expr)) {
    return { kind: "string", value: expr.text };
  }
  if (expr.kind === ts.SyntaxKind.TrueKeyword) {
    return { kind: "boolean", value: true };
  }
  if (expr.kind === ts.SyntaxKind.FalseKeyword) {
    return { kind: "boolean", value: false };
  }
  if (ts.isArrayLiteralExpression(expr)) {
    // Check if any element is an object - that indicates a bindables array
    // bindables: ['title', { name: 'count', mode: 'twoWay' }]
    const hasObject = expr.elements.some((el) => ts.isObjectLiteralExpression(el));
    if (hasObject) {
      const bindables = parseBindablesArray(expr);
      return { kind: "bindableArray", bindables };
    }
    // Check if elements are identifiers - dependency array
    // dependencies: [MyElement, OtherComponent]
    const hasIdentifier = expr.elements.some((el) => ts.isIdentifier(el));
    if (hasIdentifier) {
      const refs = parseDependencyArray(expr);
      return { kind: "dependencyArray", refs };
    }
    // Pure string array (aliases, etc.)
    const values: string[] = [];
    for (const el of expr.elements) {
      if (ts.isStringLiteralLike(el)) values.push(el.text);
    }
    return { kind: "stringArray", values };
  }
  if (ts.isIdentifier(expr)) {
    return { kind: "identifier", name: expr.text };
  }
  if (ts.isPropertyAccessExpression(expr)) {
    return { kind: "propertyAccess", name: expr.name.text };
  }
  return { kind: "unknown" };
}

function parseBindablesArray(expr: ts.ArrayLiteralExpression): BindableDefFact[] {
  const result: BindableDefFact[] = [];
  for (const element of expr.elements) {
    if (ts.isStringLiteralLike(element)) {
      const name = canonicalBindableName(element.text);
      if (name) result.push({ name });
    } else if (ts.isObjectLiteralExpression(element)) {
      const name = readStringProp(element, "name") ?? readStringProp(element, "property");
      if (!name) continue;
      const canonName = canonicalBindableName(name);
      if (!canonName) continue;
      const mode = parseBindingModeValue(getProp(element, "mode")?.initializer);
      const primary = readBooleanProp(element, "primary");
      const attribute = readStringProp(element, "attribute");
      result.push({
        name: canonName,
        ...(mode ? { mode } : {}),
        ...(primary ? { primary } : {}),
        ...(attribute ? { attribute } : {}),
      });
    }
  }
  return result;
}

function parseDependencyArray(expr: ts.ArrayLiteralExpression): DependencyRef[] {
  const refs: DependencyRef[] = [];
  for (const element of expr.elements) {
    if (ts.isIdentifier(element)) {
      refs.push({
        kind: "identifier",
        name: element.text,
        span: { start: element.getStart(), end: element.getEnd() },
        resolvedPath: null, // Populated by import resolution (WP2)
      });
    }
    // TODO: Handle spread elements, property access, etc.
  }
  return refs;
}

function parseBindingModeValue(expr: ts.Expression | undefined): BindingMode | undefined {
  if (!expr) return undefined;
  if (ts.isStringLiteralLike(expr)) return toBindingMode(expr.text);
  if (ts.isPropertyAccessExpression(expr)) return toBindingMode(expr.name.text);
  if (ts.isIdentifier(expr)) return toBindingMode(expr.text);
  // Handle numeric literals: BindingMode.toView = 2, BindingMode.twoWay = 6, etc.
  if (ts.isNumericLiteral(expr)) return numericToBindingMode(Number(expr.text));
  return undefined;
}

function numericToBindingMode(value: number): BindingMode | undefined {
  // Aurelia BindingMode values:
  // default = 0, oneTime = 1, toView = 2, fromView = 4, twoWay = 6
  switch (value) {
    case 0: return "default";
    case 1: return "oneTime";
    case 2: return "toView";
    case 4: return "fromView";
    case 6: return "twoWay";
    default: return undefined;
  }
}

function toBindingMode(value: string): BindingMode | undefined {
  const normalized = value.trim();
  if (
    normalized === "oneTime" ||
    normalized === "toView" ||
    normalized === "fromView" ||
    normalized === "twoWay" ||
    normalized === "default"
  ) {
    return normalized;
  }
  return undefined;
}

function extractStaticAu(node: ts.ClassDeclaration): StaticAuFact | null {
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== "$au") continue;
    if (!hasStaticModifier(member)) continue;
    if (!member.initializer || !ts.isObjectLiteralExpression(member.initializer)) continue;

    const obj = member.initializer;
    const type = readStringProp(obj, "type");
    const name = readStringProp(obj, "name");
    const aliases = readStringArrayProp(obj, "aliases");
    const template = readStringProp(obj, "template");
    const containerless = readBooleanProp(obj, "containerless");
    const isTemplateController = readBooleanProp(obj, "isTemplateController");
    const noMultiBindings = readBooleanProp(obj, "noMultiBindings");

    // Parse bindables
    const bindablesProp = getProp(obj, "bindables");
    let bindables: BindableDefFact[] | undefined;
    if (bindablesProp && ts.isArrayLiteralExpression(bindablesProp.initializer)) {
      bindables = parseBindablesArray(bindablesProp.initializer);
    }

    // Parse dependencies
    const dependenciesProp = getProp(obj, "dependencies");
    let dependencies: DependencyRef[] | undefined;
    if (dependenciesProp && ts.isArrayLiteralExpression(dependenciesProp.initializer)) {
      dependencies = parseDependencyArray(dependenciesProp.initializer);
    }

    return {
      ...(type ? { type } : {}),
      ...(name ? { name } : {}),
      ...(aliases.length > 0 ? { aliases } : {}),
      ...(bindables && bindables.length > 0 ? { bindables } : {}),
      ...(dependencies && dependencies.length > 0 ? { dependencies } : {}),
      ...(template ? { template } : {}),
      ...(containerless !== undefined ? { containerless } : {}),
      ...(isTemplateController !== undefined ? { isTemplateController } : {}),
      ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    };
  }
  return null;
}

function extractStaticDependencies(node: ts.ClassDeclaration): StaticDependenciesFact | null {
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== "dependencies") continue;
    if (!hasStaticModifier(member)) continue;
    if (!member.initializer || !ts.isArrayLiteralExpression(member.initializer)) continue;

    const references: DependencyRef[] = [];
    for (const element of member.initializer.elements) {
      if (ts.isIdentifier(element)) {
        references.push({
          kind: "identifier",
          name: element.text,
          span: { start: element.getStart(), end: element.getEnd() },
          resolvedPath: null, // Populated by import resolution (WP2)
        });
      }
      // TODO: Handle imported references (more complex AST analysis needed)
    }

    if (references.length > 0) {
      return { references };
    }
  }
  return null;
}

function extractBindableMembers(node: ts.ClassDeclaration, checker: ts.TypeChecker): BindableMemberFact[] {
  const bindables: BindableMemberFact[] = [];

  for (const member of node.members) {
    if (
      !ts.isPropertyDeclaration(member) &&
      !ts.isGetAccessorDeclaration(member) &&
      !ts.isSetAccessorDeclaration(member)
    )
      continue;
    if (!member.name || (!ts.isIdentifier(member.name) && !ts.isStringLiteralLike(member.name))) continue;

    const memberName = member.name.text;
    const decorators = decoratorsOf(member);

    for (const dec of decorators) {
      const unwrapped = unwrapDecorator(dec);
      if (!unwrapped || unwrapped.name !== "bindable") continue;

      const canonName = canonicalBindableName(memberName);
      if (!canonName) continue;

      const arg = unwrapped.args[0];
      let mode: BindingMode | undefined;
      let primary: boolean | undefined;

      if (arg && ts.isObjectLiteralExpression(arg)) {
        mode = parseBindingModeValue(getProp(arg, "mode")?.initializer);
        primary = readBooleanProp(arg, "primary") ?? undefined;
      }

      const inferredType = inferTypeName(member, checker) ?? undefined;

      bindables.push({
        name: canonName,
        ...(mode ? { mode } : {}),
        ...(primary ? { primary } : {}),
        ...(inferredType ? { inferredType } : {}),
      });
    }
  }

  return bindables;
}
