import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

interface DiagnosticPull {
  readonly outcome: string;
  readonly resultId?: string | null;
  readonly resultIdPresent?: boolean;
  readonly matchesPreviousResultId?: boolean;
  readonly items?: readonly unknown[];
  readonly retriggerRequest?: boolean;
  readonly reason?: string;
}

interface LaneHarnessDiagnosticsModule {
  laneDiagnosticClientCapabilities(): Record<string, unknown>;
  documentDiagnosticParams(uri: string, previousResultId?: string | null): Record<string, unknown>;
  decodeDocumentDiagnosticResponse(response: unknown, previousResultId?: string | null): DiagnosticPull;
  requireInitialDiagnosticPullForCycle(pull: DiagnosticPull): string;
  requireUnchangedDiagnosticPullForCycle(pull: DiagnosticPull, previousResultId: string): void;
  requireFullDiagnosticPullForCodeAction(pull: DiagnosticPull): readonly unknown[];
  summarizeDiagnosticData(data: unknown): Record<string, unknown>;
}

const scriptUrl = new URL(
  "../../../lane-harness/scripts/run-lane.mjs",
  import.meta.url,
).href;

async function loadLaneHarnessDiagnostics(): Promise<LaneHarnessDiagnosticsModule> {
  return await import(scriptUrl) as unknown as LaneHarnessDiagnosticsModule;
}

