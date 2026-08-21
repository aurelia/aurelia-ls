/**
 * Type mapping utilities: semantic-runtime types -> LSP types
 *
 * This is the Boundary 5 conversion layer. All workspace types are
 * converted to LSP wire format here.
 */
import {
  CodeActionKind,
  CompletionItemKind,
  CompletionItemTag,
  DiagnosticSeverity,
  LSPErrorCodes,
  ResponseError,
  type CodeAction,
  type CompletionItem,
  type CompletionList,
  type Hover,
  type Location,
  type LocationLink,
  type WorkspaceEdit,
  type Diagnostic,
  type DiagnosticRelatedInformation,
  type Range,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticAppDiagnosticRow,
  SemanticAppDiagnosticsResult,
  SemanticDiagnosticPresentationRelation,
  SemanticDiagnosticRelatedInformation,
  SemanticRuntimeAnswer,
  SemanticProjectConfigurationDiagnosticsResult,
  SemanticSourceReference,
  SemanticTemplateCompletionCandidateRow,
  SemanticTemplateCompletionResult,
  SemanticTemplateCodeActionsResult,
  SemanticTemplateCursorInfoResult,
  SemanticTemplateDiagnosticRow,
  SemanticTemplateReferencesResult,
  SemanticTemplateRenameResult,
} from "@aurelia-ls/semantic-runtime";
import {
  CHECKER_CALL_SIGNATURE_MAX_CODE_POINTS,
  CHECKER_MEMBER_DEPRECATION_REASON_MAX_CODE_POINTS,
  CHECKER_MEMBER_DEPRECATION_REASON_MAX_LINES,
  CHECKER_MEMBER_DOCUMENTATION_MAX_CODE_POINTS,
  CHECKER_MEMBER_DOCUMENTATION_MAX_LINES,
  CHECKER_MEMBER_TEXT_MAX_SOURCES,
  canonicalTypeSystemPath,
  diagnosticRepairAffordanceForSuggestion,
  frameworkRegistrationCapabilityFromString,
  isAureliaExpressionIdentifierName,
  isCheckerCallTextSafe,
  isSemanticSourceReference,
  runtimeAsElementResourceName,
  runtimeAttributeName,
  runtimeElementResourceName,
  semanticExactSourceReference,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
} from "@aurelia-ls/semantic-runtime";
import type { DocumentUri, WorkspaceDocumentUris } from "../utils/document-uri.js";
import { languageIdForSource } from "../utils/document-kind.js";
import {
  AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA,
  AureliaProtocolCommand,
  templateCodeActionResolveRefusalFromValue,
  type FrameworkCapabilityExplanationParams,
  type TemplateCodeActionResolveRefusal,
  type TemplateCodeActionResolveData,
} from "../protocol.js";
import { stableDigest } from "../utils/stable-digest.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferencePath,
  semanticSourceReferenceUri,
} from "./source-locations.js";
import {
  renderHoverCard,
  type HoverCard,
  type HoverCardContextLine,
  type HoverCardStatus,
} from "./hover-card.js";
import type { SemanticRuntimeLspDocumentSnapshot } from "../runtime/semantic-runtime-session.js";

export type LookupTextFn = (uri: DocumentUri) => string | null;
export type LookupDocumentSnapshotFn = (
  uri: DocumentUri,
) => SemanticRuntimeLspDocumentSnapshot | null;

export interface SemanticRuntimeAppDiagnosticMappingOptions {
  /** The client publishes ordinary TypeScript Program diagnostics through its native provider. */
  readonly clientOwnsTypeScriptProgramDiagnostics?: boolean;
}

/** Whether an LSP `CodeActionContext.only` filter contains the candidate kind. */
export function codeActionKindMatchesOnly(
  kind: CodeActionKind,
  only: readonly CodeActionKind[] | undefined,
): boolean {
  if (only == null) return true;
  return only.some((requested) =>
    requested === CodeActionKind.Empty
    || requested === kind
    || kind.startsWith(`${requested}.`)
  );
}

/** Best-effort read projection plus every source-backed row the adapter could not represent. */
export interface SemanticRuntimeReadMapping<TValue> {
  readonly value: TValue;
  readonly failures: readonly string[];
}

/** Map native Aurelia project-configuration issues only when their exact source spans match this document. */
export function mapSemanticProjectConfigurationDiagnostics(
  answer: SemanticRuntimeAnswer<SemanticProjectConfigurationDiagnosticsResult>,
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
): SemanticRuntimeReadMapping<Diagnostic[]> {
  const value: Diagnostic[] = [];
  const failures: string[] = [];
  const documentLength = document.getText().length;
  const documentHostPath = documentUris.hostPath(document.uri);

  for (const row of answer.value.rows) {
    if (documentHostPath == null) {
      failures.push(
        `Project configuration diagnostic ${row.diagnosticKind} cannot project the current document URI ${document.uri} into the workspace host.`,
      );
      continue;
    }
    if (
      canonicalTypeSystemPath(row.source.filePath)
      !== canonicalTypeSystemPath(documentHostPath)
    ) {
      failures.push(
        `Project configuration diagnostic ${row.diagnosticKind} targets ${row.source.filePath}, not the current document.`,
      );
      continue;
    }
    if (
      !Number.isInteger(row.source.start)
      || !Number.isInteger(row.source.end)
      || row.source.start < 0
      || row.source.end < row.source.start
      || row.source.end > documentLength
    ) {
      failures.push(
        `Project configuration diagnostic ${row.diagnosticKind} has invalid source offsets `
        + `${row.source.start}..${row.source.end} for a ${documentLength}-character document.`,
      );
      continue;
    }

    value.push({
      range: {
        start: document.positionAt(row.source.start),
        end: document.positionAt(row.source.end),
      },
      message: row.message,
      severity: semanticRuntimeSeverityToLsp(row.severity),
      code: row.diagnosticKind,
      source: "aurelia",
      data: {
        semanticRuntime: {
          queryKind: "project-configuration-diagnostics",
          projectKey: row.projectKey,
          diagnosticKind: row.diagnosticKind,
          severity: row.severity,
          message: row.message,
          source: row.source,
        },
      },
    });
  }

  return { value, failures };
}

// ============================================================================
// Severity Mapping — preserve the semantic runtime's authored severity.
// ============================================================================

function semanticRuntimeSeverityToLsp(
  severity: SemanticAppDiagnosticRow["severity"],
): DiagnosticSeverity {
  switch (severity) {
    case "error": return DiagnosticSeverity.Error;
    case "warning": return DiagnosticSeverity.Warning;
    case "information": return DiagnosticSeverity.Information;
  }
}

export function mapSemanticRuntimeAppDiagnostics(
  answer: SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>,
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
  lookupText: LookupTextFn | null = null,
  options: SemanticRuntimeAppDiagnosticMappingOptions = {},
): SemanticRuntimeReadMapping<Diagnostic[]> {
  const mapped: Diagnostic[] = [];
  const failures: string[] = [];
  const presentation = answer.value.presentation;
  if (presentation == null || presentation.complete !== true) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      presentation == null
        ? "Aurelia Problems mapping requires a semantic diagnostic presentation."
        : "Aurelia Problems mapping requires a complete semantic diagnostic presentation.",
    );
  }
  const rows = answer.value.rows;
  const presentationFailures = semanticDiagnosticPresentationFailures(presentation, rows);
  if (presentationFailures.length > 0) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Aurelia Problems mapping rejected an invalid diagnostic presentation: ${presentationFailures.join(" ")}`,
    );
  }
  for (const group of presentation.groups) {
    const primaryRow = rows[group.primary.rowIndex]!;
    if (
      options.clientOwnsTypeScriptProgramDiagnostics === true
      && isTypeScriptProgramDiagnostic(primaryRow)
    ) {
      continue;
    }
    const relatedInformation: DiagnosticRelatedInformation[] = [];
    const contextual: DetachedSemanticDiagnosticPresentationContext[] = [];
    for (const related of group.related) {
      const row = rows[related.rowIndex]!;
      const relatedMapping = semanticRuntimeDiagnosticRelatedInformation(row, document, documentUris, lookupText);
      relatedInformation.push(...relatedMapping.value);
      failures.push(...relatedMapping.failures);
      contextual.push({
        relation: related.relation!,
        diagnostic: semanticRuntimeDetachedDiagnosticData(row),
      });
    }
    const diagnosticMapping = semanticRuntimeDiagnostic(
      primaryRow,
      document,
      documentUris,
      lookupText,
      relatedInformation,
      group.primarySeverity,
      {
        rawRowCount: group.rawRowCount,
        primarySeverity: group.primarySeverity,
        maxRawSeverity: group.maxRawSeverity,
        contextual,
      },
    );
    failures.push(...diagnosticMapping.failures);
    if (diagnosticMapping.value != null) {
      mapped.push(diagnosticMapping.value);
    } else {
      failures.push(
        `Diagnostic ${primaryRow.source?.label ?? primaryRow.diagnosticKind} has no range valid for the current document.`,
      );
    }
  }
  return { value: mapped, failures };
}

function isTypeScriptProgramDiagnostic(row: SemanticAppDiagnosticRow): boolean {
  return row.diagnosticDomain === "typescript"
    && row.diagnosticAuthority === "typescript"
    && row.relatedQueryKind === "typescript-diagnostics";
}

interface DetachedSemanticDiagnosticPresentationContext {
  readonly relation: SemanticDiagnosticPresentationRelation;
  readonly diagnostic: Record<string, unknown>;
}

interface DetachedSemanticDiagnosticPresentation {
  readonly rawRowCount: number;
  readonly primarySeverity: SemanticAppDiagnosticRow["severity"];
  readonly maxRawSeverity: SemanticAppDiagnosticRow["severity"];
  readonly contextual: readonly DetachedSemanticDiagnosticPresentationContext[];
}

const semanticDiagnosticSeverityRank: Readonly<Record<SemanticAppDiagnosticRow["severity"], number>> = {
  error: 3,
  warning: 2,
  information: 1,
};

function semanticDiagnosticPresentationFailures(
  presentation: NonNullable<SemanticAppDiagnosticsResult["presentation"]>,
  rows: readonly SemanticAppDiagnosticRow[],
): string[] {
  const failures: string[] = [];
  const claimed = new Set<number>();
  const claim = (rowIndex: number, label: string): void => {
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= rows.length) {
      failures.push(`${label} references out-of-range row ${rowIndex}.`);
    } else if (claimed.has(rowIndex)) {
      failures.push(`${label} reuses row ${rowIndex}.`);
    } else {
      claimed.add(rowIndex);
    }
  };
  if (presentation.rawRowCount !== rows.length) {
    failures.push(`rawRowCount ${presentation.rawRowCount} does not match ${rows.length} rows.`);
  }
  if (presentation.primaryCount !== presentation.groups.length) {
    failures.push(`primaryCount ${presentation.primaryCount} does not match ${presentation.groups.length} groups.`);
  }
  const contextualCount = presentation.groups.reduce((count, group) => count + group.related.length, 0);
  if (presentation.contextualCount !== contextualCount) {
    failures.push(`contextualCount ${presentation.contextualCount} does not match ${contextualCount} related rows.`);
  }
  if (presentation.withheldCount !== presentation.withheld.length) {
    failures.push(`withheldCount ${presentation.withheldCount} does not match ${presentation.withheld.length} rows.`);
  }
  for (const group of presentation.groups) {
    claim(group.primary.rowIndex, "Diagnostic primary");
    const primary = rows[group.primary.rowIndex];
    if (group.primary.role !== "primary" || group.primary.relation !== null) {
      failures.push("Diagnostic group primary has an invalid presentation role or relation.");
    }
    if (group.rawRowCount !== 1 + group.related.length) {
      failures.push(`Diagnostic group rawRowCount ${group.rawRowCount} is inconsistent.`);
    }
    if (primary != null && group.primarySeverity !== primary.severity) {
      failures.push("Diagnostic group primarySeverity does not match its primary row.");
    }
    const groupRows = [primary, ...group.related.map((related) => rows[related.rowIndex])]
      .filter((row): row is SemanticAppDiagnosticRow => row != null);
    if (groupRows.length === group.rawRowCount) {
      const expectedMaxSeverity = groupRows.reduce((maximum, row) =>
        semanticDiagnosticSeverityRank[row.severity] > semanticDiagnosticSeverityRank[maximum]
          ? row.severity
          : maximum
      , "information" as SemanticAppDiagnosticRow["severity"]);
      if (group.maxRawSeverity !== expectedMaxSeverity) {
        failures.push("Diagnostic group maxRawSeverity does not match its raw rows.");
      }
    }
    for (const related of group.related) {
      claim(related.rowIndex, "Contextual diagnostic");
      if (related.role !== "contextual" || related.relation == null) {
        failures.push("Contextual diagnostic has an invalid presentation role or relation.");
      }
    }
  }
  for (const withheld of presentation.withheld) {
    claim(withheld.rowIndex, "Withheld diagnostic");
    if (withheld.reason !== "context-only-weak-owner") {
      failures.push("Withheld diagnostic has an invalid presentation reason.");
    }
  }
  if (claimed.size !== rows.length) {
    failures.push(`Diagnostic presentation accounts for ${claimed.size} of ${rows.length} rows.`);
  }
  return failures;
}

function semanticRuntimeDiagnostic(
  row: SemanticAppDiagnosticRow | null,
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
  lookupText: LookupTextFn | null,
  relatedInformation: DiagnosticRelatedInformation[],
  presentedSeverity: SemanticAppDiagnosticRow["severity"],
  presentation: DetachedSemanticDiagnosticPresentation,
): SemanticRuntimeReadMapping<Diagnostic | null> {
  if (row == null) return { value: null, failures: [] };
  const range = semanticRuntimeDiagnosticRange(row.source, document, documentUris);
  if (range == null) return { value: null, failures: [] };
  const rowRelatedInformation: DiagnosticRelatedInformation[] = [];
  const failures: string[] = [];
  for (const related of row.relatedInformation) {
    const mapping = semanticRuntimeDiagnosticRelatedSourceInformation(
      related,
      document,
      documentUris,
      lookupText,
    );
    rowRelatedInformation.push(...mapping.value);
    failures.push(...mapping.failures);
  }
  const allRelatedInformation = uniqueDiagnosticRelatedInformation([
    ...rowRelatedInformation,
    ...relatedInformation,
  ]);
  return {
    value: {
      range,
      message: row.summary,
      severity: semanticRuntimeSeverityToLsp(presentedSeverity),
      code: semanticRuntimeDiagnosticCode(row),
      source: row.diagnosticDomain === "typescript" ? "typescript" : "aurelia",
      data: semanticRuntimeDiagnosticData(row, presentation),
      ...(allRelatedInformation.length === 0 ? {} : { relatedInformation: allRelatedInformation }),
    },
    failures,
  };
}

function uniqueDiagnosticRelatedInformation(
  rows: readonly DiagnosticRelatedInformation[],
): DiagnosticRelatedInformation[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = JSON.stringify([
      row.location.uri,
      row.location.range.start.line,
      row.location.range.start.character,
      row.location.range.end.line,
      row.location.range.end.character,
      row.message,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function semanticRuntimeDiagnosticCode(row: SemanticAppDiagnosticRow): string {
  return row.frameworkErrorCode
    ?? (row.typeScriptDiagnosticCode == null ? null : `TS${row.typeScriptDiagnosticCode}`)
    ?? row.diagnosticKind;
}

function semanticRuntimeDiagnosticRelatedInformation(
  row: SemanticAppDiagnosticRow | null,
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
  lookupText: LookupTextFn | null,
): SemanticRuntimeReadMapping<DiagnosticRelatedInformation[]> {
  if (row == null) return { value: [], failures: [] };
  const direct = semanticRuntimeRelatedInformationForSource(
    row.source,
    row.summary,
    document,
    documentUris,
    lookupText,
  );
  const value = [...direct.value];
  const failures = [...direct.failures];
  for (const related of row.relatedInformation) {
    const nested = semanticRuntimeDiagnosticRelatedSourceInformation(
      related,
      document,
      documentUris,
      lookupText,
    );
    value.push(...nested.value);
    failures.push(...nested.failures);
  }
  return { value, failures };
}

function semanticRuntimeDiagnosticRelatedSourceInformation(
  related: SemanticDiagnosticRelatedInformation,
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
  lookupText: LookupTextFn | null,
): SemanticRuntimeReadMapping<DiagnosticRelatedInformation[]> {
  return semanticRuntimeRelatedInformationForSource(
    related.source,
    related.message,
    document,
    documentUris,
    lookupText,
  );
}

function semanticRuntimeRelatedInformationForSource(
  source: SemanticSourceReference | null,
  message: string,
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
  lookupText: LookupTextFn | null,
): SemanticRuntimeReadMapping<DiagnosticRelatedInformation[]> {
  const exact = semanticExactSourceReference(source);
  if (source == null) return { value: [], failures: [] };
  const locatedSource = exact ?? source;
  const uri = semanticSourceReferenceUri(locatedSource, documentUris);
  if (uri == null) {
    return {
      value: [],
      failures: [`Related diagnostic evidence ${source.label} cannot be resolved to a workspace document.`],
    };
  }
  const canonical = documentUris.resolve(uri).uri;
  const originCanonical = documentUris.resolve(document.uri).uri;
  if (exact == null) {
    return {
      value: [{
        location: {
          uri: canonical,
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        },
        message,
      }],
      failures: [],
    };
  }
  const text = canonical === originCanonical ? document.getText() : lookupText?.(canonical);
  if (text == null) {
    return {
      value: [],
      failures: [`Related diagnostic evidence ${source.label} targets a document with no readable text.`],
    };
  }
  const targetDocument = canonical === originCanonical
    ? document
    : TextDocument.create(canonical, languageIdForSource(canonical), 0, text);
  const range = semanticSourceRangeForDocument(exact, targetDocument);
  if (range == null) {
    return {
      value: [],
      failures: [`Related diagnostic evidence ${source.label} has a span outside the current document text.`],
    };
  }
  return {
    value: [{ location: { uri: canonical, range }, message }],
    failures: [],
  };
}

function semanticRuntimeDiagnosticRange(
  source: SemanticSourceReference | null,
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
): Range | null {
  if (source == null) return null;
  const sourceUri = semanticSourceReferenceUri(source, documentUris);
  if (sourceUri == null || !documentUris.sameDocument(sourceUri, document.uri)) {
    return null;
  }
  const exact = semanticExactSourceReference(source);
  if (exact?.start != null && exact.end != null) {
    return semanticSourceRangeForDocument(exact, document);
  }
  return {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 0 },
  };
}

export function semanticRuntimeDiagnosticData(
  row: SemanticAppDiagnosticRow,
  presentation: DetachedSemanticDiagnosticPresentation | null = null,
): Record<string, unknown> {
  return {
    semanticRuntime: {
      ...semanticRuntimeDetachedDiagnosticData(row),
      ...(presentation == null ? {} : { presentation }),
    },
  };
}

function semanticRuntimeDetachedDiagnosticData(row: SemanticAppDiagnosticRow): Record<string, unknown> {
  return {
    queryKind: "app-diagnostics",
    projectKey: row.projectKey,
    diagnosticDomain: row.diagnosticDomain,
    phase: row.phase,
    diagnosticKind: row.diagnosticKind,
    diagnosticAuthority: row.diagnosticAuthority,
    ...(row.typeScriptDiagnosticCode == null
      ? {}
      : { typeScriptDiagnosticCode: row.typeScriptDiagnosticCode }),
    frameworkErrorCode: row.frameworkErrorCode,
    frameworkRawErrorAuthority: row.frameworkRawErrorAuthority,
    severity: row.severity,
    summary: row.summary,
    missingInput: row.missingInput,
    missingInputs: row.missingInputs,
    source: row.source,
    subject: row.subject,
    relatedInformation: row.relatedInformation,
    suggestion: row.suggestion,
    sourceRole: row.sourceRole,
    relatedQueryKind: row.relatedQueryKind,
    repairAffordance: diagnosticRepairAffordanceForSuggestion(row.suggestion),
  };
}

// ============================================================================
// Completions Mapping
// ============================================================================

const COMPLETION_KIND_BY_SEMANTIC_RUNTIME_CANDIDATE = {
  "binding-context-slot": CompletionItemKind.Property,
  "override-context-slot": CompletionItemKind.Variable,
  "scope-keyword": CompletionItemKind.Keyword,
  "custom-element": CompletionItemKind.Class,
  "custom-attribute": CompletionItemKind.Property,
  "template-controller": CompletionItemKind.Struct,
  "bindable-attribute": CompletionItemKind.Field,
  "attribute-value": CompletionItemKind.Value,
  "router-route": CompletionItemKind.Reference,
  "router-route-parameter": CompletionItemKind.Property,
  "i18n-translation-key": CompletionItemKind.Value,
  "value-converter": CompletionItemKind.Function,
  "binding-behavior": CompletionItemKind.Function,
  "binding-command": CompletionItemKind.Keyword,
  "attribute-pattern": CompletionItemKind.Keyword,
  "type-member": CompletionItemKind.Property,
  "ref-target": CompletionItemKind.Reference,
  "event": CompletionItemKind.Event,
  "event-modifier": CompletionItemKind.Keyword,
  "bindable-mode": CompletionItemKind.EnumMember,
} satisfies Readonly<Record<
  SemanticTemplateCompletionCandidateRow["candidateKind"],
  CompletionItemKind
>>;

export function mapSemanticRuntimeTemplateCompletions(
  answer: SemanticRuntimeAnswer<SemanticTemplateCompletionResult>,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
  },
): SemanticRuntimeReadMapping<CompletionList | null> {
  if (answer.result !== SemanticRuntimeAnswerResult.Answered) {
    return {
      value: null,
      failures: [`Semantic runtime returned completion result=${answer.result}.`],
    };
  }

  const mappedItems: Array<{
    readonly candidate: SemanticTemplateCompletionCandidateRow;
    readonly item: CompletionItem;
    readonly inputOrdinal: number;
  }> = [];
  const failures: string[] = [];
  for (const [inputOrdinal, candidate] of answer.value.candidates.entries()) {
    const source = semanticExactSourceReference(candidate.edit.source);
    const sourceUri = source == null
      ? null
      : semanticSourceReferenceUri(source, options.documentUris);
    if (source == null) {
      failures.push(`Completion '${candidate.name}' has no exact authored edit span.`);
      continue;
    }
    if (sourceUri == null || !options.documentUris.sameDocument(sourceUri, options.originDocument.uri)) {
      failures.push(`Completion '${candidate.name}' does not edit the requesting document.`);
      continue;
    }
    const range = semanticSourceRangeForDocument(source, options.originDocument);
    if (range == null) {
      failures.push(`Completion '${candidate.name}' has an edit span outside the current document text.`);
      continue;
    }
    mappedItems.push({
      candidate,
      item: mapSemanticRuntimeTemplateCompletionCandidate(candidate, range),
      inputOrdinal,
    });
  }
  // LSP's isIncomplete flag asks the client to requery an intentionally narrowed list after further typing.
  // The session drains transport pages, and semantic coverage is an independent epistemic axis.
  if (failures.length > 0) {
    return { value: null, failures };
  }

  mappedItems.sort(compareSemanticRuntimeTemplateCompletionPresentation);
  const sortTextWidth = Math.max(4, String(Math.max(0, mappedItems.length - 1)).length);
  const items = mappedItems.map(({ item }, ordinal) => {
    item.sortText = String(ordinal).padStart(sortTextWidth, "0");
    return item;
  });
  return { value: { isIncomplete: false, items }, failures: [] };
}

function mapSemanticRuntimeTemplateCompletionCandidate(
  candidate: SemanticTemplateCompletionCandidateRow,
  range: Range,
): CompletionItem {
  const completion: CompletionItem = {
    label: candidate.name,
    kind: semanticRuntimeCompletionKind(candidate),
    textEdit: {
      range,
      newText: candidate.edit.newText,
    },
    data: {
      semanticRuntime: {
        candidateKind: candidate.candidateKind,
        sourceKind: candidate.sourceKind,
        memberKind: candidate.memberKind,
        aureliaHookKind: candidate.aureliaHookKind,
        memberIsDeprecated: candidate.memberIsDeprecated,
      },
    },
  };
  if (candidate.memberIsDeprecated === true) {
    completion.tags = [CompletionItemTag.Deprecated];
  }
  const detail = semanticRuntimeCompletionDetail(candidate);
  if (detail != null) {
    completion.detail = detail;
  }
  if (candidate.summary != null || candidate.typeDisplay != null) {
    completion.documentation = [
      candidate.summary,
      candidate.typeDisplay == null ? null : `Type: \`${candidate.typeDisplay}\``,
    ].filter((part): part is string => part != null && part.length > 0).join("\n\n");
  }
  return completion;
}

