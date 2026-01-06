import ts from "typescript";
import type { DefineCallFact, BindableDefFact, BindingMode, Position } from "./types.js";
import { readStringProp, readBooleanProp, getProp } from "../util/ast-helpers.js";

/**
 * Resource types that have `.define()` methods.
 */
const DEFINE_RESOURCE_TYPES = [
  "CustomElement",
  "CustomAttribute",
  "BindingBehavior",
  "ValueConverter",
] as const;

type DefineResourceType = typeof DEFINE_RESOURCE_TYPES[number];

/**
 * Extract `.define()` calls from a source file.
 *
 * Handles patterns like:
 * - `CustomElement.define({ name: 'foo', bindables: [...] }, FooClass)`
 * - `CustomAttribute.define({ name: 'bar' }, BarClass)`
 * - `BindingBehavior.define('state', StateBindingBehavior)`
 * - `ValueConverter.define('json', JsonValueConverter)`
 */
export function extractDefineCalls(sf: ts.SourceFile): DefineCallFact[] {
  const results: DefineCallFact[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const fact = tryExtractDefineCall(node, sf);
      if (fact) {
        results.push(fact);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

/**
 * Try to extract a `.define()` call from a call expression.
 */
function tryExtractDefineCall(call: ts.CallExpression, sf: ts.SourceFile): DefineCallFact | null {
  // Check for pattern: X.define(...)
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return null;
  }

  const propAccess = call.expression;
  if (propAccess.name.text !== "define") {
    return null;
  }

  // Get the receiver (X in X.define)
  if (!ts.isIdentifier(propAccess.expression)) {
    return null;
  }

  const receiverName = propAccess.expression.text;
  if (!isDefineResourceType(receiverName)) {
    return null;
  }

  const resourceType = receiverName as DefineResourceType;
  const args = call.arguments;

  // Need at least 2 arguments: (definition, Class) or ('name', Class)
  if (args.length < 2) {
    return null;
  }

  const firstArg = args[0]!;
  const secondArg = args[1]!;

  // Second argument must be an identifier (the class)
  if (!ts.isIdentifier(secondArg)) {
    return null;
  }

  const className = secondArg.text;
  const position = getPosition(call, sf);

  // Handle short form: BindingBehavior.define('name', Class)
  if (ts.isStringLiteral(firstArg)) {
    return {
      resourceType,
      className,
      name: firstArg.text,
      position,
    };
  }

  // Handle full form: CustomElement.define({ name: '...', bindables: [...] }, Class)
  if (ts.isObjectLiteralExpression(firstArg)) {
    return extractFromDefinitionObject(resourceType, className, firstArg, position);
  }

  return null;
}

/**
 * Extract facts from a definition object literal.
 */
function extractFromDefinitionObject(
  resourceType: DefineResourceType,
  className: string,
  obj: ts.ObjectLiteralExpression,
  position: Position
): DefineCallFact {
  const name = readStringProp(obj, "name");
  const template = readStringProp(obj, "template");
  const containerless = readBooleanProp(obj, "containerless");
  const isTemplateController = readBooleanProp(obj, "isTemplateController");
  const noMultiBindings = readBooleanProp(obj, "noMultiBindings");
  const aliases = extractStringArray(obj, "aliases");
  const bindables = extractBindables(obj);

  return {
    resourceType,
    className,
    ...(name !== undefined ? { name } : {}),
    ...(bindables.length > 0 ? { bindables } : {}),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(template !== undefined ? { template } : {}),
    ...(containerless !== undefined ? { containerless } : {}),
    ...(isTemplateController !== undefined ? { isTemplateController } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    position,
  };
}

/**
 * Extract bindables from a definition object.
 *
 * Handles both array form and object form:
 * - `bindables: ['name', 'value']`
 * - `bindables: { route: { mode: bmToView, primary: true }, ... }`
 */
function extractBindables(obj: ts.ObjectLiteralExpression): BindableDefFact[] {
  const prop = getProp(obj, "bindables");
  if (!prop) return [];

  const init = prop.initializer;

  // Array form: ['name', 'value']
  if (ts.isArrayLiteralExpression(init)) {
    return init.elements
      .filter(ts.isStringLiteral)
      .map((el) => ({ name: el.text }));
  }

  // Object form: { route: { mode: bmToView, primary: true }, ... }
  if (ts.isObjectLiteralExpression(init)) {
    const results: BindableDefFact[] = [];

    for (const bindableProp of init.properties) {
      if (!ts.isPropertyAssignment(bindableProp)) continue;
      if (!ts.isIdentifier(bindableProp.name) && !ts.isStringLiteral(bindableProp.name)) continue;

      const bindableName = ts.isIdentifier(bindableProp.name)
        ? bindableProp.name.text
        : bindableProp.name.text;

      // Simple form: { value: {} } or shorthand
      if (ts.isObjectLiteralExpression(bindableProp.initializer)) {
        const bindableObj = bindableProp.initializer;
        const mode = extractBindingMode(bindableObj);
        const primary = readBooleanProp(bindableObj, "primary");
        const attribute = readStringProp(bindableObj, "attribute");

        results.push({
          name: bindableName,
          ...(mode !== undefined ? { mode } : {}),
          ...(primary !== undefined ? { primary } : {}),
          ...(attribute !== undefined ? { attribute } : {}),
        });
      } else {
        // Shorthand or unknown form
        results.push({ name: bindableName });
      }
    }

    return results;
  }

  return [];
}

/**
 * Extract binding mode from a bindable definition object.
 *
 * Handles patterns like:
 * - `mode: BindingMode.twoWay`
 * - `mode: bmToView` (imported constant)
 * - `mode: 6` (numeric value)
 */
function extractBindingMode(obj: ts.ObjectLiteralExpression): BindingMode | undefined {
  const prop = getProp(obj, "mode");
  if (!prop) return undefined;

  const init = prop.initializer;

  // Numeric literal: mode: 6
  if (ts.isNumericLiteral(init)) {
    return numericToBindingMode(Number(init.text));
  }

  // Property access: BindingMode.twoWay
  if (ts.isPropertyAccessExpression(init)) {
    return stringToBindingMode(init.name.text);
  }

  // Identifier: bmToView (imported constant)
  if (ts.isIdentifier(init)) {
    // Common aurelia constants
    const name = init.text;
    if (name === "bmToView" || name === "toView") return "toView";
    if (name === "bmFromView" || name === "fromView") return "fromView";
    if (name === "bmTwoWay" || name === "twoWay") return "twoWay";
    if (name === "bmOneTime" || name === "oneTime") return "oneTime";
  }

  return undefined;
}

/**
 * Extract a string array from an object property.
 */
function extractStringArray(obj: ts.ObjectLiteralExpression, propName: string): string[] {
  const prop = getProp(obj, propName);
  if (!prop) return [];

  const init = prop.initializer;
  if (!ts.isArrayLiteralExpression(init)) return [];

  return init.elements
    .filter(ts.isStringLiteral)
    .map((el) => el.text);
}

/**
 * Convert numeric binding mode to string.
 */
function numericToBindingMode(value: number): BindingMode | undefined {
  switch (value) {
    case 1: return "oneTime";
    case 2: return "toView";
    case 4: return "fromView";
    case 6: return "twoWay";
    default: return undefined;
  }
}

/**
 * Convert string binding mode name to canonical form.
 */
function stringToBindingMode(value: string): BindingMode | undefined {
  const lower = value.toLowerCase();
  if (lower === "onetime") return "oneTime";
  if (lower === "toview") return "toView";
  if (lower === "fromview") return "fromView";
  if (lower === "twoway") return "twoWay";
  return undefined;
}

/**
 * Check if a name is a valid define resource type.
 */
function isDefineResourceType(name: string): name is DefineResourceType {
  return (DEFINE_RESOURCE_TYPES as readonly string[]).includes(name);
}

/**
 * Get source position from a node.
 */
function getPosition(node: ts.Node, sf: ts.SourceFile): Position {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return { line, character };
}
