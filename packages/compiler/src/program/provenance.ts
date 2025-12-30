// Model imports (via barrel)
import type { ExprId, NodeId, SourceFileId, SourceSpan } from "../model/index.js";
import { spanContainsOffset, spanEquals, spanLength, resolveSourceSpan } from "../model/index.js";

// Synthesis imports (via barrel)
import type {
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateMappingSegment,
} from "../synthesis/index.js";

// Program layer imports
import type { DocumentUri, TemplateExprId, TemplateNodeId } from "./primitives.js";
import { canonicalDocumentUri } from "./paths.js";

/** Discriminant for provenance edges. Keep the set small and generic. */
export type ProvenanceKind =
  | "overlayExpr"   // overlay TS <-> template expression
  | "overlayMember" // overlay TS member path segment <-> template member segment
  | "runtimeExpr"   // runtime artifact <-> template expression
  | "runtimeMember" // runtime member segment <-> template member segment
  | "runtimeNode"   // runtime artifact <-> template node
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

export interface DocumentSpan {
  readonly uri: DocumentUri;
  readonly span: SourceSpan;
  readonly exprId?: TemplateExprId;
  readonly nodeId?: TemplateNodeId;
  readonly memberPath?: string;
}

export interface ProvenanceTemplateStats {
  readonly templateUri: DocumentUri;
  readonly overlayUri: DocumentUri | null;
  readonly runtimeUri: DocumentUri | null;
  readonly totalEdges: number;
  readonly overlayEdges: number;
  readonly runtimeEdges: number;
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
  addOverlayMapping(templateUri: DocumentUri, overlayUri: DocumentUri, mapping: TemplateMappingArtifact): void;

  findByGenerated(uri: DocumentUri, offset: number): ProvenanceEdge[];

  /** Project a generated span back to its template span, when possible. */
  projectGeneratedSpan(uri: DocumentUri, span: SourceSpan): TemplateProvenanceHit | null;

  /** Project a generated offset back to its template span, when possible. */
  projectGeneratedOffset(uri: DocumentUri, offset: number): TemplateProvenanceHit | null;

  /** Project a template span to its generated overlay span, when possible. */
  projectTemplateSpan(uri: DocumentUri, span: SourceSpan): OverlayProvenanceHit | null;

  /** Project a template offset to its generated overlay span, when possible. */
  projectTemplateOffset(uri: DocumentUri, offset: number): OverlayProvenanceHit | null;

  findBySource(uri: DocumentUri, offset: number): ProvenanceEdge[];
  lookupGenerated(uri: DocumentUri, offset: number): OverlayProvenanceHit | null;
  lookupSource(uri: DocumentUri, offset: number): TemplateProvenanceHit | null;

  stats(): ProvenanceStats;
  templateStats(templateUri: DocumentUri): ProvenanceTemplateStats;

  getOverlayMapping?(templateUri: DocumentUri): TemplateMappingArtifact | null;
  getOverlayUri?(templateUri: DocumentUri): DocumentUri | null;

  removeDocument(uri: DocumentUri): void;
}

export function provenanceHitToDocumentSpan(hit: OverlayProvenanceHit | TemplateProvenanceHit | null): DocumentSpan | null {
  if (!hit) return null;
  const target = hit.edge.to;
  return {
    uri: target.uri,
    span: target.span,
    ...(target.nodeId ? { nodeId: target.nodeId } : {}),
    ...(hit.exprId ? { exprId: hit.exprId } : {}),
    ...(hit.memberPath ? { memberPath: hit.memberPath } : {}),
  };
}

export function projectGeneratedSpanToDocumentSpan(
  provenance: Pick<ProvenanceIndex, "projectGeneratedSpan">,
  uri: DocumentUri,
  span: SourceSpan,
): DocumentSpan | null {
  return provenanceHitToDocumentSpan(provenance.projectGeneratedSpan(uri, span));
}

