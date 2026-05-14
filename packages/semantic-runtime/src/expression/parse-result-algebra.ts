import type {
  BindingIdentifierOrPattern,
  CustomExpression,
  ExpressionAstNode,
  ExpressionType,
  ForOfStatement,
  Interpolation,
  IsBindingBehavior,
  PrimitiveLiteralExpression,
} from './ast.js';
import type { SourceSpan } from './source-span.js';
import type { ExpressionParseContext } from './expression-parse-support.js';

/**
 * The parser now targets a native publication algebra instead of returning
 * canonical AST carriers and ad-hoc sentinels directly.
 *
 * The important separation is:
 * - completed-input parser truth
 * - parser-owned degraded/frontier companion truth
 * - hard completed-input parse rejection
 *
 * The completed-input parser may still use internal parser-local failure state
 * while the strict grammar core grows degraded/frontier publication.
 * That detail must not leak through the public parser contract.
 *
 * TODO: If downstream consumers start switching on many sibling result kinds
 * in parallel, add parser-owned inspection helpers or a visitor surface here
 * rather than letting every caller rebuild its own local result taxonomy.
 */

export type CompletedInputExpressionNode = ExpressionAstNode;
export type CompletedInputBindingExpression = IsBindingBehavior;
export type CompletedInputPropertyLikeExpression = IsBindingBehavior;
export type EmptyExpressionAst = PrimitiveLiteralExpression & { readonly value: '' };

/**
 * These aliases intentionally remain parser-owned names even when they are
 * currently identical to canonical AST families. That keeps the parser result
 * contract free to narrow or specialize later without forcing downstream code
 * to couple directly to raw AST-family names.
 */
export type PropertyLikeEntryFamily = 'IsProperty' | 'IsFunction';

export enum ExpressionParseResultKind {
  ExpressionSuccess = 'expression-success',
  EmptyExpressionSuccess = 'empty-expression-success',
  IteratorSuccess = 'iterator-success',
  InterpolationSuccess = 'interpolation-success',
  InterpolationAbsent = 'interpolation-absent',
  OpaqueSuccess = 'opaque-success',
  CompleteInputParseError = 'complete-input-parse-error',
  PropertyLikeDegradedPublication = 'property-like-degraded-publication',
  PropertyLikeFrontierPublication = 'property-like-frontier-publication',
  InterpolationDegradedPublication = 'interpolation-degraded-publication',
  InterpolationFrontierPublication = 'interpolation-frontier-publication',
  IteratorDegradedPublication = 'iterator-degraded-publication',
  IteratorFrontierPublication = 'iterator-frontier-publication',
}

/**
 * Internal classifier bitmask only. Do not persist or publish these ordinals
 * through parser products; public result vocabulary lives on the result kinds.
 */
export enum ExpressionParseResultFlags {
  None = 0,
  Completed = 1 << 0,
  Companion = 1 << 2,
  HardParseError = 1 << 3,
  HasCanonicalAst = 1 << 4,
  PropertyLikeFamily = 1 << 5,
  IteratorFamily = 1 << 6,
  InterpolationFamily = 1 << 7,
  CustomFamily = 1 << 8,
}

