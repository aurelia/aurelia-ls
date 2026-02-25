/* =============================================================================
 * PHASE 50 - PLAN (Overlay planning for TTC)
 * Linked+Scoped → OverlayPlanModule (pure)
 * - Build per-frame overlay type expressions
 * - Collect **one** validation lambda per authored expression in that frame
 * - Frame-aware type environments (Env) with inheritance + shadowing
 * - Env-aware expression → type inference (incl. ReturnType<> for calls)
 * - $parent typed as the parent frame alias
 * - Emit visible identifier surface for every frame (outer locals included)
 * ============================================================================= */

import type { OverlayPlanModule, TemplateOverlayPlan, FrameOverlayPlan, OverlayLambdaPlan, OverlayLambdaSegment } from "./types.js";
import type { VmReflection, SynthesisOptions } from "../../shared/index.js";
import { NOOP_TRACE, debug } from "../../shared/index.js";

/* eslint-disable @typescript-eslint/no-unused-vars */

// Model imports
import { offsetSpan, spanFromBounds } from "../../model/span.js";
import type { ScopeModule, ScopeTemplate, ScopeFrame, FrameId } from "../../model/symbols.js";
import type { ReadonlyExprIdMap } from "../../model/identity.js";
import type { ExprId, IsBindingBehavior, ExprTableEntry } from "../../model/ir.js";

// Analysis imports (via barrel)
import type { LinkModule, LinkedInstruction } from "../../analysis/index.js";
import { buildFrameAnalysis, wrap, type FrameTypingHints, type Env } from "../../analysis/index.js";

// Shared imports
import { indexExprTable } from "../../shared/expr-utils.js";

// Local imports
import { emitPrintedExpression } from "./mapped-emitter.js";

function assertUnreachable(x: never): never { throw new Error("unreachable"); }

/* ===================================================================================== */
/* Public API                                                                             */
/* ===================================================================================== */

export function plan(linked: LinkModule, scope: ScopeModule, opts: SynthesisOptions): OverlayPlanModule {
  const trace = opts.trace ?? NOOP_TRACE;

  return trace.span("overlay.plan", () => {
    trace.setAttributes({
      "overlay.plan.templateCount": scope.templates.length,
    });

    debug.overlay("plan.start", {
      templateCount: scope.templates.length,
    });

    const exprIndex = indexExprTable(linked.exprTable as readonly ExprTableEntry[] | undefined);
    const templates: TemplateOverlayPlan[] = [];

    /**
     * IMPORTANT:
     * - Bind already models nested template expressions inside the **first (root) template**.
     * - So we only analyze/emit for the root scope template.
     */
    const roots: ScopeTemplate[] = scope.templates.length > 0 ? [scope.templates[0]!] : [];
    for (let ti = 0; ti < roots.length; ti++) {
      const st = roots[ti]!;
      trace.event("overlay.plan.template", { index: ti, frameCount: st.frames.length });
      templates.push(analyzeTemplate(linked, st, exprIndex, ti, opts));
    }

    // Count total frames and lambdas
    let totalFrames = 0;
    let totalLambdas = 0;
    for (const t of templates) {
      totalFrames += t.frames.length;
      for (const f of t.frames) {
        totalLambdas += f.lambdas.length;
      }
    }

    trace.setAttributes({
      "overlay.plan.frameCount": totalFrames,
      "overlay.plan.lambdaCount": totalLambdas,
    });

    debug.overlay("plan.complete", {
      templateCount: templates.length,
      frameCount: totalFrames,
      lambdaCount: totalLambdas,
    });

    return { templates };
  });
}

/* ===================================================================================== */
/* Per-template analysis                                                                  */
/* ===================================================================================== */

