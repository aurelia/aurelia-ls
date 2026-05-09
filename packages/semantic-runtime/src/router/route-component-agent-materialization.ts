import type { ProjectBootFrame } from '../boot/frames.js';
import type { ContainerConfigurationRequest } from '../di/container-configuration.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverSlotRequest,
} from '../di/container-materializer.js';
import type { Container } from '../di/container.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  ConfigurationIdentity,
  RouterIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
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
  type ComponentAgentField,
  type RouteContextModel,
  type RouteNodeModel,
} from './model.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';
import type { RouteTreeMaterializationProjectResult } from './route-tree-materialization.js';
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
    const routeContextsByIdentity = new Map(
      routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
    );
    const compiledTemplateByDefinition = compiledTemplatesByDefinition(templates);
    const emissions = routeTree.readRouteNodes().flatMap((routeNode) => {
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
        this.store,
        this.childContainerMaterializer,
        routeNode,
        routeContext,
        routeContextContainer,
        customElementDefinitionForRouteNode(this.store, routeNode),
        compiledTemplateByDefinition.get(routeNode.component?.resolvedProductHandle ?? '') ?? null,
      )];
    });
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `router-component-agent:${project.projectKey}`));
    }
    for (const emission of emissions) {
      if (emission.controller != null) {
        this.store.productDetails.add(
          ConfigurationProductDetails.Controller,
          emission.controller.productHandle,
          emission.controller.toControllerProduct(),
        );
      }
    }
    return new RouteComponentAgentMaterializationProjectResult(
      project,
      emissions.map((emission) => emission.componentAgent),
      emissions.flatMap((emission) => emission.controller == null ? [] : [emission.controller]),
    );
  }
}

class ComponentAgentEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly componentAgent: ComponentAgentModel,
    readonly controller: RuntimeControllerFrame | null,
  ) {}
}

class RoutedControllerEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly controller: RuntimeControllerFrame,
  ) {}
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
  const local = `router-component-agent:${routeNode.identityHandle}`;
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const productHandle = store.handles.product(local);
  const identityHandle = store.handles.identity(local);
  const sourceAddressHandle = routeNode.sourceAddressHandle;
  const controllerEmission = routeContextContainer == null || definition == null
    ? null
    : routedControllerEmission(
      store,
      childContainerMaterializer,
      `${local}:controller`,
      routeNode,
      routeContextContainer,
      definition,
      compiledTemplateProductHandle,
      provenanceHandle,
    );
  const componentAgent = new ComponentAgentModel(
    productHandle,
    identityHandle,
    routeContext.toReference(),
    routeNode.toReference(),
    routeContext.viewportAgent,
    controllerEmission?.controller.productHandle ?? null,
    routeNode.component,
    sourceAddressHandle,
    componentAgentFieldProvenance(provenanceHandle, routeContext, controllerEmission?.controller ?? null, routeNode),
  );
  return new ComponentAgentEmission(
    [
      ...(controllerEmission?.records ?? []),
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
        'RouteContext._createComponentAgent handoff materialized for a transition RouteNode before lifecycle execution.',
        sourceAddressHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      new RouterIdentity(
        identityHandle,
        KernelVocabulary.Router.ComponentAgent.key,
        routeNode.identityHandle,
        sourceAddressHandle,
        routeContext.localName,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Router.ComponentAgent.key,
        identityHandle,
        sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        store.handles.materialization(local),
        routeNode.identityHandle,
        controllerEmission == null
          ? [productHandle]
          : [productHandle, controllerEmission.controller.productHandle],
        [],
        [],
      ),
    ],
    componentAgent,
    controllerEmission?.controller ?? null,
  );
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
  const childContainer = childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest(
    `${local}:container`,
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
  const productHandle = store.handles.product(local);
  const identityHandle = store.handles.identity(local);
  const controller = new RuntimeControllerFrame(
    RuntimeControllerCreationKind.RoutedCustomElement,
    productHandle,
    identityHandle,
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
  controller.recordLifecycleStep(
    RuntimeControllerLifecycleStage.Hydration,
    RuntimeControllerLifecycleStepKind.CreateChildContainer,
    childContainer.container.productHandle,
    sourceAddressHandle,
    'RouteContext._createComponentAgent created a child container with inherited resources for routed component construction.',
  );
  const claim = compiledTemplateProductHandle == null
    ? null
    : new SemanticClaim(
      store.handles.claim(`${local}:uses-compiled-template`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerUsesCompiledTemplate.key,
      compiledTemplateProductHandle,
      provenanceHandle,
    );
  return new RoutedControllerEmission(
    [
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
    ],
    controller,
  );
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

function componentAgentFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  routeContext: RouteContextModel,
  controller: RuntimeControllerFrame | null,
  routeNode: RouteNodeModel,
): readonly FieldProvenance<ComponentAgentField>[] {
  return compactFieldProvenance<ComponentAgentField>([
    new FieldProvenance('routeContext', provenanceHandle),
    new FieldProvenance('routeNode', provenanceHandle),
    routeContext.viewportAgent == null ? null : new FieldProvenance('viewportAgent', provenanceHandle),
    controller == null ? null : new FieldProvenance('controller', provenanceHandle),
    routeNode.component == null ? null : new FieldProvenance('component', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}
