import type {
  FrameworkCapabilityExplanation,
  FrameworkCapabilityExplanationParams,
  FrameworkCapabilityExplanationResponse,
  FrameworkCapabilityExplanationSourceTarget,
  ProtocolRange,
} from "@aurelia-ls/language-server/protocol";
import type { MessageItem, TextDocument } from "vscode";
import type { ClientFeature } from "../../core/feature.js";
import { sameDocumentUri } from "../../core/uri-identity.js";
import { AureliaCommand } from "../../product-contract.js";
import type { VscodeApi } from "../../vscode-api.js";

type ExplanationNextStep = FrameworkCapabilityExplanation["nextSteps"][number];

interface ExplanationButton extends MessageItem {
  readonly stepKey: string;
}

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
        const document = await diagnosticDocument(ctx.vscode, seed.uri);
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
        if (!documentIsCurrent(ctx.vscode, document, seed, invocationVersion)) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }
        const current = currentExplanation(ctx.vscode, seed, response);
        if (current == null) {
          await ctx.vscode.window.showInformationMessage(explanationRefusalMessage(response));
          return false;
        }

        const selected = await presentExplanation(ctx.vscode, current.explanation);
        if (selected == null) return true;
        if (!documentIsCurrent(ctx.vscode, document, seed, invocationVersion)) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }

        const freshResponse = await ctx.lsp.getFrameworkCapabilityExplanation(seed);
        if (!documentIsCurrent(ctx.vscode, document, seed, invocationVersion)) {
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
        const matchingSteps = sourceBackedNextSteps(fresh.explanation)
          .filter((step) => explanationStepKey(step) === selected.stepKey);
        if (matchingSteps.length !== 1) {
          await ctx.vscode.window.showInformationMessage(STALE_ACTION_MESSAGE);
          return false;
        }
        return openExplanationSource(ctx.vscode, matchingSteps[0]!.source);
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
    || !isProtocolPosition(candidate["position"])
    || !isProtocolRange(candidate["range"])
    || comparePositions(candidate["position"], candidate["range"].start) !== 0
  ) {
    return null;
  }
  return candidate as unknown as FrameworkCapabilityExplanationParams;
}

async function diagnosticDocument(vscode: VscodeApi, uri: string): Promise<TextDocument | null> {
  const open = vscode.workspace.textDocuments.find((document) => sameDocumentUri(vscode, document.uri, uri));
  if (open != null) return open;
  try {
    return await vscode.workspace.openTextDocument(vscode.Uri.parse(uri, true));
  } catch {
    return null;
  }
}

function documentIsCurrent(
  vscode: VscodeApi,
  document: TextDocument,
  seed: FrameworkCapabilityExplanationParams,
  invocationVersion: number,
): boolean {
  return document.isClosed !== true
    && document.version === invocationVersion
    && document.version === seed.documentVersion
    && sameDocumentUri(vscode, document.uri, seed.uri);
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
    || !positionWithinRange(seed.position, subject.source.location.range)
    || !rangesOverlap(seed.range, subject.source.location.range)
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

async function presentExplanation(
  vscode: VscodeApi,
  explanation: FrameworkCapabilityExplanation,
): Promise<ExplanationButton | null> {
  const detail = [
    explanation.conclusion.explanation,
    ...(explanation.uncertainty.state === "closed" ? [] : [explanation.uncertainty.explanation]),
    explanation.conclusion.action,
  ].map((value) => value.trim()).filter((value) => value.length > 0).join("\n\n");
  const groups = new Map<string, ExplanationNextStep[]>();
  for (const step of sourceBackedNextSteps(explanation)) {
    const key = explanationStepKey(step);
    const entries = groups.get(key) ?? [];
    entries.push(step);
    groups.set(key, entries);
  }
  const buttons = [...groups]
    .filter(([, steps]) => steps.length === 1)
    .slice(0, 3)
    .map(([stepKey, [step]]) => ({ title: step!.label, stepKey }));
  const selected = await vscode.window.showInformationMessage<ExplanationButton>(
    explanation.conclusion.title,
    { modal: true, detail },
    ...buttons,
  );
  return selected ?? null;
}

function sourceBackedNextSteps(explanation: FrameworkCapabilityExplanation): ExplanationNextStep[] {
  return explanation.nextSteps.filter((step) =>
    step.source.state === "available" && step.label.trim().length > 0
  );
}

function explanationStepKey(step: ExplanationNextStep): string {
  return JSON.stringify([step.kind, step.label, step.relatedQueryKind]);
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

async function openExplanationSource(
  vscode: VscodeApi,
  source: FrameworkCapabilityExplanationSourceTarget,
): Promise<boolean> {
  if (source.state !== "available") return false;
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(source.location.uri, true));
    const { range } = source.location;
    await vscode.window.showTextDocument(document, {
      preview: true,
      selection: new vscode.Range(
        new vscode.Position(range.start.line, range.start.character),
        new vscode.Position(range.end.line, range.end.character),
      ),
    });
    return true;
  } catch {
    await vscode.window.showInformationMessage(
      "The exact source for this explanation could not be opened.",
    );
    return false;
  }
}

function isProtocolPosition(value: unknown): value is { readonly line: number; readonly character: number } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const position = value as Record<string, unknown>;
  return isNonNegativeInteger(position["line"]) && isNonNegativeInteger(position["character"]);
}

function isProtocolRange(value: unknown): value is ProtocolRange {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const range = value as Record<string, unknown>;
  return isProtocolPosition(range["start"])
    && isProtocolPosition(range["end"])
    && comparePositions(range["start"], range["end"]) <= 0;
}

function positionWithinRange(
  position: { readonly line: number; readonly character: number },
  range: ProtocolRange,
): boolean {
  return comparePositions(range.start, position) <= 0 && comparePositions(position, range.end) <= 0;
}

function rangesOverlap(left: ProtocolRange, right: ProtocolRange): boolean {
  return comparePositions(left.start, right.end) <= 0 && comparePositions(right.start, left.end) <= 0;
}

function comparePositions(
  left: { readonly line: number; readonly character: number },
  right: { readonly line: number; readonly character: number },
): number {
  return left.line === right.line ? left.character - right.character : left.line - right.line;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
