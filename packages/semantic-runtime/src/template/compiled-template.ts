import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { HtmlNodeReference } from './html-ir.js';
import type { TemplateInstructionSequence } from './instruction-ir.js';
import type { TemplateStructuralTreeReference } from './template-structure.js';

export const enum CompiledTemplateState {
  /** The framework compiler would reject this template before producing a usable compiled definition. */
  Invalid = 'invalid',
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
  | 'context'
  | 'htmlDocument'
  | 'transformedTree'
  | 'state'
  | 'compilerReachableNodes'
  | 'hasSlots'
  | 'nativeSlotOutlets'
  | 'needsCompile'
  | 'targets'
  | 'surrogates'
  | 'source';

/** Stable reference to one root or generated compiled-template product. */
export class CompiledTemplateReference {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

/** Definition role of one compiled template inside a compiler-produced template family. */
export const enum CompiledTemplateContextRole {
  Root = 'root',
  TemplateController = 'template-controller',
  Projection = 'projection',
}

/** Durable role of a root or generated compiled definition. */
export class CompiledTemplateContext {
  constructor(
    readonly role: CompiledTemplateContextRole,
  ) {}
}

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

/** Compiler-reachable native Shadow DOM `<slot>` outlet retained behind the framework `hasSlots` flag. */
export const enum CompiledNativeSlotNameKind {
  /** No authored name target; this is the browser's default slot. */
  Default = 'default',
  /** One authored static name value determines the outlet. */
  Static = 'static',
  /** A binding or interpolation can change the outlet name at runtime. */
  Dynamic = 'dynamic',
}

export class CompiledNativeSlotOutlet {
  constructor(
    /** Authored native slot element. */
    readonly node: HtmlNodeReference,
    /** Whether the name is default, static, or runtime-controlled. */
    readonly nameKind: CompiledNativeSlotNameKind,
    /** Static outlet name, or null when runtime binding controls the name. */
    readonly name: string | null,
    /** Exact authored `name` value span, or null only for the default slot. */
    readonly nameSourceAddressHandle: AddressHandle | null,
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
  /** Effective native `<slot>` presence computed from compiler-reachable outlet facts. */
  get hasSlots(): boolean {
    return this.nativeSlotOutlets.length > 0;
  }

  constructor(
    /** Product handle for the materialized-product envelope that represents this compiled template. */
    readonly productHandle: ProductHandle,
    /** Identity for this compiled template. */
    readonly identityHandle: IdentityHandle,
    /** Root/generated definition ownership inside this compiled template family. */
    readonly context: CompiledTemplateContext,
    /** Authored HTML document that supplies this definition's source-backed nodes. */
    readonly htmlDocumentProductHandle: ProductHandle,
    /** Exact compiler-final structural tree consumed by runtime Rendering, when published. */
    readonly transformedTree: TemplateStructuralTreeReference | null,
    /** Compiler closure state for the current substrate. */
    readonly state: CompiledTemplateState,
    /** Authored element/text products reached by the framework compiler's DOM traversal. */
    readonly compilerReachableNodeProductHandles: readonly ProductHandle[],
    /** Compiler-reachable native Shadow DOM slot outlets that justify `hasSlots`. */
    readonly nativeSlotOutlets: readonly CompiledNativeSlotOutlet[],
    /** Framework output invariant when compilation closed; null when no usable output was proved. */
    readonly needsCompile: false | null,
    /** Runtime render targets in the order Rendering will receive them. */
    readonly targets: readonly TemplateRenderTarget[],
    /** Surrogate/host instruction sequence, when modeled. */
    readonly surrogateSequence: TemplateInstructionSequence | null,
    /** Source address for the template carrier. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<CompiledTemplateField>[] = [],
  ) {}

  toReference(): CompiledTemplateReference {
    return new CompiledTemplateReference(
      this.productHandle,
      this.identityHandle,
    );
  }
}