function compareSemanticRuntimeTemplateCompletionPresentation(
  left: {
    readonly candidate: SemanticTemplateCompletionCandidateRow;
    readonly inputOrdinal: number;
  },
  right: {
    readonly candidate: SemanticTemplateCompletionCandidateRow;
    readonly inputOrdinal: number;
  },
): number {
  return Number(left.candidate.memberIsDeprecated === true)
    - Number(right.candidate.memberIsDeprecated === true)
    || semanticRuntimeTemplateCompletionQualityRank(left.candidate)
      - semanticRuntimeTemplateCompletionQualityRank(right.candidate)
    || compareOrdinalText(left.candidate.name, right.candidate.name)
    || compareOrdinalText(left.candidate.candidateKind, right.candidate.candidateKind)
    || compareOrdinalText(left.candidate.edit.newText, right.candidate.edit.newText)
    || left.inputOrdinal - right.inputOrdinal;
}

function semanticRuntimeTemplateCompletionQualityRank(
  candidate: SemanticTemplateCompletionCandidateRow,
): number {
  if (candidate.memberVisibility === "private") return 3;
  if (candidate.memberVisibility === "protected") return 2;
  if (candidate.aureliaHookKind != null) return 1;
  return 0;
}

function compareOrdinalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function semanticRuntimeCompletionKind(
  candidate: SemanticTemplateCompletionCandidateRow,
): CompletionItemKind {
  if (candidate.memberKind === "method") {
    return CompletionItemKind.Method;
  }
  if (candidate.memberKind === "accessor") {
    return CompletionItemKind.Property;
  }
  return COMPLETION_KIND_BY_SEMANTIC_RUNTIME_CANDIDATE[candidate.candidateKind];
}

function semanticRuntimeCompletionDetail(
  candidate: SemanticTemplateCompletionCandidateRow,
): string | null {
  const parts = [
    candidate.candidateKind,
    candidate.typeDisplay,
    candidate.memberVisibility,
    candidate.memberIsReadonly === true ? "readonly" : null,
  ];
  return parts.filter((part): part is string => part != null && part.length > 0).join(" | ") || null;
}

// ============================================================================
// Hover Mapping
// ============================================================================

export function mapSemanticRuntimeTemplateHover(
  answer: SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
  },
): SemanticRuntimeReadMapping<Hover | null> {
  if (answer.result !== SemanticRuntimeAnswerResult.Answered) {
    return {
      value: null,
      failures: [`Semantic runtime returned hover result=${answer.result}.`],
    };
  }
  if (answer.selection !== SemanticRuntimeAnswerSelection.Exact) {
    return {
      value: null,
      failures: [`Semantic runtime returned hover selection=${answer.selection}; exact selection is required.`],
    };
  }

  const value = answer.value;
  if (!semanticRuntimeHoverHasPotentialCard(value)) {
    return { value: null, failures: [] };
  }
  if (!semanticRuntimeHoverHtmlNamespaceIsValid(value.html.namespace)) {
    return { value: null, failures: ["Hover HTML namespace has an unsupported value."] };
  }

  const source = semanticExactSourceReference(value.activeSource);
  if (source == null) {
    return {
      value: null,
      failures: ["Hover active source has no exact authored span."],
    };
  }
  const sourceUri = semanticSourceReferenceUri(source, options.documentUris);
  if (sourceUri == null || !options.documentUris.sameDocument(sourceUri, options.originDocument.uri)) {
    return {
      value: null,
      failures: ["Hover active source does not target the requesting document."],
    };
  }
  const range = semanticSourceRangeForDocument(source, options.originDocument);
  if (range == null) {
    return {
      value: null,
      failures: ["Hover active source is outside the current document text."],
    };
  }
  const activeText = options.originDocument.getText(range);
  if (activeText.length === 0) {
    return {
      value: null,
      failures: ["Hover active source selects an empty authored span."],
    };
  }

  const cardMapping = semanticRuntimeHoverCard(
    value,
    source,
    activeText,
    options.documentUris,
    options.originDocument,
  );
  if (cardMapping.failures.length > 0) {
    return { value: null, failures: cardMapping.failures };
  }
  if (cardMapping.value == null) {
    return { value: null, failures: [] };
  }
  const content = renderHoverCard(cardMapping.value);
  if (content == null) {
    return {
      value: null,
      failures: ["Hover card could not preserve its mandatory labeled content within the product budget."],
    };
  }
  const effectiveRange = semanticRuntimeHoverEffectiveRange(
    value,
    cardMapping.value,
    range,
    options.originDocument,
  );
  if (effectiveRange == null) {
    return {
      value: null,
      failures: ["Hover presented diagnostic primary could not produce an exact display range."],
    };
  }

  return {
    value: {
      contents: { kind: "markdown", value: content },
      range: effectiveRange,
    },
    failures: [],
  };
}

function semanticRuntimeHoverEffectiveRange(
  value: SemanticTemplateCursorInfoResult,
  card: HoverCard,
  activeRange: Range,
  originDocument: TextDocument,
): Range | null {
  if (card.identity != null || card.status?.kind !== "diagnostic") return activeRange;
  const presentation = value.diagnosticPresentation;
  if (presentation?.kind !== "presented") return null;
  const primary = value.diagnostics[presentation.group.primary.rowIndex];
  return primary == null
    ? null
    : semanticSourceRangeForDocument(primary.source, originDocument);
}

type SemanticRuntimeHoverLocus =
  | "route-target"
  | "selected-bindable"
  | "selected-bindable-mode"
  | "selected-expression"
  | "selected-member"
  | "selected-resource";

interface SemanticRuntimeHoverSelection {
  readonly identity: NonNullable<HoverCard["identity"]>;
  readonly context: readonly HoverCardContextLine[];
  readonly locus: SemanticRuntimeHoverLocus;
}

function semanticRuntimeHoverHasPotentialCard(value: SemanticTemplateCursorInfoResult): boolean {
  return value.selectedMember != null
    || value.selectedExpression != null
    || value.selectedBindable != null
    || value.selectedRouteTarget != null
    || value.selectedDefinition != null
    || value.diagnosticPresentation != null
    || value.uncertainty != null;
}

function semanticRuntimeHoverHtmlNamespaceIsValid(namespace: unknown): boolean {
  return namespace == null
    || namespace === "html"
    || namespace === "svg"
    || namespace === "math"
    || namespace === "unknown";
}

function semanticRuntimeHoverHtmlNamespace(
  value: SemanticTemplateCursorInfoResult,
): Exclude<SemanticTemplateCursorInfoResult["html"]["namespace"], null> | undefined {
  return semanticRuntimeHoverHtmlNamespaceIsValid(value.html.namespace)
    ? value.html.namespace ?? undefined
    : undefined;
}

function semanticRuntimeHoverCard(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): SemanticRuntimeReadMapping<HoverCard | null> {
  const selection = semanticRuntimeHoverSelection(
    value,
    activeSource,
    activeText,
    documentUris,
    originDocument,
  );
  if (selection.failures.length > 0) return { value: null, failures: selection.failures };

  const status = semanticRuntimeHoverStatus(
    value,
    selection.value?.locus ?? null,
    activeSource,
    documentUris,
    originDocument,
  );
  if (status.failures.length > 0) return { value: null, failures: status.failures };
  if (selection.value == null && status.value == null) return { value: null, failures: [] };
  return {
    value: {
      identity: selection.value?.identity ?? null,
      context: selection.value?.context ?? [],
      status: status.value,
    },
    failures: [],
  };
}

