import type { AggregationContext, ResolvedDiagnostic, RoutedDiagnostics } from "./types.js";
import type { DiagnosticSurface } from "../types.js";

export function aggregateDiagnostics(
  routed: RoutedDiagnostics,
  context: AggregationContext = {},
): RoutedDiagnostics {
  const sort = context.sort ?? true;
  const dedupe = context.dedupe ?? true;
  const next = new Map<DiagnosticSurface, ResolvedDiagnostic[]>();

  for (const [surface, entries] of routed.bySurface.entries()) {
    let bucket = entries.slice();
    if (dedupe) bucket = dedupeDiagnostics(bucket);
    if (sort) bucket.sort(compareDiagnostics);
    next.set(surface, bucket);
  }

  return { bySurface: next, suppressed: routed.suppressed };
}

function dedupeDiagnostics(diags: readonly ResolvedDiagnostic[]): ResolvedDiagnostic[] {
  const seen = new Set<string>();
  const out: ResolvedDiagnostic[] = [];
  for (const diag of diags) {
    const span = diag.span;
    const key = span
      ? `${diag.code}:${String(diag.uri ?? "")}:${span.start}:${span.end}`
      : `${diag.code}:${String(diag.uri ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(diag);
  }
  return out;
}

function compareDiagnostics(a: ResolvedDiagnostic, b: ResolvedDiagnostic): number {
  const uriA = String(a.uri ?? "");
  const uriB = String(b.uri ?? "");
  if (uriA !== uriB) return uriA.localeCompare(uriB);
  const spanA = a.span;
  const spanB = b.span;
  if (spanA && spanB) {
    const startDelta = spanA.start - spanB.start;
    if (startDelta !== 0) return startDelta;
    const endDelta = spanA.end - spanB.end;
    if (endDelta !== 0) return endDelta;
  } else if (spanA) {
    return -1;
  } else if (spanB) {
    return 1;
  }
  return a.code.localeCompare(b.code);
}
