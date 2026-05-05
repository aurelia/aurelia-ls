import ts from "typescript";

import {
  readAureliaApiUsageIndex,
  type AureliaApiUsageIndex,
  type AureliaApiUsageRow,
} from "../../framework/index.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  declarationNameNode,
  memberSurfacesForDeclaration,
  readAuLinkModel,
  requiredSourceRangeForNode,
  SourcePackageId,
  SourceProjectMemo,
  sourceRangeForAuLinkFrameworkCandidate,
  sourceRangeForAuLinkTarget,
  sourceRangeKey,
  symbolForNode,
  type AuLinkAnchorRow,
  type AuLinkFilters,
  type AuLinkFrameworkTargetResolution,
  type SourceProject,
  type SourceSpan,
  type TypeScriptUsageCallAggregate,
  type TypeScriptUsageCallSite,
  type TypeScriptUsageOwner,
  type TypeScriptUsageRoleId,
  usageCallAggregate,
  usageCallForIdentifier,
  usageOwnerForNode,
  usageRoleForIdentifier,
  usageText,
  visitNode,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type { AuLinkMirrorFilters } from "./bridge-aulink-mirror.js";
import { countBy } from "./framework-support.js";

const productUsageMemo = new SourceProjectMemo<AuLinkProductUsageIndex>();
const frameworkTargetUsageMemo = new SourceProjectMemo<AuLinkFrameworkTargetUsageIndex>();

/** Exact side-local role observed at one bridge usage site. */
export type AuLinkUsageRoleId = TypeScriptUsageRoleId;

/** Side of the bridge that produced one usage row. */
export type AuLinkUsageSide = "framework" | "product";

/** Member-level side presence observed for one auLink target. */
export type AuLinkUsageMemberPresence =
  | "both"
  | "framework-only"
  | "product-only";

/** Compact rollup for comparing framework API usage with semantic-runtime mirror usage. */
export interface AuLinkUsageComparisonRollup {
  readonly linkCount: number;
  readonly placedLinkCount: number;
  readonly resolvedTargetCount: number;
  readonly linksWithFrameworkUsage: number;
  readonly linksWithProductUsage: number;
  readonly linksWithBothUsage: number;
  readonly linksWithFrameworkOnlyUsage: number;
  readonly linksWithProductOnlyUsage: number;
  readonly linksWithNoUsage: number;
  readonly linksWithMemberDivergence: number;
  readonly frameworkUsageCount: number;
  readonly frameworkMemberUsageCount: number;
  readonly productUsageCount: number;
  readonly productMemberUsageCount: number;
  readonly frameworkOnlyMemberNameCount: number;
  readonly productOnlyMemberNameCount: number;
  readonly packages: Readonly<Record<string, number>>;
  readonly productAreas: Readonly<Record<string, number>>;
  readonly frameworkUsageRoles: Readonly<Record<string, number>>;
  readonly productUsageRoles: Readonly<Record<string, number>>;
}

/** Per-auLink usage comparison row, keeping framework and product evidence separate. */
export interface AuLinkUsageComparisonRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly targetStatus: string;
  readonly placementCount: number;
  readonly frameworkCandidateCount: number;
  readonly productTargetNames: readonly string[];
  readonly productAreas: Readonly<Record<string, number>>;
  readonly frameworkUsageScope: "implementation-shape" | "subject" | "target-declaration" | "unresolved";
  readonly frameworkSubjectNames: readonly string[];
  readonly frameworkUsageCount: number;
  readonly frameworkMemberUsageCount: number;
  readonly productUsageCount: number;
  readonly productMemberUsageCount: number;
  readonly frameworkConsumerPackages: Readonly<Record<string, number>>;
  readonly productConsumerAreas: Readonly<Record<string, number>>;
  readonly frameworkUsageRoles: Readonly<Record<string, number>>;
  readonly productUsageRoles: Readonly<Record<string, number>>;
  readonly frameworkMemberNames: readonly string[];
  readonly productMemberNames: readonly string[];
  readonly sharedMemberNames: readonly string[];
  readonly frameworkOnlyMemberNames: readonly string[];
  readonly productOnlyMemberNames: readonly string[];
  readonly firstProductSource?: SourceRange;
  readonly firstFrameworkSource?: SourceRange;
  readonly summary: string;
}

/** Member-level comparison row between one framework target and product mirror target. */
export interface AuLinkUsageMemberComparisonRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly memberName: string;
  readonly presence: AuLinkUsageMemberPresence;
  readonly frameworkUsageCount: number;
  readonly productUsageCount: number;
  readonly frameworkUsageRoles: Readonly<Record<string, number>>;
  readonly productUsageRoles: Readonly<Record<string, number>>;
  readonly frameworkConsumerPackages: Readonly<Record<string, number>>;
  readonly productConsumerAreas: Readonly<Record<string, number>>;
  readonly firstFrameworkSource?: SourceRange;
  readonly firstProductSource?: SourceRange;
  readonly summary: string;
}

/** Exact source usage site on one side of an auLink comparison. */
export interface AuLinkUsageSiteRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly side: AuLinkUsageSide;
  readonly targetName?: string;
  readonly memberName?: string;
  readonly role: string;
  readonly consumerPackageId?: string | null;
  readonly consumerArea?: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly text: string;
  readonly summary: string;
  readonly owner: TypeScriptUsageOwner;
  readonly call?: TypeScriptUsageCallSite;
}

/** Member declaration surface comparison between an auLink framework target and product mirror. */
export interface AuLinkMemberSurfaceRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly memberName: string;
  readonly presence: AuLinkUsageMemberPresence;
  readonly frameworkDeclarationCount: number;
  readonly productDeclarationCount: number;
  readonly frameworkDeclarationKinds: Readonly<Record<string, number>>;
  readonly productDeclarationKinds: Readonly<Record<string, number>>;
  readonly frameworkUsageCount: number;
  readonly productUsageCount: number;
  readonly frameworkDeclarationSources: readonly SourceRange[];
  readonly productDeclarationSources: readonly SourceRange[];
  readonly firstFrameworkSource?: SourceRange;
  readonly firstProductSource?: SourceRange;
  readonly summary: string;
}

/** Usage-site grouping by the declaration owner that consumes one auLink target/member. */
export interface AuLinkUsageConsumerRow
  extends TypeScriptUsageCallAggregate {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly side: AuLinkUsageSide;
  readonly memberName?: string;
  readonly ownerKind: TypeScriptUsageOwner["ownerKind"];
  readonly ownerName: string;
  readonly ownerMemberKind?: TypeScriptUsageOwner["ownerMemberKind"];
  readonly ownerMemberName?: string;
  readonly consumerPackageId?: string | null;
  readonly consumerArea?: string;
  readonly usageCount: number;
  readonly usageRoles: Readonly<Record<string, number>>;
  readonly callCalleeNames: Readonly<Record<string, number>>;
  readonly callArgumentTexts: Readonly<Record<string, number>>;
  readonly callArgumentSymbolNames: Readonly<Record<string, number>>;
  readonly callArgumentFullyQualifiedNames: Readonly<Record<string, number>>;
  readonly firstSource: SourceRange;
  readonly ownerSource?: SourceRange;
  readonly ownerMemberSource?: SourceRange;
  readonly summary: string;
}

/** Full usage comparison model for bridge.aulink. */
export interface AuLinkUsageComparisonModel {
  readonly filters: AuLinkMirrorFilters;
  readonly rollup: AuLinkUsageComparisonRollup;
  readonly rows: readonly AuLinkUsageComparisonRow[];
  readonly surfaceRows: readonly AuLinkMemberSurfaceRow[];
  readonly memberRows: readonly AuLinkUsageMemberComparisonRow[];
  readonly siteRows: readonly AuLinkUsageSiteRow[];
  readonly consumerRows: readonly AuLinkUsageConsumerRow[];
}

