import ts from "typescript";

import type { SourceRange } from "../inquiry/locus.js";
import {
  SourceDeclarationKind,
  SourcePackageId,
  type SourceFileIdentity,
  type SourceProject,
  type SourceSpan,
} from "./project.js";
import { SourceProjectMemo } from "./memo.js";
import {
  sourceRangeFromFileSpan,
  sourceSpanForNode,
} from "./semantic-surface/source-ranges.js";
import {
  propertyNameText,
  visitNode,
} from "./semantic-surface/ast.js";

const AU_LINK_SOURCE_FILE = "packages/semantic-runtime/src/kernel/au-link.ts";
const auLinkMemo = new SourceProjectMemo<AuLinkIndex>();

/** Gap family observed when comparing the auLink overload catalog to decorator placements. */
export const enum AuLinkGapKind {
  /** The catalog declares an id but no admitted source placement uses it. */
  CatalogUnplaced = "catalog-unplaced",
  /** A source placement uses an id that is not declared by the overload catalog. */
  PlacementWithoutCatalog = "placement-without-catalog",
  /** More than one admitted source placement uses the same auLink id. */
  DuplicatePlacement = "duplicate-placement",
}

/** Framework-side resolution state for one auLink id. */
export const enum AuLinkFrameworkTargetStatus {
  /** A single conceptual framework target matched the auLink package and symbol. */
  Resolved = "resolved",
  /** More than one non-merged framework target matched the auLink package and symbol. */
  Ambiguous = "ambiguous",
  /** The package was admitted but no declaration matched the symbol. */
  Unresolved = "unresolved",
  /** The auLink package prefix is not admitted in the current source project. */
  PackageUnadmitted = "package-unadmitted",
}

/** Type/value declaration composition observed for one framework-side auLink target. */
export const enum AuLinkFrameworkTargetCompositionKind {
  /** No declaration matched the target id. */
  NoDeclaration = "no-declaration",
  /** One declaration matched the target id. */
  SingleDeclaration = "single-declaration",
  /** A class declaration provides both type and value sides. */
  ClassDeclaration = "class-declaration",
  /** Interface and class declarations share the same framework export name. */
  InterfaceClassPair = "interface-class-pair",
  /** Interface and variable declarations share the same framework export name, commonly for DI keys. */
  InterfaceVariablePair = "interface-variable-pair",
  /** Type alias and variable declarations share the same framework export name. */
  TypeAliasVariablePair = "type-alias-variable-pair",
  /** More than one type-side or value-side declaration matched. */
  MultipleDeclarations = "multiple-declarations",
}

/** Product-side semantic facet carried by an auLink placement. */
export const enum AuLinkPlacementFacet {
  /** Product row models the framework resource definition/catalog aspect. */
  ResourceDefinition = "resource-definition",
  /** Product row models static template-controller child-scope/cardinality behavior. */
  TemplateControllerSemantics = "template-controller-semantics",
  /** Product row models a router runtime topology/product record. */
  RouterRuntimeModel = "router-runtime-model",
}

/** Exact filter lanes accepted by auLink substrate reads. */
export interface AuLinkFilters {
  /** Exact auLink id such as runtime-html:Aurelia. */
  readonly linkId?: string;
  /** Exact package prefix before the first colon in the auLink id. */
  readonly packageId?: string;
  /** Exact symbol/name suffix after the first colon in the auLink id. */
  readonly symbolName?: string;
  /** Exact product model target name. */
  readonly targetName?: string;
  /** Repository-relative source file path. */
  readonly filePath?: string;
  /** Exact framework target resolution state. */
  readonly frameworkStatus?: AuLinkFrameworkTargetStatus | string;
  /** Exact substring filter across auLink ids, names, and source paths. */
  readonly query?: string;
}

/** auLink id split into its declared package prefix and framework/product symbol suffix. */
export interface AuLinkIdParts {
  /** Full auLink id. */
  readonly linkId: string;
  /** Prefix before the first colon. */
  readonly packageId: string;
  /** Suffix after the first colon. */
  readonly symbolName: string;
}

/** One framework declaration candidate for an auLink id. */
export interface AuLinkFrameworkTargetCandidate extends AuLinkIdParts {
  /** Stable candidate row id in the current source basis. */
  readonly id: string;
  /** Source declaration kind. */
  readonly kind: SourceDeclarationKind;
  /** Source file containing the framework declaration. */
  readonly file: SourceFileIdentity;
  /** Exact source span for the framework declaration. */
  readonly span: SourceSpan;
  /** True when the top-level declaration is exported from its declaring module. */
  readonly exported: boolean;
  /** TypeChecker fully qualified symbol name, when available. */
  readonly symbolKey: string | null;
}

/** Framework-side declaration resolution for one auLink id. */
export interface AuLinkFrameworkTargetResolution extends AuLinkIdParts {
  /** Stable target row id in the current source basis. */
  readonly id: string;
  /** Resolution state. */
  readonly status: AuLinkFrameworkTargetStatus;
  /** Number of framework candidates for this auLink id. */
  readonly candidateCount: number;
  /** Coarse TypeScript declaration composition for this framework export name. */
  readonly compositionKind: AuLinkFrameworkTargetCompositionKind;
  /** Candidate count that can participate on the TypeScript type side. */
  readonly typeCandidateCount: number;
  /** Candidate count that can participate on the JavaScript/runtime value side. */
  readonly valueCandidateCount: number;
  /** Preferred type-side candidate when Atlas can choose one without hiding the full candidate set. */
  readonly preferredTypeCandidate: AuLinkFrameworkTargetCandidate | null;
  /** Preferred value-side candidate when Atlas can choose one without hiding the full candidate set. */
  readonly preferredValueCandidate: AuLinkFrameworkTargetCandidate | null;
  /** Framework declaration candidates that matched this auLink id. */
  readonly candidates: readonly AuLinkFrameworkTargetCandidate[];
}

