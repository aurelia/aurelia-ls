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
import { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
import type { ServerContext } from "../context.js";

const BINDING_MODE_LABELS: Record<string, string> = {
  toView: "toView",
  twoWay: "twoWay",
  fromView: "fromView",
  oneTime: "oneTime",
};

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

    // Walk linked instructions for property bindings with resolved modes.
    //
    // The mode provenance chain: attribute syntax (pattern + command) →
    // IR mode (authored, may be 'default') → linked effectiveMode (resolved
    // from target bindable, native prop defaults, or two-way defaults).
    //
    // A hint is shown when the system resolved a mode that the developer
    // didn't explicitly author — i.e., when mode !== effectiveMode. This
    // works for all syntax: standard commands (.bind), custom commands,
    // pattern-based shorthand (:value), and any future extensible syntax.
    for (const template of compilation.linked.templates) {
      for (const row of template.rows) {
        for (const instr of row.instructions) {
          if (instr.kind !== "propertyBinding") continue;

          // Skip unresolved default — nothing useful to show
          if (instr.effectiveMode === "default") continue;

          // The core check: if the authored mode already matches the
          // effective mode, the developer's intent is explicit (via an
          // explicit command like .two-way, a custom command with a
          // declared mode, or a pattern override like :value). No hint.
          if (instr.mode === instr.effectiveMode) continue;

          const label = BINDING_MODE_LABELS[instr.effectiveMode];
          if (!label) continue;

          // Position after the attribute name span (e.g., after "value.bind")
          const span = instr.nameLoc ?? instr.loc;
          if (!span || typeof span.end !== "number") continue;

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
