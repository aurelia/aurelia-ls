/* =======================================================================================
 * Provenance primitives (where did this piece of data come from?)
 * ---------------------------------------------------------------------------------------
 * - Lightweight origin envelope with optional trace breadcrumbs
 * - Helpers to build authored/synthetic/inferred provenance
 * - Non-invasive: phases can continue carrying SourceSpan-only data while opting into richer provenance
 * ======================================================================================= */

import type { SourceSpan } from "./span.js";

export type OriginKind = "authored" | "synthetic" | "inferred";

export interface OriginTrace {
  readonly by: string; // stage or subsystem adding the trace
  readonly detail?: string;
  readonly span?: SourceSpan | null;
}

export interface Origin {
  readonly kind: OriginKind;
  readonly span?: SourceSpan | null;
  readonly description?: string;
  readonly derivedFrom?: Origin | null;
  readonly trace?: readonly OriginTrace[] | null;
}

export interface Provenance {
  readonly origin?: Origin | null;
  readonly fallbackSpan?: SourceSpan | null;
}

export function authoredOrigin(span?: SourceSpan | null, description?: string): Origin {
  const base: Origin = { kind: "authored", span: span ?? null };
  return description ? { ...base, description } : base;
}

export function syntheticOrigin(description: string, span?: SourceSpan | null, derivedFrom?: Origin | null): Origin {
  return { kind: "synthetic", span: span ?? null, description, derivedFrom: derivedFrom ?? null };
}

export function inferredOrigin(description: string, span?: SourceSpan | null, derivedFrom?: Origin | null): Origin {
  return { kind: "inferred", span: span ?? null, description, derivedFrom: derivedFrom ?? null };
}

export function provenanceSpan(provenance?: Provenance | Origin | null): SourceSpan | null {
  if (!provenance) return null;
  if (isOrigin(provenance)) return provenance.span ?? null;
  return provenance.origin?.span ?? provenance.fallbackSpan ?? null;
}

export function authoredProvenance(span?: SourceSpan | null, description?: string): Provenance {
  const origin = authoredOrigin(span ?? null, description);
  return { origin, fallbackSpan: span ?? null };
}

export function syntheticProvenance(description: string, span?: SourceSpan | null, derivedFrom?: Origin | null): Provenance {
  const origin = syntheticOrigin(description, span ?? null, derivedFrom ?? null);
  return { origin, fallbackSpan: span ?? null };
}

export function inferredProvenance(description: string, span?: SourceSpan | null, derivedFrom?: Origin | null): Provenance {
  const origin = inferredOrigin(description, span ?? null, derivedFrom ?? null);
  return { origin, fallbackSpan: span ?? null };
}

export function preferOrigin(primary?: Origin | null, fallback?: Origin | null): Origin | null {
  return primary ?? fallback ?? null;
}

export function appendTrace(origin: Origin, trace: OriginTrace): Origin {
  const existing = origin.trace ?? [];
  return { ...origin, trace: [...existing, trace] };
}

/** Build a stage-tagged origin from a span, optionally annotating with a description. */
export function originFromSpan(by: string, span?: SourceSpan | null, description?: string): Origin {
  const base = authoredOrigin(span ?? null, description);
  return appendTrace(base, { by, span: span ?? null });
}

/** Convenience wrapper that builds provenance (origin + fallback span) for a stage. */
export function provenanceFromSpan(by: string, span?: SourceSpan | null, description?: string): Provenance {
  const origin = originFromSpan(by, span ?? null, description);
  return { origin, fallbackSpan: span ?? null };
}

function isOrigin(value: Provenance | Origin): value is Origin {
  return (value as Origin).kind !== undefined;
}
