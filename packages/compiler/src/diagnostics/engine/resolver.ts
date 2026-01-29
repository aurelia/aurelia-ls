import type { DiagnosticsCatalog } from "../types.js";
import type { DiagnosticCode } from "../catalog/index.js";
import { AU_DIAGNOSTIC_MAP, type AuDiagnosticMapping } from "../mappings/au.js";
import type {
  DiagnosticCodeResolver,
  DiagnosticCodeResolution,
  DiagnosticIssue,
  RawDiagnostic,
} from "./types.js";

type ResolverData = Readonly<Record<string, unknown>>;

export function createDefaultCodeResolver(
  catalog: DiagnosticsCatalog,
): DiagnosticCodeResolver {
  return (raw) => resolveDiagnosticCode(raw, catalog);
}

export function resolveDiagnosticCode(
  raw: RawDiagnostic,
  catalog: DiagnosticsCatalog,
): DiagnosticCodeResolution {
  const code = raw.code;
  if (code.startsWith("aurelia/")) {
    return resolveAureliaCode(code, catalog);
  }
  if (code.startsWith("AU")) {
    return resolveAuCode(raw, catalog);
  }
  return { code: null, issues: [unknownCodeIssue(code)] };
}

function resolveAureliaCode(
  code: string,
  catalog: DiagnosticsCatalog,
): DiagnosticCodeResolution {
  if (catalog[code]) {
    return { code: code as DiagnosticCode };
  }
  return { code: null, issues: [unknownCodeIssue(code)] };
}

function resolveAuCode(
  raw: RawDiagnostic,
  catalog: DiagnosticsCatalog,
): DiagnosticCodeResolution {
  const mapping = AU_DIAGNOSTIC_MAP[raw.code];
  if (!mapping) {
    return { code: null, issues: [unknownCodeIssue(raw.code)] };
  }

  const issues: DiagnosticIssue[] = [];
  let resolvedCode: DiagnosticCode | null = null;
  let resolvedAurCode = pickMappingValue(mapping.aurCode, 0);
  let resolvedData = mapping.data;

  if (isCodeList(mapping.canonical)) {
    const conditional = resolveConditionalAuMapping(mapping, raw);
    if (conditional) {
      resolvedCode = conditional.code;
      resolvedAurCode = conditional.aurCode;
      resolvedData = mergeData(mapping.data, conditional.data);
    } else {
      resolvedCode = mapping.canonical[0] ?? null;
      issues.push(conditionalCodeIssue(raw.code, mapping.canonical, resolvedCode));
    }
  } else {
    resolvedCode = mapping.canonical;
  }

  resolvedData = mergeData(resolvedData, resolvedAurCode ? { aurCode: resolvedAurCode } : undefined);
  return finalizeResolution(resolvedCode, catalog, raw.code, issues, resolvedData);
}

function resolveConditionalAuMapping(
  mapping: AuDiagnosticMapping,
  raw: RawDiagnostic,
): { code: DiagnosticCode; aurCode?: string; data?: ResolverData } | null {
  if (!isCodeList(mapping.canonical)) return null;
  const data = toRecord(raw.data);
  if (!data) return null;

  const resourceKind = getStringValue(data, "resourceKind");
  if (resourceKind === "custom-attribute" || resourceKind === "template-controller") {
    const code = mapping.canonical[1] ?? mapping.canonical[0];
    const aurCode = pickMappingValue(mapping.aurCode, 1);
    return code ? { code, aurCode } : null;
  }

  if (Object.prototype.hasOwnProperty.call(data, "bindable")) {
    const code = mapping.canonical[0];
    const aurCode = pickMappingValue(mapping.aurCode, 0);
    return code ? { code, aurCode } : null;
  }

  return null;
}

function finalizeResolution(
  code: DiagnosticCode | null,
  catalog: DiagnosticsCatalog,
  rawCode: string,
  issues: DiagnosticIssue[],
  data?: ResolverData,
): DiagnosticCodeResolution {
  if (!code) {
    return { code: null, issues: issues.length ? issues : [unknownCodeIssue(rawCode)] };
  }
  if (!catalog[code]) {
    const nextIssues = [...issues, unknownCodeIssue(code, rawCode)];
    return { code: null, issues: nextIssues };
  }
  return { code, data, ...(issues.length ? { issues } : {}) };
}

function conditionalCodeIssue(
  rawCode: string,
  candidates: readonly DiagnosticCode[],
  fallback: DiagnosticCode | null,
): DiagnosticIssue {
  const candidateList = candidates.join(", ");
  const fallbackText = fallback ? ` Defaulted to '${fallback}'.` : "";
  return {
    kind: "conditional-code",
    message: `Conditional diagnostic mapping for '${rawCode}' (${candidateList}).${fallbackText}`,
    rawCode,
    code: fallback ?? undefined,
  };
}

function unknownCodeIssue(code: string, rawCode?: string): DiagnosticIssue {
  return {
    kind: "unknown-code",
    message: `Unknown diagnostic code '${code}'.`,
    ...(rawCode ? { rawCode } : { rawCode: code }),
  };
}

function pickMappingValue<T>(
  value: T | readonly T[] | undefined,
  index: number,
): T | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[index] as T | undefined;
  return value as T;
}

function isCodeList(
  value: DiagnosticCode | readonly DiagnosticCode[],
): value is readonly DiagnosticCode[] {
  return Array.isArray(value);
}

function mergeData(
  base: ResolverData | undefined,
  next: ResolverData | undefined,
): ResolverData | undefined {
  if (!base && !next) return undefined;
  return { ...(base ?? {}), ...(next ?? {}) };
}

function toRecord(
  data: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data;
}

function getStringValue(
  data: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const value = data[key];
  return typeof value === "string" ? value : null;
}
