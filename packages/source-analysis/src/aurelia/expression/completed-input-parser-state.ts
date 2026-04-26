import { Scanner, type Token } from './expression-scanner.js';
import {
  ArrayBindingPattern,
  ArrayLiteralExpression,
  ObjectBindingPattern,
  ObjectLiteralExpression,
  TemplateExpression,
} from './ast.js';
import {
  absoluteSpan,
  ensureSpanFile,
  normalizeSpan,
  sourceSpanFromBounds,
  type SourceSpan,
  type TextSpan,
} from '../source-address.js';
import type {
  BindingPattern,
  IsAssign,
  ObjectBindingPatternProperty,
} from './ast.js';
import {
  ClosedSubtreeRef,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapDescriptor,
  ExpressionGapKind,
  MatchedDelimiterEntry,
  type MatchedDelimiterKind,
} from './parse-result-algebra.js';
import type { CompletedInputExpressionNode } from './parse-result-algebra.js';
import { ParseFailureInspector } from './parse-failure-inspection.js';
import {
  ParseCompanionFailure,
  ParseHardFailure,
  isParseCompanionFailure,
} from './parse-failure.js';
import type { ParseFailure } from './parse-failure.js';

type SpanBearing = { span: TextSpan };

class OpenDelimiterFrame {
  constructor(
    readonly kind: MatchedDelimiterKind,
    readonly openSpan: SourceSpan,
  ) {}
}

export class ParserStateCheckpoint {
  constructor(
    readonly scannerPosition: number,
    readonly lastTokenEnd: number,
    readonly delimiterDepth: number,
    readonly firstFailure: ParseFailure | null,
  ) {}
}

/**
 * Internal cursor/state/provenance engine for completed-input parsing.
 *
 * `CompletedInputParser` owns grammar corridors. This class owns the
 * mechanics that those corridors share:
 * - scanner cursor and checkpoints
 * - span rebasing and local/global offset translation
 * - delimiter tracking
 * - parser-local failure construction/retention
 * - closed-subtree/prefix provenance helpers
 *
 * TODO: If later work needs ranked failure retention, richer delimiter
 * progress, or corridor-specific scan residue here, add explicit helper
 * facets beside this class instead of turning it into a generic utility bag.
 */
export class CompletedInputParserState {
  readonly source: string;
  readonly scanner: Scanner;
  readonly baseSpan: SourceSpan | null;
  private readonly delimiterStack: OpenDelimiterFrame[] = [];
  private lastTokenEnd = 0;
  private firstFailure: ParseFailure | null = null;

  constructor(source: string, baseSpan: SourceSpan | null = null) {
    this.source = source;
    this.baseSpan = baseSpan ? normalizeSpan(baseSpan) : null;
    this.scanner = new Scanner(source);
  }

  get retainedFailure(): ParseFailure | null {
    return this.firstFailure;
  }

  get consumedEnd(): number {
    return this.lastTokenEnd;
  }

  setConsumedEnd(end: number): void {
    this.lastTokenEnd = end;
  }

  span(start: number, end: number): SourceSpan {
    const local = sourceSpanFromBounds(start, end, this.baseSpan?.file ?? null);
    if (!this.baseSpan) return local;
    const rebased = absoluteSpan(local, this.baseSpan);
    if (rebased) return rebased;
    const withFile = ensureSpanFile(local, this.baseSpan.file);
    return normalizeSpan(withFile ?? local);
  }

  toLocal(offset: number): number {
    return this.baseSpan ? offset - this.baseSpan.start : offset;
  }

  peekToken(): Token {
    return this.scanner.peek();
  }

  nextToken(): Token {
    const token = this.scanner.next();
    this.lastTokenEnd = token.end;
    return token;
  }

  createCheckpoint(scannerPosition = this.scanner.position): ParserStateCheckpoint {
    // TODO: If parser-local state starts growing beyond cursor/failure/
    // delimiter position, move checkpoint persistence onto a dedicated state
    // snapshot object instead of widening this tuple ad hoc.
    return new ParserStateCheckpoint(
      scannerPosition,
      this.lastTokenEnd,
      this.delimiterStack.length,
      this.firstFailure,
    );
  }

