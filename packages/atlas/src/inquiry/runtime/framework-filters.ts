import type {
  FrameworkAnchorResolution,
  FrameworkDiscoveryAnchor,
  FrameworkFlowCallEdgeRow,
  FrameworkFlowCallSiteRow,
  FrameworkFlowDefinition,
  FrameworkFlowSeedRow,
} from "../../framework/index.js";
import type { Inquiry } from "../inquiry.js";
import type { FrameworkDiscoveryValue } from "./framework-entities.js";

export interface FrameworkDiscoveryFilters {
  readonly domain?: string;
  readonly flow?: string;
  readonly anchorId?: string;
  readonly status?: string;
  readonly packageId?: string;
  readonly symbolName?: string;
  readonly auLinkId?: string;
  readonly direction?: string;
  readonly fromPackageId?: string;
  readonly toPackageId?: string;
  readonly fromName?: string;
  readonly toName?: string;
  readonly calleeName?: string;
  readonly exportName?: string;
  readonly query?: string;
  readonly memberName?: string;
  readonly resourceKind?: string;
  readonly resourceName?: string;
  readonly resourceSiteKind?: string;
  readonly producerKind?: string;
  readonly productKind?: string;
  readonly slotName?: string;
  readonly instructionName?: string;
  readonly rendererName?: string;
  readonly bindingName?: string;
  readonly consequenceKind?: string;
  readonly constructionKind?: string;
  readonly effectKind?: string;
  readonly setupKind?: string;
  readonly observerKind?: string;
  readonly observerCapability?: string;
  readonly exportShape?: string;
  readonly appTaskKind?: string;
  readonly appTaskCapability?: string;
  readonly routerKind?: string;
  readonly routerCapability?: string;
  readonly expressionKind?: string;
  readonly expressionCapability?: string;
  readonly renderingStructureKind?: string;
  readonly renderingCapability?: string;
}

export function filtersFromInquiry(
  inquiry: Inquiry,
): FrameworkDiscoveryFilters {
  return {
    ...filtersFromRecord(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  };
}

export function anchorResolutionForRollup(rollup: {
  readonly resolvedAnchors: number;
  readonly ambiguousAnchors: number;
  readonly unresolvedAnchors: number;
  readonly packageUnadmittedAnchors: number;
}): FrameworkDiscoveryValue["anchorResolution"] {
  return {
    resolved: rollup.resolvedAnchors,
    ambiguous: rollup.ambiguousAnchors,
    unresolved: rollup.unresolvedAnchors,
    packageUnadmitted: rollup.packageUnadmittedAnchors,
  };
}

export function filtersFromRecord(value: unknown): FrameworkDiscoveryFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "domain"),
    ...stringFilter(source, "flow"),
    ...stringFilter(source, "anchorId"),
    ...stringFilter(source, "status"),
    ...stringFilter(source, "packageId"),
    ...stringFilter(source, "symbolName"),
    ...stringFilter(source, "auLinkId"),
    ...stringFilter(source, "direction"),
    ...stringFilter(source, "fromPackageId"),
    ...stringFilter(source, "toPackageId"),
    ...stringFilter(source, "fromName"),
    ...stringFilter(source, "toName"),
    ...stringFilter(source, "calleeName"),
    ...stringFilter(source, "exportName"),
    ...stringFilter(source, "query"),
    ...stringFilter(source, "memberName"),
    ...stringFilter(source, "resourceKind"),
    ...stringFilter(source, "resourceName"),
    ...stringFilter(source, "resourceSiteKind"),
    ...stringFilter(source, "producerKind"),
    ...stringFilter(source, "productKind"),
    ...stringFilter(source, "slotName"),
    ...stringFilter(source, "instructionName"),
    ...stringFilter(source, "rendererName"),
    ...stringFilter(source, "bindingName"),
    ...stringFilter(source, "consequenceKind"),
    ...stringFilter(source, "constructionKind"),
    ...stringFilter(source, "effectKind"),
    ...stringFilter(source, "setupKind"),
    ...stringFilter(source, "observerKind"),
    ...stringFilter(source, "observerCapability"),
    ...stringFilter(source, "exportShape"),
    ...stringFilter(source, "appTaskKind"),
    ...stringFilter(source, "appTaskCapability"),
    ...stringFilter(source, "routerKind"),
    ...stringFilter(source, "routerCapability"),
    ...stringFilter(source, "expressionKind"),
    ...stringFilter(source, "expressionCapability"),
    ...stringFilter(source, "renderingStructureKind"),
    ...stringFilter(source, "renderingCapability"),
  };
}

export function stringFilter(
  source: Record<string, unknown>,
  key: keyof FrameworkDiscoveryFilters,
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

export function flowMatches(
  flow: FrameworkFlowDefinition,
  filters: FrameworkDiscoveryFilters,
): boolean {
  return (
    (filters.domain === undefined ||
      flow.domains.includes(filters.domain as never)) &&
    (filters.flow === undefined || flow.flow === filters.flow)
  );
}

export function anchorMatches(
  anchor: FrameworkDiscoveryAnchor,
  filters: FrameworkDiscoveryFilters,
): boolean {
  return (
    (filters.anchorId === undefined || anchor.id === filters.anchorId) &&
    (filters.domain === undefined ||
      anchor.domains.includes(filters.domain as never)) &&
    (filters.flow === undefined ||
      anchor.flows.includes(filters.flow as never)) &&
    (filters.packageId === undefined ||
      anchor.source.packageId === filters.packageId) &&
    (filters.symbolName === undefined ||
      anchor.source.symbolName === filters.symbolName) &&
    (filters.auLinkId === undefined ||
      anchor.source.auLinkId === filters.auLinkId)
  );
}

export function anchorResolutionMatches(
  resolution: FrameworkAnchorResolution,
  filters: FrameworkDiscoveryFilters,
): boolean {
  return (
    anchorMatches(resolution.anchor, filters) &&
    (filters.status === undefined || resolution.status === filters.status)
  );
}

export function flowSeedMatches(
  row: FrameworkFlowSeedRow,
  filters: FrameworkDiscoveryFilters,
): boolean {
  return (
    anchorMatches(row.anchorResolution.anchor, filters) &&
    (filters.status === undefined ||
      row.status === filters.status ||
      row.anchorResolution.status === filters.status) &&
    (filters.domain === undefined ||
      row.flowDefinition?.domains.includes(filters.domain as never) === true) &&
    (filters.flow === undefined || row.flow === filters.flow)
  );
}

export function callEdgeMatches(
  row: FrameworkFlowCallEdgeRow,
  filters: FrameworkDiscoveryFilters,
): boolean {
  return (
    flowSeedMatches(row.flowSeed, filters) &&
    (filters.direction === undefined ||
      row.edge.direction === filters.direction) &&
    (filters.fromPackageId === undefined ||
      row.edge.from.file.packageId === filters.fromPackageId) &&
    (filters.toPackageId === undefined ||
      row.edge.to.file.packageId === filters.toPackageId) &&
    (filters.fromName === undefined ||
      row.edge.from.name === filters.fromName) &&
    (filters.toName === undefined || row.edge.to.name === filters.toName)
  );
}

export function callSiteMatches(
  row: FrameworkFlowCallSiteRow,
  filters: FrameworkDiscoveryFilters,
): boolean {
  return (
    callEdgeMatches(row.callEdge, filters) &&
    (filters.calleeName === undefined ||
      row.callSite.calleeName === filters.calleeName ||
      row.callSite.callee.symbolName === filters.calleeName)
  );
}