/** One overload declaration in semantic-runtime's auLink catalog. */
export interface AuLinkCatalogEntry extends AuLinkIdParts {
  /** Stable catalog row id in the current source basis. */
  readonly id: string;
  /** Source file containing the overload declaration. */
  readonly file: SourceFileIdentity;
  /** Exact source span for the overload declaration. */
  readonly span: SourceSpan;
  /** Framework-side target resolution for this catalog row. */
  readonly frameworkTarget: AuLinkFrameworkTargetResolution;
}

/** File-backed auLink record with an exact declaration/catalog source span. */
export interface AuLinkFileSpanRecord {
  /** Source file containing the auLink-side record. */
  readonly file: SourceFileIdentity;
  /** Exact source span for the auLink-side record. */
  readonly span: SourceSpan;
}

/** Product-side TypeScript declaration that carries an auLink decorator. */
export interface AuLinkTarget {
  /** Declaration name, when the source declaration is named. */
  readonly name: string | null;
  /** Source declaration kind. */
  readonly kind: SourceDeclarationKind;
  /** Source file containing the product-side declaration. */
  readonly file: SourceFileIdentity;
  /** Exact source span for the decorated declaration. */
  readonly span: SourceSpan;
  /** TypeChecker fully qualified symbol name, when available. */
  readonly symbolKey: string | null;
}

/** One product-to-framework anchor declared through an auLink decorator. */
export interface AuLinkAnchorRow extends AuLinkIdParts {
  /** Stable anchor row id in the current source basis. */
  readonly id: string;
  /** Source file containing the decorator placement. */
  readonly file: SourceFileIdentity;
  /** Exact source span for the decorator call. */
  readonly decoratorSpan: SourceSpan;
  /** Product-side facet when several semantic-runtime models intentionally mirror the same framework symbol. */
  readonly facet: AuLinkPlacementFacet | null;
  /** Product-side declaration that carries the decorator. */
  readonly target: AuLinkTarget;
  /** Framework-side target resolution for this anchor. */
  readonly frameworkTarget: AuLinkFrameworkTargetResolution;
  /** Catalog row id when the placement is declared by the overload catalog. */
  readonly catalogEntryId?: string;
}

/** One exact catalog/placement consistency issue. */
export interface AuLinkGapRow extends AuLinkIdParts {
  /** Stable gap row id in the current source basis. */
  readonly id: string;
  /** Gap family. */
  readonly kind: AuLinkGapKind;
  /** Number of rows involved in the gap. */
  readonly count: number;
  /** Product-side facet involved in the gap, when duplicate detection is facet-scoped. */
  readonly facet?: AuLinkPlacementFacet | null;
  /** Catalog entry involved in the gap, when any. */
  readonly catalog?: AuLinkCatalogEntry;
  /** Anchor placements involved in the gap, when any. */
  readonly anchors: readonly AuLinkAnchorRow[];
  /** Framework-side target resolution for this gap. */
  readonly frameworkTarget: AuLinkFrameworkTargetResolution;
}

/** Per-auLink-package rollup for catalog and placement rows. */
export interface AuLinkPackageRollup {
  /** auLink package prefix. */
  readonly packageId: string;
  /** Catalog entries in this package. */
  readonly catalogEntries: number;
  /** Decorator placements in this package. */
  readonly anchors: number;
  /** Catalog entries without a placement in this package. */
  readonly unplacedCatalogEntries: number;
  /** Placements not declared by the catalog in this package. */
  readonly placementsWithoutCatalog: number;
  /** Duplicate placement gap rows in this package. */
  readonly duplicatePlacementGroups: number;
  /** auLink ids intentionally mirrored by multiple product-side facets in this package. */
  readonly multiFacetPlacementGroups: number;
}

/** Compact rollup for the auLink bridge substrate. */
export interface AuLinkRollup {
  /** Catalog entries after exact filters. */
  readonly catalogEntries: number;
  /** Decorator placements after exact filters. */
  readonly anchors: number;
  /** Distinct auLink ids with at least one placement after exact filters. */
  readonly linkedIds: number;
  /** Gap rows after exact filters. */
  readonly gaps: number;
  /** Catalog entries without a placement after exact filters. */
  readonly unplacedCatalogEntries: number;
  /** Placements not declared by the catalog after exact filters. */
  readonly placementsWithoutCatalog: number;
  /** auLink ids with multiple placements after exact filters. */
  readonly duplicatePlacementGroups: number;
  /** auLink ids intentionally mirrored by multiple product-side facets after exact filters. */
  readonly multiFacetPlacementGroups: number;
  /** auLink ids whose framework side resolved to exactly one declaration. */
  readonly resolvedFrameworkTargets: number;
  /** auLink ids whose framework side resolved to more than one declaration. */
  readonly ambiguousFrameworkTargets: number;
  /** auLink ids whose package was admitted but no declaration matched. */
  readonly unresolvedFrameworkTargets: number;
  /** auLink ids whose package prefix is not admitted in the source project. */
  readonly unadmittedFrameworkPackages: number;
  /** Per-package rollups after exact filters. */
  readonly packages: readonly AuLinkPackageRollup[];
}

/** Exact auLink bridge model read from current TypeScript source and checker state. */
export interface AuLinkModel {
  /** Filters applied to the returned rows. */
  readonly filters: AuLinkFilters;
  /** Filtered overload catalog rows. */
  readonly catalog: readonly AuLinkCatalogEntry[];
  /** Filtered decorator placement rows. */
  readonly anchors: readonly AuLinkAnchorRow[];
  /** Filtered catalog/placement gap rows. */
  readonly gaps: readonly AuLinkGapRow[];
  /** Framework-side target resolutions for filtered or exact requested auLink ids. */
  readonly frameworkTargets: readonly AuLinkFrameworkTargetResolution[];
  /** Filtered model rollup. */
  readonly rollup: AuLinkRollup;
}