  restoreCheckpoint(checkpoint: ParserStateCheckpoint): void {
    this.scanner.reset(checkpoint.scannerPosition);
    this.lastTokenEnd = checkpoint.lastTokenEnd;
    this.delimiterStack.length = checkpoint.delimiterDepth;
    this.firstFailure = checkpoint.firstFailure;
  }

  spanFromToken(token: Token): SourceSpan {
    return this.span(token.start, token.end);
  }

  localStart(node: SpanBearing): number {
    return this.toLocal(node.span.start);
  }

  localEnd(node: SpanBearing): number {
    return this.toLocal(node.span.end);
  }

  spanFrom(start: SpanBearing | number, end: SpanBearing | number): SourceSpan {
    const localStart = typeof start === 'number' ? start : this.localStart(start);
    const localEnd = typeof end === 'number' ? end : this.localEnd(end);
    return this.span(localStart, localEnd);
  }

  failurePreservedEnd(failure: ParseFailure): number {
    const preservedSpan = ParseFailureInspector.preservedSpan(failure);
    return preservedSpan
      ? this.toLocal(preservedSpan.end)
      : this.toLocal(failure.span.end);
  }

  withOptionalPrefixRef(prefixRef: ClosedSubtreeRef | null): readonly ClosedSubtreeRef[] {
    return prefixRef ? [prefixRef] : [];
  }

  arrayPrefixRef(
    start: number,
    elements: readonly IsAssign[],
  ): ClosedSubtreeRef | null {
    if (elements.length === 0) {
      return null;
    }

    const prefix = new ArrayLiteralExpression(
      this.span(start, this.localEnd(elements[elements.length - 1]!)),
      [...elements],
    );
    return this.rootPrefix(prefix);
  }

  arrayBindingPatternPrefixRef(
    start: number,
    elements: readonly BindingPattern[],
    rest: BindingPattern | null,
  ): ClosedSubtreeRef | null {
    if (elements.length === 0 && !rest) {
      return null;
    }

    const endNode = rest ?? elements[elements.length - 1] ?? null;
    if (!endNode) {
      return null;
    }

    const prefix = new ArrayBindingPattern(
      this.span(start, this.localEnd(endNode)),
      [...elements],
      rest,
    );
    return this.rootPrefix(prefix);
  }

  objectPrefixRef(
    start: number,
    keys: readonly (number | string)[],
    values: readonly IsAssign[],
  ): ClosedSubtreeRef | null {
    if (values.length === 0) {
      return null;
    }

    const prefix = new ObjectLiteralExpression(
      this.span(start, this.localEnd(values[values.length - 1]!)),
      [...keys],
      [...values],
    );
    return this.rootPrefix(prefix);
  }

  objectBindingPatternPrefixRef(
    start: number,
    properties: readonly ObjectBindingPatternProperty[],
    rest: BindingPattern | null,
  ): ClosedSubtreeRef | null {
    if (properties.length === 0 && !rest) {
      return null;
    }

    const endNode = rest ?? properties[properties.length - 1]?.value ?? null;
    if (!endNode) {
      return null;
    }

    const prefix = new ObjectBindingPattern(
      this.span(start, this.localEnd(endNode)),
      [...properties],
      rest,
    );
    return this.rootPrefix(prefix);
  }

  templatePrefixRef(
    start: number,
    cooked: readonly string[],
    expressions: readonly IsAssign[],
    end: number,
  ): ClosedSubtreeRef | null {
    if (cooked.length === 0 && expressions.length === 0) {
      return null;
    }

    if (cooked.length === 1 && cooked[0] === '' && expressions.length === 0) {
      return null;
    }

    const prefix = new TemplateExpression(
      this.span(start, end),
      [...cooked],
      [...expressions],
    );
    return this.rootPrefix(prefix);
  }

  templatePrefixRefs(
    start: number,
    cooked: readonly string[],
    expressions: readonly IsAssign[],
    end: number,
  ): readonly ClosedSubtreeRef[] {
    return this.withOptionalPrefixRef(
      this.templatePrefixRef(start, cooked, expressions, end),
    );
  }

  tokenSpan(token: Token): SourceSpan {
    return this.span(token.start, Math.max(token.end, token.start));
  }

  tokenText(token: Token): string | null {
    return this.source.slice(token.start, Math.max(token.end, token.start));
  }

  pushDelimiter(kind: MatchedDelimiterKind, open: Token): void {
    this.delimiterStack.push(new OpenDelimiterFrame(kind, this.spanFromToken(open)));
  }

