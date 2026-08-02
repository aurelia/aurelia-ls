/**
 * Custom Aurelia request handlers for VS Code-facing semantic-runtime facades.
 *
 * Query handlers preserve semantic-runtime answer evidence. Presentation-only
 * requests may degrade to null, while inventory failures remain explicit so a
 * client never mistakes a failed query for an empty workspace.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CancellationToken } from "vscode-languageserver/node";
import { URI } from "vscode-uri";
import type {
  SemanticResourceDefinitionRow,
  SemanticResourceVisibilityRow,
  SemanticRuntimeAnswer,
  SemanticAppDiagnosticRow,
  SemanticAppDiagnosticsResult,
  SemanticDiagnosticPresentationResult,
  SemanticSourceReference,
  SemanticTemplateCompilationRow,
} from "@aurelia-ls/semantic-runtime";
import {
  diagnosticRepairAffordanceForSuggestion,
  semanticExactSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import type {
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
  DocumentUriParams,
  RelatedFileResponse,
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceExplorerBindable,
  ResourceExplorerDefinition,
  ResourceExplorerItem,
  ResourceExplorerOrigin,
  ResourceExplorerResourceKind,
  ResourceExplorerResponse,
  ResourceExplorerVisibility,
  ResourceExplorerVisibilityKind,
  ScopeResourcesResponse,
  SourceSpan,
  WorkspaceStatusResponse,
} from "../protocol.js";
import { AureliaProtocolRequest } from "../protocol.js";
import { canonicalDocumentUri } from "../utils/document-uri.js";
import {
  mapSemanticRuntimeTemplatePrepareRename,
  mapSemanticRuntimeTemplateRenameEdit,
  semanticRuntimeDiagnosticCode,
  semanticRuntimeDiagnosticSnapshotData,
} from "../mapping/lsp-types.js";
import {
  semanticSourceReferenceFilePath,
  semanticSourceReferenceMatchesDocument,
  semanticSourceReferencePath,
} from "../mapping/source-locations.js";
import {
  logIfSemanticRuntimeRequestAborted,
  semanticRuntimeRequestGuard,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";

export type {
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceExplorerBindable,
  ResourceExplorerItem,
  ResourceExplorerResourceKind,
  ResourceExplorerResponse,
  ScopeResourcesResponse,
} from "../protocol.js";

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
        result: `${answer.result}`,
        selection: `${answer.selection}`,
        coverage: `${answer.coverage}`,
        summary: answer.summary,
        page: answer.page,
        ...(answer.analysisDepth == null ? {} : { analysisDepth: answer.analysisDepth }),
        ...(answer.continuations == null ? {} : { continuations: answer.continuations }),
      },
      diagnostics,
    };
  } catch (e) {
    if (!logIfSemanticRuntimeRequestAborted(ctx, "getDiagnostics", e, uriFromParam(params))) {
      ctx.logger.error(`[getDiagnostics] failed: ${formatError(e)}`);
    }
    throw e;
  }
}

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
      guard.generation.fingerprint,
      definitions,
      visibility,
      compilations,
    );
  } catch (e) {
    if (!logIfSemanticRuntimeRequestAborted(ctx, "getResources", e)) {
      ctx.logger.error(`[getResources] failed: ${formatError(e)}`);
    }
    throw e;
  }
}

const RESOURCE_EXPLORER_KIND_ORDER: readonly ResourceExplorerResourceKind[] = [
  "custom-element",
  "template-controller",
  "custom-attribute",
  "value-converter",
  "binding-behavior",
  "binding-command",
  "attribute-pattern",
] as const;

const RESOURCE_EXPLORER_KINDS = new Set(RESOURCE_EXPLORER_KIND_ORDER);
const RESOURCE_EXPLORER_KIND_RANK = new Map<string, number>(
  RESOURCE_EXPLORER_KIND_ORDER.map((kind, index) => [kind, index]),
);

interface ResourceExplorerAccumulator {
  readonly id: string;
  readonly name: string;
  readonly kind: ResourceExplorerItem["kind"];
  readonly aliases: ResourceExplorerItem["aliases"][number][];
  readonly bindables: ResourceExplorerBindable[];
  readonly definition: ResourceExplorerDefinition | null;
  readonly visibility: ResourceExplorerVisibility[];
  source: SemanticSourceReference | null;
}

function buildRuntimeResourceExplorerResponse(
  workspaceRoot: string | null,
  fingerprint: string,
  definitions: SemanticRuntimeAnswer<{ readonly rows: readonly SemanticResourceDefinitionRow[] }>,
  visibility: SemanticRuntimeAnswer<{ readonly rows: readonly SemanticResourceVisibilityRow[] }>,
  compilations: SemanticRuntimeAnswer<{ readonly rows: readonly SemanticTemplateCompilationRow[] }>,
): ResourceExplorerResponse {
  const resources: ResourceExplorerAccumulator[] = [];
  const definitionsByProduct = new Map<string, ResourceExplorerAccumulator>();
  const visibilityOnlyByProduct = new Map<string, ResourceExplorerAccumulator>();

  for (const definition of definitions.value.rows) {
    const kind = protocolResourceKind(definition.resourceKind);
    if (definition.name == null || !RESOURCE_EXPLORER_KINDS.has(kind)) {
      continue;
    }
    const source = definition.targetSource ?? definition.nameSource ?? definition.source;
    const definitionProductHandle = definition.handles?.definitionProductHandle ?? null;
    const resource: ResourceExplorerAccumulator = {
      id: resourceExplorerDefinitionId(definition, kind),
      name: definition.name,
      kind,
      aliases: [...definition.aliases],
      bindables: definition.bindables.map((bindable): ResourceExplorerBindable => ({
        ...bindable,
        primary: definition.defaultProperty === bindable.name,
      })),
      definition: resourceExplorerDefinition(definition),
      visibility: [],
      source,
    };
    resources.push(resource);
    if (definitionProductHandle != null) {
      if (definitionsByProduct.has(definitionProductHandle)) {
        throw new Error(`Duplicate resource definition product handle: ${definitionProductHandle}`);
      }
      definitionsByProduct.set(definitionProductHandle, resource);
    }
  }

  for (const row of visibility.value.rows) {
    const kind = protocolResourceKind(row.resourceKind);
    if (!RESOURCE_EXPLORER_KINDS.has(kind)) {
      continue;
    }
    const definitionProductHandle = row.handles?.definitionProductHandle ?? null;
    const resourceProductHandle = row.handles?.resourceProductHandle ?? null;
    let resource = definitionProductHandle == null
      ? undefined
      : definitionsByProduct.get(definitionProductHandle);
    if (resource == null && resourceProductHandle != null) {
      resource = visibilityOnlyByProduct.get(resourceProductHandle);
    }
    if (resource == null) {
      resource = {
        id: resourceExplorerVisibilityId(row, kind),
        name: row.name,
        kind,
        aliases: [],
        bindables: [],
        definition: null,
        visibility: [],
        source: row.source,
      };
      resources.push(resource);
      if (resourceProductHandle != null) {
        visibilityOnlyByProduct.set(resourceProductHandle, resource);
      }
    } else {
      assertVisibilityMatchesResource(resource, row, kind);
    }
    resource.visibility.push({
      ...row,
      resourceKind: kind,
      visibilityKind: protocolVisibilityKind(row.visibilityKind),
      file: semanticSourceReferenceFilePath(row.source, workspaceRoot),
    });
    resource.source ??= row.source;
    for (const alias of row.aliases) {
      if (!resource.aliases.some((candidate) => candidate.name === alias)) {
        resource.aliases.push({ name: alias, source: null });
      }
    }
  }

  const rows = resources
    .map((resource): ResourceExplorerItem => {
      const packageName = packageNameForSource(resource.source) ?? null;
      return {
        ...resource,
        visibility: [...resource.visibility].sort(compareResourceExplorerVisibility),
        file: semanticSourceReferenceFilePath(resource.source, workspaceRoot),
        package: packageName,
        origin: explorerOriginForSource(resource.source, packageName),
      };
    })
    .sort(compareResourceExplorerItems);
  assertUniqueResourceExplorerIds(rows);
  const appTemplateRows = compilations.value.rows.filter((row) => row.compilationLane === "app-runtime");

  return {
    fingerprint,
    resources: rows,
    templateCount: countDistinct(
      appTemplateRows.map((row) => semanticSourceReferencePath(row.source) ?? row.definitionName),
    ),
    inlineTemplateCount: appTemplateRows.filter((row) => row.templateSourceKind.toLowerCase().includes("inline")).length,
    evidence: {
      definitions: resourceExplorerAnswer(definitions),
      visibility: resourceExplorerAnswer(visibility),
      compilations: resourceExplorerAnswer(compilations),
    },
  };
}

function resourceExplorerDefinition(definition: SemanticResourceDefinitionRow): ResourceExplorerDefinition {
  return {
    projectKey: definition.projectKey,
    key: definition.key,
    targetName: definition.targetName,
    defaultProperty: definition.defaultProperty,
    declarationModes: definition.declarationModes,
    source: definition.source,
    nameSource: definition.nameSource,
    targetSource: definition.targetSource,
    targetDeclarationSource: definition.targetDeclarationSource,
    handles: definition.handles,
  };
}

function resourceExplorerDefinitionId(
  definition: SemanticResourceDefinitionRow,
  kind: ResourceExplorerResourceKind,
): string {
  const handle = definition.handles?.definitionProductHandle ?? null;
  return handle == null
    ? resourceExplorerSourceId(
        "definition",
        kind,
        definition.name ?? "<unnamed>",
        definition.source,
        [definition.projectKey, definition.key, definition.targetName, ...definition.declarationModes],
      )
    : `definition:${handle}`;
}

function resourceExplorerVisibilityId(
  row: SemanticResourceVisibilityRow,
  kind: ResourceExplorerResourceKind,
): string {
  const handle = row.handles?.resourceProductHandle ?? null;
  return handle == null
    ? resourceExplorerSourceId(
        "visibility",
        kind,
        row.name,
        row.source,
        [row.compilerWorld, `${row.visibilityKind}`],
      )
    : `resource:${handle}`;
}

function resourceExplorerSourceId(
  prefix: string,
  kind: string,
  name: string,
  source: SemanticSourceReference | null,
  identityFacts: readonly (string | null)[],
): string {
  return `${prefix}:${JSON.stringify([
    kind,
    name,
    source?.sourceWorkspaceKey ?? null,
    source?.path ?? null,
    source?.start ?? null,
    source?.end ?? null,
    source?.scheme ?? null,
    source?.value ?? null,
    source?.label ?? null,
    ...identityFacts,
  ])}`;
}

function compareResourceExplorerVisibility(
  left: ResourceExplorerVisibility,
  right: ResourceExplorerVisibility,
): number {
  return `${left.compilerWorld}:${left.visibilityKind}:${left.name}`
    .localeCompare(`${right.compilerWorld}:${right.visibilityKind}:${right.name}`);
}

function resourceExplorerAnswer(
  answer: SemanticRuntimeAnswer<unknown>,
): ResourceExplorerResponse["evidence"]["definitions"] {
  return {
    schemaVersion: answer.schemaVersion,
    result: `${answer.result}`,
    selection: `${answer.selection}`,
    coverage: `${answer.coverage}`,
    summary: answer.summary,
    page: answer.page,
    ...(answer.analysisDepth == null ? {} : { analysisDepth: answer.analysisDepth }),
    ...(answer.continuations == null ? {} : { continuations: answer.continuations }),
  };
}

function compareResourceExplorerItems(
  left: { readonly kind: string; readonly name: string },
  right: { readonly kind: string; readonly name: string },
): number {
  const leftKind = RESOURCE_EXPLORER_KIND_RANK.get(left.kind) ?? Number.MAX_SAFE_INTEGER;
  const rightKind = RESOURCE_EXPLORER_KIND_RANK.get(right.kind) ?? Number.MAX_SAFE_INTEGER;
  if (leftKind !== rightKind) {
    return leftKind - rightKind;
  }
  return left.name.localeCompare(right.name);
}

function protocolResourceKind(
  kind: SemanticResourceDefinitionRow["resourceKind"],
): ResourceExplorerResourceKind {
  return `${kind}`;
}

function protocolVisibilityKind(
  kind: SemanticResourceVisibilityRow["visibilityKind"],
): ResourceExplorerVisibilityKind {
  return `${kind}`;
}

function assertUniqueResourceExplorerIds(resources: readonly ResourceExplorerItem[]): void {
  const seen = new Set<string>();
  for (const resource of resources) {
    if (seen.has(resource.id)) {
      throw new Error(`Duplicate resource explorer identity: ${resource.id}`);
    }
    seen.add(resource.id);
  }
}

function assertVisibilityMatchesResource(
  resource: ResourceExplorerAccumulator,
  row: SemanticResourceVisibilityRow,
  kind: ResourceExplorerResourceKind,
): void {
  if (resource.kind !== kind || resource.name !== row.name) {
    throw new Error(
      `Resource visibility identity mismatch: ${resource.kind}:${resource.name} versus ${kind}:${row.name}`,
    );
  }
}

function countDistinct(values: readonly string[]): number {
  return new Set(values).size;
}

function explorerOriginForSource(
  source: SemanticSourceReference | null,
  packageName: string | null,
): ResourceExplorerOrigin {
  if (isFrameworkCatalogSource(source)) return "framework";
  if (packageName != null) return "package";
  if (semanticSourceReferencePath(source) != null) return "project";
  if (source?.kind === "external-address") return "external";
  return "unknown";
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

export async function handleGetScopeResources(
  ctx: ServerContext,
  params: DocumentUriParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<ScopeResourcesResponse> {
  try {
    const uri = params?.uri;
    if (!uri) return null;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const filePath = URI.parse(uri).fsPath;
    const [definitions, visibility, compilations] = await Promise.all([
      ctx.semanticRuntime.resourceDefinitions(guard),
      ctx.semanticRuntime.resourceVisibility(guard),
      ctx.semanticRuntime.templateCompilations(guard, filePath),
    ]);
    const compilerWorlds = [...new Set(
      compilations.value.rows
        .filter((row) => semanticSourceReferenceMatchesDocument(row.source, ctx.workspaceRoot, uri))
        .map((row) => row.compilerWorld),
    )].sort();
    if (compilerWorlds.length === 0) return null;
    const compilerWorldSet = new Set(compilerWorlds);
    const inventory = buildRuntimeResourceExplorerResponse(
      ctx.workspaceRoot,
      guard.generation.fingerprint,
      definitions,
      visibility,
      compilations,
    );
    const resources = inventory.resources.flatMap((resource): readonly ResourceExplorerItem[] => {
      const scopedVisibility = resource.visibility.filter((row) => compilerWorldSet.has(row.compilerWorld));
      return scopedVisibility.length === 0 ? [] : [{ ...resource, visibility: scopedVisibility }];
    });
    return {
      compilerWorlds,
      scopeLabel: compilerWorlds.length === 1 ? compilerWorlds[0]! : `${compilerWorlds.length} compiler worlds`,
      resources,
      evidence: inventory.evidence,
    };
  } catch (e) {
    if (!logIfSemanticRuntimeRequestAborted(ctx, "getScopeResources", e, params?.uri)) {
      ctx.logger.error(`[getScopeResources] failed: ${formatError(e)}`);
    }
    throw e;
  }
}

export async function handleWorkspaceStatus(
  ctx: ServerContext,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<WorkspaceStatusResponse | null> {
  try {
    return await ctx.semanticRuntime.workspaceSummary(guard);
  } catch (e) {
    if (!logIfSemanticRuntimeRequestAborted(ctx, "workspaceStatus", e)) {
      ctx.logger.error(`[workspaceStatus] failed: ${formatError(e)}`);
    }
    throw e;
  }
}

// ============================================================================
// TS-side rename → template propagation
// ============================================================================

export async function handleRenameFromTs(
  ctx: ServerContext,
  params: RenameFromTsParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<RenameFromTsResponse> {
  try {
    if (!params?.uri || !params.position || (params.newName != null && typeof params.newName !== "string")) {
      return renameFromTsBlocked("invalid-request", "Aurelia cross-domain rename requires a URI and position, with an optional new name.");
    }

    const canonical = canonicalDocumentUri(params.uri);
    const doc = ctx.ensureProgramDocument(params.uri);
    if (!doc) {
      return renameFromTsBlocked("document-unavailable", "Aurelia cross-domain rename could not read the TypeScript document.");
    }
    const answer = await ctx.semanticRuntime.templateRenameFromTypeScript(
      doc,
      params.position,
      guard,
      params.newName ?? null,
    );
    const templateReferenceCount = answer.value.templateReferenceCount;
    const typeScriptReferenceCount = answer.value.typeScriptReferenceCount;
    const candidateCount = answer.value.candidateRows.length;
    if (answer.value.status !== "available") {
      const reason = answer.value.reason ?? answer.value.status;
      const message = answer.value.displayText || answer.summary;
      ctx.logger.info(`[renameFromTs] cross-domain rename declined for ${canonical.path}: ${reason}`);
      if (reason === "no-aurelia-references" || reason === "no-source-backed-member") {
        return {
          status: "not-applicable",
          reason,
          message,
          templateReferenceCount,
          typeScriptReferenceCount,
          candidateCount,
        };
      }
      if (answer.value.status === "invalid-name") {
        return {
          status: "refused",
          reason,
          message,
          templateReferenceCount,
          typeScriptReferenceCount,
          candidateCount,
        };
      }
      return renameFromTsBlocked(
        reason,
        message,
        undefined,
        templateReferenceCount,
        typeScriptReferenceCount,
        candidateCount,
      );
    }

    if (params.newName == null) {
      const prepared = mapSemanticRuntimeTemplatePrepareRename(answer, {
        workspaceRoot: ctx.workspaceRoot,
        originDocument: doc,
      });
      if (prepared == null) {
        return renameFromTsBlocked(
          "prepare-mapping-failed",
          "Aurelia cross-domain rename could not map the selected TypeScript token.",
          undefined,
          templateReferenceCount,
          typeScriptReferenceCount,
          candidateCount,
        );
      }
      return {
        status: "available",
        ...prepared,
        message: answer.value.displayText || answer.summary,
        templateReferenceCount,
        typeScriptReferenceCount,
        candidateCount,
      };
    }
    if (answer.value.edits.length === 0) {
      return renameFromTsBlocked(
        "empty-edit-plan",
        `Aurelia claimed a cross-domain rename for ${canonical.path} but produced no edits.`,
        undefined,
        templateReferenceCount,
        typeScriptReferenceCount,
        candidateCount,
      );
    }
    const mapping = mapSemanticRuntimeTemplateRenameEdit(answer, (uri) => ctx.lookupDocumentSnapshot(uri), {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (mapping.edit == null) {
      ctx.logger.warn(`[renameFromTs] cross-domain edit mapping was blocked: ${mapping.failures.join(" ")}`);
      return renameFromTsBlocked(
        "mapping-failed",
        `Aurelia cross-domain rename was blocked: ${mapping.failures.join(" ")}`,
        mapping.failures,
        templateReferenceCount,
        typeScriptReferenceCount,
        candidateCount,
      );
    }

    const fileCount = new Set((mapping.edit.documentChanges ?? [])
      .filter((change) => "textDocument" in change)
      .map((change) => change.textDocument.uri)).size;

    if (fileCount > 0) {
      ctx.logger.info(`[renameFromTs] prepared ${fileCount} file(s), ${typeScriptReferenceCount} TypeScript and ${templateReferenceCount} Aurelia reference(s)`);
    }
    return fileCount
      ? {
        status: "success",
        workspaceEdit: mapping.edit,
        message: answer.value.displayText || answer.summary,
        templateReferenceCount,
        typeScriptReferenceCount,
        candidateCount,
      }
      : {
        status: "blocked",
        reason: "empty-workspace-edit",
        message: "Aurelia cross-domain rename produced no mappable file edits.",
        templateReferenceCount,
        typeScriptReferenceCount,
        candidateCount,
      };
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "renameFromTs", e, params?.uri)) {
      const reason = e.reason === "cancelled" ? "request-cancelled" : "request-stale";
      return renameFromTsBlocked(
        reason,
        `Aurelia cross-domain rename was skipped because the request was ${e.reason}.`,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    ctx.logger.error(`[renameFromTs] ${msg}${stack ? `\n${stack}` : ""}`);
    return renameFromTsBlocked("server-error", `Aurelia cross-domain rename failed: ${msg}`);
  }
}

function renameFromTsBlocked(
  reason: string,
  message: string,
  failures?: readonly string[],
  templateReferenceCount?: number,
  typeScriptReferenceCount?: number,
  candidateCount?: number,
): RenameFromTsResponse {
  return {
    status: "blocked",
    reason,
    message,
    ...(failures == null ? {} : { failures }),
    ...(templateReferenceCount == null ? {} : { templateReferenceCount }),
    ...(typeScriptReferenceCount == null ? {} : { typeScriptReferenceCount }),
    ...(candidateCount == null ? {} : { candidateCount }),
  };
}

export async function handleGetRelatedFile(
  ctx: ServerContext,
  params: DocumentUriParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<RelatedFileResponse> {
  try {
    const uri = params?.uri;
    if (!uri) return null;
    const filePath = URI.parse(uri).fsPath;
    const definitions = await ctx.semanticRuntime.resourceDefinitions(guard);
    const requested = normalizedFilePath(filePath);
    for (const definition of definitions.value.rows) {
      if (`${definition.resourceKind}` !== "custom-element") {
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
    if (!logIfSemanticRuntimeRequestAborted(ctx, "getRelatedFile", e, params?.uri)) {
      ctx.logger.error(`[getRelatedFile] failed: ${formatError(e)}`);
    }
    throw e;
  }
}

function normalizedFilePath(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}

/**
 * Registers all custom Aurelia request handlers on the connection.
 */
