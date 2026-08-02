import { describe, expect, test, vi } from "vitest";
import type { CancellationToken } from "vscode";
import { showResourceQuickPick } from "../../../out/features/resource-discovery/quick-pick.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

describe("resource discovery Quick Pick", () => {
  test("cancels in-flight semantic work silently when the picker closes", async () => {
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    let requestToken: CancellationToken | null = null;
    const never = new Promise<never>(() => {});

    const outcome = showResourceQuickPick(vscode, "Resources", async (token) => {
      requestToken = token;
      return await never;
    });
    await vi.waitFor(() => expect(recorded.quickPicks).toHaveLength(1));
    recorded.quickPicks[0]!.hide();

    await expect(outcome).resolves.toEqual({ status: "cancelled" });
    expect(requestToken?.isCancellationRequested).toBe(true);
  });

  test("returns Back as a distinct outcome in a multi-step flow", async () => {
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;

    const outcome = showResourceQuickPick(vscode, "Resources", async () => ({
      title: "Choose project",
      placeholder: "Choose one",
      items: [{ label: "app" }],
      step: 2,
      totalSteps: 3,
    }), true);
    await vi.waitFor(() => expect(recorded.quickPicks[0]?.items).toHaveLength(1));
    recorded.quickPicks[0]!.back();

    await expect(outcome).resolves.toEqual({ status: "back" });
  });
});
