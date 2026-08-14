import type {
  ResourceAvailabilityExplanation,
  ResourceAvailabilityExplanationContender,
  ResourceAvailabilityExplanationParams,
} from "@aurelia-ls/language-server/protocol";
import type { QuickPickItem, TextDocument } from "vscode";
import type { ClientContext } from "../../core/context.js";
import { isTemplateLanguageId } from "../../template-language.js";
import { sameDocumentUri } from "../../core/uri-identity.js";
import type {
  ResourceAvailabilityExplanationSnapshot,
  ResourceAvailabilityExplanationSubjectRequest,
} from "../../types.js";
import {
  explanationDocumentIsCurrent,
  explanationStepKey,
  openExplanationSource,
  presentNativeExplanation,
  protocolPositionWithinRange,
  sourceBackedExplanationSteps,
} from "../explanation/native-explanation.js";
import { templateScopeQuickPickPresentations } from "../resource-discovery/presentation.js";

export interface ResourceAvailabilityExplanationSubjectProvider {
  availabilityExplanationFor(element: unknown): ResourceAvailabilityExplanationSubjectRequest | null;
}

interface FrozenAvailabilitySeed {
  readonly workspaceKey: string;
  readonly params: ResourceAvailabilityExplanationParams;
}

interface CurrentAvailabilityExplanation {
  readonly explanation: ResourceAvailabilityExplanation;
}

interface ScopeQuickPickItem extends QuickPickItem {
  readonly scopeIdentityKey: string;
}

const INVALID_ROW_MESSAGE =
  "That Aurelia resource row is no longer current. Refresh the Resource Explorer and try again.";
const ACTIVE_TEMPLATE_MESSAGE =
  "Open an Aurelia-owned HTML template before explaining resource availability.";
const STALE_TEMPLATE_MESSAGE =
  "The active template changed before its resource availability could be explained. Try again.";
const INCOMPLETE_ANSWER_MESSAGE =
  "Aurelia could not produce a current resource availability explanation for this template.";
const AMBIGUOUS_SCOPE_MESSAGE =
  "Aurelia could not safely distinguish the current template scopes.";

