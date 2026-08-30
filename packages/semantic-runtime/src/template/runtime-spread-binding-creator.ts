import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { RuntimeHydrationContext } from '../configuration/controller.js';
import {
  RuntimeHtmlBindingFrameworkErrorCode,
} from './framework-error-code.js';
import {
  HydrateElementInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import {
  type TemplateCompilerSpreadCompileResult,
  TemplateCompilerSpreadCompileRequest,
  TemplateCompilerSpreadCompileState,
} from './compiler-world.js';
import type { RuntimeRenderingMaterializationRequest } from './runtime-rendering-materializer.js';
import {
  RuntimeRendererSpreadCompileResult,
  type RuntimeRendererSpreadCompileRequest,
} from './runtime-renderer.js';
import { RuntimeSpreadCompilation } from './runtime-spread-compilation.js';
import type { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import { RuntimeTemplateCompilerSpreadCompileHost } from './runtime-spread-compile-host.js';
import { TemplateProductDetails } from './product-details.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';
import type { RuntimeBindingIssue } from './runtime-binding-issue.js';
import type { TemplateCompilerIssue } from './compiler-issue.js';
import {
  RuntimeBindingIssueKind,
  RuntimeBindingIssuePhase,
  RuntimeBindingIssuePublisher,
} from './runtime-binding-issue.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';

export interface RuntimeSpreadBindingCreationState {
  readonly input: RuntimeRenderingMaterializationRequest;
  readonly source: RuntimeRenderingSourceSet;
  readonly records: KernelStoreRecord[];
  readonly bindingIssues: RuntimeBindingIssue[];
  readonly compilerIssues: TemplateCompilerIssue[];
  readonly dynamicInstructions: TemplateInstruction[];
  readonly dynamicInstructionContexts: RuntimeDynamicInstructionContext[];
  readonly dynamicValueSites: TemplateValueSite[];
  readonly dynamicExpressionParses: TemplateExpressionParse[];
  readonly spreadCompilations: RuntimeSpreadCompilation[];
  readController(productHandle: ProductHandle): RuntimeControllerFrame | null;
}

/** Exact hydration context retained for an instruction created by runtime captured-attribute compilation. */
export class RuntimeDynamicInstructionContext {
  constructor(
    readonly instructionProductHandle: ProductHandle,
    /** Definition whose compiler world lowered this captured attribute at runtime. */
    readonly requestorDefinitionProductHandle: ProductHandle,
    /** Exact framework hydration context whose captured instruction was compiled. */
    readonly hydrationContext: RuntimeHydrationContext,
  ) {}
}

interface RuntimeCapturedAttributeUsage {
  readonly requestorDefinitionProductHandle: ProductHandle;
  readonly hydrationContext: RuntimeHydrationContext;
  readonly contextController: RuntimeControllerFrame;
  readonly contextInstruction: HydrateElementInstruction;
  readonly captureSyntaxProductHandles: readonly ProductHandle[];
}

/**
 * Semantic counterpart to `SpreadBinding.create(...)`: walk the runtime hydration context and
 * hand captured attributes to `TemplateCompiler.compileSpread(...)`.
 */
export class RuntimeSpreadBindingCreator {
  private readonly bindingIssuePublisher: RuntimeBindingIssuePublisher;

  constructor(
    private readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
  ) {
    this.bindingIssuePublisher = new RuntimeBindingIssuePublisher(store);
  }

  create(
    spread: RuntimeRendererSpreadCompileRequest,
    state: RuntimeSpreadBindingCreationState,
  ): RuntimeRendererSpreadCompileResult {
    const expressionParseStart = state.dynamicExpressionParses.length;
    const retain = (
      runtimeResult: RuntimeRendererSpreadCompileResult,
      usage: RuntimeCapturedAttributeUsage | null = null,
      capturedSyntaxes: readonly AttributeSyntax[] = [],
      compilerResult: TemplateCompilerSpreadCompileResult | null = null,
      requestorDefinitionIdentityHandle: IdentityHandle | null = null,
    ): RuntimeRendererSpreadCompileResult => {
      const hydrationContext = usage?.hydrationContext ?? spread.hydrationContext;
      const contextController = usage?.contextController ?? null;
      const contextInstruction = usage?.contextInstruction ?? null;
      const targetDefinitionProductHandle = compilerResult?.effectiveTargetDefinitionProductHandle
        ?? compilerResult?.request.targetDefinitionProductHandle
        ?? null;
      const targetDefinition = targetDefinitionProductHandle == null
        ? null
        : this.publication.readProductDetail(ResourceProductDetails.Definition, targetDefinitionProductHandle);
      state.spreadCompilations.push(new RuntimeSpreadCompilation({
        state: runtimeResult.state,
        requestorDefinitionProductHandle: usage?.requestorDefinitionProductHandle ?? null,
        requestorDefinitionIdentityHandle,
        spreadInstructionProductHandle: spread.instruction.productHandle,
        spreadInstructionIdentityHandle: spread.instruction.identityHandle,
        capturedAttributeContextInstructionProductHandle:
          contextInstruction?.productHandle ?? hydrationContext?.instructionProductHandle ?? null,
        capturedAttributeContextInstructionIdentityHandle: contextInstruction?.identityHandle ?? null,
        capturedAttributeContextControllerProductHandle:
          contextController?.productHandle ?? hydrationContext?.controller.productHandle ?? null,
        capturedAttributeContextControllerIdentityHandle:
          contextController?.identityHandle ?? hydrationContext?.controller.identityHandle ?? null,
        hydrationContextProductHandle: hydrationContext?.productHandle ?? null,
        hydrationContextIdentityHandle: hydrationContext?.identityHandle ?? null,
        targetRenderTargetProductHandle: spread.target.productHandle,
        targetRenderTargetIdentityHandle: spread.target.identityHandle,
        targetHtmlNodeProductHandle: spread.target.htmlNode?.productHandle ?? null,
        targetHtmlNodeIdentityHandle: spread.target.htmlNode?.identityHandle ?? null,
        targetDefinitionExplicit: compilerResult?.request.targetDefinitionProductHandle != null,
        targetDefinitionProductHandle,
        targetDefinitionIdentityHandle: targetDefinition?.identityHandle ?? null,
        capturedSyntaxProductHandles:
          usage?.captureSyntaxProductHandles ?? capturedSyntaxes.map((syntax) => syntax.productHandle),
        rootInstructionProductHandles: compilerResult?.instructions.map((instruction) => instruction.productHandle)
          ?? runtimeResult.instructions.map((instruction) => instruction.productHandle),
        createdInstructionProductHandles: compilerResult?.createdInstructions.map((instruction) => instruction.productHandle)
          ?? runtimeResult.createdInstructions.map((instruction) => instruction.productHandle),
        expressionParseProductHandles:
          state.dynamicExpressionParses.slice(expressionParseStart).map((parse) => parse.productHandle),
        summary: runtimeResult.summary,
        reasonKinds: runtimeResult.reasonKinds,
      }));
      return runtimeResult;
    };
    const usage = this.capturedAttributeUsage(spread, state);
    if (usage instanceof RuntimeRendererSpreadCompileResult) {
      return retain(usage);
    }
    if (usage.captureSyntaxProductHandles.length === 0) {
      return retain(
        RuntimeRendererSpreadCompileResult.noCapturedAttributes(spread.instruction.sourceAddressHandle),
        usage,
      );
    }

    const capturedSyntaxes = this.capturedSyntaxes(usage, state.input);
    if (capturedSyntaxes == null) {
      return retain(RuntimeRendererSpreadCompileResult.open(
        'TemplateCompiler.compileSpread found captured attribute handles, but not every handle resolved to an AttrSyntax product.',
        spread.instruction.sourceAddressHandle,
        [OpenSeamReasonKind.FeatureNotYetModeled],
      ), usage);
    }

    const requestorDefinitionProductHandle = usage.requestorDefinitionProductHandle;
    const runtimeResource = state.input.projectContext.readResourceForDefinition(requestorDefinitionProductHandle);
    if (runtimeResource == null) {
      return retain(RuntimeRendererSpreadCompileResult.open(
        'TemplateCompiler.compileSpread could not recover the compiler world that owns the requesting custom-element view.',
        spread.instruction.sourceAddressHandle,
        [OpenSeamReasonKind.FeatureNotYetModeled],
      ), usage, capturedSyntaxes);
    }
    const compilerWorld = runtimeResource.compilerWorld;

    const request = new TemplateCompilerSpreadCompileRequest(
      `${spread.local}:capture-usage`,
      usage.requestorDefinitionProductHandle,
      capturedSyntaxes,
      spread.instruction,
      spread.target,
      null,
    );
    const result = compilerWorld.templateCompiler.compileSpread(
      request,
      new RuntimeTemplateCompilerSpreadCompileHost(
        this.store,
        this.publication,
        compilerWorld,
        state.source,
        this.bindingIssuePublisher,
        spread.binding,
        state.records,
        state.bindingIssues,
        state.compilerIssues,
        state.dynamicInstructions,
        state.dynamicValueSites,
        state.dynamicExpressionParses,
        usage.hydrationContext.instructionProductHandle!,
        usage.contextController.productHandle,
      ),
    );
    if (result.state === TemplateCompilerSpreadCompileState.Compiled) {
      state.dynamicInstructionContexts.push(...result.createdInstructions.map((instruction) =>
        new RuntimeDynamicInstructionContext(
          instruction.productHandle,
          requestorDefinitionProductHandle,
          usage.hydrationContext,
        )
      ));
    }
    return retain(
      this.runtimeResultForTemplateCompilerResult(spread, result),
      usage,
      capturedSyntaxes,
      result,
      runtimeResource.compilation.definition.identityHandle,
    );
  }

  private capturedAttributeUsage(
    spread: RuntimeRendererSpreadCompileRequest,
    state: RuntimeSpreadBindingCreationState,
  ): RuntimeCapturedAttributeUsage | RuntimeRendererSpreadCompileResult {
    const input = state.input;
    const hydrationContext = spread.hydrationContext;
    if (hydrationContext == null) {
      const publication = this.bindingIssuePublisher.publish(
        `${spread.local}:issue:no-spread-scope-context`,
        spread.binding.toReference(),
        spread.binding.identityHandle,
        state.source.provenanceHandle,
        RuntimeBindingIssuePhase.SpreadCreate,
        RuntimeBindingIssueKind.SpreadScopeContextMissing,
        'SpreadBinding.create could not find a parent hydration context for captured attribute transfer.',
        RuntimeHtmlBindingFrameworkErrorCode.NoSpreadScopeContextFound,
        spread.instruction.sourceAddressHandle,
      );
      state.records.push(...publication.records);
      state.bindingIssues.push(publication.issue);
      return RuntimeRendererSpreadCompileResult.open(
        'TemplateCompiler.compileSpread could not find a parent hydration context for captured attribute transfer.',
        spread.instruction.sourceAddressHandle,
        [OpenSeamReasonKind.SpreadHydrationContextOpen],
      );
    }

    const contextControllerProductHandle = hydrationContext.controller.productHandle;
    const contextController = contextControllerProductHandle == null
      ? null
      : state.readController(contextControllerProductHandle);
    if (contextController == null) {
      return RuntimeRendererSpreadCompileResult.open(
        'TemplateCompiler.compileSpread could not resolve the controller owned by the active hydration context.',
        spread.instruction.sourceAddressHandle,
        [OpenSeamReasonKind.SpreadHydrationContextOpen],
      );
    }

    const contextInstruction = hydrationContext.instructionProductHandle == null
      ? null
      : input.compiledTemplate.instructions.find((instruction) =>
        instruction.productHandle === hydrationContext.instructionProductHandle
      ) ?? this.publication.readProductDetail(
        TemplateProductDetails.Instruction,
        hydrationContext.instructionProductHandle,
      );
    if (!(contextInstruction instanceof HydrateElementInstruction)) {
      return RuntimeRendererSpreadCompileResult.noCapturedAttributes(spread.instruction.sourceAddressHandle);
    }

    return {
      requestorDefinitionProductHandle: contextController.definitionProductHandle ?? contextInstruction.definitionProductHandle!,
      hydrationContext,
      contextController,
      contextInstruction,
      captureSyntaxProductHandles: contextInstruction.captureSyntaxProductHandles,
    };
  }

  private capturedSyntaxes(
    usage: RuntimeCapturedAttributeUsage,
    input: RuntimeRenderingMaterializationRequest,
  ): readonly AttributeSyntax[] | null {
    const syntaxesByProduct = new Map(
      input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax] as const),
    );
    const capturedSyntaxes = usage.captureSyntaxProductHandles
      .map((productHandle) => syntaxesByProduct.get(productHandle)
        ?? this.publication.readProductDetail(TemplateProductDetails.AttributeSyntax, productHandle)
      )
      .filter((syntax): syntax is AttributeSyntax => syntax != null);
    return capturedSyntaxes.length === usage.captureSyntaxProductHandles.length
      ? capturedSyntaxes
      : null;
  }

  private runtimeResultForTemplateCompilerResult(
    spread: RuntimeRendererSpreadCompileRequest,
    result: {
      readonly state: TemplateCompilerSpreadCompileState;
      readonly instructions: readonly TemplateInstruction[];
      readonly createdInstructions: readonly TemplateInstruction[];
      readonly summary: string | null;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
    },
  ): RuntimeRendererSpreadCompileResult {
    switch (result.state) {
      case TemplateCompilerSpreadCompileState.NoCapturedAttributes:
        return RuntimeRendererSpreadCompileResult.noCapturedAttributes(spread.instruction.sourceAddressHandle);
      case TemplateCompilerSpreadCompileState.Compiled:
        return RuntimeRendererSpreadCompileResult.compiled(
          result.instructions,
          result.createdInstructions,
          spread.instruction.sourceAddressHandle,
        );
      case TemplateCompilerSpreadCompileState.Open:
        return RuntimeRendererSpreadCompileResult.open(
          result.summary ?? 'TemplateCompiler.compileSpread remained open.',
          spread.instruction.sourceAddressHandle,
          result.reasonKinds,
        );
      case TemplateCompilerSpreadCompileState.Invalid:
        return RuntimeRendererSpreadCompileResult.invalid(
          result.summary ?? 'TemplateCompiler.compileSpread rejected the captured attribute.',
          spread.instruction.sourceAddressHandle,
        );
    }
  }
}
