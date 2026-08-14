import type { AnalysisLimitationItem, AnalysisLimitationSourceTarget } from "@aurelia-ls/language-server/protocol";
import type { ClientLogger } from "../../log.js";
import type { VscodeApi } from "../../vscode-api.js";

export interface AnalysisLimitationReviewEntry {
  readonly workspaceKey: string;
  readonly projectKey: string;
  readonly fingerprint: string;
  readonly row: AnalysisLimitationItem;
}

type ReviewQuickPickItem =
  | {
      readonly itemKind: "finding";
      readonly label: string;
      readonly description: string;
      readonly detail: string;
      readonly entry: AnalysisLimitationReviewEntry;
    }
  | {
      readonly itemKind: "configuration";
      readonly label: string;
      readonly description: string;
      readonly detail: string;
      readonly entry: AnalysisLimitationReviewEntry;
    };

export type AnalysisLimitationReprove = (
  entry: AnalysisLimitationReviewEntry,
) => Promise<readonly AnalysisLimitationReviewEntry[]>;

/** Presents only engine-authored finding text and exact URI-safe navigation targets. */
export async function reviewAnalysisLimitations(
  vscode: VscodeApi,
  logger: Pick<ClientLogger, "warn">,
  entries: readonly AnalysisLimitationReviewEntry[],
  reprove: AnalysisLimitationReprove,
): Promise<boolean> {
  if (entries.length === 0) {
    await vscode.window.showInformationMessage(
      "No current Aurelia analysis limitations are available to review.",
    );
    return false;
  }

  const items: ReviewQuickPickItem[] = entries.map((entry) => ({
    itemKind: "finding",
    label: entry.row.title,
    description: entry.row.explanation,
    detail: entry.row.action,
    entry,
  }));
  for (const { entry } of distinctConfigurationSources(entries)) {
    items.push({
      itemKind: "configuration",
      label: "Open Configuration",
      description: "Aurelia finding policy",
      detail: "Open the exact project policy that controls this finding.",
      entry,
    });
  }

  const selected = await vscode.window.showQuickPick<ReviewQuickPickItem>(items, {
    title: "Aurelia Analysis Limitations",
    placeHolder: "Review what prevents complete static analysis",
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (selected == null) return false;
  const current = await reproveSelection(vscode, logger, selected.entry, reprove);
  if (current == null) return false;
  if (selected.itemKind === "configuration") {
    return openExactSource(vscode, logger, current.row.effectivePolicy.source, "configuration");
  }
  return openExactSource(vscode, logger, current.row.source, "finding");
}

function distinctConfigurationSources(
  entries: readonly AnalysisLimitationReviewEntry[],
): readonly {
  readonly entry: AnalysisLimitationReviewEntry;
  readonly source: Extract<AnalysisLimitationSourceTarget, { readonly state: "available" }>;
}[] {
  const sources = new Map<string, {
    readonly entry: AnalysisLimitationReviewEntry;
    readonly source: Extract<AnalysisLimitationSourceTarget, { readonly state: "available" }>;
  }>();
  for (const entry of entries) {
    const { row } = entry;
    const source = row.effectivePolicy.source;
    if (source.state !== "available") continue;
    sources.set(sourceIdentity(source), { entry, source });
  }
  return [...sources.values()];
}

async function reproveSelection(
  vscode: VscodeApi,
  logger: Pick<ClientLogger, "warn">,
  selected: AnalysisLimitationReviewEntry,
  reprove: AnalysisLimitationReprove,
): Promise<AnalysisLimitationReviewEntry | null> {
  try {
    const fresh = (await reprove(selected)).filter((entry) =>
      entry.workspaceKey === selected.workspaceKey
      && entry.projectKey === selected.projectKey
      && entry.row.findingKey === selected.row.findingKey
    );
    if (fresh.length === 1) return fresh[0]!;
  } catch (error) {
    logger.warn("analysisLimitations.reprove.failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  await vscode.window.showInformationMessage(
    "This analysis limitation changed while the review was open. Run Review Analysis Limitations again.",
  );
  return null;
}

function sourceIdentity(source: Extract<AnalysisLimitationSourceTarget, { readonly state: "available" }>): string {
  const { range, uri } = source.location;
  return `${uri}\u0000${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

async function openExactSource(
  vscode: VscodeApi,
  logger: Pick<ClientLogger, "warn">,
  source: AnalysisLimitationSourceTarget,
  role: "configuration" | "finding",
): Promise<boolean> {
  if (source.state !== "available") {
    await vscode.window.showInformationMessage(
      role === "finding"
        ? "The exact source location for this analysis limitation is not currently available."
        : "The exact Aurelia project configuration location is not currently available.",
    );
    return false;
  }
  try {
    const uri = vscode.Uri.parse(source.location.uri, true);
    const document = await vscode.workspace.openTextDocument(uri);
    const range = source.location.range;
    await vscode.window.showTextDocument(document, {
      preview: true,
      selection: new vscode.Range(
        new vscode.Position(range.start.line, range.start.character),
        new vscode.Position(range.end.line, range.end.character),
      ),
    });
    return true;
  } catch (error) {
    logger.warn("analysisLimitations.navigation.failed", {
      role,
      message: error instanceof Error ? error.message : String(error),
    });
    await vscode.window.showInformationMessage(
      "The exact Aurelia analysis source could not be opened. See Aurelia Output for details.",
    );
    return false;
  }
}
