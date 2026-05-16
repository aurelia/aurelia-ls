import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  expectedSemanticRouteFactRowsFor,
} from '../authoring/effect-observation.js';
import type { KernelStore } from '../kernel/store.js';
import type { SemanticApplicationTopologyResult } from './app-topology.js';
import {
  semanticRouteQueryDescriptors,
  type SemanticRouteEffectQueryKind,
} from './route-query-registry.js';

export const semanticRouteEffectQueryKinds: readonly SemanticRouteEffectQueryKind[] =
  semanticRouteQueryDescriptors.map(({ queryKind, routeProductKind }) => ({
    queryKind,
    routeProductKind,
  }));

export function readSemanticRouteEffectFactRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  topology: SemanticApplicationTopologyResult,
): readonly object[] {
  return [
    ...expectedSemanticRouteFactRowsFor('topology-route', topology.routes),
    ...semanticRouteQueryDescriptors.flatMap((reader) =>
      expectedSemanticRouteFactRowsFor(
        reader.routeProductKind,
        reader.readRows(emission, store, false),
      )
    ),
  ];
}