export interface AuLinkUsageComparisonReadOptions {
  /** Scope exact substring query to link rows or let detail rows admit their owning link. */
  readonly queryScope?: "row" | "detail";
}

interface AuLinkProductUsageIndex {
  readonly usages: readonly AuLinkProductUsageRow[];
}

interface AuLinkFrameworkTargetUsageIndex {
  readonly usages: readonly AuLinkFrameworkTargetUsageRow[];
}

interface AuLinkComparableUsageRow {
  readonly id: string;
  readonly memberName?: string;
  readonly role: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly text: string;
  readonly owner: TypeScriptUsageOwner;
  readonly call?: TypeScriptUsageCallSite;
}

interface AuLinkFrameworkComparableUsageRow extends AuLinkComparableUsageRow {
  readonly consumerPackageId: string | null;
}

interface AuLinkProductComparableUsageRow extends AuLinkComparableUsageRow {
  readonly consumerArea: string;
}

interface AuLinkProductUsageRow extends AuLinkProductComparableUsageRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly targetName: string | null;
  readonly memberName?: string;
  readonly role: AuLinkUsageRoleId;
  readonly consumerArea: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly text: string;
}

interface AuLinkFrameworkTargetUsageRow extends AuLinkFrameworkComparableUsageRow {
  readonly id: string;
  readonly linkId: string;
  readonly packageId: string;
  readonly symbolName: string;
  readonly memberName?: string;
  readonly role: AuLinkUsageRoleId;
  readonly consumerPackageId: string | null;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly text: string;
}

interface ProductTargetSymbol {
  readonly anchor: AuLinkAnchorRow;
  readonly symbol: ts.Symbol;
}

interface ProductMemberSymbol {
  readonly anchor: AuLinkAnchorRow;
  readonly memberName: string;
  readonly symbol: ts.Symbol;
}

interface FrameworkTargetSymbol {
  readonly target: AuLinkFrameworkTargetResolution;
  readonly symbol: ts.Symbol;
}

interface FrameworkMemberSymbol {
  readonly target: AuLinkFrameworkTargetResolution;
  readonly memberName: string;
  readonly symbol: ts.Symbol;
}

interface FrameworkUsageScope {
  readonly kind: AuLinkUsageComparisonRow["frameworkUsageScope"];
  readonly subjectIds: ReadonlySet<string>;
  readonly subjectNames: readonly string[];
}

interface MemberSurfaceRef {
  readonly memberName: string;
  readonly declarationKind: string;
  readonly source: SourceRange;
}

/** Compare exact Aurelia-side API usage with exact semantic-runtime usage of auLink mirror targets. */
export function readAuLinkUsageComparisonModel(
  sourceProject: SourceProject,
  filters: AuLinkMirrorFilters = {},
  options: AuLinkUsageComparisonReadOptions = {},
): AuLinkUsageComparisonModel {
  const auLink = readAuLinkModel(sourceProject, auLinkFilters(filters));
  const frameworkApi = readAureliaApiUsageIndex(sourceProject);
  const frameworkTargetUsage = readAuLinkFrameworkTargetUsageIndex(sourceProject);
  const productUsage = readAuLinkProductUsageIndex(sourceProject);
  const anchorsByLinkId = groupBy(auLink.anchors, (anchor) => anchor.linkId);
  const frameworkTargetUsagesByLinkId = groupBy(
    frameworkTargetUsage.usages,
    (usage) => usage.linkId,
  );
  const productUsagesByLinkId = groupBy(productUsage.usages, (usage) => usage.linkId);

  const rows: AuLinkUsageComparisonRow[] = [];
  const surfaceRows: AuLinkMemberSurfaceRow[] = [];
  const memberRows: AuLinkUsageMemberComparisonRow[] = [];
  const siteRows: AuLinkUsageSiteRow[] = [];
  const consumerRows: AuLinkUsageConsumerRow[] = [];

  for (const target of auLink.frameworkTargets) {
    const anchors = anchorsByLinkId.get(target.linkId) ?? [];
    const frameworkScope = frameworkUsageScope(frameworkApi, target);
    const frameworkUsages = frameworkUsagesForScope(
      frameworkApi,
      frameworkScope,
      frameworkTargetUsagesByLinkId.get(target.linkId) ?? [],
    );
    const productUsages = productUsagesByLinkId.get(target.linkId) ?? [];
    const row = usageComparisonRow(
      frameworkScope,
      target,
      anchors,
      frameworkUsages,
      productUsages,
    );
    rows.push(row);
    const frameworkSites = frameworkUsages.map((usage) =>
      frameworkUsageSiteRow(target, usage),
    );
    const productSites = productUsages.map(productUsageSiteRow);
    siteRows.push(...frameworkSites, ...productSites);
    consumerRows.push(...usageConsumerRows(row, frameworkSites, productSites));
    const currentMemberRows = usageMemberComparisonRows(row, frameworkSites, productSites);
    memberRows.push(...currentMemberRows);
    surfaceRows.push(...memberSurfaceRows(
      sourceProject,
      frameworkApi,
      row,
      frameworkScope,
      target,
      anchors,
      currentMemberRows,
    ));
  }

  const visibleRows = rows
    .filter((row) =>
      usageComparisonRowMatches(
        row,
        filters,
        memberRows,
        siteRows,
        consumerRows,
        options.queryScope ?? "detail",
      ),
    )
    .sort(compareComparisonRows);
  const visibleLinkIds = new Set(visibleRows.map((row) => row.linkId));
  const visibleMemberRows = memberRows
    .filter((row) => visibleLinkIds.has(row.linkId))
    .filter((row) => usageMemberRowMatches(row, filters))
    .sort(compareMemberRows);
  const visibleSurfaceRows = surfaceRows
    .filter((row) => visibleLinkIds.has(row.linkId))
    .filter((row) => memberSurfaceRowMatches(row, filters))
    .sort(compareSurfaceRows);
  const visibleSiteRows = siteRows
    .filter((row) => visibleLinkIds.has(row.linkId))
    .filter((row) => usageSiteRowMatches(row, filters))
    .filter((row) => usageSiteMatchesMemberFilters(row, filters, visibleMemberRows))
    .sort(compareSiteRows);
  const visibleConsumerCandidates = shouldRegroupConsumerRows(filters)
    ? consumerRowsForVisibleSites(visibleRows, visibleSiteRows)
    : consumerRows.filter((row) => visibleLinkIds.has(row.linkId));
  const visibleConsumerRows = visibleConsumerCandidates
    .filter((row) => visibleLinkIds.has(row.linkId))
    .filter((row) => usageConsumerRowMatches(row, filters))
    .filter((row) => usageConsumerMatchesMemberFilters(row, filters, visibleMemberRows))
    .sort(compareConsumerRows);

  return {
    filters,
    rollup: usageComparisonRollup(visibleRows),
    rows: visibleRows,
    surfaceRows: visibleSurfaceRows,
    memberRows: visibleMemberRows,
    siteRows: visibleSiteRows,
    consumerRows: visibleConsumerRows,
  };
}

function readAuLinkProductUsageIndex(
  sourceProject: SourceProject,
): AuLinkProductUsageIndex {
  return productUsageMemo.read(sourceProject, () => buildProductUsageIndex(sourceProject));
}

function readAuLinkFrameworkTargetUsageIndex(
  sourceProject: SourceProject,
): AuLinkFrameworkTargetUsageIndex {
  return frameworkTargetUsageMemo.read(sourceProject, () =>
    buildFrameworkTargetUsageIndex(sourceProject),
  );
}

