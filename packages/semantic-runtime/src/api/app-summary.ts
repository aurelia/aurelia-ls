import type { ProjectBootFrame } from '../boot/frames.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { readDiResolveCallSites } from '../di/resolve-call-recognition.js';
import { i18nTranslationBindingGroups } from '../i18n/translation-binding-groups.js';
import type { KernelStore } from '../kernel/store.js';
import type { TemplateCompilerWorldEmission } from '../template/compiler-world-materializer.js';
import { readAppOpenSeams } from './open-seam-projections.js';
import type { SemanticAppSummary, SemanticSourceRoleCount } from './contracts.js';
import {
  resourceLocalBindingBehaviorApplications,
  resourceLocalBindingDataFlows,
  resourceLocalBindingObservedDependencies,
  resourceLocalBindingSourceOperations,
  resourceLocalBindingTargetAccesses,
  resourceLocalBindingTargetOperations,
  resourceLocalBindingValueChannels,
  resourceLocalRuntimeBindings,
} from './runtime-resource-ownership.js';

type TemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];

interface AppSummaryProjectCounts {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
}

interface AppSummaryEvaluationCounts {
  readonly evaluatedSources: number;
  readonly unresolvedModuleEdges: number;
  readonly evaluationIssues: number;
  readonly observationIssues: number;
}

interface AppSummaryRouterCounts {
  readonly routerOptions: number;
  readonly routeConfigs: number;
  readonly routeConfigContexts: number;
  readonly routeContexts: number;
  readonly routeRecognizers: number;
  readonly routePatterns: number;
  readonly routeEndpoints: number;
  readonly routeRecognizerStates: number;
  readonly routeRecognizerIssues: number;
  readonly routerIssues: number;
  readonly recognizedRoutes: number;
  readonly typedNavigationInstructions: number;
  readonly viewportInstructions: number;
  readonly viewportInstructionTrees: number;
  readonly routeTrees: number;
  readonly routeNodes: number;
  readonly routerViewports: number;
  readonly viewportAgents: number;
  readonly componentAgents: number;
}

interface AppSummaryConfigurationCounts {
  readonly configurationSequences: number;
  readonly configurationSteps: number;
  readonly appRoots: number;
  readonly registrationAdmissions: number;
  readonly configurationIssues: number;
  readonly stateStores: number;
  readonly stateIssues: number;
}

interface AppSummaryI18nCounts {
  readonly i18nTranslationKeys: number;
  readonly i18nTranslationBindings: number;
}

interface AppSummaryDiCounts {
  readonly containers: number;
  readonly runtimeChildContainers: number;
  readonly resolverSlots: number;
  readonly diResolveCallSites: number;
  readonly runtimeChildContextResolverSlots: number;
  readonly runtimeControllers: number;
  readonly resourceSlots: number;
  readonly diIssues: number;
  readonly diOpenSeams: number;
}

interface AppSummaryCompilerWorldCounts {
  readonly compilerWorlds: number;
  readonly visibleResources: number;
  readonly visibleSyntaxResources: number;
  readonly runtimeRenderers: number;
}

interface AppSummaryTemplateCounts {
  readonly compiledResources: number;
  readonly compiledInstructions: number;
  readonly runtimeBindings: number;
  readonly runtimeWatchers: number;
  readonly runtimeWatcherObservedDependencies: number;
  readonly runtimeTargetOperations: number;
  readonly runtimeRendererTargetOperations: number;
  readonly runtimeBindingTargetAccesses: number;
  readonly runtimeBindingTargetOperations: number;
  readonly runtimeBindingSourceOperations: number;
  readonly runtimeBindingBehaviorApplications: number;
  readonly runtimeBindingValueChannels: number;
  readonly runtimeBindingDataFlows: number;
  readonly runtimeBindingObservedDependencies: number;
  readonly runtimeBindingDataFlowSourceTypeGaps: number;
  readonly runtimeBindingDataFlowSourceAssignmentPressures: number;
  readonly bindingScopes: number;
}

