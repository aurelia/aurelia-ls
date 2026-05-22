import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  RouteContextParameterReadModel,
  RouteConfigModel,
} from './model.js';

/** Typed detail slots for router products consumed by inquiry and API layers. */
export const RouterProductDetails = {
  RouteConfig: defineProductDetailSlot<RouteConfigModel>(
    KernelVocabulary.Router.RouteConfig.key,
    'router.route-config',
    'Router RouteConfig detail with configured id, paths, component, redirect, viewport, and child route references.',
  ),
  RouteContextParameterRead: defineProductDetailSlot<RouteContextParameterReadModel>(
    KernelVocabulary.Router.RouteContextParameterRead.key,
    'router.route-context-parameter-read',
    'RouteContext.getRouteParameters(...) detail with declared key shape and route path parameter alignment.',
  ),
} as const;
