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
  InlayHintKind,
  type InlayHint,
  type InlayHintParams,
} from "vscode-languageserver/node";
import type {
  SemanticTemplateInlayHintRow,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import { semanticSourceOffsetRangeForDocument } from "../mapping/source-locations.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

export async function handleInlayHints(
  ctx: ServerContext,
  params: InlayHintParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<InlayHint[] | null> {
  const uri = params.textDocument.uri;
  const doc = ctx.ensureProgramDocument(uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;
  if (!await bindingModeInlayHintsEnabled(ctx, uri)) return null;

  const answer = await ctx.semanticRuntime.templateInlayHints(
    doc,
    guard,
  );
  const hints = answer.value.rows
    .map((row) => mapSemanticRuntimeTemplateInlayHint(row, doc, params))
    .filter((hint): hint is InlayHint => hint != null);

  return hints.length > 0 ? hints : null;
}

async function bindingModeInlayHintsEnabled(ctx: ServerContext, uri: string): Promise<boolean> {
  if (!ctx.clientSupport.configurationPull) return false;
  try {
    const value = await ctx.connection.workspace.getConfiguration({
      scopeUri: uri,
      section: "aurelia.inlayHints.bindingMode",
    }) as unknown;
    return value === true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.logger.warn(`[inlayHints] resource configuration unavailable for ${uri}: ${message}`);
    return false;
  }
}

function mapSemanticRuntimeTemplateInlayHint(
  row: SemanticTemplateInlayHintRow,
  doc: { readonly getText: () => string; readonly positionAt: (offset: number) => { line: number; character: number } },
  params: InlayHintParams,
): InlayHint | null {
  const source = semanticSourceOffsetRangeForDocument(row.source, doc);
  if (source == null) return null;
  const position = doc.positionAt(source.end);
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
