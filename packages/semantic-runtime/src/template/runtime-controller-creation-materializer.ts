import type { Container } from '../di/container.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverRecordPolicy,
  ContainerContextResolverSlotRequest,
  type ContainerChildMaterializationPhaseName,
  type ContainerChildMaterializationEmission,
} from '../di/container-materializer.js';
import { ContainerLookupState } from '../di/container-lookup.js';
import { DiKeyIdentityEmitter } from '../di/di-key-identity-emitter.js';
import { DiResourceSlotPublicationMaterializer } from '../di/world-publication.js';
import type { AddressHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import {
  CustomAttributeDefinition,
} from '../resources/custom-attribute-definition.js';
import {
  BindableSetterKind,
  type BindableDefinition,
} from '../resources/bindable-definition.js';
import {
  CustomElementDefinition,
} from '../resources/custom-element-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from '../resources/resource-kind.js';
import {
  ObserverLocator,
  ObserverLocatorLookupRequest,
} from '../observation/observer-locator.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import { RuntimeHtmlControllerFrameworkErrorCode } from './framework-error-code.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
  IteratorBindingInstruction,
  MultiAttrInstruction,
  SetPropertyInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import {
  RuntimeControllerCreationKind,
  RuntimeControllerCreationRequest,
  RuntimeControllerFrame,
  type RuntimeControllerInstruction,
  RuntimeControllerLifecycleStage,
  RuntimeControllerLifecycleStepKind,
} from './runtime-controller.js';
import {
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetKind,
} from './runtime-binding.js';
import {
  RuntimeRendererAllocation,
} from './runtime-renderer.js';
import {
  readControllerActivationViewFactoryResolveSites,
} from './runtime-controller-activation-di.js';
import type {
  RuntimeRenderingSourceSet,
} from './runtime-rendering-source.js';
import type {
  RuntimeViewFactoryMaterialization,
} from './runtime-view-factory-materializer.js';
import {
  RuntimeControllerIssue,
  RuntimeControllerIssueKind,
  RuntimeControllerIssuePhase,
  RuntimeControllerIssuePublisher,
} from './runtime-controller-issue.js';
import {
  runtimeWatchersForDefinition,
} from './runtime-watcher-factory.js';
import {
  directDependencyDefinitions,
} from './resource-scope-builder.js';

type ClosedRuntimeControllerCreationRequest =
  RuntimeControllerCreationRequest
  & {
    readonly instruction: RuntimeControllerInstruction;
    readonly parent: RuntimeControllerFrame;
  };

type RuntimeControllerCreationPhaseName =
  | 'definition-lookup'
  | 'parent-container'
  | 'child-container'
  | `child-container:${ContainerChildMaterializationPhaseName}`
  | 'child-frame'
  | 'controller-dependencies'
  | 'watcher-setup'
  | 'child-hydration'
  | 'observer-setup'
  | 'activation-di-issues'
  | 'au-compose-static-input-issues'
  | 'template-controller-construction-issues'
  | 'parent-child-link';

type RuntimeControllerCreationMeasure = <TValue>(
  name: RuntimeControllerCreationPhaseName,
  read: () => TValue,
) => TValue;

const unmeasuredRuntimeControllerCreation: RuntimeControllerCreationMeasure = (_name, read) => read();

export class RuntimeControllerCreationMaterializer {
  private readonly childContainerMaterializer: ContainerChildMaterializer;
  private readonly controllerIssuePublisher: RuntimeControllerIssuePublisher;
  private readonly observerLocator: ObserverLocator;
  private readonly resourceSlotPublication: DiResourceSlotPublicationMaterializer;

  constructor(
    private readonly store: KernelStore,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store);
    this.controllerIssuePublisher = new RuntimeControllerIssuePublisher(store);
    this.observerLocator = new ObserverLocator(store);
    this.resourceSlotPublication = new DiResourceSlotPublicationMaterializer(store, new DiKeyIdentityEmitter(store));
  }

  createRootController(
    localKey: string,
    definition: CustomElementDefinition,
    rootContainer: Container,
    source: RuntimeRenderingSourceSet,
    typeSystem: TypeSystemProject | null,
    projectKey: string | null,
    resourceDefinitions: ResourceDefinitionIndex | null,
    records: KernelStoreRecord[],
    childContainerEmissions: ContainerChildMaterializationEmission[],
  ): RuntimeControllerFrame {
    const childContainer = this.childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest(
      `${localKey}:controller:root-container`,
      rootContainer,
      definition.sourceAddressHandle,
      'root-custom-element:container',
      [],
      null,
    ));
    records.push(...childContainer.records);
    childContainerEmissions.push(childContainer);
    const allocation = this.allocate(`${localKey}:controller:root`);
    const frame = new RuntimeControllerFrame(
      RuntimeControllerCreationKind.RootCustomElement,
      allocation.productHandle,
      allocation.identityHandle,
      definition.name,
      childContainer.container.toReference(),
      childContainer.container,
      definition.productHandle,
      definition.target,
      definition.sourceAddressHandle,
      null,
      null,
      null,
      definition.strict,
      definition.sourceAddressHandle,
      source.provenanceHandle,
    );
    this.recordRootControllerHydration(frame, childContainer);
    this.recordControllerResourceDependencies(
      `${localKey}:controller:root-dependencies`,
      frame,
      definition,
      resourceDefinitions,
      projectKey,
      source.provenanceHandle,
      records,
    );
    this.recordControllerWatchers(`${localKey}:controller:root`, frame, definition, typeSystem);
    return frame;
  }

  createChildController(
    creation: RuntimeControllerCreationRequest,
    typeSystem: TypeSystemProject | null,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    childContainerEmissions: ContainerChildMaterializationEmission[],
    openSeams: OpenSeam[],
    controllerIssues: RuntimeControllerIssue[],
    measure: RuntimeControllerCreationMeasure = unmeasuredRuntimeControllerCreation,
    contextResolverRecordPolicy: ContainerContextResolverRecordPolicy = ContainerContextResolverRecordPolicy.PublishAll,
    projectKey: string | null = null,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
  ): RuntimeControllerFrame | null {
    if (!isClosedControllerCreationRequest(creation)) {
      return null;
    }
    const definition = measure('definition-lookup', () => this.definitionForController(creation));
    if (definition == null) {
      this.recordRendererResourceLookupIssue(creation, source, records, controllerIssues);
      return null;
    }
    const parentContainer = measure('parent-container', () =>
      this.parentContainerForChildController(creation, source, records, openSeams)
    );
    if (parentContainer == null) {
      return null;
    }
    const allocation = this.allocate(`${creation.local}:controller`);
    const childContainer = measure('child-container', () =>
      this.materializeChildControllerContainer(creation, parentContainer, measure, contextResolverRecordPolicy)
    );
    records.push(...childContainer.records);
    childContainerEmissions.push(childContainer);
    const frame = measure('child-frame', () =>
      this.childControllerFrame(creation, allocation, definition, childContainer, source)
    );
    measure('controller-dependencies', () =>
      this.recordControllerResourceDependencies(
        `${creation.local}:controller-dependencies`,
        frame,
        definition,
        resourceDefinitions,
        projectKey,
        source.provenanceHandle,
        records,
      )
    );
    measure('watcher-setup', () =>
      this.recordControllerWatchers(`${creation.local}:controller`, frame, definition, typeSystem)
    );
    measure('child-hydration', () => this.recordChildControllerHydration(frame, childContainer));
    measure('observer-setup', () =>
      this.recordControllerObserverSetupIssues(frame, definition, typeSystem, source, records, controllerIssues)
    );
    measure('activation-di-issues', () =>
      this.recordControllerActivationDiIssues(creation, frame, definition, source, records, controllerIssues)
    );
    measure('au-compose-static-input-issues', () =>
      this.recordAuComposeStaticInputIssues(creation, frame, definition, source, records, controllerIssues)
    );
    measure('template-controller-construction-issues', () =>
      this.recordTemplateControllerConstructionIssues(creation, frame, source, records, controllerIssues)
    );
    measure('parent-child-link', () => creation.parent.addChild(frame));
    return frame;
  }

  createSyntheticViewController(
    local: string,
    viewFactory: RuntimeViewFactoryMaterialization,
    source: RuntimeRenderingSourceSet,
  ): RuntimeControllerFrame {
    const allocation = this.allocate(`${local}:controller`);
    const controller = viewFactory.templateController;
    return new RuntimeControllerFrame(
      RuntimeControllerCreationKind.SyntheticView,
      allocation.productHandle,
      allocation.identityHandle,
      viewFactory.viewFactory.name == null ? 'synthetic-view' : `${viewFactory.viewFactory.name}:synthetic`,
      viewFactory.viewFactory.container,
      controller.containerFrame,
      null,
      null,
      null,
      controller,
      null,
      null,
      null,
      viewFactory.viewFactory.sourceAddressHandle,
      source.provenanceHandle,
      viewFactory.viewFactory.productHandle,
      viewFactory.instructionSequenceProductHandle,
      viewFactory.viewFactory.instructionProductHandle,
    );
  }

  private parentContainerForChildController(
    creation: ClosedRuntimeControllerCreationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): Container | null {
    const parentContainer = creation.parent.containerFrame;
    if (parentContainer != null) {
      return parentContainer;
    }
    this.recordOpenSeam(
      `${creation.local}:open-controller-container`,
      `Renderer-created controller '${creation.creationKind}' needs runtime child-container materialization, but its parent controller did not carry a modeled container frame.`,
      creation.instruction.sourceAddressHandle,
      source,
      records,
      openSeams,
      KernelVocabulary.Di.OpenChildContainer.key,
    );
    return null;
  }

  private materializeChildControllerContainer(
    creation: ClosedRuntimeControllerCreationRequest,
    parentContainer: Container,
    measure: RuntimeControllerCreationMeasure,
    contextResolverRecordPolicy: ContainerContextResolverRecordPolicy,
  ): ContainerChildMaterializationEmission {
    return this.childContainerMaterializer.materializeChild(
      new ContainerChildMaterializationRequest(
        `${creation.local}:container`,
        parentContainer,
        creation.instruction.sourceAddressHandle,
        `${creation.creationKind}:container`,
        contextResolverSlotsForController(creation),
        null,
        contextResolverRecordPolicy,
      ),
      (name, read) => measure(`child-container:${name}`, read),
    );
  }

  private childControllerFrame(
    creation: ClosedRuntimeControllerCreationRequest,
    allocation: RuntimeRendererAllocation,
    definition: CustomElementDefinition | CustomAttributeDefinition | null,
    childContainer: ContainerChildMaterializationEmission,
    source: RuntimeRenderingSourceSet,
  ): RuntimeControllerFrame {
    return new RuntimeControllerFrame(
      creation.creationKind,
      allocation.productHandle,
      allocation.identityHandle,
      controllerName(creation, definition),
      childContainer.container.toReference(),
      childContainer.container,
      definition?.productHandle ?? null,
      definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition
        ? definition.target
        : null,
      creation.instruction.sourceAddressHandle,
      creation.parent,
      creation.instruction.productHandle,
      creation.instruction.identityHandle,
      definition instanceof CustomElementDefinition ? definition.strict : null,
      creation.instruction.sourceAddressHandle,
      source.provenanceHandle,
    );
  }

  private recordChildControllerHydration(
    frame: RuntimeControllerFrame,
    childContainer: ContainerChildMaterializationEmission,
  ): void {
    frame.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateChildContainer,
      childContainer.container.productHandle,
      childContainer.container.sourceAddressHandle,
      'Renderer-created controller received a runtime child container and hydration context providers.',
    );
  }

  private recordRootControllerHydration(
    frame: RuntimeControllerFrame,
    childContainer: ContainerChildMaterializationEmission,
  ): void {
    frame.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateChildContainer,
      childContainer.container.productHandle,
      childContainer.container.sourceAddressHandle,
      'AppRoot created a runtime child container for the root custom element controller.',
    );
  }

  recordControllerWatchers(
    local: string,
    frame: RuntimeControllerFrame,
    definition: CustomElementDefinition | CustomAttributeDefinition | null,
    typeSystem: TypeSystemProject | null = null,
  ): void {
    for (const watcher of runtimeWatchersForDefinition(this.store, local, frame, definition, typeSystem)) {
      frame.addWatcher(watcher);
    }
  }

  private recordControllerResourceDependencies(
    local: string,
    frame: RuntimeControllerFrame,
    definition: CustomElementDefinition | CustomAttributeDefinition,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    provenanceHandle: ProvenanceHandle,
    records: KernelStoreRecord[],
  ): void {
    const container = frame.containerFrame;
    if (container == null || resourceDefinitions == null) {
      return;
    }
    let registered = 0;
    directDependencyDefinitions(definition, resourceDefinitions).forEach((dependency, dependencyIndex) => {
      resourceLookupNames(dependency).forEach((lookupName, nameIndex) => {
        const resourceKey = runtimeResourceKeyForKind(dependency.type, lookupName);
        if (resourceKey == null || container.hasResource(resourceKey, false)) {
          return;
        }
        const publication = this.resourceSlotPublication.recordsForResourceDefinitionSlot(
          container,
          dependency,
          lookupName,
          `${local}:${dependencyIndex}:${nameIndex}`,
          provenanceHandle,
          projectKey,
        );
        if (publication == null) {
          return;
        }
        records.push(...publication.records);
        if (publication.slot != null) {
          container.registerResource(publication.slot);
          registered++;
        }
      });
    });
    if (registered === 0) {
      return;
    }
    frame.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.RegisterDependencies,
      definition.productHandle,
      definition.sourceAddressHandle,
      `Controller container registered ${registered} resource dependency slot(s).`,
    );
  }

  recordControllerObserverSetupIssues(
    frame: RuntimeControllerFrame,
    definition: CustomElementDefinition | CustomAttributeDefinition | null,
    typeSystem: TypeSystemProject | null,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (definition == null || typeSystem == null || definition.target.targetType == null) {
      return;
    }
    const hasTargetProperty = targetTypePropertyLookup(this.store, definition);
    const hasAnyChangeCallback = hasTargetProperty('propertyChanged') || hasTargetProperty('propertiesChanged');
    definition.bindables.forEach((bindable, index) => {
      const requiresCoercer = bindableSetterRequiresCoercer(bindable);
      const requiresCallback = hasAnyChangeCallback || hasTargetProperty(bindable.callback);
      if (!requiresCoercer && !requiresCallback) {
        return;
      }
      const lookup = this.observerLocator.getObserver(new ObserverLocatorLookupRequest(
        `${frame.productHandle}:observer-setup:${index}:${bindable.name}`,
        RuntimeBindingTargetAccessLookup.Observer,
        RuntimeBindingTargetKind.ControllerViewModel,
        bindable.name,
        typeSystem,
        definition.target.targetType,
        null,
        null,
        bindable.sourceAddressHandle ?? definition.sourceAddressHandle,
        false,
        false,
      ));
      if (lookup.openReason != null) {
        return;
      }
      if (requiresCoercer && !lookup.supportsCoercer) {
        this.publishControllerObserverSetupIssue(
          `${frame.productHandle}:controller-issue:observer-setup:${index}:coercer`,
          frame,
          source,
          records,
          controllerIssues,
          RuntimeControllerIssueKind.ControllerPropertyNotCoercible,
          `Observer for bindable property ${bindable.name} does not support coercion.`,
          RuntimeHtmlControllerFrameworkErrorCode.ControllerPropertyNotCoercible,
          bindable.sourceAddressHandle ?? definition.sourceAddressHandle,
        );
      }
      if (requiresCallback && !lookup.supportsCallback) {
        this.publishControllerObserverSetupIssue(
          `${frame.productHandle}:controller-issue:observer-setup:${index}:callback`,
          frame,
          source,
          records,
          controllerIssues,
          RuntimeControllerIssueKind.ControllerPropertyNoChangeHandler,
          `Observer for property ${bindable.name} does not support change handler.`,
          RuntimeHtmlControllerFrameworkErrorCode.ControllerPropertyNoChangeHandler,
          bindable.sourceAddressHandle ?? definition.sourceAddressHandle,
        );
      }
    });
  }

  private publishControllerObserverSetupIssue(
    local: string,
    frame: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
    kind: RuntimeControllerIssueKind,
    message: string,
    frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode,
    sourceAddressHandle: AddressHandle | null,
  ): void {
    const publication = this.controllerIssuePublisher.publish(
      local,
      frame.productHandle,
      frame.identityHandle,
      frame.instructionProductHandle,
      source.provenanceHandle,
      RuntimeControllerIssuePhase.ObserverSetup,
      kind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
    );
    records.push(...publication.records);
    controllerIssues.push(publication.issue);
  }

  private recordControllerActivationDiIssues(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    definition: CustomElementDefinition | CustomAttributeDefinition,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (creation.creationKind === RuntimeControllerCreationKind.TemplateController) {
      return;
    }
    const sites = readControllerActivationViewFactoryResolveSites(this.store, definition);
    sites.forEach((site, index) => {
      const publication = this.controllerIssuePublisher.publish(
        `${creation.local}:controller-issue:view-factory-provider:${index}`,
        frame.productHandle,
        frame.identityHandle,
        creation.instruction.productHandle,
        source.provenanceHandle,
        RuntimeControllerIssuePhase.ControllerActivation,
        RuntimeControllerIssueKind.ViewFactoryProviderNotReady,
        'Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider.',
        RuntimeHtmlControllerFrameworkErrorCode.ViewFactoryProviderNotReady,
        site.sourceAddressHandle,
      );
      records.push(...site.records, ...publication.records);
      controllerIssues.push(publication.issue);
    });
  }

  private recordTemplateControllerConstructionIssues(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    this.recordElseTemplateControllerLinkIssues(creation, frame, source, records, controllerIssues);
    this.recordSwitchTemplateControllerLinkIssues(creation, frame, source, records, controllerIssues);
    this.recordPromiseTemplateControllerLinkIssues(creation, frame, source, records, controllerIssues);
    this.recordPortalTemplateControllerActivationIssues(creation, frame, source, records, controllerIssues);

    if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)
      || creation.instruction.controllerName !== 'repeat') {
      return;
    }

    const iterator = this.repeatIteratorInstruction(creation.instruction);
    if (iterator == null) {
      return;
    }

    iterator.tailInstructionProductHandles.forEach((handle, index) => {
      const tail = this.store.productDetails.read(TemplateProductDetails.Instruction, handle);
      if (!(tail instanceof MultiAttrInstruction)) {
        return;
      }
      const issue = repeatOptionIssue(tail);
      if (issue == null) {
        return;
      }
      const publication = this.controllerIssuePublisher.publish(
        `${creation.local}:controller-issue:repeat-option:${index}:${issue.kind}`,
        frame.productHandle,
        frame.identityHandle,
        creation.instruction.productHandle,
        source.provenanceHandle,
        RuntimeControllerIssuePhase.TemplateControllerConstruction,
        issue.kind,
        issue.message,
        issue.frameworkErrorCode,
        tail.sourceAddressHandle ?? creation.instruction.sourceAddressHandle,
      );
      records.push(...publication.records);
      controllerIssues.push(publication.issue);
    });
  }

  private recordPortalTemplateControllerActivationIssues(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)
      || creation.instruction.controllerName !== 'portal') {
      return;
    }
    const instructions = staticSetPropertyInstructions(this.store, creation.instruction.bindingInstructionProductHandles);
    portalTemplateControllerActivationIssues(instructions).forEach((issue, index) => {
      const publication = this.controllerIssuePublisher.publish(
        `${creation.local}:controller-issue:portal-activation:${index}:${issue.kind}`,
        frame.productHandle,
        frame.identityHandle,
        issue.instruction.productHandle,
        source.provenanceHandle,
        RuntimeControllerIssuePhase.TemplateControllerActivation,
        issue.kind,
        issue.message,
        issue.frameworkErrorCode,
        issue.instruction.sourceAddressHandle ?? creation.instruction.sourceAddressHandle,
      );
      records.push(...publication.records);
      controllerIssues.push(publication.issue);
    });
  }

  private recordSwitchTemplateControllerLinkIssues(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)) {
      return;
    }
    const issue = switchTemplateControllerLinkIssue(creation);
    if (issue == null) {
      return;
    }
    const publication = this.controllerIssuePublisher.publish(
      `${creation.local}:controller-issue:switch-link:${issue.kind}`,
      frame.productHandle,
      frame.identityHandle,
      creation.instruction.productHandle,
      source.provenanceHandle,
      RuntimeControllerIssuePhase.TemplateControllerLink,
      issue.kind,
      issue.message,
      issue.frameworkErrorCode,
      creation.instruction.sourceAddressHandle,
    );
    records.push(...publication.records);
    controllerIssues.push(publication.issue);
  }

  private recordElseTemplateControllerLinkIssues(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)) {
      return;
    }
    const issue = elseTemplateControllerLinkIssue(creation);
    if (issue == null) {
      return;
    }
    const publication = this.controllerIssuePublisher.publish(
      `${creation.local}:controller-issue:else-link:${issue.kind}`,
      frame.productHandle,
      frame.identityHandle,
      creation.instruction.productHandle,
      source.provenanceHandle,
      RuntimeControllerIssuePhase.TemplateControllerLink,
      issue.kind,
      issue.message,
      issue.frameworkErrorCode,
      creation.instruction.sourceAddressHandle,
    );
    records.push(...publication.records);
    controllerIssues.push(publication.issue);
  }

  private recordPromiseTemplateControllerLinkIssues(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)) {
      return;
    }
    const issue = promiseTemplateControllerLinkIssue(creation);
    if (issue == null) {
      return;
    }
    const publication = this.controllerIssuePublisher.publish(
      `${creation.local}:controller-issue:promise-link:${issue.kind}`,
      frame.productHandle,
      frame.identityHandle,
      creation.instruction.productHandle,
      source.provenanceHandle,
      RuntimeControllerIssuePhase.TemplateControllerLink,
      issue.kind,
      issue.message,
      issue.frameworkErrorCode,
      creation.instruction.sourceAddressHandle,
    );
    records.push(...publication.records);
    controllerIssues.push(publication.issue);
  }

  private recordAuComposeStaticInputIssues(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    definition: CustomElementDefinition | CustomAttributeDefinition | null,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (!(definition instanceof CustomElementDefinition)
      || definition.name !== 'au-compose'
      || !(creation.instruction instanceof HydrateElementInstruction)) {
      return;
    }

    creation.instruction.bindableInstructionProductHandles.forEach((handle, index) => {
      const instruction = this.store.productDetails.read(TemplateProductDetails.Instruction, handle);
      if (!(instruction instanceof SetPropertyInstruction)) {
        return;
      }
      this.recordAuComposeBindableSetIssue(
        creation,
        frame,
        instruction,
        index,
        source,
        records,
        controllerIssues,
      );
      this.recordAuComposeComponentLookupIssue(
        creation,
        frame,
        instruction,
        index,
        source,
        records,
        controllerIssues,
      );
    });
  }

  private recordAuComposeBindableSetIssue(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    instruction: SetPropertyInstruction,
    index: number,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    const issue = auComposeBindableSetIssue(instruction);
    if (issue == null) {
      return;
    }
    const publication = this.controllerIssuePublisher.publish(
      `${creation.local}:controller-issue:au-compose-bindable:${index}:${issue.kind}`,
      frame.productHandle,
      frame.identityHandle,
      instruction.productHandle,
      source.provenanceHandle,
      RuntimeControllerIssuePhase.BindableSet,
      issue.kind,
      issue.message,
      issue.frameworkErrorCode,
      instruction.sourceAddressHandle ?? creation.instruction.sourceAddressHandle,
    );
    records.push(...publication.records);
    controllerIssues.push(publication.issue);
  }

  private recordAuComposeComponentLookupIssue(
    creation: ClosedRuntimeControllerCreationRequest,
    frame: RuntimeControllerFrame,
    instruction: SetPropertyInstruction,
    index: number,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    const issue = auComposeComponentLookupIssue(creation, instruction);
    if (issue == null) {
      return;
    }
    const publication = this.controllerIssuePublisher.publish(
      `${creation.local}:controller-issue:au-compose-component:${index}:${issue.kind}`,
      frame.productHandle,
      frame.identityHandle,
      instruction.productHandle,
      source.provenanceHandle,
      RuntimeControllerIssuePhase.CompositionComponentLookup,
      issue.kind,
      issue.message,
      issue.frameworkErrorCode,
      instruction.sourceAddressHandle ?? creation.instruction.sourceAddressHandle,
    );
    records.push(...publication.records);
    controllerIssues.push(publication.issue);
  }

  private recordRendererResourceLookupIssue(
    creation: ClosedRuntimeControllerCreationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    const issue = rendererResourceLookupIssue(creation.instruction);
    if (issue == null) {
      return;
    }
    const publication = this.controllerIssuePublisher.publish(
      `${creation.local}:controller-issue:renderer-resource:${issue.kind}`,
      creation.parent.productHandle,
      creation.parent.identityHandle,
      creation.instruction.productHandle,
      source.provenanceHandle,
      RuntimeControllerIssuePhase.RendererResourceLookup,
      issue.kind,
      issue.message,
      issue.frameworkErrorCode,
      creation.instruction.sourceAddressHandle,
    );
    records.push(...publication.records);
    controllerIssues.push(publication.issue);
  }

  private repeatIteratorInstruction(
    instruction: HydrateTemplateControllerInstruction,
  ): IteratorBindingInstruction | null {
    for (const handle of instruction.bindingInstructionProductHandles) {
      const candidate = this.store.productDetails.read(TemplateProductDetails.Instruction, handle);
      if (candidate instanceof IteratorBindingInstruction) {
        return candidate;
      }
    }
    return null;
  }

  private definitionForController(
    creation: RuntimeControllerCreationRequest,
  ): CustomElementDefinition | CustomAttributeDefinition | null {
    const productHandle = creation.instruction?.definitionProductHandle ?? null;
    if (productHandle == null) {
      return null;
    }
    const definition = this.store.productDetails.read(ResourceProductDetails.Definition, productHandle);
    if (definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition) {
      return definition;
    }
    return null;
  }

  private allocate(local: string): RuntimeRendererAllocation {
    return new RuntimeRendererAllocation(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private recordOpenSeam(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Instruction.OpenInstruction.key,
  ): void {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
    );
    openSeams.push(seam);
    records.push(seam);
  }
}

