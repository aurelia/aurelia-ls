import { performance } from 'node:perf_hooks';
import type {
  SemanticRuntimeSupport,
} from '../framework/framework-support-authority.js';

import type { ProjectBootFrame } from '../boot/frames.js';
import type {
  StaticProjectEvaluationAccess,
  StaticProjectEvaluationAcquisitionProfile,
  StaticProjectEvaluationGeneration,
  StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  ModuleLoaderIssueMaterializer,
} from '../evaluation/module-loader-issues.js';
import {
  FrameworkApiIssueMaterializer,
} from '../evaluation/framework-api-issues.js';
import {
  mergeEvaluationIssueProjectResults,
  type EvaluationIssueProjectResult,
} from '../evaluation/evaluation-source-issues.js';
import type { GenerationAuthority } from '../kernel/generation-authority.js';
import type {
  ComputationLocus,
  ComputationRead,
  ComputationRun,
} from '../kernel/computation-lifecycle.js';
import type { KernelStore, KernelTelemetryReadView } from '../kernel/store.js';
import {
  ResourceDefinitionIndex,
} from '../resources/resource-definition-index.js';
import type {
  ResourceConventionToolingEvaluationContext,
} from '../resources/resource-convention-transform-admission.js';
import {
  ResourceDefinitionApiIssueMaterializer,
} from '../resources/resource-definition-api-issues.js';
import {
  ScopeApiIssueMaterializer,
} from './scope-api-issues.js';
import {
  ResourceRecognitionProjectPass,
  type ResourceRecognitionProjectResult,
} from '../resources/resource-recognition-project-pass.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { CheckerTypeProjector } from '../type-system/checker-projector.js';
import { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import type { DiContainerChainFacts } from '../di/container-chain.js';
import type { Container } from '../di/container.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import { DiClassDependencyProjectView } from '../di/class-dependency-plan.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import type {
  TypeSystemProjectAcquisitionProfile,
  TypeSystemProjectGeneration,
} from '../type-system/project-computation.js';
import {
  AureliaAppWorldComposer,
  type AureliaAppWorldEmission,
} from './app-world-composer.js';
import {
  DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  normalizeSemanticAppAnalysisDepth,
  type SemanticAppAnalysisDepth,
} from './app-analysis.js';
import {
  DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
  type SemanticRuntimeInquiryProfile,
} from '../telemetry/inquiry-profile.js';
import {
  normalizeSemanticRuntimeTelemetryOptions,
  type NormalizedSemanticRuntimeTelemetryOptions,
  type SemanticRuntimeTelemetryOptions,
} from '../telemetry/options.js';
import {
  measureSemanticRuntimePhase,
  type SemanticRuntimePhaseKernelProfile,
  type SemanticRuntimePhaseMemoryProfile,
} from '../telemetry/phase.js';
import {
  TemplateCompilationProjectPass,
  templateCompilerReadRebaserForFrontDoor,
  type TemplateCompilationFrontDoorEmission,
  type TemplateCompilationProjectPlan,
  type TemplateCompilationProjectEmission,
  type TemplateCompilationProjectOptions,
} from '../template/template-compilation-project-pass.js';
import { RuntimeBindingSourceValueEvaluator } from '../observation/binding-source-value-evaluator.js';
import {
  DiProviderActivationView,
  noDiProviderActivationValues,
} from '../di/provider-activation.js';
import { runtimeBoundControllerValueTableForTemplateResources } from '../observation/runtime-bound-controller-value.js';
import {
  ConfigurationRecognitionProjectPass,
  type ConfigurationRecognitionProjectResult,
} from './configuration-recognition-project-pass.js';
import {
  ConfigurationOptionShapeIssueMaterializer,
} from './configuration-option-shape-issues.js';
import {
  RouteConfigRecognitionProjectPass,
  type RouteConfigRecognitionProjectResult,
} from '../router/route-config-recognition.js';
import {
  RouteConfigConvergenceProjectPass,
  type RouteConfigConvergenceProjectResult,
} from '../router/route-config-convergence.js';
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
  RouteContextParameterReadMaterializer,
  type RouteContextParameterReadProjectResult,
} from '../router/route-context-parameter-read-materialization.js';
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
import {
  StateProjectResult,
  StateStoreConfigurationMaterializationProjectPass,
} from '../state/state-store-materialization.js';
import {
  StateGetterBindingMaterializationProjectPass,
} from '../state/state-getter-binding-materialization.js';
import {
  FromStateDecoratorIssueMaterializer,
} from '../state/from-state-decorator-issues.js';
import {
  mergeStateSourceIssueProjectResults,
  type StateSourceIssueProjectResult,
} from '../state/state-source-issues.js';
import {
  WithStoreAfterRegistrationIssueMaterializer,
} from '../state/with-store-registration-order-issues.js';
import {
  StateStoreLookupIssueMaterializer,
} from '../state/store-lookup-issues.js';
import {
  ValidationSourceIssueMaterializer,
} from '../validation/validation-source-issue-materializer.js';
import type {
  ValidationSourceIssueProjectResult,
} from '../validation/validation-source-issues.js';
import {
  FetchClientSourceIssueMaterializer,
} from '../fetch-client/fetch-client-source-issue-materializer.js';
import type {
  FetchClientSourceIssueProjectResult,
} from '../fetch-client/fetch-client-source-issues.js';
import {
  DialogSourceIssueMaterializer,
} from '../dialog/dialog-source-issue-materializer.js';
import type {
  DialogSourceIssueProjectResult,
} from '../dialog/dialog-source-issues.js';
import {
  AstTrackDecoratorIssueMaterializer,
} from '../observation/ast-track-decorator-issues.js';
import {
  ComputedDecoratorIssueMaterializer,
} from '../observation/computed-decorator-issues.js';
import {
  ComputedObservationMaterializer,
} from '../observation/computed-observation-materializer.js';
import type {
  ComputedObservationProjectResult,
} from '../observation/computed-observation.js';
import {
  ComputedObserverSourceMaterializer,
} from '../observation/computed-observer-source-materializer.js';
import type {
  ComputedObserverSourceProjectResult,
} from '../observation/computed-observer-source.js';
import {
  ProxyObservableEscapeMaterializer,
} from '../observation/proxy-observable-escape-materializer.js';
import type {
  ProxyObservableEscapeProjectResult,
} from '../observation/proxy-observable-escape.js';
import {
  RuntimeEffectMaterializer,
} from '../observation/runtime-effect-materializer.js';
import type {
  RuntimeEffectProjectResult,
} from '../observation/runtime-effect.js';
import {
  ObservableDecoratorIssueMaterializer,
} from '../observation/observable-decorator-issues.js';
import {
  NonTrackableTemplateMethodCallIssueMaterializer,
} from '../observation/non-trackable-template-method-call-issues.js';
import {
  mergeObservationSourceIssueProjectResults,
  type ObservationSourceIssueProjectResult,
} from '../observation/observation-source-issues.js';
import {
  FrameworkCapabilityDemandMaterializer,
} from '../framework/capability-demand-materializer.js';
import {
  FrameworkServiceRootMaterializer,
  type FrameworkServiceRootMaterializationResult,
} from '../framework/service-root-materializer.js';
import {
  FrameworkServiceRootEnrichmentMaterializer,
  type FrameworkServiceRootEnrichmentProjectResult,
} from '../framework/service-root-enrichment-materializer.js';
import type {
  FrameworkCapabilityDemandProjectResult,
} from '../framework/capability-demand.js';
import {
  AureliaSourceApiRootFacts,
} from '../framework/source-api-root-recognition.js';
import {
  readAppTaskCallbackRoots,
} from './app-task-source-api-roots.js';