interface AuLinkIndex {
  readonly catalog: readonly AuLinkCatalogEntry[];
  readonly anchors: readonly AuLinkAnchorRow[];
  readonly gaps: readonly AuLinkGapRow[];
  readonly frameworkTargetsByLinkId: ReadonlyMap<string, readonly AuLinkFrameworkTargetCandidate[]>;
}

interface AuLinkBuildContext {
  readonly admittedPackageIds: ReadonlySet<string>;
}

/** Read the exact auLink catalog, placements, and catalog/placement gaps from the hot source project. */
export function readAuLinkModel(
  /** Hot source project that owns the current Program epoch. */
  project: SourceProject,
  /** Exact filters to apply to catalog, anchors, and gaps. */
  filters: AuLinkFilters = {},
): AuLinkModel {
  const index = auLinkIndex(project);
  const { catalog, anchors, gaps, frameworkTargetsByLinkId } = index;
  const filteredCatalog = catalog.filter((entry) => catalogMatches(entry, filters));
  const filteredAnchors = anchors.filter((anchor) =>
    auLinkAnchorMatches(anchor, filters),
  );
  const filteredGaps = gaps.filter((gap) => gapMatches(gap, filters));
  const frameworkTargets = targetRowsForFilters(project, frameworkTargetsByLinkId, filters, filteredCatalog, filteredAnchors, filteredGaps);

  return {
    filters,
    catalog: filteredCatalog,
    anchors: filteredAnchors,
    gaps: filteredGaps,
    frameworkTargets,
    rollup: rollupFor(filteredCatalog, filteredAnchors, filteredGaps, frameworkTargets),
  };
}

function auLinkIndex(project: SourceProject): AuLinkIndex {
  return auLinkMemo.read(project, () => {
    const startedAt = performance.now();
    const context: AuLinkBuildContext = {
      admittedPackageIds: new Set(
        project.snapshot().summary.packages.map((entry) => entry.id),
      ),
    };
    const frameworkTargetsByLinkId = collectAuLinkFrameworkTargets(project);
    const afterFrameworkTargets = performance.now();
    const catalog = collectAuLinkCatalog(
      project,
      frameworkTargetsByLinkId,
      context,
    );
    const afterCatalog = performance.now();
    const anchors = attachCatalogEntries(
      collectAuLinkAnchors(project, frameworkTargetsByLinkId, context),
      catalog,
    );
    const afterAnchors = performance.now();
    const gaps = collectAuLinkGaps(catalog, anchors);
    const afterGaps = performance.now();
    if (process.env.ATLAS_PROFILE_AULINK_BOOT === "1") {
      console.error(
        JSON.stringify({
          event: "atlas.aulink.profile",
          frameworkTargetsMs: Math.round(afterFrameworkTargets - startedAt),
          catalogMs: Math.round(afterCatalog - afterFrameworkTargets),
          anchorsMs: Math.round(afterAnchors - afterCatalog),
          gapsMs: Math.round(afterGaps - afterAnchors),
          totalMs: Math.round(afterGaps - startedAt),
          frameworkTargets: frameworkTargetsByLinkId.size,
          catalog: catalog.length,
          anchors: anchors.length,
          gaps: gaps.length,
        }),
      );
    }
    return { catalog, anchors, gaps, frameworkTargetsByLinkId };
  });
}

/** Convert an auLink anchor row into a source range suitable for continuations. */
export function sourceRangeForAuLinkAnchor(anchor: AuLinkAnchorRow): SourceRange {
  return sourceRangeForSpan(anchor.file, anchor.decoratorSpan);
}

/** Convert an auLink target declaration into a source range suitable for continuations. */
export function sourceRangeForAuLinkTarget(anchor: AuLinkAnchorRow): SourceRange {
  return sourceRangeForSpan(anchor.target.file, anchor.target.span);
}

/** Convert a file-backed auLink record span into a source range suitable for continuations. */
export function sourceRangeForAuLinkFileSpan(record: AuLinkFileSpanRecord): SourceRange {
  return sourceRangeForSpan(record.file, record.span);
}

function collectAuLinkCatalog(
  project: SourceProject,
  frameworkTargetsByLinkId: ReadonlyMap<string, readonly AuLinkFrameworkTargetCandidate[]>,
  context: AuLinkBuildContext,
): readonly AuLinkCatalogEntry[] {
  const entries: AuLinkCatalogEntry[] = [];
  for (const sourceFile of project.ownedSourceFiles()) {
    const file = project.requiredSourceFileIdentity(sourceFile);
    if (file.packageId !== SourcePackageId.SemanticRuntime || file.repoPath !== AU_LINK_SOURCE_FILE) {
      continue;
    }
    visitNode(sourceFile, (node) => {
      if (!ts.isFunctionDeclaration(node) || node.name?.text !== "auLink") {
        return;
      }
      const parameter = node.parameters[0];
      const id = parameter?.type === undefined ? null : auLinkIdFromParameterType(parameter.type);
      if (id === null) {
        return;
      }
      const parts = splitAuLinkId(id);
      entries.push({
        id: `aulink-catalog:${id}`,
        ...parts,
        file,
        span: sourceSpanForNode(sourceFile, node),
        frameworkTarget: frameworkTargetForParts(context, parts, frameworkTargetsByLinkId),
      });
    });
  }
  return [...uniqueCatalogEntries(entries)].sort(compareCatalogEntries);
}

