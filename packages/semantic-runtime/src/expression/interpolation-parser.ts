import {
  Interpolation,
} from "./ast.js";
import {
  absoluteTextSpan,
  normalizeSpan,
  sourceSpanFromBounds,
  spanFromBounds,
  type SourceSpan,
  type TextSpan,
} from "./source-span.js";
import { findTemplateExpressionClose } from "./expression-boundary-scanner.js";
import {
  ClosedSubtreeRef,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapDescriptor,
  ExpressionGapKind,
  ExpressionParseResultKind,
  InterpolationAbsent,
  InterpolationActiveHoleCompanion,
  InterpolationHoleBoundaryKind,
  InterpolationHoleBoundaryState,
  InterpolationClosedHole,
  InterpolationDegradedPublication,
  InterpolationFrontierPublication,
  InterpolationSuppressedHole,
  InterpolationSuppressedHolePublicationKind,
  InterpolationSuccess,
} from "./parse-result-algebra.js";
import type {
  CompletedInputPropertyLikeExpression,
  ExpressionSuccess,
  PropertyLikeDegradedPublication,
  PropertyLikeFrontierPublication,
  InterpolationParseResult,
  PropertyLikeParseResult,
} from "./parse-result-algebra.js";

interface ClosedInterpolationHoleSegment {
  readonly kind: "closed";
  readonly openSpan: TextSpan;
  readonly codeSpan: TextSpan;
  readonly closeSpan: TextSpan;
  readonly code: string;
  readonly parseResult: PropertyLikeParseResult;
}

interface UnterminatedInterpolationHoleSegment {
  readonly kind: "unterminated";
  readonly openSpan: TextSpan;
  readonly codeSpan: TextSpan;
  readonly code: string;
  readonly parseResult: PropertyLikeParseResult;
}

type InterpolationHoleSegment =
  | ClosedInterpolationHoleSegment
  | UnterminatedInterpolationHoleSegment;

interface InterpolationSegments {
  readonly parts: readonly string[];
  readonly holes: readonly InterpolationHoleSegment[];
}

type InterpolationCompanionPublicationKind =
  | ExpressionParseResultKind.InterpolationDegradedPublication
  | ExpressionParseResultKind.InterpolationFrontierPublication;

type ParsedInterpolationHoleExpression =
  | ExpressionSuccess
  | PropertyLikeDegradedPublication
  | PropertyLikeFrontierPublication;

export class InterpolationParser {
  /**
   * Interpolation-specific entry-family publication.
   *
   * Today this closes:
   * - `InterpolationSuccess`
   * - `InterpolationAbsent`
   * - interpolation-owned degraded/frontier state for one active hole
   * - `CompleteInputParseError` where even that companion truth would bluff
   *
   * TODO: This now owns ordered active/suppressed hole boundary truth
   * directly. If later work needs interpolation scanner residue that still
   * sits outside those ordered hole carriers, add a dedicated interpolation
   * scan-state carrier here instead of pushing more meaning through the
   * property/function companion carriers.
   *
   * TODO: If interpolation publication grows another family-local axis
   * (suppressed-hole diagnostics, richer boundary modes, or scan residue),
   * split this class into extract/walk/publish phases instead of letting one
   * static method accumulate all interpolation ownership in place.
   */
  static parse(
    text: string,
    parseExpression: (
      segment: string,
      baseOffset: number,
      baseSpan: SourceSpan | null,
    ) => PropertyLikeParseResult,
    baseSpan: SourceSpan | null = null,
    activeOffset: number | null = null,
  ): InterpolationParseResult {
    const split = this.extractSegments(text, parseExpression, baseSpan);
    if (!split) {
      const span = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, text.length);
      return new InterpolationAbsent(span, text);
    }

