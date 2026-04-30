import {
  ControllerReference,
  ControllerVmKind,
  CustomAttributeController,
  HydratableController,
  type ControllerField,
  type ControllerProduct,
} from '../configuration/controller.js';
import type { BindingScopeReference } from '../configuration/scope.js';
import type { ContainerReference } from '../di/container.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  compactFieldProvenance,
  FieldProvenance,
} from '../kernel/provenance.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { RuntimeBinding } from './runtime-binding.js';

export const enum RuntimeControllerCreationKind {
  RootCustomElement = 'root-custom-element',
  CustomElement = 'custom-element',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
}

export type RuntimeControllerInstruction =
  | HydrateElementInstruction
  | HydrateAttributeInstruction
  | HydrateTemplateControllerInstruction;

export class RuntimeControllerCreationInput {
  constructor(
    readonly local: string,
    readonly creationKind: RuntimeControllerCreationKind,
    readonly instruction: RuntimeControllerInstruction | null,
    readonly parent: RuntimeControllerFrame | null,
  ) {}
}

/**
 * Mutable render-time controller frame.
 *
 * The runtime mutates Controller.bindings and Controller.children during Rendering.render. This frame is the tooling
 * equivalent of that in-progress controller state; the materializer freezes it into a controller product after the
 * renderer pass has spent the instruction sequence.
 */
export class RuntimeControllerFrame {
  private readonly bindings: RuntimeBinding[] = [];
  private readonly children: RuntimeControllerFrame[] = [];
  private scope: BindingScopeReference | null = null;

  constructor(
    readonly creationKind: RuntimeControllerCreationKind,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly definitionProductHandle: ProductHandle | null,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly parent: RuntimeControllerFrame | null,
    readonly instructionProductHandle: ProductHandle | null,
    readonly instructionIdentityHandle: IdentityHandle | null,
    readonly strict: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}

  addBinding(binding: RuntimeBinding): void {
    this.bindings.push(binding);
  }

  addChild(child: RuntimeControllerFrame): void {
    this.children.push(child);
  }

  attachScope(scope: BindingScopeReference): void {
    this.scope = scope;
  }

  readBindings(): readonly RuntimeBinding[] {
    return [...this.bindings];
  }

  readChildren(): readonly RuntimeControllerFrame[] {
    return [...this.children];
  }

  readBindingProductHandles(): readonly ProductHandle[] | null {
    return this.bindings.length === 0
      ? null
      : this.bindings.map((binding) => binding.productHandle);
  }

  readChildReferences(): readonly ControllerReference[] {
    return this.children.map((child) => child.toReference());
  }

  readScopeReference(): BindingScopeReference | null {
    return this.scope;
  }

  toReference(): ControllerReference {
    return new ControllerReference(
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
      this.name,
    );
  }

  toControllerProduct(): ControllerProduct {
    const parent = this.parent?.toReference() ?? null;
    if (this.creationKind === RuntimeControllerCreationKind.CustomAttribute
      || this.creationKind === RuntimeControllerCreationKind.TemplateController) {
      return new CustomAttributeController(
        this.productHandle,
        this.identityHandle,
        this.name,
        this.container,
        this.definitionProductHandle,
        this.viewModel,
        this.hostAddressHandle,
        this.scope,
        parent,
        this.sourceAddressHandle,
        this.fieldProvenance([
          'container',
          'vmKind',
          this.definitionProductHandle == null ? null : 'definition',
          this.viewModel == null ? null : 'viewModel',
          this.hostAddressHandle == null ? null : 'host',
          this.scope == null ? null : 'scope',
          parent == null ? null : 'parent',
          'source',
        ]),
      );
    }

    return new HydratableController(
      this.productHandle,
      this.identityHandle,
      this.name,
      this.container,
      ControllerVmKind.CustomElement,
      this.definitionProductHandle,
      this.hostAddressHandle,
      this.scope,
      parent,
      this.readChildReferences(),
      this.readBindingProductHandles(),
      this.strict,
      this.sourceAddressHandle,
      this.fieldProvenance([
        'container',
        'vmKind',
        this.definitionProductHandle == null ? null : 'definition',
        this.hostAddressHandle == null ? null : 'host',
        this.scope == null ? null : 'scope',
        parent == null ? null : 'parent',
        this.children.length === 0 ? null : 'children',
        this.bindings.length === 0 ? null : 'bindings',
        'source',
      ]),
    );
  }

  private fieldProvenance(fields: readonly (ControllerField | null)[]): readonly FieldProvenance<ControllerField>[] {
    return compactFieldProvenance(fields.map((field) =>
      field == null ? null : new FieldProvenance(field, this.provenanceHandle)
    ));
  }
}

export function runtimeControllerCreationKindForInstruction(
  instruction: TemplateInstruction,
): RuntimeControllerCreationKind | null {
  if (instruction instanceof HydrateElementInstruction) {
    return RuntimeControllerCreationKind.CustomElement;
  }
  if (instruction instanceof HydrateTemplateControllerInstruction) {
    return RuntimeControllerCreationKind.TemplateController;
  }
  if (instruction instanceof HydrateAttributeInstruction) {
    return RuntimeControllerCreationKind.CustomAttribute;
  }
  return null;
}
