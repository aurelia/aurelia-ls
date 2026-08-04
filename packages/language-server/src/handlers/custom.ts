/**
 * Custom Aurelia request handlers for VS Code-facing semantic-runtime facades.
 *
 * Query handlers preserve semantic-runtime answer evidence. The shared LSP
 * request boundary keeps cancellation, staleness, and operational failure
 * distinct from normal semantic absence and refusal.
 */
import type { CancellationToken } from "vscode-languageserver/node";
import { canonicalTypeSystemPath } from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import type {
  DocumentUriParams,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceInventoryResponse,
  SourceOwnershipParams,
  SourceOwnershipResponse,
  TemplateResourceAvailabilityParams,
  TemplateResourceAvailabilityResponse,
  WorkspaceStatusResponse,
  WorkspaceStatusParams,
} from "../protocol.js";
import { AureliaProtocolRequest } from "../protocol.js";
import {
  mapSemanticRuntimeTemplatePrepareRename,
  mapSemanticRuntimeTemplateRenameEdit,
} from "../mapping/lsp-types.js";
import {
  mapResourceInventoryItem,
  mapResourceProject,
  mapRuntimeAnswer,
  mapTemplateResourceAvailabilityItem,
  mapTemplateResourceScopeCandidate,
} from "../mapping/resource-discovery.js";
import {
  semanticSourceReferenceFilePath,
} from "../mapping/source-locations.js";
import {
  runSemanticRuntimeDocumentRequest,
  runSemanticRuntimeRequest,
} from "./request-guard.js";
import {
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspRequestGuard,
} from "../runtime/semantic-runtime-session.js";

export type {
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceInventoryResponse,
  SourceOwnershipParams,
  SourceOwnershipResponse,
  TemplateResourceAvailabilityParams,
  TemplateResourceAvailabilityResponse,
} from "../protocol.js";

