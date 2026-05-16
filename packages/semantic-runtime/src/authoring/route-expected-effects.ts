import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
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
    [new ExpectedSemanticEffectFilter('routeProductKind', routeProductKind)],
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
