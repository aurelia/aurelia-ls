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
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

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
