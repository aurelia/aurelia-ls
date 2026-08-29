import * as aureliaPluginModule from "@aurelia/vite-plugin";
import type { AureliaPluginOptions } from "@aurelia/vite-plugin";
import type { Plugin, ResolvedConfig } from "vite";
import { AotViteError } from "./aot-vite-error.js";
import {
  isAotTemplateId,
  sourcePathFromAotTemplateId,
  toAotTemplateSpecifier,
} from "./aot-template-query.js";
import { createAotBuildReceipt, type ReceiptChunkInput } from "./build-receipt.js";
import type {
  AotBuildSession,
  AotReceiptArtifact,
  AotTemplateArtifact,
  AureliaAotOptions,
} from "./contracts.js";

export { AotViteError, type AotViteErrorCode } from "./aot-vite-error.js";
export {
  AOT_TEMPLATE_QUERY,
  isAotTemplateId,
  sourcePathFromAotTemplateId,
  toAotTemplateSpecifier,
} from "./aot-template-query.js";
export { createAotBuildReceipt } from "./build-receipt.js";
export type {
  AotArtifactProvider,
  AotBuildReceipt,
  AotBuildRequest,
  AotBuildSession,
  AotConventionOptions,
  AotReceiptArtifact,
  AotReceiptChunk,
  AotReceiptGraphModule,
  AotReceiptOptions,
  AotReceiptRenderedModule,
  AotExistingRawSourceMap,
  AotSourceMapInput,
  AotTemplateArtifact,
  AotTemplateRequest,
  AureliaAotOptions,
} from "./contracts.js";

export const AOT_RECEIPT_FILE = "aurelia-aot-receipt.json";

type AureliaPluginFactory = (options: AureliaPluginOptions) => Plugin[];

const officialAureliaPlugin = (
  aureliaPluginModule as unknown as { readonly default: AureliaPluginFactory }
).default;

interface EnvironmentState {
  sessionPromise: Promise<AotBuildSession> | undefined;
  readonly artifacts: Map<string, AotReceiptArtifact>;
}

class EnvironmentBuildRegistry {
  readonly #states = new WeakMap<object, EnvironmentState>();

  public for(environment: object): EnvironmentState {
    let state = this.#states.get(environment);
    if (state === undefined) {
      state = {
        sessionPromise: undefined,
        artifacts: new Map(),
      };
      this.#states.set(environment, state);
    }
    return state;
  }
}

/**
 * Creates the strict, build-only Vite 8 preset for Aurelia AOT.
 *
 * Every template specifier rewritten by this preset is a claimed AOT module.
 * Artifact failure therefore terminates the build instead of falling through
 * to the official plugin's JIT template module.
 */
export function aureliaAot(options: AureliaAotOptions): Plugin[] {
  const registry = new EnvironmentBuildRegistry();
  let config: ResolvedConfig | undefined;

  const guard: Plugin = {
    name: "aurelia-aot:guard",
    enforce: "pre",
    config(_userConfig, environment) {
      if (environment.command !== "build") {
        throw unsupported("Aurelia AOT currently accepts production builds only; Vite serve is unsupported.");
      }
    },
    configResolved(resolved) {
      assertSupportedConfig(resolved);
      config = resolved;
    },
  };

  const officialPlugins = officialAureliaPlugin({
    ...options.conventions,
    pre: true,
    useDev: false,
    hmr: false,
    getHmrCode: undefined,
    transformHtmlImportSpecifier: toAotTemplateSpecifier,
  });

  const artifacts: Plugin = {
    name: "aurelia-aot:artifacts",
    enforce: "pre",
    buildStart() {
      const resolved = requireResolvedConfig(config);
      assertSupportedEnvironment(this.environment.name, this.environment.config.consumer);
      const state = registry.for(this.environment);
      state.sessionPromise ??= options.provider.openBuild({
        root: resolved.root,
        mode: resolved.mode,
        environmentName: this.environment.name,
        sourcemap: this.environment.config.build.sourcemap,
      });
    },
    async resolveId(source, importer, resolveOptions) {
      if (!isAotTemplateId(source)) {
        return null;
      }
      rejectSsr(resolveOptions.ssr);

      const unmarkedSource = sourcePathFromAotTemplateId(source);
      const resolved = await this.resolve(unmarkedSource, importer, {
        ...resolveOptions,
        skipSelf: true,
      });
      if (resolved == null || resolved.external) {
        throw new AotViteError(
          "AOT_VITE_RESOLUTION_FAILED",
          `Cannot resolve claimed AOT template '${unmarkedSource}'.`,
          unmarkedSource,
        );
      }

      return {
        id: toAotTemplateSpecifier(resolved.id),
        moduleSideEffects: resolved.moduleSideEffects,
      };
    },
    async load(id, loadOptions) {
      if (!isAotTemplateId(id)) {
        return null;
      }
      rejectSsr(loadOptions?.ssr);

      const state = registry.for(this.environment);
      if (state.sessionPromise === undefined) {
        throw new AotViteError(
          "AOT_VITE_SESSION_NOT_STARTED",
          `The AOT build session was not started before loading '${id}'.`,
        );
      }

      const sourcePath = sourcePathFromAotTemplateId(id);
      let artifact;
      try {
        const session = await state.sessionPromise;
        artifact = await session.artifactFor({ sourcePath });
      } catch (cause) {
        throw new AotViteError(
          "AOT_VITE_ARTIFACT_FAILED",
          `AOT artifact production failed for '${sourcePath}'.`,
          sourcePath,
          cause,
        );
      }

      validateArtifact(artifact, sourcePath);
      const previous = state.artifacts.get(sourcePath);
      if (previous != null && previous.digest !== artifact.digest) {
        throw new AotViteError(
          "AOT_VITE_INVALID_ARTIFACT",
          `AOT provider returned two digests for '${sourcePath}' in one build session.`,
          sourcePath,
        );
      }
      state.artifacts.set(sourcePath, {
        sourcePath,
        virtualId: id,
        digest: artifact.digest,
      });

      return {
        code: artifact.code,
        map: artifact.map,
      };
    },
  };

  const preset = [guard, ...officialPlugins, artifacts];
  if (options.receipt != null) {
    preset.push(createReceiptPlugin(registry, options));
  }
  return preset;
}

