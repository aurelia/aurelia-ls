/**
 * Type mapping utilities: semantic-runtime types -> LSP types
 *
 * This is the Boundary 5 conversion layer. All workspace types are
 * converted to LSP wire format here. The FeatureResponse unwrapping
 * happens in the handler layer (handlers/features.ts); this module
 * handles the T → LSP mapping for successful results.
 */
import { pathToFileURL } from "node:url";
import {
  CompletionItemKind,
  DiagnosticSeverity,
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
  SemanticDiagnosticRelatedInformation,
  SemanticRouteNodesResult,
  SemanticRuntimeAnswer,
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
  diagnosticRepairAffordanceForSuggestion,
  semanticExactSourceReference,
  semanticSourceReferenceContainsOffset,
} from "@aurelia-ls/semantic-runtime";
import { canonicalDocumentUri, type DocumentUri } from "../utils/document-uri.js";
import {
  AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA,
  type TemplateCodeActionResolveData,
} from "../protocol.js";
import { stableDigest } from "../utils/stable-hash.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferencePath,
  semanticSourceReferenceUri,
} from "./source-locations.js";

export interface SourceSpan {
  readonly start: number;
  readonly end: number;
}

export interface DocumentSpan {
  readonly uri: DocumentUri;
  readonly span: SourceSpan;
}

export type LookupTextFn = (uri: DocumentUri) => string | null;
export interface LspDocumentSnapshot {
  readonly uri: DocumentUri;
  readonly languageId: string;
  readonly version: number | null;
  readonly text: string;
}
export type LookupDocumentSnapshotFn = (uri: DocumentUri) => LspDocumentSnapshot | null;
export const AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY = "__aurelia" as const;
export const AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA = "diagnostics-taxonomy/1" as const;

/** Best-effort read projection plus every source-backed row the adapter could not represent. */
export interface SemanticRuntimeReadMapping<TValue> {
  readonly value: TValue;
  readonly failures: readonly string[];
}

type DiagnosticImpact = "blocking" | "degraded" | "informational";
type DiagnosticActionability = "guided" | "manual";
type DiagnosticCategory =
  | "expression"
  | "template-syntax"
  | "resource-resolution"
  | "bindable-validation"
  | "project";

// ============================================================================
// URI and Span Conversion
// ============================================================================

export function toLspUri(uri: DocumentUri): string {
  const canonical = canonicalDocumentUri(uri);
  if (canonical.uri.startsWith("file://")) return canonical.uri;
  const pathOrUri = canonical.path;
  if (pathOrUri.startsWith("file://")) return pathOrUri;
  return pathToFileURL(pathOrUri).toString();
}

export function guessLanguage(uri: DocumentUri): string {
  if (uri.endsWith(".ts") || uri.endsWith(".js")) return "typescript";
  if (uri.endsWith(".json")) return "json";
  return "html";
}

export function spanToRange(loc: DocumentSpan, lookupText: LookupTextFn): Range | null {
  const text = lookupText(loc.uri);
  if (!text) return null;
  const doc = TextDocument.create(toLspUri(loc.uri), guessLanguage(loc.uri), 0, text);
  return { start: doc.positionAt(loc.span.start), end: doc.positionAt(loc.span.end) };
}

// ============================================================================
// Severity Mapping — L2 demotion table produces 4 severity levels
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

function semanticRuntimeDiagnosticImpact(
  severity: SemanticAppDiagnosticRow["severity"],
): DiagnosticImpact {
  switch (severity) {
    case "error":
      return "blocking";
    case "warning":
      return "degraded";
    case "information":
      return "informational";
  }
}

function semanticRuntimeDiagnosticActionability(
  row: SemanticAppDiagnosticRow,
): DiagnosticActionability {
  return diagnosticRepairAffordanceForSuggestion(row.suggestion).actionability;
}

function semanticRuntimeDiagnosticCategory(row: SemanticAppDiagnosticRow): DiagnosticCategory {
  switch (row.diagnosticDomain) {
    case "template":
      return "template-syntax";
    case "resource":
      return "resource-resolution";
    case "validation":
      return "bindable-validation";
    case "typescript":
    case "evaluation":
    case "observation":
      return "expression";
    default:
      return "project";
  }
}

