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
  /** Exactly one framework declaration matched the auLink package and symbol. */
  Resolved = "resolved",
  /** More than one framework declaration matched the auLink package and symbol. */
  Ambiguous = "ambiguous",
  /** The package was admitted but no declaration matched the symbol. */
  Unresolved = "unresolved",
  /** The auLink package prefix is not admitted in the current source project. */
  PackageUnadmitted = "package-unadmitted",
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
  const filteredAnchors = anchors.filter((anchor) => anchorMatches(anchor, filters));
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

/** Convert an auLink catalog row into a source range suitable for continuations. */
export function sourceRangeForAuLinkCatalog(entry: AuLinkCatalogEntry): SourceRange {
  return sourceRangeForSpan(entry.file, entry.span);
}

/** Convert an auLink anchor row into a source range suitable for continuations. */
export function sourceRangeForAuLinkAnchor(anchor: AuLinkAnchorRow): SourceRange {
  return sourceRangeForSpan(anchor.file, anchor.decoratorSpan);
}

/** Convert an auLink target declaration into a source range suitable for continuations. */
export function sourceRangeForAuLinkTarget(anchor: AuLinkAnchorRow): SourceRange {
  return sourceRangeForSpan(anchor.target.file, anchor.target.span);
}

/** Convert an auLink framework candidate into a source range suitable for continuations. */
export function sourceRangeForAuLinkFrameworkCandidate(candidate: AuLinkFrameworkTargetCandidate): SourceRange {
  return sourceRangeForSpan(candidate.file, candidate.span);
}