interface AppSummaryKernelCounts {
  readonly kernelProducts: number;
  readonly kernelClaims: number;
  readonly kernelOpenSeams: number;
}

export function readSemanticAppSummary(
  project: ProjectBootFrame,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): SemanticAppSummary {
  const templates = emission.templates.resources;
  const appOpenSeams = readAppOpenSeams(emission, store);
  return {
    analysisDepth: emission.analysisDepth,
    ...projectSummaryCounts(project),
    ...evaluationSummaryCounts(emission),
    resourceDefinitions: emission.resources.readDefinitions().length,
    ...routerSummaryCounts(emission),
    ...configurationSummaryCounts(emission),
    computedObservationDefinitions: emission.computedObservation.readDefinitions().length,
    computedObserverSources: emission.computedObserverSources.readComputedObservers().length,
    computedObserverObservedDependencies: emission.computedObserverSources.readObservedDependencies().length,
    runtimeEffects: emission.runtimeEffects.readEffects().length,
    runtimeEffectObservedDependencies: emission.runtimeEffects.readObservedDependencies().length,
    proxyObservableEscapes: emission.proxyObservableEscapes.readEscapes().length,
    ...i18nSummaryCounts(emission),
    appTasks: appTaskSummaryCount(emission),
    ...diSummaryCounts(emission, templates),
    ...compilerWorldSummaryCounts(emission.templates.compilerWorlds),
    ...templateSummaryCounts(emission, store),
    ...kernelSummaryCounts(store, appOpenSeams.length),
  };
}

