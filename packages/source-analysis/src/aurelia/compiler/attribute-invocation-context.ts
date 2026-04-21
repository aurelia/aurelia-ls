import type {
  CustomAttributeDefinition,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type { CompilerConsultedWorld } from './compiler-consulted-world.js';
import type { CompilerChildWorldFormation } from './child-world-formation.js';
import type { Controller, RenderLocation } from './controller.js';
import type { CompilerHydrateTemplateControllerInstruction } from './compiled-template.js';
import type { ViewFactory } from './view-factory.js';

export const ATTRIBUTE_INVOCATION_CONTEXT_OPEN_SEAM_KINDS = [
  'published-di-surface-open',
  'attribute-dependencies-open',
] as const;

export type AttributeInvocationContextOpenSeamKind =
  typeof ATTRIBUTE_INVOCATION_CONTEXT_OPEN_SEAM_KINDS[number];

export class AttributeInvocationContextOpenSeam {
  constructor(
    readonly kind: AttributeInvocationContextOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class AttributeInvocationContext {
  constructor(
    readonly resource: CustomAttributeDefinition | TemplateControllerDefinition,
    readonly parentController: Controller,
    readonly world: CompilerConsultedWorld,
    readonly worldFormation: CompilerChildWorldFormation,
    readonly instruction: CompilerHydrateTemplateControllerInstruction | null = null,
    readonly renderLocation: RenderLocation | null = null,
    readonly viewFactory: ViewFactory | null = null,
    readonly openSeams: readonly AttributeInvocationContextOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}