/** Presents one engine-owned availability explanation for one current Explorer row. */
export async function explainResourceAvailability(
  ctx: ClientContext,
  subjects: ResourceAvailabilityExplanationSubjectProvider,
  target: unknown,
): Promise<boolean> {
  const subject = subjects.availabilityExplanationFor(target);
  if (subject == null) {
    await ctx.vscode.window.showInformationMessage(INVALID_ROW_MESSAGE);
    return false;
  }
  const editor = ctx.vscode.window.activeTextEditor;
  if (editor == null || !isTemplateLanguageId(editor.document.languageId)) {
    await ctx.vscode.window.showInformationMessage(ACTIVE_TEMPLATE_MESSAGE);
    return false;
  }
  const session = ctx.languageClient.sessionForUri(editor.document.uri);
  if (session?.workspace.key !== subject.workspaceKey) {
    await ctx.vscode.window.showInformationMessage(ACTIVE_TEMPLATE_MESSAGE);
    return false;
  }

  const document = editor.document;
  const invocationVersion = document.version;
  let seed: FrozenAvailabilitySeed = {
    workspaceKey: subject.workspaceKey,
    params: {
      uri: document.uri.toString(),
      position: {
        line: editor.selection.active.line,
        character: editor.selection.active.character,
      },
      documentVersion: invocationVersion,
      projectKey: subject.projectKey,
      resourceIdentityKey: subject.resourceIdentityKey,
    },
  };

  let response = await requestExplanation(ctx, seed);
  if (!seedDocumentIsCurrent(ctx, document, seed, invocationVersion)) {
    await ctx.vscode.window.showInformationMessage(STALE_TEMPLATE_MESSAGE);
    return false;
  }

  if (isAmbiguousResponse(response)) {
    const contenders = currentScopeContenders(ctx, seed, response);
    if (contenders == null) {
      await ctx.vscode.window.showInformationMessage(AMBIGUOUS_SCOPE_MESSAGE);
      return false;
    }
    const selected = await selectTemplateScope(
      ctx,
      contenders,
      `${response.workspace.name} · ${seed.params.projectKey}`,
    );
    if (selected == null) return true;
    if (!seedDocumentIsCurrent(ctx, document, seed, invocationVersion)) {
      await ctx.vscode.window.showInformationMessage(STALE_TEMPLATE_MESSAGE);
      return false;
    }
    seed = {
      ...seed,
      params: {
        ...seed.params,
        templateResourceScopeIdentityKey: selected.scopeIdentityKey,
      },
    };
    response = await requestExplanation(ctx, seed);
    if (!seedDocumentIsCurrent(ctx, document, seed, invocationVersion)) {
      await ctx.vscode.window.showInformationMessage(STALE_TEMPLATE_MESSAGE);
      return false;
    }
  }

  const current = currentExplanation(ctx, seed, response);
  if (current == null) {
    await ctx.vscode.window.showInformationMessage(explanationRefusalMessage(response));
    return false;
  }
  const selected = await presentNativeExplanation(ctx.vscode, current.explanation);
  if (selected == null) return true;
  if (!seedDocumentIsCurrent(ctx, document, seed, invocationVersion)) {
    await ctx.vscode.window.showInformationMessage(STALE_TEMPLATE_MESSAGE);
    return false;
  }

  const freshResponse = await requestExplanation(ctx, seed);
  if (!seedDocumentIsCurrent(ctx, document, seed, invocationVersion)) {
    await ctx.vscode.window.showInformationMessage(STALE_TEMPLATE_MESSAGE);
    return false;
  }
  const fresh = currentExplanation(ctx, seed, freshResponse);
  if (
    fresh == null
    || fresh.explanation.subject.subjectKey !== current.explanation.subject.subjectKey
  ) {
    await ctx.vscode.window.showInformationMessage(STALE_TEMPLATE_MESSAGE);
    return false;
  }
  const matchingSteps = sourceBackedExplanationSteps(fresh.explanation)
    .filter((step) => explanationStepKey(step) === selected.stepKey);
  if (matchingSteps.length !== 1) {
    await ctx.vscode.window.showInformationMessage(STALE_TEMPLATE_MESSAGE);
    return false;
  }
  return openExplanationSource(
    ctx.vscode,
    matchingSteps[0]!.source,
    "The exact source for this resource availability explanation could not be opened.",
  );
}

function requestExplanation(
  ctx: ClientContext,
  seed: FrozenAvailabilitySeed,
) {
  return ctx.lsp.getResourceAvailabilityExplanation(seed.workspaceKey, seed.params);
}

function currentExplanation(
  ctx: ClientContext,
  seed: FrozenAvailabilitySeed,
  response: ResourceAvailabilityExplanationSnapshot | null,
): CurrentAvailabilityExplanation | null {
  if (
    response == null
    || response.workspace.key !== seed.workspaceKey
    || response.documentVersion !== seed.params.documentVersion
    || response.answer?.result !== "answered"
    || response.answer.selection !== "exact"
    || !supportedCoverage(response.answer.coverage)
    || response.result.status !== "explained"
  ) {
    return null;
  }
  const explanation = response.result.explanation;
  const subject = explanation.subject;
  const templateSource = subject.template.source;
  if (
    subject.subjectKey.length === 0
    || subject.projectKey !== seed.params.projectKey
    || subject.resourceIdentityKey !== seed.params.resourceIdentityKey
    || subject.resource.projectKey !== seed.params.projectKey
    || subject.resource.identityKey !== seed.params.resourceIdentityKey
    || (
      seed.params.templateResourceScopeIdentityKey != null
      && subject.template.scopeIdentityKey !== seed.params.templateResourceScopeIdentityKey
    )
    || templateSource.state !== "available"
    || !sameDocumentUri(ctx.vscode, templateSource.location.uri, seed.params.uri)
    || !protocolPositionWithinRange(seed.params.position, templateSource.location.range)
  ) {
    return null;
  }
  return { explanation };
}