function controllerName(
  creation: RuntimeControllerCreationRequest,
  definition: CustomElementDefinition | CustomAttributeDefinition | null,
): string | null {
  if (creation.creationKind === RuntimeControllerCreationKind.TemplateController
    && creation.instruction != null
    && 'controllerName' in creation.instruction) {
    return creation.instruction.controllerName;
  }
  return definition?.name ?? null;
}

function rendererResourceLookupIssue(
  instruction: RuntimeControllerInstruction,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  if (instruction instanceof HydrateElementInstruction) {
    return {
      kind: RuntimeControllerIssueKind.ElementResourceNotFound,
      message: `Element "${instruction.elementName}" is not registered in the rendering controller container.`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.ElementResourceNotFound,
    };
  }
  if (instruction instanceof HydrateTemplateControllerInstruction) {
    return {
      kind: RuntimeControllerIssueKind.AttributeTemplateControllerResourceNotFound,
      message: `Template controller "${instruction.controllerName}" is not registered in the rendering controller container.`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.AttributeTemplateControllerResourceNotFound,
    };
  }
  if (instruction instanceof HydrateAttributeInstruction) {
    return {
      kind: RuntimeControllerIssueKind.AttributeResourceNotFound,
      message: `Attribute "${instruction.attributeName}" is not registered in the rendering controller container.`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.AttributeResourceNotFound,
    };
  }
  return null;
}

