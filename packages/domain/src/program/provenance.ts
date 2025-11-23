import type { TemplateMappingArtifact } from "../contracts.js";
import type { ExprId, NodeId, SourceFileId } from "../compiler/model/identity.js";
import type { SourceSpan } from "../compiler/model/span.js";
import type { DocumentUri } from "./primitives.js";
import { canonicalDocumentUri } from "./paths.js";
import { resolveSourceSpan } from "../compiler/model/source.js";

/**
 * Cross-artifact provenance contracts. These are intentionally minimal so the
 * implementation can evolve (indexed, persisted, etc.) without changing callers.
 */

/** Discriminant for provenance edges. Keep the set small and generic. */
export type ProvenanceKind =
  | "overlayExpr"   // overlay TS <-> template expression
  | "overlayMember" // overlay TS member path segment <-> template member segment
  | "ssrNode"       // SSR output <-> template node
  | "custom";       // reserved for tooling/plugins

export interface ProvenanceEdgeEnd {
  readonly uri: DocumentUri;
  readonly span: SourceSpan;
  readonly exprId?: ExprId;
  readonly nodeId?: NodeId;
}

export interface ProvenanceEdge {
  readonly kind: ProvenanceKind;
  readonly from: ProvenanceEdgeEnd;
  readonly to: ProvenanceEdgeEnd;
  readonly tag?: string;
}

export interface ProvenanceIndex {
  addEdges(edges: Iterable<ProvenanceEdge>): void;
  /**
   * Ingest overlay mapping for a template. Callers must provide the overlay URI
   * because TemplateMappingArtifact lacks a path.
   */
  addOverlayMapping(templateUri: DocumentUri, overlayUri: DocumentUri, mapping: TemplateMappingArtifact): void;
  findByGenerated(uri: DocumentUri, offset: number): ProvenanceEdge[];
  findBySource(uri: DocumentUri, offset: number): ProvenanceEdge[];
  getOverlayMapping?(templateUri: DocumentUri): TemplateMappingArtifact | null;
  getOverlayUri?(templateUri: DocumentUri): DocumentUri | null;
}

/**
 * Naive in-memory provenance. Edges are stored linearly; overlay mappings cached by template.
 * Offset queries currently ignore offsets (stub) but preserve API shape.
 */
export class InMemoryProvenanceIndex implements ProvenanceIndex {
  private readonly edges: ProvenanceEdge[] = [];
  private readonly overlayByTemplate = new Map<DocumentUri, OverlayMappingRecord>();

  addEdges(edges: Iterable<ProvenanceEdge>): void {
    for (const edge of edges) this.edges.push(normalizeEdge(edge));
  }

  addOverlayMapping(templateUri: DocumentUri, overlayUri: DocumentUri, mapping: TemplateMappingArtifact): void {
    const template = canonicalDocumentUri(templateUri);
    const overlay = canonicalDocumentUri(overlayUri);
    const normalized = normalizeTemplateMapping(mapping, template.file, overlay.file);
    this.overlayByTemplate.set(template.uri, {
      mapping: normalized,
      overlayUri: overlay.uri,
      templateFile: template.file,
      overlayFile: overlay.file,
    });
    // TODO: expand mapping segments into ProvenanceEdge instances when ready.
  }

  findByGenerated(uri: DocumentUri, _offset: number): ProvenanceEdge[] {
    // TODO: hook up mapping + SSR manifest once call sites exist.
    const canonical = canonicalDocumentUri(uri).uri;
    return this.edges.filter((e) => e.from.uri === canonical);
  }

  findBySource(uri: DocumentUri, _offset: number): ProvenanceEdge[] {
    const canonical = canonicalDocumentUri(uri).uri;
    return this.edges.filter((e) => e.to.uri === canonical);
  }

  getOverlayMapping(templateUri: DocumentUri): TemplateMappingArtifact | null {
    const canonical = canonicalDocumentUri(templateUri).uri;
    return this.overlayByTemplate.get(canonical)?.mapping ?? null;
  }

  getOverlayUri(templateUri: DocumentUri): DocumentUri | null {
    const canonical = canonicalDocumentUri(templateUri).uri;
    return this.overlayByTemplate.get(canonical)?.overlayUri ?? null;
  }
}

interface OverlayMappingRecord {
  readonly mapping: TemplateMappingArtifact;
  readonly overlayUri: DocumentUri;
  readonly templateFile: SourceFileId;
  readonly overlayFile: SourceFileId;
}

function normalizeEdge(edge: ProvenanceEdge): ProvenanceEdge {
  const from = canonicalDocumentUri(edge.from.uri);
  const to = canonicalDocumentUri(edge.to.uri);
  return {
    ...edge,
    from: {
      ...edge.from,
      uri: from.uri,
      span: resolveSourceSpan(edge.from.span, edge.from.span.file ?? from.file),
    },
    to: {
      ...edge.to,
      uri: to.uri,
      span: resolveSourceSpan(edge.to.span, edge.to.span.file ?? to.file),
    },
  };
}

function normalizeTemplateMapping(
  mapping: TemplateMappingArtifact,
  templateFile: SourceFileId,
  overlayFile: SourceFileId,
): TemplateMappingArtifact {
  const entries = mapping.entries.map((entry) => ({
    ...entry,
    htmlSpan: resolveSourceSpan(entry.htmlSpan, templateFile),
    overlaySpan: resolveSourceSpan(entry.overlaySpan, overlayFile),
    segments: entry.segments?.map((segment) => ({
      ...segment,
      htmlSpan: resolveSourceSpan(segment.htmlSpan, templateFile),
      overlaySpan: resolveSourceSpan(segment.overlaySpan, overlayFile),
    })),
  }));

  return { kind: "mapping", entries };
}
