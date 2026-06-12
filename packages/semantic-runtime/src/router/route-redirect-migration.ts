import {
  firstUnexpectedRedirectMigrationExpressionKind,
  parseRouteExpression,
  redirectMigrationSegmentsForRouteExpression,
  type ParsedRouteExpressionKind,
  type ParsedSegmentExpression,
} from './route-expression-parser.js';

export type RouteRedirectMigrationSource =
  | 'path'
  | 'redirectTo';

export interface RouteRedirectMigrationUnsupported {
  readonly source: RouteRedirectMigrationSource;
  readonly value: string;
  readonly unexpectedKind: ParsedRouteExpressionKind;
}

export interface RouteRedirectMigrationResult {
  readonly path: string | null;
  readonly unsupported: RouteRedirectMigrationUnsupported | null;
}

/** Model the RouteTree.createConfiguredNode redirect-parameter migration preconditions. */
export function redirectMigrationUnsupported(
  path: string,
  redirectTo: string,
): RouteRedirectMigrationUnsupported | null {
  const original = parseRouteExpression(path);
  const originalUnexpectedKind = firstUnexpectedRedirectMigrationExpressionKind(original.root);
  if (originalUnexpectedKind != null) {
    return {
      source: 'path',
      value: path,
      unexpectedKind: originalUnexpectedKind,
    };
  }

  const redirect = parseRouteExpression(redirectTo);
  const redirectUnexpectedKind = firstUnexpectedRedirectMigrationExpressionKind(redirect.root);
  if (redirectUnexpectedKind != null) {
    return {
      source: 'redirectTo',
      value: redirectTo,
      unexpectedKind: redirectUnexpectedKind,
    };
  }

  return null;
}

/** Model the framework redirect path rewrite after both expressions are known to be segment/scoped-segment chains. */
export function migrateRedirectPath(
  path: string,
  redirectTo: string,
  parameters: ReadonlyMap<string, string | undefined>,
): RouteRedirectMigrationResult {
  const unsupported = redirectMigrationUnsupported(path, redirectTo);
  if (unsupported != null) {
    return {
      path: null,
      unsupported,
    };
  }

  const originalSegments = redirectMigrationSegmentsForRouteExpression(parseRouteExpression(path).root);
  const redirectSegments = redirectMigrationSegmentsForRouteExpression(parseRouteExpression(redirectTo).root);
  if (originalSegments == null || redirectSegments == null) {
    return {
      path: null,
      unsupported: null,
    };
  }

  const newSegments: string[] = [];
  const length = Math.max(originalSegments.length, redirectSegments.length);
  for (let index = 0; index < length; ++index) {
    const original = originalSegments[index] ?? null;
    const redirect = redirectSegments[index] ?? null;
    if (redirect == null) {
      continue;
    }
    if (isDynamicComponent(redirect) && original != null && isDynamicComponent(original)) {
      newSegments.push(parameters.get(parameterName(redirect.component)) ?? '');
    } else {
      newSegments.push(redirect.component);
    }
  }

  return {
    path: newSegments.filter((segment) => segment.length > 0).join('/'),
    unsupported: null,
  };
}

function isDynamicComponent(
  segment: ParsedSegmentExpression,
): boolean {
  return segment.component.startsWith(':') || segment.component.startsWith('*');
}

function parameterName(
  component: string,
): string {
  return component.slice(1);
}
