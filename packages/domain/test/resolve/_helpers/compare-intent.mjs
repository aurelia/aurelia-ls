/**
 * Compare actual vs expected resolve-host "intent" (set-like).
 * - Items are keyed by salient fields; missing/extra reported
 * - Diags compared by code (message is informational)
 */
export function compareResolveIntent(actual, expected) {
  const key = (i) => [
    i.kind ?? "",
    i.res ?? "",
    i.attr ?? "",
    i.on ?? "",
    i.to ?? "",
    i.target ?? "",
    i.effectiveMode ?? "",
    i.type ?? "",
    i.capture ? "1" : "",
    i.modifier ?? ""
  ].join("|");

  const aItems = new Set((actual.items ?? []).map(key));
  const eItems = new Set((expected.items ?? []).map(key));

  const aDiags = new Set((actual.diags ?? []).map(d => d.code));
  const eDiags = new Set((expected.diags ?? []).map(d => d.code));

  const missingItems = [...eItems].filter(k => !aItems.has(k));
  const extraItems   = [...aItems].filter(k => !eItems.has(k));
  const missingDiags = [...eDiags].filter(k => !aDiags.has(k));
  const extraDiags   = [...aDiags].filter(k => !eDiags.has(k));

  return { missingItems, extraItems, missingDiags, extraDiags };
}