function repeatOptionIssue(
  instruction: MultiAttrInstruction,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  if (instruction.target === 'key') {
    if (instruction.command == null || instruction.command === 'bind') {
      return null;
    }
    return {
      kind: RuntimeControllerIssueKind.RepeatInvalidKeyBindingCommand,
      message: `Invalid command "${instruction.command}" usage with [repeat].`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.RepeatInvalidKeyBindingCommand,
    };
  }
  if (instruction.target === 'contextual') {
    if (instruction.command == null || instruction.command === 'bind') {
      return null;
    }
    return {
      kind: RuntimeControllerIssueKind.RepeatInvalidContextualBindingCommand,
      message: `Invalid command "${instruction.command}" usage with [repeat.for] option "contextual". Only "bind" or static assignment is supported.`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.RepeatInvalidContextualBindingCommand,
    };
  }
  return {
    kind: RuntimeControllerIssueKind.RepeatExtraneousBinding,
    message: `Invalid [repeat] usage, found extraneous target "${instruction.target}".`,
    frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.RepeatExtraneousBinding,
  };
}

function switchTemplateControllerLinkIssue(
  creation: ClosedRuntimeControllerCreationRequest,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)
    || (creation.instruction.controllerName !== 'case' && creation.instruction.controllerName !== 'default-case')) {
    return null;
  }

  const switchController = creation.parent.parent;
  if (switchController == null
    || switchController.creationKind !== RuntimeControllerCreationKind.TemplateController
    || switchController.name !== 'switch') {
    return {
      kind: RuntimeControllerIssueKind.SwitchInvalidUsage,
      message: `Invalid [${creation.instruction.controllerName}] usage. The parent [switch] controller was not found.`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.SwitchInvalidUsage,
    };
  }

  if (creation.instruction.controllerName === 'default-case'
    && creation.parent.readChildren().some((child) => child.name === 'default-case')) {
    return {
      kind: RuntimeControllerIssueKind.SwitchNoMultipleDefault,
      message: `Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch].`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.SwitchNoMultipleDefault,
    };
  }

  return null;
}

