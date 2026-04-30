import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { HtmlNodeReference } from './html-ir.js';
import type { TemplateInstructionSequence } from './instruction-ir.js';

export const enum CompiledTemplateState {
  /** Compiler pass-through and instruction row assembly closed over the current substrate. */
  Complete = 'complete',
  /** Useful compiler products were emitted while some runtime compiler semantics stayed visible as seams. */
  Partial = 'partial',
  /** The template carrier or compiler context was too open to assemble rows. */
  Open = 'open',
}

export const enum TemplateRenderTargetKind {
  /** Normal target collected from an `<!--au-->` marker before an element or text node. */
  MarkerTarget = 'marker-target',
  /** Containerless or template-controller target represented by an `<!--au--><!--au-start--><!--au-end-->` region. */
  RenderLocation = 'render-location',
  /** Host/template surrogate target. */
  Surrogate = 'surrogate',
  /** Target shape is known to exist but not yet modeled. */
  Open = 'open',
}

export type CompiledTemplateField =
  | 'htmlDocument'
  | 'state'
  | 'targets'
  | 'surrogates'
  | 'source';

export type TemplateRenderTargetField =
  | 'targetKind'
  | 'htmlNode'
  | 'instructionSequence'
  | 'source';

/**
 * Runtime render target produced by the compiler's marker/target pass.
 *
 * This is the product-side counterpart of the runtime's `FragmentNodeSequence` target list: it does not retain DOM
 * nodes, but it preserves the authored node and instruction row that Rendering will later spend together.
 */
export class TemplateRenderTarget {
  constructor(
    /** Product handle for the materialized-product envelope that represents this target. */
    readonly productHandle: ProductHandle,
    /** Identity for this render target. */
    readonly identityHandle: IdentityHandle,
    /** Runtime target lane represented by the compiler marker shape. */
    readonly targetKind: TemplateRenderTargetKind,
    /** Authored HTML node that became the target, when the target is source-backed. */
    readonly htmlNode: HtmlNodeReference | null,
    /** Instruction sequence spent against this target. */
    readonly instructionSequenceProductHandle: ProductHandle,
    /** Source address for the authored target site or generated marker. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateRenderTargetField>[] = [],
  ) {}
}

/**
 * Compiled template product at the handoff between compiler evaluation and runtime rendering emulation.
 *
 * The runtime stores this shape inside `CustomElementDefinition.instructions`, `surrogates`, and transformed
 * `template`. The tooling model keeps the same semantic pieces normalized so renderer emulation can consume rows
 * without pretending to hold live DOM nodes.
 */
@auLink('template-compiler:ICompiledElementComponentDefinition')
export class CompiledTemplate {
  constructor(
    /** Product handle for the materialized-product envelope that represents this compiled template. */
    readonly productHandle: ProductHandle,
    /** Identity for this compiled template. */
    readonly identityHandle: IdentityHandle,
    /** Authored HTML document compiled into this product. */
    readonly htmlDocumentProductHandle: ProductHandle,
    /** Compiler closure state for the current substrate. */
    readonly state: CompiledTemplateState,
    /** Runtime render targets in the order Rendering will receive them. */
    readonly targets: readonly TemplateRenderTarget[],
    /** Surrogate/host instruction sequence, when modeled. */
    readonly surrogateSequence: TemplateInstructionSequence | null,
    /** Source address for the template carrier. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<CompiledTemplateField>[] = [],
  ) {}
}
