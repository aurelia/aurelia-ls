import type { ProjectBootFrame } from '../boot/frames.js';
import type { ContainerConfigurationRequest } from '../di/container-configuration.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverSlotRequest,
  type ContainerChildMaterializationEmission,
} from '../di/container-materializer.js';
import { FrameworkIntrinsicDiKey } from '../di/framework-intrinsic-di-key.js';
import type { Container } from '../di/container.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import { ObservationProductDetails } from '../observation/product-details.js';
import { RuntimeExpressionProductDetails } from '../runtime-expression/product-details.js';
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
import {
  ConfigurationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type {
  KernelStore,
  KernelStoreReadView,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  ComponentAgentModel,
  RouterRealizationStageKind,
  type RouteContextModel,
  type RouteNodeModel,
} from './model.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';
import type { RouteTreeMaterializationProjectResult } from './route-tree-materialization.js';
import { routerProductRecords } from './router-product-records.js';
import {
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
  RuntimeControllerAssemblyStage,
  RuntimeControllerAssemblyStepKind,
} from '../template/runtime-controller.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import { TemplateProductDetails } from '../template/product-details.js';
import {
  runtimeWatcherMaterializationsForDefinition,
} from '../template/runtime-watcher-factory.js';
import {
  runtimeWatcherClaimsForController,
  runtimeWatcherRecordsForController,
} from '../template/runtime-watcher-publication.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';

/** ComponentAgent products created by pre-activation route-tree compilation. */
export class RouteComponentAgentMaterializationProjectResult {
  constructor(
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
    readonly publication: KernelPublicationContext,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store, publication);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    routeTree: RouteTreeMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
    typeSystem: TypeSystemProject,
  ): RouteComponentAgentMaterializationProjectResult {
    const emissions = this.componentAgentEmissions(routeRuntime, routeTree, templates, typeSystem);
    this.publishComponentAgents(project, emissions);
    return new RouteComponentAgentMaterializationProjectResult(
      emissions.map((emission) => emission.componentAgent),
      emissions.flatMap((emission) => emission.controller == null ? [] : [emission.controller]),
    );
  }

  private componentAgentEmissions(
    routeRuntime: RouteRuntimeTopologyProjectResult,
    routeTree: RouteTreeMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
    typeSystem: TypeSystemProject,
  ): readonly ComponentAgentEmission[] {
    const routeContextsByIdentity = routeContextsByIdentityHandle(routeRuntime);
    const compiledTemplateByDefinition = compiledTemplatesByDefinition(templates);
    return routeTree.readRouteNodes().flatMap((routeNode) =>
      componentAgentEmissionForRouteNode(
        this.store,
        this.publication,
        this.childContainerMaterializer,
        routeRuntime,
        routeContextsByIdentity,
        compiledTemplateByDefinition,
        routeNode,
        templates.expressionWorld,
        typeSystem,
      )
    );
  }

  private publishComponentAgents(
    project: ProjectBootFrame,
    emissions: readonly ComponentAgentEmission[],
  ): void {
    const controllers = emissions.flatMap((emission) => emission.controller == null ? [] : [emission.controller]);
    const watchers = controllers.flatMap((controller) => controller.readWatchers());
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(
        emissions.flatMap((emission) => emission.records),
        `router-component-agent:${project.projectKey}`,
      ),
      [
        ...publishProductDetails(
          ConfigurationProductDetails.Controller,
          controllers.map((controller) => controller.toControllerProduct()),
        ),
        ...publishProductDetails(TemplateProductDetails.RuntimeWatcher, watchers),
        ...publishProductDetails(
          RuntimeExpressionProductDetails.AccessUse,
          watchers.flatMap((watcher) => watcher.accessUses),
        ),
        ...publishProductDetails(
          ObservationProductDetails.RuntimeWatcherObservedDependency,
          watchers.flatMap((watcher) => watcher.observedDependencies),
        ),
      ],
    ));
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
  publication: KernelPublicationContext,
  childContainerMaterializer: ContainerChildMaterializer,
  routeRuntime: RouteRuntimeTopologyProjectResult,
  routeContextsByIdentity: ReadonlyMap<IdentityHandle | null, RouteContextModel>,
  compiledTemplateByDefinition: ReadonlyMap<string, ProductHandle>,
  routeNode: RouteNodeModel,
  expressionWorld: CheckerExpressionTypeWorld,
  typeSystem: TypeSystemProject,
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
    publication,
    childContainerMaterializer,
    routeNode,
    routeContext,
    routeContextContainer,
    customElementDefinitionForRouteNode(publication, routeNode),
    compiledTemplateByDefinition.get(routeNode.component?.resolvedProductHandle ?? '') ?? null,
    expressionWorld,
    typeSystem,
  )];
}