  popDelimiter(kind: MatchedDelimiterKind): void {
    const top = this.delimiterStack[this.delimiterStack.length - 1];
    if (top?.kind === kind) {
      this.delimiterStack.pop();
    }
  }

  snapshotMatchedDelimiters(): readonly MatchedDelimiterEntry[] {
    // TODO: This currently snapshots only still-open delimiters. If later
    // publication needs close spans or richer delimiter progress on the
    // property/iterator corridor, add that through parser-local state instead
    // of widening `MatchedDelimiterEntry` piecemeal at call sites.
    return this.delimiterStack.map(
      (frame) => new MatchedDelimiterEntry(frame.kind, frame.openSpan, null),
    );
  }

  rootPrefix(node: CompletedInputExpressionNode): ClosedSubtreeRef {
    return new ClosedSubtreeRef('root-prefix', node, node.span);
  }

  childRef(node: CompletedInputExpressionNode): ClosedSubtreeRef {
    return new ClosedSubtreeRef('child', node, node.span);
  }

  siblingRef(node: CompletedInputExpressionNode): ClosedSubtreeRef {
    return new ClosedSubtreeRef('sibling', node, node.span);
  }

  gapDescriptor(
    gapKind: ExpressionGapKind,
    anchorSpan: SourceSpan,
    surroundingFrameKind: ExpressionCompanionFrameKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
  ): ExpressionGapDescriptor {
    return new ExpressionGapDescriptor(
      gapKind,
      anchorSpan,
      surroundingFrameKind,
      expectedContinuationClasses,
    );
  }

  hardError(message: string, token?: Token): ParseFailure {
    const blocked = token ?? this.peekToken();
    const failure = ParseHardFailure.create(
      this.tokenSpan(blocked),
      message,
      this.tokenText(blocked),
    );
    this.recordFailure(failure);
    return failure;
  }

  error(message: string, token?: Token): ParseFailure {
    return this.hardError(message, token);
  }

  degradedFailure(
    message: string,
    blocked: Token,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
    gapDescriptors: readonly ExpressionGapDescriptor[],
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.degraded({
      span: this.tokenSpan(blocked),
      message,
      text: this.tokenText(blocked),
      frontierKind,
      expectedContinuationClasses,
      matchedDelimiterStack: this.snapshotMatchedDelimiters(),
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
      gapDescriptors,
    });
    this.recordFailure(failure);
    return failure;
  }

  degradedFailureAt(
    span: SourceSpan,
    message: string,
    text: string | null,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
    gapDescriptors: readonly ExpressionGapDescriptor[],
    matchedDelimiterStack: readonly MatchedDelimiterEntry[],
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.degraded({
      span,
      message,
      text,
      frontierKind,
      expectedContinuationClasses,
      matchedDelimiterStack,
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
      gapDescriptors,
    });
    this.recordFailure(failure);
    return failure;
  }

  frontierOnlyFailure(
    message: string,
    blocked: Token,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    closedSubtreeRefs: readonly ClosedSubtreeRef[] = [],
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.frontierOnly({
      span: this.tokenSpan(blocked),
      message,
      text: this.tokenText(blocked),
      frontierKind,
      expectedContinuationClasses,
      matchedDelimiterStack: this.snapshotMatchedDelimiters(),
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
    });
    this.recordFailure(failure);
    return failure;
  }

  frontierOnlyFailureAt(
    span: SourceSpan,
    message: string,
    text: string | null,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    matchedDelimiterStack: readonly MatchedDelimiterEntry[],
    closedSubtreeRefs: readonly ClosedSubtreeRef[] = [],
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.frontierOnly({
      span,
      message,
      text,
      frontierKind,
      expectedContinuationClasses,
      matchedDelimiterStack,
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
    });
    this.recordFailure(failure);
    return failure;
  }

  private recordFailure(failure: ParseFailure): void {
    // TODO: This is intentionally simple today: first companion truth wins
    // over a hard failure, and otherwise the first retained failure stays. If
    // later work needs ranked companion candidates or secondary diagnostics,
    // add an explicit failure-ranking structure instead of encoding more
    // precedence rules here.
    if (!this.firstFailure || (this.firstFailure instanceof ParseHardFailure && isParseCompanionFailure(failure))) {
      this.firstFailure = failure;
    }
  }
}
