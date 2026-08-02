/**
 * Custom Aurelia request handlers for VS Code-facing semantic-runtime facades.
 *
 * Query handlers preserve semantic-runtime answer evidence. The shared LSP
 * request boundary keeps cancellation, staleness, and operational failure
 * distinct from normal semantic absence and refusal.
 */
import type { CancellationToken } from "vscode-languageserver/node";
import type {
  SemanticResourceDefinitionRow,
  SemanticResourceVisibilityRow,
  SemanticRuntimeAnswer,
  SemanticSourceReference,
  SemanticTemplateCompilationRow,
} from "@aurelia-ls/semantic-runtime";
import { canonicalTypeSystemPath } from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";
import type {
  DocumentUriParams,
  RelatedFileCandidate,
  RelatedFilesResponse,
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
  WorkspaceStatusResponse,
} from "../protocol.js";
import { AureliaProtocolRequest } from "../protocol.js";
import {
  mapSemanticRuntimeTemplatePrepareRename,
  mapSemanticRuntimeTemplateRenameEdit,
} from "../mapping/lsp-types.js";
import {
  semanticSourceReferenceFilePath,
  semanticSourceReferenceMatchesDocument,
  semanticSourceReferencePath,
  semanticSourceReferenceUri,
} from "../mapping/source-locations.js";
import {
  runSemanticRuntimeRequest,
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

export async function handleGetResources(
  ctx: ServerContext,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<ResourceExplorerResponse> {
  const [definitions, visibility, compilations] = await Promise.all([
    ctx.semanticRuntime.resourceDefinitions(guard),
    ctx.semanticRuntime.resourceVisibility(guard),
    ctx.semanticRuntime.templateCompilations(guard),
  ]);
  return buildRuntimeResourceExplorerResponse(
    ctx.documentUris,
    guard.generation.fingerprint,
    definitions,
    visibility,
    compilations,
  );
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
  documentUris: WorkspaceDocumentUris,
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
      uri: row.source == null ? null : semanticSourceReferenceUri(row.source, documentUris),
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
        uri: resource.source == null ? null : semanticSourceReferenceUri(resource.source, documentUris),
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
  const uri = params?.uri;
  if (!uri) return null;
  const doc = ctx.ensureProgramDocument(uri);
  if (!doc) return null;
  const filePath = ctx.documentUris.authoredHostPath(uri);
  if (filePath == null) return null;
  const [definitions, visibility, compilations] = await Promise.all([
    ctx.semanticRuntime.resourceDefinitions(guard),
    ctx.semanticRuntime.resourceVisibility(guard),
    ctx.semanticRuntime.templateCompilations(guard, filePath),
  ]);
  const compilerWorlds = [...new Set(
    compilations.value.rows
      .filter((row) => semanticSourceReferenceMatchesDocument(row.source, ctx.documentUris, uri))
      .map((row) => row.compilerWorld),
  )].sort();
  if (compilerWorlds.length === 0) return null;
  const compilerWorldSet = new Set(compilerWorlds);
  const inventory = buildRuntimeResourceExplorerResponse(
    ctx.documentUris,
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
}

export async function handleWorkspaceStatus(
  ctx: ServerContext,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<WorkspaceStatusResponse | null> {
  return await ctx.semanticRuntime.workspaceSummary(guard);
}

// ============================================================================
// TS-side rename → template propagation
// ============================================================================

export async function handleRenameFromTs(
  ctx: ServerContext,
  params: RenameFromTsParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<RenameFromTsResponse> {
  if (!params?.uri || !params.position || (params.newName != null && typeof params.newName !== "string")) {
    return renameFromTsBlocked("invalid-request", "Aurelia cross-domain rename requires a URI and position, with an optional new name.");
  }

  const sourcePath = ctx.documentUris.authoredHostPath(params.uri);
  const doc = sourcePath == null ? null : ctx.ensureProgramDocument(params.uri);
  if (doc == null || sourcePath == null) {
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
    ctx.logger.info(`[renameFromTs] cross-domain rename declined for ${sourcePath}: ${reason}`);
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
      documentUris: ctx.documentUris,
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
      `Aurelia claimed a cross-domain rename for ${sourcePath} but produced no edits.`,
      undefined,
      templateReferenceCount,
      typeScriptReferenceCount,
      candidateCount,
    );
  }
  const mapping = mapSemanticRuntimeTemplateRenameEdit(answer, (uri) => ctx.lookupDocumentSnapshot(uri), {
    documentUris: ctx.documentUris,
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

export async function handleGetRelatedFiles(
  ctx: ServerContext,
  params: DocumentUriParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<RelatedFilesResponse> {
  const uri = params?.uri;
  if (!uri) return [];
  const filePath = ctx.documentUris.authoredHostPath(uri);
  if (filePath == null) return [];
  const topology = await ctx.semanticRuntime.appTopology(filePath, guard);
  const requested = normalizedFilePath(filePath);
  const candidates: RelatedFileCandidate[] = [];
  for (const component of topology.value.components) {
    const componentFile = semanticSourceReferenceFilePath(component.source, ctx.documentUris);
    const templateFile = semanticSourceReferenceFilePath(component.template?.source ?? null, ctx.documentUris);
    if (componentFile == null || templateFile == null) {
      continue;
    }
    if (normalizedFilePath(componentFile) === normalizedFilePath(templateFile)) {
      continue;
    }
    if (normalizedFilePath(templateFile) === requested) {
      candidates.push({
        uri: ctx.documentUris.uriForHostPath(componentFile),
        role: "component-source",
        elementName: component.elementName,
        className: component.className,
      });
    }
    if (normalizedFilePath(componentFile) === requested) {
      candidates.push({
        uri: ctx.documentUris.uriForHostPath(templateFile),
        role: "component-template",
        elementName: component.elementName,
        className: component.className,
      });
    }
  }
  return candidates.sort((left, right) =>
    left.uri.localeCompare(right.uri)
    || left.elementName.localeCompare(right.elementName)
    || (left.className ?? "").localeCompare(right.className ?? "")
  );
}

function normalizedFilePath(filePath: string): string {
  return canonicalTypeSystemPath(filePath);
}

/**
 * Registers all custom Aurelia request handlers on the connection.
 */
export function registerCustomHandlers(ctx: ServerContext): void {
  ctx.connection.onRequest(AureliaProtocolRequest.Resources, (_params: unknown, token: CancellationToken) =>
    request(ctx, "getResources", token, undefined,
      (guard) => handleGetResources(ctx, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.ScopeResources, (params: DocumentUriParams, token: CancellationToken) =>
    request(ctx, "getScopeResources", token, params.uri,
      (guard) => handleGetScopeResources(ctx, params, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.RelatedFiles, (params: DocumentUriParams, token: CancellationToken) =>
    request(ctx, "getRelatedFiles", token, params.uri,
      (guard) => handleGetRelatedFiles(ctx, params, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.WorkspaceStatus, (_params: unknown, token: CancellationToken) =>
    request(ctx, "workspaceStatus", token, undefined,
      (guard) => handleWorkspaceStatus(ctx, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.RenameFromTypeScript, (params: RenameFromTsParams, token: CancellationToken) =>
    request(ctx, "renameFromTs", token, params.uri,
      (guard) => handleRenameFromTs(ctx, params, guard)));
}

function request<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  uri: string | undefined,
  handler: (guard: SemanticRuntimeLspRequestGuard) => T | Promise<T>,
): Promise<T> {
  return runSemanticRuntimeRequest(ctx, feature, token, handler, uri);
}
