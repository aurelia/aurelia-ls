import type { SourceFileRef } from "../refs.js";

import {
  normalizeSpan,
  ensureSpanFile,
  sourceSpanFromBounds,
} from "./ast.js";
import type {
  SourceSpan,
} from "./ast.js";

export interface ExpressionParseContext {
  readonly baseSpan?: SourceSpan;
  readonly baseOffset?: number;
  readonly file?: SourceFileRef;
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
}
