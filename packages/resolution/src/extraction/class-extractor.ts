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
  AnalysisGap,
} from "./types.js";
import { gap } from "./types.js";
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
import type { PropertyResolutionContext } from "./value-helpers.js";
import { resolveToString } from "./value-helpers.js";

/**
 * Extract all facts from a class declaration.
 *
 * @param node - The class declaration AST node
 * @param checker - TypeScript type checker
 * @param resolutionCtx - Optional context for resolving identifier references in $au properties.
 *                        When provided, enables resolution of imported constants like `attrTypeName`.
 */
export function extractClassFacts(
  node: ts.ClassDeclaration,
  checker: ts.TypeChecker,
  resolutionCtx?: PropertyResolutionContext
): ClassFacts {
  const className = node.name?.text ?? "anonymous";
  const gaps: AnalysisGap[] = [];

  const staticAu = extractStaticAu(node, className, gaps, resolutionCtx);
  const staticDependencies = extractStaticDependencies(node, className, gaps);

  return {
    name: className,
    decorators: extractDecorators(node),
    staticAu,
    staticDependencies,
    bindableMembers: extractBindableMembers(node, checker),
    ...(gaps.length > 0 ? { extractionGaps: gaps } : {}),
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

/**
 * Extract property value from decorator argument.
 *
 * Note: When arrays contain spreads or dynamic values, gaps are not surfaced
 * through this path (PropertyValueFact doesn't carry gaps). The extraction
 * still works but unanalyzable elements are silently skipped.
 * For full gap reporting, use the static $au / static dependencies paths.
 */
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
    // Temporary gaps array - not surfaced through PropertyValueFact
    const discardedGaps: AnalysisGap[] = [];

    // Check if any element is an object - that indicates a bindables array
    // bindables: ['title', { name: 'count', mode: 'twoWay' }]
    const hasObject = expr.elements.some((el) => ts.isObjectLiteralExpression(el));
    if (hasObject) {
      const bindables = parseBindablesArray(expr, "unknown", discardedGaps);
      return { kind: "bindableArray", bindables };
    }
    // Check if elements are identifiers or property access - dependency array
    // dependencies: [MyElement, OtherComponent, Module.Component]
    const hasIdentifierOrAccess = expr.elements.some(
      (el) => ts.isIdentifier(el) || ts.isPropertyAccessExpression(el)
    );
    if (hasIdentifierOrAccess) {
      const refs = parseDependencyArray(expr, "unknown", discardedGaps);
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

/**
 * Parse a bindables array, extracting definitions and reporting gaps for unanalyzable patterns.
 *
 * Handles:
 * - String literals: `['value']` → bindable with name
 * - Object literals: `[{ name: 'value', mode: BindingMode.twoWay }]` → full bindable spec
 * - Spread elements: `[...baseBindables]` → gap (can't statically analyze)
 */
function parseBindablesArray(
  expr: ts.ArrayLiteralExpression,
  className: string,
  gaps: AnalysisGap[],
): BindableDefFact[] {
  const result: BindableDefFact[] = [];

  for (const element of expr.elements) {
    // Spread element: [...baseBindables]
    if (ts.isSpreadElement(element)) {
      const spreadExpr = element.expression;
      const spreadName = ts.isIdentifier(spreadExpr)
        ? spreadExpr.text
        : spreadExpr.getText().slice(0, 50);

      gaps.push(gap(
        `bindables for ${className}`,
        { kind: 'spread-unknown', spreadOf: spreadName },
        `Replace spread with explicit bindable list.`,
        {
          file: expr.getSourceFile().fileName,
          line: getLineNumber(element),
          snippet: element.getText(),
        }
      ));
      continue;
    }

    // String literal: 'value'
    if (ts.isStringLiteralLike(element)) {
      const name = canonicalBindableName(element.text);
      if (name) result.push({ name });
      continue;
    }

    // Object literal: { name: 'value', mode: BindingMode.twoWay }
    if (ts.isObjectLiteralExpression(element)) {
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
      continue;
    }

    // Identifier reference: baseBindable (not in an array, just a variable)
    if (ts.isIdentifier(element)) {
      gaps.push(gap(
        `bindables for ${className}`,
        { kind: 'dynamic-value', expression: element.text },
        `Replace variable reference with explicit bindable definition.`,
        {
          file: expr.getSourceFile().fileName,
          line: getLineNumber(element),
          snippet: element.getText(),
        }
      ));
      continue;
    }

    // Other unrecognized patterns
    gaps.push(gap(
      `bindables for ${className}`,
      { kind: 'dynamic-value', expression: element.getText().slice(0, 50) },
      `Use explicit bindable definitions.`,
      {
        file: expr.getSourceFile().fileName,
        line: getLineNumber(element),
        snippet: element.getText(),
      }
    ));
  }

  return result;
}

/**
 * Parse a bindables object, extracting definitions and reporting gaps for unanalyzable patterns.
 *
 * Handles Aurelia core's object-style bindable definitions:
 * - Shorthand: `{ value: true }` → bindable named 'value' with defaults
 * - Full form: `{ value: { mode: twoWay, primary: true, attribute: 'my-value' } }`
 * - Spread: `{ ...baseBindables }` → gap (can't statically analyze)
 */
function parseBindablesObject(
  obj: ts.ObjectLiteralExpression,
  className: string,
  gaps: AnalysisGap[],
): BindableDefFact[] {
  const result: BindableDefFact[] = [];

  for (const prop of obj.properties) {
    // Spread property: { ...baseBindables }
    if (ts.isSpreadAssignment(prop)) {
      const spreadExpr = prop.expression;
      const spreadName = ts.isIdentifier(spreadExpr)
        ? spreadExpr.text
        : spreadExpr.getText().slice(0, 50);

      gaps.push(gap(
        `bindables for ${className}`,
        { kind: 'spread-unknown', spreadOf: spreadName },
        `Replace spread with explicit bindable definitions.`,
        {
          file: obj.getSourceFile().fileName,
          line: getLineNumber(prop),
          snippet: prop.getText(),
        }
      ));
      continue;
    }

    // Property assignment: { name: value }
    if (ts.isPropertyAssignment(prop)) {
      const propName = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteral(prop.name)
          ? prop.name.text
          : null;

      if (!propName) {
        // Computed property name
        gaps.push(gap(
          `bindables for ${className}`,
          { kind: 'computed-property', expression: prop.name.getText() },
          `Use static property names for bindables.`,
          {
            file: obj.getSourceFile().fileName,
            line: getLineNumber(prop),
            snippet: prop.getText(),
          }
        ));
        continue;
      }

      const canonName = canonicalBindableName(propName);
      if (!canonName) continue;

      const init = prop.initializer;

      // Shorthand: { value: true } or { value: {} }
      if (init.kind === ts.SyntaxKind.TrueKeyword ||
          (ts.isObjectLiteralExpression(init) && init.properties.length === 0)) {
        result.push({ name: canonName });
        continue;
      }

      // Full form: { value: { mode: twoWay, primary: true, attribute: 'foo' } }
      if (ts.isObjectLiteralExpression(init)) {
        const mode = parseBindingModeValue(getProp(init, "mode")?.initializer);
        const primary = readBooleanProp(init, "primary");
        const attribute = readStringProp(init, "attribute");

        result.push({
          name: canonName,
          ...(mode ? { mode } : {}),
          ...(primary !== undefined ? { primary } : {}),
          ...(attribute ? { attribute } : {}),
        });
        continue;
      }

      // Variable reference or other expression - can't statically analyze
      gaps.push(gap(
        `bindable "${propName}" for ${className}`,
        { kind: 'dynamic-value', expression: init.getText().slice(0, 50) },
        `Use inline object for bindable definition.`,
        {
          file: obj.getSourceFile().fileName,
          line: getLineNumber(prop),
          snippet: prop.getText(),
        }
      ));
      continue;
    }

    // Shorthand property: { value } (rare but possible)
    if (ts.isShorthandPropertyAssignment(prop)) {
      const propName = prop.name.text;
      gaps.push(gap(
        `bindable "${propName}" for ${className}`,
        { kind: 'dynamic-value', expression: propName },
        `Use explicit value for bindable definition: { ${propName}: true } or { ${propName}: { mode: ... } }.`,
        {
          file: obj.getSourceFile().fileName,
          line: getLineNumber(prop),
          snippet: prop.getText(),
        }
      ));
      continue;
    }

    // Method definition or getter/setter - not valid for bindables
    // Skip silently as these are likely unrelated to bindables
  }

  return result;
}

/**
 * Parse a dependencies array, extracting refs and reporting gaps for unanalyzable patterns.
 *
 * Handles:
 * - Identifiers: `[MyComponent]` → identifier ref
 * - Property access: `[Module.Component]` → property-access ref
 * - Spread elements: `[...items]` → gap (can't statically analyze)
 * - Other expressions: gap
 */
function parseDependencyArray(
  expr: ts.ArrayLiteralExpression,
  className: string,
  gaps: AnalysisGap[],
): DependencyRef[] {
  const refs: DependencyRef[] = [];

  for (const element of expr.elements) {
    // Spread element: [...items]
    if (ts.isSpreadElement(element)) {
      const spreadExpr = element.expression;
      const spreadName = ts.isIdentifier(spreadExpr)
        ? spreadExpr.text
        : spreadExpr.getText().slice(0, 50);

      gaps.push(gap(
        `dependencies for ${className}`,
        { kind: 'spread-unknown', spreadOf: spreadName },
        `Replace spread with explicit list, or add resources to thirdParty.resources config.`,
        {
          file: expr.getSourceFile().fileName,
          line: getLineNumber(element),
          snippet: element.getText(),
        }
      ));
      continue;
    }

    // Simple identifier: MyComponent
    if (ts.isIdentifier(element)) {
      refs.push({
        kind: "identifier",
        name: element.text,
        span: { start: element.getStart(), end: element.getEnd() },
        resolvedPath: null,
      });
      continue;
    }

    // Property access: Module.Component or deeply nested a.b.c
    if (ts.isPropertyAccessExpression(element)) {
      // Get the leftmost identifier and full property path
      const { object, property } = parsePropertyAccess(element);
      refs.push({
        kind: "property-access",
        object,
        property,
        span: { start: element.getStart(), end: element.getEnd() },
        resolvedPath: null,
      });
      continue;
    }

    // Call expression: getComponent()
    if (ts.isCallExpression(element)) {
      const callName = ts.isIdentifier(element.expression)
        ? element.expression.text
        : element.expression.getText().slice(0, 30);

      gaps.push(gap(
        `dependencies for ${className}`,
        { kind: 'function-return', functionName: callName },
        `Replace function call with explicit class reference.`,
        {
          file: expr.getSourceFile().fileName,
          line: getLineNumber(element),
          snippet: element.getText(),
        }
      ));
      continue;
    }

    // Other unrecognized patterns
    gaps.push(gap(
      `dependencies for ${className}`,
      { kind: 'dynamic-value', expression: element.getText().slice(0, 50) },
      `Use explicit class references in dependencies array.`,
      {
        file: expr.getSourceFile().fileName,
        line: getLineNumber(element),
        snippet: element.getText(),
      }
    ));
  }

  return refs;
}

/**
 * Parse a property access expression into object and property parts.
 * For `a.b.c`, returns { object: "a.b", property: "c" }.
 * For `a.b`, returns { object: "a", property: "b" }.
 */
function parsePropertyAccess(expr: ts.PropertyAccessExpression): { object: string; property: string } {
  const property = expr.name.text;

  if (ts.isIdentifier(expr.expression)) {
    return { object: expr.expression.text, property };
  }

  if (ts.isPropertyAccessExpression(expr.expression)) {
    // Recursively build the object path
    const inner = parsePropertyAccess(expr.expression);
    return { object: `${inner.object}.${inner.property}`, property };
  }

  // Fallback for complex expressions
  return { object: expr.expression.getText(), property };
}

/**
 * Get line number for a node (1-based).
 */
function getLineNumber(node: ts.Node): number {
  const sf = node.getSourceFile();
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
  return line + 1;
}

/**
 * Read the 'type' property from a $au object.
 *
 * Uses the value model to resolve identifier references through the scope chain.
 * This handles:
 * - `type: 'custom-element'` → direct literal
 * - `type: 'custom-attribute' as const` → type assertion wrapping literal
 * - `type: attrTypeName` → identifier resolved through scope/imports
 *
 * No hard-coded identifier mappings - resolution goes through the value model
 * which properly traces imports and file-local constants.
 */
function readTypeProp(
  obj: ts.ObjectLiteralExpression,
  ctx: PropertyResolutionContext | null
): string | undefined {
  const prop = getProp(obj, "type");
  if (!prop) return undefined;
  return resolveToString(prop.initializer, ctx);
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

function extractStaticAu(
  node: ts.ClassDeclaration,
  className: string,
  gaps: AnalysisGap[],
  resolutionCtx?: PropertyResolutionContext
): StaticAuFact | null {
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== "$au") continue;
    if (!hasStaticModifier(member)) continue;
    if (!member.initializer || !ts.isObjectLiteralExpression(member.initializer)) continue;

    const obj = member.initializer;
    const type = readTypeProp(obj, resolutionCtx ?? null);
    const name = readStringProp(obj, "name");
    const aliases = readStringArrayProp(obj, "aliases");
    const template = readStringProp(obj, "template");
    const containerless = readBooleanProp(obj, "containerless");
    const isTemplateController = readBooleanProp(obj, "isTemplateController");
    const noMultiBindings = readBooleanProp(obj, "noMultiBindings");

    // Parse bindables (with gap reporting)
    // Supports both array style: bindables: ['value', { name: 'count', mode: 'twoWay' }]
    // And object style: bindables: { value: true, count: { mode: twoWay } }
    const bindablesProp = getProp(obj, "bindables");
    let bindables: BindableDefFact[] | undefined;
    if (bindablesProp) {
      const init = bindablesProp.initializer;
      if (ts.isArrayLiteralExpression(init)) {
        bindables = parseBindablesArray(init, className, gaps);
      } else if (ts.isObjectLiteralExpression(init)) {
        bindables = parseBindablesObject(init, className, gaps);
      } else {
        // Variable reference or other expression - emit gap
        const exprText = ts.isIdentifier(init) ? init.text : init.getText().slice(0, 50);
        gaps.push(gap(
          `bindables for ${className}`,
          { kind: 'dynamic-value', expression: exprText },
          `Use inline array or object for bindables definition.`,
          {
            file: init.getSourceFile().fileName,
            line: getLineNumber(init),
            snippet: init.getText().slice(0, 80),
          }
        ));
      }
    }

    // Parse dependencies (with gap reporting)
    const dependenciesProp = getProp(obj, "dependencies");
    let dependencies: DependencyRef[] | undefined;
    if (dependenciesProp && ts.isArrayLiteralExpression(dependenciesProp.initializer)) {
      dependencies = parseDependencyArray(dependenciesProp.initializer, className, gaps);
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

function extractStaticDependencies(
  node: ts.ClassDeclaration,
  className: string,
  gaps: AnalysisGap[],
): StaticDependenciesFact | null {
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== "dependencies") continue;
    if (!hasStaticModifier(member)) continue;
    if (!member.initializer || !ts.isArrayLiteralExpression(member.initializer)) continue;

    // Use parseDependencyArray for full handling (identifiers, property access, spreads, etc.)
    const references = parseDependencyArray(member.initializer, className, gaps);

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