function buildProductUsageIndex(sourceProject: SourceProject): AuLinkProductUsageIndex {
  const checker = sourceProject.checker;
  const targetSymbols = new Map<ts.Symbol, ProductTargetSymbol[]>();
  const memberSymbols = new Map<ts.Symbol, ProductMemberSymbol[]>();
  const auLink = readAuLinkModel(sourceProject, {});

  for (const anchor of auLink.anchors) {
    const declaration = productAnchorDeclaration(sourceProject, anchor);
    if (declaration === null || declaration.name === undefined) {
      continue;
    }
    const symbol = symbolForNode(checker, declaration.name);
    if (symbol === null) {
      continue;
    }
    mapPush(targetSymbols, symbol, { anchor, symbol });
    for (const property of checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))) {
      mapPush(memberSymbols, property, {
        anchor,
        memberName: property.getName(),
        symbol: property,
      });
    }
  }

  const usages: AuLinkProductUsageRow[] = [];
  for (const sourceFile of sourceProject.ownedSourceFiles()) {
    const file = sourceProject.sourceFileIdentity(sourceFile);
    if (file === null || file.packageId !== SourcePackageId.SemanticRuntime) {
      continue;
    }
    visitNode(sourceFile, (node) => {
      if (!ts.isIdentifier(node)) {
        return;
      }
      const role = usageRoleForIdentifier(node);
      if (role === null) {
        return;
      }

      const memberTargets = productMemberTargetsForIdentifier(checker, node, memberSymbols);
      for (const target of memberTargets) {
        usages.push(productUsageRow(sourceProject, node, target.anchor, role, target.memberName));
      }

      const symbol = symbolForNode(checker, node);
      if (symbol === null) {
        return;
      }
      for (const target of targetSymbols.get(symbol) ?? []) {
        usages.push(productUsageRow(sourceProject, node, target.anchor, role));
      }
    });
  }

  return { usages: [...uniqueUsages(usages)].sort(compareProductUsages) };
}

function buildFrameworkTargetUsageIndex(
  sourceProject: SourceProject,
): AuLinkFrameworkTargetUsageIndex {
  const checker = sourceProject.checker;
  const frameworkPackageIds = new Set<string>(AURELIA_FRAMEWORK_PACKAGE_IDS);
  const targetSymbols = new Map<ts.Symbol, FrameworkTargetSymbol[]>();
  const memberSymbols = new Map<ts.Symbol, FrameworkMemberSymbol[]>();
  const auLink = readAuLinkModel(sourceProject, {});

  for (const target of auLink.frameworkTargets) {
    for (const candidate of target.candidates) {
      const declaration = frameworkCandidateDeclaration(sourceProject, candidate.file.repoPath, candidate.span);
      if (declaration === null) {
        continue;
      }
      const name = declarationNameNode(declaration) ?? declaration;
      const symbol = symbolForNode(checker, name);
      if (symbol === null) {
        continue;
      }
      mapPush(targetSymbols, symbol, { target, symbol });
      for (const property of checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))) {
        mapPush(memberSymbols, property, {
          target,
          memberName: property.getName(),
          symbol: property,
        });
      }
    }
  }

  const usages: AuLinkFrameworkTargetUsageRow[] = [];
  for (const sourceFile of sourceProject.ownedSourceFiles()) {
    const file = sourceProject.sourceFileIdentity(sourceFile);
    if (
      file === null ||
      file.packageId === null ||
      !frameworkPackageIds.has(file.packageId)
    ) {
      continue;
    }
    visitNode(sourceFile, (node) => {
      if (!ts.isIdentifier(node)) {
        return;
      }
      const role = usageRoleForIdentifier(node);
      if (role === null) {
        return;
      }

      const memberTargets = frameworkMemberTargetsForIdentifier(checker, node, memberSymbols);
      for (const target of memberTargets) {
        usages.push(frameworkTargetUsageRow(sourceProject, node, target.target, role, target.memberName));
      }

      const symbol = symbolForNode(checker, node);
      if (symbol === null) {
        return;
      }
      for (const target of targetSymbols.get(symbol) ?? []) {
        usages.push(frameworkTargetUsageRow(sourceProject, node, target.target, role));
      }
    });
  }

  return { usages: [...uniqueFrameworkTargetUsages(usages)].sort(compareFrameworkTargetUsages) };
}

function productMemberTargetsForIdentifier(
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  memberSymbols: ReadonlyMap<ts.Symbol, readonly ProductMemberSymbol[]>,
): readonly ProductMemberSymbol[] {
  if (
    !ts.isPropertyAccessExpression(identifier.parent) ||
    identifier.parent.name !== identifier
  ) {
    return [];
  }
  const symbol = symbolForNode(checker, identifier);
  return symbol === null ? [] : memberSymbols.get(symbol) ?? [];
}

function frameworkMemberTargetsForIdentifier(
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  memberSymbols: ReadonlyMap<ts.Symbol, readonly FrameworkMemberSymbol[]>,
): readonly FrameworkMemberSymbol[] {
  if (
    !ts.isPropertyAccessExpression(identifier.parent) ||
    identifier.parent.name !== identifier
  ) {
    return [];
  }
  const symbol = symbolForNode(checker, identifier);
  return symbol === null ? [] : memberSymbols.get(symbol) ?? [];
}

function productUsageRow(
  sourceProject: SourceProject,
  identifier: ts.Identifier,
  anchor: AuLinkAnchorRow,
  role: AuLinkUsageRoleId,
  memberName?: string,
): AuLinkProductUsageRow {
  const sourceFile = identifier.getSourceFile();
  const source = requiredSourceRangeForNode(sourceProject, identifier);
  const consumerArea = productAreaForPath(source.filePath);
  const owner = usageOwnerForNode(sourceProject, identifier);
  const call = usageCallForIdentifier(sourceProject.checker, identifier);
  return {
    id: `aulink-product-usage:${anchor.linkId}:${source.filePath}:${identifier.getStart(sourceFile)}:${memberName ?? "<target>"}`,
    linkId: anchor.linkId,
    packageId: anchor.packageId,
    symbolName: anchor.symbolName,
    targetName: anchor.target.name,
    ...(memberName === undefined ? {} : { memberName }),
    role,
    consumerArea,
    filePath: source.filePath,
    source,
    text: usageText(identifier),
    owner,
    ...(call === null ? {} : { call }),
  };
}

function frameworkTargetUsageRow(
  sourceProject: SourceProject,
  identifier: ts.Identifier,
  target: AuLinkFrameworkTargetResolution,
  role: AuLinkUsageRoleId,
  memberName?: string,
): AuLinkFrameworkTargetUsageRow {
  const sourceFile = identifier.getSourceFile();
  const source = requiredSourceRangeForNode(sourceProject, identifier);
  const consumerPackageId = sourceProject.packageForFileName(sourceFile.fileName)?.id ?? null;
  const owner = usageOwnerForNode(sourceProject, identifier);
  const call = usageCallForIdentifier(sourceProject.checker, identifier);
  return {
    id: `aulink-framework-target-usage:${target.linkId}:${source.filePath}:${identifier.getStart(sourceFile)}:${memberName ?? "<target>"}`,
    linkId: target.linkId,
    packageId: target.packageId,
    symbolName: target.symbolName,
    ...(memberName === undefined ? {} : { memberName }),
    role,
    consumerPackageId,
    filePath: source.filePath,
    source,
    text: usageText(identifier),
    owner,
    ...(call === null ? {} : { call }),
  };
}

