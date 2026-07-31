import type { Container } from '../di/container.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverRecordPolicy,
  ContainerContextResolverSlotRequest,
  type ContainerChildMaterializationPhaseName,
  type ContainerChildMaterializationEmission,
} from '../di/container-materializer.js';
import { FrameworkIntrinsicDiKey } from '../di/framework-intrinsic-di-key.js';
import { ContainerLookupState } from '../di/container-lookup.js';
import { DiKeyIdentityEmitter } from '../di/di-key-identity-emitter.js';
import { DiResourceSlotPublicationMaterializer } from '../di/world-publication.js';
import {
  AuSlotsInfo,
  AuSlotsInfoProjection,
  AuSlotsInfoSourceKind,
  RuntimeHydrationContext,
} from '../configuration/controller.js';
import { AppTaskSlot } from '../configuration/app-task.js';
import { SemanticClaim } from '../kernel/claim.js';
import type { AddressHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import { ConfigurationIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
  type OpenSeamReasonSource,
} from '../kernel/open-seam.js';
import {
  readFieldProvenance,
} from '../kernel/provenance.js';
import {
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
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
  RegistrationValueKind,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import {
  ObserverLocatorLookupRequest,
  type ObserverLocator,
} from '../observation/observer-locator.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';
import {
  CheckerRuntimeMemberPresence,
  CheckerTypeShapeAccess,
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
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
  RuntimeControllerObserverSetup,
  RuntimeControllerObserverSetupState,
  type RuntimeControllerInstruction,
  RuntimeControllerAssemblyStage,
  RuntimeControllerAssemblyStepKind,
} from './runtime-controller.js';
import {
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetKind,
  RuntimeControllerObserverSetupOutcome,
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
  runtimeWatcherMaterializationsForDefinition,
} from './runtime-watcher-factory.js';
import {
  directDependencyDefinitions,
} from './resource-scope-builder.js';
import {
  AU_COMPOSE_RESOURCE_NAME,
  AuComposeBindableName,
  isAuComposeFlushMode,
  isAuComposeScopeBehavior,
} from './au-compose-source.js';
import {
  isPortalInsertPosition,
  PortalBindableName,
} from './portal-source.js';

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
  private readonly resourceSlotPublication: DiResourceSlotPublicationMaterializer;

  constructor(
    private readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store, publication);
    this.controllerIssuePublisher = new RuntimeControllerIssuePublisher(store);
    this.resourceSlotPublication = new DiResourceSlotPublicationMaterializer(
      store,
      new DiKeyIdentityEmitter(publication),
    );
  }

  createIntrinsicEmptyAuSlotsInfo(
    localKey: string,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
  ): AuSlotsInfo {
    const local = `${localKey}:au-slots-info:intrinsic-empty`;
    const slotsInfo = new AuSlotsInfo(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      AuSlotsInfoSourceKind.IntrinsicEmpty,
      [],
      [],
      null,
    );
    records.push(
      new ConfigurationIdentity(
        slotsInfo.identityHandle,
        KernelVocabulary.Configuration.AuSlotsInfo.key,
        null,
        null,
        FrameworkIntrinsicDiKey.IAuSlotsInfo,
      ),
      new MaterializedProduct(
        slotsInfo.productHandle,
        KernelVocabulary.Configuration.AuSlotsInfo.key,
        slotsInfo.identityHandle,
        null,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        slotsInfo.identityHandle,
        [slotsInfo.productHandle],
      ),
    );
    return slotsInfo;
  }

  createRootController(
    localKey: string,
    definition: CustomElementDefinition,
    rootContainer: Container,
    source: RuntimeRenderingSourceSet,
    expressionWorld: CheckerExpressionTypeWorld,
    typeSystem: TypeSystemProject | null,
    projectKey: string | null,
    resourceDefinitions: ResourceDefinitionIndex | null,
    records: KernelStoreRecord[],
    childContainerEmissions: ContainerChildMaterializationEmission[],
  ): RuntimeControllerFrame {
    const childContainer = this.childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest({
      localKey: `${localKey}:controller:root-container`,
      parent: rootContainer,
      sourceAddressHandle: definition.sourceAddressHandle,
      localName: 'root-custom-element:container',
    }));
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
    this.installOwnedHydrationContext(
      `${localKey}:controller:root`,
      frame,
      null,
      null,
      childContainer,
      source,
      records,
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
    return frame;
  }

  createChildController(
    creation: RuntimeControllerCreationRequest,
    expressionWorld: CheckerExpressionTypeWorld,
    typeSystem: TypeSystemProject | null,
    observerLocator: ObserverLocator,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    childContainerEmissions: ContainerChildMaterializationEmission[],
    auSlotsInfos: AuSlotsInfo[],
    intrinsicEmptyAuSlotsInfo: AuSlotsInfo,
    openSeams: OpenSeam[],
    controllerIssues: RuntimeControllerIssue[],
    readController: (productHandle: ProductHandle) => RuntimeControllerFrame | null,
    measure: RuntimeControllerCreationMeasure = unmeasuredRuntimeControllerCreation,
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
    const auSlotsInfo = this.materializeAuSlotsInfo(
      creation,
      source,
      records,
      auSlotsInfos,
      intrinsicEmptyAuSlotsInfo,
    );
    const childContainer = measure('child-container', () =>
      this.materializeChildControllerContainer(
        creation,
        parentContainer,
        auSlotsInfo,
        measure,
      )
    );
    records.push(...childContainer.records);
    childContainerEmissions.push(childContainer);
    const frame = measure('child-frame', () =>
      this.childControllerFrame(creation, allocation, definition, childContainer, source)
    );
    frame.attachAuSlotsInfo(auSlotsInfo);
    const inheritedHydrationContext = creation.parent.readHydrationContext();
    if (inheritedHydrationContext != null) {
      frame.attachConstructionHydrationContext(inheritedHydrationContext);
      if (creation.creationKind !== RuntimeControllerCreationKind.CustomElement) {
        frame.attachHydrationContext(inheritedHydrationContext);
      }
    }
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
    measure('activation-di-issues', () =>
      this.recordControllerActivationDiIssues(creation, frame, definition, source, records, controllerIssues)
    );
    measure('child-hydration', () => {
      if (creation.creationKind === RuntimeControllerCreationKind.CustomElement) {
        this.installOwnedHydrationContext(
          `${creation.local}:controller`,
          frame,
          creation.instruction,
          inheritedHydrationContext,
          childContainer,
          source,
          records,
        );
      }
      this.recordChildControllerHydration(frame, childContainer);
    });
    measure('observer-setup', () =>
      this.materializeControllerObserverSetup(
        frame,
        definition,
        expressionWorld,
        typeSystem,
        observerLocator,
        source,
        records,
        openSeams,
        controllerIssues,
      )
    );
    measure('au-compose-static-input-issues', () =>
      this.recordAuComposeStaticInputIssues(creation, frame, definition, source, records, controllerIssues, readController)
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
    hydrationContext: RuntimeHydrationContext | null,
    source: RuntimeRenderingSourceSet,
  ): RuntimeControllerFrame {
    const allocation = this.allocate(`${local}:controller`);
    const controller = viewFactory.ownerController;
    const frame = new RuntimeControllerFrame(
      RuntimeControllerCreationKind.SyntheticView,
      allocation.productHandle,
      allocation.identityHandle,
      viewFactory.viewFactory.name == null ? 'synthetic-view' : `${viewFactory.viewFactory.name}:synthetic`,
      viewFactory.viewFactory.container,
      viewFactory.container,
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
    if (hydrationContext != null) {
      frame.attachHydrationContext(hydrationContext);
    }
    frame.finishObserverSetup(RuntimeControllerObserverSetupState.NotApplicable);
    return frame;
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
    const seam = this.recordOpenSeam(
      `${creation.local}:open-controller-container`,
      `Renderer-created controller '${creation.creationKind}' needs runtime child-container materialization, but its parent controller did not carry a modeled container frame.`,
      creation.instruction.sourceAddressHandle,
      source,
      records,
      openSeams,
      [OpenSeamReasonKind.RuntimeControllerContainerOpen],
      KernelVocabulary.Di.OpenChildContainer.key,
    );
    records.push(
      new MaterializationRecord(
        this.store.handles.materialization(`${creation.local}:controller-attempt`),
        creation.instruction.identityHandle,
        [],
        [],
        [seam.handle],
      ),
    );
    return null;
  }

  private materializeChildControllerContainer(
    creation: ClosedRuntimeControllerCreationRequest,
    parentContainer: Container,
    auSlotsInfo: AuSlotsInfo,
    measure: RuntimeControllerCreationMeasure,
  ): ContainerChildMaterializationEmission {
    return this.childContainerMaterializer.materializeChild(
      new ContainerChildMaterializationRequest({
        localKey: `${creation.local}:container`,
        parent: parentContainer,
        sourceAddressHandle: creation.instruction.sourceAddressHandle,
        localName: `${creation.creationKind}:container`,
        contextResolvers: contextResolverSlotsForController(creation, auSlotsInfo),
        contextResolverRecordPolicy: ContainerContextResolverRecordPolicy.ModelOnly,
      }),
      (name, read) => measure(`child-container:${name}`, read),
    );
  }

  private materializeAuSlotsInfo(
    creation: ClosedRuntimeControllerCreationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    auSlotsInfos: AuSlotsInfo[],
    intrinsicEmptyAuSlotsInfo: AuSlotsInfo,
  ): AuSlotsInfo {
    if (!(creation.instruction instanceof HydrateElementInstruction)
      || creation.instruction.projectionInstructionSequences.length === 0) {
      return intrinsicEmptyAuSlotsInfo;
    }
    const local = `${creation.local}:au-slots-info`;
    const instructionCreatesSlotsInfo = new SemanticClaim(
      this.store.handles.claim(`${local}:instruction-creates-au-slots-info`),
      creation.instruction.productHandle,
      KernelVocabulary.Configuration.InstructionCreatesAuSlotsInfo.key,
      this.store.handles.product(local),
      source.provenanceHandle,
    );
    const slotsInfo = new AuSlotsInfo(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      AuSlotsInfoSourceKind.HydrateElementInstruction,
      [...new Set(creation.instruction.projectionInstructionSequences.map((projection) =>
        projection.slotName
      ))],
      creation.instruction.projectionInstructionSequences.map((projection) =>
        new AuSlotsInfoProjection(
          projection.slotName,
          projection.instructionSequenceProductHandle,
          projection.sourceAddressHandle,
          projection.contributors.map((contributor) =>
            contributor.slotNameSourceAddressHandle ?? contributor.node.addressHandle
          ),
        )
      ),
      creation.instruction.sourceAddressHandle,
    );
    records.push(
      new ConfigurationIdentity(
        slotsInfo.identityHandle,
        KernelVocabulary.Configuration.AuSlotsInfo.key,
        creation.instruction.identityHandle,
        slotsInfo.sourceAddressHandle,
        FrameworkIntrinsicDiKey.IAuSlotsInfo,
      ),
      new MaterializedProduct(
        slotsInfo.productHandle,
        KernelVocabulary.Configuration.AuSlotsInfo.key,
        slotsInfo.identityHandle,
        slotsInfo.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        slotsInfo.identityHandle,
        [slotsInfo.productHandle],
        [instructionCreatesSlotsInfo.handle],
      ),
      instructionCreatesSlotsInfo,
    );
    auSlotsInfos.push(slotsInfo);
    return slotsInfo;
  }

  private installOwnedHydrationContext(
    local: string,
    frame: RuntimeControllerFrame,
    instruction: RuntimeControllerInstruction | null,
    parent: RuntimeHydrationContext | null,
    childContainer: ContainerChildMaterializationEmission,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
  ): RuntimeHydrationContext {
    const contextLocal = `${local}:hydration-context`;
    const context = new RuntimeHydrationContext(
      this.store.handles.product(contextLocal),
      this.store.handles.identity(contextLocal),
      frame.toReference(),
      instruction?.productHandle ?? null,
      parent,
      instruction?.sourceAddressHandle ?? frame.sourceAddressHandle,
    );
    const claims = [
      new SemanticClaim(
        this.store.handles.claim(`${contextLocal}:uses-controller`),
        context.productHandle,
        KernelVocabulary.Configuration.HydrationContextUsesController.key,
        frame.productHandle,
        source.provenanceHandle,
      ),
      ...(instruction == null
        ? []
        : [new SemanticClaim(
            this.store.handles.claim(`${contextLocal}:uses-instruction`),
            context.productHandle,
            KernelVocabulary.Configuration.HydrationContextUsesInstruction.key,
            instruction.productHandle,
            source.provenanceHandle,
          )]),
      ...(parent == null
        ? []
        : [new SemanticClaim(
            this.store.handles.claim(`${contextLocal}:has-parent`),
            context.productHandle,
            KernelVocabulary.Configuration.HydrationContextHasParent.key,
            parent.productHandle,
            source.provenanceHandle,
          )]),
    ];
    records.push(
      new ConfigurationIdentity(
        context.identityHandle,
        KernelVocabulary.Configuration.HydrationContext.key,
        parent?.identityHandle ?? null,
        context.sourceAddressHandle,
        FrameworkIntrinsicDiKey.IHydrationContext,
      ),
      new MaterializedProduct(
        context.productHandle,
        KernelVocabulary.Configuration.HydrationContext.key,
        context.identityHandle,
        context.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(contextLocal),
        context.identityHandle,
        [context.productHandle],
        claims.map((claim) => claim.handle),
      ),
      ...claims,
    );
    frame.attachHydrationContext(context);
    const provider = this.childContainerMaterializer.installContextResolver(
      childContainer,
      `${local}:own-hydration-context`,
      new ContainerContextResolverSlotRequest({
        interfaceName: FrameworkIntrinsicDiKey.IHydrationContext,
        sourceAddressHandle: context.sourceAddressHandle,
        ownerIdentityHandle: context.identityHandle,
        instance: new RegistrationValueReference(
          RegistrationValueKind.Instance,
          context.identityHandle,
          context.productHandle,
          context.sourceAddressHandle,
          FrameworkIntrinsicDiKey.IHydrationContext,
        ),
      }),
      source.provenanceHandle,
      ContainerContextResolverRecordPolicy.ModelOnly,
    );
    records.push(...provider.records);
    return context;
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
    frame.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Hydration,
      RuntimeControllerAssemblyStepKind.CreateChildContainer,
      childContainer.container.productHandle,
      childContainer.container.sourceAddressHandle,
      'Renderer-created controller received a runtime child container and hydration context providers.',
    );
  }

  private recordRootControllerHydration(
    frame: RuntimeControllerFrame,
    childContainer: ContainerChildMaterializationEmission,
  ): void {
    frame.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Hydration,
      RuntimeControllerAssemblyStepKind.CreateChildContainer,
      childContainer.container.productHandle,
      childContainer.container.sourceAddressHandle,
      'AppRoot created a runtime child container for the root custom element controller.',
    );
  }

  recordControllerWatchers(
    local: string,
    frame: RuntimeControllerFrame,
    definition: CustomElementDefinition | CustomAttributeDefinition | null,
    expressionWorld: CheckerExpressionTypeWorld,
    typeSystem: TypeSystemProject | null,
    reachability: RuntimeOperationReachability,
  ): void {
    for (const watcher of runtimeWatcherMaterializationsForDefinition(
      this.store,
      this.publication,
      local,
      frame,
      definition,
      expressionWorld,
      typeSystem,
      reachability,
    )) {
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
          null,
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
    frame.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Hydration,
      RuntimeControllerAssemblyStepKind.RegisterDependencies,
      definition.productHandle,
      definition.sourceAddressHandle,
      `Controller container registered ${registered} resource dependency slot(s).`,
    );
  }

  materializeControllerObserverSetup(
    frame: RuntimeControllerFrame,
    definition: CustomElementDefinition | CustomAttributeDefinition | null,
    expressionWorld: CheckerExpressionTypeWorld,
    typeSystem: TypeSystemProject | null,
    observerLocator: ObserverLocator,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    controllerIssues: RuntimeControllerIssue[],
  ): void {
    if (definition == null || definition.bindables.length === 0) {
      frame.finishObserverSetup(RuntimeControllerObserverSetupState.NotApplicable);
      return;
    }

    const targetShape = readCheckerTypeShape(this.publication, definition.target.targetType);
    const typeAccess = new CheckerTypeShapeAccess(this.store, expressionWorld.projector);
    const runtimePresence = (
      propertyName: string,
      nonNullish: boolean,
    ): boolean | null => {
      if (targetShape == null) {
        return null;
      }
      const presence = nonNullish
        ? typeAccess.runtimeNonNullishMemberPresence(
            targetShape,
            propertyName,
            `${frame.productHandle}:observer-setup:callback:${propertyName}`,
          )
        : typeAccess.runtimeMemberPresence(
            targetShape,
            propertyName,
            `${frame.productHandle}:observer-setup:callback:${propertyName}`,
          );
      switch (presence) {
        case CheckerRuntimeMemberPresence.Present:
          return true;
        case CheckerRuntimeMemberPresence.Absent:
          return false;
        case CheckerRuntimeMemberPresence.Open:
          return null;
      }
    };
    const hasPropertyChanged = runtimePresence('propertyChanged', true);
    const hasPropertiesChanged = runtimePresence('propertiesChanged', false);
    let aggregateState = RuntimeControllerObserverSetupState.Complete;
    let setupReachability = RuntimeOperationReachability.Reached;

    for (let index = 0; index < definition.bindables.length; index++) {
      const bindable = definition.bindables[index]!;
      const requiresCoercer = bindableSetterRequiresCoercer(bindable);
      const hasBindableCallback = runtimePresence(bindable.callback, false);
      const requiresCallback = callbackRequirement(
        hasBindableCallback,
        hasPropertyChanged,
        hasPropertiesChanged,
      );
      if (setupReachability === RuntimeOperationReachability.BlockedByOuterFailure) {
        frame.recordObserverSetup(new RuntimeControllerObserverSetup(
          bindable.name,
          bindable.propertyTarget?.identityHandle ?? null,
          null,
          RuntimeControllerObserverSetupOutcome.NotReached,
          requiresCoercer,
          requiresCallback,
          setupReachability,
          bindable.sourceAddressHandle ?? definition.sourceAddressHandle,
          observerSetupProvenanceHandles(bindable, source.provenanceHandle),
          [],
        ));
        continue;
      }
      const lookup = observerLocator.getObserver(new ObserverLocatorLookupRequest(
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
        observerSetupAppTaskBoundary(frame),
      ));
      const openReasons = observerSetupOpenReasons(
        lookup.openReason,
        lookup.supportsCoercer,
        lookup.supportsCallback,
        requiresCoercer,
        requiresCallback,
      );
      let outcome = RuntimeControllerObserverSetupOutcome.Installed;
      if (openReasons.length > 0) {
        outcome = RuntimeControllerObserverSetupOutcome.Open;
        aggregateState = RuntimeControllerObserverSetupState.Open;
      } else if (requiresCoercer && lookup.supportsCoercer === false) {
        outcome = RuntimeControllerObserverSetupOutcome.RejectedCoercer;
        if (setupReachability === RuntimeOperationReachability.Reached) {
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
      } else if (requiresCallback && lookup.supportsCallback === false) {
        outcome = RuntimeControllerObserverSetupOutcome.RejectedCallback;
        if (setupReachability === RuntimeOperationReachability.Reached) {
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
      }

      const setupSourceAddressHandle = bindable.sourceAddressHandle ?? definition.sourceAddressHandle;
      const openSeam = outcome === RuntimeControllerObserverSetupOutcome.Open
        ? controllerObserverSetupOpenSeam(
            this.store,
            `${frame.productHandle}:observer-setup:${index}:${bindable.name}:open`,
            bindable.name,
            setupSourceAddressHandle,
            source.evidenceHandle,
            openReasons,
          )
        : null;
      if (openSeam != null) {
        records.push(openSeam);
        openSeams.push(openSeam);
      }
      frame.recordObserverSetup(new RuntimeControllerObserverSetup(
        bindable.name,
        bindable.propertyTarget?.identityHandle ?? null,
        lookup,
        outcome,
        requiresCoercer,
        requiresCallback,
        setupReachability,
        setupSourceAddressHandle,
        observerSetupProvenanceHandles(bindable, source.provenanceHandle),
        openSeam == null ? [] : [openSeam.handle],
      ));
      if (outcome === RuntimeControllerObserverSetupOutcome.RejectedCoercer
        || outcome === RuntimeControllerObserverSetupOutcome.RejectedCallback) {
        aggregateState = RuntimeControllerObserverSetupState.Failed;
        setupReachability = RuntimeOperationReachability.BlockedByOuterFailure;
      } else if (outcome === RuntimeControllerObserverSetupOutcome.Open) {
        setupReachability = RuntimeOperationReachability.Open;
      }
    }
    frame.finishObserverSetup(aggregateState);
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
    const sites = readControllerActivationViewFactoryResolveSites(this.publication, definition);
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
      const tail = this.publication.readProductDetail(TemplateProductDetails.Instruction, handle);
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
    const instructions = staticSetPropertyInstructions(this.publication, creation.instruction.bindingInstructionProductHandles);
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
    readController: (productHandle: ProductHandle) => RuntimeControllerFrame | null,
  ): void {
    if (!(definition instanceof CustomElementDefinition)
      || definition.name !== AU_COMPOSE_RESOURCE_NAME
      || !(creation.instruction instanceof HydrateElementInstruction)) {
      return;
    }

    creation.instruction.bindableInstructionProductHandles.forEach((handle, index) => {
      const instruction = this.publication.readProductDetail(TemplateProductDetails.Instruction, handle);
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
        readController,
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
    readController: (productHandle: ProductHandle) => RuntimeControllerFrame | null,
  ): void {
    const issue = auComposeComponentLookupIssue(frame, instruction, readController);
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
      instruction.sourceAddressHandle ?? frame.sourceAddressHandle,
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
      const candidate = this.publication.readProductDetail(TemplateProductDetails.Instruction, handle);
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
    const definition = this.publication.readProductDetail(ResourceProductDetails.Definition, productHandle);
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
    reasonKinds: readonly OpenSeamReasonKind[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Instruction.OpenInstruction.key,
  ): OpenSeam {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
      reasonKinds,
    );
    openSeams.push(seam);
    records.push(seam);
    return seam;
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
      message: `Attribute "${instruction.resourceLookupName}" is not registered in the rendering controller container.`,
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
  const position = instructions.find((instruction) => instruction.targetProperty === PortalBindableName.Position) ?? null;
  if (position != null && !isPortalInsertPosition(position.value)) {
    issues.push({
      kind: RuntimeControllerIssueKind.PortalInvalidInsertPosition,
      message: `Invalid portal insertion position "${position.value}".`,
      frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.PortalInvalidInsertPosition,
      instruction: position,
    });
  }

  const strict = instructions.find((instruction) => instruction.targetProperty === PortalBindableName.Strict) ?? null;
  if (strict == null || !staticPortalStrictValue(strict.value)) {
    return issues;
  }

  const target = instructions.find((instruction) => instruction.targetProperty === PortalBindableName.Target) ?? null;
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
  publication: KernelPublicationContext,
  handles: readonly ProductHandle[],
): readonly SetPropertyInstruction[] {
  return handles
    .map((handle) => publication.readProductDetail(TemplateProductDetails.Instruction, handle))
    .filter((instruction): instruction is SetPropertyInstruction => instruction instanceof SetPropertyInstruction);
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
    case AuComposeBindableName.ScopeBehavior:
      return isAuComposeScopeBehavior(instruction.value)
        ? null
        : {
            kind: RuntimeControllerIssueKind.AuComposeInvalidScopeBehavior,
            message: `Invalid au-compose scopeBehavior value "${instruction.value}". Expected "scoped" or "auto".`,
            frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode.AuComposeInvalidScopeBehavior,
          };
    case AuComposeBindableName.FlushMode:
      return isAuComposeFlushMode(instruction.value)
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
  controller: RuntimeControllerFrame,
  instruction: SetPropertyInstruction,
  readController: (productHandle: ProductHandle) => RuntimeControllerFrame | null,
): {
  readonly kind: RuntimeControllerIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode;
} | null {
  if (instruction.targetProperty !== AuComposeBindableName.Component) {
    return null;
  }

  const hydrationControllerHandle = controller.readConstructionHydrationContext()?.controller.productHandle ?? null;
  const hydrationController = hydrationControllerHandle == null ? null : readController(hydrationControllerHandle);
  const lookup = hydrationController?.containerFrame?.find('custom-element', instruction.value) ?? null;
  if (lookup?.state === ContainerLookupState.Hit) {
    return null;
  }
  return {
    kind: RuntimeControllerIssueKind.AuComposeComponentNameNotFound,
    message: `No au-compose custom element named "${instruction.value}" is registered in the construction hydration context container.`,
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

function bindableSetterRequiresCoercer(bindable: BindableDefinition): boolean | null {
  switch (bindable.set.kind) {
    case BindableSetterKind.Default:
      return false;
    case BindableSetterKind.Function:
    case BindableSetterKind.TypeCoercion:
      return true;
    case BindableSetterKind.Open:
      return null;
  }
}

function observerSetupAppTaskBoundary(
  frame: RuntimeControllerFrame,
): AppTaskSlot {
  if (frame.parent == null) {
    return AppTaskSlot.Creating;
  }
  let ancestor: RuntimeControllerFrame | null = frame;
  while (ancestor != null) {
    if (ancestor.creationKind === RuntimeControllerCreationKind.SyntheticView) {
      return AppTaskSlot.Activating;
    }
    ancestor = ancestor.parent;
  }
  return frame.parent.parent == null
    ? AppTaskSlot.Hydrating
    : AppTaskSlot.Hydrated;
}

function callbackRequirement(
  hasBindableCallback: boolean | null,
  hasPropertyChanged: boolean | null,
  hasPropertiesChanged: boolean | null,
): boolean | null {
  if (hasBindableCallback === true || hasPropertyChanged === true || hasPropertiesChanged === true) {
    return true;
  }
  return hasBindableCallback === false && hasPropertyChanged === false && hasPropertiesChanged === false
    ? false
    : null;
}

interface ObserverSetupOpenReason {
  readonly reasonKind: OpenSeamReasonKind;
  readonly summary: string;
}

function observerSetupOpenReasons(
  lookupOpenReason: string | null,
  supportsCoercer: boolean | null,
  supportsCallback: boolean | null,
  requiresCoercer: boolean | null,
  requiresCallback: boolean | null,
): readonly ObserverSetupOpenReason[] {
  const reasons: ObserverSetupOpenReason[] = [];
  if (lookupOpenReason != null) {
    reasons.push({
      reasonKind: OpenSeamReasonKind.BindingObserverSelectionOpen,
      summary: lookupOpenReason,
    });
  }
  if (requiresCoercer == null) {
    reasons.push({
      reasonKind: OpenSeamReasonKind.BindingObserverRequirementOpen,
      summary: 'Bindable setter metadata did not close whether observer coercion is required.',
    });
  } else if (requiresCoercer && lookupOpenReason == null && supportsCoercer == null) {
    reasons.push({
      reasonKind: OpenSeamReasonKind.BindingObserverCapabilityOpen,
      summary: 'The selected observer did not prove whether it supports the required coercer.',
    });
  }
  if (requiresCallback == null) {
    reasons.push({
      reasonKind: OpenSeamReasonKind.BindingObserverRequirementOpen,
      summary: 'Bindable callback and controller callback members did not close whether change notification is required.',
    });
  } else if (requiresCallback && lookupOpenReason == null && supportsCallback == null) {
    reasons.push({
      reasonKind: OpenSeamReasonKind.BindingObserverCapabilityOpen,
      summary: 'The selected observer did not prove whether it supports the required change callback.',
    });
  }
  return reasons;
}

function controllerObserverSetupOpenSeam(
  store: KernelStore,
  local: string,
  bindableName: string,
  sourceAddressHandle: AddressHandle | null,
  evidenceHandle: RuntimeRenderingSourceSet['evidenceHandle'],
  reasons: readonly ObserverSetupOpenReason[],
): OpenSeam {
  const reasonSources: OpenSeamReasonSource[] = reasons.map((reason) => ({
    reasonKind: reason.reasonKind,
    summary: reason.summary,
    addressHandle: sourceAddressHandle,
    evidenceHandle,
  }));
  return new OpenSeam(
    store.handles.openSeam(local),
    KernelVocabulary.Binding.OpenObserverSetup.key,
    `Controller observer setup for bindable '${bindableName}' remained open: ${reasons.map((reason) => reason.summary).join(' ')}`,
    sourceAddressHandle,
    evidenceHandle,
    [...new Set(reasons.map((reason) => reason.reasonKind))].sort(),
    reasonSources,
  );
}

function observerSetupProvenanceHandles(
  bindable: BindableDefinition,
  ownerProvenanceHandle: ProvenanceHandle,
): readonly ProvenanceHandle[] {
  return [...new Set([
    ownerProvenanceHandle,
    readFieldProvenance(bindable.fieldProvenance, 'name'),
    readFieldProvenance(bindable.fieldProvenance, 'set'),
    readFieldProvenance(bindable.fieldProvenance, 'callback'),
  ].filter((handle): handle is ProvenanceHandle => handle != null))];
}

function isClosedControllerCreationRequest(
  creation: RuntimeControllerCreationRequest,
): creation is ClosedRuntimeControllerCreationRequest {
  return creation.parent != null && creation.instruction != null;
}

function contextResolverSlotsForController(
  creation: ClosedRuntimeControllerCreationRequest,
  auSlotsInfo: AuSlotsInfo,
): readonly ContainerContextResolverSlotRequest[] {
  return [
    FrameworkIntrinsicDiKey.INode,
    FrameworkIntrinsicDiKey.IController,
    FrameworkIntrinsicDiKey.IInstruction,
    FrameworkIntrinsicDiKey.IRenderLocation,
    FrameworkIntrinsicDiKey.IViewFactory,
    FrameworkIntrinsicDiKey.IAuSlotsInfo,
  ].map((name) => {
    const sourceAddressHandle = creation.instruction.sourceAddressHandle;
    switch (name) {
      case FrameworkIntrinsicDiKey.IController:
        return new ContainerContextResolverSlotRequest({
          interfaceName: name,
          sourceAddressHandle,
          ownerIdentityHandle: creation.parent.identityHandle,
          instance: new RegistrationValueReference(
            RegistrationValueKind.Instance,
            creation.parent.identityHandle,
            creation.parent.productHandle,
            creation.parent.sourceAddressHandle,
            FrameworkIntrinsicDiKey.IController,
          ),
        });
      case FrameworkIntrinsicDiKey.IInstruction:
        return new ContainerContextResolverSlotRequest({
          interfaceName: name,
          sourceAddressHandle,
          ownerIdentityHandle: creation.instruction.identityHandle,
          instance: new RegistrationValueReference(
            RegistrationValueKind.Instance,
            creation.instruction.identityHandle,
            creation.instruction.productHandle,
            creation.instruction.sourceAddressHandle,
            FrameworkIntrinsicDiKey.IInstruction,
          ),
        });
      case FrameworkIntrinsicDiKey.IAuSlotsInfo:
        return new ContainerContextResolverSlotRequest({
          interfaceName: name,
          sourceAddressHandle,
          ownerIdentityHandle: auSlotsInfo.identityHandle,
          instance: new RegistrationValueReference(
            RegistrationValueKind.Instance,
            auSlotsInfo.identityHandle,
            auSlotsInfo.productHandle,
            auSlotsInfo.sourceAddressHandle,
            FrameworkIntrinsicDiKey.IAuSlotsInfo,
          ),
        });
      default:
        return new ContainerContextResolverSlotRequest({
          interfaceName: name,
          sourceAddressHandle,
        });
    }
  });
}
