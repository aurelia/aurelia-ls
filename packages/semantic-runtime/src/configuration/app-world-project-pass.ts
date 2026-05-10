import { performance } from 'node:perf_hooks';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  StaticProjectEvaluationPass,
  StaticProjectEvaluationOptions,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import type { KernelStore } from '../kernel/store.js';
import {
  ResourceDefinitionIndex,
} from '../resources/resource-definition-index.js';
import {
  ResourceRecognitionProjectPass,
  type ResourceRecognitionProjectResult,
} from '../resources/resource-recognition-project-pass.js';
import {
  TypeSystemProjectBuilder,
} from '../type-system/project.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  AureliaAppWorldEmission,
  AureliaAppWorldComposer,
} from './app-world-composer.js';
import {
  DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  SemanticAppAnalysisDepth,
  normalizeSemanticAppAnalysisDepth,
} from './app-analysis.js';
import {
  TemplateCompilationProjectPass,
  type TemplateCompilationProjectEmission,
} from '../template/template-compilation-project-pass.js';
import {
  ConfigurationRecognitionProjectPass,
  type ConfigurationRecognitionProjectResult,
} from './configuration-recognition-project-pass.js';
import {
  RouteConfigRecognitionProjectPass,
  type RouteConfigRecognitionProjectResult,
} from '../router/route-config-recognition.js';
import {
  RouterOptionsMaterializationProjectPass,
  type RouterOptionsMaterializationProjectResult,
} from '../router/router-options-materialization.js';
import {
  RouteConfigContextMaterializationProjectPass,
  type RouteConfigContextMaterializationProjectResult,
} from '../router/route-context-materialization.js';
import {
  RouteRecognizerMaterializationProjectPass,
  type RouteRecognizerMaterializationProjectResult,
} from '../router/route-recognizer-materialization.js';
import {
  RouteRuntimeTopologyProjectPass,
  type RouteRuntimeTopologyProjectResult,
} from '../router/route-runtime-topology.js';
import {
  RouteInstructionMaterializationProjectPass,
  type RouteInstructionMaterializationProjectResult,
} from '../router/route-instruction-materialization.js';
import {
  RouteRecognitionMaterializationProjectPass,
  type RouteRecognitionMaterializationProjectResult,
} from '../router/route-recognition-materialization.js';
import {
  RouteTreeMaterializationProjectPass,
  type RouteTreeMaterializationProjectResult,
} from '../router/route-tree-materialization.js';
import {
  RouteComponentAgentMaterializationProjectPass,
  type RouteComponentAgentMaterializationProjectResult,
} from '../router/route-component-agent-materialization.js';
import {
  I18nTranslationCatalogMaterializationProjectPass,
  type I18nTranslationCatalogProjectResult,
} from '../i18n/translation-catalog-materialization.js';
import { aureliaConfigurationEvaluationPolicy } from './evaluation-policy.js';
import {
  aureliaExternalEvaluationValueResolver,
  aureliaStaticEvaluationRuntimeHost,
} from './aurelia-evaluation-runtime.js';

export type AureliaAppWorldProjectPhaseName =
  | 'static-evaluation'
  | 'type-system'
  | 'resource-recognition'
  | 'resource-index'
  | 'route-config-recognition'
  | 'configuration-recognition'
  | 'router-options-materialization'
  | 'route-context-materialization'
  | 'route-recognizer-materialization'
  | 'i18n-translation-catalog'
  | 'app-world-composition'
  | 'template-compilation'
  | 'route-runtime-topology'
  | 'route-instruction-materialization'
  | 'route-recognition-materialization'
  | 'route-tree-materialization'
  | 'route-component-agent-materialization';

export interface AureliaAppWorldProjectPhaseTiming {
  readonly name: AureliaAppWorldProjectPhaseName;
  readonly milliseconds: number;
}

export interface AureliaAppWorldProjectProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly AureliaAppWorldProjectPhaseTiming[];
}

export interface AureliaAppWorldProjectOptions {
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly includeAuthoringTemplates?: boolean;
  readonly authoringTemplateSourceFiles?: readonly string[];
  readonly authoringTemplateLimit?: number | null;
}

/**
 * Current project-level composition result.
 *
 * This is an orchestration envelope, not a kernel product. It preserves the order in which the current clean-room
 * stack becomes available to callers: booted source evaluation, resource definition convergence, configuration
 * recognition, DI spending, and compiler-world construction.
 */
