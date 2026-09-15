import { pathToFileURL, fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const runnerPath = fileURLToPath(new URL("../scripts/run-extension-host-tests.mjs", import.meta.url));

function scopedPublication(coverage: "open" | "truncated" = "open") {
  const witness = { projectKey: "host-open", result: "answered", coverage, rowCount: 2 };
  const node = (eventOrdinal: number, event: Record<string, unknown>): {
    eventOrdinal: number;
    event: Record<string, unknown>;
  } => ({
    eventOrdinal,
    event: {
      source: "resource-explorer",
      phase: "publish-node",
      observationId: "scoped-publication",
      generation: 2,
      publicationKind: "current",
      ordinal: eventOrdinal - 1,
      ...event,
    },
  });
  const project = node(1, {
    nodeKind: "project",
    nodeId: "open-project",
    parentId: null,
    label: "host-open",
    contextValue: "resourceProjectIssue",
    answerResult: "answered",
    answerCoverage: coverage,
    answerRowCount: 2,
  });
  const app = node(2, {
    nodeKind: "resource",
    nodeId: "open-app",
    parentId: "open-project",
    navigationProjectKey: "host-open",
    answerResult: "answered",
    answerCoverage: coverage,
    answerRowCount: 2,
  });
  const framework = node(3, {
    nodeKind: "resource",
    nodeId: "framework-resource",
    parentId: "open-project",
    navigationProjectKey: null,
    answerResult: "answered",
    answerCoverage: coverage,
    answerRowCount: 2,
  });
  const published = node(4, { phase: "publish-complete", nodeCount: 3 });
  const baseline = node(5, { phase: "publish-complete", generation: 3 });
  return {
    witness,
    reference: { eventOrdinal: 4, observationId: "scoped-publication", phase: "publish-complete" },
    context: {
      ledgerRecords: [project, app, framework, published, baseline],
      referencedOrdinals: new Set(),
      fixture: {
        projects: ["host-alpha", "host-beta", "host-guardrail", "host-open"]
          .map((projectKey) => ({ projectKey })),
      },
      baseline: { published: baseline },
    },
  };
}

describe("Resource Explorer default-app host evidence", () => {
  test("authenticates a scoped publication independently of the restored baseline", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const { reference, context, witness } = scopedPublication();
    expect(runner.validateScopedDefaultAppPublication(reference, context, witness, "open"))
      .toEqual(context.ledgerRecords.slice(0, 3));
  });

  test("rejects non-default corpus rows even when their project root is absent", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    for (const field of ["navigationProjectKey", "implementationProjectKey"]) {
      const { context } = scopedPublication();
      const nodes = context.ledgerRecords.slice(0, 2);
      nodes[1]!.event[field] = "host-beta";
      expect(() => runner.validateDefaultAppPublicationProjects(nodes, context.fixture, "host-open", "open"))
        .toThrow(/exclude non-default corpus app 'host-beta'/u);
    }
  });

  test("rejects an extra non-default project root with no navigable rows", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const { context } = scopedPublication();
    const nodes = context.ledgerRecords.slice(0, 2);
    nodes.push({
      eventOrdinal: 3,
      event: { ...nodes[0]!.event, nodeId: "beta-project", label: "host-beta" },
    });
    expect(() => runner.validateDefaultAppPublicationProjects(nodes, context.fixture, "host-open", "open"))
      .toThrow(/exclude non-default corpus app 'host-beta'/u);
  });

  test("rejects a missing default project and publication row-count drift", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const missing = scopedPublication();
    expect(() => runner.validateDefaultAppPublicationProjects(
      missing.context.ledgerRecords.slice(1, 2), missing.context.fixture, "host-open", "open",
    )).toThrow(/exactly one project row/u);

    const drift = scopedPublication();
    drift.context.ledgerRecords[0]!.event.answerRowCount = 3;
    expect(() => runner.validateScopedDefaultAppPublication(drift.reference, drift.context, drift.witness, "open"))
      .toThrow(/answerRowCount/u);
  });

  test("rejects evidence from the wrong generation or after the restored baseline", async () => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const wrongGeneration = scopedPublication();
    wrongGeneration.context.ledgerRecords[3]!.event.generation = 99;
    expect(() => runner.validateScopedDefaultAppPublication(
      wrongGeneration.reference, wrongGeneration.context, wrongGeneration.witness, "open",
    )).toThrow(/no correlated publish-node events/u);

    const late = scopedPublication();
    late.context.baseline.published.eventOrdinal = 2;
    expect(() => runner.validateScopedDefaultAppPublication(late.reference, late.context, late.witness, "open"))
      .toThrow(/strict event order/u);
  });

  test.each(["open", "truncated"] as const)("checks every %s resource, including framework rows without navigation metadata", async (coverage) => {
    const runner = await import(pathToFileURL(runnerPath).href);
    for (const [field, value] of [
      ["answerResult", null],
      ["answerCoverage", "complete"],
      ["answerRowCount", 3],
    ] as const) {
      const { reference, context, witness } = scopedPublication(coverage);
      context.ledgerRecords[2]!.event[field] = value;
      expect(() => runner.validateScopedDefaultAppPublication(reference, context, witness, coverage))
        .toThrow(`resources[1].${field}`);
    }
  });

  test.each(["open", "truncated"] as const)("requires the actionable project issue context for %s coverage", async (coverage) => {
    const runner = await import(pathToFileURL(runnerPath).href);
    const { reference, context, witness } = scopedPublication(coverage);
    context.ledgerRecords[0]!.event.contextValue = "resourceProject";

    expect(() => runner.validateScopedDefaultAppPublication(reference, context, witness, coverage))
      .toThrow(/project.contextValue/u);
  });
});