function createReceiptPlugin(registry: EnvironmentBuildRegistry, options: AureliaAotOptions): Plugin {
  return {
    name: "aurelia-aot:receipt",
    enforce: "post",
    async generateBundle(_outputOptions, bundle) {
      assertSupportedEnvironment(this.environment.name, this.environment.config.consumer);
      const state = registry.for(this.environment);
      const graph = Array.from(this.getModuleIds(), (id) => {
        const module = this.getModuleInfo(id);
        return {
          id,
          isEntry: module?.isEntry ?? false,
          importedIds: module?.importedIds ?? [],
          dynamicallyImportedIds: module?.dynamicallyImportedIds ?? [],
          importers: module?.importers ?? [],
          dynamicImporters: module?.dynamicImporters ?? [],
        };
      });
      const chunks: ReceiptChunkInput[] = [];
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") {
          continue;
        }
        chunks.push({
          fileName: output.fileName,
          isEntry: output.isEntry,
          imports: output.imports,
          dynamicImports: output.dynamicImports,
          modules: Object.entries(output.modules).map(([id, module]) => ({
            id,
            renderedLength: module.renderedLength,
            renderedExports: module.renderedExports,
          })),
        });
      }

      const receipt = createAotBuildReceipt({
        environmentName: this.environment.name,
        artifacts: state.artifacts.values(),
        graph,
        chunks,
      });
      this.emitFile({
        type: "asset",
        fileName: options.receipt?.fileName ?? AOT_RECEIPT_FILE,
        source: `${JSON.stringify(receipt, null, 2)}\n`,
      });
      await options.receipt?.onReceipt?.(receipt);
    },
  };
}

function assertSupportedConfig(config: ResolvedConfig): void {
  if (config.command !== "build") {
    throw unsupported("Aurelia AOT currently accepts production builds only; Vite serve is unsupported.");
  }
  if (config.build.watch != null) {
    throw unsupported("Aurelia AOT does not yet support Vite watch builds.");
  }
  if (config.build.ssr !== false) {
    throw unsupported("Aurelia AOT does not yet support SSR builds.");
  }
  if (config.isWorker) {
    throw unsupported("Aurelia AOT does not yet support worker builds.");
  }
}

function assertSupportedEnvironment(name: string, consumer: "client" | "server"): void {
  if (name !== "client" || consumer !== "client") {
    throw unsupported(`Aurelia AOT does not yet support the '${name}' Vite environment.`);
  }
}

function rejectSsr(ssr: boolean | undefined): void {
  if (ssr === true) {
    throw unsupported("Aurelia AOT does not yet support SSR module resolution.");
  }
}

function requireResolvedConfig(config: ResolvedConfig | undefined): ResolvedConfig {
  if (config === undefined) {
    throw new AotViteError(
      "AOT_VITE_UNSUPPORTED_BUILD",
      "Vite configResolved must run before the Aurelia AOT build starts.",
    );
  }
  return config;
}

function validateArtifact(
  artifact: AotTemplateArtifact,
  sourcePath: string,
): void {
  if (artifact == null || typeof artifact !== "object") {
    throw invalidArtifact(sourcePath, "returned no artifact object");
  }
  if (artifact.sourcePath !== sourcePath) {
    throw new AotViteError(
      "AOT_VITE_SOURCE_AUTHORITY",
      `AOT artifact source '${artifact.sourcePath}' does not match requested source '${sourcePath}'.`,
      sourcePath,
    );
  }
  if (typeof artifact.code !== "string") {
    throw invalidArtifact(sourcePath, "returned non-string module code");
  }
  if (typeof artifact.digest !== "string" || artifact.digest.trim().length === 0) {
    throw invalidArtifact(sourcePath, "returned a blank digest");
  }
  if (artifact.map === undefined) {
    throw invalidArtifact(sourcePath, "omitted the source-map result");
  }
}

function invalidArtifact(sourcePath: string, reason: string): AotViteError {
  return new AotViteError(
    "AOT_VITE_INVALID_ARTIFACT",
    `AOT provider ${reason} for '${sourcePath}'.`,
    sourcePath,
  );
}

function unsupported(message: string): AotViteError {
  return new AotViteError("AOT_VITE_UNSUPPORTED_BUILD", message);
}
