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
    const started = performance.now();
    const analysisDepth = normalizeSemanticAppAnalysisDepth(
      options.analysisDepth ?? DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
    );
    const phases: AureliaAppWorldProjectPhaseTiming[] = [];
    const evaluation = measureAppWorldProjectPhase(phases, 'static-evaluation', () =>
      new StaticProjectEvaluationPass().evaluateAndEmit(
        store,
        project,
        new StaticProjectEvaluationOptions(
          aureliaConfigurationEvaluationPolicy,
          aureliaStaticEvaluationRuntimeHost,
          aureliaExternalEvaluationValueResolver,
        ),
      )
    );
    const typeSystem = measureAppWorldProjectPhase(phases, 'type-system', () =>
      new TypeSystemProjectBuilder().build(project, evaluation)
    );
    const resources = measureAppWorldProjectPhase(phases, 'resource-recognition', () =>
      new ResourceRecognitionProjectPass().recognizeAndEmit(store, project, evaluation, typeSystem)
    );
    const resourceIndex = measureAppWorldProjectPhase(phases, 'resource-index', () =>
      ResourceDefinitionIndex.fromProject(resources)
    );
    const routes = measureAppWorldProjectPhase(phases, 'route-config-recognition', () =>
      new RouteConfigRecognitionProjectPass().recognizeAndEmit(
        store,
        project,
        evaluation,
        resourceIndex,
      )
    );
    const configuration = measureAppWorldProjectPhase(phases, 'configuration-recognition', () =>
      new ConfigurationRecognitionProjectPass().recognizeAndEmit(
        store,
        project,
        resourceIndex,
        evaluation,
        typeSystem,
      )
    );
    const routerOptions = measureAppWorldProjectPhase(phases, 'router-options-materialization', () =>
      new RouterOptionsMaterializationProjectPass().materializeAndEmit(
        store,
        project,
        configuration,
      )
    );
    const routeContexts = measureAppWorldProjectPhase(phases, 'route-context-materialization', () =>
      new RouteConfigContextMaterializationProjectPass().materializeAndEmit(
        store,
        project,
        routes,
        routerOptions,
        configuration,
      )
    );
    const routeRecognizer = measureAppWorldProjectPhase(phases, 'route-recognizer-materialization', () =>
      new RouteRecognizerMaterializationProjectPass().materializeAndEmit(
        store,
        project,
        routeContexts,
      )
    );
    const appWorld = measureAppWorldProjectPhase(phases, 'app-world-composition', () =>
      new AureliaAppWorldComposer(store).construct(configuration.readConfiguration(), resourceIndex)
    );
    const templates = measureAppWorldProjectPhase(phases, 'template-compilation', () =>
      new TemplateCompilationProjectPass(store).compile(
        appWorld,
        typeSystem,
        resourceIndex,
        routeContexts,
        { runtimeAnalysisDepth: analysisDepth },
      )
    );
    const routeRuntimeTopology = measureAppWorldProjectPhase(phases, 'route-runtime-topology', () =>
      new RouteRuntimeTopologyProjectPass(store).materializeAndEmit(
        project,
        routeContexts,
        templates,
      )
    );
    const routeInstructions = measureAppWorldProjectPhase(phases, 'route-instruction-materialization', () =>
      new RouteInstructionMaterializationProjectPass().materializeAndEmit(
        store,
        project,
        routeContexts,
        routeRuntimeTopology,
        templates,
        routerOptions,
        evaluation,
      )
    );
    const routeRecognition = measureAppWorldProjectPhase(phases, 'route-recognition-materialization', () =>
      new RouteRecognitionMaterializationProjectPass().materializeAndEmit(
        store,
        project,
        routeContexts,
        routeRuntimeTopology,
        routeRecognizer,
        routeInstructions,
      )
    );
    const routeTree = measureAppWorldProjectPhase(phases, 'route-tree-materialization', () =>
      new RouteTreeMaterializationProjectPass().materializeAndEmit(
        store,
        project,
        routeContexts,
        routeRuntimeTopology,
        routeRecognizer,
        routeInstructions,
        routeRecognition,
        routerOptions,
      )
    );
    const routeComponentAgents = measureAppWorldProjectPhase(phases, 'route-component-agent-materialization', () =>
      new RouteComponentAgentMaterializationProjectPass(store).materializeAndEmit(
        project,
        routeRuntimeTopology,
        routeTree,
        templates,
      )
    );
    const profile: AureliaAppWorldProjectProfile = {
      totalMilliseconds: performance.now() - started,
      phases,
    };

    return new AureliaAppWorldProjectEmission(
      analysisDepth,
      project,
      evaluation,
      typeSystem,
      resources,
      resourceIndex,
      routes,
      routerOptions,
      routeContexts,
      routeRecognizer,
      configuration,
      appWorld,
      templates,
      routeRuntimeTopology,
      routeInstructions,
      routeRecognition,
      routeTree,
      routeComponentAgents,
      profile,
    );
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
