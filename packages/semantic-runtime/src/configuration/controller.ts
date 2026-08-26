import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from '../di/container-reference.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import type { BindingScopeReference } from './scope.js';

export const enum ControllerVmKind {
  CustomElement = 'customElement',
  CustomAttribute = 'customAttribute',
  Synthetic = 'synthetic',
}

export type ControllerField =
  | 'container'
  | 'vmKind'
  | 'definition'
  | 'viewModel'
  | 'host'
  | 'scope'
  | 'parent'
  | 'children'
  | 'bindings'
  | 'viewFactory'
  | 'compiledTemplate'
  | 'location'
  | 'nodes'
  | 'shadowRoot'
  | 'source';

export type ViewFactoryField =
  | 'container'
  | 'compiledTemplate'
  | 'instruction'
  | 'parent'
  | 'source';

export const enum AuSlotsInfoSourceKind {
  /** Framework's shared prepared empty value used when no projection map was supplied. */
  IntrinsicEmpty = 'intrinsic-empty',
  /** Per-instruction value created from one hydrate-element projection map. */
  HydrateElementInstruction = 'hydrate-element-instruction',
}

/** Reference to a modeled controller without retaining the runtime Controller instance. */
export class ControllerReference {
  constructor(
    /** Identity for this modeled controller, when construction has closed. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for the materialized controller, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the expression or template node that created or mentioned the controller. */
    readonly addressHandle: AddressHandle | null,
    /** Local source name used only for traces while identity is still open. */
    readonly localName: string | null,
  ) {}
}

/** Final static product for a custom-element controller assembled by runtime analysis. */
@auLink('runtime-html:ICustomElementController')
@auLink('runtime-html:IHydratableController')
export class CustomElementController {
  readonly vmKind = ControllerVmKind.CustomElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly definitionProductHandle: ProductHandle | null,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference | null,
    readonly parent: ControllerReference | null,
    readonly children: readonly ControllerReference[],
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly strict: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Runtime IViewFactory shape owned by a controller that can instantiate an embedded view. */
@auLink('runtime-html:IViewFactory')
export class ViewFactory {
  constructor(
    /** Product handle for the materialized view factory product. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled view factory. */
    readonly identityHandle: IdentityHandle,
    /** Trace name of the embedded view factory. */
    readonly name: string | null,
    /** Container that owns the view factory and compiles the nested view. */
    readonly container: ContainerReference,
    /** Compiler-owned generated definition instantiated by this factory. */
    readonly compiledTemplateProductHandle: ProductHandle,
    /** Controller instruction that caused this factory to exist. */
    readonly instructionProductHandle: ProductHandle | null,
    /** Controller that receives or owns the factory. */
    readonly parent: ControllerReference | null,
    /** Source address for the owning controller instruction. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ViewFactoryField>[] = [],
  ) {}
}

/** One exact provider-side projection group retained by a runtime IAuSlotsInfo value. */
export class AuSlotsInfoProjection {
  constructor(
    readonly slotName: string,
    readonly compiledTemplateProductHandle: ProductHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly contributorSourceAddressHandles: readonly (AddressHandle | null)[],
  ) {}
}

/** Runtime IAuSlotsInfo value installed before a renderer-created view model is constructed. */
@auLink('runtime-html:IAuSlotsInfo')
export class AuSlotsInfo {
  constructor(
    /** Product handle for this runtime slots-info value. */
    readonly productHandle: ProductHandle,
    /** Identity for this runtime slots-info value. */
    readonly identityHandle: IdentityHandle,
    /** Whether this is the intrinsic empty provider value or an instruction-created projection value. */
    readonly sourceKind: AuSlotsInfoSourceKind,
    /** Unique provider-authored slot names retained in compiler projection-map order. */
    readonly projectedSlots: readonly string[],
    /** Exact grouped compiler projections behind the runtime name list. */
    readonly projections: readonly AuSlotsInfoProjection[],
    /** Source address for the custom-element use, or null for the intrinsic empty value. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/**
 * Runtime IHydrationContext value installed by Controller.$el after view-model construction.
 *
 * This intentionally stops at the synchronous controller/instruction/parent carrier. It does not model controller
 * activation or async lifecycle execution.
 */
@auLink('runtime-html:IHydrationContext')
export class RuntimeHydrationContext {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly controller: ControllerReference,
    readonly instructionProductHandle: ProductHandle | null,
    readonly parent: RuntimeHydrationContext | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Synthetic-view controller produced by a runtime view factory. */
@auLink('runtime-html:ISyntheticView')
export class SyntheticViewController {
  readonly vmKind = ControllerVmKind.Synthetic;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly parent: ControllerReference | null,
    readonly children: readonly ControllerReference[],
    readonly scope: BindingScopeReference | null,
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly viewFactoryProductHandle: ProductHandle | null,
    readonly compiledTemplateProductHandle: ProductHandle | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly locationAddressHandle: AddressHandle | null,
    readonly shadowRootAddressHandle: AddressHandle | null,
    readonly nodeSequenceProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Custom-attribute controller shape after attribute controller creation. */
@auLink('runtime-html:ICustomAttributeController')
export class CustomAttributeController {
  readonly vmKind = ControllerVmKind.CustomAttribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly definitionProductHandle: ProductHandle | null,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference | null,
    readonly parent: ControllerReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

export type ControllerProduct =
  | CustomElementController
  | SyntheticViewController
  | CustomAttributeController;
