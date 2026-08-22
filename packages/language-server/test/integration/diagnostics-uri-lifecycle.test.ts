import { expect, test, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { MessageConnection } from "vscode-languageserver/node";
import {
  createAureliaAppFixture,
  fileUri,
  initialize,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

const CREATED = 1;
const CHANGED = 2;
const DELETED = 3;

interface FullDiagnosticReport {
  readonly kind: "full";
  readonly resultId: string;
  readonly items: readonly { readonly message?: unknown }[];
}

interface UnchangedDiagnosticReport {
  readonly kind: "unchanged";
  readonly resultId: string;
}

type DiagnosticReport = FullDiagnosticReport | UnchangedDiagnosticReport;

test("diagnostics retire old file and folder URIs and settle after delete/recreate churn", async () => {
  const fixture = createLifecycleFixture();
  const { connection, child, dispose, getStderr } = startServer(fixture);
  let refreshCount = 0;

  try {
    await initialize(connection, child, getStderr, fixture, {
      diagnostics: { onRefresh: () => { refreshCount += 1; } },
    });

    const initialRelativePath = "src/components/lifecycle-card.html";
    const initialUri = fileUri(fixture, initialRelativePath);
    const initial = await expectDiagnostic(connection, initialUri, "missingLifecycle");

    const fileRenamedRelativePath = "src/components/renamed-card.html";
    let refreshCursor = refreshCount;
    renameTemplateFile(fixture, initialRelativePath, fileRenamedRelativePath);
    notifyWatchedFiles(connection, [
      { uri: initialUri, type: DELETED },
      { uri: fileUri(fixture, fileRenamedRelativePath), type: CREATED },
      { uri: fileUri(fixture, "src/components/lifecycle-card.ts"), type: CHANGED },
    ]);
    await waitForRefresh(() => refreshCount, refreshCursor);

    await expectExplicitClear(connection, initialUri, initial.resultId);
    let currentUri = fileUri(fixture, fileRenamedRelativePath);
    let current = await expectDiagnostic(connection, currentUri, "missingLifecycle");

    // Exercise two opposite structural transitions inside one debounce window. The
    // intermediate URI was previously published, but only the final authored URI may
    // retain Problems after the coalesced generation settles.
    renameTemplateFile(fixture, fileRenamedRelativePath, initialRelativePath);
    refreshCursor = refreshCount;
    notifyWatchedFiles(connection, [
      { uri: currentUri, type: DELETED },
      { uri: initialUri, type: CREATED },
      { uri: fileUri(fixture, "src/components/lifecycle-card.ts"), type: CHANGED },
    ]);
    renameTemplateFile(fixture, initialRelativePath, fileRenamedRelativePath);
    notifyWatchedFiles(connection, [
      { uri: initialUri, type: DELETED },
      { uri: currentUri, type: CREATED },
      { uri: fileUri(fixture, "src/components/lifecycle-card.ts"), type: CHANGED },
    ]);
    await waitForRefresh(() => refreshCount, refreshCursor);

    await expectExplicitClear(connection, initialUri, null);
    current = await expectDiagnostic(connection, currentUri, "missingLifecycle", current.resultId);

    const oldFolderRelativePath = "src/components";
    const newFolderRelativePath = "src/renamed-components";
    const oldFolderUri = currentUri;
    refreshCursor = refreshCount;
    renameComponentFolder(fixture, oldFolderRelativePath, newFolderRelativePath);
    currentUri = fileUri(fixture, `${newFolderRelativePath}/renamed-card.html`);
    notifyWatchedFiles(connection, [
      { uri: oldFolderUri, type: DELETED },
      { uri: fileUri(fixture, `${oldFolderRelativePath}/lifecycle-card.ts`), type: DELETED },
      { uri: currentUri, type: CREATED },
      { uri: fileUri(fixture, `${newFolderRelativePath}/lifecycle-card.ts`), type: CREATED },
      { uri: fileUri(fixture, "src/app.ts"), type: CHANGED },
    ]);
    await waitForRefresh(() => refreshCount, refreshCursor);

    await expectExplicitClear(connection, oldFolderUri, current.resultId);
    current = await expectDiagnostic(connection, currentUri, "missingLifecycle");

    const currentPath = path.join(fixture, newFolderRelativePath, "renamed-card.html");
    const retainedText = fs.readFileSync(currentPath, "utf8");
    refreshCursor = refreshCount;
    fs.unlinkSync(currentPath);
    notifyWatchedFiles(connection, [{ uri: currentUri, type: DELETED }]);
    await waitForRefresh(() => refreshCount, refreshCursor);

    await expectExplicitClear(connection, currentUri, current.resultId);

    fs.writeFileSync(currentPath, retainedText, "utf8");
    refreshCursor = refreshCount;
    notifyWatchedFiles(connection, [{ uri: currentUri, type: CREATED }]);
    await waitForRefresh(() => refreshCount, refreshCursor);

    await expectDiagnostic(connection, currentUri, "missingLifecycle");
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 90_000);

test("diagnostics clear and reappear when authored-source configuration membership changes", async () => {
  const fixture = createLifecycleFixture();
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const configPath = path.join(fixture, "aurelia.project.json");
  const configUri = fileUri(fixture, "aurelia.project.json");
  const templateUri = fileUri(fixture, "src/components/lifecycle-card.html");
  let refreshCount = 0;

  try {
    await initialize(connection, child, getStderr, fixture, {
      diagnostics: { onRefresh: () => { refreshCount += 1; } },
    });
    const admitted = await expectDiagnostic(connection, templateUri, "missingLifecycle");

    let refreshCursor = refreshCount;
    fs.writeFileSync(configPath, JSON.stringify({
      version: 1,
      authoredSources: { excludedRoots: ["src/components"] },
    }), "utf8");
    notifyWatchedFiles(connection, [{ uri: configUri, type: CHANGED }]);
    await waitForRefresh(() => refreshCount, refreshCursor);

    const excluded = await expectExplicitClear(connection, templateUri, admitted.resultId);
    expect(excluded.resultId).not.toBe(admitted.resultId);

    refreshCursor = refreshCount;
    fs.writeFileSync(configPath, JSON.stringify({ version: 1 }), "utf8");
    notifyWatchedFiles(connection, [{ uri: configUri, type: CHANGED }]);
    await waitForRefresh(() => refreshCount, refreshCursor);

    const readmitted = await expectDiagnostic(
      connection,
      templateUri,
      "missingLifecycle",
      excluded.resultId,
    );
    expect(readmitted.resultId).not.toBe(excluded.resultId);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);

function createLifecycleFixture(): string {
  return createAureliaAppFixture({
    "aurelia.project.json": JSON.stringify({ version: 1 }),
    "src/app.ts": [
      "import { customElement } from 'aurelia';",
      "import { LifecycleCard } from './components/lifecycle-card';",
      "@customElement({ name: 'app-root', template: '<template><lifecycle-card></lifecycle-card></template>', dependencies: [LifecycleCard] })",
      "export class AppRoot {}",
    ].join("\n"),
    "src/components/lifecycle-card.ts": [
      "import { customElement } from 'aurelia';",
      "import template from './lifecycle-card.html';",
      "@customElement({ name: 'lifecycle-card', template })",
      "export class LifecycleCard { existing = 1; }",
    ].join("\n"),
    "src/components/lifecycle-card.html": "<template>${missingLifecycle}</template>",
  });
}

function renameTemplateFile(
  fixture: string,
  oldRelativePath: string,
  newRelativePath: string,
): void {
  fs.renameSync(path.join(fixture, oldRelativePath), path.join(fixture, newRelativePath));
  const viewModelPath = path.join(fixture, "src/components/lifecycle-card.ts");
  const nextModule = `./${path.basename(newRelativePath)}`;
  fs.writeFileSync(
    viewModelPath,
    fs.readFileSync(viewModelPath, "utf8").replace(/\.\/(?:lifecycle-card|renamed-card)\.html/u, nextModule),
    "utf8",
  );
}

function renameComponentFolder(
  fixture: string,
  oldRelativePath: string,
  newRelativePath: string,
): void {
  fs.renameSync(path.join(fixture, oldRelativePath), path.join(fixture, newRelativePath));
  const appPath = path.join(fixture, "src/app.ts");
  fs.writeFileSync(
    appPath,
    fs.readFileSync(appPath, "utf8").replace("./components/lifecycle-card", "./renamed-components/lifecycle-card"),
    "utf8",
  );
}

function notifyWatchedFiles(
  connection: MessageConnection,
  changes: readonly { readonly uri: string; readonly type: number }[],
): void {
  connection.sendNotification("workspace/didChangeWatchedFiles", { changes });
}

async function expectDiagnostic(
  connection: MessageConnection,
  uri: string,
  marker: string,
  previousResultId: string | null = null,
): Promise<FullDiagnosticReport> {
  const report = await pullSettledDiagnostics(connection, uri, previousResultId);
  expect(report.kind).toBe("full");
  if (report.kind !== "full") throw new Error(`Expected a full diagnostic report for ${uri}.`);
  expect(report.items.some((item) => diagnosticMessage(item).includes(marker))).toBe(true);
  return report;
}

async function expectExplicitClear(
  connection: MessageConnection,
  uri: string,
  previousResultId: string | null,
): Promise<FullDiagnosticReport> {
  const report = await pullSettledDiagnostics(connection, uri, previousResultId);
  expect(report.kind).toBe("full");
  if (report.kind !== "full") throw new Error(`Expected an explicit full clear for ${uri}.`);
  expect(report.items).toEqual([]);
  return report;
}

async function pullSettledDiagnostics(
  connection: MessageConnection,
  uri: string,
  previousResultId: string | null,
): Promise<DiagnosticReport> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await connection.sendRequest("textDocument/diagnostic", {
        textDocument: { uri },
        identifier: "aurelia",
        ...(previousResultId == null ? {} : { previousResultId }),
      }) as DiagnosticReport;
    } catch (error) {
      lastError = error;
      if (!serverRequestedDiagnosticRetrigger(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw lastError;
}

function serverRequestedDiagnosticRetrigger(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const candidate = error as { readonly code?: unknown; readonly data?: { readonly retriggerRequest?: unknown } };
  return candidate.code === -32802 && candidate.data?.retriggerRequest === true;
}

async function waitForRefresh(readCount: () => number, baseline: number): Promise<void> {
  await vi.waitFor(() => {
    expect(readCount()).toBeGreaterThan(baseline);
  }, { timeout: 30_000, interval: 20 });
}

function diagnosticMessage(diagnostic: { readonly message?: unknown }): string {
  const message = diagnostic.message;
  if (typeof message === "string") return message;
  if (message != null && typeof message === "object" && "value" in message) {
    const value = (message as { readonly value?: unknown }).value;
    return typeof value === "string" ? value : "";
  }
  return "";
}
