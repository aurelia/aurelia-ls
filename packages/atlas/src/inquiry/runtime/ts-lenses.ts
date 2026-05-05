import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import { clampBudget } from "../budget.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import {
  HandleKind,
  HandleNamespace,
  type InquiryHandle,
  type SourceHandle,
  type SymbolHandle,
} from "../handle.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";
import {
  evidenceLimit,
  pageOffset,
} from "../paging.js";
import type {
  SourceSelector,
  SourceTargetRow,
  SourceTextSlice,
  DocumentSymbolOptions,
  SymbolIndexOptions,
  TypeFactOptions,
  TypeScriptReferenceEntry,
  TypeScriptReferenceRead,
  TypeScriptApiSurface,
  TypeScriptCallHierarchyEdge,
  TypeScriptCallHierarchyRead,
  TypeScriptCallSiteEntry,
  TypeScriptCallSitesRead,
  TypeScriptCodeFixActionRow,
  TypeScriptCodeFixesRead,
  TypeScriptDiagnosticEntry,
  TypeScriptDiagnosticsRead,
  TypeScriptDocumentSymbolEntry,
  TypeScriptDocumentSymbolsRead,
  TypeScriptExportSurfaceEntry,
  TypeScriptExportSurfaceRead,
  TypeScriptFileRenameEditsRead,
  TypeScriptFileEdits,
  TypeScriptHighlightEntry,
  TypeScriptHighlightsRead,
  TypeScriptModuleEdge,
  TypeScriptModuleGraph,
  TypeScriptNavigationEntry,
  TypeScriptNavigationRead,
  TypeScriptOrganizeImportsRead,
  TypeScriptQuickInfoEntry,
  TypeScriptQuickInfoRead,
  TypeScriptRefactorActionRow,
  TypeScriptRefactorEditsRead,
  TypeScriptRefactorsRead,
  TypeScriptRenameLocationEntry,
  TypeScriptRenameRead,
  TypeScriptSignatureHelpEntry,
  TypeScriptSignatureHelpRead,
  TypeScriptSymbolIndex,
  TypeScriptTypeFacts,
} from "../../source/index.js";
import {
  SourceSelectorScheme,
  SourceTargetKind,
  readApiSurface,
  readCallHierarchy,
  readCallSites,
  readCodeFixes,
  readDiagnostics,
  readDocumentSymbols,
  readExportSurface,
  readFileRenameEdits,
  readHighlights,
  readModuleGraph,
  readNavigation,
  readOrganizeImports,
  readQuickInfo,
  readRefactorEdits,
  readRefactors,
  readReferences,
  readRename,
  readSignatureHelp,
  readSourceText,
  readSymbolIndex,
  readTypeFacts,
  rowForTarget,
  type SourceProject,
} from "../../source/index.js";
import { sourceSelectorFromInquiry as selectorFromInquiry } from "./source-selector.js";

/** Value returned by the ts.source runtime lens. */
export interface TsSourceValue {
  /** Selector resolved for this source read. */
  readonly selector: SourceSelector;
  /** Number of current-epoch targets matched by the selector. */
  readonly targetCount: number;
  /** Number of candidates before occurrence slicing. */
  readonly candidateCount: number;
  /** Source target rows matched by the selector. */
  readonly targets: readonly SourceTargetRow[];
  /** Source text slices returned for text projections. */
  readonly slices: readonly SourceTextSlice[];
  /** Selector diagnostics produced while resolving the read. */
  readonly diagnostics: readonly {
    readonly code: string;
    readonly message: string;
  }[];
}

/** Value returned by the ts.structure runtime lens. */
export interface TsStructureValue {
  /** API-surface projection returned by the source substrate. */
  readonly surface?: TypeScriptApiSurface;
  /** Module-graph projection returned by the source substrate. */
  readonly moduleGraph?: TypeScriptModuleGraph;
  /** Document-symbol projection returned by the language service. */
  readonly documentSymbols?: TypeScriptDocumentSymbolsRead;
  /** Symbol-index projection returned by the source substrate. */
  readonly symbols?: TypeScriptSymbolIndex;
  /** Export-surface projection returned by the source substrate. */
  readonly exports?: TypeScriptExportSurfaceRead;
}

/** Value returned by the ts.type runtime lens. */
export interface TsTypeValue {
  /** Compact guide for driving TypeScript-backed lenses without reading Atlas source. */
  readonly guide?: TypeScriptIdeGuide;
  /** TypeChecker facts returned by the source substrate. */
  readonly typeFacts?: TypeScriptTypeFacts;
  /** TypeScript references returned by the source substrate. */
  readonly references?: TypeScriptReferenceRead;
  /** TypeScript definitions, type-definitions, and implementations returned by the language service. */
  readonly navigation?: TypeScriptNavigationRead;
  /** TypeScript call hierarchy returned by the language service. */
  readonly callHierarchy?: TypeScriptCallHierarchyRead;
  /** Exact TypeScript call-site rows returned by the checker-backed source substrate. */
  readonly callSites?: TypeScriptCallSitesRead;
  /** TypeScript diagnostics returned by the language service. */
  readonly diagnostics?: TypeScriptDiagnosticsRead;
  /** TypeScript quick-info returned by the language service. */
  readonly quickInfo?: TypeScriptQuickInfoRead;
  /** TypeScript signature-help returned by the language service. */
  readonly signatureHelp?: TypeScriptSignatureHelpRead;
  /** TypeScript document highlights returned by the language service. */
  readonly highlights?: TypeScriptHighlightsRead;
  /** TypeScript rename affordance and locations returned by the language service. */
  readonly rename?: TypeScriptRenameRead;
  /** TypeScript refactor actions returned by the language service. */
  readonly refactors?: TypeScriptRefactorsRead;
  /** TypeScript code-fix actions with exact edit payloads. */
  readonly codeFixes?: TypeScriptCodeFixesRead;
  /** Concrete TypeScript refactor edit plan. */
  readonly refactorEdits?: TypeScriptRefactorEditsRead;
  /** TypeScript organize-imports edit plan. */
  readonly organizeImports?: TypeScriptOrganizeImportsRead;
  /** TypeScript file-rename edit plan. */
  readonly fileRenameEdits?: TypeScriptFileRenameEditsRead;
}

/** Compact TypeScript capability guide returned by ts.type:guide. */
export interface TypeScriptIdeGuide {
  /** Normal API call shape used by every listed recipe. */
  readonly call: "createApi().ask({ lens, locus?, subject?, projection?, filters?, budget?, page? })";
  /** How to choose between locus, subject selector, evidence source, and continuations. */
  readonly operatingNotes: readonly string[];
  /** Locus shapes accepted by source-backed TypeScript lenses. */
  readonly loci: readonly TypeScriptGuideShape[];
  /** Source-selector subject shapes accepted when a locus is not precise enough. */
  readonly subjectSelectors: readonly TypeScriptGuideShape[];
  /** Admitted packages that are useful starting points for package-level TypeScript reads. */
  readonly packageExamples: readonly TypeScriptGuidePackage[];
  /** Exact next asks for common IDE-style navigation moves. */
  readonly moves: readonly TypeScriptGuideMove[];
}

/** One request shape taught by the TypeScript capability guide. */
export interface TypeScriptGuideShape {
  /** Shape id or selector scheme. */
  readonly id: string;
  /** When this shape is the right entrypoint. */
  readonly use: string;
  /** Minimal JSON payload accepted by the API. */
  readonly example: unknown;
}

/** One package-level entrypoint included in the TypeScript capability guide. */
export interface TypeScriptGuidePackage {
  /** Stable Atlas package id. */
  readonly id: string;
  /** Package name from the source admission contract. */
  readonly packageName: string;
  /** Repository-relative package root. */
  readonly rootPath: string;
  /** Package family used only for guide grouping. */
  readonly family: "atlas" | "product" | "framework";
}

/** One exact TypeScript navigation recipe included in the guide. */
export interface TypeScriptGuideMove {
  /** Stable move id. */
  readonly id: string;
  /** IDE-like capability this move provides. */
  readonly capability: string;
  /** When to use this move. */
  readonly use: string;
  /** Exact request payload accepted by createApi().ask. */
  readonly ask: {
    readonly lens: LensId;
    readonly locus?: unknown;
    readonly subject?: unknown;
    readonly projection: string;
    readonly filters?: Record<string, unknown>;
    readonly budget?: Record<string, unknown>;
    readonly page?: Record<string, unknown>;
  };
  /** Field to substitute from a previous answer or evidence row, when applicable. */
  readonly fillFrom?: string;
}

