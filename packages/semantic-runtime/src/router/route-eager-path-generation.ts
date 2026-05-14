import type { IdentityHandle } from '../kernel/handles.js';
import {
  RouteConfigKind,
  type EndpointModel,
  type ParameterModel,
  type RouteConfigContextModel,
  type RouteConfigModel,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import type { RouteRecognizerMaterializationProjectResult } from './route-recognizer-materialization.js';

export const enum EagerRouteComponentKind {
  String = 'string',
  RouteConfig = 'route-config',
  RouteableComponent = 'routeable-component',
}

export type EagerRouteComponent =
  | {
      readonly kind: EagerRouteComponentKind.String;
      readonly value: string;
      readonly localName: string;
    }
  | {
      readonly kind: EagerRouteComponentKind.RouteConfig;
      readonly routeConfigIdentityHandle: IdentityHandle;
      readonly localName: string | null;
    }
  | {
      readonly kind: EagerRouteComponentKind.RouteableComponent;
      readonly resolvedIdentityHandle: IdentityHandle | null;
      readonly localName: string | null;
    };

export type EagerRouteParameterValue =
  | {
      readonly kind: 'closed';
      readonly value: string | null;
    }
  | {
      readonly kind: 'open';
      readonly reason: string;
    };

export interface EagerRouteParameters {
  readonly values: ReadonlyMap<string, EagerRouteParameterValue>;
  readonly mayHaveUnknownProperties: boolean;
}

export interface EagerPathGenerationInstruction {
  readonly component: EagerRouteComponent;
  readonly params: EagerRouteParameters;
}

export type EagerPathGenerationResult =
  | {
      readonly kind: 'generated';
      readonly path: string;
      readonly query: ReadonlyMap<string, string>;
      readonly consumed: ReadonlyMap<string, string>;
      readonly endpoint: EndpointModel;
      readonly routeConfig: RouteConfigModel;
    }
  | {
      readonly kind: 'not-eager';
      readonly component: string | null;
    }
  | {
      readonly kind: 'open';
      readonly component: string | null;
      readonly reason: string;
    }
  | {
      readonly kind: 'failed';
      readonly component: string | null;
      readonly routeConfig: RouteConfigModel | null;
      readonly path: string | null;
      readonly errors: readonly string[];
    };

interface EagerRouteCandidate {
  readonly routeConfig: RouteConfigModel | null;
  readonly paths: readonly string[];
  readonly throwOnFailure: boolean;
}

/** Framework-shaped endpoint lookup for RouteConfigContext._generateViewportInstruction. */
export class RouteEagerPathGenerationIndex {
  private readonly routeConfigsByIdentity: ReadonlyMap<IdentityHandle, RouteConfigModel>;
  private readonly endpointsByRecognizerAndPath: ReadonlyMap<string, EndpointModel>;

  constructor(
    routeContexts: RouteConfigContextMaterializationProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
  ) {
    this.routeConfigsByIdentity = new Map(
      routeContexts.readRouteConfigs().map((routeConfig) => [routeConfig.identityHandle, routeConfig] as const),
    );
    this.endpointsByRecognizerAndPath = new Map(
      routeRecognizer.readEndpoints().flatMap((endpoint) => {
        const recognizerIdentity = endpoint.recognizer.identityHandle;
        return recognizerIdentity == null
          ? []
          : [[endpointKey(recognizerIdentity, endpoint.path), endpoint] as const];
      }),
    );
  }

  generate(
    routeConfigContext: RouteConfigContextModel,
    useEagerLoading: boolean,
    instruction: EagerPathGenerationInstruction,
    parentRoutePath: string | null = null,
  ): EagerPathGenerationResult {
    const candidate = this.candidateFor(routeConfigContext, instruction.component);
    if (candidate == null) {
      return {
        kind: 'not-eager',
        component: componentLabel(instruction.component),
      };
    }

    const normalizedParentPath = normalizeParentRoutePath(
      routeConfigContext,
      this.routeConfigsByIdentity,
      useEagerLoading,
      parentRoutePath,
    );
    if (normalizedParentPath.kind === 'open') {
      return {
        kind: 'open',
        component: componentLabel(instruction.component),
        reason: normalizedParentPath.reason,
      };
    }

    const errors: string[] = [];
    let result: PathGenerationCandidateResult | null = null;
    let maxScore = 0;
    for (const path of candidate.paths) {
      const generated = this.generateForPath(
        routeConfigContext,
        path,
        normalizedParentPath.value,
        instruction.params,
        errors,
      );
      if (generated.kind === 'open') {
        return {
          kind: 'open',
          component: componentLabel(instruction.component),
          reason: generated.reason,
        };
      }
      if (generated.kind === 'failed') {
        continue;
      }
      if (result == null || generated.consumed.size > maxScore) {
        result = generated;
        maxScore = generated.consumed.size;
      }
    }

    if (result == null) {
      return candidate.throwOnFailure
        ? {
            kind: 'failed',
            component: componentLabel(instruction.component),
            routeConfig: candidate.routeConfig,
            path: firstPath(candidate.paths),
            errors,
          }
        : {
            kind: 'not-eager',
            component: componentLabel(instruction.component),
          };
    }
    if (candidate.routeConfig == null) {
      return {
        kind: 'failed',
        component: componentLabel(instruction.component),
        routeConfig: null,
        path: firstPath(candidate.paths),
        errors,
      };
    }

    return {
      kind: 'generated',
      path: result.path,
      query: result.query,
      consumed: result.consumed,
      endpoint: result.endpoint,
      routeConfig: candidate.routeConfig,
    };
  }

  private candidateFor(
    routeConfigContext: RouteConfigContextModel,
    component: EagerRouteComponent,
  ): EagerRouteCandidate | null {
    switch (component.kind) {
      case EagerRouteComponentKind.RouteConfig: {
        const routeConfig = this.routeConfigsByIdentity.get(component.routeConfigIdentityHandle) ?? null;
        return routeConfig == null
          ? null
          : {
              routeConfig,
              paths: routeConfig.paths,
              throwOnFailure: true,
            };
      }
      case EagerRouteComponentKind.String: {
        const routeConfig = this.childRouteConfigs(routeConfigContext).find((child) => child.id === component.value) ?? null;
        return routeConfig == null
          ? null
          : {
              routeConfig,
              paths: routeConfig.paths,
              throwOnFailure: false,
            };
      }
      case EagerRouteComponentKind.RouteableComponent: {
        const routeConfig = this.childRouteConfigs(routeConfigContext).find((child) =>
          child.component?.resolvedIdentityHandle != null
          && child.component.resolvedIdentityHandle === component.resolvedIdentityHandle
        ) ?? null;
        return routeConfig == null
          ? {
              routeConfig: null,
              paths: [],
              throwOnFailure: true,
            }
          : {
              routeConfig,
              paths: routeConfig.paths,
              throwOnFailure: true,
            };
      }
    }
  }

  private childRouteConfigs(
    routeConfigContext: RouteConfigContextModel,
  ): readonly RouteConfigModel[] {
    return routeConfigContext.childRoutes.flatMap((reference) => {
      const identityHandle = reference.identityHandle;
      const routeConfig = identityHandle == null
        ? null
        : this.routeConfigsByIdentity.get(identityHandle) ?? null;
      return routeConfig == null ? [] : [routeConfig];
    });
  }

  private generateForPath(
    routeConfigContext: RouteConfigContextModel,
    path: string,
    parentRoutePath: string | null,
    params: EagerRouteParameters,
    errors: string[],
  ): PathGenerationCandidateResult {
    const recognizerIdentity = routeConfigContext.recognizer.identityHandle;
    if (recognizerIdentity == null) {
      return {
        kind: 'open',
        reason: `RouteConfigContext '${routeConfigContext.identityHandle}' does not expose a materialized RouteRecognizer identity.`,
      };
    }
    const endpointPath = (parentRoutePath?.length ?? 0) > 0 ? `${parentRoutePath}/${path}` : path;
    const endpoint = this.endpointsByRecognizerAndPath.get(endpointKey(recognizerIdentity, endpointPath)) ?? null;
    if (endpoint == null) {
      errors.push(`No endpoint found for the path: '${path}'.`);
      return { kind: 'failed' };
    }

    let generatedPath = path;
    const consumed = new Map<string, string>();
    for (const parameter of endpoint.parameters) {
      const parameterValue = params.values.get(parameter.name) ?? null;
      if (parameterValue?.kind === 'open') {
        return {
          kind: 'open',
          reason: `Route parameter '${parameter.name}' is not statically closed. ${parameterValue.reason}`,
        };
      }
      const value = parameterValue?.value ?? null;
      if (value == null || String(value).length === 0) {
        if (!parameter.isOptional) {
          if (params.mayHaveUnknownProperties) {
            return {
              kind: 'open',
              reason: `Required route parameter '${parameter.name}' is absent from known params but params may have unknown properties.`,
            };
          }
          errors.push(`No value for the required parameter '${parameter.name}' is provided for the path: '${path}'.`);
          return { kind: 'failed' };
        }
        generatedPath = replaceParameter(generatedPath, parameter, '');
        continue;
      }
      if (!satisfiesPattern(parameter, value)) {
        errors.push(`The value '${value}' for the parameter '${parameter.name}' does not satisfy the pattern '${parameter.pattern}'.`);
        return { kind: 'failed' };
      }
      consumed.set(parameter.name, value);
      generatedPath = replaceParameter(generatedPath, parameter, encodeURIComponent(value));
    }
    if (params.mayHaveUnknownProperties) {
      return {
        kind: 'open',
        reason: `Route params for path '${path}' may contain unknown query parameters.`,
      };
    }
    for (const [key, value] of params.values) {
      if (!consumed.has(key) && value.kind === 'open') {
        return {
          kind: 'open',
          reason: `Route query parameter '${key}' is not statically closed. ${value.reason}`,
        };
      }
    }

    return {
      kind: 'generated',
      endpoint,
      path: generatedPath.replace(/\/\//g, '/'),
      consumed,
      query: queryParams(params, consumed),
    };
  }
}

type PathGenerationCandidateResult =
  | {
      readonly kind: 'generated';
      readonly path: string;
      readonly endpoint: EndpointModel;
      readonly consumed: ReadonlyMap<string, string>;
      readonly query: ReadonlyMap<string, string>;
    }
  | {
      readonly kind: 'open';
      readonly reason: string;
    }
  | {
      readonly kind: 'failed';
    };

function normalizeParentRoutePath(
  routeConfigContext: RouteConfigContextModel,
  routeConfigsByIdentity: ReadonlyMap<IdentityHandle, RouteConfigModel>,
  useEagerLoading: boolean,
  parentRoutePath: string | null,
): { readonly kind: 'closed'; readonly value: string | null } | { readonly kind: 'open'; readonly reason: string } {
  if (!useEagerLoading) {
    return { kind: 'closed', value: null };
  }
  if (parentRoutePath != null) {
    return { kind: 'closed', value: parentRoutePath };
  }
  if (routeConfigContext.parent == null) {
    return { kind: 'closed', value: '' };
  }
  const routeConfigIdentity = routeConfigContext.config.identityHandle;
  const routeConfig = routeConfigIdentity == null
    ? null
    : routeConfigsByIdentity.get(routeConfigIdentity) ?? null;
  if (routeConfig == null) {
    return {
      kind: 'open',
      reason: `RouteConfigContext '${routeConfigContext.identityHandle}' references an unmaterialized RouteConfig.`,
    };
  }
  return { kind: 'closed', value: routeConfig.paths.find((path) => path.length > 0) ?? null };
}

function endpointKey(recognizerIdentity: IdentityHandle, path: string): string {
  return `${recognizerIdentity}\0${path}`;
}

function componentLabel(component: EagerRouteComponent): string | null {
  switch (component.kind) {
    case EagerRouteComponentKind.String:
      return component.value;
    case EagerRouteComponentKind.RouteConfig:
    case EagerRouteComponentKind.RouteableComponent:
      return component.localName;
  }
}

function firstPath(paths: readonly string[]): string | null {
  return paths[0] ?? null;
}

function replaceParameter(
  path: string,
  parameter: ParameterModel,
  value: string,
): string {
  const pattern = parameter.isStar
    ? `*${parameter.name}`
    : parameter.isOptional
      ? `:${parameter.name}?`
      : `:${parameter.name}`;
  return path.replace(pattern, value);
}

function satisfiesPattern(
  parameter: ParameterModel,
  value: string,
): boolean {
  return parameter.pattern == null || new RegExp(parameter.pattern).test(value);
}

function queryParams(
  params: EagerRouteParameters,
  consumed: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  const query = new Map<string, string>();
  for (const [key, value] of params.values) {
    if (consumed.has(key) || value.kind !== 'closed' || value.value == null) {
      continue;
    }
    query.set(key, value.value);
  }
  return query;
}
