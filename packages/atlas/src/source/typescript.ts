import path from "node:path";

import ts from "typescript";

import { uniqueByKey } from "../collections.js";
import type { SourceRange } from "../inquiry/locus.js";
import { repoRelativePath, resolveRepoPath, type RepoRelativePath } from "./path.js";
import {
  SourceDeclarationKind,
  sourceDeclarationKindForNode,
  type SourceFileIdentity,
  type SourceProject,
  type SourceSpan,
} from "./project.js";
import {
  canonicalSourceSymbolKey,
  resolveAlias,
  symbolForExpressionName,
} from "./semantic-surface/symbols.js";
import {
  calleeNameForExpression,
  declarationNameNode,
  isExportedDeclaration,
  literalValueField,
  propertyNameText,
  visitNode,
} from "./semantic-surface/ast.js";
import {
  requiredSourceFileIdentity,
  sourceSpanForNode,
} from "./semantic-surface/source-ranges.js";
import {
  SourceSelectorScheme,
  SourceTargetKind,
  TypeScriptModuleEdgeKind,
  TypeScriptReferenceRole,
  TypeScriptNavigationKind,
  TypeScriptCallHierarchyDirection,
  TypeScriptCallHierarchyRelation,
  TypeScriptCallSiteKind,
} from "./typescript-contracts.js";
import type {
  SourcePositionSelector,
  WorkspaceSourceSelector,
  PackageSourceSelector,
  DirectorySourceSelector,
  FileSourceSelector,
  RangeSourceSelector,
  PositionSourceSelector,
  TokenSourceSelector,
  DeclarationSourceSelector,
  ExportSourceSelector,
  SourceSelector,
  SourceTargetRow,
  ResolvedSourceTarget,
  SourceSelectorResolution,
  ResolvedSourceSelectorResolution,
  SourceResolutionDiagnostic,
  SourceTextReadOptions,
  SourceTextSlice,
  SourceTextRead,
  ApiSurfaceOptions,
  DocumentSymbolOptions,
  TypeScriptApiSurfaceEntry,
  TypeScriptApiSurfaceRollup,
  TypeScriptApiSurface,
  TypeScriptModuleEdge,
  TypeScriptModuleGraph,
  TypeScriptDocumentSymbolEntry,
  TypeScriptDocumentSymbolsRead,
  SymbolIndexOptions,
  TypeScriptSymbolIndex,
  ExportSurfaceOptions,
  ExportSurfaceReadContext,
  TypeScriptExportSurfaceEntry,
  ExportNameSurfaceOptions,
  TypeScriptExportNameEntry,
  TypeScriptExportNameSurfaceRead,
  TypeScriptExportSurfaceRead,
  TypeFactOptions,
  TypeScriptMemberFact,
  TypeScriptTypeFact,
  TypeScriptTypeFacts,
  ReferenceReadOptions,
  TypeScriptReferenceEntry,
  TypeScriptReferenceRead,
  TypeScriptNavigationEntry,
  TypeScriptNavigationRead,
  TypeScriptCallHierarchyItemRow,
  TypeScriptCallHierarchyEdge,
  TypeScriptCallHierarchyRead,
  CallSiteReadOptions,
  TypeScriptExpressionFact,
  TypeScriptCallSiteArgument,
  TypeScriptCallSiteEntry,
  TypeScriptCallSitesRead,
  TypeScriptDiagnosticEntry,
  TypeScriptDiagnosticsRead,
  TypeScriptRenameLocationEntry,
  TypeScriptRenameRead,
  TypeScriptRefactorActionRow,
  TypeScriptRefactorsRead,
  TypeScriptDisplayTag,
  TypeScriptQuickInfoEntry,
  TypeScriptQuickInfoRead,
  TypeScriptSignatureHelpParameter,
  TypeScriptSignatureHelpEntry,
  TypeScriptSignatureHelpRead,
  TypeScriptHighlightEntry,
  TypeScriptHighlightsRead,
  TypeScriptTextEdit,
  TypeScriptFileEdits,
  TypeScriptCodeFixActionRow,
  TypeScriptCodeFixesRead,
  RefactorEditOptions,
  TypeScriptRefactorEditsRead,
  TypeScriptOrganizeImportsRead,
  FileRenameEditOptions,
  TypeScriptFileRenameEditsRead,
} from "./typescript-contracts.js";

export * from "./typescript-contracts.js";

/** Build a source selector from an Atlas source range locus. */
export function sourceSelectorForRange(
  /** Source range locus payload. */
  range: SourceRange,
): RangeSourceSelector {
  return {
    scheme: SourceSelectorScheme.Range,
    filePath: range.filePath,
    start: range.start,
    end: range.end,
  };
}

/** Resolve a source selector into current TypeScript Program targets. */
export function resolveSourceSelector(
  /** Hot source project that owns the current Program epoch. */
  project: SourceProject,
  /** Selector to resolve. */
  selector: SourceSelector,
): ResolvedSourceSelectorResolution {
  switch (selector.scheme) {
    case SourceSelectorScheme.Workspace:
      return workspaceResolution(project, selector);
    case SourceSelectorScheme.Package:
      return packageResolution(project, selector);
    case SourceSelectorScheme.Directory:
      return directoryResolution(project, selector);
    case SourceSelectorScheme.File:
      return fileResolution(project, selector);
    case SourceSelectorScheme.Range:
      return rangeResolution(project, selector);
    case SourceSelectorScheme.Position:
      return positionResolution(project, selector);
    case SourceSelectorScheme.Token:
      return tokenResolution(project, selector);
    case SourceSelectorScheme.Declaration:
      return declarationResolution(project, selector);
    case SourceSelectorScheme.Export:
      return exportResolution(project, selector);
  }
}

/** Read bounded source text slices for one selector. */
export function readSourceText(
  /** Hot source project that owns source files. */
  project: SourceProject,
  /** Selector to read. */
  selector: SourceSelector,
  /** Text budget options. */
  options: SourceTextReadOptions,
): SourceTextRead {
  const resolution = resolveSourceSelector(project, selector);
  const slices = resolution.targets
    .filter((target): target is ResolvedSourceTarget & { readonly sourceFile: ts.SourceFile } => target.sourceFile !== undefined)
    .map((target) => {
      const sourceFile = target.sourceFile;
      const text = textForTarget(sourceFile, target);
      const capped = text.slice(0, options.maxTextChars);
      return {
        target: rowForTarget(target),
        text: capped,
        totalChars: text.length,
        truncated: capped.length < text.length,
      };
    });

  return { resolution: serializableResolution(resolution), slices };
}

/** Project a bounded TypeScript declaration surface for one selector. */
export function readApiSurface(
  /** Hot source project that owns TypeScript declarations. */
  project: SourceProject,
  /** Selector that roots the surface. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptApiSurface {
  const resolution = resolveSourceSelector(project, selector);
  const allEntries = declarationEntriesForResolution(project, resolution);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allEntries.slice(offset, offset + limit);
  const nextOffset = offset + entries.length < allEntries.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    rollup: {
      fileCount: selectedSourceFiles(resolution).length,
      totalEntries: allEntries.length,
      entryKindCounts: countDeclarationKinds(allEntries),
    },
    entries,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project a bounded static module graph for one selector. */
export function readModuleGraph(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the module graph. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptModuleGraph {
  const resolution = resolveSourceSelector(project, selector);
  const files = selectedSourceFiles(resolution);
  const allEdges = files.flatMap((sourceFile) => moduleEdgesForFile(project, sourceFile)).sort(compareModuleEdges);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const edges = allEdges.slice(offset, offset + limit);
  const nextOffset = offset + edges.length < allEdges.length ? offset + edges.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    fileCount: files.length,
    totalEdges: allEdges.length,
    edges,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript document symbols for one selector. */
export function readDocumentSymbols(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the document-symbol projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: DocumentSymbolOptions,
): TypeScriptDocumentSymbolsRead {
  const resolution = resolveSourceSelector(project, selector);
  const files = selectedSourceFiles(resolution);
  const query =
    options.query ??
    (selector.scheme === SourceSelectorScheme.Workspace
      ? selector.query
      : undefined);
  const allSymbols = files
    .flatMap((sourceFile) => documentSymbolsForFile(project, sourceFile))
    .filter(
      (row) =>
        query === undefined ||
        row.name.includes(query) ||
        row.kind.includes(query) ||
        row.kindModifiers.includes(query),
    )
    .sort(compareDocumentSymbols);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const symbols = allSymbols.slice(offset, offset + limit);
  const nextOffset = offset + symbols.length < allSymbols.length ? offset + symbols.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    fileCount: files.length,
    query,
    totalSymbols: allSymbols.length,
    symbols,
    offset,
    limit,
    nextOffset,
  };
}

/** Project a bounded declaration symbol index for one selector. */
export function readSymbolIndex(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the symbol index. */
  selector: SourceSelector,
  /** Row budget options. */
  options: SymbolIndexOptions,
): TypeScriptSymbolIndex {
  const resolution = resolveSourceSelector(project, selector);
  const query = options.query ?? (selector.scheme === SourceSelectorScheme.Workspace ? selector.query : undefined);
  const selectedFiles = new Set(selectedSourceFiles(resolution).map((sourceFile) => normalizeProjectAbsolutePath(project, sourceFile.fileName)));
  const allRows = project.declarationRows()
    .filter((row) => selectedFiles.has(normalizeProjectAbsolutePath(project, row.file.absolutePath)))
    .filter((row) => query === undefined || row.name?.includes(query) === true)
    .sort((left, right) =>
      left.file.repoPath.localeCompare(right.file.repoPath)
      || left.span.start - right.span.start
      || (left.name ?? "").localeCompare(right.name ?? "")
    );
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allRows
    .slice(offset, offset + limit)
    .map((row) => symbolEntryForRow(project, row, selector))
    .filter((entry): entry is TypeScriptApiSurfaceEntry => entry !== null);
  const nextOffset = offset + entries.length < allRows.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    query,
    totalEntries: allRows.length,
    entries,
    offset,
    limit,
    nextOffset,
  };
}

/** Project bounded checker-visible exports from package entrypoints or selected module files. */
export function readExportSurface(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the export surface. */
  selector: SourceSelector,
  /** Row budget and export name filters. */
  options: ExportSurfaceOptions,
): TypeScriptExportSurfaceRead {
  const resolution = resolveSourceSelector(project, selector);
  const surfaces = exportSurfaceFilesForResolution(project, resolution);
  const query = options.query;
  const context: ExportSurfaceReadContext = { memberPresenceBySymbol: new Map() };
  const entries = surfaces.flatMap((sourceFile) => exportEntriesForSurface(
    project,
    sourceFile,
    query,
    options.memberName,
    options.typeIncludes,
    options.typeSymbolName,
    options.includeMemberNames ?? true,
    context,
  ));
  const allExports = uniqueByKey(entries, (entry) => entry.id)
    .sort(compareExportRows);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const exports = allExports.slice(offset, offset + limit);
  const nextOffset = offset + exports.length < allExports.length ? offset + exports.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    surfaceCount: surfaces.length,
    totalExports: allExports.length,
    query,
    exports,
    offset,
    limit,
    nextOffset,
  };
}

/** Project bounded checker-visible export names without materializing value types. */
export function readExportNames(
  /** Hot source project that owns TypeScript source files. */
  project: SourceProject,
  /** Selector that roots the export surface. */
  selector: SourceSelector,
  /** Row budget and export-name filters. */
  options: ExportNameSurfaceOptions,
): TypeScriptExportNameSurfaceRead {
  const startedAt = performance.now();
  const resolution = resolveSourceSelector(project, selector);
  const afterResolution = performance.now();
  const surfaces = exportSurfaceFilesForResolution(project, resolution);
  const afterSurfaces = performance.now();
  const query = options.query;
  const entries = surfaces.flatMap((sourceFile) => exportNameEntriesForSurface(
    project,
    sourceFile,
    query,
    options.resolveAliases === true,
    options.includeFullyQualifiedName === true,
  ));
  const afterEntries = performance.now();
  const allExports = [...uniqueByKey(entries, (entry) => entry.id)].sort(compareExportRows);
  const afterSort = performance.now();
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const exports = allExports.slice(offset, offset + limit);
  const nextOffset = offset + exports.length < allExports.length ? offset + exports.length : undefined;
  const serializedResolution = serializableResolution(resolution);
  const afterSerialize = performance.now();
  if (process.env.ATLAS_PROFILE_EXPORT_NAMES === "1") {
    console.error(JSON.stringify({
      event: "atlas.source.exportNames.profile",
      resolutionMs: Math.round(afterResolution - startedAt),
      surfacesMs: Math.round(afterSurfaces - afterResolution),
      entriesMs: Math.round(afterEntries - afterSurfaces),
      sortMs: Math.round(afterSort - afterEntries),
      serializeMs: Math.round(afterSerialize - afterSort),
      totalMs: Math.round(afterSerialize - startedAt),
      surfaces: surfaces.length,
      entries: entries.length,
    }));
  }

  return {
    resolution: serializedResolution,
    surfaceCount: surfaces.length,
    totalExports: allExports.length,
    query,
    exports,
    offset,
    limit,
    nextOffset,
  };
}