function semanticRuntimeHoverSelection(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): SemanticRuntimeReadMapping<SemanticRuntimeHoverSelection | null> {
  if (value.selectedExpression != null) {
    if (
      value.selectedMember != null
      || value.selectedMemberName != null
      || value.memberOwnerType != null
    ) {
      return { value: null, failures: ["Hover cannot select both a member and a binding-context qualifier."] };
    }
    const expressionSource = semanticExactSourceReference(value.selectedExpression.source);
    if (expressionSource == null) {
      return { value: null, failures: ["Hover selected expression source has no exact authored span."] };
    }
    const expressionSourceUri = semanticSourceReferenceUri(expressionSource, documentUris);
    const activeSourceUri = semanticSourceReferenceUri(activeSource, documentUris);
    if (
      expressionSourceUri == null
      || activeSourceUri == null
      || !documentUris.sameDocument(expressionSourceUri, activeSourceUri)
    ) {
      return {
        value: null,
        failures: ["Hover selected expression source does not target the requesting document."],
      };
    }
    if (!sameExactSourceReference(activeSource, expressionSource, documentUris)) {
      return {
        value: null,
        failures: ["Hover selected expression source does not match the active authored range."],
      };
    }
    const authoredScopeAncestor = value.selectedExpression.authoredScopeAncestor;
    const scopeLookupAncestor = value.selectedExpression.scopeLookupAncestor;
    if (
      value.selectedExpression.expressionKind !== "AccessThis"
      || !Number.isSafeInteger(authoredScopeAncestor)
      || authoredScopeAncestor < 0
      || !Number.isSafeInteger(scopeLookupAncestor)
      || scopeLookupAncestor < 0
      || scopeLookupAncestor < authoredScopeAncestor
    ) {
      return {
        value: null,
        failures: ["Hover selected expression has unsupported binding-context ancestry."],
      };
    }
    const expectedAuthoredToken = authoredScopeAncestor === 0 ? "$this" : "$parent";
    if (activeText !== expectedAuthoredToken) {
      return {
        value: null,
        failures: ["Hover selected expression does not match its exact authored binding-context token."],
      };
    }
    if (
      value.selectedExpression.openKind === "missing-ancestor"
      && (authoredScopeAncestor === 0 || value.selectedExpression.typeDisplay != null)
    ) {
      return {
        value: null,
        failures: ["Hover selected expression has incoherent missing-ancestor evidence."],
      };
    }
    if (
      value.selectedExpression.typeDisplay == null
      && !semanticRuntimeUncertaintyMatchesLocus(value, "selected-expression")
    ) {
      return {
        value: null,
        failures: ["Hover selected expression has neither a type nor typed binding-context uncertainty."],
      };
    }
    return {
      value: {
        locus: "selected-expression",
        identity: {
          language: "ts",
          authored: activeText,
          typeDetail: value.selectedExpression.typeDisplay == null
            ? null
            : `: ${value.selectedExpression.typeDisplay}`,
        },
        context: [{ prefix: semanticRuntimeBindingContextLabel(authoredScopeAncestor) }],
      },
      failures: [],
    };
  }

  if (value.selectedBindable != null) {
    const declaration = semanticRuntimeBindableDeclarationHoverSelection(
      value,
      activeSource,
      activeText,
      documentUris,
    );
    if (declaration.failures.length > 0 || declaration.value != null) return declaration;
  }

  if (value.selectedMember != null) {
    const member = value.selectedMember;
    if (value.selectedMemberName != null && value.selectedMemberName !== member.name) {
      return { value: null, failures: ["Hover selected member names do not agree."] };
    }
    const ownsDeclarationToken = sameExactSourceReference(
      activeSource,
      member.source,
      documentUris,
    );
    if (activeText !== member.name && !ownsDeclarationToken) {
      return { value: null, failures: ["Hover selected member does not match the exact authored token."] };
    }
    const role = semanticRuntimeScopeRoleContext(member.scopeRole);
    if (member.scopeRole != null && role == null) {
      return { value: null, failures: ["Hover selected member has an unsupported scope role."] };
    }
    if (member.scopeRole == null && !isAureliaExpressionIdentifierName(member.name)) {
      return {
        value: null,
        failures: ["Hover selected checker member name is not authorable in an Aurelia expression."],
      };
    }
    const declarationPresentation = semanticRuntimeMemberHoverPresentation(member);
    if (declarationPresentation.failures.length > 0) {
      return { value: null, failures: declarationPresentation.failures };
    }
    if (
      member.typeDisplay == null
      && !semanticRuntimeUncertaintyMatchesLocus(value, "selected-member")
    ) {
      return {
        value: null,
        failures: ["Hover selected member has neither a type nor typed member uncertainty."],
      };
    }
    const baseSelection: SemanticRuntimeHoverSelection = {
      locus: "selected-member",
      identity: {
        language: "ts",
        prefix: `${declarationPresentation.value.visibilityPrefix}${member.isReadonly ? "readonly " : ""}`,
        authored: activeText,
        suffix: member.isOptional ? "?" : "",
        typeDetail: member.typeDisplay == null ? null : `: ${member.typeDisplay}`,
      },
      context: role == null
        ? declarationPresentation.value.context
        : [{ prefix: role }],
    };
    const selectedCall = semanticRuntimeSelectedCallHoverSelection(
      value,
      member,
      declarationPresentation.value.visibilityPrefix,
      activeSource,
      activeText,
      documentUris,
      originDocument,
    );
    // Call signatures are optional enrichment on an independently authenticated member card.
    // Open or stale call evidence must never erase the ordinary member identity.
    return selectedCall.failures.length > 0 || selectedCall.value == null
      ? { value: baseSelection, failures: [] }
      : selectedCall;
  }

  if (value.selectedRouteTarget != null) {
    return semanticRuntimeRouteHoverSelection(value, activeText);
  }

  if (
    value.selectedBindable?.usageModeLocus != null
    && value.selectedBindable.usagePresentationKind != null
    && value.selectedBindable.usagePresentationKind !== "bindable-attribute"
    && value.selectedBindable.usagePresentationKind !== "resource-primary"
  ) {
    return {
      value: null,
      failures: ["Hover selected bindable has an unsupported usage presentation kind."],
    };
  }
  // Resource-primary is optional context on an independently authenticated resource card.
  // A concurrent edit can retire that ownership, so withhold composition instead of failing the whole hover.
  if (
    value.selectedBindable != null
    && value.selectedBindable.usagePresentationKind === "bindable-attribute"
    && !semanticRuntimeResourceOwnsPrimaryBindableUsage(
      value,
      activeSource,
      activeText,
      documentUris,
    )
    && (
      (
        (
          value.siteKind === "attribute-name"
          || (
            value.siteKind === "attribute-value"
            && value.html.attributeValue === ""
            && value.html.attributeValueSource == null
          )
        )
        && semanticRuntimeBindableTargetName(value.html.attributeName) === activeText
        && value.html.attributeName != null
        && semanticRuntimeBindableTargetName(
          runtimeAttributeName(value.html.attributeName, semanticRuntimeHoverHtmlNamespace(value)),
        ) === value.selectedBindable.attribute
      )
      || (
        value.siteKind === "attribute-name"
        && value.selectedBindable.usageModeLocus === "multi-binding"
        && sameExactSourceReference(
          activeSource,
          value.selectedBindable.usageModeTargetSource,
          documentUris,
        )
      )
      || (
        value.siteKind === "attribute-name"
        && value.selectedBindable.usageModeLocus === "attribute-pattern"
        && value.html.attributeName != null
        && runtimeAttributeName(
          value.html.attributeName,
          semanticRuntimeHoverHtmlNamespace(value),
        ) === `:${value.selectedBindable.attribute}`
        && sameExactSourceReference(
          activeSource,
          value.selectedBindable.usageModeTargetSource,
          documentUris,
        )
      )
    )
  ) {
    return semanticRuntimeBindableHoverSelection(
      value,
      activeSource,
      activeText,
      documentUris,
      originDocument,
    );
  }

  if (
    value.selectedDefinition != null
    && semanticRuntimeResourceMayOwnActiveLocus(
      value,
      activeSource,
      activeText,
      documentUris,
    )
  ) {
    const resource = semanticRuntimeResourceHoverSelection(
      value,
      activeSource,
      activeText,
      documentUris,
    );
    if (
      resource.failures.length > 0
      || resource.value == null
      || !semanticRuntimeResourceOwnsPrimaryBindableUsage(
        value,
        activeSource,
        activeText,
        documentUris,
      )
    ) {
      return resource;
    }
    const usage = semanticRuntimePrimaryResourceBindableUsageContext(
      value,
      documentUris,
      originDocument,
    );
    // Usage-mode context is optional enrichment on an independently authenticated resource card.
    // Any stale command/value/authority fact withholds only that enrichment, never the resource answer.
    return usage.failures.length > 0 || usage.value == null
      ? resource
      : {
          value: {
            ...resource.value,
            context: [usage.value, ...resource.value.context].slice(0, 2),
          },
          failures: [],
        };
  }

  return { value: null, failures: [] };
}

