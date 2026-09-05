import path from 'node:path';

import type { AotFrameworkLinksOptions } from '@aurelia-ls/aot-vite';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  aotOptions: [] as Array<Record<string, unknown>>,
  buildConfigs: [] as Array<Record<string, unknown>>,
  renderedFrameworkModule: '',
}));

vi.mock('@aurelia-ls/aot', () => ({
  SemanticAotArtifactProvider: class SemanticAotArtifactProvider {
    public evidence(): Record<string, never> {
      return {};
    }
  },
}));

vi.mock('@aurelia-ls/aot-vite', () => ({
  aureliaAot(options: Record<string, unknown>) {
    harness.aotOptions.push(options);
    const links = options.frameworkLinks as AotFrameworkLinksOptions | undefined;
    const receipt = options.receipt as { onReceipt(value: unknown): void };
    receipt.onReceipt({
      version: 1,
      environmentName: 'client',
      artifacts: [],
      graph: [],
      chunks: [],
      ...(links === undefined
        ? {}
        : {
            frameworkLinks: links.policy === 'require-applied'
              ? {
                  protocol: links.protocol,
                  graphFingerprint: links.graphFingerprint,
                  mapPosture: links.mapPosture,
                  policy: links.policy,
                  disposition: 'applied',
                  recipeFingerprint: '9'.repeat(64),
                  reason: null,
                  modules: [],
                }
              : {
                  protocol: links.protocol,
                  graphFingerprint: links.graphFingerprint,
                  mapPosture: links.mapPosture,
                  policy: links.policy,
                  disposition: 'c0-fallback',
                  recipeFingerprint: null,
                  reason: { kind: 'unsupported-input', summary: 'fixture refusal' },
                  modules: [],
                },
          }),
    });
    return [];
  },
}));

vi.mock('@aurelia/vite-plugin', () => ({ default: () => [] }));

vi.mock('vite', () => ({
  build(config: Record<string, unknown>) {
    harness.buildConfigs.push(config);
    return {
      output: [{
        type: 'chunk',
        fileName: 'app.js',
        isEntry: true,
        imports: [],
        dynamicImports: [],
        modules: {
          [harness.renderedFrameworkModule]: { renderedLength: 1, renderedExports: [] },
        },
      }],
    };
  },
}));

import { buildBenchmarkLane } from '../src/build.js';
import type { PreparedFrameworkPackageGraph } from '../src/framework-graph.js';

