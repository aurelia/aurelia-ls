/**
 * Custom Aurelia request handlers for VS Code-facing semantic-runtime facades.
 *
 * Query handlers preserve semantic-runtime answer evidence. The shared LSP
 * request boundary keeps cancellation, staleness, and operational failure
 * distinct from normal semantic absence and refusal.
 */
import {
  ErrorCodes,
  LSPErrorCodes,
  ResponseError,
  type CancellationToken,
} from "vscode-languageserver/node";
import {
  canonicalTypeSystemPath,
  frameworkRegistrationCapabilityFromString,
  semanticTemplateDocumentOwnershipOwnsSource,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import type {
  AnalysisLimitationsResponse,
  AureliaSupportSnapshotParams,
  AureliaSupportSnapshotResponse,
  AttributeInterpretationExplanationAnswerTransport,
  AttributeInterpretationExplanationContender,
  AttributeInterpretationExplanationParams,
  AttributeInterpretationExplanationRefusalKind,
  AttributeInterpretationExplanationResponse,
  BindingUncertaintyExplanationAnswerTransport,
  BindingUncertaintyExplanationContender,
  BindingUncertaintyExplanationParams,
  BindingUncertaintyExplanationRefusalKind,
  BindingUncertaintyExplanationResponse,
  DocumentUriParams,
  FrameworkCapabilityExplanationParams,
  FrameworkCapabilityExplanationAnswerTransport,
  FrameworkCapabilityExplanationContender,
  FrameworkCapabilityExplanationRefusalKind,
  FrameworkCapabilityExplanationResponse,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameCandidateLocation,
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceInventoryParams,
  ResourceInventoryResponse,
  ResourceAvailabilityExplanationAnswerTransport,
  ResourceAvailabilityExplanationContender,
  ResourceAvailabilityExplanationParams,
  ResourceAvailabilityExplanationRefusalKind,
  ResourceAvailabilityExplanationResponse,
  SourceOwnershipParams,
  SourceOwnershipResponse,
  TemplateResourceAvailabilityParams,
  TemplateResourceAvailabilityResponse,
  WorkspaceStatusResponse,
  WorkspaceStatusParams,
} from "../protocol.js";
import { createLanguageServerSupportSnapshot } from "../support-snapshot.js";
import {
  AureliaProtocolRequest,
  attributeInterpretationExplanationRefusal,
  bindingUncertaintyExplanationRefusal,
  frameworkCapabilityExplanationRefusal,
  resourceAvailabilityExplanationRefusal,
} from "../protocol.js";
import {
  mapAttributeInterpretationExplanation,
  mapAttributeInterpretationExplanationAnswer,
  mapAttributeInterpretationExplanationContender,
} from "../mapping/attribute-interpretation-explanation.js";
import {
  mapBindingUncertaintyExplanation,
  mapBindingUncertaintyExplanationAnswer,
  mapBindingUncertaintyExplanationContender,
} from "../mapping/binding-uncertainty-explanation.js";
import {
  mapFrameworkCapabilityExplanation,
  mapFrameworkCapabilityExplanationAnswer,
  mapFrameworkCapabilityExplanationContender,
} from "../mapping/framework-capability-explanation.js";
import {
  mapResourceAvailabilityExplanation,
  mapResourceAvailabilityExplanationAnswer,
  mapResourceAvailabilityExplanationContender,
} from "../mapping/resource-availability-explanation.js";
import {
  mapAnalysisLimitationEffectivePolicy,
  mapAnalysisLimitationItem,
} from "../mapping/analysis-limitations.js";
import {
  mapSemanticRuntimeTemplateRenameCandidates,
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
  type SemanticRuntimeDocumentAdmissionFailure,
} from "./request-guard.js";
import {
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspOperation,
} from "../runtime/semantic-runtime-session.js";

export type {
  AnalysisLimitationsResponse,
  AttributeInterpretationExplanationParams,
  AttributeInterpretationExplanationResponse,
  BindingUncertaintyExplanationParams,
  BindingUncertaintyExplanationResponse,
  FrameworkCapabilityExplanationParams,
  FrameworkCapabilityExplanationResponse,
  RenameFromTsParams,
  RenameFromTsResponse,
  ResourceInventoryParams,
  ResourceInventoryResponse,
  ResourceAvailabilityExplanationParams,
  ResourceAvailabilityExplanationResponse,
  SourceOwnershipParams,
  SourceOwnershipResponse,
  TemplateResourceAvailabilityParams,
  TemplateResourceAvailabilityResponse,
} from "../protocol.js";

export function handleSupportSnapshot(
  ctx: ServerContext,
  params: AureliaSupportSnapshotParams,
  token?: CancellationToken,
): AureliaSupportSnapshotResponse {
  try {
    if (supportSnapshotCancelled(token)) {
      throw new ResponseError(LSPErrorCodes.RequestCancelled, "Aurelia support snapshot was cancelled.");
    }
    const snapshot = createLanguageServerSupportSnapshot(ctx, params);
    if (supportSnapshotCancelled(token)) {
      throw new ResponseError(LSPErrorCodes.RequestCancelled, "Aurelia support snapshot was cancelled.");
    }
    return snapshot;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ResponseError(ErrorCodes.InvalidParams, error.message);
    }
    throw error;
  }
}