/** Answer exact source text and source-range inquiries from the hot SourceProject. */
export function answerTsSource(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<TsSourceValue> {
  const selector = selectorFromInquiry(inquiry);
  const projection = inquiry.projection ?? "summary";
  const maxTextChars =
    projection === "text"
      ? clampBudget(inquiry.budget?.textChars, 20_000, 200_000)
      : 0;
  const read = readSourceText(sourceProject, selector, { maxTextChars });
  const targets = read.resolution.targets.map(rowForTarget);
  const slices = projection === "text" ? read.slices : [];
  const value: TsSourceValue = {
    selector,
    targetCount: targets.length,
    candidateCount: read.resolution.candidateCount,
    targets,
    slices,
    diagnostics: read.resolution.diagnostics,
  };
  const outcome = targets.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;

  return createAnswer(
    inquiry,
    outcome,
    sourceSummary(projection, targets.length, slices.length),
    {
      value,
      basis: [sourceTextBasis(sourceProject), programBasis(sourceProject)],
      evidence: targets
        .slice(0, evidenceLimit(inquiry))
        .map((target) => evidenceForTarget(target, EvidenceKind.SourceSpan)),
      continuations: sourceContinuations(inquiry, targets),
    },
  );
}

/** Answer TypeScript source structure inquiries from the hot SourceProject. */
export function answerTsStructure(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<TsStructureValue> {
  const selector = selectorFromInquiry(inquiry);
  const projection = inquiry.projection ?? "summary";
  const options = {
    limit: clampBudget(inquiry.budget?.rows, 120, 1_000),
    offset: pageOffset(inquiry),
  };
  if (projection === "module-graph") {
    const moduleGraph = readModuleGraph(sourceProject, selector, options);
    const outcome =
      moduleGraph.totalEdges === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${moduleGraph.edges.length} of ${moduleGraph.totalEdges} TypeScript module edge(s).`,
      {
        value: { moduleGraph },
        basis: [programBasis(sourceProject)],
        evidence: moduleGraph.edges
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForModuleEdge),
        page: {
          size: moduleGraph.limit,
          cursor: inquiry.page?.cursor,
          returned: moduleGraph.edges.length,
          total: moduleGraph.totalEdges,
          ...(moduleGraph.nextOffset === undefined
            ? {}
            : { nextCursor: String(moduleGraph.nextOffset) }),
        },
        continuations: moduleGraphContinuations(inquiry, selector, moduleGraph),
      },
    );
  }
  if (projection === "document-symbols") {
    const documentSymbolOptions: DocumentSymbolOptions = {
      ...options,
      ...stringFilter(inquiry.filters, "query"),
    };
    const documentSymbols = readDocumentSymbols(
      sourceProject,
      selector,
      documentSymbolOptions,
    );
    const outcome =
      documentSymbols.totalSymbols === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${documentSymbols.symbols.length} of ${documentSymbols.totalSymbols} TypeScript document-symbol row(s).`,
      {
        value: { documentSymbols },
        basis: [programBasis(sourceProject)],
        evidence: documentSymbols.symbols
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForDocumentSymbol),
        page: {
          size: documentSymbols.limit,
          cursor: inquiry.page?.cursor,
          returned: documentSymbols.symbols.length,
          total: documentSymbols.totalSymbols,
          ...(documentSymbols.nextOffset === undefined
            ? {}
            : { nextCursor: String(documentSymbols.nextOffset) }),
        },
        continuations: documentSymbolContinuations(
          inquiry,
          selector,
          documentSymbols,
        ),
      },
    );
  }
  if (projection === "symbols") {
    const symbolOptions: SymbolIndexOptions = {
      ...options,
      ...stringFilter(inquiry.filters, "query"),
    };
    const symbols = readSymbolIndex(sourceProject, selector, symbolOptions);
    const outcome =
      symbols.totalEntries === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${symbols.entries.length} of ${symbols.totalEntries} TypeScript symbol row(s).`,
      {
        value: { symbols },
        basis: [programBasis(sourceProject)],
        evidence: symbols.entries
          .slice(0, evidenceLimit(inquiry))
          .map((entry) => evidenceForTarget(entry.target, EvidenceKind.Symbol)),
        page: {
          size: symbols.limit,
          cursor: inquiry.page?.cursor,
          returned: symbols.entries.length,
          total: symbols.totalEntries,
          ...(symbols.nextOffset === undefined
            ? {}
            : { nextCursor: String(symbols.nextOffset) }),
        },
        continuations: symbolContinuations(inquiry, selector, symbols),
      },
    );
  }
  if (projection === "exports") {
    const exports = readExportSurface(sourceProject, selector, {
      ...options,
      ...stringFilter(inquiry.filters, "query"),
      ...stringFilter(inquiry.filters, "memberName"),
    });
    const outcome =
      exports.totalExports === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${exports.exports.length} of ${exports.totalExports} TypeScript export row(s).`,
      {
        value: { exports },
        basis: [programBasis(sourceProject), checkerBasis(sourceProject)],
        evidence: exports.exports
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForExportSurfaceEntry),
        page: {
          size: exports.limit,
          cursor: inquiry.page?.cursor,
          returned: exports.exports.length,
          total: exports.totalExports,
          ...(exports.nextOffset === undefined
            ? {}
            : { nextCursor: String(exports.nextOffset) }),
        },
        continuations: exportSurfaceContinuations(inquiry, selector, exports),
      },
    );
  }
  const surface = readApiSurface(sourceProject, selector, options);
  const returned = surface.entries.length;
  const value: TsStructureValue = { surface };
  const outcome =
    surface.rollup.totalEntries === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;

  return createAnswer(
    inquiry,
    outcome,
    `Returned ${returned} of ${surface.rollup.totalEntries} TypeScript declaration row(s).`,
    {
      value,
      basis: [programBasis(sourceProject)],
      evidence: surface.entries
        .slice(0, evidenceLimit(inquiry))
        .map((entry) => evidenceForTarget(entry.target, EvidenceKind.Symbol)),
      page: {
        size: surface.limit,
        cursor: inquiry.page?.cursor,
        returned,
        total: surface.rollup.totalEntries,
        ...(surface.nextOffset === undefined
          ? {}
          : { nextCursor: String(surface.nextOffset) }),
      },
      continuations: apiSurfaceContinuations(inquiry, selector, surface),
    },
  );
}

