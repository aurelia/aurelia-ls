import {
  Interpolation,
} from "./ast.js";
import {
  absoluteSpan,
  normalizeSpan,
  sourceSpanFromBounds,
  spanFromBounds,
  type SourceSpan,
  type TextSpan,
} from "./source-span.js";
import {
  ClosedSubtreeRef,
  CompleteInputParseError,
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
}

interface UnterminatedInterpolationHoleSegment {
  readonly kind: "unterminated";
  readonly openSpan: TextSpan;
  readonly codeSpan: TextSpan;
  readonly code: string;
}

type InterpolationHoleSegment =
  | ClosedInterpolationHoleSegment
  | UnterminatedInterpolationHoleSegment;

interface InterpolationSegments {
  readonly parts: readonly string[];
  readonly holes: readonly InterpolationHoleSegment[];
}

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
  ): InterpolationParseResult {
    const split = this.extractSegments(text);
    if (!split) {
      const span = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, text.length);
      return new InterpolationAbsent(span, text);
    }

    const expressions: CompletedInputPropertyLikeExpression[] = [];
    const closedHoles: InterpolationClosedHole[] = [];
    const suppressedHoles: InterpolationSuppressedHole[] = [];
    let activePublicationKind:
      | ExpressionParseResultKind.InterpolationDegradedPublication
      | ExpressionParseResultKind.InterpolationFrontierPublication
      | null = null;
    let activeHole: InterpolationActiveHoleCompanion | null = null;
    for (const [index, hole] of split.holes.entries()) {
      if (hole.kind === "unterminated" && hole.code.length === 0) {
        if (activeHole === null) {
          activePublicationKind = ExpressionParseResultKind.InterpolationFrontierPublication;
          activeHole = this.createEmptyUnterminatedHoleCompanion(index, hole, text, baseSpan);
        } else {
          suppressedHoles.push(
            this.createSuppressedHole(
              index,
              hole,
              InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
              baseSpan,
            ),
          );
        }
        continue;
      }

      const exprBase = baseSpan ? absoluteSpan(hole.codeSpan, baseSpan) : null;
      const expr = parseExpression(hole.code, hole.codeSpan.start, exprBase);
      if (expr.kind === ExpressionParseResultKind.CompleteInputParseError) {
        if (activeHole === null) {
          return expr;
        }

        suppressedHoles.push(
          this.createSuppressedHole(
            index,
            hole,
            InterpolationSuppressedHolePublicationKind.HardErrorSuppressed,
            baseSpan,
          ),
        );
        continue;
      }

      if (hole.kind === "unterminated") {
        if (
          expr.kind === ExpressionParseResultKind.PropertyLikeDegradedPublication
        ) {
          if (activeHole === null) {
            activePublicationKind = ExpressionParseResultKind.InterpolationDegradedPublication;
            activeHole = this.createActiveHoleCompanion(index, hole, expr, baseSpan);
          } else {
            suppressedHoles.push(
              this.createSuppressedHole(
                index,
                hole,
                InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
                baseSpan,
              ),
            );
          }
          continue;
        }

        if (
          expr.kind === ExpressionParseResultKind.PropertyLikeFrontierPublication
        ) {
          if (activeHole === null) {
            activePublicationKind = ExpressionParseResultKind.InterpolationFrontierPublication;
            activeHole = this.createActiveHoleCompanion(index, hole, expr, baseSpan);
          } else {
            suppressedHoles.push(
              this.createSuppressedHole(
                index,
                hole,
                InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
                baseSpan,
              ),
            );
          }
          continue;
        }

        if (activeHole === null) {
          activePublicationKind = ExpressionParseResultKind.InterpolationDegradedPublication;
          activeHole = this.createMissingHoleCloseCompanion(index, hole, expr.ast, baseSpan);
        } else {
          suppressedHoles.push(
            this.createSuppressedHole(
              index,
              hole,
              InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
              baseSpan,
            ),
          );
        }
        continue;
      }

      if (
        expr.kind === ExpressionParseResultKind.PropertyLikeDegradedPublication
      ) {
        if (activeHole === null) {
          activePublicationKind = ExpressionParseResultKind.InterpolationDegradedPublication;
          activeHole = this.createActiveHoleCompanion(index, hole, expr, baseSpan);
        } else {
          suppressedHoles.push(
            this.createSuppressedHole(
              index,
              hole,
              InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
              baseSpan,
            ),
          );
        }
        continue;
      }
      if (
        expr.kind === ExpressionParseResultKind.PropertyLikeFrontierPublication
      ) {
        if (activeHole === null) {
          activePublicationKind = ExpressionParseResultKind.InterpolationFrontierPublication;
          activeHole = this.createActiveHoleCompanion(index, hole, expr, baseSpan);
        } else {
          suppressedHoles.push(
            this.createSuppressedHole(
              index,
              hole,
              InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
              baseSpan,
            ),
          );
        }
        continue;
      }
      expressions.push(expr.ast);
      closedHoles.push(new InterpolationClosedHole(index, expr.ast.span, expr.ast));
    }

    const span = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, text.length);
    if (activeHole !== null) {
      if (activePublicationKind === ExpressionParseResultKind.InterpolationFrontierPublication) {
        return new InterpolationFrontierPublication(
          span,
          [...split.parts],
          [...closedHoles],
          activeHole,
          [...suppressedHoles],
        );
      }

      return new InterpolationDegradedPublication(
        span,
        [...split.parts],
        [...closedHoles],
        activeHole,
        [...suppressedHoles],
      );
    }

    return new InterpolationSuccess(
      span,
      new Interpolation(span, [...split.parts], expressions),
    );
  }

  private static createActiveHoleCompanion(
    holeIndex: number,
    hole: InterpolationHoleSegment,
    expr: PropertyLikeDegradedPublication | PropertyLikeFrontierPublication,
    baseSpan: SourceSpan | null,
  ): InterpolationActiveHoleCompanion {
    const fallbackSpan = baseSpan ? normalizeSpan(baseSpan) : hole.codeSpan;
    const absoluteHoleSpan = this.resolveHoleSpan(hole, baseSpan, fallbackSpan);
    const boundaryState = this.createHoleBoundaryState(hole, baseSpan, fallbackSpan);

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

  private static createMissingHoleCloseCompanion(
    holeIndex: number,
    hole: UnterminatedInterpolationHoleSegment,
    ast: CompletedInputPropertyLikeExpression,
    baseSpan: SourceSpan | null,
  ): InterpolationActiveHoleCompanion {
    const fallbackSpan = baseSpan ? normalizeSpan(baseSpan) : hole.codeSpan;
    const absoluteHoleSpan = this.resolveHoleSpan(hole, baseSpan, fallbackSpan);
    const boundaryState = this.createHoleBoundaryState(hole, baseSpan, fallbackSpan);

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

  private static createEmptyUnterminatedHoleCompanion(
    holeIndex: number,
    hole: UnterminatedInterpolationHoleSegment,
    text: string,
    baseSpan: SourceSpan | null,
  ): InterpolationActiveHoleCompanion {
    const interpolationSpan = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, text.length);
    const holeSpan = this.resolveHoleSpan(hole, baseSpan, interpolationSpan);
    const boundaryState = this.createHoleBoundaryState(hole, baseSpan, interpolationSpan);

    return new InterpolationActiveHoleCompanion(
      holeIndex,
      holeSpan,
      boundaryState,
      ExpressionFrontierKind.AmbiguousClosure,
      [
        ExpressionExpectedContinuationClass.Expression,
        ExpressionExpectedContinuationClass.InterpolationHoleClose,
      ],
      [],
      ExpressionCompanionFrameKind.InterpolationHole,
      boundaryState.openSpan,
      [],
      [],
    );
  }

  private static createSuppressedHole(
    holeIndex: number,
    hole: InterpolationHoleSegment,
    publicationKind: InterpolationSuppressedHolePublicationKind,
    baseSpan: SourceSpan | null,
  ): InterpolationSuppressedHole {
    const fallbackSpan = baseSpan ? normalizeSpan(baseSpan) : hole.codeSpan;
    return new InterpolationSuppressedHole(
      holeIndex,
      this.resolveHoleSpan(hole, baseSpan, fallbackSpan),
      this.createHoleBoundaryState(hole, baseSpan, fallbackSpan),
      publicationKind,
    );
  }

  private static extractSegments(text: string): InterpolationSegments | null {
    return this.splitText(text);
  }

  private static resolveHoleSpan(
    hole: InterpolationHoleSegment,
    baseSpan: SourceSpan | null,
    fallbackSpan: SourceSpan,
  ): SourceSpan {
    return baseSpan ? absoluteSpan(hole.codeSpan, baseSpan) ?? fallbackSpan : hole.codeSpan;
  }

  private static createHoleBoundaryState(
    hole: InterpolationHoleSegment,
    baseSpan: SourceSpan | null,
    fallbackSpan: SourceSpan,
  ): InterpolationHoleBoundaryState {
    const holeOpenSpan = baseSpan ? absoluteSpan(hole.openSpan, baseSpan) ?? fallbackSpan : hole.openSpan;
    const holeCloseSpan = hole.kind === "closed"
      ? (baseSpan ? absoluteSpan(hole.closeSpan, baseSpan) ?? fallbackSpan : hole.closeSpan)
      : null;
    return new InterpolationHoleBoundaryState(
      hole.kind === "closed"
        ? InterpolationHoleBoundaryKind.Closed
        : InterpolationHoleBoundaryKind.Unterminated,
      holeOpenSpan,
      holeCloseSpan,
    );
  }

  private static splitText(text: string): InterpolationSegments | null {
    let index = 0;
    let depth = 0;
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
        depth = 1;

        const exprStart = index;
        let innerStringQuote: '"' | "'" | "`" | null = null;

        while (index < text.length) {
          const current = text[index];

          if (innerStringQuote) {
            if (current === "\\") {
              index += 2;
              continue;
            }
            if (current === innerStringQuote) {
              innerStringQuote = null;
              index++;
              continue;
            }
            index++;
            continue;
          }

          if (current === '"' || current === "'" || current === "`") {
            innerStringQuote = current;
            index++;
            continue;
          }

          if (current === "{") {
            depth++;
            index++;
            continue;
          }

          if (current === "}" && --depth === 0) {
            holes.push({
              kind: "closed",
              openSpan: spanFromBounds(holeOpenStart, holeOpenStart + 2),
              codeSpan: spanFromBounds(exprStart, index),
              closeSpan: spanFromBounds(index, index + 1),
              code: text.slice(exprStart, index),
            });
            index++;
            partStart = index;
            break;
          }

          index++;
        }

        if (depth !== 0) {
          holes.push({
            kind: "unterminated",
            openSpan: spanFromBounds(holeOpenStart, holeOpenStart + 2),
            codeSpan: spanFromBounds(exprStart, text.length),
            code: text.slice(exprStart),
          });
          return { parts, holes };
        }

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
