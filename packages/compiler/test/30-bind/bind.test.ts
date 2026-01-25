import { runVectorTests, getDirname, lowerOpts, indexExprCodeFromIr } from "../_helpers/vector-runner.js";
import { noopModuleResolver } from "../_helpers/test-utils.js";

import { lowerDocument, resolveHost, bindScopes } from "@aurelia-ls/compiler";

// --- Types ---

interface FrameIntent {
  label: string;
  parent: string | null;
  kind: string;
  overlay: string | null;
  origin: string | null;
}

interface LocalIntent {
  frame: string;
  kind: string;
  name: string;
}

interface ExprIntent {
  kind: string;
  frame: string;
  code?: string;
}

interface DiagIntent {
  code: string;
}

interface BindExpect {
  frames?: FrameIntent[];
  locals?: LocalIntent[];
  exprs?: ExprIntent[];
  diags?: DiagIntent[];
}

interface BindIntent {
  frames: FrameIntent[];
  locals: LocalIntent[];
  exprs: ExprIntent[];
  diags: DiagIntent[];
}

interface BindDiff {
  missingFrames: string[];
  extraFrames: string[];
  missingLocals: string[];
  extraLocals: string[];
  missingExprs: string[];
  extraExprs: string[];
  missingDiags: string[];
  extraDiags: string[];
}

const RESOLVE_OPTS = { moduleResolver: noopModuleResolver, templateFilePath: "mem.html" };

runVectorTests<BindExpect, BindIntent, BindDiff>({
  dirname: getDirname(import.meta.url),
  suiteName: "Bind (30)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = resolveHost(ir, ctx.sem, {
      ...RESOLVE_OPTS,
      diagnostics: ctx.diagnostics.forSource("resolve-host"),
    });
    const scope = bindScopes(linked, { diagnostics: ctx.diagnostics.forSource("bind") });
    return reduceScopeToBindIntent({ ir, linked, scope, diagnostics: ctx.diagnostics.all });
  },
  compare: compareBindIntent,
  categories: ["frames", "locals", "exprs", "diags"],
  normalizeExpect: (e) => ({
    frames: e?.frames ?? [],
    locals: e?.locals ?? [],
    exprs: e?.exprs ?? [],
    diags: e?.diags ?? [],
  }),
});

// --- Intent Reduction ---

// --- IR/Scope Types for reduceScopeToBindIntent ---

interface ScopeFrame {
  id: number;
  parent: number | null;
  kind: string;
  overlay?: { kind: string } | null;
  origin?: { kind: string } | null;
  symbols?: Array<{ kind: string; name: string }>;
}

interface ScopeTemplate {
  frames: ScopeFrame[];
  exprToFrame: Map<string, number>;
}

interface ScopeModule {
  templates?: ScopeTemplate[];
}

interface IrExprEntry {
  id: string;
  expressionType?: string;
}

interface IrDocument {
  templates?: unknown[];
  exprTable?: IrExprEntry[];
}

interface ReduceInput {
  ir: IrDocument;
  linked: unknown;
  scope: ScopeModule;
  diagnostics: readonly { code: string; source?: string }[];
}

/**
 * Reduce ScopeModule + original IR into a compact set-like intent:
 * - frames:   [{ label, parent, kind, overlay, origin }]
 * - locals:   [{ frame, kind, name }]
 * - exprs:    [{ kind: "expr"|"forOfHeader", frame, code? }]
 * - diags:    [{ code }]
 *
 * Notes:
 * - Frame labels are stable & human-friendly:
 *   * id 0/root → "root"
 *   * overlays (any kind) → "overlay:<kind>@<N>" where N increments
 *     globally per overlay appearance order (not per kind)
 * - "forOfHeader" uses exprTable.expressionType === "IsIterator"
 */