function analyzeTemplate(
  linked: LinkModule,
  st: ScopeTemplate,
  exprIndex: ReadonlyExprIdMap<ExprTableEntry>,
  templateIndex: number,
  opts: SynthesisOptions,
): TemplateOverlayPlan {
  const frames: FrameOverlayPlan[] = [];
  // Prefer a collision-safe, qualified VM expr if the adapter provides it.
  const vm = opts.vm;
  const prefix = (opts.syntheticPrefix ?? vm.getSyntheticPrefix?.()) || "__AU_TTC_";
  const vmType = buildVmTypeInfo(vm, prefix);
  const rootTypeRef = vmType.alias;

  debug.overlay("plan.template", {
    name: st.name,
    templateIndex,
    frameCount: st.frames.length,
  });

  // Stable per-frame alias names up front (root-first order already)
  const typeAliasByFrame = new Map<FrameId, string>();
  for (const f of st.frames) typeAliasByFrame.set(f.id, `${prefix}T${templateIndex}_F${f.id}`);

  // Build envs + typing hints for all frames
  const analysis = buildFrameAnalysis(st, exprIndex, rootTypeRef);
  const listenerEventTypes = collectListenerEventTypes(linked);

  // Emit overlays
  const typeExprByFrame = new Map<FrameId, string>();
  for (const f of st.frames) {
    const typeName = `${prefix}T${templateIndex}_F${f.id}`;
    const parentExpr = f.parent != null ? typeExprByFrame.get(f.parent) : undefined;
    const typeExpr = buildFrameTypeExpr(f, rootTypeRef, analysis.hints.get(f.id), analysis.envs, parentExpr);
    typeExprByFrame.set(f.id, typeExpr);
    const lambdas = collectOneLambdaPerExpression(st, f.id, exprIndex, listenerEventTypes);
    frames.push({ frame: f.id, typeName, typeExpr, lambdas, ...(f.origin ? { origin: f.origin } : {}) });
  }

  return { name: st.name!, vmType, frames };
}

/* ===================================================================================== */
/* Frame type assembly                                                                    */
/* ===================================================================================== */

function buildFrameTypeExpr(
  frame: ScopeFrame,
  rootVm: string,
  hints: FrameTypingHints | undefined,
  envs: Map<FrameId, Env>,
  parentTypeExpr?: string,
): string {
  // Locals in this frame (already include shadowed parent names)
  const env = envs.get(frame.id);
  const localEntries = env ? [...env.entries()].filter(([k]) => k !== "$this" && k !== "$parent" && k !== "$vm") : [];
  const localKeysUnion = localEntries.length > 0 ? localEntries.map(([k]) => `'${escapeKey(k)}'`).join(" | ") : "never";
  const localsType = localEntries.length > 0 ? `{ ${localEntries.map(([n, t]) => `${safeProp(n)}: ${t}`).join("; ")} }` : "{}";

  // Overlay object (value overlay) if present
  const overlayObj = frame.overlay?.kind === "value" && hints?.overlayBase ? hints.overlayBase : null;

  // Use parent frame context as the base when available so nested controllers inherit overlay scope.
  const baseContext = parentTypeExpr ? stripHelpers(parentTypeExpr) : rootVm;

  // Base after overlay shadow:  Omit<Base, keyof Overlay>
  const baseAfterOverlay = overlayObj != null ? `Omit<${wrap(baseContext)}, keyof ${wrap(overlayObj)}>` : wrap(baseContext);

  // Base after overlay & locals shadow:  Omit<Base', 'k1'|'k2'|...>
  const baseAfterAll = localEntries.length > 0 ? `Omit<${wrap(baseAfterOverlay)}, ${localKeysUnion}>` : baseAfterOverlay;

  // Overlay reduced by locals: Omit<Overlay, 'k1'|'k2'|...>
  const overlayAfterLocals = overlayObj != null ? (localEntries.length > 0 ? `Omit<${wrap(overlayObj)}, ${localKeysUnion}>` : wrap(overlayObj)) : "{}";

  // $parent & $vm segments
  const parentSeg = parentTypeExpr ? `{ $parent: ${parentTypeExpr} }` : `{ $parent: unknown }`;
  const vmSeg = `{ $vm: ${wrap(rootVm)} }`;
  const thisSeg = overlayObj != null ? `{ $this: ${wrap(overlayObj)} }` : "{}";

  // Final frame type:
  //   Omit<Base, keyof Overlay | LocalKeys> & Omit<Overlay, LocalKeys> & Locals & { $parent: ... } & { $vm: VM } & { $this?: Overlay }
  return [
    wrap(baseAfterAll),
    wrap(overlayAfterLocals),
    wrap(localsType),
    wrap(parentSeg),
    wrap(vmSeg),
    wrap(thisSeg),
  ].join(" & ");
}

function safeProp(n: string): string {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(n) ? n : JSON.stringify(n);
}