export class AureliaAppWorldProjectEmission {
  constructor(
    /** Analysis depth requested for the downstream runtime/checker products. */
    readonly analysisDepth: SemanticAppAnalysisDepth,
    /** Project frame analyzed by this composition pass. */
    readonly project: ProjectBootFrame,
    /** Shared static evaluation consumed by resource and configuration passes. */
    readonly evaluation: StaticProjectEvaluationResult,
    /** Shared TypeChecker epoch consumed by resource, template, and inquiry passes. */
    readonly typeSystem: TypeSystemProject,
    /** Resource recognition and convergence over the project. */
    readonly resources: ResourceRecognitionProjectResult,
    /** Product-handle and declaration index for converged resource definitions. */
    readonly resourceIndex: ResourceDefinitionIndex,
    /** Source-backed router route configs before route-context/recognizer materialization. */
    readonly routes: RouteConfigRecognitionProjectResult,
    /** RouterOptions materialized from RouterConfiguration defaults and customize contributions. */
    readonly routerOptions: RouterOptionsMaterializationProjectResult,
    /** RouteConfigContext topology and owned recognizers materialized from normalized route configs. */
    readonly routeContexts: RouteConfigContextMaterializationProjectResult,
    /** Route-recognizer configurable-route facts parsed from authored route-config paths. */
    readonly routeRecognizer: RouteRecognizerMaterializationProjectResult,
    /** Configuration recognition and kernel emission over the project. */
    readonly configuration: ConfigurationRecognitionProjectResult,
    /** Static i18n translation keys admitted from configuration resources for authoring. */
    readonly i18n: I18nTranslationCatalogProjectResult,
    /** App-world composition over the aggregated project configuration. */
    readonly appWorld: AureliaAppWorldEmission,
    /** Template compiler front-door and downstream rendering/scope products for compiler-visible custom elements. */
    readonly templates: TemplateCompilationProjectEmission,
    /** Router RouteContext/viewport/agent topology discovered after route configs and runtime rendering are known. */
    readonly routeRuntimeTopology: RouteRuntimeTopologyProjectResult,
    /** Router ViewportInstructionTree products created from router resources before route-tree compilation. */
    readonly routeInstructions: RouteInstructionMaterializationProjectResult,
    /** Router RecognizedRoute products created by walking static ViewportInstruction paths. */
    readonly routeRecognition: RouteRecognitionMaterializationProjectResult,
    /** Router RouteTree/RouteNode state for initial roots and closed pre-activation transition compilation. */
    readonly routeTree: RouteTreeMaterializationProjectResult,
    /** Router ComponentAgent handoff products for pre-activation transition RouteNodes. */
    readonly routeComponentAgents: RouteComponentAgentMaterializationProjectResult,
    /** Aggregate timing profile for x-raying this orchestration pass during app-pressure runs. */
    readonly profile: AureliaAppWorldProjectProfile,
  ) {}
}

/** Compose the current project-level Aurelia semantic passes over one booted project frame. */
export class AureliaAppWorldProjectPass {
  constructAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    options: AureliaAppWorldProjectOptions = {},
  ): AureliaAppWorldProjectEmission {
    return new AureliaAppWorldProjectConstructionFrame(store, project, options).constructAndEmit();
  }
}

class AureliaAppWorldProjectConstructionFrame {
  private readonly started = performance.now();
  private readonly analysisDepth: SemanticAppAnalysisDepth;
  private readonly includeAuthoringTemplates: boolean;
  private readonly authoringTemplateSourceFiles: readonly string[];
  private readonly authoringTemplateLimit: number | null;
  private readonly phases: AureliaAppWorldProjectPhaseTiming[] = [];

  constructor(
    readonly store: KernelStore,
    readonly project: ProjectBootFrame,
    options: AureliaAppWorldProjectOptions,
  ) {
    this.analysisDepth = normalizeSemanticAppAnalysisDepth(
      options.analysisDepth ?? DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
    );
    this.includeAuthoringTemplates = options.includeAuthoringTemplates === true;
    this.authoringTemplateSourceFiles = options.authoringTemplateSourceFiles ?? [];
    this.authoringTemplateLimit = options.authoringTemplateLimit ?? null;
  }