export function expressionParseResultKindFlags(
  kind: ExpressionParseResultKind,
): ExpressionParseResultFlags {
  switch (kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
      return ExpressionParseResultFlags.Completed
        | ExpressionParseResultFlags.HasCanonicalAst
        | ExpressionParseResultFlags.PropertyLikeFamily;
    case ExpressionParseResultKind.EmptyExpressionSuccess:
      return ExpressionParseResultFlags.Completed
        | ExpressionParseResultFlags.HasCanonicalAst
        | ExpressionParseResultFlags.PropertyLikeFamily;
    case ExpressionParseResultKind.IteratorSuccess:
      return ExpressionParseResultFlags.Completed
        | ExpressionParseResultFlags.HasCanonicalAst
        | ExpressionParseResultFlags.IteratorFamily;
    case ExpressionParseResultKind.InterpolationSuccess:
      return ExpressionParseResultFlags.Completed
        | ExpressionParseResultFlags.HasCanonicalAst
        | ExpressionParseResultFlags.InterpolationFamily;
    case ExpressionParseResultKind.InterpolationAbsent:
      return ExpressionParseResultFlags.Completed
        | ExpressionParseResultFlags.InterpolationFamily;
    case ExpressionParseResultKind.OpaqueSuccess:
      return ExpressionParseResultFlags.Completed
        | ExpressionParseResultFlags.HasCanonicalAst
        | ExpressionParseResultFlags.CustomFamily;
    case ExpressionParseResultKind.CompleteInputParseError:
      return ExpressionParseResultFlags.HardParseError;
    case ExpressionParseResultKind.PropertyLikeDegradedPublication:
    case ExpressionParseResultKind.PropertyLikeFrontierPublication:
      return ExpressionParseResultFlags.Companion
        | ExpressionParseResultFlags.PropertyLikeFamily;
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return ExpressionParseResultFlags.Companion
        | ExpressionParseResultFlags.InterpolationFamily;
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return ExpressionParseResultFlags.Companion
        | ExpressionParseResultFlags.IteratorFamily;
    default:
      return ExpressionParseResultFlags.None;
  }
}

export function hasExpressionParseResultKindFlag(
  kind: ExpressionParseResultKind,
  flag: ExpressionParseResultFlags,
): boolean {
  return (expressionParseResultKindFlags(kind) & flag) !== 0;
}

export enum ExpressionFrontierKind {
  AwaitingExpression = 'awaiting-expression',
  AwaitingClosingDelimiter = 'awaiting-closing-delimiter',
  AwaitingMemberName = 'awaiting-member-name',
  AwaitingTailSegment = 'awaiting-tail-segment',
  AmbiguousClosure = 'ambiguous-closure',
  AwaitingSeparator = 'awaiting-separator',
  AwaitingBindingDeclaration = 'awaiting-binding-declaration',
  AwaitingChainSegment = 'awaiting-chain-segment',
}

export enum ExpressionExpectedContinuationClass {
  Expression = 'expression',
  MemberName = 'member-name',
  CloseParen = 'close-paren',
  CloseBracket = 'close-bracket',
  CloseBrace = 'close-brace',
  Colon = 'colon',
  Of = 'of',
  InterpolationHoleClose = 'interpolation-hole-close',
  ValueConverterName = 'value-converter-name',
  BindingBehaviorName = 'binding-behavior-name',
  Comma = 'comma',
  ObjectLiteralKey = 'object-literal-key',
  BindingDeclaration = 'binding-declaration',
  IteratorTailSegment = 'iterator-tail-segment',
  TemplateClose = 'template-close',
  OpenBracket = 'open-bracket',
  OpenParen = 'open-paren',
  ParentScopeKeyword = 'parent-scope-keyword',
  ArrowToken = 'arrow-token',
}

/**
 * These frame labels are parser-companion metadata, not canonical AST kinds.
 * They exist so later parser-adjacent spend can reason about where a frontier
 * or gap sits without minting partial-node kinds inside the AST itself.
 */
export enum ExpressionCompanionFrameKind {
  ArrayLiteral = 'array-literal',
  BinaryExpression = 'binary-expression',
  BindingBehaviorTail = 'binding-behavior-tail',
  CallArguments = 'call-arguments',
  ConditionalExpression = 'conditional-expression',
  IndexedAccess = 'indexed-access',
  InterpolationHole = 'interpolation-hole',
  IteratorDeclaration = 'iterator-declaration',
  IteratorHeader = 'iterator-header',
  IteratorIterable = 'iterator-iterable',
  MemberAccess = 'member-access',
  ObjectLiteral = 'object-literal',
  ParenExpression = 'paren-expression',
  TemplateLiteral = 'template-literal',
  ValueConverterTail = 'value-converter-tail',
  AssignmentExpression = 'assignment-expression',
  UnaryExpression = 'unary-expression',
  IteratorTrailingSplit = 'iterator-trailing-split',
  TemplateHole = 'template-hole',
  NewExpression = 'new-expression',
  OptionalChain = 'optional-chain',
  ScopePath = 'scope-path',
  ArrowFunction = 'arrow-function',
  ArrowParameterList = 'arrow-parameter-list',
}

