import type { ExpressionAstNode } from '../expression/ast.js';
import type { SourceSpan } from '../expression/source-span.js';
import {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessRole,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionExecutionQualifierKind,
} from './runtime-expression-access-use.js';

/** Source-local execution qualifier before exact kernel addresses are minted. */
export interface RuntimeExpressionExecutionQualifierDraft {
  readonly kind: RuntimeExpressionExecutionQualifierKind;
  readonly sourceSpan: SourceSpan | null;
  readonly operationName: string | null;
}

/** Operation-local execution bounds shared across source-language and framework handoff collectors. */
export interface RuntimeExpressionExecutionContextDraft {
  readonly executionQualifiers: readonly RuntimeExpressionExecutionQualifierDraft[];
  readonly minimumExecutions: RuntimeExpressionExecutionMinimum;
  readonly maximumExecutions: RuntimeExpressionExecutionMaximum;
  readonly coverage: RuntimeExpressionAccessCoverage;
  readonly coverageReason: string | null;
}

/** One source-backed access occurrence before runtime owner, operation, and target links are attached. */
export interface RuntimeExpressionAccessPublicationDraft extends RuntimeExpressionExecutionContextDraft {
  readonly origin: RuntimeExpressionAccessOrigin;
  readonly accessForm: RuntimeExpressionAccessForm;
  readonly role: RuntimeExpressionAccessRole;
  /** Total runtime Scope depth encoded by the parser after callback and authored-qualifier lowering. */
  readonly scopeLookupAncestor: number | null;
  /** Authored `$parent` count, with zero for an explicit `$this`; null when no scope qualifier was authored. */
  readonly authoredScopeAncestor: number | null;
  /** Parser-added arrow-callback scope depth retained independently from authored scope qualification. */
  readonly callbackScopeDepth: number | null;
  readonly lexicalLocal: boolean;
  readonly sourceSpan: SourceSpan;
  readonly nameSourceSpan: SourceSpan | null;
}

/** One authored template access occurrence retaining the AST needed for scope/type target resolution. */
export interface RuntimeExpressionAccessDraft extends RuntimeExpressionAccessPublicationDraft {
  readonly expression: ExpressionAstNode;
  /** Exact declaration token for an expression-local callback name; null for runtime Scope and member targets. */
  readonly lexicalDeclarationSpan: SourceSpan | null;
}
