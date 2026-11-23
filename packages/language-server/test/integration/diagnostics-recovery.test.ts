import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';
import {
  changeDocument,
  copyFixtureDirectory,
  createAureliaAppFixture,
  createDiagnosticsRecorder,
  fileUri,
  initialize,
  openDocument,
  positionAt,
  startServer,
  waitForExit,
} from './helpers/lsp-harness.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const helloWorldFixture = path.join(repoRoot, 'fixtures', 'hello-world');

type LspDiagnosticLike = {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly range?: {
    readonly start: { readonly line: number; readonly character: number };
    readonly end: { readonly line: number; readonly character: number };
  };
};

test('HTML recovery Problems remain Aurelia-owned and settle invalid-valid/A-B-A edits', async () => {
  const fixture = copyFixtureDirectory(helloWorldFixture);
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);

    const nativeUri = fileUri(fixture, 'src/my-app.html');
    const nativeMalformed = '<template><div title.bind="native-open></div></template>';
    openDocument(connection, nativeUri, 'html', nativeMalformed, 1);
    const nativeRows = await diagnostics.wait(nativeUri, 10_000) as LspDiagnosticLike[];
    expect(onlyRecovery(nativeRows)).toMatchObject({
      code: 'html-syntax-recovery',
      message: 'Unterminated value for attribute title.bind.',
      range: rangeFor(nativeMalformed, '"native-open></div></template>'),
    });

    const suppressedUri = fileUri(fixture, 'src/components/product-card.html');
    const valid = '<template><div title="valid"></div></template>';
    openDocument(connection, suppressedUri, 'aurelia-html', valid, 1);
    expect(await diagnostics.wait(suppressedUri, 10_000)).toEqual([]);

    const malformedA = '<template><div title.bind="alpha></div></template>';
    changeDocument(connection, suppressedUri, malformedA, 2);
    const firstA = onlyRecovery(await diagnostics.wait(suppressedUri, 10_000));
    expect(firstA).toMatchObject({
      code: 'html-syntax-recovery',
      message: 'Unterminated value for attribute title.bind.',
      range: rangeFor(malformedA, '"alpha></div></template>'),
    });

    changeDocument(connection, suppressedUri, valid, 3);
    expect(await diagnostics.wait(suppressedUri, 10_000)).toEqual([]);

    const malformedB = '<template><svg><foreignObject><!-- beta</foreignObject></svg></template>';
    changeDocument(connection, suppressedUri, malformedB, 4);
    const rowB = onlyRecovery(await diagnostics.wait(suppressedUri, 10_000));
    expect(rowB).toMatchObject({
      code: 'html-syntax-recovery',
      message: 'Unterminated HTML comment.',
      range: rangeFor(malformedB, '<!-- beta</foreignObject></svg></template>'),
    });

    changeDocument(connection, suppressedUri, malformedA, 5);
    const secondA = onlyRecovery(await diagnostics.wait(suppressedUri, 10_000));
    expect(secondA).toMatchObject({
      code: 'html-syntax-recovery',
      message: firstA.message,
      range: firstA.range,
    });

    const malformedCdata = '<template><svg><![CDATA[open</svg></template>';
    changeDocument(connection, suppressedUri, malformedCdata, 6);
    expect(onlyRecovery(await diagnostics.wait(suppressedUri, 10_000))).toMatchObject({
      code: 'html-syntax-recovery',
      message: 'Unterminated foreign-content CDATA section.',
      range: rangeFor(malformedCdata, '<![CDATA[open</svg></template>'),
    });

    const validCdata = '<template><svg><![CDATA[open]]></svg></template>';
    changeDocument(connection, suppressedUri, validCdata, 7);
    expect(await diagnostics.wait(suppressedUri, 10_000)).toEqual([]);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);

