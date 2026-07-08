/**
 * Custom Aurelia request handlers for VS Code-facing semantic-runtime facades.
 *
 * Each handler is wrapped in try/catch to prevent exceptions from destabilizing
 * the LSP connection. Errors are logged and graceful fallbacks are returned.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Position } from "vscode-languageserver/node.js";
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
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import { canonicalDocumentUri } from "../utils/document-uri.js";
import { buildCapabilities, buildCapabilitiesFallback, type CapabilitiesResponse } from "../capabilities.js";
import { mapSemanticRuntimeTemplateRenameEdit, semanticRuntimeDiagnosticCode } from "../mapping/lsp-types.js";

type DiagnosticSeverity = "error" | "warning" | "info" | "hint";
type DiagnosticImpact = "blocking" | "degraded" | "informational";
type DiagnosticActionability = "guided" | "manual" | "none";
type DiagnosticCategory =
  | "expression"
  | "template-syntax"
  | "resource-resolution"
  | "bindable-validation"
  | "project";
type DiagnosticStatus = "canonical" | "primary" | "contextual" | "suppressed" | "experimental";
type DiagnosticStage = string;
type DiagnosticSurface = "lsp" | "vscode-panel" | "ci" | string;
type ResourceOrigin = "builtin" | "source" | "external" | string;
type SourceSpan = { start: number; end: number };

type MaybeUriParam = { uri?: string } | string | null;

type DiagnosticsSnapshotRelated = {
  code?: string;
  message: string;
  uri?: string;
  span?: SourceSpan;
  sourceRole?: string;
};

type DiagnosticsSnapshotIssue = {
  kind: string;
  message: string;
  code?: string;
  rawCode?: string;
  field?: string;
};

type DiagnosticsSnapshotItem = {
  code: string;
  message: string;
  severity?: DiagnosticSeverity;
  impact?: DiagnosticImpact;
  actionability?: DiagnosticActionability;
  category?: DiagnosticCategory;
  status?: DiagnosticStatus;
  stage?: DiagnosticStage;
  source?: string;
  uri?: string;
  span?: SourceSpan;
  data?: Readonly<Record<string, unknown>>;
  related?: readonly DiagnosticsSnapshotRelated[];
  surfaces?: readonly DiagnosticSurface[];
  suppressed?: boolean;
  suppressionReason?: string;
  issues?: readonly DiagnosticsSnapshotIssue[];
};

type DiagnosticsSnapshotBundle = {
  bySurface: Record<string, readonly DiagnosticsSnapshotItem[]>;
  raw: readonly DiagnosticsSnapshotItem[];
  presentation?: DiagnosticsSnapshotPresentation;
  suppressed: readonly DiagnosticsSnapshotItem[];
};

type DiagnosticsSnapshotPresentation = {
  rawRowCount: number;
  primaryCount: number;
  contextualCount: number;
  complete: boolean;
  groups: readonly DiagnosticsSnapshotPresentationGroup[];
};

type DiagnosticsSnapshotPresentationGroup = {
  groupKey: string;
  subject?: {
    subjectKind: string;
    uri?: string;
    span?: SourceSpan;
  };
  primary: DiagnosticsSnapshotPresentationItem;
  related: readonly DiagnosticsSnapshotPresentationItem[];
  rawRowCount: number;
  primarySeverity: DiagnosticSeverity;
  maxRawSeverity: DiagnosticSeverity;
};

type DiagnosticsSnapshotPresentationItem = {
  rowId: string;
  role: "primary" | "contextual";
  relation?: string;
  diagnostic: DiagnosticsSnapshotItem | null;
};

type DiagnosticsSnapshotResponse = {
  uri: string;
  fingerprint: string;
  diagnostics: DiagnosticsSnapshotBundle;
};

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
    suppressed: [],
  };
}

function toRuntimeSnapshotItem(
  workspaceRoot: string | null,
  row: SemanticAppDiagnosticRow,
  status: DiagnosticStatus = "canonical",
): DiagnosticsSnapshotItem {
  const file = filePathForSource(workspaceRoot, row.source);
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
    data: {
      semanticRuntime: true,
      diagnosticDomain: row.diagnosticDomain,
      diagnosticKind: row.diagnosticKind,
      diagnosticAuthority: row.diagnosticAuthority,
      frameworkErrorCode: row.frameworkErrorCode,
      relatedQueryKind: row.relatedQueryKind,
      missingInput: row.missingInput ?? null,
      missingInputs: row.missingInputs ?? [],
      subject: row.subject ?? null,
      suggestion: row.suggestion ?? null,
      repairAffordance: diagnosticRepairAffordanceForSuggestion(row.suggestion),
    },
    related: runtimeDiagnosticRelatedInformation(workspaceRoot, row.relatedInformation ?? []),
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
    const file = filePathForSource(workspaceRoot, related.source);
    const span = sourceSpanForSource(related.source);
    return {
      ...(related.code == null ? {} : { code: related.code }),
      message: related.message,
      ...(file == null ? {} : { uri: pathToFileURL(file).toString() }),
      ...(span == null ? {} : { span }),
      ...(related.sourceRole == null ? {} : { sourceRole: related.sourceRole }),
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
  const file = filePathForSource(workspaceRoot, subject.source);
  return {
    subjectKind: subject.subjectKind,
    ...(file == null ? {} : { uri: pathToFileURL(file).toString() }),
    ...(subject.source?.start == null || subject.source.end == null
      ? {}
      : { span: { start: subject.source.start, end: subject.source.end } }),
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
  if (source?.start == null || source.end == null) {
    return undefined;
  }
  return {
    start: source.start,
    end: source.end,
  };
}

export async function handleGetDiagnostics(
  ctx: ServerContext,
  params: MaybeUriParam,
): Promise<DiagnosticsSnapshotResponse | null> {
  try {
    const uri = uriFromParam(params);
    if (!uri) return null;
    const canonical = canonicalDocumentUri(uri);
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const answer = await ctx.semanticRuntime.appDiagnostics(doc);
    const diagnostics = serializeRuntimeDiagnosticsSnapshot(ctx.workspaceRoot, answer.value);
    const fingerprint = `semantic-runtime:${answer.outcome}`;
    return { uri: canonical.uri, fingerprint, diagnostics };
  } catch (e) {
    ctx.logger.error(`[getDiagnostics] failed: ${formatError(e)}`);
    return null;
  }
}

export function handleDumpState(ctx: ServerContext) {
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

export async function handleGetResources(ctx: ServerContext): Promise<ResourceExplorerResponse> {
  try {
    const [definitions, visibility, compilations] = await Promise.all([
      ctx.semanticRuntime.resourceDefinitions(),
      ctx.semanticRuntime.resourceVisibility(),
      ctx.semanticRuntime.templateCompilations(),
    ]);
    return buildRuntimeResourceExplorerResponse(
      ctx.workspaceRoot,
      definitions.value.rows,
      visibility.value.rows,
      compilations.value.rows,
    );
  } catch (e) {
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
      file: filePathForSource(workspaceRoot, source),
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
      file: filePathForSource(workspaceRoot, row.source),
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
      appTemplateRows.map((row) => sourceReferencePath(row.source) ?? row.definitionName),
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
  return sourceReferencePath(source) == null && source?.kind !== "external-address"
    ? undefined
    : "source";
}

function packageNameForSource(source: SemanticSourceReference | null): string | undefined {
  if (isFrameworkCatalogSource(source)) {
    return undefined;
  }
  const sourcePath = sourceReferencePath(source);
  if (sourcePath == null) {
    return undefined;
  }
  return packageNameFromNodeModulesPath(sourcePath);
}

function filePathForSource(
  workspaceRoot: string | null,
  source: SemanticSourceReference | null,
): string | undefined {
  const sourcePath = sourceReferencePath(source);
  if (sourcePath == null) {
    return undefined;
  }
  if (sourcePath.startsWith("file://")) {
    return URI.parse(sourcePath).fsPath;
  }
  if (path.isAbsolute(sourcePath)) {
    return sourcePath;
  }
  return workspaceRoot == null ? sourcePath : path.resolve(workspaceRoot, sourcePath);
}

function sourceReferencePath(source: SemanticSourceReference | null): string | null {
  if (source == null) {
    return null;
  }
  return source.path ?? sourceReferencePath(source.anchor ?? null);
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
): Promise<InspectEntityResponse> {
  try {
    const uri = params?.uri;
    if (!uri || !params.position) return null;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const answer = await ctx.semanticRuntime.templateCursorInfo(doc, params.position);
    return inspectEntityFromCursorInfo(uri, answer.outcome, answer.value);
  } catch (e) {
    ctx.logger.error(`[inspectEntity] failed for ${params?.uri}: ${formatError(e)}`);
    return null;
  }
}

function inspectEntityFromCursorInfo(
  uri: string,
  outcome: string,
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
      composite: outcome,
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
): Promise<ScopeResourcesResponse> {
  try {
    const uri = params?.uri;
    if (!uri) return null;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const filePath = URI.parse(uri).fsPath;
    const [compilations, visibility] = await Promise.all([
      ctx.semanticRuntime.templateCompilations(filePath),
      ctx.semanticRuntime.resourceVisibility(),
    ]);
    const compilerWorlds = new Set(compilations.value.rows.map((row) => row.compilerWorld));
    const rows = compilerWorlds.size === 0
      ? visibility.value.rows
      : visibility.value.rows.filter((row) => compilerWorlds.has(row.compilerWorld));
    const resources = scopeResourcesForVisibility(ctx.workspaceRoot, rows);
    const [scopeLabel] = compilerWorlds;
    return {
      scopeId: scopeLabel ?? "semantic-runtime",
      scopeLabel,
      resources,
    };
  } catch (e) {
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
      file: filePathForSource(workspaceRoot, row.source),
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

// ============================================================================
// TS-side rename → template propagation
// ============================================================================

export type RenameFromTsParams = {
  uri: string;
  position: Position;
  newName: string;
};

export type RenameFromTsResponse = {
  /** Template-side edits only (TS edits come from the built-in TS rename). */
  changes: Record<string, { range: { start: Position; end: Position }; newText: string }[]>;
} | null;

