import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import * as aureliaPluginModule from '@aurelia/vite-plugin';
import { build, type Plugin, type PluginOption } from 'vite';

import type {
  AotAssuranceAdapter,
  AotAssuranceAdapterModule,
  AotBuildEvidence,
  EmissionFalsifier,
  LaneBuildReceipt,
  RenderedModuleEvidence,
} from './contract.js';

interface OutputModule {
  readonly renderedLength: number;
  readonly renderedExports: readonly string[];
}

interface OutputChunk {
  readonly type: 'chunk';
  readonly fileName: string;
  readonly modules: Readonly<Record<string, OutputModule>>;
}

interface BuildOutput {
  readonly output: readonly ({ readonly type: string } | OutputChunk)[];
}

type CreateAureliaPlugin = (options: {
  include: string;
  transformStandardDecorators: boolean;
}) => PluginOption;

const createAureliaPlugin = (
  typeof (aureliaPluginModule as { default?: unknown }).default === 'function'
    ? (aureliaPluginModule as { default: unknown }).default
    : aureliaPluginModule
) as CreateAureliaPlugin;

export interface BuildBatchOptions {
  readonly adapterSpecifier: string;
  readonly fixtureRoot: string;
  readonly keepOutput: boolean;
  readonly falsifier?: EmissionFalsifier;
}

export class ProductionBuildBatch {
  public readonly root: string;
  public readonly jitOutDir: string;
  public readonly aotOutDir: string;
  public readonly jitReceipt: LaneBuildReceipt;
  public readonly aotReceipt: LaneBuildReceipt;
  public readonly aotEvidence: AotBuildEvidence;

  private constructor(
    root: string,
    jitReceipt: LaneBuildReceipt,
    aotReceipt: LaneBuildReceipt,
    aotEvidence: AotBuildEvidence,
    private readonly adapter: AotAssuranceAdapter,
    private readonly keepOutput: boolean,
  ) {
    this.root = root;
    this.jitOutDir = resolve(root, 'jit');
    this.aotOutDir = resolve(root, 'aot');
    this.jitReceipt = jitReceipt;
    this.aotReceipt = aotReceipt;
    this.aotEvidence = aotEvidence;
  }

  public static async create(options: BuildBatchOptions): Promise<ProductionBuildBatch> {
    const root = await mkdtemp(resolve(tmpdir(), 'aurelia-aot-assurance-'));
    const jitOutDir = resolve(root, 'jit');
    const aotOutDir = resolve(root, 'aot');
    const adapter = await loadAdapter(options.adapterSpecifier, {
      fixtureRoot: options.fixtureRoot,
      sourceRoot: resolve(options.fixtureRoot, 'src'),
      entryHtml: resolve(options.fixtureRoot, 'index.html'),
      strict: true,
      falsifier: options.falsifier,
    });

    try {
      const jitReceipt = await buildLane(
        'jit',
        options.fixtureRoot,
        jitOutDir,
        createAureliaPlugin({
          // Vite 8 presents absolute normalized ids to the hook on Windows;
          // the framework plugin's relative default does not match them.
          include: '**/src/**/*.{ts,js,html}',
          transformStandardDecorators: true,
        }),
      );
      const aotReceipt = await buildLane('aot', options.fixtureRoot, aotOutDir, adapter.plugins);
      const aotEvidence = await adapter.readEvidence(aotReceipt.moduleGraph);
      return new ProductionBuildBatch(
        root,
        jitReceipt,
        aotReceipt,
        aotEvidence,
        adapter,
        options.keepOutput,
      );
    } catch (error) {
      await adapter.dispose?.();
      if (!options.keepOutput) await rm(root, { recursive: true, force: true });
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.adapter.dispose?.();
    if (!this.keepOutput) await rm(this.root, { recursive: true, force: true });
  }
}

async function loadAdapter(
  specifier: string,
  request: Parameters<AotAssuranceAdapterModule['createAotAssuranceAdapter']>[0],
): Promise<AotAssuranceAdapter> {
  const importSpecifier = isAbsolute(specifier) || specifier.startsWith('.')
    ? pathToFileURL(resolve(specifier)).href
    : specifier;
  const candidate = await import(importSpecifier) as Partial<AotAssuranceAdapterModule>;
  if (typeof candidate.createAotAssuranceAdapter !== 'function') {
    throw new Error(`${specifier} does not export createAotAssuranceAdapter(request)`);
  }
  return candidate.createAotAssuranceAdapter(request);
}

async function buildLane(
  lane: 'jit' | 'aot',
  fixtureRoot: string,
  outDir: string,
  plugins: PluginOption,
): Promise<LaneBuildReceipt> {
  const started = performance.now();
  const output = await build({
    root: fixtureRoot,
    configFile: false,
    mode: 'production',
    logLevel: 'warn',
    plugins: [laneDefinitionPlugin(lane), plugins],
    define: {
      __AOT_ASSURANCE_LANE__: JSON.stringify(lane),
    },
    build: {
      outDir,
      emptyOutDir: true,
      copyPublicDir: false,
      sourcemap: true,
      minify: false,
      rolldownOptions: {
        input: resolve(fixtureRoot, 'index.html'),
      },
    },
  });
  return {
    lane,
    durationMs: performance.now() - started,
    moduleGraph: readModuleGraph(output),
  };
}

function laneDefinitionPlugin(lane: 'jit' | 'aot'): Plugin {
  let buildStarts = 0;
  return {
    name: `aot-assurance:${lane}`,
    apply: 'build',
    buildStart() {
      buildStarts++;
      if (buildStarts !== 1) {
        this.error(`the ${lane} lane started more than one production build`);
      }
    },
  };
}

function readModuleGraph(output: unknown): readonly RenderedModuleEvidence[] {
  const builds = Array.isArray(output) ? output : [output];
  const modules: RenderedModuleEvidence[] = [];
  for (const candidate of builds) {
    if (!isBuildOutput(candidate)) {
      throw new Error('Vite returned a watcher or an unrecognized production build result');
    }
    for (const item of candidate.output) {
      if (!isOutputChunk(item)) continue;
      for (const [moduleId, detail] of Object.entries(item.modules)) {
        modules.push({
          chunkFile: item.fileName,
          moduleId,
          renderedLength: detail.renderedLength,
          renderedExports: detail.renderedExports,
        });
      }
    }
  }
  modules.sort((left, right) => left.moduleId.localeCompare(right.moduleId)
    || left.chunkFile.localeCompare(right.chunkFile));
  return modules;
}

function isBuildOutput(value: unknown): value is BuildOutput {
  return typeof value === 'object' && value !== null && Array.isArray((value as { output?: unknown }).output);
}

function isOutputChunk(value: { readonly type: string }): value is OutputChunk {
  return value.type === 'chunk'
    && 'modules' in value
    && typeof value.modules === 'object'
    && value.modules !== null;
}
