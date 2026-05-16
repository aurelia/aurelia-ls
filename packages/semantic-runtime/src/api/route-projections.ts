import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  ComponentAgentModel,
  ConfigurableRouteModel,
  EndpointModel,
  RouteRecognizerIssueModel,
  RouterIssueModel,
  RecognizedRouteModel,
  RouteRecognizerReference,
  RouteContextModel,
  RouteNodeModel,
  RouteTreeModel,
  RouteableComponentReference,
  RouteConfigModel,
  RouteConfigReference,
  RouterReference,
  RouterOptionsModel,
  StateModel,
  TypedNavigationInstructionModel,
  ViewportAgentModel,
  ViewportCustomElementModel,
  ViewportInstructionModel,
  ViewportInstructionTreeModel,
} from '../router/model.js';
import {
  describeAddress,
  type SemanticSourceReference,
} from './source-reference.js';
import type {
  SemanticRouteConfigComponentRow,
  SemanticRouteConfigReferenceRow,
  SemanticComponentAgentRow,
  SemanticRouteContextRow,
  SemanticRouteConfigRow,
  SemanticRouteEndpointRow,
  SemanticRecognizedRouteRow,
  SemanticRouteNodeRow,
  SemanticRoutePatternRow,
  SemanticRouteRecognizerIssueRow,
  SemanticRouteRecognizerStateRow,
  SemanticRouteRecognizerIssuesResult,
  SemanticRouterIssueRow,
  SemanticRouterIssuesResult,
  SemanticRouteTreeRow,
  SemanticRouterProductReferenceRow,
  SemanticRouterViewportRow,
  SemanticRouterOptionsRow,
  SemanticRouteRecognizerReferenceRow,
  SemanticTypedNavigationInstructionRow,
  SemanticViewportInstructionComponentRow,
  SemanticViewportInstructionRow,
  SemanticViewportInstructionTreeRow,
  SemanticViewportAgentRow,
} from './contracts.js';

export function readRouterOptionsRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouterOptionsRow[] {
  return emission.routerOptions.readRouterOptions()
    .map((options) => routerOptionsRow(emission, store, options, handles))
    .sort((left, right) =>
      `${left.useEagerLoading}:${left.useUrlFragmentHash}:${left.source?.label ?? ''}`
        .localeCompare(`${right.useEagerLoading}:${right.useUrlFragmentHash}:${right.source?.label ?? ''}`)
    );
}

export function readRouteConfigRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouteConfigRow[] {
  return emission.routes.readRouteConfigs()
    .map((routeConfig) => routeConfigRow(emission, store, routeConfig, handles))
    .sort((left, right) =>
      `${left.routeKind}:${left.id ?? ''}:${left.paths.join('|')}:${left.source?.label ?? ''}`
        .localeCompare(`${right.routeKind}:${right.id ?? ''}:${right.paths.join('|')}:${right.source?.label ?? ''}`)
    );
}

