import type { ExpressionType } from '../expression/ast.js';
import type { ExpressionParseResult } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { TemplateCompilerLiveExpressionAllocation } from './template-compiler-live-allocation.js';

const contextFamilyExpressionValueAuthority = {};

/** Candidate-owned parser result projected without exposing the allocation ledger or compiler-read capability. */
export class TemplateCompilerContextFamilyExpressionValue {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly productHandle: ProductHandle,
    readonly entryFamily: ExpressionType,
    readonly expression: string,
    readonly result: ExpressionParseResult,
    readonly sourceSpan: SourceSpan | null,
    private readonly current: () => boolean,
  ) {
    if (authority !== contextFamilyExpressionValueAuthority) {
      throw new Error('Context-family expression value lost product or parser-entry authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === contextFamilyExpressionValueAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.current();
  }
}

export function projectTemplateCompilerContextFamilyExpressionValue(
  allocation: TemplateCompilerLiveExpressionAllocation,
  ownerIsCurrent: () => boolean,
): TemplateCompilerContextFamilyExpressionValue {
  const result = allocation.result;
  const compilerRead = allocation.compilerRead;
  if (result == null || compilerRead == null) {
    throw new Error(`Live expression '${allocation.productHandle}' has no complete parser result/read authority.`);
  }
  return new TemplateCompilerContextFamilyExpressionValue(
    contextFamilyExpressionValueAuthority,
    allocation.productHandle,
    allocation.entryFamily,
    allocation.expression,
    result,
    allocation.sourceSpan,
    () => ownerIsCurrent() && compilerRead.validate().isCurrent,
  );
}
