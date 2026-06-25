/**
 * Inlay hints for Aurelia templates.
 *
 * Shows resolved binding modes inline — e.g., `.bind` resolves to `toView`
 * based on the target bindable's declared mode. This surfaces knowledge the
 * system has (how `.bind` resolves for each specific bindable) that the
 * developer would otherwise need to look up manually.
 *
 * Only shows hints where the resolution is non-obvious:
 * - `.bind` → shows the resolved mode (toView, twoWay, etc.)
 * - `.two-way`, `.to-view`, `.from-view`, `.one-time` → no hint (mode is explicit)
 * - `effectiveMode === 'default'` → no hint (unresolved, nothing useful to show)
 */
import {
  InlayHint,
  InlayHintKind,
  type InlayHintParams,
} from "vscode-languageserver/node.js";
import type {
  SemanticTemplateInlayHintRow,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";

export async function handleInlayHints(
  ctx: ServerContext,
  params: InlayHintParams,
): Promise<InlayHint[] | null> {
  try {
    const uri = params.textDocument.uri;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;

    const answer = await ctx.semanticRuntime.templateInlayHints(doc);
    const hints = answer.value.rows
      .map((row) => mapSemanticRuntimeTemplateInlayHint(row, doc, params))
      .filter((hint): hint is InlayHint => hint != null);

    return hints.length > 0 ? hints : null;
  } catch (e) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[inlayHints] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
}

function mapSemanticRuntimeTemplateInlayHint(
  row: SemanticTemplateInlayHintRow,
  doc: { readonly getText: () => string; readonly positionAt: (offset: number) => { line: number; character: number } },
  params: InlayHintParams,
): InlayHint | null {
  if (row.source?.start == null || row.source.end == null) {
    return null;
  }
  const length = doc.getText().length;
  const offset = Math.max(0, Math.min(row.source.end, length));
  const position = doc.positionAt(offset);
  if (position.line < params.range.start.line || position.line > params.range.end.line) {
    return null;
  }
  return {
    position,
    label: `: ${row.effectiveModeLabel}`,
    kind: InlayHintKind.Type,
    paddingLeft: false,
    paddingRight: true,
  };
}
