import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createAnalysisViews } from '../src/analysis-views.js';
import { generateDepsAnalysisFromRuntime } from '../src/deps/analyze.js';
import { generateExportsAnalysisFromRuntime } from '../src/exports/analyze.js';
import { inspectFocusedStructuralPath } from '../src/focused-structural-path.js';
import { createRepoSession } from '../src/repo-session.js';
import { buildStructuralClaimGraph } from '../src/structural-claim-graph.js';
import {
  collectStructuralPackageFileSurface,
  getStructuralSourceFileCatalogEntry,
} from '../src/structural-source-file-surface.js';
import { scanParsedTsconfigSourceFiles } from '../src/tsconfig-source-files.js';
import { generateTypeRefsAnalysisFromRuntime } from '../src/typerefs/analyze.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('structural source-file surface', () => {
  it('classifies uncovered repo files as structural blindspots', () => {
    const analysis = createSparseAnalysisViews();

    const admitted = getStructuralSourceFileCatalogEntry(analysis, 'src/index.ts');
    const uncovered = getStructuralSourceFileCatalogEntry(analysis, 'notes/isolated.ts');
    const uncoveredPath = inspectFocusedStructuralPath(analysis, 'notes/isolated.ts');

    expect(admitted?.coverage).toBe('source-backed');
    expect(uncovered?.coverage).toBe('repo-blindspot');
    expect(uncoveredPath?.evaluation.sourceCoverage).toBe('repo-blindspot');
    expect(uncoveredPath?.evaluation.status).toBe('blocked');
    expect(uncoveredPath?.evaluation.blockerReasons[0]?.code).toBe('file-outside-tsconfig');
  });

  it('derives package uncovered files from the structural catalog, not deps carriers', () => {
    const analysis = createSparseAnalysisViews();
    const pkg = analysis.exports.packages[0]!;
    const structuralOnlyAnalysis = {
      ...analysis,
      deps: {
        ...analysis.deps,
        unresolved_imports: [],
        uncovered_files: [],
      },
    };

    const surface = collectStructuralPackageFileSurface(structuralOnlyAnalysis, pkg);

    expect(surface).not.toBeNull();
    expect(surface?.files).toContain('src/index.ts');
    expect(surface?.uncoveredFiles).toContain('notes/isolated.ts');
  });
});

function createSparseAnalysisViews() {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-structural-surface-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  mkdirSync(join(repoPath, 'notes'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-structural-surface',
        type: 'module',
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          noEmit: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    "export { liveValue } from './live.js';\n",
  );
  writeFileSync(
    join(repoPath, 'src', 'live.ts'),
    'export const liveValue = 1;\n',
  );
  writeFileSync(
    join(repoPath, 'notes', 'isolated.ts'),
    'export const isolated = true;\n',
  );

  const session = createRepoSession({ repoPath });
  const sourceFileScan = scanParsedTsconfigSourceFiles(session);
  const structuralRuntime = buildStructuralClaimGraph(session, { sourceFileScan });
  const deps = generateDepsAnalysisFromRuntime(session, structuralRuntime, sourceFileScan).output;
  const typeRefs = generateTypeRefsAnalysisFromRuntime(session, structuralRuntime, sourceFileScan).output;
  const exports = generateExportsAnalysisFromRuntime(session, structuralRuntime).output;

  return createAnalysisViews({
    source: 'hosted-analysis',
    deps,
    typeRefs,
    exports,
    structuralRuntime,
    sourceFileScan,
    repoSourceFiles: session.listRepoSourceFiles(),
  });
}
