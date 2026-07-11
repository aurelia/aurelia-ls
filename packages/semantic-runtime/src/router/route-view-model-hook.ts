import type { CheckerTypeShape } from '../type-system/type-shape.js';
import {
  frameworkDeclarationSourceSpec,
  typeOrHeritageMatchesFrameworkDeclarationSource,
} from '../type-system/framework-declaration-source.js';

export const enum RouterViewModelHookKind {
  Configuration = 'configuration',
  Lifecycle = 'lifecycle',
}

const ROUTE_VIEW_MODEL_DECLARATIONS = frameworkDeclarationSourceSpec(
  new Set(['IRouteViewModel']),
  ['@aurelia/router'],
  ['/aurelia/packages/router/'],
);

const NO_SOURCE_PATH_ALIASES = new Map<string, string>();

/** Classify the hooks Aurelia discovers directly on a routed component instance. */
export function routerViewModelHookKindForName(
  name: string,
): RouterViewModelHookKind | null {
  switch (name) {
    case 'getRouteConfig':
      return RouterViewModelHookKind.Configuration;
    case 'canLoad':
    case 'loading':
    case 'loaded':
    case 'canUnload':
    case 'unloading':
      return RouterViewModelHookKind.Lifecycle;
    default:
      return null;
  }
}

/** Whether the checker owner explicitly declares IRouteViewModel, directly or through heritage. */
export function checkerTypeDeclaresRouteViewModel(
  typeShape: CheckerTypeShape | null,
): boolean {
  const carrier = typeShape?.carrier;
  return carrier != null && typeOrHeritageMatchesFrameworkDeclarationSource(
    carrier.type,
    carrier.checker,
    NO_SOURCE_PATH_ALIASES,
    ROUTE_VIEW_MODEL_DECLARATIONS,
  );
}