function collectAuLinkAnchors(
  project: SourceProject,
  frameworkTargetsByLinkId: ReadonlyMap<string, readonly AuLinkFrameworkTargetCandidate[]>,
  context: AuLinkBuildContext,
): readonly AuLinkAnchorRow[] {
  const anchors: AuLinkAnchorRow[] = [];
  const symbolKeysByDeclaration = semanticRuntimeDeclarationSymbolKeys(project);
  for (const sourceFile of project.ownedSourceFiles()) {
    const file = project.requiredSourceFileIdentity(sourceFile);
    if (file.packageId !== SourcePackageId.SemanticRuntime) {
      continue;
    }
    const markerNames = auLinkMarkerNames(sourceFile);
    if (markerNames.size === 0) {
      continue;
    }
    visitNode(sourceFile, (node) => {
      if (!ts.isClassDeclaration(node)) {
        return;
      }
      for (const decorator of decoratorsFor(node)) {
        const metadata = auLinkMetadataFromDecorator(decorator, markerNames);
        if (metadata === null) {
          continue;
        }
        const { id, facet } = metadata;
        const parts = splitAuLinkId(id);
        const name = node.name?.text ?? null;
        anchors.push({
          id: `aulink-anchor:${id}:${file.repoPath}:${decorator.getStart(sourceFile)}:${decorator.getEnd()}`,
          ...parts,
          file,
          decoratorSpan: sourceSpanForNode(sourceFile, decorator),
          facet,
          target: {
            name,
            kind: SourceDeclarationKind.Class,
            file,
            span: sourceSpanForNode(sourceFile, node),
            symbolKey: sourceDeclarationSymbolKey(symbolKeysByDeclaration, file, node),
          },
          frameworkTarget: frameworkTargetForParts(context, parts, frameworkTargetsByLinkId),
        });
      }
    });
  }
  return anchors.sort(compareAnchors);
}

function attachCatalogEntries(
  anchors: readonly AuLinkAnchorRow[],
  catalog: readonly AuLinkCatalogEntry[],
): readonly AuLinkAnchorRow[] {
  const catalogById = new Map(catalog.map((entry) => [entry.linkId, entry]));
  return anchors.map((anchor) => {
    const catalogEntry = catalogById.get(anchor.linkId);
    return catalogEntry === undefined
      ? anchor
      : { ...anchor, catalogEntryId: catalogEntry.id };
  });
}

function collectAuLinkGaps(
  catalog: readonly AuLinkCatalogEntry[],
  anchors: readonly AuLinkAnchorRow[],
): readonly AuLinkGapRow[] {
  const catalogById = new Map(catalog.map((entry) => [entry.linkId, entry]));
  const anchorsById = groupAnchorsByLinkId(anchors);
  const gaps: AuLinkGapRow[] = [];

  for (const entry of catalog) {
    const entryAnchors = anchorsById.get(entry.linkId) ?? [];
    if (entryAnchors.length === 0) {
      gaps.push({
        id: `aulink-gap:${AuLinkGapKind.CatalogUnplaced}:${entry.linkId}`,
        kind: AuLinkGapKind.CatalogUnplaced,
        linkId: entry.linkId,
        packageId: entry.packageId,
        symbolName: entry.symbolName,
        count: 1,
        catalog: entry,
        anchors: [],
        frameworkTarget: entry.frameworkTarget,
      });
    }
  }

  for (const anchor of anchors) {
    if (!catalogById.has(anchor.linkId)) {
      gaps.push({
        id: `aulink-gap:${AuLinkGapKind.PlacementWithoutCatalog}:${anchor.id}`,
        kind: AuLinkGapKind.PlacementWithoutCatalog,
        linkId: anchor.linkId,
        packageId: anchor.packageId,
        symbolName: anchor.symbolName,
        count: 1,
        anchors: [anchor],
        frameworkTarget: anchor.frameworkTarget,
      });
    }
  }

  for (const [linkId, entryAnchors] of anchorsById) {
    for (const [facetKey, facetAnchors] of groupAnchorsByFacet(entryAnchors)) {
      if (facetAnchors.length <= 1) {
        continue;
      }
      const parts = splitAuLinkId(linkId);
      const facet = auLinkFacetFromGroupKey(facetKey);
      gaps.push({
        id: `aulink-gap:${AuLinkGapKind.DuplicatePlacement}:${linkId}:${facetKey}`,
        kind: AuLinkGapKind.DuplicatePlacement,
        ...parts,
        count: facetAnchors.length,
        facet,
        catalog: catalogById.get(linkId),
        anchors: facetAnchors,
        frameworkTarget: facetAnchors[0]?.frameworkTarget ?? frameworkTargetForPartsFromLinkId(parts),
      });
    }
  }

  return gaps.sort(compareGaps);
}

function collectAuLinkFrameworkTargets(project: SourceProject): ReadonlyMap<string, readonly AuLinkFrameworkTargetCandidate[]> {
  const candidatesByLinkId = new Map<string, AuLinkFrameworkTargetCandidate[]>();
  for (const row of project.topLevelDeclarationRows()) {
    const packageId = row.file.packageId;
    if (packageId === null || packageId === SourcePackageId.Atlas || packageId === SourcePackageId.SemanticRuntime || row.name === null) {
      continue;
    }
    if (!isFrameworkSourceDeclaration(row.file)) {
      continue;
    }
    const parts = splitAuLinkId(`${packageId}:${row.name}`);
    const candidate: AuLinkFrameworkTargetCandidate = {
      id: `aulink-framework-target:${parts.linkId}:${row.file.repoPath}:${row.span.start}:${row.span.end}`,
      ...parts,
      kind: row.kind,
      file: row.file,
      span: row.span,
      exported: row.exported,
      symbolKey: row.symbolKey,
    };
    const existing = candidatesByLinkId.get(parts.linkId);
    if (existing === undefined) {
      candidatesByLinkId.set(parts.linkId, [candidate]);
    } else {
      existing.push(candidate);
    }
  }
  for (const candidates of candidatesByLinkId.values()) {
    candidates.sort(compareFrameworkCandidates);
  }
  return candidatesByLinkId;
}

function isFrameworkSourceDeclaration(file: SourceFileIdentity): boolean {
  const pathText = file.repoPath.replace(/\\/gu, "/");
  return pathText.includes("/src/") && !pathText.includes("/dist/");
}

