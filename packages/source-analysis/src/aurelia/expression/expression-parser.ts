import {
  CustomExpression,
} from "./ast.js";
import {
  normalizeSpan,
  sourceSpanFromBounds,
  type SourceSpan,
} from "../source-address.js";
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
  NoExpressionParse,
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
import {
  ExpressionParseRequest,
  ExpressionParseSelectionKind,
  NoParseSelection,
  SelectedExpressionEntryFamily,
} from "./parse-selection.js";
import type { ExpressionParseSelection } from "./parse-selection.js";

/**
 * Public expression parser facade.
 *
 * Responsibilities:
 * - expose direct family parse methods for callers that already know ownership
 * - expose caller-level ownership/arbitration entry points when parsing should
 *   be selected, declined, or transferred explicitly
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
 * TODO: If caller-level entry arbitration grows beyond today's default
 * `IsProperty` fallback plus explicit selection lane, split that concern into
 * a dedicated selector object beside this facade instead of letting `parse(...)`
 * / `parseSelected(...)` accumulate ownership policy forever.
 */
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
    return this.publishSelected(
      expression,
      new SelectedExpressionEntryFamily(expressionType),
      baseSpan,
    );
  }

  parseSelected(
    expression: string,
    selection: ExpressionParseSelection,
    context?: ExpressionParseContext,
  ): ExpressionParseResult {
    const baseSpan = ExpressionParseSupport.resolveBaseSpan(expression, context);
    return this.publishSelected(expression, selection, baseSpan);
  }

  parseRequest(
    request: ExpressionParseRequest,
  ): ExpressionParseResult {
    return this.parseSelected(
      request.expression,
      request.selection,
      request.context,
    );
  }

  parsePropertyLike(
    expression: string,
    entryFamily?: PropertyLikeEntryFamily | ExpressionParseContext,
    maybeContext?: ExpressionParseContext,
  ): PropertyLikeParseResult {
    const resolvedEntryFamily = typeof entryFamily === "string"
      ? entryFamily
      : "IsProperty";
    const context = typeof entryFamily === "string"
      ? maybeContext
      : entryFamily;
    const baseSpan = ExpressionParseSupport.resolveBaseSpan(expression, context);
    return this.runPropertyLike(expression, resolvedEntryFamily, baseSpan);
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
    return this.runInterpolation(expression, baseSpan);
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
  ): InterpolationParseResult {
    // TODO: Interpolation currently reuses the property-like parser via a
    // callback boundary. If later family-specific provenance or recovery
    // policy needs more than hole-local delegation, promote this bridge into a
    // dedicated interpolation-expression runner rather than threading more
    // orchestration through the callback shape.
    return InterpolationParser.parse(
      expression,
      (segment, baseOffset, segmentBase) => {
        const effectiveBase = segmentBase ?? sourceSpanFromBounds(baseOffset, baseOffset + segment.length);
        const parser = new CompletedInputParser(segment, effectiveBase);
        return parser.parsePropertyLike("IsProperty");
      },
      baseSpan,
    );
  }

  private runCustom(
    expression: string,
    baseSpan: SourceSpan | null,
    secondaryGrammarOwner: string | null = null,
  ): CustomParseResult {
    const span = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, expression.length);
    // `IsCustom` stays parser-owned and opaque when the selection explicitly
    // chooses that lane. The non-owning transfer case now lives in the
    // selection path above through `NoParseSelection`.
    return new OpaqueSuccess(
      span,
      new CustomExpression(span, expression),
      secondaryGrammarOwner,
    );
  }

  private publishSelected(
    expression: string,
    selection: ExpressionParseSelection,
    baseSpan: SourceSpan | null,
  ): ExpressionParseResult {
    switch (selection.kind) {
      case ExpressionParseSelectionKind.NoParse:
        return this.publishNoParse(selection, baseSpan);
      case ExpressionParseSelectionKind.SelectedEntryFamily:
        return this.publishSelectedEntryFamily(expression, selection, baseSpan);
      default:
        return this.createUnknownSelectionError(expression, baseSpan);
    }
  }

  private publishNoParse(
    selection: NoParseSelection,
    baseSpan: SourceSpan | null,
  ): NoExpressionParse {
    return new NoExpressionParse(
      selection.entryFamily,
      baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, 0),
      selection.reason,
      selection.secondaryGrammarOwner,
    );
  }

  private publishSelectedEntryFamily(
    expression: string,
    selection: SelectedExpressionEntryFamily,
    baseSpan: SourceSpan | null,
  ): ExpressionParseResult {
    switch (selection.entryFamily) {
      case "IsProperty":
      case "IsFunction":
        return this.runPropertyLike(expression, selection.entryFamily, baseSpan);
      case "IsIterator":
        return this.runIterator(expression, baseSpan);
      case "Interpolation":
        return this.runInterpolation(expression, baseSpan);
      case "IsCustom":
        return this.runCustom(expression, baseSpan, selection.secondaryGrammarOwner);
      default:
        return this.createUnknownEntryError(expression, selection.entryFamily, baseSpan);
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

  private createUnknownSelectionError(
    expression: string,
    baseSpan: SourceSpan | null,
  ): CompleteInputParseError {
    const span = baseSpan ? normalizeSpan(baseSpan) : sourceSpanFromBounds(0, expression.length);
    // TODO: If JS callers start handing arbitrary selection shapes into the
    // parser, give invalid selection requests their own result/diagnostic lane
    // instead of compressing them into a property parse error.
    return new CompleteInputParseError(
      "IsProperty",
      span,
      "Unknown parse selection",
      expression,
    );
  }
}
