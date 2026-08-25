import type { MessageItem, TextDocument } from "vscode";
import { sameDocumentUri } from "../../core/uri-identity.js";
import {
  emitExtensionHostObservation,
  nextExtensionHostObservationId,
} from "../../extension-host-observation.js";
import type { VscodeApi } from "../../vscode-api.js";

export interface ProtocolPositionLike {
  readonly line: number;
  readonly character: number;
}

export interface ProtocolRangeLike {
  readonly start: ProtocolPositionLike;
  readonly end: ProtocolPositionLike;
}

export interface ExplanationSeedLike {
  readonly uri: string;
  readonly documentVersion: number;
}

export type NativeExplanationSourceTarget =
  | {
      readonly state: "available";
      readonly location: {
        readonly uri: string;
        readonly range: ProtocolRangeLike;
        readonly label: string;
      };
    }
  | { readonly state: "absent" }
  | { readonly state: "unavailable"; readonly reason: string };

export interface NativeExplanationNextStep {
  readonly kind: string;
  readonly label: string;
  readonly relatedQueryKind: string | null;
  readonly source: NativeExplanationSourceTarget;
}

export interface NativeExplanation {
  readonly conclusion: {
    readonly title: string;
    readonly explanation: string;
    readonly action: string;
  };
  readonly uncertainty: {
    readonly state: string;
    readonly explanation: string;
  };
  readonly nextSteps: readonly NativeExplanationNextStep[];
}

export interface ExplanationButton extends MessageItem {
  readonly stepKey: string;
}

export async function explanationDocument(
  vscode: VscodeApi,
  uri: string,
): Promise<TextDocument | null> {
  const open = vscode.workspace.textDocuments.find((document) => sameDocumentUri(vscode, document.uri, uri));
  if (open != null) return open;
  try {
    return await vscode.workspace.openTextDocument(vscode.Uri.parse(uri, true));
  } catch {
    return null;
  }
}

export function explanationDocumentIsCurrent(
  vscode: VscodeApi,
  document: TextDocument,
  seed: ExplanationSeedLike,
  invocationVersion: number,
): boolean {
  return document.isClosed !== true
    && document.version === invocationVersion
    && document.version === seed.documentVersion
    && sameDocumentUri(vscode, document.uri, seed.uri);
}

export async function presentNativeExplanation<TStep extends NativeExplanationNextStep>(
  vscode: VscodeApi,
  explanation: NativeExplanation & { readonly nextSteps: readonly TStep[] },
): Promise<ExplanationButton | null> {
  const detail = [
    explanation.conclusion.explanation,
    ...(explanation.uncertainty.state === "closed" ? [] : [explanation.uncertainty.explanation]),
    explanation.conclusion.action,
  ].map((value) => value.trim()).filter((value) => value.length > 0).join("\n\n");
  const groups = new Map<string, TStep[]>();
  for (const step of sourceBackedExplanationSteps(explanation)) {
    const key = explanationStepKey(step);
    const entries = groups.get(key) ?? [];
    entries.push(step);
    groups.set(key, entries);
  }
  const buttons = [...groups]
    .filter(([, steps]) => steps.length === 1)
    .slice(0, 3)
    .map(([stepKey, [step]]) => ({ title: step!.label, stepKey }));
  const observationId = nextExtensionHostObservationId("native-explanation");
  const presentation = vscode.window.showInformationMessage<ExplanationButton>(
    explanation.conclusion.title,
    { modal: true, detail },
    ...buttons,
  );
  if (observationId != null) {
    emitExtensionHostObservation({
      source: "native-explanation",
      observationId,
      phase: "modal-requested",
      title: explanation.conclusion.title,
      uncertaintyState: explanation.uncertainty.state,
      buttonCount: buttons.length,
      modal: true,
    });
  }
  const selected = await presentation;
  if (observationId != null) {
    emitExtensionHostObservation({
      source: "native-explanation",
      observationId,
      phase: "modal-settled",
      selectedStepKey: selected?.stepKey ?? null,
    });
  }
  return selected ?? null;
}

export function sourceBackedExplanationSteps<TStep extends NativeExplanationNextStep>(
  explanation: { readonly nextSteps: readonly TStep[] },
): TStep[] {
  return explanation.nextSteps.filter((step) =>
    step.source.state === "available" && step.label.trim().length > 0
  );
}

export function explanationStepKey(step: NativeExplanationNextStep): string {
  return JSON.stringify([step.kind, step.label, step.relatedQueryKind]);
}

export async function openExplanationSource(
  vscode: VscodeApi,
  source: NativeExplanationSourceTarget,
  unavailableMessage: string,
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
    await vscode.window.showInformationMessage(unavailableMessage);
    return false;
  }
}

export function isProtocolPositionLike(value: unknown): value is ProtocolPositionLike {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const position = value as Record<string, unknown>;
  return isNonNegativeInteger(position["line"]) && isNonNegativeInteger(position["character"]);
}

export function isProtocolRangeLike(value: unknown): value is ProtocolRangeLike {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const range = value as Record<string, unknown>;
  return isProtocolPositionLike(range["start"])
    && isProtocolPositionLike(range["end"])
    && compareProtocolPositions(range["start"], range["end"]) <= 0;
}

export function protocolPositionWithinRange(
  position: ProtocolPositionLike,
  range: ProtocolRangeLike,
): boolean {
  return compareProtocolPositions(range.start, position) <= 0
    && compareProtocolPositions(position, range.end) <= 0;
}

export function protocolRangesOverlap(left: ProtocolRangeLike, right: ProtocolRangeLike): boolean {
  return compareProtocolPositions(left.start, right.end) <= 0
    && compareProtocolPositions(right.start, left.end) <= 0;
}

export function protocolRangesEqual(left: ProtocolRangeLike, right: ProtocolRangeLike): boolean {
  return compareProtocolPositions(left.start, right.start) === 0
    && compareProtocolPositions(left.end, right.end) === 0;
}

export function compareProtocolPositions(
  left: ProtocolPositionLike,
  right: ProtocolPositionLike,
): number {
  return left.line === right.line ? left.character - right.character : left.line - right.line;
}

export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
