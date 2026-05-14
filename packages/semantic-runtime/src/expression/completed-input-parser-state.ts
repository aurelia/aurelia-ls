import { Scanner, type Token } from './expression-scanner.js';
import {
  absoluteTextSpan,
  normalizeSpan,
  spanFromBounds,
  sourceSpanFromBounds,
  type SourceSpan,
  type TextSpan,
} from './source-span.js';
import { ParseFailureInspector } from './parse-failure-inspection.js';
import type { ParseFailure } from './parse-failure.js';
import { CompletedInputDelimiterTracker } from './completed-input-delimiters.js';
import { CompletedInputPrefixRefBuilder } from './completed-input-prefix-refs.js';
import { CompletedInputFailureTracker } from './completed-input-failures.js';

type SpanBearing = { span: TextSpan };

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
 *
 * TODO: If later work needs ranked failure retention, richer delimiter
 * progress, or corridor-specific scan residue here, add explicit helper
 * facets beside this class instead of turning it into a generic utility bag.
 */
export class CompletedInputParserState {
  readonly source: string;
  readonly scanner: Scanner;
  readonly baseSpan: SourceSpan | null;
  readonly delimiters: CompletedInputDelimiterTracker;
  readonly prefixRefs: CompletedInputPrefixRefBuilder;
  readonly failures: CompletedInputFailureTracker;
  private lastTokenEnd = 0;

  constructor(source: string, baseSpan: SourceSpan | null = null) {
    this.source = source;
    this.baseSpan = baseSpan ? normalizeSpan(baseSpan) : null;
    this.scanner = new Scanner(source);
    this.delimiters = new CompletedInputDelimiterTracker(this);
    this.prefixRefs = new CompletedInputPrefixRefBuilder(this);
    this.failures = new CompletedInputFailureTracker(this);
  }

  get consumedEnd(): number {
    return this.lastTokenEnd;
  }

  setConsumedEnd(end: number): void {
    this.lastTokenEnd = end;
  }

  advanceScannerTo(end: number): void {
    this.scanner.reset(end);
    this.lastTokenEnd = end;
  }

  span(start: number, end: number): SourceSpan {
    const local = spanFromBounds(start, end);
    if (this.baseSpan) {
      return absoluteTextSpan(local, this.baseSpan);
    }
    return sourceSpanFromBounds(local.start, local.end);
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
      this.delimiters.depth,
      this.failures.retainedFailure,
    );
  }

  restoreCheckpoint(checkpoint: ParserStateCheckpoint): void {
    this.scanner.reset(checkpoint.scannerPosition);
    this.lastTokenEnd = checkpoint.lastTokenEnd;
    this.delimiters.restoreDepth(checkpoint.delimiterDepth);
    this.failures.restoreRetainedFailure(checkpoint.firstFailure);
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

  tokenSpan(token: Token): SourceSpan {
    return this.span(token.start, Math.max(token.end, token.start));
  }

  tokenText(token: Token): string | null {
    return this.source.slice(token.start, Math.max(token.end, token.start));
  }
}