    return new InterpolationPublicationFrame(
      text,
      split,
      baseSpan,
      activeOffset,
    ).publish();
  }

  private static extractSegments(
    text: string,
    parseExpression: (
      segment: string,
      baseOffset: number,
      baseSpan: SourceSpan | null,
    ) => PropertyLikeParseResult,
    baseSpan: SourceSpan | null,
  ): InterpolationSegments | null {
    return this.splitText(text, parseExpression, baseSpan);
  }

  private static splitText(
    text: string,
    parseExpression: (
      segment: string,
      baseOffset: number,
      baseSpan: SourceSpan | null,
    ) => PropertyLikeParseResult,
    baseSpan: SourceSpan | null,
  ): InterpolationSegments | null {
    let index = 0;
    let partStart = 0;
    let sawHole = false;

    const parts: string[] = [];
    const holes: InterpolationHoleSegment[] = [];

    while (index < text.length) {
      const char = text[index];

      if (char === "\\" && text[index + 1] === "$") {
        index += 2;
        continue;
      }

      if (char === "$" && text[index + 1] === "{") {
        sawHole = true;
        parts.push(text.slice(partStart, index));

        const holeOpenStart = index;
        index += 2;
        const exprStart = index;
        const closing = findTemplateExpressionClose(text, exprStart);
        const exprEnd = closing ?? text.length;
        const exprBase = baseSpan
          ? absoluteTextSpan(spanFromBounds(exprStart, exprEnd), baseSpan)
          : null;
        const parsed = parseExpression(text.slice(exprStart, exprEnd), exprStart, exprBase);

        if (closing == null) {
          holes.push({
            kind: "unterminated",
            openSpan: spanFromBounds(holeOpenStart, holeOpenStart + 2),
            codeSpan: spanFromBounds(exprStart, text.length),
            code: text.slice(exprStart),
            parseResult: parsed,
          });
          parts.push("");
          return { parts, holes };
        }

        const closeEnd = closing + 1;
        holes.push({
          kind: "closed",
          openSpan: spanFromBounds(holeOpenStart, holeOpenStart + 2),
          codeSpan: spanFromBounds(exprStart, closing),
          closeSpan: spanFromBounds(closing, closeEnd),
          code: text.slice(exprStart, closing),
          parseResult: parsed,
        });
        index = closeEnd;
        partStart = index;
        continue;
      }

      index++;
    }

    if (!sawHole) {
      return null;
    }

    parts.push(text.slice(partStart));
    return { parts, holes };
  }
}

class InterpolationPublicationFrame {
  private readonly expressions: CompletedInputPropertyLikeExpression[] = [];
  private readonly closedHoles: InterpolationClosedHole[] = [];
  private readonly suppressedHoles: InterpolationSuppressedHole[] = [];
  private activePublicationKind: InterpolationCompanionPublicationKind | null = null;
  private activeHole: InterpolationActiveHoleCompanion | null = null;
  private firstInactivePublicationKind: InterpolationCompanionPublicationKind | null = null;
  private firstInactiveHole: InterpolationActiveHoleCompanion | null = null;
  private firstInactiveSuppressedHole: InterpolationSuppressedHole | null = null;
  private firstInactiveHardError: InterpolationParseResult | null = null;

  constructor(
    private readonly text: string,
    private readonly segments: InterpolationSegments,
    private readonly baseSpan: SourceSpan | null,
    private readonly activeOffset: number | null,
  ) {}

  publish(): InterpolationParseResult {
    for (const [index, hole] of this.segments.holes.entries()) {
      const hardError = this.consumeHole(index, hole);
      if (hardError !== null) {
        return hardError;
      }
    }

    return this.publishResult();
  }

  private consumeHole(
    index: number,
    hole: InterpolationHoleSegment,
  ): InterpolationParseResult | null {
    if (hole.code.length === 0) {
      this.publishCompanion(
        ExpressionParseResultKind.InterpolationFrontierPublication,
        hole,
        this.createEmptyHoleCompanion(index, hole),
      );
      return null;
    }

    const expr = hole.parseResult;
    if (expr.kind === ExpressionParseResultKind.CompleteInputParseError) {
      if (this.shouldUseActiveHole(hole)) {
        return expr;
      }

      this.firstInactiveHardError ??= expr;
      this.suppressedHoles.push(
        this.createSuppressedHole(
          index,
          hole,
          InterpolationSuppressedHolePublicationKind.HardErrorSuppressed,
        ),
      );
      return null;
    }

    if (expr.kind === ExpressionParseResultKind.EmptyExpressionSuccess) {
      this.publishCompanion(
        ExpressionParseResultKind.InterpolationFrontierPublication,
        hole,
        this.createEmptyHoleCompanion(index, hole),
      );
      return null;
    }

    if (hole.kind === "unterminated") {
      this.publishUnterminatedHole(index, hole, expr);
      return null;
    }

    if (expr.kind === ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      this.publishCompanion(
        ExpressionParseResultKind.InterpolationDegradedPublication,
        hole,
        this.createActiveHoleCompanion(index, hole, expr),
      );
      return null;
    }

    if (expr.kind === ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      this.publishCompanion(
        ExpressionParseResultKind.InterpolationFrontierPublication,
        hole,
        this.createActiveHoleCompanion(index, hole, expr),
      );
      return null;
    }

    this.expressions.push(expr.ast);
    this.closedHoles.push(new InterpolationClosedHole(index, expr.ast.span, expr.ast));
    return null;
  }

