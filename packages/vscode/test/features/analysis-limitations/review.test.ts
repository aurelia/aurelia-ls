import { describe, expect, test, vi } from "vitest";
import type { AnalysisLimitationItem } from "@aurelia-ls/language-server/protocol";
import {
  reviewAnalysisLimitations,
  type AnalysisLimitationReviewEntry,
} from "../../../out/features/analysis-limitations/review.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

const dynamicRegistrationSpreadRuleId: `${AnalysisLimitationItem["ruleId"]}` =
  "aurelia.analysis.dynamic-registration-spread";
const openCoverage: `${AnalysisLimitationItem["currentCoverage"]}` = "open";

function row(configured: boolean, sourceLine = 4): AnalysisLimitationItem {
  const source = {
    state: "available" as const,
    location: {
      uri: "file:///repo/src/main.ts",
      range: { start: { line: sourceLine, character: 3 }, end: { line: sourceLine, character: 15 } },
    },
  };
  return {
    findingKey: "finding:one",
    ruleId: dynamicRegistrationSpreadRuleId as AnalysisLimitationItem["ruleId"],
    authority: "semantic-runtime-rule",
    title: "Engine finding title",
    explanation: "Engine explanation of uncertainty.",
    action: "Engine-authored next action.",
    reason: {
      summary: "The registration spread remains dynamic.",
      seamKindKeys: [],
      boundaryKinds: [],
      reasonKinds: [],
    },
    source,
    currentCoverage: openCoverage as AnalysisLimitationItem["currentCoverage"],
    evidence: { openSeamSiteKey: "site:one", seamKeys: [], materializations: [], products: [] },
    effectivePolicy: {
      ruleId: dynamicRegistrationSpreadRuleId as AnalysisLimitationItem["ruleId"],
      disposition: "information",
      authority: configured ? "project-configuration" : "default",
      source: configured
        ? {
            state: "available" as const,
            location: {
              uri: "file:///repo/aurelia.project.json",
              range: { start: { line: 8, character: 2 }, end: { line: 8, character: 60 } },
            },
          }
        : { state: "absent" as const },
    },
  };
}

function entry(configured: boolean, sourceLine = 4): AnalysisLimitationReviewEntry {
  return {
    workspaceKey: "file:///repo",
    projectKey: "app",
    fingerprint: "semantic-runtime:one",
    row: row(configured, sourceLine),
  };
}

describe("analysis limitation review", () => {
  test("uses engine-authored copy and opens the exact finding range", async () => {
    const { vscode: stub, recorded } = createVscodeApi();
    const showQuickPick = vi.fn(async (items: readonly unknown[]) => items[0]);
    Object.assign(stub.window, { showQuickPick });
    const logger = { warn: vi.fn() };

    const opened = await reviewAnalysisLimitations(
      stub as unknown as VscodeApi,
      logger,
      [entry(false)],
      async (selected) => [selected],
    );

    expect(opened).toBe(true);
    expect(showQuickPick.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        label: "Engine finding title",
        description: "Engine explanation of uncertainty.",
        detail: "Engine-authored next action.",
      }),
    ]);
    expect(recorded.openedDocuments[0]?.uri.toString()).toBe("file:///repo/src/main.ts");
    expect(recorded.shownDocuments[0]?.opts).toEqual(expect.objectContaining({
      preview: true,
      selection: expect.objectContaining({
        start: expect.objectContaining({ line: 4, character: 3 }),
        end: expect.objectContaining({ line: 4, character: 15 }),
      }),
    }));
  });

  test("offers exact configuration navigation only for an authored policy source", async () => {
    const { vscode: stub, recorded } = createVscodeApi();
    const showQuickPick = vi.fn(async (items: readonly unknown[]) => items.at(-1));
    Object.assign(stub.window, { showQuickPick });

    await reviewAnalysisLimitations(
      stub as unknown as VscodeApi,
      { warn: vi.fn() },
      [entry(true)],
      async (selected) => [selected],
    );

    const items = showQuickPick.mock.calls[0]?.[0] as readonly { readonly label: string }[];
    expect(items.map((item) => item.label)).toEqual([
      "Engine finding title",
      "Open Configuration",
    ]);
    expect(recorded.openedDocuments[0]?.uri.toString()).toBe("file:///repo/aurelia.project.json");

    const absent = createVscodeApi();
    const absentPicker = vi.fn(async (_items: readonly unknown[]) => undefined);
    Object.assign(absent.vscode.window, { showQuickPick: absentPicker });
    await reviewAnalysisLimitations(
      absent.vscode as unknown as VscodeApi,
      { warn: vi.fn() },
      [entry(false)],
      async (selected) => [selected],
    );
    expect((absentPicker.mock.calls[0]?.[0] as readonly unknown[])).toHaveLength(1);
  });

  test("re-proves the accepted finding and refuses a row that vanished while the picker was open", async () => {
    const { vscode: stub, recorded } = createVscodeApi();
    Object.assign(stub.window, { showQuickPick: async (items: readonly unknown[]) => items[0] });
    const reprove = vi.fn(async () => [] as readonly AnalysisLimitationReviewEntry[]);

    const opened = await reviewAnalysisLimitations(
      stub as unknown as VscodeApi,
      { warn: vi.fn() },
      [entry(false)],
      reprove,
    );

    expect(opened).toBe(false);
    expect(reprove).toHaveBeenCalledOnce();
    expect(recorded.openedDocuments).toEqual([]);
    expect(recorded.infoMessages).toContain(
      "This analysis limitation changed while the review was open. Run Review Analysis Limitations again.",
    );
  });

  test("uses the freshly mapped source when the stable finding survives a newer generation", async () => {
    const { vscode: stub, recorded } = createVscodeApi();
    Object.assign(stub.window, { showQuickPick: async (items: readonly unknown[]) => items[0] });

    await reviewAnalysisLimitations(
      stub as unknown as VscodeApi,
      { warn: vi.fn() },
      [entry(false, 4)],
      async () => [{ ...entry(false, 9), fingerprint: "semantic-runtime:two" }],
    );

    const selection = recorded.shownDocuments[0]?.opts as { readonly selection?: { readonly start?: { readonly line?: number } } };
    expect(selection.selection?.start?.line).toBe(9);
  });
});