export type AureliaAppWorldProjectPhaseName =
  | 'module-loader-issues'
  | 'framework-api-issues'
  | 'observation-source-issues'
  | 'binding-observation-issues'
  | 'computed-observation-definitions'
  | 'computed-observer-sources'
  | 'runtime-effects'
  | 'proxy-observable-escapes'
  | 'resource-recognition'
  | 'resource-index'
  | 'resource-definition-api-issues'
  | 'scope-api-issues'
  | 'route-config-recognition'
  | 'route-config-convergence'
  | 'configuration-recognition'
  | 'configuration-option-shape-issues'
  | 'router-options-materialization'
  | 'route-context-materialization'
  | 'route-recognizer-materialization'
  | 'route-context-parameter-reads'
  | 'i18n-translation-catalog'
  | 'state-store-materialization'
  | 'state-getter-binding-materialization'
  | 'state-source-issues'
  | 'source-api-root-recognition'
  | 'framework-service-roots'
  | 'framework-service-root-enrichment'
  | 'validation-source-issues'
  | 'fetch-client-source-issues'
  | 'dialog-source-issues'
  | 'state-store-lookup-issues'
  | 'app-world-composition'
  | 'template-compilation'
  | 'framework-capability-demands'
  | 'route-runtime-topology'
  | 'route-instruction-materialization'
  | 'route-recognition-materialization'
  | 'route-tree-materialization'
  | 'route-component-agent-materialization';

export interface AureliaAppWorldProjectPhaseTiming {
  readonly name: AureliaAppWorldProjectPhaseName;
  readonly milliseconds: number;
  readonly memory?: SemanticRuntimePhaseMemoryProfile;
  readonly kernel?: SemanticRuntimePhaseKernelProfile;
}

export interface AureliaAppWorldProjectProfile {
  readonly inquiryProfile: SemanticRuntimeInquiryProfile;
  readonly totalMilliseconds: number;
  readonly phases: readonly AureliaAppWorldProjectPhaseTiming[];
  readonly evaluationAcquisitions: readonly StaticProjectEvaluationAcquisitionProfile[];
  readonly typeSystemAcquisition: TypeSystemProjectAcquisitionProfile;
}

export interface AureliaAppWorldProjectOptions {
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly includeAuthoringTemplates?: boolean;
  readonly authoringTemplateSourceFiles?: readonly string[];
  readonly authoringTemplateLimit?: number | null;
  readonly telemetry?: SemanticRuntimeTelemetryOptions | null;
}

/** Explicit project-analysis phases that own the work surrounding authored template families. */
export const enum AureliaAppAnalysisPhase {
  /** Project evaluation, TypeScript, resources, configuration, DI, and compiler-world planning. */
  PreTemplate = 'pre-template',
  /** Shared runtime/checker analysis over the complete recursive template-family front doors. */
  TemplateRuntime = 'template-runtime',
  /** Observation, state, capability, and router fan-in over the complete template runtime result. */
  PostTemplate = 'post-template',
}

/** Stable child locus for one project-analysis phase inside the still-atomic app transaction. */
export class AureliaAppAnalysisPhaseLocus implements ComputationLocus {
  readonly kind = 'aurelia-app-analysis-phase';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(
    readonly projectKey: string,
    readonly phase: AureliaAppAnalysisPhase,
  ) {
    this.reconciliationKey = JSON.stringify([projectKey, phase]);
    this.summary = `${phase} app-analysis phase for ${projectKey}.`;
  }
}

/** Immutable pre-template values retained for family compilation, runtime analysis, fan-in, and later child carry. */
export class AureliaAppWorldPreTemplateEmission {
  constructor(
    readonly analysisDepth: SemanticAppAnalysisDepth,
    readonly project: ProjectBootFrame,
    readonly evaluationGeneration: StaticProjectEvaluationGeneration<null>,
    readonly conventionToolingEvaluationGeneration: StaticProjectEvaluationGeneration<ResourceConventionToolingEvaluationContext>,
    readonly typeSystemGeneration: TypeSystemProjectGeneration,
    readonly evaluation: StaticProjectEvaluationResult,
    readonly typeSystem: TypeSystemProject,
    readonly evaluationIssues: EvaluationIssueProjectResult,
    readonly sourceObservation: ObservationSourceIssueProjectResult,
    readonly computedObservation: ComputedObservationProjectResult,
    readonly computedObserverSources: ComputedObserverSourceProjectResult,
    readonly runtimeEffects: RuntimeEffectProjectResult,
    readonly proxyObservableEscapes: ProxyObservableEscapeProjectResult,
    readonly resources: ResourceRecognitionProjectResult,
    readonly resourceIndex: ResourceDefinitionIndex,
    readonly routeConfigContributions: RouteConfigRecognitionProjectResult,
    readonly routes: RouteConfigConvergenceProjectResult,
    readonly routerOptions: RouterOptionsMaterializationProjectResult,
    readonly routeContexts: RouteConfigContextMaterializationProjectResult,
    readonly routeRecognizer: RouteRecognizerMaterializationProjectResult,
    readonly routeContextParameterReads: RouteContextParameterReadProjectResult,
    readonly configuration: ConfigurationRecognitionProjectResult,
    readonly i18n: I18nTranslationCatalogProjectResult,
    readonly stateBase: StateProjectResult,
    readonly validation: ValidationSourceIssueProjectResult,
    readonly fetchClient: FetchClientSourceIssueProjectResult,
    readonly dialog: DialogSourceIssueProjectResult,
    readonly appWorld: AureliaAppWorldEmission,
    readonly serviceRoots: FrameworkServiceRootMaterializationResult,
    readonly serviceRootEnrichment: FrameworkServiceRootEnrichmentProjectResult,
    readonly templatePlan: TemplateCompilationProjectPlan,
  ) {}
}

