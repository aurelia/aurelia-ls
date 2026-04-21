import type {
  CustomAttributeDefinition,
  CustomElementDefinition,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type {
  CompiledElementNode,
  CompilerProjectionExtraction,
  CompilerHydrateTemplateControllerInstruction,
} from './compiled-template.js';
import type { CompilerAttributeBindingLowering } from './custom-attribute-binding-lowering.js';

export const PREPARED_RESOURCE_HYDRATION_INSTRUCTION_KINDS = [
  'hydrate-element',
  'hydrate-attribute',
  'hydrate-template-controller',
] as const;

export type PreparedResourceHydrationInstructionKind =
  typeof PREPARED_RESOURCE_HYDRATION_INSTRUCTION_KINDS[number];

export class PreparedHydrateElementInstruction {
  readonly kind = 'hydrate-element' as const;

  constructor(
    readonly hostElement: CompiledElementNode,
    readonly resource: CustomElementDefinition,
    readonly projections: CompilerProjectionExtraction | null = null,
    readonly note: string | null = null,
  ) {}
}

export class PreparedHydrateAttributeInstruction {
  readonly kind = 'hydrate-attribute' as const;

  constructor(
    readonly hostElement: CompiledElementNode,
    readonly resource: CustomAttributeDefinition,
    readonly lowering: CompilerAttributeBindingLowering,
    readonly note: string | null = null,
  ) {}
}

export class PreparedHydrateTemplateControllerInstruction {
  readonly kind = 'hydrate-template-controller' as const;

  constructor(
    readonly hostElement: CompiledElementNode,
    readonly loweredInstruction: CompilerHydrateTemplateControllerInstruction,
    readonly note: string | null = null,
  ) {}

  get resource(): TemplateControllerDefinition {
    return this.loweredInstruction.resource;
  }
}

export const PREPARED_RESOURCE_HYDRATION_BUNDLE_MODE_KINDS = [
  'resource-row',
  'template-controller-row',
] as const;

export type PreparedResourceHydrationBundleModeKind =
  typeof PREPARED_RESOURCE_HYDRATION_BUNDLE_MODE_KINDS[number];

export const PREPARED_RESOURCE_HYDRATION_BUNDLE_OPEN_SEAM_KINDS = [
  'non-resource-instructions-open',
  'nested-resource-row-deferred',
] as const;

export type PreparedResourceHydrationBundleOpenSeamKind =
  typeof PREPARED_RESOURCE_HYDRATION_BUNDLE_OPEN_SEAM_KINDS[number];

export class PreparedResourceHydrationBundleOpenSeam {
  constructor(
    readonly kind: PreparedResourceHydrationBundleOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

// This is not the final runtime instruction-row model.
// It is the first honest spend layer over the structural compiler carrier that
// closes only the resource-hydration subset needed by CE/CA/TC renderers.
// Row/target binding, plain/text instruction rows, and marker placement still
// belong to later compiler/runtime slices.
export class PreparedResourceHydrationBundle {
  constructor(
    readonly hostElement: CompiledElementNode,
    readonly mode: PreparedResourceHydrationBundleModeKind,
    readonly elementInstruction: PreparedHydrateElementInstruction | null = null,
    readonly attributeInstructions: readonly PreparedHydrateAttributeInstruction[] = [],
    readonly templateControllerInstruction: PreparedHydrateTemplateControllerInstruction | null = null,
    readonly openSeams: readonly PreparedResourceHydrationBundleOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}

  hasTemplateControllerCurrentTarget(): boolean {
    return this.templateControllerInstruction != null;
  }
}
