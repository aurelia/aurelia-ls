import { CharCode, type Token, TokenType } from './expression-scanner.js';
import { TemplateExpression } from './ast.js';
import type { SourceSpan } from './source-span.js';
import type { IsAssign } from './ast.js';
import { findTemplateExpressionClose } from './expression-boundary-scanner.js';
import {
  ClosedSubtreeRef,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapKind,
  MatchedDelimiterEntry,
  MatchedDelimiterKind,
} from './parse-result-algebra.js';
import { isParseCompanionFailure, isParseFailure } from './parse-failure.js';
import type { ParseCompanionFailure, ParseFailure, ParseOutcome } from './parse-failure.js';
import { CompletedInputCompanionBuilder } from './completed-input-companion-builder.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';

interface CompletedInputTemplateCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: CompletedInputCompanionBuilder;
  readonly parseHoleExpression: (
    source: string,
    baseSpan: SourceSpan,
  ) => ParseOutcome<IsAssign>;
}

/**
 * Template-literal corridor for completed-input property-like parsing.
 *
 * This corridor owns the parser-local law that differs from the shared
 * precedence pipeline:
 * - raw backtick/body scanning
 * - nested hole-boundary tracking
 * - nested hole expression handoff
 * - template-owned companion publication and widening
 *
 * TODO: If later work needs richer tagged-template-specific law or template
 * scanner residue beyond the current hole/body model, split this into
 * scanner and publication subfacets instead of letting this corridor regrow a
 * parser-sized helper cluster.
 */
export class CompletedInputTemplateCorridor {
  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputCompanionBuilder;

  constructor(
    private readonly deps: CompletedInputTemplateCorridorDependencies,
  ) {
    this.state = deps.state;
    this.companionBuilder = deps.companionBuilder;
  }

  parseTemplateLiteral(): ParseOutcome<TemplateExpression> {
    const open = this.state.peekToken();
    if (open.type !== TokenType.Backtick) {
      return this.state.error("Expected '`' to start template literal", open);
    }
    this.state.nextToken(); // consume '`'

    const cooked: string[] = [];
    const expressions: IsAssign[] = [];

    let chunkStart = open.end;
    let i = chunkStart;
    const src = this.state.source;

    const flushChunk = (end: number) => {
      cooked.push(src.slice(chunkStart, end));
    };

    while (i < src.length) {
      const ch = src.charCodeAt(i);
      if (ch === CharCode.Dollar && src.charCodeAt(i + 1) === CharCode.OpenBrace) {
        flushChunk(i);
        const holeOpenStart = i;
        const exprStart = i + 2;
        const closing = findTemplateExpressionClose(src, exprStart);
        if (closing == null) {
          return this.unterminatedTemplateHoleFailure(
            open,
            holeOpenStart,
            cooked,
            expressions,
            src.slice(exprStart),
          );
        }

        const exprBase = this.state.span(exprStart, closing);
        const node = this.deps.parseHoleExpression(src.slice(exprStart, closing), exprBase);
        if (isParseFailure(node)) {
          return this.templateHoleFailure(
            open,
            cooked,
            expressions,
            node,
            holeOpenStart,
          );
        }

        expressions.push(node);
        chunkStart = closing + 1;
        i = chunkStart;
        continue;
      }

      if (ch === CharCode.Backtick) {
        flushChunk(i);
        i++;
        this.state.advanceScannerTo(i);
        return new TemplateExpression(
          this.state.span(open.start, i),
          cooked,
          expressions,
        );
      }

      if (ch === CharCode.Backslash) {
        i += 2;
        continue;
      }

      i++;
    }

    return this.unterminatedTemplateLiteralFailure(open, cooked, expressions, chunkStart);
  }