/** Answer TypeChecker fact inquiries from the hot SourceProject. */
export function answerTsType(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<TsTypeValue> {
  const projection = inquiry.projection ?? "facts";
  if (projection === "guide") {
    return createAnswer(
      inquiry,
      OutcomeKind.Hit,
      "Returned the compact TypeScript IDE capability guide.",
      {
        value: { guide: createTypeScriptIdeGuide(sourceProject) },
        basis: [
          sourceTextBasis(sourceProject),
          programBasis(sourceProject),
          checkerBasis(sourceProject),
        ],
        continuations: typeScriptGuideContinuations(inquiry, sourceProject),
      },
    );
  }

  const selector = selectorFromInquiry(inquiry);
  const pageOptions = {
    limit: clampBudget(inquiry.budget?.rows, 80, 1_000),
    offset: pageOffset(inquiry),
  };
  if (projection === "references") {
    const references = readReferences(sourceProject, selector, pageOptions);
    const outcome =
      references.totalReferences === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${references.references.length} of ${references.totalReferences} TypeScript reference row(s).`,
      {
        value: { references },
        basis: [checkerBasis(sourceProject)],
        evidence: references.references
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForReference),
        page: {
          size: references.limit,
          cursor: inquiry.page?.cursor,
          returned: references.references.length,
          total: references.totalReferences,
          ...(references.nextOffset === undefined
            ? {}
            : { nextCursor: String(references.nextOffset) }),
        },
        continuations: referenceContinuations(inquiry, selector, references),
      },
    );
  }
  if (projection === "definitions") {
    const navigation = readNavigation(sourceProject, selector, pageOptions);
    const outcome =
      navigation.totalEntries === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${navigation.entries.length} of ${navigation.totalEntries} TypeScript navigation row(s).`,
      {
        value: { navigation },
        basis: [checkerBasis(sourceProject)],
        evidence: navigation.entries
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForNavigation),
        page: {
          size: navigation.limit,
          cursor: inquiry.page?.cursor,
          returned: navigation.entries.length,
          total: navigation.totalEntries,
          ...(navigation.nextOffset === undefined
            ? {}
            : { nextCursor: String(navigation.nextOffset) }),
        },
        continuations: navigationContinuations(inquiry, selector, navigation),
      },
    );
  }
  if (projection === "call-hierarchy") {
    const callHierarchy = readCallHierarchy(
      sourceProject,
      selector,
      pageOptions,
    );
    const outcome =
      callHierarchy.items.length === 0 && callHierarchy.totalEdges === 0
        ? OutcomeKind.Miss
        : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${callHierarchy.edges.length} of ${callHierarchy.totalEdges} TypeScript call-hierarchy edge(s) from ${callHierarchy.items.length} item(s).`,
      {
        value: { callHierarchy },
        basis: [checkerBasis(sourceProject)],
        evidence: callHierarchy.edges
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForCallHierarchyEdge),
        page: {
          size: callHierarchy.limit,
          cursor: inquiry.page?.cursor,
          returned: callHierarchy.edges.length,
          total: callHierarchy.totalEdges,
          ...(callHierarchy.nextOffset === undefined
            ? {}
            : { nextCursor: String(callHierarchy.nextOffset) }),
        },
        continuations: callHierarchyContinuations(
          inquiry,
          selector,
          callHierarchy,
        ),
      },
    );
  }
  if (projection === "call-sites") {
    const callSites = readCallSites(sourceProject, selector, {
      ...pageOptions,
      ...stringFilter(inquiry.filters, "calleeName"),
      ...stringFilter(inquiry.filters, "argumentText"),
      ...stringFilter(inquiry.filters, "argumentSymbolName"),
      ...stringFilter(inquiry.filters, "argumentFullyQualifiedName"),
      ...stringFilter(inquiry.filters, "kind"),
    });
    const outcome =
      callSites.totalCallSites === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${callSites.callSites.length} of ${callSites.totalCallSites} TypeScript call-site row(s).`,
      {
        value: { callSites },
        basis: [checkerBasis(sourceProject), sourceTextBasis(sourceProject)],
        evidence: callSites.callSites
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForCallSite),
        page: {
          size: callSites.limit,
          cursor: inquiry.page?.cursor,
          returned: callSites.callSites.length,
          total: callSites.totalCallSites,
          ...(callSites.nextOffset === undefined
            ? {}
            : { nextCursor: String(callSites.nextOffset) }),
        },
        continuations: callSiteContinuations(inquiry, selector, callSites),
      },
    );
  }
  if (projection === "diagnostics") {
    const diagnostics = readDiagnostics(sourceProject, selector, pageOptions);
    const summary =
      diagnostics.totalDiagnostics === 0
        ? "TypeScript diagnostics closed cleanly for the selected scope."
        : `Returned ${diagnostics.diagnostics.length} of ${diagnostics.totalDiagnostics} TypeScript diagnostic row(s).`;
    return createAnswer(
      inquiry,
      OutcomeKind.Hit,
      summary,
      {
        value: { diagnostics },
        basis: [checkerBasis(sourceProject)],
        evidence: diagnostics.diagnostics
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForDiagnostic),
        page: {
          size: diagnostics.limit,
          cursor: inquiry.page?.cursor,
          returned: diagnostics.diagnostics.length,
          total: diagnostics.totalDiagnostics,
          ...(diagnostics.nextOffset === undefined
            ? {}
            : { nextCursor: String(diagnostics.nextOffset) }),
        },
        continuations: diagnosticContinuations(inquiry, selector, diagnostics),
      },
    );
  }
  if (projection === "quick-info") {
    const quickInfo = readQuickInfo(sourceProject, selector, pageOptions);
    const outcome =
      quickInfo.totalEntries === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${quickInfo.entries.length} of ${quickInfo.totalEntries} TypeScript quick-info row(s).`,
      {
        value: { quickInfo },
        basis: [checkerBasis(sourceProject)],
        evidence: quickInfo.entries
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForQuickInfo),
        page: {
          size: quickInfo.limit,
          cursor: inquiry.page?.cursor,
          returned: quickInfo.entries.length,
          total: quickInfo.totalEntries,
          ...(quickInfo.nextOffset === undefined
            ? {}
            : { nextCursor: String(quickInfo.nextOffset) }),
        },
        continuations: quickInfoContinuations(inquiry, selector, quickInfo),
      },
    );
  }
  if (projection === "signature-help") {
    const signatureHelp = readSignatureHelp(
      sourceProject,
      selector,
      pageOptions,
    );
    const outcome =
      signatureHelp.totalItems === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${signatureHelp.items.length} of ${signatureHelp.totalItems} TypeScript signature-help item(s).`,
      {
        value: { signatureHelp },
        basis: [checkerBasis(sourceProject)],
        evidence: signatureHelp.items
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForSignatureHelp),
        page: {
          size: signatureHelp.limit,
          cursor: inquiry.page?.cursor,
          returned: signatureHelp.items.length,
          total: signatureHelp.totalItems,
          ...(signatureHelp.nextOffset === undefined
            ? {}
            : { nextCursor: String(signatureHelp.nextOffset) }),
        },
        continuations: signatureHelpContinuations(
          inquiry,
          selector,
          signatureHelp,
        ),
      },
    );
  }
  if (projection === "highlights") {
    const highlights = readHighlights(sourceProject, selector, pageOptions);
    const outcome =
      highlights.totalHighlights === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${highlights.highlights.length} of ${highlights.totalHighlights} TypeScript highlight row(s).`,
      {
        value: { highlights },
        basis: [checkerBasis(sourceProject)],
        evidence: highlights.highlights
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForHighlight),
        page: {
          size: highlights.limit,
          cursor: inquiry.page?.cursor,
          returned: highlights.highlights.length,
          total: highlights.totalHighlights,
          ...(highlights.nextOffset === undefined
            ? {}
            : { nextCursor: String(highlights.nextOffset) }),
        },
        continuations: highlightContinuations(inquiry, selector, highlights),
      },
    );
  }
  if (projection === "rename") {
    const rename = readRename(sourceProject, selector, pageOptions);
    const outcome = rename.canRename ? OutcomeKind.Hit : OutcomeKind.Miss;
    return createAnswer(
      inquiry,
      outcome,
      rename.canRename
        ? `Returned ${rename.locations.length} of ${rename.totalLocations} TypeScript rename location(s).`
        : `TypeScript rename is unavailable: ${
            rename.error ?? "unknown reason"
          }.`,
      {
        value: { rename },
        basis: [checkerBasis(sourceProject)],
        evidence: rename.locations
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForRenameLocation),
        page: {
          size: rename.limit,
          cursor: inquiry.page?.cursor,
          returned: rename.locations.length,
          total: rename.totalLocations,
          ...(rename.nextOffset === undefined
            ? {}
            : { nextCursor: String(rename.nextOffset) }),
        },
        continuations: renameContinuations(inquiry, selector, rename),
      },
    );
  }
  if (projection === "refactors") {
    const refactors = readRefactors(sourceProject, selector, pageOptions);
    const outcome =
      refactors.totalActions === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${refactors.actions.length} of ${refactors.totalActions} TypeScript refactor action(s).`,
      {
        value: { refactors },
        basis: [checkerBasis(sourceProject)],
        evidence: refactors.actions
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForRefactorAction),
        page: {
          size: refactors.limit,
          cursor: inquiry.page?.cursor,
          returned: refactors.actions.length,
          total: refactors.totalActions,
          ...(refactors.nextOffset === undefined
            ? {}
            : { nextCursor: String(refactors.nextOffset) }),
        },
        continuations: refactorContinuations(inquiry, selector, refactors),
      },
    );
  }
  if (projection === "code-fixes") {
    const codeFixes = readCodeFixes(sourceProject, selector, pageOptions);
    const outcome =
      codeFixes.totalActions === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${codeFixes.actions.length} of ${codeFixes.totalActions} TypeScript code-fix action(s).`,
      {
        value: { codeFixes },
        basis: [checkerBasis(sourceProject)],
        evidence: codeFixes.actions
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForCodeFixAction),
        page: {
          size: codeFixes.limit,
          cursor: inquiry.page?.cursor,
          returned: codeFixes.actions.length,
          total: codeFixes.totalActions,
          ...(codeFixes.nextOffset === undefined
            ? {}
            : { nextCursor: String(codeFixes.nextOffset) }),
        },
        continuations: codeFixContinuations(inquiry, selector, codeFixes),
      },
    );
  }
  if (projection === "refactor-edits") {
    const refactorEdits = readRefactorEdits(sourceProject, selector, {
      ...pageOptions,
      ...stringFilter(inquiry.filters, "refactorName"),
      ...stringFilter(inquiry.filters, "actionName"),
      ...stringFilter(inquiry.filters, "targetFile"),
    });
    const outcome = refactorEdits.applicable
      ? OutcomeKind.Hit
      : OutcomeKind.Miss;
    return createAnswer(
      inquiry,
      outcome,
      refactorEdits.applicable
        ? `Returned TypeScript refactor edit plan with ${refactorEdits.changes.length} file edit group(s).`
        : `TypeScript refactor edits are unavailable: ${
            refactorEdits.notApplicableReason ?? "unknown reason"
          }.`,
      {
        value: { refactorEdits },
        basis: [checkerBasis(sourceProject)],
        evidence: refactorEdits.changes
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForFileEdits),
        continuations: refactorEditContinuations(
          inquiry,
          selector,
          refactorEdits,
        ),
      },
    );
  }
  if (projection === "organize-imports") {
    const organizeImports = readOrganizeImports(
      sourceProject,
      selector,
      pageOptions,
    );
    const outcome =
      organizeImports.totalFiles === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;
    return createAnswer(
      inquiry,
      outcome,
      `Returned ${organizeImports.changes.length} of ${organizeImports.totalFiles} TypeScript organize-import file edit group(s).`,
      {
        value: { organizeImports },
        basis: [checkerBasis(sourceProject)],
        evidence: organizeImports.changes
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForFileEdits),
        page: {
          size: organizeImports.limit,
          cursor: inquiry.page?.cursor,
          returned: organizeImports.changes.length,
          total: organizeImports.totalFiles,
          ...(organizeImports.nextOffset === undefined
            ? {}
            : { nextCursor: String(organizeImports.nextOffset) }),
        },
        continuations: organizeImportContinuations(
          inquiry,
          selector,
          organizeImports,
        ),
      },
    );
  }
  if (projection === "file-rename-edits") {
    const fileRenameEdits = readFileRenameEdits(sourceProject, selector, {
      ...pageOptions,
      ...stringFilter(inquiry.filters, "oldFilePath"),
      ...stringFilter(inquiry.filters, "newFilePath"),
    });
    const outcome = fileRenameEdits.applicable
      ? OutcomeKind.Hit
      : OutcomeKind.Miss;
    return createAnswer(
      inquiry,
      outcome,
      fileRenameEdits.applicable
        ? `Returned TypeScript file-rename edit plan with ${fileRenameEdits.changes.length} file edit group(s).`
        : `TypeScript file-rename edits are unavailable: ${
            fileRenameEdits.notApplicableReason ?? "unknown reason"
          }.`,
      {
        value: { fileRenameEdits },
        basis: [checkerBasis(sourceProject)],
        evidence: fileRenameEdits.changes
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForFileEdits),
        continuations: fileRenameEditContinuations(
          inquiry,
          selector,
          fileRenameEdits,
        ),
      },
    );
  }
  const options: TypeFactOptions = {
    limit: clampBudget(inquiry.budget?.rows, 40, 200),
    memberLimit: clampBudget(inquiry.budget?.evidencePerSubject, 20, 200),
  };
  const typeFacts = readTypeFacts(sourceProject, selector, options);
  const outcome =
    typeFacts.facts.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit;

  return createAnswer(
    inquiry,
    outcome,
    `Returned ${typeFacts.facts.length} TypeChecker fact row(s).`,
    {
      value: { typeFacts },
      basis: [checkerBasis(sourceProject)],
      evidence: typeFacts.facts
        .slice(0, evidenceLimit(inquiry))
        .map((fact) => evidenceForTarget(fact.target, EvidenceKind.TypeFact)),
      continuations: typeContinuations(inquiry, typeFacts),
    },
  );
}

function createTypeScriptIdeGuide(
  sourceProject: SourceProject,
): TypeScriptIdeGuide {
  const packages = guidePackages(sourceProject);
  const kernelPackageId = packageIdOrFallback(packages, "kernel");
  const productPackageId = packageIdOrFallback(packages, "semantic-runtime");
  const atlasPackageId = packageIdOrFallback(packages, "atlas");

  return {
    call:
      "createApi().ask({ lens, locus?, subject?, projection?, filters?, budget?, page? })",
    operatingNotes: [
      "Use locus for normal package, file, range, and symbol reads.",
      "Use subject.scheme when the entrypoint is an IDE cursor, token occurrence, directory, or exported declaration.",
      "Use ts.type:facts on a declaration selector when you need declaration-sized source ranges for a class or interface.",
      "Use evidence.source as a source-range locus when an answer already selected exact code.",
      "Use continuation.inquiry exactly when a prior answer offers the hop you need.",
      "Use small row budgets first; broaden with page.next or a larger budget only after the lens proves useful.",
    ],
    loci: [
      {
        id: "repo",
        use: "Whole admitted Atlas, semantic-runtime, and Aurelia framework TypeScript world.",
        example: { kind: LocusKind.Repo },
      },
      {
        id: "package",
        use: "One admitted package, including Aurelia framework packages under the in-repo submodule.",
        example: { kind: LocusKind.Package, packageId: kernelPackageId },
      },
      {
        id: "source-file",
        use: "One repository-relative TypeScript source file.",
        example: {
          kind: LocusKind.SourceFile,
          filePath: "packages/atlas/src/session/api.ts",
        },
      },
      {
        id: "source-range",
        use: "Exact range obtained from evidence.source or a continuation.",
        example: {
          kind: LocusKind.SourceRange,
          range: {
            filePath: "packages/atlas/src/session/api.ts",
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
        },
      },
      {
        id: "symbol",
        use: "Named declaration, optionally narrowed to a file or package.",
        example: {
          kind: LocusKind.Symbol,
          name: "Container",
          packageName: "@aurelia/kernel",
        },
      },
    ],
    subjectSelectors: [
      {
        id: SourceSelectorScheme.Workspace,
        use: "Workspace declaration query from a repo locus.",
        example: { scheme: SourceSelectorScheme.Workspace, query: "Container" },
      },
      {
        id: SourceSelectorScheme.Package,
        use: "Package selector equivalent to a package locus.",
        example: { scheme: SourceSelectorScheme.Package, packageId: kernelPackageId },
      },
      {
        id: SourceSelectorScheme.Directory,
        use: "Directory scope when package boundaries are too coarse.",
        example: {
          scheme: SourceSelectorScheme.Directory,
          path: "aurelia/packages/runtime-html/src",
          recursive: true,
        },
      },
      {
        id: SourceSelectorScheme.File,
        use: "File selector equivalent to a source-file locus.",
        example: {
          scheme: SourceSelectorScheme.File,
          filePath: "packages/semantic-runtime/src/index.ts",
        },
      },
      {
        id: SourceSelectorScheme.Position,
        use: "IDE cursor operations such as quick-info, definitions, highlights, rename, and refactors.",
        example: {
          scheme: SourceSelectorScheme.Position,
          filePath: "packages/atlas/src/session/api.ts",
          line: 0,
          character: 0,
        },
      },
      {
        id: SourceSelectorScheme.Token,
        use: "Exact token occurrence inside one file when line and character are not known.",
        example: {
          scheme: SourceSelectorScheme.Token,
          filePath: "packages/atlas/src/session/api.ts",
          text: "createApi",
          occurrence: 0,
        },
      },
      {
        id: SourceSelectorScheme.Declaration,
        use: "Named declaration inventory lookup, optionally narrowed by package or kind.",
        example: {
          scheme: SourceSelectorScheme.Declaration,
          name: "Container",
          kind: "class",
          packageId: "kernel",
        },
      },
      {
        id: SourceSelectorScheme.Export,
        use: "Checker-visible exported declaration from a package or entry module.",
        example: {
          scheme: SourceSelectorScheme.Export,
          exportName: "IContainer",
          packageId: kernelPackageId,
        },
      },
    ],
    packageExamples: packages,
    moves: [
      {
        id: "package.exports",
        capability: "List checker-visible package exports.",
        use: "Start here when asking what a package exposes to the rest of the framework or product.",
        ask: {
          lens: LensId.TsStructure,
          locus: { kind: LocusKind.Package, packageId: kernelPackageId },
          projection: "exports",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
      {
        id: "package.api",
        capability: "List declarations in one package.",
        use: "Use after exports when you need internal declaration rows, not just public entrypoint surface.",
        ask: {
          lens: LensId.TsStructure,
          locus: { kind: LocusKind.Package, packageId: productPackageId },
          projection: "api",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
      {
        id: "package.module-graph",
        capability: "Read import and export edges.",
        use: "Use for package topology, dependency direction, and source-file neighborhood discovery.",
        ask: {
          lens: LensId.TsStructure,
          locus: { kind: LocusKind.Package, packageId: atlasPackageId },
          projection: "module-graph",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
      {
        id: "symbol.search",
        capability: "Search declarations by name.",
        use: "Use before cursor-level reads when you only know the symbol text.",
        ask: {
          lens: LensId.TsStructure,
          locus: { kind: LocusKind.Repo },
          projection: "symbols",
          filters: { query: "Container" },
          budget: { rows: 20, evidencePerSubject: 3 },
        },
      },
      {
        id: "declaration.facts",
        capability: "Inspect TypeChecker facts for a named declaration.",
        use: "Use when a framework declaration should become a semantic-runtime obligation or dependency seed.",
        ask: {
          lens: LensId.TsType,
          subject: {
            scheme: SourceSelectorScheme.Declaration,
            name: "Container",
            kind: "class",
            packageId: kernelPackageId,
          },
          projection: "facts",
          budget: { rows: 20, evidencePerSubject: 3 },
        },
      },
      {
        id: "declaration.full-source",
        capability: "Read the full source body of a declaration.",
        use: "Ask declaration facts first, then follow the source continuation whose range is the implementation source file.",
        fillFrom: "ts.type:facts answer.continuations[*].inquiry where lens is ts.source",
        ask: {
          lens: LensId.TsType,
          subject: {
            scheme: SourceSelectorScheme.Declaration,
            name: "Container",
            kind: "class",
            packageId: kernelPackageId,
          },
          projection: "facts",
          budget: { rows: 8, evidencePerSubject: 4 },
        },
      },
      {
        id: "evidence.source",
        capability: "Open exact source behind a row.",
        use: "Use after any answer with evidence carrying a source range.",
        fillFrom: "answer.evidence[i].source",
        ask: {
          lens: LensId.TsSource,
          locus: {
            kind: LocusKind.SourceRange,
            range: {
              filePath: "<answer.evidence[i].source.filePath>",
              start: "<answer.evidence[i].source.start>",
              end: "<answer.evidence[i].source.end>",
            },
          },
          projection: "text",
          budget: { textChars: 20_000 },
        },
      },
      {
        id: "cursor.quick-info",
        capability: "Inspect hover-like quick info at a cursor position.",
        use: "Use with a position selector when you already know the file and cursor.",
        fillFrom: "source file plus zero-based line/character",
        ask: {
          lens: LensId.TsType,
          subject: {
            scheme: SourceSelectorScheme.Position,
            filePath: "<file>",
            line: "<line>",
            character: "<character>",
          },
          projection: "quick-info",
          budget: { rows: 20, evidencePerSubject: 3 },
        },
      },
      {
        id: "symbol.references",
        capability: "Find exact references and reference roles.",
        use: "Use after a symbol/export/declaration read proves the symbol you want.",
        fillFrom: "answer.evidence[i].handle or answer.continuations[*].inquiry",
        ask: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.Symbol, name: "Container" },
          projection: "references",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
      {
        id: "call-sites.by-callee",
        capability: "Find exact call or new expressions by callee name and optional argument facts.",
        use: "Use after package or file scoping; add argumentText, argumentSymbolName, or argumentFullyQualifiedName when a call edge must stay exact.",
        ask: {
          lens: LensId.TsType,
          locus: {
            kind: LocusKind.SourceFile,
            filePath: "aurelia/packages/kernel/src/di.container.ts",
          },
          projection: "call-sites",
          filters: { calleeName: "register" },
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
      {
        id: "diagnostics.package",
        capability: "Read TypeScript diagnostics for one package.",
        use: "Use before refactoring or when a package-level operation looks suspicious.",
        ask: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.Package, packageId: productPackageId },
          projection: "diagnostics",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
      {
        id: "edit.rename-preview",
        capability: "Ask TypeScript whether rename is legal and where it would touch.",
        use: "Use before any semantic rename or refactor plan.",
        fillFrom: "symbol, source-range, position selector, or continuation",
        ask: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.Symbol, name: "Container" },
          projection: "rename",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
      {
        id: "framework.semantic-entry",
        capability: "Move from TypeScript package ore into Aurelia semantic catalogs.",
        use: "Use after exports or symbol facts when the question is resources, DI, rendering, observers, router, or lifecycle.",
        ask: {
          lens: LensId.FrameworkDiscovery,
          locus: { kind: LocusKind.Repo },
          projection: "summary",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
      },
    ],
  };
}

function guidePackages(
  sourceProject: SourceProject,
): readonly TypeScriptGuidePackage[] {
  const summary = sourceProject.snapshot().summary;
  const wanted = new Set([
    "atlas",
    "semantic-runtime",
    "kernel",
    "runtime",
    "runtime-html",
    "router",
    "template-compiler",
  ]);
  return summary.packages
    .filter((sourcePackage) => wanted.has(sourcePackage.id))
    .map((sourcePackage) => ({
      id: sourcePackage.id,
      packageName: sourcePackage.packageName,
      rootPath: sourcePackage.rootPath,
      family:
        sourcePackage.id === "atlas"
          ? "atlas"
          : sourcePackage.id === "semantic-runtime"
          ? "product"
          : "framework",
    }));
}

function packageIdOrFallback(
  packages: readonly TypeScriptGuidePackage[],
  preferred: string,
): string {
  return packages.some((sourcePackage) => sourcePackage.id === preferred)
    ? preferred
    : packages[0]?.id ?? preferred;
}

function typeScriptGuideContinuations(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): readonly Continuation[] {
  const packages = guidePackages(sourceProject);
  const kernelPackageId = packageIdOrFallback(packages, "kernel");
  const productPackageId = packageIdOrFallback(packages, "semantic-runtime");
  return [
    {
      id: "ts.guide:kernel-exports",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Primary,
      rationale: "Read checker-visible exports for the Aurelia kernel package.",
      inquiry: {
        ...inquiry,
        lens: LensId.TsStructure,
        locus: { kind: LocusKind.Package, packageId: kernelPackageId },
        projection: "exports",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
      route: projectionRoute("Kernel package exports from the TypeScript guide."),
    },
    {
      id: "ts.guide:product-api",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Read declaration rows for semantic-runtime.",
      inquiry: {
        ...inquiry,
        lens: LensId.TsStructure,
        locus: { kind: LocusKind.Package, packageId: productPackageId },
        projection: "api",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
      route: projectionRoute("Product package declarations from the TypeScript guide."),
    },
    {
      id: "ts.guide:container-facts",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for the kernel Container export.",
      inquiry: {
        ...inquiry,
        lens: LensId.TsType,
        subject: {
          scheme: SourceSelectorScheme.Declaration,
          name: "Container",
          kind: "class",
          packageId: kernelPackageId,
        },
        projection: "facts",
        budget: { rows: 20, evidencePerSubject: 3 },
      },
      route: typeFactsRoute("Checker facts for the kernel Container export from the TypeScript guide."),
    },
    {
      id: "ts.guide:framework-semantics",
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Enter Aurelia semantic catalogs after TypeScript package ore.",
      inquiry: {
        ...inquiry,
        lens: LensId.FrameworkDiscovery,
        locus: { kind: LocusKind.Repo },
        projection: "summary",
        budget: { rows: 40, evidencePerSubject: 3 },
      },
      route: continuationRoute(
        NavigationPlane.Semantic,
        NavigationRelation.FrameworkFlowOf,
        [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
        "Aurelia semantic catalogs from the TypeScript guide.",
      ),
    },
  ];
}

function sourceSummary(
  projection: string,
  targets: number,
  slices: number,
): string {
  if (projection === "text") {
    return `Returned ${slices} source text slice(s) from ${targets} target(s).`;
  }
  return `Resolved ${targets} source target(s).`;
}

function sourceContinuations(
  inquiry: Inquiry,
  targets: readonly SourceTargetRow[],
): readonly Continuation[] {
  if ((inquiry.projection ?? "summary") !== "summary") {
    return [];
  }
  return targets.slice(0, 3).flatMap((target, index) => {
    const range = sourceRangeForTarget(target);
    if (range === null) {
      return [];
    }
    return [
      {
        id: `ts.source:text:${index}`,
        kind: ContinuationKind.SwitchProjection,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect exact source text for this resolved target.",
        inquiry: {
          lens: LensId.TsSource,
          locus: { kind: LocusKind.SourceRange, range },
          projection: "text",
        },
        evidence: [evidenceForTarget(target, EvidenceKind.SourceSpan)],
        route: sourceRoute("Source text for a resolved source target."),
      },
    ];
  });
}

function apiSurfaceContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  surface: TypeScriptApiSurface,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (surface.nextOffset !== undefined) {
    continuations.push({
      id: "ts.structure:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the TypeScript declaration surface page.",
      inquiry: {
        ...inquiry,
        page: { size: surface.limit, cursor: String(surface.nextOffset) },
      },
      route: nextPageRoute("Next declaration-surface page."),
    });
  }
  continuations.push({
    id: "ts.structure:type",
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect TypeChecker facts for the same TypeScript selector.",
    inquiry: {
      lens: LensId.TsType,
      locus: inquiry.locus,
      subject: selector,
      projection: "facts",
      budget: inquiry.budget,
    },
    route: typeFactsRoute("Type facts for the same TypeScript selector."),
  });
  for (const [index, entry] of surface.entries.slice(0, 3).entries()) {
    const range = sourceRangeForTarget(entry.target);
    if (range === null) {
      continue;
    }
    continuations.push({
      id: `ts.structure:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source declaration behind this row.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range },
        projection: "text",
      },
      evidence: [evidenceForTarget(entry.target, EvidenceKind.Symbol)],
      route: sourceRoute("Source declaration behind an API-surface row."),
    });
  }
  return continuations;
}

function moduleGraphContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  moduleGraph: TypeScriptModuleGraph,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (moduleGraph.nextOffset !== undefined) {
    continuations.push({
      id: "ts.structure:module-graph:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the TypeScript module graph page.",
      inquiry: {
        ...inquiry,
        page: {
          size: moduleGraph.limit,
          cursor: String(moduleGraph.nextOffset),
        },
      },
      route: nextPageRoute("Next module-graph page."),
    });
  }
  continuations.push({
    id: "ts.structure:api",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect declarations for the same TypeScript selector.",
    inquiry: {
      lens: LensId.TsStructure,
      locus: inquiry.locus,
      subject: selector,
      projection: "api",
      budget: inquiry.budget,
    },
    route: projectionRoute(
      "Declaration surface for the same TypeScript selector.",
    ),
  });
  for (const [index, edge] of moduleGraph.edges.slice(0, 3).entries()) {
    continuations.push({
      id: `ts.structure:module-graph:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source edge behind this module graph row.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForModuleEdge(edge),
        },
        projection: "text",
      },
      evidence: [evidenceForModuleEdge(edge)],
      route: sourceRoute(
        "Source import/export edge behind a module-graph row.",
      ),
    });
  }
  return continuations;
}

function documentSymbolContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  documentSymbols: TypeScriptDocumentSymbolsRead,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (documentSymbols.nextOffset !== undefined) {
    continuations.push({
      id: "ts.structure:document-symbols:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the TypeScript document-symbol page.",
      inquiry: {
        ...inquiry,
        page: {
          size: documentSymbols.limit,
          cursor: String(documentSymbols.nextOffset),
        },
      },
      route: nextPageRoute("Next document-symbol page."),
    });
  }
  continuations.push({
    id: "ts.structure:document-symbols:api",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect declaration rows for the same TypeScript selector.",
    inquiry: {
      lens: LensId.TsStructure,
      locus: inquiry.locus,
      subject: selector,
      projection: "api",
      budget: inquiry.budget,
    },
    route: projectionRoute(
      "Declaration rows for the same TypeScript selector.",
    ),
  });
  for (const [index, symbol] of documentSymbols.symbols.slice(0, 3).entries()) {
    continuations.push({
      id: `ts.structure:document-symbols:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this document symbol.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForDocumentSymbol(symbol),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForDocumentSymbol(symbol)],
      route: sourceRoute("Source range behind a document-symbol row."),
    });
  }
  return continuations;
}

function symbolContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  symbols: TypeScriptSymbolIndex,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (symbols.nextOffset !== undefined) {
    continuations.push({
      id: "ts.structure:symbols:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the TypeScript symbol page.",
      inquiry: {
        ...inquiry,
        page: { size: symbols.limit, cursor: String(symbols.nextOffset) },
      },
      route: nextPageRoute("Next symbol-index page."),
    });
  }
  continuations.push({
    id: "ts.structure:module-graph",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect module edges for the same TypeScript selector.",
    inquiry: {
      lens: LensId.TsStructure,
      locus: inquiry.locus,
      subject: selector,
      projection: "module-graph",
      budget: inquiry.budget,
    },
    route: projectionRoute("Module graph for the same TypeScript selector."),
  });
  for (const [index, entry] of symbols.entries.slice(0, 3).entries()) {
    const range = sourceRangeForTarget(entry.target);
    if (range === null) {
      continue;
    }
    continuations.push({
      id: `ts.structure:symbols:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this symbol row.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range },
        projection: "facts",
        budget: inquiry.budget,
      },
      evidence: [evidenceForTarget(entry.target, EvidenceKind.Symbol)],
      route: typeFactsRoute("Type facts for a symbol-index row."),
    });
  }
  return continuations;
}

function exportSurfaceContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  exports: TypeScriptExportSurfaceRead,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (exports.nextOffset !== undefined) {
    continuations.push({
      id: "ts.structure:exports:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the TypeScript export surface page.",
      inquiry: {
        ...inquiry,
        page: { size: exports.limit, cursor: String(exports.nextOffset) },
      },
      route: nextPageRoute("Next TypeScript export surface page."),
    });
  }
  continuations.push({
    id: "ts.structure:exports:api",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect declaration rows for the same TypeScript selector.",
    inquiry: {
      lens: LensId.TsStructure,
      locus: inquiry.locus,
      subject: selector,
      projection: "api",
      budget: inquiry.budget,
    },
    route: projectionRoute(
      "API declaration surface for the same TypeScript selector.",
    ),
  });
  for (const [index, entry] of exports.exports.slice(0, 3).entries()) {
    const evidence = evidenceForExportSurfaceEntry(entry);
    const firstTarget = entry.targets[0];
    if (firstTarget === undefined) {
      continue;
    }
    const range = sourceRangeForTarget(firstTarget);
    if (range !== null) {
      continuations.push({
        id: `ts.structure:exports:source:${index}`,
        kind: ContinuationKind.InspectEvidence,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect source behind this TypeScript export row.",
        inquiry: {
          lens: LensId.TsSource,
          locus: { kind: LocusKind.SourceRange, range },
          projection: "text",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: sourceRoute(
          "Source declaration behind a TypeScript export row.",
        ),
      });
      continuations.push({
        id: `ts.structure:exports:type:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect TypeChecker facts for this TypeScript export row.",
        inquiry: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.SourceRange, range },
          projection: "facts",
          budget: inquiry.budget,
        },
        evidence: [evidence],
        route: typeFactsRoute("Type facts for a TypeScript export row."),
      });
    }
  }
  return continuations;
}