function usageComparisonRow(
  frameworkScope: FrameworkUsageScope,
  target: AuLinkFrameworkTargetResolution,
  anchors: readonly AuLinkAnchorRow[],
  frameworkUsages: readonly AuLinkFrameworkComparableUsageRow[],
  productUsages: readonly AuLinkProductComparableUsageRow[],
): AuLinkUsageComparisonRow {
  const effectiveFrameworkScope =
    frameworkScope.kind === "unresolved" && frameworkUsages.length > 0
      ? {
          kind: "target-declaration" as const,
          subjectNames: target.candidates.map((candidate) => candidate.symbolName),
        }
      : frameworkScope;
  const frameworkMemberNames = uniqueSorted(
    frameworkUsages.flatMap((usage) =>
      usage.memberName === undefined ? [] : [usage.memberName],
    ),
  );
  const productMemberNames = uniqueSorted(
    productUsages.flatMap((usage) =>
      usage.memberName === undefined ? [] : [usage.memberName],
    ),
  );
  const sharedMemberNames = intersection(frameworkMemberNames, productMemberNames);
  const frameworkOnlyMemberNames = difference(frameworkMemberNames, productMemberNames);
  const productOnlyMemberNames = difference(productMemberNames, frameworkMemberNames);
  const firstAnchor = anchors[0];
  const firstCandidate = target.candidates[0];
  const productTargetNames = uniqueSorted(
    anchors.flatMap((anchor) => anchor.target.name === null ? [] : [anchor.target.name]),
  );

  return {
    id: `aulink-usage-comparison:${target.linkId}`,
    linkId: target.linkId,
    packageId: target.packageId,
    symbolName: target.symbolName,
    targetStatus: target.status,
    placementCount: anchors.length,
    frameworkCandidateCount: target.candidates.length,
    productTargetNames,
    productAreas: countBy(anchors, (anchor) =>
      productAreaForPath(sourceRangeForAuLinkTarget(anchor).filePath),
    ),
    frameworkUsageScope: effectiveFrameworkScope.kind,
    frameworkSubjectNames: uniqueSorted(effectiveFrameworkScope.subjectNames),
    frameworkUsageCount: frameworkUsages.length,
    frameworkMemberUsageCount: frameworkUsages.filter((usage) => usage.memberName !== undefined).length,
    productUsageCount: productUsages.length,
    productMemberUsageCount: productUsages.filter((usage) => usage.memberName !== undefined).length,
    frameworkConsumerPackages: countBy(frameworkUsages, (usage) => usage.consumerPackageId ?? "<external>"),
    productConsumerAreas: countBy(productUsages, (usage) => usage.consumerArea),
    frameworkUsageRoles: countBy(frameworkUsages, (usage) => usage.role),
    productUsageRoles: countBy(productUsages, (usage) => usage.role),
    frameworkMemberNames,
    productMemberNames,
    sharedMemberNames,
    frameworkOnlyMemberNames,
    productOnlyMemberNames,
    ...(firstAnchor === undefined
      ? {}
      : { firstProductSource: sourceRangeForAuLinkTarget(firstAnchor) }),
    ...(firstCandidate === undefined
      ? {}
      : { firstFrameworkSource: sourceRangeForAuLinkFrameworkCandidate(firstCandidate) }),
    summary: `${target.linkId} has ${frameworkUsages.length} Aurelia-side usage(s), ${productUsages.length} semantic-runtime usage(s), ${sharedMemberNames.length} shared member name(s), ${frameworkOnlyMemberNames.length} framework-only member name(s), and ${productOnlyMemberNames.length} product-only member name(s).`,
  };
}

function frameworkUsageScope(
  frameworkApi: AureliaApiUsageIndex,
  target: AuLinkFrameworkTargetResolution,
): FrameworkUsageScope {
  const implementation = frameworkApi.implementationShapes.find(
    (row) =>
      row.packageId === target.packageId &&
      row.implementationName === target.symbolName,
  );
  if (implementation !== undefined) {
    return {
      kind: "implementation-shape",
      subjectIds: new Set(implementation.shapeSubjectIds),
      subjectNames: implementation.shapeSubjectNames,
    };
  }
  const subjects = frameworkApi.subjects.filter(
    (row) => row.packageId === target.packageId && row.name === target.symbolName,
  );
  if (subjects.length === 0) {
    return {
      kind: "unresolved",
      subjectIds: new Set(),
      subjectNames: [],
    };
  }
  return {
    kind: "subject",
    subjectIds: new Set(subjects.map((row) => row.id)),
    subjectNames: uniqueSorted(subjects.map((row) => row.name)),
  };
}

function frameworkUsagesForScope(
  frameworkApi: AureliaApiUsageIndex,
  scope: FrameworkUsageScope,
  targetUsages: readonly AuLinkFrameworkTargetUsageRow[],
): readonly AuLinkFrameworkComparableUsageRow[] {
  if (scope.kind === "unresolved") {
    return targetUsages.filter((usage) =>
      usage.consumerPackageId !== SourcePackageId.Atlas &&
      usage.consumerPackageId !== SourcePackageId.SemanticRuntime,
    );
  }
  const apiUsages = frameworkApi.usages.filter((usage) =>
    frameworkUsageMatchesScope(usage, scope),
  );
  return apiUsages.length > 0
    ? apiUsages
    : targetUsages.filter((usage) =>
        usage.consumerPackageId !== SourcePackageId.Atlas &&
        usage.consumerPackageId !== SourcePackageId.SemanticRuntime,
      );
}

function frameworkUsageMatchesScope(
  usage: AureliaApiUsageRow,
  scope: FrameworkUsageScope,
): boolean {
  return (
    scope.subjectIds.has(usage.subjectId) &&
    usage.consumerPackageId !== SourcePackageId.Atlas &&
    usage.consumerPackageId !== SourcePackageId.SemanticRuntime
  );
}

function usageComparisonRollup(
  rows: readonly AuLinkUsageComparisonRow[],
): AuLinkUsageComparisonRollup {
  return {
    linkCount: rows.length,
    placedLinkCount: rows.filter((row) => row.placementCount > 0).length,
    resolvedTargetCount: rows.filter((row) => row.targetStatus === "resolved").length,
    linksWithFrameworkUsage: rows.filter((row) => row.frameworkUsageCount > 0).length,
    linksWithProductUsage: rows.filter((row) => row.productUsageCount > 0).length,
    linksWithBothUsage: rows.filter((row) => row.frameworkUsageCount > 0 && row.productUsageCount > 0).length,
    linksWithFrameworkOnlyUsage: rows.filter((row) => row.frameworkUsageCount > 0 && row.productUsageCount === 0).length,
    linksWithProductOnlyUsage: rows.filter((row) => row.frameworkUsageCount === 0 && row.productUsageCount > 0).length,
    linksWithNoUsage: rows.filter((row) => row.frameworkUsageCount === 0 && row.productUsageCount === 0).length,
    linksWithMemberDivergence: rows.filter(
      (row) => row.frameworkOnlyMemberNames.length > 0 || row.productOnlyMemberNames.length > 0,
    ).length,
    frameworkUsageCount: sum(rows, (row) => row.frameworkUsageCount),
    frameworkMemberUsageCount: sum(rows, (row) => row.frameworkMemberUsageCount),
    productUsageCount: sum(rows, (row) => row.productUsageCount),
    productMemberUsageCount: sum(rows, (row) => row.productMemberUsageCount),
    frameworkOnlyMemberNameCount: sum(rows, (row) => row.frameworkOnlyMemberNames.length),
    productOnlyMemberNameCount: sum(rows, (row) => row.productOnlyMemberNames.length),
    packages: countBy(rows, (row) => row.packageId),
    productAreas: countRecordKeys(rows, (row) => row.productAreas),
    frameworkUsageRoles: countRecordKeys(rows, (row) => row.frameworkUsageRoles),
    productUsageRoles: countRecordKeys(rows, (row) => row.productUsageRoles),
  };
}

function auLinkFilters(filters: AuLinkMirrorFilters): AuLinkFilters {
  return {
    ...(filters.linkId === undefined ? {} : { linkId: filters.linkId }),
    ...(filters.packageId === undefined ? {} : { packageId: filters.packageId }),
    ...(filters.symbolName === undefined ? {} : { symbolName: filters.symbolName }),
    ...(filters.targetName === undefined ? {} : { targetName: filters.targetName }),
    ...(filters.filePath === undefined ? {} : { filePath: filters.filePath }),
    ...(filters.frameworkStatus === undefined ? {} : { frameworkStatus: filters.frameworkStatus }),
  };
}