function semanticRuntimeSelectedCallHoverSelection(
  value: SemanticTemplateCursorInfoResult,
  member: SemanticRuntimeHoverMember,
  visibilityPrefix: string,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): SemanticRuntimeReadMapping<SemanticRuntimeHoverSelection | null> {
  const call = value.selectedCall;
  if (call == null || call.status !== "exact") {
    return { value: null, failures: [] };
  }
  if (
    (call.callKind !== "scope" && call.callKind !== "member")
    || typeof call.optionalChain !== "boolean"
    || (call.presentationKind !== "method" && call.presentationKind !== "callable-value")
    || typeof call.signatureName !== "string"
    || !isAureliaExpressionIdentifierName(call.signatureName)
    || call.signatureName !== member.name
    || call.signatureName !== value.selectedMemberName
    || call.signatureName !== activeText
    || member.scopeRole != null
    || !semanticRuntimeAuthoredCallSourceIsExact(call.source)
    || !sameExactSourceReference(activeSource, call.source, documentUris)
    || !semanticRuntimeAuthoredCallSourceIsExact(call.callSource)
    || !semanticRuntimeExactSourceContains(call.callSource, activeSource, documentUris)
    || sameExactSourceReference(call.callSource, activeSource, documentUris)
  ) {
    return { value: null, failures: ["Hover selected call does not own the exact authored call locus."] };
  }
  const callRange = semanticSourceRangeForDocument(call.callSource, originDocument);
  const callText = callRange == null ? "" : originDocument.getText(callRange);
  const callSource = semanticExactSourceReference(call.callSource);
  const active = semanticExactSourceReference(activeSource);
  const callStart = callSource?.start;
  const activeEnd = active?.end;
  const calleeSuffix = typeof callStart !== "number" || typeof activeEnd !== "number"
    ? ""
    : callText.slice(activeEnd - callStart).trimStart();
  if (
    callRange == null
    || callText.length === 0
    || callText !== callText.trim()
    || !callText.endsWith(")")
    || !/^(?:\?\.\s*)?\(/u.test(calleeSuffix)
  ) {
    return { value: null, failures: ["Hover selected call source is not current in the requesting document."] };
  }
  if (
    (call.presentationKind === "method" && member.memberKind !== "method")
    || (
      call.presentationKind === "callable-value"
      && member.memberKind !== "property"
      && member.memberKind !== "accessor"
    )
  ) {
    return { value: null, failures: ["Hover selected call presentation does not match its member kind."] };
  }
  if (
    typeof call.signatureTail !== "string"
    || !isCheckerCallTextSafe(call.signatureTail)
    || Array.from(call.signatureTail).length > CHECKER_CALL_SIGNATURE_MAX_CODE_POINTS
    || (
      call.signatureIsTruncated === true
      && Array.from(call.signatureTail).length !== CHECKER_CALL_SIGNATURE_MAX_CODE_POINTS
    )
    || (call.signatureTail[0] !== "(" && call.signatureTail[0] !== "<")
    || typeof call.signatureIsTruncated !== "boolean"
    || !Number.isSafeInteger(call.candidateCount)
    || call.candidateCount < 1
    || typeof call.selectedCandidateIndex !== "number"
    || !Number.isSafeInteger(call.selectedCandidateIndex)
    || call.selectedCandidateIndex < 0
    || call.selectedCandidateIndex >= call.candidateCount
    || (
      call.genericParameterCount == null
        ? call.signatureProvenance !== "synthesized"
        : !Number.isSafeInteger(call.genericParameterCount)
          || call.genericParameterCount < 0
          || (call.genericParameterCount === 0 && call.signatureTail[0] !== "(")
          || (call.genericParameterCount > 0 && call.signatureTail[0] !== "<")
    )
    || (
      !call.signatureIsTruncated
      && call.presentationKind === "method"
      && !call.signatureTail.includes("): ")
    )
    || (
      !call.signatureIsTruncated
      && call.presentationKind === "callable-value"
      && !call.signatureTail.includes(" => ")
    )
    || call.openReason != null
  ) {
    return { value: null, failures: ["Hover selected call has malformed exact signature metadata."] };
  }

  let documentation: SemanticRuntimeReadMapping<string | null> = { value: null, failures: [] };
  let deprecationReason: SemanticRuntimeReadMapping<string | null> = { value: null, failures: [] };
  if (call.signatureProvenance === "declaration") {
    if (
      !semanticRuntimeMemberTextSourceIsExact(call.declarationSource)
      || typeof call.isDeprecated !== "boolean"
      || (call.isDeprecated !== true && call.deprecationReason != null)
    ) {
      return { value: null, failures: ["Hover selected call has incoherent declaration provenance."] };
    }
    documentation = semanticRuntimeMemberTextForHover(call.documentation, "documentation");
    deprecationReason = semanticRuntimeMemberTextForHover(call.deprecationReason, "deprecation reason");
    if (documentation.failures.length > 0 || deprecationReason.failures.length > 0) {
      return {
        value: null,
        failures: [...documentation.failures, ...deprecationReason.failures],
      };
    }
  } else if (call.signatureProvenance === "synthesized") {
    if (
      call.declarationSource != null
      || call.documentation != null
      || call.isDeprecated != null
      || call.deprecationReason != null
    ) {
      return { value: null, failures: ["Hover selected synthesized call borrows declaration metadata."] };
    }
  } else {
    return { value: null, failures: ["Hover selected call has unsupported signature provenance."] };
  }

  const context: HoverCardContextLine[] = [];
  if (call.isDeprecated === true) {
    context.push({
      prefix: deprecationReason.value == null ? "Deprecated." : "Deprecated:",
      value: deprecationReason.value,
      valueKind: "prose",
    });
  }
  if (documentation.value != null) {
    context.push({
      priority: "tertiary",
      prefix: "",
      value: documentation.value,
      valueKind: "prose",
    });
  }
  const additionalCandidates = call.candidateCount - 1;
  const overloadBadge = additionalCandidates === 0
    ? ""
    : ` (+${additionalCandidates} overload${additionalCandidates === 1 ? "" : "s"})`;
  const truncation = call.signatureIsTruncated ? "…" : "";
  const signatureTail = `${call.signatureTail}${truncation}${overloadBadge}`;
  return {
    value: {
      locus: "selected-member",
      identity: {
        language: "ts",
        prefix: `${visibilityPrefix}${member.isReadonly ? "readonly " : ""}`,
        authored: activeText,
        suffix: member.isOptional ? "?" : "",
        typeDetail: call.presentationKind === "method" ? signatureTail : `: ${signatureTail}`,
      },
      context,
    },
    failures: [],
  };
}

function semanticRuntimeAuthoredCallSourceIsExact(value: unknown): boolean {
  return isSemanticSourceReference(value)
    && value.kind === "source-span-address"
    && semanticRuntimeMemberTextSourceIsExact(value);
}

function semanticRuntimeResourceOwnsPrimaryBindableUsage(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): boolean {
  const definition = value.selectedDefinition;
  const bindable = value.selectedBindable;
  return (
    definition?.resourceKind === "custom-attribute"
    || definition?.resourceKind === "template-controller"
    )
    && bindable != null
    && bindable.usagePresentationKind === "resource-primary"
    && (bindable.usageModeLocus === "attribute" || bindable.usageModeLocus === "attribute-pattern")
    && sameExactSourceReference(activeSource, bindable.usageModeTargetSource, documentUris)
    && semanticRuntimeResourceMayOwnActiveLocus(
      value,
      activeSource,
      activeText,
      documentUris,
    );
}

function semanticRuntimePrimaryResourceBindableUsageContext(
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): SemanticRuntimeReadMapping<HoverCardContextLine | null> {
  const bindable = value.selectedBindable!;
  const rawAttribute = value.html.attributeName;
  if (rawAttribute == null) {
    return { value: null, failures: ["Hover selected resource bindable usage has no authored attribute."] };
  }
  let runtimeAuthoredCommand: string | null;
  if (bindable.usageModeLocus === "attribute-pattern") {
    const runtimePattern = runtimeAttributeName(rawAttribute, semanticRuntimeHoverHtmlNamespace(value));
    if (!runtimePattern.startsWith(":")) {
      return { value: null, failures: ["Hover selected resource bindable usage has invalid shorthand syntax."] };
    }
    runtimeAuthoredCommand = "bind";
  } else {
    const runtimeAttribute = runtimeAttributeName(rawAttribute, semanticRuntimeHoverHtmlNamespace(value));
    const commandSeparator = runtimeAttribute.indexOf(".");
    runtimeAuthoredCommand = commandSeparator < 0
      ? null
      : runtimeAttribute.slice(commandSeparator + 1);
  }
  const usage = semanticRuntimeBindableUsageModePresentation(
    value,
    runtimeAuthoredCommand,
    documentUris,
    originDocument,
  );
  if (usage.failures.length > 0 || usage.value.context == null) {
    return { value: null, failures: usage.failures };
  }
  const defaultMode = semanticRuntimeBindableModeLabel(bindable.mode);
  if (defaultMode == null) {
    return { value: null, failures: ["Hover selected bindable has an unsupported default mode."] };
  }
  const defaultDiffers = usage.value.effectiveMode != null
    && bindable.mode !== "default"
    && bindable.mode !== usage.value.effectiveMode;
  return {
    value: defaultDiffers
      ? { ...usage.value.context, tertiary: { prefix: `Default mode: ${defaultMode}.` } }
      : usage.value.context,
    failures: [],
  };
}

function semanticRuntimeBindingContextLabel(authoredScopeAncestor: number): string {
  if (authoredScopeAncestor === 0) return "Current Aurelia binding context.";
  if (authoredScopeAncestor === 1) return "Parent Aurelia binding context.";
  return `Aurelia binding context ${authoredScopeAncestor} parent scopes up.`;
}

type SemanticRuntimeHoverMember = NonNullable<SemanticTemplateCursorInfoResult["selectedMember"]>;
type SemanticRuntimeHoverMemberText = NonNullable<SemanticRuntimeHoverMember["documentation"]>;

interface SemanticRuntimeHoverMemberPresentation {
  readonly visibilityPrefix: string;
  readonly context: readonly HoverCardContextLine[];
}

function semanticRuntimeMemberHoverPresentation(
  member: SemanticRuntimeHoverMember,
): SemanticRuntimeReadMapping<SemanticRuntimeHoverMemberPresentation> {
  if (member.scopeRole != null) {
    if (
      member.visibilityKind != null
      || member.isDeprecated != null
      || member.documentation != null
      || member.deprecationReason != null
    ) {
      return {
        value: { visibilityPrefix: "", context: [] },
        failures: ["Hover selected template local carries unsupported checker declaration metadata."],
      };
    }
    return { value: { visibilityPrefix: "", context: [] }, failures: [] };
  }

  let visibilityPrefix = "";
  switch (member.visibilityKind) {
    case null:
      if (
        member.isDeprecated != null
        || member.documentation != null
        || member.deprecationReason != null
      ) {
        return {
          value: { visibilityPrefix: "", context: [] },
          failures: ["Hover selected synthetic member carries unsupported checker declaration metadata."],
        };
      }
      return { value: { visibilityPrefix: "", context: [] }, failures: [] };
    case "private":
      visibilityPrefix = "private ";
      break;
    case "protected":
      visibilityPrefix = "protected ";
      break;
    case "public":
    case "unknown":
      break;
    default:
      return {
        value: { visibilityPrefix: "", context: [] },
        failures: ["Hover selected member has unsupported checker visibility."],
      };
  }

  if (typeof member.isDeprecated !== "boolean") {
    return {
      value: { visibilityPrefix: "", context: [] },
      failures: ["Hover selected checker member has no exact deprecation state."],
    };
  }
  if (member.isDeprecated !== true && member.deprecationReason != null) {
    return {
      value: { visibilityPrefix: "", context: [] },
      failures: ["Hover selected member deprecation reason does not match its deprecation state."],
    };
  }

  const documentation = semanticRuntimeMemberTextForHover(
    member.documentation,
    "documentation",
  );
  if (documentation.failures.length > 0) {
    return { value: { visibilityPrefix: "", context: [] }, failures: documentation.failures };
  }
  const deprecationReason = semanticRuntimeMemberTextForHover(
    member.deprecationReason,
    "deprecation reason",
  );
  if (deprecationReason.failures.length > 0) {
    return { value: { visibilityPrefix: "", context: [] }, failures: deprecationReason.failures };
  }

  const context: HoverCardContextLine[] = [];
  // Migration urgency precedes the tertiary source summary; an exact diagnostic remains the card's sole status.
  if (member.isDeprecated) {
    context.push({
      prefix: deprecationReason.value == null ? "Deprecated." : "Deprecated:",
      value: deprecationReason.value,
      valueKind: "prose",
    });
  }
  if (documentation.value != null) {
    context.push({
      priority: "tertiary",
      prefix: "",
      value: documentation.value,
      valueKind: "prose",
    });
  }
  return { value: { visibilityPrefix, context }, failures: [] };
}

function semanticRuntimeMemberTextForHover(
  value: SemanticRuntimeHoverMemberText | null,
  subject: "deprecation reason" | "documentation",
): SemanticRuntimeReadMapping<string | null> {
  if (value == null) return { value: null, failures: [] };
  const maximumCodePoints = subject === "documentation"
    ? CHECKER_MEMBER_DOCUMENTATION_MAX_CODE_POINTS
    : CHECKER_MEMBER_DEPRECATION_REASON_MAX_CODE_POINTS;
  const maximumLines = subject === "documentation"
    ? CHECKER_MEMBER_DOCUMENTATION_MAX_LINES
    : CHECKER_MEMBER_DEPRECATION_REASON_MAX_LINES;
  if (
    value.format !== "plaintext"
    || typeof value.text !== "string"
    || value.text.trim().length === 0
    || typeof value.isTruncated !== "boolean"
    || !Number.isSafeInteger(value.sourceCount)
    || value.sourceCount < 1
    || !Array.isArray(value.sources)
    || value.sources.length !== Math.min(value.sourceCount, CHECKER_MEMBER_TEXT_MAX_SOURCES)
    || value.sources.some((source: unknown) => !semanticRuntimeMemberTextSourceIsExact(source))
    || Array.from(value.text).length > maximumCodePoints
    || value.text.split("\n").length > maximumLines
    || !semanticRuntimeMemberPlaintextIsNormalized(value.text)
  ) {
    return {
      value: null,
      failures: [`Hover selected member ${subject} has malformed plaintext provenance.`],
    };
  }
  const firstParagraph = value.text.split(/\n{2,}/u)
    .find((paragraph) => paragraph.trim().length > 0)!;
  const displayedParagraphWasTruncated = value.isTruncated && !/\n{2,}/u.test(value.text);
  return {
    value: displayedParagraphWasTruncated ? `${firstParagraph}…` : firstParagraph,
    failures: [],
  };
}

function semanticRuntimeMemberPlaintextIsNormalized(value: string): boolean {
  return value === value.normalize("NFC")
    && value === value.trim()
    && !/\r|\t/u.test(value)
    && !Array.from(value).some(semanticRuntimeMemberPlaintextCharacterIsControl)
    && !/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(value)
    && !/\n{3,}/u.test(value)
    && value.split("\n").every((line) => line === line.trimEnd());
}

function semanticRuntimeMemberTextSourceIsExact(value: unknown): boolean {
  if (!isSemanticSourceReference(value)) return false;
  const start = value.start;
  const end = value.end;
  return (value.kind === "typescript-node" || value.kind === "source-span-address")
    && value.label.trim().length > 0
    && typeof value.path === "string"
    && value.path.trim().length > 0
    && typeof start === "number"
    && Number.isSafeInteger(start)
    && typeof end === "number"
    && Number.isSafeInteger(end)
    && start >= 0
    && end > start
    && value.anchor == null
    && semanticExactSourceReference(value) === value;
}

function semanticRuntimeMemberPlaintextCharacterIsControl(value: string): boolean {
  const codePoint = value.codePointAt(0)!;
  return codePoint <= 0x08
    || codePoint === 0x0b
    || codePoint === 0x0c
    || (codePoint >= 0x0e && codePoint <= 0x1f)
    || (codePoint >= 0x7f && codePoint <= 0x9f);
}

function semanticRuntimeBindableDeclarationHoverSelection(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): SemanticRuntimeReadMapping<SemanticRuntimeHoverSelection | null> {
  const bindable = value.selectedBindable;
  if (bindable == null) return { value: null, failures: [] };
  const matches = [
    { kind: "name" as const, source: bindable.nameSource, authored: bindable.name },
    { kind: "attribute" as const, source: bindable.attributeSource, authored: bindable.attribute },
    { kind: "mode" as const, source: bindable.modeSource, authored: bindable.mode },
  ].filter((candidate) => sameExactSourceReference(activeSource, candidate.source, documentUris));
  if (matches.length === 0) return { value: null, failures: [] };
  if (matches.length !== 1) {
    return {
      value: null,
      failures: ["Hover selected bindable has ambiguous exact declaration sources."],
    };
  }
  const declaration = matches[0]!;
  if (!semanticRuntimeBindableUsageModeMetadataIsAbsent(bindable)) {
    return {
      value: null,
      failures: ["Hover selected bindable declaration carries usage-effective mode metadata."],
    };
  }
  if (activeText !== declaration.authored) {
    return {
      value: null,
      failures: ["Hover selected bindable declaration does not match the exact authored token."],
    };
  }
  const mode = semanticRuntimeBindableModeLabel(bindable.mode);
  if (mode == null) {
    return { value: null, failures: ["Hover selected bindable has an unsupported default mode."] };
  }
  if (declaration.kind === "mode") {
    return {
      value: {
        locus: "selected-bindable-mode",
        identity: {
          language: "text",
          prefix: "(binding mode) ",
          authored: activeText,
        },
        context: [{ prefix: "Default for:", value: bindable.attribute, suffix: "." }],
      },
      failures: [],
    };
  }
  if (
    bindable.valueType == null
    && !semanticRuntimeUncertaintyMatchesLocus(value, "selected-bindable")
  ) {
    return {
      value: null,
      failures: ["Hover selected bindable has neither a type nor typed bindable uncertainty."],
    };
  }
  const relationship = declaration.kind === "name"
    ? bindable.name === bindable.attribute
      ? null
      : { prefix: "Public attribute:", value: bindable.attribute, suffix: "." }
    : bindable.name === bindable.attribute
      ? null
      : { prefix: "Maps to:", value: bindable.name, suffix: "." };
  const defaultMode = { prefix: `Default mode: ${mode}.` };
  return {
    value: {
      locus: "selected-bindable",
      identity: {
        language: "ts",
        prefix: "(bindable) ",
        authored: activeText,
        typeDetail: bindable.valueType == null ? null : `: ${bindable.valueType}`,
      },
      context: relationship == null
        ? [defaultMode]
        : [{ ...relationship, tertiary: defaultMode }],
    },
    failures: [],
  };
}

function semanticRuntimeBindableUsageModeMetadataIsAbsent(
  bindable: NonNullable<SemanticTemplateCursorInfoResult["selectedBindable"]>,
): boolean {
  return bindable.usageEffectiveMode == null
    && bindable.usagePresentationKind == null
    && bindable.usageModeAuthority == null
    && bindable.usageModeCommand == null
    && bindable.usageModeCommandSource == null
    && bindable.usageModeCommandKind == null
    && bindable.usageModeLocus == null
    && bindable.usageModeTargetSource == null
    && bindable.usageModeSource == null
    && bindable.usageModeOpenReason == null;
}

function semanticRuntimeScopeRoleContext(role: string | null): string | null {
  switch (role) {
    case "repeat-local": return "Repeat local.";
    case "repeat-contextual": return "Repeat contextual value.";
    case "let-local": return "Let local.";
    case "callback-parameter": return "Callback parameter.";
    case "listener-contextual": return "Listener contextual value.";
    case null: return null;
    default: return null;
  }
}

function semanticRuntimeBindableHoverSelection(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): SemanticRuntimeReadMapping<SemanticRuntimeHoverSelection | null> {
  const bindable = value.selectedBindable;
  if (bindable == null) return { value: null, failures: [] };
  if (bindable.usagePresentationKind !== "bindable-attribute") {
    return {
      value: null,
      failures: ["Hover selected bindable has an inconsistent usage presentation kind."],
    };
  }
  const rawAttribute = value.html.attributeName;
  const usageLocus = bindable.usageModeLocus;
  const usageTargetSource = bindable.usageModeTargetSource;
  if (rawAttribute == null || usageLocus == null || usageTargetSource == null) {
    return {
      value: null,
      failures: ["Hover selected bindable has no exact usage locus."],
    };
  }
  let authoredAttribute: string;
  let runtimeAuthoredCommand: string | null;
  if (usageLocus === "attribute") {
    const commandSeparator = rawAttribute.indexOf(".");
    authoredAttribute = semanticRuntimeBindableTargetName(rawAttribute) ?? "";
    const authoredCommand = commandSeparator < 0
      ? null
      : rawAttribute.slice(commandSeparator + 1);
    const runtimeRawAttribute = runtimeAttributeName(rawAttribute, semanticRuntimeHoverHtmlNamespace(value));
    const runtimeCommandSeparator = runtimeRawAttribute.indexOf(".");
    const runtimeAuthoredAttribute = semanticRuntimeBindableTargetName(runtimeRawAttribute) ?? "";
    runtimeAuthoredCommand = runtimeCommandSeparator < 0
      ? null
      : runtimeRawAttribute.slice(runtimeCommandSeparator + 1);
    const attributeSource = semanticExactSourceReference(value.html.attributeSource);
    const exactActiveSource = semanticExactSourceReference(activeSource);
    const carriedCommand = value.valueSite?.bindingCommandName ?? null;
    if (
      (
        value.siteKind !== "attribute-name"
        && !(
          value.siteKind === "attribute-value"
          && value.html.attributeValue === ""
          && value.html.attributeValueSource == null
        )
      )
      || authoredAttribute.length === 0
      || activeText !== authoredAttribute
      || !sameExactSourceReference(activeSource, usageTargetSource, documentUris)
      || !semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris)
      || attributeSource?.start !== exactActiveSource?.start
      || runtimeAuthoredAttribute !== bindable.attribute
      || authoredCommand === ""
      || (carriedCommand != null && carriedCommand !== runtimeAuthoredCommand)
    ) {
      return {
        value: null,
        failures: ["Hover selected bindable metadata does not match the authored attribute spelling."],
      };
    }
  } else if (usageLocus === "multi-binding") {
    authoredAttribute = activeText;
    runtimeAuthoredCommand = bindable.usageModeCommand;
    if (
      value.siteKind !== "attribute-name"
      || value.valueSite?.siteKind !== "multi-binding-value"
      || activeText !== bindable.attribute
      || !sameExactSourceReference(activeSource, usageTargetSource, documentUris)
      || !semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris)
      || runtimeAuthoredCommand === ""
    ) {
      return {
        value: null,
        failures: ["Hover selected bindable metadata does not match the exact inline multi-binding target."],
      };
    }
  } else if (usageLocus === "attribute-pattern") {
    authoredAttribute = activeText;
    runtimeAuthoredCommand = "bind";
    const runtimePattern = runtimeAttributeName(rawAttribute, semanticRuntimeHoverHtmlNamespace(value));
    if (
      value.siteKind !== "attribute-name"
      || runtimePattern !== `:${bindable.attribute}`
      || !sameExactSourceReference(activeSource, usageTargetSource, documentUris)
      || !semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris)
    ) {
      return {
        value: null,
        failures: ["Hover selected bindable metadata does not match the exact binding-shorthand target."],
      };
    }
  } else {
    return {
      value: null,
      failures: ["Hover selected bindable has an unsupported usage locus."],
    };
  }

  const mode = semanticRuntimeBindableModeLabel(bindable.mode);
  if (mode == null) {
    return { value: null, failures: ["Hover selected bindable has an unsupported default mode."] };
  }
  if (
    bindable.valueType == null
    && !semanticRuntimeUncertaintyMatchesLocus(value, "selected-bindable")
  ) {
    return {
      value: null,
      failures: ["Hover selected bindable has neither a type nor typed bindable uncertainty."],
    };
  }
  const usageMode = semanticRuntimeBindableUsageModePresentation(
    value,
    runtimeAuthoredCommand,
    documentUris,
    originDocument,
  );
  if (usageMode.failures.length > 0) {
    return { value: null, failures: usageMode.failures };
  }
  const context: HoverCardContextLine[] = [];
  let relationship: HoverCardContextLine | null = null;
  if (bindable.attribute !== bindable.name) {
    const owner = value.selectedDefinition?.targetName;
    const ownerIsSourceBacked = owner != null
      && semanticExactSourceReference(value.selectedDefinition?.targetSource ?? null) != null;
    relationship = {
      prefix: "Maps to:",
      value: ownerIsSourceBacked ? `${owner}.${bindable.name}` : bindable.name,
      suffix: ".",
    };
  }
  const defaultDiffersFromEffective = usageMode.value.effectiveMode != null
    && bindable.mode !== "default"
    && bindable.mode !== usageMode.value.effectiveMode;
  const defaultMode = defaultDiffersFromEffective
    ? { prefix: `Default mode: ${mode}.` }
    : null;
  // The exact usage claim outranks declaration/navigation context when the renderer must shed detail.
  if (usageMode.value.context != null) {
    context.push(defaultMode == null
      ? usageMode.value.context
      : { ...usageMode.value.context, tertiary: defaultMode });
  }
  if (relationship != null) {
    context.push(relationship);
  }

  return {
    value: {
      locus: "selected-bindable",
      identity: {
        language: "ts",
        prefix: "(bindable) ",
        authored: authoredAttribute,
        typeDetail: bindable.valueType == null ? null : `: ${bindable.valueType}`,
      },
      context,
    },
    failures: [],
  };
}

function semanticRuntimeBindableTargetName(rawAttribute: string | null): string | null {
  if (rawAttribute == null) return null;
  const commandSeparator = rawAttribute.indexOf(".");
  return commandSeparator < 0 ? rawAttribute : rawAttribute.slice(0, commandSeparator);
}