export function mapSemanticRuntimeAppDiagnostics(
  answer: SemanticRuntimeAnswer<SemanticAppDiagnosticsResult>,
  document: TextDocument,
  workspaceRoot: string | null = null,
  lookupText: LookupTextFn | null = null,
): SemanticRuntimeReadMapping<Diagnostic[]> {
  const mapped: Diagnostic[] = [];
  const failures: string[] = [];
  const presentation = answer.value.presentation;
  if (presentation != null) {
    const rows = answer.value.rows;
    for (const group of presentation.groups) {
      const relatedInformation: DiagnosticRelatedInformation[] = [];
      for (const related of group.related) {
        const row = rows[related.rowIndex] ?? null;
        if (row == null) {
          failures.push(`Diagnostic presentation group references missing related row ${related.rowIndex}.`);
          continue;
        }
        const relatedMapping = semanticRuntimeDiagnosticRelatedInformation(row, document, workspaceRoot, lookupText);
        relatedInformation.push(...relatedMapping.value);
        failures.push(...relatedMapping.failures);
      }
      const diagnosticMapping = semanticRuntimeDiagnostic(
        rows[group.primary.rowIndex] ?? null,
        document,
        workspaceRoot,
        lookupText,
        relatedInformation,
      );
      failures.push(...diagnosticMapping.failures);
      if (diagnosticMapping.value != null) {
        mapped.push(diagnosticMapping.value);
      } else {
        const row = rows[group.primary.rowIndex] ?? null;
        failures.push(
          row == null
            ? `Diagnostic presentation group references missing row ${group.primary.rowIndex}.`
            : `Diagnostic ${row.source?.label ?? row.diagnosticKind} has no range valid for the current document.`,
        );
      }
    }
    return { value: mapped, failures };
  }
  for (const row of answer.value.rows) {
    const diagnosticMapping = semanticRuntimeDiagnostic(row, document, workspaceRoot, lookupText, []);
    failures.push(...diagnosticMapping.failures);
    if (diagnosticMapping.value != null) {
      mapped.push(diagnosticMapping.value);
    } else {
      failures.push(`Diagnostic ${row.source?.label ?? row.diagnosticKind} has no range valid for the current document.`);
    }
  }
  return { value: mapped, failures };
}

function semanticRuntimeDiagnostic(
  row: SemanticAppDiagnosticRow | null,
  document: TextDocument,
  workspaceRoot: string | null,
  lookupText: LookupTextFn | null,
  relatedInformation: DiagnosticRelatedInformation[],
): SemanticRuntimeReadMapping<Diagnostic | null> {
  if (row == null) return { value: null, failures: [] };
  const range = semanticRuntimeDiagnosticRange(row.source, document);
  if (range == null) return { value: null, failures: [] };
  const rowRelatedInformation: DiagnosticRelatedInformation[] = [];
  const failures: string[] = [];
  for (const related of row.relatedInformation) {
    const mapping = semanticRuntimeDiagnosticRelatedSourceInformation(
      related,
      document,
      workspaceRoot,
      lookupText,
    );
    rowRelatedInformation.push(...mapping.value);
    failures.push(...mapping.failures);
  }
  const allRelatedInformation = [...rowRelatedInformation, ...relatedInformation];
  return {
    value: {
      range,
      message: row.summary,
      severity: semanticRuntimeSeverityToLsp(row.severity),
      code: semanticRuntimeDiagnosticCode(row),
      source: row.diagnosticDomain === "typescript" ? "typescript" : "aurelia",
      data: semanticRuntimeDiagnosticData(row),
      ...(allRelatedInformation.length === 0 ? {} : { relatedInformation: allRelatedInformation }),
    },
    failures,
  };
}

export function semanticRuntimeDiagnosticCode(row: SemanticAppDiagnosticRow): string {
  return row.frameworkErrorCode ?? semanticRuntimeTypeScriptDiagnosticCode(row) ?? row.diagnosticKind;
}

function semanticRuntimeTypeScriptDiagnosticCode(row: SemanticAppDiagnosticRow): string | null {
  if (row.diagnosticAuthority !== "typescript") return null;
  const candidates = [
    row.missingInput,
    ...row.missingInputs,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const match = /^typescript:TS(\d+)$/.exec(candidate);
    if (match) return `TS${match[1]}`;
  }
  return null;
}

