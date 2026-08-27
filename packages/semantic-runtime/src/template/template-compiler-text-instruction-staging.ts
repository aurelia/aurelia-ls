import type { InterpolationSuccess } from '../expression/parse-result-algebra.js';
import { ExpressionParseResultKind, type ExpressionParseResult } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { HtmlNodeReference } from './html-ir.js';
import {
  TextBindingInstruction,
} from './instruction-ir.js';

const textInstructionStagingAuthority = {};

/** Exact caller-owned source range for one parser-owned interpolation hole. */
export class TemplateCompilerTextHoleSourceRange {
  constructor(
    readonly expressionChainIndex: number,
    readonly expressionSpan: SourceSpan,
    readonly carrierSourceAddressHandle: AddressHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Stable occurrence/hole allocation request made by the shared text instruction law. */
export class TemplateCompilerTextInstructionAllocationRequest {
  constructor(
    readonly siteKey: string,
    readonly occurrenceKey: string,
    readonly expressionChainIndex: number,
    readonly source: TemplateCompilerTextHoleSourceRange,
  ) {}
}

export class TemplateCompilerTextInstructionAllocation {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionLocal: string,
  ) {}
}

/** Caller-owned handle/publication boundary for one text-binding instruction. */
export interface TemplateCompilerTextInstructionStagingAuthority {
  create(
    request: TemplateCompilerTextInstructionAllocationRequest,
    factory: (allocation: TemplateCompilerTextInstructionAllocation) => TextBindingInstruction,
  ): TextBindingInstruction;
}

export class TemplateCompilerTextInstructionStagingRequest {
  constructor(
    readonly authority: TemplateCompilerTextInstructionStagingAuthority,
    readonly siteKey: string,
    readonly occurrenceKey: string,
    readonly node: HtmlNodeReference,
    readonly expressionProductHandle: ProductHandle,
    readonly parseResult: ExpressionParseResult,
    readonly sources: readonly TemplateCompilerTextHoleSourceRange[],
  ) {}
}

/** One parser-owned hole and its exact staged instruction. */
export class TemplateCompilerTextInstructionHole {
  constructor(
    readonly expressionChainIndex: number,
    readonly expressionSpan: SourceSpan,
    readonly source: TemplateCompilerTextHoleSourceRange,
    readonly instruction: TextBindingInstruction,
  ) {}
}

/** Nominal complete multi-hole instruction staging for one reached text occurrence. */
export class TemplateCompilerTextInstructionStaging {
  readonly #authority: object;
  readonly instructions: readonly TextBindingInstruction[];

  constructor(
    authority: object,
    readonly siteKey: string,
    readonly occurrenceKey: string,
    readonly node: HtmlNodeReference,
    readonly expressionProductHandle: ProductHandle,
    readonly parseResult: InterpolationSuccess,
    readonly holes: readonly TemplateCompilerTextInstructionHole[],
  ) {
    if (authority !== textInstructionStagingAuthority || holes.length === 0) {
      throw new Error('Text instruction staging requires module-owned non-empty interpolation-hole authority.');
    }
    this.#authority = authority;
    this.instructions = holes.map((hole) => hole.instruction);
  }

  isModuleConstructed(): boolean {
    return this.#authority === textInstructionStagingAuthority;
  }
}

/**
 * Stage one text-binding instruction per completed interpolation hole.
 *
 * Static, absent, companion, and invalid parser results deliberately allocate nothing. Their distinct downstream
 * postures remain owned by the caller rather than being compressed into an open instruction here.
 */
export function stageTemplateCompilerTextInstructions(
  request: TemplateCompilerTextInstructionStagingRequest,
): TemplateCompilerTextInstructionStaging | null {
  if (request.parseResult.kind !== ExpressionParseResultKind.InterpolationSuccess) {
    return null;
  }
  const expressions = request.parseResult.ast.expressions;
  if (expressions.length === 0 || request.sources.length !== expressions.length) {
    throw new Error(
      `Text instruction staging '${request.siteKey}' has ${expressions.length} holes and ${request.sources.length} source ranges.`,
    );
  }
  const holes = expressions.map((expression, expressionChainIndex) => {
    const source = request.sources[expressionChainIndex]!;
    if (
      source.expressionChainIndex !== expressionChainIndex
      || !sameSpan(source.expressionSpan, expression.span)
    ) {
      throw new Error(
        `Text instruction staging '${request.siteKey}' lost source authority for hole ${expressionChainIndex}.`,
      );
    }
    const instruction = request.authority.create(
      new TemplateCompilerTextInstructionAllocationRequest(
        request.siteKey,
        request.occurrenceKey,
        expressionChainIndex,
        source,
      ),
      (allocation) => new TextBindingInstruction(
        allocation.productHandle,
        allocation.identityHandle,
        request.node,
        request.expressionProductHandle,
        expressionChainIndex,
        source.sourceAddressHandle,
      ),
    );
    if (
      instruction.node !== request.node
      || instruction.expressionProductHandle !== request.expressionProductHandle
      || instruction.expressionChainIndex !== expressionChainIndex
      || instruction.sourceAddressHandle !== source.sourceAddressHandle
    ) {
      throw new Error(`Text instruction staging authority changed hole ${expressionChainIndex}.`);
    }
    return new TemplateCompilerTextInstructionHole(
      expressionChainIndex,
      expression.span,
      source,
      instruction,
    );
  });
  if (new Set(holes.map((hole) => hole.instruction.productHandle)).size !== holes.length) {
    throw new Error(`Text instruction staging '${request.siteKey}' reused an instruction product handle.`);
  }
  return new TemplateCompilerTextInstructionStaging(
    textInstructionStagingAuthority,
    request.siteKey,
    request.occurrenceKey,
    request.node,
    request.expressionProductHandle,
    request.parseResult,
    holes,
  );
}

function sameSpan(left: SourceSpan, right: SourceSpan): boolean {
  return left.start === right.start
    && left.end === right.end
    && left.file?.id === right.file?.id;
}