function semanticRuntimeBindableModeLabel(mode: string): string | null {
  switch (mode) {
    case "default": return "default";
    case "oneTime": return "one time";
    case "toView": return "to view";
    case "fromView": return "from view";
    case "twoWay": return "two way";
    default: return null;
  }
}

function semanticRuntimeRouteHoverSelection(
  value: SemanticTemplateCursorInfoResult,
  activeText: string,
): SemanticRuntimeReadMapping<SemanticRuntimeHoverSelection | null> {
  const route = value.selectedRouteTarget;
  if (route == null) return { value: null, failures: [] };
  if (semanticExactSourceReference(route.targetSource) == null) {
    return { value: null, failures: ["Hover selected route target has no exact declaration source."] };
  }
  const targetLabel = route.targetKind === "route-id"
    ? "route id"
    : route.targetKind === "route-path"
      ? "route path"
      : null;
  if (targetLabel == null) {
    return { value: null, failures: ["Hover selected route target has an unsupported target kind."] };
  }
  const authoredName = semanticRuntimeAuthoredRouteName(activeText);
  const validAuthoredPath = route.targetKind === "route-path"
    && authoredName != null
    && authoredName.length > 0
    && !/[?#]/u.test(authoredName);
  if (
    authoredName == null
    || authoredName.length === 0
    || (
      route.targetKind === "route-id"
        ? authoredName !== route.matchedName
        : !validAuthoredPath
    )
  ) {
    return {
      value: null,
      failures: ["Hover selected route target does not match the exact authored token."],
    };
  }
  const distinctRouteId = route.routeConfigId != null
    && route.routeConfigId !== route.matchedName;
  const context: HoverCardContextLine[] = distinctRouteId
    ? [{ prefix: "Configured route id:", value: route.routeConfigId, suffix: "." }]
    : [];
  const hasAuthoredQuotes = (activeText.startsWith("\"") && activeText.endsWith("\""))
    || (activeText.startsWith("'") && activeText.endsWith("'"));
  return {
    value: {
      locus: "route-target",
      identity: {
        language: "text",
        prefix: `(${targetLabel}) ${hasAuthoredQuotes ? "" : "\""}`,
        authored: activeText,
        suffix: hasAuthoredQuotes ? "" : "\"",
      },
      context,
    },
    failures: [],
  };
}

function semanticRuntimeAuthoredRouteName(activeText: string): string | null {
  if (activeText.length === 0 || /\r|\n/u.test(activeText)) return null;
  const first = activeText[0];
  const last = activeText[activeText.length - 1];
  if ((first === "\"" || first === "'") && last === first) {
    return activeText.slice(1, -1);
  }
  return first === "\"" || first === "'" || last === "\"" || last === "'"
    ? null
    : activeText;
}

function semanticRuntimeResourceHoverSelection(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): SemanticRuntimeReadMapping<SemanticRuntimeHoverSelection | null> {
  const definition = value.selectedDefinition;
  if (definition == null) return { value: null, failures: [] };
  const matchedName = definition.matchedName;
  if (
    matchedName == null
    || matchedName.length === 0
  ) {
    return {
      value: null,
      failures: ["Hover selected resource has no public matched name."],
    };
  }

  const kind = semanticRuntimeResourceKindLabel(definition.resourceKind);
  if (kind == null) {
    return { value: null, failures: ["Hover selected resource has an unsupported public kind."] };
  }
  const isElement = definition.resourceKind === "custom-element";
  const ownsTagSource = isElement && (
    sameExactSourceReference(activeSource, value.html.tagNameSource, documentUris)
    || sameExactSourceReference(activeSource, value.html.closingTagNameSource, documentUris)
  );
  if (ownsTagSource) {
    if (
      !semanticRuntimeResourceAuthoredOrRuntimeNameMatches(
        value,
        activeSource,
        activeText,
        true,
        documentUris,
      )
      || value.html.tagName == null
      || runtimeElementResourceName(value.html.tagName, semanticRuntimeHoverHtmlNamespace(value))
        !== (definition.runtimeMatchedName ?? matchedName)
    ) {
      return {
        value: null,
        failures: ["Hover selected custom element does not own the exact authored tag token."],
      };
    }
  } else if (
    !semanticRuntimeResourceAuthoredOrRuntimeNameMatches(
      value,
      activeSource,
      activeText,
      false,
      documentUris,
    )
    || (
      isElement
      && !semanticRuntimeResourceValueLocusOwnsActiveSource(
        value,
        activeSource,
        activeText,
        documentUris,
      )
    )
  ) {
    return {
      value: null,
      failures: ["Hover selected resource does not match the exact authored token."],
    };
  }

  const canonicalName = definition.name;
  const isAlias = canonicalName != null
    && canonicalName !== matchedName;
  const implementation = definition.targetName != null
    && semanticExactSourceReference(definition.targetSource) != null
    ? { prefix: "Implementation:", value: definition.targetName, suffix: "." }
    : null;
  const context: HoverCardContextLine[] = [{
    prefix: isAlias ? `Aurelia ${kind}. Alias for:` : `Aurelia ${kind}.`,
    value: isAlias ? canonicalName : null,
    suffix: isAlias ? "." : "",
    tertiary: implementation,
  }];
  return {
    value: {
      locus: "selected-resource",
      identity: ownsTagSource
        ? { language: "html", prefix: "<", authored: activeText, suffix: ">" }
        : { language: "text", prefix: `(${kind}) `, authored: activeText },
      context,
    },
    failures: [],
  };
}

function semanticRuntimeResourceAuthoredOrRuntimeNameMatches(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  tagLocus: boolean,
  documentUris: WorkspaceDocumentUris,
): boolean {
  const definition = value.selectedDefinition;
  if (definition == null) return false;
  const runtimeMatchedName = definition.runtimeMatchedName ?? definition.matchedName;
  if (runtimeMatchedName == null) return false;
  if (
    definition.matchedName != null
    && runtimeMatchedName !== definition.matchedName
  ) {
    return false;
  }
  if (
    definition.authoredMatchedName != null
    && activeText !== definition.authoredMatchedName
  ) {
    return false;
  }
  if (tagLocus) {
    return runtimeElementResourceName(activeText, semanticRuntimeHoverHtmlNamespace(value)) === runtimeMatchedName;
  }
  switch (definition.resourceKind) {
    case "custom-attribute":
    case "template-controller":
      return (
        semanticRuntimeNormalizedAttributeTargetAtActiveSource(
          value,
          activeSource,
          activeText,
          documentUris,
        )
        ?? semanticRuntimeNormalizedShorthandTargetAtActiveSource(
          value,
          activeSource,
          documentUris,
        )
      ) === runtimeMatchedName;
    case "binding-command":
      return semanticRuntimeNormalizedBindingCommandAtActiveSource(
        value,
        activeSource,
        activeText,
        documentUris,
      ) === runtimeMatchedName;
    case "attribute-pattern":
      return false;
    case "value-converter":
    case "binding-behavior":
      return activeText === runtimeMatchedName;
    case "custom-element": {
      if (
        value.siteKind !== "attribute-value"
        || value.html.attributeName == null
        || runtimeAttributeName(value.html.attributeName, semanticRuntimeHoverHtmlNamespace(value)) !== "as-element"
      ) {
        return false;
      }
      return runtimeAsElementResourceName(activeText) === runtimeMatchedName;
    }
    default:
      return false;
  }
}

function semanticRuntimeNormalizedAttributeTargetAtActiveSource(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): string | null {
  const rawAttributeName = value.html.attributeName;
  const attributeSource = semanticExactSourceReference(value.html.attributeSource);
  const exactActiveSource = semanticExactSourceReference(activeSource);
  if (
    rawAttributeName == null
    || attributeSource == null
    || exactActiveSource == null
    || attributeSource.start == null
    || exactActiveSource.start == null
    || exactActiveSource.end == null
    || !semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris)
    || attributeSource.start !== exactActiveSource.start
    || exactActiveSource.end - exactActiveSource.start !== activeText.length
  ) {
    return null;
  }
  const runtimeRawAttributeName = runtimeAttributeName(
    rawAttributeName,
    semanticRuntimeHoverHtmlNamespace(value),
  );
  return runtimeRawAttributeName.slice(0, activeText.length);
}

function semanticRuntimeNormalizedBindingCommandAtActiveSource(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): string | null {
  const rawAttributeName = value.html.attributeName;
  const attributeSource = semanticExactSourceReference(value.html.attributeSource);
  const exactActiveSource = semanticExactSourceReference(activeSource);
  if (
    rawAttributeName == null
    || attributeSource == null
    || exactActiveSource == null
    || attributeSource.start == null
    || exactActiveSource.start == null
    || exactActiveSource.end == null
    || !semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris)
  ) {
    return null;
  }
  if (value.valueSite?.bindingCommandName != null) {
    return value.valueSite.bindingCommandName;
  }
  const relativeStart = exactActiveSource.start - attributeSource.start;
  const relativeEnd = exactActiveSource.end - attributeSource.start;
  if (
    relativeStart >= 0
    && relativeEnd <= rawAttributeName.length
    && relativeEnd - relativeStart === activeText.length
  ) {
    return runtimeAttributeName(
      rawAttributeName,
      semanticRuntimeHoverHtmlNamespace(value),
    ).slice(relativeStart, relativeEnd);
  }
  // Multi-binding segment names live in an attribute value, which the browser
  // does not normalize. The exact authored token is therefore the runtime key.
  return activeText;
}

function semanticRuntimeResourceMayOwnActiveLocus(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): boolean {
  const definition = value.selectedDefinition;
  if (definition == null) return false;
  if (definition.resourceKind === "attribute-pattern") return false;
  if (definition.matchedName == null || definition.matchedName.length === 0) return true;
  switch (definition.resourceKind) {
    case "custom-element":
      return sameExactSourceReference(activeSource, value.html.tagNameSource, documentUris)
        || sameExactSourceReference(activeSource, value.html.closingTagNameSource, documentUris)
        || semanticRuntimeResourceValueLocusOwnsActiveSource(
          value,
          activeSource,
          activeText,
          documentUris,
        );
    case "custom-attribute":
    case "template-controller":
      return semanticRuntimeResourceAttributeLocusOwnsActiveSource(
        value,
        activeSource,
        activeText,
        documentUris,
      );
    case "binding-command":
      return value.siteKind === "binding-command-name";
    case "value-converter":
      return value.siteKind === "expression-value-converter";
    case "binding-behavior":
      return value.siteKind === "expression-binding-behavior";
    default:
      return true;
  }
}

function semanticRuntimeResourceAttributeLocusOwnsActiveSource(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): boolean {
  if (
    semanticRuntimeNormalizedShorthandTargetAtActiveSource(
      value,
      activeSource,
      documentUris,
    ) != null
  ) {
    return true;
  }
  const authoredTarget = semanticRuntimeBindableTargetName(value.html.attributeName);
  const attributeSource = semanticExactSourceReference(value.html.attributeSource);
  const exactActiveSource = semanticExactSourceReference(activeSource);
  return authoredTarget != null
    && authoredTarget.length > 0
    && activeText === authoredTarget
    && semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris)
    && attributeSource?.start === exactActiveSource?.start;
}

function semanticRuntimeNormalizedShorthandTargetAtActiveSource(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  documentUris: WorkspaceDocumentUris,
): string | null {
  const bindable = value.selectedBindable;
  const rawAttributeName = value.html.attributeName;
  if (
    bindable?.usageModeLocus !== "attribute-pattern"
    || rawAttributeName == null
    || !sameExactSourceReference(activeSource, bindable.usageModeTargetSource, documentUris)
    || !semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris)
  ) {
    return null;
  }
  const runtimeRawAttribute = runtimeAttributeName(
    rawAttributeName,
    semanticRuntimeHoverHtmlNamespace(value),
  );
  return runtimeRawAttribute.startsWith(":") && runtimeRawAttribute.length > 1
    ? runtimeRawAttribute.slice(1)
    : null;
}

function semanticRuntimeResourceValueLocusOwnsActiveSource(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  activeText: string,
  documentUris: WorkspaceDocumentUris,
): boolean {
  if (
    value.siteKind !== "attribute-value"
    || value.html.attributeName == null
    || runtimeAttributeName(value.html.attributeName, semanticRuntimeHoverHtmlNamespace(value)) !== "as-element"
    || value.html.attributeValue !== activeText
  ) {
    return false;
  }
  return semanticRuntimeExactSourceContains(value.valueSite?.source ?? null, activeSource, documentUris)
    || semanticRuntimeExactSourceContains(value.html.attributeSource, activeSource, documentUris);
}

function semanticRuntimeResourceKindLabel(kind: string): string | null {
  switch (kind) {
    case "custom-element": return "custom element";
    case "custom-attribute": return "custom attribute";
    case "template-controller": return "template controller";
    case "value-converter": return "value converter";
    case "binding-behavior": return "binding behavior";
    case "binding-command": return "binding command";
    case "attribute-pattern": return "attribute pattern";
    default: return null;
  }
}

function semanticRuntimeHoverStatus(
  value: SemanticTemplateCursorInfoResult,
  locus: SemanticRuntimeHoverLocus | null,
  activeSource: SemanticSourceReference,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): SemanticRuntimeReadMapping<HoverCardStatus | null> {
  const presentation = value.diagnosticPresentation;
  if (presentation != null) {
    const presentationFailure = semanticRuntimeHoverPresentationFailure(
      value,
      activeSource,
      documentUris,
      originDocument,
    );
    if (presentationFailure != null) return { value: null, failures: [presentationFailure] };
    if (presentation.kind === "presented") {
      const primary = presentation.group.primary;
      const diagnostic = value.diagnostics[primary.rowIndex]!;
      return {
        value: {
          kind: "diagnostic",
          severity: diagnostic.severity,
          code: semanticRuntimeHoverDiagnosticCode(diagnostic),
          summary: diagnostic.summary,
        },
        failures: [],
      };
    }
    if (presentation.kind !== "withheld") {
      return { value: null, failures: ["Hover diagnostic presentation has an unsupported outcome."] };
    }
  }

  const uncertainty = value.uncertainty;
  if (uncertainty == null) return { value: null, failures: [] };
  if (!semanticRuntimeUncertaintyIsValid(value)) {
    return { value: null, failures: ["Hover uncertainty has an unsupported domain or locus relationship."] };
  }
  if (
    locus == null
    && uncertainty.category !== "dynamic-route-target"
    && uncertainty.category !== "route-configuration-ambiguous"
    && uncertainty.category !== "route-information-incomplete"
  ) {
    return { value: null, failures: [] };
  }
  if (locus != null && locus !== uncertainty.affectedLocus) {
    return { value: null, failures: [] };
  }
  const category = semanticRuntimeUncertaintyLabel(value);
  return category == null
    ? { value: null, failures: [] }
    : { value: { kind: "uncertainty", category }, failures: [] };
}

function semanticRuntimeHoverPresentationFailure(
  value: SemanticTemplateCursorInfoResult,
  activeSource: SemanticSourceReference,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): string | null {
  const presentation = value.diagnosticPresentation;
  if (presentation == null) return null;
  if (presentation.rawRowCount !== value.diagnostics.length) {
    return "Hover diagnostic presentation does not conserve its compact raw rows.";
  }
  if (presentation.kind === "withheld") {
    const withheld = presentation.withheld;
    if (
      !Number.isInteger(withheld.rowIndex)
        || withheld.rowIndex < 0
        || withheld.rowIndex >= value.diagnostics.length
        || withheld.reason !== "context-only-weak-owner"
    ) {
      return "Hover diagnostic presentation has no valid compact withheld row.";
    }
    const diagnostic = value.diagnostics[withheld.rowIndex]!;
    if (!semanticRuntimeHoverSeverityIsValid(diagnostic.severity)) {
      return "Hover diagnostic presentation has an unsupported severity.";
    }
    if (
      diagnostic.diagnosticAuthority !== "semantic-authoring-policy"
      || diagnostic.diagnosticKind !== "weak-expression-member-owner"
      || !Array.isArray(diagnostic.missingInputs)
      || diagnostic.missingInputs.includes("expression-member-owner-type:missing-slot-type")
    ) {
      return "Hover diagnostic presentation withheld row is not eligible weak-owner context.";
    }
    return semanticRuntimeHoverPrimarySourceFailure(
      diagnostic.source,
      activeSource,
      documentUris,
      originDocument,
      "withheld diagnostic row",
    );
  }
  if (presentation.kind !== "presented") {
    return "Hover diagnostic presentation has an unsupported outcome.";
  }

  const group = presentation.group;
  const rows = [group.primary, ...group.related];
  if (
    group.rawRowCount !== rows.length
    || group.primary.role !== "primary"
    || group.primary.relation !== null
    || group.primary.rowId.length === 0
  ) {
    return "Hover diagnostic presentation has an invalid group structure.";
  }
  if (
    !semanticRuntimeHoverSeverityIsValid(group.primarySeverity)
    || !semanticRuntimeHoverSeverityIsValid(group.maxRawSeverity)
  ) {
    return "Hover diagnostic presentation has an unsupported severity.";
  }
  const claimed = new Set<number>();
  for (const row of rows) {
    if (
      !Number.isInteger(row.rowIndex)
      || row.rowIndex < 0
      || row.rowIndex >= value.diagnostics.length
      || claimed.has(row.rowIndex)
      || row.rowId.length === 0
    ) {
      return "Hover diagnostic presentation has an invalid or duplicate compact row index.";
    }
    if (!semanticRuntimeHoverSeverityIsValid(value.diagnostics[row.rowIndex]?.severity)) {
      return "Hover diagnostic presentation has an unsupported severity.";
    }
    if (
      row !== group.primary
      && (
        row.role !== "contextual"
        || !semanticRuntimeHoverRelationIsValid(row.relation)
      )
    ) {
      return "Hover diagnostic presentation has an invalid contextual row.";
    }
    claimed.add(row.rowIndex);
  }
  const primary = value.diagnostics[group.primary.rowIndex];
  if (primary == null || primary.severity !== group.primarySeverity) {
    return "Hover diagnostic presentation primary severity does not match its compact row.";
  }
  const primarySourceFailure = semanticRuntimeHoverPrimarySourceFailure(
    primary.source,
    activeSource,
    documentUris,
    originDocument,
    "presented diagnostic primary",
  );
  if (primarySourceFailure != null) return primarySourceFailure;
  const maximumSeverity = maximumHoverDiagnosticSeverity(
    rows.map((row) => value.diagnostics[row.rowIndex]!.severity),
  );
  return maximumSeverity !== group.maxRawSeverity
    ? "Hover diagnostic presentation maximum severity does not match its compact rows."
    : null;
}

