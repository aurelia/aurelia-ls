import type { ProjectBootFrame } from '../boot/frames.js';
import {
  StaticProjectEvaluationPass,
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
  TemplateCompilationProjectPass,
  type TemplateCompilationProjectEmission,
} from '../template/template-compilation-project-pass.js';
import {
  ConfigurationRecognitionProjectPass,
  type ConfigurationRecognitionProjectResult,
} from './configuration-recognition-project-pass.js';

/**
 * Current project-level composition result.
 *
 * This is an orchestration envelope, not a kernel product. It preserves the order in which the current clean-room
 * stack becomes available to callers: booted source evaluation, resource definition convergence, configuration
 * recognition, DI spending, and compiler-world construction.
 */
export class AureliaAppWorldProjectEmission {
  constructor(
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
    /** Configuration recognition and kernel emission over the project. */
    readonly configuration: ConfigurationRecognitionProjectResult,
    /** App-world composition over the aggregated project configuration. */
    readonly appWorld: AureliaAppWorldEmission,
    /** Template compiler front-door and downstream rendering/scope products for compiler-visible custom elements. */
    readonly templates: TemplateCompilationProjectEmission,
  ) {}
}

/** Compose the current project-level Aurelia semantic passes over one booted project frame. */
export class AureliaAppWorldProjectPass {
  constructAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
  ): AureliaAppWorldProjectEmission {
    const evaluation = new StaticProjectEvaluationPass().evaluateAndEmit(store, project);
    const typeSystem = new TypeSystemProjectBuilder().build(project, evaluation);
    const resources = new ResourceRecognitionProjectPass().recognizeAndEmit(store, project, evaluation, typeSystem);
    const resourceIndex = ResourceDefinitionIndex.fromProject(resources);
    const configuration = new ConfigurationRecognitionProjectPass().recognizeAndEmit(
      store,
      project,
      resourceIndex,
      evaluation,
    );
    const appWorld = new AureliaAppWorldComposer(store).construct(configuration.readConfiguration(), resourceIndex);
    const templates = new TemplateCompilationProjectPass(store).compile(appWorld, typeSystem);

    return new AureliaAppWorldProjectEmission(
      project,
      evaluation,
      typeSystem,
      resources,
      resourceIndex,
      configuration,
      appWorld,
      templates,
    );
  }
}
