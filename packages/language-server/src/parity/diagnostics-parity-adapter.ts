import type {
  ReplayableCommandInvocation,
  SemanticAuthorityParityAdapter,
  SemanticAuthorityParityNormalizationInput,
  SemanticAuthorityParityNormalizedResult,
} from "@aurelia-ls/semantic-workspace/host/types.js";
import { handleGetDiagnostics } from "../handlers/custom.js";
import type { ServerContext } from "../context.js";

type NormalizedDiagnostic = {
  code: string | null;
  message: string | null;
  uri: string | null;
  start: number | null;
  end: number | null;
  severity: string | null;
  category: string | null;
  status: string | null;
};

type NormalizedDiagnosticsBundle = {
  bySurface: Record<string, readonly NormalizedDiagnostic[]>;
  suppressed: readonly NormalizedDiagnostic[];
};

export function createDiagnosticsParityAdapter(ctx: ServerContext): SemanticAuthorityParityAdapter {
  return {
    name: "language-server-diagnostics",
    execute(invocation: ReplayableCommandInvocation): unknown {
      if (invocation.command !== "query.diagnostics") {
        return { unsupportedCommand: invocation.command };
      }
      const uri = extractDiagnosticsUri(invocation.args);
      if (!uri) return null;
      return handleGetDiagnostics(ctx, { uri });
    },
    normalize(input: SemanticAuthorityParityNormalizationInput): SemanticAuthorityParityNormalizedResult | null {
      if (input.invocation.command !== "query.diagnostics") return null;
      return {
        host: normalizeDiagnosticsBundle(input.hostResult),
        adapter: normalizeDiagnosticsBundle(extractAdapterDiagnosticsBundle(input.adapterResult)),
      };
    },
  };
}

function extractDiagnosticsUri(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const value = args as { uri?: unknown };
  return typeof value.uri === "string" && value.uri.trim().length > 0
    ? value.uri
    : null;
}

function extractAdapterDiagnosticsBundle(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const diagnostics = record.diagnostics;
  if (!diagnostics || typeof diagnostics !== "object") return value;
  return diagnostics;
}

function normalizeDiagnosticsBundle(value: unknown): NormalizedDiagnosticsBundle {
  const record = asRecord(value);
  if (!record) {
    return { bySurface: {}, suppressed: [] };
  }

  const bySurfaceRecord = asRecord(record.bySurface);
  const bySurface: Record<string, readonly NormalizedDiagnostic[]> = {};
  const surfaces = bySurfaceRecord
    ? Object.keys(bySurfaceRecord).sort((a, b) => a.localeCompare(b))
    : [];
  for (const surface of surfaces) {
    bySurface[surface] = normalizeDiagnosticsList(bySurfaceRecord?.[surface]);
  }

  const suppressed = normalizeDiagnosticsList(record.suppressed);
  return { bySurface, suppressed };
}

function normalizeDiagnosticsList(value: unknown): readonly NormalizedDiagnostic[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeDiagnostic)
    .sort((a, b) => diagnosticSortKey(a).localeCompare(diagnosticSortKey(b)));
}

function normalizeDiagnostic(value: unknown): NormalizedDiagnostic {
  const record = asRecord(value);
  if (!record) {
    return {
      code: null,
      message: null,
      uri: null,
      start: null,
      end: null,
      severity: null,
      category: null,
      status: null,
    };
  }

  const span = asRecord(record.span);
  const spec = asRecord(record.spec);
  return {
    code: asNullableString(record.code),
    message: asNullableString(record.message),
    uri: asNullableString(record.uri),
    start: asNullableNumber(span?.start),
    end: asNullableNumber(span?.end),
    severity: asNullableString(record.severity),
    category: asNullableString(record.category ?? spec?.category),
    status: asNullableString(record.status ?? spec?.status),
  };
}

function diagnosticSortKey(value: NormalizedDiagnostic): string {
  return [
    value.code ?? "",
    value.uri ?? "",
    String(value.start ?? -1),
    String(value.end ?? -1),
    value.message ?? "",
  ].join("|");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNullableString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}
