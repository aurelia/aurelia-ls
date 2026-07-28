import { performance } from 'node:perf_hooks';

import {
  DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  SemanticAppAnalysisDepth,
  normalizeSemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import {
  DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
} from '../telemetry/inquiry-profile.js';
import {
  normalizeSemanticRuntimeTelemetryOptions,
  type NormalizedSemanticRuntimeTelemetryOptions,
  type SemanticRuntimeTelemetryOptions,
} from '../telemetry/options.js';
import {
  measureSemanticRuntimePhase,
  type SemanticRuntimePhaseSink,
  type SemanticRuntimePhaseTiming,
} from '../telemetry/phase.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  type CheckerExpressionTypeEvaluationCacheStats,
  type CheckerExpressionTypeEvaluationCacheMarker,
} from '../type-system/expression-type-evaluation.js';
import { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { CheckerTypeProjector } from '../type-system/checker-projector.js';
import {
  RuntimeBindingDataFlowEmission,
  RuntimeBindingDataFlowMaterializationRequest,
  RuntimeBindingDataFlowMaterializer,
} from '../observation/binding-data-flow-materializer.js';
import {
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import {
  RuntimeExpressionAccessUseEmission,
  RuntimeExpressionAccessUseMaterializationRequest,
  RuntimeExpressionAccessUseMaterializer,
} from '../observation/runtime-expression-access-use-materializer.js';
import type { DiProviderActivationView } from '../di/provider-activation.js';
import {
  extendRuntimeBoundControllerValueTable,
  RuntimeBoundControllerValueTable,
} from '../observation/runtime-bound-controller-value.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  RuntimeBindingValueChannelEmission,
  RuntimeBindingValueChannelMaterializationRequest,
  RuntimeBindingValueChannelMaterializer,
} from '../observation/binding-value-channel-materializer.js';
import {
  RuntimeBindingBehaviorEmission,
  RuntimeBindingBehaviorMaterializationRequest,
  RuntimeBindingBehaviorMaterializer,
} from './runtime-binding-behavior-materializer.js';
import {
  type RuntimeExpressionResourcePlan,
  RuntimeExpressionResourcePlanner,
  RuntimeExpressionResourcePlanningRequest,
} from './runtime-expression-resource-plan.js';
import {
  RuntimeValueConverterEmission,
  RuntimeValueConverterMaterializationRequest,
  RuntimeValueConverterMaterializer,
} from './runtime-value-converter-materializer.js';
import {
  I18nTranslationBindingIssueEmission,
  I18nTranslationBindingIssueMaterializationRequest,
  I18nTranslationBindingIssueMaterializer,
} from '../i18n/translation-binding-issues.js';
import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  RuntimeControllerBindEmission,
  RuntimeControllerBindMaterializer,
  type RuntimeControllerBindMaterializationRequest,
} from './runtime-controller-bind-materializer.js';
import {
  RuntimeCompositionEmission,
  RuntimeCompositionMaterializationRequest,
  RuntimeCompositionMaterializer,
} from './runtime-composition-materializer.js';
import {
  RuntimeRenderingMaterializer,
  type RuntimeRenderingEmission,
  type RuntimeRenderingMaterializationRequest,
} from './runtime-rendering-materializer.js';
import type { RuntimeBindingIssue } from './runtime-binding-issue.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';
import {
  TemplateControllerScopeMaterializer,
  type TemplateScopeConstructionEmission,
  type TemplateScopeConstructionRequest,
} from './template-controller-scope-materializer.js';

