import type { RuntimeRendererRegistryEntry } from './renderers.js';

export const RENDERING_OPERATION_KINDS = [
  'compile',
  'get-view-factory',
  'create-nodes',
  'adopt-nodes',
  'render',
] as const;

export type RenderingOperationKind = typeof RENDERING_OPERATION_KINDS[number];
export class Rendering {
  readonly kind = 'rendering-service' as const;

  constructor(
    readonly operations: readonly RenderingOperationKind[] = RENDERING_OPERATION_KINDS,
    readonly renderers: readonly RuntimeRendererRegistryEntry[] = [],
    readonly cachesCompiledDefinitions: boolean = true,
    readonly cachesFragments: boolean = true,
  ) {}
}