function semanticRuntimeDiagnosticRelatedInformation(
  row: SemanticAppDiagnosticRow | null,
  document: TextDocument,
  workspaceRoot: string | null,
  lookupText: LookupTextFn | null,
): SemanticRuntimeReadMapping<DiagnosticRelatedInformation[]> {
  if (row == null) return { value: [], failures: [] };
  return semanticRuntimeRelatedInformationForSource(row.source, row.summary, document, workspaceRoot, lookupText);
}

function semanticRuntimeDiagnosticRelatedSourceInformation(
  related: SemanticDiagnosticRelatedInformation,
  document: TextDocument,
  workspaceRoot: string | null,
  lookupText: LookupTextFn | null,
): SemanticRuntimeReadMapping<DiagnosticRelatedInformation[]> {
  return semanticRuntimeRelatedInformationForSource(
    related.source,
    related.message,
    document,
    workspaceRoot,
    lookupText,
  );
}

function semanticRuntimeRelatedInformationForSource(
  source: SemanticSourceReference | null,
  message: string,
  document: TextDocument,
  workspaceRoot: string | null,
  lookupText: LookupTextFn | null,
): SemanticRuntimeReadMapping<DiagnosticRelatedInformation[]> {
  const exact = semanticExactSourceReference(source);
  if (source == null) return { value: [], failures: [] };
  const locatedSource = exact ?? source;
  const uri = semanticSourceReferenceUri(locatedSource, workspaceRoot);
  if (uri == null) {
    return {
      value: [],
      failures: [`Related diagnostic evidence ${source.label} cannot be resolved to a workspace document.`],
    };
  }
  const canonical = canonicalDocumentUri(uri).uri;
  const originCanonical = canonicalDocumentUri(document.uri).uri;
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
    : TextDocument.create(canonical, guessLanguage(canonical), 0, text);
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
): Range | null {
  const exact = semanticExactSourceReference(source);
  if (exact?.start != null && exact.end != null) {
    return semanticSourceRangeForDocument(exact, document);
  }
  return source == null ? null : {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 0 },
  };
}

export function semanticRuntimeDiagnosticData(
  row: SemanticAppDiagnosticRow,
): Record<string, unknown> {
  return semanticRuntimeDiagnosticDataEnvelope(row, semanticRuntimeDetachedDiagnosticData(row));
}

/** Preserve answer-local diagnostic relations only while the complete answer travels as one custom response. */
export function semanticRuntimeDiagnosticSnapshotData(
  row: SemanticAppDiagnosticRow,
): Record<string, unknown> {
  return semanticRuntimeDiagnosticDataEnvelope(row, {
    ...semanticRuntimeDetachedDiagnosticData(row),
    diagnosticIdentityHandle: row.diagnosticIdentityHandle,
    ...(row.diagnosticRelations == null ? {} : { diagnosticRelations: row.diagnosticRelations }),
  });
}

