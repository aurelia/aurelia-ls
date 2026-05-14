import { performance } from 'node:perf_hooks';

import {
  DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  SemanticAppAnalysisDepth,
  normalizeSemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  type CheckerExpressionTypeEvaluationCacheStats,
} from '../type-system/expression-type-evaluation.js';
import { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import {
  RuntimeBindingDataFlowEmission,
  RuntimeBindingDataFlowMaterializationRequest,
  RuntimeBindingDataFlowMaterializer,
} from '../observation/binding-data-flow-materializer.js';
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
  RuntimeRenderingMaterializer,
  type RuntimeRenderingEmission,
  type RuntimeRenderingMaterializationRequest,
} from './runtime-rendering-materializer.js';
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
    /** Custom element definition whose compiled template is being analyzed. */
    readonly definition: CustomElementDefinition,
    /** Compiled template handoff produced by the compiler-front-door phase. */
    readonly compiledTemplate: CompiledTemplateEmission,
    /** Runtime AttrSyntax products needed by dynamic spread compilation. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Compiler world that supplies Rendering, resource scope, and runtime-shaped services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
    /** Project-level compiled-template index available before runtime rendering runs. */
    readonly projectContext: TemplateRuntimeAnalysisProjectContext,
    /** Current TypeChecker epoch, if resource recognition supplied one. */
    readonly typeSystem: TypeSystemProject | null,
    /** Analysis depth requested by the app-world inquiry. */
    readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` = DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  ) {}
}

export type TemplateRuntimeAnalysisPhaseName =
  | 'runtime-rendering'
  | 'scope-construction'
  | 'controller-bind'
  | 'i18n-translation-binding'
  | 'binding-behavior'
  | 'value-converter'
  | 'binding-value-channel'
  | 'binding-data-flow';

export interface TemplateRuntimeAnalysisPhaseTiming {
  readonly name: TemplateRuntimeAnalysisPhaseName;
  readonly milliseconds: number;
  readonly skipped?: boolean;
}

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
    /** Value channels derived from target access, target operation, and observer semantics. */
    readonly bindingValueChannel: RuntimeBindingValueChannelEmission,
    /** Source/target data-flow edges derived from runtime binding scopes and target-side products. */
    readonly bindingDataFlow: RuntimeBindingDataFlowEmission,
    /** Nested timing profile for the runtime/checker half of template analysis. */
    readonly profile: TemplateRuntimeAnalysisProfile,
  ) {}
}

/**
 * Runs the runtime/checker half of template analysis after compiler row assembly.
 *
 * Keep recursive rendering, scope handoff, Controller.bind emulation, and observer/data-flow products in this phase
 * instead of growing the compiler-front-door pass.
 */
export class TemplateRuntimeAnalysisMaterializer {
  private readonly runtimeRendering: RuntimeRenderingMaterializer;
  private readonly templateScopes: TemplateControllerScopeMaterializer;
  private readonly controllerBind: RuntimeControllerBindMaterializer;
  private readonly i18nTranslationBinding: I18nTranslationBindingIssueMaterializer;
  private readonly bindingBehavior: RuntimeBindingBehaviorMaterializer;
  private readonly valueConverter: RuntimeValueConverterMaterializer;
  private readonly bindingValueChannel: RuntimeBindingValueChannelMaterializer;
  private readonly bindingDataFlow: RuntimeBindingDataFlowMaterializer;

  constructor(
    /** Hot analysis store shared by child materializers. */
    readonly store: KernelStore,
  ) {
    this.runtimeRendering = new RuntimeRenderingMaterializer(store);
    this.templateScopes = new TemplateControllerScopeMaterializer(store);
    this.controllerBind = new RuntimeControllerBindMaterializer(store);
    this.i18nTranslationBinding = new I18nTranslationBindingIssueMaterializer(store);
    this.bindingBehavior = new RuntimeBindingBehaviorMaterializer(store);
    this.valueConverter = new RuntimeValueConverterMaterializer(store);
    this.bindingValueChannel = new RuntimeBindingValueChannelMaterializer(store);
    this.bindingDataFlow = new RuntimeBindingDataFlowMaterializer(store);
  }

  materialize(request: TemplateRuntimeAnalysisRequest): TemplateRuntimeAnalysisEmission {
    return new TemplateRuntimeAnalysisFrame(request, this.store, {
      runtimeRendering: this.runtimeRendering,
      templateScopes: this.templateScopes,
      controllerBind: this.controllerBind,
      i18nTranslationBinding: this.i18nTranslationBinding,
      bindingBehavior: this.bindingBehavior,
      valueConverter: this.valueConverter,
      bindingValueChannel: this.bindingValueChannel,
      bindingDataFlow: this.bindingDataFlow,
    }).materialize();
  }
}

interface TemplateRuntimeAnalysisServices {
  readonly runtimeRendering: RuntimeRenderingMaterializer;
  readonly templateScopes: TemplateControllerScopeMaterializer;
  readonly controllerBind: RuntimeControllerBindMaterializer;
  readonly i18nTranslationBinding: I18nTranslationBindingIssueMaterializer;
  readonly bindingBehavior: RuntimeBindingBehaviorMaterializer;
  readonly valueConverter: RuntimeValueConverterMaterializer;
  readonly bindingValueChannel: RuntimeBindingValueChannelMaterializer;
  readonly bindingDataFlow: RuntimeBindingDataFlowMaterializer;
}

class TemplateRuntimeAnalysisFrame {
  private readonly started = performance.now();
  private readonly analysisDepth: SemanticAppAnalysisDepth;
  private readonly phases: TemplateRuntimeAnalysisPhaseTiming[] = [];
  private readonly expressionWorld: CheckerExpressionTypeWorld;

  constructor(
    private readonly request: TemplateRuntimeAnalysisRequest,
    store: KernelStore,
    private readonly services: TemplateRuntimeAnalysisServices,
  ) {
    this.analysisDepth = normalizeSemanticAppAnalysisDepth(request.analysisDepth);
    this.expressionWorld = new CheckerExpressionTypeWorld(store);
  }

  materialize(): TemplateRuntimeAnalysisEmission {
    const runtimeRendering = this.measure('runtime-rendering', () =>
      this.materializeRuntimeRendering()
    );
    const scopes = this.measure('scope-construction', () =>
      this.constructScopes(runtimeRendering)
    );
    const controllerBind = this.materializeControllerBindForDepth(runtimeRendering, scopes);
    const i18nTranslationBinding = this.materializeI18nTranslationBindingForDepth(runtimeRendering, scopes);
    const bindingBehavior = this.materializeBindingBehaviorForDepth(runtimeRendering, controllerBind);
    const valueConverter = this.materializeValueConverterForDepth(runtimeRendering);
    const bindingValueChannel = this.materializeBindingValueChannelForDepth(runtimeRendering, controllerBind, scopes);
    const bindingDataFlow = this.materializeBindingDataFlowForDepth(
      runtimeRendering,
      controllerBind,
      bindingValueChannel,
      scopes,
    );
    const profile: TemplateRuntimeAnalysisProfile = {
      totalMilliseconds: performance.now() - this.started,
      phases: this.phases,
      expressionTypeCache: this.expressionWorld.cacheSnapshot(),
    };

    return new TemplateRuntimeAnalysisEmission(
      this.analysisDepth,
      runtimeRendering,
      scopes,
      controllerBind,
      i18nTranslationBinding,
      bindingBehavior,
      valueConverter,
      bindingValueChannel,
      bindingDataFlow,
      profile,
    );
  }

  private materializeControllerBindForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeControllerBindEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('controller-bind', () =>
        this.materializeControllerBind(runtimeRendering, scopes)
      )
      : skippedControllerBind(this.phases);
  }

  private materializeI18nTranslationBindingForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    scopes: TemplateScopeConstructionEmission,
  ): I18nTranslationBindingIssueEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('i18n-translation-binding', () =>
        this.materializeI18nTranslationBinding(runtimeRendering, scopes)
      )
      : skippedI18nTranslationBinding(this.phases);
  }

  private materializeBindingValueChannelForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingValueChannelEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
      ? this.measure('binding-value-channel', () =>
        this.materializeBindingValueChannel(runtimeRendering, controllerBind, scopes)
      )
      : skippedBindingValueChannel(this.phases);
  }

  private materializeBindingBehaviorForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
  ): RuntimeBindingBehaviorEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('binding-behavior', () =>
        this.materializeBindingBehavior(runtimeRendering, controllerBind)
      )
      : skippedBindingBehavior(this.phases);
  }

  private materializeValueConverterForDepth(
    runtimeRendering: RuntimeRenderingEmission,
  ): RuntimeValueConverterEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? this.measure('value-converter', () =>
        this.materializeValueConverter(runtimeRendering)
      )
      : skippedValueConverter(this.phases);
  }

  private materializeBindingDataFlowForDepth(
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
    bindingValueChannel: RuntimeBindingValueChannelEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingDataFlowEmission {
    return semanticAppAnalysisDepthSatisfies(this.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
      ? this.measure('binding-data-flow', () =>
        this.materializeBindingDataFlow(runtimeRendering, controllerBind, bindingValueChannel, scopes)
      )
      : skippedBindingDataFlow(this.phases);
  }

  private materializeRuntimeRendering(): RuntimeRenderingEmission {
    return this.services.runtimeRendering.materialize({
      localKey: this.request.localKey,
      definition: this.request.definition,
      compiledTemplate: this.request.compiledTemplate,
      attributeSyntax: this.request.attributeSyntax,
      compilerWorld: this.request.compilerWorld,
      projectContext: this.request.projectContext,
      typeSystem: this.request.typeSystem,
    } satisfies RuntimeRenderingMaterializationRequest);
  }

  private constructScopes(
    runtimeRendering: RuntimeRenderingEmission,
  ): TemplateScopeConstructionEmission {
    return this.services.templateScopes.construct({
      localKey: this.request.localKey,
      definition: this.request.definition,
      compiledTemplate: this.request.compiledTemplate,
      runtimeBindings: runtimeRendering,
      projectContext: this.request.projectContext,
      typeSystem: this.request.typeSystem,
      resourceScope: this.request.compilerWorld.resourceScope,
      expressionWorld: this.expressionWorld,
    } satisfies TemplateScopeConstructionRequest);
  }

  private materializeControllerBind(
    runtimeRendering: RuntimeRenderingEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeControllerBindEmission {
    return this.services.controllerBind.materialize({
      localKey: this.request.localKey,
      runtimeRendering,
      scopes,
      typeSystem: this.request.typeSystem,
      nodeObserverLocatorConfiguration: this.request.compilerWorld.nodeObserverLocatorConfiguration,
    } satisfies RuntimeControllerBindMaterializationRequest);
  }

  private materializeBindingValueChannel(
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingValueChannelEmission {
    return this.services.bindingValueChannel.materialize(new RuntimeBindingValueChannelMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      controllerBind,
      scopes,
      this.request.compilerWorld.resourceScope,
      this.expressionWorld,
    ));
  }

  private materializeBindingBehavior(
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
  ): RuntimeBindingBehaviorEmission {
    return this.services.bindingBehavior.materialize(new RuntimeBindingBehaviorMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      controllerBind,
      this.request.compilerWorld.resourceScope,
    ));
  }

  private materializeI18nTranslationBinding(
    runtimeRendering: RuntimeRenderingEmission,
    scopes: TemplateScopeConstructionEmission,
  ): I18nTranslationBindingIssueEmission {
    return this.services.i18nTranslationBinding.materialize(new I18nTranslationBindingIssueMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      scopes,
      this.request.compilerWorld.resourceScope,
      this.expressionWorld,
    ));
  }

  private materializeValueConverter(
    runtimeRendering: RuntimeRenderingEmission,
  ): RuntimeValueConverterEmission {
    return this.services.valueConverter.materialize(new RuntimeValueConverterMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      this.request.compilerWorld.container,
      this.request.compilerWorld.resourceScope,
    ));
  }

  private materializeBindingDataFlow(
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
    bindingValueChannel: RuntimeBindingValueChannelEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingDataFlowEmission {
    return this.services.bindingDataFlow.materialize(new RuntimeBindingDataFlowMaterializationRequest(
      this.request.localKey,
      runtimeRendering,
      controllerBind,
      bindingValueChannel,
      scopes,
      this.request.compilerWorld.resourceScope,
      this.expressionWorld,
    ));
  }

  private measure<TValue>(
    name: TemplateRuntimeAnalysisPhaseName,
    read: () => TValue,
  ): TValue {
    return measureTemplateRuntimeAnalysisPhase(this.phases, name, read);
  }
}

function skippedControllerBind(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeControllerBindEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'controller-bind');
  return new RuntimeControllerBindEmission([], [], [], [], []);
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
  return new RuntimeBindingBehaviorEmission([], [], []);
}

function skippedValueConverter(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeValueConverterEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'value-converter');
  return new RuntimeValueConverterEmission([], [], []);
}

function skippedBindingDataFlow(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeBindingDataFlowEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'binding-data-flow');
  return new RuntimeBindingDataFlowEmission([], [], []);
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

function measureTemplateRuntimeAnalysisPhase<TValue>(
  phases: TemplateRuntimeAnalysisPhaseTiming[],
  name: TemplateRuntimeAnalysisPhaseName,
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
