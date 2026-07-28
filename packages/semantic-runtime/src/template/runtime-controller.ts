import {
  type AuSlotsInfo,
  ControllerReference,
  CustomAttributeController,
  CustomElementController,
  type RuntimeHydrationContext,
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
import type {
  RuntimeWatcher,
  RuntimeWatcherMaterialization,
} from './runtime-watcher.js';

export const enum RuntimeControllerCreationKind {
  RootCustomElement = 'root-custom-element',
  RoutedCustomElement = 'routed-custom-element',
  CustomElement = 'custom-element',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  SyntheticView = 'synthetic-view',
}

export const enum RuntimeControllerAssemblyStage {
  Creating = 'creating',
  Hydration = 'hydration',
  Rendering = 'rendering',
  BindingAdmission = 'binding-admission',
  ChildAdmission = 'child-admission',
  Scope = 'scope',
  Bind = 'bind',
}

export const enum RuntimeControllerAssemblyStepKind {
  CreateController = 'create-controller',
  CreateChildContainer = 'create-child-container',
  InstallHydrationContext = 'install-hydration-context',
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

export class RuntimeControllerAssemblyStep {
  constructor(
    readonly order: number,
    readonly stage: RuntimeControllerAssemblyStage,
    readonly stepKind: RuntimeControllerAssemblyStepKind,
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
 * equivalent of that in-progress controller state; runtime analysis freezes it into a controller product after
 * rendering and scope attachment have completed.
 */
export class RuntimeControllerFrame {
  private readonly bindings: RuntimeBinding[] = [];
  private readonly watcherMaterializations: RuntimeWatcherMaterialization[] = [];
  private readonly children: RuntimeControllerFrame[] = [];
  private readonly assemblySteps: RuntimeControllerAssemblyStep[] = [];
  private scope: BindingScopeReference | null = null;
  private constructionHydrationContext: RuntimeHydrationContext | null = null;
  private hydrationContext: RuntimeHydrationContext | null = null;
  private auSlotsInfo: AuSlotsInfo | null = null;

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
    this.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Creating,
      RuntimeControllerAssemblyStepKind.CreateController,
      productHandle,
      sourceAddressHandle,
      `Controller frame created for ${creationKind}.`,
    );
  }

  addBinding(binding: RuntimeBinding): void {
    this.bindings.push(binding);
    this.recordAssemblyStep(
      RuntimeControllerAssemblyStage.BindingAdmission,
      RuntimeControllerAssemblyStepKind.AddBinding,
      binding.productHandle,
      binding.sourceAddressHandle,
      `Controller.addBinding admitted a ${binding.bindingKind} binding.`,
    );
  }

  addWatcher(materialization: RuntimeWatcherMaterialization): void {
    this.watcherMaterializations.push(materialization);
    const watcher = materialization.watcher;
    this.recordAssemblyStep(
      RuntimeControllerAssemblyStage.BindingAdmission,
      RuntimeControllerAssemblyStepKind.AddBinding,
      watcher.productHandle,
      watcher.sourceAddressHandle,
      `Controller.addBinding admitted a ${watcher.watcherKind} watcher.`,
    );
  }

  addChild(child: RuntimeControllerFrame): void {
    this.children.push(child);
    this.recordAssemblyStep(
      RuntimeControllerAssemblyStage.ChildAdmission,
      RuntimeControllerAssemblyStepKind.AddChild,
      child.productHandle,
      child.sourceAddressHandle,
      `Controller.addChild admitted ${child.creationKind}.`,
    );
    child.recordAssemblyStep(
      RuntimeControllerAssemblyStage.ChildAdmission,
      RuntimeControllerAssemblyStepKind.AdmittedToParent,
      this.productHandle,
      child.sourceAddressHandle,
      `Controller was admitted to parent ${this.name ?? this.creationKind}.`,
    );
  }

  bind(input: RuntimeControllerBindRequest): RuntimeControllerBindResult {
    const contributions: RuntimeControllerBindContribution[] = [];
    const bindOne = (binding: RuntimeBinding): void => {
      const bindInput = input.host.inputForBinding(this, binding);
      if (bindInput == null) {
        return;
      }
      contributions.push(new RuntimeControllerBindContribution(
        binding,
        bindRuntimeBinding(binding, bindInput),
      ));
      if (binding instanceof SpreadBinding) {
        binding.readInnerBindings().forEach(bindOne);
      }
    };
    this.bindings.forEach(bindOne);
    this.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Bind,
      RuntimeControllerAssemblyStepKind.Bind,
      this.productHandle,
      this.sourceAddressHandle,
      `Controller.bind processed ${contributions.length} binding contribution(s).`,
    );
    return new RuntimeControllerBindResult(this, contributions);
  }

  attachScope(scope: BindingScopeReference): void {
    this.scope = scope;
    this.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Scope,
      RuntimeControllerAssemblyStepKind.AttachScope,
      scope.productHandle,
      scope.sourceAddressHandle,
      'Controller received its runtime binding Scope.',
    );
  }

  attachHydrationContext(context: RuntimeHydrationContext): void {
    if (this.hydrationContext != null && this.hydrationContext.productHandle !== context.productHandle) {
      throw new Error(
        `Controller '${this.productHandle}' cannot replace hydration context `
        + `'${this.hydrationContext.productHandle}' with '${context.productHandle}'.`,
      );
    }
    this.hydrationContext = context;
    if (context.controller.productHandle === this.productHandle) {
      this.recordAssemblyStep(
        RuntimeControllerAssemblyStage.Hydration,
        RuntimeControllerAssemblyStepKind.InstallHydrationContext,
        context.productHandle,
        context.sourceAddressHandle,
        'Controller.$el installed the custom element\'s own IHydrationContext after view-model construction.',
      );
    }
  }

  attachConstructionHydrationContext(context: RuntimeHydrationContext): void {
    if (this.constructionHydrationContext != null
      && this.constructionHydrationContext.productHandle !== context.productHandle) {
      throw new Error(
        `Controller '${this.productHandle}' cannot replace construction hydration context `
        + `'${this.constructionHydrationContext.productHandle}' with '${context.productHandle}'.`,
      );
    }
    this.constructionHydrationContext = context;
  }

  attachAuSlotsInfo(slotsInfo: AuSlotsInfo): void {
    if (this.auSlotsInfo != null && this.auSlotsInfo.productHandle !== slotsInfo.productHandle) {
      throw new Error(
        `Controller '${this.productHandle}' cannot replace AuSlotsInfo `
        + `'${this.auSlotsInfo.productHandle}' with '${slotsInfo.productHandle}'.`,
      );
    }
    this.auSlotsInfo = slotsInfo;
  }

  recordAssemblyStep(
    stage: RuntimeControllerAssemblyStage,
    stepKind: RuntimeControllerAssemblyStepKind,
    relatedProductHandle: ProductHandle | null,
    sourceAddressHandle: AddressHandle | null,
    summary: string,
  ): void {
    this.assemblySteps.push(new RuntimeControllerAssemblyStep(
      this.assemblySteps.length,
      stage,
      stepKind,
      relatedProductHandle,
      sourceAddressHandle,
      summary,
    ));
  }

  recordRecursiveHydrationBoundary(summary: string): void {
    this.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Rendering,
      RuntimeControllerAssemblyStepKind.RecursiveHydrationBoundary,
      this.definitionProductHandle,
      this.sourceAddressHandle,
      summary,
    );
  }

  readBindings(): readonly RuntimeBinding[] {
    return [...this.bindings];
  }

  readWatchers(): readonly RuntimeWatcher[] {
    return this.watcherMaterializations.map((materialization) => materialization.watcher);
  }

  readWatcherMaterializations(): readonly RuntimeWatcherMaterialization[] {
    return [...this.watcherMaterializations];
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

  readHydrationContext(): RuntimeHydrationContext | null {
    return this.hydrationContext;
  }

  readConstructionHydrationContext(): RuntimeHydrationContext | null {
    return this.constructionHydrationContext;
  }

  readAuSlotsInfo(): AuSlotsInfo | null {
    return this.auSlotsInfo;
  }

  readAssemblySteps(): readonly RuntimeControllerAssemblyStep[] {
    return [...this.assemblySteps];
  }

  hasRecursiveHydrationBoundary(): boolean {
    return this.assemblySteps.some((step) =>
      step.stepKind === RuntimeControllerAssemblyStepKind.RecursiveHydrationBoundary
    );
  }

  readReadinessKind(): RuntimeControllerReadinessKind {
    if (this.assemblySteps.some((step) => step.stepKind === RuntimeControllerAssemblyStepKind.Bind)) {
      return RuntimeControllerReadinessKind.Bound;
    }
    if (this.scope != null) {
      return RuntimeControllerReadinessKind.ScopeReady;
    }
    if (this.assemblySteps.some((step) => step.stepKind === RuntimeControllerAssemblyStepKind.RenderInstructions)
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

    return this.customElementControllerProduct(parent);
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

  private customElementControllerProduct(parent: ControllerReference | null): CustomElementController {
    return new CustomElementController(
      this.productHandle,
      this.identityHandle,
      this.name,
      this.container,
      this.definitionProductHandle,
      this.viewModel,
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
