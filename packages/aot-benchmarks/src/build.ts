import { performance } from 'node:perf_hooks';
import path from 'node:path';

import {
  SemanticAotArtifactProvider,
  type SemanticAotArtifactEvidence,
} from '@aurelia-ls/aot';
import {
  aureliaAot,
  type AotBuildReceipt,
  type AotNominatedEntry,
  type AotRuntimeConfigurationMode,
} from '@aurelia-ls/aot-vite';
import * as aureliaPluginModule from '@aurelia/vite-plugin';
import {
  build,
  type Plugin,
  type PluginOption,
} from 'vite';

import type { PreparedFrameworkPackageGraph } from './framework-graph.js';

export type BenchmarkBuildMode = 'jit' | 'aot';

export type BenchmarkBuildInput =
  | {
      readonly kind: 'library-single';
      readonly entry: string;
    }
  | {
      readonly kind: 'html-app';
      readonly entryHtml: string;
    };

export interface BenchmarkBuildApplication {
  readonly id: string;
  readonly root: string;
  readonly sourceRoot: string;
  readonly input: BenchmarkBuildInput;
  readonly nominatedEntry?: AotNominatedEntry | null;
  readonly runtimeConfiguration?: AotRuntimeConfigurationMode;
  readonly conventionInclude?: string;
}

export interface BenchmarkOutputChunk {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly moduleIds: readonly string[];
}

export interface BenchmarkOutputAsset {
  readonly fileName: string;
}

export interface BenchmarkLaneBuild {
  readonly applicationId: string;
  readonly mode: BenchmarkBuildMode;
  readonly outDir: string;
  readonly durationMs: number;
  readonly chunks: readonly BenchmarkOutputChunk[];
  readonly assets: readonly BenchmarkOutputAsset[];
  readonly entryFiles: readonly string[];
  readonly semanticEvidence: SemanticAotArtifactEvidence | null;
  readonly aotReceipt: AotBuildReceipt | null;
  readonly resolvedFrameworkEntries: Readonly<Record<string, string>>;
}

interface OutputModule {
  readonly renderedLength: number;
  readonly renderedExports: readonly string[];
}

interface OutputChunk {
  readonly type: 'chunk';
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly modules: Readonly<Record<string, OutputModule>>;
}

interface OutputAsset {
  readonly type: 'asset';
  readonly fileName: string;
}

interface BuildOutput {
  readonly output: readonly (OutputChunk | OutputAsset)[];
}

type CreateAureliaPlugin = (options: {
  include: string;
  standardDecoratorInclude: string;
  transformStandardDecorators: boolean;
  useDev: boolean;
  hmr: boolean;
}) => PluginOption;

const createAureliaPlugin = (
  typeof (aureliaPluginModule as { default?: unknown }).default === 'function'
    ? (aureliaPluginModule as { default: unknown }).default
    : aureliaPluginModule
) as CreateAureliaPlugin;

