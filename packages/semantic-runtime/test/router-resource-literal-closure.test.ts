import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticTemplateCursorInfoResult,
} from '../src/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureFixtureRoot = path.join(packageRoot, 'fixtures/pressure');
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('router resource literal closure', () => {
  test('keeps authored string syntax closed when broad resource pressure leaves the rendered binding open', async () => {
    const workspaceRoot = await createBroadRoutedWorkspace();
    const htmlPath = path.join(workspaceRoot, 'src/app.html');
    const appPath = path.join(workspaceRoot, 'src/app.ts');
    const htmlBaseline = await readFile(htmlPath, 'utf8');
    const appBaseline = await readFile(appPath, 'utf8');
    const routeLines = [
      "      <a load=\"route.bind: 'item-detail'; params.bind: { itemId: 'item-1' }\">Literal route</a>",
      '      <a load="route.bind: `item-detail`; params.bind: { itemId: \'item-1\' }">Template route</a>',
      '      <a load="route.bind: `items/${state.selectedItemNames[0]}`">Pattern route</a>',
      '      <a load="route.bind: dynamicRoute">Dynamic route</a>',
    ];
    const htmlText = htmlBaseline.replace('    </nav>', `${routeLines.join('\n')}\n    </nav>`);
    const appText = appBaseline.replace(
      "  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');",
      "  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');\n  dynamicRoute!: string;",
    );
    await writeFile(htmlPath, htmlText, 'utf8');
    await writeFile(appPath, appText, 'utf8');

    const hostAlphaSources = await sourceFilesUnder(workspaceRoot, [
      'src',
      'host-corpus/local-templates/src',
      'host-corpus/overlap/src',
      'host-corpus/duplicates/src',
      'host-corpus/effective-definitions/src',
    ]);
    const hostBetaSources = await sourceFilesUnder(workspaceRoot, ['host-corpus/overlap/src']);
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'router-resource-literal-closure',
      projects: [
        { rootDir: workspaceRoot, projectKey: 'host-alpha', sourceFiles: hostAlphaSources },
        { rootDir: workspaceRoot, projectKey: 'host-beta', sourceFiles: hostBetaSources },
      ],
    });
    const app = await runtime.openApp({ projectKey: 'host-alpha', analysisDepth: 'binding-observation' });
    const cursorInfo = (marker: string, needle: string): SemanticTemplateCursorInfoResult => app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(htmlText, marker, needle),
    }).value as SemanticTemplateCursorInfoResult;

    for (const closed of [
      cursorInfo("route.bind: 'item-detail'", 'item-detail'),
      cursorInfo('route.bind: `item-detail`', 'item-detail'),
    ]) {
      expect(closed.selectedRouteTarget).toMatchObject({
        targetKind: 'route-id',
        matchedName: 'item-detail',
        routeConfigId: 'item-detail',
      });
      expect(closed.missingInputs).toEqual([]);
      expect(closed.uncertainty).toBeNull();
    }

    for (const dynamic of [
      cursorInfo('route.bind: `items/${state.selectedItemNames[0]}`', 'items'),
      cursorInfo('route.bind: dynamicRoute', 'dynamicRoute'),
    ]) {
      expect(dynamic.selectedRouteTarget).toBeNull();
      expect(dynamic.missingInputs).toContain('router-navigation-target-open');
      expect(dynamic.uncertainty).toEqual({
        category: 'dynamic-route-target',
        affectedDomain: 'route',
        affectedLocus: 'route-target',
      });
    }
  }, 120_000);
});

async function createBroadRoutedWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'router-resource-literal-closure-'));
  temporaryRoots.push(workspaceRoot);
  await cp(
    path.join(pressureFixtureRoot, 'app-pattern-routed-catalog-storefront'),
    workspaceRoot,
    { recursive: true },
  );
  for (const [fixtureName, destinationName] of [
    ['resource-registration-local-templates', 'local-templates'],
    ['plugin-capability-app-root-isolation', 'overlap'],
    ['resource-registration-duplicates', 'duplicates'],
    ['resource-registration-effective-definitions', 'effective-definitions'],
  ] as const) {
    await cp(
      path.join(pressureFixtureRoot, fixtureName),
      path.join(workspaceRoot, 'host-corpus', destinationName),
      { recursive: true },
    );
  }
  return workspaceRoot;
}

async function sourceFilesUnder(
  workspaceRoot: string,
  relativeRoots: readonly string[],
): Promise<{ readonly path: string }[]> {
  const sourceFiles: { readonly path: string }[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (/\.(?:css|html|ts)$/u.test(entry.name)) {
        sourceFiles.push({ path: path.relative(workspaceRoot, entryPath) });
      }
    }
  };
  for (const relativeRoot of relativeRoots) {
    await visit(path.join(workspaceRoot, relativeRoot));
  }
  return sourceFiles.sort((left, right) => left.path.localeCompare(right.path));
}

function cursorAtMarker(
  sourceText: string,
  marker: string,
  needle: string,
): { readonly filePath: string; readonly line: number; readonly character: number; readonly offset: number } {
  const markerOffset = sourceText.indexOf(marker);
  if (markerOffset < 0) {
    throw new Error(`Expected marker ${marker}.`);
  }
  const needleOffset = sourceText.indexOf(needle, markerOffset);
  if (needleOffset < 0 || needleOffset >= markerOffset + marker.length) {
    throw new Error(`Expected ${needle} inside marker ${marker}.`);
  }
  const offset = needleOffset + Math.min(1, needle.length - 1);
  const lines = sourceText.slice(0, offset).split(/\r?\n/u);
  return {
    filePath: 'src/app.html',
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset,
  };
}