export enum ExpressionGapKind {
  MissingExpression = 'missing-expression',
  MissingMemberName = 'missing-member-name',
  MissingCallArgument = 'missing-call-argument',
  MissingClosingDelimiter = 'missing-closing-delimiter',
  MissingIteratorOf = 'missing-iterator-of',
  MissingIteratorIterable = 'missing-iterator-iterable',
  MissingTailName = 'missing-tail-name',
  MissingTernaryArm = 'missing-ternary-arm',
  MissingObjectValueSeparator = 'missing-object-value-separator',
  MissingIteratorTailSegment = 'missing-iterator-tail-segment',
  MissingBindingDeclaration = 'missing-binding-declaration',
  MissingArrowSeparator = 'missing-arrow-separator',
}

export enum MatchedDelimiterKind {
  Paren = 'paren',
  Bracket = 'bracket',
  Brace = 'brace',
  Template = 'template',
  TemplateHole = 'template-hole',
}

export enum IteratorActiveRegionKind {
  Declaration = 'declaration',
  Separator = 'separator',
  Iterable = 'iterable',
  TrailingSplit = 'trailing-split',
}

export enum IteratorOfSeparatorStateKind {
  Absent = 'absent',
  Present = 'present',
}

export enum IteratorTrailingSplitKind {
  SemicolonOnly = 'semicolon-only',
  RawTailVisible = 'raw-tail-visible',
}

export enum InterpolationHoleBoundaryKind {
  Closed = 'closed',
  Unterminated = 'unterminated',
}

export enum InterpolationSuppressedHolePublicationKind {
  CompanionSuppressed = 'companion-suppressed',
  HardErrorSuppressed = 'hard-error-suppressed',
}

export class MatchedDelimiterEntry {
  constructor(
    readonly kind: MatchedDelimiterKind,
    readonly openSpan: SourceSpan,
    readonly closeSpan: SourceSpan | null,
  ) {}
}

// TODO: `MatchedDelimiterEntry` is intentionally minimal today. If later
// families need delimiter-owned scan residue beyond open/close spans (for
// example interpolation-mode state or richer template boundary truth), add a
// family-specific companion carrier instead of overloading this generic stack.

/**
 * Closed subtree refs point at canonical completed-input AST carriers that are
 * already stable under the current text. They intentionally do not mint new
 * parser-owned partial AST node kinds.
 */
export class ClosedSubtreeRef {
  constructor(
    readonly relation: 'root-prefix' | 'child' | 'sibling',
    readonly node: CompletedInputExpressionNode,
    readonly span: SourceSpan,
  ) {}
}

// TODO: These relation tags are enough for current parser publication, but if
// later spend needs stable lifted provenance across outer-frame widening, add
// a richer subtree-provenance carrier instead of growing more meaning onto the
// three relation strings alone.

export class ExpressionGapDescriptor {
  constructor(
    readonly gapKind: ExpressionGapKind,
    readonly anchorSpan: SourceSpan,
    readonly surroundingFrameKind: ExpressionCompanionFrameKind,
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
  ) {}
}

export class IteratorOfSeparatorState {
  constructor(
    readonly kind: IteratorOfSeparatorStateKind,
    readonly span: SourceSpan | null,
  ) {}
}

export class IteratorTrailingSplitState {
  constructor(
    readonly kind: IteratorTrailingSplitKind,
    readonly semicolonSpan: SourceSpan,
    readonly tailSpan: SourceSpan | null,
    readonly rawTailText: string,
  ) {}
}