function isAmbiguousResponse(
  response: ResourceAvailabilityExplanationSnapshot | null,
): response is ResourceAvailabilityExplanationSnapshot {
  return response?.result.status === "refused"
    && response.result.refusal.kind === "subjectAmbiguous";
}

function currentScopeContenders(
  ctx: ClientContext,
  seed: FrozenAvailabilitySeed,
  response: ResourceAvailabilityExplanationSnapshot,
): readonly ResourceAvailabilityExplanationContender[] | null {
  if (
    response.workspace.key !== seed.workspaceKey
    || response.documentVersion !== seed.params.documentVersion
    || response.answer?.result !== "answered"
    || response.answer.selection !== "ambiguous"
    || !supportedCoverage(response.answer.coverage)
    || response.result.status !== "refused"
    || response.result.refusal.kind !== "subjectAmbiguous"
    || response.result.contenders.length < 2
  ) {
    return null;
  }
  const scopeKeys = new Set<string>();
  for (const contender of response.result.contenders) {
    const contenderSubject = contender.subject;
    const source = contenderSubject.template.source;
    if (
      contenderSubject.subjectKey.length === 0
      || contenderSubject.projectKey !== seed.params.projectKey
      || contenderSubject.resourceIdentityKey !== seed.params.resourceIdentityKey
      || contenderSubject.resource.projectKey !== seed.params.projectKey
      || contenderSubject.resource.identityKey !== seed.params.resourceIdentityKey
      || contenderSubject.template.scopeIdentityKey.length === 0
      || scopeKeys.has(contenderSubject.template.scopeIdentityKey)
      || source.state !== "available"
      || !sameDocumentUri(ctx.vscode, source.location.uri, seed.params.uri)
      || !protocolPositionWithinRange(seed.params.position, source.location.range)
    ) {
      return null;
    }
    scopeKeys.add(contenderSubject.template.scopeIdentityKey);
  }
  return response.result.contenders;
}

async function selectTemplateScope(
  ctx: ClientContext,
  contenders: readonly ResourceAvailabilityExplanationContender[],
  projectContext: string,
): Promise<ScopeQuickPickItem | null> {
  const items = templateScopeQuickPickPresentations(
    contenders.map((contender) => contender.subject.template),
    projectContext,
  ).map((presentation): ScopeQuickPickItem => ({
    label: presentation.label,
    description: presentation.description,
    detail: presentation.detail,
    scopeIdentityKey: presentation.template.scopeIdentityKey,
  }));
  return await ctx.vscode.window.showQuickPick(items, {
    title: "Choose the Active Aurelia Template Scope",
    placeHolder: "Select the template scope to explain this resource in",
    matchOnDescription: true,
    matchOnDetail: true,
  }) ?? null;
}

function seedDocumentIsCurrent(
  ctx: ClientContext,
  document: TextDocument,
  seed: FrozenAvailabilitySeed,
  invocationVersion: number,
): boolean {
  return explanationDocumentIsCurrent(ctx.vscode, document, seed.params, invocationVersion);
}

function supportedCoverage(coverage: string): boolean {
  return coverage === "complete" || coverage === "open" || coverage === "truncated";
}

function explanationRefusalMessage(
  response: ResourceAvailabilityExplanationSnapshot | null,
): string {
  if (response?.result.status === "refused") {
    switch (response.result.refusal.kind) {
      case "subjectAmbiguous":
        return AMBIGUOUS_SCOPE_MESSAGE;
      case "documentUnavailable":
      case "sourceNotAuthored":
      case "documentVersionMismatch":
      case "subjectAbsent":
      case "subjectMismatch":
        return STALE_TEMPLATE_MESSAGE;
      case "semanticAnswerUnavailable":
      case "templateSourceUnavailable":
        return INCOMPLETE_ANSWER_MESSAGE;
    }
  }
  return INCOMPLETE_ANSWER_MESSAGE;
}
