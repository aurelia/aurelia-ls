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
  AnalysisLimitationsResponse,
  DocumentUriParams,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceInventoryParams,
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
  mapAnalysisLimitationEffectivePolicy,
  mapAnalysisLimitationItem,
} from "../mapping/analysis-limitations.js";
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
  type SemanticRuntimeLspOperation,
} from "../runtime/semantic-runtime-session.js";

export type {
  AnalysisLimitationsResponse,
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceInventoryParams,
  ResourceInventoryResponse,
  SourceOwnershipParams,
  SourceOwnershipResponse,
  TemplateResourceAvailabilityParams,
  TemplateResourceAvailabilityResponse,
} from "../protocol.js";

export async function handleAnalysisLimitations(
  ctx: ServerContext,
  operation: SemanticRuntimeLspOperation,
): Promise<AnalysisLimitationsResponse> {
  const generation = operation.generation;
  const summary = await operation.workspaceSummary();
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => operation.documents.lookupText(uri),
  };
  const projects: AnalysisLimitationsResponse["projects"][number][] = [];
  for (const candidate of summary.value.appCandidates) {
    try {
      const answer = await operation.analysisLimitations(candidate.projectKey);
      if (answer.value.projectKey !== candidate.projectKey) {
        throw new Error(
          `Analysis limitations returned project '${answer.value.projectKey}' for requested project '${candidate.projectKey}'.`,
        );
      }
      projects.push({
        status: "ready",
        projectKey: candidate.projectKey,
        answer: mapRuntimeAnswer(answer),
        policyFile: {
          uri: ctx.documentUris.uriForHostPath(answer.value.policyFile.filePath),
          exists: answer.value.policyFile.exists,
        },
        effectivePolicies: answer.value.effectivePolicies.map((policy) =>
          mapAnalysisLimitationEffectivePolicy(policy, mappingContext)
        ),
        candidateCount: answer.value.candidateCount,
        suppressedCandidateCount: answer.value.suppressedCandidateCount,
        rows: answer.value.rows.map((row) => mapAnalysisLimitationItem(row, mappingContext)),
      });
    } catch (error) {
      if (isSemanticRuntimeLspRequestAborted(error)) throw error;
      projects.push({
        status: "error",
        projectKey: candidate.projectKey,
        message: requestErrorMessage(error),
      });
    }
  }
  return { fingerprint: generation.fingerprint, projects };
}