/** Immutable post-template values derived from one complete template-runtime result. */
export class AureliaAppWorldPostTemplateEmission {
  constructor(
    readonly templates: TemplateCompilationProjectEmission,
    readonly containerChainFacts: DiContainerChainFacts,
    readonly observation: ObservationSourceIssueProjectResult,
    readonly state: StateProjectResult,
    readonly capabilityDemands: FrameworkCapabilityDemandProjectResult,
    readonly routeRuntimeTopology: RouteRuntimeTopologyProjectResult,
    readonly routeInstructions: RouteInstructionMaterializationProjectResult,
    readonly routeRecognition: RouteRecognitionMaterializationProjectResult,
    readonly routeTree: RouteTreeMaterializationProjectResult,
    readonly routeComponentAgents: RouteComponentAgentMaterializationProjectResult,
  ) {}

  forCommittedGeneration(authority: GenerationAuthority): AureliaAppWorldPostTemplateEmission {
    return new AureliaAppWorldPostTemplateEmission(
      this.templates.forCommittedGeneration(authority),
      this.containerChainFacts,
      this.observation,
      this.state,
      this.capabilityDemands,
      this.routeRuntimeTopology,
      this.routeInstructions,
      this.routeRecognition,
      this.routeTree,
      this.routeComponentAgents,
    );
  }
}

/**
 * Current project-level composition result.
 *
 * This is an orchestration envelope, not a kernel product. It preserves the order in which the current clean-room
 * stack becomes available to callers: booted source evaluation, resource definition convergence, configuration
 * recognition, DI spending, and compiler-world construction.
 */
export class AureliaAppWorldProjectEmission {
  get analysisDepth(): SemanticAppAnalysisDepth { return this.preTemplate.analysisDepth; }
  get project(): ProjectBootFrame { return this.preTemplate.project; }
  get evaluation(): StaticProjectEvaluationResult { return this.preTemplate.evaluation; }
  get typeSystem(): TypeSystemProject { return this.preTemplate.typeSystem; }
  get evaluationIssues(): EvaluationIssueProjectResult { return this.preTemplate.evaluationIssues; }
  get observation(): ObservationSourceIssueProjectResult { return this.postTemplate.observation; }
  get computedObservation(): ComputedObservationProjectResult { return this.preTemplate.computedObservation; }
  get computedObserverSources(): ComputedObserverSourceProjectResult { return this.preTemplate.computedObserverSources; }
  get runtimeEffects(): RuntimeEffectProjectResult { return this.preTemplate.runtimeEffects; }
  get proxyObservableEscapes(): ProxyObservableEscapeProjectResult { return this.preTemplate.proxyObservableEscapes; }
  get resources(): ResourceRecognitionProjectResult { return this.preTemplate.resources; }
  get resourceIndex(): ResourceDefinitionIndex { return this.preTemplate.resourceIndex; }
  get routeConfigContributions(): RouteConfigRecognitionProjectResult { return this.preTemplate.routeConfigContributions; }
  get routes(): RouteConfigConvergenceProjectResult { return this.preTemplate.routes; }
  get routerOptions(): RouterOptionsMaterializationProjectResult { return this.preTemplate.routerOptions; }
  get routeContexts(): RouteConfigContextMaterializationProjectResult { return this.preTemplate.routeContexts; }
  get routeRecognizer(): RouteRecognizerMaterializationProjectResult { return this.preTemplate.routeRecognizer; }
  get routeContextParameterReads(): RouteContextParameterReadProjectResult { return this.preTemplate.routeContextParameterReads; }
  get configuration(): ConfigurationRecognitionProjectResult { return this.preTemplate.configuration; }
  get i18n(): I18nTranslationCatalogProjectResult { return this.preTemplate.i18n; }
  get state(): StateProjectResult { return this.postTemplate.state; }
  get validation(): ValidationSourceIssueProjectResult { return this.preTemplate.validation; }
  get fetchClient(): FetchClientSourceIssueProjectResult { return this.preTemplate.fetchClient; }
  get dialog(): DialogSourceIssueProjectResult { return this.preTemplate.dialog; }
  get appWorld(): AureliaAppWorldEmission { return this.preTemplate.appWorld; }
  get templates(): TemplateCompilationProjectEmission { return this.postTemplate.templates; }
  get containerChainFacts(): DiContainerChainFacts { return this.postTemplate.containerChainFacts; }
  get capabilityDemands(): FrameworkCapabilityDemandProjectResult { return this.postTemplate.capabilityDemands; }
  get routeRuntimeTopology(): RouteRuntimeTopologyProjectResult { return this.postTemplate.routeRuntimeTopology; }
  get routeInstructions(): RouteInstructionMaterializationProjectResult { return this.postTemplate.routeInstructions; }
  get routeRecognition(): RouteRecognitionMaterializationProjectResult { return this.postTemplate.routeRecognition; }
  get routeTree(): RouteTreeMaterializationProjectResult { return this.postTemplate.routeTree; }
  get routeComponentAgents(): RouteComponentAgentMaterializationProjectResult { return this.postTemplate.routeComponentAgents; }

  constructor(
    readonly preTemplate: AureliaAppWorldPreTemplateEmission,
    readonly postTemplate: AureliaAppWorldPostTemplateEmission,
    /** Aggregate timing profile for x-raying this orchestration pass during app-pressure runs. */
    readonly profile: AureliaAppWorldProjectProfile,
  ) {}

  /** Bind run-local checker/template state to the app generation admitted after the outer transaction commits. */
  forCommittedGeneration(
    authority: GenerationAuthority,
  ): AureliaAppWorldProjectEmission {
    return new AureliaAppWorldProjectEmission(
      this.preTemplate,
      this.postTemplate.forCommittedGeneration(authority),
      this.profile,
    );
  }
}

/** Compose the current project-level Aurelia semantic passes over one booted project frame. */
export class AureliaAppWorldProjectPass {
  constructor(
    private readonly support: SemanticRuntimeSupport,
  ) {}

