import type { ProjectBootFrame } from '../boot/frames.js';
import type { ContainerConfigurationRequest } from '../di/container-configuration.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverSlotRequest,
  type ContainerChildMaterializationEmission,
} from '../di/container-materializer.js';
import type { Container } from '../di/container.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { SemanticClaim } from '../kernel/claim.js';
import { ConfigurationIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  ComponentAgentModel,
  type RouteContextModel,
  type RouteNodeModel,
} from './model.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';
import type { RouteTreeMaterializationProjectResult } from './route-tree-materialization.js';
import { routerProductRecords } from './router-product-records.js';
import {
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
  RuntimeControllerLifecycleStage,
  RuntimeControllerLifecycleStepKind,
} from '../template/runtime-controller.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';

/** ComponentAgent products created by pre-activation route-tree compilation. */
export class RouteComponentAgentMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly componentAgents: readonly ComponentAgentModel[],
    readonly controllers: readonly RuntimeControllerFrame[],
  ) {}

  readComponentAgents(): readonly ComponentAgentModel[] {
    return this.componentAgents;
  }

  readControllers(): readonly RuntimeControllerFrame[] {
    return this.controllers;
  }
}

/** Materialize ComponentAgent handoff products for transition RouteNodes with routed component controllers. */
export class RouteComponentAgentMaterializationProjectPass {
  private readonly childContainerMaterializer: ContainerChildMaterializer;

  constructor(
    readonly store: KernelStore,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    routeTree: RouteTreeMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
  ): RouteComponentAgentMaterializationProjectResult {
    const emissions = this.componentAgentEmissions(routeRuntime, routeTree, templates);
    this.commitComponentAgentRecords(project, emissions);
    this.publishControllerDetails(emissions);
    return new RouteComponentAgentMaterializationProjectResult(
      project,
      emissions.map((emission) => emission.componentAgent),
      emissions.flatMap((emission) => emission.controller == null ? [] : [emission.controller]),
    );
  }

  private componentAgentEmissions(
    routeRuntime: RouteRuntimeTopologyProjectResult,
    routeTree: RouteTreeMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
  ): readonly ComponentAgentEmission[] {
    const routeContextsByIdentity = routeContextsByIdentityHandle(routeRuntime);
    const compiledTemplateByDefinition = compiledTemplatesByDefinition(templates);
    return routeTree.readRouteNodes().flatMap((routeNode) =>
      componentAgentEmissionForRouteNode(
        this.store,
        this.childContainerMaterializer,
        routeRuntime,
        routeContextsByIdentity,
        compiledTemplateByDefinition,
        routeNode,
      )
    );
  }

  private commitComponentAgentRecords(
    project: ProjectBootFrame,
    emissions: readonly ComponentAgentEmission[],
  ): void {
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `router-component-agent:${project.projectKey}`));
    }
  }

  private publishControllerDetails(
    emissions: readonly ComponentAgentEmission[],
  ): void {
    for (const emission of emissions) {
      if (emission.controller == null) {
        continue;
      }
      this.store.productDetails.add(
        ConfigurationProductDetails.Controller,
        emission.controller.productHandle,
        emission.controller.toControllerProduct(),
      );
    }
  }
}

interface ComponentAgentEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly componentAgent: ComponentAgentModel;
  readonly controller: RuntimeControllerFrame | null;
}

interface RoutedControllerEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly controller: RuntimeControllerFrame;
}

interface ComponentAgentHandles {
  readonly local: string;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly sourceAddressHandle: RouteNodeModel['sourceAddressHandle'];
}

function routeContextsByIdentityHandle(
  routeRuntime: RouteRuntimeTopologyProjectResult,
): ReadonlyMap<IdentityHandle | null, RouteContextModel> {
  return new Map(
    routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
  );
}

function componentAgentEmissionForRouteNode(
  store: KernelStore,
  childContainerMaterializer: ContainerChildMaterializer,
  routeRuntime: RouteRuntimeTopologyProjectResult,
  routeContextsByIdentity: ReadonlyMap<IdentityHandle | null, RouteContextModel>,
  compiledTemplateByDefinition: ReadonlyMap<string, ProductHandle>,
  routeNode: RouteNodeModel,
): readonly ComponentAgentEmission[] {
  if (routeNode.recognizedRoute == null) {
    return [];
  }
  const routeContextIdentity = routeNode.routeContext.identityHandle;
  const routeContext = routeContextIdentity == null
    ? null
    : routeContextsByIdentity.get(routeContextIdentity) ?? null;
  if (routeContext == null) {
    return [];
  }
  const routeContextContainer = routeRuntime.containerForRouteContext(routeContext.identityHandle);
  return [componentAgentEmission(
    store,
    childContainerMaterializer,
    routeNode,
    routeContext,
    routeContextContainer,
    customElementDefinitionForRouteNode(store, routeNode),
    compiledTemplateByDefinition.get(routeNode.component?.resolvedProductHandle ?? '') ?? null,
  )];
}

