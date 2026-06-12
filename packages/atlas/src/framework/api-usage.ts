import ts from "typescript";

import {
  countBy,
  groupBy,
  pushMapSetValue,
  pushMapValue,
  uniqueByKey,
} from "../collections.js";
import type { SourceRange } from "../inquiry/locus.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  canonicalSourceSymbolKey,
  declarationName,
  exportedTopLevelDeclarations,
  isPackageIndexSource,
  memberSurfacesForDeclaration,
  resolveAlias,
  requiredSourceFileIdentity,
  requiredSourceRangeForNode,
  SourceProjectMemo,
  sourceDeclarationForDeclarationFileMirror,
  type SourceFileIdentity,
  type SourceProject,
  sourceRangeKey,
  symbolForDeclaration,
  symbolForExpression,
  symbolKeyForSymbol,
  usageCallForIdentifier,
  usageRoleForIdentifier,
  usageText,
  unwrapExpression,
  visitNode,
  type TypeScriptMemberAccessKindId,
  type TypeScriptMemberSlotKindId,
  type TypeScriptUsageCallSite,
  type TypeScriptUsageOwner,
  type TypeScriptUsageRoleId,
  usageOwnerForNode,
} from "../source/index.js";

const aureliaApiUsageIndexMemo = new SourceProjectMemo<AureliaApiUsageIndex>();

/** Facet-to-facet relation that lets an API subject be viewed as one merged usage surface. */
export type AureliaApiMergeRelation =
  | "same-export"
  | "same-symbol"
  | "same-declaration"
  | "value-alias";

/** Exact type-shape relation between public API facets that does not imply identity. */
export type AureliaApiShapeRelation =
  | "class-implements-interface"
  | "interface-extends-interface"
  | "interface-extends-class";

/** Exact syntax/member role observed at one repo usage site. */
export type AureliaApiUsageRoleId = TypeScriptUsageRoleId;

/** Framework API surface that made a declaration visible. */
export type AureliaApiSurfaceKind =
  | "package-export"
  | "module-export";

/** Framework API declaration facet before and after subject merging. */
export interface AureliaApiFacetRow {
  readonly id: string;
  readonly subjectId: string;
  readonly surfaceKind: AureliaApiSurfaceKind;
  readonly packageId: string;
  readonly packageName: string;
  readonly exportName: string;
  readonly localName: string;
  readonly modulePath: string;
  readonly declarationKind: string;
  readonly symbolKey: string | null;
  readonly source: SourceRange;
}

/** One exact merge edge between two public API facets. */
export interface AureliaApiMergeEdgeRow {
  readonly id: string;
  readonly relation: AureliaApiMergeRelation;
  readonly fromFacetId: string;
  readonly toFacetId: string;
  readonly fromName: string;
  readonly toName: string;
  readonly source: SourceRange;
  readonly summary: string;
}

/** One exact type-shape edge between public API facets. */
export interface AureliaApiShapeEdgeRow {
  readonly id: string;
  readonly relation: AureliaApiShapeRelation;
  readonly fromFacetId: string;
  readonly toFacetId: string;
  readonly fromName: string;
  readonly toName: string;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Merged public API subject, grounded in exact declaration, alias, and heritage edges. */
export interface AureliaApiSubjectRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly name: string;
  readonly facetCount: number;
  readonly memberSlotCount: number;
  readonly usageCount: number;
  readonly memberUsageCount: number;
  readonly facets: readonly AureliaApiFacetRow[];
  readonly mergeRelations: Readonly<Record<string, number>>;
  readonly consumerPackages: Readonly<Record<string, number>>;
  readonly usageRoles: Readonly<Record<string, number>>;
  readonly firstSource: SourceRange;
  readonly summary: string;
}

/** API member slot normalized across compatible TypeScript declaration forms. */
export interface AureliaApiMemberSlotRow {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly name: string;
  readonly slotKind: string;
  readonly facetCount: number;
  readonly declarationCount: number;
  readonly usageCount: number;
  readonly accessKinds: Readonly<Record<string, number>>;
  readonly declarationKinds: Readonly<Record<string, number>>;
  readonly declarations: readonly AureliaApiMemberDeclarationRef[];
  readonly firstSource: SourceRange;
  readonly summary: string;
}

/** Source declaration contributing to an API member slot. */
export interface AureliaApiMemberDeclarationRef {
  readonly facetId: string;
  readonly facetName: string;
  readonly declarationKind: string;
  readonly accessKind: TypeScriptMemberAccessKindId;
  readonly source: SourceRange;
  readonly symbolKey: string | null;
}

/** Class-rooted implementation shape: a concrete framework class plus reachable public interfaces. */
export interface AureliaApiImplementationShapeRow {
  readonly id: string;
  readonly implementationSubjectId: string;
  readonly implementationName: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly shapeSubjectIds: readonly string[];
  readonly shapeSubjectNames: readonly string[];
  readonly directInterfaceNames: readonly string[];
  readonly shapeEdgeCount: number;
  readonly memberSlotCount: number;
  readonly usageCount: number;
  readonly memberUsageCount: number;
  readonly consumerPackages: Readonly<Record<string, number>>;
  readonly usageRoles: Readonly<Record<string, number>>;
  readonly firstSource: SourceRange;
  readonly summary: string;
}