  constructAndEmit(
    store: KernelStore,
    publication: ComputationRun,
    project: ProjectBootFrame,
    evaluationGeneration: StaticProjectEvaluationGeneration<null>,
    evaluation: StaticProjectEvaluationResult,
    typeSystemProject: TypeSystemProjectGeneration,
    typeSystem: TypeSystemProject,
    conventionToolingEvaluation: StaticProjectEvaluationAccess<ResourceConventionToolingEvaluationContext>,
    evaluationAcquisitions: readonly StaticProjectEvaluationAcquisitionProfile[],
    typeSystemAcquisition: TypeSystemProjectAcquisitionProfile,
    upstreamReads: readonly ComputationRead[],
    options: AureliaAppWorldProjectOptions = {},
    incumbent: AureliaAppWorldProjectEmission | null = null,
  ): AureliaAppWorldProjectEmission {
    return new AureliaAppWorldProjectConstructionFrame(
      store,
      publication,
      project,
      this.support,
      evaluationGeneration,
      evaluation,
      typeSystemProject,
      typeSystem,
      conventionToolingEvaluation,
      evaluationAcquisitions,
      typeSystemAcquisition,
      upstreamReads,
      options,
      incumbent,
    ).constructAndEmit();
  }
}

class AureliaAppWorldProjectConstructionFrame {
  private readonly started = performance.now();
  private readonly analysisDepth: SemanticAppAnalysisDepth;
  private readonly includeAuthoringTemplates: boolean;
  private readonly authoringTemplateSourceFiles: readonly string[];
  private readonly authoringTemplateLimit: number | null;
  private readonly telemetry: NormalizedSemanticRuntimeTelemetryOptions;
  private readonly phases: AureliaAppWorldProjectPhaseTiming[] = [];

  constructor(
    readonly store: KernelStore,
    readonly publication: ComputationRun,
    readonly project: ProjectBootFrame,
    private readonly support: SemanticRuntimeSupport,
    private readonly evaluationGeneration: StaticProjectEvaluationGeneration<null>,
    private readonly evaluation: StaticProjectEvaluationResult,
    private readonly typeSystemProject: TypeSystemProjectGeneration,
    private readonly typeSystem: TypeSystemProject,
    private readonly conventionToolingEvaluation: StaticProjectEvaluationAccess<ResourceConventionToolingEvaluationContext>,
    private readonly evaluationAcquisitions: readonly StaticProjectEvaluationAcquisitionProfile[],
    private readonly typeSystemAcquisition: TypeSystemProjectAcquisitionProfile,
    private readonly upstreamReads: readonly ComputationRead[],
    options: AureliaAppWorldProjectOptions,
    private readonly incumbent: AureliaAppWorldProjectEmission | null,
  ) {
    this.analysisDepth = normalizeSemanticAppAnalysisDepth(
      options.analysisDepth ?? DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
    );
    this.includeAuthoringTemplates = options.includeAuthoringTemplates === true;
    this.authoringTemplateSourceFiles = options.authoringTemplateSourceFiles ?? [];
    this.authoringTemplateLimit = options.authoringTemplateLimit ?? null;
    this.telemetry = normalizeSemanticRuntimeTelemetryOptions(
      options.telemetry,
      DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
    );
  }

  constructAndEmit(): AureliaAppWorldProjectEmission {
    const preTemplateLocus = new AureliaAppAnalysisPhaseLocus(
      this.project.projectKey,
      AureliaAppAnalysisPhase.PreTemplate,
    );
    const templateRuntimeLocus = new AureliaAppAnalysisPhaseLocus(
      this.project.projectKey,
      AureliaAppAnalysisPhase.TemplateRuntime,
    );
    const postTemplateLocus = new AureliaAppAnalysisPhaseLocus(
      this.project.projectKey,
      AureliaAppAnalysisPhase.PostTemplate,
    );
    const templatePass = new TemplateCompilationProjectPass(this.store, this.publication, this.support);
    const preTemplateInputs = this.project.inputGeneration.createReadScope('aurelia-app-analysis:pre-template');
    const preTemplate = this.publication.withChild(preTemplateLocus, () => {
      const emission = this.project.inputGeneration.withReadScope(
        preTemplateInputs,
        () => this.constructPreTemplate(templatePass),
      );
      for (const read of this.upstreamReads) {
        this.publication.observe(read);
      }
      for (const read of this.project.readRegisteredInputs()) {
        this.publication.observe(read);
      }
      for (const read of preTemplateInputs.readRegisteredInputs()) {
        this.publication.observe(read);
      }
      return emission;
    });
    const frontDoor = templatePass.compileFrontDoors(
      preTemplate.templatePlan,
      this.project,
      this.incumbent?.templates.frontDoor ?? null,
    );
    const carriedTemplateRuntime = this.prepareCarriedTemplateRuntime(templatePass, preTemplate, frontDoor);
    const templates = carriedTemplateRuntime != null
      && this.publication.tryCarryChild(
        templateRuntimeLocus,
        templateCompilerReadRebaserForFrontDoor(frontDoor),
      ) != null
        ? carriedTemplateRuntime
        : this.executeTemplateRuntime(templateRuntimeLocus, templatePass, preTemplate, frontDoor);
    const carriedPostTemplate = this.prepareCarriedPostTemplate(preTemplate, templates);
    const postTemplate = carriedPostTemplate != null
      && this.publication.tryCarryChild(
        postTemplateLocus,
        templateCompilerReadRebaserForFrontDoor(frontDoor),
      ) != null
        ? carriedPostTemplate
        : this.executePostTemplate(postTemplateLocus, templateRuntimeLocus, preTemplate, templates);

    return new AureliaAppWorldProjectEmission(
      preTemplate,
      postTemplate,
      this.profile(),
    );
  }

