import fs from "node:fs";
import path from "node:path";
import { asDocumentUri } from "@aurelia-ls/compiler";
import { describe, expect, it } from "vitest";
import { createSemanticAuthorityHostRuntime } from "../src/host/runtime.js";
import { asFixtureId, getFixture, resolveFixtureRoot } from "./fixtures/index.js";
import { findPosition } from "./test-utils.js";
import type {
  ReplayableCommandInvocation,
  SemanticAuthorityCommandInvocation,
} from "../src/host/types.js";

const fixture = getFixture(asFixtureId("workspace-contract"));
const fixtureRoot = resolveFixtureRoot(fixture);
if (!fixtureRoot) {
  throw new Error("workspace-contract fixture root is required for host tests.");
}
const appPath = path.join(fixtureRoot, "src", "my-app.html");
const appUri = asDocumentUri(appPath);
const appText = fs.readFileSync(appPath, "utf8");

function createHost() {
  return createSemanticAuthorityHostRuntime();
}

async function openSession(host: ReturnType<typeof createHost>) {
  const open = await host.execute({
    command: "session.open",
    args: {
      workspaceRoot: fixtureRoot,
      policy: { profile: "ai.product" },
    },
  } satisfies SemanticAuthorityCommandInvocation<"session.open">);
  expect(open.status).toBe("ok");
  return open.result.sessionId;
}

describe("semantic-authority host runtime", () => {
  it("returns canonical envelope for session.open", async () => {
    const host = createHost();
    const response = await host.execute({
      command: "session.open",
      args: {
        workspaceRoot: fixtureRoot,
        policy: { profile: "ai.product" },
      },
    });

    expect(response.schemaVersion).toBe("v1alpha1");
    expect(response.status).toBe("ok");
    expect(response.policy.profile).toBe("ai.product");
    expect(response.meta.commandId).toMatch(/cmd-/);
    expect(response.result.sessionId).toMatch(/^session-/);
  });

  it("runs pressure scenario and replays without divergence", async () => {
    const host = createHost();
    const sessionId = await openSession(host);

    const scenario = await host.execute({
      command: "pressure.runScenario",
      args: {
        sessionId,
        steps: [
          { command: "doc.open", args: { uri: appUri, text: appText } },
          {
            command: "query.completions",
            args: { uri: appUri, position: findPosition(appText, "<summary-panel", 1) },
          },
          {
            command: "query.hover",
            args: { uri: appUri, position: findPosition(appText, "<summary-panel", 1) },
          },
        ],
      },
    } satisfies SemanticAuthorityCommandInvocation<"pressure.runScenario">);

    expect(scenario.status).toBe("ok");
    expect(scenario.result.steps.length).toBe(3);

    const exported = await host.execute({
      command: "replay.exportRun",
      args: { sessionId, runId: scenario.result.runId },
    } satisfies SemanticAuthorityCommandInvocation<"replay.exportRun">);

    expect(exported.status).toBe("ok");
    expect(exported.result).toBeTruthy();
    expect(exported.result!.records.length).toBeGreaterThanOrEqual(3);

    const replay = await host.execute({
      command: "replay.run",
      args: { sessionId, run: exported.result! },
    } satisfies SemanticAuthorityCommandInvocation<"replay.run">);

    expect(replay.status).toBe("ok");
    expect(replay.result.divergenceCount).toBe(0);
  });

  it("verifies deterministic hash for fixed invocation", async () => {
    const host = createHost();
    const sessionId = await openSession(host);

    const invocation: ReplayableCommandInvocation = {
      command: "query.snapshot",
      args: { sessionId },
    };

    const result = await host.execute({
      command: "verify.determinism",
      args: {
        sessionId,
        invocation,
        runs: 3,
      },
    } satisfies SemanticAuthorityCommandInvocation<"verify.determinism">);

    expect(result.status).toBe("ok");
    expect(result.result.deterministic).toBe(true);
    expect(result.result.divergenceIndexes.length).toBe(0);
  });

  it("preserves what/why/howToClose on degraded parity verification", async () => {
    const host = createHost();
    const sessionId = await openSession(host);

    const parity = await host.execute({
      command: "verify.parity",
      args: {
        sessionId,
        invocation: { command: "query.snapshot", args: { sessionId } },
      },
    } satisfies SemanticAuthorityCommandInvocation<"verify.parity">);

    expect(parity.status).toBe("degraded");
    expect(parity.epistemic.gaps.length).toBeGreaterThan(0);

    const conservation = await host.execute({
      command: "verify.gapConservation",
      args: {
        sessionId,
        envelope: parity,
      },
    } satisfies SemanticAuthorityCommandInvocation<"verify.gapConservation">);

    expect(conservation.status).toBe("ok");
    expect(conservation.result.conserved).toBe(true);
    expect(conservation.result.missingFields.length).toBe(0);
  });
});