function componentAgentEmission(
  store: KernelStore,
  childContainerMaterializer: ContainerChildMaterializer,
  routeNode: RouteNodeModel,
  routeContext: RouteContextModel,
  routeContextContainer: Container | null,
  definition: CustomElementDefinition | null,
  compiledTemplateProductHandle: ProductHandle | null,
): ComponentAgentEmission {
  const handles = componentAgentHandles(store, routeNode);
  const controllerEmission = componentAgentControllerEmission(
    store,
    childContainerMaterializer,
    `${handles.local}:controller`,
    routeNode,
    routeContextContainer,
    definition,
    compiledTemplateProductHandle,
    handles.provenanceHandle,
  );
  const componentAgent = componentAgentModel(
    handles.productHandle,
    handles.identityHandle,
    handles.sourceAddressHandle,
    routeContext.toReference(),
    routeNode.toReference(),
    routeContext.viewportAgent,
    controllerEmission?.controller ?? null,
    routeNode,
  );
  return {
    records: recordsForComponentAgent(
      store,
      handles.local,
      componentAgent,
      routeContext,
      routeNode,
      controllerEmission,
      handles.evidenceHandle,
      handles.provenanceHandle,
    ),
    componentAgent,
    controller: controllerEmission?.controller ?? null,
  };
}

function componentAgentHandles(
  store: KernelStore,
  routeNode: RouteNodeModel,
): ComponentAgentHandles {
  const local = `router-component-agent:${routeNode.identityHandle}`;
  return {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: store.handles.product(local),
    identityHandle: store.handles.identity(local),
    sourceAddressHandle: routeNode.sourceAddressHandle,
  };
}

function componentAgentControllerEmission(
  store: KernelStore,
  childContainerMaterializer: ContainerChildMaterializer,
  local: string,
  routeNode: RouteNodeModel,
  routeContextContainer: Container | null,
  definition: CustomElementDefinition | null,
  compiledTemplateProductHandle: ProductHandle | null,
  provenanceHandle: ProvenanceHandle,
): RoutedControllerEmission | null {
  return routeContextContainer == null || definition == null
    ? null
    : routedControllerEmission(
      store,
      childContainerMaterializer,
      local,
      routeNode,
      routeContextContainer,
      definition,
      compiledTemplateProductHandle,
      provenanceHandle,
    );
}

function componentAgentModel(
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  sourceAddressHandle: RouteNodeModel['sourceAddressHandle'],
  routeContext: ComponentAgentModel['routeContext'],
  routeNodeReference: ComponentAgentModel['routeNode'],
  viewportAgent: ComponentAgentModel['viewportAgent'],
  controller: RuntimeControllerFrame | null,
  routeNode: RouteNodeModel,
): ComponentAgentModel {
  return new ComponentAgentModel(
    productHandle,
    identityHandle,
    routeContext,
    routeNodeReference,
    viewportAgent,
    controller?.productHandle ?? null,
    routeNode.component,
    sourceAddressHandle,
  );
}

function recordsForComponentAgent(
  store: KernelStore,
  local: string,
  componentAgent: ComponentAgentModel,
  routeContext: RouteContextModel,
  routeNode: RouteNodeModel,
  controllerEmission: RoutedControllerEmission | null,
  evidenceHandle: EvidenceHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    ...(controllerEmission?.records ?? []),
    ...routerProductRecords(store, {
      local,
      productHandle: componentAgent.productHandle,
      identityHandle: componentAgent.identityHandle,
      productKindKey: KernelVocabulary.Router.ComponentAgent.key,
      ownerHandle: routeNode.identityHandle,
      materializationOwnerHandle: routeNode.identityHandle,
      materializationProductHandles: controllerEmission == null
        ? [componentAgent.productHandle]
        : [componentAgent.productHandle, controllerEmission.controller.productHandle],
      sourceAddressHandle: componentAgent.sourceAddressHandle,
      localName: routeContext.localName,
      provenanceHandle,
      evidenceHandle,
      evidenceKind: EvidenceKind.SemanticObservation,
      evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
      evidenceSummary: 'RouteContext._createComponentAgent handoff materialized for a transition RouteNode before lifecycle execution.',
    }),
  ];
}

function routedControllerEmission(
  store: KernelStore,
  childContainerMaterializer: ContainerChildMaterializer,
  local: string,
  routeNode: RouteNodeModel,
  routeContextContainer: Container,
  definition: CustomElementDefinition,
  compiledTemplateProductHandle: ProductHandle | null,
  provenanceHandle: ProvenanceHandle,
): RoutedControllerEmission {
  const sourceAddressHandle = routeNode.sourceAddressHandle;
  const childContainer = routedComponentChildContainer(
    childContainerMaterializer,
    `${local}:container`,
    routeNode,
    routeContextContainer,
  );
  const controller = routedControllerFrame(
    store,
    local,
    definition,
    childContainer,
    sourceAddressHandle,
    provenanceHandle,
  );
  recordRoutedControllerHydration(controller, childContainer, sourceAddressHandle);
  const claim = routedControllerCompiledTemplateClaim(store, local, controller, compiledTemplateProductHandle, provenanceHandle);
  return {
    records: recordsForRoutedController(store, local, childContainer, controller, claim, provenanceHandle),
    controller,
  };
}