/** Project bounded TypeChecker facts for one selector. */
export function readTypeFacts(
  /** Hot source project that owns the current checker. */
  project: SourceProject,
  /** Selector that roots checker fact projection. */
  selector: SourceSelector,
  /** Type fact budget options. */
  options: TypeFactOptions,
): TypeScriptTypeFacts {
  const resolution = resolveSourceSelector(project, selector);
  const targets = typeTargetsForResolution(project, resolution).slice(0, Math.max(1, Math.trunc(options.limit)));
  const checker = project.checker;

  return {
    resolution: serializableResolution(resolution),
    facts: targets.map((target) => typeFactForTarget(checker, target, Math.max(1, Math.trunc(options.memberLimit)))),
  };
}

/** Project bounded TypeScript references for one selector. */
export function readReferences(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots reference projection. */
  selector: SourceSelector,
  /** Reference budget options. */
  options: ReferenceReadOptions,
): TypeScriptReferenceRead {
  const resolution = resolveSourceSelector(project, selector);
  const allReferences = [...uniqueReferences(
    typeTargetsForResolution(project, resolution).flatMap((target) => referencesForTarget(project, target)),
  )].sort(compareReferences);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const references = allReferences.slice(offset, offset + limit);
  const nextOffset = offset + references.length < allReferences.length ? offset + references.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalReferences: allReferences.length,
    references,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript definition, type-definition, and implementation rows for one selector. */
export function readNavigation(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots navigation projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptNavigationRead {
  const resolution = resolveSourceSelector(project, selector);
  const allEntries = typeTargetsForResolution(project, resolution)
    .flatMap((target) => navigationForTarget(project, target))
    .sort(compareNavigationEntries);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allEntries.slice(offset, offset + limit);
  const nextOffset = offset + entries.length < allEntries.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalEntries: allEntries.length,
    entries,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript call-hierarchy rows for one selector. */
export function readCallHierarchy(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots call-hierarchy projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptCallHierarchyRead {
  const resolution = resolveSourceSelector(project, selector);
  const prepared = typeTargetsForResolution(project, resolution).flatMap((target) => callHierarchyForTarget(project, target));
  const items = uniqueCallHierarchyItems(prepared.flatMap((entry) => entry.items));
  const allEdges = prepared.flatMap((entry) => entry.edges).sort(compareCallHierarchyEdges);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const edges = allEdges.slice(offset, offset + limit);
  const nextOffset = offset + edges.length < allEdges.length ? offset + edges.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    items,
    totalEdges: allEdges.length,
    edges,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded exact TypeScript call-site rows for one selector. */
export function readCallSites(
  /** Hot source project that owns the current TypeChecker. */
  project: SourceProject,
  /** Selector that roots call-site projection. */
  selector: SourceSelector,
  /** Row budget and call-site filters. */
  options: CallSiteReadOptions,
): TypeScriptCallSitesRead {
  const resolution = resolveSourceSelector(project, selector);
  const kind = normalizeCallSiteKind(options.kind);
  const allCallSites = uniqueCallSites(resolution.targets.flatMap((target) => callSitesForTarget(project, target)))
    .filter((entry) => kind === null || entry.kind === kind)
    .filter((entry) => options.calleeName === undefined || entry.calleeName === options.calleeName || entry.callee.symbolName === options.calleeName)
    .filter((entry) => callSiteArgumentsMatch(entry, options))
    .sort(compareCallSites);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const callSites = allCallSites.slice(offset, offset + limit);
  const nextOffset = offset + callSites.length < allCallSites.length ? offset + callSites.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalCallSites: allCallSites.length,
    callSites,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

function callSiteArgumentsMatch(
  entry: TypeScriptCallSiteEntry,
  options: CallSiteReadOptions,
): boolean {
  if (
    options.argumentText === undefined &&
    options.argumentSymbolName === undefined &&
    options.argumentFullyQualifiedName === undefined
  ) {
    return true;
  }
  return entry.arguments.some((argument) =>
    (options.argumentText === undefined ||
      argument.expression.text === options.argumentText) &&
    (options.argumentSymbolName === undefined ||
      argument.expression.symbolName === options.argumentSymbolName) &&
    (options.argumentFullyQualifiedName === undefined ||
      argument.expression.fullyQualifiedName === options.argumentFullyQualifiedName),
  );
}

/** Project bounded TypeScript syntactic, semantic, and suggestion diagnostics for selected source files. */
export function readDiagnostics(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots diagnostic projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptDiagnosticsRead {
  const resolution = resolveSourceSelector(project, selector);
  const files = selectedSourceFiles(resolution);
  const allDiagnostics = files
    .flatMap((sourceFile) => diagnosticsForFile(project, sourceFile))
    .sort(compareDiagnostics);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const diagnostics = allDiagnostics.slice(offset, offset + limit);
  const nextOffset = offset + diagnostics.length < allDiagnostics.length ? offset + diagnostics.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalDiagnostics: allDiagnostics.length,
    diagnostics,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript rename locations for the first selected target. */
export function readRename(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots rename projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptRenameRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const position = target === undefined ? null : referencePositionForTarget(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (target === undefined || position === null) {
    return {
      resolution: serializableResolution(resolution),
      canRename: false,
      error: "No source target with a TypeScript position was resolved.",
      totalLocations: 0,
      locations: [],
      offset,
      limit,
    };
  }

  const info = project.languageService.getRenameInfo(position.fileName, position.offset, {});
  if (!info.canRename) {
    return {
      resolution: serializableResolution(resolution),
      canRename: false,
      error: info.localizedErrorMessage,
      totalLocations: 0,
      locations: [],
      offset,
      limit,
    };
  }

  const allLocations = (project.languageService.findRenameLocations(position.fileName, position.offset, false, false, {
    providePrefixAndSuffixTextForRename: true,
  }) ?? [])
    .map((location) => renameLocationEntry(project, location))
    .filter((entry): entry is TypeScriptRenameLocationEntry => entry !== null)
    .sort(compareRenameLocations);
  const locations = allLocations.slice(offset, offset + limit);
  const nextOffset = offset + locations.length < allLocations.length ? offset + locations.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    canRename: true,
    fileToRename: info.fileToRename === undefined ? undefined : fileIdentityForPath(project, info.fileToRename),
    displayName: info.displayName,
    fullDisplayName: info.fullDisplayName,
    kind: info.kind,
    totalLocations: allLocations.length,
    locations,
    offset,
    limit,
    nextOffset,
  };
}

/** Project bounded TypeScript refactor actions for the first selected target. */
export function readRefactors(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots refactor projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptRefactorsRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const positionOrRange = target === undefined ? null : refactorPositionOrRange(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (target?.sourceFile === undefined || positionOrRange === null) {
    return {
      resolution: serializableResolution(resolution),
      totalActions: 0,
      actions: [],
      offset,
      limit,
    };
  }

  const allActions = project.languageService
    .getApplicableRefactors(target.sourceFile.fileName, positionOrRange, undefined, "invoked", undefined, true)
    .flatMap((refactor) => refactor.actions.map((action) => ({
      refactorName: refactor.name,
      refactorDescription: refactor.description,
      actionName: action.name,
      actionDescription: action.description,
      kind: action.kind,
      notApplicableReason: action.notApplicableReason,
      interactive: action.isInteractive === true,
    })))
    .sort(compareRefactorActions);
  const actions = allActions.slice(offset, offset + limit);
  const nextOffset = offset + actions.length < allActions.length ? offset + actions.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalActions: allActions.length,
    actions,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript quick-info rows for one selector. */
export function readQuickInfo(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots quick-info projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptQuickInfoRead {
  const resolution = resolveSourceSelector(project, selector);
  const allEntries = typeTargetsForResolution(project, resolution)
    .map((target) => quickInfoForTarget(project, target))
    .filter((entry): entry is TypeScriptQuickInfoEntry => entry !== null)
    .sort(compareSourceSpanKindEntries);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const entries = allEntries.slice(offset, offset + limit);
  const nextOffset = offset + entries.length < allEntries.length ? offset + entries.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalEntries: allEntries.length,
    entries,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript signature-help rows for one selector. */
export function readSignatureHelp(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots signature-help projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptSignatureHelpRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const position = target === undefined ? null : referencePositionForTarget(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (target === undefined || position === null) {
    return {
      resolution: serializableResolution(resolution),
      totalItems: 0,
      items: [],
      offset,
      limit,
    };
  }
  const help = project.languageService.getSignatureHelpItems(position.fileName, position.offset, undefined);
  if (help === undefined) {
    return {
      resolution: serializableResolution(resolution),
      totalItems: 0,
      items: [],
      offset,
      limit,
    };
  }
  const sourceFile = project.readSourceFile(position.fileName);
  const applicableSpan = sourceFile === null ? undefined : sourceSpanFromTextSpan(sourceFile, help.applicableSpan);
  const allItems = help.items.map((item, index) => signatureHelpEntry(rowForTarget(target), item, index, index === help.selectedItemIndex));
  const items = allItems.slice(offset, offset + limit);
  const nextOffset = offset + items.length < allItems.length ? offset + items.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    applicableSpan,
    selectedItemIndex: help.selectedItemIndex,
    argumentIndex: help.argumentIndex,
    argumentCount: help.argumentCount,
    totalItems: allItems.length,
    items,
    offset,
    limit,
    nextOffset,
  };
}

/** Project bounded TypeScript document highlights for one selector. */
export function readHighlights(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots highlight projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptHighlightsRead {
  const resolution = resolveSourceSelector(project, selector);
  const target = typeTargetsForResolution(project, resolution)[0];
  const position = target === undefined ? null : referencePositionForTarget(target);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  if (position === null) {
    return {
      resolution: serializableResolution(resolution),
      totalHighlights: 0,
      highlights: [],
      offset,
      limit,
    };
  }
  const filesToSearch = selectedSourceFiles(resolution).map((sourceFile) => sourceFile.fileName);
  const allHighlights = (project.languageService.getDocumentHighlights(position.fileName, position.offset, filesToSearch) ?? [])
    .flatMap((group) => group.highlightSpans.map((span) => highlightEntry(project, group.fileName, span)))
    .filter((entry): entry is TypeScriptHighlightEntry => entry !== null)
    .sort(compareSourceSpanKindEntries);
  const highlights = allHighlights.slice(offset, offset + limit);
  const nextOffset = offset + highlights.length < allHighlights.length ? offset + highlights.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalHighlights: allHighlights.length,
    highlights,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project bounded TypeScript code-fix actions with exact edit payloads. */
export function readCodeFixes(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots code-fix projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptCodeFixesRead {
  const resolution = resolveSourceSelector(project, selector);
  const allActions = selectedSourceFiles(resolution)
    .flatMap((sourceFile) => diagnosticsForFile(project, sourceFile))
    .flatMap((diagnostic) => codeFixesForDiagnostic(project, diagnostic))
    .sort(compareCodeFixActions);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const actions = allActions.slice(offset, offset + limit);
  const nextOffset = offset + actions.length < allActions.length ? offset + actions.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalActions: allActions.length,
    actions,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project a concrete TypeScript refactor edit plan. */
export function readRefactorEdits(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots refactor edit projection. */
  selector: SourceSelector,
  /** Refactor action and row budget options. */
  options: RefactorEditOptions,
): TypeScriptRefactorEditsRead {
  const resolution = resolveSourceSelector(project, selector);
  const refactorName = options.refactorName;
  const actionName = options.actionName;
  if (refactorName === undefined || actionName === undefined) {
    return {
      resolution: serializableResolution(resolution),
      refactorName,
      actionName,
      applicable: false,
      notApplicableReason: "Refactor edit reads require refactorName and actionName from the refactors projection.",
      changes: [],
      commandCount: 0,
    };
  }
  const target = typeTargetsForResolution(project, resolution)[0];
  const positionOrRange = target === undefined ? null : refactorPositionOrRange(target);
  if (target?.sourceFile === undefined || positionOrRange === null) {
    return {
      resolution: serializableResolution(resolution),
      refactorName,
      actionName,
      applicable: false,
      notApplicableReason: "No source target with a TypeScript position was resolved.",
      changes: [],
      commandCount: 0,
    };
  }
  const editInfo = project.languageService.getEditsForRefactor(
    target.sourceFile.fileName,
    defaultFormatCodeSettings(),
    positionOrRange,
    refactorName,
    actionName,
    defaultUserPreferences(),
    options.targetFile === undefined ? undefined : { targetFile: options.targetFile },
  );
  if (editInfo === undefined) {
    return {
      resolution: serializableResolution(resolution),
      refactorName,
      actionName,
      applicable: false,
      notApplicableReason: "TypeScript did not return edits for this refactor action.",
      changes: [],
      commandCount: 0,
    };
  }
  return {
    resolution: serializableResolution(resolution),
    refactorName,
    actionName,
    applicable: editInfo.notApplicableReason === undefined,
    notApplicableReason: editInfo.notApplicableReason,
    changes: editInfo.edits.map((change, index) => fileEdits(project, change, `refactor:${index}`)),
    renameFile: editInfo.renameFilename === undefined ? undefined : fileIdentityForPath(project, editInfo.renameFilename),
    renameLocation: editInfo.renameLocation,
    commandCount: editInfo.commands?.length ?? 0,
  };
}

/** Project TypeScript organize-imports edit plans for selected files. */
export function readOrganizeImports(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots organize-imports projection. */
  selector: SourceSelector,
  /** Row budget options. */
  options: ApiSurfaceOptions,
): TypeScriptOrganizeImportsRead {
  const resolution = resolveSourceSelector(project, selector);
  const allChanges = selectedSourceFiles(resolution)
    .flatMap((sourceFile) => project.languageService.organizeImports(
      { type: "file", fileName: sourceFile.fileName },
      defaultFormatCodeSettings(),
      defaultUserPreferences(),
    ))
    .map((change, index) => fileEdits(project, change, `organize-imports:${index}`))
    .filter((change) => change.edits.length > 0)
    .sort(compareFileEdits);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const changes = allChanges.slice(offset, offset + limit);
  const nextOffset = offset + changes.length < allChanges.length ? offset + changes.length : undefined;

  return {
    resolution: serializableResolution(resolution),
    totalFiles: allChanges.length,
    changes,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

/** Project TypeScript edit plans for a file rename without applying them. */
export function readFileRenameEdits(
  /** Hot source project that owns the current LanguageService. */
  project: SourceProject,
  /** Selector that roots default old-file resolution. */
  selector: SourceSelector,
  /** File rename options. */
  options: FileRenameEditOptions,
): TypeScriptFileRenameEditsRead {
  const resolution = resolveSourceSelector(project, selector);
  const selectedFile = selectedSourceFiles(resolution)[0];
  const oldFilePath = options.oldFilePath ?? selectedFile?.fileName;
  const newFilePath = options.newFilePath;
  if (oldFilePath === undefined || newFilePath === undefined) {
    return {
      resolution: serializableResolution(resolution),
      applicable: false,
      notApplicableReason: "File rename edit reads require a selected old file and a newFilePath filter.",
      changes: [],
    };
  }
  const oldAbsolutePath = languageServicePath(project, oldFilePath);
  const newAbsolutePath = languageServicePath(project, newFilePath);
  const changes = project.languageService
    .getEditsForFileRename(oldAbsolutePath, newAbsolutePath, defaultFormatCodeSettings(), defaultUserPreferences())
    .map((change, index) => fileEdits(project, change, `file-rename:${index}`))
    .filter((change) => change.edits.length > 0)
    .sort(compareFileEdits);

  return {
    resolution: serializableResolution(resolution),
    applicable: true,
    oldFile: fileIdentityForPath(project, oldAbsolutePath),
    newFile: fileIdentityForPath(project, newAbsolutePath),
    changes,
  };
}

/** Convert an internal target into a serializable row. */
export function rowForTarget(
  /** Current-epoch target to strip. */
  target: ResolvedSourceTarget,
): SourceTargetRow {
  const {
    sourceFile: _sourceFile,
    node: _node,
    symbol: _symbol,
    ...row
  } = target;
  return row;
}

function workspaceResolution(project: SourceProject, selector: WorkspaceSourceSelector): ResolvedSourceSelectorResolution {
  const targets = project.ownedSourceFiles().map((sourceFile) => sourceFileTarget(project, sourceFile, selector));
  return { selector, targets, candidateCount: targets.length, diagnostics: [] };
}

function packageResolution(project: SourceProject, selector: PackageSourceSelector): ResolvedSourceSelectorResolution {
  const targets = project.ownedSourceFiles()
    .filter((sourceFile) => packageMatches(project, sourceFile.fileName, selector.packageId, selector.packageName))
    .map((sourceFile) => sourceFileTarget(project, sourceFile, selector));
  const diagnostics = targets.length === 0
    ? [{ code: "source.package.no-match", message: "No admitted package matched the package selector." }]
    : [];
  return { selector, targets, candidateCount: targets.length, diagnostics };
}

function directoryResolution(project: SourceProject, selector: DirectorySourceSelector): ResolvedSourceSelectorResolution {
  const directoryPath = normalizeRepoSelectorPath(project, selector.path);
  const recursive = selector.recursive !== false;
  const targets = project.ownedSourceFiles()
    .filter((sourceFile) => {
      const identity = project.requiredSourceFileIdentity(sourceFile);
      const filePath = identity.repoPath;
      if (recursive) {
        return filePath === directoryPath || filePath.startsWith(`${directoryPath}/`);
      }
      return path.posix.dirname(filePath) === directoryPath;
    })
    .map((sourceFile) => sourceFileTarget(project, sourceFile, selector));
  const diagnostics = targets.length === 0
    ? [{ code: "source.directory.no-match", message: "No admitted source files matched the directory selector." }]
    : [];
  return { selector, targets, candidateCount: targets.length, diagnostics };
}

function fileResolution(project: SourceProject, selector: FileSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return {
      selector,
      targets: [],
      candidateCount: 0,
      diagnostics: [{ code: "source.file.no-match", message: "No Program source file matched the file selector." }],
    };
  }
  const target = sourceFileTarget(project, sourceFile, selector);
  return { selector, targets: [target], candidateCount: 1, diagnostics: [] };
}

function rangeResolution(project: SourceProject, selector: RangeSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return emptyResolution(selector, "source.range.file-no-match", "No Program source file matched the range selector.");
  }
  const start = positionToOffset(sourceFile, selector.start);
  const end = positionToOffset(sourceFile, selector.end);
  if (start === null || end === null || end < start) {
    return emptyResolution(selector, "source.range.invalid", "The source range is outside the selected file.");
  }
  const node = smallestNodeContaining(sourceFile, start, end);
  const target = sourceRangeTarget(project, sourceFile, node ?? sourceFile, start, end, selector);
  return { selector, targets: [target], candidateCount: 1, diagnostics: [] };
}

function positionResolution(project: SourceProject, selector: PositionSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return emptyResolution(selector, "source.position.file-no-match", "No Program source file matched the position selector.");
  }
  const offset = positionToOffset(sourceFile, selector);
  if (offset === null) {
    return emptyResolution(selector, "source.position.invalid", "The source position is outside the selected file.");
  }
  const node = smallestNodeAt(sourceFile, offset);
  const target = sourceRangeTarget(project, sourceFile, node ?? sourceFile, node?.getStart(sourceFile) ?? offset, node?.getEnd() ?? offset, selector);
  return { selector, targets: [target], candidateCount: 1, diagnostics: [] };
}

function tokenResolution(project: SourceProject, selector: TokenSourceSelector): ResolvedSourceSelectorResolution {
  const sourceFile = project.readSourceFile(selector.filePath);
  if (sourceFile === null) {
    return emptyResolution(selector, "source.token.file-no-match", "No Program source file matched the token selector.");
  }
  const matches: ResolvedSourceTarget[] = [];
  visitNode(sourceFile, (node) => {
    if (ts.isIdentifier(node) && node.text === selector.text) {
      matches.push(sourceRangeTarget(project, sourceFile, node, node.getStart(sourceFile), node.getEnd(), selector));
    }
  });
  const targets = applyOccurrence(matches, selector.occurrence);
  const diagnostics = targets.length === 0
    ? [{ code: "source.token.no-match", message: "No exact identifier token matched the selector." }]
    : [];
  return { selector, targets, candidateCount: matches.length, diagnostics };
}

function declarationResolution(project: SourceProject, selector: DeclarationSourceSelector): ResolvedSourceSelectorResolution {
  const normalizedKind = normalizeDeclarationKind(selector.kind);
  const fileKey = selector.filePath === undefined ? null : normalizeProjectAbsolutePath(project, selector.filePath);
  const candidates = project.declarationRows()
    .filter((row) => row.name === selector.name)
    .filter((row) => normalizedKind === null || row.kind === normalizedKind)
    .filter((row) => selector.packageId === undefined || row.file.packageId === selector.packageId)
    .filter((row) => selector.packageName === undefined || packageNameForFile(project, row.file.absolutePath) === selector.packageName)
    .filter((row) => fileKey === null || normalizeProjectAbsolutePath(project, row.file.absolutePath) === fileKey)
    .map((row) => declarationTargetForRow(project, row, selector))
    .filter((target): target is ResolvedSourceTarget => target !== null)
    .sort(compareTargets);
  const targets = applyOccurrence(candidates, selector.occurrence);
  const diagnostics = targets.length === 0
    ? [{ code: "source.declaration.no-match", message: "No exact declaration matched the selector." }]
    : [];
  return { selector, targets, candidateCount: candidates.length, diagnostics };
}

function exportResolution(project: SourceProject, selector: ExportSourceSelector): ResolvedSourceSelectorResolution {
  const surfaces = exportSurfaceFiles(project, selector);
  const candidates: ResolvedSourceTarget[] = [];
  const checker = project.checker;
  for (const sourceFile of surfaces) {
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    const exports = moduleSymbol === undefined ? [] : checker.getExportsOfModule(moduleSymbol);
    const symbol = exports.find((entry) => entry.getName() === selector.exportName);
    if (symbol === undefined) {
      continue;
    }
    const declarations = symbol.getDeclarations() ?? [];
    for (const declaration of declarations) {
      candidates.push(declarationTarget(project, sourceFileForNode(project, declaration), declaration, selector, true, symbol));
    }
  }
  const targets = candidates.sort(compareTargets);
  const diagnostics = targets.length === 0
    ? [{ code: "source.export.no-match", message: "No exact exported declaration matched the selector." }]
    : [];
  return { selector, targets, candidateCount: targets.length, diagnostics };
}

function moduleEdgesForFile(project: SourceProject, sourceFile: ts.SourceFile): readonly TypeScriptModuleEdge[] {
  const edges: TypeScriptModuleEdge[] = [];
  const sourceIdentity = requiredSourceFileIdentity(project, sourceFile);
  visitNode(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      edges.push({
        id: moduleEdgeId(sourceIdentity, node),
        kind: TypeScriptModuleEdgeKind.Import,
        sourceFile: sourceIdentity,
        specifier: node.moduleSpecifier.text,
        ...resolvedModuleField(project, sourceFile, node.moduleSpecifier.text),
        importedNames: importNames(node.importClause),
        exportedNames: [],
        typeOnly: hasTrueIsTypeOnly(node.importClause),
        span: sourceSpanForNode(sourceFile, node),
      });
      return;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteralLike(node.moduleSpecifier)) {
      edges.push({
        id: moduleEdgeId(sourceIdentity, node),
        kind: TypeScriptModuleEdgeKind.Export,
        sourceFile: sourceIdentity,
        specifier: node.moduleSpecifier.text,
        ...resolvedModuleField(project, sourceFile, node.moduleSpecifier.text),
        importedNames: [],
        exportedNames: exportNames(node.exportClause),
        typeOnly: node.isTypeOnly,
        span: sourceSpanForNode(sourceFile, node),
      });
      return;
    }
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      const specifier = node.arguments[0]!.text;
      edges.push({
        id: moduleEdgeId(sourceIdentity, node),
        kind: TypeScriptModuleEdgeKind.DynamicImport,
        sourceFile: sourceIdentity,
        specifier,
        ...resolvedModuleField(project, sourceFile, specifier),
        importedNames: [],
        exportedNames: [],
        typeOnly: false,
        span: sourceSpanForNode(sourceFile, node),
      });
    }
  });
  return edges;
}

function documentSymbolsForFile(project: SourceProject, sourceFile: ts.SourceFile): readonly TypeScriptDocumentSymbolEntry[] {
  const file = requiredSourceFileIdentity(project, sourceFile);
  const tree = project.languageService.getNavigationTree(sourceFile.fileName);
  const symbols: TypeScriptDocumentSymbolEntry[] = [];
  const visitTree = (node: ts.NavigationTree, depth: number): void => {
    if (depth > 0) {
      const span = node.spans[0] ?? { start: 0, length: sourceFile.getFullText().length };
      symbols.push({
        id: `document-symbol:${file.repoPath}:${span.start}:${node.text}:${depth}`,
        file,
        name: node.text,
        kind: node.kind,
        kindModifiers: node.kindModifiers,
        span: sourceSpanFromTextSpan(sourceFile, span),
        nameSpan: node.nameSpan === undefined ? undefined : sourceSpanFromTextSpan(sourceFile, node.nameSpan),
        depth: depth - 1,
        childCount: node.childItems?.length ?? 0,
      });
    }
    for (const child of node.childItems ?? []) {
      visitTree(child, depth + 1);
    }
  };
  visitTree(tree, 0);
  return symbols;
}

function declarationEntriesForResolution(project: SourceProject, resolution: ResolvedSourceSelectorResolution): readonly TypeScriptApiSurfaceEntry[] {
  const checker = project.checker;
  const selector = resolution.selector;
  const exportSelector = selector.scheme === SourceSelectorScheme.Export;
  const files = selectedSourceFiles(resolution);
  const entries: TypeScriptApiSurfaceEntry[] = [];

  for (const file of files) {
    visitNode(file, (node) => {
      const kind = sourceDeclarationKindForNode(node);
      if (kind === null) {
        return;
      }
      const nameNode = declarationNameNode(node);
      const name = nameNode?.getText(file) ?? null;
      if (selector.scheme === SourceSelectorScheme.Workspace && selector.query !== undefined && name !== selector.query) {
        return;
      }
      entries.push(apiEntryForDeclaration(project, checker, file, node, kind, exportSelector));
    });
  }

  if (
    resolution.targets.some((target) => target.kind === SourceTargetKind.Declaration || target.kind === SourceTargetKind.Symbol)
  ) {
    return resolution.targets
      .filter((target): target is ResolvedSourceTarget & { readonly node: ts.Node; readonly sourceFile: ts.SourceFile } =>
        target.node !== undefined && target.sourceFile !== undefined
      )
      .map((target) => {
        const sourceFile = target.sourceFile;
        const node = target.node;
        const kind = sourceDeclarationKindForNode(node) ?? target.declarationKind ?? SourceDeclarationKind.Variable;
        return apiEntryForDeclaration(project, checker, sourceFile, node, kind, exportSelector);
      })
      .sort(compareEntries);
  }

  return entries.sort(compareEntries);
}

function typeTargetsForResolution(project: SourceProject, resolution: ResolvedSourceSelectorResolution): readonly ResolvedSourceTarget[] {
  const directTargets = resolution.targets.filter((target) => target.node !== undefined);
  if (directTargets.length > 0) {
    return directTargets;
  }
  const entries = declarationEntriesForResolution(project, resolution);
  return entries
    .map((entry) => targetForEntry(project, entry, resolution.selector))
    .filter((target): target is ResolvedSourceTarget => target !== null);
}

function typeFactForTarget(checker: ts.TypeChecker, target: ResolvedSourceTarget, memberLimit: number): TypeScriptTypeFact {
  const node = target.node ?? target.sourceFile;
  if (node === undefined) {
    return {
      target: rowForTarget(target),
      symbolName: null,
      fullyQualifiedName: null,
      type: "unknown",
      apparentType: "unknown",
      typeFlags: 0,
      symbolFlags: null,
      callSignatureCount: 0,
      constructSignatureCount: 0,
      members: [],
      membersTruncated: false,
    };
  }
  const symbol = target.symbol ?? symbolForTypeLocationNode(checker, node) ?? null;
  const type = checker.getTypeAtLocation(typeLocationNode(node));
  const apparentType = checker.getApparentType(type);
  const properties = apparentType.getProperties().sort((left, right) => left.getName().localeCompare(right.getName()));
  const members = properties.slice(0, memberLimit).map((property) => memberFact(checker, property, node));
  return {
    target: rowForTarget(target),
    symbolName: symbol?.getName() ?? null,
    fullyQualifiedName: symbol === null ? null : checker.getFullyQualifiedName(symbol),
    type: checker.typeToString(type, node),
    apparentType: checker.typeToString(apparentType, node),
    typeFlags: type.flags,
    symbolFlags: symbol?.flags ?? null,
    callSignatureCount: type.getCallSignatures().length,
    constructSignatureCount: type.getConstructSignatures().length,
    members,
    membersTruncated: members.length < properties.length,
  };
}

function memberFact(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node): TypeScriptMemberFact {
  const declarations = symbol.getDeclarations() ?? [];
  const declaration = declarations[0];
  const valueType = checker.getTypeOfSymbolAtLocation(symbol, declaration ?? location);
  return {
    name: symbol.getName(),
    type: valueType === undefined ? null : checker.typeToString(valueType, location),
    optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
    ...(declaration === undefined ? {} : { span: sourceSpanForNode(declaration.getSourceFile(), declaration) }),
  };
}

function referencesForTarget(project: SourceProject, target: ResolvedSourceTarget): readonly TypeScriptReferenceEntry[] {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return [];
  }
  const referencedSymbols = project.languageService.findReferences(position.fileName, position.offset) ?? [];
  return referencedSymbols.flatMap((referencedSymbol) => {
    const definitionKey = referenceKey(referencedSymbol.definition?.fileName, referencedSymbol.definition?.textSpan);
    return referencedSymbol.references
      .map((reference) => referenceEntry(project, reference, definitionKey))
      .filter((entry): entry is TypeScriptReferenceEntry => entry !== null);
  });
}

function referencePositionForTarget(target: ResolvedSourceTarget): { readonly fileName: string; readonly offset: number } | null {
  const sourceFile = target.sourceFile;
  if (sourceFile === undefined) {
    return null;
  }
  if (target.node !== undefined) {
    const node = declarationNameNode(target.node) ?? target.node;
    return { fileName: sourceFile.fileName, offset: node.getStart(sourceFile) };
  }
  if (target.span !== undefined) {
    return { fileName: sourceFile.fileName, offset: target.span.start };
  }
  return null;
}

function referenceEntry(project: SourceProject, reference: ts.ReferenceEntry, definitionKey: string | null): TypeScriptReferenceEntry | null {
  const sourceFile = project.readSourceFile(reference.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = requiredSourceFileIdentity(project, sourceFile);
  const start = reference.textSpan.start;
  const end = reference.textSpan.start + reference.textSpan.length;
  const key = referenceKey(reference.fileName, reference.textSpan);
  const definition = definitionKey !== null && key === definitionKey;
  const node = nodeAtTextSpan(sourceFile, reference.textSpan);
  return {
    id: `reference:${file.repoPath}:${start}:${end}`,
    file,
    span: sourceSpanFromOffsets(sourceFile, start, end),
    text: sourceFile.getFullText().slice(start, end),
    definition,
    writeAccess: reference.isWriteAccess === true,
    inString: reference.isInString === true,
    roles: referenceRoles(reference, definition, node),
    ...(node === null ? {} : { syntaxKindName: ts.SyntaxKind[node.kind] }),
  };
}

function referenceKey(fileName: string | undefined, textSpan: ts.TextSpan | undefined): string | null {
  return fileName === undefined || textSpan === undefined
    ? null
    : `${path.resolve(fileName)}:${textSpan.start}:${textSpan.length}`;
}

function uniqueReferences(references: readonly TypeScriptReferenceEntry[]): readonly TypeScriptReferenceEntry[] {
  const byId = new Map<string, TypeScriptReferenceEntry>();
  for (const reference of references) {
    byId.set(reference.id, reference);
  }
  return [...byId.values()];
}

function referenceRoles(reference: ts.ReferenceEntry, definition: boolean, node: ts.Node | null): readonly TypeScriptReferenceRole[] {
  const roles = new Set<TypeScriptReferenceRole>();
  if (definition) {
    roles.add(TypeScriptReferenceRole.Definition);
  }
  roles.add(reference.isWriteAccess === true ? TypeScriptReferenceRole.Write : TypeScriptReferenceRole.Read);
  if (reference.isInString === true) {
    roles.add(TypeScriptReferenceRole.StringLiteral);
  }
  if (node === null) {
    return [...roles].sort();
  }
  for (let current: ts.Node | undefined = node; current !== undefined; current = current.parent) {
    if (isImportSyntax(current)) {
      roles.add(TypeScriptReferenceRole.Import);
    }
    if (isExportSyntax(current)) {
      roles.add(TypeScriptReferenceRole.Export);
    }
    if (hasTrueIsTypeOnly(current)) {
      roles.add(TypeScriptReferenceRole.TypeOnly);
    }
    if (ts.isTypeNode(current)) {
      roles.add(TypeScriptReferenceRole.TypePosition);
    }
    if (ts.isCallExpression(current) && nodeWithin(node, current.expression)) {
      roles.add(TypeScriptReferenceRole.Call);
    }
    if (ts.isNewExpression(current) && nodeWithin(node, current.expression)) {
      roles.add(TypeScriptReferenceRole.Construct);
    }
    if (ts.isPropertyAccessExpression(current) && nodeWithin(node, current)) {
      roles.add(TypeScriptReferenceRole.PropertyAccess);
    }
    if (ts.isElementAccessExpression(current) && nodeWithin(node, current)) {
      roles.add(TypeScriptReferenceRole.ElementAccess);
    }
    if (isObjectLiteralKeyNode(current, node)) {
      roles.add(TypeScriptReferenceRole.ObjectLiteralKey);
    }
    if (ts.isHeritageClause(current)) {
      roles.add(TypeScriptReferenceRole.Heritage);
    }
    if (ts.isDecorator(current)) {
      roles.add(TypeScriptReferenceRole.Decorator);
    }
  }
  return [...roles].sort();
}

function navigationForTarget(project: SourceProject, target: ResolvedSourceTarget): readonly TypeScriptNavigationEntry[] {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return [];
  }
  const origin = rowForTarget(target);
  const definition = project.languageService.getDefinitionAndBoundSpan(position.fileName, position.offset)?.definitions ?? [];
  const typeDefinitions = project.languageService.getTypeDefinitionAtPosition(position.fileName, position.offset) ?? [];
  const implementations = project.languageService.getImplementationAtPosition(position.fileName, position.offset) ?? [];
  return [
    ...definition.map((entry) => navigationEntry(project, TypeScriptNavigationKind.Definition, origin, entry)),
    ...typeDefinitions.map((entry) => navigationEntry(project, TypeScriptNavigationKind.TypeDefinition, origin, entry)),
    ...implementations.map((entry) => navigationEntry(project, TypeScriptNavigationKind.Implementation, origin, entry)),
  ].filter((entry): entry is TypeScriptNavigationEntry => entry !== null);
}

function navigationEntry(
  project: SourceProject,
  kind: TypeScriptNavigationKind,
  origin: SourceTargetRow,
  entry: ts.DefinitionInfo | ts.ImplementationLocation,
): TypeScriptNavigationEntry | null {
  const sourceFile = project.readSourceFile(entry.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = requiredSourceFileIdentity(project, sourceFile);
  const start = entry.textSpan.start;
  const end = entry.textSpan.start + entry.textSpan.length;
  const name = "name" in entry ? entry.name : undefined;
  const containerName = "containerName" in entry ? entry.containerName : undefined;
  const display = "displayParts" in entry ? displayPartsText(entry.displayParts) : undefined;
  return {
    id: `navigation:${kind}:${file.repoPath}:${start}:${end}:${name ?? display ?? ""}`,
    kind,
    origin,
    file,
    span: sourceSpanFromTextSpan(sourceFile, entry.textSpan),
    contextSpan: entry.contextSpan === undefined ? undefined : sourceSpanFromTextSpan(sourceFile, entry.contextSpan),
    scriptElementKindName: entry.kind,
    name,
    containerName,
    display,
  };
}

function callHierarchyForTarget(
  project: SourceProject,
  target: ResolvedSourceTarget,
): readonly { readonly items: readonly TypeScriptCallHierarchyItemRow[]; readonly edges: readonly TypeScriptCallHierarchyEdge[] }[] {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return [];
  }
  const prepared = project.languageService.prepareCallHierarchy(position.fileName, position.offset);
  const preparedItems = prepared === undefined ? [] : Array.isArray(prepared) ? prepared : [prepared];
  const selectedItems = preparedItems
    .map((item) => callHierarchyItemRow(project, item))
    .filter((item): item is TypeScriptCallHierarchyItemRow => item !== null);
  const selected = selectedItems[0];
  if (selected === undefined) {
    return [{ items: [], edges: [] }];
  }
  const incomingEdges = project.languageService.provideCallHierarchyIncomingCalls(position.fileName, position.offset)
    .map((call) => {
      const from = callHierarchyItemRow(project, call.from);
      if (from === null) {
        return null;
      }
      return {
        id: `call:${TypeScriptCallHierarchyDirection.Incoming}:${from.id}:${selected.id}:${call.fromSpans.map((span) => `${span.start}:${span.length}`).join(",")}`,
        relation: TypeScriptCallHierarchyRelation.Calls,
        direction: TypeScriptCallHierarchyDirection.Incoming,
        from,
        to: selected,
        fromSpans: call.fromSpans.map((span) => sourceSpanFromTextSpanForFileName(project, call.from.file, span)).filter((span): span is SourceSpan => span !== null),
      };
    })
    .filter((edge) => edge !== null) as TypeScriptCallHierarchyEdge[];
  const outgoingEdges = project.languageService.provideCallHierarchyOutgoingCalls(position.fileName, position.offset)
    .map((call) => {
      const to = callHierarchyItemRow(project, call.to);
      if (to === null) {
        return null;
      }
      return {
        id: `call:${TypeScriptCallHierarchyDirection.Outgoing}:${selected.id}:${to.id}:${call.fromSpans.map((span) => `${span.start}:${span.length}`).join(",")}`,
        relation: TypeScriptCallHierarchyRelation.Calls,
        direction: TypeScriptCallHierarchyDirection.Outgoing,
        from: selected,
        to,
        fromSpans: call.fromSpans.map((span) => sourceSpanFromTextSpanForFileName(project, selected.file.absolutePath, span)).filter((span): span is SourceSpan => span !== null),
      };
    })
    .filter((edge) => edge !== null) as TypeScriptCallHierarchyEdge[];
  return [{ items: selectedItems, edges: [...incomingEdges, ...outgoingEdges] }];
}

function callHierarchyItemRow(project: SourceProject, item: ts.CallHierarchyItem): TypeScriptCallHierarchyItemRow | null {
  const sourceFile = project.readSourceFile(item.file);
  if (sourceFile === null) {
    return null;
  }
  const file = requiredSourceFileIdentity(project, sourceFile);
  return {
    id: `call-item:${file.repoPath}:${item.selectionSpan.start}:${item.selectionSpan.length}:${item.name}`,
    name: item.name,
    kind: item.kind,
    containerName: item.containerName,
    file,
    span: sourceSpanFromTextSpan(sourceFile, item.span),
    selectionSpan: sourceSpanFromTextSpan(sourceFile, item.selectionSpan),
  };
}

function uniqueCallHierarchyItems(items: readonly TypeScriptCallHierarchyItemRow[]): readonly TypeScriptCallHierarchyItemRow[] {
  const byId = new Map<string, TypeScriptCallHierarchyItemRow>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return [...byId.values()].sort(compareCallHierarchyItems);
}

type TypeScriptCallLikeExpression = ts.CallExpression | ts.NewExpression;

function callSitesForTarget(project: SourceProject, target: ResolvedSourceTarget): readonly TypeScriptCallSiteEntry[] {
  const sourceFile = target.sourceFile;
  if (sourceFile === undefined) {
    return [];
  }
  if (target.span !== undefined) {
    const callLike = findEnclosingCallLike(sourceFile, target.node, target.span.start, target.span.end);
    if (callLike !== null) {
      const entry = callSiteEntry(project, sourceFile, callLike);
      return entry === null ? [] : [entry];
    }
  }
  const root = target.node ?? sourceFile;
  const entries: TypeScriptCallSiteEntry[] = [];
  visitNode(root, (node) => {
    if (!isCallLikeExpression(node)) {
      return;
    }
    const entry = callSiteEntry(project, sourceFile, node);
    if (entry !== null) {
      entries.push(entry);
    }
  });
  return entries;
}

function findEnclosingCallLike(
  sourceFile: ts.SourceFile,
  node: ts.Node | undefined,
  start: number,
  end: number,
): TypeScriptCallLikeExpression | null {
  let current = node;
  while (current !== undefined) {
    if (isCallLikeExpression(current) && nodeRangeContains(current, sourceFile, start, end)) {
      return current;
    }
    current = current.parent;
  }
  let smallest: TypeScriptCallLikeExpression | null = null;
  visitNode(sourceFile, (candidate) => {
    if (!isCallLikeExpression(candidate) || !nodeRangeContains(candidate, sourceFile, start, end)) {
      return;
    }
    if (smallest === null || candidate.getWidth(sourceFile) < smallest.getWidth(sourceFile)) {
      smallest = candidate;
    }
  });
  return smallest;
}

function nodeRangeContains(node: ts.Node, sourceFile: ts.SourceFile, start: number, end: number): boolean {
  return node.getStart(sourceFile) <= start && node.getEnd() >= end;
}

function isCallLikeExpression(node: ts.Node): node is TypeScriptCallLikeExpression {
  return ts.isCallExpression(node) || ts.isNewExpression(node);
}

function callSiteEntry(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  node: TypeScriptCallLikeExpression,
): TypeScriptCallSiteEntry | null {
  const file = requiredSourceFileIdentity(project, sourceFile);
  const kind = ts.isNewExpression(node) ? TypeScriptCallSiteKind.New : TypeScriptCallSiteKind.Call;
  const span = sourceSpanForNode(sourceFile, node);
  const callee = expressionFact(project, sourceFile, node.expression);
  const signature = project.checker.getResolvedSignature(node);
  const args = [...node.arguments ?? []];
  return {
    id: `call-site:${kind}:${file.repoPath}:${span.start}:${span.end}`,
    kind,
    file,
    span,
    callee,
    calleeName:
      calleeNameForExpression(node.expression, sourceFile, callee.symbolName) ??
      callee.text,
    signature: signature === undefined ? null : project.checker.signatureToString(signature, node),
    typeArgumentCount: node.typeArguments?.length ?? 0,
    argumentCount: args.length,
    arguments: args.map((argument, index) => callSiteArgument(project, sourceFile, argument, index)),
  };
}

/** Project one checker-backed expression fact for evaluator and framework lenses. */
export function readTypeScriptExpressionFact(
  /** Hot source project that owns the current TypeChecker. */
  project: SourceProject,
  /** Source file containing the expression. */
  sourceFile: ts.SourceFile,
  /** Expression to project. */
  expression: ts.Expression,
): TypeScriptExpressionFact {
  return expressionFact(project, sourceFile, expression);
}

/** Project one checker-backed call-site row for evaluator and framework lenses. */
export function readTypeScriptCallSiteEntry(
  /** Hot source project that owns the current TypeChecker. */
  project: SourceProject,
  /** Source file containing the call-like expression. */
  sourceFile: ts.SourceFile,
  /** Call or constructor invocation to project. */
  node: ts.CallExpression | ts.NewExpression,
): TypeScriptCallSiteEntry | null {
  return callSiteEntry(project, sourceFile, node);
}

function callSiteArgument(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  argument: ts.Expression,
  index: number,
): TypeScriptCallSiteArgument {
  const spread = ts.isSpreadElement(argument);
  return {
    index,
    spread,
    expression: expressionFact(project, sourceFile, spread ? argument.expression : argument),
  };
}

function expressionFact(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): TypeScriptExpressionFact {
  const checker = project.checker;
  const type = checker.getTypeAtLocation(expression);
  const apparentType = checker.getApparentType(type);
  const symbol = symbolForExpressionName(checker, expression);
  const text = expression.getText(sourceFile);
  const cappedText = text.slice(0, 500);
  return {
    syntaxKind: expression.kind,
    syntaxKindName: ts.SyntaxKind[expression.kind] ?? String(expression.kind),
    span: sourceSpanForNode(sourceFile, expression),
    text: cappedText,
    textTruncated: cappedText.length < text.length,
    type: checker.typeToString(type, expression),
    apparentType: checker.typeToString(apparentType, expression),
    symbolName: symbol?.getName() ?? null,
    fullyQualifiedName: symbol === null
      ? null
      : canonicalSourceSymbolKey(checker.getFullyQualifiedName(symbol)),
    ...literalValueField(expression),
    ...objectKeysField(expression),
    ...arrayElementCountField(expression),
  };
}

function objectKeysField(expression: ts.Expression): { readonly objectKeys?: readonly string[] } {
  if (!ts.isObjectLiteralExpression(expression)) {
    return {};
  }
  const keys = expression.properties
    .map((property) => propertyNameForObjectLiteralElement(property))
    .filter((key): key is string => key !== null);
  return { objectKeys: keys };
}

function propertyNameForObjectLiteralElement(property: ts.ObjectLiteralElementLike): string | null {
  if (ts.isSpreadAssignment(property)) {
    return null;
  }
  if (property.name === undefined) {
    return null;
  }
  return propertyNameText(property.name);
}

function arrayElementCountField(expression: ts.Expression): { readonly arrayElementCount?: number } {
  return ts.isArrayLiteralExpression(expression) ? { arrayElementCount: expression.elements.length } : {};
}

function uniqueCallSites(callSites: readonly TypeScriptCallSiteEntry[]): readonly TypeScriptCallSiteEntry[] {
  const byId = new Map<string, TypeScriptCallSiteEntry>();
  for (const callSite of callSites) {
    byId.set(callSite.id, callSite);
  }
  return [...byId.values()];
}

function diagnosticsForFile(project: SourceProject, sourceFile: ts.SourceFile): readonly TypeScriptDiagnosticEntry[] {
  return [
    ...project.languageService.getSyntacticDiagnostics(sourceFile.fileName),
    ...project.languageService.getSemanticDiagnostics(sourceFile.fileName),
    ...project.languageService.getSuggestionDiagnostics(sourceFile.fileName),
  ]
    .map((diagnostic) => diagnosticEntry(project, diagnostic))
    .sort(compareDiagnostics);
}

function diagnosticEntry(project: SourceProject, diagnostic: ts.Diagnostic): TypeScriptDiagnosticEntry {
  const sourceFile = diagnostic.file;
  const file = sourceFile === undefined ? undefined : requiredSourceFileIdentity(project, sourceFile);
  const span = sourceFile === undefined || diagnostic.start === undefined || diagnostic.length === undefined
    ? undefined
    : sourceSpanFromOffsets(sourceFile, diagnostic.start, diagnostic.start + diagnostic.length);
  return {
    id: `diagnostic:${file?.repoPath ?? "<global>"}:${diagnostic.start ?? 0}:${diagnostic.code}:${diagnostic.category}`,
    category: diagnosticCategory(diagnostic.category),
    code: diagnostic.code,
    source: diagnostic.source,
    message: diagnosticMessageText(diagnostic.messageText),
    file,
    span,
  };
}

function renameLocationEntry(project: SourceProject, location: ts.RenameLocation): TypeScriptRenameLocationEntry | null {
  const sourceFile = project.readSourceFile(location.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = requiredSourceFileIdentity(project, sourceFile);
  const start = location.textSpan.start;
  const end = location.textSpan.start + location.textSpan.length;
  const result = {
    id: `rename:${file.repoPath}:${start}:${end}`,
    file,
    span: sourceSpanFromOffsets(sourceFile, start, end),
    text: sourceFile.getFullText().slice(start, end),
  };
  if (location.prefixText !== undefined) {
    Object.assign(result, { prefixText: location.prefixText });
  }
  if (location.suffixText !== undefined) {
    Object.assign(result, { suffixText: location.suffixText });
  }
  return result;
}

function refactorPositionOrRange(target: ResolvedSourceTarget): number | ts.TextRange | null {
  if (target.sourceFile === undefined) {
    return null;
  }
  if (target.span !== undefined) {
    return { pos: target.span.start, end: target.span.end };
  }
  const position = referencePositionForTarget(target);
  return position?.offset ?? null;
}

function quickInfoForTarget(project: SourceProject, target: ResolvedSourceTarget): TypeScriptQuickInfoEntry | null {
  const position = referencePositionForTarget(target);
  if (position === null) {
    return null;
  }
  const quickInfo = project.languageService.getQuickInfoAtPosition(position.fileName, position.offset);
  if (quickInfo === undefined) {
    return null;
  }
  const sourceFile = project.readSourceFile(position.fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = requiredSourceFileIdentity(project, sourceFile);
  const span = sourceSpanFromTextSpan(sourceFile, quickInfo.textSpan);
  const display = displayPartsText(quickInfo.displayParts);
  const documentation = displayPartsText(quickInfo.documentation);
  return {
    id: `quick-info:${file.repoPath}:${quickInfo.textSpan.start}:${quickInfo.textSpan.length}`,
    target: rowForTarget(target),
    file,
    span,
    kind: quickInfo.kind,
    kindModifiers: quickInfo.kindModifiers,
    display,
    documentation,
    tags: displayTags(quickInfo.tags),
    canIncreaseVerbosityLevel: quickInfo.canIncreaseVerbosityLevel === true,
  };
}

function signatureHelpEntry(
  target: SourceTargetRow,
  item: ts.SignatureHelpItem,
  index: number,
  selected: boolean,
): TypeScriptSignatureHelpEntry {
  const parameters = item.parameters.map((parameter) => ({
    name: parameter.name,
    display: displayPartsText(parameter.displayParts) ?? parameter.name,
    ...(displayPartsText(parameter.documentation) === undefined ? {} : { documentation: displayPartsText(parameter.documentation) }),
    optional: parameter.isOptional,
    rest: parameter.isRest === true,
  }));
  const display = [
    displayPartsText(item.prefixDisplayParts) ?? "",
    parameters.map((parameter) => parameter.display).join(displayPartsText(item.separatorDisplayParts) ?? ", "),
    displayPartsText(item.suffixDisplayParts) ?? "",
  ].join("");
  return {
    id: `signature-help:${target.id}:${index}`,
    target,
    index,
    selected,
    variadic: item.isVariadic,
    display,
    ...(displayPartsText(item.documentation) === undefined ? {} : { documentation: displayPartsText(item.documentation) }),
    tags: displayTags(item.tags),
    parameters,
  };
}

function highlightEntry(project: SourceProject, fileName: string, highlight: ts.HighlightSpan): TypeScriptHighlightEntry | null {
  const sourceFile = project.readSourceFile(fileName);
  if (sourceFile === null) {
    return null;
  }
  const file = requiredSourceFileIdentity(project, sourceFile);
  return {
    id: `highlight:${file.repoPath}:${highlight.textSpan.start}:${highlight.textSpan.length}:${highlight.kind}`,
    file,
    span: sourceSpanFromTextSpan(sourceFile, highlight.textSpan),
    ...(highlight.contextSpan === undefined ? {} : { contextSpan: sourceSpanFromTextSpan(sourceFile, highlight.contextSpan) }),
    kind: highlight.kind,
    inString: highlight.isInString === true,
  };
}

function codeFixesForDiagnostic(project: SourceProject, diagnostic: TypeScriptDiagnosticEntry): readonly TypeScriptCodeFixActionRow[] {
  if (diagnostic.file === undefined || diagnostic.span === undefined) {
    return [];
  }
  return project.languageService.getCodeFixesAtPosition(
    diagnostic.file.absolutePath,
    diagnostic.span.start,
    diagnostic.span.end,
    [diagnostic.code],
    defaultFormatCodeSettings(),
    defaultUserPreferences(),
  ).map((action, index) => ({
    id: `code-fix:${diagnostic.id}:${action.fixName}:${index}`,
    diagnostic,
    fixName: action.fixName,
    description: action.description,
    fixAllDescription: action.fixAllDescription,
    hasFixAll: action.fixId !== undefined,
    changes: action.changes.map((change, changeIndex) => fileEdits(project, change, `code-fix:${diagnostic.id}:${index}:${changeIndex}`)),
    commandCount: action.commands?.length ?? 0,
  }));
}

function fileEdits(project: SourceProject, changes: ts.FileTextChanges, idPrefix: string): TypeScriptFileEdits {
  const file = fileIdentityForPath(project, changes.fileName);
  const sourceFile = project.readSourceFile(changes.fileName);
  return {
    file,
    newFile: changes.isNewFile === true,
    edits: changes.textChanges
      .map((change, index) => ({
        id: `${idPrefix}:${file.repoPath}:${change.span.start}:${change.span.length}:${index}`,
        start: change.span.start,
        length: change.span.length,
        ...(sourceFile === null ? {} : { span: sourceSpanFromTextSpan(sourceFile, change.span) }),
        newText: change.newText,
      }))
      .sort((left, right) => left.start - right.start || left.length - right.length),
  };
}

function fileIdentityForPath(project: SourceProject, fileName: string): SourceFileIdentity {
  const sourceFile = project.readSourceFile(fileName);
  return sourceFile === null
    ? transientFileIdentityForPath(project, fileName)
    : requiredSourceFileIdentity(project, sourceFile);
}

function languageServicePath(project: SourceProject, fileName: string): string {
  return project.readSourceFile(fileName)?.fileName ?? normalizeProjectAbsolutePath(project, fileName).replace(/\\/gu, "/");
}

function defaultFormatCodeSettings(): ts.FormatCodeSettings {
  return {
    indentSize: 2,
    tabSize: 2,
    convertTabsToSpaces: true,
    newLineCharacter: "\n",
  };
}

function defaultUserPreferences(): ts.UserPreferences {
  return {
    importModuleSpecifierEnding: "js",
    includePackageJsonAutoImports: "off",
  };
}

function sourceSpanFromTextSpanForFileName(project: SourceProject, fileName: string, textSpan: ts.TextSpan): SourceSpan | null {
  const sourceFile = project.readSourceFile(fileName);
  return sourceFile === null ? null : sourceSpanFromTextSpan(sourceFile, textSpan);
}

function sourceSpanFromTextSpan(sourceFile: ts.SourceFile, textSpan: ts.TextSpan): SourceSpan {
  return sourceSpanFromOffsets(sourceFile, textSpan.start, textSpan.start + textSpan.length);
}

function displayPartsText(parts: readonly ts.SymbolDisplayPart[] | undefined): string | undefined {
  if (parts === undefined || parts.length === 0) {
    return undefined;
  }
  return parts.map((part) => part.text).join("");
}

function displayTags(tags: readonly ts.JSDocTagInfo[] | undefined): readonly TypeScriptDisplayTag[] {
  return (tags ?? []).map((tag) => ({
    name: tag.name,
    text: displayPartsText(tag.text),
  }));
}

function diagnosticMessageText(message: string | ts.DiagnosticMessageChain): string {
  if (typeof message === "string") {
    return message;
  }
  const next = message.next?.map(diagnosticMessageText) ?? [];
  return [message.messageText, ...next].join("\n");
}

function diagnosticCategory(category: ts.DiagnosticCategory): "warning" | "error" | "suggestion" | "message" {
  switch (category) {
    case ts.DiagnosticCategory.Warning:
      return "warning";
    case ts.DiagnosticCategory.Error:
      return "error";
    case ts.DiagnosticCategory.Suggestion:
      return "suggestion";
    case ts.DiagnosticCategory.Message:
      return "message";
  }
}

function selectedSourceFiles(resolution: ResolvedSourceSelectorResolution): readonly ts.SourceFile[] {
  const files = new Map<string, ts.SourceFile>();
  for (const target of resolution.targets) {
    if (target.sourceFile !== undefined) {
      files.set(target.sourceFile.fileName, target.sourceFile);
    }
  }
  return [...files.values()].sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function sourceFileTarget(project: SourceProject, sourceFile: ts.SourceFile, _selector: SourceSelector): ResolvedSourceTarget {
  const file = requiredSourceFileIdentity(project, sourceFile);
  return {
    kind: SourceTargetKind.SourceFile,
    id: `file:${file.repoPath}`,
    label: file.repoPath,
    file,
    sourceFile,
  };
}

function sourceRangeTarget(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  start: number,
  end: number,
  _selector: SourceSelector,
): ResolvedSourceTarget {
  const file = requiredSourceFileIdentity(project, sourceFile);
  const span = sourceSpanFromOffsets(sourceFile, start, end);
  const symbol = symbolForTypeLocationNode(project.checker, node) ?? undefined;
  const name = symbol?.getName() ?? node.getText(sourceFile).slice(0, 80);
  const result = {
    kind: SourceTargetKind.SourceRange,
    id: `range:${file.repoPath}:${start}:${end}`,
    label: name,
    file,
    span,
    sourceFile,
    node,
  };
  if (symbol !== undefined) {
    Object.assign(result, {
      symbol,
      symbolKey: project.checker.getFullyQualifiedName(symbol),
    });
  }
  return result;
}

function declarationTargetForRow(
  project: SourceProject,
  row: { readonly kind: SourceDeclarationKind; readonly name: string | null; readonly file: SourceFileIdentity; readonly span: SourceSpan; readonly symbolKey: string | null },
  selector: SourceSelector,
): ResolvedSourceTarget | null {
  const sourceFile = project.requiredSourceFileForIdentity(row.file);
  const node = nodeAtExactSpan(sourceFile, row.span);
  if (node === null) {
    return null;
  }
  return declarationTarget(project, sourceFile, node, selector, false);
}

function symbolEntryForRow(
  project: SourceProject,
  row: { readonly kind: SourceDeclarationKind; readonly name: string | null; readonly file: SourceFileIdentity; readonly span: SourceSpan; readonly symbolKey: string | null },
  selector: SourceSelector,
): TypeScriptApiSurfaceEntry | null {
  const target = declarationTargetForRow(project, row, selector);
  if (target === null || target.sourceFile === undefined || target.node === undefined) {
    return null;
  }
  return apiEntryForDeclaration(project, project.checker, target.sourceFile, target.node, row.kind, selector.scheme === SourceSelectorScheme.Export);
}

function declarationTarget(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  _selector: SourceSelector,
  exported: boolean,
  selectedSymbol?: ts.Symbol,
): ResolvedSourceTarget {
  const file = requiredSourceFileIdentity(project, sourceFile);
  const kind = sourceDeclarationKindForNode(node) ?? SourceDeclarationKind.Variable;
  const span = sourceSpanForNode(sourceFile, node);
  const nameNode = declarationNameNode(node);
  const symbol = selectedSymbol ?? symbolForTypeLocationNode(project.checker, nameNode ?? node) ?? undefined;
  const name = nameNode?.getText(sourceFile) ?? symbol?.getName() ?? null;
  return {
    kind: exported ? SourceTargetKind.Symbol : SourceTargetKind.Declaration,
    id: `declaration:${file.repoPath}:${span.start}:${span.end}:${name ?? "<anonymous>"}`,
    label: name ?? "<anonymous>",
    file,
    span,
    declarationKind: kind,
    sourceFile,
    node,
    symbol,
    symbolKey: symbol === undefined ? undefined : project.checker.getFullyQualifiedName(symbol),
  };
}

function apiEntryForDeclaration(
  project: SourceProject,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  kind: SourceDeclarationKind,
  forceExported: boolean,
): TypeScriptApiSurfaceEntry {
  const target = declarationTarget(project, sourceFile, node, { scheme: SourceSelectorScheme.File, filePath: sourceFile.fileName }, forceExported);
  const nameNode = declarationNameNode(node);
  return {
    target: rowForTarget(target),
    kind,
    name: nameNode?.getText(sourceFile) ?? null,
    exported: forceExported || isExportedDeclaration(node),
    display: displayForDeclaration(checker, sourceFile, node),
  };
}

function targetForEntry(project: SourceProject, entry: TypeScriptApiSurfaceEntry, selector: SourceSelector): ResolvedSourceTarget | null {
  if (entry.target.file === undefined) {
    throw new Error(`API surface entry ${entry.target.id} has no source file identity.`);
  }
  if (entry.target.span === undefined) {
    throw new Error(`API surface entry ${entry.target.id} has no source span.`);
  }
  const sourceFile = project.requiredSourceFileForIdentity(entry.target.file);
  const node = nodeAtExactSpan(sourceFile, entry.target.span);
  return node === null ? null : declarationTarget(project, sourceFile, node, selector, entry.exported);
}

function displayForDeclaration(checker: ts.TypeChecker, _sourceFile: ts.SourceFile, node: ts.Node): string | null {
  if (isFunctionLikeDeclaration(node)) {
    const signature = checker.getSignatureFromDeclaration(node);
    return signature === undefined ? null : checker.signatureToString(signature, node);
  }
  const location = declarationNameNode(node) ?? node;
  const type = checker.getTypeAtLocation(location);
  return checker.typeToString(type, location);
}

function textForTarget(sourceFile: ts.SourceFile, target: ResolvedSourceTarget): string {
  if (target.span === undefined) {
    return sourceFile.getFullText();
  }
  return sourceFile.getFullText().slice(target.span.start, target.span.end);
}

function exportSurfaceFiles(project: SourceProject, selector: ExportSourceSelector): readonly ts.SourceFile[] {
  if (selector.filePath !== undefined) {
    const sourceFile = project.readSourceFile(selector.filePath);
    return sourceFile === null ? [] : [sourceFile];
  }
  const packageTargets = packageResolution(project, {
    scheme: SourceSelectorScheme.Package,
    packageId: selector.packageId,
    packageName: selector.packageName,
  });
  return selectedSourceFiles(packageTargets).filter((sourceFile) => sourceFile.fileName.endsWith("/src/index.ts") || sourceFile.fileName.endsWith("\\src\\index.ts"));
}

function exportSurfaceFilesForResolution(project: SourceProject, resolution: ResolvedSourceSelectorResolution): readonly ts.SourceFile[] {
  if (resolution.selector.scheme === SourceSelectorScheme.Export) {
    return exportSurfaceFiles(project, resolution.selector);
  }
  const files = selectedSourceFiles(resolution);
  if (resolution.selector.scheme === SourceSelectorScheme.File) {
    return files;
  }
  const entryFiles = files.filter(isPackageEntrySourceFile);
  return entryFiles.length === 0 ? files : entryFiles;
}

function isPackageEntrySourceFile(sourceFile: ts.SourceFile): boolean {
  return sourceFile.fileName.endsWith("/src/index.ts") || sourceFile.fileName.endsWith("\\src\\index.ts");
}

function exportEntriesForSurface(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  query: string | undefined,
  requiredMemberName: string | undefined,
  requiredTypeText: string | undefined,
  requiredTypeSymbolName: string | undefined,
  includeMemberNames: boolean,
  context: ExportSurfaceReadContext,
): readonly TypeScriptExportSurfaceEntry[] {
  const checker = project.checker;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) {
    return [];
  }
  const surfaceFile = requiredSourceFileIdentity(project, sourceFile);
  return [...checker.getExportsOfModule(moduleSymbol)]
    .map((symbol) => exportSurfaceEntryOrNull(project, sourceFile, surfaceFile, symbol, query, requiredMemberName, requiredTypeText, requiredTypeSymbolName, includeMemberNames, context))
    .filter((entry): entry is TypeScriptExportSurfaceEntry => entry !== null)
    .sort(compareExportRows);
}

function exportNameEntriesForSurface(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  query: string | undefined,
  resolveAliases: boolean,
  includeFullyQualifiedName: boolean,
): readonly TypeScriptExportNameEntry[] {
  const checker = project.checker;
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) {
    return [];
  }
  const surfaceFile = requiredSourceFileIdentity(project, sourceFile);
  return [...checker.getExportsOfModule(moduleSymbol)]
    .filter((symbol) => query === undefined || symbol.getName().includes(query))
    .map((symbol) => exportNameEntry(checker, surfaceFile, symbol, resolveAliases, includeFullyQualifiedName))
    .sort(compareExportRows);
}

function exportNameEntry(
  checker: ts.TypeChecker,
  surfaceFile: SourceFileIdentity,
  symbol: ts.Symbol,
  resolveAliases: boolean,
  includeFullyQualifiedName: boolean,
): TypeScriptExportNameEntry {
  const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0;
  const resolved = alias && (resolveAliases || includeFullyQualifiedName) ? checker.getAliasedSymbol(symbol) : symbol;
  return {
    id: `export-name:${surfaceFile.repoPath}:${symbol.getName()}`,
    exportName: symbol.getName(),
    surfaceFile,
    alias,
    resolvedName: resolved.getName(),
    symbolFlags: symbol.flags,
    fullyQualifiedName: includeFullyQualifiedName ? checker.getFullyQualifiedName(resolved) : null,
  };
}

function exportSurfaceEntryOrNull(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  surfaceFile: SourceFileIdentity,
  symbol: ts.Symbol,
  query: string | undefined,
  requiredMemberName: string | undefined,
  requiredTypeText: string | undefined,
  requiredTypeSymbolName: string | undefined,
  includeMemberNames: boolean,
  context: ExportSurfaceReadContext,
): TypeScriptExportSurfaceEntry | null {
  if (query !== undefined && !symbol.getName().includes(query)) {
    return null;
  }
  const checker = project.checker;
  const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0;
  const resolved = alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declarations = resolved.getDeclarations() ?? symbol.getDeclarations() ?? [];
  const firstDeclaration = declarations[0];
  const valueType = firstDeclaration === undefined ? null : checker.getTypeOfSymbolAtLocation(resolved, firstDeclaration);
  if (requiredTypeSymbolName !== undefined && (valueType === null || !typeMentionsSymbolName(checker, valueType, requiredTypeSymbolName))) {
    return null;
  }
  const type = firstDeclaration === undefined || valueType === null
    ? null
    : checker.typeToString(valueType, firstDeclaration);
  if (requiredTypeText !== undefined && type?.includes(requiredTypeText) !== true) {
    return null;
  }
  if (requiredMemberName !== undefined && !exportHasMember(project, sourceFile, symbol, requiredMemberName, context)) {
    return null;
  }
  return exportSurfaceEntry(project, sourceFile, surfaceFile, symbol, {
    alias,
    resolved,
    declarations,
    type,
    includeMemberNames,
  });
}

function exportSurfaceEntry(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  surfaceFile: SourceFileIdentity,
  symbol: ts.Symbol,
  known?: {
    readonly alias: boolean;
    readonly resolved: ts.Symbol;
    readonly declarations: readonly ts.Declaration[];
    readonly type: string | null;
    readonly includeMemberNames: boolean;
  },
): TypeScriptExportSurfaceEntry {
  const checker = project.checker;
  const alias = known?.alias ?? (symbol.flags & ts.SymbolFlags.Alias) !== 0;
  const resolved = known?.resolved ?? (alias ? checker.getAliasedSymbol(symbol) : symbol);
  const declarations = known?.declarations ?? resolved.getDeclarations() ?? symbol.getDeclarations() ?? [];
  const targets = declarations
    .map((declaration) => {
      const declarationSourceFile = sourceFileForNode(project, declaration);
      return declarationTarget(project, declarationSourceFile, declaration, {
        scheme: SourceSelectorScheme.Export,
        exportName: symbol.getName(),
        filePath: surfaceFile.repoPath,
      }, true, resolved);
    })
    .filter((target): target is ResolvedSourceTarget => target !== null)
    .map(rowForTarget)
    .sort(compareTargets);
  const firstDeclaration = declarations[0];
  const type = known?.type ?? (firstDeclaration === undefined
    ? null
    : checker.typeToString(checker.getTypeOfSymbolAtLocation(resolved, firstDeclaration), firstDeclaration));
  const memberNames = known?.includeMemberNames === false || firstDeclaration === undefined ? [] : memberNamesForSymbol(checker, resolved, firstDeclaration);
  return {
    id: `export:${surfaceFile.repoPath}:${symbol.getName()}`,
    exportName: symbol.getName(),
    surfaceFile,
    alias,
    resolvedName: resolved.getName(),
    symbolFlags: symbol.flags,
    fullyQualifiedName: checker.getFullyQualifiedName(resolved),
    type,
    memberNames,
    targets,
  };
}

function typeMentionsSymbolName(
  checker: ts.TypeChecker,
  type: ts.Type,
  symbolName: string,
  seen: Set<ts.Type> = new Set(),
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);

  if (
    type.symbol?.getName() === symbolName
    || type.aliasSymbol?.getName() === symbolName
  ) {
    return true;
  }

  if (isTypeReference(type)) {
    const target = type.target;
    if (
      target.symbol?.getName() === symbolName
      || target.aliasSymbol?.getName() === symbolName
    ) {
      return true;
    }
    for (const typeArgument of checker.getTypeArguments(type)) {
      if (typeMentionsSymbolName(checker, typeArgument, symbolName, seen)) {
        return true;
      }
    }
  }

  if (type.isUnionOrIntersection()) {
    return type.types.some((part) => typeMentionsSymbolName(checker, part, symbolName, seen));
  }

  return false;
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
  return (type.flags & ts.TypeFlags.Object) !== 0
    && (((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0);
}

function exportHasMember(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  symbol: ts.Symbol,
  memberName: string,
  context: ExportSurfaceReadContext,
): boolean {
  const checker = project.checker;
  const resolved = (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
  const cacheKey = `${checker.getFullyQualifiedName(resolved)}:${memberName}`;
  const cached = context.memberPresenceBySymbol.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const declaration = resolved.getDeclarations()?.[0] ?? symbol.getDeclarations()?.[0] ?? sourceFile;
  const type = checker.getTypeOfSymbolAtLocation(resolved, declaration);
  const hasMember = checker.getApparentType(type).getProperty(memberName) !== undefined;
  context.memberPresenceBySymbol.set(cacheKey, hasMember);
  return hasMember;
}

function memberNamesForSymbol(checker: ts.TypeChecker, symbol: ts.Symbol, location: ts.Node): readonly string[] {
  const type = checker.getTypeOfSymbolAtLocation(symbol, location);
  return checker.getApparentType(type).getProperties()
    .map((property) => property.getName())
    .sort((left, right) => left.localeCompare(right));
}

function importNames(importClause: ts.ImportClause | undefined): readonly string[] {
  if (importClause === undefined) {
    return [];
  }
  const names: string[] = [];
  if (importClause.name !== undefined) {
    names.push(importClause.name.text);
  }
  const bindings = importClause.namedBindings;
  if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
    names.push(`* as ${bindings.name.text}`);
  }
  if (bindings !== undefined && ts.isNamedImports(bindings)) {
    for (const element of bindings.elements) {
      names.push(element.propertyName === undefined
        ? element.name.text
        : `${element.propertyName.text} as ${element.name.text}`);
    }
  }
  return names;
}

function exportNames(exportClause: ts.NamedExportBindings | undefined): readonly string[] {
  if (exportClause === undefined) {
    return ["*"];
  }
  if (ts.isNamespaceExport(exportClause)) {
    return [`* as ${exportClause.name.text}`];
  }
  return exportClause.elements.map((element) => element.propertyName === undefined
    ? element.name.text
    : `${element.propertyName.text} as ${element.name.text}`);
}

function resolvedModuleField(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  specifier: string,
): { readonly resolvedFile?: SourceFileIdentity } {
  if (!specifier.startsWith(".")) {
    return {};
  }
  const basePath = path.resolve(path.dirname(sourceFile.fileName), specifier);
  const basePaths = specifier.endsWith(".js")
    ? [basePath, basePath.slice(0, -".js".length)]
    : [basePath];
  const candidates = basePaths.flatMap((candidateBase) => [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.mts`,
    `${candidateBase}.cts`,
    `${candidateBase}.js`,
    path.join(candidateBase, "index.ts"),
    path.join(candidateBase, "index.tsx"),
    path.join(candidateBase, "index.mts"),
    path.join(candidateBase, "index.cts"),
    path.join(candidateBase, "index.js"),
  ]);
  for (const candidate of candidates) {
    const sourceFile = project.readSourceFile(candidate);
    if (sourceFile === null) {
      continue;
    }
    const identity = project.sourceFileIdentity(sourceFile);
    return identity === null ? {} : { resolvedFile: identity };
  }
  return {};
}

function moduleEdgeId(sourceFile: SourceFileIdentity, node: ts.Node): string {
  return `module-edge:${sourceFile.repoPath}:${node.getStart()}:${node.getEnd()}`;
}

function packageMatches(project: SourceProject, fileName: string, packageId: string | undefined, packageName: string | undefined): boolean {
  const packageDefinition = project.packageForFileName(fileName);
  if (packageDefinition === null) {
    return false;
  }
  if (packageId !== undefined && packageDefinition.id !== packageId) {
    return false;
  }
  if (packageName !== undefined && packageDefinition.packageName !== packageName) {
    return false;
  }
  return true;
}

function packageNameForFile(project: SourceProject, fileName: string): string | null {
  return project.packageForFileName(fileName)?.packageName ?? null;
}

function normalizeRepoSelectorPath(project: SourceProject, filePath: string): RepoRelativePath {
  const absolutePath = path.isAbsolute(filePath) ? path.resolve(filePath) : resolveRepoPath(project.repoRoot, filePath);
  return repoRelativePath(project.repoRoot, absolutePath) ?? filePath.replace(/\\/gu, "/") as RepoRelativePath;
}

function normalizeProjectAbsolutePath(project: SourceProject, filePath: string): string {
  return path.resolve(path.isAbsolute(filePath) ? filePath : resolveRepoPath(project.repoRoot, filePath));
}

function positionToOffset(sourceFile: ts.SourceFile, position: SourcePositionSelector): number | null {
  if (position.line < 0 || position.character < 0 || position.line >= sourceFile.getLineStarts().length) {
    return null;
  }
  const offset = sourceFile.getPositionOfLineAndCharacter(position.line, position.character);
  return offset < 0 || offset > sourceFile.getFullText().length ? null : offset;
}

function smallestNodeAt(sourceFile: ts.SourceFile, offset: number): ts.Node | null {
  let best: ts.Node | null = null;
  visitNode(sourceFile, (node) => {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    if (start <= offset && offset <= end && (best === null || node.getWidth(sourceFile) <= best.getWidth(sourceFile))) {
      best = node;
    }
  });
  return best;
}

function smallestNodeContaining(sourceFile: ts.SourceFile, start: number, end: number): ts.Node | null {
  let best: ts.Node | null = null;
  visitNode(sourceFile, (node) => {
    const nodeStart = node.getStart(sourceFile);
    const nodeEnd = node.getEnd();
    if (nodeStart <= start && end <= nodeEnd && (best === null || node.getWidth(sourceFile) <= best.getWidth(sourceFile))) {
      best = node;
    }
  });
  return best;
}

function nodeAtExactSpan(sourceFile: ts.SourceFile, span: SourceSpan): ts.Node | null {
  let matched: ts.Node | null = null;
  visitNode(sourceFile, (node) => {
    if (matched !== null) {
      return;
    }
    if (node.getStart(sourceFile) === span.start && node.getEnd() === span.end) {
      matched = node;
    }
  });
  return matched;
}

function nodeAtTextSpan(sourceFile: ts.SourceFile, textSpan: ts.TextSpan): ts.Node | null {
  const span = sourceSpanFromTextSpan(sourceFile, textSpan);
  return nodeAtExactSpan(sourceFile, span) ?? smallestNodeContaining(sourceFile, span.start, span.end);
}

function nodeWithin(subject: ts.Node, container: ts.Node): boolean {
  const sourceFile = subject.getSourceFile();
  const subjectStart = subject.getStart(sourceFile);
  const subjectEnd = subject.getEnd();
  const containerStart = container.getStart(sourceFile);
  const containerEnd = container.getEnd();
  return containerStart <= subjectStart && subjectEnd <= containerEnd;
}

function isImportSyntax(node: ts.Node): boolean {
  return ts.isImportDeclaration(node)
    || ts.isImportClause(node)
    || ts.isImportSpecifier(node)
    || ts.isNamespaceImport(node)
    || ts.isImportEqualsDeclaration(node)
    || ts.isImportTypeNode(node);
}

function isExportSyntax(node: ts.Node): boolean {
  return ts.isExportDeclaration(node)
    || ts.isExportSpecifier(node)
    || ts.isExportAssignment(node)
    || ts.isNamespaceExport(node);
}

function hasTrueIsTypeOnly(node: ts.Node | undefined): boolean {
  return node !== undefined && "isTypeOnly" in node && (node as { readonly isTypeOnly?: boolean }).isTypeOnly === true;
}

function isObjectLiteralKeyNode(current: ts.Node, selected: ts.Node): boolean {
  if (ts.isShorthandPropertyAssignment(current)) {
    return current.name === selected;
  }
  if ((ts.isPropertyAssignment(current) || ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current))
    && current.parent !== undefined
    && ts.isObjectLiteralExpression(current.parent)
    && current.name !== undefined
    && nodeWithin(selected, current.name)
  ) {
    return true;
  }
  return false;
}

function sourceFileForNode(project: SourceProject, node: ts.Node): ts.SourceFile {
  const sourceFile = node.getSourceFile();
  project.requiredSourceFileIdentity(sourceFile);
  return sourceFile;
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

function normalizeDeclarationKind(kind: SourceDeclarationKind | string | undefined): SourceDeclarationKind | null {
  if (kind === undefined) {
    return null;
  }
  const normalized = kind.replace(/Declaration$/u, "").replace(/Alias$/u, "-alias").toLowerCase();
  switch (normalized) {
    case SourceDeclarationKind.Class:
      return SourceDeclarationKind.Class;
    case SourceDeclarationKind.Interface:
      return SourceDeclarationKind.Interface;
    case SourceDeclarationKind.Function:
      return SourceDeclarationKind.Function;
    case SourceDeclarationKind.Method:
      return SourceDeclarationKind.Method;
    case SourceDeclarationKind.Property:
      return SourceDeclarationKind.Property;
    case SourceDeclarationKind.Accessor:
      return SourceDeclarationKind.Accessor;
    case SourceDeclarationKind.Constructor:
      return SourceDeclarationKind.Constructor;
    case SourceDeclarationKind.TypeAlias:
    case "type":
      return SourceDeclarationKind.TypeAlias;
    case SourceDeclarationKind.Enum:
      return SourceDeclarationKind.Enum;
    case SourceDeclarationKind.Variable:
      return SourceDeclarationKind.Variable;
    default:
      return null;
  }
}

function normalizeCallSiteKind(kind: TypeScriptCallSiteKind | string | undefined): TypeScriptCallSiteKind | null {
  switch (kind) {
    case TypeScriptCallSiteKind.Call:
      return TypeScriptCallSiteKind.Call;
    case TypeScriptCallSiteKind.New:
      return TypeScriptCallSiteKind.New;
    default:
      return null;
  }
}

function typeLocationNode(node: ts.Node): ts.Node {
  return declarationNameNode(node) ?? node;
}

function symbolForTypeLocationNode(checker: ts.TypeChecker, node: ts.Node): ts.Symbol | null {
  const symbol = checker.getSymbolAtLocation(typeLocationNode(node));
  return symbol ?? null;
}

function isFunctionLikeDeclaration(node: ts.Node): node is ts.SignatureDeclaration {
  return ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function countDeclarationKinds(entries: readonly TypeScriptApiSurfaceEntry[]): Readonly<Record<SourceDeclarationKind, number>> {
  const counts: Record<SourceDeclarationKind, number> = {
    [SourceDeclarationKind.Class]: 0,
    [SourceDeclarationKind.Interface]: 0,
    [SourceDeclarationKind.Function]: 0,
    [SourceDeclarationKind.Method]: 0,
    [SourceDeclarationKind.Property]: 0,
    [SourceDeclarationKind.Accessor]: 0,
    [SourceDeclarationKind.Constructor]: 0,
    [SourceDeclarationKind.TypeAlias]: 0,
    [SourceDeclarationKind.Enum]: 0,
    [SourceDeclarationKind.Variable]: 0,
  };
  for (const entry of entries) {
    counts[entry.kind] += 1;
  }
  return counts;
}

function applyOccurrence<TValue>(values: readonly TValue[], occurrence: number | undefined): readonly TValue[] {
  if (occurrence === undefined) {
    return values;
  }
  const index = Math.trunc(occurrence);
  const value = index < 0 ? undefined : values[index];
  return value === undefined ? [] : [value];
}

function emptyResolution(selector: SourceSelector, code: string, message: string): ResolvedSourceSelectorResolution {
  return { selector, targets: [], candidateCount: 0, diagnostics: [{ code, message }] };
}

function serializableResolution(resolution: ResolvedSourceSelectorResolution): SourceSelectorResolution {
  return {
    selector: resolution.selector,
    targets: resolution.targets.map(rowForTarget),
    candidateCount: resolution.candidateCount,
    diagnostics: resolution.diagnostics,
  };
}

function compareTargets(left: SourceTargetRow, right: SourceTargetRow): number {
  return compareOptionalText(left.file?.repoPath, right.file?.repoPath)
    || compareOptionalNumber(left.span?.start, right.span?.start)
    || left.label.localeCompare(right.label);
}

function compareEntries(left: TypeScriptApiSurfaceEntry, right: TypeScriptApiSurfaceEntry): number {
  return compareTargets(left.target, right.target);
}

function compareModuleEdges(left: TypeScriptModuleEdge, right: TypeScriptModuleEdge): number {
  return left.sourceFile.repoPath.localeCompare(right.sourceFile.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind)
    || left.specifier.localeCompare(right.specifier);
}

function compareDocumentSymbols(left: TypeScriptDocumentSymbolEntry, right: TypeScriptDocumentSymbolEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.depth - right.depth
    || left.name.localeCompare(right.name);
}

function compareReferences(left: TypeScriptReferenceEntry, right: TypeScriptReferenceEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || Number(right.definition) - Number(left.definition);
}

function compareExportRows(
  left: TypeScriptExportSurfaceEntry | TypeScriptExportNameEntry,
  right: TypeScriptExportSurfaceEntry | TypeScriptExportNameEntry,
): number {
  return left.surfaceFile.repoPath.localeCompare(right.surfaceFile.repoPath)
    || left.exportName.localeCompare(right.exportName);
}

function compareNavigationEntries(left: TypeScriptNavigationEntry, right: TypeScriptNavigationEntry): number {
  return left.kind.localeCompare(right.kind)
    || left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || (left.name ?? "").localeCompare(right.name ?? "");
}

function compareCallHierarchyItems(left: TypeScriptCallHierarchyItemRow, right: TypeScriptCallHierarchyItemRow): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.selectionSpan.start - right.selectionSpan.start
    || left.name.localeCompare(right.name);
}

function compareCallHierarchyEdges(left: TypeScriptCallHierarchyEdge, right: TypeScriptCallHierarchyEdge): number {
  return left.direction.localeCompare(right.direction)
    || compareCallHierarchyItems(left.from, right.from)
    || compareCallHierarchyItems(left.to, right.to)
    || (left.fromSpans[0]?.start ?? 0) - (right.fromSpans[0]?.start ?? 0);
}

function compareCallSites(left: TypeScriptCallSiteEntry, right: TypeScriptCallSiteEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind)
    || left.calleeName.localeCompare(right.calleeName);
}

function compareDiagnostics(left: TypeScriptDiagnosticEntry, right: TypeScriptDiagnosticEntry): number {
  return compareOptionalText(left.file?.repoPath, right.file?.repoPath)
    || compareOptionalNumber(left.span?.start, right.span?.start)
    || left.category.localeCompare(right.category)
    || left.code - right.code
    || left.message.localeCompare(right.message);
}

function compareRenameLocations(left: TypeScriptRenameLocationEntry, right: TypeScriptRenameLocationEntry): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start;
}

function compareRefactorActions(left: TypeScriptRefactorActionRow, right: TypeScriptRefactorActionRow): number {
  return left.refactorName.localeCompare(right.refactorName)
    || left.actionName.localeCompare(right.actionName);
}

function compareSourceSpanKindEntries(
  left: TypeScriptQuickInfoEntry | TypeScriptHighlightEntry,
  right: TypeScriptQuickInfoEntry | TypeScriptHighlightEntry,
): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || left.span.start - right.span.start
    || left.kind.localeCompare(right.kind);
}

function compareCodeFixActions(left: TypeScriptCodeFixActionRow, right: TypeScriptCodeFixActionRow): number {
  return compareDiagnostics(left.diagnostic, right.diagnostic)
    || left.fixName.localeCompare(right.fixName)
    || left.description.localeCompare(right.description);
}

function compareFileEdits(left: TypeScriptFileEdits, right: TypeScriptFileEdits): number {
  return left.file.repoPath.localeCompare(right.file.repoPath)
    || Number(right.newFile) - Number(left.newFile);
}

function compareOptionalText(left: string | undefined, right: string | undefined): number {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return -1;
  }
  if (right === undefined) {
    return 1;
  }
  return left.localeCompare(right);
}

function compareOptionalNumber(left: number | undefined, right: number | undefined): number {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined) {
    return -1;
  }
  if (right === undefined) {
    return 1;
  }
  return left - right;
}

function transientFileIdentityForPath(project: SourceProject, fileName: string): SourceFileIdentity {
  return {
    absolutePath: path.resolve(fileName),
    repoPath: (repoRelativePath(project.repoRoot, fileName) ?? fileName.replace(/\\/gu, "/")) as RepoRelativePath,
    packageId: null,
  };
}