  private constructPreTemplate(
    templatePass: TemplateCompilationProjectPass,
  ): AureliaAppWorldPreTemplateEmission {
    const evaluation = this.evaluation;
    const typeSystem = this.typeSystem;
    const sourceExpressionWorld = new CheckerExpressionTypeWorld(
      this.store,
      new CheckerTypeProjector(this.store, this.publication),
    );
    const evaluationIssues = this.materializeEvaluationIssues(evaluation, typeSystem);
    const sourceObservation = this.materializeObservationSourceIssues(typeSystem);
    const computedObservation = this.materializeComputedObservationDefinitions(typeSystem);
    const computedObserverSources = this.materializeComputedObserverSources(typeSystem, sourceExpressionWorld);
    const classDependencies = new DiClassDependencyProjectView(evaluation, typeSystem);
    const runtimeEffects = this.materializeRuntimeEffects(typeSystem, sourceExpressionWorld, classDependencies);
    const proxyObservableEscapes = this.materializeProxyObservableEscapes(typeSystem);
    const resources = this.recognizeResources(evaluation, typeSystem);
    const resourceIndex = this.indexResources(resources);
    this.materializeResourceDefinitionApiIssues(typeSystem, resources);
    this.materializeScopeApiIssues(typeSystem);
    const routeConfigContributions = this.recognizeRouteConfigs(evaluation, typeSystem, resourceIndex);
    const configuration = this.recognizeConfiguration(evaluation, typeSystem, resourceIndex);
    const routes = this.convergeRouteConfigs(routeConfigContributions, resourceIndex, configuration);
    this.materializeConfigurationOptionShapeIssues(configuration);
    const appWorld = this.composeAppWorld(configuration, resources, resourceIndex, typeSystem);
    const routerOptions = this.materializeRouterOptions(configuration, appWorld);
    const routeContexts = this.materializeRouteContexts(routes, routerOptions, configuration);
    const routeRecognizer = this.materializeRouteRecognizer(routeContexts);
    const routeContextParameterReads = this.materializeRouteContextParameterReads(
      typeSystem,
      resourceIndex,
      routes,
      routeRecognizer,
    );
    const i18n = this.materializeI18nTranslationCatalog(configuration);
    const stateBase = this.materializeStateBase(configuration, appWorld, typeSystem);
    const recognizedSourceApiRoots = this.recognizeSourceApiRoots(typeSystem, configuration);
    const serviceRoots = this.materializeFrameworkServiceRoots(
      typeSystem,
      recognizedSourceApiRoots,
      classDependencies,
    );
    const sourceApiRoots = serviceRoots.sourceApiRoots;
    const validation = this.materializeValidationSourceIssues(typeSystem, configuration, sourceApiRoots);
    const fetchClient = this.materializeFetchClientSourceIssues(typeSystem, sourceApiRoots);
    const dialog = this.materializeDialogSourceIssues(typeSystem, sourceApiRoots);
    const serviceRootEnrichment = this.enrichFrameworkServiceRoots(
      serviceRoots,
      appWorld.containerChainFacts,
    );
    const templatePlan = templatePass.plan(
      appWorld,
      typeSystem,
      resourceIndex,
      routeContexts,
      this.templateCompilationOptions(evaluation, stateBase),
    );
    return new AureliaAppWorldPreTemplateEmission(
      this.analysisDepth,
      this.project,
      this.evaluationGeneration,
      this.conventionToolingEvaluation.generation,
      this.typeSystemProject,
      evaluation,
      typeSystem,
      evaluationIssues,
      sourceObservation,
      computedObservation,
      computedObserverSources,
      runtimeEffects,
      proxyObservableEscapes,
      resources,
      resourceIndex,
      routeConfigContributions,
      routes,
      routerOptions,
      routeContexts,
      routeRecognizer,
      routeContextParameterReads,
      configuration,
      i18n,
      stateBase,
      validation,
      fetchClient,
      dialog,
      appWorld,
      serviceRoots,
      serviceRootEnrichment,
      templatePlan,
    );
  }

  private prepareCarriedTemplateRuntime(
    templatePass: TemplateCompilationProjectPass,
    preTemplate: AureliaAppWorldPreTemplateEmission,
    frontDoor: TemplateCompilationFrontDoorEmission,
  ): TemplateCompilationProjectEmission | null {
    const previous = this.incumbent;
    if (
      previous == null
      || preTemplate.analysisDepth !== previous.analysisDepth
      || preTemplate.evaluationGeneration !== previous.preTemplate.evaluationGeneration
      || preTemplate.conventionToolingEvaluationGeneration
        !== previous.preTemplate.conventionToolingEvaluationGeneration
      || preTemplate.typeSystemGeneration !== previous.preTemplate.typeSystemGeneration
    ) {
      return null;
    }
    return templatePass.rebaseAnalyzedFrontDoors(
      frontDoor,
      previous.templates,
      this.templateCompilationOptions(preTemplate.evaluation, preTemplate.stateBase),
    );
  }

  private executeTemplateRuntime(
    locus: AureliaAppAnalysisPhaseLocus,
    templatePass: TemplateCompilationProjectPass,
    preTemplate: AureliaAppWorldPreTemplateEmission,
    frontDoor: TemplateCompilationFrontDoorEmission,
  ): TemplateCompilationProjectEmission {
    const inputs = this.project.inputGeneration.createReadScope('aurelia-app-analysis:template-runtime');
    return this.publication.withChild(locus, () => {
      const emission = this.project.inputGeneration.withReadScope(
        inputs,
        () => this.measure('template-compilation', () => templatePass.analyzeFrontDoors(
          frontDoor,
          preTemplate.typeSystem,
          preTemplate.resourceIndex,
          this.templateCompilationOptions(preTemplate.evaluation, preTemplate.stateBase),
        )),
      );
      for (const read of this.upstreamReads) {
        this.publication.observe(read);
      }
      for (const read of inputs.readRegisteredInputs()) {
        this.publication.observe(read);
      }
      return emission;
    });
  }

  private prepareCarriedPostTemplate(
    preTemplate: AureliaAppWorldPreTemplateEmission,
    templates: TemplateCompilationProjectEmission,
  ): AureliaAppWorldPostTemplateEmission | null {
    const previous = this.incumbent?.postTemplate ?? null;
    if (previous == null) {
      return null;
    }
    const templateContainerChainFacts = preTemplate.appWorld.containerChainFacts.withContainers(
      this.store,
      templateRuntimeChildContainers(templates),
    );
    const containerChainFacts = templateContainerChainFacts.withContainers(
      this.store,
      uniqueContainers([
        ...previous.routeRuntimeTopology.readRouteContextContainers(),
        ...previous.routeComponentAgents.readControllers().flatMap((controller) =>
          controller.containerFrame == null ? [] : [controller.containerFrame]
        ),
      ]),
    );
    return new AureliaAppWorldPostTemplateEmission(
      templates,
      containerChainFacts,
      previous.observation,
      previous.state,
      previous.capabilityDemands,
      previous.routeRuntimeTopology,
      previous.routeInstructions,
      previous.routeRecognition,
      previous.routeTree,
      previous.routeComponentAgents,
    );
  }

  private executePostTemplate(
    locus: AureliaAppAnalysisPhaseLocus,
    templateRuntimeLocus: AureliaAppAnalysisPhaseLocus,
    preTemplate: AureliaAppWorldPreTemplateEmission,
    templates: TemplateCompilationProjectEmission,
  ): AureliaAppWorldPostTemplateEmission {
    const inputs = this.project.inputGeneration.createReadScope('aurelia-app-analysis:post-template');
    return this.publication.withChild(locus, () => {
      this.publication.observeChildResult(templateRuntimeLocus);
      const emission = this.project.inputGeneration.withReadScope(
        inputs,
        () => this.constructPostTemplate(preTemplate, templates),
      );
      for (const read of this.upstreamReads) {
        this.publication.observe(read);
      }
      for (const read of inputs.readRegisteredInputs()) {
        this.publication.observe(read);
      }
      return emission;
    });
  }