export function reduceScopeToBindIntent({ ir, linked, scope, diagnostics }: ReduceInput): BindIntent {
  const out: BindIntent = { frames: [], locals: [], exprs: [], diags: [] };
  const st = scope?.templates?.[0];
  if (!st) return out;

  // ---- Frame labeling -------------------------------------------------------
  const labels = labelFrames(st.frames);

  // frames
  for (const f of st.frames) {
    out.frames.push({
      label: labels[f.id],
      parent: f.parent == null ? null : labels[f.parent],
      kind: f.kind,
      overlay: f.overlay ? f.overlay.kind : null,
      origin: f.origin ? f.origin.kind : null,
    });
  }

  // locals
  for (const f of st.frames) {
    for (const s of f.symbols ?? []) {
      out.locals.push({ frame: labels[f.id], kind: s.kind, name: s.name });
    }
  }

  // ---- Expressions: map ExprId → (frame,label) + classify header vs normal --
  const forOfIds = new Set(
    (ir.exprTable ?? [])
      .filter(e => e.expressionType === "IsIterator")
      .map(e => e.id)
  );

  const codeIndex = indexExprCodeFromIr(ir);
  for (const [exprId, frameId] of st.exprToFrame.entries()) {
    if (forOfIds.has(exprId)) {
      out.exprs.push({ kind: "forOfHeader", frame: labels[frameId] });
    } else {
      const code = codeIndex.get(exprId) ?? "(unknown)";
      out.exprs.push({ kind: "expr", frame: labels[frameId], code });
    }
  }

  // diags
  for (const d of diagnostics ?? []) {
    if (d.source !== "bind") continue;
    out.diags.push({ code: d.code });
  }

  return out;
}

/** Build human-readable labels for frames (global overlay counter). */
function labelFrames(frames: ScopeFrame[]): string[] {
  const labels: string[] = [];
  let overlayCounter = 0;
  for (const f of frames) {
    if (f.parent == null) {
      labels[f.id] = "root";
      continue;
    }
    if (f.kind === "overlay") {
      overlayCounter++;
      const k =
        (f.origin && f.origin.kind) ? f.origin.kind :
        (f.overlay && f.overlay.kind) ? f.overlay.kind :
        "overlay";
      labels[f.id] = `overlay:${k}@${overlayCounter}`;
    } else {
      // future kinds, fallback to id
      labels[f.id] = `frame#${f.id}`;
    }
  }
  return labels;
}

// --- Intent Comparison ---

/**
 * Compare actual vs expected bind "intent" (set-like).
 * We treat arrays as sets, keyed by salient fields:
 *  - frames: label|parent|kind|overlay|origin
 *  - locals: frame|kind|name
 *  - exprs : kind|frame|code
 *  - diags : code
 */
export function compareBindIntent(actual: BindIntent, expected: BindExpect): BindDiff {
  const kFrame = (f: FrameIntent): string => [
    f.label ?? "", f.parent ?? "",
    f.kind ?? "", f.overlay ?? "", f.origin ?? ""
  ].join("|");

  const kLocal = (l: LocalIntent): string => [l.frame ?? "", l.kind ?? "", l.name ?? ""].join("|");

  const kExpr = (e: ExprIntent): string => [e.kind ?? "", e.frame ?? "", e.code ?? ""].join("|");

  const setOf = <T>(arr: T[] | undefined, key: (item: T) => string): Set<string> => new Set((arr ?? []).map(key));

  const aF = setOf(actual.frames, kFrame);
  const eF = setOf(expected.frames, kFrame);

  const aL = setOf(actual.locals, kLocal);
  const eL = setOf(expected.locals, kLocal);

  const aE = setOf(actual.exprs,  kExpr);
  const eE = setOf(expected.exprs, kExpr);

  const aD = setOf(actual.diags, (d: DiagIntent) => d.code);
  const eD = setOf(expected.diags, (d: DiagIntent) => d.code);

  const diff = (A: Set<string>, E: Set<string>): { missing: string[]; extra: string[] } => ({
    missing: [...E].filter(x => !A.has(x)),
    extra:   [...A].filter(x => !E.has(x)),
  });

  const { missing: missingFrames, extra: extraFrames } = diff(aF, eF);
  const { missing: missingLocals, extra: extraLocals } = diff(aL, eL);
  const { missing: missingExprs,  extra: extraExprs  } = diff(aE, eE);
  const { missing: missingDiags,  extra: extraDiags  } = diff(aD, eD);

  return { missingFrames, extraFrames, missingLocals, extraLocals, missingExprs, extraExprs, missingDiags, extraDiags };
}