function elseTemplateControllerLinkIssue(
  creation: ClosedRuntimeControllerCreationRequest,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)
    || creation.instruction.controllerName !== 'else') {
    return null;
  }

  const previousSibling = lastRuntimeController(creation.parent.readChildren());
  if (previousSibling?.creationKind === RuntimeControllerCreationKind.TemplateController
    && previousSibling.name === 'if') {
    return null;
  }
  return {
    kind: RuntimeControllerIssueKind.ElseWithoutIf,
    message: 'Invalid [else] usage. The previous controller sibling is not [if].',
    frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.ElseWithoutIf,
  };
}

function lastRuntimeController(controllers: readonly RuntimeControllerFrame[]): RuntimeControllerFrame | null {
  return controllers[controllers.length - 1] ?? null;
}

function promiseTemplateControllerLinkIssue(
  creation: ClosedRuntimeControllerCreationRequest,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  if (!(creation.instruction instanceof HydrateTemplateControllerInstruction)
    || !isPromiseResultControllerName(creation.instruction.controllerName)) {
    return null;
  }

  const promiseController = creation.parent.parent;
  if (promiseController == null
    || promiseController.creationKind !== RuntimeControllerCreationKind.TemplateController
    || promiseController.name !== 'promise') {
    return {
      kind: RuntimeControllerIssueKind.PromiseInvalidUsage,
      message: `Invalid [${creation.instruction.controllerName}] usage. The parent [promise].resolve controller was not found.`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.PromiseInvalidUsage,
    };
  }

  return null;
}

