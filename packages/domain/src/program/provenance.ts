import type {
  SsrMappingArtifact,
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateMappingSegment,
} from "../contracts.js";
import type { ExprId, NodeId, SourceFileId } from "../compiler/model/identity.js";
import { spanContains, spanContainsOffset, spanLength, type SourceSpan } from "../compiler/model/span.js";
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

export interface ProvenanceTemplateStats {
  readonly templateUri: DocumentUri;
  readonly overlayUri: DocumentUri | null;
  readonly ssrUris: { html: DocumentUri; manifest: DocumentUri } | null;
  readonly totalEdges: number;
  readonly overlayEdges: number;
  readonly ssrEdges: number;
}

export interface ProvenanceStats {
  readonly totalEdges: number;
  readonly byKind: Partial<Record<ProvenanceKind, number>>;
  readonly documents: readonly {
    readonly uri: DocumentUri;
    readonly edges: number;
    readonly byKind: Partial<Record<ProvenanceKind, number>>;
  }[];
}

export interface ProvenanceIndex {
  addEdges(edges: Iterable<ProvenanceEdge>): void;
  /**
   * Ingest overlay mapping for a template. Callers must provide the overlay URI
   * because TemplateMappingArtifact lacks a path.
   */
  addOverlayMapping(templateUri: DocumentUri, overlayUri: DocumentUri, mapping: TemplateMappingArtifact): void;
  /**
   * Ingest SSR mapping (HTML + manifest) for a template.
   */
  addSsrMapping(templateUri: DocumentUri, ssrHtmlUri: DocumentUri, manifestUri: DocumentUri, mapping: SsrMappingArtifact): void;
  findByGenerated(uri: DocumentUri, offset: number): ProvenanceEdge[];
  /**
   * Project a generated span back to its template span, when possible.
   */
  projectGeneratedSpan(uri: DocumentUri, span: SourceSpan): TemplateProvenanceHit | null;
  /**
   * Project a generated offset back to its template span, when possible.
   */
  projectGeneratedOffset(uri: DocumentUri, offset: number): TemplateProvenanceHit | null;
  findBySource(uri: DocumentUri, offset: number): ProvenanceEdge[];
  lookupGenerated(uri: DocumentUri, offset: number): OverlayProvenanceHit | null;
  lookupSource(uri: DocumentUri, offset: number): TemplateProvenanceHit | null;
  stats(): ProvenanceStats;
  templateStats(templateUri: DocumentUri): ProvenanceTemplateStats;
  getOverlayMapping?(templateUri: DocumentUri): TemplateMappingArtifact | null;
  getOverlayUri?(templateUri: DocumentUri): DocumentUri | null;
  getSsrMapping?(templateUri: DocumentUri): SsrMappingArtifact | null;
  getSsrUris?(templateUri: DocumentUri): { html: DocumentUri; manifest: DocumentUri } | null;
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
  private readonly ssrByTemplate = new Map<DocumentUri, SsrMappingRecord>();

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

  addSsrMapping(templateUri: DocumentUri, ssrHtmlUri: DocumentUri, manifestUri: DocumentUri, mapping: SsrMappingArtifact): void {
    const template = canonicalDocumentUri(templateUri);
    const html = canonicalDocumentUri(ssrHtmlUri);
    const manifest = canonicalDocumentUri(manifestUri);
    const normalized = normalizeSsrMapping(mapping, template.file, html.file, manifest.file);
    this.ssrByTemplate.set(template.uri, {
      mapping: normalized,
      htmlUri: html.uri,
      manifestUri: manifest.uri,
      templateFile: template.file,
      htmlFile: html.file,
      manifestFile: manifest.file,
    });
    this.addEdges(expandSsrMapping(template.uri, html.uri, manifest.uri, normalized));
  }

  findByGenerated(uri: DocumentUri, offset: number): ProvenanceEdge[] {
    const canonical = canonicalDocumentUri(uri).uri;
    const candidates = this.edgesByFrom.get(canonical);
    if (!candidates) return [];
    return filterEdgesByOffset(candidates, offset, "from");
  }

