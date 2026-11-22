import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import type { LocationLink, Range } from 'vscode-languageserver/node';
import type { RenameFromTsResponse, ResourceInventoryResponse, SourceOwnershipResponse } from '../../src/protocol.js';
import { stageReleaseWorkspace } from '../../../../scripts/release-workspace.mjs';
import {
  applyWorkspaceEditToTrackedDocuments, changeDocument, fileUri, initialize, openDocument,
  positionAt, startServer, waitForExit, type RenameResult, type TrackedDocument,
} from './helpers/lsp-harness.js';

// The release runner selects a verified server bundle and installs a real workspace dependency tree.
const typeScriptVersion = process.env.AURELIA_LS_RELEASE_TYPESCRIPT;
test.runIf(typeScriptVersion)('keeps edits and definitions with the owning Vite or inline component across sibling projects', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-release-workspace-'));
  const { conventionRoot, inlineRoot, libraryRoot } = stageReleaseWorkspace(workspace, { typeScriptVersion });
  const { connection, child, getStderr, dispose } = startServer(workspace);
  const html = document(conventionRoot, 'src/my-app.html', 'html');
  const viewModel = document(conventionRoot, 'src/my-app.ts', 'typescript');
  const inline = document(inlineRoot, 'src/app.ts', 'typescript');
  const initialHtml = html.text;
  const initialViewModel = viewModel.text;
  const documents = new Map([html, viewModel, inline].map(doc => [doc.uri, doc]));
  const pull = (doc: TrackedDocument) => connection.sendRequest<{ items: { code: string; range: Range }[] }>(
    'textDocument/diagnostic', { textDocument: { uri: doc.uri }, identifier: 'aurelia' },
  );
  const replace = (doc: TrackedDocument, text: string) => {
    doc.text = text;
    changeDocument(connection, doc.uri, text, ++doc.version);
  };
  const expectDefinition = async (doc: TrackedDocument, target: TrackedDocument, name: string) => {
    const links = await connection.sendRequest<LocationLink[] | null>('textDocument/definition', {
      textDocument: { uri: doc.uri }, position: tokenRange(doc.text, '${' + name + '}', name).start,
    });
    expect(links, `definition of ${name} in ${doc.uri}`).toMatchObject([{
      targetUri: target.uri, targetSelectionRange: tokenRange(target.text, `${name} =`, name),
    }]);
  };
  const expectInlineRename = async () => {
    const plan = await connection.sendRequest<RenameFromTsResponse>('aurelia/renameFromTs', {
      uri: inline.uri, position: tokenRange(inline.text, 'message =', 'message').start, newName: 'inlineGreeting',
    });
    if (plan.status !== 'success') throw new Error(`Inline member rename failed: ${JSON.stringify(plan)}`);
    expect(plan.workspaceEdit.documentChanges).toHaveLength(1);
    const change = plan.workspaceEdit.documentChanges![0]!;
    if (!('edits' in change)) throw new Error('Expected an edit of the inline component.');
    expect(change.textDocument.uri).toBe(inline.uri);
    expect(change.edits).toHaveLength(2);
    expect(change.edits).toEqual(expect.arrayContaining([
      { range: tokenRange(inline.text, '${message}', 'message'), newText: 'inlineGreeting' },
      { range: tokenRange(inline.text, 'message =', 'message'), newText: 'inlineGreeting' },
    ]));
  };
  const packageCards = async () => {
    const inventory = await connection.sendRequest<ResourceInventoryResponse>('aurelia/resourceInventory', {});
    const app = inventory.projects.find(row => row.project.rootUri === fileUri(inlineRoot, ''));
    if (app?.status !== 'ready') throw new Error(`No inventory for inline app: ${JSON.stringify(app)}`);
    return app.resources.filter(resource => resource.name === 'release-card');
  };
  try {
    await initialize(connection, child, getStderr, workspace, {
      projectRootHintUris: [fileUri(conventionRoot, ''), fileUri(inlineRoot, '')],
    });
    for (const doc of [html, viewModel, inline]) openDocument(connection, doc.uri, doc.languageId, doc.text);
    // The explicit component remains discoverable before its first npm install.
    await expectInlineRename();
    expect(await packageCards()).toEqual([]);

    execSync('npm install --ignore-scripts --no-audit --no-fund', { cwd: workspace, stdio: 'pipe', timeout: 120_000 });
    const installedManifest = (name: string) => JSON.parse(fs.readFileSync(path.join(workspace, 'node_modules', name, 'package.json'), 'utf8'));
    expect(installedManifest('typescript').version).toBe(typeScriptVersion);
    console.log('Installed project packages', Object.fromEntries(
      ['aurelia', '@aurelia/vite-plugin', 'vite', 'typescript'].map(name => [name, installedManifest(name).version]),
    ));
    expect(fs.existsSync(path.join(workspace, 'package-lock.json'))).toBe(true);
    await connection.sendNotification('workspace/didChangeWatchedFiles', { changes: [
      { uri: fileUri(workspace, 'package-lock.json'), type: 1 },
    ] });
    const cards = await packageCards();
    await expectDefinition(html, viewModel, 'message');
    expect(cards.map(resource => resource.origin)).toMatchObject([{ kind: 'package', packageName: '@release/card-kit' }]);
    const packageFile = fs.realpathSync(path.join(libraryRoot, 'src/index.js'));
    const target = cards[0]!.navigation;
    if (target.state !== 'available') throw new Error('Resource Discovery should navigate to the package component.');
    expect(fs.realpathSync(fileURLToPath(target.location.uri))).toBe(packageFile);
    expect(target.location.range).toEqual(tokenRange(fs.readFileSync(packageFile, 'utf8'), "name: 'release-card'", 'release-card'));
    const implementation = cards[0]!.sources.implementation;
    if (implementation.state !== 'available') throw new Error('Package implementation should be navigable.');
    expect(fs.realpathSync(fileURLToPath(implementation.location.uri))).toBe(packageFile);
    const ownership = await connection.sendRequest<SourceOwnershipResponse>('aurelia/sourceOwnership', {
      uri: implementation.location.uri,
    });
    // npm links to a locally authored library. Its source has a separate owner from either consumer.
    expect(ownership.owners).toEqual([{
      projectKey: '@release/card-kit', rootUri: fileUri(libraryRoot, ''), projectPath: 'src/index.js', role: 'app-source',
    }]);

    const typo = initialHtml.replace('${message}', '${messag}');
    replace(html, typo);
    expect((await pull(html)).items).toEqual([expect.objectContaining({
      code: 'missing-expression-member', range: tokenRange(typo, 'messag'),
    })]);
    expect((await pull(inline)).items).toEqual([]);
    replace(html, initialHtml);
    expect((await pull(html)).items).toEqual([]);

    const rename = await connection.sendRequest<RenameResult>('textDocument/rename', {
      textDocument: { uri: html.uri }, position: tokenRange(initialHtml, 'message').start, newName: 'greeting',
    });
    const changed = applyWorkspaceEditToTrackedDocuments(rename, documents);
    expect(changed.map(doc => doc.uri).sort()).toEqual([html.uri, viewModel.uri].sort());
    expect(html.text).toBe(initialHtml.replace('message', 'greeting'));
    expect(viewModel.text).toBe(initialViewModel.replace('message', 'greeting'));
    for (const doc of changed) changeDocument(connection, doc.uri, doc.text, doc.version);
    await expectInlineRename();
    await expectDefinition(html, viewModel, 'greeting');

    for (const [doc, original] of [[html, initialHtml], [viewModel, initialViewModel]] as const) {
      fs.writeFileSync(fileURLToPath(doc.uri), original);
      replace(doc, original);
    }
    await expectDefinition(html, viewModel, 'message');
    expect((await pull(html)).items).toEqual([]);
    expect(inline.text).toBe(fs.readFileSync(fileURLToPath(inline.uri), 'utf8'));
  } finally {
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}, 240_000);

function document(root: string, relative: string, languageId: string): TrackedDocument {
  return { uri: fileUri(root, relative), languageId, text: fs.readFileSync(path.join(root, relative), 'utf8'), version: 1 };
}

function tokenRange(text: string, marker: string, token = marker): Range {
  const index = text.indexOf(marker);
  expect(index, `expected ${marker}`).toBeGreaterThanOrEqual(0);
  expect(marker).toContain(token);
  const start = index + marker.indexOf(token);
  return { start: positionAt(text, start), end: positionAt(text, start + token.length) };
}
