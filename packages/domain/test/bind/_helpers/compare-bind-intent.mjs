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
