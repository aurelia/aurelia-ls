import {
  CustomExpression,
} from "./ast.js";
import { auLink } from "../kernel/au-link.js";
import {
  normalizeSpan,
  sourceSpanFromBounds,
  type SourceSpan,
} from "./source-span.js";
import type {
  ExpressionType,
} from "./ast.js";

import { CompletedInputParser } from "./completed-input-parser.js";
import {
  ExpressionParseSupport,
  type ExpressionParseContext,
} from "./expression-parse-support.js";
import { InterpolationParser } from "./interpolation-parser.js";
import {
  CompleteInputParseError,
  OpaqueSuccess,
} from "./parse-result-algebra.js";
import type {
  CustomParseResult,
  ExpressionParseResult,
  ExpressionParseResultPublisher,
  InterpolationParseResult,
  IteratorParseResult,
  PropertyLikeEntryFamily,
  PropertyLikeParseResult,
} from "./parse-result-algebra.js";

/**
 * Public expression parser facade.
 *
 * This class is parser machinery, not a kernel materializer. It does not emit
 * products, claims, provenance, or inquiry answers by itself. Callers decide
 * value ownership and then wrap parser publications in kernel-backed products
 * when that publication becomes semantically useful.
 *
 * Responsibilities:
 * - expose direct family parse methods for callers that already know ownership
 * - select the caller-visible entry family
 * - resolve and apply base-span context
 * - dispatch to the strict completed-input parser or interpolation parser
 * - publish the native result algebra directly
 *
 * TODO: The remaining parser-owned follow-on is only the genuinely
 * interpolation-specific scanner residue that still sits outside ordered
 * active/suppressed hole boundaries, if we ever need it. Structured
 * iterator-tail parsing is optional tooling enrichment on top of the current
 * runtime-shaped split point, not mandatory parser debt. Do not add another
 * adapter layer on top of this facade.
 *
 * Non-owning transfer is deliberately not a parser result. Template/compiler
 * callers decide whether this parser owns an authored value before calling it.
 */
@auLink("expression-parser:ExpressionParser")
export class ExpressionParser implements ExpressionParseResultPublisher {
  parse(expression: string, context?: ExpressionParseContext): PropertyLikeParseResult;
  parse(expression: string, expressionType: "IsIterator", context?: ExpressionParseContext): IteratorParseResult;
  parse(expression: string, expressionType: "Interpolation", context?: ExpressionParseContext): InterpolationParseResult;
  parse(
    expression: string,
    expressionType: "IsFunction" | "IsProperty",
    context?: ExpressionParseContext,
  ): PropertyLikeParseResult;
  parse(expression: string, expressionType: "IsCustom", context?: ExpressionParseContext): CustomParseResult;
  parse(expression: string, expressionType: ExpressionType, context?: ExpressionParseContext): ExpressionParseResult;

  parse(
    expression: string,
    expressionTypeOrContext?: ExpressionType | ExpressionParseContext,
    maybeContext?: ExpressionParseContext,
  ): ExpressionParseResult {
    const expressionType = this.resolveEntryFamily(expressionTypeOrContext);
    const context = this.resolveContext(expressionTypeOrContext, maybeContext);
    const baseSpan = ExpressionParseSupport.resolveBaseSpan(expression, context);
    return this.publishEntryFamily(
      expression,
      expressionType,
      baseSpan,
      ExpressionParseSupport.resolveLocalActiveOffset(baseSpan, context),
    );
  }

  parsePropertyLike(
    expression: string,
    entryFamily: PropertyLikeEntryFamily = "IsProperty",
    context?: ExpressionParseContext,
  ): PropertyLikeParseResult {
    const baseSpan = ExpressionParseSupport.resolveBaseSpan(expression, context);
    return this.runPropertyLike(expression, entryFamily, baseSpan);
  }

  parseIterator(
    expression: string,
    context?: ExpressionParseContext,
  ): IteratorParseResult {
    const baseSpan = ExpressionParseSupport.resolveBaseSpan(expression, context);
    return this.runIterator(expression, baseSpan);
  }