  private constructPostTemplate(
    preTemplate: AureliaAppWorldPreTemplateEmission,
    templates: TemplateCompilationProjectEmission,
  ): AureliaAppWorldPostTemplateEmission {
    const {
      evaluation,
      typeSystem,
      resourceIndex,
      routeContexts,
      routeRecognizer,
      routerOptions,
      configuration,
      stateBase,
      appWorld,
      serviceRoots,
      serviceRootEnrichment,
      sourceObservation,
    } = preTemplate;
    const templateContainerChainFacts = appWorld.containerChainFacts.withContainers(
      this.publication,
      templateRuntimeChildContainers(templates),
    );
    const capabilityDemands = this.materializeFrameworkCapabilityDemands(
      typeSystem,
      templates,
      appWorld.configuration,
      appWorld.diWorld,
      templateContainerChainFacts,
      serviceRoots,
      serviceRootEnrichment,
    );
    const bindingObservation = this.materializeBindingObservationIssues(typeSystem, templates);
    const observation = mergeObservationSourceIssueProjectResults([sourceObservation, bindingObservation]);
    const state = this.materializeStateStoreLookupIssues(stateBase, templates, typeSystem);
    const bindingSourceEvaluation = evaluation.forkSession();
    const bindingSourceValues = RuntimeBindingSourceValueEvaluator.create(
      this.publication,
      templates.expressionWorld.projector,
      bindingSourceEvaluation,
      runtimeBoundControllerValueTableForTemplateResources(templates.resources),
      new DiProviderActivationView(
        this.publication,
        bindingSourceEvaluation,
        typeSystem,
        appWorld.configuration,
        appWorld.diWorld,
        noDiProviderActivationValues,
      ),
    );
    const routeRuntimeTopology = this.materializeRouteRuntimeTopology(routeContexts, templates, bindingSourceValues);
    const routeInstructions = this.materializeRouteInstructions(
      resourceIndex,
      routerOptions,
      routeContexts,
      routeRecognizer,
      routeRuntimeTopology,
      templates,
      bindingSourceValues,
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
    const routeComponentAgents = this.materializeRouteComponentAgents(
      routeRuntimeTopology,
      routeTree,
      templates,
      typeSystem,
    );
    const containerChainFacts = templateContainerChainFacts.withContainers(
      this.publication,
      uniqueContainers([
        ...routeRuntimeTopology.readRouteContextContainers(),
        ...routeComponentAgents.readControllers().flatMap((controller) =>
          controller.containerFrame == null ? [] : [controller.containerFrame]
        ),
      ]),
    );
    return new AureliaAppWorldPostTemplateEmission(
      templates,
      containerChainFacts,
      observation,
      state,
      capabilityDemands,
      routeRuntimeTopology,
      routeInstructions,
      routeRecognition,
      routeTree,
      routeComponentAgents,
    );
  }

  private templateCompilationOptions(
    evaluation: StaticProjectEvaluationResult,
    state: StateProjectResult,
  ): TemplateCompilationProjectOptions {
    return {
      projectKey: this.project.projectKey,
      evaluation,
      stateStoreVisibility: state.readStoreVisibility(),
      runtimeAnalysisDepth: this.analysisDepth,
      includeAuthoringTemplates: this.includeAuthoringTemplates,
      authoringTemplateSourceFiles: this.authoringTemplateSourceFiles,
      authoringTemplateLimit: this.authoringTemplateLimit,
      telemetry: this.telemetry,
    };
  }

  private materializeEvaluationIssues(
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject,
  ): EvaluationIssueProjectResult {
    const moduleLoaderIssues = this.measure('module-loader-issues', () =>
      new ModuleLoaderIssueMaterializer(this.store, this.publication).materializeAndEmit(this.project, evaluation)
    );
    const frameworkApiIssues = this.measure('framework-api-issues', () =>
      new FrameworkApiIssueMaterializer(this.store, this.publication).materializeAndEmit(this.project, typeSystem)
    );
    return mergeEvaluationIssueProjectResults([moduleLoaderIssues, frameworkApiIssues]);
  }

  private materializeObservationSourceIssues(
    typeSystem: TypeSystemProject,
  ): ObservationSourceIssueProjectResult {
    return this.measure('observation-source-issues', () =>
      mergeObservationSourceIssueProjectResults([
        new AstTrackDecoratorIssueMaterializer(this.store, this.publication).materialize(this.project, typeSystem),
        new ComputedDecoratorIssueMaterializer(this.store, this.publication).materialize(this.project, typeSystem),
        new ObservableDecoratorIssueMaterializer(this.store, this.publication).materialize(this.project, typeSystem),
      ])
    );
  }

  private materializeBindingObservationIssues(
    typeSystem: TypeSystemProject,
    templates: TemplateCompilationProjectEmission,
  ): ObservationSourceIssueProjectResult {
    return this.measure('binding-observation-issues', () =>
      new NonTrackableTemplateMethodCallIssueMaterializer(this.store, this.publication)
        .materialize(this.project, typeSystem, templates)
    );
  }

  private materializeFrameworkCapabilityDemands(
    typeSystem: TypeSystemProject,
    templates: TemplateCompilationProjectEmission,
    configuration: ConfigurationKernelEmission,
    diWorld: DiWorldConstructionEmission,
    containerChainFacts: DiContainerChainFacts,
    serviceRoots: FrameworkServiceRootMaterializationResult,
    serviceRootEnrichment: FrameworkServiceRootEnrichmentProjectResult,
  ): FrameworkCapabilityDemandProjectResult {
    return this.measure('framework-capability-demands', () =>
      new FrameworkCapabilityDemandMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
        templates,
        configuration,
        diWorld,
        containerChainFacts,
        serviceRoots.readRoots(),
        serviceRootEnrichment,
      )
    );
  }

  private materializeComputedObservationDefinitions(
    typeSystem: TypeSystemProject,
  ): ComputedObservationProjectResult {
    return this.measure('computed-observation-definitions', () =>
      new ComputedObservationMaterializer(this.store, this.publication).materialize(this.project, typeSystem)
    );
  }

  private materializeComputedObserverSources(
    typeSystem: TypeSystemProject,
    expressionWorld: CheckerExpressionTypeWorld,
  ): ComputedObserverSourceProjectResult {
    return this.measure('computed-observer-sources', () =>
      new ComputedObserverSourceMaterializer(this.store, this.publication).materialize(
        this.project,
        typeSystem,
        expressionWorld,
      )
    );
  }