function isPromiseResultControllerName(name: string): boolean {
  return name === 'pending' || name === 'then' || name === 'catch';
}

function portalTemplateControllerActivationIssues(
  instructions: readonly SetPropertyInstruction[],
): readonly {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
  readonly instruction: SetPropertyInstruction;
}[] {
  const issues: {
    readonly kind: RuntimeControllerIssueKind;
    readonly message: string;
    readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
    readonly instruction: SetPropertyInstruction;
  }[] = [];
  const position = instructions.find((instruction) => instruction.targetProperty === 'position') ?? null;
  if (position != null && !isValidPortalInsertPosition(position.value)) {
    issues.push({
      kind: RuntimeControllerIssueKind.PortalInvalidInsertPosition,
      message: `Invalid portal insertion position "${position.value}".`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.PortalInvalidInsertPosition,
      instruction: position,
    });
  }

  const strict = instructions.find((instruction) => instruction.targetProperty === 'strict') ?? null;
  if (strict == null || !staticPortalStrictValue(strict.value)) {
    return issues;
  }

  const target = instructions.find((instruction) => instruction.targetProperty === 'target') ?? null;
  if (target?.value === '') {
    issues.push({
      kind: RuntimeControllerIssueKind.PortalQueryEmpty,
      message: 'Invalid strict portal target query: empty query.',
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.PortalQueryEmpty,
      instruction: target,
    });
  } else if (target == null) {
    issues.push({
      kind: RuntimeControllerIssueKind.PortalNoTarget,
      message: 'Invalid strict portal target resolution: no static target was supplied.',
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.PortalNoTarget,
      instruction: strict,
    });
  }

  return issues;
}

