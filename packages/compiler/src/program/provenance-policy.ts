import type { SourceSpan } from "../model/index.js";
import { canonicalDocumentUri } from "./paths.js";
import type { DocumentUri } from "./primitives.js";
import {
  type DocumentSpan,
  type OverlayProvenanceHit,
  type ProvenanceIndex,
  resolveTemplateUriForGenerated,
} from "./provenance.js";

export type TemplateToOverlayProjectionReason =
  | "mapped"
  | "provenance-miss"
  | "provenance-miss-after-materialization"
  | "overlay-materialization-failed";

export type DiagnosticLocationReason =
  | "mapped"
  | "overlay-template-fallback"
  | "passthrough-related-location"
  | "missing-location";

export type GeneratedReferenceLocationReason =
  | "mapped"
  | "mapped-degraded"
  | "overlay-unmapped-drop"
  | "overlay-template-fallback"
  | "passthrough-generated-location"
  | "missing-location";

export interface TemplateToOverlayProjectionDecision {
  readonly hit: OverlayProvenanceHit | null;
  readonly reason: TemplateToOverlayProjectionReason;
}

export interface DiagnosticLocationDecision {
  readonly location: DocumentSpan | null;
  readonly reason: DiagnosticLocationReason;
}

export interface GeneratedReferenceLocationDecision {
  readonly location: DocumentSpan | null;
  readonly reason: GeneratedReferenceLocationReason;
}

export interface OverlayEditBatchSummary {
  readonly requireOverlayMapping: boolean;
  readonly overlayEdits: number;
  readonly mappedOverlayEdits: number;
  readonly unmappedOverlayEdits: number;
}

export interface ProvenanceProjectionPolicy {
  readonly templateToOverlay: {
    readonly materializeOnMiss: boolean;
  };
  readonly diagnostics: {
    readonly overlayUnmappedLocation: "template-uri" | "missing-location";
  };
  readonly edits: {
    readonly requireFullOverlayMappingForAtomicEdit: boolean;
  };
  readonly references: {
    readonly overlayUnmappedLocation: "drop" | "template-uri" | "passthrough-generated";
    readonly requireExactMappedSpan: boolean;
  };
}

// Default policy keeps user-facing locations on authored/template sources:
// - diagnostics fall back to template URI when unmapped
// - references drop unmapped overlay-only locations
// - overlay edit batches stay all-or-nothing by default
export const DEFAULT_PROVENANCE_PROJECTION_POLICY: ProvenanceProjectionPolicy = {
  templateToOverlay: {
    materializeOnMiss: true,
  },
  diagnostics: {
    overlayUnmappedLocation: "template-uri",
  },
  edits: {
    requireFullOverlayMappingForAtomicEdit: true,
  },
  references: {
    overlayUnmappedLocation: "drop",
    requireExactMappedSpan: false,
  },
};

export function projectTemplateOffsetToOverlayWithPolicy(args: {
  provenance: Pick<ProvenanceIndex, "projectTemplateOffset">;
  uri: DocumentUri;
  offset: number;
  materializeOverlay?: (() => void) | null | undefined;
  policy?: ProvenanceProjectionPolicy | undefined;
}): TemplateToOverlayProjectionDecision {
  const policy = args.policy ?? DEFAULT_PROVENANCE_PROJECTION_POLICY;
  const canonical = canonicalDocumentUri(args.uri).uri;
  const direct = args.provenance.projectTemplateOffset(canonical, args.offset);
  if (direct) {
    return { hit: direct, reason: "mapped" };
  }
  if (!policy.templateToOverlay.materializeOnMiss || !args.materializeOverlay) {
    return { hit: null, reason: "provenance-miss" };
  }
  try {
    args.materializeOverlay();
  } catch {
    return { hit: null, reason: "overlay-materialization-failed" };
  }
  const retried = args.provenance.projectTemplateOffset(canonical, args.offset);
  if (retried) {
    return { hit: retried, reason: "mapped" };
  }
  return { hit: null, reason: "provenance-miss-after-materialization" };
}

export function projectTemplateSpanToOverlayWithPolicy(args: {
  provenance: Pick<ProvenanceIndex, "projectTemplateSpan">;
  uri: DocumentUri;
  span: SourceSpan;
  materializeOverlay?: (() => void) | null | undefined;
  policy?: ProvenanceProjectionPolicy | undefined;
}): TemplateToOverlayProjectionDecision {
  const policy = args.policy ?? DEFAULT_PROVENANCE_PROJECTION_POLICY;
  const canonical = canonicalDocumentUri(args.uri).uri;
  const direct = args.provenance.projectTemplateSpan(canonical, args.span);
  if (direct) {
    return { hit: direct, reason: "mapped" };
  }
  if (!policy.templateToOverlay.materializeOnMiss || !args.materializeOverlay) {
    return { hit: null, reason: "provenance-miss" };
  }
  try {
    args.materializeOverlay();
  } catch {
    return { hit: null, reason: "overlay-materialization-failed" };
  }
  const retried = args.provenance.projectTemplateSpan(canonical, args.span);
  if (retried) {
    return { hit: retried, reason: "mapped" };
  }
  return { hit: null, reason: "provenance-miss-after-materialization" };
}

