import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticProjectShapeKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const defaultRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/authoring/storefront');
const roots = pressureRoots();
const analysisDepth = pressureAnalysisDepth();
const projectShapeFilter = pressureProjectShapeFilter();
const detailMode = pressureDetailMode();

console.log('semantic-runtime app API pressure');
console.log('scope: transient app-world API pressure; project keys, paths, and source text are omitted');
console.log('note: default summary detail buckets source-assignment and open-seam reasons into generalized pressure');
console.log('note: raw detail may include source-level names; do not promote it from proprietary roots without manual abstraction');
console.log(`analysis-depth: ${analysisDepth}`);
console.log(`project-shapes: ${projectShapeFilter == null ? 'all' : [...projectShapeFilter].join(',')}`);
console.log(`detail-mode: ${detailMode}`);
console.log(`inputs: ${roots.length}`);

for (const [index, root] of roots.entries()) {
  const started = performance.now();
  const aggregate = await readPressureForRoot(root);
  console.log('');
  console.log(`input ${index + 1}`);
  console.log(`- request: ${(performance.now() - started).toFixed(1)}ms`);
  console.log(`- projects: ${aggregate.projects}`);
  console.log(`- source files: ${aggregate.sourceFiles}`);
  console.log(`- projects with likely entrypoints: ${aggregate.projectsWithLikelyEntrypointSource}`);
  console.log(`- selected projects: ${aggregate.selectedProjects}`);
  console.log(`- opened apps: ${aggregate.openedApps}`);
  console.log(`- projects with app roots: ${aggregate.projectsWithAppRoots}`);
  console.log(`- projects without app roots: ${aggregate.projectsWithoutAppRoots}`);
  console.log(`- resource libraries without app roots: ${aggregate.resourceLibrariesWithoutAppRoots}`);
  console.log(`- resource definitions: ${aggregate.resourceDefinitions}`);
  console.log(`- router options: ${aggregate.routerOptions}`);
  console.log(`- route configs: ${aggregate.routeConfigs}`);
  console.log(`- route config contexts: ${aggregate.routeConfigContexts}`);
  console.log(`- route contexts: ${aggregate.routeContexts}`);
  console.log(`- route recognizers: ${aggregate.routeRecognizers}`);
  console.log(`- route patterns: ${aggregate.routePatterns}`);
  console.log(`- route endpoints: ${aggregate.routeEndpoints}`);
  console.log(`- route-recognizer states: ${aggregate.routeRecognizerStates}`);
  console.log(`- recognized routes: ${aggregate.recognizedRoutes}`);
  console.log(`- typed navigation instructions: ${aggregate.typedNavigationInstructions}`);
  console.log(`- viewport instructions: ${aggregate.viewportInstructions}`);
  console.log(`- viewport instruction trees: ${aggregate.viewportInstructionTrees}`);
  console.log(`- route trees: ${aggregate.routeTrees}`);
  console.log(`- route nodes: ${aggregate.routeNodes}`);
  console.log(`- router viewports: ${aggregate.routerViewports}`);
  console.log(`- viewport agents: ${aggregate.viewportAgents}`);
  console.log(`- component agents: ${aggregate.componentAgents}`);
  console.log(`- app tasks: ${aggregate.appTasks}`);
  console.log(`- runtime controllers: ${aggregate.runtimeControllers}`);
  console.log(`- bindables: ${aggregate.bindables}`);
  console.log(`- binding data flows: ${aggregate.bindingDataFlows}`);
  console.log(`- open binding data flows: ${aggregate.openBindingDataFlows}`);
  console.log(`- binding data-flow source assignment gaps: ${aggregate.bindingDataFlowSourceAssignmentGaps}`);
  console.log(`- unresolved module edges: ${aggregate.unresolvedModuleEdges}`);
  console.log(`- open seams: ${aggregate.openSeams}`);
  console.log(`- app-root project open seams: ${aggregate.appRootProjectOpenSeams}`);
  console.log(`- non-app-root project open seams: ${aggregate.nonAppRootProjectOpenSeams}`);
  printTimings('timings', aggregate.timings);
  printCounts('page counts', aggregate.pageCounts);
  printCounts('project shape kinds', aggregate.projectShapeKinds);
  printCounts('skipped project shape kinds', aggregate.skippedProjectShapeKinds);
  printCounts('project Aurelia dependency scopes', aggregate.projectAureliaDependencyScopes);
  printCounts('project Aurelia source signals', aggregate.projectAureliaSourceSignals);
  printCounts('project source roles', aggregate.projectSourceRoles);
  printCounts('resource kinds', aggregate.resourceKinds);
  printCounts('router options: useHref', aggregate.routerOptionsUseHref);
  printCounts('router options: useUrlFragmentHash', aggregate.routerOptionsUseUrlFragmentHash);
  printCounts('router options: useEagerLoading', aggregate.routerOptionsUseEagerLoading);
  printCounts('route kinds', aggregate.routeKinds);
  printCounts('route component kinds', aggregate.routeComponentKinds);
  printCounts('route component resolution', aggregate.routeComponentResolution);
  printCounts('route child cardinality', aggregate.routeChildCardinality);
  printCounts('route contexts: container', aggregate.routeContextContainers);
  printCounts('route contexts: viewport agent', aggregate.routeContextViewportAgents);
  printCounts('router viewports: usedBy count', aggregate.routerViewportUsedByCount);
  printCounts('viewport agents: host controller', aggregate.viewportAgentHostControllers);
  printCounts('component agents: controller', aggregate.componentAgentControllers);
  printCounts('component agents: viewport agent', aggregate.componentAgentViewportAgents);
  printCounts('component agents: component kinds', aggregate.componentAgentComponentKinds);
  printCounts('component agents: component resolution', aggregate.componentAgentComponentResolution);
  printCounts('runtime controllers: creation kinds', aggregate.runtimeControllerCreationKinds);
  printCounts('runtime controllers: readiness', aggregate.runtimeControllerReadiness);
  printCounts('runtime controllers: hydration handoff', aggregate.runtimeControllerHydrationHandoff);
  printCounts('route trees: options', aggregate.routeTreeOptions);
  printCounts('route trees: instruction tree', aggregate.routeTreeInstructionTree);
  printCounts('route trees: node count', aggregate.routeTreeNodeCount);
  printCounts('route nodes: children', aggregate.routeNodeChildren);
  printCounts('route nodes: instruction', aggregate.routeNodeInstruction);
  printCounts('route nodes: recognized route', aggregate.routeNodeRecognizedRoute);
  printCounts('route nodes: parameters', aggregate.routeNodeParameters);
  printCounts('route nodes: query params', aggregate.routeNodeQueryParams);
  printCounts('route nodes: fragment', aggregate.routeNodeFragment);
  printCounts('route nodes: viewport', aggregate.routeNodeViewport);
  printCounts('route nodes: residue', aggregate.routeNodeResidue);
  printCounts('route pattern segments', aggregate.routePatternSegments);
  printCounts('route pattern segment kinds', aggregate.routePatternSegmentKinds);
  printCounts('route pattern parameters', aggregate.routePatternParameters);
  printCounts('route pattern parameter kinds', aggregate.routePatternParameterKinds);
  printCounts('route endpoint residuals', aggregate.routeEndpointResiduals);
  printCounts('route endpoint parameters', aggregate.routeEndpointParameters);
  printCounts('route endpoint parameter kinds', aggregate.routeEndpointParameterKinds);
  printCounts('route-recognizer state kinds', aggregate.routeRecognizerStateKinds);
  printCounts('route-recognizer state next counts', aggregate.routeRecognizerStateNextCounts);
  printCounts('route-recognizer state endpoints', aggregate.routeRecognizerStateEndpoints);
  printCounts('route-recognizer state dynamic', aggregate.routeRecognizerStateDynamic);
  printCounts('route-recognizer state constrained', aggregate.routeRecognizerStateConstrained);
  printCounts('recognized route residue', aggregate.recognizedRouteResidue);
  printCounts('recognized route parameters', aggregate.recognizedRouteParameters);
  printCounts('recognized route redirect depth', aggregate.recognizedRouteRedirectDepth);
  printCounts('recognized route endpoint residuals', aggregate.recognizedRouteEndpointResiduals);
  printCounts('recognized route route context', aggregate.recognizedRouteRouteContext);
  printCounts('typed navigation instruction kinds', aggregate.typedNavigationInstructionKinds);
  printCounts('typed navigation instruction components', aggregate.typedNavigationInstructionComponents);
  printCounts('viewport instruction component kinds', aggregate.viewportInstructionComponentKinds);
  printCounts('viewport instruction typed kinds', aggregate.viewportInstructionTypedKinds);
  printCounts('viewport instruction children', aggregate.viewportInstructionChildren);
  printCounts('viewport instruction parameters', aggregate.viewportInstructionParameters);
  printCounts('viewport instruction parameter count', aggregate.viewportInstructionParameterCount);
  printCounts('viewport instruction grouping open', aggregate.viewportInstructionOpen);
  printCounts('viewport instruction grouping close', aggregate.viewportInstructionClose);
  printCounts('viewport instruction recognized route', aggregate.viewportInstructionRecognizedRoute);
  printCounts('viewport instruction tree route context', aggregate.viewportInstructionTreeRouteContext);
  printCounts('viewport instruction tree instructions', aggregate.viewportInstructionTreeInstructions);
  printCounts('viewport instruction tree options', aggregate.viewportInstructionTreeOptions);
  printCounts('viewport instruction tree absolute', aggregate.viewportInstructionTreeAbsolute);
  printCounts('viewport instruction tree query params', aggregate.viewportInstructionTreeQueryParams);
  printCounts('viewport instruction tree fragment', aggregate.viewportInstructionTreeFragment);
  printCounts('bindable modes', aggregate.bindableModes);
  printCounts('setter kinds', aggregate.setterKinds);
  printCounts('binding data-flow binding kinds', aggregate.bindingDataFlowBindingKinds);
  printCounts('binding data-flow directions', aggregate.bindingDataFlowDirections);
  printCounts('binding data-flow parse states', aggregate.bindingDataFlowParseStates);
  printCounts('binding data-flow parse result kinds', aggregate.bindingDataFlowParseResultKinds);
  printCounts('binding data-flow source kinds', aggregate.bindingDataFlowSourceKinds);
  printCounts('binding data-flow source assignment kinds', aggregate.bindingDataFlowSourceAssignmentKinds);
  printCounts('binding data-flow source assignment reasons', aggregate.bindingDataFlowSourceAssignmentReasons, 12);
  printCounts('binding data-flow open reasons', aggregate.bindingDataFlowOpenReasons, 12);
  printCounts('open seam kinds', aggregate.openSeamKinds);
  printCounts('app-root project open seam kinds', aggregate.appRootOpenSeamKinds);
  printCounts('non-app-root project open seam kinds', aggregate.nonAppRootOpenSeamKinds);
  printCounts('open seam summaries', aggregate.openSeamSummaries, 12);
  printCounts('query outcomes', aggregate.outcomes);
}