  private publishUnterminatedHole(
    index: number,
    hole: UnterminatedInterpolationHoleSegment,
    expr: ParsedInterpolationHoleExpression,
  ): void {
    if (expr.kind === ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      this.publishCompanion(
        ExpressionParseResultKind.InterpolationDegradedPublication,
        hole,
        this.createActiveHoleCompanion(index, hole, expr),
      );
      return;
    }

    if (expr.kind === ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      this.publishCompanion(
        ExpressionParseResultKind.InterpolationFrontierPublication,
        hole,
        this.createActiveHoleCompanion(index, hole, expr),
      );
      return;
    }

    this.publishCompanion(
      ExpressionParseResultKind.InterpolationFrontierPublication,
      hole,
      this.createMissingHoleCloseCompanion(index, hole, expr.ast),
    );
  }

  private publishCompanion(
    publicationKind: InterpolationCompanionPublicationKind,
    hole: InterpolationHoleSegment,
    companion: InterpolationActiveHoleCompanion,
  ): void {
    if (this.shouldUseActiveHole(hole)) {
      this.activePublicationKind = publicationKind;
      this.activeHole = companion;
      return;
    }

    const suppressed = this.createSuppressedHole(
      companion.holeIndex,
      hole,
      InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
    );
    if (this.firstInactiveHole == null) {
      this.firstInactivePublicationKind = publicationKind;
      this.firstInactiveHole = companion;
      this.firstInactiveSuppressedHole = suppressed;
    }
    this.suppressedHoles.push(suppressed);
  }

  private publishResult(): InterpolationParseResult {
    if (this.activeHole === null && this.firstInactiveHole !== null) {
      this.promoteFirstInactiveHole();
    }

    if (this.activeHole === null && this.firstInactiveHardError !== null) {
      return this.firstInactiveHardError;
    }

    const span = this.interpolationSpan();
    if (this.activeHole !== null) {
      if (this.activePublicationKind === ExpressionParseResultKind.InterpolationFrontierPublication) {
        return new InterpolationFrontierPublication(
          span,
          [...this.segments.parts],
          [...this.closedHoles],
          this.activeHole,
          [...this.suppressedHoles],
        );
      }

      return new InterpolationDegradedPublication(
        span,
        [...this.segments.parts],
        [...this.closedHoles],
        this.activeHole,
        [...this.suppressedHoles],
      );
    }

    return new InterpolationSuccess(
      span,
      new Interpolation(span, [...this.segments.parts], this.expressions),
    );
  }

  private promoteFirstInactiveHole(): void {
    this.activePublicationKind = this.firstInactivePublicationKind;
    this.activeHole = this.firstInactiveHole;

    if (this.firstInactiveSuppressedHole == null) {
      return;
    }

    const suppressedIndex = this.suppressedHoles.indexOf(this.firstInactiveSuppressedHole);
    if (suppressedIndex >= 0) {
      this.suppressedHoles.splice(suppressedIndex, 1);
    }
  }

  private createActiveHoleCompanion(
    holeIndex: number,
    hole: InterpolationHoleSegment,
    expr: PropertyLikeDegradedPublication | PropertyLikeFrontierPublication,
  ): InterpolationActiveHoleCompanion {
    const absoluteHoleSpan = this.resolveHoleSpan(hole);
    const boundaryState = this.createHoleBoundaryState(hole);

    if (expr.kind === ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      return new InterpolationActiveHoleCompanion(
        holeIndex,
        absoluteHoleSpan,
        boundaryState,
        expr.frontierKind,
        expr.expectedContinuationClasses,
        expr.matchedDelimiterStack,
        expr.surroundingFrameKind,
        expr.preservedSpan,
        expr.closedSubtreeRefs,
        expr.gapDescriptors,
      );
    }

    return new InterpolationActiveHoleCompanion(
      holeIndex,
      absoluteHoleSpan,
      boundaryState,
      expr.frontierKind,
      expr.expectedContinuationClasses,
      expr.matchedDelimiterStack,
      expr.surroundingFrameKind,
      expr.preservedSpan,
      expr.closedSubtreeRefs,
      [],
    );
  }