function semanticRuntimeHoverPrimarySourceFailure(
  source: SemanticSourceReference | null,
  activeSource: SemanticSourceReference,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
  subject: "presented diagnostic primary" | "withheld diagnostic row",
): string | null {
  const primary = semanticExactSourceReference(source);
  const active = semanticExactSourceReference(activeSource);
  if (primary == null) {
    return `Hover ${subject} has no exact authored source.`;
  }
  const primaryUri = semanticSourceReferenceUri(primary, documentUris);
  const activeUri = active == null ? null : semanticSourceReferenceUri(active, documentUris);
  if (
    primaryUri == null
    || activeUri == null
    || !documentUris.sameDocument(primaryUri, activeUri)
    || !documentUris.sameDocument(primaryUri, originDocument.uri)
  ) {
    return `Hover ${subject} does not target the requesting document.`;
  }
  if (semanticSourceRangeForDocument(primary, originDocument) == null) {
    return `Hover ${subject} is outside the current document text.`;
  }
  const overlaps = primary.start != null
    && primary.end != null
    && active?.start != null
    && active.end != null
    && primary.start < active.end
    && primary.end > active.start;
  return overlaps
    ? null
    : `Hover ${subject} does not overlap the active authored locus.`;
}

function semanticRuntimeHoverSeverityIsValid(
  severity: unknown,
): severity is SemanticTemplateCursorInfoResult["diagnostics"][number]["severity"] {
  return severity === "error" || severity === "warning" || severity === "information";
}

function semanticRuntimeHoverRelationIsValid(
  relation: SemanticDiagnosticPresentationRelation | null,
): relation is SemanticDiagnosticPresentationRelation {
  return relation === "same-subject"
    || relation === "semantic-explanation"
    || relation === "checker-evidence"
    || relation === "derived-consequence"
    || relation === "runtime-consequence";
}

function maximumHoverDiagnosticSeverity(
  severities: readonly SemanticTemplateCursorInfoResult["diagnostics"][number]["severity"][],
): SemanticTemplateCursorInfoResult["diagnostics"][number]["severity"] {
  if (severities.includes("error")) return "error";
  if (severities.includes("warning")) return "warning";
  return "information";
}

function semanticRuntimeHoverDiagnosticCode(
  diagnostic: SemanticTemplateCursorInfoResult["diagnostics"][number],
): string {
  if (diagnostic.frameworkErrorCode != null && diagnostic.frameworkErrorCode.length > 0) {
    return diagnostic.frameworkErrorCode;
  }
  if (diagnostic.typeScriptDiagnosticCode != null) {
    return `TS${diagnostic.typeScriptDiagnosticCode}`;
  }
  return diagnostic.diagnosticKind;
}

function semanticRuntimeUncertaintyMatchesLocus(
  value: SemanticTemplateCursorInfoResult,
  locus:
    | "selected-bindable"
    | "selected-expression"
    | "selected-member"
    | "selected-resource"
    | "route-target",
): boolean {
  return semanticRuntimeUncertaintyIsValid(value) && value.uncertainty?.affectedLocus === locus;
}

function semanticRuntimeUncertaintyIsValid(value: SemanticTemplateCursorInfoResult): boolean {
  const uncertainty = value.uncertainty;
  if (uncertainty == null) return false;
  switch (uncertainty.category) {
    case "type-information-incomplete":
      return (
        uncertainty.affectedDomain === "member"
        && uncertainty.affectedLocus === "selected-member"
        && value.selectedMember != null
      ) || (
        uncertainty.affectedDomain === "binding-context"
        && uncertainty.affectedLocus === "selected-expression"
        && value.selectedExpression != null
      ) || (
        uncertainty.affectedDomain === "bindable"
        && uncertainty.affectedLocus === "selected-bindable"
        && value.selectedBindable != null
        && value.selectedBindable.valueType == null
      );
    case "resource-availability-incomplete":
      return uncertainty.affectedDomain === "resource"
        && uncertainty.affectedLocus === "selected-resource"
        && value.selectedDefinition != null;
    case "dynamic-route-target":
    case "route-configuration-ambiguous":
    case "route-information-incomplete":
      return uncertainty.affectedDomain === "route"
        && uncertainty.affectedLocus === "route-target";
    default:
      return false;
  }
}

function semanticRuntimeUncertaintyLabel(value: SemanticTemplateCursorInfoResult): string | null {
  const uncertainty = value.uncertainty;
  if (uncertainty == null) return null;
  switch (uncertainty.category) {
    case "type-information-incomplete":
      if (uncertainty.affectedDomain === "binding-context") {
        const selectedExpression = value.selectedExpression;
        const authoredScopeAncestor = selectedExpression?.authoredScopeAncestor ?? 0;
        if (authoredScopeAncestor === 0) {
          return "Current binding-context type is unavailable.";
        }
        if (selectedExpression?.openKind === "missing-ancestor") {
          return authoredScopeAncestor === 1
            ? "No parent Aurelia binding context is reachable."
            : `No Aurelia binding context is reachable ${authoredScopeAncestor} parent scopes up.`;
        }
        return "Parent binding-context type is unavailable.";
      }
      if (uncertainty.affectedDomain === "bindable") {
        return "Type unavailable for this bindable.";
      }
      if (value.selectedMember?.typeDisplay != null) {
        return "Type information is incomplete for this expression.";
      }
      return value.selectedMember?.scopeRole == null
        ? "Type unavailable for this expression."
        : "Type unavailable in the current template scope.";
    case "resource-availability-incomplete":
      return "Resource availability could not be fully determined.";
    case "dynamic-route-target":
      return "Dynamic route target.";
    case "route-configuration-ambiguous":
      return "Route configuration is ambiguous.";
    case "route-information-incomplete":
      return "Route information is incomplete.";
    default:
      return null;
  }
}

type SemanticRuntimeHoverBindable = NonNullable<SemanticTemplateCursorInfoResult["selectedBindable"]>;

interface SemanticRuntimeBindableUsageModePresentation {
  readonly effectiveMode: SemanticRuntimeHoverBindable["usageEffectiveMode"];
  readonly context: HoverCardContextLine | null;
}

function semanticRuntimeBindableUsageModePresentation(
  value: SemanticTemplateCursorInfoResult,
  runtimeAuthoredCommand: string | null,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): SemanticRuntimeReadMapping<SemanticRuntimeBindableUsageModePresentation> {
  const bindable = value.selectedBindable!;
  const authority = bindable.usageModeAuthority;
  if (authority == null) {
    return semanticRuntimeInvalidBindableUsageMode();
  }

  const command = bindable.usageModeCommand;
  const commandSource = bindable.usageModeCommandSource;
  const commandKind = bindable.usageModeCommandKind;
  if (
    (command != null && (typeof command !== "string" || command.length === 0))
    || command !== runtimeAuthoredCommand
    || (
      authority !== "open"
      && (
        (command == null) !== (commandKind == null)
        || (command == null) !== (commandSource == null)
      )
    )
    || (
      authority === "open"
      && command == null
      && (commandKind != null || commandSource != null)
    )
    || !semanticRuntimeUsageModeCommandKindIsValid(commandKind)
    || (
      command != null
      && commandSource != null
      && !semanticRuntimeUsageModeCommandSourceIsValid(
        commandSource,
        command,
        value,
        documentUris,
        originDocument,
      )
      || (
        commandSource != null
        && !semanticRuntimeExactSourceContains(
          value.html.attributeSource,
          commandSource,
          documentUris,
        )
      )
    )
  ) {
    return semanticRuntimeInvalidBindableUsageMode();
  }

  const effectiveMode = bindable.usageEffectiveMode;
  const effectiveModeLabel = effectiveMode == null
    ? null
    : semanticRuntimeBindableModeLabel(effectiveMode);
  const source = bindable.usageModeSource;
  const openReason = bindable.usageModeOpenReason;
  if (authority === "open") {
    if (
      effectiveMode != null
      || typeof openReason !== "string"
      || openReason.trim().length === 0
      || !semanticRuntimeOpenUsageModeSourceIsValid(
        source,
        commandSource,
        value,
        documentUris,
        originDocument,
      )
    ) {
      return semanticRuntimeInvalidBindableUsageMode();
    }
    return { value: { effectiveMode: null, context: null }, failures: [] };
  }
  if (openReason != null) return semanticRuntimeInvalidBindableUsageMode();
  if (!semanticRuntimeUsageValueIsCurrent(value, documentUris, originDocument)) {
    return semanticRuntimeInvalidBindableUsageMode();
  }

  if (authority === "plain-literal") {
    if (
      effectiveMode != null
      || command != null
      || !semanticRuntimeUsageModeSourceIsOwnedByCurrentUsageValue(
        source,
        value,
        documentUris,
        originDocument,
      )
    ) {
      return semanticRuntimeInvalidBindableUsageMode();
    }
    return {
      value: {
        effectiveMode: null,
        context: { prefix: "Static value; no binding mode." },
      },
      failures: [],
    };
  }

  if (effectiveMode == null || effectiveModeLabel == null || source == null) {
    return semanticRuntimeInvalidBindableUsageMode();
  }

  let authorityLabel: string;
  switch (authority) {
    case "explicit-command":
      if (
        command == null
        || commandKind !== "built-in"
        || semanticRuntimeModeForFixedBindingCommand(command) !== effectiveMode
        || !sameExactSourceReference(source, commandSource, documentUris)
      ) {
        return semanticRuntimeInvalidBindableUsageMode();
      }
      authorityLabel = "explicit command";
      break;
    case "binding-behavior":
      if (
        command == null
        || commandKind !== "built-in"
        || !semanticRuntimeUsageModeSourceMatchesCurrentToken(
          source,
          effectiveMode,
          value,
          documentUris,
          originDocument,
          false,
        )
        || !semanticRuntimeUsageModeSourceIsOwnedByCurrentUsageValue(
          source,
          value,
          documentUris,
          originDocument,
        )
      ) {
        return semanticRuntimeInvalidBindableUsageMode();
      }
      authorityLabel = "binding behavior";
      break;
    case "bindable-default":
      if (
        command !== "bind"
        || commandKind !== "built-in"
        || bindable.mode === "default"
        || bindable.mode !== effectiveMode
        || !sameExactSourceReference(source, bindable.modeSource, documentUris)
      ) {
        return semanticRuntimeInvalidBindableUsageMode();
      }
      authorityLabel = "bindable default";
      break;
    case "framework-fallback":
      if (
        command !== "bind"
        || commandKind !== "built-in"
        || effectiveMode !== "toView"
        || !sameExactSourceReference(source, commandSource, documentUris)
      ) {
        return semanticRuntimeInvalidBindableUsageMode();
      }
      authorityLabel = "framework fallback";
      break;
    case "interpolation":
      if (
        effectiveMode !== "toView"
        || command != null
        || commandKind != null
        || !semanticRuntimeUsageModeSourceIsOwnedByCurrentUsageValue(
          source,
          value,
          documentUris,
          originDocument,
        )
      ) {
        return semanticRuntimeInvalidBindableUsageMode();
      }
      authorityLabel = "interpolation";
      break;
    default:
      return semanticRuntimeInvalidBindableUsageMode();
  }

  return {
    value: {
      effectiveMode,
      context: { prefix: `Effective mode: ${effectiveModeLabel} (${authorityLabel}).` },
    },
    failures: [],
  };
}

function semanticRuntimeUsageModeCommandKindIsValid(value: string | null): boolean {
  return value == null
    || value === "built-in"
    || value === "custom"
    || value === "opaque"
    || value === "open";
}

function semanticRuntimeModeForFixedBindingCommand(
  command: string,
): SemanticRuntimeHoverBindable["usageEffectiveMode"] {
  switch (command) {
    case "one-time": return "oneTime";
    case "to-view": return "toView";
    case "from-view": return "fromView";
    case "two-way": return "twoWay";
    default: return null;
  }
}

function semanticRuntimeUsageModeCommandSourceIsValid(
  source: SemanticSourceReference,
  command: string,
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): boolean {
  if (value.selectedBindable?.usageModeLocus === "attribute-pattern") {
    return command === "bind"
      && semanticRuntimeUsageModeSourceMatchesCurrentToken(
        source,
        ":",
        value,
        documentUris,
        originDocument,
        false,
      )
      && semanticRuntimeExactSourceContains(value.html.attributeSource, source, documentUris);
  }
  return semanticRuntimeUsageModeSourceMatchesCurrentToken(
    source,
    command,
    value,
    documentUris,
    originDocument,
    semanticRuntimeUsageCommandIsBrowserNormalized(value),
  );
}

function semanticRuntimeUsageModeSourceMatchesCurrentToken(
  source: SemanticSourceReference,
  expected: string,
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
  browserNormalized: boolean,
): boolean {
  const exact = semanticExactSourceReference(source);
  const sourceUri = exact == null ? null : semanticSourceReferenceUri(exact, documentUris);
  const range = exact == null ? null : semanticSourceRangeForDocument(exact, originDocument);
  if (
    exact == null
    || sourceUri == null
    || !documentUris.sameDocument(sourceUri, originDocument.uri)
    || range == null
  ) {
    return false;
  }
  const text = originDocument.getText(range);
  return (browserNormalized
    ? runtimeAttributeName(text, semanticRuntimeHoverHtmlNamespace(value))
    : text) === expected;
}

function semanticRuntimeOpenUsageModeSourceIsValid(
  source: SemanticSourceReference | null,
  commandSource: SemanticSourceReference | null,
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): boolean {
  if (source == null) return true;
  const exact = semanticExactSourceReference(source);
  const sourceUri = exact == null ? null : semanticSourceReferenceUri(exact, documentUris);
  const range = exact == null ? null : semanticSourceRangeForDocument(exact, originDocument);
  if (
    exact == null
    || sourceUri == null
    || !documentUris.sameDocument(sourceUri, originDocument.uri)
    || range == null
  ) {
    return false;
  }
  return sameExactSourceReference(source, commandSource, documentUris)
    || semanticRuntimeUsageModeSourceIsOwnedByCurrentUsageValue(
      source,
      value,
      documentUris,
      originDocument,
    )
    || semanticRuntimeExactSourceContains(value.html.attributeSource, source, documentUris);
}

function semanticRuntimeUsageModeSourceIsOwnedByCurrentUsageValue(
  source: SemanticSourceReference | null,
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): boolean {
  if (value.selectedBindable?.usageModeLocus !== "multi-binding") {
    const valueSource = semanticExactSourceReference(value.html.attributeValueSource);
    return source != null
      && semanticRuntimeHtmlAttributeValueIsCurrent(value, documentUris, originDocument)
      && (
        valueSource == null
          ? semanticRuntimeExactSourceContains(value.html.attributeSource, source, documentUris)
          : semanticRuntimeExactSourceContains(valueSource, source, documentUris)
      );
  }
  const valueSite = value.valueSite;
  const valueSiteSource = semanticExactSourceReference(valueSite?.source ?? null);
  return source != null
    && valueSite != null
    && valueSiteSource != null
    && semanticRuntimeUsageValueSiteIsCurrent(value, documentUris, originDocument)
    && semanticRuntimeExactSourceContains(valueSiteSource, source, documentUris);
}