export function sourceRoleCounts(project: ProjectBootFrame): readonly SemanticSourceRoleCount[] {
  const counts = new Map<string, number>();
  for (const source of project.sourceFiles) {
    counts.set(source.role, (counts.get(source.role) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([role, count]) => ({ role, count }));
}

function projectSummaryCounts(project: ProjectBootFrame): AppSummaryProjectCounts {
  return {
    projectKey: project.projectKey,
    rootDir: project.rootDir,
    sourceFiles: project.sourceFiles.length,
  };
}

function evaluationSummaryCounts(emission: AureliaAppWorldProjectEmission): AppSummaryEvaluationCounts {
  return {
    evaluatedSources: emission.evaluation.readEvaluatedSources().length,
    unresolvedModuleEdges: emission.evaluation.readUnresolvedModules().length,
    evaluationIssues: emission.evaluationIssues.readIssues().length,
    observationIssues: emission.observation.readIssues().length,
  };
}

function routerSummaryCounts(emission: AureliaAppWorldProjectEmission): AppSummaryRouterCounts {
  return {
    routerOptions: emission.routerOptions.readRouterOptions().length,
    routeConfigs: emission.routes.readRouteConfigs().length,
    routeConfigContexts: emission.routeContexts.readRouteConfigContexts().length,
    routeContexts: emission.routeRuntimeTopology.readRouteContexts().length,
    routeRecognizers: emission.routeContexts.readRouteRecognizers().length,
    routePatterns: emission.routeRecognizer.readConfigurableRoutes().length,
    routeEndpoints: emission.routeRecognizer.readEndpoints().length,
    routeRecognizerStates: emission.routeRecognizer.readStates().length,
    routeRecognizerIssues: emission.routeRecognizer.readIssues().length,
    routerIssues: emission.routes.readIssues().length + emission.routeInstructions.readIssues().length + emission.routeRecognition.readIssues().length + emission.routeTree.readIssues().length,
    recognizedRoutes: emission.routeRecognition.readRecognizedRoutes().length,
    typedNavigationInstructions: emission.routeInstructions.readTypedNavigationInstructions().length,
    viewportInstructions: emission.routeInstructions.readViewportInstructions().length,
    viewportInstructionTrees: emission.routeInstructions.readViewportInstructionTrees().length,
    routeTrees: emission.routeTree.readRouteTrees().length,
    routeNodes: emission.routeTree.readRouteNodes().length,
    routerViewports: emission.routeRuntimeTopology.readViewports().length,
    viewportAgents: emission.routeRuntimeTopology.readViewportAgents().length,
    componentAgents: emission.routeComponentAgents.readComponentAgents().length,
  };
}

function appTaskSummaryCount(emission: AureliaAppWorldProjectEmission): number {
  return new Set([
    ...emission.configuration.readConfiguration().appTasks,
    ...emission.appWorld.diWorld.appTasks,
  ].map((task) => task.productHandle)).size;
}

function configurationSummaryCounts(emission: AureliaAppWorldProjectEmission): AppSummaryConfigurationCounts {
  const configuration = emission.configuration.readConfiguration();
  return {
    configurationSequences: configuration.sequences.length,
    configurationSteps: configuration.steps.length,
    appRoots: configuration.appRoots.length,
    registrationAdmissions: configuration.registrationAdmissions.length,
    configurationIssues: emission.appWorld.frameworkServiceCustomizations.issues.length,
    stateStores: emission.state.readStores().length,
    stateIssues: emission.state.readIssues().length,
  };
}

function i18nSummaryCounts(emission: AureliaAppWorldProjectEmission): AppSummaryI18nCounts {
  return {
    i18nTranslationKeys: emission.i18n.readTranslationKeys().length,
    i18nTranslationBindings: sumTemplates(emission.templates.resources, (resource) =>
      i18nTranslationBindingGroups(resource.runtimeAnalysis.runtimeRendering).length
    ),
  };
}

function diSummaryCounts(
  emission: AureliaAppWorldProjectEmission,
  templates: readonly TemplateResourceEmission[],
): AppSummaryDiCounts {
  const diWorld = emission.appWorld.diWorld;
  return {
    containers: diWorld.containers.length,
    runtimeChildContainers: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.runtimeRendering.childContainers.length
    ),
    resolverSlots: diWorld.resolverSlots.length,
    diResolveCallSites: readDiResolveCallSites(emission.project, emission.typeSystem).length,
    runtimeChildContextResolverSlots: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.runtimeRendering.childContextResolverSlots.length
    ),
    runtimeControllers: sumTemplates(templates, (resource) =>
      resource.runtimeAnalysis.runtimeRendering.controllers.length
    ) + emission.routeComponentAgents.readControllers().length,
    resourceSlots: diWorld.resourceSlots.length,
    diIssues: diWorld.issues.length,
    diOpenSeams: diWorld.openSeams.length,
  };
}

function compilerWorldSummaryCounts(
  compilerWorlds: readonly TemplateCompilerWorldEmission[],
): AppSummaryCompilerWorldCounts {
  return {
    compilerWorlds: compilerWorlds.length,
    visibleResources: sumCompilerWorlds(compilerWorlds, (world) => world.resourceScope.resources.length),
    visibleSyntaxResources: sumCompilerWorlds(compilerWorlds, (world) => world.resourceScope.syntaxResources.length),
    runtimeRenderers: sumCompilerWorlds(compilerWorlds, (world) => world.runtimeRenderers.length),
  };
}