  constructAndEmit(): AureliaAppWorldProjectEmission {
    const evaluation = this.evaluateProject();
    const typeSystem = this.buildTypeSystem(evaluation);
    const resources = this.recognizeResources(evaluation, typeSystem);
    const resourceIndex = this.indexResources(resources);
    const routes = this.recognizeRouteConfigs(evaluation, resourceIndex);
    const configuration = this.recognizeConfiguration(evaluation, typeSystem, resourceIndex);
    const routerOptions = this.materializeRouterOptions(configuration);
    const routeContexts = this.materializeRouteContexts(routes, routerOptions, configuration);
    const routeRecognizer = this.materializeRouteRecognizer(routeContexts);
    const i18n = this.materializeI18nTranslationCatalog(configuration);
    const appWorld = this.composeAppWorld(configuration, resourceIndex);
    const templates = this.compileTemplates(appWorld, typeSystem, resourceIndex, routeContexts);
    const routeRuntimeTopology = this.materializeRouteRuntimeTopology(routeContexts, templates);
    const routeInstructions = this.materializeRouteInstructions(
      evaluation,
      routerOptions,
      routeContexts,
      routeRuntimeTopology,
      templates,
    );
    const routeRecognition = this.materializeRouteRecognition(
      routeContexts,
      routeRuntimeTopology,
      routeRecognizer,
      routeInstructions,
    );
    const routeTree = this.materializeRouteTree(
      routerOptions,
      routeContexts,
      routeRuntimeTopology,
      routeRecognizer,
      routeInstructions,
      routeRecognition,
    );
    const routeComponentAgents = this.materializeRouteComponentAgents(routeRuntimeTopology, routeTree, templates);
    return new AureliaAppWorldProjectEmission(
      this.analysisDepth,
      this.project,
      evaluation,
      typeSystem,
      resources,
      resourceIndex,
      routes,
      routerOptions,
      routeContexts,
      routeRecognizer,
      configuration,
      i18n,
      appWorld,
      templates,
      routeRuntimeTopology,
      routeInstructions,
      routeRecognition,
      routeTree,
      routeComponentAgents,
      this.profile(),
    );
  }

  private evaluateProject(): StaticProjectEvaluationResult {
    return this.measure('static-evaluation', () =>
      new StaticProjectEvaluationPass().evaluateAndEmit(
        this.store,
        this.project,
        new StaticProjectEvaluationOptions(
          aureliaConfigurationEvaluationPolicy,
          aureliaStaticEvaluationRuntimeHost,
          aureliaExternalEvaluationValueResolver,
        ),
      )
    );
  }

  private buildTypeSystem(evaluation: StaticProjectEvaluationResult): TypeSystemProject {
    return this.measure('type-system', () =>
      new TypeSystemProjectBuilder().build(this.project, evaluation)
    );
  }

  private recognizeResources(
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject,
  ): ResourceRecognitionProjectResult {
    return this.measure('resource-recognition', () =>
      new ResourceRecognitionProjectPass().recognizeAndEmit(this.store, this.project, evaluation, typeSystem)
    );
  }

  private indexResources(resources: ResourceRecognitionProjectResult): ResourceDefinitionIndex {
    return this.measure('resource-index', () =>
      ResourceDefinitionIndex.fromProject(resources)
    );
  }

  private recognizeRouteConfigs(
    evaluation: StaticProjectEvaluationResult,
    resourceIndex: ResourceDefinitionIndex,
  ): RouteConfigRecognitionProjectResult {
    return this.measure('route-config-recognition', () =>
      new RouteConfigRecognitionProjectPass().recognizeAndEmit(
        this.store,
        this.project,
        evaluation,
        resourceIndex,
      )
    );
  }

  private recognizeConfiguration(
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject,
    resourceIndex: ResourceDefinitionIndex,
  ): ConfigurationRecognitionProjectResult {
    return this.measure('configuration-recognition', () =>
      new ConfigurationRecognitionProjectPass().recognizeAndEmit(
        this.store,
        this.project,
        resourceIndex,
        evaluation,
        typeSystem,
      )
    );
  }

  private materializeRouterOptions(
    configuration: ConfigurationRecognitionProjectResult,
  ): RouterOptionsMaterializationProjectResult {
    return this.measure('router-options-materialization', () =>
      new RouterOptionsMaterializationProjectPass().materializeAndEmit(
        this.store,
        this.project,
        configuration,
      )
    );
  }

  private materializeRouteContexts(
    routes: RouteConfigRecognitionProjectResult,
    routerOptions: RouterOptionsMaterializationProjectResult,
    configuration: ConfigurationRecognitionProjectResult,
  ): RouteConfigContextMaterializationProjectResult {
    return this.measure('route-context-materialization', () =>
      new RouteConfigContextMaterializationProjectPass().materializeAndEmit(
        this.store,
        this.project,
        routes,
        routerOptions,
        configuration,
      )
    );
  }

  private materializeRouteRecognizer(
    routeContexts: RouteConfigContextMaterializationProjectResult,
  ): RouteRecognizerMaterializationProjectResult {
    return this.measure('route-recognizer-materialization', () =>
      new RouteRecognizerMaterializationProjectPass().materializeAndEmit(
        this.store,
        this.project,
        routeContexts,
      )
    );
  }

