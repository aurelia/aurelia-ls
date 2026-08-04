import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  normalizeSemanticRuntimeOptions,
  parseSemanticWorkspaceDescriptor,
  semanticRuntimeOptionsForWorkspaceDescriptor,
  semanticRuntimeWorkspaceDescriptorKey,
  semanticWorkspaceDescriptorForRuntimeOptions,
  semanticWorkspaceDescriptorKey,
} from '../src/index.js';

describe('semantic workspace descriptor', () => {
  test('normalizes active discovery boundaries and removes excluded or duplicate hints', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      excludedWorkspaceRoots: ['packages/disabled', 'packages/disabled/nested'],
      projectRootHints: [
        '.',
        'packages/app',
        path.join(workspaceRoot, 'packages/app'),
        'packages/disabled',
      ],
    });

    expect(descriptor).toEqual({
      schemaVersion: 'semantic-workspace/1',
      workspaceRoot: path.normalize(workspaceRoot),
      excludedWorkspaceRoots: [path.join(workspaceRoot, 'packages/disabled')],
      projectTopology: {
        kind: 'discover',
        strategy: 'project-markers',
        projectRootHints: [
          path.normalize(workspaceRoot),
          path.join(workspaceRoot, 'packages/app'),
        ].sort((left, right) => left.localeCompare(right)),
      },
    });
  });

  test('normalizes inactive discovery hints away and rejects the retired false discovery name', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const singleRoot = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projectDiscovery: 'single-root',
      projectRootHints: ['packages/app'],
    });
    expect(singleRoot.projectTopology).toEqual({
      kind: 'discover',
      strategy: 'single-root',
      projectRootHints: [],
    });

    expect(() => semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projectDiscovery: 'package-tsconfig' as never,
    })).toThrow("Unknown boot project discovery mode 'package-tsconfig'.");
  });

  test('serializes explicit project source-world inputs without leaking inactive discovery controls', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const normalized = normalizeSemanticRuntimeOptions({
      workspaceRoot,
      projectDiscovery: 'single-root',
      projectRootHints: ['ignored'],
      projects: [{
        rootDir: 'packages/app',
        projectKey: 'app',
        excludedSourceRoots: ['generated'],
        sourceDiscoveryOptions: {
          extensions: new Set(['.ts', '.html']),
          excludedDirectories: new Set(['dist', 'generated']),
          maxFiles: 50,
        },
      }],
    });

    expect(normalized.projectDiscovery).toBeUndefined();
    expect(normalized.projectRootHints).toBeUndefined();
    expect(normalized.projects).toEqual([expect.objectContaining({
      rootDir: path.join(workspaceRoot, 'packages/app'),
      projectKey: 'app',
      excludedSourceRoots: [path.join(workspaceRoot, 'packages/app/generated')],
      sourceDiscoveryOptions: {
        extensions: new Set(['.html', '.ts']),
        excludedDirectories: new Set(['dist', 'generated']),
        maxFiles: 50,
      },
    })]);
  });

  test('uses one explicit source mode and normalizes supplied candidates to the effective structural boundary', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const projectRoot = path.join(workspaceRoot, 'packages/app');
    const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      excludedWorkspaceRoots: ['packages/app/workspace-disabled'],
      projects: [{
        rootDir: projectRoot,
        excludedSourceRoots: ['generated'],
        sourceFiles: [
          { path: 'src/main.ts' },
          { path: path.join(projectRoot, 'src/view.html'), note: 'host supplied' },
          { path: 'generated/output.ts' },
          { path: 'workspace-disabled/output.ts' },
          { path: '../outside.ts' },
        ],
        sourceDiscoveryOptions: {
          extensions: new Set(['.ignored']),
          maxFiles: 1,
        },
      }],
    });

    expect(descriptor.projectTopology.kind).toBe('explicit');
    if (descriptor.projectTopology.kind !== 'explicit') throw new Error('Expected explicit topology.');
    expect(descriptor.projectTopology.projects).toEqual([{
      rootDir: projectRoot,
      projectKey: 'app',
      sourceInput: {
        kind: 'supplied',
        files: [
          { path: path.join(projectRoot, 'src/main.ts'), language: null, role: null, note: null },
          { path: path.join(projectRoot, 'src/view.html'), language: null, role: null, note: 'host supplied' },
        ],
      },
      excludedSourceRoots: [
        path.join(projectRoot, 'generated'),
        path.join(projectRoot, 'workspace-disabled'),
      ].sort((left, right) => left.localeCompare(right)),
    }]);

    const roundTripped = semanticWorkspaceDescriptorForRuntimeOptions(
      semanticRuntimeOptionsForWorkspaceDescriptor(descriptor),
    );
    expect(roundTripped).toEqual(descriptor);
  });

  test('gives semantically equivalent explicit inputs one descriptor identity', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const projectRoot = path.join(workspaceRoot, 'packages/app');
    const implicit = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projects: [{
        rootDir: 'packages/app',
        sourceFiles: [{ path: 'src/main.ts' }, { path: 'generated/output.ts' }],
        sourceDiscoveryOptions: { maxFiles: 1 },
        excludedSourceRoots: ['generated'],
      }],
    });
    const explicit = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projects: [{
        rootDir: projectRoot,
        projectKey: 'app',
        sourceFiles: [{ path: path.join(projectRoot, 'src/main.ts') }],
        excludedSourceRoots: [path.join(projectRoot, 'generated')],
      }],
    });

    expect(explicit).toEqual(implicit);
    expect(semanticWorkspaceDescriptorKey(explicit)).toBe(semanticWorkspaceDescriptorKey(implicit));
  });

  test('distinguishes supplied empty sources from filesystem discovery', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const discovered = semanticRuntimeWorkspaceDescriptorKey({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const suppliedEmpty = semanticRuntimeWorkspaceDescriptorKey({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot, sourceFiles: [] }],
    });

    expect(suppliedEmpty).not.toBe(discovered);
  });

  test('parses the exact normalized transport and rejects unknown versions or non-normalized inputs', () => {
    const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot: path.resolve('workspace-descriptor-fixture'),
      projectRootHints: ['packages/app'],
      excludedWorkspaceRoots: ['packages/disabled'],
    });

    expect(parseSemanticWorkspaceDescriptor(JSON.parse(JSON.stringify(descriptor)))).toEqual(descriptor);
    expect(parseSemanticWorkspaceDescriptor({
      projectTopology: descriptor.projectTopology,
      excludedWorkspaceRoots: descriptor.excludedWorkspaceRoots,
      workspaceRoot: descriptor.workspaceRoot,
      schemaVersion: descriptor.schemaVersion,
    })).toEqual(descriptor);
    expect(() => parseSemanticWorkspaceDescriptor({
      ...descriptor,
      schemaVersion: 'semantic-workspace/999',
    })).toThrow("Unsupported semantic workspace descriptor schema 'semantic-workspace/999'");
    expect(() => semanticRuntimeOptionsForWorkspaceDescriptor({
      ...descriptor,
      extraPolicy: true,
    } as never)).toThrow("unknown property 'extraPolicy'");
    expect(() => semanticWorkspaceDescriptorKey({
      ...descriptor,
      workspaceRoot: '.',
    })).toThrow('must use normalized absolute paths');
  });

  test('rejects non-serializable source-discovery limits before producing a descriptor', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    expect(() => semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot, sourceDiscoveryOptions: { maxFiles: Number.NaN } }],
    })).toThrow('Source discovery maxFiles must be a non-negative safe integer or null');
    expect(() => semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot, sourceDiscoveryOptions: { maxFiles: -1 } }],
    })).toThrow('Source discovery maxFiles must be a non-negative safe integer or null');
    expect(() => semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projects: [{
        rootDir: workspaceRoot,
        sourceFiles: [{ path: 'src/main.ts', role: 'consumer-invented-role' as never }],
      }],
    })).toThrow('must be null or one of');
  });

  test('rejects undefined in required nullable transport fields', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const descriptor = semanticWorkspaceDescriptorForRuntimeOptions({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot, sourceFiles: [{ path: 'src/main.ts' }] }],
    });
    if (descriptor.projectTopology.kind !== 'explicit') throw new Error('Expected explicit topology.');
    const project = descriptor.projectTopology.projects[0]!;
    if (project.sourceInput.kind !== 'supplied') throw new Error('Expected supplied sources.');
    const invalid = {
      ...descriptor,
      projectTopology: {
        ...descriptor.projectTopology,
        projects: [{
          ...project,
          sourceInput: {
            ...project.sourceInput,
            files: [{ ...project.sourceInput.files[0], note: undefined }],
          },
        }],
      },
    };

    expect(() => parseSemanticWorkspaceDescriptor(invalid)).toThrow('.note must be a string');
  });

  test('keys complete semantic boundaries but excludes runtime-only store namespaces', () => {
    const workspaceRoot = path.resolve('workspace-descriptor-fixture');
    const base = semanticRuntimeWorkspaceDescriptorKey({
      workspaceRoot,
      projectRootHints: ['packages/app', 'packages/lib'],
      excludedWorkspaceRoots: ['packages/disabled'],
      storeKey: 'one',
    });
    const equivalent = semanticRuntimeWorkspaceDescriptorKey({
      workspaceRoot: path.join(workspaceRoot, '.'),
      projectRootHints: ['packages/lib', path.join(workspaceRoot, 'packages/app')],
      excludedWorkspaceRoots: [path.join(workspaceRoot, 'packages/disabled')],
      storeKey: 'two',
    });
    const differentHint = semanticRuntimeWorkspaceDescriptorKey({
      workspaceRoot,
      projectRootHints: ['packages/other'],
      excludedWorkspaceRoots: ['packages/disabled'],
    });
    const differentExclusion = semanticRuntimeWorkspaceDescriptorKey({
      workspaceRoot,
      projectRootHints: ['packages/app', 'packages/lib'],
      excludedWorkspaceRoots: ['packages/other-disabled'],
    });

    expect(equivalent).toBe(base);
    expect(differentHint).not.toBe(base);
    expect(differentExclusion).not.toBe(base);
  });
});
