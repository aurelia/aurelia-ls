import type { CustomElementDefinition } from '../resources/index.js';
import type { CompilerConsultedWorld } from './compiler-consulted-world.js';
import type { CompilerChildWorldFormation } from './child-world-formation.js';
import type { Controller, RenderLocation } from './controller.js';
import type { PreparedHydrateElementInstruction } from './prepared-resource-hydration.js';

export const ELEMENT_INVOCATION_CONTEXT_OPEN_SEAM_KINDS = [
  'published-di-surface-open',
  'projection-slots-open',
  'element-dependencies-open',
] as const;

export type ElementInvocationContextOpenSeamKind =
  typeof ELEMENT_INVOCATION_CONTEXT_OPEN_SEAM_KINDS[number];

export class ElementInvocationContextOpenSeam {
  constructor(
    readonly kind: ElementInvocationContextOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class ElementInvocationContext {
  constructor(
    readonly resource: CustomElementDefinition,
    readonly parentController: Controller,
    readonly world: CompilerConsultedWorld,
    readonly worldFormation: CompilerChildWorldFormation,
    readonly instruction: PreparedHydrateElementInstruction,
    readonly renderLocation: RenderLocation | null = null,
    readonly openSeams: readonly ElementInvocationContextOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}
