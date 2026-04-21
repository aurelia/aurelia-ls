import type { CompiledTemplateRef } from '../refs.js';
import type { TemplateControllerDefinition } from '../resources/index.js';
import type {
  CompilerAuthoredAttribute,
  CompilerElementAttributeClassification,
} from './attribute-classification.js';
import type { AuthoredElementNode, AuthoredTemplate, AuthoredTextNode } from './authored-template.js';
import type {
  CompilerAttributeBindableAssignment,
  CompilerAttributeBindingLowering,
} from './custom-attribute-binding-lowering.js';
import type { CompilerResourceAdmissionProvenance } from './compiler-consulted-world.js';
import type { TemplateNodeRef } from '../refs.js';

export const COMPILED_TEMPLATE_OPEN_SEAM_KINDS = [
  'text-interpolation-open',
  'element-direct-lowering-open',
  'template-controller-family-profile-open',
  'projection-extraction-open',
  'process-content-open',
  'local-template-branch-open',
  'template-node-kind-open',
  'plain-attribute-lowering-open',
] as const;

export type CompiledTemplateOpenSeamKind =
  typeof COMPILED_TEMPLATE_OPEN_SEAM_KINDS[number];

export class CompiledTemplateOpenSeam {
  constructor(
    readonly kind: CompiledTemplateOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export const COMPILER_ANONYMOUS_ELEMENT_TEMPLATE_KINDS = [
  'wrapped-authored-element',
  'authored-template-element',
  'marker-only-wrapper',
] as const;

export type CompilerAnonymousElementTemplateKind =
  typeof COMPILER_ANONYMOUS_ELEMENT_TEMPLATE_KINDS[number];

export class CompilerElementStructuralCarrier {
  constructor(
    readonly authored: AuthoredElementNode,
    readonly classification: CompilerElementAttributeClassification,
    readonly customAttributeBindings: readonly CompilerAttributeBindingLowering[] = [],
    readonly projectionExtraction: CompilerProjectionExtraction | null = null,
    readonly childCompilations: readonly CompiledTemplateNode[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompilerProjectionSlot {
  constructor(
    readonly slotName: string,
    readonly targetSource: TemplateNodeRef | null,
    readonly targetElementSource: TemplateNodeRef | null,
    readonly targetNodes: readonly CompiledTemplateNode[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompilerProjectionExtraction {
  constructor(
    readonly projectedSlots: readonly CompilerProjectionSlot[] = [],
    readonly note: string | null = null,
  ) {}

  readProjectedSlotNames(): readonly string[] {
    return this.projectedSlots.map((current) => current.slotName);
  }

  findSlot(
    slotName: string,
  ): CompilerProjectionSlot | null {
    return this.projectedSlots.find((current) => current.slotName === slotName) ?? null;
  }
}

export class CompilerAnonymousElementDefinition {
  constructor(
    readonly name: string,
    readonly templateKind: CompilerAnonymousElementTemplateKind,
    readonly wrappedElement: AuthoredElementNode | null = null,
    readonly structuralCarrier: CompilerElementStructuralCarrier | null = null,
    readonly body: readonly CompiledTemplateNode[] = [],
    readonly nestedInstructions: readonly CompilerHydrateTemplateControllerInstruction[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompilerHydrateTemplateControllerInstruction {
  readonly kind = 'hydrate-template-controller' as const;

  constructor(
    readonly authoredAttribute: CompilerAuthoredAttribute,
    readonly resource: TemplateControllerDefinition,
    readonly props: readonly CompilerAttributeBindableAssignment[] = [],
    readonly definition: CompilerAnonymousElementDefinition,
    readonly admission: CompilerResourceAdmissionProvenance | null = null,
    readonly note: string | null = null,
  ) {}
}

export class TemplateControllerStructuralLowering {
  constructor(
    readonly sourceOrderedInstructions: readonly CompilerHydrateTemplateControllerInstruction[],
    readonly outermostInstruction: CompilerHydrateTemplateControllerInstruction,
    readonly innermostDefinition: CompilerAnonymousElementDefinition,
    readonly openSeams: readonly CompiledTemplateOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompiledTextNode {
  readonly kind = 'text' as const;

  constructor(
    readonly authored: AuthoredTextNode,
    readonly interpolationDetected: boolean = false,
    readonly openSeams: readonly CompiledTemplateOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompiledElementNode {
  readonly kind = 'element' as const;

  constructor(
    readonly authored: AuthoredElementNode,
    readonly structuralCarrier: CompilerElementStructuralCarrier,
    readonly templateControllerLowering: TemplateControllerStructuralLowering | null = null,
    readonly openSeams: readonly CompiledTemplateOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export type CompiledTemplateNode =
  | CompiledElementNode
  | CompiledTextNode;

export class CompiledTemplate {
  constructor(
    readonly ref: CompiledTemplateRef,
    readonly authored: AuthoredTemplate,
    readonly rootNodes: readonly CompiledTemplateNode[] = [],
    readonly openSeams: readonly CompiledTemplateOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

// NOTE: runtime JIT compilation ultimately publishes instruction rows plus
// nested anonymous element definitions. The tool keeps a richer compiled
// template carrier because provenance, partial closure, and future invalidation
// need more intermediate structure than runtime keeps alive.