function routedComponentChildContainer(
  childContainerMaterializer: ContainerChildMaterializer,
  local: string,
  routeNode: RouteNodeModel,
  routeContextContainer: Container,
): ContainerChildMaterializationEmission {
  const sourceAddressHandle = routeNode.sourceAddressHandle;
  return childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest(
    local,
    routeContextContainer,
    sourceAddressHandle,
    `${routeNode.path}:routed-component-container`,
    [
      new ContainerContextResolverSlotRequest('INode', sourceAddressHandle),
    ],
    {
      inheritParentResources: true,
      sourceAddressHandle,
    } satisfies ContainerConfigurationRequest,
  ));
}

function routedControllerFrame(
  store: KernelStore,
  local: string,
  definition: CustomElementDefinition,
  childContainer: ContainerChildMaterializationEmission,
  sourceAddressHandle: RouteNodeModel['sourceAddressHandle'],
  provenanceHandle: ProvenanceHandle,
): RuntimeControllerFrame {
  return new RuntimeControllerFrame(
    RuntimeControllerCreationKind.RoutedCustomElement,
    store.handles.product(local),
    store.handles.identity(local),
    definition.name,
    childContainer.container.toReference(),
    childContainer.container,
    definition.productHandle,
    definition.target,
    null,
    null,
    null,
    null,
    definition.strict,
    sourceAddressHandle,
    provenanceHandle,
  );
}

function recordRoutedControllerHydration(
  controller: RuntimeControllerFrame,
  childContainer: ContainerChildMaterializationEmission,
  sourceAddressHandle: RouteNodeModel['sourceAddressHandle'],
): void {
  controller.recordLifecycleStep(
    RuntimeControllerLifecycleStage.Hydration,
    RuntimeControllerLifecycleStepKind.CreateChildContainer,
    childContainer.container.productHandle,
    sourceAddressHandle,
    'RouteContext._createComponentAgent created a child container with inherited resources for routed component construction.',
  );
}

function routedControllerCompiledTemplateClaim(
  store: KernelStore,
  local: string,
  controller: RuntimeControllerFrame,
  compiledTemplateProductHandle: ProductHandle | null,
  provenanceHandle: ProvenanceHandle,
): SemanticClaim | null {
  return compiledTemplateProductHandle == null
    ? null
    : new SemanticClaim(
      store.handles.claim(`${local}:uses-compiled-template`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerUsesCompiledTemplate.key,
      compiledTemplateProductHandle,
      provenanceHandle,
    );
}

function recordsForRoutedController(
  store: KernelStore,
  local: string,
  childContainer: ContainerChildMaterializationEmission,
  controller: RuntimeControllerFrame,
  claim: SemanticClaim | null,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    ...childContainer.records,
    new ConfigurationIdentity(
      controller.identityHandle,
      KernelVocabulary.Configuration.Controller.key,
      null,
      controller.sourceAddressHandle,
      controller.name,
    ),
    new MaterializedProduct(
      controller.productHandle,
      KernelVocabulary.Configuration.Controller.key,
      controller.identityHandle,
      controller.sourceAddressHandle,
      provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(`${local}:runtime-controller`),
      controller.identityHandle,
      [controller.productHandle],
      claim == null ? [] : [claim.handle],
    ),
    ...(claim == null ? [] : [claim]),
  ];
}

function compiledTemplatesByDefinition(
  templates: TemplateCompilationProjectEmission,
): ReadonlyMap<string, ProductHandle> {
  const compiledTemplates = new Map<string, ProductHandle>();
  for (const resource of templates.resources) {
    const definitionProductHandle = resource.compilation.definition.productHandle;
    const compiledTemplateProductHandle = resource.compilation.compiledTemplate.compiledTemplate.productHandle;
    if (definitionProductHandle == null || compiledTemplates.has(definitionProductHandle)) {
      continue;
    }
    compiledTemplates.set(definitionProductHandle, compiledTemplateProductHandle);
  }
  return compiledTemplates;
}

function customElementDefinitionForRouteNode(
  store: KernelStore,
  routeNode: RouteNodeModel,
): CustomElementDefinition | null {
  const productHandle = routeNode.component?.resolvedProductHandle ?? null;
  if (productHandle == null) {
    return null;
  }
  const definition = store.productDetails.read(ResourceProductDetails.Definition, productHandle);
  return definition instanceof CustomElementDefinition ? definition : null;
}