export function projectGeneratedOffsetToDocumentSpan(
  provenance: Pick<ProvenanceIndex, "projectGeneratedOffset">,
  uri: DocumentUri,
  offset: number,
): DocumentSpan | null {
  return provenanceHitToDocumentSpan(provenance.projectGeneratedOffset(uri, offset));
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
    return filterEdgesBySpan(candidates, pointSpan(offset), "from");
  }

  projectGeneratedSpan(uri: DocumentUri, span: SourceSpan): TemplateProvenanceHit | null {
    const canonical = canonicalDocumentUri(uri);
    const candidates = this.edgesByFrom.get(canonical.uri);
    if (!candidates) return null;

    const querySpan = resolveSourceSpan(span, canonical.file);

    // Prefer overlayExpr edges as the projection anchor when the querySpan exactly matches the full expression span.
    // This lets us map the whole expression back to the full template span while still reporting a memberPath from overlayMember segments.
    const exprEdges = candidates.filter(
      (edge) =>
        (edge.kind === "overlayExpr" || edge.kind === "runtimeExpr") &&
        edgeOverlap(edge.from.span, querySpan) > 0,
    );
      const fullExprEdge = exprEdges.find((edge) => spanEquals(edge.from.span, querySpan) || spansEqualLoose(edge.from.span, querySpan)) ?? null;

    const projectionEdge = fullExprEdge ?? pickBestEdgeForSpan(candidates, querySpan, "from");
    if (!projectionEdge) return null;

    const projectedSpan = projectEdgeSpanToTemplateSpan(projectionEdge, querySpan);
    const exprId = projectionEdge.from.exprId ?? projectionEdge.to.exprId;
    const nodeId = projectionEdge.to.nodeId ?? projectionEdge.from.nodeId;

    // Derive memberPath independently from the projection edge:
    // - full expression slice: prefer the member segment whose span == expr span (e.g. "user")
    // - partial slice: prefer the deepest member (e.g. "user.name")
    let memberPath: string | undefined;

    if (exprId) {
      const memberEdgesForExpr = candidates.filter(
        (edge) =>
          (edge.kind === "overlayMember" || edge.kind === "runtimeMember") &&
          (edge.from.exprId ?? edge.to.exprId) === exprId &&
          edgeOverlap(edge.from.span, querySpan) > 0,
      );

      if (memberEdgesForExpr.length > 0) {
        if (fullExprEdge) {
          // Full expression slice -> pick the member that covers the full expr span, if any.
          const coveringMembers = memberEdgesForExpr.filter((edge) => spanEquals(edge.from.span, fullExprEdge.from.span));
          const chosen =
            coveringMembers[0] ??
            memberEdgesForExpr.reduce<ProvenanceEdge | undefined>((best, edge) => {
              if (!best) return edge;
              const bestDepth = memberDepth(best);
              const depth = memberDepth(edge);
              // For full slices, shallower is generally the "root" member.
              return depth < bestDepth ? edge : best;
            }, undefined);

          memberPath = chosen?.tag;
        } else {
          // Partial slice -> deepest matching member wins (existing behavior, but restricted to this exprId).
          const bestMember = pickBestEdgeForSpan(memberEdgesForExpr, querySpan, "from");
          if (bestMember) memberPath = bestMember.tag;
        }
      }
    }

    const resultEdge: ProvenanceEdge = {
      ...projectionEdge,
      to: { ...projectionEdge.to, span: projectedSpan },
    };

    const hit: TemplateProvenanceHit = {
      edge: resultEdge,
      ...(exprId ? { exprId } : {}),
      ...(nodeId ? { nodeId } : {}),
      ...(memberPath ? { memberPath } : {}),
    };

    return hit;
  }

  projectGeneratedOffset(uri: DocumentUri, offset: number): TemplateProvenanceHit | null {
    return this.projectGeneratedSpan(uri, pointSpan(offset));
  }

  projectTemplateSpan(uri: DocumentUri, span: SourceSpan): OverlayProvenanceHit | null {
    const canonical = canonicalDocumentUri(uri);
    const candidates = this.edgesByTo.get(canonical.uri);
    if (!candidates) return null;

    const querySpan = resolveSourceSpan(span, canonical.file);
    const projectionEdge = pickBestEdgeForSpan(candidates, querySpan, "to");
    if (!projectionEdge) return null;
    if (
      projectionEdge.kind !== "overlayExpr" &&
      projectionEdge.kind !== "overlayMember" &&
      projectionEdge.kind !== "runtimeExpr" &&
      projectionEdge.kind !== "runtimeMember"
    ) {
      return null;
    }

    const projectedSpan = projectTemplateSpanToOverlaySpan(projectionEdge, querySpan);
    const exprId = projectionEdge.to.exprId ?? projectionEdge.from.exprId;

    const resultEdge: ProvenanceEdge = {
      ...projectionEdge,
      from: { ...projectionEdge.from, span: projectedSpan },
      to: projectionEdge.to,
    };

    const hit: OverlayProvenanceHit = {
      edge: resultEdge,
      ...(exprId ? { exprId } : {}),
      ...(
        (projectionEdge.kind === "overlayMember" || projectionEdge.kind === "runtimeMember") && projectionEdge.tag
          ? { memberPath: projectionEdge.tag }
          : {}
      ),
    };
    return hit;
  }

  projectTemplateOffset(uri: DocumentUri, offset: number): OverlayProvenanceHit | null {
    return this.projectTemplateSpan(uri, pointSpan(offset));
  }

  findBySource(uri: DocumentUri, offset: number): ProvenanceEdge[] {
    const canonical = canonicalDocumentUri(uri).uri;
    const candidates = this.edgesByTo.get(canonical);
    if (!candidates) return [];
    return filterEdgesBySpan(candidates, pointSpan(offset), "to");
  }

  lookupGenerated(uri: DocumentUri, offset: number): OverlayProvenanceHit | null {
    const canonical = canonicalDocumentUri(uri).uri;
    const candidates = this.edgesByFrom.get(canonical);
    if (!candidates) return null;

    const edge = pickBestEdgeForSpan(candidates, pointSpan(offset), "from");
    if (!edge) return null;

    const exprId = edge.from.exprId ?? edge.to.exprId;
    return {
      ...(exprId ? { exprId } : {}),
      ...(
        (edge.kind === "overlayMember" || edge.kind === "runtimeMember") && edge.tag
          ? { memberPath: edge.tag }
          : {}
      ),
      edge,
    };
  }

  lookupSource(uri: DocumentUri, offset: number): TemplateProvenanceHit | null {
    const canonical = canonicalDocumentUri(uri).uri;
    const candidates = this.edgesByTo.get(canonical);
    if (!candidates) return null;

    const edge = pickBestEdgeForSpan(candidates, pointSpan(offset), "to");
    if (!edge) return null;

    const exprId = edge.to.exprId ?? edge.from.exprId;
    return {
      ...(exprId ? { exprId } : {}),
      ...(edge.to.nodeId ? { nodeId: edge.to.nodeId } : {}),
      ...(
        (edge.kind === "overlayMember" || edge.kind === "runtimeMember") && edge.tag
          ? { memberPath: edge.tag }
          : {}
      ),
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
    const trackedUris = new Set<DocumentUri>([canonical.uri]);

    if (overlay) trackedUris.add(overlay.overlayUri);

    let totalEdges = 0;
    let overlayEdges = 0;
    let runtimeEdges = 0;

    for (const edge of this.edges) {
      if (!trackedUris.has(edge.from.uri) && !trackedUris.has(edge.to.uri)) continue;
      totalEdges += 1;
      if (edge.kind === "overlayExpr" || edge.kind === "overlayMember") {
        overlayEdges += 1;
      } else if (edge.kind === "runtimeExpr" || edge.kind === "runtimeMember" || edge.kind === "runtimeNode") {
        runtimeEdges += 1;
      }
    }

    return {
      templateUri: canonical.uri,
      overlayUri: overlay?.overlayUri ?? null,
      runtimeUri: null, // TODO: add runtime provenance when runtime synthesis is implemented
      totalEdges,
      overlayEdges,
      runtimeEdges,
    };
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
    ensureEdgeList(this.edgesByFrom, edge.from.uri).push(edge);
    ensureEdgeList(this.edgesByTo, edge.to.uri).push(edge);
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

function spansEqualLoose(a: SourceSpan, b: SourceSpan): boolean {
  return a.start === b.start && a.end === b.end;
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
      if (edgeOverlap(seg.overlaySpan, entry.overlaySpan) === 0) continue;
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

function pointSpan(offset: number): SourceSpan {
  return { start: offset, end: offset };
}

function filterEdgesBySpan(
  edges: readonly ProvenanceEdge[],
  query: SourceSpan,
  side: "from" | "to",
): ProvenanceEdge[] {
  const hits: ProvenanceEdge[] = [];
  for (const edge of edges) {
    const span = side === "from" ? edge.from.span : edge.to.span;
    if (edgeOverlap(span, query) > 0) hits.push(edge);
  }
  hits.sort((a, b) => compareEdgesForSpan(a, b, query, side));
  return hits;
}

function pickBestEdgeForSpan(
  edges: readonly ProvenanceEdge[],
  query: SourceSpan,
  side: "from" | "to",
): ProvenanceEdge | null {
  let best: {
    edge: ProvenanceEdge;
    priority: number;
    overlap: number;
    specificity: [number, number];
    memberDepth: number;
  } | null = null;

  for (const edge of edges) {
    const span = side === "from" ? edge.from.span : edge.to.span;
    const overlap = edgeOverlap(span, query);
    if (overlap <= 0) continue;

    const candidate = {
      edge,
      priority: edgePriority(edge.kind),
      overlap,
      specificity: edgeSpecificity(edge, side),
      memberDepth: memberDepth(edge),
    };

    if (!best || isBetterEdge(candidate, best)) best = candidate;
  }

  return best?.edge ?? null;
}

function compareEdgesForSpan(
  a: ProvenanceEdge,
  b: ProvenanceEdge,
  query: SourceSpan,
  side: "from" | "to",
): number {
  const spanA = side === "from" ? a.from.span : a.to.span;
  const spanB = side === "from" ? b.from.span : b.to.span;

  const prioDelta = edgePriority(a.kind) - edgePriority(b.kind);
  if (prioDelta !== 0) return prioDelta;

  const overlapDelta = edgeOverlap(spanB, query) - edgeOverlap(spanA, query);
  if (overlapDelta !== 0) return overlapDelta;

  const specificityA = edgeSpecificity(a, side);
  const specificityB = edgeSpecificity(b, side);
  const primaryDelta = specificityA[0] - specificityB[0];
  if (primaryDelta !== 0) return primaryDelta;
  const secondaryDelta = specificityA[1] - specificityB[1];
  if (secondaryDelta !== 0) return secondaryDelta;

  if (a.kind === "overlayMember" && b.kind === "overlayMember") {
    const memberDelta = memberDepth(b) - memberDepth(a);
    if (memberDelta !== 0) return memberDelta;
  }

  const memberDelta = memberDepth(b) - memberDepth(a);
  if (memberDelta !== 0) return memberDelta;

  return 0;
}

function edgePriority(kind: ProvenanceKind): number {
  switch (kind) {
    case "overlayMember":
      return 0;
    case "overlayExpr":
      return 1;
    case "runtimeMember":
      return 2;
    case "runtimeExpr":
      return 3;
    case "runtimeNode":
      return 4;
    default:
      return 5;
  }
}

function memberDepth(edge: ProvenanceEdge): number {
  return edge.kind === "overlayMember" || edge.kind === "runtimeMember" ? edge.tag?.length ?? 0 : 0;
}

function isBetterEdge(
  candidate: { priority: number; overlap: number; specificity: [number, number]; memberDepth: number },
  current: { priority: number; overlap: number; specificity: [number, number]; memberDepth: number },
): boolean {
  if (candidate.priority !== current.priority) return candidate.priority < current.priority;
  if (candidate.overlap !== current.overlap) return candidate.overlap > current.overlap;
  if (candidate.specificity[0] !== current.specificity[0]) return candidate.specificity[0] < current.specificity[0];
  if (candidate.specificity[1] !== current.specificity[1]) return candidate.specificity[1] < current.specificity[1];
  if (candidate.memberDepth !== current.memberDepth) return candidate.memberDepth > current.memberDepth;
  return false;
}

function edgeSpecificity(edge: ProvenanceEdge, side: "from" | "to"): [number, number] {
  const querySpan = side === "from" ? edge.from.span : edge.to.span;
  const otherSpan = side === "from" ? edge.to.span : edge.from.span;
  if (edge.kind === "overlayMember" || edge.kind === "runtimeMember") {
    // Overlay member specificity is defined by the generated span first, then the template span.
    return [spanLength(edge.from.span), spanLength(edge.to.span)];
  }
  return [spanLength(querySpan), spanLength(otherSpan)];
}

function overlapLength(a: SourceSpan, b: SourceSpan): number {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return Math.max(0, end - start);
}

/** Non-zero for any overlap; special-cases point queries. */
function edgeOverlap(span: SourceSpan, query: SourceSpan): number {
  const overlap = overlapLength(span, query);
  if (overlap > 0) return overlap;
  if (spanLength(query) === 0 && spanContainsOffset(span, query.start)) return 1;
  return 0;
}

function ensureEdgeList(map: Map<DocumentUri, ProvenanceEdge[]>, uri: DocumentUri): ProvenanceEdge[] {
  const existing = map.get(uri);
  if (existing) return existing;
  const next: ProvenanceEdge[] = [];
  map.set(uri, next);
  return next;
}

function zeroedKindCounts(): Record<ProvenanceKind, number> {
  return {
    overlayExpr: 0,
    overlayMember: 0,
    runtimeExpr: 0,
    runtimeMember: 0,
    runtimeNode: 0,
    custom: 0,
  };
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
 * - Intersects overlaySlice with edge.from.span.
 * - Maps relative position proportionally into edge.to.span.
 * - Clamps + rounds to valid integer offsets.
 */
export function projectOverlaySpanToTemplateSpan(edge: ProvenanceEdge, overlaySlice: SourceSpan): SourceSpan {
  const from = edge.from.span;
  const to = edge.to.span;

  const fromLen = Math.max(1, spanLength(from));
  const toLen = Math.max(0, spanLength(to));

  // Intersect slice with the valid "from" range.
  const sliceStart = clamp(overlaySlice.start, from.start, from.end);
  const sliceEnd = clamp(overlaySlice.end, from.start, from.end);

  // Map to full target.
  if (sliceStart === from.start && sliceEnd === from.end) {
    const targetFileFull = to.file ?? canonicalDocumentUri(edge.to.uri).file;
    return resolveSourceSpan(to, targetFileFull);
  }

  const startRatio = (sliceStart - from.start) / fromLen;
  const endRatio = (sliceEnd - from.start) / fromLen;

  const rawStart = to.start + startRatio * toLen;
  const rawEnd = to.start + endRatio * toLen;

  const clampedStart = clamp(rawStart, to.start, to.end);
  const clampedEnd = clamp(rawEnd, to.start, to.end);

  const projected = {
    start: Math.round(Math.min(clampedStart, clampedEnd)),
    end: Math.round(Math.max(clampedStart, clampedEnd)),
  };

  const targetFile = to.file ?? canonicalDocumentUri(edge.to.uri).file;
  return resolveSourceSpan(projected, targetFile);
}

function projectEdgeSpanToTemplateSpan(edge: ProvenanceEdge, slice: SourceSpan): SourceSpan {
  if (edge.kind === "runtimeNode") {
    const targetFile = edge.to.span.file ?? canonicalDocumentUri(edge.to.uri).file;
    return resolveSourceSpan(edge.to.span, targetFile);
  }
  if (edge.kind === "overlayMember" || edge.kind === "runtimeMember") {
    return projectOverlayMemberSlice(edge, slice);
  }
  return projectOverlaySpanToTemplateSpan(edge, slice);
}

function projectTemplateSpanToOverlaySpan(edge: ProvenanceEdge, templateSlice: SourceSpan): SourceSpan {
  const source = edge.to.span;
  const target = edge.from.span;

  const sourceLen = Math.max(1, spanLength(source));
  const targetLen = Math.max(0, spanLength(target));

  const sliceStart = clamp(templateSlice.start, source.start, source.end);
  const sliceEnd = clamp(templateSlice.end, source.start, source.end);

  if (sliceStart <= source.start && sliceEnd >= source.end) {
    const targetFileFull = target.file ?? canonicalDocumentUri(edge.from.uri).file;
    return resolveSourceSpan(target, targetFileFull);
  }

  const startRatio = (sliceStart - source.start) / sourceLen;
  const endRatio = (sliceEnd - source.start) / sourceLen;

  const rawStart = target.start + startRatio * targetLen;
  const rawEnd = target.start + endRatio * targetLen;

  const clampedStart = clamp(rawStart, target.start, target.end);
  const clampedEnd = clamp(rawEnd, target.start, target.end);

  const projected = {
    start: Math.round(Math.min(clampedStart, clampedEnd)),
    end: Math.round(Math.max(clampedStart, clampedEnd)),
  };

  const targetFile = target.file ?? canonicalDocumentUri(edge.from.uri).file;
  return resolveSourceSpan(projected, targetFile);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function projectOverlayMemberSlice(edge: ProvenanceEdge, slice: SourceSpan): SourceSpan {
  const from = edge.from.span;
  const to = edge.to.span;

  if (slice.start <= from.start && slice.end >= from.end) {
    const targetFileFull = to.file ?? canonicalDocumentUri(edge.to.uri).file;
    return resolveSourceSpan(to, targetFileFull);
  }

  const start = clamp(slice.start, from.start, from.end);
  const end = slice.end;

  const translated = {
    start: to.start + (start - from.start),
    end: to.start + (end - from.start),
  };
  const clamped = {
    start: clamp(translated.start, to.start, to.end),
    end: clamp(translated.end, to.start, to.end),
  };
  const ordered = {
    start: Math.min(clamped.start, clamped.end),
    end: Math.max(clamped.start, clamped.end),
  };
  const targetFile = to.file ?? canonicalDocumentUri(edge.to.uri).file;
  return resolveSourceSpan(ordered, targetFile);
}
