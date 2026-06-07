import { singleQuotedTypeScriptStringLiteralText } from '../source-plan/source-template.js';
import type { RouteContextParameterMergeStrategy } from './model.js';

/** Route-parameter merge strategies accepted by authored `RouteContext.getRouteParameters(...)` source. */
export type RouteContextParameterMergeStrategySource = Exclude<RouteContextParameterMergeStrategy, 'unknown'>;

/** Stable merge-strategy values accepted by authored `RouteContext.getRouteParameters(...)` source. */
export const ROUTE_CONTEXT_PARAMETER_MERGE_STRATEGY_SOURCES: readonly RouteContextParameterMergeStrategySource[] = [
  'child-first',
  'parent-first',
  'append',
  'by-route',
] as const;

/** One property in the generated route-parameter object type argument. */
export interface RouteContextParameterTypeMemberSource {
  /** Route parameter, query parameter, or open parameter member name. */
  readonly name: string;
  /** Whether the parameter is optional in the generated TypeScript shape. */
  readonly optional?: boolean;
  /** TypeScript source for the parameter value type. */
  readonly typeSource?: string;
}

/** Authored source request for `RouteContext.getRouteParameters(...)`. */
export interface RouteContextParameterReadExpressionSourceRequest {
  /** Receiver expression; defaults to `resolve(IRouteContext)`. */
  readonly receiverExpression?: string;
  /** Complete TypeScript object type source for the route-parameter shape. */
  readonly parameterTypeSource?: string;
  /** Parameter shape projected into the first type argument. */
  readonly parameterMembers?: readonly RouteContextParameterTypeMemberSource[];
  /** Merge strategy option and optional second type argument. */
  readonly mergeStrategy?: RouteContextParameterMergeStrategySource;
  /** Whether query params are merged into the returned object. */
  readonly includeQueryParams?: boolean;
}

/** Authored `resolve(IRouteContext)` expression; callers still own importing `resolve` and `IRouteContext`. */
export function routeContextResolveExpressionSourceText(): string {
  return 'resolve(IRouteContext)';
}

/** Serialize a `RouteContext.getRouteParameters(...)` expression from framework-shaped source options. */
export function routeContextParameterReadExpressionSourceText(
  request: RouteContextParameterReadExpressionSourceRequest,
): string {
  const receiver = request.receiverExpression ?? routeContextResolveExpressionSourceText();
  const typeArguments = routeContextParameterReadTypeArgumentsSourceText(request);
  const options = routeContextParameterReadOptionsSourceText(request);
  return `${receiver}.getRouteParameters${typeArguments}(${options ?? ''})`;
}

function routeContextParameterReadTypeArgumentsSourceText(
  request: RouteContextParameterReadExpressionSourceRequest,
): string {
  const parameterType = request.parameterTypeSource ?? routeContextParameterObjectTypeSourceText(request.parameterMembers ?? []);
  const typeArguments = [
    ...(parameterType == null ? [] : [parameterType]),
    ...(parameterType == null || request.mergeStrategy == null
      ? []
      : [singleQuotedTypeScriptStringLiteralText(request.mergeStrategy)]),
  ];
  return typeArguments.length === 0
    ? ''
    : `<${typeArguments.join(', ')}>`;
}

export function routeContextParameterObjectTypeSourceText(
  members: readonly RouteContextParameterTypeMemberSource[],
): string | null {
  if (members.length === 0) {
    return null;
  }
  return `{
${members.map(routeContextParameterObjectMemberSourceText).join('\n')}
  }`;
}

function routeContextParameterObjectMemberSourceText(
  member: RouteContextParameterTypeMemberSource,
): string {
  return `    ${member.name}${member.optional === true ? '?' : ''}: ${member.typeSource ?? 'string'};`;
}

function routeContextParameterReadOptionsSourceText(
  request: RouteContextParameterReadExpressionSourceRequest,
): string | null {
  const fields = [
    ...(request.includeQueryParams == null ? [] : [`includeQueryParams: ${request.includeQueryParams ? 'true' : 'false'}`]),
    ...(request.mergeStrategy == null ? [] : [`mergeStrategy: ${singleQuotedTypeScriptStringLiteralText(request.mergeStrategy)}`]),
  ];
  return fields.length === 0 ? null : `{ ${fields.join(', ')} }`;
}