export class ExpressionSuccess {
  readonly kind = ExpressionParseResultKind.ExpressionSuccess;

  constructor(
    readonly entryFamily: PropertyLikeEntryFamily,
    readonly primarySpan: SourceSpan | null,
    readonly ast: CompletedInputPropertyLikeExpression,
  ) {}
}

/**
 * Empty input is a completed-input success family for property/function entry.
 * The AST stays canonical; the stronger result class keeps downstream code
 * from having to infer "empty" from a literal node.
 */
export class EmptyExpressionSuccess {
  readonly kind = ExpressionParseResultKind.EmptyExpressionSuccess;

  constructor(
    readonly entryFamily: PropertyLikeEntryFamily,
    readonly primarySpan: SourceSpan | null,
    readonly ast: EmptyExpressionAst,
  ) {}
}

export class IteratorSuccess {
  readonly kind = ExpressionParseResultKind.IteratorSuccess;
  readonly entryFamily = 'IsIterator' as const;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly ast: ForOfStatement,
    // Visible `; tail` split without claiming ownership of the tail grammar.
    readonly trailingSplit: IteratorTrailingSplitState | null,
  ) {}
}

/**
 * Dedicated iterator companion envelope.
 *
 * Iterator pressure is different from both ordinary property/function parsing
 * and interpolation:
 * - it owns a declaration lane before expression parsing begins
 * - it has an explicit `of` separator state
 * - it can surface a visible semicolon/tail split without claiming ownership
 *   of the trailing binding grammar
 *
 * So the iterator result keeps that structure explicit instead of compressing
 * it into the generic property-like companion carrier.
 *
 * TODO: Runtime/compiler truth only requires the split point plus raw tail
 * visibility here. If tooling later needs structured iterator-tail parsing,
 * add a dedicated iterator-tail carrier instead of overloading `rawTailText`
 * or pretending that structure already belongs to the expression parser.
 */
export class IteratorDegradedPublication {
  readonly kind = ExpressionParseResultKind.IteratorDegradedPublication;
  readonly entryFamily = 'IsIterator' as const;
  readonly strongerTargetResultKind = ExpressionParseResultKind.IteratorSuccess;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly activeRegionKind: IteratorActiveRegionKind,
    readonly frontierKind: ExpressionFrontierKind,
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    readonly matchedDelimiterStack: readonly MatchedDelimiterEntry[],
    readonly preservedSpan: SourceSpan | null,
    readonly declaration: BindingIdentifierOrPattern | null,
    readonly declarationClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    readonly ofSeparator: IteratorOfSeparatorState,
    readonly iterable: CompletedInputPropertyLikeExpression | null,
    readonly iterableClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    readonly gapDescriptors: readonly ExpressionGapDescriptor[],
    readonly trailingSplit: IteratorTrailingSplitState | null,
    readonly frameworkErrorCode: string | null = null,
    readonly diagnosticMessage: string | null = null,
  ) {}
}

export class IteratorFrontierPublication {
  readonly kind = ExpressionParseResultKind.IteratorFrontierPublication;
  readonly entryFamily = 'IsIterator' as const;
  readonly strongerTargetResultKind = ExpressionParseResultKind.IteratorSuccess;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly activeRegionKind: IteratorActiveRegionKind,
    readonly frontierKind: ExpressionFrontierKind,
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    readonly matchedDelimiterStack: readonly MatchedDelimiterEntry[],
    readonly strongestStablePrefixSpan: SourceSpan | null,
    readonly declaration: BindingIdentifierOrPattern | null,
    readonly declarationClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    readonly ofSeparator: IteratorOfSeparatorState,
    readonly iterable: CompletedInputPropertyLikeExpression | null,
    readonly iterableClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    readonly trailingSplit: IteratorTrailingSplitState | null,
    readonly frameworkErrorCode: string | null = null,
    readonly diagnosticMessage: string | null = null,
  ) {}
}

