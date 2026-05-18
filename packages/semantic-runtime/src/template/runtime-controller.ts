import {
  ControllerReference,
  ControllerVmKind,
  CustomAttributeController,
  HydratableController,
  SyntheticViewController,
  type ControllerProduct,
} from '../configuration/controller.js';
import type { BindingScopeReference } from '../configuration/scope.js';
import type { Container } from '../di/container.js';
import type { ContainerReference } from '../di/container-reference.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import {
  bindRuntimeBinding,
  SpreadBinding,
  type RuntimeBinding,
  type RuntimeBindingBindContribution,
  type RuntimeBindingBindContext,
  type RuntimeBindingSourceOperation,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from './runtime-binding.js';

export const enum RuntimeControllerCreationKind {
  RootCustomElement = 'root-custom-element',
  RoutedCustomElement = 'routed-custom-element',
  CustomElement = 'custom-element',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  SyntheticView = 'synthetic-view',
}

export const enum RuntimeControllerLifecycleStage {
  Creating = 'creating',
  Hydration = 'hydration',
  Rendering = 'rendering',
  BindingAdmission = 'binding-admission',
  ChildAdmission = 'child-admission',
  Scope = 'scope',
  Bind = 'bind',
}

export const enum RuntimeControllerLifecycleStepKind {
  CreateController = 'create-controller',
  CreateChildContainer = 'create-child-container',
  RegisterDependencies = 'register-dependencies',
  AddChild = 'add-child',
  AdmittedToParent = 'admitted-to-parent',
  AddBinding = 'add-binding',
  CreateViewFactory = 'create-view-factory',
  CreateSyntheticView = 'create-synthetic-view',
  RenderInstructions = 'render-instructions',
  RecursiveHydrationBoundary = 'recursive-hydration-boundary',
  AttachScope = 'attach-scope',
  Bind = 'bind',
}

export const enum RuntimeControllerReadinessKind {
  Created = 'created',
  Rendered = 'rendered',
  ScopeReady = 'scope-ready',
  Bound = 'bound',
}

export class RuntimeControllerLifecycleStep {
  constructor(
    readonly order: number,
    readonly stage: RuntimeControllerLifecycleStage,
    readonly stepKind: RuntimeControllerLifecycleStepKind,
    readonly relatedProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly summary: string,
  ) {}
}

export type RuntimeControllerInstruction =
  | HydrateElementInstruction
  | HydrateAttributeInstruction
  | HydrateTemplateControllerInstruction;

export class RuntimeControllerCreationRequest {
  constructor(
    readonly local: string,
    readonly creationKind: RuntimeControllerCreationKind,
    readonly instruction: RuntimeControllerInstruction | null,
    readonly parent: RuntimeControllerFrame | null,
  ) {}
}

export interface RuntimeControllerBindHost {
  inputForBinding(
    controller: RuntimeControllerFrame,
    binding: RuntimeBinding,
    index: number,
  ): RuntimeBindingBindContext | null;
}

export interface RuntimeControllerBindRequest {
  readonly localKey: string;
  readonly host: RuntimeControllerBindHost;
}

export class RuntimeControllerBindContribution {
  constructor(
    readonly binding: RuntimeBinding,
    readonly bindingContribution: RuntimeBindingBindContribution,
  ) {}
}

export class RuntimeControllerBindResult {
  constructor(
    readonly controller: RuntimeControllerFrame,
    readonly bindingContributions: readonly RuntimeControllerBindContribution[],
  ) {}

  readTargetAccesses(): readonly RuntimeBindingTargetAccess[] {
    return this.bindingContributions.flatMap((contribution) =>
      contribution.bindingContribution.targetAccesses
    );
  }

  readTargetOperations(): readonly RuntimeBindingTargetOperation[] {
    return this.bindingContributions.flatMap((contribution) =>
      contribution.bindingContribution.targetOperations
    );
  }

  readSourceOperations(): readonly RuntimeBindingSourceOperation[] {
    return this.bindingContributions.flatMap((contribution) =>
      contribution.bindingContribution.sourceOperations
    );
  }
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
  private readonly lifecycleSteps: RuntimeControllerLifecycleStep[] = [];
  private scope: BindingScopeReference | null = null;

