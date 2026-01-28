import ts from "typescript";
import type {
  ExtractedRouteConfig,
  ExtractedChildRoute,
  ComponentRef,
} from "./types.js";
import {
  unwrapDecorator,
  decoratorsOf,
  getProp,
  readStringProp,
  readBooleanProp,
  hasStaticModifier,
} from "../util/ast-helpers.js";

/**
 * Extract route configuration from a class declaration.
 * Checks for @route decorator first, then static routes property.
 */
export function extractRouteConfig(
  classDecl: ts.ClassDeclaration
): ExtractedRouteConfig | null {
  // Check for getRouteConfig method (dynamic routes - can't statically analyze)
  if (hasGetRouteConfigMethod(classDecl)) {
    return null; // Signal that this needs runtime discovery
  }

  // Try @route decorator first (takes precedence)
  const decoratorConfig = extractFromDecorator(classDecl);
  if (decoratorConfig) return decoratorConfig;

  // Try static routes property
  const staticConfig = extractFromStaticProperty(classDecl);
  if (staticConfig) return staticConfig;

  return null;
}

/**
 * Check if a class has a getRouteConfig method.
 */
export function hasGetRouteConfigMethod(classDecl: ts.ClassDeclaration): boolean {
  for (const member of classDecl.members) {
    if (ts.isMethodDeclaration(member) && member.name) {
      const name = ts.isIdentifier(member.name) ? member.name.text : null;
      if (name === "getRouteConfig") return true;
    }
  }
  return false;
}

/**
 * Extract route config from @route decorator.
 */
export function extractFromDecorator(
  classDecl: ts.ClassDeclaration
): ExtractedRouteConfig | null {
  for (const dec of decoratorsOf(classDecl)) {
    const unwrapped = unwrapDecorator(dec);
    if (!unwrapped || unwrapped.name !== "route") continue;

    // @route (no arguments) - use class name conventions
    if (unwrapped.args.length === 0) {
      return {
        routes: [],
        definitionType: "decorator",
      };
    }

    const arg = unwrapped.args[0]!;

    // @route('path')
    if (ts.isStringLiteral(arg)) {
      const path = arg.text;
      return {
        path,
        routes: [],
        definitionType: "decorator",
        params: extractPathParams(path),
      };
    }

    // @route(['path1', 'path2'])
    if (ts.isArrayLiteralExpression(arg)) {
      const paths = extractStringArray(arg);
      return {
        path: paths.length === 1 ? paths[0] : paths,
        routes: [],
        definitionType: "decorator",
        // Use first path for params
        params: paths.length > 0 ? extractPathParams(paths[0]!) : undefined,
      };
    }

    // @route({ path: '...', routes: [...] })
    if (ts.isObjectLiteralExpression(arg)) {
      return extractFromRouteConfigObject(arg);
    }
  }

  return null;
}

/**
 * Extract route config from a config object literal.
 */
function extractFromRouteConfigObject(
  obj: ts.ObjectLiteralExpression
): ExtractedRouteConfig {
  const path = extractPathValue(obj);
  const id = readStringProp(obj, "id");
  const title = readStringProp(obj, "title");
  const redirectTo = readStringProp(obj, "redirectTo");
  const viewport = readStringProp(obj, "viewport");
  const nav = readBooleanProp(obj, "nav"); // Not used but parsed for completeness

  // Extract routes array
  const routesProp = getProp(obj, "routes");
  const routes = routesProp && ts.isArrayLiteralExpression(routesProp.initializer)
    ? extractRoutesArray(routesProp.initializer)
    : [];

  // Extract fallback
  const fallbackProp = getProp(obj, "fallback");
  const fallback = fallbackProp ? extractComponentRef(fallbackProp.initializer) : undefined;

  // Extract data
  const dataProp = getProp(obj, "data");
  const data = dataProp && ts.isObjectLiteralExpression(dataProp.initializer)
    ? extractDataObject(dataProp.initializer)
    : undefined;

  // Extract params from path
  const pathStr = typeof path === "string" ? path : (Array.isArray(path) ? path[0] : undefined);
  const params = pathStr ? extractPathParams(pathStr) : undefined;

  return {
    ...(path !== undefined ? { path } : {}),
    ...(id ? { id } : {}),
    ...(title ? { title } : {}),
    ...(redirectTo ? { redirectTo } : {}),
    ...(viewport ? { viewport } : {}),
    routes,
    ...(fallback ? { fallback } : {}),
    ...(data ? { data } : {}),
    definitionType: "decorator",
    ...(params && params.length > 0 ? { params } : {}),
  };
}

/**
 * Extract route config from static routes property.
 */
export function extractFromStaticProperty(
  classDecl: ts.ClassDeclaration
): ExtractedRouteConfig | null {
  for (const member of classDecl.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!hasStaticModifier(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== "routes") continue;

    const initializer = member.initializer;
    if (!initializer) continue;

    // Unwrap type assertions: static routes = [...] as const
    const unwrapped = unwrapTypeAssertion(initializer);
    if (!ts.isArrayLiteralExpression(unwrapped)) continue;

    const routes = extractRoutesArray(unwrapped);
    return {
      routes,
      definitionType: "static-property",
    };
  }

  return null;
}

/**
 * Extract an array of child routes.
 */
function extractRoutesArray(arr: ts.ArrayLiteralExpression): ExtractedChildRoute[] {
  const routes: ExtractedChildRoute[] = [];

  for (const element of arr.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const route = extractChildRoute(element);
    if (route) routes.push(route);
  }

  return routes;
}

