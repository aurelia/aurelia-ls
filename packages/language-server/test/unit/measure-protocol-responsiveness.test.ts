import { describe, expect, test, vi } from "vitest";

interface ParsedProtocolResponsivenessArgs {
  readonly fixture: string | null;
  readonly workspace: string | null;
  readonly transport: "stdio" | "worker";
  readonly cancellationDelayMilliseconds: number;
  readonly cycles: number;
  readonly json: boolean;
}

interface MeasuredDiagnosticReport {
  readonly kind: "full" | "unchanged";
  readonly resultId: string;
  readonly itemCount: number | null;
}

interface PreEditDiagnosticMeasurement {
  readonly coldFullWithoutPreviousResultIdMilliseconds: number;
  readonly warmFullWithoutPreviousResultIdMilliseconds: number;
  readonly previousResultIdUnchangedMilliseconds: number;
  readonly reports: {
    readonly cold: MeasuredDiagnosticReport;
    readonly warmFull: MeasuredDiagnosticReport;
    readonly previousResultId: MeasuredDiagnosticReport;
  };
}

interface SettledProtocolOutcome {
  readonly status: "fulfilled" | "rejected";
  readonly value?: unknown;
  readonly error?: unknown;
}

interface ProtocolCompletionVariant {
  readonly text: string;
  readonly position: { readonly line: number; readonly character: number };
}

interface TimedProtocolSettlement {
  readonly startedAt: number;
  readonly settledAt: number;
  readonly milliseconds: number;
  readonly outcome: SettledProtocolOutcome;
}

interface CancellationCycleMeasurement {
  readonly version: number;
  readonly cycle: {
    readonly replacementDispatchedDuringContention: boolean;
    readonly requestMilliseconds: number;
    readonly cancellationToSettlementMilliseconds: number;
    readonly probeMilliseconds: number;
    readonly replacementCompletionMilliseconds: number;
    readonly completionOutcome: { readonly status: string };
    readonly probeOutcome: { readonly status: string };
    readonly replacementCompletionOutcome: { readonly status: string };
    readonly replacementCompletionCurrentness: {
      readonly requiredLabel: string;
      readonly requiredLabelPresent: boolean;
      readonly forbiddenLabel: string;
      readonly forbiddenLabelAbsent: boolean;
    };
    readonly timeline: {
      readonly oldRequestStartedMilliseconds: number;
      readonly cancellationSentMilliseconds: number;
      readonly replacementRequestStartedMilliseconds: number;
      readonly probeRequestStartedMilliseconds: number;
      readonly replacementRequestSettledMilliseconds: number;
      readonly probeRequestSettledMilliseconds: number;
      readonly oldRequestSettledMilliseconds: number;
    };
  };
}

interface ProtocolResponsivenessMeasurementModule {
  readonly protocolResponsivenessSchemaVersion: string;
  createProtocolServerTransport(options: {
    readonly transport: "stdio" | "worker";
    readonly workspaceRoot: string;
    readonly adapters: {
      startChild(entry: string, workspaceRoot: string): FakeChild;
      startWorker(entry: string): FakeWorker;
      createPortReader(port: FakeWorker): unknown;
      createPortWriter(port: FakeWorker): unknown;
      createStreamReader(stream: unknown): unknown;
      createStreamWriter(stream: unknown): unknown;
    };
  }): {
    readonly reader: unknown;
    readonly writer: unknown;
    readonly stderr: unknown;
    terminate(): Promise<void>;
  };
  protocolClientConnectionOptions(
    transport: "stdio" | "worker",
    createSender?: () => unknown,
  ): {
    readonly cancellationStrategy: {
      readonly receiver: { createCancellationTokenSource(id: unknown): unknown };
      readonly sender: unknown;
    };
  } | undefined;
  markdownReport(report: unknown): string;
  parseProtocolResponsivenessArgs(argv: readonly string[]): ParsedProtocolResponsivenessArgs;
  createProtocolCompletionVariant(
    originalText: string,
    index: number,
    kind: "old" | "replacement",
  ): ProtocolCompletionVariant;
  requireCurrentReplacementCompletion(outcome: SettledProtocolOutcome): {
    readonly requiredLabel: string;
    readonly requiredLabelPresent: boolean;
    readonly forbiddenLabel: string;
    readonly forbiddenLabelAbsent: boolean;
  };
  timedSettlement(
    promise: Promise<unknown>,
    startedAt: number,
    now?: () => number,
  ): Promise<TimedProtocolSettlement>;
  measureUncontendedWarmCompletion(options: {
    readonly connection: {
      sendRequest(method: string, params: unknown): Promise<unknown>;
    };
    readonly targetUri: string;
    readonly position: { readonly line: number; readonly character: number };
    readonly documentVersion: number;
    readonly now?: () => number;
  }): Promise<{
    readonly documentVersion: number;
    readonly milliseconds: number;
    readonly outcome: { readonly status: string };
    readonly currentness: {
      readonly requiredLabel: string;
      readonly requiredLabelPresent: boolean;
      readonly forbiddenLabel: string;
      readonly forbiddenLabelAbsent: boolean;
    };
  }>;
  measureCancellationCycle(options: {
    readonly connection: {
      sendNotification(method: string, params: unknown): void;
      sendRequest(method: string, params: unknown, token?: unknown): Promise<unknown>;
    };
    readonly targetUri: string;
    readonly originalText: string;
    readonly initialVersion: number;
    readonly index: number;
    readonly cancellationDelayMilliseconds: number;
    readonly now?: () => number;
    readonly delay?: (milliseconds: number) => Promise<void>;
    readonly createCancellationSource?: () => {
      readonly token: unknown;
      cancel(): void;
      dispose(): void;
    };
  }): Promise<CancellationCycleMeasurement>;
  measurePreEditDiagnostics(
    connection: {
      sendRequest(method: string, params: unknown): Promise<unknown>;
    },
    uri: string,
  ): Promise<PreEditDiagnosticMeasurement>;
}

