import { beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId } from "./fixtures/index.js";

describe("workspace determinism (fingerprint)", () => {
  let harness: Awaited<ReturnType<typeof createWorkspaceHarness>>;

  beforeAll(async () => {
    harness = await createWorkspaceHarness({
      fixtureId: asFixtureId("workspace-contract"),
      openTemplates: "none",
    });
  });

  // NOTE: This suite only covers fingerprint stability. Incremental invalidation is tracked in workspace-incremental-churn.
  it("keeps snapshot fingerprints stable for identical inputs", () => {
    const first = harness.workspace.snapshot().meta.fingerprint;
    const second = harness.workspace.snapshot().meta.fingerprint;
    expect(second).toBe(first);
  });
});