function supportSnapshotCancelled(token: CancellationToken | undefined): boolean {
  return token?.isCancellationRequested === true;
}

export async function handleAttributeInterpretationExplanation(
  ctx: ServerContext,
  params: AttributeInterpretationExplanationParams,
  operation: SemanticRuntimeLspOperation,
): Promise<AttributeInterpretationExplanationResponse> {
  if (!attributeInterpretationExplanationParamsAreValid(params)) {
    throw new Error(
      "Attribute interpretation explanation requires an exact document URI, version, attribute-name range, project key, and range-start cursor.",
    );
  }
  const fingerprint = operation.generation.fingerprint;
  const document = operation.documents.ensureProgramDocument(params.uri);
  if (document == null) {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      null,
      null,
      "documentUnavailable",
    );
  }
  if (document.version !== params.documentVersion) {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      document.version,
      null,
      "documentVersionMismatch",
    );
  }

  const answer = await operation.attributeInterpretationExplanation(
    params.projectKey,
    document.uri,
    params.position,
  );
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => operation.documents.lookupText(uri),
  };
  const answerTransport = mapAttributeInterpretationExplanationAnswer(answer, mappingContext);
  if (`${answer.result}` !== "answered") {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "semanticAnswerUnavailable",
    );
  }
  const contenders = answer.value.contenders.map((contender) =>
    mapAttributeInterpretationExplanationContender(contender, mappingContext)
  );
  if (`${answer.selection}` === "absent") {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAbsent",
      contenders,
    );
  }
  if (`${answer.selection}` === "ambiguous") {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAmbiguous",
      contenders,
    );
  }
  if (`${answer.selection}` !== "exact" || answer.value.explanation == null) {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }

  const explanation = mapAttributeInterpretationExplanation(
    answer.value.explanation,
    mappingContext,
  );
  if (explanation.subject.nameSource.state !== "available") {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectSourceUnavailable",
      contenders,
    );
  }
  if (
    answer.value.projectKey !== params.projectKey
    || explanation.subject.projectKey !== params.projectKey
    || !ctx.documentUris.sameDocument(
      explanation.subject.nameSource.location.uri,
      document.uri,
    )
    || !protocolRangesEqual(explanation.subject.nameSource.location.range, params.range)
    || params.position.line !== params.range.start.line
    || params.position.character !== params.range.start.character
  ) {
    return refusedAttributeInterpretationExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }
  return {
    fingerprint,
    documentVersion: document.version,
    answer: answerTransport,
    result: { status: "explained", explanation, contenders },
  };
}

