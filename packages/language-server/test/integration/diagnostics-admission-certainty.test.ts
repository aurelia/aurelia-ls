import { expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createAureliaAppFixture,
  changeDocument,
  fileUri,
  initialize,
  openDocument,
  startServer,
  waitForExit,
} from './helpers/lsp-harness.js';

type DiagnosticReport = {
  readonly kind: 'full';
  readonly resultId: string;
  readonly items: readonly {
    readonly code?: unknown;
    readonly range?: {
      readonly start: { readonly line: number; readonly character: number };
      readonly end: { readonly line: number; readonly character: number };
    };
  }[];
};

const packageRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const unregisteredFixture = path.join(
  packageRoot,
  'semantic-runtime/fixtures/pressure/unregistered-plugin-resources',
);

test('document pulls distinguish closed absence from open-registration uncertainty', async () => {
  const closedCodes = await diagnosticCodesForWorkspace(
    unregisteredFixture,
    'src/unregistered-plugin-resources-app.html',
    false,
  );
  expect(closedCodes).toContain('framework-capability-not-registered');

  const openCodes = await diagnosticCodesForOpenFixture();
  expect(openCodes).not.toContain('framework-capability-not-registered');
  expect(openCodes).not.toContain('AUR0706');
}, 60_000);

test('one retained session settles closed-open-closed capability and resource Problems', async () => {
  const closedMain = certaintyMainSource(false);
  const openMain = certaintyMainSource(true);
  const template = [
    '<au-viewport default="home"></au-viewport>',
    '<unknown-plugin><template au-slot="item"></template></unknown-plugin>',
  ].join('');
  const fixture = createAureliaAppFixture({
    'src/main.ts': closedMain,
    'src/app.ts': [
      "import { customElement } from '@aurelia/runtime-html';",
      "import template from './app.html';",
      "@customElement({ name: 'app-root', template })",
      'export class AppRoot {}',
    ].join('\n'),
    'src/app.html': template,
  }, {
    '@aurelia/router': '^2.0.0-rc.2',
    '@aurelia/runtime-html': '^2.0.0-rc.2',
  });
  const mainUri = fileUri(fixture, 'src/main.ts');
  const templateUri = fileUri(fixture, 'src/app.html');
  const { connection, child, dispose, getStderr } = startServer(fixture);
  let refreshCount = 0;

  try {
    await initialize(connection, child, getStderr, fixture, {
      diagnostics: { onRefresh: () => { refreshCount += 1; } },
    });
    openDocument(connection, mainUri, 'typescript', closedMain, 1);
    openDocument(connection, templateUri, 'html', template, 1);

    const closed = await pullDiagnostics(connection, templateUri);
    expect(closed.items.map(diagnosticCode)).toEqual(expect.arrayContaining([
      'framework-capability-not-registered',
      'AUR0706',
    ]));

    let refreshCursor = refreshCount;
    changeDocument(connection, mainUri, openMain, 2);
    await waitForRefresh(() => refreshCount, refreshCursor);
    const open = await pullDiagnostics(connection, templateUri, closed.resultId);
    expect(open.resultId).not.toBe(closed.resultId);
    expect(open.items.map(diagnosticCode)).not.toContain('framework-capability-not-registered');
    expect(open.items.map(diagnosticCode)).not.toContain('AUR0706');

    refreshCursor = refreshCount;
    changeDocument(connection, mainUri, closedMain, 3);
    await waitForRefresh(() => refreshCount, refreshCursor);
    const restored = await pullDiagnostics(connection, templateUri, open.resultId);
    expect(restored.resultId).not.toBe(open.resultId);
    expect(restored.items.map(diagnosticCode)).toEqual(expect.arrayContaining([
      'framework-capability-not-registered',
      'AUR0706',
    ]));
  } finally {
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);

test('template diagnostics use the default, false, and true Aurelia strictness modes', async () => {
  const template = '<p>${maybeItem.label}</p>';
  const fixture = createAureliaAppFixture({
    'src/app.ts': [
      "import { customElement } from 'aurelia';",
      "import { DefaultStrictPanel } from './default-strict-panel';",
      "import { ExplicitLoosePanel } from './explicit-loose-panel';",
      "import { ExplicitStrictPanel } from './explicit-strict-panel';",
      "@customElement({ name: 'app-root', template: '<default-strict-panel></default-strict-panel><explicit-loose-panel></explicit-loose-panel><explicit-strict-panel></explicit-strict-panel>', dependencies: [DefaultStrictPanel, ExplicitLoosePanel, ExplicitStrictPanel] })",
      'export class AppRoot {}',
    ].join('\n'),
    'src/default-strict-panel.ts': strictPanelSource('default-strict-panel', 'default-strict.html', null),
    'src/explicit-loose-panel.ts': strictPanelSource('explicit-loose-panel', 'explicit-loose.html', false),
    'src/explicit-strict-panel.ts': strictPanelSource('explicit-strict-panel', 'explicit-strict.html', true),
    'src/default-strict.html': template,
    'src/explicit-loose.html': template,
    'src/explicit-strict.html': template,
    'src/aurelia-assets.d.ts': "declare module '*.html' { const value: string; export default value; }",
  });
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture, {
      diagnostics: { onRefresh: () => undefined },
    });
    const reports = new Map<string, DiagnosticReport>();
    for (const relativePath of ['src/default-strict.html', 'src/explicit-loose.html', 'src/explicit-strict.html']) {
      const uri = fileUri(fixture, relativePath);
      openDocument(connection, uri, 'html', template, 1);
      reports.set(relativePath, await pullDiagnostics(connection, uri));
    }

    expect(reports.get('src/default-strict.html')?.items.map(diagnosticCode)).not.toContain('TS18047');
    expect(reports.get('src/explicit-loose.html')?.items.map(diagnosticCode)).not.toContain('TS18047');
    const strictNullish = reports.get('src/explicit-strict.html')?.items.filter((item) =>
      diagnosticCode(item) === 'TS18047'
    ) ?? [];
    expect(strictNullish).toHaveLength(1);
    expect(strictNullish[0]?.range).toEqual({
      start: { line: 0, character: 5 },
      end: { line: 0, character: 14 },
    });
  } finally {
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60_000);

function strictPanelSource(
  elementName: string,
  templateFileName: string,
  strict: boolean | null,
): string {
  const strictField = strict == null ? '' : `, strict: ${strict}`;
  return [
    "import { customElement } from 'aurelia';",
    `import template from './${templateFileName}';`,
    'interface Item { readonly label: string; }',
    `@customElement({ name: '${elementName}', template${strictField} })`,
    `export class ${elementName.split('-').map((part) => part[0]!.toUpperCase() + part.slice(1)).join('')} {`,
    '  readonly maybeItem: Item | null = null;',
    '}',
  ].join('\n');
}

function certaintyMainSource(openRegistration: boolean): string {
  return [
    "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
    "import { RouterConfiguration } from '@aurelia/router';",
    "import { AppRoot } from './app';",
    ...(openRegistration ? ['declare function runtimeRegistry(): unknown;'] : []),
    'void RouterConfiguration;',
    'new Aurelia()',
    openRegistration
      ? '  .register(StandardConfiguration, runtimeRegistry())'
      : '  .register(StandardConfiguration)',
    '  .app({ host: document.body, component: AppRoot })',
    '  .start();',
  ].join('\n');
}

async function diagnosticCodesForOpenFixture(): Promise<readonly (string | null)[]> {
  const fixture = createAureliaAppFixture({
    'src/main.ts': [
      "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
      "import { RouterConfiguration } from '@aurelia/router';",
      "import { AppRoot } from './app';",
      'declare function runtimeRegistry(): unknown;',
      'void RouterConfiguration;',
      'new Aurelia()',
      '  .register(StandardConfiguration, runtimeRegistry())',
      '  .app({ host: document.body, component: AppRoot })',
      '  .start();',
    ].join('\n'),
    'src/app.ts': [
      "import { customElement } from '@aurelia/runtime-html';",
      "import template from './app.html';",
      "@customElement({ name: 'app-root', template })",
      'export class AppRoot {}',
    ].join('\n'),
    'src/app.html': [
      '<au-viewport default="home"></au-viewport>',
      '<unknown-plugin><template au-slot="item"></template></unknown-plugin>',
    ].join(''),
  }, {
    '@aurelia/router': '^2.0.0-rc.2',
    '@aurelia/runtime-html': '^2.0.0-rc.2',
  });
  return diagnosticCodesForWorkspace(fixture, 'src/app.html', true);
}

async function diagnosticCodesForWorkspace(
  fixture: string,
  relativeTemplatePath: string,
  removeFixture: boolean,
): Promise<readonly (string | null)[]> {
  const { connection, child, dispose, getStderr } = startServer(fixture);
  try {
    await initialize(connection, child, getStderr, fixture, {
      diagnostics: { onRefresh: () => undefined },
    });
    const uri = fileUri(fixture, relativeTemplatePath);
    openDocument(
      connection,
      uri,
      'html',
      fs.readFileSync(new URL(uri), 'utf8'),
      1,
    );
    const ownership = await connection.sendRequest('aurelia/sourceOwnership', { uri }) as {
      readonly templateOwned?: unknown;
      readonly owners?: readonly unknown[];
    };
    expect(ownership.owners?.length).toBeGreaterThan(0);
    expect(ownership.templateOwned).toBe(true);
    const report = await pullDiagnostics(connection, uri);
    return report.items.map(diagnosticCode);
  } finally {
    dispose();
    child.kill('SIGKILL');
    await waitForExit(child);
    if (removeFixture) fs.rmSync(fixture, { recursive: true, force: true });
  }
}

async function pullDiagnostics(
  connection: ReturnType<typeof startServer>['connection'],
  uri: string,
  previousResultId: string | null = null,
): Promise<DiagnosticReport> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await connection.sendRequest('textDocument/diagnostic', {
        textDocument: { uri },
        identifier: 'aurelia',
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
  if (error == null || typeof error !== 'object') return false;
  const candidate = error as { readonly code?: unknown; readonly data?: { readonly retriggerRequest?: unknown } };
  return candidate.code === -32802 && candidate.data?.retriggerRequest === true;
}

async function waitForRefresh(readCount: () => number, baseline: number): Promise<void> {
  await vi.waitFor(() => {
    expect(readCount()).toBeGreaterThan(baseline);
  }, { timeout: 30_000, interval: 20 });
}

function diagnosticCode(diagnostic: { readonly code?: unknown }): string | null {
  const code = diagnostic.code;
  if (typeof code === 'string' || typeof code === 'number') return String(code);
  if (code != null && typeof code === 'object' && 'value' in code) {
    const value = (code as { readonly value?: unknown }).value;
    return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
  }
  return null;
}
