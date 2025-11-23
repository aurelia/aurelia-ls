import type { TemplateMappingArtifact, TemplateMappingEntry, TemplateMappingSegment } from "../contracts.js";
import type { ExprId, NodeId, SourceFileId } from "../compiler/model/identity.js";
import { spanContainsOffset, spanLength, type SourceSpan } from "../compiler/model/span.js";
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

export interface OverlayProvenanceHit {
  readonly exprId?: ExprId;
  readonly memberPath?: string;
  readonly edge: ProvenanceEdge;
}

export interface TemplateProvenanceHit {
  readonly exprId?: ExprId;
  readonly nodeId?: NodeId;
  readonly memberPath?: string;
  readonly edge: ProvenanceEdge;
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
  lookupGenerated(uri: DocumentUri, offset: number): OverlayProvenanceHit | null;
  lookupSource(uri: DocumentUri, offset: number): TemplateProvenanceHit | null;
  getOverlayMapping?(templateUri: DocumentUri): TemplateMappingArtifact | null;
  getOverlayUri?(templateUri: DocumentUri): DocumentUri | null;
  removeDocument(uri: DocumentUri): void;
}

/**
 * Naive in-memory provenance. Edges are indexed by URI for offset-aware queries;
 * overlay mappings cached by template.
 */
export class InMemoryProvenanceIndex implements ProvenanceIndex {
  private readonly edges: ProvenanceEdge[] = [];
  private readonly edgesByFrom = new Map<DocumentUri, ProvenanceEdge[]>();
  private readonly edgesByTo = new Map<DocumentUri, ProvenanceEdge[]>();
  private readonly overlayByTemplate = new Map<DocumentUri, OverlayMappingRecord>();

  addEdges(edges: Iterable<ProvenanceEdge>): void {
    for (const edge of edges) this.storeEdge(normalizeEdge(edge));
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
    this.addEdges(expandOverlayMapping(template.uri, overlay.uri, normalized));
  }

  findByGenerated(uri: DocumentUri, offset: number): ProvenanceEdge[] {
    const canonical = canonicalDocumentUri(uri).uri;
    const candidates = this.edgesByFrom.get(canonical);
    if (!candidates) return [];
    return filterEdgesByOffset(candidates, offset, "from");
  }

  findBySource(uri: DocumentUri, offset: number): ProvenanceEdge[] {
    const canonical = canonicalDocumentUri(uri).uri;
    const candidates = this.edgesByTo.get(canonical);
    if (!candidates) return [];
    return filterEdgesByOffset(candidates, offset, "to");
  }

  lookupGenerated(uri: DocumentUri, offset: number): OverlayProvenanceHit | null {
    const edge = pickBestEdge(this.findByGenerated(uri, offset), offset, "from");
    if (!edge) return null;
    const exprId = edge.from.exprId ?? edge.to.exprId;
    return {
      ...(exprId ? { exprId } : {}),
      ...(edge.kind === "overlayMember" && edge.tag ? { memberPath: edge.tag } : {}),
      edge,
    };
  }

  lookupSource(uri: DocumentUri, offset: number): TemplateProvenanceHit | null {
    const edge = pickBestEdge(this.findBySource(uri, offset), offset, "to");
    if (!edge) return null;
    const exprId = edge.to.exprId ?? edge.from.exprId;
    return {
      ...(exprId ? { exprId } : {}),
      ...(edge.to.nodeId ? { nodeId: edge.to.nodeId } : {}),
      ...(edge.kind === "overlayMember" && edge.tag ? { memberPath: edge.tag } : {}),
      edge,
    };
  }

  getOverlayMapping(templateUri: DocumentUri): TemplateMappingArtifact | null {
    const canonical = canonicalDocumentUri(templateUri).uri;
    return this.overlayByTemplate.get(canonical)?.mapping ?? null;
  }

  getOverlayUri(templateUri: DocumentUri): DocumentUri | null {
    const canonical = canonicalDocumentUri(templateUri).uri;
    return this.overlayByTemplate.get(canonical)?.overlayUri ?? null;
  }

  removeDocument(uri: DocumentUri): void {
    const canonical = canonicalDocumentUri(uri).uri;
    const urisToDrop = new Set<DocumentUri>([canonical]);
    for (const [templateUri, record] of this.overlayByTemplate.entries()) {
      if (templateUri === canonical || record.overlayUri === canonical) {
        urisToDrop.add(templateUri);
        urisToDrop.add(record.overlayUri);
        this.overlayByTemplate.delete(templateUri);
      }
    }
    const keep: ProvenanceEdge[] = [];
    for (const edge of this.edges) {
      if (urisToDrop.has(edge.from.uri) || urisToDrop.has(edge.to.uri)) continue;
      keep.push(edge);
    }
    this.rebuildEdges(keep);
  }

