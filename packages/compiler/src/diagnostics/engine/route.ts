import type { DiagnosticSurface } from "../types.js";
import type { ResolvedDiagnostic, RoutedDiagnostics, RoutingContext } from "./types.js";

const DEFAULT_SURFACES: readonly DiagnosticSurface[] = [
  "lsp",
  "vscode-inline",
  "vscode-panel",
  "vscode-status",
  "cli",
  "aot",
  "ssr",
  "ssg",
  "hmr",
  "telemetry",
];

const DEFAULT_REQUIRE_SPAN: readonly DiagnosticSurface[] = ["lsp", "vscode-inline"];

export function routeDiagnostics(
  diagnostics: readonly ResolvedDiagnostic[],
  context: RoutingContext = {},
): RoutedDiagnostics {
  const bySurface = new Map<DiagnosticSurface, ResolvedDiagnostic[]>();
  const suppressed: ResolvedDiagnostic[] = [];
  const surfaceFilter = context.surfaces ?? DEFAULT_SURFACES;
  const requireSpan = new Set(context.requireSpanFor ?? DEFAULT_REQUIRE_SPAN);

  for (const diag of diagnostics) {
    if (diag.suppressed) {
      suppressed.push(diag);
      continue;
    }
    const surfaces = diag.spec.surfaces ?? surfaceFilter;
    for (const surface of surfaces) {
      if (!surfaceFilter.includes(surface)) continue;
      if (requireSpan.has(surface) && !diag.span) continue;
      const bucket = bySurface.get(surface) ?? [];
      bucket.push(diag);
      bySurface.set(surface, bucket);
    }
  }

  return { bySurface, suppressed };
}
