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
  settledAnalysisSequence(events: readonly unknown[]): { readonly outcome: string; readonly reason?: string } | null;
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

  test("requires a fresh ordered analysisChanged then acknowledged diagnostic refresh sequence", async () => {
    const harness = await loadLaneHarnessDiagnostics();
    const analysis = {
      kind: "notification",
      message: {
        method: "aurelia/analysisChanged",
        params: {
          fingerprint: "semantic-runtime-analysis:one",
          changeKind: "source-text",
          changedSourceUris: ["file:///workspace/app.html"],
        },
      },
    };
    const refresh = {
      kind: "request",
      message: { method: "workspace/diagnostic/refresh" },
      response: null,
    };

    expect(harness.settledAnalysisSequence([analysis])).toBeNull();
    expect(harness.settledAnalysisSequence([{
      kind: "notification",
      message: { method: "window/logMessage", params: { message: "starting" } },
    }, analysis, refresh])).toEqual({ outcome: "settled" });
    expect(harness.settledAnalysisSequence([analysis, refresh])).toEqual({ outcome: "settled" });
    expect(harness.settledAnalysisSequence([refresh, analysis])).toMatchObject({
      outcome: "invalid-sequence",
      reason: "diagnostic refresh arrived before analysisChanged",
    });
    expect(harness.settledAnalysisSequence([{
      ...analysis,
      message: {
        ...analysis.message,
        params: { ...analysis.message.params, uri: "file:///workspace/app.html" },
      },
    }])).toMatchObject({ outcome: "invalid-sequence" });
    for (const params of [
      { fingerprint: "", changeKind: "source-text" },
      { fingerprint: "semantic-runtime-analysis:one", changeKind: "source-text" },
      { fingerprint: "semantic-runtime-analysis:one", changeKind: "unknown" },
    ]) {
      expect(harness.settledAnalysisSequence([{
        ...analysis,
        message: { ...analysis.message, params },
      }])).toMatchObject({ outcome: "invalid-sequence" });
    }
    expect(harness.settledAnalysisSequence([analysis, {
      ...refresh,
      message: { ...refresh.message, params: {} },
    }])).toMatchObject({
      outcome: "invalid-sequence",
      reason: "diagnostic refresh request must not carry params",
    });
  });
});