function semanticRuntimeDetachedDiagnosticData(row: SemanticAppDiagnosticRow): Record<string, unknown> {
  return {
    queryKind: "app-diagnostics",
    projectKey: row.projectKey,
    diagnosticDomain: row.diagnosticDomain,
    phase: row.phase,
    diagnosticKind: row.diagnosticKind,
    diagnosticAuthority: row.diagnosticAuthority,
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

function semanticRuntimeDiagnosticDataEnvelope(
  row: SemanticAppDiagnosticRow,
  runtime: Record<string, unknown>,
): Record<string, unknown> {
  const impact = semanticRuntimeDiagnosticImpact(row.severity);
  const actionability = semanticRuntimeDiagnosticActionability(row);
  const category = semanticRuntimeDiagnosticCategory(row);
  return {
    semanticRuntime: runtime,
    [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
      diagnostics: {
        schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
        impact,
        actionability,
        category,
        runtime,
      },
    },
  };
}

// ============================================================================
// Completions Mapping
// ============================================================================

const COMPLETION_KIND_BY_SEMANTIC_RUNTIME_CANDIDATE: Readonly<Record<string, CompletionItemKind>> = {
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
};

export function mapSemanticRuntimeTemplateCompletions(
  answer: SemanticRuntimeAnswer<SemanticTemplateCompletionResult>,
): CompletionList {
  const items = answer.value.candidates.map(mapSemanticRuntimeTemplateCompletionCandidate);
  // LSP's isIncomplete flag asks the client to requery an intentionally narrowed list after further typing.
  // The session drains transport pages, and semantic coverage is an independent epistemic axis.
  return { isIncomplete: false, items };
}

function mapSemanticRuntimeTemplateCompletionCandidate(
  candidate: SemanticTemplateCompletionCandidateRow,
): CompletionItem {
  const completion: CompletionItem = {
    label: candidate.name,
    kind: semanticRuntimeCompletionKind(candidate),
    data: {
      semanticRuntime: {
        candidateKind: candidate.candidateKind,
        sourceKind: candidate.sourceKind,
        memberKind: candidate.memberKind,
        aureliaHookKind: candidate.aureliaHookKind,
      },
    },
  };
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

function semanticRuntimeCompletionKind(
  candidate: SemanticTemplateCompletionCandidateRow,
): CompletionItemKind {
  if (candidate.memberKind === "method") {
    return CompletionItemKind.Method;
  }
  if (candidate.memberKind === "accessor") {
    return CompletionItemKind.Property;
  }
  return COMPLETION_KIND_BY_SEMANTIC_RUNTIME_CANDIDATE[candidate.candidateKind]
    ?? CompletionItemKind.Text;
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
): Hover | null {
  const value = answer.value;
  const lines: string[] = [];

  if (value.selectedMember != null || value.selectedMemberName != null || value.memberOwnerType != null) {
    const name = value.selectedMemberName ?? value.selectedMember?.name ?? "(selected member)";
    lines.push(`**${escapeMarkdown(name)}**`);
    if (value.selectedMember?.typeDisplay != null) {
      lines.push("", "```ts", `${name}: ${value.selectedMember.typeDisplay}`, "```");
    }
    const details = [
      value.selectedMember?.memberKind == null ? null : `kind: \`${value.selectedMember.memberKind}\``,
      value.memberOwnerType?.display == null ? null : `owner: \`${value.memberOwnerType.display}\``,
      value.memberOwnerType?.shapeKind == null ? null : `owner shape: \`${value.memberOwnerType.shapeKind}\``,
      value.selectedMember?.isReadonly === true ? "readonly" : null,
      value.selectedMember?.isOptional === true ? "optional" : null,
    ].filter((part): part is string => part != null);
    if (details.length > 0) {
      lines.push("", details.join("  \n"));
    }
  }

  if (value.selectedBindable != null) {
    addSectionBreak(lines);
    lines.push(
      `**Bindable** \`${value.selectedBindable.attribute}\``,
      "",
      `name: \`${value.selectedBindable.name}\`  `,
      `mode: \`${value.selectedBindable.mode}\``,
    );
  }

  if (value.selectedDefinition != null) {
    addSectionBreak(lines);
    const definitionName = value.selectedDefinition.name ?? value.selectedDefinition.targetName ?? "(unnamed)";
    lines.push(
      `**Resource** \`${definitionName}\``,
      "",
      `kind: \`${value.selectedDefinition.resourceKind}\``,
    );
  }

  if (lines.length === 0 && value.valueSite != null) {
    lines.push(
      `**Aurelia ${value.valueSite.siteKind}**`,
      "",
      value.valueSite.bindingCommandName == null ? "" : `command: \`${value.valueSite.bindingCommandName}\`  `,
      value.valueSite.bindableAttribute == null ? "" : `bindable: \`${value.valueSite.bindableAttribute}\`  `,
      `value: \`${truncateHoverValue(value.valueSite.rawValue)}\``,
    );
  }

  if (lines.length === 0 && value.selectedDefinition == null && value.html.attributeName != null) {
    lines.push(
      `**HTML attribute** \`${value.html.attributeName}\``,
      "",
      value.html.tagName == null ? "template HTML" : `on \`<${value.html.tagName}>\``,
    );
  }

  if (value.diagnostics.length > 0) {
    addSectionBreak(lines);
    const first = value.diagnostics[0]!;
    lines.push(
      `**${first.severity}: ${first.diagnosticKind}**`,
      "",
      first.summary,
    );
  }

  if (value.missingInputs.length > 0) {
    addSectionBreak(lines);
    const visible = value.missingInputs.slice(0, 2).map((input) => `\`${escapeMarkdownCode(input)}\``);
    const remaining = value.missingInputs.length - visible.length;
    lines.push(
      remaining === 0
        ? `Analysis is incomplete because ${visible.join(" and ")} could not be established.`
        : `Analysis is incomplete because ${visible.join(", ")} and ${remaining} more input${remaining === 1 ? "" : "s"} could not be established.`,
    );
  }

  const content = lines.filter((line) => line.length > 0 || lines.length > 1).join("\n");
  if (content.trim().length === 0) {
    return null;
  }
  return {
    contents: { kind: "markdown", value: content },
  };
}

function addSectionBreak(lines: string[]): void {
  if (lines.length > 0) {
    lines.push("", "---", "");
  }
}

function truncateHoverValue(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 77)}...`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+.!|-])/g, "\\$1");
}

function escapeMarkdownCode(value: string): string {
  return value.replace(/`/g, "\\`");
}

