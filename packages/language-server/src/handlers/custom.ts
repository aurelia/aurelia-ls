/**
 * Custom Aurelia request handlers for VS Code-facing semantic-runtime facades.
 *
 * Each handler is wrapped in try/catch to prevent exceptions from destabilizing
 * the LSP connection. Errors are logged and graceful fallbacks are returned.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CancellationToken, Position, WorkspaceEdit } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import type {
  SemanticResourceDefinitionRow,
  SemanticResourceVisibilityRow,
  SemanticAppDiagnosticRow,
  SemanticAppDiagnosticsResult,
  SemanticDiagnosticPresentationResult,
  SemanticSourceReference,
  SemanticTemplateCompilationRow,
  SemanticTemplateCursorInfoResult,
} from "@aurelia-ls/semantic-runtime";
import {
  diagnosticRepairAffordanceForSuggestion,
  semanticExactSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import type {
  DiagnosticActionability,
  DiagnosticCategory,
  DiagnosticImpact,
  DiagnosticSeverity,
  DiagnosticStatus,
  DiagnosticsSnapshotBundle,
  DiagnosticsSnapshotItem,
  DiagnosticsSnapshotPresentation,
  DiagnosticsSnapshotPresentationGroup,
  DiagnosticsSnapshotPresentationItem,
  DiagnosticsSnapshotRelated,
  DiagnosticsSnapshotResponse,
  SourceSpan,
  WorkspaceStatusResponse,
} from "../protocol.js";
import { canonicalDocumentUri } from "../utils/document-uri.js";
import { buildCapabilities, buildCapabilitiesFallback, type CapabilitiesResponse } from "../capabilities.js";
import {
  mapSemanticRuntimeTemplateRenameEdit,
  semanticRuntimeDiagnosticCode,
  semanticRuntimeDiagnosticSnapshotData,
} from "../mapping/lsp-types.js";
import {
  semanticSourceReferenceFilePath,
  semanticSourceReferencePath,
} from "../mapping/source-locations.js";
import {
  logIfSemanticRuntimeRequestAborted,
  semanticRuntimeRequestGuard,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";

type ResourceOrigin = "builtin" | "source" | "external" | string;

type MaybeUriParam = { uri?: string } | string | null;

function uriFromParam(params: MaybeUriParam): string | undefined {
  if (typeof params === "string") return params;
  if (params && typeof params === "object" && typeof params.uri === "string") return params.uri;
  return undefined;
}

function formatError(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  return String(e);
}

function serializeRuntimeDiagnosticsSnapshot(
  workspaceRoot: string | null,
  result: SemanticAppDiagnosticsResult,
): DiagnosticsSnapshotBundle {
  const rows = result.rows;
  const presentation = result.presentation;
  const raw = rows.map((row) => toRuntimeSnapshotItem(workspaceRoot, row));
  return {
    bySurface: {
      lsp: presentation == null
        ? raw
        : presentation.groups.flatMap((group) => {
          const row = rowAt(rows, group.primary.rowIndex);
          return row == null ? [] : [toRuntimeSnapshotItem(workspaceRoot, row, "primary")];
        }),
    },
    raw,
    ...(presentation == null ? {} : { presentation: runtimeDiagnosticsPresentation(workspaceRoot, rows, presentation) }),
  };
}

function toRuntimeSnapshotItem(
  workspaceRoot: string | null,
  row: SemanticAppDiagnosticRow,
  status: DiagnosticStatus = "canonical",
): DiagnosticsSnapshotItem {
  const file = semanticSourceReferenceFilePath(row.source, workspaceRoot) ?? undefined;
  const span = sourceSpanForSource(row.source);
  const code = semanticRuntimeDiagnosticCode(row);
  return {
    code,
    message: row.summary,
    severity: runtimeDiagnosticSeverity(row.severity),
    impact: runtimeDiagnosticImpact(row.severity),
    actionability: diagnosticRepairAffordanceForSuggestion(row.suggestion).actionability,
    category: runtimeDiagnosticCategory(row),
    status,
    source: `semantic-runtime:${row.diagnosticDomain}`,
    uri: file == null ? undefined : pathToFileURL(file).toString(),
    span,
    data: semanticRuntimeDiagnosticSnapshotData(row),
    related: runtimeDiagnosticRelatedInformation(workspaceRoot, row.relatedInformation),
    surfaces: ["lsp", "vscode-panel"],
    issues: [
      {
        kind: row.diagnosticKind,
        message: row.summary,
        code,
        rawCode: row.frameworkRawErrorAuthority ?? undefined,
      },
    ],
  };
}

function runtimeDiagnosticRelatedInformation(
  workspaceRoot: string | null,
  relatedInformation: NonNullable<SemanticAppDiagnosticRow["relatedInformation"]>,
): readonly DiagnosticsSnapshotRelated[] {
  return relatedInformation.map((related): DiagnosticsSnapshotRelated => {
    const file = semanticSourceReferenceFilePath(related.source, workspaceRoot) ?? undefined;
    const span = sourceSpanForSource(related.source);
    return {
      ...(related.code == null ? {} : { code: related.code }),
      message: related.message,
      ...(file == null ? {} : { uri: pathToFileURL(file).toString() }),
      ...(span == null ? {} : { span }),
      ...(related.sourceRole == null ? {} : { sourceRole: related.sourceRole }),
      ...(related.relationKind == null ? {} : { relationKind: related.relationKind }),
    };
  });
}

function runtimeDiagnosticsPresentation(
  workspaceRoot: string | null,
  rows: readonly SemanticAppDiagnosticRow[],
  presentation: SemanticDiagnosticPresentationResult,
): DiagnosticsSnapshotPresentation {
  return {
    rawRowCount: presentation.rawRowCount,
    primaryCount: presentation.primaryCount,
    contextualCount: presentation.contextualCount,
    complete: presentation.complete,
    groups: presentation.groups.map((group): DiagnosticsSnapshotPresentationGroup => ({
      groupKey: group.groupKey,
      ...(group.subject == null ? {} : { subject: runtimeDiagnosticSubject(workspaceRoot, group.subject) }),
      primary: {
        rowId: group.primary.rowId,
        role: group.primary.role,
        ...(group.primary.relation == null ? {} : { relation: group.primary.relation }),
        diagnostic: runtimePresentationSnapshotItem(workspaceRoot, rows, group.primary.rowIndex, "primary"),
      },
      related: group.related.map((row): DiagnosticsSnapshotPresentationItem => ({
        rowId: row.rowId,
        role: row.role,
        ...(row.relation == null ? {} : { relation: row.relation }),
        diagnostic: runtimePresentationSnapshotItem(workspaceRoot, rows, row.rowIndex, "contextual"),
      })),
      rawRowCount: group.rawRowCount,
      primarySeverity: runtimeDiagnosticSeverity(group.primarySeverity),
      maxRawSeverity: runtimeDiagnosticSeverity(group.maxRawSeverity),
    })),
  };
}

function runtimePresentationSnapshotItem(
  workspaceRoot: string | null,
  rows: readonly SemanticAppDiagnosticRow[],
  rowIndex: number,
  status: DiagnosticStatus,
): DiagnosticsSnapshotItem | null {
  const row = rowAt(rows, rowIndex);
  return row == null ? null : toRuntimeSnapshotItem(workspaceRoot, row, status);
}

function rowAt<TRow>(rows: readonly TRow[], index: number): TRow | null {
  return Number.isInteger(index) && index >= 0 && index < rows.length
    ? rows[index] ?? null
    : null;
}

function runtimeDiagnosticSubject(
  workspaceRoot: string | null,
  subject: NonNullable<SemanticAppDiagnosticRow["subject"]>,
): NonNullable<DiagnosticsSnapshotPresentationGroup["subject"]> {
  const source = semanticExactSourceReference(subject.source);
  const file = semanticSourceReferenceFilePath(subject.source, workspaceRoot) ?? undefined;
  return {
    subjectKind: subject.subjectKind,
    subjectName: subject.subjectName,
    ...(file == null ? {} : { uri: pathToFileURL(file).toString() }),
    ...(source?.start == null || source.end == null
      ? {}
      : { span: { start: source.start, end: source.end } }),
  };
}

function runtimeDiagnosticSeverity(
  severity: SemanticAppDiagnosticRow["severity"],
): DiagnosticSeverity {
  return severity === "information" ? "info" : severity;
}

function runtimeDiagnosticImpact(
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

function runtimeDiagnosticCategory(row: SemanticAppDiagnosticRow): DiagnosticCategory {
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

function sourceSpanForSource(source: SemanticSourceReference | null): SourceSpan | undefined {
  const exact = semanticExactSourceReference(source);
  if (exact?.start == null || exact.end == null) {
    return undefined;
  }
  return {
    start: exact.start,
    end: exact.end,
  };
}

export async function handleGetDiagnostics(
  ctx: ServerContext,
  params: MaybeUriParam,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<DiagnosticsSnapshotResponse | null> {
  try {
    const uri = uriFromParam(params);
    if (!uri) return null;
    const canonical = canonicalDocumentUri(uri);
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const answer = await ctx.semanticRuntime.appDiagnostics(doc, guard);
    const diagnostics = serializeRuntimeDiagnosticsSnapshot(ctx.workspaceRoot, answer.value);
    return {
      uri: canonical.uri,
      answer: {
        schemaVersion: answer.schemaVersion,
        result: answer.result,
        selection: answer.selection,
        coverage: answer.coverage,
        summary: answer.summary,
        page: answer.page,
        ...(answer.analysisDepth == null ? {} : { analysisDepth: answer.analysisDepth }),
        ...(answer.continuations == null ? {} : { continuations: answer.continuations }),
      },
      diagnostics,
    };
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "getDiagnostics", e, uriFromParam(params))) {
      return null;
    }
    ctx.logger.error(`[getDiagnostics] failed: ${formatError(e)}`);
    return null;
  }
}

export type DumpStateResponse =
  | {
    workspaceRoot: string | null;
    fingerprint: string;
    openDocumentCount: number;
    engine: string;
    error?: undefined;
  }
  | {
    error: string;
    workspaceRoot?: undefined;
    fingerprint?: undefined;
    openDocumentCount?: undefined;
    engine?: undefined;
  };

export function handleDumpState(ctx: ServerContext): DumpStateResponse {
  try {
    return {
      workspaceRoot: ctx.workspaceRoot,
      fingerprint: `semantic-runtime:${ctx.workspaceRoot ?? "no-root"}:${ctx.documents.all().length}`,
      openDocumentCount: ctx.documents.all().length,
      engine: "semantic-runtime",
    };
  } catch (e) {
    ctx.logger.error(`[dumpState] failed: ${formatError(e)}`);
    return { error: formatError(e) };
  }
}

export type ResourceExplorerBindable = {
  name: string;
  attribute?: string;
  mode?: string;
  primary?: boolean;
  type?: string;
};

export type ResourceScope = "global" | "local" | "orphan";

export type ResourceExplorerItem = {
  name: string;
  kind: string;
  className?: string;
  file?: string;
  package?: string;
  bindableCount: number;
  bindables: ResourceExplorerBindable[];
  origin?: ResourceOrigin;
  scope: ResourceScope;
  scopeOwner?: string;
  declarationForm?: string;
};

export type ResourceExplorerResponse = {
  fingerprint: string;
  resources: ResourceExplorerItem[];
  templateCount: number;
  inlineTemplateCount: number;
};

export async function handleGetResources(
  ctx: ServerContext,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<ResourceExplorerResponse> {
  try {
    const [definitions, visibility, compilations] = await Promise.all([
      ctx.semanticRuntime.resourceDefinitions(guard),
      ctx.semanticRuntime.resourceVisibility(guard),
      ctx.semanticRuntime.templateCompilations(guard),
    ]);
    return buildRuntimeResourceExplorerResponse(
      ctx.workspaceRoot,
      definitions.value.rows,
      visibility.value.rows,
      compilations.value.rows,
    );
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "getResources", e)) {
      return { fingerprint: "", resources: [], templateCount: 0, inlineTemplateCount: 0 };
    }
    ctx.logger.error(`[getResources] failed: ${formatError(e)}`);
    return { fingerprint: "", resources: [], templateCount: 0, inlineTemplateCount: 0 };
  }
}

type ScopeEntry = { scope: ResourceScope; scopeOwner?: string };

const RESOURCE_EXPLORER_KIND_ORDER = [
  "custom-element",
  "template-controller",
  "custom-attribute",
  "value-converter",
  "binding-behavior",
] as const;

const RESOURCE_EXPLORER_KINDS = new Set<string>(RESOURCE_EXPLORER_KIND_ORDER);

function buildRuntimeResourceExplorerResponse(
  workspaceRoot: string | null,
  definitions: readonly SemanticResourceDefinitionRow[],
  visibility: readonly SemanticResourceVisibilityRow[],
  compilations: readonly SemanticTemplateCompilationRow[],
): ResourceExplorerResponse {
  const visibilityByResource = buildRuntimeVisibilityIndex(visibility);
  const resources = new Map<string, ResourceExplorerItem>();

  for (const definition of definitions) {
    if (definition.name == null || !RESOURCE_EXPLORER_KINDS.has(definition.resourceKind)) {
      continue;
    }
    const key = resourceExplorerKey(definition.resourceKind, definition.name);
    const source = definition.source ?? definition.targetSource;
    const scope = visibilityByResource.get(key) ?? { scope: "orphan" as const };
    resources.set(key, {
      name: definition.name,
      kind: definition.resourceKind,
      className: definition.targetName ?? undefined,
      file: semanticSourceReferenceFilePath(source, workspaceRoot) ?? undefined,
      package: packageNameForSource(source),
      bindableCount: definition.bindables.length,
      bindables: definition.bindables.map((bindable): ResourceExplorerBindable => ({
        name: bindable.name,
        attribute: bindable.attribute,
        mode: bindable.mode,
        type: bindable.valueType ?? undefined,
      })),
      origin: originForSource(source),
      scope: scope.scope,
      scopeOwner: scope.scopeOwner,
      declarationForm: definition.declarationModes.join(", ") || undefined,
    });
  }

  for (const row of visibility) {
    if (!RESOURCE_EXPLORER_KINDS.has(row.resourceKind)) {
      continue;
    }
    const key = resourceExplorerKey(row.resourceKind, row.name);
    if (resources.has(key)) {
      continue;
    }
    const scope = visibilityByResource.get(key) ?? { scope: "global" as const };
    resources.set(key, {
      name: row.name,
      kind: row.resourceKind,
      file: semanticSourceReferenceFilePath(row.source, workspaceRoot) ?? undefined,
      package: packageNameForSource(row.source),
      bindableCount: 0,
      bindables: [],
      origin: originForSource(row.source),
      scope: scope.scope,
      scopeOwner: scope.scopeOwner,
    });
  }

  const rows = [...resources.values()].sort(compareResourceExplorerItems);
  const appTemplateRows = compilations.filter((row) => row.compilationLane === "app-runtime");

  return {
    fingerprint: `semantic-runtime:${definitions.length}:${visibility.length}:${compilations.length}`,
    resources: rows,
    templateCount: countDistinct(
      appTemplateRows.map((row) => semanticSourceReferencePath(row.source) ?? row.definitionName),
    ),
    inlineTemplateCount: appTemplateRows.filter((row) => row.templateSourceKind.toLowerCase().includes("inline")).length,
  };
}

function buildRuntimeVisibilityIndex(
  rows: readonly SemanticResourceVisibilityRow[],
): Map<string, ScopeEntry> {
  const index = new Map<string, ScopeEntry>();
  for (const row of rows) {
    if (!RESOURCE_EXPLORER_KINDS.has(row.resourceKind)) {
      continue;
    }
    const key = resourceExplorerKey(row.resourceKind, row.name);
    const next = scopeEntryForVisibility(row);
    const current = index.get(key);
    if (current == null || (current.scope !== "global" && next.scope === "global")) {
      index.set(key, next);
    }
  }
  return index;
}

function scopeEntryForVisibility(row: SemanticResourceVisibilityRow): ScopeEntry {
  switch (row.visibilityKind) {
    case "app-root":
    case "configured":
    case "inherited":
      return { scope: "global" };
    case "local":
    case "routeable":
      return { scope: "local", scopeOwner: row.compilerWorld };
    case "open":
    default:
      return { scope: "orphan" };
  }
}

function compareResourceExplorerItems(left: ResourceExplorerItem, right: ResourceExplorerItem): number {
  const leftKind = RESOURCE_EXPLORER_KIND_ORDER.indexOf(left.kind as typeof RESOURCE_EXPLORER_KIND_ORDER[number]);
  const rightKind = RESOURCE_EXPLORER_KIND_ORDER.indexOf(right.kind as typeof RESOURCE_EXPLORER_KIND_ORDER[number]);
  if (leftKind !== rightKind) {
    return leftKind - rightKind;
  }
  return left.name.localeCompare(right.name);
}

function resourceExplorerKey(kind: string, name: string): string {
  return `${kind}:${name}`;
}

function countDistinct(values: readonly string[]): number {
  return new Set(values).size;
}

function originForSource(source: SemanticSourceReference | null): ResourceOrigin | undefined {
  if (isFrameworkCatalogSource(source)) {
    return "builtin";
  }
  return semanticSourceReferencePath(source) == null && source?.kind !== "external-address"
    ? undefined
    : "source";
}

function packageNameForSource(source: SemanticSourceReference | null): string | undefined {
  if (isFrameworkCatalogSource(source)) {
    return undefined;
  }
  const sourcePath = semanticSourceReferencePath(source);
  if (sourcePath == null) {
    return undefined;
  }
  return packageNameFromNodeModulesPath(sourcePath);
}

function isFrameworkCatalogSource(source: SemanticSourceReference | null): boolean {
  return source?.kind === "external-address" && source.scheme === "aurelia-package-catalog";
}

function packageNameFromNodeModulesPath(sourcePath: string): string | undefined {
  const parts = sourcePath.replace(/\\/g, "/").split("/");
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  if (nodeModulesIndex < 0 || nodeModulesIndex >= parts.length - 1) {
    return undefined;
  }
  const first = parts[nodeModulesIndex + 1];
  if (first == null) {
    return undefined;
  }
  if (first.startsWith("@")) {
    const second = parts[nodeModulesIndex + 2];
    return second == null ? undefined : `${first}/${second}`;
  }
  return first;
}

export type InspectEntityResponse = {
  uri: string;
  entityKind: string;
  confidence: {
    resource: string;
    type: string;
    scope: string;
    expression: string;
    composite: string;
  };
  expressionLabel?: string;
  exprId?: string | number;
  nodeId?: string | number;
  detail: Record<string, unknown>;
} | null;

export async function handleInspectEntity(
  ctx: ServerContext,
  params: { uri: string; position: Position },
  guard: SemanticRuntimeLspRequestGuard,
): Promise<InspectEntityResponse> {
  try {
    const uri = params?.uri;
    if (!uri || !params.position) return null;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const answer = await ctx.semanticRuntime.templateCursorInfo(
      doc,
      params.position,
      guard,
    );
    return inspectEntityFromCursorInfo(
      uri,
      `${answer.result}:${answer.selection}:${answer.coverage}`,
      answer.value,
    );
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "inspectEntity", e, params?.uri)) {
      return null;
    }
    ctx.logger.error(`[inspectEntity] failed for ${params?.uri}: ${formatError(e)}`);
    return null;
  }
}

function inspectEntityFromCursorInfo(
  uri: string,
  answerState: string,
  value: SemanticTemplateCursorInfoResult,
): InspectEntityResponse {
  const entityKind = inspectEntityKind(value);
  if (entityKind == null) {
    return null;
  }
  const detail = inspectEntityDetail(entityKind, value);
  const expressionLabel = value.selectedMemberName
    ?? value.valueSite?.rawValue
    ?? value.html.attributeValue
    ?? value.html.attributeName
    ?? value.html.tagName
    ?? undefined;
  return {
    uri,
    entityKind,
    confidence: {
      resource: value.selectedDefinition == null ? "not-selected" : "source-backed",
      type: value.selectedMember?.typeDisplay != null || value.memberOwnerType?.display != null ? "projected" : "not-projected",
      scope: value.selectedMember == null ? "not-selected" : "source-backed",
      expression: value.valueSite == null && value.expressionFrontier == null ? "not-selected" : "parsed",
      composite: answerState,
    },
    expressionLabel,
    detail,
  };
}

function inspectEntityKind(value: SemanticTemplateCursorInfoResult): string | null {
  if (value.selectedMember != null || value.selectedMemberName != null) {
    return "member";
  }
  if (value.selectedBindable != null) {
    return "bindable";
  }
  if (value.selectedDefinition != null) {
    return "resource";
  }
  if (value.valueSite != null) {
    return "value-site";
  }
  if (value.html.attributeName != null || value.html.tagName != null) {
    return "html";
  }
  if (value.diagnostics.length > 0) {
    return "diagnostic";
  }
  return value.siteKind == null || value.siteKind === "unknown" ? null : "template-site";
}

function inspectEntityDetail(
  entityKind: string,
  value: SemanticTemplateCursorInfoResult,
): Record<string, unknown> {
  const detail: Record<string, unknown> = {
    kind: entityKind,
    siteKind: value.siteKind,
    templateLane: value.template.compilationLane,
  };
  if (value.selectedDefinition != null) {
    detail.name = value.selectedDefinition.name;
    detail.resourceName = value.selectedDefinition.name;
    detail.resourceKind = value.selectedDefinition.resourceKind;
    detail.className = value.selectedDefinition.targetName;
    detail.resourceSource = value.selectedDefinition.source?.label ?? null;
  }
  if (value.selectedBindable != null) {
    detail.name = value.selectedBindable.name;
    detail.bindableProperty = value.selectedBindable.name;
    detail.bindableAttribute = value.selectedBindable.attribute;
    detail.bindableMode = value.selectedBindable.mode;
    detail.bindableSource = value.selectedBindable.source?.label ?? null;
  }
  if (value.selectedMember != null || value.selectedMemberName != null) {
    detail.name = value.selectedMemberName ?? value.selectedMember?.name ?? null;
    detail.symbolName = value.selectedMemberName ?? value.selectedMember?.name ?? null;
    detail.symbolKind = value.selectedMember?.memberKind ?? null;
    detail.symbolType = value.selectedMember?.typeDisplay ?? null;
    detail.memberReadonly = value.selectedMember?.isReadonly ?? null;
    detail.memberOptional = value.selectedMember?.isOptional ?? null;
    detail.memberSource = value.selectedMember?.source?.label ?? null;
  }
  if (value.memberOwnerType != null) {
    detail.ownerType = value.memberOwnerType.display;
    detail.ownerTypeShape = value.memberOwnerType.shapeKind;
    detail.ownerTypeOrigin = value.memberOwnerType.origin;
    detail.ownerTypeSource = value.memberOwnerType.declarationSource?.label ?? null;
  }
  if (value.valueSite != null) {
    detail.valueSiteKind = value.valueSite.siteKind;
    detail.rawValue = value.valueSite.rawValue;
    detail.bindingCommand = value.valueSite.bindingCommandName;
    detail.valueBindable = value.valueSite.bindableAttribute ?? value.valueSite.bindableName;
  }
  detail.htmlNodeKind = value.html.nodeKind;
  detail.htmlTag = value.html.tagName;
  detail.htmlAttribute = value.html.attributeName;
  if (value.html.attributeValue != null) {
    detail.htmlAttributeValue = value.html.attributeValue;
  }
  detail.diagnosticCount = value.diagnostics.length;
  const firstDiagnostic = value.diagnostics[0] ?? null;
  if (firstDiagnostic != null) {
    detail.firstDiagnosticKind = firstDiagnostic.diagnosticKind;
    detail.firstDiagnosticSeverity = firstDiagnostic.severity;
    detail.firstDiagnosticSummary = firstDiagnostic.summary;
  }
  if (value.missingInputs.length > 0) {
    detail.missingInputs = value.missingInputs;
  }
  return detail;
}

export type ScopeResourceItem = {
  name: string;
  kind: string;
  origin?: ResourceOrigin;
  className?: string;
  file?: string;
  package?: string;
  bindableCount: number;
  scope: "global" | "local";
};

export type ScopeResourcesResponse = {
  scopeId: string;
  scopeLabel?: string;
  resources: ScopeResourceItem[];
} | null;

export async function handleGetScopeResources(
  ctx: ServerContext,
  params: { uri: string },
  guard: SemanticRuntimeLspRequestGuard,
): Promise<ScopeResourcesResponse> {
  try {
    const uri = params?.uri;
    if (!uri) return null;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const filePath = URI.parse(uri).fsPath;
    const [compilations, visibility] = await Promise.all([
      ctx.semanticRuntime.templateCompilations(guard, filePath),
      ctx.semanticRuntime.resourceVisibility(guard),
    ]);
    const compilerWorlds = new Set(compilations.value.rows.map((row) => row.compilerWorld));
    if (compilerWorlds.size === 0) return null;
    const rows = visibility.value.rows.filter((row) => compilerWorlds.has(row.compilerWorld));
    const resources = scopeResourcesForVisibility(ctx.workspaceRoot, rows);
    const [scopeLabel] = compilerWorlds;
    return {
      scopeId: scopeLabel ?? "semantic-runtime",
      scopeLabel,
      resources,
    };
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "getScopeResources", e, params?.uri)) {
      return null;
    }
    ctx.logger.error(`[getScopeResources] failed: ${formatError(e)}`);
    return null;
  }
}

function scopeResourcesForVisibility(
  workspaceRoot: string | null,
  rows: readonly SemanticResourceVisibilityRow[],
): ScopeResourceItem[] {
  const resources = new Map<string, ScopeResourceItem>();
  for (const row of rows) {
    if (!RESOURCE_EXPLORER_KINDS.has(row.resourceKind)) {
      continue;
    }
    const key = resourceExplorerKey(row.resourceKind, row.name);
    if (resources.has(key)) {
      continue;
    }
    resources.set(key, {
      name: row.name,
      kind: row.resourceKind,
      origin: originForSource(row.source),
      file: semanticSourceReferenceFilePath(row.source, workspaceRoot) ?? undefined,
      package: packageNameForSource(row.source),
      bindableCount: 0,
      scope: scopeEntryForVisibility(row).scope === "global" ? "global" : "local",
    });
  }
  return [...resources.values()].sort((left, right) => compareResourceExplorerItems(
    { ...left, bindables: [] },
    { ...right, bindables: [] },
  ));
}

export function handleCapabilities(ctx: ServerContext): CapabilitiesResponse {
  try {
    return buildCapabilities(ctx);
  } catch (e) {
    ctx.logger.error(`[capabilities] failed: ${formatError(e)}`);
    return buildCapabilitiesFallback();
  }
}

export async function handleWorkspaceStatus(
  ctx: ServerContext,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<WorkspaceStatusResponse | null> {
  try {
    return await ctx.semanticRuntime.workspaceSummary(guard);
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "workspaceStatus", e)) {
      return null;
    }
    ctx.logger.error(`[workspaceStatus] failed: ${formatError(e)}`);
    return null;
  }
}

// ============================================================================
// TS-side rename → template propagation
// ============================================================================

export type RenameFromTsParams = {
  uri: string;
  position: Position;
  newName: string;
};

export type RenameFromTsResponse = {
  status: "success";
  /** Template-side edits only (TS edits come from the built-in TS rename). */
  workspaceEdit: WorkspaceEdit;
  message: string;
  templateReferenceCount: number;
  candidateCount: number;
} | {
  status: "not-applicable";
  reason: string;
  message: string;
  templateReferenceCount: number;
  candidateCount: number;
} | {
  status: "refused";
  reason: string;
  message: string;
  templateReferenceCount: number;
  candidateCount: number;
} | {
  status: "blocked";
  reason: string;
  message: string;
  failures?: readonly string[];
  templateReferenceCount?: number;
  candidateCount?: number;
};