export async function handleSourceOwnership(
  ctx: ServerContext,
  params: SourceOwnershipParams,
  operation: SemanticRuntimeLspOperation,
): Promise<SourceOwnershipResponse> {
  if (!params?.uri) {
    throw new Error("Source ownership requires a document URI.");
  }
  const generation = operation.generation;
  const answer = await operation.authoredSourceOwnership(params.uri);
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
  params: ResourceInventoryParams | null | undefined,
  operation: SemanticRuntimeLspOperation,
): Promise<ResourceInventoryResponse> {
  const generation = operation.generation;
  const summary = await operation.workspaceSummary();
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => operation.documents.lookupText(uri),
  };
  const projects: ResourceInventoryResponse["projects"][number][] = [];
  for (const candidate of summary.value.appCandidates) {
    const project = mapResourceProject(candidate, ctx.documentUris);
    try {
      const answer = await operation.resourceInventory(
        candidate.projectKey,
        params?.includeTypeSurfaces === true,
      );
      projects.push({
        status: "ready",
        project,
        answer: mapRuntimeAnswer(answer),
        typeSurfacesIncluded: answer.value.typeSurfacesIncluded,
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
  operation: SemanticRuntimeLspOperation,
): Promise<TemplateResourceAvailabilityResponse> {
  if (!params?.uri || params.position == null) {
    throw new Error("Template resource availability requires a document URI and cursor position.");
  }
  const generation = operation.generation;
  const document = operation.documents.ensureProgramDocument(params.uri);
  const fingerprint = generation.fingerprint;
  if (document == null) {
    return { fingerprint, projectSelection: { status: "absent", candidates: [] } };
  }
  const summary = await operation.workspaceSummary();
  const owners = await operation.projectsOwningDocument(document, summary.value.appCandidates);
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

  const answer = await operation.templateResourceAvailability(
    selectedOwner.projectKey,
    document.uri,
    params.position,
    params.templateResourceScopeIdentityKey ?? null,
  );
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => operation.documents.lookupText(uri),
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
  operation: SemanticRuntimeLspOperation,
): Promise<WorkspaceStatusResponse | null> {
  const generation = operation.generation;
  const answer = await operation.workspaceSummary();
  const nativeProjectConfigurations = await operation.nativeProjectConfigurations(
    params?.nativeProjectConfigurationUris ?? [],
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
  operation: SemanticRuntimeLspOperation,
): Promise<RenameFromTsResponse> {
  if (!params?.uri || !params.position || (params.newName != null && typeof params.newName !== "string")) {
    return renameFromTsBlocked("invalid-request", "Aurelia cross-domain rename requires a URI and position, with an optional new name.");
  }

  const sourcePath = ctx.documentUris.authoredHostPath(params.uri);
  const doc = sourcePath == null ? null : operation.documents.ensureProgramDocument(params.uri);
  if (doc == null || sourcePath == null) {
    return renameFromTsBlocked("document-unavailable", "Aurelia cross-domain rename could not read the TypeScript document.");
  }
  const answer = await operation.templateRenameFromTypeScript(
    doc.uri,
    params.position,
    params.newName ?? null,
  );
  const templateReferenceCount = answer.value.templateReferenceCount;
  const typeScriptReferenceCount = answer.value.typeScriptReferenceCount;
  const candidateCount = answer.value.candidateRows.length;
  if (answer.value.status !== "available") {
    const reason = answer.value.reason ?? answer.value.status;
    const message = answer.value.displayText || answer.summary;
    operation.deferEffect({
      kind: "log",
      level: "info",
      message: `[renameFromTs] cross-domain rename declined for ${sourcePath}: ${reason}`,
    });
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
  const mapping = mapSemanticRuntimeTemplateRenameEdit(answer, (uri) => operation.documents.lookupDocumentSnapshot(uri), {
    documentUris: ctx.documentUris,
    originDocument: doc,
  });
  if (mapping.edit == null) {
    operation.deferEffect({
      kind: "log",
      level: "warn",
      message: `[renameFromTs] cross-domain edit mapping was blocked: ${mapping.failures.join(" ")}`,
    });
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
    operation.deferEffect({
      kind: "log",
      level: "info",
      message: `[renameFromTs] prepared ${fileCount} file(s), ${typeScriptReferenceCount} TypeScript and ${templateReferenceCount} Aurelia reference(s)`,
    });
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
  operation: SemanticRuntimeLspOperation,
): Promise<RelatedFilesResponse> {
  const uri = params?.uri;
  if (!uri) return [];
  const filePath = ctx.documentUris.authoredHostPath(uri);
  if (filePath == null) return [];
  const topology = await operation.appTopology(filePath);
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
  ctx.connection.onRequest(AureliaProtocolRequest.AnalysisLimitations, (_params: unknown, token: CancellationToken) =>
    request(ctx, "analysisLimitations", token, undefined,
      (guard) => handleAnalysisLimitations(ctx, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.SourceOwnership, (params: SourceOwnershipParams, token: CancellationToken) =>
    request(ctx, "sourceOwnership", token, params?.uri,
      (guard) => handleSourceOwnership(ctx, params, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.ResourceInventory, (params: ResourceInventoryParams, token: CancellationToken) =>
    request(ctx, "resourceInventory", token, undefined,
      (guard) => handleResourceInventory(ctx, params, guard)));
  ctx.connection.onRequest(
    AureliaProtocolRequest.TemplateResourceAvailability,
    (params: TemplateResourceAvailabilityParams, token: CancellationToken) =>
      documentRequest(ctx, "templateResourceAvailability", token, params.uri,
        (operation): TemplateResourceAvailabilityResponse => ({
          fingerprint: operation.generation.fingerprint,
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
  whenNotAuthored: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
  handler: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
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
  handler: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
): Promise<T> {
  return runSemanticRuntimeRequest(ctx, feature, token, handler, uri);
}

function requestErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
