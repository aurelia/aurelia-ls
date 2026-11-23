import { rmSync } from 'node:fs';
import { expect, test } from 'vitest';
import { AureliaProtocolRequest, aureliaWorkspaceEditContentRevision, type SourceOwnershipResponse } from '../../src/protocol.js';
import { changeDocument, createAureliaAppFixture, fileUri, initialize, openDocument, startServer, waitForExit } from './helpers/lsp-harness.js';

test('selects embedded diagnostics only for the owned, exact source with an active interpolated language', async () => {
  const html = '<div style="width: ${amount}%; color: #12zz34"></div>\n<script>const real = ;</script>';
  const root = createAureliaAppFixture({
    'src/app.ts': "import {customElement} from 'aurelia'; import template from './view.html'; @customElement({name:'app-root',template}) export class AppRoot {amount=42}",
    'src/view.html': html,
    'src/unowned.html': html,
    'src/assets.d.ts': "declare module '*.html' {const template:string; export default template;}",
  });
  const { connection, child, dispose, getStderr } = startServer(root);
  const uri = fileUri(root, 'src/view.html');
  const unrelated = fileUri(root, 'src/unowned.html');
  const read = (source: string, text: string, styles = true, scripts = true) =>
    connection.sendRequest<SourceOwnershipResponse>(AureliaProtocolRequest.SourceOwnership, {
      uri: source,
      embeddedValidation: { revision: aureliaWorkspaceEditContentRevision(text), styles, scripts },
    });
  try {
    await initialize(connection, child, getStderr, root);
    openDocument(connection, uri, 'html', html);
    openDocument(connection, unrelated, 'html', html);
    const response = await read(uri, html);
    expect(response.templateOwned).toBe(true);
    expect(response.embeddedValidation?.diagnostics?.map(d => [d.source, d.range.start.line, d.range.start.character])).toEqual([
      ['css', 0, html.indexOf('#12zz34')],
      ['javascript', 1, '<script>const real = '.length],
    ]);
    expect((await read(uri, html, true, false)).embeddedValidation?.diagnostics?.map(d => d.source)).toEqual(['css']);
    expect((await read(uri, html, false, true)).embeddedValidation?.diagnostics).toBeNull();
    expect((await read(unrelated, html)).embeddedValidation).toBeUndefined();
    const staticText = html.replace('${amount}', '42');
    changeDocument(connection, uri, staticText, 2);
    expect((await read(uri, html)).embeddedValidation).toBeUndefined();
    expect((await read(uri, staticText)).embeddedValidation?.diagnostics).toBeNull();
    changeDocument(connection, uri, html, 3);
    expect((await read(uri, html)).embeddedValidation).toEqual(response.embeddedValidation);
  } finally {
    await connection.sendRequest('shutdown');
    connection.sendNotification('exit');
    await waitForExit(child);
    dispose();
    rmSync(root, { recursive: true, force: true });
  }
}, 60_000);
