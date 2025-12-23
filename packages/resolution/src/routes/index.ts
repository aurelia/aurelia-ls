export type {
  ExtractedRouteConfig,
  ExtractedChildRoute,
  ComponentRef,
  RouteTree,
  RouteNode,
  RouteSource,
  ParameterizedRoute,
  DynamicRouteComponent,
} from "./types.js";

export {
  extractRouteConfig,
  extractFromDecorator,
  extractFromStaticProperty,
  extractComponentRef,
  extractPathParams,
  hasGetRouteConfigMethod,
} from "./extract.js";
