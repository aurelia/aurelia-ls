import fs from 'node:fs';
import { expect, test } from 'vitest';
import {
  applyWorkspaceEditToTrackedDocuments, changeDocument, createAureliaAppFixture, fileUri,
  initialize, openDocument, positionAt, startServer, waitForExit,
  type RenameResult, type TrackedDocument,
} from './helpers/lsp-harness.js';

test('TS-origin rename uses exact authored interpolation tokens across inline escapes', async () => {
  const source = [
    "import { customElement } from 'aurelia';",
    "const template = '<p>\\u0024{title}</p><input value.bind=\"1 \\u0026#43; title\"><b>${title}</b>';",
    "@customElement({name: 'app-root', template})",
    "export class AppRoot { title = 'untouched'; }",
  ].join('\n');
  const fixture = createAureliaAppFixture({ 'src/app.ts': source });
  const uri = fileUri(fixture, 'src/app.ts');
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const rename = (text: string) => connection.sendRequest<{ status: string; workspaceEdit?: RenameResult }>(
    'aurelia/renameFromTs', { uri, position: positionAt(text, text.indexOf('title =') + 1), newName: 'caption' },
  );
  try {
    await initialize(connection, child, getStderr, fixture);
    openDocument(connection, uri, 'typescript', source, 1);
    const response = await rename(source);
    expect(response.status).toBe('success');
    const doc: TrackedDocument = { uri, languageId: 'typescript', text: source, version: 1 };
    applyWorkspaceEditToTrackedDocuments(response.workspaceEdit!, new Map([[uri, doc]]));
    expect(doc.text).toBe(source.replaceAll('title', 'caption'));

    // This spelling is equivalent at runtime, but the identifier itself is not a verbatim editable token.
    const escapedName = source.replace('0024{title}', '0024{\\u0074itle}');
    changeDocument(connection, uri, escapedName, 2);
    const unsafe = await rename(escapedName);
    expect(unsafe.status).toBe('blocked');
    expect(unsafe.workspaceEdit).toBeUndefined();
  } finally {
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);