async function readPressureForRoot(root) {
  const timings = createTimingAccumulator();
  const runtime = await measure(timings, 'create-runtime', () =>
    createSemanticRuntime({
      workspaceRoot: root,
    }),
  );
  const summary = await measure(timings, 'workspace-summary', () =>
    runtime.summary().value,
  );
  const aggregate = {
    projects: summary.projects.length,
    sourceFiles: summary.projects.reduce((sum, project) => sum + project.sourceFiles, 0),
    projectsWithLikelyEntrypointSource: 0,
    selectedProjects: 0,
    openedApps: 0,
    projectsWithAppRoots: 0,
    projectsWithoutAppRoots: 0,
    resourceLibrariesWithoutAppRoots: 0,
    resourceDefinitions: 0,
    routerOptions: 0,
    routeConfigs: 0,
    routeConfigContexts: 0,
    routeContexts: 0,
    routeRecognizers: 0,
    routePatterns: 0,
    routeEndpoints: 0,
    routeRecognizerStates: 0,
    recognizedRoutes: 0,
    typedNavigationInstructions: 0,
    viewportInstructions: 0,
    viewportInstructionTrees: 0,
    routeTrees: 0,
    routeNodes: 0,
    routerViewports: 0,
    viewportAgents: 0,
    componentAgents: 0,
    appTasks: 0,
    runtimeControllers: 0,
    bindables: 0,
    bindingDataFlows: 0,
    openBindingDataFlows: 0,
    bindingDataFlowSourceAssignmentGaps: 0,
    unresolvedModuleEdges: 0,
    openSeams: 0,
    appRootProjectOpenSeams: 0,
    nonAppRootProjectOpenSeams: 0,
    resourceKinds: {},
    routerOptionsUseHref: {},
    routerOptionsUseUrlFragmentHash: {},
    routerOptionsUseEagerLoading: {},
    routeKinds: {},
    routeComponentKinds: {},
    routeComponentResolution: {},
    routeChildCardinality: {},
    routeContextContainers: {},
    routeContextViewportAgents: {},
    routerViewportUsedByCount: {},
    viewportAgentHostControllers: {},
    componentAgentControllers: {},
    componentAgentViewportAgents: {},
    componentAgentComponentKinds: {},
    componentAgentComponentResolution: {},
    runtimeControllerCreationKinds: {},
    runtimeControllerReadiness: {},
    runtimeControllerHydrationHandoff: {},
    routeTreeOptions: {},
    routeTreeInstructionTree: {},
    routeTreeNodeCount: {},
    routeNodeChildren: {},
    routeNodeInstruction: {},
    routeNodeRecognizedRoute: {},
    routeNodeParameters: {},
    routeNodeQueryParams: {},
    routeNodeFragment: {},
    routeNodeViewport: {},
    routeNodeResidue: {},
    routePatternSegments: {},
    routePatternSegmentKinds: {},
    routePatternParameters: {},
    routePatternParameterKinds: {},
    routeEndpointResiduals: {},
    routeEndpointParameters: {},
    routeEndpointParameterKinds: {},
    routeRecognizerStateKinds: {},
    routeRecognizerStateNextCounts: {},
    routeRecognizerStateEndpoints: {},
    routeRecognizerStateDynamic: {},
    routeRecognizerStateConstrained: {},
    recognizedRouteResidue: {},
    recognizedRouteParameters: {},
    recognizedRouteRedirectDepth: {},
    recognizedRouteEndpointResiduals: {},
    recognizedRouteRouteContext: {},
    typedNavigationInstructionKinds: {},
    typedNavigationInstructionComponents: {},
    viewportInstructionComponentKinds: {},
    viewportInstructionTypedKinds: {},
    viewportInstructionChildren: {},
    viewportInstructionParameters: {},
    viewportInstructionParameterCount: {},
    viewportInstructionOpen: {},
    viewportInstructionClose: {},
    viewportInstructionRecognizedRoute: {},
    viewportInstructionTreeRouteContext: {},
    viewportInstructionTreeInstructions: {},
    viewportInstructionTreeOptions: {},
    viewportInstructionTreeAbsolute: {},
    viewportInstructionTreeQueryParams: {},
    viewportInstructionTreeFragment: {},
    bindableModes: {},
    setterKinds: {},
    bindingDataFlowBindingKinds: {},
    bindingDataFlowDirections: {},
    bindingDataFlowParseStates: {},
    bindingDataFlowParseResultKinds: {},
    bindingDataFlowSourceKinds: {},
    bindingDataFlowSourceAssignmentKinds: {},
    bindingDataFlowSourceAssignmentReasons: {},
    bindingDataFlowOpenReasons: {},
    openSeamKinds: {},
    appRootOpenSeamKinds: {},
    nonAppRootOpenSeamKinds: {},
    openSeamSummaries: {},
    projectShapeKinds: {},
    skippedProjectShapeKinds: {},
    projectAureliaDependencyScopes: {},
    projectAureliaSourceSignals: {},
    projectSourceRoles: {},
    outcomes: {},
    pageCounts: {},
    timings,
  };

  for (const project of summary.projects) {
    if (project.hasLikelyEntrypointSource) {
      aggregate.projectsWithLikelyEntrypointSource += 1;
    }
    increment(aggregate.projectShapeKinds, project.shapeKind);
    for (const dependencyScope of project.aureliaDependencyScopes ?? []) {
      increment(aggregate.projectAureliaDependencyScopes, dependencyScope.scope, dependencyScope.count);
    }
    for (const sourceSignal of project.aureliaSourceSignals ?? []) {
      increment(aggregate.projectAureliaSourceSignals, sourceSignal.signal, sourceSignal.count);
    }
    for (const sourceRole of project.sourceRoles ?? []) {
      increment(aggregate.projectSourceRoles, sourceRole.role, sourceRole.count);
    }
    if (projectShapeFilter != null && !projectShapeFilter.has(project.shapeKind)) {
      increment(aggregate.skippedProjectShapeKinds, project.shapeKind);
      continue;
    }
    aggregate.selectedProjects += 1;

    try {
      const appStarted = performance.now();
      const app = await measure(timings, 'open-app', () =>
        runtime.openApp({ projectKey: project.projectKey, analysisDepth }),
      );
      recordAppWorldProfile(timings, app.emission?.profile);
      recordTypeSystemProjectProfile(timings, app.emission?.typeSystem?.profile);
      recordResourceRecognitionProfile(timings, app.emission?.resources?.profile);
      recordTemplateCompilationProfile(timings, app.emission?.templates?.profile);
      recordTemplateRuntimeAnalysisProfiles(timings, app.emission?.templates?.resources);
      aggregate.openedApps += 1;
      const appSummary = await measure(timings, 'app-summary', () =>
        app.summary().value,
      );
      const hasAppRoot = appSummary.appRoots > 0;
      if (hasAppRoot) {
        aggregate.projectsWithAppRoots += 1;
        aggregate.appRootProjectOpenSeams += appSummary.kernelOpenSeams;
      } else {
        aggregate.projectsWithoutAppRoots += 1;
        aggregate.nonAppRootProjectOpenSeams += appSummary.kernelOpenSeams;
        if (appSummary.resourceDefinitions > 0) {
          aggregate.resourceLibrariesWithoutAppRoots += 1;
        }
      }
      aggregate.resourceDefinitions += appSummary.resourceDefinitions;
      aggregate.routerOptions += appSummary.routerOptions;
      aggregate.routeConfigs += appSummary.routeConfigs;
      aggregate.routeConfigContexts += appSummary.routeConfigContexts;
      aggregate.routeContexts += appSummary.routeContexts;
      aggregate.routeRecognizers += appSummary.routeRecognizers;
      aggregate.routePatterns += appSummary.routePatterns;
      aggregate.routeEndpoints += appSummary.routeEndpoints;
      aggregate.routeRecognizerStates += appSummary.routeRecognizerStates;
      aggregate.recognizedRoutes += appSummary.recognizedRoutes;
      aggregate.typedNavigationInstructions += appSummary.typedNavigationInstructions;
      aggregate.viewportInstructions += appSummary.viewportInstructions;
      aggregate.viewportInstructionTrees += appSummary.viewportInstructionTrees;
      aggregate.routeTrees += appSummary.routeTrees;
      aggregate.routeNodes += appSummary.routeNodes;
      aggregate.routerViewports += appSummary.routerViewports;
      aggregate.viewportAgents += appSummary.viewportAgents;
      aggregate.componentAgents += appSummary.componentAgents;
      aggregate.appTasks += appSummary.appTasks;
      aggregate.runtimeControllers += appSummary.runtimeControllers;
      aggregate.unresolvedModuleEdges += appSummary.unresolvedModuleEdges;
      aggregate.openSeams += appSummary.kernelOpenSeams;

      const resourceRows = await measure(timings, 'query-resources', () =>
        pagedRows(app, SemanticAppQueryKind.ResourceDefinitions),
      );
      increment(aggregate.outcomes, `resources:${resourceRows.outcome}`);
      increment(aggregate.pageCounts, 'resources', resourceRows.pages);
      for (const row of resourceRows.rows) {
        increment(aggregate.resourceKinds, row.resourceKind);
        const bindables = row.bindables ?? [];
        aggregate.bindables += bindables.length;
        for (const bindable of bindables) {
          increment(aggregate.bindableModes, bindable.mode);
          increment(aggregate.setterKinds, bindable.setterKind);
        }
      }

      const routerOptionsRows = await measure(timings, 'query-router-options', () =>
        pagedRows(app, SemanticAppQueryKind.RouterOptions),
      );
      increment(aggregate.outcomes, `router-options:${routerOptionsRows.outcome}`);
      increment(aggregate.pageCounts, 'router-options', routerOptionsRows.pages);
      for (const row of routerOptionsRows.rows) {
        increment(aggregate.routerOptionsUseHref, String(row.useHref));
        increment(aggregate.routerOptionsUseUrlFragmentHash, String(row.useUrlFragmentHash));
        increment(aggregate.routerOptionsUseEagerLoading, String(row.useEagerLoading));
      }

      const routeRows = await measure(timings, 'query-routes', () =>
        pagedRows(app, SemanticAppQueryKind.Routes),
      );
      increment(aggregate.outcomes, `routes:${routeRows.outcome}`);
      increment(aggregate.pageCounts, 'routes', routeRows.pages);
      for (const row of routeRows.rows) {
        increment(aggregate.routeKinds, row.routeKind);
        if (row.component != null) {
          increment(aggregate.routeComponentKinds, row.component.componentKind);
          increment(aggregate.routeComponentResolution, row.component.resolved ? 'resolved' : 'unresolved');
        }
        increment(aggregate.routeChildCardinality, cardinalityBucket(row.childRouteCount));
      }

      const routeContextRows = await measure(timings, 'query-route-contexts', () =>
        pagedRows(app, SemanticAppQueryKind.RouteContexts),
      );
      increment(aggregate.outcomes, `route-contexts:${routeContextRows.outcome}`);
      increment(aggregate.pageCounts, 'route-contexts', routeContextRows.pages);
      for (const row of routeContextRows.rows) {
        increment(aggregate.routeContextContainers, String(row.hasContainer));
        increment(aggregate.routeContextViewportAgents, String(row.hasViewportAgent));
      }

      const routerViewportRows = await measure(timings, 'query-router-viewports', () =>
        pagedRows(app, SemanticAppQueryKind.RouterViewports),
      );
      increment(aggregate.outcomes, `router-viewports:${routerViewportRows.outcome}`);
      increment(aggregate.pageCounts, 'router-viewports', routerViewportRows.pages);
      for (const row of routerViewportRows.rows) {
        increment(aggregate.routerViewportUsedByCount, cardinalityBucket(row.usedBy.length));
      }

      const viewportAgentRows = await measure(timings, 'query-viewport-agents', () =>
        pagedRows(app, SemanticAppQueryKind.ViewportAgents),
      );
      increment(aggregate.outcomes, `viewport-agents:${viewportAgentRows.outcome}`);
      increment(aggregate.pageCounts, 'viewport-agents', viewportAgentRows.pages);
      for (const row of viewportAgentRows.rows) {
        increment(aggregate.viewportAgentHostControllers, String(row.hasHostController));
      }

      const componentAgentRows = await measure(timings, 'query-component-agents', () =>
        pagedRows(app, SemanticAppQueryKind.ComponentAgents),
      );
      increment(aggregate.outcomes, `component-agents:${componentAgentRows.outcome}`);
      increment(aggregate.pageCounts, 'component-agents', componentAgentRows.pages);
      for (const row of componentAgentRows.rows) {
        increment(aggregate.componentAgentControllers, String(row.hasController));
        increment(aggregate.componentAgentViewportAgents, row.viewportAgent == null ? 'none' : row.viewportAgent.routerKind);
        increment(aggregate.componentAgentComponentKinds, row.component?.componentKind ?? 'none');
        increment(aggregate.componentAgentComponentResolution, row.component == null ? 'none' : row.component.resolved ? 'resolved' : 'unresolved');
      }

      const runtimeControllerRows = await measure(timings, 'query-runtime-controllers', () =>
        pagedRows(app, SemanticAppQueryKind.RuntimeControllers),
      );
      increment(aggregate.outcomes, `runtime-controllers:${runtimeControllerRows.outcome}`);
      increment(aggregate.pageCounts, 'runtime-controllers', runtimeControllerRows.pages);
      for (const row of runtimeControllerRows.rows) {
        increment(aggregate.runtimeControllerCreationKinds, row.creationKind);
        increment(aggregate.runtimeControllerReadiness, row.controllerReadiness);
        increment(aggregate.runtimeControllerHydrationHandoff, row.hydrationHandoffKind);
      }

      const routeTreeRows = await measure(timings, 'query-route-trees', () =>
        pagedRows(app, SemanticAppQueryKind.RouteTrees),
      );
      increment(aggregate.outcomes, `route-trees:${routeTreeRows.outcome}`);
      increment(aggregate.pageCounts, 'route-trees', routeTreeRows.pages);
      for (const row of routeTreeRows.rows) {
        increment(aggregate.routeTreeOptions, String(row.hasOptions));
        increment(aggregate.routeTreeInstructionTree, row.instructionTree == null ? 'none' : row.instructionTree.routerKind);
        increment(aggregate.routeTreeNodeCount, cardinalityBucket(row.nodeCount));
      }

      const routeNodeRows = await measure(timings, 'query-route-nodes', () =>
        pagedRows(app, SemanticAppQueryKind.RouteNodes),
      );
      increment(aggregate.outcomes, `route-nodes:${routeNodeRows.outcome}`);
      increment(aggregate.pageCounts, 'route-nodes', routeNodeRows.pages);
      for (const row of routeNodeRows.rows) {
        increment(aggregate.routeNodeChildren, cardinalityBucket(row.childCount));
        increment(aggregate.routeNodeInstruction, row.instruction == null ? 'none' : row.instruction.routerKind);
        increment(aggregate.routeNodeRecognizedRoute, row.recognizedRoute == null ? 'none' : row.recognizedRoute.recognizerKind);
        increment(aggregate.routeNodeParameters, cardinalityBucket(row.parameterCount));
        increment(aggregate.routeNodeQueryParams, cardinalityBucket(row.queryParamCount));
        increment(aggregate.routeNodeFragment, row.fragment == null ? 'none' : 'present');
        increment(aggregate.routeNodeViewport, row.viewport == null ? 'none' : 'present');
        increment(aggregate.routeNodeResidue, cardinalityBucket(row.residueInstructionCount));
      }

      const routePatternRows = await measure(timings, 'query-route-patterns', () =>
        pagedRows(app, SemanticAppQueryKind.RoutePatterns),
      );
      increment(aggregate.outcomes, `route-patterns:${routePatternRows.outcome}`);
      increment(aggregate.pageCounts, 'route-patterns', routePatternRows.pages);
      for (const row of routePatternRows.rows) {
        increment(aggregate.routePatternSegments, cardinalityBucket(row.segmentCount));
        increment(aggregate.routePatternParameters, cardinalityBucket(row.parameterCount));
        for (const segment of row.segments ?? []) {
          increment(aggregate.routePatternSegmentKinds, segment.segmentKind);
        }
        for (const parameter of row.parameters ?? []) {
          increment(aggregate.routePatternParameterKinds, parameter.isStar ? 'star' : parameter.isOptional ? 'optional' : 'required');
        }
      }

      const routeEndpointRows = await measure(timings, 'query-route-endpoints', () =>
        pagedRows(app, SemanticAppQueryKind.RouteEndpoints),
      );
      increment(aggregate.outcomes, `route-endpoints:${routeEndpointRows.outcome}`);
      increment(aggregate.pageCounts, 'route-endpoints', routeEndpointRows.pages);
      for (const row of routeEndpointRows.rows) {
        increment(aggregate.routeEndpointResiduals, row.isResidual ? 'residual' : 'primary');
        increment(aggregate.routeEndpointParameters, cardinalityBucket(row.parameterCount));
        for (const parameter of row.parameters ?? []) {
          increment(aggregate.routeEndpointParameterKinds, parameter.isStar ? 'star' : parameter.isOptional ? 'optional' : 'required');
        }
      }

      const routeRecognizerStateRows = await measure(timings, 'query-route-recognizer-states', () =>
        pagedRows(app, SemanticAppQueryKind.RouteRecognizerStates),
      );
      increment(aggregate.outcomes, `route-recognizer-states:${routeRecognizerStateRows.outcome}`);
      increment(aggregate.pageCounts, 'route-recognizer-states', routeRecognizerStateRows.pages);
      for (const row of routeRecognizerStateRows.rows) {
        increment(aggregate.routeRecognizerStateKinds, row.stateKind);
        increment(aggregate.routeRecognizerStateNextCounts, cardinalityBucket(row.nextCount));
        increment(aggregate.routeRecognizerStateEndpoints, row.endpoint == null ? 'none' : row.endpoint.isResidual ? 'residual' : 'primary');
        increment(aggregate.routeRecognizerStateDynamic, String(row.isDynamic));
        increment(aggregate.routeRecognizerStateConstrained, String(row.isConstrained));
      }

      const recognizedRouteRows = await measure(timings, 'query-recognized-routes', () =>
        pagedRows(app, SemanticAppQueryKind.RecognizedRoutes),
      );
      increment(aggregate.outcomes, `recognized-routes:${recognizedRouteRows.outcome}`);
      increment(aggregate.pageCounts, 'recognized-routes', recognizedRouteRows.pages);
      for (const row of recognizedRouteRows.rows) {
        increment(aggregate.recognizedRouteResidue, row.hasResidue ? 'present' : 'none');
        increment(aggregate.recognizedRouteParameters, cardinalityBucket(row.parameterCount));
        increment(aggregate.recognizedRouteRedirectDepth, cardinalityBucket(row.redirectDepth));
        increment(aggregate.recognizedRouteEndpointResiduals, row.endpoint.isResidual == null ? 'unknown' : row.endpoint.isResidual ? 'residual' : 'primary');
        increment(aggregate.recognizedRouteRouteContext, row.routeContext == null ? 'none' : 'present');
      }

      const typedNavigationInstructionRows = await measure(timings, 'query-typed-navigation-instructions', () =>
        pagedRows(app, SemanticAppQueryKind.TypedNavigationInstructions),
      );
      increment(aggregate.outcomes, `typed-navigation-instructions:${typedNavigationInstructionRows.outcome}`);
      increment(aggregate.pageCounts, 'typed-navigation-instructions', typedNavigationInstructionRows.pages);
      for (const row of typedNavigationInstructionRows.rows) {
        increment(aggregate.typedNavigationInstructionKinds, row.instructionKind);
        increment(aggregate.typedNavigationInstructionComponents, row.component == null ? 'none' : row.component.routerKind);
      }

      const viewportInstructionRows = await measure(timings, 'query-viewport-instructions', () =>
        pagedRows(app, SemanticAppQueryKind.ViewportInstructions),
      );
      increment(aggregate.outcomes, `viewport-instructions:${viewportInstructionRows.outcome}`);
      increment(aggregate.pageCounts, 'viewport-instructions', viewportInstructionRows.pages);
      for (const row of viewportInstructionRows.rows) {
        increment(aggregate.viewportInstructionComponentKinds, row.component?.routerKind ?? 'none');
        increment(aggregate.viewportInstructionTypedKinds, row.component?.instructionKind ?? 'none');
        increment(aggregate.viewportInstructionChildren, cardinalityBucket(row.childCount));
        increment(aggregate.viewportInstructionParameters, String(row.hasParameters));
        increment(aggregate.viewportInstructionParameterCount, cardinalityBucket(row.parameterCount));
        increment(aggregate.viewportInstructionOpen, cardinalityBucket(row.open));
        increment(aggregate.viewportInstructionClose, cardinalityBucket(row.close));
        increment(aggregate.viewportInstructionRecognizedRoute, row.recognizedRoute == null ? 'none' : row.recognizedRoute.recognizerKind);
      }

      const viewportInstructionTreeRows = await measure(timings, 'query-viewport-instruction-trees', () =>
        pagedRows(app, SemanticAppQueryKind.ViewportInstructionTrees),
      );
      increment(aggregate.outcomes, `viewport-instruction-trees:${viewportInstructionTreeRows.outcome}`);
      increment(aggregate.pageCounts, 'viewport-instruction-trees', viewportInstructionTreeRows.pages);
      for (const row of viewportInstructionTreeRows.rows) {
        increment(aggregate.viewportInstructionTreeRouteContext, row.routeContext == null ? 'none' : 'present');
        increment(aggregate.viewportInstructionTreeInstructions, cardinalityBucket(row.instructionCount));
        increment(aggregate.viewportInstructionTreeOptions, String(row.hasOptions));
        increment(aggregate.viewportInstructionTreeAbsolute, String(row.isAbsolute));
        increment(aggregate.viewportInstructionTreeQueryParams, cardinalityBucket(row.queryParamCount));
        increment(aggregate.viewportInstructionTreeFragment, row.fragment == null ? 'none' : 'present');
      }

      if (analysisDepth === 'binding-observation') {
        const dataFlowRows = await measure(timings, 'query-binding-data-flows', () =>
          pagedRows(app, SemanticAppQueryKind.BindingDataFlows),
        );
        increment(aggregate.outcomes, `binding-data-flows:${dataFlowRows.outcome}`);
        increment(aggregate.pageCounts, 'binding-data-flows', dataFlowRows.pages);
        aggregate.bindingDataFlows += dataFlowRows.rows.length;
        for (const row of dataFlowRows.rows) {
          increment(aggregate.bindingDataFlowBindingKinds, row.bindingKind);
          increment(aggregate.bindingDataFlowDirections, row.direction);
          increment(aggregate.bindingDataFlowParseStates, row.expressionParseState ?? 'none');
          increment(aggregate.bindingDataFlowParseResultKinds, row.expressionParseResultKind ?? 'none');
          increment(aggregate.bindingDataFlowSourceKinds, row.sourceKind);
          if (row.sourceAssignmentKind != null) {
            increment(aggregate.bindingDataFlowSourceAssignmentKinds, row.sourceAssignmentKind);
          }
          if (row.sourceAssignmentReason != null) {
            aggregate.bindingDataFlowSourceAssignmentGaps += 1;
            increment(aggregate.bindingDataFlowSourceAssignmentReasons, sourceAssignmentReasonKey(row.sourceAssignmentReason));
          }
          if (row.openReason != null) {
            aggregate.openBindingDataFlows += 1;
            increment(aggregate.bindingDataFlowOpenReasons, row.openReason);
          }
        }
      } else {
        increment(aggregate.outcomes, 'binding-data-flows:skipped-by-analysis-depth');
      }

      const seamRows = await measure(timings, 'query-open-seams', () =>
        pagedRows(app, SemanticAppQueryKind.OpenSeams),
      );
      increment(aggregate.outcomes, `open-seams:${seamRows.outcome}`);
      increment(aggregate.pageCounts, 'open-seams', seamRows.pages);
      for (const row of seamRows.rows) {
        increment(aggregate.openSeamKinds, row.seamKindKey);
        increment(hasAppRoot ? aggregate.appRootOpenSeamKinds : aggregate.nonAppRootOpenSeamKinds, row.seamKindKey);
        increment(aggregate.openSeamSummaries, openSeamSummaryKey(row));
      }
      observeProjectTiming(timings, performance.now() - appStarted);
    } catch {
      increment(aggregate.outcomes, 'open-app:error');
    }
  }

  return aggregate;
}