describe('benchmark lane build identity', () => {
  beforeEach(() => {
    harness.aotOptions.length = 0;
    harness.buildConfigs.length = 0;
  });

  test('preserves the C0 output contract when no framework-link profile or label is supplied', async () => {
    const fixture = buildFixture();
    const lane = await buildBenchmarkLane({
      application: fixture.application,
      mode: 'aot',
      outputRoot: fixture.outputRoot,
      framework: fixture.framework,
    });

    expect(lane.outputLabel).toBeNull();
    expect(lane.outDir).toBe(path.join(fixture.outputRoot, fixture.application.id, 'aot'));
    expect(Object.hasOwn(harness.aotOptions[0]!, 'frameworkLinks')).toBe(false);
    expect(viteOutDir(harness.buildConfigs[0]!)).toBe(lane.outDir);
  });

  test('keeps experimental transforms explicit and after ordinary build plugins', async () => {
    const fixture = buildFixture();
    const plugin = { name: 'binding-experiment' };
    const request = {
      application: fixture.application, mode: 'aot' as const,
      outputRoot: fixture.outputRoot, framework: fixture.framework, plugins: [plugin],
    };
    await expect(buildBenchmarkLane(request)).rejects.toThrow(/explicit output label/u);
    await buildBenchmarkLane({ ...request, outputLabel: 'binding-candidate' });
    expect((harness.buildConfigs[0]!.plugins as unknown[]).at(-1)).toBe(plugin);
  });

  test('plumbs applied and fallback profiles into isolated labeled sibling outputs and receipts', async () => {
    const fixture = buildFixture();
    const appliedProfile = frameworkLinks('require-applied');
    const fallbackProfile = frameworkLinks('allow-c0-fallback');
    const applied = await buildBenchmarkLane({
      application: fixture.application,
      mode: 'aot',
      outputRoot: fixture.outputRoot,
      framework: fixture.framework,
      frameworkLinks: appliedProfile,
      outputLabel: 'abi-applied',
    });
    const fallback = await buildBenchmarkLane({
      application: fixture.application,
      mode: 'aot',
      outputRoot: fixture.outputRoot,
      framework: fixture.framework,
      frameworkLinks: fallbackProfile,
      outputLabel: 'abi-fallback',
    });

    expect(harness.aotOptions[0]?.frameworkLinks).toBe(appliedProfile);
    expect(harness.aotOptions[1]?.frameworkLinks).toBe(fallbackProfile);
    expect(applied).toMatchObject({
      outputLabel: 'abi-applied',
      outDir: path.join(fixture.outputRoot, fixture.application.id, 'aot-abi-applied'),
      aotReceipt: { frameworkLinks: { disposition: 'applied' } },
    });
    expect(fallback).toMatchObject({
      outputLabel: 'abi-fallback',
      outDir: path.join(fixture.outputRoot, fixture.application.id, 'aot-abi-fallback'),
      aotReceipt: { frameworkLinks: { disposition: 'c0-fallback' } },
    });
    expect(new Set([applied.outDir, fallback.outDir])).toHaveLength(2);
  });

  test('refuses unsafe output labels and framework links on a JIT lane before building', async () => {
    const fixture = buildFixture();
    await expect(buildBenchmarkLane({
      application: fixture.application,
      mode: 'aot',
      outputRoot: fixture.outputRoot,
      framework: fixture.framework,
      outputLabel: '../escape',
    })).rejects.toThrow(/filesystem-safe segment/u);
    await expect(buildBenchmarkLane({
      application: fixture.application,
      mode: 'aot',
      outputRoot: fixture.outputRoot,
      framework: fixture.framework,
      frameworkLinks: frameworkLinks('require-applied'),
    })).rejects.toThrow(/requires an explicit output label/u);
    await expect(buildBenchmarkLane({
      application: fixture.application,
      mode: 'jit',
      outputRoot: fixture.outputRoot,
      framework: fixture.framework,
      frameworkLinks: frameworkLinks('require-applied'),
    })).rejects.toThrow(/only for an AOT benchmark lane/u);
    expect(harness.buildConfigs).toEqual([]);
  });
});

function buildFixture(): {
  readonly application: {
    readonly id: string;
    readonly root: string;
    readonly sourceRoot: string;
    readonly input: { readonly kind: 'library-single'; readonly entry: string };
  };
  readonly outputRoot: string;
  readonly framework: PreparedFrameworkPackageGraph;
} {
  const root = path.join(path.parse(process.cwd()).root, 'aot-benchmark-build-test');
  const installRoot = path.join(root, 'framework', 'install');
  harness.renderedFrameworkModule = path.join(
    installRoot,
    'node_modules',
    '@aurelia',
    'runtime-html',
    'dist',
    'esm',
    'index.mjs',
  );
  return {
    application: {
      id: 'fixture-app',
      root: path.join(root, 'app'),
      sourceRoot: path.join(root, 'app', 'src'),
      input: { kind: 'library-single', entry: path.join(root, 'app', 'src', 'main.ts') },
    },
    outputRoot: path.join(root, 'outputs'),
    framework: {
      root: path.join(root, 'framework'),
      installRoot,
      provenance: {} as PreparedFrameworkPackageGraph['provenance'],
      entryFor() { return harness.renderedFrameworkModule; },
      async dispose() {},
    },
  };
}

function frameworkLinks(policy: AotFrameworkLinksOptions['policy']): AotFrameworkLinksOptions {
  return {
    protocol: 1,
    graphFingerprint: '1'.repeat(64),
    mapPosture: 'performance-no-map',
    policy,
    modules: [],
  };
}

function viteOutDir(config: Record<string, unknown>): unknown {
  return (config.build as { outDir?: unknown }).outDir;
}
