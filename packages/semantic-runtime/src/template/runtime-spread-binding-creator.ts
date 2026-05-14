import type { ProductHandle } from '../kernel/handles.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  RuntimeHtmlBindingFrameworkErrorCode,
} from './framework-error-code.js';
import {
  HydrateElementInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import {
  TemplateCompilerSpreadCompileRequest,
  TemplateCompilerSpreadCompileState,
} from './compiler-world.js';
import type { RuntimeRenderingMaterializationRequest } from './runtime-rendering-materializer.js';
import {
  RuntimeRendererSpreadCompileResult,
  type RuntimeRendererSpreadCompileRequest,
} from './runtime-renderer.js';
import type { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import { RuntimeTemplateCompilerSpreadCompileHost } from './runtime-spread-compile-host.js';
import { TemplateProductDetails } from './product-details.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';
import type { RuntimeBindingIssue } from './runtime-binding-issue.js';
import {
  RuntimeBindingIssueKind,
  RuntimeBindingIssuePhase,
  RuntimeBindingIssuePublisher,
} from './runtime-binding-issue.js';

export interface RuntimeSpreadBindingCreationState {
  readonly input: RuntimeRenderingMaterializationRequest;
  readonly source: RuntimeRenderingSourceSet;
  readonly records: KernelStoreRecord[];
  readonly bindingIssues: RuntimeBindingIssue[];
  readonly dynamicInstructions: TemplateInstruction[];
  readonly dynamicValueSites: TemplateValueSite[];
  readonly dynamicExpressionParses: TemplateExpressionParse[];
}

interface RuntimeCapturedAttributeUsage {
  readonly requestorDefinitionProductHandle: ProductHandle | null;
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
  ) {
    this.bindingIssuePublisher = new RuntimeBindingIssuePublisher(store);
  }

  create(
    spread: RuntimeRendererSpreadCompileRequest,
    state: RuntimeSpreadBindingCreationState,
  ): RuntimeRendererSpreadCompileResult {
    const usage = this.capturedAttributeUsage(spread, state);
    if (usage instanceof RuntimeRendererSpreadCompileResult) {
      return usage;
    }

    const capturedSyntaxes = this.capturedSyntaxes(usage, state.input);
    if (capturedSyntaxes == null) {
      return RuntimeRendererSpreadCompileResult.open(
        'TemplateCompiler.compileSpread found captured attribute handles, but not every handle resolved to an AttrSyntax product.',
        spread.instruction.sourceAddressHandle,
      );
    }

    const request = new TemplateCompilerSpreadCompileRequest(
      `${spread.local}:capture-usage`,
      usage.requestorDefinitionProductHandle,
      capturedSyntaxes,
      spread.instruction,
      spread.target,
      null,
    );
    const result = state.input.compilerWorld.templateCompiler.compileSpread(
      request,
      new RuntimeTemplateCompilerSpreadCompileHost(
        this.store,
        state.input.compilerWorld,
        state.source,
        this.bindingIssuePublisher,
        spread.binding,
        state.records,
        state.bindingIssues,
        state.dynamicInstructions,
        state.dynamicValueSites,
        state.dynamicExpressionParses,
      ),
    );
    return this.runtimeResultForTemplateCompilerResult(spread, result);
  }

  private capturedAttributeUsage(
    spread: RuntimeRendererSpreadCompileRequest,
    state: RuntimeSpreadBindingCreationState,
  ): RuntimeCapturedAttributeUsage | RuntimeRendererSpreadCompileResult {
    const input = state.input;
    const contextController = spread.hydrationContextController;
    if (contextController == null) {
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

    const contextInstruction = contextController.instructionProductHandle == null
      ? null
      : input.compiledTemplate.instructions.find((instruction) =>
        instruction.productHandle === contextController.instructionProductHandle
      ) ?? this.store.productDetails.read(TemplateProductDetails.Instruction, contextController.instructionProductHandle);
    if (!(contextInstruction instanceof HydrateElementInstruction)
      || contextInstruction.captureSyntaxProductHandles.length === 0) {
      return RuntimeRendererSpreadCompileResult.noCapturedAttributes(spread.instruction.sourceAddressHandle);
    }

    return {
      requestorDefinitionProductHandle: contextController.definitionProductHandle ?? contextInstruction.definitionProductHandle,
      captureSyntaxProductHandles: contextInstruction.captureSyntaxProductHandles,
    };
  }

  private capturedSyntaxes(
    usage: RuntimeCapturedAttributeUsage,
    input: RuntimeRenderingMaterializationRequest,
  ): readonly AttributeSyntax[] | null {
    const syntaxesByProduct = new Map([
      ...this.store.productDetails.readBySlot(TemplateProductDetails.AttributeSyntax).map((entry) =>
        [entry.productHandle, entry.detail] as const
      ),
      ...input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax] as const),
    ]);
    const capturedSyntaxes = usage.captureSyntaxProductHandles
      .map((productHandle) => syntaxesByProduct.get(productHandle) ?? null)
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
        );
    }
  }
}