function frameworkTargetForParts(
  context: AuLinkBuildContext,
  parts: AuLinkIdParts,
  frameworkTargetsByLinkId: ReadonlyMap<string, readonly AuLinkFrameworkTargetCandidate[]>,
): AuLinkFrameworkTargetResolution {
  const candidates = frameworkTargetsByLinkId.get(parts.linkId) ?? [];
  const packageAdmitted = context.admittedPackageIds.has(parts.packageId);
  const composition = frameworkTargetComposition(candidates);
  return {
    id: `aulink-framework-target:${parts.linkId}`,
    ...parts,
    status: frameworkTargetStatus(packageAdmitted, composition.compositionKind),
    candidateCount: candidates.length,
    ...composition,
    candidates,
  };
}

function frameworkTargetForPartsFromLinkId(parts: AuLinkIdParts): AuLinkFrameworkTargetResolution {
  return {
    id: `aulink-framework-target:${parts.linkId}`,
    ...parts,
    status: AuLinkFrameworkTargetStatus.PackageUnadmitted,
    candidateCount: 0,
    compositionKind: AuLinkFrameworkTargetCompositionKind.NoDeclaration,
    typeCandidateCount: 0,
    valueCandidateCount: 0,
    preferredTypeCandidate: null,
    preferredValueCandidate: null,
    candidates: [],
  };
}

function frameworkTargetComposition(candidates: readonly AuLinkFrameworkTargetCandidate[]): {
  readonly compositionKind: AuLinkFrameworkTargetCompositionKind;
  readonly typeCandidateCount: number;
  readonly valueCandidateCount: number;
  readonly preferredTypeCandidate: AuLinkFrameworkTargetCandidate | null;
  readonly preferredValueCandidate: AuLinkFrameworkTargetCandidate | null;
} {
  const typeCandidates = candidates.filter((candidate) => isTypeSideDeclaration(candidate.kind));
  const valueCandidates = candidates.filter((candidate) => isValueSideDeclaration(candidate.kind));
  const kinds = new Set(candidates.map((candidate) => candidate.kind));
  return {
    compositionKind: frameworkTargetCompositionKind(candidates, kinds, typeCandidates, valueCandidates),
    typeCandidateCount: typeCandidates.length,
    valueCandidateCount: valueCandidates.length,
    preferredTypeCandidate: preferredTypeCandidate(typeCandidates),
    preferredValueCandidate: preferredValueCandidate(valueCandidates),
  };
}

function frameworkTargetCompositionKind(
  candidates: readonly AuLinkFrameworkTargetCandidate[],
  kinds: ReadonlySet<SourceDeclarationKind>,
  typeCandidates: readonly AuLinkFrameworkTargetCandidate[],
  valueCandidates: readonly AuLinkFrameworkTargetCandidate[],
): AuLinkFrameworkTargetCompositionKind {
  if (candidates.length === 1) {
    return kinds.has(SourceDeclarationKind.Class)
      ? AuLinkFrameworkTargetCompositionKind.ClassDeclaration
      : AuLinkFrameworkTargetCompositionKind.SingleDeclaration;
  }
  if (candidates.length === 0) {
    return AuLinkFrameworkTargetCompositionKind.NoDeclaration;
  }
  if (
    candidates.length === 2 &&
    kinds.has(SourceDeclarationKind.Interface) &&
    kinds.has(SourceDeclarationKind.Class)
  ) {
    return AuLinkFrameworkTargetCompositionKind.InterfaceClassPair;
  }
  if (
    candidates.length === 2 &&
    kinds.has(SourceDeclarationKind.Interface) &&
    kinds.has(SourceDeclarationKind.Variable)
  ) {
    return AuLinkFrameworkTargetCompositionKind.InterfaceVariablePair;
  }
  if (
    candidates.length === 2 &&
    kinds.has(SourceDeclarationKind.TypeAlias) &&
    kinds.has(SourceDeclarationKind.Variable)
  ) {
    return AuLinkFrameworkTargetCompositionKind.TypeAliasVariablePair;
  }
  if (typeCandidates.length <= 1 && valueCandidates.length <= 1) {
    return AuLinkFrameworkTargetCompositionKind.SingleDeclaration;
  }
  return AuLinkFrameworkTargetCompositionKind.MultipleDeclarations;
}

function isTypeSideDeclaration(kind: SourceDeclarationKind): boolean {
  return kind === SourceDeclarationKind.Class
    || kind === SourceDeclarationKind.Interface
    || kind === SourceDeclarationKind.TypeAlias
    || kind === SourceDeclarationKind.Enum;
}

function isValueSideDeclaration(kind: SourceDeclarationKind): boolean {
  return kind === SourceDeclarationKind.Class
    || kind === SourceDeclarationKind.Variable
    || kind === SourceDeclarationKind.Function
    || kind === SourceDeclarationKind.Enum;
}

function preferredTypeCandidate(
  candidates: readonly AuLinkFrameworkTargetCandidate[],
): AuLinkFrameworkTargetCandidate | null {
  return candidates.find((candidate) => candidate.kind === SourceDeclarationKind.Interface)
    ?? candidates.find((candidate) => candidate.kind === SourceDeclarationKind.TypeAlias)
    ?? candidates.find((candidate) => candidate.kind === SourceDeclarationKind.Class)
    ?? candidates.find((candidate) => candidate.kind === SourceDeclarationKind.Enum)
    ?? null;
}

function preferredValueCandidate(
  candidates: readonly AuLinkFrameworkTargetCandidate[],
): AuLinkFrameworkTargetCandidate | null {
  return candidates.find((candidate) => candidate.kind === SourceDeclarationKind.Class)
    ?? candidates.find((candidate) => candidate.kind === SourceDeclarationKind.Variable)
    ?? candidates.find((candidate) => candidate.kind === SourceDeclarationKind.Function)
    ?? candidates.find((candidate) => candidate.kind === SourceDeclarationKind.Enum)
    ?? null;
}