export class InterpolationSuccess {
  readonly kind = ExpressionParseResultKind.InterpolationSuccess;
  readonly entryFamily = 'Interpolation' as const;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly ast: Interpolation,
  ) {}
}

/**
 * Distinct from parse failure: the caller explicitly asked for interpolation
 * parsing and the parser honestly found no `${...}` holes.
 */
export class InterpolationAbsent {
  readonly kind = ExpressionParseResultKind.InterpolationAbsent;
  readonly entryFamily = 'Interpolation' as const;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly rawText: string,
  ) {}
}

export class OpaqueSuccess {
  readonly kind = ExpressionParseResultKind.OpaqueSuccess;
  readonly entryFamily = 'IsCustom' as const;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly ast: CustomExpression,
  ) {}
}

export class CompleteInputParseError {
  readonly kind = ExpressionParseResultKind.CompleteInputParseError;

  constructor(
    readonly entryFamily: ExpressionType,
    readonly primarySpan: SourceSpan | null,
    readonly message: string,
    readonly text: string | null,
    readonly frameworkErrorCode: string | null = null,
  ) {}
}

/**
 * Parser-owned degraded truth for incomplete property/function input.
 *
 * Important contract:
 * - closed structure must still be canonical completed-input AST
 * - gaps/frontiers stay outside the canonical AST
 * - no semantic, typed, or ranked-completion meaning belongs here
 */
export class PropertyLikeDegradedPublication {
  readonly kind = ExpressionParseResultKind.PropertyLikeDegradedPublication;

  constructor(
    readonly entryFamily: PropertyLikeEntryFamily,
    readonly primarySpan: SourceSpan | null,
    readonly strongerTargetResultKind:
      | ExpressionParseResultKind.ExpressionSuccess
      | ExpressionParseResultKind.EmptyExpressionSuccess,
    readonly frontierKind: ExpressionFrontierKind,
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    readonly matchedDelimiterStack: readonly MatchedDelimiterEntry[],
    readonly surroundingFrameKind: ExpressionCompanionFrameKind | null,
    readonly preservedSpan: SourceSpan | null,
    readonly closedSubtreeRefs: readonly ClosedSubtreeRef[],
    readonly gapDescriptors: readonly ExpressionGapDescriptor[],
    readonly frameworkErrorCode: string | null = null,
    readonly diagnosticMessage: string | null = null,
  ) {}
}

/**
 * Used when the parser can identify the active frontier honestly but cannot
 * preserve a larger degraded property/function structure without bluffing
 * closure.
 *
 * Important contract:
 * - `surroundingFrameKind` is still parser-owned syntax truth, not a partial AST
 * - `preservedSpan` and `closedSubtreeRefs` may still carry stable local
 *   structure even when no gap descriptor can be published honestly yet
 */
export class PropertyLikeFrontierPublication {
  readonly kind = ExpressionParseResultKind.PropertyLikeFrontierPublication;

  constructor(
    readonly entryFamily: PropertyLikeEntryFamily,
    readonly primarySpan: SourceSpan | null,
    readonly strongerTargetResultKind:
      | ExpressionParseResultKind.ExpressionSuccess
      | ExpressionParseResultKind.EmptyExpressionSuccess,
    readonly frontierKind: ExpressionFrontierKind,
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    readonly matchedDelimiterStack: readonly MatchedDelimiterEntry[],
    readonly surroundingFrameKind: ExpressionCompanionFrameKind | null,
    readonly preservedSpan: SourceSpan | null,
    readonly closedSubtreeRefs: readonly ClosedSubtreeRef[],
    readonly frameworkErrorCode: string | null = null,
    readonly diagnosticMessage: string | null = null,
  ) {}
}