/** Repo-wide TypeChecker-resolved use of an Aurelia API facet or member slot. */
export interface AureliaApiUsageRow {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly facetId?: string;
  readonly memberSlotId?: string;
  readonly memberName?: string;
  readonly role: AureliaApiUsageRoleId;
  readonly consumerPackageId: string | null;
  readonly consumerPackageName: string | null;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly text: string;
  readonly owner: TypeScriptUsageOwner;
  readonly call?: TypeScriptUsageCallSite;
  readonly summary: string;
}

/** Compact rollup for the shared Aurelia API usage substrate. */
export interface AureliaApiUsageRollup {
  readonly subjectCount: number;
  readonly mergedSubjectCount: number;
  readonly facetCount: number;
  readonly mergeEdgeCount: number;
  readonly shapeEdgeCount: number;
  readonly implementationShapeCount: number;
  readonly memberSlotCount: number;
  readonly usageCount: number;
  readonly memberUsageCount: number;
  readonly packages: Readonly<Record<string, number>>;
  readonly consumerPackages: Readonly<Record<string, number>>;
  readonly mergeRelations: Readonly<Record<string, number>>;
  readonly shapeRelations: Readonly<Record<string, number>>;
  readonly usageRoles: Readonly<Record<string, number>>;
}

/** Shared exact index for framework public APIs and their repo-wide TypeScript usages. */
export interface AureliaApiUsageIndex {
  readonly rollup: AureliaApiUsageRollup;
  readonly subjects: readonly AureliaApiSubjectRow[];
  readonly facets: readonly AureliaApiFacetRow[];
  readonly mergeEdges: readonly AureliaApiMergeEdgeRow[];
  readonly shapeEdges: readonly AureliaApiShapeEdgeRow[];
  readonly implementationShapes: readonly AureliaApiImplementationShapeRow[];
  readonly memberSlots: readonly AureliaApiMemberSlotRow[];
  readonly usages: readonly AureliaApiUsageRow[];
}

interface MutableFacet {
  readonly id: string;
  subjectId: string;
  readonly surfaceKind: AureliaApiSurfaceKind;
  readonly packageId: string;
  readonly packageName: string;
  readonly exportName: string;
  readonly localName: string;
  readonly modulePath: string;
  readonly declarationKind: string;
  readonly symbolKey: string | null;
  readonly source: SourceRange;
  readonly declaration: ts.Declaration;
  readonly symbol: ts.Symbol;
  readonly symbols: readonly ts.Symbol[];
}

interface RawMemberDeclaration {
  readonly facetId: string;
  readonly facetName: string;
  readonly name: string;
  readonly slotKind: TypeScriptMemberSlotKindId;
  readonly declarationKind: string;
  readonly accessKind: TypeScriptMemberAccessKindId;
  readonly source: SourceRange;
  readonly symbolKey: string | null;
  readonly symbol: ts.Symbol | null;
}

class ApiSubjectUnion {
  readonly #parent = new Map<string, string>();

  add(id: string): void {
    if (!this.#parent.has(id)) {
      this.#parent.set(id, id);
    }
  }

  union(left: string, right: string): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) {
      this.#parent.set(rightRoot, leftRoot);
    }
  }

  find(id: string): string {
    const parent = this.#parent.get(id);
    if (parent === undefined || parent === id) {
      this.add(id);
      return id;
    }
    const root = this.find(parent);
    this.#parent.set(id, root);
    return root;
  }
}

/** Read the shared Aurelia framework API usage substrate for the current TypeScript epoch. */
export function readAureliaApiUsageIndex(
  sourceProject: SourceProject,
): AureliaApiUsageIndex {
  return aureliaApiUsageIndexMemo.read(sourceProject, () =>
    new AureliaApiUsageIndexBuilder(sourceProject).build(),
  );
}

class AureliaApiUsageIndexBuilder {
  readonly #sourceProject: SourceProject;
  readonly #checker: ts.TypeChecker;
  readonly #frameworkPackageIds = new Set<string>(AURELIA_FRAMEWORK_PACKAGE_IDS);
  readonly #facets: MutableFacet[] = [];
  readonly #facetById = new Map<string, MutableFacet>();
  readonly #facetsBySymbol = new Map<ts.Symbol, MutableFacet[]>();
  readonly #facetsBySymbolKey = new Map<string, MutableFacet[]>();
  readonly #facetsByExport = new Map<string, MutableFacet[]>();
  readonly #facetsByDeclaration = new Map<string, MutableFacet[]>();
  readonly #memberDeclarations: RawMemberDeclaration[] = [];
  readonly #memberDeclarationsBySymbol = new Map<ts.Symbol, RawMemberDeclaration[]>();
  readonly #memberDeclarationsBySymbolKey = new Map<string, RawMemberDeclaration[]>();
  readonly #mergeEdges: AureliaApiMergeEdgeRow[] = [];
  readonly #shapeEdges: AureliaApiShapeEdgeRow[] = [];
  readonly #shapeEdgeKeys = new Set<string>();
  readonly #union = new ApiSubjectUnion();
  #subjectIdByRoot = new Map<string, string>();
  #subjectNameById = new Map<string, string>();
  #memberSlotIdByDeclaration = new Map<RawMemberDeclaration, string>();

  constructor(sourceProject: SourceProject) {
    this.#sourceProject = sourceProject;
    this.#checker = sourceProject.checker;
  }