function usageComparisonRowMatches(
  row: AuLinkUsageComparisonRow,
  filters: AuLinkMirrorFilters,
  memberRows: readonly AuLinkUsageMemberComparisonRow[],
  siteRows: readonly AuLinkUsageSiteRow[],
  consumerRows: readonly AuLinkUsageConsumerRow[],
  queryScope: "row" | "detail",
): boolean {
  const query = filters.query;
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.symbolName === undefined || row.symbolName === filters.symbolName) &&
    (filters.frameworkStatus === undefined || row.targetStatus === filters.frameworkStatus) &&
    (filters.targetName === undefined || row.productTargetNames.includes(filters.targetName)) &&
    (filters.productArea === undefined || row.productAreas[filters.productArea] !== undefined) &&
    (filters.usageRole === undefined ||
      row.frameworkUsageRoles[filters.usageRole] !== undefined ||
      row.productUsageRoles[filters.usageRole] !== undefined) &&
    (filters.memberName === undefined ||
      row.frameworkMemberNames.includes(filters.memberName) ||
      row.productMemberNames.includes(filters.memberName)) &&
    (filters.side === undefined || usageComparisonHasSide(row, filters.side)) &&
    (filters.presence === undefined ||
      memberRows.some(
        (memberRow) =>
          memberRow.linkId === row.linkId &&
          memberRow.presence === filters.presence,
      )) &&
    (filters.ownerName === undefined ||
      consumerRows.some(
        (consumerRow) =>
          consumerRow.linkId === row.linkId &&
          consumerRow.ownerName === filters.ownerName,
      )) &&
    (filters.ownerKind === undefined ||
      consumerRows.some(
        (consumerRow) =>
          consumerRow.linkId === row.linkId &&
          consumerRow.ownerKind === filters.ownerKind,
      )) &&
    (filters.ownerMemberName === undefined ||
      consumerRows.some(
        (consumerRow) =>
          consumerRow.linkId === row.linkId &&
          consumerRow.ownerMemberName === filters.ownerMemberName,
      )) &&
    (filters.callCalleeName === undefined ||
      siteRows.some((siteRow) =>
        siteRow.linkId === row.linkId &&
        siteRow.call?.calleeName === filters.callCalleeName,
      )) &&
    (filters.callArgumentText === undefined ||
      siteRows.some((siteRow) =>
        siteRow.linkId === row.linkId &&
        siteRow.call?.arguments.some((argument) =>
          argument.text === filters.callArgumentText,
        ) === true,
      )) &&
    (filters.callArgumentSymbolName === undefined ||
      siteRows.some((siteRow) =>
        siteRow.linkId === row.linkId &&
        siteRow.call?.arguments.some((argument) =>
          argument.symbolName === filters.callArgumentSymbolName,
        ) === true,
      )) &&
    (filters.callArgumentFullyQualifiedName === undefined ||
      siteRows.some((siteRow) =>
        siteRow.linkId === row.linkId &&
        siteRow.call?.arguments.some((argument) =>
          argument.fullyQualifiedName === filters.callArgumentFullyQualifiedName,
        ) === true,
      )) &&
    (query === undefined ||
      usageComparisonQueryMatches(
        row,
        memberRows,
        siteRows,
        consumerRows,
        query,
        queryScope,
      ))
  );
}

function usageComparisonQueryMatches(
  row: AuLinkUsageComparisonRow,
  memberRows: readonly AuLinkUsageMemberComparisonRow[],
  siteRows: readonly AuLinkUsageSiteRow[],
  consumerRows: readonly AuLinkUsageConsumerRow[],
  query: string,
  queryScope: "row" | "detail",
): boolean {
  if (usageComparisonContains(row, query)) {
    return true;
  }
  if (queryScope === "row") {
    return false;
  }
  return (
    memberRows.some(
      (memberRow) =>
        memberRow.linkId === row.linkId &&
        usageMemberContains(memberRow, query),
    ) ||
    siteRows.some(
      (siteRow) =>
        siteRow.linkId === row.linkId &&
        usageSiteContains(siteRow, query),
    ) ||
    consumerRows.some(
      (consumerRow) =>
        consumerRow.linkId === row.linkId &&
        usageConsumerContains(consumerRow, query),
    )
  );
}

function usageComparisonContains(
  row: AuLinkUsageComparisonRow,
  query: string,
): boolean {
  return [
    row.linkId,
    row.packageId,
    row.symbolName,
    row.summary,
    row.firstProductSource?.filePath,
    row.firstFrameworkSource?.filePath,
    ...row.productTargetNames,
    ...Object.keys(row.productAreas),
  ].some((value) => value?.includes(query) === true);
}

function frameworkUsageSiteRow(
  target: AuLinkFrameworkTargetResolution,
  usage: AuLinkFrameworkComparableUsageRow,
): AuLinkUsageSiteRow {
  return {
    id: `aulink-usage-site:framework:${usage.id}`,
    linkId: target.linkId,
    packageId: target.packageId,
    symbolName: target.symbolName,
    side: "framework",
    targetName: target.symbolName,
    ...(usage.memberName === undefined ? {} : { memberName: usage.memberName }),
    role: usage.role,
    consumerPackageId: usage.consumerPackageId,
    filePath: usage.filePath,
    source: usage.source,
    text: usage.text,
    owner: usage.owner,
    ...(usage.call === undefined ? {} : { call: usage.call }),
    summary: `${target.linkId} framework ${usage.role} ${usage.text} in ${usage.consumerPackageId ?? "<external>"}.`,
  };
}

function productUsageSiteRow(usage: AuLinkProductUsageRow): AuLinkUsageSiteRow {
  return {
    id: `aulink-usage-site:product:${usage.id}`,
    linkId: usage.linkId,
    packageId: usage.packageId,
    symbolName: usage.symbolName,
    side: "product",
    ...(usage.targetName === null ? {} : { targetName: usage.targetName }),
    ...(usage.memberName === undefined ? {} : { memberName: usage.memberName }),
    role: usage.role,
    consumerArea: usage.consumerArea,
    filePath: usage.filePath,
    source: usage.source,
    text: usage.text,
    owner: usage.owner,
    ...(usage.call === undefined ? {} : { call: usage.call }),
    summary: `${usage.linkId} product ${usage.role} ${usage.text} in ${usage.consumerArea}.`,
  };
}

function usageMemberComparisonRows(
  row: AuLinkUsageComparisonRow,
  frameworkSites: readonly AuLinkUsageSiteRow[],
  productSites: readonly AuLinkUsageSiteRow[],
): readonly AuLinkUsageMemberComparisonRow[] {
  const memberNames = uniqueSorted([
    ...frameworkSites.flatMap((site) =>
      site.memberName === undefined ? [] : [site.memberName],
    ),
    ...productSites.flatMap((site) =>
      site.memberName === undefined ? [] : [site.memberName],
    ),
  ]);
  return memberNames.map((memberName) => {
    const frameworkMemberSites = frameworkSites.filter(
      (site) => site.memberName === memberName,
    );
    const productMemberSites = productSites.filter(
      (site) => site.memberName === memberName,
    );
    const presence = usageMemberPresence(
      frameworkMemberSites.length,
      productMemberSites.length,
    );
    return {
      id: `aulink-usage-member:${row.linkId}:${memberName}`,
      linkId: row.linkId,
      packageId: row.packageId,
      symbolName: row.symbolName,
      memberName,
      presence,
      frameworkUsageCount: frameworkMemberSites.length,
      productUsageCount: productMemberSites.length,
      frameworkUsageRoles: countBy(frameworkMemberSites, (site) => site.role),
      productUsageRoles: countBy(productMemberSites, (site) => site.role),
      frameworkConsumerPackages: countBy(
        frameworkMemberSites,
        (site) => site.consumerPackageId ?? "<external>",
      ),
      productConsumerAreas: countBy(
        productMemberSites,
        (site) => site.consumerArea ?? "unknown",
      ),
      ...(frameworkMemberSites[0] === undefined
        ? {}
        : { firstFrameworkSource: frameworkMemberSites[0].source }),
      ...(productMemberSites[0] === undefined
        ? {}
        : { firstProductSource: productMemberSites[0].source }),
      summary: `${row.linkId}.${memberName} is ${presence}: ${frameworkMemberSites.length} framework usage site(s), ${productMemberSites.length} product usage site(s).`,
    };
  });
}

