import type { RuntimeRendererRegistryEntry } from './renderers.js';
import { auLink } from '../au-link.js';

export const RENDERING_OPERATION_KINDS = [
  'compile',
  'get-view-factory',
  'create-nodes',
  'adopt-nodes',
  'render',
] as const;

export type RenderingOperationKind = typeof RENDERING_OPERATION_KINDS[number];

@auLink('runtime-html:Rendering')
export class Rendering {
  readonly kind = 'rendering-service' as const;

  constructor(
    readonly operations: readonly RenderingOperationKind[] = RENDERING_OPERATION_KINDS,
    readonly renderers: readonly RuntimeRendererRegistryEntry[] = [],
    readonly cachesCompiledDefinitions: boolean = true,
    readonly cachesFragments: boolean = true,
  ) {}
}
