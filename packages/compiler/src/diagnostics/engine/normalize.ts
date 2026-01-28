import type {
  DiagnosticSpec,
  DiagnosticsCatalog,
  DiagnosticDataRecord,
  DiagnosticStage,
  DiagnosticSeverity,
  DiagnosticStatus,
} from "../types.js";
import type {
  DiagnosticCodeResolver,
  DiagnosticIssue,
  NormalizationResult,
  NormalizedDiagnostic,
  RawDiagnostic,
} from "./types.js";

export type NormalizeOptions = {
  readonly resolver: DiagnosticCodeResolver;
  readonly externalSpecsBySource?: Readonly<Record<string, DiagnosticSpec<DiagnosticDataRecord>>>;
};

export function normalizeDiagnostics(
  raw: readonly RawDiagnostic[],
  catalog: DiagnosticsCatalog,
  options: NormalizeOptions,
): NormalizationResult {
  const diagnostics: NormalizedDiagnostic[] = [];
  const issues: DiagnosticIssue[] = [];
  const dropped: RawDiagnostic[] = [];

  for (const entry of raw) {
    const externalSpec = entry.source ? options.externalSpecsBySource?.[entry.source] : undefined;
    const resolved = externalSpec ? null : options.resolver(entry, catalog);
    if (resolved?.issues) issues.push(...resolved.issues);
    if (!externalSpec && resolved?.code == null) {
      dropped.push(entry);
      continue;
    }
    const resolvedCode = externalSpec ? entry.code : resolved?.code ?? null;
    const spec = externalSpec ?? (resolvedCode ? catalog[resolvedCode] : undefined);
    if (!spec || !resolvedCode) {
      issues.push({
        kind: "unknown-code",
        message: `Unknown diagnostic code '${resolvedCode ?? entry.code}'.`,
        rawCode: entry.code,
      });
      dropped.push(entry);
      continue;
    }

    const mergedData = mergeData(externalSpec ? undefined : resolved?.data, entry.data);
    // NOTE: Keep catalog default injection aligned with diagnostics/emitter.ts.
    const dataResult = normalizeData(mergedData, spec, resolvedCode);
    const severityResult = resolveSeverity(entry, spec, resolvedCode);
    const statusResult = externalSpec
      ? { suppressed: false, issues: [] as DiagnosticIssue[] }
      : gateStatus(spec.status, resolvedCode);

    const required = spec.data?.required ?? [];
    const missing = required.filter((key) => dataResult.data[key] === undefined);
    const localIssues = missing.map((field) => ({
      kind: "missing-required-data",
      message: `Missing required data field '${String(field)}' for ${resolvedCode}.`,
      code: resolvedCode,
      field: String(field),
    } satisfies DiagnosticIssue));

    const entryIssues = [
      ...dataResult.issues,
      ...severityResult.issues,
      ...statusResult.issues,
      ...localIssues,
    ];

    const normalized: NormalizedDiagnostic = {
      raw: entry,
      code: resolvedCode,
      spec: spec as DiagnosticSpec<DiagnosticDataRecord>,
      message: entry.message,
      severity: severityResult.severity,
      impact: spec.impact,
      actionability: spec.actionability,
      span: entry.span,
      uri: entry.uri,
      stage: resolveStage(entry, spec),
      source: entry.source,
      data: dataResult.data,
      origin: entry.origin,
      related: entry.related,
      ...(statusResult.suppressed
        ? { suppressed: true, suppressionReason: "status" }
        : {}),
      ...(entryIssues.length > 0 ? { issues: entryIssues } : {}),
    };

    if (entryIssues.length > 0) issues.push(...entryIssues);
    diagnostics.push(normalized);
  }

  return { diagnostics, issues, dropped };
}

