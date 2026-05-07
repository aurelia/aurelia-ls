import type { TypeSystemProject } from '../type-system/project.js';
import {
  RuntimeBindingDataFlowMaterializationRequest,
  RuntimeBindingDataFlowMaterializer,
  type RuntimeBindingDataFlowEmission,
} from '../observation/binding-data-flow-materializer.js';
import {
  RuntimeBindingValueChannelMaterializationRequest,
  RuntimeBindingValueChannelMaterializer,
  type RuntimeBindingValueChannelEmission,
} from '../observation/binding-value-channel-materializer.js';
import type { KernelStore } from '../kernel/store.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  RuntimeControllerBindMaterializationInput,
  RuntimeControllerBindMaterializer,
  type RuntimeControllerBindEmission,
} from './runtime-controller-bind-materializer.js';
import {
  RuntimeRenderingMaterializationInput,
  RuntimeRenderingMaterializer,
  type RuntimeRenderingEmission,
} from './runtime-rendering-materializer.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';
import {
  TemplateControllerScopeMaterializer,
  TemplateScopeConstructionInput,
  type TemplateScopeConstructionEmission,
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
  ) {}
}

/** Runtime/checker analysis products downstream of compiled-template row assembly. */
export class TemplateRuntimeAnalysisEmission {
  constructor(
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
    const runtimeRendering = this.materializeRuntimeRendering(request);
    const scopes = this.constructScopes(request, runtimeRendering);
    const controllerBind = this.materializeControllerBind(request, runtimeRendering, scopes);
    const bindingValueChannel = this.materializeBindingValueChannel(request, runtimeRendering, controllerBind, scopes);
    const bindingDataFlow = this.materializeBindingDataFlow(request, runtimeRendering, controllerBind, bindingValueChannel, scopes);

    return new TemplateRuntimeAnalysisEmission(
      runtimeRendering,
      scopes,
      controllerBind,
      bindingValueChannel,
      bindingDataFlow,
    );
  }

  private materializeRuntimeRendering(
    request: TemplateRuntimeAnalysisRequest,
  ): RuntimeRenderingEmission {
    return this.runtimeRendering.materialize(new RuntimeRenderingMaterializationInput(
      request.localKey,
      request.definition,
      request.compiledTemplate,
      request.attributeSyntax,
      request.compilerWorld,
      request.projectContext,
    ));
  }

  private constructScopes(
    request: TemplateRuntimeAnalysisRequest,
    runtimeRendering: RuntimeRenderingEmission,
  ): TemplateScopeConstructionEmission {
    return this.templateScopes.construct(new TemplateScopeConstructionInput(
      request.localKey,
      request.definition,
      request.compiledTemplate,
      runtimeRendering,
      request.typeSystem,
      request.compilerWorld.resourceScope,
    ));
  }

  private materializeControllerBind(
    request: TemplateRuntimeAnalysisRequest,
    runtimeRendering: RuntimeRenderingEmission,
    scopes: TemplateScopeConstructionEmission,
  ): RuntimeControllerBindEmission {
    return this.controllerBind.materialize(new RuntimeControllerBindMaterializationInput(
      request.localKey,
      runtimeRendering,
      scopes,
      request.typeSystem,
    ));
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