function semanticRuntimeUsageValueIsCurrent(
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): boolean {
  return value.selectedBindable?.usageModeLocus === "multi-binding"
    ? semanticRuntimeUsageValueSiteIsCurrent(value, documentUris, originDocument)
    : semanticRuntimeHtmlAttributeValueIsCurrent(value, documentUris, originDocument);
}

function semanticRuntimeUsageValueSiteIsCurrent(
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): boolean {
  const valueSite = value.valueSite;
  const source = semanticExactSourceReference(valueSite?.source ?? null);
  const sourceUri = source == null ? null : semanticSourceReferenceUri(source, documentUris);
  const range = source == null ? null : semanticSourceRangeForDocument(source, originDocument);
  const sourceText = range == null ? null : originDocument.getText(range);
  return valueSite != null
    && source != null
    && sourceUri != null
    && documentUris.sameDocument(sourceUri, originDocument.uri)
    && range != null
    && semanticRuntimeExactSourceContains(value.html.attributeSource, source, documentUris)
    && sameExactSourceReference(valueSite.source, value.html.attributeValueSource, documentUris)
    && valueSite.rawValue === value.html.attributeValue
    && sourceText === valueSite.rawValue;
}

function semanticRuntimeHtmlAttributeValueIsCurrent(
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
  originDocument: TextDocument,
): boolean {
  const attributeValue = value.html.attributeValue;
  const valueSource = semanticExactSourceReference(value.html.attributeValueSource);
  if (valueSource != null) {
    const sourceUri = semanticSourceReferenceUri(valueSource, documentUris);
    const range = semanticSourceRangeForDocument(valueSource, originDocument);
    return attributeValue != null
      && sourceUri != null
      && documentUris.sameDocument(sourceUri, originDocument.uri)
      && range != null
      && semanticRuntimeExactSourceContains(value.html.attributeSource, valueSource, documentUris)
      && originDocument.getText(range) === attributeValue;
  }
  const attributeSource = semanticExactSourceReference(value.html.attributeSource);
  const sourceUri = attributeSource == null ? null : semanticSourceReferenceUri(attributeSource, documentUris);
  const range = attributeSource == null
    ? null
    : semanticSourceRangeForDocument(attributeSource, originDocument);
  const sourceText = range == null ? null : originDocument.getText(range);
  return value.html.attributeValueSource == null
    && attributeValue === ""
    && value.html.attributeName != null
    && attributeSource != null
    && sourceUri != null
    && documentUris.sameDocument(sourceUri, originDocument.uri)
    && range != null
    && sourceText != null
    && sourceText.startsWith(value.html.attributeName)
    && sourceText.slice(value.html.attributeName.length).trim().length === 0;
}

function semanticRuntimeUsageCommandIsBrowserNormalized(
  value: SemanticTemplateCursorInfoResult,
): boolean {
  return value.selectedBindable?.usageModeLocus === "attribute";
}

function semanticRuntimeInvalidBindableUsageMode(): SemanticRuntimeReadMapping<SemanticRuntimeBindableUsageModePresentation> {
  return {
    value: { effectiveMode: null, context: null },
    failures: ["Hover selected bindable usage mode metadata is inconsistent."],
  };
}

// ============================================================================
// Location Mapping — both Location[] and LocationLink[]
// ============================================================================

export function mapSemanticRuntimeTemplateDefinition(
  answer: SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>,
  lookupText: LookupTextFn,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
  },
): SemanticRuntimeReadMapping<LocationLink[] | null> {
  if (answer.result !== SemanticRuntimeAnswerResult.Answered) {
    return {
      value: null,
      failures: [`Semantic runtime returned definition result=${answer.result}.`],
    };
  }

  const target = semanticRuntimeDefinitionTarget(answer.value, options.documentUris);
  if (target == null) {
    return { value: null, failures: [] };
  }

  const targetUri = semanticSourceReferenceUri(target.selectionSource, options.documentUris);
  if (targetUri == null) {
    return {
      value: null,
      failures: ["Definition target cannot be resolved to a workspace document URI."],
    };
  }

  const targetCanonical = options.documentUris.resolve(targetUri).uri;
  const originCanonical = options.documentUris.resolve(options.originDocument.uri).uri;
  const targetText = targetCanonical === originCanonical
    ? options.originDocument.getText()
    : lookupText(targetCanonical);
  if (targetText == null) {
    return {
      value: null,
      failures: [`Definition target ${targetUri} has no readable document text.`],
    };
  }

  const targetDocument = TextDocument.create(
    targetUri,
    languageIdForSource(targetCanonical),
    0,
    targetText,
  );
  const targetSelectionRange = semanticSourceRangeForDocument(target.selectionSource, targetDocument);
  if (targetSelectionRange == null) {
    return {
      value: null,
      failures: [`Definition target ${targetUri} has a selection span outside the current document text.`],
    };
  }
  // LSP intentionally separates the enclosing declaration from the identifier selected by F12.
  // Semantic-runtime already carries both; collapsing them here made local templates and aliases
  // navigate to whole carrier elements even though their authored name tokens were exact.
  const targetRange = containingDefinitionRange(
    target.rangeSource,
    targetUri,
    targetDocument,
    targetSelectionRange,
    options.documentUris,
  );

  return {
    value: [{
      targetUri,
      targetRange,
      targetSelectionRange,
    }],
    failures: [],
  };
}

interface SemanticRuntimeDefinitionTarget {
  readonly rangeSource: SemanticSourceReference;
  readonly selectionSource: SemanticSourceReference;
}

function semanticRuntimeDefinitionTarget(
  value: SemanticTemplateCursorInfoResult,
  documentUris: WorkspaceDocumentUris,
): SemanticRuntimeDefinitionTarget | null {
  const memberSource = firstSemanticRuntimeExactSourceReference([
    value.selectedMember?.declarationSource ?? null,
    value.selectedMember?.source ?? null,
  ]);
  if (memberSource != null) {
    return { rangeSource: memberSource, selectionSource: memberSource };
  }

  const bindable = value.selectedBindable;
  if (bindable != null) {
    const activeSource = value.activeSource;
    const selectionSource = firstSemanticRuntimeExactSourceReference([
      sameExactSourceReference(activeSource, bindable.callbackSource, documentUris)
        ? bindable.callbackTargetSource ?? bindable.callbackSource
        : null,
      sameExactSourceReference(activeSource, bindable.modeSource, documentUris) ? bindable.modeSource : null,
      sameExactSourceReference(activeSource, bindable.setSource, documentUris)
        ? bindable.setterTargetSource ?? bindable.setSource
        : null,
      sameExactSourceReference(activeSource, bindable.attributeSource, documentUris)
        ? bindable.attributeSource
        : null,
      sameExactSourceReference(activeSource, bindable.nameSource, documentUris) ? bindable.nameSource : null,
      bindable.attributeSource ?? null,
      bindable.propertySource ?? null,
      bindable.nameSource ?? null,
      bindable.source ?? null,
    ]);
    if (selectionSource != null) {
      return {
        rangeSource: firstSemanticRuntimeExactSourceReference([bindable.source, selectionSource]) ?? selectionSource,
        selectionSource,
      };
    }
  }

  const routeTarget = value.selectedRouteTarget;
  if (routeTarget != null) {
    const selectionSource = firstSemanticRuntimeExactSourceReference([
      routeTarget.targetSource,
    ]);
    if (selectionSource != null) {
      return {
        rangeSource: firstSemanticRuntimeExactSourceReference([
          routeTarget.source,
          selectionSource,
        ]) ?? selectionSource,
        selectionSource,
      };
    }
  }

  const definition = value.selectedDefinition;
  if (definition == null) {
    return null;
  }
  const selectedAlias = definition.matchedName != null
    && definition.name != null
    && definition.matchedName !== definition.name;
  // Alias and local-template names are declarations in their own right. A primary app resource name is metadata for
  // the implementation target, so ordinary F12 follows the class while rename remains on the authored name surface.
  const selectionSource = firstSemanticRuntimeExactSourceReference(
    selectedAlias
      ? [definition.matchedNameSource, definition.nameSource, definition.targetSource, definition.source]
      : definition.targetName != null
        ? [definition.targetSource, definition.matchedNameSource, definition.nameSource, definition.source]
        : [definition.matchedNameSource, definition.nameSource, definition.targetSource, definition.source],
  );
  return selectionSource == null
    ? null
    : {
      rangeSource: firstSemanticRuntimeExactSourceReference([definition.source, selectionSource]) ?? selectionSource,
      selectionSource,
    };
}

function sameExactSourceReference(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference | null,
  documentUris: WorkspaceDocumentUris,
): boolean {
  const leftExact = semanticExactSourceReference(left);
  const rightExact = semanticExactSourceReference(right);
  const leftUri = leftExact == null ? null : semanticSourceReferenceUri(leftExact, documentUris);
  const rightUri = rightExact == null ? null : semanticSourceReferenceUri(rightExact, documentUris);
  return leftExact != null
    && rightExact != null
    && leftUri != null
    && rightUri != null
    && documentUris.sameDocument(leftUri, rightUri)
    && leftExact.start === rightExact.start
    && leftExact.end === rightExact.end;
}

function semanticRuntimeExactSourceContains(
  outer: SemanticSourceReference | null,
  inner: SemanticSourceReference | null,
  documentUris: WorkspaceDocumentUris,
): boolean {
  const outerExact = semanticExactSourceReference(outer);
  const innerExact = semanticExactSourceReference(inner);
  const outerUri = outerExact == null ? null : semanticSourceReferenceUri(outerExact, documentUris);
  const innerUri = innerExact == null ? null : semanticSourceReferenceUri(innerExact, documentUris);
  return outerExact?.start != null
    && outerExact.end != null
    && innerExact?.start != null
    && innerExact.end != null
    && outerUri != null
    && innerUri != null
    && documentUris.sameDocument(outerUri, innerUri)
    && outerExact.start <= innerExact.start
    && outerExact.end >= innerExact.end;
}

function containingDefinitionRange(
  source: SemanticSourceReference,
  selectionUri: string,
  document: TextDocument,
  selectionRange: Range,
  documentUris: WorkspaceDocumentUris,
): Range {
  const sourceUri = semanticSourceReferenceUri(source, documentUris);
  if (sourceUri == null || !documentUris.sameDocument(sourceUri, selectionUri)) {
    return selectionRange;
  }
  const range = semanticSourceRangeForDocument(source, document);
  if (range == null) {
    return selectionRange;
  }
  const rangeStart = document.offsetAt(range.start);
  const rangeEnd = document.offsetAt(range.end);
  const selectionStart = document.offsetAt(selectionRange.start);
  const selectionEnd = document.offsetAt(selectionRange.end);
  return rangeStart <= selectionStart && selectionEnd <= rangeEnd
    ? range
    : selectionRange;
}

function firstSemanticRuntimeExactSourceReference(
  sources: readonly (SemanticSourceReference | null)[],
): SemanticSourceReference | null {
  for (const source of sources) {
    const exact = semanticExactSourceReference(source);
    if (exact != null && semanticSourceReferencePath(exact) != null) {
      return exact;
    }
  }
  return null;
}

export function mapSemanticRuntimeTemplateReferences(
  answer: SemanticRuntimeAnswer<SemanticTemplateReferencesResult>,
  lookupText: LookupTextFn,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
    readonly scope: "workspace" | "origin-document";
  },
): SemanticRuntimeReadMapping<Location[] | null> {
  if (answer.result !== SemanticRuntimeAnswerResult.Answered) {
    return {
      value: null,
      failures: [`Semantic runtime returned references result=${answer.result}.`],
    };
  }

  const mapped: Location[] = [];
  const failures: string[] = [];
  const originCanonical = options.documentUris.resolve(options.originDocument.uri).uri;

  for (const row of answer.value.rows) {
    const rowLabel = row.source?.label ?? `${row.referenceKind}:${row.name}`;
    const source = semanticExactSourceReference(row.source);
    if (source == null) {
      failures.push(`Reference ${rowLabel} has no exact authored source span.`);
      continue;
    }
    const uri = semanticSourceReferenceUri(source, options.documentUris);
    if (uri == null) {
      failures.push(`Reference ${rowLabel} cannot be resolved to a workspace document.`);
      continue;
    }
    const canonical = options.documentUris.resolve(uri).uri;
    if (options.scope === "origin-document" && canonical !== originCanonical) {
      continue;
    }
    const text = canonical === originCanonical
      ? options.originDocument.getText()
      : lookupText(canonical);
    if (text == null) {
      failures.push(`Reference ${rowLabel} targets a document with no readable text.`);
      continue;
    }
    const document = TextDocument.create(
      uri,
      languageIdForSource(canonical),
      0,
      text,
    );
    const range = semanticSourceRangeForDocument(source, document);
    if (range == null) {
      failures.push(`Reference ${rowLabel} has a span outside the current document text.`);
      continue;
    }
    mapped.push({ uri, range });
  }

  return {
    value: mapped.length === 0 ? null : mapped,
    failures,
  };
}

export function mapSemanticRuntimeTemplatePrepareRename(
  answer: SemanticRuntimeAnswer<SemanticTemplateRenameResult>,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
  },
): { range: Range; placeholder: string } | null {
  if (answer.value.status !== "available" || answer.value.placeholder == null) {
    return null;
  }
  const source = semanticExactSourceReference(answer.value.activeSource);
  if (source == null) {
    return null;
  }
  const uri = semanticSourceReferenceUri(source, options.documentUris);
  if (uri == null) {
    return null;
  }
  if (!options.documentUris.sameDocument(uri, options.originDocument.uri)) {
    return null;
  }
  const range = semanticSourceRangeForDocument(source, options.originDocument);
  return range == null ? null : { range, placeholder: answer.value.placeholder };
}

/** Rename mapping result: a complete WorkspaceEdit or the reasons no edit may be applied. */
export interface SemanticRuntimeRenameEditMapping {
  readonly edit: WorkspaceEdit | null;
  /** Human-readable reasons for rows that could not be mapped or failed old-text validation. */
  readonly failures: readonly string[];
}

type SemanticRuntimeWorkspaceEditRow = {
  readonly source: SemanticSourceReference | null;
  readonly oldText: string | null;
  readonly newText: string;
};

type MappedSemanticRuntimeWorkspaceEdit = {
  readonly range: Range;
  readonly newText: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly label: string;
};

/**
 * Rename mapping is all-or-nothing: if any semantic edit row cannot be resolved to an authored
 * document range, or the document text at a range no longer matches the row's `oldText`, no
 * WorkspaceEdit is produced and the failures name every offending row. A partial rename that
 * silently drops edits corrupts code with more certainty than a refusal ever could.
 */
export function mapSemanticRuntimeTemplateRenameEdit(
  answer: SemanticRuntimeAnswer<SemanticTemplateRenameResult>,
  lookupDocumentSnapshot: LookupDocumentSnapshotFn,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
  },
): SemanticRuntimeRenameEditMapping {
  if (answer.value.status !== "available" || answer.value.edits.length === 0) {
    return { edit: null, failures: ["The rename answer carries no applicable edits."] };
  }
  return mapSemanticRuntimeWorkspaceEditRows(answer.value.edits, {
    documentUris: options.documentUris,
    originDocument: options.originDocument,
    lookupDocumentSnapshot,
    emptyFailure: "No rename edit rows could be mapped.",
  });
}

function mapSemanticRuntimeWorkspaceEditRows(
  rows: readonly SemanticRuntimeWorkspaceEditRow[],
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
    readonly lookupDocumentSnapshot: LookupDocumentSnapshotFn;
    readonly emptyFailure: string;
  },
): SemanticRuntimeRenameEditMapping {
  const documentChanges = new Map<string, {
    textDocument: { uri: string; version: number | null };
    edits: MappedSemanticRuntimeWorkspaceEdit[];
  }>();
  const failures: string[] = [];
  const originCanonical = options.documentUris.resolve(options.originDocument.uri).uri;

  for (const row of rows) {
    const rowLabel = row.source?.label ?? `${row.oldText ?? "?"} -> ${row.newText}`;
    const source = semanticExactSourceReference(row.source);
    if (source == null) {
      failures.push(`Edit ${rowLabel} has no exact authored source span.`);
      continue;
    }
    const uri = semanticSourceReferenceUri(source, options.documentUris);
    if (uri == null) {
      failures.push(`Edit ${rowLabel} cannot be resolved to a workspace document.`);
      continue;
    }
    if (!options.documentUris.ownsDocument(uri)) {
      failures.push(`Edit ${rowLabel} targets a document outside this workspace's authored URI boundary.`);
      continue;
    }
    const canonical = options.documentUris.resolve(uri).uri;
    const snapshot = canonical === originCanonical
      ? snapshotForDocument(options.originDocument, options.documentUris)
      : options.lookupDocumentSnapshot(canonical);
    if (snapshot == null) {
      failures.push(`Edit ${rowLabel} targets a document with no readable text.`);
      continue;
    }
    const document = TextDocument.create(
      snapshot.uri,
      snapshot.languageId,
      snapshot.version ?? 0,
      snapshot.text,
    );
    const range = semanticSourceRangeForDocument(source, document);
    if (range == null) {
      failures.push(`Edit ${rowLabel} has a span outside the current document text.`);
      continue;
    }
    if (row.oldText != null) {
      const currentText = document.getText(range);
      if (currentText !== row.oldText) {
        failures.push(
          `Edit ${rowLabel} expected ${JSON.stringify(row.oldText)} but the document contains ${JSON.stringify(currentText)}.`,
        );
        continue;
      }
    }
    const existing = documentChanges.get(canonical);
    const bucket = existing ?? {
      textDocument: { uri: canonical, version: snapshot.version },
      edits: [],
    };
    bucket.edits.push({
      range,
      newText: row.newText,
      startOffset: document.offsetAt(range.start),
      endOffset: document.offsetAt(range.end),
      label: rowLabel,
    });
    documentChanges.set(canonical, bucket);
  }

  for (const [uri, change] of documentChanges) {
    failures.push(...semanticRuntimeWorkspaceEditConflictFailures(uri, change.edits));
  }

  if (failures.length > 0) {
    return { edit: null, failures };
  }
  return documentChanges.size === 0
    ? { edit: null, failures: [options.emptyFailure] }
    : {
        edit: {
          documentChanges: [...documentChanges.values()].map((change) => ({
            textDocument: change.textDocument,
            edits: change.edits.map(({ range, newText }) => ({ range, newText })),
          })),
        },
        failures: [],
      };
}