/** Runtime/checker analysis request for one compiled custom-element definition. */
export class TemplateRuntimeAnalysisRequest {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Project key that owns this runtime analysis, when known. */
    readonly projectKey: string | null,
    /** Custom element definition whose compiled template is being analyzed. */
    readonly definition: CustomElementDefinition,
    /** App-root component definition for this compiler cohort; null when runtime ownership is not proven. */
    readonly appRootDefinitionProductHandle: ProductHandle | null,
    /** Compiled template handoff produced by the compiler-front-door phase. */
    readonly compiledTemplate: CompiledTemplateEmission,
    /** Runtime AttrSyntax products needed by dynamic spread compilation. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Compiler world that supplies Rendering, resource scope, and runtime-shaped services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
    /** Project-level compiled-template index available before runtime rendering runs. */
    readonly projectContext: TemplateRuntimeAnalysisProjectContext,
    /** Shared static evaluation available for repeat-local value carriers and other runtime Scope value handoff. */
    readonly evaluation: StaticProjectEvaluationResult | null,
    /** Current TypeChecker epoch, if resource recognition supplied one. */
    readonly typeSystem: TypeSystemProject | null,
    /** App-world DI activation authority for source-value evaluation. */
    readonly sourceValueActivationView: DiProviderActivationView | null,
    /** Project resource index for runtime resource lookup and component-valued binding resolution. */
    readonly resourceDefinitions: ResourceDefinitionIndex | null = null,
    /** Analysis depth requested by the app-world inquiry. */
    readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` = DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
    /** Shared expression TypeChecker world for the surrounding template-analysis pass. */
    readonly expressionWorld: CheckerExpressionTypeWorld | null = null,
    /** Telemetry policy inherited from the app-world inquiry boundary. */
    readonly telemetry: SemanticRuntimeTelemetryOptions | null = null,
    /** Parent-to-child bindable values from runtime analyses that are already available at this point in the project pass. */
    readonly boundControllerValues: RuntimeBoundControllerValueTable = RuntimeBoundControllerValueTable.empty,
  ) {}
}

export type TemplateRuntimeAnalysisPhaseName =
  | 'runtime-rendering'
  | 'expression-resource-plan'
  | 'scope-construction'
  | 'controller-bind'
  | 'i18n-translation-binding'
  | 'binding-behavior'
  | 'value-converter'
  | 'runtime-expression-access-use'
  | 'binding-value-channel'
  | 'binding-data-flow'
  | 'runtime-composition';

export type TemplateRuntimeAnalysisPhaseTiming = SemanticRuntimePhaseTiming<TemplateRuntimeAnalysisPhaseName> & {
  readonly skipped?: boolean;
};

export interface TemplateRuntimeAnalysisProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly TemplateRuntimeAnalysisPhaseTiming[];
  readonly expressionTypeCache: CheckerExpressionTypeEvaluationCacheStats;
}

/** Runtime/checker analysis products downstream of compiled-template row assembly. */
export class TemplateRuntimeAnalysisEmission {
  constructor(
    /** Depth that was actually materialized for this resource. */
    readonly analysisDepth: SemanticAppAnalysisDepth,
    /** Runtime renderer emulation over compiled-template target rows. */
    readonly runtimeRendering: RuntimeRenderingEmission,
    /** Pre-bind behavior reachability and state mutations spent by every later binding phase. */
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
    /** Checker-backed binding scopes derived from controller/rendering scope effects. */
    readonly scopes: TemplateScopeConstructionEmission,
    /** Runtime Controller.bind target-side access and operation products. */
    readonly controllerBind: RuntimeControllerBindEmission,
    /** Runtime i18n TranslationBinding.create/bind lifecycle framework issues. */
    readonly i18nTranslationBinding: I18nTranslationBindingIssueEmission,
    /** Runtime binding-behavior applications and behavior-owned framework issues. */
    readonly bindingBehavior: RuntimeBindingBehaviorEmission,
    /** Runtime value-converter applications and converter-owned framework issues. */
    readonly valueConverter: RuntimeValueConverterEmission,
    /** Owner-qualified runtime expression access occurrences paired with exact operation slots and checker targets. */
    readonly expressionAccessUses: RuntimeExpressionAccessUseEmission,
    /** Value channels derived from target access, target operation, and observer semantics. */
    readonly bindingValueChannel: RuntimeBindingValueChannelEmission,
    /** Source/target data-flow edges derived from runtime binding scopes and target-side products. */
    readonly bindingDataFlow: RuntimeBindingDataFlowEmission,
    /** Runtime-html AuCompose composition contexts/controllers derived after source values and data-flow are visible. */
    readonly runtimeComposition: RuntimeCompositionEmission,
    /** Run-local expression world shared by materializers; post-commit inquiries must start a fresh generation. */
    readonly expressionWorld: CheckerExpressionTypeWorld,
    /** Nested timing profile for the runtime/checker half of template analysis. */
    readonly profile: TemplateRuntimeAnalysisProfile,
  ) {}

  /** Rebind this immutable product graph to another expression-world authority for the same semantic generation. */
  forExpressionWorld(expressionWorld: CheckerExpressionTypeWorld): TemplateRuntimeAnalysisEmission {
    return new TemplateRuntimeAnalysisEmission(
      this.analysisDepth,
      this.runtimeRendering,
      this.expressionResourcePlan,
      this.scopes,
      this.controllerBind,
      this.i18nTranslationBinding,
      this.bindingBehavior,
      this.valueConverter,
      this.expressionAccessUses,
      this.bindingValueChannel,
      this.bindingDataFlow,
      this.runtimeComposition,
      expressionWorld,
      this.profile,
    );
  }

  /** Reuse retained semantic products while reporting that this app generation performed no runtime-analysis work. */
  forCarriedExpressionWorld(expressionWorld: CheckerExpressionTypeWorld): TemplateRuntimeAnalysisEmission {
    return new TemplateRuntimeAnalysisEmission(
      this.analysisDepth,
      this.runtimeRendering,
      this.expressionResourcePlan,
      this.scopes,
      this.controllerBind,
      this.i18nTranslationBinding,
      this.bindingBehavior,
      this.valueConverter,
      this.expressionAccessUses,
      this.bindingValueChannel,
      this.bindingDataFlow,
      this.runtimeComposition,
      expressionWorld,
      {
        totalMilliseconds: 0,
        phases: [],
        expressionTypeCache: expressionWorld.cacheSnapshot(),
      },
    );
  }

  /** Rebind this immutable product graph to the store-backed expression world installed after commit. */
  forCommittedGeneration(expressionWorld: CheckerExpressionTypeWorld): TemplateRuntimeAnalysisEmission {
    return this.forExpressionWorld(expressionWorld);
  }

  /** Runtime binding lifecycle issues across creation, renderer admission, bind, and plugin-owned bind phases. */
  readRuntimeBindingIssues(): readonly RuntimeBindingIssue[] {
    return [
      ...this.runtimeRendering.bindingIssues,
      ...this.controllerBind.bindingIssues,
      ...this.i18nTranslationBinding.issues,
    ];
  }

  /** Open runtime-template boundaries retained by every analysis phase. */
  readOpenSeams(): readonly OpenSeam[] {
    return [
      ...this.runtimeRendering.openSeams,
      ...this.scopes.openSeams,
      ...this.controllerBind.openSeams,
      ...this.bindingValueChannel.openSeams,
      ...this.bindingDataFlow.openSeams,
      ...this.runtimeComposition.openSeams,
    ];
  }

  /** Runtime controllers materialized by renderer hydration and closed AuCompose handoffs. */
  readRuntimeControllers() {
    return [
      ...this.runtimeRendering.controllers,
      ...this.runtimeComposition.composedControllers,
    ];
  }

  /** Runtime child containers materialized by renderer hydration and closed AuCompose handoffs. */
  readRuntimeChildContainers() {
    return [
      ...this.runtimeRendering.childContainers,
      ...this.runtimeComposition.childContainers.map((emission) => emission.container),
    ];
  }

  /** Contextual resolver slots installed on every renderer- or composition-owned child container. */
  readRuntimeChildContextResolverSlots() {
    return [
      ...this.runtimeRendering.childContextResolverSlots,
      ...this.runtimeComposition.childContainers.flatMap((emission) => emission.contextResolverSlots),
    ];
  }
}

/**
 * Runs the runtime/checker half of template analysis after compiler row assembly.
 *
 * Keep recursive rendering, scope handoff, Controller.bind emulation, and observer/data-flow products in this phase
 * instead of growing the compiler-front-door pass.
 */
export class TemplateRuntimeAnalysisMaterializer {
  private readonly runtimeRendering: RuntimeRenderingMaterializer;
  private readonly expressionResourcePlan: RuntimeExpressionResourcePlanner;
  private readonly templateScopes: TemplateControllerScopeMaterializer;
  private readonly controllerBind: RuntimeControllerBindMaterializer;
  private readonly i18nTranslationBinding: I18nTranslationBindingIssueMaterializer;
  private readonly bindingBehavior: RuntimeBindingBehaviorMaterializer;
  private readonly valueConverter: RuntimeValueConverterMaterializer;
  private readonly expressionAccessUses: RuntimeExpressionAccessUseMaterializer;
  private readonly bindingValueChannel: RuntimeBindingValueChannelMaterializer;
  private readonly bindingDataFlow: RuntimeBindingDataFlowMaterializer;
  private readonly runtimeComposition: RuntimeCompositionMaterializer;

  constructor(
    /** Hot analysis store shared by child materializers. */
    readonly store: KernelStore,
    /** Immediate or staged publication shared by the complete runtime-analysis generation. */
    readonly publication: KernelPublicationContext,
  ) {
    this.runtimeRendering = new RuntimeRenderingMaterializer(store, publication);
    this.expressionResourcePlan = new RuntimeExpressionResourcePlanner(store);
    this.templateScopes = new TemplateControllerScopeMaterializer(store);
    this.controllerBind = new RuntimeControllerBindMaterializer(store, publication);
    this.i18nTranslationBinding = new I18nTranslationBindingIssueMaterializer(store, publication);
    this.bindingBehavior = new RuntimeBindingBehaviorMaterializer(store, publication);
    this.valueConverter = new RuntimeValueConverterMaterializer(store, publication);
    this.expressionAccessUses = new RuntimeExpressionAccessUseMaterializer(store, publication);
    this.bindingValueChannel = new RuntimeBindingValueChannelMaterializer(store, publication);
    this.bindingDataFlow = new RuntimeBindingDataFlowMaterializer(store, publication);
    this.runtimeComposition = new RuntimeCompositionMaterializer(store, publication);
  }

  materialize(request: TemplateRuntimeAnalysisRequest): TemplateRuntimeAnalysisEmission {
    return new TemplateRuntimeAnalysisFrame(request, this.store, this.publication, {
      runtimeRendering: this.runtimeRendering,
      expressionResourcePlan: this.expressionResourcePlan,
      templateScopes: this.templateScopes,
      controllerBind: this.controllerBind,
      i18nTranslationBinding: this.i18nTranslationBinding,
      bindingBehavior: this.bindingBehavior,
      valueConverter: this.valueConverter,
      expressionAccessUses: this.expressionAccessUses,
      bindingValueChannel: this.bindingValueChannel,
      bindingDataFlow: this.bindingDataFlow,
      runtimeComposition: this.runtimeComposition,
    }).materialize();
  }
}

interface TemplateRuntimeAnalysisServices {
  readonly runtimeRendering: RuntimeRenderingMaterializer;
  readonly expressionResourcePlan: RuntimeExpressionResourcePlanner;
  readonly templateScopes: TemplateControllerScopeMaterializer;
  readonly controllerBind: RuntimeControllerBindMaterializer;
  readonly i18nTranslationBinding: I18nTranslationBindingIssueMaterializer;
  readonly bindingBehavior: RuntimeBindingBehaviorMaterializer;
  readonly valueConverter: RuntimeValueConverterMaterializer;
  readonly expressionAccessUses: RuntimeExpressionAccessUseMaterializer;
  readonly bindingValueChannel: RuntimeBindingValueChannelMaterializer;
  readonly bindingDataFlow: RuntimeBindingDataFlowMaterializer;
  readonly runtimeComposition: RuntimeCompositionMaterializer;
}

class TemplateRuntimeAnalysisFrame {
  private readonly started = performance.now();
  private readonly analysisDepth: SemanticAppAnalysisDepth;
  private readonly phases: TemplateRuntimeAnalysisPhaseTiming[] = [];
  private readonly expressionWorld: CheckerExpressionTypeWorld;
  private readonly expressionCacheMarker: CheckerExpressionTypeEvaluationCacheMarker;
  private readonly telemetry: NormalizedSemanticRuntimeTelemetryOptions;
  private readonly boundControllerValues: RuntimeBoundControllerValueTable;
  private readonly sourceValueActivationView: DiProviderActivationView | null;

  constructor(
    private readonly request: TemplateRuntimeAnalysisRequest,
    private readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
    private readonly services: TemplateRuntimeAnalysisServices,
  ) {
    this.analysisDepth = normalizeSemanticAppAnalysisDepth(request.analysisDepth);
    this.expressionWorld = request.expressionWorld
      ?? new CheckerExpressionTypeWorld(store, new CheckerTypeProjector(store, publication));
    this.expressionCacheMarker = this.expressionWorld.cacheMarker();
    this.telemetry = normalizeSemanticRuntimeTelemetryOptions(
      request.telemetry,
      DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
    );
    this.boundControllerValues = request.boundControllerValues;
    this.sourceValueActivationView = request.sourceValueActivationView;
  }

  materialize(): TemplateRuntimeAnalysisEmission {
    const runtimeRendering = this.measure('runtime-rendering', () =>
      this.materializeRuntimeRendering()
    );
    const expressionResourcePlan = this.measure('expression-resource-plan', () =>
      this.planBindingBehaviors(runtimeRendering)
    );
    const scopes = this.measure('scope-construction', () =>
      this.constructScopes(runtimeRendering, expressionResourcePlan)
    );
    const controllerBind = this.materializeControllerBindForDepth(runtimeRendering, expressionResourcePlan, scopes);
    const i18nTranslationBinding = this.materializeI18nTranslationBindingForDepth(
      runtimeRendering,
      expressionResourcePlan,
      scopes,
    );
    const bindingBehavior = this.materializeBindingBehaviorForDepth(expressionResourcePlan, controllerBind);
    const sourceValueEvaluator = this.runtimeAnalysisSourceValueEvaluator(
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      scopes,
    );
    const valueConverter = this.materializeValueConverterForDepth(
      runtimeRendering,
      expressionResourcePlan,
      sourceValueEvaluator,
    );
    const bindingValueChannel = this.materializeBindingValueChannelForDepth(
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      scopes,
    );
    const expressionAccessUses = this.materializeExpressionAccessUsesForDepth(
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      bindingBehavior,
      valueConverter,
      bindingValueChannel,
      scopes,
    );
    const bindingDataFlow = this.materializeBindingDataFlowForDepth(
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      bindingValueChannel,
      valueConverter,
      expressionAccessUses,
      scopes,
    );
    const runtimeComposition = this.materializeRuntimeCompositionForDepth(
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      bindingDataFlow,
      scopes,
      sourceValueEvaluator,
    );
    const profile: TemplateRuntimeAnalysisProfile = {
      totalMilliseconds: performance.now() - this.started,
      phases: this.phases,
      expressionTypeCache: this.expressionWorld.cacheSnapshotSince(this.expressionCacheMarker),
    };

    return new TemplateRuntimeAnalysisEmission(
      this.analysisDepth,
      runtimeRendering,
      expressionResourcePlan,
      scopes,
      controllerBind,
      i18nTranslationBinding,
      bindingBehavior,
      valueConverter,
      expressionAccessUses,
      bindingValueChannel,
      bindingDataFlow,
      runtimeComposition,
      this.expressionWorld,
      profile,
    );
  }

  private materializeControllerBindForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeControllerBindEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('controller-bind', () =>
        this.materializeControllerBind(runtimeRendering, expressionResourcePlan, scopes)
      )
      : skippedControllerBind(this.phases);
  }

  private materializeI18nTranslationBindingForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    scopes: TemplateScopeConstructionEmission,
  ): I18nTranslationBindingIssueEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('i18n-translation-binding', () =>
        this.materializeI18nTranslationBinding(runtimeRendering, expressionResourcePlan, scopes)
      )
      : skippedI18nTranslationBinding(this.phases);
  }

  private materializeBindingValueChannelForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingValueChannelEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
      ? this.measure('binding-value-channel', () =>
        this.materializeBindingValueChannel(runtimeRendering, expressionResourcePlan, controllerBind, scopes)
      )
      : skippedBindingValueChannel(this.phases);
  }

  private materializeExpressionAccessUsesForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    bindingBehavior: RuntimeBindingBehaviorEmission,
    valueConverter: RuntimeValueConverterEmission,
    bindingValueChannel: RuntimeBindingValueChannelEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeExpressionAccessUseEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
      ? this.measure('runtime-expression-access-use', () =>
        this.materializeExpressionAccessUses(
          runtimeRendering,
          expressionResourcePlan,
          controllerBind,
          bindingBehavior,
          valueConverter,
          bindingValueChannel,
          scopes,
        )
      )
      : skippedExpressionAccessUses(this.phases);
  }

  private materializeBindingBehaviorForDepth(
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
  ): RuntimeBindingBehaviorEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('binding-behavior', () =>
        this.materializeBindingBehavior(expressionResourcePlan, controllerBind)
      )
      : skippedBindingBehavior(this.phases);
  }

  private materializeValueConverterForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  ): RuntimeValueConverterEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('value-converter', () =>
        this.materializeValueConverter(runtimeRendering, expressionResourcePlan, sourceValueEvaluator)
      )
      : skippedValueConverter(this.phases);
  }

  private materializeBindingDataFlowForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    bindingValueChannel: RuntimeBindingValueChannelEmission,
    valueConverter: RuntimeValueConverterEmission,
    expressionAccessUses: RuntimeExpressionAccessUseEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingDataFlowEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
      ? this.measure('binding-data-flow', () =>
        this.materializeBindingDataFlow(
          runtimeRendering,
          expressionResourcePlan,
          controllerBind,
          bindingValueChannel,
          valueConverter,
          expressionAccessUses,
          scopes,
        )
      )
      : skippedBindingDataFlow(this.phases);
  }

  private materializeRuntimeCompositionForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    bindingDataFlow: RuntimeBindingDataFlowEmission,
    scopes: TemplateScopeConstructionEmission,
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  ): RuntimeCompositionEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
      ? this.measure('runtime-composition', () =>
        this.materializeRuntimeComposition(
          runtimeRendering,
          expressionResourcePlan,
          controllerBind,
          bindingDataFlow,
          scopes,
          sourceValueEvaluator,
        )
      )
      : skippedRuntimeComposition(this.phases);
  }

  private materializeRuntimeRendering(): RuntimeRenderingEmission {
    return this.services.runtimeRendering.materialize({
      localKey: this.request.localKey,
      projectKey: this.request.projectKey,
      definition: this.request.definition,
      compiledTemplate: this.request.compiledTemplate,
      attributeSyntax: this.request.attributeSyntax,
      compilerWorld: this.request.compilerWorld,
      projectContext: this.request.projectContext,
      resourceDefinitions: this.request.resourceDefinitions,
      typeSystem: this.request.typeSystem,
      expressionWorld: this.expressionWorld,
      profiling: this.profilingSink(),
    } satisfies RuntimeRenderingMaterializationRequest);
  }

  private planBindingBehaviors(
    runtimeRendering: RuntimeRenderingEmission,
  ): RuntimeExpressionResourcePlan {
    return this.services.expressionResourcePlan.plan(new RuntimeExpressionResourcePlanningRequest(
      runtimeRendering,
      this.request.compilerWorld.world.nodeObserverLocatorConfiguration,
      this.expressionWorld,
    ));
  }

  private constructScopes(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
  ): TemplateScopeConstructionEmission {
    return this.services.templateScopes.construct({
      localKey: this.request.localKey,
      definition: this.request.definition,
      compiledTemplate: this.request.compiledTemplate,
      runtimeBindings: runtimeRendering,
      expressionResourcePlan,
      projectContext: this.request.projectContext,
      evaluation: this.request.evaluation,
      typeSystem: this.request.typeSystem,
      expressionWorld: this.expressionWorld,
      boundControllerValues: this.boundControllerValues,
      sourceValueActivationView: this.sourceValueActivationView,
      profiling: this.profilingSink(),
    } satisfies TemplateScopeConstructionRequest);
  }

  private materializeControllerBind(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeControllerBindEmission {
    return this.services.controllerBind.materialize({
      localKey: this.request.localKey,
      runtimeRendering,
      expressionResourcePlan,
      scopes,
      typeSystem: this.request.typeSystem,
      expressionWorld: this.expressionWorld,
      nodeObserverLocatorConfiguration: this.request.compilerWorld.world.nodeObserverLocatorConfiguration,
      isAppRootDefinition: this.request.definition.productHandle != null
        && this.request.definition.productHandle === this.request.appRootDefinitionProductHandle,
    } satisfies RuntimeControllerBindMaterializationRequest);
  }

  private materializeBindingValueChannel(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingValueChannelEmission {
    return this.services.bindingValueChannel.materialize(new RuntimeBindingValueChannelMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      scopes,
      this.expressionWorld,
      this.request.typeSystem,
    ));
  }

  private materializeBindingBehavior(
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
  ): RuntimeBindingBehaviorEmission {
    return this.services.bindingBehavior.materialize(new RuntimeBindingBehaviorMaterializationRequest(
      this.request.localKey,
      expressionResourcePlan,
      controllerBind,
    ));
  }

  private materializeI18nTranslationBinding(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    scopes: TemplateScopeConstructionEmission,
  ): I18nTranslationBindingIssueEmission {
    return this.services.i18nTranslationBinding.materialize(new I18nTranslationBindingIssueMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      expressionResourcePlan,
      scopes,
      this.expressionWorld,
    ));
  }

  private materializeValueConverter(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  ): RuntimeValueConverterEmission {
    return this.services.valueConverter.materialize(new RuntimeValueConverterMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      expressionResourcePlan,
      sourceValueEvaluator,
    ));
  }

  private materializeExpressionAccessUses(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    bindingBehavior: RuntimeBindingBehaviorEmission,
    valueConverter: RuntimeValueConverterEmission,
    bindingValueChannel: RuntimeBindingValueChannelEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeExpressionAccessUseEmission {
    return this.services.expressionAccessUses.materialize(new RuntimeExpressionAccessUseMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      bindingBehavior,
      valueConverter,
      bindingValueChannel,
      scopes,
      this.request.typeSystem,
      this.expressionWorld,
    ));
  }

  private materializeBindingDataFlow(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    bindingValueChannel: RuntimeBindingValueChannelEmission,
    valueConverter: RuntimeValueConverterEmission,
    expressionAccessUses: RuntimeExpressionAccessUseEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingDataFlowEmission {
    return this.services.bindingDataFlow.materialize(new RuntimeBindingDataFlowMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      expressionResourcePlan,
      valueConverter,
      controllerBind,
      bindingValueChannel,
      expressionAccessUses,
      scopes,
      this.expressionWorld,
    ));
  }

  private materializeRuntimeComposition(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    bindingDataFlow: RuntimeBindingDataFlowEmission,
    scopes: TemplateScopeConstructionEmission,
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  ): RuntimeCompositionEmission {
    return this.services.runtimeComposition.materialize(new RuntimeCompositionMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      expressionResourcePlan,
      controllerBind,
      bindingDataFlow,
      scopes,
      this.expressionWorld,
      this.request.projectContext,
      this.request.resourceDefinitions,
      this.request.typeSystem,
      sourceValueEvaluator,
    ));
  }

  private runtimeAnalysisSourceValueEvaluator(
    runtimeRendering: RuntimeRenderingEmission,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    controllerBind: RuntimeControllerBindEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingSourceValueEvaluator | null {
    if (this.request.evaluation == null) {
      return null;
    }
    const runtimeAnalysisBoundControllerValues = extendRuntimeBoundControllerValueTable(
      this.boundControllerValues,
      {
        controllerProductHandle: null,
        definitionProductHandle: this.request.definition.productHandle,
        definitionTargetType: this.request.definition.target.targetType,
      },
      {
        runtimeRendering,
        expressionResourcePlan,
        controllerBind,
        scopes,
        expressionWorld: this.expressionWorld,
      },
    );
    return RuntimeBindingSourceValueEvaluator.create(
      this.publication,
      this.expressionWorld.projector,
      this.request.evaluation,
      runtimeAnalysisBoundControllerValues,
      this.sourceValueActivationView,
      this.request.compilerWorld.container,
    );
  }

  private measure<TValue>(
    name: TemplateRuntimeAnalysisPhaseName,
    read: () => TValue,
  ): TValue {
    return measureSemanticRuntimePhase(this.phases, name, this.publication, this.telemetry, read);
  }

  private profilingSink(): SemanticRuntimePhaseSink | null {
    return this.telemetry.captureFineGrainedPhases
      ? {
        phases: this.phases,
        telemetry: this.telemetry,
        kernel: this.publication,
      }
      : null;
  }
}

function skippedControllerBind(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeControllerBindEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'controller-bind');
  return new RuntimeControllerBindEmission([], [], [], [], [], []);
}

function skippedI18nTranslationBinding(phases: TemplateRuntimeAnalysisPhaseTiming[]): I18nTranslationBindingIssueEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'i18n-translation-binding');
  return new I18nTranslationBindingIssueEmission([], []);
}

function skippedBindingValueChannel(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeBindingValueChannelEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'binding-value-channel');
  return new RuntimeBindingValueChannelEmission([], [], []);
}

function skippedBindingBehavior(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeBindingBehaviorEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'binding-behavior');
  return new RuntimeBindingBehaviorEmission([], [], [], new Map());
}

function skippedValueConverter(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeValueConverterEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'value-converter');
  return new RuntimeValueConverterEmission([], [], [], new Map());
}

function skippedExpressionAccessUses(
  phases: TemplateRuntimeAnalysisPhaseTiming[],
): RuntimeExpressionAccessUseEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'runtime-expression-access-use');
  return new RuntimeExpressionAccessUseEmission([], [], []);
}

function skippedBindingDataFlow(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeBindingDataFlowEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'binding-data-flow');
  return new RuntimeBindingDataFlowEmission([], [], [], []);
}

function skippedRuntimeComposition(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeCompositionEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'runtime-composition');
  return new RuntimeCompositionEmission([], [], [], [], [], []);
}

function recordSkippedTemplateRuntimeAnalysisPhase(
  phases: TemplateRuntimeAnalysisPhaseTiming[],
  name: TemplateRuntimeAnalysisPhaseName,
): void {
  phases.push({
    name,
    milliseconds: 0,
    skipped: true,
  });
}
