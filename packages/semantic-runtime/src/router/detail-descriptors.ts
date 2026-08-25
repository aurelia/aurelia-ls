import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  EndpointModel,
  RouteConfigContributionModel,
  RouteConfigModel,
  RouteContextParameterReadModel,
  RouterOptionsModel,
  ViewportCustomElementModel,
} from './model.js';

/** Inert identities for rich router occupancies, safe to import without projector execution. */
export const RouterDetailDescriptors = {
  RouterOptions: defineProductDetailDescriptor<RouterOptionsModel>(
    KernelVocabulary.Router.Options.key,
    'router.router-options',
    'Effective RouterOptions with explicit default/configured field state, exact winning contributions, and rooted registration ownership.',
  ),
  Viewport: defineProductDetailDescriptor<ViewportCustomElementModel>(
    KernelVocabulary.Router.Viewport.key,
    'router.viewport',
    'Potential au-viewport with exact authored bindable-value lineage and static field closure.',
  ),
  RouteConfigContribution: defineProductDetailDescriptor<RouteConfigContributionModel>(
    KernelVocabulary.Router.RouteConfigContribution.key,
    'router.route-config-contribution',
    'Source-backed RouteConfig contribution with authoring form, execution evidence, field state, and exact provenance.',
  ),
  RouteConfig: defineProductDetailDescriptor<RouteConfigModel>(
    KernelVocabulary.Router.RouteConfig.key,
    'router.route-config',
    'Effective RouteConfig definition or applied child use with configured fields, closure, and child route references.',
  ),
  Endpoint: defineProductDetailDescriptor<EndpointModel>(
    KernelVocabulary.RouteRecognizer.Endpoint.key,
    'router.endpoint',
    'Route-recognizer endpoint with its configurable route, authored parameter requirements, and residual relationship.',
  ),
  RouteContextParameterRead: defineProductDetailDescriptor<RouteContextParameterReadModel>(
    KernelVocabulary.Router.RouteContextParameterRead.key,
    'router.route-context-parameter-read',
    'RouteContext.getRouteParameters(...) detail with per-owner route identity, ownership cardinality, declared key shape, and route path parameter alignment.',
  ),
} as const;