  constructor(
    readonly creationKind: RuntimeControllerCreationKind,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly container: ContainerReference,
    readonly containerFrame: Container | null,
    readonly definitionProductHandle: ProductHandle | null,
    readonly viewModel: ResourceTargetReference | null,
    readonly hostAddressHandle: AddressHandle | null,
    readonly parent: RuntimeControllerFrame | null,
    readonly instructionProductHandle: ProductHandle | null,
    readonly instructionIdentityHandle: IdentityHandle | null,
    readonly strict: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly provenanceHandle: ProvenanceHandle,
    readonly viewFactoryProductHandle: ProductHandle | null = null,
    readonly instructionSequenceProductHandle: ProductHandle | null = null,
    readonly syntheticOwnerInstructionProductHandle: ProductHandle | null = null,
  ) {
    this.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Creating,
      RuntimeControllerLifecycleStepKind.CreateController,
      productHandle,
      sourceAddressHandle,
      `Controller frame created for ${creationKind}.`,
    );
  }

  addBinding(binding: RuntimeBinding): void {
    this.bindings.push(binding);
    this.recordLifecycleStep(
      RuntimeControllerLifecycleStage.BindingAdmission,
      RuntimeControllerLifecycleStepKind.AddBinding,
      binding.productHandle,
      binding.sourceAddressHandle,
      `Controller.addBinding admitted a ${binding.bindingKind} binding.`,
    );
  }

  addChild(child: RuntimeControllerFrame): void {
    this.children.push(child);
    this.recordLifecycleStep(
      RuntimeControllerLifecycleStage.ChildAdmission,
      RuntimeControllerLifecycleStepKind.AddChild,
      child.productHandle,
      child.sourceAddressHandle,
      `Controller.addChild admitted ${child.creationKind}.`,
    );
    child.recordLifecycleStep(
      RuntimeControllerLifecycleStage.ChildAdmission,
      RuntimeControllerLifecycleStepKind.AdmittedToParent,
      this.productHandle,
      child.sourceAddressHandle,
      `Controller was admitted to parent ${this.name ?? this.creationKind}.`,
    );
  }

  bind(input: RuntimeControllerBindRequest): RuntimeControllerBindResult {
    const contributions: RuntimeControllerBindContribution[] = [];
    const bindOne = (binding: RuntimeBinding, index: number): void => {
      const bindInput = input.host.inputForBinding(this, binding, index);
      if (bindInput == null) {
        return;
      }
      contributions.push(new RuntimeControllerBindContribution(
        binding,
        bindRuntimeBinding(binding, bindInput),
      ));
      if (binding instanceof SpreadBinding) {
        binding.readInnerBindings().forEach((innerBinding, innerIndex) => {
          bindOne(innerBinding, innerIndex);
        });
      }
    };
    this.bindings.forEach((binding, index) => bindOne(binding, index));
    this.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Bind,
      RuntimeControllerLifecycleStepKind.Bind,
      this.productHandle,
      this.sourceAddressHandle,
      `Controller.bind processed ${contributions.length} binding contribution(s).`,
    );
    return new RuntimeControllerBindResult(this, contributions);
  }

  attachScope(scope: BindingScopeReference): void {
    this.scope = scope;
    this.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Scope,
      RuntimeControllerLifecycleStepKind.AttachScope,
      scope.productHandle,
      scope.sourceAddressHandle,
      'Controller received its runtime binding Scope.',
    );
  }

  recordLifecycleStep(
    stage: RuntimeControllerLifecycleStage,
    stepKind: RuntimeControllerLifecycleStepKind,
    relatedProductHandle: ProductHandle | null,
    sourceAddressHandle: AddressHandle | null,
    summary: string,
  ): void {
    this.lifecycleSteps.push(new RuntimeControllerLifecycleStep(
      this.lifecycleSteps.length,
      stage,
      stepKind,
      relatedProductHandle,
      sourceAddressHandle,
      summary,
    ));
  }

  recordRecursiveHydrationBoundary(summary: string): void {
    this.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Rendering,
      RuntimeControllerLifecycleStepKind.RecursiveHydrationBoundary,
      this.definitionProductHandle,
      this.sourceAddressHandle,
      summary,
    );
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

  readLifecycleSteps(): readonly RuntimeControllerLifecycleStep[] {
    return [...this.lifecycleSteps];
  }

  hasRecursiveHydrationBoundary(): boolean {
    return this.lifecycleSteps.some((step) =>
      step.stepKind === RuntimeControllerLifecycleStepKind.RecursiveHydrationBoundary
    );
  }

  readReadinessKind(): RuntimeControllerReadinessKind {
    if (this.lifecycleSteps.some((step) => step.stepKind === RuntimeControllerLifecycleStepKind.Bind)) {
      return RuntimeControllerReadinessKind.Bound;
    }
    if (this.scope != null) {
      return RuntimeControllerReadinessKind.ScopeReady;
    }
    if (this.lifecycleSteps.some((step) => step.stepKind === RuntimeControllerLifecycleStepKind.RenderInstructions)
      || this.hasRecursiveHydrationBoundary()
      || this.bindings.length > 0
      || this.children.length > 0) {
      return RuntimeControllerReadinessKind.Rendered;
    }
    return RuntimeControllerReadinessKind.Created;
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
    const parent = this.parentReference();
    if (this.creationKind === RuntimeControllerCreationKind.SyntheticView) {
      return this.syntheticViewControllerProduct(parent);
    }

    if (this.creationKind === RuntimeControllerCreationKind.CustomAttribute
      || this.creationKind === RuntimeControllerCreationKind.TemplateController) {
      return this.customAttributeControllerProduct(parent);
    }

    return this.hydratableControllerProduct(parent);
  }

  private parentReference(): ControllerReference | null {
    return this.parent?.toReference() ?? null;
  }

  private syntheticViewControllerProduct(parent: ControllerReference | null): SyntheticViewController {
    return new SyntheticViewController(
      this.productHandle,
      this.identityHandle,
      this.name,
      this.container,
      parent,
      this.readChildReferences(),
      this.scope,
      this.readBindingProductHandles(),
      this.viewFactoryProductHandle,
      this.instructionSequenceProductHandle,
      this.hostAddressHandle,
      null,
      null,
      null,
      this.sourceAddressHandle,
    );
  }

  private customAttributeControllerProduct(parent: ControllerReference | null): CustomAttributeController {
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
    );
  }

  private hydratableControllerProduct(parent: ControllerReference | null): HydratableController {
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
    );
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