function normalizeData(
  data: Readonly<Record<string, unknown>> | undefined,
  spec: DiagnosticSpec<DiagnosticDataRecord>,
  code: string,
): { data: DiagnosticDataRecord; issues: DiagnosticIssue[] } {
  const base = (data ?? {}) as DiagnosticDataRecord;
  const issues: DiagnosticIssue[] = [];
  if (!spec.aurCode && !spec.recovery && !spec.runtimeOnly) return { data: base, issues };

  const next: DiagnosticDataRecord = { ...base };
  if (spec.aurCode) {
    const existing = base.aurCode;
    if (existing !== undefined && existing !== spec.aurCode) {
      issues.push({
        kind: "conflicting-default",
        message: `Raw aurCode '${String(existing)}' ignored in favor of spec default '${spec.aurCode}' for ${code}.`,
        code,
        field: "aurCode",
      });
    }
    next.aurCode = spec.aurCode;
  }
  if (spec.recovery) {
    const existing = base.recovery;
    if (existing !== undefined && existing !== true) {
      issues.push({
        kind: "conflicting-default",
        message: `Raw recovery flag ignored in favor of spec default for ${code}.`,
        code,
        field: "recovery",
      });
    }
    next.recovery = true;
  }
  if (spec.runtimeOnly) {
    const existing = base.runtimeOnly;
    if (existing !== undefined && existing !== true) {
      issues.push({
        kind: "conflicting-default",
        message: `Raw runtimeOnly flag ignored in favor of spec default for ${code}.`,
        code,
        field: "runtimeOnly",
      });
    }
    next.runtimeOnly = true;
  }
  return { data: next, issues };
}

function resolveStage(
  entry: RawDiagnostic,
  spec: DiagnosticSpec<DiagnosticDataRecord>,
): DiagnosticStage | undefined {
  // Stage resolution order: explicit -> source map -> catalog default.
  return entry.stage ?? stageFromSource(entry.source) ?? spec.stages?.[0];
}

function stageFromSource(source: string | undefined): DiagnosticStage | undefined {
  if (!source) return undefined;
  return SOURCE_STAGE_MAP[source];
}

function resolveSeverity(
  entry: RawDiagnostic,
  spec: DiagnosticSpec<DiagnosticDataRecord>,
  code: string,
): { severity: DiagnosticSeverity; issues: DiagnosticIssue[] } {
  const issues: DiagnosticIssue[] = [];
  const hasDefault = spec.defaultSeverity !== undefined;
  if (hasDefault) {
    const severity = spec.defaultSeverity;
    if (entry.severity && entry.severity !== severity) {
      issues.push({
        kind: "conflicting-default",
        message: `Raw severity '${entry.severity}' ignored in favor of spec default '${severity}' for ${code}.`,
        code,
        field: "severity",
      });
    }
    return { severity: severity ?? "error", issues };
  }

  if (!entry.severity) {
    issues.push({
      kind: "missing-severity",
      message: `Missing severity for ${code}; spec provides no default.`,
      code,
      field: "severity",
    });
    return { severity: "error", issues };
  }

  return { severity: entry.severity, issues };
}

function gateStatus(
  status: DiagnosticStatus,
  code: string,
): { suppressed: boolean; issues: DiagnosticIssue[] } {
  if (ALLOWED_STATUSES.has(status)) return { suppressed: false, issues: [] };
  return {
    suppressed: true,
    issues: [
      {
        kind: "disallowed-status",
        message: `Diagnostic code '${code}' is ${status} and should not be emitted.`,
        code,
      },
    ],
  };
}

function mergeData(
  base: Readonly<Record<string, unknown>> | undefined,
  next: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (!base && !next) return undefined;
  return { ...(base ?? {}), ...(next ?? {}) };
}

const SOURCE_STAGE_MAP: Record<string, DiagnosticStage> = {
  lower: "lower",
  link: "link",
  project: "project",
  bind: "bind",
  typecheck: "typecheck",
  "overlay-plan": "overlay-plan",
  "overlay-emit": "overlay-emit",
};

const ALLOWED_STATUSES = new Set<DiagnosticStatus>(["canonical", "proposed"]);
