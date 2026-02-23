import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";

describe("workspace determinism (fingerprint)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;
  let appUri: string;
  let appText: string;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
    appUri = harness.openTemplate("src/my-app.html");
    const text = harness.readText(appUri);
    if (!text) {
      throw new Error("Expected template text for workspace-contract my-app.html");
    }
    appText = text;
  });

  // NOTE: This suite only covers fingerprint stability. Incremental invalidation is tracked in workspace-incremental-churn.
  it("keeps snapshot fingerprints stable for identical inputs", () => {
    const first = harness.workspace.snapshot().meta.fingerprint;
    const second = harness.workspace.snapshot().meta.fingerprint;
    expect(second).toBe(first);
  });

  it("restores fingerprint after update and revert to identical content", () => {
    const baseline = harness.workspace.snapshot().meta.fingerprint;
    const mutated = `${appText}\n<!-- determinism-mutation -->\n`;
    harness.updateTemplate(appUri, mutated, 2);
    const changed = harness.workspace.snapshot().meta.fingerprint;
    expect(changed).not.toBe(baseline);

    harness.updateTemplate(appUri, appText, 3);
    const reverted = harness.workspace.snapshot().meta.fingerprint;
    expect(reverted).toBe(baseline);
  });
});