export async function handleRenameFromTs(
  ctx: ServerContext,
  params: RenameFromTsParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<RenameFromTsResponse> {
  try {
    if (!params?.uri || !params.position || !params.newName) {
      return renameFromTsBlocked("invalid-request", "Aurelia template rename propagation requires a URI, position, and new name.");
    }

    const canonical = canonicalDocumentUri(params.uri);
    const doc = ctx.ensureProgramDocument(params.uri);
    if (!doc) {
      return renameFromTsBlocked("document-unavailable", "Aurelia template rename propagation could not read the TypeScript document.");
    }
    const answer = await ctx.semanticRuntime.templateRenameFromTypeScript(
      doc,
      params.position,
      guard,
      params.newName,
    );
    const templateReferenceCount = answer.value.templateReferenceCount;
    const candidateCount = answer.value.candidateRows.length;
    if (answer.value.status !== "available") {
      const reason = answer.value.reason ?? answer.value.status;
      const message = answer.value.displayText || answer.summary;
      ctx.logger.info(`[renameFromTs] template propagation refused for ${canonical.path}: ${reason}`);
      return {
        status: answer.value.status === "invalid-name" ? "refused" : "not-applicable",
        reason,
        message,
        templateReferenceCount,
        candidateCount,
      };
    }
    if (answer.value.edits.length === 0) {
      ctx.logger.info(`[renameFromTs] no cross-domain edits for ${canonical.path}`);
      return {
        status: "not-applicable",
        reason: candidateCount > 0 ? "unverified-candidates-only" : "no-template-edits",
        message: answer.value.displayText || answer.summary,
        templateReferenceCount,
        candidateCount,
      };
    }
    const mapping = mapSemanticRuntimeTemplateRenameEdit(answer, (uri) => ctx.lookupDocumentSnapshot(uri), {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (mapping.edit == null) {
      ctx.logger.warn(`[renameFromTs] template edit mapping was blocked: ${mapping.failures.join(" ")}`);
      return renameFromTsBlocked(
        "mapping-failed",
        `Aurelia template rename propagation was blocked: ${mapping.failures.join(" ")}`,
        mapping.failures,
        templateReferenceCount,
        candidateCount,
      );
    }

    const fileCount = new Set((mapping.edit.documentChanges ?? [])
      .filter((change) => "textDocument" in change)
      .map((change) => change.textDocument.uri)).size;

    if (fileCount > 0) {
      ctx.logger.info(`[renameFromTs] propagating to ${fileCount} template(s), ${templateReferenceCount} runtime reference(s)`);
    }
    return fileCount
      ? {
        status: "success",
        workspaceEdit: mapping.edit,
        message: answer.value.displayText || answer.summary,
        templateReferenceCount,
        candidateCount,
      }
      : {
        status: "not-applicable",
        reason: "no-template-edits",
        message: answer.value.displayText || answer.summary,
        templateReferenceCount,
        candidateCount,
      };
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "renameFromTs", e, params?.uri)) {
      const reason = e.reason === "cancelled" ? "request-cancelled" : "request-stale";
      return renameFromTsBlocked(
        reason,
        `Aurelia template rename propagation was skipped because the request was ${e.reason}.`,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    ctx.logger.error(`[renameFromTs] ${msg}${stack ? `\n${stack}` : ""}`);
    return renameFromTsBlocked("server-error", `Aurelia template rename propagation failed: ${msg}`);
  }
}

function renameFromTsBlocked(
  reason: string,
  message: string,
  failures?: readonly string[],
  templateReferenceCount?: number,
  candidateCount?: number,
): RenameFromTsResponse {
  return {
    status: "blocked",
    reason,
    message,
    ...(failures == null ? {} : { failures }),
    ...(templateReferenceCount == null ? {} : { templateReferenceCount }),
    ...(candidateCount == null ? {} : { candidateCount }),
  };
}

export async function handleGetRelatedFile(
  ctx: ServerContext,
  params: { uri: string },
  guard: SemanticRuntimeLspRequestGuard,
): Promise<{ uri: string; kind: "template" | "component" } | null> {
  try {
    const uri = params?.uri;
    if (!uri) return null;
    const filePath = URI.parse(uri).fsPath;
    const definitions = await ctx.semanticRuntime.resourceDefinitions(guard);
    const requested = normalizedFilePath(filePath);
    for (const definition of definitions.value.rows) {
      if (definition.resourceKind !== "custom-element") {
        continue;
      }
      const componentFile = semanticSourceReferenceFilePath(
        definition.targetSource ?? definition.source,
        ctx.workspaceRoot,
      ) ?? undefined;
      const templateFile = semanticSourceReferenceFilePath(
        definition.template?.source ?? null,
        ctx.workspaceRoot,
      ) ?? undefined;
      if (componentFile == null || templateFile == null) {
        continue;
      }
      if (normalizedFilePath(componentFile) === normalizedFilePath(templateFile)) {
        continue;
      }
      if (normalizedFilePath(templateFile) === requested) {
        return { uri: pathToFileURL(componentFile).toString(), kind: "component" };
      }
      if (normalizedFilePath(componentFile) === requested) {
        return { uri: pathToFileURL(templateFile).toString(), kind: "template" };
      }
    }
    return null;
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "getRelatedFile", e, params?.uri)) {
      return null;
    }
    ctx.logger.error(`[getRelatedFile] failed: ${formatError(e)}`);
    return null;
  }
}

function normalizedFilePath(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}

/**
 * Registers all custom Aurelia request handlers on the connection.
 */
export function registerCustomHandlers(ctx: ServerContext): void {
  ctx.connection.onRequest("aurelia/getDiagnostics", (params: MaybeUriParam, token: CancellationToken) =>
    handleGetDiagnostics(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRequest<DumpStateResponse, unknown>("aurelia/dumpState", () => handleDumpState(ctx));
  ctx.connection.onRequest("aurelia/getResources", (token: CancellationToken) =>
    handleGetResources(ctx, requestGuard(ctx, token)));
  ctx.connection.onRequest("aurelia/inspectEntity", (params: { uri: string; position: Position }, token: CancellationToken) =>
    handleInspectEntity(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRequest("aurelia/getScopeResources", (params: { uri: string }, token: CancellationToken) =>
    handleGetScopeResources(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRequest("aurelia/getRelatedFile", (params: { uri: string }, token: CancellationToken) =>
    handleGetRelatedFile(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRequest("aurelia/workspaceStatus", (_params: unknown, token: CancellationToken) =>
    handleWorkspaceStatus(ctx, requestGuard(ctx, token)));
  ctx.connection.onRequest("aurelia/capabilities", () => handleCapabilities(ctx));
  ctx.connection.onRequest("aurelia/renameFromTs", (params: RenameFromTsParams, token: CancellationToken) =>
    handleRenameFromTs(ctx, params, requestGuard(ctx, token)));
}

function requestGuard(ctx: ServerContext, token: CancellationToken | undefined): SemanticRuntimeLspRequestGuard {
  return semanticRuntimeRequestGuard(ctx, token);
}