export function registerCustomHandlers(ctx: ServerContext): void {
  ctx.connection.onRequest(AureliaProtocolRequest.Diagnostics, (params: MaybeUriParam, token: CancellationToken) =>
    handleGetDiagnostics(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRequest(AureliaProtocolRequest.Resources, (_params: unknown, token: CancellationToken) =>
    handleGetResources(ctx, requestGuard(ctx, token)));
  ctx.connection.onRequest(AureliaProtocolRequest.ScopeResources, (params: DocumentUriParams, token: CancellationToken) =>
    handleGetScopeResources(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRequest(AureliaProtocolRequest.RelatedFile, (params: DocumentUriParams, token: CancellationToken) =>
    handleGetRelatedFile(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRequest(AureliaProtocolRequest.WorkspaceStatus, (_params: unknown, token: CancellationToken) =>
    handleWorkspaceStatus(ctx, requestGuard(ctx, token)));
  ctx.connection.onRequest(AureliaProtocolRequest.RenameFromTypeScript, (params: RenameFromTsParams, token: CancellationToken) =>
    handleRenameFromTs(ctx, params, requestGuard(ctx, token)));
}

function requestGuard(ctx: ServerContext, token: CancellationToken | undefined): SemanticRuntimeLspRequestGuard {
  return semanticRuntimeRequestGuard(ctx, token);
}