function typeContinuations(
  inquiry: Inquiry,
  typeFacts: TypeScriptTypeFacts,
): readonly Continuation[] {
  const continuations: Continuation[] = [
    {
      id: "ts.type:references",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeScript references for the same selector.",
      inquiry: {
        lens: LensId.TsType,
        locus: inquiry.locus,
        subject: typeFacts.resolution.selector,
        projection: "references",
        budget: inquiry.budget,
      },
      route: referencesRoute("References for the same TypeChecker selector."),
    },
  ];
  for (const [index, fact] of typeFacts.facts.slice(0, 3).entries()) {
    const range = sourceRangeForTarget(fact.target);
    if (range === null) {
      continue;
    }
    continuations.push({
      id: `ts.type:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this TypeChecker fact.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForTarget(fact.target, EvidenceKind.TypeFact)],
      route: sourceRoute("Source range behind a TypeChecker fact."),
    });
  }
  return continuations;
}

function referenceContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  references: TypeScriptReferenceRead,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (references.nextOffset !== undefined) {
    continuations.push({
      id: "ts.type:references:next-page",
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: "Continue the TypeScript reference page.",
      inquiry: {
        ...inquiry,
        page: { size: references.limit, cursor: String(references.nextOffset) },
      },
      route: nextPageRoute("Next TypeScript reference page."),
    });
  }
  continuations.push({
    id: "ts.type:facts",
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect TypeChecker facts for the same selector.",
    inquiry: {
      lens: LensId.TsType,
      locus: inquiry.locus,
      subject: selector,
      projection: "facts",
      budget: inquiry.budget,
    },
    route: typeFactsRoute("Type facts for the same TypeScript selector."),
  });
  for (const [index, reference] of references.references
    .slice(0, 3)
    .entries()) {
    continuations.push({
      id: `ts.type:references:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this reference.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForReference(reference),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForReference(reference)],
      route: sourceRoute("Source range behind a TypeScript reference."),
    });
  }
  return continuations;
}

function navigationContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  navigation: TypeScriptNavigationRead,
): readonly Continuation[] {
  const continuations = typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:definitions",
    navigation.nextOffset,
    navigation.limit,
    "Continue the TypeScript navigation page.",
  );
  for (const [index, entry] of navigation.entries.slice(0, 3).entries()) {
    continuations.push({
      id: `ts.type:definitions:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this TypeScript navigation target.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForNavigation(entry),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForNavigation(entry)],
      route: sourceRoute("Source range behind a TypeScript navigation target."),
    });
  }
  return continuations;
}

function callHierarchyContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  callHierarchy: TypeScriptCallHierarchyRead,
): readonly Continuation[] {
  const continuations = typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:call-hierarchy",
    callHierarchy.nextOffset,
    callHierarchy.limit,
    "Continue the TypeScript call-hierarchy page.",
  );
  for (const [index, edge] of callHierarchy.edges.slice(0, 3).entries()) {
    const range = sourceRangeForCallHierarchyEdge(edge);
    if (range === null) {
      continue;
    }
    continuations.push({
      id: `ts.type:call-hierarchy:call-site:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale:
        "Inspect exact callee and argument facts for this call-hierarchy edge.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range },
        projection: "call-sites",
        budget: inquiry.budget,
      },
      evidence: [evidenceForCallHierarchyEdge(edge)],
      route: callSitesRoute(
        "Exact call-site facts behind a call-hierarchy edge.",
      ),
    });
    continuations.push({
      id: `ts.type:call-hierarchy:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the call site behind this call-hierarchy edge.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForCallHierarchyEdge(edge)],
      route: sourceRoute("Source call site behind a call-hierarchy edge."),
    });
  }
  return continuations;
}

function callSiteContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  callSites: TypeScriptCallSitesRead,
): readonly Continuation[] {
  const continuations = typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:call-sites",
    callSites.nextOffset,
    callSites.limit,
    "Continue the TypeScript call-site page.",
  );
  for (const [index, callSite] of callSites.callSites.slice(0, 3).entries()) {
    continuations.push({
      id: `ts.type:call-sites:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect source behind this exact TypeScript call site.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForCallSite(callSite),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForCallSite(callSite)],
      route: sourceRoute("Source range behind an exact TypeScript call site."),
    });
  }
  return continuations;
}

function diagnosticContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  diagnostics: TypeScriptDiagnosticsRead,
): readonly Continuation[] {
  const continuations = typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:diagnostics",
    diagnostics.nextOffset,
    diagnostics.limit,
    "Continue the TypeScript diagnostic page.",
  );
  for (const [index, diagnostic] of diagnostics.diagnostics
    .slice(0, 3)
    .entries()) {
    const range = sourceRangeForDiagnostic(diagnostic);
    if (range === null) {
      continue;
    }
    continuations.push({
      id: `ts.type:diagnostics:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this TypeScript diagnostic.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForDiagnostic(diagnostic)],
      route: sourceRoute("Source range behind a TypeScript diagnostic."),
    });
  }
  return continuations;
}

function quickInfoContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  quickInfo: TypeScriptQuickInfoRead,
): readonly Continuation[] {
  const continuations = typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:quick-info",
    quickInfo.nextOffset,
    quickInfo.limit,
    "Continue the TypeScript quick-info page.",
  );
  for (const [index, entry] of quickInfo.entries.slice(0, 3).entries()) {
    continuations.push({
      id: `ts.type:quick-info:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this quick-info row.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForQuickInfo(entry),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForQuickInfo(entry)],
      route: sourceRoute("Source range behind a TypeScript quick-info row."),
    });
  }
  return continuations;
}

function signatureHelpContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  signatureHelp: TypeScriptSignatureHelpRead,
): readonly Continuation[] {
  return typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:signature-help",
    signatureHelp.nextOffset,
    signatureHelp.limit,
    "Continue the TypeScript signature-help page.",
  );
}

function highlightContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  highlights: TypeScriptHighlightsRead,
): readonly Continuation[] {
  const continuations = typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:highlights",
    highlights.nextOffset,
    highlights.limit,
    "Continue the TypeScript highlight page.",
  );
  for (const [index, highlight] of highlights.highlights
    .slice(0, 3)
    .entries()) {
    continuations.push({
      id: `ts.type:highlights:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this TypeScript highlight.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForHighlight(highlight),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForHighlight(highlight)],
      route: sourceRoute("Source range behind a document highlight."),
    });
  }
  return continuations;
}

function renameContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  rename: TypeScriptRenameRead,
): readonly Continuation[] {
  const continuations = typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:rename",
    rename.nextOffset,
    rename.limit,
    "Continue the TypeScript rename-location page.",
  );
  for (const [index, location] of rename.locations.slice(0, 3).entries()) {
    continuations.push({
      id: `ts.type:rename:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect the source behind this rename location.",
      inquiry: {
        lens: LensId.TsSource,
        locus: {
          kind: LocusKind.SourceRange,
          range: sourceRangeForRenameLocation(location),
        },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidenceForRenameLocation(location)],
      route: sourceRoute("Source range behind a rename location."),
    });
  }
  return continuations;
}

function refactorContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  refactors: TypeScriptRefactorsRead,
): readonly Continuation[] {
  return typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:refactors",
    refactors.nextOffset,
    refactors.limit,
    "Continue the TypeScript refactor action page.",
  );
}

function codeFixContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  codeFixes: TypeScriptCodeFixesRead,
): readonly Continuation[] {
  return typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:code-fixes",
    codeFixes.nextOffset,
    codeFixes.limit,
    "Continue the TypeScript code-fix action page.",
  );
}

function refactorEditContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  refactorEdits: TypeScriptRefactorEditsRead,
): readonly Continuation[] {
  if (refactorEdits.applicable) {
    return [];
  }
  return [
    {
      id: "ts.type:refactor-edits:actions",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Inspect applicable TypeScript refactor actions for this selector.",
      inquiry: {
        lens: LensId.TsType,
        locus: inquiry.locus,
        subject: selector,
        projection: "refactors",
        budget: inquiry.budget,
      },
      route: projectionRoute(
        "Applicable refactor actions for the same TypeScript selector.",
      ),
    },
  ];
}

function organizeImportContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  organizeImports: TypeScriptOrganizeImportsRead,
): readonly Continuation[] {
  return typeProjectionBaseContinuations(
    inquiry,
    selector,
    "ts.type:organize-imports",
    organizeImports.nextOffset,
    organizeImports.limit,
    "Continue the TypeScript organize-imports edit page.",
  );
}

function fileRenameEditContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  fileRenameEdits: TypeScriptFileRenameEditsRead,
): readonly Continuation[] {
  if (fileRenameEdits.applicable) {
    return [];
  }
  return [
    {
      id: "ts.type:file-rename-edits:rename",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect rename information for the same selector.",
      inquiry: {
        lens: LensId.TsType,
        locus: inquiry.locus,
        subject: selector,
        projection: "rename",
        budget: inquiry.budget,
      },
      route: editPlanRoute("Rename affordance for a file-rename edit request."),
    },
  ];
}

function typeProjectionBaseContinuations(
  inquiry: Inquiry,
  selector: SourceSelector,
  idPrefix: string,
  nextOffset: number | undefined,
  limit: number,
  nextPageRationale: string,
): Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push({
      id: `${idPrefix}:next-page`,
      kind: ContinuationKind.NextPage,
      priority: ContinuationPriority.Primary,
      rationale: nextPageRationale,
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: nextPageRoute(nextPageRationale),
    });
  }
  continuations.push({
    id: `${idPrefix}:facts`,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect TypeChecker facts for the same selector.",
    inquiry: {
      lens: LensId.TsType,
      locus: inquiry.locus,
      subject: selector,
      projection: "facts",
      budget: inquiry.budget,
    },
    route: typeFactsRoute("Type facts for the same TypeScript selector."),
  });
  return continuations;
}

function nextPageRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Addressing,
    NavigationRelation.NextPageOf,
    [],
    summary,
  );
}

function projectionRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Structure,
    NavigationRelation.ProjectionOf,
    [BasisKind.TypeScriptProgram],
    summary,
  );
}

function sourceRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.SourceFor,
    [BasisKind.SourceText, BasisKind.TypeScriptProgram],
    summary,
  );
}

function typeFactsRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Inspection,
    NavigationRelation.TypeFactsFor,
    [BasisKind.TypeScriptChecker],
    summary,
  );
}

function referencesRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Flow,
    NavigationRelation.ReferencesOf,
    [BasisKind.TypeScriptChecker],
    summary,
  );
}

function callSitesRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Flow,
    NavigationRelation.CallSitesOf,
    [BasisKind.SourceText, BasisKind.TypeScriptChecker],
    summary,
  );
}

function editPlanRoute(summary: string): NavigationRouteClaim {
  return continuationRoute(
    NavigationPlane.Maintenance,
    NavigationRelation.EditPlanFor,
    [BasisKind.TypeScriptChecker],
    summary,
  );
}

function continuationRoute(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}

function sourceRangeForTarget(target: SourceTargetRow): SourceRange | null {
  if (target.file === undefined || target.span === undefined) {
    return null;
  }
  return {
    filePath: target.file.repoPath,
    start: {
      line: target.span.startLine - 1,
      character: target.span.startCharacter - 1,
    },
    end: {
      line: target.span.endLine - 1,
      character: target.span.endCharacter - 1,
    },
  };
}

function sourceRangeForModuleEdge(edge: TypeScriptModuleEdge): SourceRange {
  return {
    filePath: edge.sourceFile.repoPath,
    start: {
      line: edge.span.startLine - 1,
      character: edge.span.startCharacter - 1,
    },
    end: {
      line: edge.span.endLine - 1,
      character: edge.span.endCharacter - 1,
    },
  };
}

function sourceRangeForDocumentSymbol(
  symbol: TypeScriptDocumentSymbolEntry,
): SourceRange {
  return sourceRangeFromFileSpan(symbol.file.repoPath, symbol.span);
}

function sourceRangeForReference(
  reference: TypeScriptReferenceEntry,
): SourceRange {
  return {
    filePath: reference.file.repoPath,
    start: {
      line: reference.span.startLine - 1,
      character: reference.span.startCharacter - 1,
    },
    end: {
      line: reference.span.endLine - 1,
      character: reference.span.endCharacter - 1,
    },
  };
}

function sourceRangeForNavigation(
  entry: TypeScriptNavigationEntry,
): SourceRange {
  return sourceRangeFromFileSpan(entry.file.repoPath, entry.span);
}

function sourceRangeForCallHierarchyEdge(
  edge: TypeScriptCallHierarchyEdge,
): SourceRange | null {
  const span = edge.fromSpans[0];
  return span === undefined
    ? null
    : sourceRangeFromFileSpan(edge.from.file.repoPath, span);
}

function sourceRangeForCallSite(
  callSite: TypeScriptCallSiteEntry,
): SourceRange {
  return sourceRangeFromFileSpan(callSite.file.repoPath, callSite.span);
}

function sourceRangeForDiagnostic(
  diagnostic: TypeScriptDiagnosticEntry,
): SourceRange | null {
  return diagnostic.file === undefined || diagnostic.span === undefined
    ? null
    : sourceRangeFromFileSpan(diagnostic.file.repoPath, diagnostic.span);
}

function sourceRangeForQuickInfo(entry: TypeScriptQuickInfoEntry): SourceRange {
  return sourceRangeFromFileSpan(entry.file.repoPath, entry.span);
}

function sourceRangeForHighlight(
  highlight: TypeScriptHighlightEntry,
): SourceRange {
  return sourceRangeFromFileSpan(highlight.file.repoPath, highlight.span);
}

function sourceRangeForRenameLocation(
  location: TypeScriptRenameLocationEntry,
): SourceRange {
  return sourceRangeFromFileSpan(location.file.repoPath, location.span);
}

function sourceRangeForFileEdits(
  edits: TypeScriptFileEdits,
): SourceRange | null {
  const first = edits.edits.find((edit) => edit.span !== undefined);
  return first?.span === undefined
    ? null
    : sourceRangeFromFileSpan(edits.file.repoPath, first.span);
}

function sourceRangeFromFileSpan(
  filePath: string,
  span: {
    readonly startLine: number;
    readonly startCharacter: number;
    readonly endLine: number;
    readonly endCharacter: number;
  },
): SourceRange {
  return {
    filePath,
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

function evidenceForTarget(
  target: SourceTargetRow,
  kind: EvidenceKind,
): Evidence {
  const source = sourceRangeForTarget(target);
  return {
    id: target.id,
    kind,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: target.label,
    ...(source === null ? {} : { source }),
    handle: handleForTarget(target, kind),
    data: target,
  };
}

function evidenceForReference(reference: TypeScriptReferenceEntry): Evidence {
  const source = sourceRangeForReference(reference);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: reference.id,
    label: reference.text,
    summary: reference.definition
      ? "definition"
      : reference.writeAccess
      ? "write-reference"
      : "reference",
    filePath: reference.file.repoPath,
  };
  return {
    id: reference.id,
    kind: EvidenceKind.SourceSpan,
    role: reference.definition ? EvidenceRole.Subject : EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `${reference.definition ? "definition" : "reference"} ${
      reference.text
    }`,
    source,
    handle,
    data: reference,
  };
}

function evidenceForModuleEdge(edge: TypeScriptModuleEdge): Evidence {
  const source = sourceRangeForModuleEdge(edge);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: edge.id,
    label: edge.specifier,
    summary: edge.kind,
    filePath: edge.sourceFile.repoPath,
  };
  return {
    id: edge.id,
    kind: EvidenceKind.SourceSpan,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${edge.kind} ${edge.specifier}`,
    source,
    handle,
    data: edge,
  };
}

function evidenceForDocumentSymbol(
  symbol: TypeScriptDocumentSymbolEntry,
): Evidence {
  const source = sourceRangeForDocumentSymbol(symbol);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: symbol.id,
    label: symbol.name,
    summary: symbol.kind,
    filePath: symbol.file.repoPath,
  };
  return {
    id: symbol.id,
    kind: EvidenceKind.Symbol,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${symbol.kind} ${symbol.name}`,
    source,
    handle,
    data: symbol,
  };
}

