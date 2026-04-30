import {
  ensureSpanFile,
  normalizeSpan,
  sourceSpanFromBounds,
  type SourceFileRef,
  type SourceSpan,
} from "./source-span.js";

export interface ExpressionParseContext {
  readonly baseSpan?: SourceSpan;
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
    const candidate = sourceSpanFromBounds(start, end, file);
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
    return offset >= baseSpan.start && offset <= baseSpan.end
      ? offset - baseSpan.start
      : offset;
  }
}
