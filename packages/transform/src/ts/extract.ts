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
 * See docs/aot-build-requirements.md Phase A for full requirements.
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
 * TODO: Implement this function
 * See: docs/aot-build-requirements.md Phase A
 */
export function extractDecoratorConfig(
  source: string,
  classInfo: ClassInfo
): ExtractedDecoratorConfig | null {
  // TODO: Implement full config extraction
  // This is a superset of extractDependencies

  return null; // Placeholder
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