/**
 * Extract a single child route from an object literal.
 */
function extractChildRoute(obj: ts.ObjectLiteralExpression): ExtractedChildRoute | null {
  const path = readStringProp(obj, "path");
  if (path === undefined) return null; // path is required

  const id = readStringProp(obj, "id");
  const title = readStringProp(obj, "title");
  const redirectTo = readStringProp(obj, "redirectTo");
  const viewport = readStringProp(obj, "viewport");

  // Extract component
  const componentProp = getProp(obj, "component");
  const component = componentProp ? extractComponentRef(componentProp.initializer) : undefined;

  // Extract nested routes
  const routesProp = getProp(obj, "routes");
  const children = routesProp && ts.isArrayLiteralExpression(routesProp.initializer)
    ? extractRoutesArray(routesProp.initializer)
    : undefined;

  // Extract data
  const dataProp = getProp(obj, "data");
  const data = dataProp && ts.isObjectLiteralExpression(dataProp.initializer)
    ? extractDataObject(dataProp.initializer)
    : undefined;

  return {
    path,
    ...(component ? { component } : {}),
    ...(id ? { id } : {}),
    ...(title ? { title } : {}),
    ...(redirectTo !== undefined ? { redirectTo } : {}),
    ...(viewport ? { viewport } : {}),
    ...(children && children.length > 0 ? { children } : {}),
    ...(data ? { data } : {}),
  };
}

/**
 * Extract a component reference from an expression.
 */
export function extractComponentRef(expr: ts.Expression): ComponentRef {
  // Class reference: Home, ProductDetail
  if (ts.isIdentifier(expr)) {
    return {
      kind: "class",
      className: expr.text,
    };
  }

  // String reference: 'home', 'product-detail'
  if (ts.isStringLiteral(expr)) {
    return {
      kind: "string",
      name: expr.text,
    };
  }

  // Dynamic import: import('./pages/home')
  if (ts.isCallExpression(expr) && expr.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const arg = expr.arguments[0];
    if (arg && ts.isStringLiteral(arg)) {
      return {
        kind: "import",
        importPath: arg.text,
      };
    }
  }

  // Inline definition: { name: 'x', template: '...' }
  if (ts.isObjectLiteralExpression(expr)) {
    const name = readStringProp(expr, "name");
    const template = readStringProp(expr, "template");
    if (name) {
      return {
        kind: "inline",
        name,
        ...(template ? { template } : {}),
      };
    }
  }

  // Unknown - preserve raw text for diagnostics
  return {
    kind: "unknown",
    raw: expr.getText(),
  };
}

/**
 * Extract path value from route config object.
 * Handles string, array of strings.
 */
function extractPathValue(obj: ts.ObjectLiteralExpression): string | readonly string[] | undefined {
  const prop = getProp(obj, "path");
  if (!prop) return undefined;

  const init = unwrapTypeAssertion(prop.initializer);

  if (ts.isStringLiteral(init)) {
    return init.text;
  }

  if (ts.isArrayLiteralExpression(init)) {
    const paths = extractStringArray(init);
    return paths.length === 1 ? paths[0] : paths;
  }

  return undefined;
}

/**
 * Extract path parameters from a path string.
 * E.g., ':id' -> ['id'], 'products/:category/:id' -> ['category', 'id']
 */
export function extractPathParams(path: string): readonly string[] {
  const params: string[] = [];
  const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)\??/g;
  let match;
  while ((match = regex.exec(path)) !== null) {
    params.push(match[1]!);
  }
  return params;
}

/**
 * Extract a string array from an array literal.
 */
function extractStringArray(arr: ts.ArrayLiteralExpression): string[] {
  const values: string[] = [];
  for (const el of arr.elements) {
    if (ts.isStringLiteral(el)) {
      values.push(el.text);
    }
  }
  return values;
}

/**
 * Extract data object as JSON-compatible value.
 */
function extractDataObject(obj: ts.ObjectLiteralExpression): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    const name = ts.isIdentifier(prop.name)
      ? prop.name.text
      : ts.isStringLiteral(prop.name)
        ? prop.name.text
        : null;

    if (!name) continue;

    result[name] = extractJsonValue(prop.initializer);
  }

  return result;
}

/**
 * Extract a JSON-compatible value from an expression.
 */
function extractJsonValue(expr: ts.Expression): unknown {
  if (ts.isStringLiteral(expr)) return expr.text;
  if (ts.isNumericLiteral(expr)) return Number(expr.text);
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expr.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isArrayLiteralExpression(expr)) {
    return expr.elements.map(extractJsonValue);
  }

  if (ts.isObjectLiteralExpression(expr)) {
    return extractDataObject(expr);
  }

  // For complex expressions, return undefined
  return undefined;
}

/**
 * Unwrap type assertions (e.g., `[...] as const` -> `[...]`).
 */
function unwrapTypeAssertion(expr: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expr)) {
    return unwrapTypeAssertion(expr.expression);
  }
  if (ts.isTypeAssertionExpression(expr)) {
    return unwrapTypeAssertion(expr.expression);
  }
  if (ts.isParenthesizedExpression(expr)) {
    return unwrapTypeAssertion(expr.expression);
  }
  if (ts.isSatisfiesExpression(expr)) {
    return unwrapTypeAssertion(expr.expression);
  }
  return expr;
}