export async function handleResourceAvailabilityExplanation(
  ctx: ServerContext,
  params: ResourceAvailabilityExplanationParams,
  operation: SemanticRuntimeLspOperation,
): Promise<ResourceAvailabilityExplanationResponse> {
  if (!resourceAvailabilityExplanationParamsAreValid(params)) {
    throw new Error(
      "Resource availability explanation requires an exact document URI, version, project, resource identity, optional scope identity, and template cursor.",
    );
  }
  const fingerprint = operation.generation.fingerprint;
  const document = operation.documents.ensureProgramDocument(params.uri);
  if (document == null) {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      null,
      null,
      "documentUnavailable",
    );
  }
  if (document.version !== params.documentVersion) {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      document.version,
      null,
      "documentVersionMismatch",
    );
  }

  const answer = await operation.resourceAvailabilityExplanation(
    params.projectKey,
    document.uri,
    params.position,
    params.resourceIdentityKey,
    params.templateResourceScopeIdentityKey ?? null,
  );
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => operation.documents.lookupText(uri),
  };
  const answerTransport = mapResourceAvailabilityExplanationAnswer(answer, mappingContext);
  if (`${answer.result}` !== "answered") {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "semanticAnswerUnavailable",
    );
  }
  const contenders = answer.value.contenders.map((contender) =>
    mapResourceAvailabilityExplanationContender(contender, mappingContext)
  );
  if (`${answer.selection}` === "absent") {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAbsent",
      contenders,
    );
  }
  if (`${answer.selection}` === "ambiguous") {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAmbiguous",
      contenders,
    );
  }
  if (`${answer.selection}` !== "exact" || answer.value.explanation == null) {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }

  const explanation = mapResourceAvailabilityExplanation(answer.value.explanation, mappingContext);
  const templateSourceTarget = explanation.subject.template.source;
  if (templateSourceTarget.state !== "available") {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "templateSourceUnavailable",
      contenders,
    );
  }
  const subject = explanation.subject;
  const templateSource = templateSourceTarget.location;
  if (
    answer.value.projectKey !== params.projectKey
    || subject.projectKey !== params.projectKey
    || subject.resource.projectKey !== params.projectKey
    || subject.resourceIdentityKey !== params.resourceIdentityKey
    || subject.resource.identityKey !== params.resourceIdentityKey
    || (
      params.templateResourceScopeIdentityKey != null
      && subject.template.scopeIdentityKey !== params.templateResourceScopeIdentityKey
    )
    || !ctx.documentUris.sameDocument(templateSource.uri, document.uri)
    || !protocolRangeContainsPosition(templateSource.range, params.position)
  ) {
    return refusedResourceAvailabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }
  return {
    fingerprint,
    documentVersion: document.version,
    answer: answerTransport,
    result: { status: "explained", explanation, contenders },
  };
}

export async function handleBindingUncertaintyExplanation(
  ctx: ServerContext,
  params: BindingUncertaintyExplanationParams,
  operation: SemanticRuntimeLspOperation,
): Promise<BindingUncertaintyExplanationResponse> {
  if (!bindingUncertaintyExplanationParamsAreValid(params)) {
    throw new Error(
      "Binding uncertainty explanation requires an exact document URI, version, binding range, project key, and contained cursor.",
    );
  }
  const fingerprint = operation.generation.fingerprint;
  const document = operation.documents.ensureProgramDocument(params.uri);
  if (document == null) {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      null,
      null,
      "documentUnavailable",
    );
  }
  if (document.version !== params.documentVersion) {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      document.version,
      null,
      "documentVersionMismatch",
    );
  }

  const answer = await operation.bindingUncertaintyExplanation(
    params.projectKey,
    document.uri,
    params.position,
  );
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => operation.documents.lookupText(uri),
  };
  const answerTransport = mapBindingUncertaintyExplanationAnswer(answer, mappingContext);
  if (`${answer.result}` !== "answered") {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "semanticAnswerUnavailable",
    );
  }
  const contenders = answer.value.contenders.map((contender) =>
    mapBindingUncertaintyExplanationContender(contender, mappingContext)
  );
  if (`${answer.selection}` === "absent") {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAbsent",
      contenders,
    );
  }
  if (`${answer.selection}` === "ambiguous") {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAmbiguous",
      contenders,
    );
  }
  if (`${answer.selection}` !== "exact" || answer.value.explanation == null) {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }

  const explanation = mapBindingUncertaintyExplanation(answer.value.explanation, mappingContext);
  if (explanation.subject.source.state !== "available") {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectSourceUnavailable",
      contenders,
    );
  }
  if (
    answer.value.projectKey !== params.projectKey
    || explanation.subject.projectKey !== params.projectKey
    || !ctx.documentUris.sameDocument(explanation.subject.source.location.uri, document.uri)
    || !protocolRangesEqual(explanation.subject.source.location.range, params.range)
    || !protocolRangeContainsPosition(params.range, params.position)
  ) {
    return refusedBindingUncertaintyExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }
  return {
    fingerprint,
    documentVersion: document.version,
    answer: answerTransport,
    result: { status: "explained", explanation, contenders },
  };
}

