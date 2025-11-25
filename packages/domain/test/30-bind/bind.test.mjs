import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createFailureRecorder, fmtList } from "../_helpers/test-utils.mjs";
import { deepMergeSemantics } from "../_helpers/semantics-merge.mjs";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";
import { lowerDocument } from "../../out/compiler/phases/10-lower/lower.js";
import { DEFAULT } from "../../out/compiler/language/registry.js";
import { resolveHost } from "../../out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "../../out/compiler/phases/30-bind/bind.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vectorFiles = fs.readdirSync(__dirname).filter(f => f.endsWith(".json") && !f.endsWith("failures.json")).sort();

const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
attachWriter();

describe("Bind (30)", () => {
  for (const file of vectorFiles) {
    const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf8"));

    for (const v of vectors) {
      test(`${v.name}  [${file}]`, () => {
        const ir = lowerDocument(v.markup, {
          attrParser: DEFAULT_SYNTAX,
          exprParser: getExpressionParser(),
          file: "mem.html",
          name: "mem"
        });

        const sem = v.semOverrides ? deepMergeSemantics(DEFAULT, v.semOverrides) : DEFAULT;
        const linked = resolveHost(ir, sem);
        const scope = bindScopes(linked);

        const intent = reduceScopeToBindIntent({ ir, linked, scope });
        const expected = v.expect ?? { frames: [], locals: [], exprs: [], diags: [] };

        const diff = compareBindIntent(intent, expected);
        const {
          missingFrames, extraFrames,
          missingLocals, extraLocals,
          missingExprs, extraExprs,
          missingDiags, extraDiags
        } = diff;

        const anyMismatch =
          missingFrames.length || extraFrames.length ||
          missingLocals.length || extraLocals.length ||
          missingExprs.length  || extraExprs.length  ||
          missingDiags.length  || extraDiags.length;

        if (anyMismatch) {
          recordFailure({
            file,
            name: v.name,
            markup: v.markup,
            expected,
            actual: intent,
            diff,
          });
        }

        assert.ok(
          !missingFrames.length && !extraFrames.length,
          "Bind FRAMES mismatch." +
          fmtList("missingFrames", missingFrames) +
          fmtList("extraFrames",   extraFrames) +
          "\nSee failures.json for full snapshot."
        );

        assert.ok(
          !missingLocals.length && !extraLocals.length,
          "Bind LOCALS mismatch." +
          fmtList("missingLocals", missingLocals) +
          fmtList("extraLocals",   extraLocals) +
          "\nSee failures.json for full snapshot."
        );

        assert.ok(
          !missingExprs.length && !extraExprs.length,
          "Bind EXPRS mismatch." +
          fmtList("missingExprs", missingExprs) +
          fmtList("extraExprs",   extraExprs) +
          "\nSee failures.json for full snapshot."
        );

        assert.ok(
          !missingDiags.length && !extraDiags.length,
          "Bind DIAGS mismatch." +
          fmtList("missingDiags", missingDiags) +
          fmtList("extraDiags",   extraDiags) +
          "\nSee failures.json for full snapshot."
        );
      });
    }
  }
});

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

export function reduceScopeToBindIntent({ ir, linked, scope }) {
  const out = { frames: [], locals: [], exprs: [], diags: [] };
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
  for (const d of scope.diags ?? []) {
    out.diags.push({ code: d.code });
  }

  return out;
}

/** Build human-readable labels for frames (global overlay counter). */
function labelFrames(frames) {
  const labels = [];
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

/**
 * Walk IR to index ExprId → authored code.
 * Covers ExprRef occurrences in:
 *  - property/attribute/style/text bindings
 *  - listener/ref bindings
 *  - hydrateTemplateController (controller value props & switch case)
 *  - <let> bindings
 * Interpolation expands to entries per embedded ExprRef.
 * (ForOfStatement headers are classified via exprTable; we skip their code.)
 */
function indexExprCodeFromIr(ir) {
  const map = new Map();

  const visitSource = (src) => {
    if (!src) return;
    if (src.kind === "interp") {
      for (const r of src.exprs ?? []) map.set(r.id, r.code);
    } else {
      map.set(src.id, src.code);
    }
  };

  for (const t of ir.templates ?? []) {
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
            if (ins.from) map.set(ins.from.id, ins.from.code);
            break;

        case "hydrateTemplateController":
          for (const p of ins.props ?? []) {
            if (p.type === "propertyBinding") visitSource(p.from);
            // iteratorBinding carries ForOfIR.astId only; code resolved via exprTable classification
          }
          if (ins.branch?.kind === "case" && ins.branch.expr) {
            map.set(ins.branch.expr.id, ins.branch.expr.code);
          }
          break;

          case "hydrateElement":
            for (const p of ins.props ?? []) {
              if (p.kind === "propertyBinding" || p.type === "propertyBinding") visitSource(p.from);
            }
            break;
          case "hydrateAttribute":
            for (const p of ins.props ?? []) {
              if (p.kind === "propertyBinding" || p.type === "propertyBinding") visitSource(p.from);
              if (p.kind === "attributeBinding" || p.type === "attributeBinding") visitSource(p.from);
            }
            break;

          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from);
            break;

          default:
            // setAttribute/setClass/setStyle/setProperty - no expressions
            break;
        }
      }
    }
  }
  return map;
}

/**
 * Compare actual vs expected bind "intent" (set-like).
 * We treat arrays as sets, keyed by salient fields:
 *  - frames: label|parent|kind|overlay|origin
 *  - locals: frame|kind|name
 *  - exprs : kind|frame|code
 *  - diags : code
 */
export function compareBindIntent(actual, expected) {
  const kFrame = (f) => [
    f.label ?? "", f.parent ?? "",
    f.kind ?? "", f.overlay ?? "", f.origin ?? ""
  ].join("|");

  const kLocal = (l) => [l.frame ?? "", l.kind ?? "", l.name ?? ""].join("|");

  const kExpr  = (e) => [e.kind ?? "", e.frame ?? "", e.code ?? ""].join("|");

  const setOf = (arr, key) => new Set((arr ?? []).map(key));

  const aF = setOf(actual.frames, kFrame);
  const eF = setOf(expected.frames, kFrame);

  const aL = setOf(actual.locals, kLocal);
  const eL = setOf(expected.locals, kLocal);

  const aE = setOf(actual.exprs,  kExpr);
  const eE = setOf(expected.exprs, kExpr);

  const aD = setOf(actual.diags, d => d.code);
  const eD = setOf(expected.diags, d => d.code);

  const diff = (A, E) => ({
    missing: [...E].filter(x => !A.has(x)),
    extra:   [...A].filter(x => !E.has(x)),
  });

  const { missing: missingFrames, extra: extraFrames } = diff(aF, eF);
  const { missing: missingLocals, extra: extraLocals } = diff(aL, eL);
  const { missing: missingExprs,  extra: extraExprs  } = diff(aE, eE);
  const { missing: missingDiags,  extra: extraDiags  } = diff(aD, eD);

  return { missingFrames, extraFrames, missingLocals, extraLocals, missingExprs, extraExprs, missingDiags, extraDiags };
}