function usageConsumerRows(
  row: AuLinkUsageComparisonRow,
  frameworkSites: readonly AuLinkUsageSiteRow[],
  productSites: readonly AuLinkUsageSiteRow[],
): readonly AuLinkUsageConsumerRow[] {
  return [...groupBy(
    [...frameworkSites, ...productSites],
    usageConsumerGroupKey,
  ).values()].flatMap((sites) => usageConsumerRow(row, sites));
}

function consumerRowsForVisibleSites(
  rows: readonly AuLinkUsageComparisonRow[],
  siteRows: readonly AuLinkUsageSiteRow[],
): readonly AuLinkUsageConsumerRow[] {
  const sitesByLinkId = groupBy(siteRows, (row) => row.linkId);
  return rows.flatMap((row) => {
    const sites = sitesByLinkId.get(row.linkId) ?? [];
    return usageConsumerRows(
      row,
      sites.filter((site) => site.side === "framework"),
      sites.filter((site) => site.side === "product"),
    );
  });
}

function shouldRegroupConsumerRows(filters: AuLinkMirrorFilters): boolean {
  return filters.memberName !== undefined ||
    filters.side !== undefined ||
    filters.productArea !== undefined ||
    filters.usageRole !== undefined ||
    filters.ownerName !== undefined ||
    filters.ownerKind !== undefined ||
    filters.ownerMemberName !== undefined ||
    filters.presence !== undefined ||
    filters.callCalleeName !== undefined ||
    hasCallArgumentFilter(filters);
}

function usageConsumerRow(
  row: AuLinkUsageComparisonRow,
  sites: readonly AuLinkUsageSiteRow[],
): readonly AuLinkUsageConsumerRow[] {
  const first = sites[0];
  if (first === undefined) {
    return [];
  }
  const owner = first.owner;
  return [{
    id: [
      "aulink-usage-consumer",
      first.side,
      row.linkId,
      first.memberName ?? "<target>",
      owner.ownerKind,
      owner.ownerName,
      owner.ownerMemberName ?? "<owner>",
    ].join(":"),
    linkId: row.linkId,
    packageId: row.packageId,
    symbolName: row.symbolName,
    side: first.side,
    ...(first.memberName === undefined ? {} : { memberName: first.memberName }),
    ownerKind: owner.ownerKind,
    ownerName: owner.ownerName,
    ...(owner.ownerMemberKind === undefined ? {} : { ownerMemberKind: owner.ownerMemberKind }),
    ...(owner.ownerMemberName === undefined ? {} : { ownerMemberName: owner.ownerMemberName }),
    ...(first.consumerPackageId === undefined
      ? {}
      : { consumerPackageId: first.consumerPackageId }),
    ...(first.consumerArea === undefined ? {} : { consumerArea: first.consumerArea }),
    usageCount: sites.length,
    usageRoles: countBy(sites, (site) => site.role),
    ...usageCallAggregate(sites),
    firstSource: first.source,
    ...(owner.ownerSource === undefined ? {} : { ownerSource: owner.ownerSource }),
    ...(owner.ownerMemberSource === undefined
      ? {}
      : { ownerMemberSource: owner.ownerMemberSource }),
    summary: `${row.linkId}${first.memberName === undefined ? "" : `.${first.memberName}`} has ${sites.length} ${first.side} usage site(s) owned by ${owner.ownerName}${owner.ownerMemberName === undefined ? "" : `.${owner.ownerMemberName}`}.`,
  }];
}

function usageConsumerGroupKey(site: AuLinkUsageSiteRow): string {
  return [
    site.side,
    site.linkId,
    site.memberName ?? "<target>",
    site.owner.ownerKind,
    site.owner.ownerName,
    site.owner.ownerMemberName ?? "<owner>",
    site.consumerPackageId ?? "",
    site.consumerArea ?? "",
  ].join("\0");
}

function memberSurfaceRows(
  sourceProject: SourceProject,
  frameworkApi: AureliaApiUsageIndex,
  row: AuLinkUsageComparisonRow,
  frameworkScope: FrameworkUsageScope,
  target: AuLinkFrameworkTargetResolution,
  anchors: readonly AuLinkAnchorRow[],
  usageRows: readonly AuLinkUsageMemberComparisonRow[],
): readonly AuLinkMemberSurfaceRow[] {
  const frameworkRefs = frameworkMemberSurfaceRefs(
    sourceProject,
    frameworkApi,
    frameworkScope,
    target,
  );
  const productRefs = productMemberSurfaceRefs(sourceProject, anchors);
  const usageByMember = new Map(usageRows.map((usage) => [usage.memberName, usage]));
  const memberNames = uniqueSorted([
    ...frameworkRefs.map((ref) => ref.memberName),
    ...productRefs.map((ref) => ref.memberName),
  ]);

  return memberNames.map((memberName) => {
    const frameworkMemberRefs = frameworkRefs.filter((ref) => ref.memberName === memberName);
    const productMemberRefs = productRefs.filter((ref) => ref.memberName === memberName);
    const frameworkSources = uniqueSourceRanges(frameworkMemberRefs.map((ref) => ref.source));
    const productSources = uniqueSourceRanges(productMemberRefs.map((ref) => ref.source));
    const presence = usageMemberPresence(
      frameworkSources.length,
      productSources.length,
    );
    const usage = usageByMember.get(memberName);
    return {
      id: `aulink-member-surface:${row.linkId}:${memberName}`,
      linkId: row.linkId,
      packageId: row.packageId,
      symbolName: row.symbolName,
      memberName,
      presence,
      frameworkDeclarationCount: frameworkSources.length,
      productDeclarationCount: productSources.length,
      frameworkDeclarationKinds: countBy(frameworkMemberRefs, (ref) => ref.declarationKind),
      productDeclarationKinds: countBy(productMemberRefs, (ref) => ref.declarationKind),
      frameworkUsageCount: usage?.frameworkUsageCount ?? 0,
      productUsageCount: usage?.productUsageCount ?? 0,
      frameworkDeclarationSources: frameworkSources,
      productDeclarationSources: productSources,
      ...(frameworkSources[0] === undefined
        ? {}
        : { firstFrameworkSource: frameworkSources[0] }),
      ...(productSources[0] === undefined
        ? {}
        : { firstProductSource: productSources[0] }),
      summary: `${row.linkId}.${memberName} member surface is ${presence}: ${frameworkSources.length} framework declaration(s), ${productSources.length} product declaration(s), ${usage?.frameworkUsageCount ?? 0} framework usage site(s), ${usage?.productUsageCount ?? 0} product usage site(s).`,
    };
  });
}

function uniqueSourceRanges(sources: readonly SourceRange[]): readonly SourceRange[] {
  const byKey = new Map<string, SourceRange>();
  for (const source of sources) {
    byKey.set(sourceRangeKey(source), source);
  }
  return [...byKey.values()];
}

function frameworkMemberSurfaceRefs(
  sourceProject: SourceProject,
  frameworkApi: AureliaApiUsageIndex,
  scope: FrameworkUsageScope,
  target: AuLinkFrameworkTargetResolution,
): readonly MemberSurfaceRef[] {
  if (scope.kind !== "unresolved") {
    return frameworkApi.memberSlots
      .filter((slot) => scope.subjectIds.has(slot.subjectId))
      .flatMap((slot) =>
        slot.declarations.map((declaration) => ({
          memberName: slot.name,
          declarationKind: slot.slotKind,
          source: declaration.source,
        })),
      );
  }

  const refs: MemberSurfaceRef[] = [];
  for (const candidate of target.candidates) {
    const declaration = frameworkCandidateDeclaration(
      sourceProject,
      candidate.file.repoPath,
      candidate.span,
    );
    if (declaration === null) {
      continue;
    }
    for (const member of memberSurfacesForDeclaration(declaration)) {
      refs.push({
        memberName: member.name,
        declarationKind: member.declarationKind,
        source: requiredSourceRangeForNode(sourceProject, member.node),
      });
    }
  }
  return refs;
}