export async function handleFrameworkCapabilityExplanation(
  ctx: ServerContext,
  params: FrameworkCapabilityExplanationParams,
  operation: SemanticRuntimeLspOperation,
): Promise<FrameworkCapabilityExplanationResponse> {
  if (!frameworkCapabilityExplanationParamsAreValid(params)) {
    throw new Error(
      "Framework capability explanation requires an exact document URI, version, diagnostic range, project key, and capability.",
    );
  }
  const fingerprint = operation.generation.fingerprint;
  const document = operation.documents.ensureProgramDocument(params.uri);
  if (document == null) {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      null,
      null,
      "documentUnavailable",
    );
  }
  if (document.version !== params.documentVersion) {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      null,
      "documentVersionMismatch",
    );
  }

  const frameworkCapability = frameworkRegistrationCapabilityFromString(params.frameworkCapability);
  if (frameworkCapability == null) {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      null,
      "invalidFrameworkCapability",
    );
  }

  const answer = await operation.frameworkCapabilityExplanation(
    params.projectKey,
    document.uri,
    params.position,
    frameworkCapability,
  );
  const mappingContext = {
    documentUris: ctx.documentUris,
    lookupText: (uri: string) => operation.documents.lookupText(uri),
  };
  const answerTransport = mapFrameworkCapabilityExplanationAnswer(answer, mappingContext);
  if (`${answer.result}` !== "answered") {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "semanticAnswerUnavailable",
    );
  }
  const contenders = answer.value.contenders.map((contender) =>
    mapFrameworkCapabilityExplanationContender(contender, mappingContext)
  );
  if (`${answer.selection}` === "absent") {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAbsent",
      contenders,
    );
  }
  if (`${answer.selection}` === "ambiguous") {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectAmbiguous",
      contenders,
    );
  }
  if (`${answer.selection}` !== "exact" || answer.value.explanation == null) {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }

  const explanation = mapFrameworkCapabilityExplanation(answer.value.explanation, mappingContext);
  if (explanation.subject.source.state !== "available") {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectSourceUnavailable",
      contenders,
    );
  }
  if (
    explanation.subject.projectKey !== params.projectKey
    || explanation.subject.requiredCapability !== params.frameworkCapability
    || !ctx.documentUris.sameDocument(explanation.subject.source.location.uri, document.uri)
    || !protocolRangesEqual(explanation.subject.source.location.range, params.range)
  ) {
    return refusedFrameworkCapabilityExplanation(
      fingerprint,
      document.version,
      answerTransport,
      "subjectMismatch",
      contenders,
    );
  }
  return {
    fingerprint,
    documentVersion: document.version,
    answer: answerTransport,
    result: { status: "explained", explanation, contenders },
  };
}

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
  const sourceFilePath = ctx.documentUris.authoredHostPath(params.uri);
  // Runtime template-edit ownership intentionally includes script-side inline-template carriers. The document-language
  // protocol is narrower: only converged external/HTML template sources may opt an HTML document into Aurelia mode.
  const templateOwned = sourceFilePath == null
    ? false
    : await authoredTemplateDocumentOwned(ctx, operation, sourceFilePath, answer.value.owners);
  return {
    fingerprint: generation.fingerprint,
    sourceUri: ctx.documentUris.resolve(params.uri).uri,
    answer: mapRuntimeAnswer(answer),
    templateOwned,
    owners: answer.value.owners.map((owner) => ({
      projectKey: owner.projectKey,
      rootUri: ctx.documentUris.uriForHostPath(owner.projectRootDir),
      projectPath: owner.projectPath,
      role: owner.role,
    })),
  };
}