async function pagedRows(app, kind) {
  const rows = [];
  let cursor = null;
  let outcome = 'hit';
  let pages = 0;
  for (;;) {
    pages += 1;
    const answer = app.ask({
      kind,
      page: { size: 500, cursor },
    });
    outcome = answer.outcome;
    rows.push(...(answer.value?.rows ?? []));
    cursor = answer.page?.nextCursor ?? null;
    if (cursor == null) {
      return { outcome, rows, pages };
    }
  }
}

function pressureRoots() {
  const raw = process.env.SEMANTIC_RUNTIME_PRESSURE_ROOTS;
  if (raw == null || raw.trim().length === 0) {
    return [defaultRoot];
  }
  return raw
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => path.resolve(entry));
}

function pressureAnalysisDepth() {
  const raw = process.env.SEMANTIC_RUNTIME_APP_ANALYSIS_DEPTH;
  if (raw == null || raw.trim().length === 0) {
    return 'binding-observation';
  }
  const value = raw.trim();
  if (
    value === 'runtime-topology'
    || value === 'binding-targets'
    || value === 'binding-observation'
  ) {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_APP_ANALYSIS_DEPTH '${raw}'.`);
}

function pressureProjectShapeFilter() {
  const raw = process.env.SEMANTIC_RUNTIME_PROJECT_SHAPES;
  if (raw == null || raw.trim().length === 0) {
    return null;
  }
  const supported = new Set(Object.values(SemanticProjectShapeKind));
  const values = raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  for (const value of values) {
    if (!supported.has(value)) {
      throw new Error(`Unsupported SEMANTIC_RUNTIME_PROJECT_SHAPES entry '${value}'.`);
    }
  }
  return new Set(values);
}

function pressureDetailMode() {
  const raw = process.env.SEMANTIC_RUNTIME_PRESSURE_DETAIL;
  if (raw == null || raw.trim().length === 0) {
    return 'summary';
  }
  const value = raw.trim();
  if (value === 'summary' || value === 'raw') {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_PRESSURE_DETAIL '${raw}'.`);
}

