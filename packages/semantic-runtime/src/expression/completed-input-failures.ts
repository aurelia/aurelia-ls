import type { Token } from './expression-scanner.js';
import type { SourceSpan } from './source-span.js';
import {
  ClosedSubtreeRef,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapDescriptor,
  ExpressionGapKind,
  MatchedDelimiterEntry,
} from './parse-result-algebra.js';
import {
  ParseCompanionFailure,
  ParseHardFailure,
  isParseCompanionFailure,
} from './parse-failure.js';
import type { ParseFailure } from './parse-failure.js';

interface CompletedInputFailureHost {
  readonly delimiters: {
    snapshot(): readonly MatchedDelimiterEntry[];
  };

  peekToken(): Token;
  tokenSpan(token: Token): SourceSpan;
  tokenText(token: Token): string | null;
}

export class CompletedInputFailureTracker {
  private firstFailure: ParseFailure | null = null;

  constructor(
    private readonly host: CompletedInputFailureHost,
  ) {}

  get retainedFailure(): ParseFailure | null {
    return this.firstFailure;
  }

  restoreRetainedFailure(failure: ParseFailure | null): void {
    this.firstFailure = failure;
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

  hardError(
    message: string,
    token?: Token,
    frameworkErrorCode: string | null = null,
  ): ParseFailure {
    const blocked = token ?? this.host.peekToken();
    const failure = ParseHardFailure.create(
      this.host.tokenSpan(blocked),
      message,
      this.host.tokenText(blocked),
      frameworkErrorCode,
    );
    this.recordFailure(failure);
    return failure;
  }

  error(
    message: string,
    token?: Token,
    frameworkErrorCode: string | null = null,
  ): ParseFailure {
    return this.hardError(message, token, frameworkErrorCode);
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
    frameworkErrorCode: string | null = null,
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.degraded({
      span: this.host.tokenSpan(blocked),
      message,
      text: this.host.tokenText(blocked),
      frameworkErrorCode,
      frontierKind,
      expectedContinuationClasses,
      matchedDelimiterStack: this.host.delimiters.snapshot(),
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
    frameworkErrorCode: string | null = null,
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.degraded({
      span,
      message,
      text,
      frameworkErrorCode,
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
    frameworkErrorCode: string | null = null,
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.frontierOnly({
      span: this.host.tokenSpan(blocked),
      message,
      text: this.host.tokenText(blocked),
      frameworkErrorCode,
      frontierKind,
      expectedContinuationClasses,
      matchedDelimiterStack: this.host.delimiters.snapshot(),
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
    frameworkErrorCode: string | null = null,
  ): ParseCompanionFailure {
    const failure = ParseCompanionFailure.frontierOnly({
      span,
      message,
      text,
      frameworkErrorCode,
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
    // First companion truth wins over a hard failure; otherwise the first
    // retained failure stays. A future ranked recovery pass should live beside
    // this tracker instead of adding hidden precedence rules to parser state.
    if (!this.firstFailure || (this.firstFailure instanceof ParseHardFailure && isParseCompanionFailure(failure))) {
      this.firstFailure = failure;
    }
  }
}
