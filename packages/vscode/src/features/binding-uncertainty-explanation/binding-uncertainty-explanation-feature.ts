import type {
  BindingUncertaintyExplanation,
  BindingUncertaintyExplanationParams,
  BindingUncertaintyExplanationResponse,
} from "@aurelia-ls/language-server/protocol";
import type { ClientFeature } from "../../core/feature.js";
import { sameDocumentUri } from "../../core/uri-identity.js";
import { AureliaCommand } from "../../product-contract.js";
import type { VscodeApi } from "../../vscode-api.js";
import {
  explanationDocument,
  explanationDocumentIsCurrent,
  explanationStepKey,
  isNonNegativeInteger,
  isProtocolPositionLike,
  isProtocolRangeLike,
  openExplanationSource,
  presentNativeExplanation,
  protocolPositionWithinRange,
  protocolRangesEqual,
  sourceBackedExplanationSteps,
} from "../explanation/native-explanation.js";

type CurrentExplanation = {
  readonly explanation: BindingUncertaintyExplanation;
};

const INVALID_ACTION_MESSAGE =
  "This Aurelia binding explanation is no longer valid. Request code actions again.";
const STALE_ACTION_MESSAGE =
  "This Aurelia binding changed before it could be explained. Request code actions again.";
const INCOMPLETE_ANSWER_MESSAGE =
  "Aurelia could not produce a current explanation for this binding.";
const AMBIGUOUS_SUBJECT_MESSAGE =
  "Aurelia found multiple current bindings at this cursor and cannot explain one safely yet.";
const REQUEST_FAILED_MESSAGE =
  "Aurelia could not load this binding explanation. Try the quick fix again.";

/** Presents one engine-owned explanation seeded by a command-only binding code action. */
export const BindingUncertaintyExplanationFeature: ClientFeature = {
  id: "binding-uncertainty-explanation",
  activate: (ctx, own) => {
    own(ctx.vscode.commands.registerCommand(AureliaCommand.ExplainBindingUncertainty, (value: unknown) =>
      ctx.errors.capture("command.explainBindingUncertainty", async () => {
        const seed = bindingUncertaintyExplanationSeed(value);
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

        const response = await ctx.lsp.getBindingUncertaintyExplanation(seed);
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

        const freshResponse = await ctx.lsp.getBindingUncertaintyExplanation(seed);
        if (!explanationDocumentIsCurrent(ctx.vscode, document, seed, invocationVersion)) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }
        const fresh = currentExplanation(ctx.vscode, seed, freshResponse);
        if (
          fresh == null
          || fresh.explanation.subject.subjectKey !== current.explanation.subject.subjectKey
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
          "The exact source for this binding explanation could not be opened.",
        );
      }, { notify: false }).then(async (outcome) => {
        if (!outcome.ok) await ctx.vscode.window.showInformationMessage(REQUEST_FAILED_MESSAGE);
        return outcome;
      })));
  },
};

function bindingUncertaintyExplanationSeed(value: unknown): BindingUncertaintyExplanationParams | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate["uri"] !== "string"
    || candidate["uri"].length === 0
    || typeof candidate["projectKey"] !== "string"
    || candidate["projectKey"].length === 0
    || !isNonNegativeInteger(candidate["documentVersion"])
    || !isProtocolPositionLike(candidate["position"])
    || !isProtocolRangeLike(candidate["range"])
    || !protocolPositionWithinRange(candidate["position"], candidate["range"])
  ) {
    return null;
  }
  return candidate as unknown as BindingUncertaintyExplanationParams;
}

function currentExplanation(
  vscode: VscodeApi,
  seed: BindingUncertaintyExplanationParams,
  response: BindingUncertaintyExplanationResponse | null,
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
    || subject.subjectKey.length === 0
    || subject.source.state !== "available"
    || !sameDocumentUri(vscode, subject.source.location.uri, seed.uri)
    || !protocolRangesEqual(subject.source.location.range, seed.range)
    || !protocolPositionWithinRange(seed.position, subject.source.location.range)
  ) {
    return null;
  }
  return { explanation };
}

function explanationRefusalMessage(response: BindingUncertaintyExplanationResponse | null): string {
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
      case "semanticAnswerUnavailable":
      case "subjectSourceUnavailable":
        return INCOMPLETE_ANSWER_MESSAGE;
    }
  }
  return INCOMPLETE_ANSWER_MESSAGE;
}