export function readRouteContextRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouteContextRow[] {
  return emission.routeRuntimeTopology.readRouteContexts()
    .map((routeContext) => routeContextRow(emission, store, routeContext, handles))
    .sort((left, right) =>
      `${left.label ?? ''}:${left.parentLabel ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.label ?? ''}:${right.parentLabel ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readRouterViewportRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouterViewportRow[] {
  return emission.routeRuntimeTopology.readViewports()
    .map((viewport) => routerViewportRow(emission, store, viewport, handles))
    .sort((left, right) =>
      `${left.routeContext?.label ?? ''}:${left.name}:${left.source?.label ?? ''}`
        .localeCompare(`${right.routeContext?.label ?? ''}:${right.name}:${right.source?.label ?? ''}`)
    );
}

export function readViewportAgentRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticViewportAgentRow[] {
  return emission.routeRuntimeTopology.readViewportAgents()
    .map((agent) => viewportAgentRow(emission, store, agent, handles))
    .sort((left, right) =>
      `${left.routeContext?.label ?? ''}:${left.viewport.name ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.routeContext?.label ?? ''}:${right.viewport.name ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readComponentAgentRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticComponentAgentRow[] {
  return emission.routeComponentAgents.readComponentAgents()
    .map((agent) => componentAgentRow(emission, store, agent, handles))
    .sort((left, right) =>
      `${left.routeContext.label ?? ''}:${left.routeNode.label ?? ''}:${left.component?.name ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.routeContext.label ?? ''}:${right.routeNode.label ?? ''}:${right.component?.name ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readRouteTreeRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouteTreeRow[] {
  return emission.routeTree.readRouteTrees()
    .map((routeTree) => routeTreeRow(emission, store, routeTree, handles))
    .sort((left, right) =>
      `${left.rootNodeLabel ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.rootNodeLabel ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readRouteNodeRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouteNodeRow[] {
  return emission.routeTree.readRouteNodes()
    .map((routeNode) => routeNodeRow(emission, store, routeNode, handles))
    .sort((left, right) =>
      `${left.routeContext.label ?? ''}:${left.path}:${left.source?.label ?? ''}`
        .localeCompare(`${right.routeContext.label ?? ''}:${right.path}:${right.source?.label ?? ''}`)
    );
}

export function readRoutePatternRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRoutePatternRow[] {
  return emission.routeRecognizer.readConfigurableRoutes()
    .map((routePattern) => routePatternRow(emission, store, routePattern, handles))
    .sort((left, right) =>
      `${left.recognizerPath}:${left.routeConfig.id ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.recognizerPath}:${right.routeConfig.id ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readRouteEndpointRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouteEndpointRow[] {
  const configurableRoutesByIdentity = new Map(
    emission.routeRecognizer.readConfigurableRoutes().map((routePattern) => [routePattern.identityHandle, routePattern] as const),
  );
  return emission.routeRecognizer.readEndpoints()
    .map((endpoint) =>
      routeEndpointRow(
        emission,
        store,
        endpoint,
        requiredConfigurableRoute(endpoint, configurableRoutesByIdentity),
        handles,
      )
    )
    .sort((left, right) =>
      `${left.path}:${left.isResidual}:${left.configurableRoute.path}:${left.source?.label ?? ''}`
        .localeCompare(`${right.path}:${right.isResidual}:${right.configurableRoute.path}:${right.source?.label ?? ''}`)
    );
}

export function readRouteRecognizerStateRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRouteRecognizerStateRow[] {
  const endpointsByIdentity = new Map(
    emission.routeRecognizer.readEndpoints().map((endpoint) => [endpoint.identityHandle, endpoint] as const),
  );
  return emission.routeRecognizer.readStates()
    .map((state) => routeRecognizerStateRow(emission, store, state, endpointsByIdentity, handles))
    .sort((left, right) =>
      `${left.stateKind}:${left.length}:${left.value}:${left.source?.label ?? ''}`
        .localeCompare(`${right.stateKind}:${right.length}:${right.value}:${right.source?.label ?? ''}`)
    );
}

export function readRouteRecognizerIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticRouteRecognizerIssuesResult['rows'] {
  return emission.routeRecognizer.readIssues()
    .map((issue) => routeRecognizerIssueRow(emission, store, issue, handles))
    .sort((left, right) =>
      `${left.issueKind}:${left.path ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.issueKind}:${right.path ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readRouterIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticRouterIssuesResult['rows'] {
  return [
    ...emission.routes.readIssues(),
    ...emission.routeInstructions.readIssues(),
    ...emission.routeRecognition.readIssues(),
    ...emission.routeTree.readIssues(),
  ]
    .map((issue) => routerIssueRow(emission, store, issue, handles))
    .sort((left, right) =>
      `${left.phase}:${left.issueKind}:${left.path ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.phase}:${right.issueKind}:${right.path ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readRecognizedRouteRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRecognizedRouteRow[] {
  const endpointsByIdentity = new Map(
    emission.routeRecognizer.readEndpoints().map((endpoint) => [endpoint.identityHandle, endpoint] as const),
  );
  return emission.routeRecognition.readRecognizedRoutes()
    .map((recognizedRoute) => recognizedRouteRow(emission, store, recognizedRoute, endpointsByIdentity, handles))
    .sort((left, right) =>
      `${left.path}:${left.residue ?? ''}:${left.endpoint.path ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.path}:${right.residue ?? ''}:${right.endpoint.path ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readTypedNavigationInstructionRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticTypedNavigationInstructionRow[] {
  return emission.routeInstructions.readTypedNavigationInstructions()
    .map((instruction) => typedNavigationInstructionRow(emission, store, instruction, handles))
    .sort((left, right) =>
      `${left.instructionKind}:${left.value ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.instructionKind}:${right.value ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readViewportInstructionRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticViewportInstructionRow[] {
  const typedInstructionsByIdentity = new Map(
    emission.routeInstructions.readTypedNavigationInstructions()
      .map((instruction) => [instruction.identityHandle, instruction] as const),
  );
  return emission.routeInstructions.readViewportInstructions()
    .map((instruction) =>
      viewportInstructionRow(emission, store, instruction, typedInstructionsByIdentity, handles)
    )
    .sort((left, right) =>
      `${left.component?.routerKind ?? ''}:${left.component?.value ?? ''}:${left.viewport ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.component?.routerKind ?? ''}:${right.component?.value ?? ''}:${right.viewport ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readViewportInstructionTreeRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticViewportInstructionTreeRow[] {
  return emission.routeInstructions.readViewportInstructionTrees()
    .map((instructionTree) => viewportInstructionTreeRow(emission, store, instructionTree, handles))
    .sort((left, right) =>
      `${left.routeContext?.label ?? ''}:${left.instructionCount}:${left.source?.label ?? ''}`
        .localeCompare(`${right.routeContext?.label ?? ''}:${right.instructionCount}:${right.source?.label ?? ''}`)
    );
}

function routerOptionsRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  options: RouterOptionsModel,
  handles: boolean,
): SemanticRouterOptionsRow {
  return {
    projectKey: emission.project.projectKey,
    basePath: options.basePath,
    useUrlFragmentHash: options.useUrlFragmentHash,
    useHref: options.useHref,
    historyStrategy: options.historyStrategy,
    useNavigationModel: options.useNavigationModel,
    activeClass: options.activeClass,
    restorePreviousRouteTreeOnError: options.restorePreviousRouteTreeOnError,
    treatQueryAsParameters: options.treatQueryAsParameters,
    useEagerLoading: options.useEagerLoading,
    source: describeAddress(store, options.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: options.productHandle,
        identityHandle: options.identityHandle,
        sourceAddressHandle: options.sourceAddressHandle,
      },
    } : {}),
  };
}

function routeConfigRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  routeConfig: RouteConfigModel,
  handles: boolean,
): SemanticRouteConfigRow {
  return {
    projectKey: emission.project.projectKey,
    routeKind: routeConfig.routeKind,
    originKind: routeConfig.originKind,
    valueKind: routeConfig.valueKind,
    id: routeConfig.id,
    paths: routeConfig.paths,
    title: routeConfig.title,
    component: routeableComponentRow(store, routeConfig.component, handles),
    redirectTo: routeConfig.redirectTo,
    caseSensitive: routeConfig.caseSensitive,
    transitionPlan: routeConfig.transitionPlan,
    viewport: routeConfig.viewport,
    hasData: routeConfig.hasData,
    childRouteCount: routeConfig.childRoutes.length,
    fallback: routeableComponentRow(store, routeConfig.fallback, handles),
    nav: routeConfig.nav,
    source: describeAddress(store, routeConfig.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: routeConfig.productHandle,
        identityHandle: routeConfig.identityHandle,
        sourceAddressHandle: routeConfig.sourceAddressHandle,
      },
    } : {}),
  };
}

function typedNavigationInstructionRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  instruction: TypedNavigationInstructionModel,
  handles: boolean,
): SemanticTypedNavigationInstructionRow {
  return {
    projectKey: emission.project.projectKey,
    instructionKind: instruction.instructionKind,
    value: instruction.value,
    component: routerProductReferenceRow(store, instruction.component),
    source: describeAddress(store, instruction.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: instruction.productHandle,
        identityHandle: instruction.identityHandle,
        componentProductHandle: instruction.component?.productHandle ?? null,
        componentIdentityHandle: instruction.component?.identityHandle ?? null,
        sourceAddressHandle: instruction.sourceAddressHandle,
      },
    } : {}),
  };
}

function viewportInstructionRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  instruction: ViewportInstructionModel,
  typedInstructionsByIdentity: ReadonlyMap<TypedNavigationInstructionModel['identityHandle'], TypedNavigationInstructionModel>,
  handles: boolean,
): SemanticViewportInstructionRow {
  return {
    projectKey: emission.project.projectKey,
    component: viewportInstructionComponentRow(store, instruction.component, typedInstructionsByIdentity),
    viewport: instruction.viewport,
    childCount: instruction.children.length,
    hasParameters: instruction.parameterCount > 0 || instruction.parametersProductHandle != null,
    parameterCount: instruction.parameterCount,
    open: instruction.open,
    close: instruction.close,
    recognizedRoute: routeRecognizerReferenceRow(store, instruction.recognizedRoute),
    source: describeAddress(store, instruction.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: instruction.productHandle,
        identityHandle: instruction.identityHandle,
        componentProductHandle: instruction.component?.productHandle ?? null,
        componentIdentityHandle: instruction.component?.identityHandle ?? null,
        parametersProductHandle: instruction.parametersProductHandle,
        recognizedRouteProductHandle: instruction.recognizedRoute?.productHandle ?? null,
        recognizedRouteIdentityHandle: instruction.recognizedRoute?.identityHandle ?? null,
        sourceAddressHandle: instruction.sourceAddressHandle,
      },
    } : {}),
  };
}

function viewportInstructionTreeRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  instructionTree: ViewportInstructionTreeModel,
  handles: boolean,
): SemanticViewportInstructionTreeRow {
  return {
    projectKey: emission.project.projectKey,
    routeContext: instructionTree.routeContext == null
      ? null
      : {
        label: instructionTree.routeContext.localName,
        source: describeAddress(store, instructionTree.routeContext.sourceAddressHandle),
      },
    instructionCount: instructionTree.instructions.length,
    hasOptions: instructionTree.options != null,
    isAbsolute: instructionTree.isAbsolute,
    queryParamCount: instructionTree.queryParamCount,
    fragment: instructionTree.fragment,
    source: describeAddress(store, instructionTree.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: instructionTree.productHandle,
        identityHandle: instructionTree.identityHandle,
        routeContextProductHandle: instructionTree.routeContext?.productHandle ?? null,
        routeContextIdentityHandle: instructionTree.routeContext?.identityHandle ?? null,
        instructionProductHandles: instructionTree.instructions
          .flatMap((instruction) => instruction.productHandle == null ? [] : [instruction.productHandle]),
        instructionIdentityHandles: instructionTree.instructions
          .flatMap((instruction) => instruction.identityHandle == null ? [] : [instruction.identityHandle]),
        optionsProductHandle: instructionTree.options?.productHandle ?? null,
        optionsIdentityHandle: instructionTree.options?.identityHandle ?? null,
        sourceAddressHandle: instructionTree.sourceAddressHandle,
      },
    } : {}),
  };
}

function routeTreeRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  routeTree: RouteTreeModel,
  handles: boolean,
): SemanticRouteTreeRow {
  return {
    projectKey: emission.project.projectKey,
    rootNodeLabel: routeTree.rootNode?.localName ?? null,
    instructionTree: routerProductReferenceRow(store, routeTree.instructionTree),
    hasOptions: routeTree.options != null,
    nodeCount: routeTree.nodeCount,
    queryParamCount: routeTree.queryParamCount,
    fragment: routeTree.fragment,
    source: describeAddress(store, routeTree.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: routeTree.productHandle,
        identityHandle: routeTree.identityHandle,
        rootNodeProductHandle: routeTree.rootNode?.productHandle ?? null,
        rootNodeIdentityHandle: routeTree.rootNode?.identityHandle ?? null,
        instructionTreeProductHandle: routeTree.instructionTree?.productHandle ?? null,
        instructionTreeIdentityHandle: routeTree.instructionTree?.identityHandle ?? null,
        optionsProductHandle: routeTree.options?.productHandle ?? null,
        optionsIdentityHandle: routeTree.options?.identityHandle ?? null,
        sourceAddressHandle: routeTree.sourceAddressHandle,
      },
    } : {}),
  };
}

function routeNodeRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  routeNode: RouteNodeModel,
  handles: boolean,
): SemanticRouteNodeRow {
  return {
    projectKey: emission.project.projectKey,
    path: routeNode.path,
    finalPath: routeNode.finalPath,
    childCount: routeNode.children.length,
    instruction: routerProductReferenceRow(store, routeNode.instruction),
    originalInstruction: routerProductReferenceRow(store, routeNode.originalInstruction),
    recognizedRoute: routeRecognizerReferenceRow(store, routeNode.recognizedRoute),
    parameterCount: routeNode.parameterCount,
    queryParamCount: routeNode.queryParamCount,
    fragment: routeNode.fragment,
    hasData: routeNode.hasData,
    viewport: routeNode.viewport,
    residueInstructionCount: routeNode.residueInstructionCount,
    routeContext: {
      label: routeNode.routeContext.localName,
      source: describeAddress(store, routeNode.routeContext.sourceAddressHandle),
    },
    routeConfig: routeNode.config == null
      ? null
      : {
        routeKind: routeNode.config.routeKind,
        id: routeNode.config.localName,
        source: describeAddress(store, routeNode.config.sourceAddressHandle),
      },
    parentLabel: routeNode.parent?.localName ?? null,
    componentName: routeNode.component?.localName ?? null,
    title: routeNode.title,
    source: describeAddress(store, routeNode.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: routeNode.productHandle,
        identityHandle: routeNode.identityHandle,
        routeContextProductHandle: routeNode.routeContext.productHandle,
        routeContextIdentityHandle: routeNode.routeContext.identityHandle,
        routeConfigProductHandle: routeNode.config?.productHandle ?? null,
        routeConfigIdentityHandle: routeNode.config?.identityHandle ?? null,
        parentProductHandle: routeNode.parent?.productHandle ?? null,
        parentIdentityHandle: routeNode.parent?.identityHandle ?? null,
        instructionProductHandle: routeNode.instruction?.productHandle ?? null,
        instructionIdentityHandle: routeNode.instruction?.identityHandle ?? null,
        originalInstructionProductHandle: routeNode.originalInstruction?.productHandle ?? null,
        originalInstructionIdentityHandle: routeNode.originalInstruction?.identityHandle ?? null,
        recognizedRouteProductHandle: routeNode.recognizedRoute?.productHandle ?? null,
        recognizedRouteIdentityHandle: routeNode.recognizedRoute?.identityHandle ?? null,
        sourceAddressHandle: routeNode.sourceAddressHandle,
      },
    } : {}),
  };
}

function routeContextRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  routeContext: RouteContextModel,
  handles: boolean,
): SemanticRouteContextRow {
  return {
    projectKey: emission.project.projectKey,
    label: routeContext.localName,
    parentLabel: routeContext.parent?.localName ?? null,
    rootLabel: routeContext.root.localName,
    routeConfigContext: {
      label: routeContext.routeConfigContext?.localName ?? null,
      source: describeAddress(store, routeContext.routeConfigContext?.sourceAddressHandle ?? null),
    },
    hasContainer: routeContext.container != null,
    hasViewportAgent: routeContext.viewportAgent != null,
    source: describeAddress(store, routeContext.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: routeContext.productHandle,
        identityHandle: routeContext.identityHandle,
        parentIdentityHandle: routeContext.parent?.identityHandle ?? null,
        rootIdentityHandle: routeContext.root.identityHandle,
        routeConfigContextProductHandle: routeContext.routeConfigContext?.productHandle ?? null,
        routeConfigContextIdentityHandle: routeContext.routeConfigContext?.identityHandle ?? null,
        containerProductHandle: routeContext.container?.productHandle ?? null,
        containerIdentityHandle: routeContext.container?.identityHandle ?? null,
        viewportAgentProductHandle: routeContext.viewportAgent?.productHandle ?? null,
        viewportAgentIdentityHandle: routeContext.viewportAgent?.identityHandle ?? null,
        sourceAddressHandle: routeContext.sourceAddressHandle,
      },
    } : {}),
  };
}

function routerViewportRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  viewport: ViewportCustomElementModel,
  handles: boolean,
): SemanticRouterViewportRow {
  return {
    projectKey: emission.project.projectKey,
    name: viewport.name,
    routeContext: viewport.routeContext == null
      ? null
      : {
        label: viewport.routeContext.localName,
        source: describeAddress(store, viewport.routeContext.sourceAddressHandle),
      },
    usedBy: viewport.usedBy,
    defaultComponent: viewport.defaultComponent,
    fallback: viewport.fallback,
    source: describeAddress(store, viewport.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: viewport.productHandle,
        identityHandle: viewport.identityHandle,
        routeContextProductHandle: viewport.routeContext?.productHandle ?? null,
        routeContextIdentityHandle: viewport.routeContext?.identityHandle ?? null,
        controllerProductHandle: viewport.controllerProductHandle,
        sourceAddressHandle: viewport.sourceAddressHandle,
      },
    } : {}),
  };
}

function viewportAgentRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  agent: ViewportAgentModel,
  handles: boolean,
): SemanticViewportAgentRow {
  return {
    projectKey: emission.project.projectKey,
    viewport: {
      name: agent.viewport.localName,
      source: describeAddress(store, agent.viewport.sourceAddressHandle),
    },
    routeContext: agent.routeContext == null
      ? null
      : {
        label: agent.routeContext.localName,
        source: describeAddress(store, agent.routeContext.sourceAddressHandle),
      },
    hasHostController: agent.hostControllerProductHandle != null,
    source: describeAddress(store, agent.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: agent.productHandle,
        identityHandle: agent.identityHandle,
        viewportProductHandle: agent.viewport.productHandle,
        viewportIdentityHandle: agent.viewport.identityHandle,
        routeContextProductHandle: agent.routeContext?.productHandle ?? null,
        routeContextIdentityHandle: agent.routeContext?.identityHandle ?? null,
        hostControllerProductHandle: agent.hostControllerProductHandle,
        sourceAddressHandle: agent.sourceAddressHandle,
      },
    } : {}),
  };
}

function componentAgentRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  agent: ComponentAgentModel,
  handles: boolean,
): SemanticComponentAgentRow {
  return {
    projectKey: emission.project.projectKey,
    routeContext: {
      label: agent.routeContext.localName,
      source: describeAddress(store, agent.routeContext.sourceAddressHandle),
    },
    routeNode: routerProductReferenceRow(store, agent.routeNode)!,
    viewportAgent: routerProductReferenceRow(store, agent.viewportAgent),
    hasController: agent.controllerProductHandle != null,
    component: routeableComponentRow(store, agent.component, handles),
    source: describeAddress(store, agent.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: agent.productHandle,
        identityHandle: agent.identityHandle,
        routeContextProductHandle: agent.routeContext.productHandle,
        routeContextIdentityHandle: agent.routeContext.identityHandle,
        routeNodeProductHandle: agent.routeNode.productHandle,
        routeNodeIdentityHandle: agent.routeNode.identityHandle,
        viewportAgentProductHandle: agent.viewportAgent?.productHandle ?? null,
        viewportAgentIdentityHandle: agent.viewportAgent?.identityHandle ?? null,
        controllerProductHandle: agent.controllerProductHandle,
        componentProductHandle: agent.component?.productHandle ?? null,
        componentIdentityHandle: agent.component?.identityHandle ?? null,
        componentResolvedProductHandle: agent.component?.resolvedProductHandle ?? null,
        componentResolvedIdentityHandle: agent.component?.resolvedIdentityHandle ?? null,
        sourceAddressHandle: agent.sourceAddressHandle,
      },
    } : {}),
  };
}

function routePatternRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  routePattern: ConfigurableRouteModel,
  handles: boolean,
): SemanticRoutePatternRow {
  return {
    projectKey: emission.project.projectKey,
    parentPath: routePattern.parentPath,
    path: routePattern.path,
    recognizerPath: routePattern.parentPath == null ? routePattern.path : `${routePattern.parentPath}/${routePattern.path}`,
    caseSensitive: routePattern.caseSensitive,
    segmentCount: routePattern.segments.length,
    parameterCount: routePattern.parameters.length,
    segments: routePattern.segments.map((segment) => ({
      segmentKind: segment.segmentKind,
      raw: segment.raw,
      value: segment.value,
      name: segment.name,
      optional: segment.optional,
      pattern: segment.pattern,
      caseSensitive: segment.caseSensitive,
    })),
    parameters: routePattern.parameters.map((parameter) => ({
      name: parameter.name,
      isOptional: parameter.isOptional,
      isStar: parameter.isStar,
      pattern: parameter.pattern,
    })),
    routeConfig: {
      routeKind: routePattern.routeConfig.routeKind,
      id: routePattern.routeConfig.localName,
      source: describeAddress(store, routePattern.routeConfig.sourceAddressHandle),
    },
    routeConfigContext: {
      label: routePattern.routeConfigContext.localName,
      source: describeAddress(store, routePattern.routeConfigContext.sourceAddressHandle),
    },
    source: describeAddress(store, routePattern.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: routePattern.productHandle,
        identityHandle: routePattern.identityHandle,
        routeConfigContextProductHandle: routePattern.routeConfigContext.productHandle,
        routeConfigContextIdentityHandle: routePattern.routeConfigContext.identityHandle,
        recognizerProductHandle: routePattern.recognizer.productHandle,
        recognizerIdentityHandle: routePattern.recognizer.identityHandle,
        routeConfigProductHandle: routePattern.routeConfig.productHandle,
        routeConfigIdentityHandle: routePattern.routeConfig.identityHandle,
        sourceAddressHandle: routePattern.sourceAddressHandle,
      },
    } : {}),
  };
}

function routeEndpointRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  endpoint: EndpointModel,
  routePattern: ConfigurableRouteModel,
  handles: boolean,
): SemanticRouteEndpointRow {
  return {
    projectKey: emission.project.projectKey,
    path: endpoint.path,
    isResidual: endpoint.isResidual,
    parameterCount: endpoint.parameters.length,
    parameters: endpoint.parameters.map((parameter) => ({
      name: parameter.name,
      isOptional: parameter.isOptional,
      isStar: parameter.isStar,
      pattern: parameter.pattern,
    })),
    configurableRoute: {
      path: routePattern.path,
      source: describeAddress(store, routePattern.sourceAddressHandle),
    },
    routeConfigContext: {
      label: routePattern.routeConfigContext.localName,
      source: describeAddress(store, routePattern.routeConfigContext.sourceAddressHandle),
    },
    source: describeAddress(store, endpoint.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: endpoint.productHandle,
        identityHandle: endpoint.identityHandle,
        configurableRouteProductHandle: endpoint.configurableRoute.productHandle,
        configurableRouteIdentityHandle: endpoint.configurableRoute.identityHandle,
        routeConfigContextProductHandle: routePattern.routeConfigContext.productHandle,
        routeConfigContextIdentityHandle: routePattern.routeConfigContext.identityHandle,
        recognizerProductHandle: endpoint.recognizer.productHandle,
        recognizerIdentityHandle: endpoint.recognizer.identityHandle,
        primaryEndpointProductHandle: endpoint.primaryEndpoint?.productHandle ?? null,
        primaryEndpointIdentityHandle: endpoint.primaryEndpoint?.identityHandle ?? null,
        residualEndpointProductHandle: endpoint.residualEndpoint?.productHandle ?? null,
        residualEndpointIdentityHandle: endpoint.residualEndpoint?.identityHandle ?? null,
        sourceAddressHandle: endpoint.sourceAddressHandle,
      },
    } : {}),
  };
}

function routeRecognizerStateRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  state: StateModel,
  endpointsByIdentity: ReadonlyMap<EndpointModel['identityHandle'], EndpointModel>,
  handles: boolean,
): SemanticRouteRecognizerStateRow {
  const endpointIdentityHandle = state.endpoint?.identityHandle ?? null;
  const endpoint = endpointIdentityHandle == null
    ? null
    : endpointsByIdentity.get(endpointIdentityHandle) ?? null;
  return {
    projectKey: emission.project.projectKey,
    stateKind: state.stateKind,
    value: state.value,
    length: state.length,
    segmentName: state.segmentName,
    hasPattern: state.pattern != null,
    isSeparator: state.isSeparator,
    isDynamic: state.isDynamic,
    isOptional: state.isOptional,
    isConstrained: state.isConstrained,
    previousLabel: state.previousState?.localName ?? null,
    nextCount: state.nextStates.length,
    endpoint: endpoint == null
      ? null
      : {
        path: endpoint.path,
        isResidual: endpoint.isResidual,
        source: describeAddress(store, endpoint.sourceAddressHandle),
      },
    source: describeAddress(store, state.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: state.productHandle,
        identityHandle: state.identityHandle,
        previousStateProductHandle: state.previousState?.productHandle ?? null,
        previousStateIdentityHandle: state.previousState?.identityHandle ?? null,
        nextStateProductHandles: state.nextStates
          .flatMap((nextState) => nextState.productHandle == null ? [] : [nextState.productHandle]),
        nextStateIdentityHandles: state.nextStates
          .flatMap((nextState) => nextState.identityHandle == null ? [] : [nextState.identityHandle]),
        endpointProductHandle: state.endpoint?.productHandle ?? null,
        endpointIdentityHandle: state.endpoint?.identityHandle ?? null,
        sourceAddressHandle: state.sourceAddressHandle,
      },
    } : {}),
  };
}

function routeRecognizerIssueRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  issue: RouteRecognizerIssueModel,
  handles: boolean,
): SemanticRouteRecognizerIssueRow {
  return {
    projectKey: emission.project.projectKey,
    issueKind: issue.issueKind,
    diagnosticAuthority: 'framework-runtime-behavior',
    frameworkErrorCode: null,
    frameworkRawErrorAuthority: issue.frameworkRawErrorAuthority?.key ?? null,
    message: issue.message,
    path: issue.path,
    recognizer: routeRecognizerReferenceRow(store, issue.recognizer)!,
    existingEndpoint: routeRecognizerReferenceRow(store, issue.existingEndpoint),
    conflictingEndpoint: routeRecognizerReferenceRow(store, issue.conflictingEndpoint),
    state: routeRecognizerReferenceRow(store, issue.state),
    source: describeAddress(store, issue.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        recognizerProductHandle: issue.recognizer.productHandle,
        recognizerIdentityHandle: issue.recognizer.identityHandle,
        existingEndpointProductHandle: issue.existingEndpoint?.productHandle ?? null,
        existingEndpointIdentityHandle: issue.existingEndpoint?.identityHandle ?? null,
        conflictingEndpointProductHandle: issue.conflictingEndpoint?.productHandle ?? null,
        conflictingEndpointIdentityHandle: issue.conflictingEndpoint?.identityHandle ?? null,
        stateProductHandle: issue.state?.productHandle ?? null,
        stateIdentityHandle: issue.state?.identityHandle ?? null,
        sourceAddressHandle: issue.sourceAddressHandle,
      },
    } : {}),
  };
}

function routerIssueRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  issue: RouterIssueModel,
  handles: boolean,
): SemanticRouterIssueRow {
  return {
    projectKey: emission.project.projectKey,
    phase: issue.phase,
    issueKind: issue.issueKind,
    diagnosticAuthority: issue.frameworkErrorCode == null ? 'semantic-runtime-product' : 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: issue.severity,
    message: issue.message,
    property: issue.property,
    expected: issue.expected,
    actual: issue.actual,
    component: issue.component,
    path: issue.path,
    redirectTo: issue.redirectTo,
    unexpectedExpressionKind: issue.unexpectedExpressionKind,
    routeConfig: routeConfigReferenceRow(store, issue.routeConfig),
    recognizedRoute: routeRecognizerReferenceRow(store, issue.recognizedRoute),
    source: describeAddress(store, issue.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        routeConfigProductHandle: issue.routeConfig?.productHandle ?? null,
        routeConfigIdentityHandle: issue.routeConfig?.identityHandle ?? null,
        recognizedRouteProductHandle: issue.recognizedRoute?.productHandle ?? null,
        recognizedRouteIdentityHandle: issue.recognizedRoute?.identityHandle ?? null,
        sourceAddressHandle: issue.sourceAddressHandle,
      },
    } : {}),
  };
}

function recognizedRouteRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  recognizedRoute: RecognizedRouteModel,
  endpointsByIdentity: ReadonlyMap<EndpointModel['identityHandle'], EndpointModel>,
  handles: boolean,
): SemanticRecognizedRouteRow {
  const endpointIdentityHandle = recognizedRoute.endpoint.identityHandle;
  const endpoint = endpointIdentityHandle == null
    ? null
    : endpointsByIdentity.get(endpointIdentityHandle) ?? null;
  return {
    projectKey: emission.project.projectKey,
    path: recognizedRoute.path,
    residue: recognizedRoute.residue,
    hasResidue: recognizedRoute.residue != null,
    parameterCount: recognizedRoute.parameterCount,
    redirectDepth: recognizedRoute.redirectDepth,
    redirectSourceRouteConfig: routeConfigReferenceRow(store, recognizedRoute.redirectSourceRouteConfig),
    recognizer: routeRecognizerReferenceRow(store, recognizedRoute.recognizer)!,
    viewportInstruction: routerProductReferenceRow(store, recognizedRoute.viewportInstruction)!,
    viewportInstructionTree: routerProductReferenceRow(store, recognizedRoute.viewportInstructionTree)!,
    routeContext: recognizedRoute.routeContext == null
      ? null
      : {
        label: recognizedRoute.routeContext.localName,
        source: describeAddress(store, recognizedRoute.routeContext.sourceAddressHandle),
      },
    endpoint: {
      path: endpoint?.path ?? recognizedRoute.endpoint.localName ?? null,
      isResidual: endpoint?.isResidual ?? null,
      source: describeAddress(store, endpoint?.sourceAddressHandle ?? recognizedRoute.endpoint.sourceAddressHandle),
    },
    source: describeAddress(store, recognizedRoute.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: recognizedRoute.productHandle,
        identityHandle: recognizedRoute.identityHandle,
        recognizerProductHandle: recognizedRoute.recognizer.productHandle,
        recognizerIdentityHandle: recognizedRoute.recognizer.identityHandle,
        viewportInstructionProductHandle: recognizedRoute.viewportInstruction.productHandle,
        viewportInstructionIdentityHandle: recognizedRoute.viewportInstruction.identityHandle,
        viewportInstructionTreeProductHandle: recognizedRoute.viewportInstructionTree.productHandle,
        viewportInstructionTreeIdentityHandle: recognizedRoute.viewportInstructionTree.identityHandle,
        routeContextProductHandle: recognizedRoute.routeContext?.productHandle ?? null,
        routeContextIdentityHandle: recognizedRoute.routeContext?.identityHandle ?? null,
        endpointProductHandle: recognizedRoute.endpoint.productHandle,
        endpointIdentityHandle: recognizedRoute.endpoint.identityHandle,
        redirectSourceRouteConfigProductHandle: recognizedRoute.redirectSourceRouteConfig?.productHandle ?? null,
        redirectSourceRouteConfigIdentityHandle: recognizedRoute.redirectSourceRouteConfig?.identityHandle ?? null,
        sourceAddressHandle: recognizedRoute.sourceAddressHandle,
      },
    } : {}),
  };
}

function requiredConfigurableRoute(
  endpoint: EndpointModel,
  configurableRoutesByIdentity: ReadonlyMap<ConfigurableRouteModel['identityHandle'], ConfigurableRouteModel>,
): ConfigurableRouteModel {
  const identityHandle = endpoint.configurableRoute.identityHandle;
  if (identityHandle == null) {
    throw new Error(`Route endpoint '${endpoint.identityHandle}' is missing its ConfigurableRoute identity reference.`);
  }
  const configurableRoute = configurableRoutesByIdentity.get(identityHandle);
  if (configurableRoute == null) {
    throw new Error(`Route endpoint '${endpoint.identityHandle}' references an unmaterialized ConfigurableRoute '${identityHandle}'.`);
  }
  return configurableRoute;
}

function viewportInstructionComponentRow(
  store: KernelStore,
  component: RouterReference | null,
  typedInstructionsByIdentity: ReadonlyMap<TypedNavigationInstructionModel['identityHandle'], TypedNavigationInstructionModel>,
): SemanticViewportInstructionComponentRow | null {
  if (component == null) {
    return null;
  }
  const typedInstruction = component.identityHandle == null
    ? null
    : typedInstructionsByIdentity.get(component.identityHandle) ?? null;
  return {
    routerKind: component.routerKind,
    label: component.localName,
    instructionKind: typedInstruction?.instructionKind ?? null,
    value: typedInstruction?.value ?? null,
    source: describeAddress(store, component.sourceAddressHandle),
  };
}

function routerProductReferenceRow(
  store: KernelStore,
  reference: RouterReference | null,
): SemanticRouterProductReferenceRow | null {
  if (reference == null) {
    return null;
  }
  return {
    routerKind: reference.routerKind,
    label: reference.localName,
    source: describeAddress(store, reference.sourceAddressHandle),
  };
}

function routeConfigReferenceRow(
  store: KernelStore,
  reference: RouteConfigReference | null,
): SemanticRouteConfigReferenceRow | null {
  if (reference == null) {
    return null;
  }
  return {
    routeKind: reference.routeKind,
    label: reference.localName,
    source: describeAddress(store, reference.sourceAddressHandle),
  };
}

function routeRecognizerReferenceRow(
  store: KernelStore,
  reference: RouteRecognizerReference | null,
): SemanticRouteRecognizerReferenceRow | null {
  if (reference == null) {
    return null;
  }
  return {
    recognizerKind: reference.recognizerKind,
    label: reference.localName,
    source: describeAddress(store, reference.sourceAddressHandle),
  };
}

function routeableComponentRow(
  store: KernelStore,
  component: RouteableComponentReference | null,
  handles: boolean,
): SemanticRouteConfigComponentRow | null {
  if (component == null) {
    return null;
  }
  const source: SemanticSourceReference | null = describeAddress(store, component.sourceAddressHandle);
  return {
    componentKind: component.componentKind,
    name: component.localName,
    resolved: component.resolvedProductHandle != null || component.resolvedIdentityHandle != null,
    source,
    ...(handles ? {
      handles: {
        productHandle: component.productHandle,
        identityHandle: component.identityHandle,
        resolvedProductHandle: component.resolvedProductHandle,
        resolvedIdentityHandle: component.resolvedIdentityHandle,
        sourceAddressHandle: component.sourceAddressHandle,
      },
    } : {}),
  };
}