async function authoredTemplateDocumentOwned(
  ctx: ServerContext,
  operation: SemanticRuntimeLspOperation,
  sourceFilePath: string,
  owners: readonly { readonly projectKey: string; readonly role: string }[],
): Promise<boolean> {
  const templateProjectKeys = [...new Set(
    owners
      .filter((owner) => owner.role === "template")
      .map((owner) => owner.projectKey),
  )].sort();
  if (templateProjectKeys.length === 0) {
    return false;
  }

  const requested = canonicalTypeSystemPath(sourceFilePath);
  for (const projectKey of templateProjectKeys) {
    // The converged ownership set belongs to the project generation, not the requested document. One retained bounded
    // answer can therefore recheck every open HTML document in the project without materializing application topology.
    const ownership = await operation.templateDocumentOwnership(projectKey);
    if (semanticTemplateDocumentOwnershipOwnsSource(ownership.value, (source) => {
      const candidate = semanticSourceReferenceFilePath(source, ctx.documentUris);
      return candidate != null && canonicalTypeSystemPath(candidate) === requested;
    })) {
      return true;
    }
  }
  return false;
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
  const candidateMapping = mapSemanticRuntimeTemplateRenameCandidates(
    answer,
    (uri) => operation.documents.lookupText(uri),
    {
      documentUris: ctx.documentUris,
      originDocument: doc,
    },
  );
  const candidates = candidateMapping.value;
  if (candidateMapping.failures.length > 0) {
    return renameFromTsBlocked(
      "candidate-mapping-failed",
      `Aurelia could not preserve every unresolved rename candidate: ${candidateMapping.failures.join(" ")}`,
      candidateMapping.failures,
      templateReferenceCount,
      typeScriptReferenceCount,
      candidateCount,
      candidates,
    );
  }
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
        candidates,
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
        candidates,
      };
    }
    if (reason === "unresolved-candidates") {
      return {
        status: "refused",
        reason,
        message,
        templateReferenceCount,
        typeScriptReferenceCount,
        candidateCount,
        candidates,
      };
    }
    return renameFromTsBlocked(
      reason,
      message,
      undefined,
      templateReferenceCount,
      typeScriptReferenceCount,
      candidateCount,
      candidates,
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
        candidates,
      );
    }
    return {
      status: "available",
      ...prepared,
      message: answer.value.displayText || answer.summary,
      templateReferenceCount,
      typeScriptReferenceCount,
      candidateCount,
      candidates,
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
      candidates,
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
      candidates,
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
      candidates,
    }
    : {
      status: "blocked",
      reason: "empty-workspace-edit",
      message: "Aurelia cross-domain rename produced no mappable file edits.",
      templateReferenceCount,
      typeScriptReferenceCount,
      candidateCount,
      candidates,
    };
}

