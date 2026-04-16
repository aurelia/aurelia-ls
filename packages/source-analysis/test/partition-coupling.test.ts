import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveAnalysisProfile } from '../out/analysis-profile.js';
import {
  collectCrossPartitionTypeRefSummaries,
  collectPartitionBindingPressure,
  collectPartitionBindingSeams,
} from '../out/partition-coupling.js';
import type { DepsOutput } from '../out/deps/schema.js';
import type { TypeRefsOutput } from '../out/typerefs/schema.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('partition coupling', () => {
  it('generalizes subsystem-style coupling through profile-defined partition schemes', () => {
    const repoPath = createPartitionFixtureRepo();
    const profile = resolveAnalysisProfile({ repoPath });
    const deps = createDepsOutput(repoPath);
    const typeRefs = createTypeRefsOutput(repoPath);

    const seams = collectPartitionBindingSeams(deps, 'source-area', 'packages/demo/src/', profile);
    expect(seams.map((seam) => [seam.from.partitionId, seam.to.partitionId])).toEqual([
      ['packages/demo/src/host', 'packages/demo/src/model'],
      ['packages/demo/src/model', 'packages/demo/src/service'],
    ]);

    const typeRefSummaries = collectCrossPartitionTypeRefSummaries(typeRefs, 'source-area', 'packages/demo/src/', profile);
    expect(typeRefSummaries[0]?.from.label).toBe('demo:host');
    expect(typeRefSummaries[0]?.to.partitionId).toBe('packages/demo/src/model');

    const pressure = collectPartitionBindingPressure(deps, 'source-area', 'packages/demo/src/', profile);
    expect(pressure[0]?.partition.partitionId).toBe('packages/demo/src/model');
    expect(pressure[0]?.incomingCounterparts[0]?.partitionId).toBe('packages/demo/src/host');
  });
});

function createPartitionFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-partitions-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'packages', 'demo', 'src', 'host'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'demo', 'src', 'model'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'demo', 'src', 'service'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify({ name: '@fixture/root', type: 'module' }, null, 2),
  );
  writeFileSync(
    join(repoPath, 'packages', 'demo', 'package.json'),
    JSON.stringify({ name: '@fixture/demo', type: 'module' }, null, 2),
  );

  return repoPath;
}

function createDepsOutput(repoPath: string): DepsOutput {
  return {
    root: repoPath.replace(/\\/g, '/'),
    generated_at: new Date(0).toISOString(),
    source_commit: 'fixture',
    analyzer_commit: 'fixture',
    summary: {
      files_analyzed: 3,
      internal_edges: 2,
      external_imports: 0,
      unresolved: 0,
      cycles: 0,
      uncovered_files: 0,
    },
    edges: [
      {
        source: 'packages/demo/src/host/runtime.ts',
        target: 'packages/demo/src/model/types.ts',
        specifier: '../model/types.js',
        line: 1,
        bindings: ['DemoType'],
        type_only: true,
      },
      {
        source: 'packages/demo/src/model/types.ts',
        target: 'packages/demo/src/service/container.ts',
        specifier: '../service/container.js',
        line: 2,
        bindings: ['ServiceHandle'],
        type_only: false,
      },
    ],
    external_imports: [],
    unresolved_imports: [],
    cycles: [],
    uncovered_files: [],
    directory_profiles: [],
    directory_crossings: [],
    orphans: {
      no_inbound: [],
      no_outbound: [],
    },
    coupling_matrices: [],
    tsconfigs: [],
  };
}

function createTypeRefsOutput(repoPath: string): TypeRefsOutput {
  return {
    root: repoPath.replace(/\\/g, '/'),
    generated_at: new Date(0).toISOString(),
    source_commit: 'fixture',
    analyzer_commit: 'fixture',
    summary: {
      files_analyzed: 3,
      type_declarations: 3,
      type_references: 2,
      root_types: 1,
      leaf_types: 1,
    },
    declarations: [
      {
        name: 'HostShape',
        file: 'packages/demo/src/host/runtime.ts',
        kind: 'interface',
        line: 1,
        exported: true,
        refs: [
          {
            target: 'DemoType',
            target_file: 'packages/demo/src/model/types.ts',
            kind: 'field',
          },
        ],
      },
      {
        name: 'DemoType',
        file: 'packages/demo/src/model/types.ts',
        kind: 'interface',
        line: 1,
        exported: true,
        refs: [
          {
            target: 'ServiceHandle',
            target_file: 'packages/demo/src/service/container.ts',
            kind: 'field',
          },
        ],
      },
      {
        name: 'ServiceHandle',
        file: 'packages/demo/src/service/container.ts',
        kind: 'interface',
        line: 1,
        exported: true,
        refs: [],
      },
    ],
  };
}
