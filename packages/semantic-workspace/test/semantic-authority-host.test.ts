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
    expect(response.meta.memory.rssMb).toBeGreaterThan(0);
    expect(response.meta.memory.heapUsedMb).toBeGreaterThan(0);
    expect(response.meta.memory.heapTotalMb).toBeGreaterThan(0);
    expect(response.result.sessionId).toMatch(/^session-/);
  });

  it("reuses cached workspace authority across sequential sessions", async () => {
    const host = createHost();
    const first = await host.execute({
      command: "session.open",
      args: {
        workspaceRoot: fixtureRoot,
        policy: { profile: "ai.product" },
      },
    } satisfies SemanticAuthorityCommandInvocation<"session.open">);

    expect(first.status).toBe("ok");
    expect(first.meta.cache.hit).toBe(false);
    expect(first.meta.cache.tier).toBe("cold");

    const closedFirst = await host.execute({
      command: "session.close",
      args: { sessionId: first.result.sessionId },
    } satisfies SemanticAuthorityCommandInvocation<"session.close">);

    expect(closedFirst.status).toBe("ok");
    expect(closedFirst.result.closed).toBe(true);

    const second = await host.execute({
      command: "session.open",
      args: {
        workspaceRoot: fixtureRoot,
        policy: { profile: "ai.product" },
      },
    } satisfies SemanticAuthorityCommandInvocation<"session.open">);

    expect(second.status).toBe("ok");
    expect(second.meta.cache.hit).toBe(true);
    expect(second.meta.cache.tier).toBe("warm");

    const closedSecond = await host.execute({
      command: "session.close",
      args: { sessionId: second.result.sessionId },
    } satisfies SemanticAuthorityCommandInvocation<"session.close">);

    expect(closedSecond.status).toBe("ok");
    expect(closedSecond.result.closed).toBe(true);
  });

  it("reports unknown confidence when hover has no semantic match", async () => {
    const host = createHost();
    const sessionId = await openSession(host);

    await host.execute({
      command: "doc.open",
      args: { sessionId, uri: appUri, text: appText },
    } satisfies SemanticAuthorityCommandInvocation<"doc.open">);

    const position = findPosition(appText, "<section", 1);
    const hover = await host.execute({
      command: "query.hover",
      args: {
        sessionId,
        uri: appUri,
        position,
      },
    } satisfies SemanticAuthorityCommandInvocation<"query.hover">);

    expect(hover.status).toBe("ok");
    expect(hover.result.hover).toBeNull();
    expect(hover.epistemic.confidence).toBe("unknown");
    expect(hover.epistemic.unknownReason).toBe("non-symbol-position");
    expect(hover.epistemic.gaps.length).toBeGreaterThan(0);
    expect(hover.epistemic.gaps[0]?.howToClose).toContain("Move the position");
    expect(hover.epistemic.provenanceRefs).toEqual([]);

    const navigation = await host.execute({
      command: "query.navigation",
      args: {
        sessionId,
        uri: appUri,
        position,
        mode: "definition",
      },
    } satisfies SemanticAuthorityCommandInvocation<"query.navigation">);

    expect(navigation.status).toBe("ok");
    expect(navigation.result.locations).toEqual([]);
    expect(navigation.epistemic.confidence).toBe("unknown");
    expect(navigation.epistemic.unknownReason).toBe("non-symbol-position");
    expect(navigation.epistemic.gaps[0]?.howToClose).toContain("Move the position");
  });

  it("classifies unknown confidence as unresolved-authority when diagnostics overlap query position", async () => {
    const host = createHost();
    const sessionId = await openSession(host);
    const withUnknownElement = appText.replace(
      "  <summary-panel",
      "  <unknown-widget></unknown-widget>\n  <summary-panel",
    );

    await host.execute({
      command: "doc.open",
      args: { sessionId, uri: appUri, text: withUnknownElement },
    } satisfies SemanticAuthorityCommandInvocation<"doc.open">);

    const hover = await host.execute({
      command: "query.hover",
      args: {
        sessionId,
        uri: appUri,
        position: findPosition(withUnknownElement, "<unknown-widget", 1),
      },
    } satisfies SemanticAuthorityCommandInvocation<"query.hover">);

    expect(hover.status).toBe("ok");
    expect(hover.result.hover).toBeNull();
    expect(hover.epistemic.confidence).toBe("unknown");
    expect(hover.epistemic.unknownReason).toBe("unresolved-authority");
    expect(hover.epistemic.gaps.length).toBeGreaterThan(0);
    expect(hover.epistemic.gaps[0]?.why).toContain("aurelia/unknown-");
    expect(hover.epistemic.gaps[0]?.howToClose).toContain("declaration/registration");

    const navigation = await host.execute({
      command: "query.navigation",
      args: {
        sessionId,
        uri: appUri,
        position: findPosition(withUnknownElement, "<unknown-widget", 1),
        mode: "definition",
      },
    } satisfies SemanticAuthorityCommandInvocation<"query.navigation">);

    expect(navigation.status).toBe("ok");
    expect(navigation.result.locations).toEqual([]);
    expect(navigation.epistemic.confidence).toBe("unknown");
    expect(navigation.epistemic.unknownReason).toBe("unresolved-authority");
    expect(navigation.epistemic.gaps[0]?.why).toContain("aurelia/unknown-");
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

  it("runs sweep mode with per-surface coverage and replay handles", async () => {
    const host = createHost();
    const sessionId = await openSession(host);

    const sweep = await host.execute({
      command: "pressure.runScenario",
      args: {
        sessionId,
        sweep: {
          corpusId: "workspace-contract",
          mutatedCorpus: true,
          surfaces: [
            "diagnostics",
            "completions",
            "hover",
            "navigation",
            "rename",
            "semanticTokens",
          ],
          traversal: {
            includeExtensions: [".html"],
            maxFiles: 1,
          },
          sampling: {
            everyN: 10,
            maxPositionsPerFile: 8,
            renameMaxPositionsPerFile: 2,
          },
          output: {
            includeObservations: true,
            maxObservations: 64,
          },
        },
      },
    } satisfies SemanticAuthorityCommandInvocation<"pressure.runScenario">);

    expect(["ok", "degraded"]).toContain(sweep.status);
    expect(sweep.result.steps).toEqual([]);
    expect(sweep.result.sweep).toBeTruthy();
    expect(sweep.result.sweep!.corpusId).toBe("workspace-contract");
    expect(sweep.result.sweep!.mutatedCorpus).toBe(true);
    expect(sweep.result.sweep!.traversal.crawledFiles).toBeGreaterThan(0);
    expect(sweep.result.sweep!.observationCount).toBeGreaterThan(0);
    expect(sweep.result.sweep!.surfaces.map((entry) => entry.surface)).toEqual([
      "diagnostics",
      "completions",
      "hover",
      "navigation",
      "rename",
      "semanticTokens",
    ]);

    const firstObservation = sweep.result.sweep!.observations[0];
    expect(firstObservation).toBeTruthy();
    expect(firstObservation?.replay.sessionId).toBe(sessionId);
    expect(firstObservation?.replay.runId).toBe(sweep.result.runId);
  });

  it("rolls up sweep status monotonically when contained observations are degraded", async () => {
    const host = createHost();
    const sessionId = await openSession(host);

    const sweep = await host.execute({
      command: "pressure.runScenario",
      args: {
        sessionId,
        sweep: {
          corpusId: "workspace-contract",
          mutatedCorpus: false,
          surfaces: ["rename"],
          traversal: {
            includeExtensions: [".html"],
            maxFiles: 1,
          },
          sampling: {
            everyN: 64,
            maxPositionsPerFile: 1,
            renameMaxPositionsPerFile: 1,
          },
          output: {
            includeObservations: true,
            maxObservations: 8,
          },
        },
      },
    } satisfies SemanticAuthorityCommandInvocation<"pressure.runScenario">);

    expect(sweep.result.sweep).toBeTruthy();
    const renameSummary = sweep.result.sweep!.surfaces.find((entry) => entry.surface === "rename");
    expect(renameSummary).toBeTruthy();
    const nonOkObservationCount = (renameSummary?.degraded ?? 0) + (renameSummary?.error ?? 0);
    expect(nonOkObservationCount).toBeGreaterThan(0);
    expect(sweep.result.sweep!.anomalyCount).toBe(0);
    expect(sweep.result.stoppedEarly).toBe(false);
    expect(sweep.status).toBe("degraded");
    expect(sweep.epistemic.gaps.some((gap) => gap.what === "Sweep contained non-ok observations")).toBe(true);
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
