import { describe, expect, test, vi } from "vitest";

interface ParsedProtocolResponsivenessArgs {
  readonly fixture: string | null;
  readonly workspace: string | null;
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

interface ProtocolResponsivenessMeasurementModule {
  parseProtocolResponsivenessArgs(argv: readonly string[]): ParsedProtocolResponsivenessArgs;
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

async function loadMeasurementModule(): Promise<ProtocolResponsivenessMeasurementModule> {
  return await import(scriptUrl) as unknown as ProtocolResponsivenessMeasurementModule;
}

describe("protocol responsiveness measurement", () => {
  test("normalizes defaults and exact value/boolean spellings", async () => {
    const { parseProtocolResponsivenessArgs } = await loadMeasurementModule();

    expect(parseProtocolResponsivenessArgs([])).toEqual({
      fixture: null,
      workspace: null,
      cancellationDelayMilliseconds: 25,
      cycles: 3,
      json: false,
    });
    expect(parseProtocolResponsivenessArgs([
      "--fixture", "catalog",
      "--cancel-after=40",
      "--cycles", "7",
      "--json",
    ])).toEqual({
      fixture: "catalog",
      workspace: null,
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
    [["--fixture", "catalog", "--workspace", "C:\\app"], "mutually exclusive"],
  ] as const)("rejects malformed argv %#", async (argv, message) => {
    const { parseProtocolResponsivenessArgs } = await loadMeasurementModule();

    expect(() => parseProtocolResponsivenessArgs(argv)).toThrow(message);
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
});