  private unterminatedTemplateLiteralFailure(
    open: Token,
    cooked: readonly string[],
    expressions: readonly IsAssign[],
    chunkStart: number,
  ): ParseCompanionFailure {
    const eofSpan = this.state.span(this.state.source.length, this.state.source.length);
    const fullCooked = [
      ...cooked,
      this.state.source.slice(chunkStart),
    ];
    return this.companionBuilder.degradedFailureAt(
      eofSpan,
      'Unterminated template literal',
      null,
      ExpressionFrontierKind.AwaitingClosingDelimiter,
      [ExpressionExpectedContinuationClass.TemplateClose],
      ExpressionCompanionFrameKind.TemplateLiteral,
      this.state.span(open.start, this.state.source.length),
      this.state.templatePrefixRefs(open.start, fullCooked, expressions, this.state.source.length),
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingClosingDelimiter,
          eofSpan,
          ExpressionCompanionFrameKind.TemplateLiteral,
          [ExpressionExpectedContinuationClass.TemplateClose],
        ),
      ],
      this.templateMatchedDelimiterEntries(open),
    );
  }

  private unterminatedTemplateHoleFailure(
    open: Token,
    holeOpenStart: number,
    cooked: readonly string[],
    expressions: readonly IsAssign[],
    holeSource: string,
  ): ParseCompanionFailure {
    const prefixRefs = this.state.templatePrefixRefs(open.start, cooked, expressions, holeOpenStart);
    const holeOpenSpan = this.state.span(holeOpenStart, holeOpenStart + 2);
    const matchedDelimiterStack = this.templateMatchedDelimiterEntries(open, holeOpenStart);
    const holeCodeStart = holeOpenStart + 2;
    const holeCodeSpan = this.state.span(holeCodeStart, this.state.source.length);

    if (holeSource.length === 0) {
      return this.companionBuilder.frontierOnlyFailureAt(
        holeCodeSpan,
        "Expected expression or '}' in template hole",
        null,
        ExpressionFrontierKind.AmbiguousClosure,
        [
          ExpressionExpectedContinuationClass.Expression,
          ExpressionExpectedContinuationClass.CloseBrace,
        ],
        ExpressionCompanionFrameKind.TemplateHole,
        this.state.span(open.start, holeCodeStart),
        matchedDelimiterStack,
        prefixRefs,
      );
    }

    const node = this.deps.parseHoleExpression(
      holeSource,
      this.state.span(holeCodeStart, this.state.source.length),
    );
    if (isParseFailure(node)) {
      if (isParseCompanionFailure(node)) {
        return this.templateFailureFromInnerCompanion(
          open,
          holeOpenStart,
          prefixRefs,
          node,
          true,
        );
      }

      return this.companionBuilder.degradedFailureAt(
        node.span,
        node.message,
        node.text,
        ExpressionFrontierKind.AwaitingExpression,
        [ExpressionExpectedContinuationClass.Expression],
        ExpressionCompanionFrameKind.TemplateHole,
        this.state.span(open.start, holeCodeStart),
        prefixRefs,
        [
          this.state.gapDescriptor(
            ExpressionGapKind.MissingExpression,
            holeOpenSpan,
            ExpressionCompanionFrameKind.TemplateHole,
            [ExpressionExpectedContinuationClass.Expression],
          ),
        ],
        matchedDelimiterStack,
      );
    }

    return this.companionBuilder.degradedFailureAt(
      holeCodeSpan,
      "Expected '}' to close template hole",
      null,
      ExpressionFrontierKind.AwaitingClosingDelimiter,
      [ExpressionExpectedContinuationClass.CloseBrace],
      ExpressionCompanionFrameKind.TemplateHole,
      this.state.span(open.start, this.state.localEnd(node)),
      [
        ...prefixRefs,
        this.state.rootPrefix(node),
      ],
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingClosingDelimiter,
          holeCodeSpan,
          ExpressionCompanionFrameKind.TemplateHole,
          [ExpressionExpectedContinuationClass.CloseBrace],
        ),
      ],
      matchedDelimiterStack,
    );
  }

  private templateHoleFailure(
    open: Token,
    cooked: readonly string[],
    expressions: readonly IsAssign[],
    failure: ParseFailure,
    holeOpenStart: number,
  ): ParseFailure {
    if (!isParseCompanionFailure(failure)) {
      const holeOpenSpan = this.state.span(holeOpenStart, holeOpenStart + 2);
      return this.companionBuilder.degradedFailureAt(
        failure.span,
        failure.message,
        failure.text,
        ExpressionFrontierKind.AwaitingExpression,
        [ExpressionExpectedContinuationClass.Expression],
        ExpressionCompanionFrameKind.TemplateHole,
        this.state.span(open.start, holeOpenStart + 2),
        this.state.templatePrefixRefs(open.start, cooked, expressions, holeOpenStart),
        [
          this.state.gapDescriptor(
            ExpressionGapKind.MissingExpression,
            holeOpenSpan,
            ExpressionCompanionFrameKind.TemplateHole,
            [ExpressionExpectedContinuationClass.Expression],
          ),
        ],
        this.templateMatchedDelimiterEntries(open),
      );
    }

    return this.templateFailureFromInnerCompanion(
      open,
      holeOpenStart,
      this.state.templatePrefixRefs(open.start, cooked, expressions, holeOpenStart),
      failure,
      false,
    );
  }

  private templateFailureFromInnerCompanion(
    open: Token,
    holeOpenStart: number,
    leadingClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    failure: ParseCompanionFailure,
    holeStillOpen: boolean,
  ): ParseCompanionFailure {
    const delimiterEntries = this.templateMatchedDelimiterEntries(
      open,
      holeStillOpen ? holeOpenStart : undefined,
    );
    const frameKind = holeStillOpen
      ? ExpressionCompanionFrameKind.TemplateHole
      : ExpressionCompanionFrameKind.TemplateLiteral;

    return failure.withCompanion(
      failure.companion
        .withFrame(
          frameKind,
          this.state.span(open.start, this.state.failurePreservedEnd(failure)),
          leadingClosedSubtreeRefs,
        )
        .prependMatchedDelimiters(delimiterEntries),
    );
  }

  private templateMatchedDelimiterEntries(
    open: Token,
    holeOpenStart?: number,
  ): readonly MatchedDelimiterEntry[] {
    const entries = [
      new MatchedDelimiterEntry(
        MatchedDelimiterKind.Template,
        this.state.spanFromToken(open),
        null,
      ),
    ];

    if (holeOpenStart != null) {
      entries.push(
        new MatchedDelimiterEntry(
          MatchedDelimiterKind.TemplateHole,
          this.state.span(holeOpenStart, holeOpenStart + 2),
          null,
        ),
      );
    }

    return entries;
  }
}
