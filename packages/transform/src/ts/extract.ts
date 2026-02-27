/**
 * Transform Package - Decorator Extraction
 *
 * Extracts metadata from decorators before they are removed.
 * This information is needed to populate the emitted $au definition.
 *
 * ## What needs to be extracted:
 *
 * 1. `dependencies` array from @customElement({ dependencies: [...] })
 * 2. Decorator config values (name, aliases, containerless, etc.)
 *
 * ## Usage in transform pipeline:
 *
 * ```
 * source code → extractDependencies() → dependencies[]
 *             → extractDecoratorConfig() → config
 *                                            ↓
 *                            emitStaticAu({ ..., dependencies })
 * ```
 *
 * Extraction focuses on decorator payloads needed for emitted static definitions.
 */

import ts from "typescript";
import type { ClassInfo, DecoratorInfo } from "./types.js";

/* =============================================================================
 * TYPES
 * ============================================================================= */

/**
 * Extracted dependency reference.
 * Can be a simple identifier or a dynamic expression.
 */
export type ExtractedDependency =
  | { type: "identifier"; name: string }
  | { type: "dynamic"; expression: string };

/**
 * Extracted decorator configuration.
 */
export interface ExtractedDecoratorConfig {
  /** Resource name (from decorator argument or config.name) */
  name?: string;

  /** Template (from config.template - usually an identifier) */
  template?: string;

  /** Dependencies array */
  dependencies: ExtractedDependency[];

  /** Aliases array */
  aliases?: string[];

  /** Containerless flag */
  containerless?: boolean;
}

/**
 * Extracted bindable definition.
 * Maps to runtime BindableDefinition format.
 */
export interface ExtractedBindable {
  /** Property name */
  name: string;

  /** Binding mode (default=0, oneTime=1, toView=2, fromView=4, twoWay=6) */
  mode?: number;

  /** Whether this is the primary bindable */
  primary?: boolean;

  /** Attribute name override (defaults to kebab-case of property name) */
  attribute?: string;
}

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

/**
 * Extract dependencies from a @customElement decorator.
 *
 * Handles:
 * - `@customElement({ dependencies: [Foo, Bar] })` → identifiers
 * - `@customElement({ dependencies: [ns.Foo] })` → namespaced identifiers
 * - `@customElement({ dependencies: [...items] })` → dynamic expressions
 * - `@customElement('name')` → [] (no dependencies)
 *
 * @param source - TypeScript source code
 * @param classInfo - Class information from analyze.ts
 * @returns Array of dependency references
 */
export function extractDependencies(
  source: string,
  classInfo: ClassInfo
): ExtractedDependency[] {
  const decorator = findCustomElementDecorator(classInfo);
  if (!decorator) {
    return [];
  }

  // Check if decorator has an object argument
  const objectArg = decorator.arguments?.find(a => a.type === "object");
  if (!objectArg) {
    // String-only decorator like @customElement('name') has no dependencies
    return [];
  }

  // Re-parse the source to get the actual AST for the object literal
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  // Find the dependencies array in the object literal
  const dependenciesArray = findDependenciesArray(sourceFile, objectArg.span.start, objectArg.span.end);
  if (!dependenciesArray) {
    return [];
  }

  // Extract each element from the dependencies array
  return extractArrayElements(dependenciesArray, source);
}

/**
 * Extract full decorator configuration.
 *
 * TODO: Implement full config extraction
 */
export function extractDecoratorConfig(
  source: string,
  classInfo: ClassInfo
): ExtractedDecoratorConfig | null {
  // TODO: Implement full config extraction
  // This is a superset of extractDependencies

  return null; // Placeholder
}

/**
 * Binding mode values matching runtime BindingMode enum.
 */
const BINDING_MODE = {
  default: 0,
  oneTime: 1,
  toView: 2,
  fromView: 4,
  twoWay: 6,
} as const;

/**
 * Extract bindables from @bindable property decorators.
 *
 * Handles:
 * - `@bindable prop` → { name: "prop" }
 * - `@bindable({ mode: BindingMode.twoWay }) prop` → { name: "prop", mode: 6 }
 * - `@bindable({ primary: true }) prop` → { name: "prop", primary: true }
 *
 * @param source - TypeScript source code
 * @param classInfo - Class information from analyze.ts
 * @returns Array of extracted bindable definitions
 */
export function extractBindables(
  source: string,
  classInfo: ClassInfo
): ExtractedBindable[] {
  const bindables: ExtractedBindable[] = [];

  // Parse source to get the AST
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  // Find the class declaration
  const classNode = findClassNode(sourceFile, classInfo.name);
  if (!classNode) {
    return [];
  }

  // Iterate through class members to find @bindable decorated properties
  for (const member of classNode.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;

    const propertyName = member.name.text;
    const bindableDecorator = findBindableDecorator(member);

    if (bindableDecorator) {
      const bindable = extractBindableFromDecorator(propertyName, bindableDecorator, source);
      bindables.push(bindable);
    }
  }

  return bindables;
}

/* =============================================================================
 * INTERNAL HELPERS
 * ============================================================================= */

/**
 * Find the @customElement decorator on a class.
 */
function findCustomElementDecorator(classInfo: ClassInfo): DecoratorInfo | null {
  return classInfo.decorators.find(d => d.name === "customElement") ?? null;
}

/**
 * Find a class declaration by name in the source file.
 */
