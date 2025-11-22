import type { TemplateMappingArtifact } from "../contracts.js";
import type { ExprId, NodeId } from "../compiler/model/identity.js";
import type { SourceSpan } from "../compiler/model/span.js";
import type { DocumentUri } from "./primitives.js";

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
}

/**
 * Naive in-memory provenance. Edges are stored linearly; overlay mappings cached by template.
 * Offset queries currently ignore offsets (stub) but preserve API shape.
 */
export class InMemoryProvenanceIndex implements ProvenanceIndex {
  private readonly edges: ProvenanceEdge[] = [];
  private readonly overlayByTemplate = new Map<DocumentUri, TemplateMappingArtifact>();
  private readonly overlayUriByTemplate = new Map<DocumentUri, DocumentUri>();

  addEdges(edges: Iterable<ProvenanceEdge>): void {
    for (const edge of edges) this.edges.push(edge);
  }

  addOverlayMapping(templateUri: DocumentUri, overlayUri: DocumentUri, mapping: TemplateMappingArtifact): void {
    this.overlayByTemplate.set(templateUri, mapping);
    this.overlayUriByTemplate.set(templateUri, overlayUri);
    // TODO: expand mapping segments into ProvenanceEdge instances when ready.
  }

  findByGenerated(uri: DocumentUri, _offset: number): ProvenanceEdge[] {
    // TODO: hook up mapping + SSR manifest once call sites exist.
    return this.edges.filter((e) => e.from.uri === uri);
  }

  findBySource(uri: DocumentUri, _offset: number): ProvenanceEdge[] {
    return this.edges.filter((e) => e.to.uri === uri);
  }

  getOverlayMapping(templateUri: DocumentUri): TemplateMappingArtifact | null {
    return this.overlayByTemplate.get(templateUri) ?? null;
  }

  getOverlayUri(templateUri: DocumentUri): DocumentUri | null {
    return this.overlayUriByTemplate.get(templateUri) ?? null;
  }
}
