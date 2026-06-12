import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectCardinality,
  expectedSemanticEffectFilters,
  ExpectedSemanticEffectKind,
  type ExpectedSemanticEffectFilterValue,
  ExpectedSemanticEffectRole,
  ExpectedSemanticEffectScope,
  ExpectedSemanticEffectTopologyNodeKind,
} from './expected-effect.js';
import { ExpectedSemanticEffectRouteProductKind } from './effect-observation.js';

export function routeProductEffect(
  summary: string,
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
  role: ExpectedSemanticEffectRole = ExpectedSemanticEffectRole.Baseline,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    ExpectedSemanticEffectKind.Route,
    ExpectedSemanticEffectScope.Route,
    ExpectedSemanticEffectTopologyNodeKind.Route,
    ExpectedSemanticEffectCardinality.Present,
    null,
    expectedSemanticEffectFilters(['routeProductKind', routeProductKind]),
    role,
  );
}

export function routeProductSignatureEffect(
  summary: string,
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
): ExpectedSemanticEffect {
  return routeProductEffect(summary, routeProductKind, ExpectedSemanticEffectRole.Signature);
}

export function routeProductDiscriminatorEffect(
  summary: string,
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
): ExpectedSemanticEffect {
  return routeProductEffect(summary, routeProductKind, ExpectedSemanticEffectRole.Discriminator);
}

export function routeConfigObjectLiteralEffect(
  summary: string,
  originKind: 'route-decorator' | 'child-routes-property',
): ExpectedSemanticEffect {
  return routeSignatureFact(summary, [
    ['originKind', originKind],
    ['valueKind', 'object-literal'],
  ]);
}

export function routePatternParameterEffect(
  summary: string,
  parameterName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RoutePattern, [
    ['parameterNames', parameterName],
  ]);
}

export function routeEndpointParameterEffect(
  summary: string,
  parameterName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouteEndpoint, [
    ['parameterNames', parameterName],
  ]);
}

export function routeContextParameterReadEffect(
  summary: string,
  parameterName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouteContextParameterRead, [
    ['routePathParameterNames', parameterName],
  ]);
}

export function routeRecognizedParameterValueEffect(
  summary: string,
  parameterName: string,
  parameterValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RecognizedRoute, [
    ['parameterValuePairs', `${parameterName}=${parameterValue}`],
  ]);
}

export function routeRecognizedDynamicParameterEffect(
  summary: string,
  parameterName: string,
): ExpectedSemanticEffect {
  return routeRecognizedParameterValueEffect(summary, parameterName, '__au_dynamic_0__');
}

export function routeRecognizedParameterEffect(
  summary: string,
  parameterName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RecognizedRoute, [
    ['parameterNames', parameterName],
  ]);
}

export function viewportInstructionTreeQueryParamEffect(
  summary: string,
  queryName: string,
  queryValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.ViewportInstructionTree, [
    ['queryParamPairs', `${queryName}=${queryValue}`],
  ]);
}

export function viewportInstructionTreeFragmentEffect(
  summary: string,
  fragment: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.ViewportInstructionTree, [
    ['fragment', fragment],
  ]);
}

export function routeConfigViewportEffect(
  summary: string,
  viewportName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouteConfig, [
    ['viewport', viewportName],
  ]);
}

export function routerViewportNameEffect(
  summary: string,
  viewportName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouterViewport, [
    ['name', viewportName],
  ]);
}

export function routeNodeParameterValueEffect(
  summary: string,
  parameterName: string,
  parameterValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouteNode, [
    ['parameterValuePairs', `${parameterName}=${parameterValue}`],
  ]);
}

export function routeNodeChildFirstParameterValueEffect(
  summary: string,
  parameterName: string,
  parameterValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouteNode, [
    ['childFirstParameterValuePairs', `${parameterName}=${parameterValue}`],
  ]);
}

export function routeNodeChildFirstQueryValueEffect(
  summary: string,
  queryName: string,
  queryValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouteNode, [
    ['childFirstParameterAndQueryValuePairs', `${queryName}=${queryValue}`],
  ]);
}

export function routeNodeViewportEffect(
  summary: string,
  viewportName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, ExpectedSemanticEffectRouteProductKind.RouteNode, [
    ['viewport', viewportName],
  ]);
}

function routeProductSignatureFact(
  summary: string,
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
  entries: readonly (readonly [string, ExpectedSemanticEffectFilterValue])[],
): ExpectedSemanticEffect {
  return routeSignatureFact(summary, [
    ['routeProductKind', routeProductKind],
    ...entries,
  ]);
}

function routeSignatureFact(
  summary: string,
  entries: readonly (readonly [string, ExpectedSemanticEffectFilterValue])[],
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(
    summary,
    ExpectedSemanticEffectKind.Route,
    ExpectedSemanticEffectScope.Route,
    ExpectedSemanticEffectTopologyNodeKind.Route,
    ExpectedSemanticEffectCardinality.Present,
    null,
    expectedSemanticEffectFilters(...entries),
  );
}
