import type { DiagnosticSurface } from "../types.js";
import type { ResolvedDiagnostic, RoutedDiagnostics } from "./types.js";

export type SurfaceFormatter = (diag: ResolvedDiagnostic) => unknown;
export type SurfaceFormatterMap = Partial<Record<DiagnosticSurface, SurfaceFormatter>>;
export type FormattedDiagnostics = Partial<Record<DiagnosticSurface, readonly unknown[]>>;

export function formatDiagnostics(
  routed: RoutedDiagnostics,
  formatters: SurfaceFormatterMap,
): FormattedDiagnostics {
  const output: FormattedDiagnostics = {};
  for (const [surface, entries] of routed.bySurface.entries()) {
    const formatter = formatters[surface];
    if (!formatter) continue;
    output[surface] = entries.map((diag) => formatter(diag));
  }
  return output;
}
