import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, test } from "vitest";

interface SettlementResult {
  readonly error: string | null;
  readonly settlement: null | {
    readonly reportKind: string;
    readonly itemCount: number;
    readonly observedAttemptCount: number;
    readonly observedCurrentAttemptCount: number;
    readonly observedCanceledAttemptCount: number;
    readonly observedSubsequentAttemptCount: number;
  };
}

const localRequire = createRequire(import.meta.url);
const { parseDiagnosticProviderSettlement } = localRequire(
  "./extension-host/diagnostic-provider-settlement.cjs",
) as {
  parseDiagnosticProviderSettlement(
    events: readonly Record<string, unknown>[],
    uri: string,
    documentVersion: number,
    observationStart: number,
  ): SettlementResult;
};
const { admittedAuthoredRoot } = localRequire(
  "./extension-host/authored-resource-path.cjs",
) as {
  admittedAuthoredRoot(filePath: string, roots: readonly string[]): string | null;
};

const uri = "file:///workspace/src/app.html";

describe("Extension Host product-surface contracts", () => {
  test("settles on a current full receipt followed by serialized unChanged reuse", () => {
    const events = [
      request("full", 2),
      response("full", 2, "full", 2),
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
    ];

    expect(parse(events, 2, 0)).toEqual(expect.objectContaining({
      error: null,
      settlement: expect.objectContaining({
        reportKind: "full",
        itemCount: 2,
        observedAttemptCount: 2,
        observedCurrentAttemptCount: 2,
        observedCanceledAttemptCount: 0,
        observedSubsequentAttemptCount: 1,
      }),
    }));
  });

  test("admits an older-version canceled predecessor before current full and unChanged", () => {
    const events = [
      request("old", 1),
      canceled("old", 1),
      request("full", 2),
      response("full", 2, "full", 0),
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
    ];

    expect(parse(events, 2, 0).settlement).toEqual(expect.objectContaining({
      itemCount: 0,
      observedAttemptCount: 3,
      observedCurrentAttemptCount: 2,
      observedCanceledAttemptCount: 1,
      observedSubsequentAttemptCount: 1,
    }));
  });

  test("rejects current unChanged before the required post-cursor full", () => {
    const events = [
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
      request("full", 2),
      response("full", 2, "full", 1),
    ];

    expect(parse(events, 2, 0)).toEqual(expect.objectContaining({
      error: expect.stringContaining("before the required current full report"),
      settlement: null,
    }));
  });

  test("keeps a current full pending across an explicit retrigger until its response", () => {
    const pendingEvents = [
      request("full", 2),
      response("full", 2, "full", 1),
      request("retrigger", 2, true),
      canceled("retrigger", 2),
    ];

    expect(parse(pendingEvents, 2, 0)).toEqual(expect.objectContaining({
      error: null,
      settlement: null,
    }));

    const settledEvents = [
      ...pendingEvents,
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
    ];
    expect(parse(settledEvents, 2, 0).settlement).toEqual(expect.objectContaining({
      reportKind: "full",
      observedAttemptCount: 3,
      observedCurrentAttemptCount: 3,
      observedCanceledAttemptCount: 1,
      observedSubsequentAttemptCount: 2,
    }));
  });

  test("uses the latest validated current full as the settlement receipt", () => {
    const events = [
      request("initial", 2),
      response("initial", 2, "full", 1),
      request("replacement", 2, true),
      response("replacement", 2, "full", 3),
    ];

    expect(parse(events, 2, 0).settlement).toEqual(expect.objectContaining({
      reportKind: "full",
      itemCount: 3,
      observationId: "replacement",
      observedSubsequentAttemptCount: 1,
    }));
  });

  test.each([
    ["lowercase reuse kind", request("reuse", 2, true), response("reuse", 2, "unchanged", null), "unsupported report kind"],
    ["reuse without previous id", request("reuse", 2), response("reuse", 2, "unChanged", null), "without a previous result id"],
    ["reuse with items", request("reuse", 2, true), response("reuse", 2, "unChanged", 0), "invalid unchanged report"],
    ["reuse without result id", request("reuse", 2, true), response("reuse", 2, "unChanged", null, false), "invalid unchanged report"],
  ])("rejects malformed subsequent %s", (_label, reuseRequest, reuseResponse, message) => {
    const events = [
      request("full", 2),
      response("full", 2, "full", 1),
      reuseRequest,
      reuseResponse,
    ];
    expect(parse(events, 2, 0).error).toContain(message);
  });

  test("rejects unexpected versions, overlaps, reused ids, and unauthenticated failure", () => {
    expect(parse([
      request("full", 2),
      response("full", 2, "full", 1),
      request("later", 3, true),
      response("later", 3, "full", 0),
    ], 2, 0).error).toContain("unexpected document version 3");
    expect(parse([
      request("first", 2),
      request("second", 2),
    ], 2, 0).error).toContain("overlapped");
    expect(parse([
      request("same", 2),
      response("same", 2, "full", 0),
      request("same", 2, true),
    ], 2, 0).error).toContain("reused an observation id");
    expect(parse([
      request("failed", 2),
      { ...canceled("failed", 2), errorName: "Error", serverRetriggerRequested: false },
    ], 2, 0).error).toContain("without authenticated cancellation");
  });

  test.each([
    [
      "response without cancellation state",
      { ...response("terminal", 2, "full", 1), cancellationRequested: undefined },
      "no boolean cancellation state",
    ],
    [
      "response with failure fields",
      { ...response("terminal", 2, "full", 1), serverRetriggerRequested: false },
      "failed-only terminal fields",
    ],
    [
      "failure without client cancellation state",
      { ...canceled("terminal", 2), cancellationRequested: undefined },
      "no complete boolean cancellation state",
    ],
    [
      "failure without retrigger state",
      { ...canceled("terminal", 2), serverRetriggerRequested: undefined },
      "no complete boolean cancellation state",
    ],
    [
      "failure with response fields",
      { ...canceled("terminal", 2), reportKind: "full", itemCount: 0, resultIdPresent: true },
      "response-only terminal fields",
    ],
  ])("rejects malformed terminal shape: %s", (_label, terminal, message) => {
    const events = [request("terminal", 2), terminal];
    expect(parse(events, 2, 0).error).toContain(message);
  });

  test("authenticates resource documents with path boundaries and caller-selected roots", () => {
    const primary = path.resolve("C:/workspace/hello-world");
    const routed = path.resolve("C:/workspace/routed-storefront");
    const routedApp = path.join(routed, "src", "app.ts");

    expect(admittedAuthoredRoot(routedApp, [primary, routed])).toBe(routed);
    expect(admittedAuthoredRoot(routedApp, [primary])).toBeNull();
    expect(admittedAuthoredRoot(path.join(primary, "src", "my-app.ts"), [primary])).toBe(primary);
    expect(admittedAuthoredRoot(path.join(primary, "src-sibling", "escape.ts"), [primary])).toBeNull();
  });
});

function parse(events: readonly Record<string, unknown>[], version: number, start: number) {
  return parseDiagnosticProviderSettlement(events, uri, version, start);
}

function request(observationId: string, documentVersion: number, previousResultIdPresent = false) {
  return providerEvent({
    observationId,
    documentVersion,
    phase: "request",
    previousResultIdPresent,
  });
}

function response(
  observationId: string,
  documentVersion: number,
  reportKind: string,
  itemCount: number | null,
  resultIdPresent = true,
) {
  return providerEvent({
    observationId,
    documentVersion,
    phase: "response",
    reportKind,
    itemCount,
    resultIdPresent,
    cancellationRequested: false,
  });
}

function canceled(observationId: string, documentVersion: number) {
  return providerEvent({
    observationId,
    documentVersion,
    phase: "failed",
    errorName: "Canceled",
    cancellationRequested: false,
    serverRetriggerRequested: true,
  });
}

function providerEvent(fields: Record<string, unknown>) {
  return {
    source: "language-client-provider",
    operation: "diagnostics",
    uri,
    ...fields,
  };
}