export async function handleRenameFromTs(
  ctx: ServerContext,
  params: RenameFromTsParams,
): Promise<RenameFromTsResponse> {
  try {
    if (!params?.uri || !params.position || !params.newName) return null;

    const canonical = canonicalDocumentUri(params.uri);
    const doc = ctx.ensureProgramDocument(params.uri);
    if (!doc) return null;
    const answer = await ctx.semanticRuntime.templateRenameFromTypeScript(
      doc,
      params.position,
      params.newName,
    );
    const templateReferenceCount = answer.value.templateReferenceCount;
    if (answer.value.status !== "available" || answer.value.edits.length === 0) {
      ctx.logger.info(`[renameFromTs] no cross-domain edits for ${canonical.path}`);
      return null;
    }
    const mapping = mapSemanticRuntimeTemplateRenameEdit(answer, (uri) => ctx.lookupText(uri), {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (mapping.edit?.changes == null) {
      ctx.logger.warn(`[renameFromTs] template edit mapping was blocked: ${mapping.failures.join(" ")}`);
      return null;
    }

    const changes = mapping.edit.changes as Record<string, { range: { start: Position; end: Position }; newText: string }[]>;
    const fileCount = Object.keys(changes).length;

    if (fileCount > 0) {
      ctx.logger.info(`[renameFromTs] propagating to ${fileCount} template(s), ${templateReferenceCount} runtime reference(s)`);
    }
    return fileCount ? { changes } : null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    ctx.logger.error(`[renameFromTs] ${msg}${stack ? `\n${stack}` : ""}`);
    return null;
  }
}

export async function handleGetRelatedFile(
  ctx: ServerContext,
  params: { uri: string },
): Promise<{ uri: string; kind: "template" | "component" } | null> {
  try {
    const uri = params?.uri;
    if (!uri) return null;
    const filePath = URI.parse(uri).fsPath;
    const definitions = await ctx.semanticRuntime.resourceDefinitions();
    const requested = normalizedFilePath(filePath);
    for (const definition of definitions.value.rows) {
      if (definition.resourceKind !== "custom-element") {
        continue;
      }
      const componentFile = filePathForSource(ctx.workspaceRoot, definition.targetSource ?? definition.source);
      const templateFile = filePathForSource(ctx.workspaceRoot, definition.template?.source ?? null);
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
  ctx.connection.onRequest("aurelia/getDiagnostics", (params: MaybeUriParam) => handleGetDiagnostics(ctx, params));
  ctx.connection.onRequest("aurelia/dumpState", () => handleDumpState(ctx));
  ctx.connection.onRequest("aurelia/getResources", () => handleGetResources(ctx));
  ctx.connection.onRequest("aurelia/inspectEntity", (params: { uri: string; position: Position }) => handleInspectEntity(ctx, params));
  ctx.connection.onRequest("aurelia/getScopeResources", (params: { uri: string }) => handleGetScopeResources(ctx, params));
  ctx.connection.onRequest("aurelia/getRelatedFile", (params: { uri: string }) => handleGetRelatedFile(ctx, params));
  ctx.connection.onRequest("aurelia/capabilities", () => handleCapabilities(ctx));
  ctx.connection.onRequest("aurelia/renameFromTs", (params: RenameFromTsParams) => handleRenameFromTs(ctx, params));
}