function productMemberSurfaceRefs(
  sourceProject: SourceProject,
  anchors: readonly AuLinkAnchorRow[],
): readonly MemberSurfaceRef[] {
  const refs: MemberSurfaceRef[] = [];
  for (const anchor of anchors) {
    const declaration = productAnchorDeclaration(sourceProject, anchor);
    if (declaration === null) {
      continue;
    }
    for (const member of memberSurfacesForDeclaration(declaration)) {
      refs.push({
        memberName: member.name,
        declarationKind: member.declarationKind,
        source: requiredSourceRangeForNode(sourceProject, member.node),
      });
    }
  }
  return refs;
}

function usageMemberPresence(
  frameworkCount: number,
  productCount: number,
): AuLinkUsageMemberPresence {
  if (frameworkCount > 0 && productCount > 0) {
    return "both";
  }
  return frameworkCount > 0 ? "framework-only" : "product-only";
}

function usageComparisonHasSide(
  row: AuLinkUsageComparisonRow,
  side: string,
): boolean {
  if (side === "framework") {
    return row.frameworkUsageCount > 0;
  }
  if (side === "product") {
    return row.productUsageCount > 0;
  }
  return false;
}

function usageMemberRowMatches(
  row: AuLinkUsageMemberComparisonRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.symbolName === undefined || row.symbolName === filters.symbolName) &&
    (filters.memberName === undefined || row.memberName === filters.memberName) &&
    (filters.presence === undefined || row.presence === filters.presence) &&
    (filters.side === undefined || usageMemberHasSide(row, filters.side)) &&
    (filters.usageRole === undefined ||
      row.frameworkUsageRoles[filters.usageRole] !== undefined ||
      row.productUsageRoles[filters.usageRole] !== undefined) &&
    (filters.query === undefined || usageMemberContains(row, filters.query))
  );
}

function usageMemberHasSide(
  row: AuLinkUsageMemberComparisonRow,
  side: string,
): boolean {
  if (side === "framework") {
    return row.frameworkUsageCount > 0;
  }
  if (side === "product") {
    return row.productUsageCount > 0;
  }
  return false;
}

function usageMemberContains(
  row: AuLinkUsageMemberComparisonRow,
  query: string,
): boolean {
  return [
    row.id,
    row.linkId,
    row.packageId,
    row.symbolName,
    row.memberName,
    row.presence,
    row.summary,
    row.firstFrameworkSource?.filePath,
    row.firstProductSource?.filePath,
    ...Object.keys(row.frameworkUsageRoles),
    ...Object.keys(row.productUsageRoles),
    ...Object.keys(row.frameworkConsumerPackages),
    ...Object.keys(row.productConsumerAreas),
  ].some((value) => value?.includes(query) === true);
}

function memberSurfaceRowMatches(
  row: AuLinkMemberSurfaceRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.symbolName === undefined || row.symbolName === filters.symbolName) &&
    (filters.memberName === undefined || row.memberName === filters.memberName) &&
    (filters.presence === undefined || row.presence === filters.presence) &&
    (filters.side === undefined || memberSurfaceHasSide(row, filters.side)) &&
    (filters.query === undefined || memberSurfaceContains(row, filters.query))
  );
}

function memberSurfaceHasSide(row: AuLinkMemberSurfaceRow, side: string): boolean {
  if (side === "framework") {
    return row.frameworkDeclarationCount > 0;
  }
  if (side === "product") {
    return row.productDeclarationCount > 0;
  }
  return false;
}

function memberSurfaceContains(row: AuLinkMemberSurfaceRow, query: string): boolean {
  return [
    row.id,
    row.linkId,
    row.packageId,
    row.symbolName,
    row.memberName,
    row.presence,
    row.summary,
    row.firstFrameworkSource?.filePath,
    row.firstProductSource?.filePath,
  ].some((value) => value?.includes(query) === true);
}

function usageSiteRowMatches(
  row: AuLinkUsageSiteRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.symbolName === undefined || row.symbolName === filters.symbolName) &&
    (filters.memberName === undefined || row.memberName === filters.memberName) &&
    (filters.side === undefined || row.side === filters.side) &&
    (filters.productArea === undefined || row.consumerArea === filters.productArea) &&
    (filters.usageRole === undefined || row.role === filters.usageRole) &&
    (filters.ownerName === undefined || row.owner.ownerName === filters.ownerName) &&
    (filters.ownerKind === undefined || row.owner.ownerKind === filters.ownerKind) &&
    (filters.ownerMemberName === undefined ||
      row.owner.ownerMemberName === filters.ownerMemberName) &&
    usageCallMatches(row, filters) &&
    (filters.query === undefined || usageSiteContains(row, filters.query))
  );
}

function usageCallMatches(
  row: AuLinkUsageSiteRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.callCalleeName === undefined ||
      row.call?.calleeName === filters.callCalleeName) &&
    (hasCallArgumentFilter(filters)
      ? row.call?.arguments.some((argument) =>
          (filters.callArgumentText === undefined ||
            argument.text === filters.callArgumentText) &&
          (filters.callArgumentSymbolName === undefined ||
            argument.symbolName === filters.callArgumentSymbolName) &&
          (filters.callArgumentFullyQualifiedName === undefined ||
            argument.fullyQualifiedName === filters.callArgumentFullyQualifiedName),
        ) === true
      : true)
  );
}

function hasCallArgumentFilter(filters: AuLinkMirrorFilters): boolean {
  return filters.callArgumentText !== undefined ||
    filters.callArgumentSymbolName !== undefined ||
    filters.callArgumentFullyQualifiedName !== undefined;
}

function usageSiteMatchesMemberFilters(
  row: AuLinkUsageSiteRow,
  filters: AuLinkMirrorFilters,
  memberRows: readonly AuLinkUsageMemberComparisonRow[],
): boolean {
  if (filters.presence === undefined) {
    return true;
  }
  if (row.memberName === undefined) {
    return false;
  }
  return memberRows.some(
    (memberRow) =>
      memberRow.linkId === row.linkId &&
      memberRow.memberName === row.memberName &&
      memberRow.presence === filters.presence,
  );
}

function usageSiteContains(row: AuLinkUsageSiteRow, query: string): boolean {
  return [
    row.id,
    row.linkId,
    row.packageId,
    row.symbolName,
    row.side,
    row.targetName,
    row.memberName,
    row.role,
    row.consumerPackageId ?? undefined,
    row.consumerArea,
    row.filePath,
    row.text,
    row.call?.calleeName,
    row.call?.calleeText,
    row.call?.receiverText,
    ...(row.call?.arguments.flatMap((argument) => [
      argument.text,
      argument.symbolName,
      argument.fullyQualifiedName,
    ]) ?? []),
    row.owner.ownerKind,
    row.owner.ownerName,
    row.owner.ownerMemberKind,
    row.owner.ownerMemberName,
    row.summary,
  ].some((value) => value?.includes(query) === true);
}

