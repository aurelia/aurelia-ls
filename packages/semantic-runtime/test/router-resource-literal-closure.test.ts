import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticRecognizedRoutesResult,
  type SemanticRouterIssuesResult,
  type SemanticRouteTreesResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticViewportInstructionTreesResult,
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

  test('consumes every parent prefix and clamps scalar route instructions at the root', async () => {
    const workspaceRoot = await createRoutedAppShellWorkspace();
    const rootTemplatePath = path.join(workspaceRoot, 'src/app.html');
    const detailTemplatePath = path.join(workspaceRoot, 'src/routes/detail-route.html');
    const rootTemplate = `<main>
  <nav>
    <a load="./home">Current root</a>
    <a load="../home">Parent from root</a>
    <a load="../../../home">Excess parent from root</a>
  </nav>
  <au-viewport name="main"></au-viewport>
</main>
`;
    const detailTemplate = `<section>
  <a load="/home">Root from nested</a>
  <a load="../home">Parent from nested</a>
  <a load="../../home">Repeated parent from nested</a>
  <a load="../../../../home">Excess parent from nested</a>
</section>
`;
    await writeFile(rootTemplatePath, rootTemplate, 'utf8');
    await writeFile(detailTemplatePath, detailTemplate, 'utf8');

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'router-parent-prefix-closure',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const instructionTrees = app.ask({
      kind: SemanticAppQueryKind.ViewportInstructionTrees,
      detail: 'handles',
      page: { size: 100 },
    }).value as SemanticViewportInstructionTreesResult;
    const recognizedRoutes = app.ask({
      kind: SemanticAppQueryKind.RecognizedRoutes,
      detail: 'handles',
      page: { size: 100 },
    }).value as SemanticRecognizedRoutesResult;
    const routeTrees = app.ask({
      kind: SemanticAppQueryKind.RouteTrees,
      detail: 'handles',
      page: { size: 100 },
    }).value as SemanticRouteTreesResult;
    const routerIssues = app.ask({
      kind: SemanticAppQueryKind.RouterIssues,
      detail: 'handles',
      page: { size: 100 },
    }).value as SemanticRouterIssuesResult;

    const cases = [
      { filePath: 'src/app.html', sourceText: rootTemplate, literal: './home' },
      { filePath: 'src/app.html', sourceText: rootTemplate, literal: '../home' },
      { filePath: 'src/app.html', sourceText: rootTemplate, literal: '../../../home' },
      { filePath: 'src/routes/detail-route.html', sourceText: detailTemplate, literal: '/home' },
      { filePath: 'src/routes/detail-route.html', sourceText: detailTemplate, literal: '../home' },
      { filePath: 'src/routes/detail-route.html', sourceText: detailTemplate, literal: '../../home' },
      { filePath: 'src/routes/detail-route.html', sourceText: detailTemplate, literal: '../../../../home' },
    ] as const;

    for (const candidate of cases) {
      const offset = candidate.sourceText.indexOf(candidate.literal) + candidate.literal.lastIndexOf('home') + 1;
      const ownsOffset = (source: { readonly path?: string; readonly start?: number; readonly end?: number } | null) =>
        source?.path === candidate.filePath
        && source.start != null
        && source.end != null
        && source.start <= offset
        && offset < source.end;
      const instructionTree = instructionTrees.rows.find((row) => ownsOffset(row.source));
      const recognizedRoute = recognizedRoutes.rows.find((row) => ownsOffset(row.source));
      const routeTree = routeTrees.rows.find((row) => ownsOffset(row.source));
      const cursor = app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        detail: 'handles',
        cursor: cursorAtMarker(
          candidate.sourceText,
          candidate.literal,
          'home',
          candidate.filePath,
        ),
      }).value as SemanticTemplateCursorInfoResult;

      expect(instructionTree, candidate.literal).toMatchObject({
        closure: 'closed',
        routeContext: { label: 'app-root' },
        instructionCount: 1,
      });
      expect(recognizedRoute, candidate.literal).toMatchObject({
        path: 'home',
        residue: null,
        routeContext: { label: 'app-root' },
        endpoint: { path: 'home' },
      });
      expect(routeTree, candidate.literal).toMatchObject({
        realizationStage: 'planned',
      });
      expect(recognizedRoute?.handles?.viewportInstructionTreeProductHandle, candidate.literal)
        .toBe(instructionTree?.handles?.productHandle);
      expect(routeTree?.handles?.instructionTreeProductHandle, candidate.literal)
        .toBe(instructionTree?.handles?.productHandle);
      expect(cursor.selectedRouteTarget, candidate.literal).toMatchObject({
        targetKind: 'route-path',
        matchedName: 'home',
        routeConfigId: 'home',
      });
      expect(cursor.missingInputs, candidate.literal).toEqual([]);
      expect(cursor.uncertainty, candidate.literal).toBeNull();
      expect(routerIssues.rows.some((row) => ownsOffset(row.source)), candidate.literal).toBe(false);
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

async function createRoutedAppShellWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'router-parent-prefix-closure-'));
  temporaryRoots.push(workspaceRoot);
  await cp(
    path.join(pressureFixtureRoot, 'app-pattern-routed-app-shell'),
    workspaceRoot,
    { recursive: true },
  );
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
  filePath = 'src/app.html',
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
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset,
  };
}