test('inline TypeScript templates keep Aurelia recovery because no native HTML validator owns them', async () => {
  const source = [
    "import { customElement } from 'aurelia';",
    "@customElement({ name: 'app-root', template: '<template><div><\\x73pan></div></template>' })",
    'export class AppRoot {}',
  ].join('\n');
  const fixture = createAureliaAppFixture({ 'src/app.ts': source });
  const uri = fileUri(fixture, 'src/app.ts');
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    openDocument(connection, uri, 'typescript', source, 1);
    const rows = await diagnostics.wait(uri, 10_000);
    const recovery = onlyRecovery(rows);
    expect(recovery).toMatchObject({
      code: 'html-syntax-recovery',
      message: 'Missing closing tag </span>.',
      range: rangeFor(source, '\\x73pan'),
    });
    const multiline = source.replace(
      "'<template><div><\\x73pan></div></template>'",
      "`<template>\r\n\\q<div><\\x73pan></div></template>`",
    );
    changeDocument(connection, uri, multiline, 2);
    expect(onlyRecovery(await diagnostics.wait(uri, 10_000))).toMatchObject({
      message: 'Missing closing tag </span>.',
      range: rangeFor(multiline, '\\x73pan'),
    });
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test('HTML character references preserve diagnostic and hover ranges across template edits', async () => {
  const markup = (expression: string) => [
    '<template>',
    '  <input value.bind="' + expression + '">',
    '  <span>${' + expression + '}</span>',
    '  <span>${title}</span>',
    '</template>',
  ].join('\n');
  const plain = 'count + title';
  const encoded = 'count &#43; title';
  const malformed = 'count &#43; ';
  const fixture = createAureliaAppFixture({
    'src/app.ts': [
      "import { customElement } from 'aurelia';",
      "import template from './app.html';",
      "@customElement({name: 'app-root', template})",
      "export class AppRoot { count = 1; title = 'hello'; }",
    ].join('\n'),
    'src/app.html': markup(plain),
  });
  const uri = fileUri(fixture, 'src/app.html');
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  try {
    await initialize(connection, child, getStderr, fixture);
    for (const [index, expression] of [plain, encoded, malformed, plain].entries()) {
      const text = markup(expression);
      if (index === 0) openDocument(connection, uri, 'html', text, 1);
      else changeDocument(connection, uri, text, index + 1);
      const rows = await diagnostics.wait(uri, 10_000) as LspDiagnosticLike[];
      if (expression === malformed) {
        expect(rows.map(row => row.code)).toEqual(['AUR0155', 'AUR0155']);
      } else {
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          code: 'binding-source-assignment-runtime-noop',
          range: rangeFor(text, expression),
        });
      }
      for (const [line, content] of text.split('\n').entries()) {
        const start = content.indexOf('title');
        if (start < 0) continue;
        const hover = await connection.sendRequest('textDocument/hover', {
          textDocument: { uri }, position: { line, character: start + 1 },
        });
        expect(hover).toMatchObject({
          contents: { value: expect.stringContaining('title: string') },
          range: { start: { line, character: start }, end: { line, character: start + 'title'.length } },
        });
      }
    }
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);

test('related files and a dirty neighbor remain current across HTML import aliases and re-exports', async () => {
  const direct = "import template from './view.html?raw';";
  const alias = "import markup from './view.html?raw'; const template = markup;";
  const barrel = "import { template } from './barrel';";
  const rootSource = (importLine: string) => [
    "import { customElement } from 'aurelia';", "import { Neighbor } from './neighbor';", importLine,
    "@customElement({ name: 'app-root', template, dependencies: [Neighbor] }) export class AppRoot { title = 'Hello'; }",
  ].join('\n');
  const neighborSource = [
    "import { customElement } from 'aurelia';", "import template from './neighbor.html';",
    "@customElement({ name: 'neighbor-card', template }) export class Neighbor { label = 'World'; }",
  ].join('\n');
  const rootHtml = '<p>${title}</p><neighbor-card></neighbor-card>';
  const validNeighbor = '<p>${label}</p>';
  const missingNeighbor = '<p>${missingNeighbor}</p>';
  const fixture = createAureliaAppFixture({
    'src/app.ts': rootSource(direct), 'src/view.html': rootHtml,
    'src/barrel.ts': "export { default as template } from './view.html';",
    'src/neighbor.ts': neighborSource, 'src/neighbor.html': missingNeighbor,
  });
  const { connection, child, getStderr, dispose } = startServer(fixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  const appUri = fileUri(fixture, 'src/app.ts');
  const htmlUri = fileUri(fixture, 'src/view.html');
  const neighborUri = fileUri(fixture, 'src/neighbor.html');
  try {
    await initialize(connection, child, getStderr, fixture);
    openDocument(connection, appUri, 'typescript', rootSource(direct));
    openDocument(connection, htmlUri, 'html', rootHtml);
    openDocument(connection, neighborUri, 'html', missingNeighbor);
    const phases = [
      { importLine: direct, neighbor: missingNeighbor, missing: 'missingNeighbor' },
      { importLine: alias, neighbor: validNeighbor, missing: null },
      { importLine: barrel, neighbor: '<p>${otherMissing}</p>', missing: 'otherMissing' },
      { importLine: direct, neighbor: validNeighbor, missing: null },
    ];
    for (const [index, phase] of phases.entries()) {
      if (index > 0) {
        changeDocument(connection, appUri, rootSource(phase.importLine), index + 1);
        changeDocument(connection, neighborUri, phase.neighbor, index + 1);
      }
      expect(await connection.sendRequest('aurelia/getRelatedFiles', { uri: appUri }))
        .toMatchObject([{ uri: htmlUri, role: 'component-template' }]);
      expect(await connection.sendRequest('aurelia/getRelatedFiles', { uri: htmlUri }))
        .toMatchObject([{ uri: appUri, role: 'component-source' }]);
      const rows = await diagnostics.wait(neighborUri, 10_000) as LspDiagnosticLike[];
      const missing = rows.filter(row => row.code === 'missing-expression-member');
      expect(missing.map(row => row.range)).toEqual(phase.missing == null ? [] : [rangeFor(phase.neighbor, phase.missing)]);
    }
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);

function onlyRecovery(rows: readonly unknown[]): LspDiagnosticLike {
  const recoveries = (rows as LspDiagnosticLike[]).filter(isHtmlRecoveryDiagnostic);
  expect(recoveries).toHaveLength(1);
  return recoveries[0]!;
}

function isHtmlRecoveryDiagnostic(row: LspDiagnosticLike): boolean {
  return row.code === 'html-syntax-recovery';
}

function rangeFor(text: string, token: string) {
  const start = text.indexOf(token);
  expect(start).toBeGreaterThanOrEqual(0);
  return {
    start: positionAt(text, start),
    end: positionAt(text, start + token.length),
  };
}