  private storeEdge(edge: ProvenanceEdge): void {
    this.edges.push(edge);
    const fromList = ensureEdgeList(this.edgesByFrom, edge.from.uri);
    fromList.push(edge);
    const toList = ensureEdgeList(this.edgesByTo, edge.to.uri);
    toList.push(edge);
  }

  private rebuildEdges(edges: readonly ProvenanceEdge[]): void {
    this.edges.length = 0;
    this.edgesByFrom.clear();
    this.edgesByTo.clear();
    for (const edge of edges) this.storeEdge(edge);
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

function expandOverlayMapping(
  templateUri: DocumentUri,
  overlayUri: DocumentUri,
  mapping: TemplateMappingArtifact,
): ProvenanceEdge[] {
  const edges: ProvenanceEdge[] = [];
  for (const entry of mapping.entries) {
    edges.push(buildOverlayExprEdge(templateUri, overlayUri, entry));
    for (const seg of entry.segments ?? []) {
      edges.push(buildOverlayMemberEdge(templateUri, overlayUri, entry, seg));
    }
  }
  return edges;
}

function buildOverlayExprEdge(
  templateUri: DocumentUri,
  overlayUri: DocumentUri,
  entry: TemplateMappingEntry,
): ProvenanceEdge {
  return {
    kind: "overlayExpr",
    from: { uri: overlayUri, span: entry.overlaySpan, exprId: entry.exprId },
    to: { uri: templateUri, span: entry.htmlSpan, exprId: entry.exprId },
  };
}

function buildOverlayMemberEdge(
  templateUri: DocumentUri,
  overlayUri: DocumentUri,
  entry: TemplateMappingEntry,
  seg: TemplateMappingSegment,
): ProvenanceEdge {
  return {
    kind: "overlayMember",
    tag: seg.path,
    from: { uri: overlayUri, span: seg.overlaySpan, exprId: entry.exprId },
    to: { uri: templateUri, span: seg.htmlSpan, exprId: entry.exprId },
  };
}

function filterEdgesByOffset(
  edges: readonly ProvenanceEdge[],
  offset: number,
  side: "from" | "to",
): ProvenanceEdge[] {
  const hits: ProvenanceEdge[] = [];
  for (const edge of edges) {
    const span = side === "from" ? edge.from.span : edge.to.span;
    if (spanContainsOffset(span, offset)) hits.push(edge);
  }
  hits.sort((a, b) => compareEdges(a, b, side));
  return hits;
}

function pickBestEdge(
  edges: readonly ProvenanceEdge[],
  offset: number,
  side: "from" | "to",
): ProvenanceEdge | null {
  let best: ProvenanceEdge | null = null;
  let bestSpan: SourceSpan | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (const edge of edges) {
    const span = side === "from" ? edge.from.span : edge.to.span;
    if (!spanContainsOffset(span, offset)) continue;
    const priority = edgePriority(edge.kind);
    if (!best) {
      best = edge;
      bestSpan = span;
      bestPriority = priority;
      continue;
    }
    if (priority < bestPriority) {
      best = edge;
      bestSpan = span;
      bestPriority = priority;
      continue;
    }
    const currentSpan = bestSpan ?? span;
    if (priority === bestPriority && spanLength(span) < spanLength(currentSpan)) {
      best = edge;
      bestSpan = span;
      bestPriority = priority;
    }
  }
  return best;
}

function compareEdges(a: ProvenanceEdge, b: ProvenanceEdge, side: "from" | "to"): number {
  const prioDelta = edgePriority(a.kind) - edgePriority(b.kind);
  if (prioDelta !== 0) return prioDelta;
  const spanA = side === "from" ? a.from.span : a.to.span;
  const spanB = side === "from" ? b.from.span : b.to.span;
  const lenDelta = spanLength(spanA) - spanLength(spanB);
  if (lenDelta !== 0) return lenDelta;
  return 0;
}

function edgePriority(kind: ProvenanceKind): number {
  switch (kind) {
    case "overlayMember":
      return 0;
    case "overlayExpr":
      return 1;
    default:
      return 2;
  }
}

function ensureEdgeList(map: Map<DocumentUri, ProvenanceEdge[]>, uri: DocumentUri): ProvenanceEdge[] {
  const existing = map.get(uri);
  if (existing) return existing;
  const next: ProvenanceEdge[] = [];
  map.set(uri, next);
  return next;
}