/**
 * Interpolation preserves ordered raw segments and closed hole ASTs directly
 * instead of reinterpreting them as ordinary property/function structure.
 */
export class InterpolationClosedHole {
  constructor(
    readonly index: number,
    readonly span: SourceSpan,
    readonly ast: CompletedInputPropertyLikeExpression,
  ) {}
}

/**
 * Parser-owned interpolation boundary truth for the active hole.
 *
 * This stays separate from the body companion metadata:
 * - interpolation scanning knows where `${` opened
 * - it may also know whether `}` already closed the active hole
 * - body parsing then contributes frontier/gap truth inside that boundary
 */
export class InterpolationHoleBoundaryState {
  constructor(
    readonly kind: InterpolationHoleBoundaryKind,
    readonly openSpan: SourceSpan | null,
    readonly closeSpan: SourceSpan | null,
  ) {}
}

/**
 * Active interpolation-hole companion state.
 *
 * This is intentionally parser-local and syntax-shaped:
 * - one active hole at a time
 * - no semantic completion or ranking
 * - closed hole subtrees stay canonical completed-input AST
 *
 * TODO: If later interpolation work needs scanner-owned residue beyond the
 * current active-hole boundary plus body companion truth, add a dedicated
 * interpolation scan-state carrier beside `boundaryState` instead of
 * overloading the generic frontier fields.
 */
export class InterpolationActiveHoleCompanion {
  constructor(
    readonly holeIndex: number,
    readonly holeSpan: SourceSpan,
    readonly boundaryState: InterpolationHoleBoundaryState,
    readonly frontierKind: ExpressionFrontierKind,
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    readonly bodyMatchedDelimiterStack: readonly MatchedDelimiterEntry[],
    readonly surroundingFrameKind: ExpressionCompanionFrameKind | null,
    readonly preservedSpan: SourceSpan | null,
    readonly closedSubtreeRefs: readonly ClosedSubtreeRef[],
    readonly gapDescriptors: readonly ExpressionGapDescriptor[],
    readonly frameworkErrorCode: string | null = null,
    readonly diagnosticMessage: string | null = null,
  ) {}
}

/**
 * Scanner-known interpolation hole that cannot become the single active-hole
 * companion publication.
 *
 * This preserves only boundary/span truth for later holes once another hole
 * has already claimed the active companion lane. It intentionally does not
 * surface a second body-level frontier/gap envelope.
 *
 * TODO: If later interpolation work needs scanner-owned residue beyond ordered
 * suppressed-hole boundaries (for example stray boundary markers or other
 * mode-specific state), add a dedicated interpolation scan-state carrier
 * beside this one instead of widening it into a second companion system.
 */
export class InterpolationSuppressedHole {
  constructor(
    readonly index: number,
    readonly holeSpan: SourceSpan,
    readonly boundaryState: InterpolationHoleBoundaryState,
    readonly publicationKind: InterpolationSuppressedHolePublicationKind,
  ) {}
}

/**
 * Dedicated interpolation companion envelope.
 *
 * Atlas pressure here is different from the property/function corridor:
 * interpolation owns raw text segments, closed hole order, and one active hole
 * frontier. That extra structure should stay explicit instead of being
 * compressed into the generic property-like companion carrier.
 *
 * `closedHoles`, `activeHole`, and `suppressedHoles` are all ordered by the
 * original hole index and together explain the scanner-owned segmentation
 * represented by `rawParts`.
 */
export class InterpolationDegradedPublication {
  readonly kind = ExpressionParseResultKind.InterpolationDegradedPublication;
  readonly entryFamily = 'Interpolation' as const;
  readonly strongerTargetResultKind = ExpressionParseResultKind.InterpolationSuccess;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly rawParts: readonly string[],
    readonly closedHoles: readonly InterpolationClosedHole[],
    readonly activeHole: InterpolationActiveHoleCompanion,
    readonly suppressedHoles: readonly InterpolationSuppressedHole[],
  ) {}
}