const scriptUrl = new URL(
  "../../scripts/measure-protocol-responsiveness.mjs",
  import.meta.url,
).href;

interface FakeChild {
  readonly stdout: unknown;
  readonly stdin: unknown;
  readonly stderr: unknown;
  readonly exitCode: number | null;
  readonly signalCode: string | null;
  readonly kill: ReturnType<typeof vi.fn>;
}

interface FakeWorker {
  readonly stderr: unknown;
  readonly terminate: ReturnType<typeof vi.fn>;
}

function fakeChild(): FakeChild {
  return {
    stdout: { kind: "stdout" },
    stdin: { kind: "stdin" },
    stderr: { kind: "child-stderr" },
    exitCode: null,
    signalCode: null,
    kill: vi.fn(),
  };
}

function fakeWorker(): FakeWorker {
  return {
    stderr: { kind: "worker-stderr" },
    terminate: vi.fn(() => Promise.resolve(0)),
  };
}

async function loadMeasurementModule(): Promise<ProtocolResponsivenessMeasurementModule> {
  return await import(scriptUrl) as unknown as ProtocolResponsivenessMeasurementModule;
}

describe("protocol responsiveness measurement", () => {
  test("normalizes defaults and exact value/boolean spellings", async () => {
    const {
      parseProtocolResponsivenessArgs,
      protocolResponsivenessSchemaVersion,
    } = await loadMeasurementModule();

    expect(protocolResponsivenessSchemaVersion).toBe("aurelia-ls/protocol-responsiveness/v4");
    expect(parseProtocolResponsivenessArgs([])).toEqual({
      fixture: null,
      workspace: null,
      transport: "stdio",
      cancellationDelayMilliseconds: 25,
      cycles: 3,
      json: false,
    });
    expect(parseProtocolResponsivenessArgs([
      "--fixture", "catalog",
      "--cancel-after=40",
      "--cycles", "7",
      "--transport=worker",
      "--json",
    ])).toEqual({
      fixture: "catalog",
      workspace: null,
      transport: "worker",
      cancellationDelayMilliseconds: 40,
      cycles: 7,
      json: true,
    });
    expect(parseProtocolResponsivenessArgs([
      "--workspace=C:\\workspaces\\app",
      "--json", "false",
    ])).toMatchObject({
      fixture: null,
      workspace: "C:\\workspaces\\app",
      json: false,
    });
  });

  test.each([
    [["fixture"], "Unexpected positional argument"],
    [["--unknown"], "Unknown argument"],
    [["--cycles"], "requires a value"],
    [["--workspace="], "requires a non-empty value"],
    [["--cycles", "0"], "must be a positive integer"],
    [["--cycles", "1x"], "must be a positive integer"],
    [["--cycles", "1.5"], "must be a positive integer"],
    [["--cycles", "1", "--cycles", "2"], "may only be supplied once"],
    [["--json", "sometimes"], "must be 'true' or 'false'"],
    [["--transport", "ipc"], "must be 'stdio' or 'worker'"],
    [["--fixture", "catalog", "--workspace", "C:\\app"], "mutually exclusive"],
  ] as const)("rejects malformed argv %#", async (argv, message) => {
    const { parseProtocolResponsivenessArgs } = await loadMeasurementModule();

    expect(() => parseProtocolResponsivenessArgs(argv)).toThrow(message);
  });

  test("constructs explicit stdio and worker transports", async () => {
    const {
      createProtocolServerTransport,
      protocolClientConnectionOptions,
    } = await loadMeasurementModule();
    const worker = fakeWorker();
    const child = fakeChild();
    const adapters = {
      startChild: vi.fn((_entry: string, _workspaceRoot: string) => child),
      startWorker: vi.fn((_entry: string) => worker),
      createPortReader: vi.fn((_port: FakeWorker) => "port-reader"),
      createPortWriter: vi.fn((_port: FakeWorker) => "port-writer"),
      createStreamReader: vi.fn((_stream: unknown) => "stream-reader"),
      createStreamWriter: vi.fn((_stream: unknown) => "stream-writer"),
    };

    const workerTransport = createProtocolServerTransport({
      transport: "worker",
      workspaceRoot: "C:\\workspace",
      adapters,
    });
    expect(adapters.startWorker).toHaveBeenCalledOnce();
    expect(adapters.startWorker.mock.calls[0]?.[0]).toMatch(/out[\\/]main\.js$/);
    expect(workerTransport).toMatchObject({
      reader: "port-reader",
      writer: "port-writer",
      stderr: worker.stderr,
    });
    await workerTransport.terminate();
    expect(worker.terminate).toHaveBeenCalledOnce();

    const stdioTransport = createProtocolServerTransport({
      transport: "stdio",
      workspaceRoot: "C:\\workspace",
      adapters,
    });
    expect(adapters.startChild).toHaveBeenCalledWith(
      expect.stringMatching(/out[\\/]main\.js$/),
      "C:\\workspace",
    );
    expect(stdioTransport).toMatchObject({
      reader: "stream-reader",
      writer: "stream-writer",
      stderr: child.stderr,
    });
    await stdioTransport.terminate();
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");

    const sender = { kind: "shared-array-sender" };
    expect(protocolClientConnectionOptions("stdio", () => sender)).toBeUndefined();
    const workerOptions = protocolClientConnectionOptions("worker", () => sender);
    expect(workerOptions?.cancellationStrategy.sender).toBe(sender);
    expect(workerOptions?.cancellationStrategy.receiver.createCancellationTokenSource)
      .toBeTypeOf("function");
  });

  test("reports the selected transport mode", async () => {
    const { markdownReport, protocolResponsivenessSchemaVersion } =
      await loadMeasurementModule();

    const report = markdownReport({
      schemaVersion: protocolResponsivenessSchemaVersion,
      transport: "worker",
      replacementDispatchedDuringContention: true,
      independentSettlementTimestamps: true,
      workspace: {
        root: "C:\\workspace",
        targetDocument: "src/app.html",
      },
      cancellationDelayMilliseconds: 25,
      initializeMilliseconds: 1,
      coldFullWithoutPreviousResultIdMilliseconds: 2,
      warmFullWithoutPreviousResultIdMilliseconds: 3,
      previousResultIdUnchangedMilliseconds: 4,
      warmSameGenerationCompletion: null,
      diagnosticRefreshRequests: 0,
      cycles: [],
    });

    expect(report).toContain("Schema: `aurelia-ls/protocol-responsiveness/v4`");
    expect(report).toContain("Transport: `worker`");
  });

  test("measures full-no-id diagnostics separately from proof-backed unchanged reuse", async () => {
    const { measurePreEditDiagnostics } = await loadMeasurementModule();
    const sendRequest = vi.fn()
      .mockResolvedValueOnce({ kind: "full", resultId: "cold-result", items: [] })
      .mockResolvedValueOnce({ kind: "full", resultId: "warm-result", items: [{ message: "one" }] })
      .mockResolvedValueOnce({ kind: "unchanged", resultId: "warm-result" });
    const uri = "file:///workspace/src/app.html";

    const measurement = await measurePreEditDiagnostics({ sendRequest }, uri);

    expect(sendRequest).toHaveBeenNthCalledWith(1, "textDocument/diagnostic", {
      textDocument: { uri },
    });
    expect(sendRequest).toHaveBeenNthCalledWith(2, "textDocument/diagnostic", {
      textDocument: { uri },
    });
    expect(sendRequest).toHaveBeenNthCalledWith(3, "textDocument/diagnostic", {
      textDocument: { uri },
      previousResultId: "warm-result",
    });
    expect(measurement.reports).toEqual({
      cold: { kind: "full", resultId: "cold-result", itemCount: 0 },
      warmFull: { kind: "full", resultId: "warm-result", itemCount: 1 },
      previousResultId: { kind: "unchanged", resultId: "warm-result", itemCount: null },
    });
    expect(measurement.coldFullWithoutPreviousResultIdMilliseconds).toBeGreaterThanOrEqual(0);
    expect(measurement.warmFullWithoutPreviousResultIdMilliseconds).toBeGreaterThanOrEqual(0);
    expect(measurement.previousResultIdUnchangedMilliseconds).toBeGreaterThanOrEqual(0);
  });

  test("rejects a previous-result response that does not prove unchanged reuse", async () => {
    const { measurePreEditDiagnostics } = await loadMeasurementModule();
    const sendRequest = vi.fn()
      .mockResolvedValueOnce({ kind: "full", resultId: "cold-result", items: [] })
      .mockResolvedValueOnce({ kind: "full", resultId: "warm-result", items: [] })
      .mockResolvedValueOnce({ kind: "unchanged", resultId: "different-result" });

    await expect(measurePreEditDiagnostics(
      { sendRequest },
      "file:///workspace/src/app.html",
    )).rejects.toThrow("must return an unchanged report with the same resultId");
  });

  test("builds distinct old and replacement completion loci", async () => {
    const { createProtocolCompletionVariant } = await loadMeasurementModule();
    const source = [
      "<template>",
      "  <p if.bind=\"state.items.isLoading\">Loading</p>",
      "</template>",
    ].join("\n");

    const oldVariant = createProtocolCompletionVariant(source, 0, "old");
    const replacementVariant = createProtocolCompletionVariant(source, 1, "replacement");

    expect(oldVariant.text).toContain("state.items.isLoading");
    expect(oldVariant.text).toContain("protocol responsiveness marker: A");
    expect(replacementVariant.text).toContain("state.selection.isLoading");
    expect(replacementVariant.text).not.toContain("state.items.isLoading");
    expect(replacementVariant.text).toContain("protocol responsiveness marker: B");
    expect(oldVariant.position).toEqual({ line: 1, character: 26 });
    expect(replacementVariant.position).toEqual({ line: 1, character: 30 });
  });

  test("requires semantic evidence from the replacement completion version", async () => {
    const { requireCurrentReplacementCompletion } = await loadMeasurementModule();

    expect(requireCurrentReplacementCompletion({
      status: "fulfilled",
      value: { items: [{ label: "itemCount" }, { label: "selectedItemIds" }] },
    })).toEqual({
      requiredLabel: "itemCount",
      requiredLabelPresent: true,
      forbiddenLabel: "searchText",
      forbiddenLabelAbsent: true,
    });
    expect(() => requireCurrentReplacementCompletion({
      status: "fulfilled",
      value: { items: [{ label: "selectedItemIds" }] },
    })).toThrow("must contain current-version label 'itemCount'");
    expect(() => requireCurrentReplacementCompletion({
      status: "fulfilled",
      value: { items: [{ label: "itemCount" }, { label: "searchText" }] },
    })).toThrow("must not contain stale-version label 'searchText'");
    expect(() => requireCurrentReplacementCompletion({
      status: "rejected",
      error: new Error("cancelled"),
    })).toThrow("must fulfill before its currentness can be verified");

    expect(requireCurrentReplacementCompletion({
      status: "fulfilled",
      value: [{ label: "itemCount" }, { label: "selectedItemIds" }],
    })).toMatchObject({ requiredLabelPresent: true, forbiddenLabelAbsent: true });
  });

  test("timestamps each request in its own settlement continuation", async () => {
    const { timedSettlement } = await loadMeasurementModule();
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    let timestamp = 10;
    const firstMeasurement = timedSettlement(first.promise, 0, () => timestamp);
    const secondMeasurement = timedSettlement(second.promise, 0, () => timestamp);

    second.resolve("second");
    timestamp = 20;
    const secondResult = await secondMeasurement;
    first.resolve("first");
    timestamp = 40;
    const firstResult = await firstMeasurement;

    expect(secondResult).toMatchObject({ settledAt: 20, milliseconds: 20 });
    expect(firstResult).toMatchObject({ settledAt: 40, milliseconds: 40 });
  });

  test("measures an uncontended fulfilled completion with a current semantic witness", async () => {
    const { measureUncontendedWarmCompletion } = await loadMeasurementModule();
    const sendRequest = vi.fn().mockResolvedValue({
      items: [{ label: "itemCount" }, { label: "selectedItemIds" }],
    });
    const timestamps = [100, 124];

    const measurement = await measureUncontendedWarmCompletion({
      connection: { sendRequest },
      targetUri: "file:///workspace/src/app.html",
      position: { line: 3, character: 17 },
      documentVersion: 9,
      now: () => timestamps.shift() ?? 124,
    });

    expect(sendRequest).toHaveBeenCalledWith("textDocument/completion", {
      textDocument: { uri: "file:///workspace/src/app.html" },
      position: { line: 3, character: 17 },
    });
    expect(measurement).toEqual({
      documentVersion: 9,
      milliseconds: 24,
      outcome: { status: "fulfilled" },
      currentness: {
        requiredLabel: "itemCount",
        requiredLabelPresent: true,
        forbiddenLabel: "searchText",
        forbiddenLabelAbsent: true,
      },
    });

    await expect(measureUncontendedWarmCompletion({
      connection: {
        sendRequest: () => Promise.reject(new Error("not fulfilled")),
      },
      targetUri: "file:///workspace/src/app.html",
      position: { line: 3, character: 17 },
      documentVersion: 9,
    })).rejects.toThrow("must fulfill before its currentness can be verified");
  });

  test("dispatches replacement and probe before the observational old completion settles", async () => {
    const { measureCancellationCycle } = await loadMeasurementModule();
    const oldCompletion = deferred<unknown>();
    const replacementCompletion = deferred<unknown>();
    const probe = deferred<unknown>();
    const events: string[] = [];
    let completionRequests = 0;
    let cancelled = false;
    let timestamp = 0;
    const connection = {
      sendNotification: vi.fn((method: string, params: unknown) => {
        const version = (params as { textDocument: { version: number } }).textDocument.version;
        events.push(`${method}:${version}`);
      }),
      sendRequest: vi.fn((method: string, _params: unknown, token?: unknown) => {
        if (method === "textDocument/completion") {
          completionRequests += 1;
          if (completionRequests === 1) {
            expect(token).toBeDefined();
            events.push("old-completion");
            return oldCompletion.promise;
          }
          events.push("replacement-completion");
          return replacementCompletion.promise;
        }
        events.push("probe");
        return probe.promise;
      }),
    };

    const measurement = measureCancellationCycle({
      connection,
      targetUri: "file:///workspace/src/app.html",
      originalText: "<p if.bind=\"state.items.isLoading\">Loading</p>",
      initialVersion: 7,
      index: 0,
      cancellationDelayMilliseconds: 25,
      delay: () => Promise.resolve(),
      now: () => {
        timestamp += 10;
        return timestamp;
      },
      createCancellationSource: () => ({
        token: { get isCancellationRequested() { return cancelled; } },
        cancel: () => {
          cancelled = true;
          events.push("cancel");
        },
        dispose: () => events.push("dispose"),
      }),
    });
    await Promise.resolve();

    expect(events).toEqual([
      "textDocument/didChange:8",
      "old-completion",
      "cancel",
      "textDocument/didChange:9",
      "replacement-completion",
      "probe",
    ]);
    expect(cancelled).toBe(true);

    replacementCompletion.resolve({ items: [{ label: "itemCount" }] });
    await flushMicrotasks();
    probe.resolve({ fingerprint: "current" });
    await flushMicrotasks();
    oldCompletion.resolve({ items: [{ label: "searchText" }] });
    const result = await measurement;

    expect(result.version).toBe(9);
    expect(result.cycle).toMatchObject({
      replacementDispatchedDuringContention: true,
      requestMilliseconds: 60,
      cancellationToSettlementMilliseconds: 50,
      probeMilliseconds: 20,
      replacementCompletionMilliseconds: 20,
      completionOutcome: { status: "fulfilled" },
      probeOutcome: { status: "fulfilled" },
      replacementCompletionOutcome: { status: "fulfilled" },
      replacementCompletionCurrentness: {
        requiredLabel: "itemCount",
        forbiddenLabel: "searchText",
      },
      timeline: {
        oldRequestStartedMilliseconds: 10,
        cancellationSentMilliseconds: 20,
        replacementRequestStartedMilliseconds: 30,
        probeRequestStartedMilliseconds: 40,
        replacementRequestSettledMilliseconds: 50,
        probeRequestSettledMilliseconds: 60,
        oldRequestSettledMilliseconds: 70,
      },
    });
    expect(events.at(-1)).toBe("dispose");
  });
});

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
