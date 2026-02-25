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
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";

const BINDING_MODE_LABELS: Record<string, string> = {
  toView: "toView",
  twoWay: "twoWay",
  fromView: "fromView",
  oneTime: "oneTime",
};

/** Commands where the mode is already explicit — no hint needed. */
const EXPLICIT_MODE_COMMANDS = new Set(["two-way", "to-view", "from-view", "one-time"]);

export function handleInlayHints(
  ctx: ServerContext,
  params: InlayHintParams,
): InlayHint[] | null {
  try {
    const uri = params.textDocument.uri;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;

    const canonical = canonicalDocumentUri(uri);
    const compilation = ctx.workspace.getCompilation(canonical.uri);
    if (!compilation) return null;

    const hints: InlayHint[] = [];

    // Walk linked instructions for property bindings with resolved modes
    for (const template of compilation.linked.templates) {
      for (const row of template.rows) {
        for (const instr of row.instructions) {
          if (instr.kind !== "propertyBinding") continue;

          // Skip explicit mode commands — the developer already wrote the intent
          if (instr.command && EXPLICIT_MODE_COMMANDS.has(instr.command)) continue;

          // Skip unresolved default — nothing useful to show
          if (instr.effectiveMode === "default") continue;

          // Skip when authored mode matches effective mode — no new information
          if (instr.mode === instr.effectiveMode) continue;

          // Only show for `.bind` (and bare attribute bindings that default)
          const label = BINDING_MODE_LABELS[instr.effectiveMode];
          if (!label) continue;

          // Position the hint after the attribute name (e.g., after "value.bind")
          const span = instr.nameLoc ?? instr.loc;
          if (!span || typeof span.end !== "number") continue;

          // Convert byte offset to LSP position
          const pos = doc.positionAt(span.end);

          // Only include hints within the requested range
          if (pos.line < params.range.start.line || pos.line > params.range.end.line) continue;

          hints.push({
            position: pos,
            label: `: ${label}`,
            kind: InlayHintKind.Type,
            paddingLeft: false,
            paddingRight: true,
          });
        }
      }
    }

    return hints.length > 0 ? hints : null;
  } catch (e) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[inlayHints] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
}