function componentAgentEmission(
  store: KernelStore,
  publication: KernelPublicationContext,
  childContainerMaterializer: ContainerChildMaterializer,
  routeNode: RouteNodeModel,
  routeContext: RouteContextModel,
  routeContextContainer: Container | null,
  definition: CustomElementDefinition | null,
  compiledTemplateProductHandle: ProductHandle | null,
  expressionWorld: CheckerExpressionTypeWorld,
  typeSystem: TypeSystemProject,
): ComponentAgentEmission {
  const handles = componentAgentHandles(publication, routeNode);
  const controllerEmission = componentAgentControllerEmission(
    store,
    publication,
    childContainerMaterializer,
    `${handles.local}:controller`,
    routeNode,
    routeContextContainer,
    definition,
    compiledTemplateProductHandle,
    handles.provenanceHandle,
    expressionWorld,
    typeSystem,
  );
  const componentAgent = componentAgentModel(
    handles.productHandle,
    handles.identityHandle,
    handles.sourceAddressHandle,
    routeContext.toReference(),
    routeNode.toReference(),
    routeNode.viewportAgentCandidate,
    controllerEmission?.controller ?? null,
    routeNode,
  );
  return {
    records: recordsForComponentAgent(
      publication,
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
  store: KernelStoreReadView,
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
  publication: KernelPublicationContext,
  childContainerMaterializer: ContainerChildMaterializer,
  local: string,
  routeNode: RouteNodeModel,
  routeContextContainer: Container | null,
  definition: CustomElementDefinition | null,
  compiledTemplateProductHandle: ProductHandle | null,
  provenanceHandle: ProvenanceHandle,
  expressionWorld: CheckerExpressionTypeWorld,
  typeSystem: TypeSystemProject,
): RoutedControllerEmission | null {
  return routeContextContainer == null || definition == null
    ? null
    : routedControllerEmission(
      store,
      publication,
      childContainerMaterializer,
      local,
      routeNode,
      routeContextContainer,
      definition,
      compiledTemplateProductHandle,
      provenanceHandle,
      expressionWorld,
      typeSystem,
    );
}

function componentAgentModel(
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  sourceAddressHandle: RouteNodeModel['sourceAddressHandle'],
  routeContext: ComponentAgentModel['routeContext'],
  routeNodeReference: ComponentAgentModel['routeNode'],
  viewportAgentCandidate: ComponentAgentModel['viewportAgentCandidate'],
  controller: RuntimeControllerFrame | null,
  routeNode: RouteNodeModel,
): ComponentAgentModel {
  return new ComponentAgentModel(
    productHandle,
    identityHandle,
    RouterRealizationStageKind.Planned,
    routeContext,
    routeNodeReference,
    viewportAgentCandidate,
    controller?.productHandle ?? null,
    routeNode.component,
    sourceAddressHandle,
  );
}

function recordsForComponentAgent(
  store: KernelStoreReadView,
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
  publication: KernelPublicationContext,
  childContainerMaterializer: ContainerChildMaterializer,
  local: string,
  routeNode: RouteNodeModel,
  routeContextContainer: Container,
  definition: CustomElementDefinition,
  compiledTemplateProductHandle: ProductHandle | null,
  provenanceHandle: ProvenanceHandle,
  expressionWorld: CheckerExpressionTypeWorld,
  typeSystem: TypeSystemProject,
): RoutedControllerEmission {
  const sourceAddressHandle = routeNode.sourceAddressHandle;
  const childContainer = routedComponentChildContainer(
    childContainerMaterializer,
    `${local}:container`,
    routeNode,
    routeContextContainer,
  );
  const controller = routedControllerFrame(
    publication,
    local,
    definition,
    childContainer,
    sourceAddressHandle,
    provenanceHandle,
  );
  for (const watcher of runtimeWatcherMaterializationsForDefinition(
    store,
    publication,
    local,
    controller,
    definition,
    expressionWorld,
    typeSystem,
  )) {
    controller.addWatcher(watcher);
  }
  recordRoutedControllerHydration(controller, childContainer, sourceAddressHandle);
  const claim = routedControllerCompiledTemplateClaim(publication, local, controller, compiledTemplateProductHandle, provenanceHandle);
  return {
    records: recordsForRoutedController(store, publication, local, childContainer, controller, claim, provenanceHandle),
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
  return childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest({
    localKey: local,
    parent: routeContextContainer,
    sourceAddressHandle,
    localName: `${routeNode.path}:routed-component-container`,
    contextResolvers: [
      new ContainerContextResolverSlotRequest({
        interfaceName: FrameworkIntrinsicDiKey.INode,
        sourceAddressHandle,
      }),
    ],
    configuration: {
      inheritParentResources: true,
      sourceAddressHandle,
    } satisfies ContainerConfigurationRequest,
  }));
}

function routedControllerFrame(
  store: KernelStoreReadView,
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
  controller.recordAssemblyStep(
    RuntimeControllerAssemblyStage.Hydration,
    RuntimeControllerAssemblyStepKind.CreateChildContainer,
    childContainer.container.productHandle,
    sourceAddressHandle,
    'RouteContext._createComponentAgent created a child container with inherited resources for routed component construction.',
  );
}

function routedControllerCompiledTemplateClaim(
  store: KernelStoreReadView,
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
  publication: KernelPublicationContext,
  local: string,
  childContainer: ContainerChildMaterializationEmission,
  controller: RuntimeControllerFrame,
  claim: SemanticClaim | null,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  const watcherClaims = runtimeWatcherClaimsForController(store, local, controller, provenanceHandle);
  const claims = claim == null ? watcherClaims : [claim, ...watcherClaims];
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
      claims.map((claim) => claim.handle),
    ),
    ...runtimeWatcherRecordsForController(store, local, controller, provenanceHandle, watcherClaims),
    ...claims,
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
  publication: KernelPublicationContext,
  routeNode: RouteNodeModel,
): CustomElementDefinition | null {
  const productHandle = routeNode.component?.resolvedProductHandle ?? null;
  if (productHandle == null) {
    return null;
  }
  const definition = publication.readProductDetail(ResourceProductDetails.Definition, productHandle);
  return definition instanceof CustomElementDefinition ? definition : null;
}