function evidenceForExportSurfaceEntry(
  entry: TypeScriptExportSurfaceEntry,
): Evidence {
  const firstTarget = entry.targets[0];
  const source =
    firstTarget === undefined ? null : sourceRangeForTarget(firstTarget);
  const handle: SymbolHandle = {
    namespace: HandleNamespace.Symbol,
    kind: HandleKind.Symbol,
    id: entry.id,
    label: entry.exportName,
    summary: "export",
    name: entry.exportName,
    filePath: entry.surfaceFile.repoPath,
  };
  return {
    id: entry.id,
    kind: EvidenceKind.Symbol,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `export ${entry.exportName}`,
    ...(source === null ? {} : { source }),
    handle,
    data: entry,
  };
}

function evidenceForNavigation(entry: TypeScriptNavigationEntry): Evidence {
  const source = sourceRangeForNavigation(entry);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: entry.id,
    label: entry.name ?? entry.display ?? entry.kind,
    summary: entry.kind,
    filePath: entry.file.repoPath,
  };
  return {
    id: entry.id,
    kind: EvidenceKind.SourceSpan,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${entry.kind} ${
      entry.name ?? entry.display ?? entry.file.repoPath
    }`,
    source,
    handle,
    data: entry,
  };
}

function evidenceForCallHierarchyEdge(
  edge: TypeScriptCallHierarchyEdge,
): Evidence {
  const source = sourceRangeForCallHierarchyEdge(edge);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: edge.id,
    label: `${edge.from.name} -> ${edge.to.name}`,
    summary: edge.direction,
    filePath: edge.from.file.repoPath,
  };
  return {
    id: edge.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${edge.direction} call ${edge.from.name} -> ${edge.to.name}`,
    ...(source === null ? {} : { source }),
    handle,
    data: edge,
  };
}

function evidenceForCallSite(callSite: TypeScriptCallSiteEntry): Evidence {
  const source = sourceRangeForCallSite(callSite);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: callSite.id,
    label: callSite.calleeName,
    summary: `${callSite.kind}(${callSite.argumentCount})`,
    filePath: callSite.file.repoPath,
  };
  return {
    id: callSite.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${callSite.kind} ${callSite.calleeName} with ${callSite.argumentCount} argument(s)`,
    source,
    handle,
    data: callSite,
  };
}

function evidenceForDiagnostic(
  diagnostic: TypeScriptDiagnosticEntry,
): Evidence {
  const source = sourceRangeForDiagnostic(diagnostic);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: diagnostic.id,
    label: `${diagnostic.category} ${diagnostic.code}`,
    summary: diagnostic.message,
    filePath: diagnostic.file?.repoPath ?? "",
  };
  return {
    id: diagnostic.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Diagnostic,
    confidence: EvidenceConfidence.Exact,
    summary: `${diagnostic.category} TS${diagnostic.code}: ${diagnostic.message}`,
    ...(source === null ? {} : { source }),
    handle,
    data: diagnostic,
  };
}

function evidenceForQuickInfo(entry: TypeScriptQuickInfoEntry): Evidence {
  const source = sourceRangeForQuickInfo(entry);
  const handle: SymbolHandle = {
    namespace: HandleNamespace.TypeScript,
    kind: HandleKind.TypeFact,
    id: entry.id,
    label: entry.display ?? entry.kind,
    summary: "quick-info",
    name: entry.display ?? entry.kind,
    filePath: entry.file.repoPath,
  };
  return {
    id: entry.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: entry.display ?? entry.kind,
    source,
    handle,
    data: entry,
  };
}

function evidenceForSignatureHelp(
  entry: TypeScriptSignatureHelpEntry,
): Evidence {
  const source = sourceRangeForTarget(entry.target);
  const handle: SymbolHandle = {
    namespace: HandleNamespace.TypeScript,
    kind: HandleKind.TypeFact,
    id: entry.id,
    label: entry.display,
    summary: "signature-help",
    name: entry.display,
    ...(entry.target.file === undefined
      ? {}
      : { filePath: entry.target.file.repoPath }),
  };
  return {
    id: entry.id,
    kind: EvidenceKind.TypeFact,
    role: entry.selected ? EvidenceRole.Subject : EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: entry.display,
    ...(source === null ? {} : { source }),
    handle,
    data: entry,
  };
}

function evidenceForHighlight(highlight: TypeScriptHighlightEntry): Evidence {
  const source = sourceRangeForHighlight(highlight);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: highlight.id,
    label: highlight.kind,
    summary: "document-highlight",
    filePath: highlight.file.repoPath,
  };
  return {
    id: highlight.id,
    kind: EvidenceKind.SourceSpan,
    role:
      highlight.kind === "definition"
        ? EvidenceRole.Subject
        : EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `highlight ${highlight.kind}`,
    source,
    handle,
    data: highlight,
  };
}

function evidenceForRenameLocation(
  location: TypeScriptRenameLocationEntry,
): Evidence {
  const source = sourceRangeForRenameLocation(location);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceRange,
    id: location.id,
    label: location.text,
    summary: "rename-location",
    filePath: location.file.repoPath,
  };
  return {
    id: location.id,
    kind: EvidenceKind.SourceSpan,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `rename location ${location.text}`,
    source,
    handle,
    data: location,
  };
}

function evidenceForRefactorAction(
  action: TypeScriptRefactorActionRow,
): Evidence {
  const handle: SymbolHandle = {
    namespace: HandleNamespace.TypeScript,
    kind: HandleKind.TypeFact,
    id: `refactor:${action.refactorName}:${action.actionName}`,
    label: action.actionDescription,
    summary: action.refactorDescription,
    name: action.actionName,
  };
  return {
    id: handle.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `${action.refactorDescription}: ${action.actionDescription}`,
    handle,
    data: action,
  };
}

function evidenceForCodeFixAction(
  action: TypeScriptCodeFixActionRow,
): Evidence {
  const source = sourceRangeForDiagnostic(action.diagnostic);
  const handle: SymbolHandle = {
    namespace: HandleNamespace.TypeScript,
    kind: HandleKind.TypeFact,
    id: action.id,
    label: action.description,
    summary: action.fixName,
    name: action.fixName,
    ...(action.diagnostic.file === undefined
      ? {}
      : { filePath: action.diagnostic.file.repoPath }),
  };
  return {
    id: action.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `${action.fixName}: ${action.description}`,
    ...(source === null ? {} : { source }),
    handle,
    data: action,
  };
}

function evidenceForFileEdits(edits: TypeScriptFileEdits): Evidence {
  const source = sourceRangeForFileEdits(edits);
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind: HandleKind.SourceFile,
    id: `file-edits:${edits.file.repoPath}`,
    label: edits.file.repoPath,
    summary: `${edits.edits.length} edit(s)`,
    filePath: edits.file.repoPath,
  };
  return {
    id: handle.id,
    kind: EvidenceKind.SourceSpan,
    role: EvidenceRole.Support,
    confidence: EvidenceConfidence.Exact,
    summary: `${edits.file.repoPath}: ${edits.edits.length} edit(s)`,
    ...(source === null ? {} : { source }),
    handle,
    data: edits,
  };
}

function handleForTarget(
  target: SourceTargetRow,
  kind: EvidenceKind,
): InquiryHandle {
  if (kind === EvidenceKind.TypeFact) {
    const handle: SymbolHandle = {
      namespace: HandleNamespace.TypeScript,
      kind: HandleKind.TypeFact,
      id: target.id,
      label: target.label,
      summary: target.declarationKind,
      name: target.label,
      ...(target.file === undefined ? {} : { filePath: target.file.repoPath }),
    };
    return handle;
  }
  if (
    target.kind === SourceTargetKind.Declaration ||
    target.kind === SourceTargetKind.Symbol ||
    kind === EvidenceKind.Symbol
  ) {
    const handle: SymbolHandle = {
      namespace: HandleNamespace.Symbol,
      kind: HandleKind.Symbol,
      id: target.id,
      label: target.label,
      summary: target.declarationKind,
      name: target.label,
      ...(target.file === undefined ? {} : { filePath: target.file.repoPath }),
    };
    return handle;
  }
  const handle: SourceHandle = {
    namespace: HandleNamespace.Source,
    kind:
      target.kind === SourceTargetKind.SourceFile
        ? HandleKind.SourceFile
        : HandleKind.SourceRange,
    id: target.id,
    label: target.label,
    summary: target.declarationKind,
    filePath: target.file?.repoPath ?? "",
  };
  return handle;
}

function stringFilter(
  filters: Record<string, unknown> | undefined,
  key: string,
): { readonly [key: string]: string } {
  const value = filters?.[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function sourceTextBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.SourceText,
    closure: BasisClosure.Exact,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from source files admitted into the hot Atlas SourceProject.",
    identity: sourceProject.snapshot().identity,
  };
}
function programBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from the current TypeScript Program held by the Atlas daemon.",
    identity: sourceProject.snapshot().identity,
  };
}

function checkerBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from the current TypeScript TypeChecker held by the Atlas daemon.",
    identity: sourceProject.snapshot().identity,
  };
}
