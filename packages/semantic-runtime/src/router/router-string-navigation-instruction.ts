import {
  parseRouteExpression,
  type ParsedRouteExpression,
} from './route-expression-parser.js';

/** Prefix family handled by RouteContext.createViewportInstructions before RouteExpression parsing. */
export enum RouterStringNavigationInstructionPrefixKind {
  /** No context-relative prefix; the string can be parsed as-is. */
  None = 'none',
  /** Leading `/` selects the root route context before parsing the remaining string. */
  Root = 'root',
  /** Leading `./` selects the current route context before parsing the remaining string. */
  Current = 'current',
  /** Leading `../` segments climb parent route contexts before parsing the remaining string. */
  Parent = 'parent',
}

/** Context-free prefix read for a router string navigation instruction. */
export interface RouterStringNavigationInstructionPrefix {
  readonly rawValue: string;
  readonly prefixKind: RouterStringNavigationInstructionPrefixKind;
  readonly routeExpressionInput: string;
  readonly parentContextTraversalCount: number;
}

/** Context-free parse of a router string navigation instruction after RouteContext prefix handling. */
export interface ParsedRouterStringNavigationInstruction extends RouterStringNavigationInstructionPrefix {
  readonly routeExpression: ParsedRouteExpression;
}

/** Read the context-relative prefix exactly once, leaving context availability to the caller. */
export function normalizeRouterStringNavigationInstructionPrefix(
  value: string,
): RouterStringNavigationInstructionPrefix {
  if (value.startsWith('/')) {
    return {
      rawValue: value,
      prefixKind: RouterStringNavigationInstructionPrefixKind.Root,
      routeExpressionInput: value.slice(1),
      parentContextTraversalCount: 0,
    };
  }
  if (value.startsWith('../')) {
    let parentContextTraversalCount = 0;
    let routeExpressionInput = value;
    while (routeExpressionInput.startsWith('../')) {
      parentContextTraversalCount += 1;
      routeExpressionInput = routeExpressionInput.slice(3);
    }
    return {
      rawValue: value,
      prefixKind: RouterStringNavigationInstructionPrefixKind.Parent,
      routeExpressionInput,
      parentContextTraversalCount,
    };
  }
  if (value.startsWith('./')) {
    return {
      rawValue: value,
      prefixKind: RouterStringNavigationInstructionPrefixKind.Current,
      routeExpressionInput: value.slice(2),
      parentContextTraversalCount: 0,
    };
  }
  return {
    rawValue: value,
    prefixKind: RouterStringNavigationInstructionPrefixKind.None,
    routeExpressionInput: value,
    parentContextTraversalCount: 0,
  };
}

/** Parse a router string navigation instruction in a context-independent source validation lane. */
export function parseRouterStringNavigationInstruction(
  value: string,
): ParsedRouterStringNavigationInstruction {
  const prefix = normalizeRouterStringNavigationInstructionPrefix(value);
  return {
    ...prefix,
    routeExpression: parseRouteExpression(prefix.routeExpressionInput),
  };
}