function frameworkTargetStatus(
  packageAdmitted: boolean,
  compositionKind: AuLinkFrameworkTargetCompositionKind,
): AuLinkFrameworkTargetStatus {
  if (!packageAdmitted) {
    return AuLinkFrameworkTargetStatus.PackageUnadmitted;
  }
  switch (compositionKind) {
    case AuLinkFrameworkTargetCompositionKind.NoDeclaration:
      return AuLinkFrameworkTargetStatus.Unresolved;
    case AuLinkFrameworkTargetCompositionKind.MultipleDeclarations:
      return AuLinkFrameworkTargetStatus.Ambiguous;
    case AuLinkFrameworkTargetCompositionKind.SingleDeclaration:
    case AuLinkFrameworkTargetCompositionKind.ClassDeclaration:
    case AuLinkFrameworkTargetCompositionKind.InterfaceClassPair:
    case AuLinkFrameworkTargetCompositionKind.InterfaceVariablePair:
    case AuLinkFrameworkTargetCompositionKind.TypeAliasVariablePair:
      return AuLinkFrameworkTargetStatus.Resolved;
  }
}

function targetRowsForFilters(
  project: SourceProject,
  frameworkTargetsByLinkId: ReadonlyMap<string, readonly AuLinkFrameworkTargetCandidate[]>,
  filters: AuLinkFilters,
  catalog: readonly AuLinkCatalogEntry[],
  anchors: readonly AuLinkAnchorRow[],
  gaps: readonly AuLinkGapRow[],
): readonly AuLinkFrameworkTargetResolution[] {
  const context: AuLinkBuildContext = {
    admittedPackageIds: new Set(project.snapshot().summary.packages.map((entry) => entry.id)),
  };
  const targetsById = new Map<string, AuLinkFrameworkTargetResolution>();
  for (const target of [
    ...catalog.map((entry) => entry.frameworkTarget),
    ...anchors.map((anchor) => anchor.frameworkTarget),
    ...gaps.map((gap) => gap.frameworkTarget),
  ]) {
    if (targetMatches(target, filters)) {
      targetsById.set(target.linkId, target);
    }
  }
  const requestedParts = targetPartsFromFilters(filters);
  if (requestedParts !== null) {
    const target = frameworkTargetForParts(context, requestedParts, frameworkTargetsByLinkId);
    if (targetMatches(target, filters)) {
      targetsById.set(target.linkId, target);
    }
  }
  return [...targetsById.values()].sort(compareFrameworkTargets);
}

function targetPartsFromFilters(filters: AuLinkFilters): AuLinkIdParts | null {
  if (filters.linkId !== undefined) {
    return splitAuLinkId(filters.linkId);
  }
  if (filters.packageId !== undefined && filters.symbolName !== undefined) {
    return splitAuLinkId(`${filters.packageId}:${filters.symbolName}`);
  }
  return null;
}

function auLinkIdFromParameterType(type: ts.TypeNode): string | null {
  if (!ts.isLiteralTypeNode(type)) {
    return null;
  }
  return stringLiteralText(type.literal);
}

interface AuLinkDecoratorMetadata {
  readonly id: string;
  readonly facet: AuLinkPlacementFacet | null;
}

function auLinkMetadataFromDecorator(
  decorator: ts.Decorator,
  markerNames: ReadonlySet<string>,
): AuLinkDecoratorMetadata | null {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression)) {
    return null;
  }
  if (!isAuLinkCallee(expression.expression, markerNames)) {
    return null;
  }
  const argument = expression.arguments[0];
  const id = argument === undefined ? null : stringLiteralText(argument);
  if (id === null) {
    return null;
  }
  return {
    id,
    facet: auLinkFacetFromDecoratorCall(expression),
  };
}

function auLinkFacetFromDecoratorCall(
  expression: ts.CallExpression,
): AuLinkPlacementFacet | null {
  const options = expression.arguments[1];
  if (options === undefined || !ts.isObjectLiteralExpression(options)) {
    return null;
  }
  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== "facet") {
      continue;
    }
    return auLinkPlacementFacetFromString(stringLiteralText(property.initializer));
  }
  return null;
}

function auLinkPlacementFacetFromString(
  value: string | null,
): AuLinkPlacementFacet | null {
  switch (value) {
    case AuLinkPlacementFacet.ResourceDefinition:
    case AuLinkPlacementFacet.TemplateControllerSemantics:
    case AuLinkPlacementFacet.RouterRuntimeModel:
      return value;
    default:
      return null;
  }
}

function isAuLinkCallee(expression: ts.Expression, markerNames: ReadonlySet<string>): boolean {
  const nameNode = calleeNameNode(expression);
  if (nameNode === null) {
    return false;
  }
  return ts.isIdentifier(nameNode) && markerNames.has(nameNode.text);
}

function calleeNameNode(expression: ts.Expression): ts.Node | null {
  if (ts.isIdentifier(expression)) {
    return expression;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name;
  }
  return null;
}

function auLinkMarkerNames(sourceFile: ts.SourceFile): ReadonlySet<string> {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !isAuLinkModuleSpecifier(stringLiteralText(statement.moduleSpecifier))) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) {
      continue;
    }
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === "auLink") {
        names.add(element.name.text);
      }
    }
  }
  return names;
}

function isAuLinkModuleSpecifier(specifier: string | null): boolean {
  return specifier !== null && specifier.replace(/\\/gu, "/").endsWith("/kernel/au-link.js");
}

function semanticRuntimeDeclarationSymbolKeys(project: SourceProject): ReadonlyMap<string, string | null> {
  const rows = project.declarationRows()
    .filter((row) => row.file.packageId === SourcePackageId.SemanticRuntime);
  return new Map(rows.map((row) => [semanticRuntimeDeclarationKey(row.file, row.span), row.symbolKey]));
}

