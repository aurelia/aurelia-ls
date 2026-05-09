import { performance } from 'node:perf_hooks';

import {
  DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  SemanticAppAnalysisDepth,
  normalizeSemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import type { TypeSystemProject } from '../type-system/project.js';
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
  private readonly bindingValueChannel: RuntimeBindingValueChannelMaterializer;
  private readonly bindingDataFlow: RuntimeBindingDataFlowMaterializer;

  constructor(
    /** Hot analysis store shared by child materializers. */
    readonly store: KernelStore,
  ) {
    this.runtimeRendering = new RuntimeRenderingMaterializer(store);
    this.templateScopes = new TemplateControllerScopeMaterializer(store);
    this.controllerBind = new RuntimeControllerBindMaterializer(store);
    this.bindingValueChannel = new RuntimeBindingValueChannelMaterializer(store);
    this.bindingDataFlow = new RuntimeBindingDataFlowMaterializer(store);
  }

  materialize(request: TemplateRuntimeAnalysisRequest): TemplateRuntimeAnalysisEmission {
    const started = performance.now();
    const analysisDepth = normalizeSemanticAppAnalysisDepth(request.analysisDepth);
    const phases: TemplateRuntimeAnalysisPhaseTiming[] = [];
    const runtimeRendering = measureTemplateRuntimeAnalysisPhase(phases, 'runtime-rendering', () =>
      this.materializeRuntimeRendering(request)
    );
    const scopes = measureTemplateRuntimeAnalysisPhase(phases, 'scope-construction', () =>
      this.constructScopes(request, runtimeRendering)
    );
    const controllerBind = semanticAppAnalysisDepthSatisfies(analysisDepth, SemanticAppAnalysisDepth.BindingTargets)
      ? measureTemplateRuntimeAnalysisPhase(phases, 'controller-bind', () =>
        this.materializeControllerBind(request, runtimeRendering, scopes)
      )
      : skippedControllerBind(phases);
    const bindingValueChannel = semanticAppAnalysisDepthSatisfies(
      analysisDepth,
      SemanticAppAnalysisDepth.BindingObservation,
    )
      ? measureTemplateRuntimeAnalysisPhase(phases, 'binding-value-channel', () =>
        this.materializeBindingValueChannel(request, runtimeRendering, controllerBind, scopes)
      )
      : skippedBindingValueChannel(phases);
    const bindingDataFlow = semanticAppAnalysisDepthSatisfies(analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
      ? measureTemplateRuntimeAnalysisPhase(phases, 'binding-data-flow', () =>
        this.materializeBindingDataFlow(request, runtimeRendering, controllerBind, bindingValueChannel, scopes)
      )
      : skippedBindingDataFlow(phases);
    const profile: TemplateRuntimeAnalysisProfile = {
      totalMilliseconds: performance.now() - started,
      phases,
    };

    return new TemplateRuntimeAnalysisEmission(
      analysisDepth,
      runtimeRendering,
      scopes,
      controllerBind,
      bindingValueChannel,
      bindingDataFlow,
      profile,
    );
  }

  private materializeRuntimeRendering(
    request: TemplateRuntimeAnalysisRequest,
  ): RuntimeRenderingEmission {
    return this.runtimeRendering.materialize({
      localKey: request.localKey,
      definition: request.definition,
      compiledTemplate: request.compiledTemplate,
      attributeSyntax: request.attributeSyntax,
      compilerWorld: request.compilerWorld,
      projectContext: request.projectContext,
    } satisfies RuntimeRenderingMaterializationRequest);
  }

  private constructScopes(
    request: TemplateRuntimeAnalysisRequest,
    runtimeRendering: RuntimeRenderingEmission,
  ): TemplateScopeConstructionEmission {
    return this.templateScopes.construct({
      localKey: request.localKey,
      definition: request.definition,
      compiledTemplate: request.compiledTemplate,
      runtimeBindings: runtimeRendering,
      typeSystem: request.typeSystem,
      resourceScope: request.compilerWorld.resourceScope,
    } satisfies TemplateScopeConstructionRequest);
  }

  private materializeControllerBind(
    request: TemplateRuntimeAnalysisRequest,
    runtimeRendering: RuntimeRenderingEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeControllerBindEmission {
    return this.controllerBind.materialize({
      localKey: request.localKey,
      runtimeRendering,
      scopes,
      typeSystem: request.typeSystem,
    } satisfies RuntimeControllerBindMaterializationRequest);
  }

  private materializeBindingValueChannel(
    request: TemplateRuntimeAnalysisRequest,
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingValueChannelEmission {
    return this.bindingValueChannel.materialize(new RuntimeBindingValueChannelMaterializationRequest(
      request.localKey,
      runtimeRendering,
      controllerBind,
      scopes,
      request.compilerWorld.resourceScope,
    ));
  }

  private materializeBindingDataFlow(
    request: TemplateRuntimeAnalysisRequest,
    runtimeRendering: RuntimeRenderingEmission,
    controllerBind: RuntimeControllerBindEmission,
    bindingValueChannel: RuntimeBindingValueChannelEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeBindingDataFlowEmission {
    return this.bindingDataFlow.materialize(new RuntimeBindingDataFlowMaterializationRequest(
      request.localKey,
      runtimeRendering,
      controllerBind,
      bindingValueChannel,
      scopes,
      request.compilerWorld.resourceScope,
    ));
  }
}

function skippedControllerBind(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeControllerBindEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'controller-bind');
  return new RuntimeControllerBindEmission([], [], [], [], []);
}

function skippedBindingValueChannel(phases: TemplateRuntimeAnalysisPhaseTiming[]): RuntimeBindingValueChannelEmission {
  recordSkippedTemplateRuntimeAnalysisPhase(phases, 'binding-value-channel');
  return new RuntimeBindingValueChannelEmission([], [], []);
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