function sourceAssignmentReasonKey(reason) {
  if (detailMode === 'raw') {
    return reason;
  }
  if (/^Source member .+ is readonly in the TypeChecker surface/.test(reason)) {
    return 'source member is readonly in the TypeChecker surface; Aurelia runtime astAssign still writes';
  }
  if (/^TypeChecker target-to-source assignment is not assignable/.test(reason)) {
    return 'TypeChecker target-to-source assignment is not assignable; Aurelia runtime still passes observer value to astAssign';
  }
  if (/^Aurelia astAssign does not assign to expression kind /.test(reason)) {
    return 'Aurelia astAssign does not assign to this expression kind';
  }
  if (/^Owner type .+ did not project member /.test(reason)) {
    return 'owner type did not project member; Aurelia astAssign can still write to runtime objects';
  }
  return 'other source-assignment strictness pressure';
}

function openSeamSummaryKey(row) {
  if (detailMode === 'raw') {
    return `${row.seamKindKey} :: ${row.summary}`;
  }
  if (row.summary.includes('provided by the host environment')) {
    return `${row.seamKindKey} :: dynamic value depends on host environment`;
  }
  if (row.summary.includes('dynamic') && row.summary.includes('binding')) {
    return `${row.seamKindKey} :: dynamic binding value requires a static value to close`;
  }
  return `${row.seamKindKey} :: ${row.summary}`;
}