// ============================================================================
// Location Mapping — both Location[] and LocationLink[]
// ============================================================================

export function mapSemanticRuntimeTemplateDefinition(
  answer: SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>,
  lookupText: LookupTextFn,
  options: {
    readonly workspaceRoot: string | null;
    readonly originDocument: TextDocument;
  },
): LocationLink[] | null {
  const target = semanticRuntimeDefinitionTarget(answer.value);
  if (target == null) {
    return null;
  }

  const targetUri = semanticSourceReferenceUri(target.selectionSource, options.workspaceRoot);
  if (targetUri == null) {
    return null;
  }

  const targetCanonical = canonicalDocumentUri(targetUri).uri;
  const originCanonical = canonicalDocumentUri(options.originDocument.uri).uri;
  const targetText = targetCanonical === originCanonical
    ? options.originDocument.getText()
    : lookupText(targetCanonical);
  if (targetText == null) {
    return null;
  }

  const targetDocument = TextDocument.create(
    targetUri,
    guessLanguage(targetCanonical),
    0,
    targetText,
  );
  const targetSelectionRange = semanticSourceRangeForDocument(target.selectionSource, targetDocument);
  if (targetSelectionRange == null) {
    return null;
  }
  // LSP intentionally separates the enclosing declaration from the identifier selected by F12.
  // Semantic-runtime already carries both; collapsing them here made local templates and aliases
  // navigate to whole carrier elements even though their authored name tokens were exact.
  const targetRange = containingDefinitionRange(
    target.rangeSource,
    targetUri,
    targetDocument,
    targetSelectionRange,
    options.workspaceRoot,
  );

  return [{
    targetUri,
    targetRange,
    targetSelectionRange,
  }];
}

export function mapSemanticRuntimeRouteNodeDefinition(
  answer: SemanticRuntimeAnswer<SemanticRouteNodesResult>,
  lookupText: LookupTextFn,
  options: {
    readonly workspaceRoot: string | null;
    readonly originDocument: TextDocument;
    readonly position: { readonly line: number; readonly character: number };
  },
): LocationLink[] | null {
  const cursorOffset = options.originDocument.offsetAt(options.position);
  const originCanonical = canonicalDocumentUri(options.originDocument.uri).uri;

  for (const row of answer.value.rows) {
    const originSource = firstSemanticRuntimeExactSourceReference([
      row.instruction?.source ?? null,
      row.originalInstruction?.source ?? null,
      row.source,
    ]);
    const targetSource = firstSemanticRuntimeExactSourceReference([
      row.routeConfig?.source ?? null,
      row.routeContext.source,
    ]);
    if (originSource == null || targetSource == null) {
      continue;
    }
    if (!semanticSourceReferenceContainsOffset(originSource, cursorOffset)) {
      continue;
    }
    const originUri = semanticSourceReferenceUri(originSource, options.workspaceRoot);
    if (originUri == null || canonicalDocumentUri(originUri).uri !== originCanonical) {
      continue;
    }

    const link = locationLinkForSemanticSource(
      targetSource,
      lookupText,
      options.workspaceRoot,
      options.originDocument,
      originSource,
    );
    if (link != null) {
      return [link];
    }
  }

  return null;
}

interface SemanticRuntimeDefinitionTarget {
  readonly rangeSource: SemanticSourceReference;
  readonly selectionSource: SemanticSourceReference;
}

