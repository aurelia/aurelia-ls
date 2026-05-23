import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from '../di/container-reference.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import {
  BindingContextKind,
  type BindingContextSlotDraft,
  BindingScopeConstructionRequest,
  BindingScopeOwnerKind,
  type BindingScope,
  type BindingScopeReference,
} from './scope.js';

export const enum ControllerVmKind {
  CustomElement = 'customElement',
  CustomAttribute = 'customAttribute',
  Synthetic = 'synthetic',
}

export const enum ControllerPhase {
  Base = 'base',
  Component = 'component',
  Hydratable = 'hydratable',
  SyntheticView = 'synthetic-view',
  CustomAttribute = 'custom-attribute',
  DryCustomElement = 'dry-custom-element',
  ContextualCustomElement = 'contextual-custom-element',
  CompiledCustomElement = 'compiled-custom-element',
  HydratedCustomElement = 'hydrated-custom-element',
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
  | 'location'
  | 'nodes'
  | 'shadowRoot'
  | 'hydrationInstruction'
  | 'instructionSequence'
  | 'source';

export type ViewFactoryField =
  | 'container'
  | 'definition'
  | 'instruction'
  | 'instructionSequence'
  | 'parent'
  | 'source';

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

/** Base controller shape common to every runtime controller kind and state. */
@auLink('runtime-html:IController')
export class Controller {
  readonly phase = ControllerPhase.Base;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly vmKind: ControllerVmKind,
    readonly definitionProductHandle: ProductHandle | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference | null,
    readonly parent: ControllerReference | null,
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Controller shape that owns a view-model instance and a resource definition. */
@auLink('runtime-html:IComponentController')
export class ComponentController {
  readonly phase = ControllerPhase.Component;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly vmKind: ControllerVmKind.CustomElement | ControllerVmKind.CustomAttribute,
    readonly definitionProductHandle: ProductHandle,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference | null,
    readonly parent: ControllerReference | null,
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Hydratable controller shape that can own children and mountable DOM nodes. */
@auLink('runtime-html:IHydratableController')
export class HydratableController {
  readonly phase = ControllerPhase.Hydratable;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly vmKind: ControllerVmKind.CustomElement | ControllerVmKind.Synthetic,
    readonly definitionProductHandle: ProductHandle | null,
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

/** Runtime IViewFactory shape injected into template-controller view models. */
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
    /** Custom-element definition product backing the factory, when the embedded definition is materialized. */
    readonly definitionProductHandle: ProductHandle | null,
    /** Template-controller instruction that caused this factory to exist. */
    readonly instructionProductHandle: ProductHandle | null,
    /** Nested instruction sequence used when the factory creates a synthetic view. */
    readonly instructionSequenceProductHandle: ProductHandle,
    /** Template-controller controller that receives the factory. */
    readonly parent: ControllerReference | null,
    /** Source address for the template-controller instruction. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ViewFactoryField>[] = [],
  ) {}
}

/** Synthetic-view controller produced by template controllers and view factories. */
@auLink('runtime-html:ISyntheticView')
export class SyntheticViewController {
  readonly phase = ControllerPhase.SyntheticView;
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
    readonly instructionSequenceProductHandle: ProductHandle | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly locationAddressHandle: AddressHandle | null,
    readonly shadowRootAddressHandle: AddressHandle | null,
    readonly nodeSequenceProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  /** Runtime synthetic-view scope shape produced by template-controller/view-factory activation. */
  static createBindingScopeInput(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly parent: BindingScope;
    readonly sourceAddressHandle: AddressHandle | null;
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      BindingScopeOwnerKind.SyntheticView,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.parent,
      BindingContextKind.Synthetic,
      null,
      [],
      null,
      [],
      false,
      input.sourceAddressHandle,
    );
  }

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Custom-attribute controller shape after attribute controller creation. */
@auLink('runtime-html:ICustomAttributeController')
export class CustomAttributeController {
  readonly phase = ControllerPhase.CustomAttribute;
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

/** Custom-element controller after `Controller.$el(...)` has created definition/host/scope state. */
@auLink('runtime-html:IDryCustomElementController')
export class DryCustomElementController {
  readonly phase = ControllerPhase.DryCustomElement;
  readonly vmKind = ControllerVmKind.CustomElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly definitionProductHandle: ProductHandle,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference,
    readonly parent: ControllerReference | null,
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly strict: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  /** Runtime custom-element scope shape produced during `Controller.$el(...)` hydration. */
  static createBindingScopeInput(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly parent: BindingScope | null;
    readonly viewModelType: CheckerTypeReference | null;
    readonly bindingContextSlots?: readonly BindingContextSlotDraft[];
    readonly sourceAddressHandle: AddressHandle | null;
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      BindingScopeOwnerKind.CustomElementController,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.parent,
      BindingContextKind.ViewModel,
      input.viewModelType,
      input.bindingContextSlots ?? [],
      null,
      [],
      true,
      input.sourceAddressHandle,
    );
  }

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Custom-element controller with render context available before compiled DOM state is finalized. */
@auLink('runtime-html:IContextualCustomElementController')
export class ContextualCustomElementController {
  readonly phase = ControllerPhase.ContextualCustomElement;
  readonly vmKind = ControllerVmKind.CustomElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly definitionProductHandle: ProductHandle,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference,
    readonly parent: ControllerReference | null,
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Custom-element controller after compiled DOM/controller state such as nodes and render location exists. */
@auLink('runtime-html:ICompiledCustomElementController')
export class CompiledCustomElementController {
  readonly phase = ControllerPhase.CompiledCustomElement;
  readonly vmKind = ControllerVmKind.CustomElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly definitionProductHandle: ProductHandle,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference,
    readonly parent: ControllerReference | null,
    readonly locationAddressHandle: AddressHandle | null,
    readonly shadowRootAddressHandle: AddressHandle | null,
    readonly nodeSequenceProductHandle: ProductHandle | null,
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

/** Fully hydrated custom-element controller that can participate in activation/deactivation answers. */
@auLink('runtime-html:ICustomElementController')
export class CustomElementController {
  readonly phase = ControllerPhase.HydratedCustomElement;
  readonly vmKind = ControllerVmKind.CustomElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly definitionProductHandle: ProductHandle,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly scope: BindingScopeReference,
    readonly parent: ControllerReference | null,
    readonly lifecycleHooksProductHandle: ProductHandle | null,
    readonly bindingProductHandles: readonly ProductHandle[] | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ControllerField>[] = [],
  ) {}

  toReference(): ControllerReference {
    return new ControllerReference(this.identityHandle, this.productHandle, this.sourceAddressHandle, this.name);
  }
}

export type ControllerProduct =
  | Controller
  | ComponentController
  | HydratableController
  | SyntheticViewController
  | CustomAttributeController
  | DryCustomElementController
  | ContextualCustomElementController
  | CompiledCustomElementController
  | CustomElementController;
