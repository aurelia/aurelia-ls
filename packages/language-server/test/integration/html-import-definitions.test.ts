import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import type { LocationLink } from 'vscode-languageserver/node';
import {
  changeDocument, fileUri, initialize, openDocument, pathFromFileUri, positionAt, startServer, waitForExit,
} from './helpers/lsp-harness.js';

test('external HTML metadata grants only the imported module registrations to the component', async () => {
  const fixture = fileURLToPath(new URL('../../../aot-assurance/fixtures/g0/', import.meta.url));
  const uri = fileUri(fixture, 'src/g0-app.html');
  const targetUri = fileUri(fixture, 'src/g0-child.ts');
  const script = readFileSync(pathFromFileUri(targetUri), 'utf8');
  const start = script.indexOf('G0Child');
  const targetRange = { start: positionAt(script, start), end: positionAt(script, start + 'G0Child'.length) };
  const imported = '<import from="./g0-child"></import>';
  const aliased = '<import from="./g0-child" as="my-card"></import>';
  const cases = [
    [imported, 'g0-child', true],
    ['<import from=./g0-child></import>', 'g0-child', true],
    ['', 'g0-child', false],
    ['<textarea>' + imported + '</textarea>', 'g0-child', false],
    ['<template as-custom-element="local-a">' + imported + '</template>', 'g0-child', false],
    [aliased, 'my-card', true],
    [aliased, 'g0-child', false],
    ['<require from="./g0-child" g0-child.as="named-card"></require>', 'named-card', true],
    ['<import from="./missing/g0-child"></import>', 'g0-child', false],
    [imported, 'g0-child', true],
  ] as const;
  const { connection, child, dispose, getStderr } = startServer(fixture);
  try {
    await initialize(connection, child, getStderr, fixture);
    for (const [index, [metadata, tag, available]] of cases.entries()) {
      const html = '<template>' + metadata + '<' + tag + '></' + tag + '></template>';
      if (index === 0) openDocument(connection, uri, 'html', html, 1);
      else changeDocument(connection, uri, html, index + 1);
      const offset = html.lastIndexOf('<' + tag + '>') + 1;
      const links = await connection.sendRequest<LocationLink[] | null>('textDocument/definition', {
        textDocument: { uri }, position: positionAt(html, offset + 1),
      });
      if (!available) {
        expect(links ?? [], html).toEqual([]);
        continue;
      }
      expect(links, html).toHaveLength(1);
      expect(pathFromFileUri(links![0]!.targetUri)).toBe(pathFromFileUri(targetUri));
      expect(links![0]!.targetSelectionRange).toEqual(targetRange);
    }
  } finally {
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
  }
}, 120_000);
