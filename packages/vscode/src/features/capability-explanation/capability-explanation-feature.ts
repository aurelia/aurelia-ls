import type {
  FrameworkCapabilityExplanation,
  FrameworkCapabilityExplanationParams,
  FrameworkCapabilityExplanationResponse,
} from "@aurelia-ls/language-server/protocol";
import type { ClientFeature } from "../../core/feature.js";
import { sameDocumentUri } from "../../core/uri-identity.js";
import { AureliaCommand } from "../../product-contract.js";
import type { VscodeApi } from "../../vscode-api.js";
import {
  compareProtocolPositions,
  explanationDocument,
  explanationDocumentIsCurrent,
  explanationStepKey,
  isNonNegativeInteger,
  isProtocolPositionLike,
  isProtocolRangeLike,
  openExplanationSource,
  presentNativeExplanation,
  protocolPositionWithinRange,
  protocolRangesOverlap,
  sourceBackedExplanationSteps,
} from "../explanation/native-explanation.js";

type CurrentExplanation = {
  readonly explanation: FrameworkCapabilityExplanation;
};

const INVALID_ACTION_MESSAGE =
  "This Aurelia explanation action is no longer valid. Request code actions again.";
const STALE_ACTION_MESSAGE =
  "This Aurelia diagnostic changed before it could be explained. Request code actions again.";
const INCOMPLETE_ANSWER_MESSAGE =
  "Aurelia could not produce a current explanation for this diagnostic.";
const AMBIGUOUS_SUBJECT_MESSAGE =
  "Aurelia found multiple current matches for this diagnostic and cannot explain it safely yet.";
const REQUEST_FAILED_MESSAGE =
  "Aurelia could not load this diagnostic explanation. Try the quick fix again.";

/** Presents one engine-owned explanation seeded by a command-only diagnostic quick fix. */
export const CapabilityExplanationFeature: ClientFeature = {
  id: "capability-explanation",
  activate: (ctx, own) => {
    own(ctx.vscode.commands.registerCommand(AureliaCommand.ExplainFrameworkCapability, (value: unknown) =>
      ctx.errors.capture("command.explainFrameworkCapability", async () => {
        const seed = frameworkCapabilityExplanationSeed(value);
        if (seed == null) {
          await ctx.vscode.window.showInformationMessage(INVALID_ACTION_MESSAGE);
          return false;
        }
        const document = await explanationDocument(ctx.vscode, seed.uri);
        if (document == null) {
          await ctx.vscode.window.showInformationMessage(INVALID_ACTION_MESSAGE);
          return false;
        }
        const invocationVersion = document.version;
        if (invocationVersion !== seed.documentVersion) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }

        const response = await ctx.lsp.getFrameworkCapabilityExplanation(seed);
        if (!explanationDocumentIsCurrent(ctx.vscode, document, seed, invocationVersion)) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }
        const current = currentExplanation(ctx.vscode, seed, response);
        if (current == null) {
          await ctx.vscode.window.showInformationMessage(explanationRefusalMessage(response));
          return false;
        }

        const selected = await presentNativeExplanation(ctx.vscode, current.explanation);
        if (selected == null) return true;
        if (!explanationDocumentIsCurrent(ctx.vscode, document, seed, invocationVersion)) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }

        const freshResponse = await ctx.lsp.getFrameworkCapabilityExplanation(seed);
        if (!explanationDocumentIsCurrent(ctx.vscode, document, seed, invocationVersion)) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }
        const fresh = currentExplanation(ctx.vscode, seed, freshResponse);
        if (
          fresh == null
          || explanationSubjectKey(fresh.explanation) !== explanationSubjectKey(current.explanation)
        ) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }
        const matchingSteps = sourceBackedExplanationSteps(fresh.explanation)
          .filter((step) => explanationStepKey(step) === selected.stepKey);
        if (matchingSteps.length !== 1) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }
        return openExplanationSource(
          ctx.vscode,
          matchingSteps[0]!.source,
          "The exact source for this explanation could not be opened.",
        );
      }, { notify: false }).then(async (outcome) => {
        if (!outcome.ok) await ctx.vscode.window.showInformationMessage(REQUEST_FAILED_MESSAGE);
        return outcome;
      })));
  },
};

function frameworkCapabilityExplanationSeed(value: unknown): FrameworkCapabilityExplanationParams | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate["uri"] !== "string"
    || candidate["uri"].length === 0
    || typeof candidate["projectKey"] !== "string"
    || candidate["projectKey"].length === 0
    || typeof candidate["frameworkCapability"] !== "string"
    || candidate["frameworkCapability"].length === 0
    || !isNonNegativeInteger(candidate["documentVersion"])
    || !isProtocolPositionLike(candidate["position"])
    || !isProtocolRangeLike(candidate["range"])
    || compareProtocolPositions(candidate["position"], candidate["range"].start) !== 0
  ) {
    return null;
  }
  return candidate as unknown as FrameworkCapabilityExplanationParams;
}

function currentExplanation(
  vscode: VscodeApi,
  seed: FrameworkCapabilityExplanationParams,
  response: FrameworkCapabilityExplanationResponse | null,
): CurrentExplanation | null {
  if (
    response == null
    || response.documentVersion !== seed.documentVersion
    || response.answer?.result !== "answered"
    || response.answer.selection !== "exact"
    || response.result.status !== "explained"
  ) {
    return null;
  }
  const explanation = response.result.explanation;
  const subject = explanation.subject;
  if (
    subject.projectKey !== seed.projectKey
    || subject.requiredCapability !== seed.frameworkCapability
    || subject.source.state !== "available"
    || !sameDocumentUri(vscode, subject.source.location.uri, seed.uri)
    || !protocolPositionWithinRange(seed.position, subject.source.location.range)
    || !protocolRangesOverlap(seed.range, subject.source.location.range)
  ) {
    return null;
  }
  return { explanation };
}

function explanationRefusalMessage(response: FrameworkCapabilityExplanationResponse | null): string {
  if (response?.result.status === "refused") {
    switch (response.result.refusal.kind) {
      case "subjectAmbiguous":
        return AMBIGUOUS_SUBJECT_MESSAGE;
      case "documentUnavailable":
      case "sourceNotAuthored":
      case "documentVersionMismatch":
      case "subjectAbsent":
      case "subjectMismatch":
        return STALE_ACTION_MESSAGE;
      case "invalidFrameworkCapability":
        return INVALID_ACTION_MESSAGE;
      case "semanticAnswerUnavailable":
      case "subjectSourceUnavailable":
        return INCOMPLETE_ANSWER_MESSAGE;
    }
  }
  return INCOMPLETE_ANSWER_MESSAGE;
}

function explanationSubjectKey(explanation: FrameworkCapabilityExplanation): string {
  const subject = explanation.subject;
  const source = subject.source.state === "available"
    ? [subject.source.location.uri, subject.source.location.range]
    : [subject.source.state];
  return JSON.stringify([
    subject.projectKey,
    subject.authoredName,
    subject.siteKind,
    subject.demandKind,
    subject.requiredCapability,
    source,
  ]);
}