function findClassNode(sourceFile: ts.SourceFile, className: string): ts.ClassDeclaration | null {
  let result: ts.ClassDeclaration | null = null;

  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return result;
}

/**
 * Find @bindable decorator on a property declaration.
 */
function findBindableDecorator(member: ts.PropertyDeclaration): ts.Decorator | null {
  if (!ts.canHaveDecorators(member)) {
    return null;
  }

  const decorators = ts.getDecorators(member);
  if (!decorators) {
    return null;
  }

  for (const decorator of decorators) {
    const expr = decorator.expression;

    // @bindable (no call)
    if (ts.isIdentifier(expr) && expr.text === "bindable") {
      return decorator;
    }

    // @bindable() or @bindable({...})
    if (ts.isCallExpression(expr)) {
      const callee = expr.expression;
      if (ts.isIdentifier(callee) && callee.text === "bindable") {
        return decorator;
      }
    }
  }

  return null;
}

/**
 * Extract bindable configuration from a @bindable decorator.
 */
function extractBindableFromDecorator(
  propertyName: string,
  decorator: ts.Decorator,
  source: string
): ExtractedBindable {
  const bindable: ExtractedBindable = { name: propertyName };
  const expr = decorator.expression;

  // @bindable (no config)
  if (ts.isIdentifier(expr)) {
    return bindable;
  }

  // @bindable() or @bindable({...})
  if (!ts.isCallExpression(expr) || expr.arguments.length === 0) {
    return bindable;
  }

  const arg = expr.arguments[0];
  if (!arg || !ts.isObjectLiteralExpression(arg)) {
    return bindable;
  }

  // Extract configuration from object literal
  for (const prop of arg.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      continue;
    }

    const propName = prop.name.text;
    const value = prop.initializer;

    switch (propName) {
      case "mode":
        bindable.mode = extractBindingModeValue(value);
        break;
      case "primary":
        if (value.kind === ts.SyntaxKind.TrueKeyword) {
          bindable.primary = true;
        } else if (value.kind === ts.SyntaxKind.FalseKeyword) {
          bindable.primary = false;
        }
        break;
      case "attribute":
        if (ts.isStringLiteral(value)) {
          bindable.attribute = value.text;
        }
        break;
    }
  }

  return bindable;
}

/**
 * Extract numeric binding mode value from an expression.
 * Handles: BindingMode.twoWay, twoWay (imported), 6 (numeric literal)
 */
function extractBindingModeValue(expr: ts.Expression): number | undefined {
  // Numeric literal: 6
  if (ts.isNumericLiteral(expr)) {
    return parseInt(expr.text, 10);
  }

  // Property access: BindingMode.twoWay
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
    const modeName = expr.name.text as keyof typeof BINDING_MODE;
    if (modeName in BINDING_MODE) {
      return BINDING_MODE[modeName];
    }
  }

  // Identifier: twoWay (imported directly)
  if (ts.isIdentifier(expr)) {
    const modeName = expr.text as keyof typeof BINDING_MODE;
    if (modeName in BINDING_MODE) {
      return BINDING_MODE[modeName];
    }
  }

  return undefined;
}

/**
 * Find the dependencies array within an object literal at the given span.
 */
function findDependenciesArray(
  sourceFile: ts.SourceFile,
  spanStart: number,
  spanEnd: number
): ts.ArrayLiteralExpression | null {
  let result: ts.ArrayLiteralExpression | null = null;

  function visit(node: ts.Node): void {
    // Check if this node is within the span
    const nodeStart = node.getStart(sourceFile);
    const nodeEnd = node.getEnd();

    if (nodeStart < spanStart || nodeEnd > spanEnd) {
      // Node is outside our target span
      ts.forEachChild(node, visit);
      return;
    }

    // Look for object literal expression
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === "dependencies") {
          if (ts.isArrayLiteralExpression(prop.initializer)) {
            result = prop.initializer;
            return;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return result;
}

/**
 * Extract dependency elements from an array literal.
 */
function extractArrayElements(
  array: ts.ArrayLiteralExpression,
  source: string
): ExtractedDependency[] {
  const deps: ExtractedDependency[] = [];

  for (const element of array.elements) {
    if (ts.isIdentifier(element)) {
      // Simple identifier: ChildA
      deps.push({ type: "identifier", name: element.text });
    } else if (ts.isPropertyAccessExpression(element)) {
      // Namespaced access: components.ChildA
      deps.push({ type: "identifier", name: getPropertyAccessText(element) });
    } else if (ts.isSpreadElement(element)) {
      // Spread: ...items or ...Object.values(children)
      const start = element.getStart();
      const end = element.getEnd();
      deps.push({ type: "dynamic", expression: source.slice(start, end) });
    } else {
      // Other expressions are treated as dynamic
      const start = element.getStart();
      const end = element.getEnd();
      deps.push({ type: "dynamic", expression: source.slice(start, end) });
    }
  }

  return deps;
}

/**
 * Get the full text of a property access expression (e.g., "ns.Child" or "a.b.c").
 */
function getPropertyAccessText(node: ts.PropertyAccessExpression): string {
  const parts: string[] = [];

  let current: ts.Expression = node;
  while (ts.isPropertyAccessExpression(current)) {
    parts.unshift(current.name.text);
    current = current.expression;
  }

  if (ts.isIdentifier(current)) {
    parts.unshift(current.text);
  }

  return parts.join(".");
}