function staticSetPropertyInstructions(
  store: KernelStore,
  handles: readonly ProductHandle[],
): readonly SetPropertyInstruction[] {
  return handles
    .map((handle) => store.productDetails.read(TemplateProductDetails.Instruction, handle))
    .filter((instruction): instruction is SetPropertyInstruction => instruction instanceof SetPropertyInstruction);
}

function isValidPortalInsertPosition(value: string): boolean {
  return value === 'beforeend'
    || value === 'afterbegin'
    || value === 'beforebegin'
    || value === 'afterend';
}

function staticPortalStrictValue(value: string): boolean {
  return value.length > 0;
}

function auComposeBindableSetIssue(
  instruction: SetPropertyInstruction,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  switch (instruction.targetProperty) {
    case 'scopeBehavior':
      return instruction.value === 'scoped' || instruction.value === 'auto'
        ? null
        : {
            kind: RuntimeControllerIssueKind.AuComposeInvalidScopeBehavior,
            message: `Invalid au-compose scopeBehavior value "${instruction.value}". Expected "scoped" or "auto".`,
            frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.AuComposeInvalidScopeBehavior,
          };
    case 'flushMode':
      return instruction.value === 'sync' || instruction.value === 'async'
        ? null
        : {
            kind: RuntimeControllerIssueKind.AuComposeInvalidFlushMode,
            message: `Invalid au-compose flushMode value "${instruction.value}". Expected "sync" or "async".`,
            frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.AuComposeInvalidFlushMode,
          };
    default:
      return null;
  }
}

