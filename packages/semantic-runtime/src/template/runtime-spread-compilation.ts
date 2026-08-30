import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { RuntimeRendererSpreadCompileState } from './runtime-renderer.js';

export interface RuntimeSpreadCompilationInput {
  readonly state: RuntimeRendererSpreadCompileState;
  readonly requestorDefinitionProductHandle: ProductHandle | null;
  readonly requestorDefinitionIdentityHandle: IdentityHandle | null;
  readonly spreadInstructionProductHandle: ProductHandle;
  readonly spreadInstructionIdentityHandle: IdentityHandle;
  readonly capturedAttributeContextInstructionProductHandle: ProductHandle | null;
  readonly capturedAttributeContextInstructionIdentityHandle: IdentityHandle | null;
  readonly capturedAttributeContextControllerProductHandle: ProductHandle | null;
  readonly capturedAttributeContextControllerIdentityHandle: IdentityHandle | null;
  readonly hydrationContextProductHandle: ProductHandle | null;
  readonly hydrationContextIdentityHandle: IdentityHandle | null;
  readonly targetRenderTargetProductHandle: ProductHandle;
  readonly targetRenderTargetIdentityHandle: IdentityHandle;
  readonly targetHtmlNodeProductHandle: ProductHandle | null;
  readonly targetHtmlNodeIdentityHandle: IdentityHandle | null;
  /** Whether compileSpread received targetDef explicitly rather than resolving an effective target from the world. */
  readonly targetDefinitionExplicit: boolean;
  readonly targetDefinitionProductHandle: ProductHandle | null;
  readonly targetDefinitionIdentityHandle: IdentityHandle | null;
  readonly capturedSyntaxProductHandles: readonly ProductHandle[];
  readonly rootInstructionProductHandles: readonly ProductHandle[];
  readonly createdInstructionProductHandles: readonly ProductHandle[];
  readonly expressionParseProductHandles: readonly ProductHandle[];
  readonly summary: string | null;
  readonly reasonKinds: readonly OpenSeamReasonKind[];
}

/**
 * One runtime `TemplateCompiler.compileSpread(...)` invocation before its ordered return grouping is consumed.
 *
 * Dynamic instructions, captures, and parses remain independently published products. This carrier owns the invocation
 * boundary that relates them without asking later consumers to reconstruct roots from the flat created-instruction set.
 */
export class RuntimeSpreadCompilation {
  readonly state: RuntimeRendererSpreadCompileState;
  readonly requestorDefinitionProductHandle: ProductHandle | null;
  readonly requestorDefinitionIdentityHandle: IdentityHandle | null;
  readonly spreadInstructionProductHandle: ProductHandle;
  readonly spreadInstructionIdentityHandle: IdentityHandle;
  readonly capturedAttributeContextInstructionProductHandle: ProductHandle | null;
  readonly capturedAttributeContextInstructionIdentityHandle: IdentityHandle | null;
  readonly capturedAttributeContextControllerProductHandle: ProductHandle | null;
  readonly capturedAttributeContextControllerIdentityHandle: IdentityHandle | null;
  readonly hydrationContextProductHandle: ProductHandle | null;
  readonly hydrationContextIdentityHandle: IdentityHandle | null;
  readonly targetRenderTargetProductHandle: ProductHandle;
  readonly targetRenderTargetIdentityHandle: IdentityHandle;
  readonly targetHtmlNodeProductHandle: ProductHandle | null;
  readonly targetHtmlNodeIdentityHandle: IdentityHandle | null;
  readonly targetDefinitionExplicit: boolean;
  readonly targetDefinitionProductHandle: ProductHandle | null;
  readonly targetDefinitionIdentityHandle: IdentityHandle | null;
  readonly capturedSyntaxProductHandles: readonly ProductHandle[];
  readonly rootInstructionProductHandles: readonly ProductHandle[];
  readonly createdInstructionProductHandles: readonly ProductHandle[];
  readonly expressionParseProductHandles: readonly ProductHandle[];
  readonly summary: string | null;
  readonly reasonKinds: readonly OpenSeamReasonKind[];

  constructor(input: RuntimeSpreadCompilationInput) {
    this.state = input.state;
    this.requestorDefinitionProductHandle = input.requestorDefinitionProductHandle;
    this.requestorDefinitionIdentityHandle = input.requestorDefinitionIdentityHandle;
    this.spreadInstructionProductHandle = input.spreadInstructionProductHandle;
    this.spreadInstructionIdentityHandle = input.spreadInstructionIdentityHandle;
    this.capturedAttributeContextInstructionProductHandle = input.capturedAttributeContextInstructionProductHandle;
    this.capturedAttributeContextInstructionIdentityHandle = input.capturedAttributeContextInstructionIdentityHandle;
    this.capturedAttributeContextControllerProductHandle = input.capturedAttributeContextControllerProductHandle;
    this.capturedAttributeContextControllerIdentityHandle = input.capturedAttributeContextControllerIdentityHandle;
    this.hydrationContextProductHandle = input.hydrationContextProductHandle;
    this.hydrationContextIdentityHandle = input.hydrationContextIdentityHandle;
    this.targetRenderTargetProductHandle = input.targetRenderTargetProductHandle;
    this.targetRenderTargetIdentityHandle = input.targetRenderTargetIdentityHandle;
    this.targetHtmlNodeProductHandle = input.targetHtmlNodeProductHandle;
    this.targetHtmlNodeIdentityHandle = input.targetHtmlNodeIdentityHandle;
    this.targetDefinitionExplicit = input.targetDefinitionExplicit;
    this.targetDefinitionProductHandle = input.targetDefinitionProductHandle;
    this.targetDefinitionIdentityHandle = input.targetDefinitionIdentityHandle;
    this.capturedSyntaxProductHandles = input.capturedSyntaxProductHandles;
    this.rootInstructionProductHandles = input.rootInstructionProductHandles;
    this.createdInstructionProductHandles = input.createdInstructionProductHandles;
    this.expressionParseProductHandles = input.expressionParseProductHandles;
    this.summary = input.summary;
    this.reasonKinds = input.reasonKinds;

    const compiled = input.state === RuntimeRendererSpreadCompileState.Compiled;
    if (
      (!compiled && (
        input.rootInstructionProductHandles.length > 0
        || input.createdInstructionProductHandles.length > 0
        || input.expressionParseProductHandles.length > 0
      ))
      || input.rootInstructionProductHandles.some((handle) => !input.createdInstructionProductHandles.includes(handle))
      || new Set(input.rootInstructionProductHandles).size !== input.rootInstructionProductHandles.length
      || new Set(input.createdInstructionProductHandles).size !== input.createdInstructionProductHandles.length
      || new Set(input.expressionParseProductHandles).size !== input.expressionParseProductHandles.length
    ) {
      throw new Error('Runtime spread compilation lost state, root, created-instruction, or expression-parse ownership.');
    }
  }
}