  build(): AureliaApiUsageIndex {
    this.#collectFrameworkExportFacets();
    this.#collectFrameworkModuleExportFacets();
    this.#collectSameExportEdges();
    this.#collectSameSymbolEdges();
    this.#collectSameDeclarationEdges();
    this.#collectMemberDeclarations();
    this.#collectShapeAndAliasEdges();

    const subjects = this.#buildSubjects();
    const memberSlots = this.#buildMemberSlots();
    const usages = this.#collectUsages();
    const memberSlotsWithUsage = this.#attachUsageToMemberSlots(memberSlots, usages);
    const subjectsWithUsage = this.#attachUsageToSubjects(subjects, memberSlotsWithUsage, usages);
    const implementationShapes = this.#buildImplementationShapes(subjectsWithUsage, memberSlotsWithUsage, usages);
    const rollup = this.#rollup(subjectsWithUsage, implementationShapes, memberSlotsWithUsage, usages);

    return {
      rollup,
      subjects: subjectsWithUsage,
      facets: this.#facets.map(facetRow).sort(compareFacetIdentityRows),
      mergeEdges: this.#mergeEdges.sort(compareApiRelationEdges),
      shapeEdges: this.#shapeEdges.sort(compareApiRelationEdges),
      implementationShapes,
      memberSlots: memberSlotsWithUsage,
      usages,
    };
  }