function sourceDeclarationSymbolKey(
  symbolKeysByDeclaration: ReadonlyMap<string, string | null>,
  file: SourceFileIdentity,
  node: ts.Node,
): string | null {
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  return symbolKeysByDeclaration.get(`${file.repoPath}:${start}:${end}`) ?? null;
}

function semanticRuntimeDeclarationKey(file: SourceFileIdentity, span: SourceSpan): string {
  return `${file.repoPath}:${span.start}:${span.end}`;
}

function decoratorsFor(node: ts.Node): readonly ts.Decorator[] {
  if (!ts.canHaveDecorators(node)) {
    return [];
  }
  return ts.getDecorators(node) ?? [];
}

function stringLiteralText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function splitAuLinkId(linkId: string): AuLinkIdParts {
  const colon = linkId.indexOf(":");
  if (colon < 0) {
    return { linkId, packageId: "", symbolName: linkId };
  }
  return {
    linkId,
    packageId: linkId.slice(0, colon),
    symbolName: linkId.slice(colon + 1),
  };
}

function catalogMatches(entry: AuLinkCatalogEntry, filters: AuLinkFilters): boolean {
  return idMatches(entry, filters)
    && targetMatches(entry.frameworkTarget, filters)
    && (filters.targetName === undefined)
    && (filters.filePath === undefined || entry.file.repoPath === filters.filePath)
    && (filters.query === undefined || catalogContains(entry, filters.query));
}

function auLinkAnchorMatches(anchor: AuLinkAnchorRow, filters: AuLinkFilters): boolean {
  return idMatches(anchor, filters)
    && targetMatches(anchor.frameworkTarget, filters)
    && (filters.targetName === undefined || anchor.target.name === filters.targetName)
    && (filters.filePath === undefined || anchor.file.repoPath === filters.filePath)
    && (filters.query === undefined || anchorContains(anchor, filters.query));
}

function gapMatches(gap: AuLinkGapRow, filters: AuLinkFilters): boolean {
  if (
    !idMatches(gap, filters)
    || !targetMatches(gap.frameworkTarget, filters)
    || (filters.query !== undefined && !gapContains(gap, filters.query))
  ) {
    return false;
  }
  if (filters.targetName !== undefined && !gap.anchors.some((anchor) => anchor.target.name === filters.targetName)) {
    return false;
  }
  if (filters.filePath !== undefined) {
    const catalogMatchesFile = gap.catalog?.file.repoPath === filters.filePath;
    const anchorMatchesFile = gap.anchors.some((anchor) => anchor.file.repoPath === filters.filePath);
    return catalogMatchesFile || anchorMatchesFile;
  }
  return true;
}

function idMatches(parts: AuLinkIdParts, filters: AuLinkFilters): boolean {
  return (filters.linkId === undefined || parts.linkId === filters.linkId)
    && (filters.packageId === undefined || parts.packageId === filters.packageId)
    && (filters.symbolName === undefined || parts.symbolName === filters.symbolName);
}

function targetMatches(target: AuLinkFrameworkTargetResolution, filters: AuLinkFilters): boolean {
  return idMatches(target, filters)
    && (filters.frameworkStatus === undefined || target.status === filters.frameworkStatus)
    && (filters.query === undefined || frameworkTargetContains(target, filters.query));
}

function catalogContains(entry: AuLinkCatalogEntry, query: string): boolean {
  return [
    entry.linkId,
    entry.packageId,
    entry.symbolName,
    entry.file.repoPath,
  ].some((value) => value.includes(query))
    || frameworkTargetContains(entry.frameworkTarget, query);
}

function anchorContains(anchor: AuLinkAnchorRow, query: string): boolean {
  return [
    anchor.linkId,
    anchor.packageId,
    anchor.symbolName,
    anchor.facet,
    anchor.file.repoPath,
    anchor.target.name,
    anchor.target.kind,
    anchor.target.file.repoPath,
    anchor.target.symbolKey,
  ].some((value) => value?.includes(query) === true)
    || frameworkTargetContains(anchor.frameworkTarget, query);
}

function gapContains(gap: AuLinkGapRow, query: string): boolean {
  return [
    gap.linkId,
    gap.packageId,
    gap.symbolName,
    gap.kind,
    gap.catalog?.file.repoPath,
  ].some((value) => value?.includes(query) === true)
    || gap.catalog !== undefined && catalogContains(gap.catalog, query)
    || gap.anchors.some((anchor) => anchorContains(anchor, query))
    || frameworkTargetContains(gap.frameworkTarget, query);
}

function frameworkTargetContains(
  target: AuLinkFrameworkTargetResolution,
  query: string,
): boolean {
  return [
    target.linkId,
    target.packageId,
    target.symbolName,
    target.status,
  ].some((value) => value.includes(query))
    || target.candidates.some((candidate) => frameworkCandidateContains(candidate, query));
}

function frameworkCandidateContains(
  candidate: AuLinkFrameworkTargetCandidate,
  query: string,
): boolean {
  return [
    candidate.linkId,
    candidate.packageId,
    candidate.symbolName,
    candidate.kind,
    candidate.file.repoPath,
    candidate.symbolKey,
  ].some((value) => value?.includes(query) === true);
}

