import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from './test-harness.js';

import {
  resolveExportRoute,
} from '../src/export-trace-runtime-surface.js';
import { createRepoSession } from '../src/repo-session.js';
import { buildStructuralClaimGraph } from '../src/structural-claim-graph.js';
import { scanParsedTsconfigSourceFiles } from '../src/tsconfig-source-files.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Export trace runtime surface', () => {
  it('resolves named and star reexport chains through the live structural runtime', () => {
    const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-export-trace-'));
    tempDirs.push(repoPath);

    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(
      join(repoPath, 'package.json'),
      JSON.stringify(
        {
          name: '@fixture/export-trace-runtime',
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
      join(repoPath, 'src', 'internal.ts'),
      'export interface Example { value: string; }\n',
    );
    writeFileSync(
      join(repoPath, 'src', 'barrel.ts'),
      "export * from './internal.js';\n",
    );
    writeFileSync(
      join(repoPath, 'src', 'index.ts'),
      "export { Example as RuntimeExample } from './barrel.js';\n",
    );

    const session = createRepoSession({ repoPath });
    const sourceFileScan = scanParsedTsconfigSourceFiles(session);
    const structuralRuntime = buildStructuralClaimGraph(session, { sourceFileScan });
    const route = resolveExportRoute({
      repoPath,
      repoSession: session,
      structuralRuntime,
      analysisEntrypoint: 'src/index.ts',
      exportedName: 'RuntimeExample',
    });

    expect(route?.source).toBe('semantic-runtime');
    expect(route?.declarationFile).toBe('src/internal.ts');
    expect(route?.declarationName).toBe('Example');
    expect(route?.chain.map((step) => step.kind)).toEqual([
      'named-reexport',
      'star-reexport',
      'local-declaration',
    ]);
  });
});
