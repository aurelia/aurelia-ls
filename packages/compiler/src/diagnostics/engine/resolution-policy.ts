import type { DiagnosticCode } from "../catalog/index.js";
import type { AuDiagnosticMapping } from "../mappings/au.js";
import type { DiagnosticIssue, RawDiagnostic } from "./types.js";

type ResolverData = Readonly<Record<string, unknown>>;

export interface DiagnosticResolutionPolicy {
  readonly conditionalAu: {
    // `legacy-first-candidate` preserves historical AU fallback behavior.
    // `unresolved` is the preferred default for explicit policy diagnostics.
    readonly onMissingDiscriminator: "legacy-first-candidate" | "unresolved";
  };
}

export interface ConditionalAuMappingDecision {
  readonly code: DiagnosticCode | null;
  readonly aurCode?: string;
  readonly data?: ResolverData;
  readonly issue?: DiagnosticIssue;
}

const AMBIGUOUS_CONDITIONAL_AU_CODE: DiagnosticCode =
  "aurelia/policy/diagnostic-mapping-ambiguous";

export const DEFAULT_DIAGNOSTIC_RESOLUTION_POLICY: DiagnosticResolutionPolicy = {
  conditionalAu: {
    onMissingDiscriminator: "unresolved",
  },
};

export function resolveConditionalAuMappingWithPolicy(
  mapping: AuDiagnosticMapping,
  raw: RawDiagnostic,
  policy: DiagnosticResolutionPolicy = DEFAULT_DIAGNOSTIC_RESOLUTION_POLICY,
): ConditionalAuMappingDecision {
  if (!Array.isArray(mapping.canonical)) {
    const code = mapping.canonical as DiagnosticCode;
    return {
      code,
      aurCode: pickMappingValue(mapping.aurCode, 0),
      data: mapping.data,
    };
  }
  const data = toRecord(raw.data);
  if (data) {
    const resourceKind = getStringValue(data, "resourceKind");
    if (resourceKind === "custom-attribute" || resourceKind === "template-controller") {
      const code = mapping.canonical[1] ?? mapping.canonical[0] ?? null;
      return {
        code,
        aurCode: pickMappingValue(mapping.aurCode, 1),
        data: mapping.data,
      };
    }
    if (Object.prototype.hasOwnProperty.call(data, "bindable")) {
      const code = mapping.canonical[0] ?? null;
      return {
        code,
        aurCode: pickMappingValue(mapping.aurCode, 0),
        data: mapping.data,
      };
    }
  }
  const fallbackCode = mapping.canonical[0] ?? null;
  const fallbackAurCode = pickMappingValue(mapping.aurCode, 0);
  // TODO(tech-debt): remove legacy-first-candidate fallback once AU diagnostics
  // always carry sufficient discriminator data for unambiguous mapping.
  const fallbackAllowed = policy.conditionalAu.onMissingDiscriminator === "legacy-first-candidate";
  const issue = conditionalMappingIssue(raw.code, mapping.canonical, fallbackAllowed ? fallbackCode : null);
  if (!fallbackAllowed) {
    return {
      code: AMBIGUOUS_CONDITIONAL_AU_CODE,
      issue,
      data: mergeData(mapping.data, {
        rawCode: raw.code,
        candidates: [...mapping.canonical],
        reason: "missing-discriminator",
      }),
    };
  }
  return {
    code: fallbackCode,
    aurCode: fallbackAurCode,
    issue,
    data: mapping.data,
  };
}

function conditionalMappingIssue(
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

function pickMappingValue<T>(
  value: T | readonly T[] | undefined,
  index: number,
): T | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[index] as T | undefined;
  return value as T;
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

function mergeData(
  base: ResolverData | undefined,
  next: ResolverData | undefined,
): ResolverData | undefined {
  if (!base && !next) return undefined;
  return { ...(base ?? {}), ...(next ?? {}) };
}