  projectGeneratedSpan(uri: DocumentUri, span: SourceSpan): TemplateProvenanceHit | null {
    const candidates = this.findByGenerated(uri, span.start);
    if (!candidates.length) return null;
    let edge: ProvenanceEdge | null = null;
    let bestPriority = Number.POSITIVE_INFINITY;
    let bestOverlap = -1;
    let bestSpanLen = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const priority = edgePriority(candidate.kind);
      const overlap = overlapLength(candidate.from.span, span);
      if (overlap <= 0) continue;
      const spanLen = spanLength(candidate.from.span);
      const better =
        priority < bestPriority ||
        (priority === bestPriority && overlap > bestOverlap) ||
        (priority === bestPriority && overlap === bestOverlap && spanLen < bestSpanLen);
      if (better) {
        edge = candidate;
        bestPriority = priority;
        bestOverlap = overlap;
        bestSpanLen = spanLen;
      }
    }
    if (!edge) edge = candidates[0] ?? null;
    if (!edge) return null;
    const projected = projectOverlaySpanToTemplateSpan(edge, span);
    return {
      edge: {
        ...edge,
        to: { ...edge.to, span: projected },
      },
      ...(edge.from.exprId ? { exprId: edge.from.exprId } : edge.to.exprId ? { exprId: edge.to.exprId } : {}),
      ...(edge.kind === "overlayMember" && edge.tag ? { memberPath: edge.tag } : {}),
      ...(edge.to.nodeId ? { nodeId: edge.to.nodeId } : {}),
    };
  }

  projectGeneratedOffset(uri: DocumentUri, offset: number): TemplateProvenanceHit | null {
    return this.projectGeneratedSpan(uri, { start: offset, end: offset });
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

  stats(): ProvenanceStats {
    const byKind = zeroedKindCounts();
    const docMap = new Map<DocumentUri, { edges: number; byKind: Record<ProvenanceKind, number> }>();
    for (const edge of this.edges) {
      byKind[edge.kind] = (byKind[edge.kind] ?? 0) + 1;
      bumpDocCounts(docMap, edge.from.uri, edge.kind);
      bumpDocCounts(docMap, edge.to.uri, edge.kind);
    }
    const documents = Array.from(docMap.entries()).map(([uri, stats]) => ({
      uri,
      edges: stats.edges,
      byKind: stats.byKind,
    }));
    return { totalEdges: this.edges.length, byKind, documents };
  }

  templateStats(templateUri: DocumentUri): ProvenanceTemplateStats {
    const canonical = canonicalDocumentUri(templateUri);
    const overlay = this.overlayByTemplate.get(canonical.uri);
    const ssr = this.ssrByTemplate.get(canonical.uri);
    const trackedUris = new Set<DocumentUri>([canonical.uri]);
    if (overlay) trackedUris.add(overlay.overlayUri);
    if (ssr) {
      trackedUris.add(ssr.htmlUri);
      trackedUris.add(ssr.manifestUri);
    }

    let totalEdges = 0;
    let overlayEdges = 0;
    let ssrEdges = 0;
    for (const edge of this.edges) {
      if (!trackedUris.has(edge.from.uri) && !trackedUris.has(edge.to.uri)) continue;
      totalEdges += 1;
      if (edge.kind === "overlayExpr" || edge.kind === "overlayMember") {
        overlayEdges += 1;
      } else if (edge.kind === "ssrNode") {
        ssrEdges += 1;
      }
    }

    return {
      templateUri: canonical.uri,
      overlayUri: overlay?.overlayUri ?? null,
      ssrUris: ssr ? { html: ssr.htmlUri, manifest: ssr.manifestUri } : null,
      totalEdges,
      overlayEdges,
      ssrEdges,
    };
  }

  getOverlayUri(templateUri: DocumentUri): DocumentUri | null {
    const canonical = canonicalDocumentUri(templateUri).uri;
    return this.overlayByTemplate.get(canonical)?.overlayUri ?? null;
  }

  getSsrMapping(templateUri: DocumentUri): SsrMappingArtifact | null {
    const canonical = canonicalDocumentUri(templateUri).uri;
    return this.ssrByTemplate.get(canonical)?.mapping ?? null;
  }

  getSsrUris(templateUri: DocumentUri): { html: DocumentUri; manifest: DocumentUri } | null {
    const canonical = canonicalDocumentUri(templateUri).uri;
    const record = this.ssrByTemplate.get(canonical);
    return record ? { html: record.htmlUri, manifest: record.manifestUri } : null;
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
    for (const [templateUri, record] of this.ssrByTemplate.entries()) {
      if (templateUri === canonical || record.htmlUri === canonical || record.manifestUri === canonical) {
        urisToDrop.add(templateUri);
        urisToDrop.add(record.htmlUri);
        urisToDrop.add(record.manifestUri);
        this.ssrByTemplate.delete(templateUri);
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

interface SsrMappingRecord {
  readonly mapping: SsrMappingArtifact;
  readonly htmlUri: DocumentUri;
  readonly manifestUri: DocumentUri;
  readonly templateFile: SourceFileId;
  readonly htmlFile: SourceFileId;
  readonly manifestFile: SourceFileId;
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

function normalizeSsrMapping(
  mapping: SsrMappingArtifact,
  templateFile: SourceFileId,
  htmlFile: SourceFileId,
  manifestFile: SourceFileId,
): SsrMappingArtifact {
  const entries = mapping.entries.map((entry) => ({
    ...entry,
    templateSpan: entry.templateSpan ? resolveSourceSpan(entry.templateSpan, entry.templateSpan.file ?? templateFile) : null,
    htmlSpan: entry.htmlSpan ? resolveSourceSpan(entry.htmlSpan, entry.htmlSpan.file ?? htmlFile) : null,
    manifestSpan: entry.manifestSpan ? resolveSourceSpan(entry.manifestSpan, entry.manifestSpan.file ?? manifestFile) : null,
  }));
  return { kind: "ssr-mapping", entries };
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

function expandSsrMapping(
  templateUri: DocumentUri,
  htmlUri: DocumentUri,
  manifestUri: DocumentUri,
  mapping: SsrMappingArtifact,
): ProvenanceEdge[] {
  const edges: ProvenanceEdge[] = [];
  for (const entry of mapping.entries) {
    if (entry.templateSpan) {
      if (entry.htmlSpan) {
        edges.push({
          kind: "ssrNode",
          from: { uri: htmlUri, span: entry.htmlSpan, nodeId: entry.nodeId },
          to: { uri: templateUri, span: entry.templateSpan, nodeId: entry.nodeId },
        });
      }
      if (entry.manifestSpan) {
        edges.push({
          kind: "ssrNode",
          from: { uri: manifestUri, span: entry.manifestSpan, nodeId: entry.nodeId },
          to: { uri: templateUri, span: entry.templateSpan, nodeId: entry.nodeId },
        });
      }
    }
  }
  return edges;
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
    if (priority === bestPriority) {
      const specificity = memberSpecificity(edge, best);
      if (specificity < 0) {
        best = edge;
        bestSpan = span;
        bestPriority = priority;
        continue;
      }
      if (specificity === 0 && spanLength(span) < spanLength(currentSpan)) {
        best = edge;
        bestSpan = span;
        bestPriority = priority;
      }
    }
  }
  return best;
}

function compareEdges(a: ProvenanceEdge, b: ProvenanceEdge, side: "from" | "to"): number {
  const prioDelta = edgePriority(a.kind) - edgePriority(b.kind);
  if (prioDelta !== 0) return prioDelta;
  const memberDelta = memberSpecificity(a, b);
  if (memberDelta !== 0) return memberDelta;
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

function memberSpecificity(a: ProvenanceEdge, b: ProvenanceEdge): number {
  if (a.kind === "overlayMember" && b.kind === "overlayMember") {
    const lenA = a.tag?.length ?? 0;
    const lenB = b.tag?.length ?? 0;
    if (lenA !== lenB) return lenB - lenA; // prefer deeper/more specific member paths
  }
  return 0;
}

function overlapLength(a: SourceSpan, b: SourceSpan): number {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return Math.max(0, end - start);
}

function ensureEdgeList(map: Map<DocumentUri, ProvenanceEdge[]>, uri: DocumentUri): ProvenanceEdge[] {
  const existing = map.get(uri);
  if (existing) return existing;
  const next: ProvenanceEdge[] = [];
  map.set(uri, next);
  return next;
}

function zeroedKindCounts(): Record<ProvenanceKind, number> {
  return { overlayExpr: 0, overlayMember: 0, ssrNode: 0, custom: 0 };
}

function bumpDocCounts(
  map: Map<DocumentUri, { edges: number; byKind: Record<ProvenanceKind, number> }>,
  uri: DocumentUri,
  kind: ProvenanceKind,
): void {
  const current = map.get(uri);
  if (current) {
    current.edges += 1;
    current.byKind[kind] = (current.byKind[kind] ?? 0) + 1;
    return;
  }
  const byKind = zeroedKindCounts();
  byKind[kind] = 1;
  map.set(uri, { edges: 1, byKind });
}

/**
 * Project a generated overlay span onto its corresponding template span.
 * Keeps the proportional offset within the edge and preserves file metadata.
 */
export function projectOverlaySpanToTemplateSpan(edge: ProvenanceEdge, overlaySlice: SourceSpan): SourceSpan {
  const from = edge.from.span;
  const to = edge.to.span;
  const coversFrom = overlaySlice.start <= from.start && overlaySlice.end >= from.end;
  if (coversFrom) {
    const targetFile = to.file ?? canonicalDocumentUri(edge.to.uri).file;
    return resolveSourceSpan(to, targetFile);
  }
  const relStart = Math.max(0, overlaySlice.start - from.start);
  const start = Math.min(to.end, to.start + relStart);
  const length = spanLength(overlaySlice);
  const end = Math.min(to.end, start + length);
  const targetFile = to.file ?? canonicalDocumentUri(edge.to.uri).file;
  return resolveSourceSpan({ start, end }, targetFile);
}
