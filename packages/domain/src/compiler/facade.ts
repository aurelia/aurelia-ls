import path from "node:path";

// Phases
import { lowerDocument } from "./phases/10-lower/lower.js";
import { resolveHost } from "./phases/20-resolve-host/resolve.js";
import { bindScopes } from "./phases/30-bind/bind.js";
import { plan } from "./phases/50-plan/plan.js";
import { emitOverlayFile } from "./phases/60-emit/overlay.js";

// Types
import type { SourceSpan, ExprId, BindingSourceIR, InterpIR, ExprRef } from "./model/ir.js";
import type { VmReflection, OverlayPlanModule } from "./phases/50-plan/types.js";

// Parsers
import { getAureliaParsers } from "../parsers/aurelia.js";
import type {
  IAttributeParser,
  IExpressionParser,
  BuildIrOptions,
} from "./phases/10-lower/lower.js";

import { DEFAULT as SEM_DEFAULT } from "./language/registry.js";

/* =======================================================================================
 * Public façade
 * ======================================================================================= */

export interface CompileOptions {
  html: string;
  templateFilePath: string;
  isJs: boolean;
  vm: VmReflection;
  attrParser?: IAttributeParser;
  exprParser?: IExpressionParser;
  overlayBaseName?: string;
}

export interface CompileOverlayResult {
  overlayPath: string;
  text: string;
  calls: Array<{ exprId: ExprId; overlayStart: number; overlayEnd: number; htmlSpan: SourceSpan }>;
}

export function compileTemplateToOverlay(opts: CompileOptions): CompileOverlayResult {
  const parsers = (opts.attrParser && opts.exprParser)
    ? { attrParser: opts.attrParser, exprParser: opts.exprParser }
    : getAureliaParsers();

  // 1) HTML → IR
  const ir = lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser: parsers.attrParser,
    exprParser: parsers.exprParser,
  } as BuildIrOptions); // lowerer reads both contracts.

  // 2) IR → Linked
  const linked = resolveHost(ir, SEM_DEFAULT);

  // 3) Linked → ScopeGraph
  const scope = bindScopes(linked);

  // 4) ScopeGraph → Overlay plan
  const planOut: OverlayPlanModule = plan(linked, scope, { isJs: opts.isJs, vm: opts.vm });

  // 5) Plan → overlay text
  const overlayBase = opts.overlayBaseName ?? `${path.basename(opts.templateFilePath, path.extname(opts.templateFilePath))}.__au.ttc.overlay`;
  const overlayPath = path.join(path.dirname(opts.templateFilePath), `${overlayBase}${opts.isJs ? ".js" : ".ts"}`);
  const { text } = emitOverlayFile(planOut, { isJs: !!opts.isJs, filename: overlayBase });

  // 6) Mapping
  const exprSpans = collectExprSpansFromIr(ir);
  const idsInPlanOrder = listExprIdsInPlanEmissionOrder(scope);
  const callRanges = listOverlayCallRanges(text, opts.isJs);

  const count = Math.min(idsInPlanOrder.length, callRanges.length);
  const calls = new Array<{ exprId: ExprId; overlayStart: number; overlayEnd: number; htmlSpan: SourceSpan }>(count);
  for (let i = 0; i < count; i++) {
    const exprId = idsInPlanOrder[i]!;
    const htmlSpan = exprSpans.get(exprId) ?? { start: 0, end: 0, file: opts.templateFilePath };
    const { start: overlayStart, end: overlayEnd } = callRanges[i]!;
    calls[i] = { exprId, overlayStart, overlayEnd, htmlSpan };
  }

  return { overlayPath, text, calls };
}

/* =======================================================================================
 * Mapping helpers
 * ======================================================================================= */

function collectExprSpansFromIr(ir: { templates: any[] }): Map<ExprId, SourceSpan> {
  const out = new Map<ExprId, SourceSpan>();
  const visitSource = (src: BindingSourceIR) => {
    if (isInterp(src)) {
      for (const r of src.exprs) if (!out.has(r.id) && r.loc) out.set(r.id, r.loc);
    } else {
      const r = src as ExprRef;
      if (!out.has(r.id) && r.loc) out.set(r.id, r.loc);
    }
  };
  for (const t of ir.templates) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        switch (ins.type) {
          case "propertyBinding":
          case "attributeBinding":
          case "stylePropertyBinding":
          case "textBinding":
            visitSource(ins.from);
            break;
          case "listenerBinding":
          case "refBinding":
            if (ins.from?.loc) out.set(ins.from.id, ins.from.loc);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) {
              if (p.type === "iteratorBinding") {
                // header id recorded via ForOfIR.astId (mapped elsewhere)
              } else if (p.type === "propertyBinding") {
                visitSource(p.from);
              }
            }
            if (ins.branch?.kind === "case") {
              if (ins.branch.expr.loc) out.set(ins.branch.expr.id, ins.branch.expr.loc);
            }
            break;
          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from);
            break;
          default:
            break;
        }
      }
    }
  }
  return out;

  function isInterp(x: BindingSourceIR): x is InterpIR {
    return (x as InterpIR).kind === "interp";
  }
}

function listExprIdsInPlanEmissionOrder(scope: any): ExprId[] {
  const st = scope.templates?.[0];
  if (!st) return [];
  const out: ExprId[] = [];
  const seen = new Set<string>();
  for (const frame of st.frames as any[]) {
    for (const [idStr, fid] of Object.entries(st.exprToFrame as Record<string, number>)) {
      if (fid !== frame.id) continue;
      if (seen.has(idStr)) continue;
      seen.add(idStr);
      out.push(idStr as ExprId);
    }
  }
  return out;
}

function listOverlayCallRanges(text: string, _isJs: boolean): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let idx = 0;
  while (idx < text.length) {
    const pos = text.indexOf("__au$access", idx);
    if (pos < 0) break;
    let open = text.indexOf("(", pos);
    if (open < 0) break;
    const close = text.indexOf(")", open);
    if (close < 0) break;
    ranges.push({ start: open + 1, end: close });
    idx = close + 1;
  }
  return ranges;
}