function semanticRuntimeDefinitionTarget(
  value: SemanticTemplateCursorInfoResult,
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
      sameExactSourceReference(activeSource, bindable.callbackSource)
        ? bindable.callbackTargetSource ?? bindable.callbackSource
        : null,
      sameExactSourceReference(activeSource, bindable.modeSource) ? bindable.modeSource : null,
      sameExactSourceReference(activeSource, bindable.setSource) ? bindable.setSource : null,
      sameExactSourceReference(activeSource, bindable.attributeSource) ? bindable.attributeSource : null,
      sameExactSourceReference(activeSource, bindable.nameSource) ? bindable.nameSource : null,
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

  const definition = value.selectedDefinition;
  if (definition == null) {
    return null;
  }
  const selectedAlias = definition.matchedName != null
    && definition.name != null
    && definition.matchedName.toLowerCase() !== definition.name.toLowerCase();
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
): boolean {
  const leftExact = semanticExactSourceReference(left);
  const rightExact = semanticExactSourceReference(right);
  const leftPath = semanticSourceReferencePath(leftExact);
  const rightPath = semanticSourceReferencePath(rightExact);
  return leftExact != null
    && rightExact != null
    && leftPath != null
    && leftPath === rightPath
    && leftExact.start === rightExact.start
    && leftExact.end === rightExact.end;
}