function usageConsumerRowMatches(
  row: AuLinkUsageConsumerRow,
  filters: AuLinkMirrorFilters,
): boolean {
  return (
    (filters.linkId === undefined || row.linkId === filters.linkId) &&
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.symbolName === undefined || row.symbolName === filters.symbolName) &&
    (filters.memberName === undefined || row.memberName === filters.memberName) &&
    (filters.side === undefined || row.side === filters.side) &&
    (filters.productArea === undefined || row.consumerArea === filters.productArea) &&
    (filters.usageRole === undefined || row.usageRoles[filters.usageRole] !== undefined) &&
    (filters.ownerName === undefined || row.ownerName === filters.ownerName) &&
    (filters.ownerKind === undefined || row.ownerKind === filters.ownerKind) &&
    (filters.ownerMemberName === undefined ||
      row.ownerMemberName === filters.ownerMemberName) &&
    (filters.callCalleeName === undefined ||
      row.callCalleeNames[filters.callCalleeName] !== undefined) &&
    (filters.callArgumentText === undefined ||
      row.callArgumentTexts[filters.callArgumentText] !== undefined) &&
    (filters.callArgumentSymbolName === undefined ||
      row.callArgumentSymbolNames[filters.callArgumentSymbolName] !== undefined) &&
    (filters.callArgumentFullyQualifiedName === undefined ||
      row.callArgumentFullyQualifiedNames[filters.callArgumentFullyQualifiedName] !== undefined) &&
    (filters.query === undefined || usageConsumerContains(row, filters.query))
  );
}

function usageConsumerMatchesMemberFilters(
  row: AuLinkUsageConsumerRow,
  filters: AuLinkMirrorFilters,
  memberRows: readonly AuLinkUsageMemberComparisonRow[],
): boolean {
  if (filters.presence === undefined) {
    return true;
  }
  if (row.memberName === undefined) {
    return false;
  }
  return memberRows.some(
    (memberRow) =>
      memberRow.linkId === row.linkId &&
      memberRow.memberName === row.memberName &&
      memberRow.presence === filters.presence,
  );
}

function usageConsumerContains(row: AuLinkUsageConsumerRow, query: string): boolean {
  return [
    row.id,
    row.linkId,
    row.packageId,
    row.symbolName,
    row.side,
    row.memberName,
    row.ownerKind,
    row.ownerName,
    row.ownerMemberKind,
    row.ownerMemberName,
    row.consumerPackageId ?? undefined,
    row.consumerArea,
    row.firstSource.filePath,
    row.ownerSource?.filePath,
    row.ownerMemberSource?.filePath,
    row.summary,
    ...Object.keys(row.usageRoles),
    ...Object.keys(row.callCalleeNames),
    ...Object.keys(row.callArgumentTexts),
    ...Object.keys(row.callArgumentSymbolNames),
    ...Object.keys(row.callArgumentFullyQualifiedNames),
  ].some((value) => value?.includes(query) === true);
}

function productAnchorDeclaration(
  sourceProject: SourceProject,
  anchor: AuLinkAnchorRow,
): ts.ClassDeclaration | null {
  const sourceFile = sourceProject.readSourceFile(anchor.target.file.repoPath);
  if (sourceFile === null) {
    return null;
  }
  let found: ts.ClassDeclaration | null = null;
  visitNode(sourceFile, (node) => {
    if (found !== null || !ts.isClassDeclaration(node)) {
      return;
    }
    if (node.getStart(sourceFile) === anchor.target.span.start && node.getEnd() === anchor.target.span.end) {
      found = node;
    }
  });
  return found;
}

function frameworkCandidateDeclaration(
  sourceProject: SourceProject,
  filePath: string,
  span: SourceSpan,
): ts.Declaration | null {
  const sourceFile = sourceProject.readSourceFile(filePath);
  if (sourceFile === null) {
    return null;
  }
  let found: ts.Declaration | null = null;
  visitNode(sourceFile, (node) => {
    if (found !== null || !isDeclarationNode(node)) {
      return;
    }
    if (node.getStart(sourceFile) === span.start && node.getEnd() === span.end) {
      found = node;
    }
  });
  return found;
}

function isDeclarationNode(node: ts.Node): node is ts.Declaration {
  return (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isVariableDeclaration(node)
  );
}

function productAreaForPath(filePath: string): string {
  const normalized = filePath.replace(/\\/gu, "/");
  const prefix = "packages/semantic-runtime/src/";
  return normalized.startsWith(prefix)
    ? normalized.slice(prefix.length).split("/")[0] ?? "unknown"
    : "unknown";
}

function countRecordKeys<TValue>(
  rows: readonly TValue[],
  select: (row: TValue) => Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const [key, count] of Object.entries(select(row))) {
      counts[key] = (counts[key] ?? 0) + count;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sum<TValue>(
  rows: readonly TValue[],
  select: (row: TValue) => number,
): number {
  return rows.reduce((total, row) => total + select(row), 0);
}

function intersection(left: readonly string[], right: readonly string[]): readonly string[] {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function difference(left: readonly string[], right: readonly string[]): readonly string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function groupBy<TValue>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => string,
): ReadonlyMap<string, readonly TValue[]> {
  const grouped = new Map<string, TValue[]>();
  for (const row of rows) {
    mapPush(grouped, keyFor(row), row);
  }
  return grouped;
}

function mapPush<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue,
): void {
  const existing = map.get(key);
  if (existing === undefined) {
    map.set(key, [value]);
  } else {
    existing.push(value);
  }
}

function uniqueUsages(
  usages: readonly AuLinkProductUsageRow[],
): readonly AuLinkProductUsageRow[] {
  return [...new Map(usages.map((usage) => [usage.id, usage])).values()];
}

function uniqueFrameworkTargetUsages(
  usages: readonly AuLinkFrameworkTargetUsageRow[],
): readonly AuLinkFrameworkTargetUsageRow[] {
  return [...new Map(usages.map((usage) => [usage.id, usage])).values()];
}

function compareProductUsages(
  left: AuLinkProductUsageRow,
  right: AuLinkProductUsageRow,
): number {
  return left.linkId.localeCompare(right.linkId) ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    (left.memberName ?? "").localeCompare(right.memberName ?? "") ||
    left.id.localeCompare(right.id);
}

function compareFrameworkTargetUsages(
  left: AuLinkFrameworkTargetUsageRow,
  right: AuLinkFrameworkTargetUsageRow,
): number {
  return left.linkId.localeCompare(right.linkId) ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    (left.memberName ?? "").localeCompare(right.memberName ?? "") ||
    left.id.localeCompare(right.id);
}

function compareComparisonRows(
  left: AuLinkUsageComparisonRow,
  right: AuLinkUsageComparisonRow,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.symbolName.localeCompare(right.symbolName) ||
    left.linkId.localeCompare(right.linkId);
}

function compareMemberRows(
  left: AuLinkUsageMemberComparisonRow,
  right: AuLinkUsageMemberComparisonRow,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.symbolName.localeCompare(right.symbolName) ||
    left.memberName.localeCompare(right.memberName) ||
    left.presence.localeCompare(right.presence) ||
    left.linkId.localeCompare(right.linkId);
}

function compareSurfaceRows(
  left: AuLinkMemberSurfaceRow,
  right: AuLinkMemberSurfaceRow,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.symbolName.localeCompare(right.symbolName) ||
    left.memberName.localeCompare(right.memberName) ||
    left.presence.localeCompare(right.presence) ||
    left.linkId.localeCompare(right.linkId);
}

function compareSiteRows(
  left: AuLinkUsageSiteRow,
  right: AuLinkUsageSiteRow,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.symbolName.localeCompare(right.symbolName) ||
    (left.memberName === undefined ? 1 : 0) - (right.memberName === undefined ? 1 : 0) ||
    (left.memberName ?? "").localeCompare(right.memberName ?? "") ||
    left.side.localeCompare(right.side) ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    left.id.localeCompare(right.id);
}

function compareConsumerRows(
  left: AuLinkUsageConsumerRow,
  right: AuLinkUsageConsumerRow,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.symbolName.localeCompare(right.symbolName) ||
    (left.memberName ?? "").localeCompare(right.memberName ?? "") ||
    left.side.localeCompare(right.side) ||
    left.ownerName.localeCompare(right.ownerName) ||
    (left.ownerMemberName ?? "").localeCompare(right.ownerMemberName ?? "") ||
    right.usageCount - left.usageCount ||
    left.id.localeCompare(right.id);
}
