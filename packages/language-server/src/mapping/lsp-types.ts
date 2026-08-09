/**
 * Type mapping utilities: semantic-runtime types -> LSP types
 *
 * This is the Boundary 5 conversion layer. All workspace types are
 * converted to LSP wire format here.
 */
import {
  CodeActionKind,
  CompletionItemKind,
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
  canonicalTypeSystemPath,
  diagnosticRepairAffordanceForSuggestion,
  semanticExactSourceReference,
  SemanticRuntimeAnswerResult,
} from "@aurelia-ls/semantic-runtime";
import type { DocumentUri, WorkspaceDocumentUris } from "../utils/document-uri.js";
import { languageIdForSource } from "../utils/document-kind.js";
import {
  AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA,
  type TemplateCodeActionResolveData,
} from "../protocol.js";
import { stableDigest } from "../utils/stable-digest.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferencePath,
  semanticSourceReferenceUri,
} from "./source-locations.js";
import type { SemanticRuntimeLspDocumentSnapshot } from "../runtime/semantic-runtime-session.js";

export type LookupTextFn = (uri: DocumentUri) => string | null;
export type LookupDocumentSnapshotFn = (
  uri: DocumentUri,
) => SemanticRuntimeLspDocumentSnapshot | null;

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
      severity: DiagnosticSeverity.Error,
      code: row.diagnosticKind,
      source: "aurelia",
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
        const relatedMapping = semanticRuntimeDiagnosticRelatedInformation(row, document, documentUris, lookupText);
        relatedInformation.push(...relatedMapping.value);
        failures.push(...relatedMapping.failures);
      }
      const diagnosticMapping = semanticRuntimeDiagnostic(
        rows[group.primary.rowIndex] ?? null,
        document,
        documentUris,
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
    const diagnosticMapping = semanticRuntimeDiagnostic(row, document, documentUris, lookupText, []);
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
  documentUris: WorkspaceDocumentUris,
  lookupText: LookupTextFn | null,
  relatedInformation: DiagnosticRelatedInformation[],
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
  return semanticRuntimeRelatedInformationForSource(row.source, row.summary, document, documentUris, lookupText);
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
): Record<string, unknown> {
  return { semanticRuntime: semanticRuntimeDetachedDiagnosticData(row) };
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

  const items: CompletionItem[] = [];
  const failures: string[] = [];
  for (const candidate of answer.value.candidates) {
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
    items.push(mapSemanticRuntimeTemplateCompletionCandidate(candidate, range));
  }
  // LSP's isIncomplete flag asks the client to requery an intentionally narrowed list after further typing.
  // The session drains transport pages, and semantic coverage is an independent epistemic axis.
  return failures.length > 0
    ? { value: null, failures }
    : { value: { isIncomplete: false, items }, failures: [] };
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

  const value = answer.value;
  let selectedExpressionText: string | null = null;
  if (value.selectedExpression != null) {
    const expression = value.selectedExpression;
    if (
      value.selectedMember != null
      || value.selectedMemberName != null
      || value.memberOwnerType != null
    ) {
      return {
        value: null,
        failures: ["Hover cannot select both a member and a bare expression."],
      };
    }
    const activeSource = semanticExactSourceReference(value.activeSource);
    const expressionSource = semanticExactSourceReference(expression.source);
    if (activeSource == null || expressionSource == null) {
      return {
        value: null,
        failures: ["Hover selected expression source has no exact authored span."],
      };
    }
    const expressionSourceUri = semanticSourceReferenceUri(expressionSource, options.documentUris);
    if (
      expressionSourceUri == null
      || !options.documentUris.sameDocument(expressionSourceUri, options.originDocument.uri)
    ) {
      return {
        value: null,
        failures: ["Hover selected expression source does not target the requesting document."],
      };
    }
    if (!sameExactSourceReference(activeSource, expressionSource, options.documentUris)) {
      return {
        value: null,
        failures: ["Hover selected expression source does not match the active authored range."],
      };
    }
    const expressionRange = semanticSourceRangeForDocument(expressionSource, options.originDocument);
    if (expressionRange == null) {
      return {
        value: null,
        failures: ["Hover selected expression source is outside the current document text."],
      };
    }
    selectedExpressionText = options.originDocument.getText(expressionRange);
    if (expression.expressionKind !== "AccessThis" || selectedExpressionText !== "$this") {
      return {
        value: null,
        failures: ["Hover selected expression is not the exact authored current-context `$this` token."],
      };
    }
    if (expression.openKind == null && expression.typeDisplay == null) {
      return {
        value: null,
        failures: ["Hover selected expression is closed but has no type display."],
      };
    }
    if (
      expression.openKind != null
      && !value.missingInputs.includes(`selected-expression-type:${expression.openKind}`)
    ) {
      return {
        value: null,
        failures: ["Hover selected expression is open without matching analysis pressure."],
      };
    }
  }
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
      value.memberOwnerType?.origin == null ? null : `owner origin: \`${value.memberOwnerType.origin}\``,
      value.selectedMember?.isReadonly === true ? "readonly" : null,
      value.selectedMember?.isOptional === true ? "optional" : null,
    ].filter((part): part is string => part != null);
    if (details.length > 0) {
      lines.push("", details.join("  \n"));
    }
  }

  if (value.selectedExpression != null) {
    const expression = value.selectedExpression;
    addSectionBreak(lines);
    lines.push(`**Expression** \`${escapeMarkdownCode(selectedExpressionText ?? "$this")}\``);
    if (expression.typeDisplay != null) {
      lines.push("", "```ts", `${selectedExpressionText ?? "$this"}: ${expression.typeDisplay}`, "```");
    } else {
      lines.push("", "type: unavailable");
    }
    const details = [
      expression.typeShapeKind == null ? null : `type shape: \`${expression.typeShapeKind}\``,
      expression.typeOrigin == null ? null : `type origin: \`${expression.typeOrigin}\``,
      expression.openKind == null ? null : `analysis: \`${expression.openKind}\``,
    ].filter((part): part is string => part != null);
    if (details.length > 0) {
      lines.push("", details.join("  \n"));
    }
    if (expression.openReason != null) {
      lines.push("", expression.openReason);
    }
  }

  if (value.selectedBindable != null) {
    addSectionBreak(lines);
    lines.push(
      `**Bindable** \`${value.selectedBindable.attribute}\``,
      "",
      `name: \`${value.selectedBindable.name}\`  `,
      value.selectedBindable.valueType == null
        ? "type: unavailable  "
        : `type: \`${escapeMarkdownCode(value.selectedBindable.valueType)}\`  `,
      `mode: \`${value.selectedBindable.mode}\``,
    );
    if (value.selectedBindable.nullable != null) {
      lines.push(`nullable: \`${String(value.selectedBindable.nullable)}\``);
    }
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
    for (const diagnostic of value.diagnostics) {
      addSectionBreak(lines);
      const code = diagnostic.frameworkErrorCode
        ?? (diagnostic.typeScriptDiagnosticCode == null ? null : `TS${diagnostic.typeScriptDiagnosticCode}`)
        ?? diagnostic.diagnosticKind;
      lines.push(
        `**${diagnostic.severity}: ${code}**`,
        "",
        diagnostic.summary,
      );
    }
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
    return { value: null, failures: [] };
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

  return {
    value: {
      contents: { kind: "markdown", value: content },
      range,
    },
    failures: [],
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
  return value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
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
    const mapping = mapSemanticRuntimeWorkspaceEditRows(row.edits, {
      documentUris: options.documentUris,
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
    readonly documentUris: WorkspaceDocumentUris;
    readonly originDocument: TextDocument;
    readonly position: { readonly line: number; readonly character: number };
    readonly only?: readonly CodeActionKind[];
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