  private materializeRuntimeEffects(
    typeSystem: TypeSystemProject,
    expressionWorld: CheckerExpressionTypeWorld,
    classDependencies: DiClassDependencyProjectView,
  ): RuntimeEffectProjectResult {
    return this.measure('runtime-effects', () =>
      new RuntimeEffectMaterializer(this.store, this.publication).materialize(
        this.project,
        typeSystem,
        expressionWorld,
        classDependencies,
      )
    );
  }

  private materializeProxyObservableEscapes(
    typeSystem: TypeSystemProject,
  ): ProxyObservableEscapeProjectResult {
    return this.measure('proxy-observable-escapes', () =>
      new ProxyObservableEscapeMaterializer(this.store, this.publication).materialize(this.project, typeSystem)
    );
  }

  private recognizeResources(
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject,
  ): ResourceRecognitionProjectResult {
    return this.measure('resource-recognition', () =>
      new ResourceRecognitionProjectPass().recognizeAndEmit(
        this.store,
        this.project,
        evaluation,
        this.conventionToolingEvaluation,
        typeSystem,
        this.publication,
      )
    );
  }

  private indexResources(resources: ResourceRecognitionProjectResult): ResourceDefinitionIndex {
    return this.measure('resource-index', () =>
      ResourceDefinitionIndex.fromProject(resources)
    );
  }