/**
 * Used when interpolation can identify the active hole frontier honestly but
 * cannot preserve a larger degraded hole structure without bluffing closure.
 *
 * `closedHoles`, `activeHole`, and `suppressedHoles` still preserve the
 * scanner-owned hole ordering that explains `rawParts`.
 */
export class InterpolationFrontierPublication {
  readonly kind = ExpressionParseResultKind.InterpolationFrontierPublication;
  readonly entryFamily = 'Interpolation' as const;
  readonly strongerTargetResultKind = ExpressionParseResultKind.InterpolationSuccess;

  constructor(
    readonly primarySpan: SourceSpan | null,
    readonly rawParts: readonly string[],
    readonly closedHoles: readonly InterpolationClosedHole[],
    readonly activeHole: InterpolationActiveHoleCompanion,
    readonly suppressedHoles: readonly InterpolationSuppressedHole[],
  ) {}
}

export type CompletedExpressionParseResult =
  | ExpressionSuccess
  | EmptyExpressionSuccess
  | IteratorSuccess
  | InterpolationSuccess
  | InterpolationAbsent
  | OpaqueSuccess;

export type CompanionExpressionParseResult =
  | PropertyLikeDegradedPublication
  | PropertyLikeFrontierPublication
  | InterpolationDegradedPublication
  | InterpolationFrontierPublication
  | IteratorDegradedPublication
  | IteratorFrontierPublication;

export type ExpressionParseResult =
  | CompletedExpressionParseResult
  | CompanionExpressionParseResult
  | CompleteInputParseError;

/**
 * Entry-family result aliases are the intended public parser surface.
 *
 * These aliases keep family-specific contracts explicit and keep callers from
 * flattening the parser back into one giant `ExpressionParseResult` switch
 * when a narrower family contract is already known at the call site.
 *
 * TODO: If later consumers repeatedly need "all parseable families except X"
 * or "all completion-carrying families" style unions, add parser-owned helper
 * aliases here rather than recreating bespoke unions around the codebase.
 */
export type PropertyLikeParseResult =
  | ExpressionSuccess
  | EmptyExpressionSuccess
  | PropertyLikeDegradedPublication
  | PropertyLikeFrontierPublication
  | CompleteInputParseError;

export type IteratorParseResult =
  | IteratorSuccess
  | IteratorDegradedPublication
  | IteratorFrontierPublication
  | CompleteInputParseError;

export type InterpolationParseResult =
  | InterpolationSuccess
  | InterpolationAbsent
  | InterpolationDegradedPublication
  | InterpolationFrontierPublication
  | CompleteInputParseError;

export type CustomParseResult =
  | OpaqueSuccess
  | CompleteInputParseError;

/**
 * Public parser contract.
 *
 * Suggested flow:
 * 1. Attempt completed-input parsing for the selected entry family.
 * 2. If it closes, publish one completed-input success class.
 * 3. If completed-input closure fails, attempt parser-local degraded/frontier
 *    publication without mutating canonical AST truth.
 * 4. If even that is not honest, publish `CompleteInputParseError`.
 *
 * Completion ranking, typed member closure, import suggestions, and runtime
 * interpretation all live above this contract.
 */
export interface ExpressionParseResultPublisher {
  parse(
    expression: string,
    entryFamily?: ExpressionType,
    context?: ExpressionParseContext,
  ): ExpressionParseResult;

  parsePropertyLike(
    expression: string,
    entryFamily?: PropertyLikeEntryFamily,
    context?: ExpressionParseContext,
  ): PropertyLikeParseResult;

  parseIterator(
    expression: string,
    context?: ExpressionParseContext,
  ): IteratorParseResult;

  parseInterpolation(
    expression: string,
    context?: ExpressionParseContext,
  ): InterpolationParseResult;

  parseCustom(
    expression: string,
    context?: ExpressionParseContext,
  ): CustomParseResult;
}