function templateSummaryCounts(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): AppSummaryTemplateCounts {
  const templates = emission.templates.resources;
  const runtimeRendererTargetOperations = sumTemplates(templates, (resource) =>
    resourceLocalBindingTargetOperations(store, resource).filter((operation) => operation.binding == null).length
  );
  const runtimeBindingTargetOperations = sumTemplates(templates, (resource) =>
    resourceLocalBindingTargetOperations(store, resource).filter((operation) => operation.binding != null).length
  );
  return {
    compiledResources: templates.length,
    compiledInstructions: sumTemplates(templates, (resource) =>
      resource.compilation.compiledTemplate.instructions.length
    ),
    runtimeBindings: sumTemplates(templates, (resource) =>
      resourceLocalRuntimeBindings(store, resource).length
    ),
    runtimeWatchers: runtimeWatcherCount(emission),
    runtimeWatcherObservedDependencies: runtimeWatcherObservedDependencyCount(emission),
    runtimeTargetOperations: runtimeRendererTargetOperations + runtimeBindingTargetOperations,
    runtimeRendererTargetOperations,
    runtimeBindingTargetAccesses: sumTemplates(templates, (resource) =>
      resourceLocalBindingTargetAccesses(store, resource).length
    ),
    runtimeBindingTargetOperations,
    runtimeBindingSourceOperations: sumTemplates(templates, (resource) =>
      resourceLocalBindingSourceOperations(store, resource).length
    ),
    runtimeBindingBehaviorApplications: sumTemplates(templates, (resource) =>
      resourceLocalBindingBehaviorApplications(store, resource).length
    ),
    runtimeBindingValueChannels: sumTemplates(templates, (resource) =>
      resourceLocalBindingValueChannels(store, resource).length
    ),
    runtimeBindingDataFlows: sumTemplates(templates, (resource) =>
      resourceLocalBindingDataFlows(store, resource).length
    ),
    runtimeBindingObservedDependencies: sumTemplates(templates, (resource) =>
      resourceLocalBindingObservedDependencies(store, resource).length
    ),
    runtimeBindingDataFlowSourceTypeGaps: sumTemplates(templates, (resource) =>
      resourceLocalBindingDataFlows(store, resource).filter((dataFlow) => dataFlow.sourceTypeOpenReason != null).length
    ),
    runtimeBindingDataFlowSourceAssignmentPressures: sumTemplates(templates, (resource) =>
      resourceLocalBindingDataFlows(store, resource).filter((dataFlow) => dataFlow.sourceAssignmentReason != null).length
    ),
    bindingScopes: sumTemplates(templates, (resource) => resource.runtimeAnalysis.scopes.readScopes().length),
  };
}

function runtimeWatcherCount(emission: AureliaAppWorldProjectEmission): number {
  const watcherHandles = new Set<unknown>();
  for (const resource of emission.templates.resources) {
    for (const watcher of resource.runtimeAnalysis.runtimeRendering.watchers) {
      watcherHandles.add(watcher.productHandle);
    }
    for (const controller of resource.runtimeAnalysis.runtimeComposition.composedControllers) {
      for (const watcher of controller.readWatchers()) {
        watcherHandles.add(watcher.productHandle);
      }
    }
  }
  for (const controller of emission.routeComponentAgents.readControllers()) {
    for (const watcher of controller.readWatchers()) {
      watcherHandles.add(watcher.productHandle);
    }
  }
  return watcherHandles.size;
}

function runtimeWatcherObservedDependencyCount(emission: AureliaAppWorldProjectEmission): number {
  let count = 0;
  for (const resource of emission.templates.resources) {
    for (const watcher of resource.runtimeAnalysis.runtimeRendering.watchers) {
      count += watcher.observedDependencies.length;
    }
    for (const controller of resource.runtimeAnalysis.runtimeComposition.composedControllers) {
      for (const watcher of controller.readWatchers()) {
        count += watcher.observedDependencies.length;
      }
    }
  }
  for (const controller of emission.routeComponentAgents.readControllers()) {
    for (const watcher of controller.readWatchers()) {
      count += watcher.observedDependencies.length;
    }
  }
  return count;
}

function kernelSummaryCounts(store: KernelStore, kernelOpenSeams: number): AppSummaryKernelCounts {
  return {
    kernelProducts: store.readProducts().length,
    kernelClaims: store.readClaims().length,
    kernelOpenSeams,
  };
}

function sumTemplates(
  templates: readonly TemplateResourceEmission[],
  selectCount: (resource: TemplateResourceEmission) => number,
): number {
  return templates.reduce((total, resource) => total + selectCount(resource), 0);
}

function sumCompilerWorlds(
  compilerWorlds: readonly TemplateCompilerWorldEmission[],
  selectCount: (world: TemplateCompilerWorldEmission) => number,
): number {
  return compilerWorlds.reduce((total, world) => total + selectCount(world), 0);
}