  private materializeResourceDefinitionApiIssues(
    typeSystem: TypeSystemProject,
    resources: ResourceRecognitionProjectResult,
  ): void {
    this.measure('resource-definition-api-issues', () =>
      new ResourceDefinitionApiIssueMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
        resources.readDefinitions(),
      )
    );
  }

  private materializeScopeApiIssues(
    typeSystem: TypeSystemProject,
  ): void {
    this.measure('scope-api-issues', () =>
      new ScopeApiIssueMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
      )
    );
  }

  private recognizeRouteConfigs(
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject,
    resourceIndex: ResourceDefinitionIndex,
  ): RouteConfigRecognitionProjectResult {
    return this.measure('route-config-recognition', () =>
      new RouteConfigRecognitionProjectPass().recognizeAndEmit(
        this.publication,
        this.project,
        evaluation,
        resourceIndex,
        typeSystem,
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
        this.publication,
      )
    );
  }

  private convergeRouteConfigs(
    contributions: RouteConfigRecognitionProjectResult,
    resourceIndex: ResourceDefinitionIndex,
    configuration: ConfigurationRecognitionProjectResult,
  ): RouteConfigConvergenceProjectResult {
    return this.measure('route-config-convergence', () =>
      new RouteConfigConvergenceProjectPass().convergeAndEmit(
        this.publication,
        this.project,
        contributions,
        resourceIndex,
        configuration,
      )
    );
  }

  private materializeRouterOptions(
    configuration: ConfigurationRecognitionProjectResult,
    appWorld: AureliaAppWorldEmission,
  ): RouterOptionsMaterializationProjectResult {
    return this.measure('router-options-materialization', () =>
      new RouterOptionsMaterializationProjectPass().materializeAndEmit(
        this.publication,
        this.project,
        configuration,
        appWorld.diWorld,
      )
    );
  }

  private materializeRouteContexts(
    routes: RouteConfigConvergenceProjectResult,
    routerOptions: RouterOptionsMaterializationProjectResult,
    configuration: ConfigurationRecognitionProjectResult,
  ): RouteConfigContextMaterializationProjectResult {
    return this.measure('route-context-materialization', () =>
      new RouteConfigContextMaterializationProjectPass().materializeAndEmit(
        this.publication,
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
        this.publication,
        this.project,
        routeContexts,
      )
    );
  }

  private materializeRouteContextParameterReads(
    typeSystem: TypeSystemProject,
    resourceIndex: ResourceDefinitionIndex,
    routes: RouteConfigConvergenceProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
  ): RouteContextParameterReadProjectResult {
    return this.measure('route-context-parameter-reads', () =>
      new RouteContextParameterReadMaterializer().materializeAndEmit(
        this.publication,
        this.project,
        typeSystem,
        resourceIndex,
        routes,
        routeRecognizer,
      )
    );
  }

  private materializeConfigurationOptionShapeIssues(
    configuration: ConfigurationRecognitionProjectResult,
  ): void {
    this.measure('configuration-option-shape-issues', () =>
      new ConfigurationOptionShapeIssueMaterializer(this.store, this.publication)
        .materializeAndEmit(configuration)
    );
  }

  private materializeI18nTranslationCatalog(
    configuration: ConfigurationRecognitionProjectResult,
  ): I18nTranslationCatalogProjectResult {
    return this.measure('i18n-translation-catalog', () =>
      new I18nTranslationCatalogMaterializationProjectPass().materializeAndEmit(
        this.store,
        configuration,
        this.publication,
      )
    );
  }

  private materializeStateBase(
    configuration: ConfigurationRecognitionProjectResult,
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject,
  ): StateProjectResult {
    const stores = this.materializeStateStoreConfigurations(configuration, appWorld, typeSystem);
    const sourceIssues = this.materializeStateSourceIssues(typeSystem);
    const getterBindings = this.materializeStateGetterBindings(stores, typeSystem);
    return new StateProjectResult(
      stores.stores,
      getterBindings.bindings,
      [
        ...stores.issues,
        ...sourceIssues.issues,
      ],
      stores.storeVisibility,
    );
  }

  private materializeStateStoreLookupIssues(
    state: StateProjectResult,
    templates: TemplateCompilationProjectEmission,
    typeSystem: TypeSystemProject,
  ): StateProjectResult {
    const lookupIssues = this.measure('state-store-lookup-issues', () =>
      new StateStoreLookupIssueMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
        state.readStoreVisibility(),
        templates,
      )
    );
    return new StateProjectResult(
      state.stores,
      state.getterBindings,
      [
        ...state.issues,
        ...lookupIssues.issues,
      ],
      state.storeVisibility,
    );
  }

  private materializeStateStoreConfigurations(
    configuration: ConfigurationRecognitionProjectResult,
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject,
  ): StateProjectResult {
    return this.measure('state-store-materialization', () =>
      new StateStoreConfigurationMaterializationProjectPass().materializeAndEmit(
        this.store,
        configuration,
        appWorld.diWorld,
        typeSystem,
        this.publication,
      )
    );
  }

  private materializeStateSourceIssues(
    typeSystem: TypeSystemProject,
  ): StateSourceIssueProjectResult {
    return this.measure('state-source-issues', () =>
      mergeStateSourceIssueProjectResults([
        new FromStateDecoratorIssueMaterializer(this.store, this.publication)
          .materializeAndEmit(this.project, typeSystem),
        new WithStoreAfterRegistrationIssueMaterializer(this.store, this.publication)
          .materializeAndEmit(this.project, typeSystem),
      ])
    );
  }

  private materializeStateGetterBindings(
    state: StateProjectResult,
    typeSystem: TypeSystemProject,
  ) {
    return this.measure('state-getter-binding-materialization', () =>
      new StateGetterBindingMaterializationProjectPass().materializeAndEmit(
        this.store,
        this.project,
        typeSystem,
        state.readStoreVisibility().defaultSelection(),
        this.publication,
      )
    );
  }

  private recognizeSourceApiRoots(
    typeSystem: TypeSystemProject,
    configuration: ConfigurationRecognitionProjectResult,
  ): AureliaSourceApiRootFacts {
    return this.measure('source-api-root-recognition', () =>
      AureliaSourceApiRootFacts.read(this.project, typeSystem, {
        appTaskCallbackRoots: readAppTaskCallbackRoots(configuration, typeSystem),
      })
    );
  }

  private materializeFrameworkServiceRoots(
    typeSystem: TypeSystemProject,
    sourceApiRoots: AureliaSourceApiRootFacts,
    classDependencies: DiClassDependencyProjectView,
  ): FrameworkServiceRootMaterializationResult {
    return this.measure('framework-service-roots', () =>
      new FrameworkServiceRootMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
        sourceApiRoots,
        classDependencies,
      )
    );
  }

  private enrichFrameworkServiceRoots(
    serviceRoots: FrameworkServiceRootMaterializationResult,
    containerChainFacts: DiContainerChainFacts,
  ): FrameworkServiceRootEnrichmentProjectResult {
    return this.measure('framework-service-root-enrichment', () =>
      new FrameworkServiceRootEnrichmentMaterializer(this.store, this.publication).materializeAndEmit(
        this.project.projectKey,
        serviceRoots.readRoots(),
        containerChainFacts,
      )
    );
  }

  private materializeValidationSourceIssues(
    typeSystem: TypeSystemProject,
    configuration: ConfigurationRecognitionProjectResult,
    sourceApiRoots: AureliaSourceApiRootFacts,
  ): ValidationSourceIssueProjectResult {
    return this.measure('validation-source-issues', () =>
      new ValidationSourceIssueMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
        configuration,
        sourceApiRoots,
      )
    );
  }

  private materializeFetchClientSourceIssues(
    typeSystem: TypeSystemProject,
    sourceApiRoots: AureliaSourceApiRootFacts,
  ): FetchClientSourceIssueProjectResult {
    return this.measure('fetch-client-source-issues', () =>
      new FetchClientSourceIssueMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
        sourceApiRoots,
      )
    );
  }

  private materializeDialogSourceIssues(
    typeSystem: TypeSystemProject,
    sourceApiRoots: AureliaSourceApiRootFacts,
  ): DialogSourceIssueProjectResult {
    return this.measure('dialog-source-issues', () =>
      new DialogSourceIssueMaterializer(this.store, this.publication).materializeAndEmit(
        this.project,
        typeSystem,
        sourceApiRoots,
      )
    );
  }

  private composeAppWorld(
    configuration: ConfigurationRecognitionProjectResult,
    resources: ResourceRecognitionProjectResult,
    resourceIndex: ResourceDefinitionIndex,
    typeSystem: TypeSystemProject,
  ): AureliaAppWorldEmission {
    return this.measure('app-world-composition', () =>
      new AureliaAppWorldComposer(this.store, this.publication, this.support)
        .construct(
          configuration,
          resourceIndex,
          resources.callableBindings,
          this.evaluationGeneration,
          typeSystem,
          this.project,
        )
    );
  }

  private materializeRouteRuntimeTopology(
    routeContexts: RouteConfigContextMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
    bindingSourceValues: RuntimeBindingSourceValueEvaluator,
  ): RouteRuntimeTopologyProjectResult {
    return this.measure('route-runtime-topology', () =>
      new RouteRuntimeTopologyProjectPass(this.store, this.publication).materializeAndEmit(
        this.project,
        routeContexts,
        templates,
        bindingSourceValues,
      )
    );
  }

  private materializeRouteInstructions(
    resourceIndex: ResourceDefinitionIndex,
    routerOptions: RouterOptionsMaterializationProjectResult,
    routeContexts: RouteConfigContextMaterializationProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
    routeRuntimeTopology: RouteRuntimeTopologyProjectResult,
    templates: TemplateCompilationProjectEmission,
    bindingSourceValues: RuntimeBindingSourceValueEvaluator,
  ): RouteInstructionMaterializationProjectResult {
    return this.measure('route-instruction-materialization', () =>
      new RouteInstructionMaterializationProjectPass().materializeAndEmit(
        this.publication,
        this.project,
        routeContexts,
        routeRecognizer,
        routeRuntimeTopology,
        templates,
        routerOptions,
        resourceIndex,
        bindingSourceValues,
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
        this.publication,
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
        this.publication,
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
    typeSystem: TypeSystemProject,
  ): RouteComponentAgentMaterializationProjectResult {
    return this.measure('route-component-agent-materialization', () =>
      new RouteComponentAgentMaterializationProjectPass(this.store, this.publication).materializeAndEmit(
        this.project,
        routeRuntimeTopology,
        routeTree,
        templates,
        typeSystem,
      )
    );
  }

  private profile(): AureliaAppWorldProjectProfile {
    return {
      inquiryProfile: this.telemetry.inquiryProfile,
      totalMilliseconds: performance.now() - this.started,
      phases: this.phases,
      evaluationAcquisitions: this.evaluationAcquisitions,
      typeSystemAcquisition: this.typeSystemAcquisition,
    };
  }

  private measure<TValue>(
    name: AureliaAppWorldProjectPhaseName,
    read: () => TValue,
  ): TValue {
    return measureAppWorldProjectPhase(this.phases, name, this.publication, this.telemetry, read);
  }
}

function templateRuntimeChildContainers(
  templates: TemplateCompilationProjectEmission,
): readonly Container[] {
  return uniqueContainers([
    ...templates.resources,
    ...templates.authoringResources,
  ].flatMap((resource) => resource.runtimeAnalysis.readRuntimeChildContainers()));
}

function uniqueContainers(containers: readonly Container[]): readonly Container[] {
  return [...new Map(containers.map((container) => [container.identityHandle, container])).values()];
}

function measureAppWorldProjectPhase<TValue>(
  phases: AureliaAppWorldProjectPhaseTiming[],
  name: AureliaAppWorldProjectPhaseName,
  kernel: KernelTelemetryReadView,
  telemetry: NormalizedSemanticRuntimeTelemetryOptions,
  read: () => TValue,
): TValue {
  return measureSemanticRuntimePhase(phases, name, kernel, telemetry, read);
}