  #collectFrameworkExportFacets(): void {
    for (const sourceFile of this.#sourceProject.ownedSourceFiles()) {
      if (sourceFile.isDeclarationFile || !isPackageIndexSource(sourceFile)) {
        continue;
      }
      const packageInfo = this.#sourceProject.packageForFileName(sourceFile.fileName);
      if (packageInfo === null || !this.#frameworkPackageIds.has(packageInfo.id)) {
        continue;
      }
      const moduleSymbol = this.#checker.getSymbolAtLocation(sourceFile);
      if (moduleSymbol === undefined) {
        continue;
      }
      for (const exported of this.#checker.getExportsOfModule(moduleSymbol)) {
        const resolved = resolveAlias(this.#checker, exported);
        const declarations = resolved.getDeclarations() ?? exported.getDeclarations() ?? [];
        for (const [index, declaration] of declarations.entries()) {
          this.#addFacet({
            surfaceKind: "package-export",
            packageId: packageInfo.id,
            packageName: packageInfo.packageName,
            exportName: exported.getName(),
            declaration,
            fallbackName: resolved.getName() ?? exported.getName(),
            index,
            extraSymbols: [exported, resolved],
          });
        }
      }
    }
  }

  #collectFrameworkModuleExportFacets(): void {
    for (const sourceFile of this.#sourceProject.ownedSourceFiles()) {
      if (sourceFile.isDeclarationFile) {
        continue;
      }
      const packageInfo = this.#sourceProject.packageForFileName(sourceFile.fileName);
      if (packageInfo === null || !this.#frameworkPackageIds.has(packageInfo.id)) {
        continue;
      }
      let index = 0;
      for (const declaration of exportedTopLevelDeclarations(sourceFile)) {
        this.#addFacet({
          surfaceKind: "module-export",
          packageId: packageInfo.id,
          packageName: packageInfo.packageName,
          exportName: declarationName(declaration) ?? `default:${index}`,
          declaration,
          fallbackName: declarationName(declaration) ?? `default:${index}`,
          index,
          extraSymbols: [],
        });
        index += 1;
      }
    }
  }

  #addFacet(input: {
    readonly surfaceKind: AureliaApiSurfaceKind;
    readonly packageId: string;
    readonly packageName: string;
    readonly exportName: string;
    readonly declaration: ts.Declaration;
    readonly fallbackName: string;
    readonly index: number;
    readonly extraSymbols: readonly ts.Symbol[];
  }): void {
    const sourceDeclaration = sourceDeclarationForDeclarationFileMirror(
      this.#sourceProject,
      input.declaration,
    );
    const source = requiredSourceRangeForNode(this.#sourceProject, sourceDeclaration);
    const declarationPackage = this.#sourceProject.packageForFileName(sourceDeclaration.getSourceFile().fileName);
    if (declarationPackage === null || !this.#frameworkPackageIds.has(declarationPackage.id)) {
      return;
    }
    const name = declarationName(sourceDeclaration) ?? input.fallbackName;
    const symbol = symbolForDeclaration(this.#checker, sourceDeclaration) ?? input.extraSymbols[0] ?? this.#checker.getSymbolAtLocation(sourceDeclaration);
    if (symbol === undefined || symbol === null) {
      return;
    }
    const symbols = uniqueSymbols([
      symbol,
      ...input.extraSymbols.map((candidate) => resolveAlias(this.#checker, candidate)),
    ]);
    const symbolKey = symbolKeyForSymbol(this.#checker, symbol);
    const facet: MutableFacet = {
      id: `aurelia-api-facet:${input.surfaceKind}:${input.packageId}:${input.exportName}:${input.index}:${source.filePath}:${source.start.line}:${source.start.character}`,
      subjectId: "",
      surfaceKind: input.surfaceKind,
      packageId: input.packageId,
      packageName: input.packageName,
      exportName: input.exportName,
      localName: name,
      modulePath: source.filePath,
      declarationKind: ts.SyntaxKind[sourceDeclaration.kind] ?? "Unknown",
      symbolKey,
      source,
      declaration: sourceDeclaration,
      symbol,
      symbols,
    };
    this.#facets.push(facet);
    this.#facetById.set(facet.id, facet);
    this.#union.add(facet.id);
    for (const facetSymbol of symbols) {
      pushMapValue(this.#facetsBySymbol, facetSymbol, facet);
      const key = symbolKeyForSymbol(this.#checker, facetSymbol);
      if (key !== null) {
        pushMapValue(this.#facetsBySymbolKey, canonicalSourceSymbolKey(key), facet);
      }
    }
    pushMapValue(this.#facetsByExport, `${facet.packageId}:${facet.exportName}`, facet);
    pushMapValue(this.#facetsByDeclaration, sourceRangeKey(source), facet);
  }

  #collectSameDeclarationEdges(): void {
    for (const facets of this.#facetsByDeclaration.values()) {
      const sorted = uniqueByKey(facets, (facet) => facet.id).sort(compareFacetIdentityRows);
      const first = sorted[0];
      if (first === undefined) {
        continue;
      }
      for (const facet of sorted.slice(1)) {
        this.#addMergeEdge("same-declaration", first, facet, facet.source);
      }
    }
  }

  #collectSameExportEdges(): void {
    for (const facets of this.#facetsByExport.values()) {
      const sorted = [...facets].sort(compareFacetIdentityRows);
      const first = sorted[0];
      if (first === undefined) {
        continue;
      }
      for (const facet of sorted.slice(1)) {
        this.#addMergeEdge("same-export", first, facet, first.source);
      }
    }
  }

  #collectSameSymbolEdges(): void {
    for (const facets of this.#facetsBySymbol.values()) {
      const facetsByLocalName = groupBy(
        uniqueByKey(facets, (facet) => facet.id),
        (facet) => facet.localName,
      );
      for (const sameNameFacets of facetsByLocalName.values()) {
        const sorted = [...sameNameFacets].sort(compareFacetIdentityRows);
        const first = sorted[0];
        if (first === undefined) {
          continue;
        }
        for (const facet of sorted.slice(1)) {
          this.#addMergeEdge("same-symbol", first, facet, facet.source);
        }
      }
    }
  }

  #collectMemberDeclarations(): void {
    for (const facet of this.#facets) {
      for (const member of memberSurfacesForDeclaration(facet.declaration)) {
        const source = requiredSourceRangeForNode(this.#sourceProject, member.node);
        const symbol = symbolForDeclaration(this.#checker, member.node);
        const row: RawMemberDeclaration = {
          facetId: facet.id,
          facetName: facet.localName,
          name: member.name,
          slotKind: member.slotKind,
          declarationKind: member.declarationKind,
          accessKind: member.accessKind,
          source,
          symbolKey: symbol === null ? null : symbolKeyForSymbol(this.#checker, symbol),
          symbol,
        };
        this.#memberDeclarations.push(row);
        if (symbol !== null) {
          pushMapValue(this.#memberDeclarationsBySymbol, symbol, row);
          const key = symbolKeyForSymbol(this.#checker, symbol);
          if (key !== null) {
            pushMapValue(this.#memberDeclarationsBySymbolKey, canonicalSourceSymbolKey(key), row);
          }
        }
      }
    }
  }

  #collectShapeAndAliasEdges(): void {
    for (const facet of this.#facets) {
      if (ts.isClassDeclaration(facet.declaration) || ts.isInterfaceDeclaration(facet.declaration)) {
        for (const edge of this.#heritageEdgesForFacet(facet)) {
          this.#addShapeEdge(edge.relation, facet, edge.target, edge.source);
        }
      }
      if (ts.isVariableDeclaration(facet.declaration) && facet.declaration.initializer !== undefined) {
        const target = this.#facetForExpression(facet.declaration.initializer);
        if (target !== null && target.localName === facet.localName) {
          this.#addMergeEdge("value-alias", facet, target, facet.source);
        }
      }
    }
  }

  #heritageEdgesForFacet(facet: MutableFacet): readonly {
    readonly relation: AureliaApiShapeRelation;
    readonly target: MutableFacet;
    readonly source: SourceRange;
  }[] {
    const declaration = facet.declaration;
    if (!ts.isClassDeclaration(declaration) && !ts.isInterfaceDeclaration(declaration)) {
      return [];
    }
    const edges: {
      readonly relation: AureliaApiShapeRelation;
      readonly target: MutableFacet;
      readonly source: SourceRange;
    }[] = [];
    for (const clause of declaration.heritageClauses ?? []) {
      for (const type of clause.types) {
        const target = this.#facetForExpression(type.expression);
        const source = requiredSourceRangeForNode(this.#sourceProject, type);
        const relation =
          ts.isClassDeclaration(declaration) && clause.token === ts.SyntaxKind.ImplementsKeyword
            ? "class-implements-interface"
            : ts.isInterfaceDeclaration(declaration) &&
              clause.token === ts.SyntaxKind.ExtendsKeyword &&
              target !== null &&
              ts.isInterfaceDeclaration(target.declaration)
            ? "interface-extends-interface"
            : ts.isInterfaceDeclaration(declaration) &&
              clause.token === ts.SyntaxKind.ExtendsKeyword &&
              target !== null &&
              ts.isClassDeclaration(target.declaration)
            ? "interface-extends-class"
            : null;
        if (target !== null) {
          if (relation !== null) {
            edges.push({ relation, target, source });
          }
        }
      }
    }
    return edges;
  }

  #facetForExpression(expression: ts.Expression): MutableFacet | null {
    const current = unwrapExpression(expression);
    const symbol = symbolForExpression(this.#checker, current);
    if (symbol === null) {
      return null;
    }
    const facets = this.#facetsBySymbol.get(symbol);
    const sorted = facets?.slice().sort(compareFacetIdentityRows) ?? [];
    const name = expressionNameText(current);
    if (name !== null) {
      const matchingName = sorted.find((facet) =>
        facet.localName === name || facet.exportName === name
      );
      if (matchingName !== undefined) {
        return matchingName;
      }
    }
    return sorted[0] ?? null;
  }

  #addMergeEdge(
    relation: AureliaApiMergeRelation,
    from: MutableFacet,
    to: MutableFacet,
    source: SourceRange,
  ): void {
    if (from.id === to.id) {
      return;
    }
    this.#union.union(from.id, to.id);
    this.#mergeEdges.push({
      id: `aurelia-api-merge:${relation}:${from.id}->${to.id}`,
      relation,
      fromFacetId: from.id,
      toFacetId: to.id,
      fromName: from.localName,
      toName: to.localName,
      source,
      summary: `${from.localName} ${relation} ${to.localName}`,
    });
  }

  #addShapeEdge(
    relation: AureliaApiShapeRelation,
    from: MutableFacet,
    to: MutableFacet,
    source: SourceRange,
  ): void {
    if (from.id === to.id) {
      return;
    }
    const key = `${relation}:${sourceRangeKey(from.source)}:${sourceRangeKey(to.source)}:${sourceRangeKey(source)}`;
    if (this.#shapeEdgeKeys.has(key)) {
      return;
    }
    this.#shapeEdgeKeys.add(key);
    this.#shapeEdges.push({
      id: `aurelia-api-shape:${relation}:${from.id}->${to.id}`,
      relation,
      fromFacetId: from.id,
      toFacetId: to.id,
      fromName: from.localName,
      toName: to.localName,
      source,
      summary: `${from.localName} ${relation} ${to.localName}`,
    });
  }

  #buildSubjects(): AureliaApiSubjectRow[] {
    const facetsByRoot = new Map<string, MutableFacet[]>();
    for (const facet of this.#facets) {
      pushMapValue(facetsByRoot, this.#union.find(facet.id), facet);
    }

    const subjectIds = new Set<string>();
    const subjects: AureliaApiSubjectRow[] = [];
    for (const [root, facets] of facetsByRoot) {
      const sortedFacets = [...facets].sort(compareFacetsByPrimaryPreference);
      const primary = sortedFacets[0];
      if (primary === undefined) {
        continue;
      }
      const subjectId = uniqueSubjectId(
        subjectIds,
        `aurelia-api:${primary.packageId}:${primary.localName}`,
      );
      this.#subjectIdByRoot.set(root, subjectId);
      this.#subjectNameById.set(subjectId, primary.localName);
      for (const facet of facets) {
        facet.subjectId = subjectId;
      }

      const facetRows = facets.map(facetRow).sort(compareFacetIdentityRows);
      const mergeEdges = this.#mergeEdges.filter(
        (edge) =>
          facetRows.some((facet) => facet.id === edge.fromFacetId) ||
          facetRows.some((facet) => facet.id === edge.toFacetId),
      );
      subjects.push({
        id: subjectId,
        packageId: primary.packageId,
        packageName: primary.packageName,
        name: primary.localName,
        facetCount: facetRows.length,
        memberSlotCount: 0,
        usageCount: 0,
        memberUsageCount: 0,
        facets: facetRows,
        mergeRelations: countBy(mergeEdges, (edge) => edge.relation),
        consumerPackages: {},
        usageRoles: {},
        firstSource: primary.source,
        summary: `${primary.localName} has ${facetRows.length} public API facet(s)`,
      });
    }
    return subjects.sort(compareSubjects);
  }

  #buildMemberSlots(): AureliaApiMemberSlotRow[] {
    const declarationsBySlot = new Map<string, RawMemberDeclaration[]>();
    for (const member of this.#memberDeclarations) {
      const facet = this.#facetById.get(member.facetId);
      if (facet === undefined || facet.subjectId.length === 0) {
        continue;
      }
      pushMapValue(
        declarationsBySlot,
        `${facet.subjectId}:${member.name}:${member.slotKind}`,
        member,
      );
    }

    const memberSlots: AureliaApiMemberSlotRow[] = [];
    for (const [slotKey, declarations] of declarationsBySlot) {
      const first = declarations.slice().sort(compareRawMemberDeclarations)[0];
      if (first === undefined) {
        continue;
      }
      const subjectId = slotKey.slice(0, slotKey.indexOf(`:${first.name}:${first.slotKind}`));
      const subjectName = this.#subjectNameById.get(subjectId) ?? subjectId;
      const slotId = `aurelia-api-member:${subjectId}:${first.name}:${first.slotKind}`;
      for (const declaration of declarations) {
        this.#memberSlotIdByDeclaration.set(declaration, slotId);
      }
      const declarationRefs = declarations
        .map((declaration) => ({
          facetId: declaration.facetId,
          facetName: declaration.facetName,
          declarationKind: declaration.declarationKind,
          accessKind: declaration.accessKind,
          source: declaration.source,
          symbolKey: declaration.symbolKey,
        }))
        .sort(compareMemberDeclarationRefs);
      memberSlots.push({
        id: slotId,
        subjectId,
        subjectName,
        name: first.name,
        slotKind: first.slotKind,
        facetCount: new Set(declarations.map((declaration) => declaration.facetId)).size,
        declarationCount: declarations.length,
        usageCount: 0,
        accessKinds: countBy(declarations, (declaration) => declaration.accessKind),
        declarationKinds: countBy(declarations, (declaration) => declaration.declarationKind),
        declarations: declarationRefs,
        firstSource: first.source,
        summary: `${subjectName}.${first.name} ${first.slotKind} slot has ${declarations.length} declaration(s)`,
      });
    }
    return memberSlots.sort(compareMemberSlots);
  }

  #collectUsages(): AureliaApiUsageRow[] {
    const usages: AureliaApiUsageRow[] = [];
    const seen = new Set<string>();
    for (const sourceFile of this.#sourceProject.ownedSourceFiles()) {
      if (sourceFile.isDeclarationFile) {
        continue;
      }
      const fileIdentity = requiredSourceFileIdentity(this.#sourceProject, sourceFile);
      const consumerPackage = this.#sourceProject.packageForFileName(sourceFile.fileName);
      visitNode(sourceFile, (node) => {
        if (ts.isIdentifier(node)) {
          this.#appendUsagesForIdentifier(usages, seen, fileIdentity, consumerPackage, node);
        }
      });
    }
    return usages.sort(compareUsages);
  }

  #appendUsagesForIdentifier(
    usages: AureliaApiUsageRow[],
    seen: Set<string>,
    fileIdentity: SourceFileIdentity,
    consumerPackage: ReturnType<SourceProject["packageForFileName"]>,
    identifier: ts.Identifier,
  ): void {
    const role = usageRoleForIdentifier(identifier);
    if (role === null) {
      return;
    }
    const symbol = symbolForExpression(this.#checker, identifier);
    if (symbol === null) {
      return;
    }
    const source = requiredSourceRangeForNode(this.#sourceProject, identifier);
    const text = usageText(identifier);
    const owner = usageOwnerForNode(this.#sourceProject, identifier);
    const call = usageCallForIdentifier(this.#checker, identifier);
    const symbolKey = symbolKeyForSymbol(this.#checker, symbol);
    const canonicalSymbolKey =
      symbolKey === null ? null : canonicalSourceSymbolKey(symbolKey);

    const facets = uniqueByKey([
      ...(this.#facetsBySymbol.get(symbol) ?? []),
      ...(canonicalSymbolKey === null ? [] : this.#facetsBySymbolKey.get(canonicalSymbolKey) ?? []),
    ], (facet) => facet.id);
    for (const facet of facets) {
      if (this.#isFacetDeclarationName(facet, source)) {
        continue;
      }
      const id = `aurelia-api-usage:${facet.subjectId}:${source.filePath}:${source.start.line}:${source.start.character}:${role}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      usages.push({
        id,
        subjectId: facet.subjectId,
        subjectName: this.#subjectNameById.get(facet.subjectId) ?? facet.localName,
        facetId: facet.id,
        role,
        consumerPackageId: consumerPackage?.id ?? null,
        consumerPackageName: consumerPackage?.packageName ?? null,
        filePath: fileIdentity.repoPath,
        source,
        text,
        owner,
        call: call ?? undefined,
        summary: `${text} ${role} uses ${facet.localName}`,
      });
    }

    const declarations = uniqueRawMemberDeclarations([
      ...(this.#memberDeclarationsBySymbol.get(symbol) ?? []),
      ...(canonicalSymbolKey === null
        ? []
        : this.#memberDeclarationsBySymbolKey.get(canonicalSymbolKey) ?? []),
    ]);
    for (const declaration of declarations) {
      const slotId = this.#memberSlotIdByDeclaration.get(declaration);
      if (slotId === undefined) {
        continue;
      }
      const facet = this.#facetById.get(declaration.facetId);
      if (facet === undefined) {
        continue;
      }
      const id = `aurelia-api-usage:${slotId}:${source.filePath}:${source.start.line}:${source.start.character}:${role}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      usages.push({
        id,
        subjectId: facet.subjectId,
        subjectName: this.#subjectNameById.get(facet.subjectId) ?? facet.localName,
        memberSlotId: slotId,
        memberName: declaration.name,
        role,
        consumerPackageId: consumerPackage?.id ?? null,
        consumerPackageName: consumerPackage?.packageName ?? null,
        filePath: fileIdentity.repoPath,
        source,
        text,
        owner,
        call: call ?? undefined,
        summary: `${text} ${role} uses ${this.#subjectNameById.get(facet.subjectId) ?? facet.localName}.${declaration.name}`,
      });
    }
  }

  #isFacetDeclarationName(facet: MutableFacet, source: SourceRange): boolean {
    return facet.source.filePath === source.filePath &&
      facet.source.start.line === source.start.line &&
      facet.source.start.character === source.start.character;
  }

  #attachUsageToSubjects(
    subjects: readonly AureliaApiSubjectRow[],
    memberSlots: readonly AureliaApiMemberSlotRow[],
    usages: readonly AureliaApiUsageRow[],
  ): readonly AureliaApiSubjectRow[] {
    const usagesBySubject = groupBy(usages, (usage) => usage.subjectId);
    const memberSlotsBySubject = groupBy(memberSlots, (slot) => slot.subjectId);
    return subjects
      .map((subject) => {
        const subjectUsages = usagesBySubject.get(subject.id) ?? [];
        const subjectMemberSlots = memberSlotsBySubject.get(subject.id) ?? [];
        const memberUsageCount = subjectUsages.filter((usage) => usage.memberSlotId !== undefined).length;
        return {
          ...subject,
          memberSlotCount: subjectMemberSlots.length,
          usageCount: subjectUsages.length,
          memberUsageCount,
          consumerPackages: countBy(subjectUsages, (usage) => usage.consumerPackageId ?? "<external>"),
          usageRoles: countBy(subjectUsages, (usage) => usage.role),
          summary: `${subject.name} has ${subject.facetCount} facet(s), ${subjectMemberSlots.length} member slot(s), and ${subjectUsages.length} repo usage(s)`,
        };
      })
      .sort(compareSubjects);
  }

  #attachUsageToMemberSlots(
    memberSlots: readonly AureliaApiMemberSlotRow[],
    usages: readonly AureliaApiUsageRow[],
  ): readonly AureliaApiMemberSlotRow[] {
    const usagesBySlot = groupBy(
      usages.filter((usage) => usage.memberSlotId !== undefined),
      (usage) => usage.memberSlotId!,
    );
    return memberSlots
      .map((slot) => {
        const slotUsages = usagesBySlot.get(slot.id) ?? [];
        return {
          ...slot,
          usageCount: slotUsages.length,
          summary: `${slot.subjectName}.${slot.name} ${slot.slotKind} slot has ${slot.declarationCount} declaration(s) and ${slotUsages.length} repo usage(s)`,
        };
      })
      .sort(compareMemberSlots);
  }

  #buildImplementationShapes(
    subjects: readonly AureliaApiSubjectRow[],
    memberSlots: readonly AureliaApiMemberSlotRow[],
    usages: readonly AureliaApiUsageRow[],
  ): readonly AureliaApiImplementationShapeRow[] {
    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
    const subjectNamesById = new Map(subjects.map((subject) => [subject.id, subject.name]));
    const shapeTargetsBySubject = new Map<string, Set<string>>();
    const directTargetsBySubject = new Map<string, Set<string>>();
    for (const edge of this.#shapeEdges) {
      const from = this.#facetById.get(edge.fromFacetId)?.subjectId;
      const to = this.#facetById.get(edge.toFacetId)?.subjectId;
      if (from === undefined || to === undefined || from === to) {
        continue;
      }
      pushMapSetValue(shapeTargetsBySubject, from, to);
      if (edge.relation === "class-implements-interface") {
        pushMapSetValue(directTargetsBySubject, from, to);
      }
    }
    const memberSlotsBySubject = groupBy(memberSlots, (slot) => slot.subjectId);
    const usagesBySubject = groupBy(usages, (usage) => usage.subjectId);

    return subjects
      .filter((subject) => subject.facets.some((facet) => facet.declarationKind === "ClassDeclaration"))
      .map((subject) => {
        const reachable = reachableSubjectIds(subject.id, shapeTargetsBySubject);
        const shapeSubjectIds = [subject.id, ...reachable].filter((id, index, array) => array.indexOf(id) === index);
        const shapeSubjects = shapeSubjectIds
          .map((id) => subjectById.get(id))
          .filter((row): row is AureliaApiSubjectRow => row !== undefined);
        const shapeMemberSlots = shapeSubjectIds.flatMap((id) => memberSlotsBySubject.get(id) ?? []);
        const shapeUsages = shapeSubjectIds.flatMap((id) => usagesBySubject.get(id) ?? []);
        const directInterfaceNames = [...(directTargetsBySubject.get(subject.id) ?? new Set<string>())]
          .map((id) => subjectNamesById.get(id) ?? id)
          .sort((left, right) => left.localeCompare(right));
        const memberSlotKeys = new Set(shapeMemberSlots.map((slot) => `${slot.name}:${slot.slotKind}`));
        const shapeEdgeCount = this.#shapeEdges.filter((edge) => {
          const from = this.#facetById.get(edge.fromFacetId)?.subjectId;
          const to = this.#facetById.get(edge.toFacetId)?.subjectId;
          return from !== undefined && to !== undefined &&
            shapeSubjectIds.includes(from) &&
            shapeSubjectIds.includes(to);
        }).length;
        return {
          id: `aurelia-api-implementation:${subject.id}`,
          implementationSubjectId: subject.id,
          implementationName: subject.name,
          packageId: subject.packageId,
          packageName: subject.packageName,
          shapeSubjectIds,
          shapeSubjectNames: shapeSubjects.map((row) => row.name).sort((left, right) => left.localeCompare(right)),
          directInterfaceNames,
          shapeEdgeCount,
          memberSlotCount: memberSlotKeys.size,
          usageCount: shapeUsages.length,
          memberUsageCount: shapeUsages.filter((usage) => usage.memberSlotId !== undefined).length,
          consumerPackages: countBy(shapeUsages, (usage) => usage.consumerPackageId ?? "<external>"),
          usageRoles: countBy(shapeUsages, (usage) => usage.role),
          firstSource: subject.firstSource,
          summary: `${subject.name} implementation shape reaches ${shapeSubjectIds.length - 1} related API subject(s), ${memberSlotKeys.size} merged member slot(s), and ${shapeUsages.length} repo usage(s)`,
        };
      })
      .sort(compareImplementationShapes);
  }

  #rollup(
    subjects: readonly AureliaApiSubjectRow[],
    implementationShapes: readonly AureliaApiImplementationShapeRow[],
    memberSlots: readonly AureliaApiMemberSlotRow[],
    usages: readonly AureliaApiUsageRow[],
  ): AureliaApiUsageRollup {
    return {
      subjectCount: subjects.length,
      mergedSubjectCount: subjects.filter((subject) => subject.facetCount > 1).length,
      facetCount: this.#facets.length,
      mergeEdgeCount: this.#mergeEdges.length,
      shapeEdgeCount: this.#shapeEdges.length,
      implementationShapeCount: implementationShapes.length,
      memberSlotCount: memberSlots.length,
      usageCount: usages.length,
      memberUsageCount: usages.filter((usage) => usage.memberSlotId !== undefined).length,
      packages: countBy(this.#facets, (facet) => facet.packageId),
      consumerPackages: countBy(usages, (usage) => usage.consumerPackageId ?? "<external>"),
      mergeRelations: countBy(this.#mergeEdges, (edge) => edge.relation),
      shapeRelations: countBy(this.#shapeEdges, (edge) => edge.relation),
      usageRoles: countBy(usages, (usage) => usage.role),
    };
  }
}

function facetRow(facet: MutableFacet): AureliaApiFacetRow {
  return {
    id: facet.id,
    subjectId: facet.subjectId,
    surfaceKind: facet.surfaceKind,
    packageId: facet.packageId,
    packageName: facet.packageName,
    exportName: facet.exportName,
    localName: facet.localName,
    modulePath: facet.modulePath,
    declarationKind: facet.declarationKind,
    symbolKey: facet.symbolKey,
    source: facet.source,
  };
}

function uniqueSymbols(symbols: readonly ts.Symbol[]): readonly ts.Symbol[] {
  const unique: ts.Symbol[] = [];
  for (const symbol of symbols) {
    if (!unique.includes(symbol)) {
      unique.push(symbol);
    }
  }
  return unique;
}

function uniqueRawMemberDeclarations(
  declarations: readonly RawMemberDeclaration[],
): readonly RawMemberDeclaration[] {
  const seen = new Set<string>();
  const unique: RawMemberDeclaration[] = [];
  for (const declaration of declarations) {
    const key = `${declaration.facetId}:${declaration.name}:${declaration.slotKind}:${sourceRangeKey(declaration.source)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(declaration);
  }
  return unique;
}


function reachableSubjectIds(
  rootId: string,
  targetsBySubject: ReadonlyMap<string, ReadonlySet<string>>,
): readonly string[] {
  const seen = new Set<string>();
  const queue = [...(targetsBySubject.get(rootId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    queue.push(...(targetsBySubject.get(current) ?? []));
  }
  return [...seen].sort((left, right) => left.localeCompare(right));
}

function uniqueSubjectId(existing: Set<string>, baseId: string): string {
  let candidate = baseId;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${baseId}:${index}`;
    index += 1;
  }
  existing.add(candidate);
  return candidate;
}

function expressionNameText(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression) || ts.isPrivateIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression !== undefined &&
    ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    return expression.argumentExpression.text;
  }
  return null;
}

function compareFacetIdentityRows(
  left: MutableFacet | AureliaApiFacetRow,
  right: MutableFacet | AureliaApiFacetRow,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.exportName.localeCompare(right.exportName) ||
    left.localName.localeCompare(right.localName) ||
    left.id.localeCompare(right.id);
}

function compareFacetsByPrimaryPreference(left: MutableFacet, right: MutableFacet): number {
  return facetPrimaryRank(left) - facetPrimaryRank(right) || compareFacetIdentityRows(left, right);
}

function facetPrimaryRank(facet: MutableFacet): number {
  const packagePenalty = facet.packageId === "aurelia" ? 10 : 0;
  switch (facet.declarationKind) {
    case "ClassDeclaration":
      return packagePenalty;
    case "VariableDeclaration":
      return packagePenalty + 1;
    case "InterfaceDeclaration":
      return packagePenalty + 2;
    default:
      return packagePenalty + 3;
  }
}

function compareApiRelationEdges(
  left: AureliaApiMergeEdgeRow | AureliaApiShapeEdgeRow,
  right: AureliaApiMergeEdgeRow | AureliaApiShapeEdgeRow,
): number {
  return left.relation.localeCompare(right.relation) ||
    left.fromName.localeCompare(right.fromName) ||
    left.toName.localeCompare(right.toName) ||
    left.id.localeCompare(right.id);
}

function compareSubjects(left: AureliaApiSubjectRow, right: AureliaApiSubjectRow): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.name.localeCompare(right.name) ||
    left.id.localeCompare(right.id);
}

function compareRawMemberDeclarations(left: RawMemberDeclaration, right: RawMemberDeclaration): number {
  return left.name.localeCompare(right.name) ||
    left.slotKind.localeCompare(right.slotKind) ||
    left.facetName.localeCompare(right.facetName) ||
    left.declarationKind.localeCompare(right.declarationKind);
}

function compareMemberSlots(left: AureliaApiMemberSlotRow, right: AureliaApiMemberSlotRow): number {
  return left.subjectName.localeCompare(right.subjectName) ||
    left.name.localeCompare(right.name) ||
    left.slotKind.localeCompare(right.slotKind) ||
    left.id.localeCompare(right.id);
}

function compareMemberDeclarationRefs(
  left: AureliaApiMemberDeclarationRef,
  right: AureliaApiMemberDeclarationRef,
): number {
  return left.facetName.localeCompare(right.facetName) ||
    left.declarationKind.localeCompare(right.declarationKind) ||
    left.facetId.localeCompare(right.facetId);
}

function compareImplementationShapes(
  left: AureliaApiImplementationShapeRow,
  right: AureliaApiImplementationShapeRow,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.implementationName.localeCompare(right.implementationName) ||
    left.id.localeCompare(right.id);
}

function compareUsages(left: AureliaApiUsageRow, right: AureliaApiUsageRow): number {
  return (left.consumerPackageId ?? "").localeCompare(right.consumerPackageId ?? "") ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    left.source.start.character - right.source.start.character ||
    left.role.localeCompare(right.role) ||
    left.id.localeCompare(right.id);
}
