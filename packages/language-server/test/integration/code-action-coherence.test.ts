import { expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyWorkspaceEditToTrackedDocuments,
  changeDocument,
  copyFixtureDirectory,
  createDiagnosticsRecorder,
  fileUri,
  initialize,
  normalizedUriPath,
  openDocument,
  positionAt,
  startServer,
  type RenameResult,
  type TrackedDocument,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helloWorldFixture = path.join(repoRoot, "fixtures", "hello-world");

type ProtocolCodeAction = {
  readonly title: string;
  readonly edit?: RenameResult;
  readonly data?: unknown;
};

test("code-action resolve re-plans shifted targets and refuses an obsolete prepared action", async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  const documents = new Map<string, TrackedDocument>();

  try {
    await initialize(connection, child, getStderr, fixture);
    const template = openTrackedDocument(connection, fixture, "src/my-app.html", "html", documents);
    const viewModel = openTrackedDocument(connection, fixture, "src/my-app.ts", "typescript", documents);
    await diagnostics.wait(template.uri, 5000);

    template.text = template.text.replace("${heading}", "${titel}");
    template.version += 1;
    fs.writeFileSync(fileURLToPath(template.uri), template.text, "utf8");
    changeDocument(connection, template.uri, template.text, template.version);

    const titelOffset = template.text.indexOf("titel");
    const position = positionAt(template.text, titelOffset + 1);
    const actions = await waitForCodeActions(connection, template.uri, position);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.edit).toBeUndefined();

    const refactorActions = await connection.sendRequest("textDocument/codeAction", {
      textDocument: { uri: template.uri },
      range: { start: position, end: position },
      context: { diagnostics: [], only: ["refactor"] },
    }) as ProtocolCodeAction[] | null;
    expect(refactorActions).toBeNull();

    viewModel.text = `// unsaved offset pressure\n${viewModel.text}`;
    viewModel.version += 1;
    fs.writeFileSync(fileURLToPath(viewModel.uri), viewModel.text, "utf8");
    changeDocument(connection, viewModel.uri, viewModel.text, viewModel.version);

    const resolved = await connection.sendRequest("codeAction/resolve", actions[0]) as ProtocolCodeAction;
    expect(resolved.edit?.documentChanges).toHaveLength(1);
    const resolvedTarget = resolved.edit?.documentChanges?.[0]?.textDocument;
    expect(resolvedTarget?.version).toBe(viewModel.version);
    expect(normalizedUriPath(resolvedTarget!.uri)).toBe(normalizedUriPath(viewModel.uri));
    const changed = applyWorkspaceEditToTrackedDocuments(resolved.edit!, documents);
    for (const document of changed) {
      changeDocument(connection, document.uri, document.text, document.version);
    }
    expect(viewModel.text).toContain("// unsaved offset pressure");
    expect(viewModel.text).toContain("titel!: unknown;");

    const obsolete = await connection.sendRequest("codeAction/resolve", actions[0]) as ProtocolCodeAction;
    expect(obsolete.edit).toBeUndefined();
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

function openTrackedDocument(
  connection: Parameters<typeof openDocument>[0],
  fixture: string,
  relativePath: string,
  languageId: string,
  documents: Map<string, TrackedDocument>,
): TrackedDocument {
  const uri = fileUri(fixture, relativePath);
  const document = {
    uri,
    languageId,
    text: fs.readFileSync(fileURLToPath(uri), "utf8"),
    version: 1,
  };
  documents.set(uri, document);
  openDocument(connection, uri, languageId, document.text, document.version);
  return document;
}

async function waitForCodeActions(
  connection: Parameters<typeof openDocument>[0],
  uri: string,
  position: { readonly line: number; readonly character: number },
  timeoutMs = 10000,
): Promise<ProtocolCodeAction[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const actions = await connection.sendRequest("textDocument/codeAction", {
      textDocument: { uri },
      range: { start: position, end: position },
      context: { diagnostics: [], only: ["quickfix"] },
    }) as ProtocolCodeAction[] | null;
    if (actions != null && actions.length > 0) {
      return actions;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for code actions at ${uri}:${position.line}:${position.character}.`);
}