function escapeKey(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function stripHelpers(typeExpr: string): string {
  const helperKeys = "'$parent' | '$vm' | '$this'";
  return `Omit<${wrap(typeExpr)}, ${helperKeys}>`;
}

/* ===================================================================================== */
/* Lambdas: **one per authored expression**                                               */
/* ===================================================================================== */

function collectOneLambdaPerExpression(
  st: ScopeTemplate,
  frameId: FrameId,
  exprIndex: ReadonlyExprIdMap<ExprTableEntry>,
  listenerEventTypes: ReadonlyMap<ExprId, string>,
): OverlayLambdaPlan[] {
  const out: OverlayLambdaPlan[] = [];
  const seen = new Set<ExprId>();

  for (const [id, fid] of st.exprToFrame.entries()) {
    if (fid !== frameId) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = exprIndex.get(id);
    if (!entry) continue;

    switch (entry.expressionType) {
      case "IsIterator":
        // TODO: extract iterable expression and create overlay lambda.
        // Currently skipped — needs careful span alignment between
        // ForOfStatement header span and iterable-only overlay.
        break;

      case "IsProperty":
      case "IsFunction": {
        const expr = renderExpressionFromAst(entry.ast);
        if (expr) {
          const lambda = `o => ${expr.code}`;
          const exprStart = lambda.length - expr.code.length;
          const exprSpan = spanFromBounds(exprStart, exprStart + expr.code.length);
          const segments = shiftSegments(expr.segments, exprStart);
          const eventType = listenerEventTypes.get(id);
          out.push(eventType
            ? { exprId: id, lambda, exprSpan, eventType, segments }
            : { exprId: id, lambda, exprSpan, segments });
        }
        break;
      }

      default:
        break;
    }
  }

  return out;
}

/* ===================================================================================== */
/* Expression rendering                                                           */

type PrintedExpression = { code: string; segments: readonly OverlayLambdaSegment[]; path?: string };

function renderExpressionFromAst(ast: IsBindingBehavior): PrintedExpression | null {
  const emitted = emitPrintedExpression(ast);
  return emitted ? { ...emitted } : null;
}

function collectListenerEventTypes(linked: LinkModule): Map<ExprId, string> {
  const out = new Map<ExprId, string>();
  for (const template of linked.templates ?? []) {
    for (const row of template.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        collectListenerEventTypeFromInstruction(ins, out);
      }
    }
  }
  return out;
}

function collectListenerEventTypeFromInstruction(
  ins: LinkedInstruction,
  out: Map<ExprId, string>,
): void {
  if (ins.kind !== "listenerBinding") return;
  if (!out.has(ins.from.id)) {
    out.set(ins.from.id, normalizeListenerEventType(ins.eventType));
  }
}

function normalizeListenerEventType(eventType: unknown): string {
  if (!eventType || typeof eventType !== "object") return "any";
  const kind = (eventType as { kind?: unknown }).kind;
  switch (kind) {
    case "ts": {
      const name = (eventType as { name?: unknown }).name;
      return typeof name === "string" && name.length > 0 ? name : "any";
    }
    case "any":
    case "unknown":
    default:
      return "any";
  }
}

function shiftSegments(segs: readonly OverlayLambdaSegment[], by: number): OverlayLambdaSegment[] {
  if (segs.length === 0) return [];
  return segs.map((s) => ({ ...s, span: offsetSpan(s.span, by) }));
}


function hasQualifiedVm(vm: VmReflection): vm is VmReflection & { getQualifiedRootVmTypeExpr: () => string } {
  return typeof (vm as { getQualifiedRootVmTypeExpr?: unknown }).getQualifiedRootVmTypeExpr === "function";
}

function buildVmTypeInfo(vm: VmReflection, prefix: string): { alias: string; typeExpr: string; displayName?: string } {
  const typeExpr = hasQualifiedVm(vm) ? vm.getQualifiedRootVmTypeExpr() : vm.getRootVmTypeExpr();
  const alias = `${prefix}VM`;
  const displayName = typeof (vm as { getDisplayName?: () => string }).getDisplayName === "function"
    ? (vm as { getDisplayName: () => string }).getDisplayName()
    : undefined;
  const result: { alias: string; typeExpr: string; displayName?: string } = { alias, typeExpr };
  if (displayName !== undefined) result.displayName = displayName;
  return result;
}
