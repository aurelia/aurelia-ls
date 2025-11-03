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
 * - "forOfHeader" uses exprTable.astKind === "ForOfStatement"
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
      .filter(e => e.astKind === "ForOfStatement")
      .map(e => e.id)
  );

  const codeIndex = indexExprCodeFromIr(ir);
  for (const [idStr, frameId] of Object.entries(st.exprToFrame ?? {})) {
    if (forOfIds.has(idStr)) {
      out.exprs.push({ kind: "forOfHeader", frame: labels[frameId] });
    } else {
      const code = codeIndex.get(idStr) ?? "(unknown)";
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

          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from);
            break;

          default:
            // setAttribute/setClass/setStyle/setProperty/hydrateElement/hydrateAttribute — no expressions
            break;
        }
      }
    }
  }
  return map;
}