function auComposeComponentLookupIssue(
  creation: ClosedRuntimeControllerCreationRequest,
  instruction: SetPropertyInstruction,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  if (instruction.targetProperty !== 'component') {
    return null;
  }

  const lookup = creation.parent.containerFrame?.find('custom-element', instruction.value) ?? null;
  if (lookup?.state === ContainerLookupState.Hit) {
    return null;
  }
  return {
    kind: RuntimeControllerIssueKind.AuComposeComponentNameNotFound,
    message: `No au-compose custom element named "${instruction.value}" is registered in the parent hydration context container.`,
    frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.AuComposeComponentNameNotFound,
  };
}

function resourceLookupNames(
  definition: FullResourceDefinition,
): readonly string[] {
  if (definition.type === ResourceDefinitionKind.AttributePattern || !('name' in definition)) {
    return [];
  }
  return [definition.name, ...definition.aliases.map((alias) => alias.name)];
}

function bindableSetterRequiresCoercer(bindable: BindableDefinition): boolean {
  return bindable.set.kind === BindableSetterKind.Function
    || bindable.set.kind === BindableSetterKind.TypeCoercion;
}

function targetTypePropertyLookup(
  store: KernelStore,
  definition: CustomElementDefinition | CustomAttributeDefinition,
): (propertyName: string) => boolean {
  const productHandle = definition.target.targetType?.productHandle ?? null;
  if (productHandle == null) {
    return () => false;
  }
  const carrier = store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle)?.carrier ?? null;
  if (carrier == null) {
    return () => false;
  }
  const apparentType = carrier.checker.getApparentType(carrier.type);
  const cache = new Map<string, boolean>();
  return (propertyName) => {
    const cached = cache.get(propertyName);
    if (cached != null) {
      return cached;
    }
    const exists = carrier.checker.getPropertyOfType(carrier.type, propertyName) != null
      || carrier.checker.getPropertyOfType(apparentType, propertyName) != null;
    cache.set(propertyName, exists);
    return exists;
  };
}

function isClosedControllerCreationRequest(
  creation: RuntimeControllerCreationRequest,
): creation is ClosedRuntimeControllerCreationRequest {
  return creation.parent != null && creation.instruction != null;
}

function contextResolverSlotsForController(
  creation: RuntimeControllerCreationRequest,
): readonly ContainerContextResolverSlotRequest[] {
  const common = [
    'INode',
    'IController',
    'IInstruction',
    'IRenderLocation',
    'IViewFactory',
    'IAuSlotsInfo',
  ];
  const names = creation.creationKind === RuntimeControllerCreationKind.CustomElement
    ? [...common, 'IHydrationContext']
    : common;
  return names.map((name) => new ContainerContextResolverSlotRequest(
    name,
    creation.instruction?.sourceAddressHandle ?? null,
  ));
}