function containingDefinitionRange(
  source: SemanticSourceReference,
  selectionUri: string,
  document: TextDocument,
  selectionRange: Range,
  workspaceRoot: string | null,
): Range {
  const sourceUri = semanticSourceReferenceUri(source, workspaceRoot);
  if (sourceUri == null || canonicalDocumentUri(sourceUri).uri !== canonicalDocumentUri(selectionUri).uri) {
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

function locationLinkForSemanticSource(
  target: SemanticSourceReference,
  lookupText: LookupTextFn,
  workspaceRoot: string | null,
  originDocument: TextDocument,
  originSource?: SemanticSourceReference | null,
): LocationLink | null {
  const targetUri = semanticSourceReferenceUri(target, workspaceRoot);
  if (targetUri == null) {
    return null;
  }

  const targetCanonical = canonicalDocumentUri(targetUri).uri;
  const originCanonical = canonicalDocumentUri(originDocument.uri).uri;
  const targetText = targetCanonical === originCanonical
    ? originDocument.getText()
    : lookupText(targetCanonical);
  if (targetText == null) {
    return null;
  }

  const targetDocument = TextDocument.create(
    targetUri,
    guessLanguage(targetCanonical),
    0,
    targetText,
  );
  const targetRange = semanticSourceRangeForDocument(target, targetDocument);
  if (targetRange == null) {
    return null;
  }

  const originSelectionRange = originSource == null
    ? null
    : semanticSourceRangeForDocument(originSource, originDocument);

  return {
    targetUri,
    targetRange,
    targetSelectionRange: targetRange,
    ...(originSelectionRange == null ? {} : { originSelectionRange }),
  };
}

export function mapSemanticRuntimeTemplateReferences(
  answer: SemanticRuntimeAnswer<SemanticTemplateReferencesResult>,
  lookupText: LookupTextFn,
  options: {
    readonly workspaceRoot: string | null;
    readonly originDocument: TextDocument;
    readonly scope: "workspace" | "origin-document";
  },
): SemanticRuntimeReadMapping<Location[] | null> {
  const mapped: Location[] = [];
  const failures: string[] = [];
  const originCanonical = canonicalDocumentUri(options.originDocument.uri).uri;

  for (const row of answer.value.rows) {
    const rowLabel = row.source?.label ?? `${row.referenceKind}:${row.name}`;
    const source = semanticExactSourceReference(row.source);
    if (source == null) {
      failures.push(`Reference ${rowLabel} has no exact authored source span.`);
      continue;
    }
    const uri = semanticSourceReferenceUri(source, options.workspaceRoot);
    if (uri == null) {
      failures.push(`Reference ${rowLabel} cannot be resolved to a workspace document.`);
      continue;
    }
    const canonical = canonicalDocumentUri(uri).uri;
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
      guessLanguage(canonical),
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
    readonly workspaceRoot: string | null;
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
  const uri = semanticSourceReferenceUri(source, options.workspaceRoot);
  if (uri == null) {
    return null;
  }
  if (canonicalDocumentUri(uri).uri !== canonicalDocumentUri(options.originDocument.uri).uri) {
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
    readonly workspaceRoot: string | null;
    readonly originDocument: TextDocument;
  },
): SemanticRuntimeRenameEditMapping {
  if (answer.value.status !== "available" || answer.value.edits.length === 0) {
    return { edit: null, failures: ["The rename answer carries no applicable edits."] };
  }
  return mapSemanticRuntimeWorkspaceEditRows(answer.value.edits, {
    workspaceRoot: options.workspaceRoot,
    originDocument: options.originDocument,
    lookupDocumentSnapshot,
    emptyFailure: "No rename edit rows could be mapped.",
  });
}

function mapSemanticRuntimeWorkspaceEditRows(
  rows: readonly SemanticRuntimeWorkspaceEditRow[],
  options: {
    readonly workspaceRoot: string | null;
    readonly originDocument: TextDocument;
    readonly lookupDocumentSnapshot: LookupDocumentSnapshotFn;
    readonly emptyFailure: string;
  },
): SemanticRuntimeRenameEditMapping {
  const documentChanges = new Map<string, {
    textDocument: { uri: string; version: number | null };
    edits: { range: Range; newText: string }[];
  }>();
  const failures: string[] = [];
  const originCanonical = canonicalDocumentUri(options.originDocument.uri).uri;

  for (const row of rows) {
    const rowLabel = row.source?.label ?? `${row.oldText ?? "?"} -> ${row.newText}`;
    const source = semanticExactSourceReference(row.source);
    if (source == null) {
      failures.push(`Edit ${rowLabel} has no exact authored source span.`);
      continue;
    }
    const uri = semanticSourceReferenceUri(source, options.workspaceRoot);
    if (uri == null) {
      failures.push(`Edit ${rowLabel} cannot be resolved to a workspace document.`);
      continue;
    }
    const canonical = canonicalDocumentUri(uri).uri;
    const snapshot = canonical === originCanonical
      ? snapshotForDocument(options.originDocument)
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
    bucket.edits.push({ range, newText: row.newText });
    documentChanges.set(canonical, bucket);
  }

  if (failures.length > 0) {
    return { edit: null, failures };
  }
  return documentChanges.size === 0
    ? { edit: null, failures: [options.emptyFailure] }
    : { edit: { documentChanges: [...documentChanges.values()] }, failures: [] };
}

export function mapSemanticRuntimeTemplateCodeActions(
  answer: SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>,
  lookupDocumentSnapshot: LookupDocumentSnapshotFn,
  options: {
    readonly workspaceRoot: string | null;
    readonly originDocument: TextDocument;
    readonly diagnostics?: readonly Diagnostic[];
    readonly onMappingFailure?: (
      row: SemanticTemplateCodeActionsResult["rows"][number],
      failures: readonly string[],
    ) => void;
  },
): CodeAction[] | null {
  const actions: CodeAction[] = [];
  for (const row of answer.value.rows) {
    const mapping = mapSemanticRuntimeWorkspaceEditRows(row.edits, {
      workspaceRoot: options.workspaceRoot,
      originDocument: options.originDocument,
      lookupDocumentSnapshot,
      emptyFailure: `Code action '${row.title}' has no mapped edit rows.`,
    });
    if (mapping.edit == null) {
      options.onMappingFailure?.(row, mapping.failures);
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
          actionIdentity: semanticRuntimeTemplateCodeActionIdentity(row),
        },
      },
    });
  }
  return actions.length === 0 ? null : actions;
}

export function mapSemanticRuntimeUnresolvedTemplateCodeActions(
  answer: SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>,
  lookupDocumentSnapshot: LookupDocumentSnapshotFn,
  options: {
    readonly workspaceRoot: string | null;
    readonly originDocument: TextDocument;
    readonly position: { readonly line: number; readonly character: number };
    readonly diagnostics?: readonly Diagnostic[];
    readonly onMappingFailure?: (
      row: SemanticTemplateCodeActionsResult["rows"][number],
      failures: readonly string[],
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
  ) {
    return null;
  }
  return resolve as TemplateCodeActionResolveData;
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

function snapshotForDocument(document: TextDocument): LspDocumentSnapshot {
  return {
    uri: canonicalDocumentUri(document.uri).uri,
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