export async function handleSourceOwnership(
  ctx: ServerContext,
  params: SourceOwnershipParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<SourceOwnershipResponse> {
  if (!params?.uri) {
    throw new Error("Source ownership requires a document URI.");
  }
  const generation = await ctx.semanticRuntime.preflight(guard);
  const answer = await ctx.semanticRuntime.authoredSourceOwnership(params.uri, guard);
  return {
    fingerprint: generation.fingerprint,
    sourceUri: ctx.documentUris.resolve(params.uri).uri,
    answer: mapRuntimeAnswer(answer),
    owners: answer.value.owners.map((owner) => ({
      projectKey: owner.projectKey,
      rootUri: ctx.documentUris.uriForHostPath(owner.projectRootDir),
      projectPath: owner.projectPath,
      role: owner.role,
    })),
  };
}

export async function handleResourceInventory(
  ctx: ServerContext,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<ResourceInventoryResponse> {
  const generation = await ctx.semanticRuntime.preflight(guard);
  const summary = await ctx.semanticRuntime.workspaceSummary(guard);
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => ctx.lookupText(uri),
  };
  const projects: ResourceInventoryResponse["projects"][number][] = [];
  for (const candidate of summary.value.appCandidates) {
    const project = mapResourceProject(candidate, ctx.documentUris);
    try {
      const answer = await ctx.semanticRuntime.resourceInventory(candidate.projectKey, guard);
      projects.push({
        status: "ready",
        project,
        answer: mapRuntimeAnswer(answer),
        resources: answer.value.rows.map((row) => mapResourceInventoryItem(row, mappingContext)),
        completeness: answer.value.completeness,
      });
    } catch (error) {
      if (isSemanticRuntimeLspRequestAborted(error)) throw error;
      projects.push({ status: "error", project, message: requestErrorMessage(error) });
    }
  }
  return { fingerprint: generation.fingerprint, projects };
}

export async function handleTemplateResourceAvailability(
  ctx: ServerContext,
  params: TemplateResourceAvailabilityParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<TemplateResourceAvailabilityResponse> {
  if (!params?.uri || params.position == null) {
    throw new Error("Template resource availability requires a document URI and cursor position.");
  }
  const generation = await ctx.semanticRuntime.preflight(guard);
  const document = ctx.ensureProgramDocument(params.uri);
  const fingerprint = generation.fingerprint;
  if (document == null) {
    return { fingerprint, projectSelection: { status: "absent", candidates: [] } };
  }
  const summary = await ctx.semanticRuntime.workspaceSummary(guard);
  const owners = await ctx.semanticRuntime.projectsOwningDocument(document, summary.value.appCandidates, guard);
  const candidates = owners.map((owner) => mapResourceProject(owner, ctx.documentUris));
  const selectedOwner = params.projectKey == null
    ? owners.length === 1 ? owners[0]! : null
    : owners.find((owner) => owner.projectKey === params.projectKey) ?? null;
  if (selectedOwner == null) {
    return {
      fingerprint,
      projectSelection: {
        status: params.projectKey == null && owners.length > 1 ? "ambiguous" : "absent",
        candidates,
      },
    };
  }

  const answer = await ctx.semanticRuntime.templateResourceAvailability(
    selectedOwner.projectKey,
    document,
    params.position,
    params.templateResourceScopeIdentityKey ?? null,
    guard,
  );
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => ctx.lookupText(uri),
  };
  return {
    fingerprint,
    projectSelection: {
      status: "exact",
      project: mapResourceProject(selectedOwner, ctx.documentUris),
      answer: mapRuntimeAnswer(answer),
      selectedTemplate: answer.value.selectedTemplate == null
        ? null
        : mapTemplateResourceScopeCandidate(answer.value.selectedTemplate, mappingContext),
      templateCandidates: answer.value.candidates.map((candidate) =>
        mapTemplateResourceScopeCandidate(candidate, mappingContext)
      ),
      resources: answer.value.rows.map((row) => mapTemplateResourceAvailabilityItem(row, mappingContext)),
      completeness: answer.value.completeness,
    },
  };
}

export async function handleWorkspaceStatus(
  ctx: ServerContext,
  params: WorkspaceStatusParams | null | undefined,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<WorkspaceStatusResponse | null> {
  const generation = await ctx.semanticRuntime.preflight(guard);
  const answer = await ctx.semanticRuntime.workspaceSummary(guard);
  const nativeProjectConfigurations = await ctx.semanticRuntime.nativeProjectConfigurations(
    params?.nativeProjectConfigurationUris ?? [],
    guard,
  );
  return {
    fingerprint: generation.fingerprint,
    answer: mapRuntimeAnswer(answer),
    projectAnalysisCounts: answer.value.projectAnalysisCounts,
    nativeProjectConfigurations: {
      answer: mapRuntimeAnswer(nativeProjectConfigurations),
      rows: nativeProjectConfigurations.value.rows.map((configuration) => ({
        projectKey: configuration.projectKey,
        projectRootUri: ctx.documentUris.uriForHostPath(configuration.projectRootDir),
        sourceUri: ctx.documentUris.uriForHostPath(configuration.filePath),
        appliedExcludedSourceRootUris: configuration.appliedExcludedSourceRootDirs.map((rootDir) =>
          ctx.documentUris.uriForHostPath(rootDir)
        ),
        diagnosticCount: configuration.diagnosticCount,
      })),
    },
  };
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
  const requested = canonicalTypeSystemPath(filePath);
  const candidates: RelatedFileCandidate[] = [];
  for (const component of topology.value.components) {
    const componentFile = semanticSourceReferenceFilePath(component.source, ctx.documentUris);
    const templateFile = semanticSourceReferenceFilePath(component.template?.source ?? null, ctx.documentUris);
    if (componentFile == null || templateFile == null) {
      continue;
    }
    if (canonicalTypeSystemPath(componentFile) === canonicalTypeSystemPath(templateFile)) {
      continue;
    }
    if (canonicalTypeSystemPath(templateFile) === requested) {
      candidates.push({
        uri: ctx.documentUris.uriForHostPath(componentFile),
        role: "component-source",
        elementName: component.elementName,
        className: component.className,
      });
    }
    if (canonicalTypeSystemPath(componentFile) === requested) {
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

/**
 * Registers all custom Aurelia request handlers on the connection.
 */
export function registerCustomHandlers(ctx: ServerContext): void {
  ctx.connection.onRequest(AureliaProtocolRequest.SourceOwnership, (params: SourceOwnershipParams, token: CancellationToken) =>
    request(ctx, "sourceOwnership", token, params?.uri,
      (guard) => handleSourceOwnership(ctx, params, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.ResourceInventory, (_params: unknown, token: CancellationToken) =>
    request(ctx, "resourceInventory", token, undefined,
      (guard) => handleResourceInventory(ctx, guard)));
  ctx.connection.onRequest(
    AureliaProtocolRequest.TemplateResourceAvailability,
    (params: TemplateResourceAvailabilityParams, token: CancellationToken) =>
      documentRequest(ctx, "templateResourceAvailability", token, params.uri,
        async (guard): Promise<TemplateResourceAvailabilityResponse> => ({
          fingerprint: (await ctx.semanticRuntime.preflight(guard)).fingerprint,
          projectSelection: { status: "absent", candidates: [] },
        }),
        (guard) => handleTemplateResourceAvailability(ctx, params, guard)),
  );
  ctx.connection.onRequest(AureliaProtocolRequest.RelatedFiles, (params: DocumentUriParams, token: CancellationToken) =>
    documentRequest(ctx, "getRelatedFiles", token, params.uri,
      () => [],
      (guard) => handleGetRelatedFiles(ctx, params, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.WorkspaceStatus, (params: WorkspaceStatusParams, token: CancellationToken) =>
    request(ctx, "workspaceStatus", token, undefined,
      (guard) => handleWorkspaceStatus(ctx, params, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.RenameFromTypeScript, (params: RenameFromTsParams, token: CancellationToken) =>
    documentRequest(ctx, "renameFromTs", token, params.uri,
      (): RenameFromTsResponse => ({
        status: "not-applicable",
        reason: "source-not-authored",
        message: "Aurelia cross-domain rename is unavailable because this source is not authored by the project.",
        templateReferenceCount: 0,
        typeScriptReferenceCount: 0,
        candidateCount: 0,
      }),
      (guard) => handleRenameFromTs(ctx, params, guard)));
}

function documentRequest<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  uri: string,
  whenNotAuthored: (guard: SemanticRuntimeLspRequestGuard) => T | Promise<T>,
  handler: (guard: SemanticRuntimeLspRequestGuard) => T | Promise<T>,
): Promise<T> {
  return runSemanticRuntimeDocumentRequest(
    ctx,
    feature,
    token,
    uri,
    whenNotAuthored,
    handler,
  );
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

function requestErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