  parseInterpolation(
    expression: string,
    context?: ExpressionParseContext,
  ): InterpolationParseResult {
    const baseSpan = ExpressionParseSupport.resolveBaseSpan(expression, context);
    return this.runInterpolation(
      expression,
      baseSpan,
      ExpressionParseSupport.resolveLocalActiveOffset(baseSpan, context),
    );
  }

  parseCustom(
    expression: string,
    context?: ExpressionParseContext,
  ): CustomParseResult {
    const baseSpan = ExpressionParseSupport.resolveBaseSpan(expression, context);
    return this.runCustom(expression, baseSpan);
  }

  private resolveEntryFamily(
    expressionTypeOrContext?: ExpressionType | ExpressionParseContext,
  ): ExpressionType {
    // TODO: Today "missing entry family" means "default to IsProperty". If
    // later callers need a tri-state of explicit family, inferred family, and
    // non-owning/no-parse, move that distinction into the facade contract
    // instead of encoding it indirectly through this helper.
    return typeof expressionTypeOrContext === "string"
      ? expressionTypeOrContext
      : "IsProperty";
  }

  private resolveContext(
    expressionTypeOrContext?: ExpressionType | ExpressionParseContext,
    maybeContext?: ExpressionParseContext,
  ): ExpressionParseContext | undefined {
    return typeof expressionTypeOrContext === "string"
      ? maybeContext
      : expressionTypeOrContext;
  }

  private runPropertyLike(
    expression: string,
    entryFamily: "IsProperty" | "IsFunction",
    baseSpan: SourceSpan | null,
  ): PropertyLikeParseResult {
    const parser = new CompletedInputParser(expression, baseSpan);
    return parser.parsePropertyLike(entryFamily);
  }

  private runIterator(
    expression: string,
    baseSpan: SourceSpan | null,
  ): IteratorParseResult {
    const parser = new CompletedInputParser(expression, baseSpan);
    return parser.parseIteratorHeader();
  }

  private runInterpolation(
    expression: string,
    baseSpan: SourceSpan | null,
    activeOffset: number | null,
  ): InterpolationParseResult {
    // TODO: Interpolation currently reuses the property-like parser via a
    // callback boundary. If later family-specific provenance or recovery
    // policy needs more than hole-local delegation, promote that boundary into
    // a dedicated interpolation-expression runner rather than threading more
    // orchestration through the callback shape.
    return InterpolationParser.parse(
      expression,
      (segment, baseOffset, segmentBase) => {
        const effectiveBase = segmentBase ?? sourceSpanFromBounds(baseOffset, baseOffset + segment.length);
        const parser = new CompletedInputParser(segment, effectiveBase);
        return parser.parsePropertyLike("IsProperty");
      },
      baseSpan,
      activeOffset,
    );
  }

  private runCustom(
    expression: string,
    baseSpan: SourceSpan | null,
  ): CustomParseResult {
    const span = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, expression.length);
    return new OpaqueSuccess(span, new CustomExpression(span, expression));
  }

  private publishEntryFamily(
    expression: string,
    entryFamily: ExpressionType,
    baseSpan: SourceSpan | null,
    activeOffset: number | null,
  ): ExpressionParseResult {
    switch (entryFamily) {
      case "IsProperty":
      case "IsFunction":
        return this.runPropertyLike(expression, entryFamily, baseSpan);
      case "IsIterator":
        return this.runIterator(expression, baseSpan);
      case "Interpolation":
        return this.runInterpolation(expression, baseSpan, activeOffset);
      case "IsCustom":
        return this.runCustom(expression, baseSpan);
      default:
        return this.createUnknownEntryError(expression, entryFamily, baseSpan);
    }
  }

  private createUnknownEntryError(
    expression: string,
    expressionType: string,
    baseSpan: SourceSpan | null,
  ): CompleteInputParseError {
    const span = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, expression.length);
    // TODO: This still compresses "unknown entry family" into a normal parse
    // error on the property lane. If callers later hand arbitrary strings or
    // user-configured family handles into the facade, give entry-family
    // rejection its own result or diagnostic lane instead of pretending the
    // property parser owned the request.
    return new CompleteInputParseError(
      "IsProperty",
      span,
      `Unknown expression type '${String(expressionType)}'`,
      expression,
    );
  }

}