  private createMissingHoleCloseCompanion(
    holeIndex: number,
    hole: UnterminatedInterpolationHoleSegment,
    ast: CompletedInputPropertyLikeExpression,
  ): InterpolationActiveHoleCompanion {
    const absoluteHoleSpan = this.resolveHoleSpan(hole);
    const boundaryState = this.createHoleBoundaryState(hole);

    return new InterpolationActiveHoleCompanion(
      holeIndex,
      absoluteHoleSpan,
      boundaryState,
      ExpressionFrontierKind.AwaitingClosingDelimiter,
      [ExpressionExpectedContinuationClass.InterpolationHoleClose],
      [],
      ExpressionCompanionFrameKind.InterpolationHole,
      ast.span,
      [new ClosedSubtreeRef("root-prefix", ast, ast.span)],
      [
        new ExpressionGapDescriptor(
          ExpressionGapKind.MissingClosingDelimiter,
          absoluteHoleSpan,
          ExpressionCompanionFrameKind.InterpolationHole,
          [ExpressionExpectedContinuationClass.InterpolationHoleClose],
        ),
      ],
    );
  }

  private createEmptyHoleCompanion(
    holeIndex: number,
    hole: InterpolationHoleSegment,
  ): InterpolationActiveHoleCompanion {
    const holeSpan = this.resolveHoleSpan(hole);
    const boundaryState = this.createHoleBoundaryState(hole);
    const expectedContinuationClasses = hole.kind === "closed"
      ? [ExpressionExpectedContinuationClass.Expression]
      : [
          ExpressionExpectedContinuationClass.Expression,
          ExpressionExpectedContinuationClass.InterpolationHoleClose,
        ];

    return new InterpolationActiveHoleCompanion(
      holeIndex,
      holeSpan,
      boundaryState,
      ExpressionFrontierKind.AmbiguousClosure,
      expectedContinuationClasses,
      [],
      ExpressionCompanionFrameKind.InterpolationHole,
      boundaryState.openSpan,
      [],
      [],
    );
  }

  private createSuppressedHole(
    holeIndex: number,
    hole: InterpolationHoleSegment,
    publicationKind: InterpolationSuppressedHolePublicationKind,
  ): InterpolationSuppressedHole {
    return new InterpolationSuppressedHole(
      holeIndex,
      this.resolveHoleSpan(hole),
      this.createHoleBoundaryState(hole),
      publicationKind,
    );
  }

  private shouldUseActiveHole(
    hole: InterpolationHoleSegment,
  ): boolean {
    if (this.activeHole !== null) {
      return false;
    }
    return this.activeOffset == null || this.holeContainsOffset(hole, this.activeOffset);
  }

  private holeContainsOffset(
    hole: InterpolationHoleSegment,
    activeOffset: number,
  ): boolean {
    const start = hole.openSpan.start;
    const end = hole.kind === "closed"
      ? hole.closeSpan.end
      : hole.codeSpan.end;
    return start <= activeOffset && activeOffset <= end;
  }

  private interpolationSpan(): SourceSpan {
    return this.baseSpan ? normalizeSpan(this.baseSpan) : sourceSpanFromBounds(0, this.text.length);
  }

  private resolveHoleSpan(
    hole: InterpolationHoleSegment,
  ): SourceSpan {
    return this.resolveTextSpan(hole.codeSpan);
  }

  private createHoleBoundaryState(
    hole: InterpolationHoleSegment,
  ): InterpolationHoleBoundaryState {
    const holeOpenSpan = this.resolveTextSpan(hole.openSpan);
    const holeCloseSpan = hole.kind === "closed"
      ? this.resolveTextSpan(hole.closeSpan)
      : null;
    return new InterpolationHoleBoundaryState(
      hole.kind === "closed"
        ? InterpolationHoleBoundaryKind.Closed
        : InterpolationHoleBoundaryKind.Unterminated,
      holeOpenSpan,
      holeCloseSpan,
    );
  }

  private resolveTextSpan(
    span: TextSpan,
  ): SourceSpan {
    return this.baseSpan ? absoluteTextSpan(span, this.baseSpan) : sourceSpanFromBounds(span.start, span.end);
  }
}
