import {
  ExpectedSemanticEffect,
  expectedSemanticEffectFilters,
  type ExpectedSemanticEffectFilterValue,
  type ExpectedSemanticEffectRole,
} from './expected-effect.js';
import type { ExpectedSemanticEffectRouteProductKind } from './effect-observation.js';

export function routeProductEffect(
  summary: string,
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
  role: ExpectedSemanticEffectRole = 'baseline',
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    'route',
    'route',
    'route',
    'present',
    null,
    expectedSemanticEffectFilters(['routeProductKind', routeProductKind]),
    role,
  );
}

export function routeProductSignatureEffect(
  summary: string,
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
): ExpectedSemanticEffect {
  return routeProductEffect(summary, routeProductKind, 'signature');
}

export function routeProductDiscriminatorEffect(
  summary: string,
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
): ExpectedSemanticEffect {
  return routeProductEffect(summary, routeProductKind, 'discriminator');
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
  return routeProductSignatureFact(summary, 'route-pattern', [
    ['parameterNames', parameterName],
  ]);
}

export function routeEndpointParameterEffect(
  summary: string,
  parameterName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'route-endpoint', [
    ['parameterNames', parameterName],
  ]);
}

export function routeContextParameterReadEffect(
  summary: string,
  parameterName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'route-context-parameter-read', [
    ['routePathParameterNames', parameterName],
  ]);
}

export function routeRecognizedParameterValueEffect(
  summary: string,
  parameterName: string,
  parameterValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'recognized-route', [
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
  return routeProductSignatureFact(summary, 'recognized-route', [
    ['parameterNames', parameterName],
  ]);
}

export function viewportInstructionTreeQueryParamEffect(
  summary: string,
  queryName: string,
  queryValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'viewport-instruction-tree', [
    ['queryParamPairs', `${queryName}=${queryValue}`],
  ]);
}

export function viewportInstructionTreeFragmentEffect(
  summary: string,
  fragment: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'viewport-instruction-tree', [
    ['fragment', fragment],
  ]);
}

export function routeConfigViewportEffect(
  summary: string,
  viewportName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'route-config', [
    ['viewport', viewportName],
  ]);
}

export function routerViewportNameEffect(
  summary: string,
  viewportName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'router-viewport', [
    ['name', viewportName],
  ]);
}

export function routeNodeParameterValueEffect(
  summary: string,
  parameterName: string,
  parameterValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'route-node', [
    ['parameterValuePairs', `${parameterName}=${parameterValue}`],
  ]);
}

export function routeNodeChildFirstParameterValueEffect(
  summary: string,
  parameterName: string,
  parameterValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'route-node', [
    ['childFirstParameterValuePairs', `${parameterName}=${parameterValue}`],
  ]);
}

export function routeNodeChildFirstQueryValueEffect(
  summary: string,
  queryName: string,
  queryValue: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'route-node', [
    ['childFirstParameterAndQueryValuePairs', `${queryName}=${queryValue}`],
  ]);
}

export function routeNodeViewportEffect(
  summary: string,
  viewportName: string,
): ExpectedSemanticEffect {
  return routeProductSignatureFact(summary, 'route-node', [
    ['viewport', viewportName],
  ]);
}

export function navigationOwnershipTasteEffects(
  summaryPrefix: string,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.discriminatorTaste(`${summaryPrefix} should recognize static route config.`, 'navigation-ownership', 'static-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste(`${summaryPrefix} should recognize decorator route config.`, 'navigation-ownership', 'decorator-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste(`${summaryPrefix} should recognize child routes property config.`, 'navigation-ownership', 'child-routes-property-route-config', 'route'),
    ExpectedSemanticEffect.signatureTaste(`${summaryPrefix} should recognize viewport layout navigation.`, 'navigation-ownership', 'viewport-layout-navigation', 'route'),
  ];
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
    'route',
    'route',
    'route',
    'present',
    null,
    expectedSemanticEffectFilters(...entries),
  );
}
