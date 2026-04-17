import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createRepoSession } from '../out/repo-session.js';
import { generateDepsAnalysis } from '../out/deps/analyze.js';
import { generateExportsAnalysis } from '../out/exports/analyze.js';
import {
  buildStructuralClaimGraph,
  evaluateFilePathStructuralClaims,
} from '../out/public/structural.js';
import { generateTypeRefsAnalysis } from '../out/typerefs/analyze.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Structural claim graph', () => {
  it('produces shared structural claims and lets deps, typerefs, and exports materialize from them', () => {
    const repoPath = createFixtureRepo();
    const session = createRepoSession({ repoPath, target: 'fixture-claims' });

    const runtime = buildStructuralClaimGraph(session);

    expect(runtime.index.repo?.attributes.packageCount).toBe(1);
    expect(runtime.index.tsconfigs).toHaveLength(1);
    expect(runtime.index.tsconfigs[0]?.attributes.sourceFileCount).toBe(4);
    expect(runtime.index.sourceFiles.map((claim) => claim.attributes.filePath)).toEqual([
      'src/broken.ts',
      'src/index.ts',
      'src/types.ts',
      'src/value.ts',
    ]);
    expect(runtime.index.imports).toHaveLength(3);
    expect(runtime.index.importBindings).toHaveLength(1);
    expect(runtime.index.exportObservations).toHaveLength(2);
    expect(runtime.index.declarations.map((claim) => claim.attributes.name)).toEqual([
      'broken',
      'Example',
      'Nested',
      'original',
    ]);

    const exampleDeclaration = runtime.index.declarations.find((claim) => claim.attributes.name === 'Example');
    expect(exampleDeclaration).toBeTruthy();
    expect(runtime.index.membersByDeclarationId.get(exampleDeclaration!.id)?.map((claim) => claim.attributes.name)).toContain('nested');
    expect(runtime.index.typeReferencesByDeclarationId.get(exampleDeclaration!.id)?.map((claim) => claim.attributes.targetName)).toContain('Nested');

    const indexEvaluation = evaluateFilePathStructuralClaims(runtime, 'src/index.ts');
    expect(indexEvaluation.status).toBe('supported');
    expect(indexEvaluation.operationalAnalyzabilityTier).toBe('source-analyzable');

    const brokenEvaluation = evaluateFilePathStructuralClaims(runtime, 'src/broken.ts');
    expect(brokenEvaluation.status).toBe('blocked');
    expect(brokenEvaluation.blockerReasons[0]?.code).toBe('unresolved-relative-imports');

    const missingEvaluation = evaluateFilePathStructuralClaims(runtime, 'src/missing.ts');
    expect(missingEvaluation.status).toBe('unclaimed');
    expect(missingEvaluation.blockerReasons[0]?.code).toBe('file-not-produced');

    const deps = generateDepsAnalysis(session);
    expect(deps.output.summary.files_analyzed).toBe(4);
    expect(deps.output.summary.internal_edges).toBe(2);
    expect(deps.output.summary.unresolved).toBe(1);
    expect(deps.output.tsconfigs).toEqual(['tsconfig.json']);
    expect(deps.output.edges.find((edge) => edge.specifier === './value.js')).toMatchObject({
      source: 'src/index.ts',
      target: 'src/value.ts',
      specifier: './value.js',
      type_only: false,
    });
    expect(deps.output.edges.find((edge) => edge.specifier === './types.js')).toMatchObject({
      source: 'src/index.ts',
      target: 'src/types.ts',
      specifier: './types.js',
      type_only: true,
    });

    const typeRefs = generateTypeRefsAnalysis(session);
    expect(typeRefs.output.summary.files_analyzed).toBe(4);
    expect(typeRefs.output.summary.type_declarations).toBe(2);
    expect(typeRefs.output.summary.type_references).toBe(1);
    expect(typeRefs.output.declarations.find((declaration) => declaration.name === 'Example')?.refs).toEqual([
      {
        target: 'Nested',
        target_file: 'src/types.ts',
        kind: 'field',
        context: 'nested',
      },
    ]);

    const exports = generateExportsAnalysis(session);
    expect(exports.output.summary.packages_analyzed).toBe(1);
    expect(exports.output.summary.exports).toBe(2);
    expect(exports.output.summary.type_only_exports).toBe(1);
    expect(exports.output.summary.value_exports).toBe(1);

    const answerExport = exports.output.exports.find((record) => record.exported_name === 'answer');
    expect(answerExport).toBeTruthy();
    expect(answerExport).toMatchObject({
      original_name: 'original',
      declaration_file: 'src/value.ts',
      declaration_name: 'original',
      type_only: false,
      value_exported: true,
    });
    expect(answerExport?.chain.map((step) => step.kind)).toEqual([
      'local-export',
      'import-alias',
      'local-declaration',
    ]);

    const exampleExport = exports.output.exports.find((record) => record.exported_name === 'Example');
    expect(exampleExport).toBeTruthy();
    expect(exampleExport).toMatchObject({
      original_name: 'Example',
      declaration_file: 'src/types.ts',
      type_only: true,
      type_exported: true,
      value_exported: false,
    });
    expect(exampleExport?.chain.map((step) => step.kind)).toEqual([
      'named-reexport',
      'local-declaration',
    ]);
  });
});

function createFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-claims-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-claims',
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
    [
      'export interface Example {',
      '  value: string;',
      '  nested?: Nested;',
      '}',
      '',
      'export interface Nested {',
      '  count: number;',
      '}',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'value.ts'),
    [
      'export const original = 42;',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    [
      "export type { Example } from './types.js';",
      "import { original as renamed } from './value.js';",
      'export { renamed as answer };',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'broken.ts'),
    [
      "import './missing.js';",
      'export const broken = true;',
      '',
    ].join('\n'),
  );

  return repoPath;
}
