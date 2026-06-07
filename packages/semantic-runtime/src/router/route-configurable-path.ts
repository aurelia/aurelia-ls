import {
  DynamicSegmentModel,
  ParameterModel,
  RouteRecognizerIssueKind,
  RouteRecognizerSegmentKind,
  StarSegmentModel,
  StaticSegmentModel,
  type RouteRecognizerSegmentModel,
} from './model.js';
import {
  RouteRecognizerRawErrorAuthority,
  type RouteRecognizerRawErrorAuthority as RouteRecognizerRawErrorAuthorityValue,
} from './framework-raw-error-authority.js';
import {
  isNonEmptyRoutePathSegment,
} from './route-string.js';

export const ROUTE_RECOGNIZER_RESIDUE_PARAMETER = '$$residue';

const ROUTE_PARAMETER_PATTERN = /^:(?<name>[^?\s{}]+)(?:\{\{(?<constraint>.+)\}\})?(?<optional>\?)?$/;

export interface ConfigurableRouteParse {
  readonly segments: readonly RouteRecognizerSegmentModel[];
  readonly parameters: readonly ParameterModel[];
  readonly issues: readonly ConfigurableRouteParseIssue[];
}

export interface ConfigurableRouteParseIssue {
  readonly kind: RouteRecognizerIssueKind;
  readonly frameworkRawErrorAuthority: RouteRecognizerRawErrorAuthorityValue | null;
  readonly message: string;
  readonly path: string;
}

/** Parse an authored router-config path using the same segment rules as RouteRecognizer.add(...). */
export function parseConfigurableRoutePath(
  path: string,
  caseSensitive: boolean,
  allowGeneratedResidueStar: boolean = false,
): ConfigurableRouteParse {
  const parts = path === '' ? [''] : path.split('/').filter(isNonEmptyRoutePathSegment);
  const segments: RouteRecognizerSegmentModel[] = [];
  const parameters: ParameterModel[] = [];
  const issues: ConfigurableRouteParseIssue[] = [];

  for (const part of parts) {
    if (part.startsWith(':')) {
      const match = ROUTE_PARAMETER_PATTERN.exec(part);
      ROUTE_PARAMETER_PATTERN.lastIndex = 0;
      const name = match?.groups?.name ?? part.slice(1);
      const optional = match?.groups?.optional === '?';
      const pattern = match?.groups?.constraint ?? null;
      if (name === ROUTE_RECOGNIZER_RESIDUE_PARAMETER) {
        issues.push(reservedParameterNameIssue(path, RouteRecognizerRawErrorAuthority.ReservedParameterNameDynamic));
        continue;
      }
      if (pattern != null && !isValidRouteParameterConstraint(pattern)) {
        issues.push(invalidParameterConstraintIssue(path, name, pattern));
        continue;
      }
      if (name !== ROUTE_RECOGNIZER_RESIDUE_PARAMETER) {
        parameters.push(new ParameterModel(name, optional, false, pattern));
      }
      segments.push(new DynamicSegmentModel(
        part,
        name,
        optional,
        pattern,
      ));
      continue;
    }

    if (part.startsWith('*')) {
      const name = part.slice(1);
      if (name === ROUTE_RECOGNIZER_RESIDUE_PARAMETER && !allowGeneratedResidueStar) {
        issues.push(reservedParameterNameIssue(path, RouteRecognizerRawErrorAuthority.ReservedParameterNameStar));
        continue;
      }
      const segmentKind = name === ROUTE_RECOGNIZER_RESIDUE_PARAMETER
        ? RouteRecognizerSegmentKind.Residue
        : RouteRecognizerSegmentKind.Star;
      parameters.push(new ParameterModel(name, true, true, null));
      segments.push(new StarSegmentModel(
        segmentKind,
        part,
        name,
      ));
      continue;
    }

    segments.push(new StaticSegmentModel(
      part,
      part,
      caseSensitive,
    ));
  }

  return { segments, parameters, issues };
}

function reservedParameterNameIssue(
  path: string,
  frameworkRawErrorAuthority: RouteRecognizerRawErrorAuthorityValue,
): ConfigurableRouteParseIssue {
  return {
    kind: RouteRecognizerIssueKind.ReservedParameterName,
    frameworkRawErrorAuthority,
    message: `Invalid parameter name; usage of the reserved parameter name '${ROUTE_RECOGNIZER_RESIDUE_PARAMETER}' is used.`,
    path,
  };
}

function invalidParameterConstraintIssue(
  path: string,
  name: string,
  pattern: string,
): ConfigurableRouteParseIssue {
  return {
    kind: RouteRecognizerIssueKind.InvalidParameterConstraint,
    frameworkRawErrorAuthority: null,
    message: `Invalid route parameter constraint for '${name}': ${pattern}`,
    path,
  };
}

function isValidRouteParameterConstraint(pattern: string): boolean {
  try {
    void new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
