import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from './test-harness.js';

import { createLiveQueryKernel } from '../src/live-query/runtime.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('live query kernel', () => {
  it('loads deps, typerefs, exports, and analysis views directly from the current workspace', () => {
    const repoPath = createFixtureRepo();
    const kernel = createLiveQueryKernel({
      repoPath,
      target: 'fixture-live-query',
    });

    const outputs = kernel.loadOutputs();
    expect(outputs.deps.summary.files_analyzed).toBe(2);
    expect(outputs.deps.edges).toHaveLength(1);
    expect(outputs.typeRefs.summary.type_declarations).toBe(1);
    expect(outputs.exports.summary.packages_analyzed).toBe(1);
    expect(outputs.exports.exports.some((record) => record.exported_name === 'answer')).toBe(true);
    expect(outputs.exports.exports.some((record) => record.exported_name === 'Example')).toBe(true);

    const analysis = kernel.loadAnalysisViews();
    expect(analysis.source).toBe('hosted-analysis');
    expect(analysis.root.replace(/\\/g, '/')).toBe(repoPath.replace(/\\/g, '/'));
    expect(analysis.repoSession).toBe(kernel.session);
    expect(analysis.structuralRuntime?.index.packages[0]?.attributes.packageName).toBe('@fixture/live-query-kernel');
  });
});

function createFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-live-query-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/live-query-kernel',
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
    join(repoPath, 'src', 'types.ts'),
    'export interface Example { value: string; }\n',
  );
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    [
      "export type { Example } from './types.js';",
      'export const answer = 42;',
      '',
    ].join('\n'),
  );

  return repoPath;
}