  private materializeI18nTranslationCatalog(
    configuration: ConfigurationRecognitionProjectResult,
  ): I18nTranslationCatalogProjectResult {
    return this.measure('i18n-translation-catalog', () =>
      new I18nTranslationCatalogMaterializationProjectPass().materializeAndEmit(this.store, configuration)
    );
  }

  private composeAppWorld(
    configuration: ConfigurationRecognitionProjectResult,
    resourceIndex: ResourceDefinitionIndex,
  ): AureliaAppWorldEmission {
    return this.measure('app-world-composition', () =>
      new AureliaAppWorldComposer(this.store).construct(configuration.readConfiguration(), resourceIndex)
    );
  }

  private compileTemplates(
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject,
    resourceIndex: ResourceDefinitionIndex,
    routeContexts: RouteConfigContextMaterializationProjectResult,
  ): TemplateCompilationProjectEmission {
    return this.measure('template-compilation', () =>
      new TemplateCompilationProjectPass(this.store).compile(
        appWorld,
        typeSystem,
        resourceIndex,
        routeContexts,
        {
          runtimeAnalysisDepth: this.analysisDepth,
          includeAuthoringTemplates: this.includeAuthoringTemplates,
          authoringTemplateSourceFiles: this.authoringTemplateSourceFiles,
          authoringTemplateLimit: this.authoringTemplateLimit,
          projectKey: this.project.projectKey,
        },
      )
    );
  }

  private materializeRouteRuntimeTopology(
    routeContexts: RouteConfigContextMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
  ): RouteRuntimeTopologyProjectResult {
    return this.measure('route-runtime-topology', () =>
      new RouteRuntimeTopologyProjectPass(this.store).materializeAndEmit(
        this.project,
        routeContexts,
        templates,
      )
    );
  }

  private materializeRouteInstructions(
    evaluation: StaticProjectEvaluationResult,
    routerOptions: RouterOptionsMaterializationProjectResult,
    routeContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntimeTopology: RouteRuntimeTopologyProjectResult,
    templates: TemplateCompilationProjectEmission,
  ): RouteInstructionMaterializationProjectResult {
    return this.measure('route-instruction-materialization', () =>
      new RouteInstructionMaterializationProjectPass().materializeAndEmit(
        this.store,
        this.project,
        routeContexts,
        routeRuntimeTopology,
        templates,
        routerOptions,
        evaluation,
      )
    );
  }

  private materializeRouteRecognition(
    routeContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntimeTopology: RouteRuntimeTopologyProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
    routeInstructions: RouteInstructionMaterializationProjectResult,
  ): RouteRecognitionMaterializationProjectResult {
    return this.measure('route-recognition-materialization', () =>
      new RouteRecognitionMaterializationProjectPass().materializeAndEmit(
        this.store,
        this.project,
        routeContexts,
        routeRuntimeTopology,
        routeRecognizer,
        routeInstructions,
      )
    );
  }

  private materializeRouteTree(
    routerOptions: RouterOptionsMaterializationProjectResult,
    routeContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntimeTopology: RouteRuntimeTopologyProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
    routeInstructions: RouteInstructionMaterializationProjectResult,
    routeRecognition: RouteRecognitionMaterializationProjectResult,
  ): RouteTreeMaterializationProjectResult {
    return this.measure('route-tree-materialization', () =>
      new RouteTreeMaterializationProjectPass().materializeAndEmit(
        this.store,
        this.project,
        routeContexts,
        routeRuntimeTopology,
        routeRecognizer,
        routeInstructions,
        routeRecognition,
        routerOptions,
      )
    );
  }

  private materializeRouteComponentAgents(
    routeRuntimeTopology: RouteRuntimeTopologyProjectResult,
    routeTree: RouteTreeMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
  ): RouteComponentAgentMaterializationProjectResult {
    return this.measure('route-component-agent-materialization', () =>
      new RouteComponentAgentMaterializationProjectPass(this.store).materializeAndEmit(
        this.project,
        routeRuntimeTopology,
        routeTree,
        templates,
      )
    );
  }

  private profile(): AureliaAppWorldProjectProfile {
    return {
      totalMilliseconds: performance.now() - this.started,
      phases: this.phases,
    };
  }

  private measure<TValue>(
    name: AureliaAppWorldProjectPhaseName,
    read: () => TValue,
  ): TValue {
    return measureAppWorldProjectPhase(this.phases, name, read);
  }
}

function measureAppWorldProjectPhase<TValue>(
  phases: AureliaAppWorldProjectPhaseTiming[],
  name: AureliaAppWorldProjectPhaseName,
  read: () => TValue,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
  });
  return value;
}