export async function buildBenchmarkLane(request: {
  readonly application: BenchmarkBuildApplication;
  readonly mode: BenchmarkBuildMode;
  readonly outputRoot: string;
  readonly framework: PreparedFrameworkPackageGraph;
}): Promise<BenchmarkLaneBuild> {
  const application = request.application;
  const mode = request.mode;
  const outDir = path.join(request.outputRoot, application.id, mode);
  const frameworkEntries = new Map<string, string>();
  const isolation = frameworkPackageIsolationPlugin(request.framework, frameworkEntries);
  const semanticProvider = mode === 'aot' ? new SemanticAotArtifactProvider() : null;
  let aotReceipt: AotBuildReceipt | null = null;
  const include = application.conventionInclude
    ?? `${toPosixPath(application.sourceRoot)}/**/*.{ts,js,mjs,html}`;
  const aureliaPlugins = mode === 'aot'
    ? aureliaAot({
        provider: semanticProvider!,
        nominatedEntry: application.nominatedEntry,
        runtimeConfiguration: application.runtimeConfiguration ?? 'require-replaceable',
        conventions: {
          include,
          standardDecoratorInclude: include,
          transformStandardDecorators: true,
        },
        receipt: {
          fileName: 'aurelia-aot-receipt.json',
          onReceipt(receipt) {
            aotReceipt = receipt;
          },
        },
      })
      : createAureliaPlugin({
        include,
        standardDecoratorInclude: include,
        transformStandardDecorators: true,
        useDev: false,
        hmr: false,
      });

  const started = performance.now();
  const output = await build({
    root: application.root,
    configFile: false,
    mode: 'production',
    logLevel: 'warn',
    plugins: [isolation, aureliaPlugins],
    resolve: { preserveSymlinks: true },
    build: {
      outDir,
      emptyOutDir: true,
      copyPublicDir: false,
      sourcemap: false,
      minify: 'oxc',
      target: 'es2022',
      ...(application.input.kind === 'library-single'
        ? {
            lib: {
              entry: application.input.entry,
              formats: ['es'] as const,
              fileName: () => 'app.js',
            },
            rolldownOptions: {
              preserveEntrySignatures: 'strict' as const,
              output: {
                codeSplitting: false,
                comments: false,
                minify: true,
              },
            },
          }
        : {
            rolldownOptions: {
              input: application.input.entryHtml,
              output: {
                comments: false,
                minify: true,
              },
            },
          }),
    },
  });
  const durationMs = performance.now() - started;
  const items = buildOutputItems(output);
  const chunks = items.filter(isOutputChunk);
  const assets = items.filter(isOutputAsset);
  if (application.input.kind === 'library-single') {
    const entry = chunks.find((chunk) => chunk.isEntry && chunk.fileName === 'app.js');
    if (entry == null || chunks.length !== 1) {
      throw new Error(
        `${application.id}/${mode} expected one ESM entry chunk named app.js; received `
        + `${chunks.map((chunk) => chunk.fileName).join(', ') || '<none>'}.`,
      );
    }
  }
  assertFrameworkIsolation(chunks, request.framework.installRoot, application.id, mode);
  const semanticEvidence = semanticProvider?.evidence() ?? null;
  if (mode === 'aot' && (semanticEvidence == null || aotReceipt == null)) {
    throw new Error(`${application.id}/aot did not publish semantic and Vite evidence.`);
  }
  return {
    applicationId: application.id,
    mode,
    outDir,
    durationMs: Number(durationMs.toFixed(3)),
    chunks: chunks.map((chunk) => ({
      fileName: chunk.fileName,
      isEntry: chunk.isEntry,
      imports: [...chunk.imports],
      dynamicImports: [...chunk.dynamicImports],
      moduleIds: Object.keys(chunk.modules).sort(),
    })),
    assets: assets.map((asset) => ({ fileName: asset.fileName })),
    entryFiles: chunks.filter((chunk) => chunk.isEntry).map((chunk) => chunk.fileName).sort(),
    semanticEvidence,
    aotReceipt,
    resolvedFrameworkEntries: Object.fromEntries(
      [...frameworkEntries].sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

function frameworkPackageIsolationPlugin(
  framework: PreparedFrameworkPackageGraph,
  resolved: Map<string, string>,
): Plugin {
  return {
    name: 'aurelia-benchmark-framework-isolation',
    enforce: 'pre',
    resolveId(source) {
      const packageName = aureliaPackageName(source);
      if (packageName == null) return null;
      if (source !== packageName) {
        throw new Error(`Benchmark framework graph does not admit package subpath '${source}'.`);
      }
      const entry = framework.entryFor(packageName);
      resolved.set(source, entry);
      return entry;
    },
  };
}

function aureliaPackageName(specifier: string): string | null {
  if (specifier === 'aurelia') return specifier;
  const match = /^(@aurelia\/[^/]+)(?:\/.*)?$/u.exec(specifier);
  return match?.[1] ?? null;
}

function assertFrameworkIsolation(
  chunks: readonly OutputChunk[],
  installRoot: string,
  applicationId: string,
  mode: BenchmarkBuildMode,
): void {
  const resolvedRoot = path.resolve(installRoot);
  const frameworkModules = chunks.flatMap((chunk) => Object.keys(chunk.modules)).filter((id) =>
    /[\\/]node_modules[\\/]@aurelia[\\/]/u.test(id)
    || /[\\/]node_modules[\\/]aurelia[\\/]/u.test(id)
  );
  if (frameworkModules.length === 0) {
    throw new Error(`${applicationId}/${mode} rendered no Aurelia module from the prepared graph.`);
  }
  for (const id of frameworkModules) {
    const cleanId = id.replace(/[?#].*$/u, '');
    const relative = path.relative(resolvedRoot, path.resolve(cleanId));
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`${applicationId}/${mode} resolved Aurelia outside the prepared graph: ${cleanId}`);
    }
  }
}

function buildOutputItems(output: unknown): readonly (OutputChunk | OutputAsset)[] {
  const builds = Array.isArray(output) ? output : [output];
  return builds.flatMap((candidate) => isRolldownOutput(candidate) ? candidate.output : []);
}

function isRolldownOutput(value: unknown): value is BuildOutput {
  return typeof value === 'object' && value !== null && Array.isArray((value as { output?: unknown }).output);
}

function isOutputChunk(value: OutputChunk | OutputAsset): value is OutputChunk {
  return value.type === 'chunk';
}

function isOutputAsset(value: OutputChunk | OutputAsset): value is OutputAsset {
  return value.type === 'asset';
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