function increment(counts, key, amount = 1) {
  counts[key] = (counts[key] ?? 0) + amount;
}

function cardinalityBucket(count) {
  if (count === 0) {
    return '0';
  }
  if (count === 1) {
    return '1';
  }
  if (count <= 5) {
    return '2-5';
  }
  return '6+';
}

function printCounts(label, counts, limit = 20) {
  const entries = Object.entries(counts)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      rightValue - leftValue || leftKey.localeCompare(rightKey)
    )
    .slice(0, limit);

  console.log('');
  console.log(label);
  if (entries.length === 0) {
    console.log('- none');
    return;
  }
  for (const [key, count] of entries) {
    console.log(`- ${key}: ${count}`);
  }
}

function createTimingAccumulator() {
  return {
    totals: {},
    projectBuckets: {},
    slowestProjectMilliseconds: 0,
  };
}

async function measure(timings, label, read) {
  const started = performance.now();
  const value = await read();
  recordTiming(timings, label, performance.now() - started);
  return value;
}

function recordTiming(timings, label, milliseconds) {
  timings.totals[label] = (timings.totals[label] ?? 0) + milliseconds;
}

function observeProjectTiming(timings, milliseconds) {
  timings.slowestProjectMilliseconds = Math.max(
    timings.slowestProjectMilliseconds,
    milliseconds,
  );
  const bucket =
    milliseconds < 100 ? '<100ms' :
    milliseconds < 500 ? '100-499ms' :
    milliseconds < 1_000 ? '500-999ms' :
    milliseconds < 5_000 ? '1-4.9s' :
    milliseconds < 15_000 ? '5-14.9s' :
    '15s+';
  increment(timings.projectBuckets, bucket);
}

function recordAppWorldProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'app-world-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `app-world:${phase.name}`, phase.milliseconds);
  }
}

function recordTypeSystemProjectProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'type-system-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `type-system:${phase.name}`, phase.milliseconds);
  }
}

function recordResourceRecognitionProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'resource-recognition-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `resource-recognition:${phase.name}`, phase.milliseconds);
  }
}

function recordTemplateCompilationProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'template-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `template:${phase.name}`, phase.milliseconds);
  }
}

function recordTemplateRuntimeAnalysisProfiles(timings, resources) {
  if (resources == null) {
    return;
  }
  for (const resource of resources) {
    const profile = resource.runtimeAnalysis?.profile;
    if (profile == null) {
      continue;
    }
    recordTiming(timings, 'template-runtime-profile-total', profile.totalMilliseconds);
    for (const phase of profile.phases ?? []) {
      recordTiming(timings, `template-runtime:${phase.name}`, phase.milliseconds);
    }
  }
}

function printTimings(label, timings) {
  console.log('');
  console.log(label);
  const entries = Object.entries(timings.totals)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      rightValue - leftValue || leftKey.localeCompare(rightKey)
    );
  if (entries.length === 0) {
    console.log('- none');
  } else {
    for (const [key, milliseconds] of entries) {
      console.log(`- ${key}: ${milliseconds.toFixed(1)}ms`);
    }
  }
  console.log(`- slowest project: ${timings.slowestProjectMilliseconds.toFixed(1)}ms`);
  printCounts(`${label}: project buckets`, timings.projectBuckets, 10);
}