function renameFromTsBlocked(
  reason: string,
  message: string,
  failures?: readonly string[],
  templateReferenceCount?: number,
  typeScriptReferenceCount?: number,
  candidateCount?: number,
  candidates?: readonly RenameCandidateLocation[],
): RenameFromTsResponse {
  return {
    status: "blocked",
    reason,
    message,
    ...(failures == null ? {} : { failures }),
    ...(templateReferenceCount == null ? {} : { templateReferenceCount }),
    ...(typeScriptReferenceCount == null ? {} : { typeScriptReferenceCount }),
    ...(candidateCount == null ? {} : { candidateCount }),
    ...(candidates == null ? {} : { candidates }),
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
  const topology = await operation.appTopology({ sourceFilePath: filePath });
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
  // Support inspection is deliberately detached from semantic request admission. It may read existing cache counters,
  // but it never asks an app query or causes an app epoch to open/deepen.
  ctx.connection.onRequest(AureliaProtocolRequest.SupportSnapshot, (
    params: AureliaSupportSnapshotParams,
    token: CancellationToken,
  ) => handleSupportSnapshot(ctx, params, token));
  ctx.connection.onRequest(AureliaProtocolRequest.AnalysisLimitations, (_params: unknown, token: CancellationToken) =>
    request(ctx, "analysisLimitations", token, undefined,
      (guard) => handleAnalysisLimitations(ctx, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.SourceOwnership, (params: SourceOwnershipParams, token: CancellationToken) =>
    request(ctx, "sourceOwnership", token, params?.uri,
      (guard) => handleSourceOwnership(ctx, params, guard)));
  ctx.connection.onRequest(
    AureliaProtocolRequest.AttributeInterpretationExplanation,
    (params: AttributeInterpretationExplanationParams, token: CancellationToken) =>
      documentRequest(ctx, "attributeInterpretationExplanation", token, params.uri,
        (operation): AttributeInterpretationExplanationResponse => {
          const document = operation.documents.ensureProgramDocument(params.uri);
          return refusedAttributeInterpretationExplanation(
            operation.generation.fingerprint,
            document?.version ?? null,
            null,
            "sourceNotAuthored",
          );
        },
        (guard) => handleAttributeInterpretationExplanation(ctx, params, guard)),
  );
  ctx.connection.onRequest(
    AureliaProtocolRequest.BindingUncertaintyExplanation,
    (params: BindingUncertaintyExplanationParams, token: CancellationToken) =>
      documentRequest(ctx, "bindingUncertaintyExplanation", token, params.uri,
        (operation): BindingUncertaintyExplanationResponse => {
          const document = operation.documents.ensureProgramDocument(params.uri);
          return refusedBindingUncertaintyExplanation(
            operation.generation.fingerprint,
            document?.version ?? null,
            null,
            "sourceNotAuthored",
          );
        },
        (guard) => handleBindingUncertaintyExplanation(ctx, params, guard)),
  );
  ctx.connection.onRequest(
    AureliaProtocolRequest.FrameworkCapabilityExplanation,
    (params: FrameworkCapabilityExplanationParams, token: CancellationToken) =>
      documentRequest(ctx, "frameworkCapabilityExplanation", token, params.uri,
        (operation): FrameworkCapabilityExplanationResponse => {
          const document = operation.documents.ensureProgramDocument(params.uri);
          return refusedFrameworkCapabilityExplanation(
            operation.generation.fingerprint,
            document?.version ?? null,
            null,
            "sourceNotAuthored",
          );
        },
        (guard) => handleFrameworkCapabilityExplanation(ctx, params, guard)),
  );
  ctx.connection.onRequest(AureliaProtocolRequest.ResourceInventory, (params: ResourceInventoryParams, token: CancellationToken) =>
    request(ctx, "resourceInventory", token, undefined,
      (guard) => handleResourceInventory(ctx, params, guard)));
  ctx.connection.onRequest(
    AureliaProtocolRequest.ResourceAvailabilityExplanation,
    (params: ResourceAvailabilityExplanationParams, token: CancellationToken) =>
      documentRequest(ctx, "resourceAvailabilityExplanation", token, params.uri,
        (operation): ResourceAvailabilityExplanationResponse => {
          const document = operation.documents.ensureProgramDocument(params.uri);
          return refusedResourceAvailabilityExplanation(
            operation.generation.fingerprint,
            document?.version ?? null,
            null,
            "sourceNotAuthored",
          );
        },
        (guard) => handleResourceAvailabilityExplanation(ctx, params, guard)),
  );
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
      (guard) => handleGetRelatedFiles(ctx, params, guard),
      { requireExactProjectOwner: true }));
  ctx.connection.onRequest(AureliaProtocolRequest.WorkspaceStatus, (params: WorkspaceStatusParams, token: CancellationToken) =>
    request(ctx, "workspaceStatus", token, undefined,
      (guard) => handleWorkspaceStatus(ctx, params, guard)));
  ctx.connection.onRequest(AureliaProtocolRequest.RenameFromTypeScript, (params: RenameFromTsParams, token: CancellationToken) =>
    documentRequest(ctx, "renameFromTs", token, params.uri,
      (_operation, failure): RenameFromTsResponse => ({
        status: "not-applicable",
        reason: failure === "ambiguous" ? "source-project-ambiguous" : "source-not-authored",
        message: failure === "ambiguous"
          ? "Aurelia cross-domain rename is unavailable because this source belongs to multiple projects."
          : "Aurelia cross-domain rename is unavailable because this source is not authored by the project.",
        templateReferenceCount: 0,
        typeScriptReferenceCount: 0,
        candidateCount: 0,
        candidates: [],
      }),
      (guard) => handleRenameFromTs(ctx, params, guard),
      { requireExactProjectOwner: true }));
}

function refusedAttributeInterpretationExplanation(
  fingerprint: string,
  documentVersion: number | null,
  answer: AttributeInterpretationExplanationAnswerTransport | null,
  kind: AttributeInterpretationExplanationRefusalKind,
  contenders: readonly AttributeInterpretationExplanationContender[] = [],
): AttributeInterpretationExplanationResponse {
  return {
    fingerprint,
    documentVersion,
    answer,
    result: {
      status: "refused",
      refusal: attributeInterpretationExplanationRefusal(kind),
      contenders,
    },
  };
}

function refusedBindingUncertaintyExplanation(
  fingerprint: string,
  documentVersion: number | null,
  answer: BindingUncertaintyExplanationAnswerTransport | null,
  kind: BindingUncertaintyExplanationRefusalKind,
  contenders: readonly BindingUncertaintyExplanationContender[] = [],
): BindingUncertaintyExplanationResponse {
  return {
    fingerprint,
    documentVersion,
    answer,
    result: {
      status: "refused",
      refusal: bindingUncertaintyExplanationRefusal(kind),
      contenders,
    },
  };
}

function refusedFrameworkCapabilityExplanation(
  fingerprint: string,
  documentVersion: number | null,
  answer: FrameworkCapabilityExplanationAnswerTransport | null,
  kind: FrameworkCapabilityExplanationRefusalKind,
  contenders: readonly FrameworkCapabilityExplanationContender[] = [],
): FrameworkCapabilityExplanationResponse {
  return {
    fingerprint,
    documentVersion,
    answer,
    result: {
      status: "refused",
      refusal: frameworkCapabilityExplanationRefusal(kind),
      contenders,
    },
  };
}

function refusedResourceAvailabilityExplanation(
  fingerprint: string,
  documentVersion: number | null,
  answer: ResourceAvailabilityExplanationAnswerTransport | null,
  kind: ResourceAvailabilityExplanationRefusalKind,
  contenders: readonly ResourceAvailabilityExplanationContender[] = [],
): ResourceAvailabilityExplanationResponse {
  return {
    fingerprint,
    documentVersion,
    answer,
    result: {
      status: "refused",
      refusal: resourceAvailabilityExplanationRefusal(kind),
      contenders,
    },
  };
}

function bindingUncertaintyExplanationParamsAreValid(
  params: BindingUncertaintyExplanationParams | null | undefined,
): params is BindingUncertaintyExplanationParams {
  return params != null
    && typeof params.uri === "string"
    && params.uri.length > 0
    && Number.isSafeInteger(params.documentVersion)
    && params.documentVersion >= 0
    && typeof params.projectKey === "string"
    && params.projectKey.length > 0
    && protocolPositionIsValid(params.position)
    && protocolRangeIsValid(params.range)
    && protocolRangeContainsPosition(params.range, params.position);
}

function attributeInterpretationExplanationParamsAreValid(
  params: AttributeInterpretationExplanationParams | null | undefined,
): params is AttributeInterpretationExplanationParams {
  return params != null
    && typeof params.uri === "string"
    && params.uri.length > 0
    && Number.isSafeInteger(params.documentVersion)
    && params.documentVersion >= 0
    && typeof params.projectKey === "string"
    && params.projectKey.length > 0
    && protocolPositionIsValid(params.position)
    && protocolRangeIsValid(params.range)
    && params.position.line === params.range.start.line
    && params.position.character === params.range.start.character;
}

function frameworkCapabilityExplanationParamsAreValid(
  params: FrameworkCapabilityExplanationParams | null | undefined,
): params is FrameworkCapabilityExplanationParams {
  return params != null
    && typeof params.uri === "string"
    && params.uri.length > 0
    && Number.isSafeInteger(params.documentVersion)
    && params.documentVersion >= 0
    && typeof params.projectKey === "string"
    && params.projectKey.length > 0
    && typeof params.frameworkCapability === "string"
    && params.frameworkCapability.length > 0
    && protocolPositionIsValid(params.position)
    && protocolRangeIsValid(params.range)
    && params.position.line === params.range.start.line
    && params.position.character === params.range.start.character;
}

function resourceAvailabilityExplanationParamsAreValid(
  params: ResourceAvailabilityExplanationParams | null | undefined,
): params is ResourceAvailabilityExplanationParams {
  return params != null
    && typeof params.uri === "string"
    && params.uri.length > 0
    && Number.isSafeInteger(params.documentVersion)
    && params.documentVersion >= 0
    && typeof params.projectKey === "string"
    && params.projectKey.length > 0
    && typeof params.resourceIdentityKey === "string"
    && params.resourceIdentityKey.length > 0
    && (
      params.templateResourceScopeIdentityKey === undefined
      || (
        typeof params.templateResourceScopeIdentityKey === "string"
        && params.templateResourceScopeIdentityKey.length > 0
      )
    )
    && protocolPositionIsValid(params.position);
}

function protocolPositionIsValid(position: unknown): position is { readonly line: number; readonly character: number } {
  if (position == null || typeof position !== "object" || Array.isArray(position)) return false;
  const candidate = position as Record<string, unknown>;
  return Number.isSafeInteger(candidate["line"])
    && (candidate["line"] as number) >= 0
    && Number.isSafeInteger(candidate["character"])
    && (candidate["character"] as number) >= 0;
}

function protocolRangeIsValid(range: unknown): range is {
  readonly start: { readonly line: number; readonly character: number };
  readonly end: { readonly line: number; readonly character: number };
} {
  if (range == null || typeof range !== "object" || Array.isArray(range)) return false;
  const candidate = range as Record<string, unknown>;
  if (!protocolPositionIsValid(candidate["start"]) || !protocolPositionIsValid(candidate["end"])) return false;
  return candidate["end"].line > candidate["start"].line
    || (
      candidate["end"].line === candidate["start"].line
      && candidate["end"].character >= candidate["start"].character
    );
}

function protocolRangesEqual(
  left: { readonly start: { readonly line: number; readonly character: number }; readonly end: { readonly line: number; readonly character: number } },
  right: { readonly start: { readonly line: number; readonly character: number }; readonly end: { readonly line: number; readonly character: number } },
): boolean {
  return left.start.line === right.start.line
    && left.start.character === right.start.character
    && left.end.line === right.end.line
    && left.end.character === right.end.character;
}

function protocolRangeContainsPosition(
  range: { readonly start: { readonly line: number; readonly character: number }; readonly end: { readonly line: number; readonly character: number } },
  position: { readonly line: number; readonly character: number },
): boolean {
  return compareProtocolPositions(position, range.start) >= 0
    && compareProtocolPositions(position, range.end) <= 0;
}

function compareProtocolPositions(
  left: { readonly line: number; readonly character: number },
  right: { readonly line: number; readonly character: number },
): number {
  return left.line - right.line || left.character - right.character;
}

function documentRequest<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  uri: string,
  whenUnavailable: (
    operation: SemanticRuntimeLspOperation,
    failure: SemanticRuntimeDocumentAdmissionFailure,
  ) => T | Promise<T>,
  handler: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
  options: { readonly requireExactProjectOwner?: boolean } = {},
): Promise<T> {
  return runSemanticRuntimeDocumentRequest(
    ctx,
    feature,
    token,
    uri,
    whenUnavailable,
    handler,
    options,
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
