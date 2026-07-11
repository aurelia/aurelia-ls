import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  EndpointModel,
  RouteContextParameterReadModel,
  RouteConfigContributionModel,
  RouteConfigModel,
} from './model.js';

/** Typed detail slots for router products consumed by inquiry and API layers. */
export const RouterProductDetails = {
  RouteConfigContribution: defineProductDetailSlot<RouteConfigContributionModel>(
    KernelVocabulary.Router.RouteConfigContribution.key,
    'router.route-config-contribution',
    'Source-backed RouteConfig contribution with authoring form, execution evidence, field state, and exact provenance.',
  ),
  RouteConfig: defineProductDetailSlot<RouteConfigModel>(
    KernelVocabulary.Router.RouteConfig.key,
    'router.route-config',
    'Effective RouteConfig definition or applied child use with configured fields, closure, and child route references.',
  ),
  Endpoint: defineProductDetailSlot<EndpointModel>(
    KernelVocabulary.RouteRecognizer.Endpoint.key,
    'router.endpoint',
    'Route-recognizer endpoint with its configurable route, authored parameter requirements, and residual relationship.',
  ),
  RouteContextParameterRead: defineProductDetailSlot<RouteContextParameterReadModel>(
    KernelVocabulary.Router.RouteContextParameterRead.key,
    'router.route-context-parameter-read',
    'RouteContext.getRouteParameters(...) detail with per-owner route identity, ownership cardinality, declared key shape, and route path parameter alignment.',
  ),
} as const;