function collectAuLinkCatalog(
  project: SourceProject,
  frameworkTargetsByLinkId: ReadonlyMap<string, readonly AuLinkFrameworkTargetCandidate[]>,
  context: AuLinkBuildContext,
): readonly AuLinkCatalogEntry[] {
  const entries: AuLinkCatalogEntry[] = [];
  for (const sourceFile of project.ownedSourceFiles()) {
    const file = project.sourceFileIdentity(sourceFile);
    if (file === null || file.packageId !== SourcePackageId.SemanticRuntime || file.repoPath !== AU_LINK_SOURCE_FILE) {
      continue;
    }
    visit(sourceFile, (node) => {
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
        span: sourceSpan(sourceFile, node),
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
    const file = project.sourceFileIdentity(sourceFile);
    if (file === null || file.packageId !== SourcePackageId.SemanticRuntime) {
      continue;
    }
    const markerNames = auLinkMarkerNames(sourceFile);
    if (markerNames.size === 0) {
      continue;
    }
    visit(sourceFile, (node) => {
      if (!ts.isClassDeclaration(node)) {
        return;
      }
      for (const decorator of decoratorsFor(node)) {
        const id = auLinkIdFromDecorator(decorator, markerNames);
        if (id === null) {
          continue;
        }
        const parts = splitAuLinkId(id);
        const name = node.name?.text ?? null;
        anchors.push({
          id: `aulink-anchor:${id}:${file.repoPath}:${decorator.getStart(sourceFile)}:${decorator.getEnd()}`,
          ...parts,
          file,
          decoratorSpan: sourceSpan(sourceFile, decorator),
          target: {
            name,
            kind: SourceDeclarationKind.Class,
            file,
            span: sourceSpan(sourceFile, node),
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
    if (entryAnchors.length <= 1) {
      continue;
    }
    const parts = splitAuLinkId(linkId);
    gaps.push({
      id: `aulink-gap:${AuLinkGapKind.DuplicatePlacement}:${linkId}`,
      kind: AuLinkGapKind.DuplicatePlacement,
      ...parts,
      count: entryAnchors.length,
      ...(catalogById.get(linkId) === undefined ? {} : { catalog: catalogById.get(linkId) }),
      anchors: entryAnchors,
      frameworkTarget: entryAnchors[0]?.frameworkTarget ?? frameworkTargetForPartsFromLinkId(parts),
    });
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
  return {
    id: `aulink-framework-target:${parts.linkId}`,
    ...parts,
    status: frameworkTargetStatus(packageAdmitted, candidates.length),
    candidateCount: candidates.length,
    candidates,
  };
}

function frameworkTargetForPartsFromLinkId(parts: AuLinkIdParts): AuLinkFrameworkTargetResolution {
  return {
    id: `aulink-framework-target:${parts.linkId}`,
    ...parts,
    status: AuLinkFrameworkTargetStatus.PackageUnadmitted,
    candidateCount: 0,
    candidates: [],
  };
}

function frameworkTargetStatus(packageAdmitted: boolean, candidateCount: number): AuLinkFrameworkTargetStatus {
  if (!packageAdmitted) {
    return AuLinkFrameworkTargetStatus.PackageUnadmitted;
  }
  if (candidateCount === 1) {
    return AuLinkFrameworkTargetStatus.Resolved;
  }
  if (candidateCount > 1) {
    return AuLinkFrameworkTargetStatus.Ambiguous;
  }
  return AuLinkFrameworkTargetStatus.Unresolved;
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

function auLinkIdFromDecorator(decorator: ts.Decorator, markerNames: ReadonlySet<string>): string | null {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression)) {
    return null;
  }
  if (!isAuLinkCallee(expression.expression, markerNames)) {
    return null;
  }
  const argument = expression.arguments[0];
  return argument === undefined ? null : stringLiteralText(argument);
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
  return new Map(rows.map((row) => [declarationKey(row.file, row.span), row.symbolKey]));
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

function declarationKey(file: SourceFileIdentity, span: SourceSpan): string {
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
    && (filters.filePath === undefined || entry.file.repoPath === filters.filePath);
}

function anchorMatches(anchor: AuLinkAnchorRow, filters: AuLinkFilters): boolean {
  return idMatches(anchor, filters)
    && targetMatches(anchor.frameworkTarget, filters)
    && (filters.targetName === undefined || anchor.target.name === filters.targetName)
    && (filters.filePath === undefined || anchor.file.repoPath === filters.filePath);
}

function gapMatches(gap: AuLinkGapRow, filters: AuLinkFilters): boolean {
  if (!idMatches(gap, filters) || !targetMatches(gap.frameworkTarget, filters)) {
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
    && (filters.frameworkStatus === undefined || target.status === filters.frameworkStatus);
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
  return {
    catalogEntries: catalog.length,
    anchors: anchors.length,
    linkedIds: new Set(anchors.map((anchor) => anchor.linkId)).size,
    gaps: gaps.length,
    unplacedCatalogEntries,
    placementsWithoutCatalog,
    duplicatePlacementGroups,
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
  }));
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

function uniqueCatalogEntries(entries: readonly AuLinkCatalogEntry[]): readonly AuLinkCatalogEntry[] {
  const byId = new Map<string, AuLinkCatalogEntry>();
  for (const entry of entries) {
    byId.set(entry.linkId, entry);
  }
  return [...byId.values()];
}

function sourceRangeForSpan(file: SourceFileIdentity, span: SourceSpan): SourceRange {
  return {
    filePath: file.repoPath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  return sourceSpanFromOffsets(sourceFile, node.getStart(sourceFile), node.getEnd());
}

function sourceSpanFromOffsets(sourceFile: ts.SourceFile, start: number, end: number): SourceSpan {
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function compareCatalogEntries(left: AuLinkCatalogEntry, right: AuLinkCatalogEntry): number {
  return left.linkId.localeCompare(right.linkId)
    || left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start;
}

function compareAnchors(left: AuLinkAnchorRow, right: AuLinkAnchorRow): number {
  return left.linkId.localeCompare(right.linkId)
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

function visit(node: ts.Node, visitor: (node: ts.Node) => void): void {
  visitor(node);
  ts.forEachChild(node, (child) => visit(child, visitor));
}