function semanticRuntimeWorkspaceEditConflictFailures(
  uri: string,
  edits: readonly MappedSemanticRuntimeWorkspaceEdit[],
): string[] {
  const failures: string[] = [];
  for (let leftIndex = 0; leftIndex < edits.length; leftIndex += 1) {
    const left = edits[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < edits.length; rightIndex += 1) {
      const right = edits[rightIndex]!;
      const leftIsInsertion = left.startOffset === left.endOffset;
      const rightIsInsertion = right.startOffset === right.endOffset;
      if (
        leftIsInsertion
        && rightIsInsertion
        && left.startOffset === right.startOffset
      ) {
        failures.push(
          `Edits ${JSON.stringify(left.label)} and ${JSON.stringify(right.label)} in ${uri} are duplicate insertions at offset ${left.startOffset}.`,
        );
        continue;
      }

      const overlaps = leftIsInsertion
        ? right.startOffset < left.startOffset && left.startOffset < right.endOffset
        : rightIsInsertion
          ? left.startOffset < right.startOffset && right.startOffset < left.endOffset
          : left.startOffset < right.endOffset && right.startOffset < left.endOffset;
      if (overlaps) {
        failures.push(
          `Edits ${JSON.stringify(left.label)} and ${JSON.stringify(right.label)} in ${uri} overlap; workspace edits must use disjoint half-open ranges.`,
        );
      }
    }
  }
  return failures;
}

export function mapSemanticRuntimeTemplateCodeActions(
  answer: SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>,
  lookupDocumentSnapshot: LookupDocumentSnapshotFn,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
    readonly only?: readonly CodeActionKind[];
    readonly diagnostics?: readonly Diagnostic[];
    readonly onMappingFailure?: (
      row: SemanticTemplateCodeActionsResult["rows"][number],
      failures: readonly string[],
      actionIdentity: string,
    ) => void;
  },
): CodeAction[] | null {
  if (answer.result !== SemanticRuntimeAnswerResult.Answered) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Aurelia code action mapping was blocked: semantic runtime returned result=${answer.result}.`,
    );
  }
  const actions: CodeAction[] = [];
  for (const row of answer.value.rows) {
    if (
      row.kind !== CodeActionKind.QuickFix
      || !codeActionKindMatchesOnly(row.kind, options.only)
    ) {
      continue;
    }
    const actionIdentity = semanticRuntimeTemplateCodeActionIdentity(row);
    const mapping = mapSemanticRuntimeWorkspaceEditRows(row.edits, {
      documentUris: options.documentUris,
      originDocument: options.originDocument,
      lookupDocumentSnapshot,
      emptyFailure: `Code action '${row.title}' has no mapped edit rows.`,
    });
    if (mapping.edit == null) {
      options.onMappingFailure?.(row, mapping.failures, actionIdentity);
      continue;
    }
    const diagnostics = semanticRuntimeTemplateCodeActionDiagnostics(row, options.diagnostics ?? [], options.originDocument);
    actions.push({
      title: row.title,
      kind: row.kind,
      edit: mapping.edit,
      isPreferred: row.isPreferred,
      ...(diagnostics.length === 0 ? {} : { diagnostics }),
      data: {
        semanticRuntime: {
          queryKind: "template-code-actions",
          repairAffordance: row.repair,
          actionIdentity,
        },
      },
    });
  }
  return actions.length === 0 ? null : actions;
}

/**
 * Project an engine-authored capability diagnostic into a command-only explanation affordance.
 * Diagnostic data seeds the request but is never accepted as the explanation authority; the
 * command must issue a fresh framework-capability-explanation query for this exact locus.
 */
export function mapFrameworkCapabilityExplanationCodeActions(
  diagnostics: readonly Diagnostic[],
  originDocument: TextDocument,
  only: readonly CodeActionKind[] | undefined,
): CodeAction[] {
  if (!codeActionKindMatchesOnly(CodeActionKind.QuickFix, only)) return [];
  const actions: CodeAction[] = [];
  const seen = new Set<string>();
  for (const diagnostic of diagnostics) {
    const seed = frameworkCapabilityExplanationSeed(diagnostic, originDocument);
    if (seed == null) continue;
    const identity = JSON.stringify([
      seed.projectKey,
      seed.frameworkCapability,
      seed.range.start.line,
      seed.range.start.character,
      seed.range.end.line,
      seed.range.end.character,
    ]);
    if (seen.has(identity)) continue;
    seen.add(identity);
    actions.push({
      title: "Explain this Aurelia diagnostic",
      kind: CodeActionKind.QuickFix,
      diagnostics: [diagnostic],
      isPreferred: false,
      command: {
        title: "Explain Aurelia diagnostic",
        command: AureliaProtocolCommand.ExplainFrameworkCapability,
        arguments: [seed],
      },
      data: {
        semanticRuntime: {
          queryKind: "framework-capability-explanation",
          explanationSeed: seed,
        },
      },
    });
  }
  return actions;
}

function frameworkCapabilityExplanationSeed(
  diagnostic: Diagnostic,
  originDocument: TextDocument,
): FrameworkCapabilityExplanationParams | null {
  const runtime = semanticRuntimeDiagnosticDataPayload(diagnostic.data);
  if (
    runtime?.["queryKind"] !== "app-diagnostics"
    || runtime["diagnosticAuthority"] !== "semantic-authoring-policy"
    || (
      runtime["diagnosticKind"] !== "framework-capability-not-registered"
      && runtime["diagnosticKind"] !== "framework-capability-configured-out"
    )
    || typeof runtime["projectKey"] !== "string"
    || runtime["projectKey"].length === 0
    || typeof runtime["missingInput"] !== "string"
    || runtime["missingInput"].length === 0
  ) {
    return null;
  }
  const frameworkCapability = frameworkRegistrationCapabilityFromString(runtime["missingInput"]);
  if (frameworkCapability == null) return null;
  const suggestion = runtime["suggestion"];
  const actionTarget = suggestion != null && typeof suggestion === "object" && !Array.isArray(suggestion)
    ? (suggestion as Record<string, unknown>)["actionTarget"]
    : null;
  if (
    actionTarget == null
    || typeof actionTarget !== "object"
    || Array.isArray(actionTarget)
    || (actionTarget as Record<string, unknown>)["targetKind"] !== "framework-capability"
    || (actionTarget as Record<string, unknown>)["memberName"] !== runtime["missingInput"]
  ) {
    return null;
  }
  return {
    uri: originDocument.uri,
    position: diagnostic.range.start,
    range: diagnostic.range,
    documentVersion: originDocument.version,
    projectKey: runtime["projectKey"],
    frameworkCapability,
  };
}

export function mapSemanticRuntimeUnresolvedTemplateCodeActions(
  answer: SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>,
  lookupDocumentSnapshot: LookupDocumentSnapshotFn,
  options: {
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
    readonly position: { readonly line: number; readonly character: number };
    readonly only?: readonly CodeActionKind[];
    readonly diagnostics?: readonly Diagnostic[];
    readonly onMappingFailure?: (
      row: SemanticTemplateCodeActionsResult["rows"][number],
      failures: readonly string[],
      actionIdentity: string,
    ) => void;
  },
): CodeAction[] | null {
  const actions = mapSemanticRuntimeTemplateCodeActions(answer, lookupDocumentSnapshot, options);
  return actions?.map((action) => {
    const data = codeActionData(action.data);
    const semanticRuntime = semanticRuntimeCodeActionData(data);
    const actionIdentity = semanticRuntime?.["actionIdentity"];
    if (semanticRuntime == null || typeof actionIdentity !== "string") {
      throw new Error(`Code action '${action.title}' has no semantic resolution identity.`);
    }
    const unresolvedSemanticRuntime = { ...semanticRuntime };
    delete unresolvedSemanticRuntime["actionIdentity"];
    return {
      ...action,
      edit: undefined,
      data: {
        ...data,
        semanticRuntime: {
          ...unresolvedSemanticRuntime,
          resolve: {
            schema: AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA,
            textDocument: { uri: options.originDocument.uri },
            position: options.position,
            actionIdentity,
          } satisfies TemplateCodeActionResolveData,
        },
      },
    };
  }) ?? null;
}

export function semanticRuntimeTemplateCodeActionResolveData(
  data: unknown,
): TemplateCodeActionResolveData | null {
  const semanticRuntime = semanticRuntimeCodeActionData(data);
  const resolve = semanticRuntime?.["resolve"];
  if (resolve == null || typeof resolve !== "object" || Array.isArray(resolve)) {
    return null;
  }
  const candidate = resolve as Record<string, unknown>;
  const textDocument = candidate["textDocument"];
  const position = candidate["position"];
  const line = position != null && typeof position === "object" && !Array.isArray(position)
    ? (position as Record<string, unknown>)["line"]
    : null;
  const character = position != null && typeof position === "object" && !Array.isArray(position)
    ? (position as Record<string, unknown>)["character"]
    : null;
  const refusal = candidate["refusal"];
  if (
    candidate["schema"] !== AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA
    || typeof candidate["actionIdentity"] !== "string"
    || textDocument == null
    || typeof textDocument !== "object"
    || Array.isArray(textDocument)
    || typeof (textDocument as Record<string, unknown>)["uri"] !== "string"
    || position == null
    || typeof position !== "object"
    || Array.isArray(position)
    || typeof line !== "number"
    || !Number.isInteger(line)
    || line < 0
    || typeof character !== "number"
    || !Number.isInteger(character)
    || character < 0
    || (refusal !== undefined && templateCodeActionResolveRefusalFromValue(refusal) == null)
  ) {
    return null;
  }
  return resolve as TemplateCodeActionResolveData;
}

export function withSemanticRuntimeTemplateCodeActionResolveRefusal(
  action: CodeAction,
  refusal: TemplateCodeActionResolveRefusal,
): CodeAction {
  const data = codeActionData(action.data);
  const semanticRuntime = semanticRuntimeCodeActionData(data);
  const resolve = semanticRuntime?.["resolve"];
  if (semanticRuntime == null || semanticRuntimeTemplateCodeActionResolveData(data) == null) {
    return action;
  }
  return {
    ...action,
    edit: undefined,
    command: undefined,
    data: {
      ...data,
      semanticRuntime: {
        ...semanticRuntime,
        resolve: {
          ...(resolve as Record<string, unknown>),
          refusal,
        },
      },
    },
  };
}

export function semanticRuntimeTemplateCodeActionIdentityFromData(data: unknown): string | null {
  const actionIdentity = semanticRuntimeCodeActionData(data)?.["actionIdentity"];
  return typeof actionIdentity === "string" ? actionIdentity : null;
}

function semanticRuntimeTemplateCodeActionIdentity(
  row: SemanticTemplateCodeActionsResult["rows"][number],
): string {
  const diagnostics = row.diagnostics
    .map((diagnostic) => {
      const source = semanticExactSourceReference(diagnostic.source);
      return {
        diagnosticKind: diagnostic.diagnosticKind,
        diagnosticAuthority: diagnostic.diagnosticAuthority,
        ...(diagnostic.typeScriptDiagnosticCode == null
          ? {}
          : { typeScriptDiagnosticCode: diagnostic.typeScriptDiagnosticCode }),
        missingInput: diagnostic.missingInput,
        selectedMemberName: diagnostic.selectedMemberName,
        source: source == null
          ? null
          : {
              path: source.path,
              start: source.start,
              end: source.end,
            },
      };
    })
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return `template-code-action:sha256:${stableDigest({
    title: row.title,
    kind: row.kind,
    repair: row.repair,
    editKinds: row.edits.map((edit) => edit.editKind),
    diagnostics,
  })}`;
}

function semanticRuntimeCodeActionData(data: unknown): Record<string, unknown> | null {
  const semanticRuntime = codeActionData(data)["semanticRuntime"];
  return semanticRuntime != null && typeof semanticRuntime === "object" && !Array.isArray(semanticRuntime)
    ? semanticRuntime as Record<string, unknown>
    : null;
}

function codeActionData(data: unknown): Record<string, unknown> {
  return data != null && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
}

export function workspaceEditChanges(
  edit: WorkspaceEdit,
): Record<string, { range: Range; newText: string }[]> {
  const changes: Record<string, { range: Range; newText: string }[]> = {};
  for (const [uri, edits] of Object.entries(edit.changes ?? {})) {
    changes[uri] = [...edits];
  }
  for (const change of edit.documentChanges ?? []) {
    if (!("textDocument" in change) || !Array.isArray(change.edits)) continue;
    const uri = change.textDocument.uri;
    const bucket = changes[uri] ?? [];
    for (const edit of change.edits) {
      if (!("newText" in edit)) {
        throw new Error("workspaceEditChanges only flattens plain text edits; snippet edits must keep their protocol carrier.");
      }
      bucket.push({ range: edit.range, newText: edit.newText });
    }
    changes[uri] = bucket;
  }
  return changes;
}

function snapshotForDocument(
  document: TextDocument,
  documentUris: WorkspaceDocumentUris,
): SemanticRuntimeLspDocumentSnapshot {
  return {
    uri: documentUris.resolve(document.uri).uri,
    languageId: document.languageId,
    version: document.version,
    text: document.getText(),
  };
}

function semanticRuntimeTemplateCodeActionDiagnostics(
  row: SemanticTemplateCodeActionsResult["rows"][number],
  diagnostics: readonly Diagnostic[],
  originDocument: TextDocument,
): Diagnostic[] {
  return diagnostics.filter((diagnostic) => {
    const runtime = semanticRuntimeDiagnosticDataPayload(diagnostic.data);
    return row.diagnostics.some((sourceDiagnostic) =>
      semanticRuntimeTemplateCodeActionDiagnosticMatches(
        sourceDiagnostic,
        diagnostic,
        runtime,
        originDocument,
      )
    );
  });
}

function semanticRuntimeTemplateCodeActionDiagnosticMatches(
  sourceDiagnostic: SemanticTemplateDiagnosticRow,
  diagnostic: Diagnostic,
  runtime: Record<string, unknown> | null,
  originDocument: TextDocument,
): boolean {
  if (runtime?.["diagnosticKind"] !== sourceDiagnostic.diagnosticKind) {
    return false;
  }
  const authority = runtime["diagnosticAuthority"];
  if (typeof authority === "string" && authority !== sourceDiagnostic.diagnosticAuthority) {
    return false;
  }
  if (sourceDiagnostic.typeScriptDiagnosticCode != null) {
    const detachedCode = runtime["typeScriptDiagnosticCode"];
    if (
      detachedCode !== sourceDiagnostic.typeScriptDiagnosticCode
      && (detachedCode !== undefined || diagnostic.code !== `TS${sourceDiagnostic.typeScriptDiagnosticCode}`)
    ) {
      return false;
    }
  }
  const range = sourceDiagnostic.source == null
    ? null
    : semanticSourceRangeForDocument(sourceDiagnostic.source, originDocument);
  return range == null || rangesEqual(diagnostic.range, range);
}

function semanticRuntimeDiagnosticDataPayload(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const root = data as Record<string, unknown>;
  const runtime = root["semanticRuntime"];
  return runtime != null && typeof runtime === "object" && !Array.isArray(runtime)
    ? runtime as Record<string, unknown>
    : null;
}

function rangesEqual(left: Range, right: Range): boolean {
  return left.start.line === right.start.line
    && left.start.character === right.start.character
    && left.end.line === right.end.line
    && left.end.character === right.end.character;
}