function rollupFor(
  catalog: readonly AuLinkCatalogEntry[],
  anchors: readonly AuLinkAnchorRow[],
  gaps: readonly AuLinkGapRow[],
  frameworkTargets: readonly AuLinkFrameworkTargetResolution[],
): AuLinkRollup {
  const duplicatePlacementGroups = gaps.filter((gap) => gap.kind === AuLinkGapKind.DuplicatePlacement).length;
  const unplacedCatalogEntries = gaps.filter((gap) => gap.kind === AuLinkGapKind.CatalogUnplaced).length;
  const placementsWithoutCatalog = gaps.filter((gap) => gap.kind === AuLinkGapKind.PlacementWithoutCatalog).length;
  const multiFacetPlacementGroups = multiFacetPlacementGroupCount(anchors);
  return {
    catalogEntries: catalog.length,
    anchors: anchors.length,
    linkedIds: new Set(anchors.map((anchor) => anchor.linkId)).size,
    gaps: gaps.length,
    unplacedCatalogEntries,
    placementsWithoutCatalog,
    duplicatePlacementGroups,
    multiFacetPlacementGroups,
    resolvedFrameworkTargets: frameworkTargets.filter((target) => target.status === AuLinkFrameworkTargetStatus.Resolved).length,
    ambiguousFrameworkTargets: frameworkTargets.filter((target) => target.status === AuLinkFrameworkTargetStatus.Ambiguous).length,
    unresolvedFrameworkTargets: frameworkTargets.filter((target) => target.status === AuLinkFrameworkTargetStatus.Unresolved).length,
    unadmittedFrameworkPackages: frameworkTargets.filter((target) => target.status === AuLinkFrameworkTargetStatus.PackageUnadmitted).length,
    packages: packageRollups(catalog, anchors, gaps),
  };
}

function packageRollups(
  catalog: readonly AuLinkCatalogEntry[],
  anchors: readonly AuLinkAnchorRow[],
  gaps: readonly AuLinkGapRow[],
): readonly AuLinkPackageRollup[] {
  const packageIds = new Set([
    ...catalog.map((entry) => entry.packageId),
    ...anchors.map((anchor) => anchor.packageId),
    ...gaps.map((gap) => gap.packageId),
  ]);
  return [...packageIds].sort((left, right) => left.localeCompare(right)).map((packageId) => ({
    packageId,
    catalogEntries: catalog.filter((entry) => entry.packageId === packageId).length,
    anchors: anchors.filter((anchor) => anchor.packageId === packageId).length,
    unplacedCatalogEntries: gaps.filter((gap) => gap.packageId === packageId && gap.kind === AuLinkGapKind.CatalogUnplaced).length,
    placementsWithoutCatalog: gaps.filter((gap) => gap.packageId === packageId && gap.kind === AuLinkGapKind.PlacementWithoutCatalog).length,
    duplicatePlacementGroups: gaps.filter((gap) => gap.packageId === packageId && gap.kind === AuLinkGapKind.DuplicatePlacement).length,
    multiFacetPlacementGroups: multiFacetPlacementGroupCount(anchors.filter((anchor) => anchor.packageId === packageId)),
  }));
}

function multiFacetPlacementGroupCount(anchors: readonly AuLinkAnchorRow[]): number {
  let count = 0;
  for (const entryAnchors of groupAnchorsByLinkId(anchors).values()) {
    const facets = new Set(entryAnchors.map((anchor) => auLinkFacetGroupKey(anchor.facet)));
    if (facets.size > 1) {
      count += 1;
    }
  }
  return count;
}

function groupAnchorsByLinkId(anchors: readonly AuLinkAnchorRow[]): Map<string, readonly AuLinkAnchorRow[]> {
  const grouped = new Map<string, AuLinkAnchorRow[]>();
  for (const anchor of anchors) {
    const existing = grouped.get(anchor.linkId);
    if (existing === undefined) {
      grouped.set(anchor.linkId, [anchor]);
    } else {
      existing.push(anchor);
    }
  }
  for (const value of grouped.values()) {
    value.sort(compareAnchors);
  }
  return grouped;
}

function groupAnchorsByFacet(anchors: readonly AuLinkAnchorRow[]): Map<string, readonly AuLinkAnchorRow[]> {
  const grouped = new Map<string, AuLinkAnchorRow[]>();
  for (const anchor of anchors) {
    const key = auLinkFacetGroupKey(anchor.facet);
    const existing = grouped.get(key);
    if (existing === undefined) {
      grouped.set(key, [anchor]);
    } else {
      existing.push(anchor);
    }
  }
  for (const value of grouped.values()) {
    value.sort(compareAnchors);
  }
  return grouped;
}

function auLinkFacetGroupKey(facet: AuLinkPlacementFacet | null): string {
  return facet ?? "unfaceted";
}

function auLinkFacetFromGroupKey(key: string): AuLinkPlacementFacet | null {
  return key === "unfaceted" ? null : auLinkPlacementFacetFromString(key);
}

function uniqueCatalogEntries(entries: readonly AuLinkCatalogEntry[]): readonly AuLinkCatalogEntry[] {
  const byId = new Map<string, AuLinkCatalogEntry>();
  for (const entry of entries) {
    byId.set(entry.linkId, entry);
  }
  return [...byId.values()];
}

function sourceRangeForSpan(file: SourceFileIdentity, span: SourceSpan): SourceRange {
  return sourceRangeFromFileSpan(file.repoPath, span);
}

function compareCatalogEntries(left: AuLinkCatalogEntry, right: AuLinkCatalogEntry): number {
  return left.linkId.localeCompare(right.linkId)
    || left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start;
}

function compareAnchors(left: AuLinkAnchorRow, right: AuLinkAnchorRow): number {
  return left.linkId.localeCompare(right.linkId)
    || auLinkFacetGroupKey(left.facet).localeCompare(auLinkFacetGroupKey(right.facet))
    || left.file.repoPath.localeCompare(right.file.repoPath)
    || left.decoratorSpan.start - right.decoratorSpan.start;
}

function compareGaps(left: AuLinkGapRow, right: AuLinkGapRow): number {
  return left.kind.localeCompare(right.kind)
    || left.linkId.localeCompare(right.linkId)
    || left.id.localeCompare(right.id);
}

function compareFrameworkTargets(left: AuLinkFrameworkTargetResolution, right: AuLinkFrameworkTargetResolution): number {
  return left.linkId.localeCompare(right.linkId)
    || left.status.localeCompare(right.status);
}

function compareFrameworkCandidates(left: AuLinkFrameworkTargetCandidate, right: AuLinkFrameworkTargetCandidate): number {
  return Number(right.exported) - Number(left.exported)
    || left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind);
}
