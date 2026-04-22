import type { CustomElementDefinition } from '../resources/index.js';
import type {
  ContainerStateEntry,
  ContainerStateLookupScope,
  ContainerStateOpenSeam,
} from '../registrations/index.js';
import type { AuSlotsInfo } from './au-slots-info.js';
import type { CompilerConsultedWorld } from './compiler-consulted-world.js';
import type { CompilerChildWorldFormation } from './child-world-formation.js';
import type { Controller, RenderLocation } from './controller.js';
import type { HydrationPublicationContract } from './hydration-publication.js';
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
  lookupScope: ContainerStateLookupScope | null;

  constructor(
    readonly resource: CustomElementDefinition,
    readonly parentController: Controller,
    readonly world: CompilerConsultedWorld,
    readonly worldFormation: CompilerChildWorldFormation,
    readonly instruction: PreparedHydrateElementInstruction,
    readonly auSlotsInfo: AuSlotsInfo | null = null,
    readonly renderLocation: RenderLocation | null = null,
    readonly publicationContract: HydrationPublicationContract | null = null,
    readonly publishedContainerState: readonly ContainerStateEntry[] = [],
    readonly publishedContainerStateOpenSeams: readonly ContainerStateOpenSeam[] = [],
    readonly openSeams: readonly ElementInvocationContextOpenSeam[] = [],
    readonly note: string | null = null,
    lookupScope: ContainerStateLookupScope | null = null,
  ) {
    this.lookupScope = lookupScope;
  }
}
