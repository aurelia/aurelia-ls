import { expect, test, vi } from "vitest";
import fs from "node:fs";
import {
  changeDocument,
  createAureliaAppFixture,
  fileUri,
  initialize,
  openDocument,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

interface FullDiagnosticReport {
  readonly kind: "full";
  readonly resultId?: string;
  readonly items: readonly { readonly message?: unknown }[];
}

interface UnchangedDiagnosticReport {
  readonly kind: "unchanged";
  readonly resultId: string;
}

type DiagnosticReport = FullDiagnosticReport | UnchangedDiagnosticReport;

type SettledEvent =
  | { readonly kind: "analysisChanged"; readonly params: unknown }
  | { readonly kind: "diagnosticRefresh" };

test("real stdio diagnostics prove full, unchanged, edit invalidation, and unchanged reuse", async () => {
  const initialHtml = "<template>${existing}</template>";
  const changedHtml = "<template>${missingAfterEdit}</template>";
  const fixture = createAureliaAppFixture({
    "src/app.ts": [
      "import { customElement } from 'aurelia';",
      "import template from './app.html';",
      "@customElement({ name: 'app-root', template })",
      "export class AppRoot {",
      "  existing = 'ready';",
      "}",
    ].join("\n"),
    "src/app.html": initialHtml,
  });
  const uri = fileUri(fixture, "src/app.html");
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const settledEvents: SettledEvent[] = [];

  try {
    const initializeResult = await initialize(connection, child, getStderr, fixture, {
      diagnostics: {
        onAnalysisChanged: (params) => settledEvents.push({ kind: "analysisChanged", params }),
        onRefresh: () => settledEvents.push({ kind: "diagnosticRefresh" }),
      },
    }) as { readonly capabilities?: { readonly diagnosticProvider?: unknown } };
    expect(initializeResult.capabilities?.diagnosticProvider).toEqual({
      identifier: "aurelia",
      interFileDependencies: true,
      workspaceDiagnostics: false,
    });

    openDocument(connection, uri, "html", initialHtml, 1);

    const first = await pullDiagnostics(connection, uri);
    expect(first.kind).toBe("full");
    if (first.kind !== "full") throw new Error("Expected initial full diagnostics report.");
    expect(first.resultId).toEqual(expect.any(String));
    expect(first.resultId?.length).toBeGreaterThan(0);
    const firstResultId = first.resultId!;

    const firstReuse = await pullDiagnostics(connection, uri, firstResultId);
    expect(firstReuse).toEqual({ kind: "unchanged", resultId: firstResultId });

    const changeCursor = settledEvents.length;
    changeDocument(connection, uri, changedHtml, 2);
    await expectSettledPair(settledEvents, changeCursor);

    const changed = await pullDiagnostics(connection, uri, firstResultId);
    expect(changed.kind).toBe("full");
    if (changed.kind !== "full") throw new Error("Expected edit-invalidated full diagnostics report.");
    expect(changed.resultId).toEqual(expect.any(String));
    expect(changed.resultId?.length).toBeGreaterThan(0);
    expect(changed.resultId).not.toBe(firstResultId);
    expect(changed.items.some((item) =>
      typeof item.message === "string" && item.message.includes("missingAfterEdit")
    )).toBe(true);
    const changedResultId = changed.resultId!;

    const changedReuse = await pullDiagnostics(connection, uri, changedResultId);
    expect(changedReuse).toEqual({ kind: "unchanged", resultId: changedResultId });
    expect(settledEvents.map((event) => event.kind)).toEqual([
      "analysisChanged",
      "diagnosticRefresh",
    ]);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60000);

async function pullDiagnostics(
  connection: ReturnType<typeof startServer>["connection"],
  uri: string,
  previousResultId: string | null = null,
): Promise<DiagnosticReport> {
  return await connection.sendRequest("textDocument/diagnostic", {
    textDocument: { uri },
    identifier: "aurelia",
    ...(previousResultId == null ? {} : { previousResultId }),
  }) as DiagnosticReport;
}

async function expectSettledPair(events: SettledEvent[], cursor: number): Promise<void> {
  await vi.waitFor(() => {
    expect(events).toHaveLength(cursor + 2);
  }, { timeout: 30000, interval: 20 });
  const pair = events.slice(cursor);
  expect(pair.map((event) => event.kind)).toEqual(["analysisChanged", "diagnosticRefresh"]);
  const analysis = pair[0];
  expect(analysis?.kind).toBe("analysisChanged");
  if (analysis?.kind !== "analysisChanged") return;
  expect(analysis.params).toMatchObject({
    fingerprint: expect.any(String),
    changeKind: "source-text",
    changedSourceUris: [expect.any(String)],
  });
  expect((analysis.params as { readonly changedSourceUris?: readonly string[] }).changedSourceUris).toEqual([
    expect.stringContaining("/src/app.html"),
  ]);
  expect(analysis.params).not.toHaveProperty("uri");
}