export function resolveOverlayDiagnosticLocationWithPolicy(args: {
  overlaySpan: SourceSpan | null;
  mappedLocation: DocumentSpan | null;
  templateUri: DocumentUri;
  policy?: ProvenanceProjectionPolicy | undefined;
}): DiagnosticLocationDecision {
  const policy = args.policy ?? DEFAULT_PROVENANCE_PROJECTION_POLICY;
  if (args.mappedLocation) {
    return { location: args.mappedLocation, reason: "mapped" };
  }
  if (!args.overlaySpan) {
    return { location: null, reason: "missing-location" };
  }
  if (policy.diagnostics.overlayUnmappedLocation === "template-uri") {
    return {
      location: { uri: args.templateUri, span: args.overlaySpan },
      reason: "overlay-template-fallback",
    };
  }
  return { location: null, reason: "missing-location" };
}

export function resolveRelatedDiagnosticLocationWithPolicy(args: {
  relUri: DocumentUri;
  relSpan: SourceSpan | null;
  mappedLocation: DocumentSpan | null;
  overlayUri: DocumentUri;
  templateUri: DocumentUri;
  relatedTemplateUri?: DocumentUri | null;
  policy?: ProvenanceProjectionPolicy | undefined;
}): DiagnosticLocationDecision {
  const policy = args.policy ?? DEFAULT_PROVENANCE_PROJECTION_POLICY;
  if (args.mappedLocation) {
    return { location: args.mappedLocation, reason: "mapped" };
  }
  if (!args.relSpan) {
    return { location: null, reason: "missing-location" };
  }
  const normalizedRelUri = canonicalDocumentUri(args.relUri).uri;
  const normalizedOverlayUri = canonicalDocumentUri(args.overlayUri).uri;
  const normalizedTemplateUri = canonicalDocumentUri(args.templateUri).uri;
  const normalizedRelatedTemplateUri = args.relatedTemplateUri
    ? canonicalDocumentUri(args.relatedTemplateUri).uri
    : null;
  const fallbackTemplateUri = normalizedRelatedTemplateUri
    ?? (normalizedRelUri === normalizedOverlayUri ? normalizedTemplateUri : null);
  if (!fallbackTemplateUri) {
    return {
      location: { uri: normalizedRelUri, span: args.relSpan },
      reason: "passthrough-related-location",
    };
  }
  if (policy.diagnostics.overlayUnmappedLocation === "template-uri") {
    return {
      location: { uri: fallbackTemplateUri, span: args.relSpan },
      reason: "overlay-template-fallback",
    };
  }
  return { location: null, reason: "missing-location" };
}

export function resolveGeneratedReferenceLocationWithPolicy(args: {
  generatedUri: DocumentUri;
  generatedSpan: SourceSpan | null;
  mappedLocation: DocumentSpan | null;
  mappedEvidence?: "exact" | "degraded" | null | undefined;
  provenance: Pick<ProvenanceIndex, "getTemplateUriForGenerated">;
  policy?: ProvenanceProjectionPolicy | undefined;
}): GeneratedReferenceLocationDecision {
  const policy = args.policy ?? DEFAULT_PROVENANCE_PROJECTION_POLICY;
  const generatedUri = canonicalDocumentUri(args.generatedUri).uri;
  const templateUri = resolveTemplateUriForGenerated(args.provenance, generatedUri);
  const mappedEvidence = args.mappedEvidence ?? "exact";

  if (args.mappedLocation && (!policy.references.requireExactMappedSpan || mappedEvidence !== "degraded")) {
    return {
      location: args.mappedLocation,
      reason: mappedEvidence === "degraded" ? "mapped-degraded" : "mapped",
    };
  }

  if (!args.generatedSpan) {
    return { location: null, reason: "missing-location" };
  }

  if (!templateUri) {
    return {
      location: { uri: generatedUri, span: args.generatedSpan },
      reason: "passthrough-generated-location",
    };
  }

  switch (policy.references.overlayUnmappedLocation) {
    case "template-uri":
      return {
        location: { uri: templateUri, span: args.generatedSpan },
        reason: "overlay-template-fallback",
      };
    case "passthrough-generated":
      return {
        location: { uri: generatedUri, span: args.generatedSpan },
        reason: "passthrough-generated-location",
      };
    default:
      return { location: null, reason: "overlay-unmapped-drop" };
  }
}

export function shouldRejectOverlayEditBatch(
  summary: OverlayEditBatchSummary,
  policy: ProvenanceProjectionPolicy = DEFAULT_PROVENANCE_PROJECTION_POLICY,
): boolean {
  if (!summary.requireOverlayMapping || summary.overlayEdits === 0) return false;
  if (!policy.edits.requireFullOverlayMappingForAtomicEdit) {
    return summary.mappedOverlayEdits === 0;
  }
  return summary.unmappedOverlayEdits > 0 || summary.mappedOverlayEdits === 0;
}
