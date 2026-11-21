import {
  DecodedExpressionSpan,
  ensureSpanFile,
  normalizeSpan,
  sourceSpanFromBounds,
  type SourceFileRef,
  type SourceSpan,
} from "./source-span.js";

export interface ExpressionParseContext {
  readonly baseSpan?: SourceSpan;
  readonly decodedOffsets?: readonly number[];
  readonly baseOffset?: number;
  readonly file?: SourceFileRef;
  /**
   * Absolute source offset that should own cursor/frontier publication when a parser family can expose more than one
   * incomplete region. This is inquiry pressure only; completed AST truth is unchanged.
   */
  readonly activeOffset?: number;
}

export class ExpressionParseSupport {
  static resolveBaseSpan(source: string, context?: ExpressionParseContext): SourceSpan | null {
    if (!context) {
      return null;
    }

    const hasContext = context.baseSpan != null || context.baseOffset != null || context.file != null;
    if (!hasContext) {
      return null;
    }

    const start = context.baseSpan?.start ?? context.baseOffset ?? 0;
    const end = context.baseSpan?.end ?? start + source.length;
    const file = context.baseSpan?.file ?? context.file ?? null;
    if (context.decodedOffsets?.length === source.length + 1) {
      return new DecodedExpressionSpan(source, context.decodedOffsets, file);
    }
    const candidate = context.baseSpan ?? sourceSpanFromBounds(start, end, file);
    const normalized = normalizeSpan(candidate);
    return ensureSpanFile(normalized, file) ?? normalized;
  }

  static resolveLocalActiveOffset(
    baseSpan: SourceSpan | null,
    context?: ExpressionParseContext,
  ): number | null {
    const offset = context?.activeOffset;
    if (offset == null) {
      return null;
    }
    if (baseSpan == null) {
      return offset;
    }
    if (offset < baseSpan.start || offset > baseSpan.end) return offset;
    return baseSpan instanceof DecodedExpressionSpan ? baseSpan.localOffset(offset) : offset - baseSpan.start;
  }
}