describe("lane-harness pull diagnostics contract", () => {
  test("mirrors the shipping diagnostic client capabilities and provider identifier", async () => {
    const harness = await loadLaneHarnessDiagnostics();

    expect(harness.laneDiagnosticClientCapabilities()).toEqual({
      relatedInformation: true,
      tagSupport: { valueSet: [1, 2] },
      codeDescriptionSupport: true,
      dataSupport: true,
      dynamicRegistration: true,
      relatedDocumentSupport: false,
      markupMessageSupport: false,
    });
    expect(harness.documentDiagnosticParams("file:///workspace/app.html")).toEqual({
      textDocument: { uri: "file:///workspace/app.html" },
      identifier: "aurelia",
    });
    expect(harness.documentDiagnosticParams("file:///workspace/app.html", "diagnostic:one")).toEqual({
      textDocument: { uri: "file:///workspace/app.html" },
      identifier: "aurelia",
      previousResultId: "diagnostic:one",
    });
  });

  test("keeps an optional full-report resultId structurally valid but requires one for the lane cycle", async () => {
    const harness = await loadLaneHarnessDiagnostics();
    const item = { message: "Missing member", range: { start: { line: 0, character: 1 }, end: { line: 0, character: 2 } } };
    const withoutId = harness.decodeDocumentDiagnosticResponse({
      result: { kind: "full", items: [item] },
    });

    expect(withoutId).toEqual({
      outcome: "full",
      resultIdPresent: false,
      resultId: null,
      items: [item],
    });
    expect(() => harness.requireInitialDiagnosticPullForCycle(withoutId))
      .toThrow("non-empty resultId");

    const withId = harness.decodeDocumentDiagnosticResponse({
      result: { kind: "full", resultId: "diagnostic:one", items: [item] },
    });
    expect(harness.requireInitialDiagnosticPullForCycle(withId)).toBe("diagnostic:one");
  });

  test("accepts only an unchanged report carrying the exact previous resultId", async () => {
    const harness = await loadLaneHarnessDiagnostics();
    const unchanged = harness.decodeDocumentDiagnosticResponse({
      result: { kind: "unchanged", resultId: "diagnostic:one" },
    }, "diagnostic:one");

    expect(unchanged).toMatchObject({
      outcome: "unchanged",
      resultIdPresent: true,
      matchesPreviousResultId: true,
    });
    expect(() => harness.requireUnchangedDiagnosticPullForCycle(unchanged, "diagnostic:one"))
      .not.toThrow();
    expect(harness.decodeDocumentDiagnosticResponse({
      result: { kind: "unchanged", resultId: "diagnostic:one" },
    })).toMatchObject({ outcome: "invalid-report" });
    expect(harness.decodeDocumentDiagnosticResponse({
      result: { kind: "unchanged", resultId: "diagnostic:two" },
    }, "diagnostic:one")).toMatchObject({
      outcome: "invalid-report",
      reason: "unchanged report resultId must match previousResultId",
    });

    const secondFull = harness.decodeDocumentDiagnosticResponse({
      result: { kind: "full", resultId: "diagnostic:two", items: [] },
    }, "diagnostic:one");
    expect(secondFull.outcome).toBe("full");
    expect(() => harness.requireUnchangedDiagnosticPullForCycle(secondFull, "diagnostic:one"))
      .toThrow("requires an unchanged reuse report");
  });

  test("distinguishes protocol errors, cancellation, and malformed reports without retries", async () => {
    const harness = await loadLaneHarnessDiagnostics();

    expect(harness.decodeDocumentDiagnosticResponse({
      error: { code: -32603, message: "failed" },
    })).toMatchObject({ outcome: "error" });
    expect(harness.decodeDocumentDiagnosticResponse({
      error: { code: -32800, message: "cancelled" },
    })).toMatchObject({ outcome: "cancelled", retriggerRequest: false });
    expect(harness.decodeDocumentDiagnosticResponse({
      error: { code: -32800, message: "cancelled", data: { retriggerRequest: true } },
    })).toMatchObject({
      outcome: "invalid-error",
      reason: "RequestCancelled must not request an automatic retry",
    });
    expect(harness.decodeDocumentDiagnosticResponse({
      error: { code: -32802, message: "stale", data: { retriggerRequest: true } },
    })).toMatchObject({ outcome: "server-cancelled", retriggerRequest: true });
    expect(harness.decodeDocumentDiagnosticResponse({
      error: { code: -32802, message: "superseded", data: { retriggerRequest: false } },
    })).toMatchObject({ outcome: "server-cancelled", retriggerRequest: false });
    expect(harness.decodeDocumentDiagnosticResponse({
      error: { code: -32802, message: "stale" },
    })).toMatchObject({
      outcome: "invalid-error",
      reason: "ServerCancelled must carry a boolean data.retriggerRequest",
    });
    expect(harness.decodeDocumentDiagnosticResponse({ result: null }))
      .toMatchObject({ outcome: "invalid-report" });
    expect(harness.decodeDocumentDiagnosticResponse({ result: { kind: "full" } }))
      .toMatchObject({ outcome: "invalid-report", reason: "full report items must be an array" });
    expect(harness.decodeDocumentDiagnosticResponse({
      result: { kind: "full", items: [], relatedDocuments: {} },
    })).toMatchObject({
      outcome: "invalid-report",
      reason: "relatedDocuments must be absent because the client advertised relatedDocumentSupport=false",
    });
  });

  test("feeds code actions only from an exact full diagnostic report", async () => {
    const harness = await loadLaneHarnessDiagnostics();
    const items = [{ message: "one", data: { semanticRuntime: { diagnosticKind: "missing-member" } } }];

    expect(harness.requireFullDiagnosticPullForCodeAction({ outcome: "full", items })).toBe(items);
    for (const outcome of ["unchanged", "error", "cancelled", "invalid-report"]) {
      expect(() => harness.requireFullDiagnosticPullForCodeAction({ outcome, items: [] }))
        .toThrow("requires a full diagnostic report");
    }
  });

  test("retains contextual diagnostic policy evidence without answer-local handles", async () => {
    const harness = await loadLaneHarnessDiagnostics();
    const summarized = harness.summarizeDiagnosticData({
      semanticRuntime: {
        diagnosticKind: "missing-expression-member",
        severity: "warning",
        presentation: {
          rawRowCount: 2,
          primarySeverity: "warning",
          maxRawSeverity: "error",
          contextual: [{
            relation: "checker-evidence",
            diagnostic: {
              diagnosticDomain: "template",
              diagnosticKind: "template-expression-typescript-diagnostic",
              diagnosticAuthority: "typescript",
              typeScriptDiagnosticCode: 2339,
              severity: "error",
              repairAffordance: null,
              handles: { productHandle: 42 },
            },
          }],
        },
      },
    });

    expect(summarized).toMatchObject({
      diagnosticKind: "missing-expression-member",
      presentation: {
        rawRowCount: 2,
        primarySeverity: "warning",
        maxRawSeverity: "error",
        contextual: [{
          relation: "checker-evidence",
          diagnostic: {
            diagnosticKind: "template-expression-typescript-diagnostic",
            diagnosticAuthority: "typescript",
            typeScriptDiagnosticCode: 2339,
            severity: "error",
            repairAffordance: null,
          },
        }],
      },
    });
    expect(summarized).not.toHaveProperty("presentation.contextual.0.diagnostic.handles");
  });

  test("uses the first same-connection lane request as the disk-equal didOpen readiness barrier", () => {
    const source = readFileSync(new URL(
      "../../../lane-harness/scripts/run-lane.mjs",
      import.meta.url,
    ), "utf8");
    const sessionStart = source.indexOf("const client = new LspClient(SERVER_PATH);");
    const sessionEnd = source.indexOf("const snapshot = renderSnapshot", sessionStart);
    const session = source.slice(sessionStart, sessionEnd);

    const initialize = session.indexOf("await initializeServer(");
    const didOpen = session.indexOf("await openProbeDocuments(");
    const firstRequest = session.indexOf("await runLaneProbe(");
    expect(sessionStart).toBeGreaterThanOrEqual(0);
    expect(sessionEnd).toBeGreaterThan(sessionStart);
    expect(initialize).toBeGreaterThanOrEqual(0);
    expect(didOpen).toBeGreaterThan(initialize);
    expect(firstRequest).toBeGreaterThan(didOpen);

    const postOpenBarrier = session.slice(didOpen, firstRequest);
    expect(postOpenBarrier).not.toContain("analysisChanged");
    expect(postOpenBarrier).not.toContain("diagnostic/refresh");
    expect(source).not.toContain("waitForSettledAnalysis");
    expect(source).not.toContain("waitForInboundState");
    expect(source).not.toContain("inboundEventCursor");
  });
});
