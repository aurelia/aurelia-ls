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
  AotSourceTransformArtifact,
  AotTemplateArtifact,
  AotTransformedConfiguration,
  AotTransformedResource,
  AotVirtualModuleArtifact,
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
  AotNominatedEntry,
  AotNominatedEntryArgument,
  AotNominatedEntryCallable,
  AotSourceMapInput,
  AotSourceTransformArtifact,
  AotSourceTransformRequest,
  AotTemplateArtifact,
  AotTemplateRequest,
  AotTransformedConfiguration,
  AotTransformedResource,
  AotVirtualModuleArtifact,
  AotVirtualModuleRequest,
  AureliaAotOptions,
} from "./contracts.js";

export const AOT_RECEIPT_FILE = "aurelia-aot-receipt.json";

type AureliaPluginFactory = (options: AureliaPluginOptions) => Plugin[];

const officialAureliaPlugin = (
  aureliaPluginModule as unknown as { readonly default: AureliaPluginFactory }
).default;

const AOT_RESOLVED_VIRTUAL_PREFIX = "\0aurelia-aot:";
const authoredModuleExtension = /\.[cm]?[jt]sx?$/iu;

interface VirtualModuleClaim {
  readonly specifier: string;
  readonly sourcePath: string;
  readonly kind: "runtime" | "payload" | "configuration";
  readonly expectedDigest: string | undefined;
  readonly compilerVariantKey: string | undefined;
}

interface EnvironmentState {
  sessionPromise: Promise<AotBuildSession> | undefined;
  readonly artifacts: Map<string, AotReceiptArtifact>;
  readonly sourceTransformDigests: Map<string, string>;
  readonly virtualClaims: Map<string, VirtualModuleClaim>;
  readonly virtualDigests: Map<string, string>;
}

class EnvironmentBuildRegistry {
  readonly #states = new WeakMap<object, EnvironmentState>();

  public for(environment: object): EnvironmentState {
    let state = this.#states.get(environment);
    if (state === undefined) {
      state = {
        sessionPromise: undefined,
        artifacts: new Map(),
        sourceTransformDigests: new Map(),
        virtualClaims: new Map(),
        virtualDigests: new Map(),
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

  const sources: Plugin = {
    name: "aurelia-aot:sources",
    enforce: "pre",
    buildStart() {
      startBuildSession(registry, options, config, this.environment);
    },
    async transform(code, id, transformOptions) {
      rejectSsr(transformOptions?.ssr);
      const sourcePath = authoredSourcePath(id);
      if (sourcePath == null) {
        return null;
      }

      const state = registry.for(this.environment);
      const session = await requireBuildSession(state, sourcePath);
      if (session.transformSource == null) {
        return null;
      }

      let artifact: AotSourceTransformArtifact | null;
      try {
        artifact = await session.transformSource({ sourcePath, code });
      } catch (cause) {
        throw new AotViteError(
          "AOT_VITE_ARTIFACT_FAILED",
          `AOT authored-source transformation failed for '${sourcePath}'.`,
          sourcePath,
          cause,
        );
      }
      if (artifact == null) {
        return null;
      }

      validateSourceTransformArtifact(artifact, sourcePath);
      if (session.virtualModuleFor == null) {
        throw new AotViteError(
          "AOT_VITE_SESSION_CONTRACT",
          `AOT source transformation for '${sourcePath}' returned virtual modules, but the build session does not implement virtualModuleFor().`,
          sourcePath,
        );
      }
      recordSourceTransform(state, artifact);
      if (artifact.runtimeModuleSpecifier != null) {
        claimVirtualModule(state, {
          specifier: artifact.runtimeModuleSpecifier,
          sourcePath,
          kind: "runtime",
          expectedDigest: undefined,
          compilerVariantKey: undefined,
        });
      }
      for (const resource of artifact.resources) {
        claimTransformedResource(state, artifact, resource);
      }
      for (const configuration of artifact.configurations) {
        claimTransformedConfiguration(state, artifact, configuration);
      }

      return {
        code: artifact.code,
        map: artifact.map,
      };
    },
    resolveId(source, _importer, resolveOptions) {
      rejectSsr(resolveOptions.ssr);
      const state = registry.for(this.environment);
      if (!state.virtualClaims.has(source)) {
        return null;
      }
      return {
        id: resolvedVirtualId(source),
        moduleSideEffects: false,
      };
    },
    async load(id, loadOptions) {
      rejectSsr(loadOptions?.ssr);
      const specifier = specifierFromResolvedVirtualId(id);
      if (specifier == null) {
        return null;
      }

      const state = registry.for(this.environment);
      const claim = state.virtualClaims.get(specifier);
      if (claim == null) {
        return null;
      }
      const session = await requireBuildSession(state, claim.sourcePath);
      if (session.virtualModuleFor == null) {
        throw new AotViteError(
          "AOT_VITE_SESSION_CONTRACT",
          `AOT build session cannot load claimed virtual module '${specifier}'.`,
          claim.sourcePath,
        );
      }

      let artifact: AotVirtualModuleArtifact | null;
      try {
        artifact = await session.virtualModuleFor({ specifier });
      } catch (cause) {
        throw new AotViteError(
          "AOT_VITE_ARTIFACT_FAILED",
          `AOT virtual module production failed for '${specifier}'.`,
          claim.sourcePath,
          cause,
        );
      }
      if (artifact == null) {
        throw new AotViteError(
          "AOT_VITE_SESSION_CONTRACT",
          `AOT build session did not recognize claimed virtual module '${specifier}'.`,
          claim.sourcePath,
        );
      }
      validateVirtualModuleArtifact(artifact, claim);
      recordVirtualDigest(state, artifact, claim);
      return {
        code: artifact.code,
        map: artifact.map,
      };
    },
  };

  const artifacts: Plugin = {
    name: "aurelia-aot:artifacts",
    enforce: "pre",
    buildStart() {
      startBuildSession(registry, options, config, this.environment);
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

      const sourcePath = sourcePathFromAotTemplateId(id);
      let artifact;
      try {
        const session = await requireBuildSession(state, id);
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
      const artifactKey = `template:${sourcePath}`;
      const previous = state.artifacts.get(artifactKey);
      if (previous != null && previous.digest !== artifact.digest) {
        throw new AotViteError(
          "AOT_VITE_INVALID_ARTIFACT",
          `AOT provider returned two digests for '${sourcePath}' in one build session.`,
          sourcePath,
        );
      }
      state.artifacts.set(artifactKey, {
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

  const preset = [guard, sources, ...officialPlugins, artifacts];
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

interface AotViteEnvironment {
  readonly name: string;
  readonly config: {
    readonly consumer: "client" | "server";
    readonly build: {
      readonly sourcemap: boolean | "inline" | "hidden";
    };
  };
}

function startBuildSession(
  registry: EnvironmentBuildRegistry,
  options: AureliaAotOptions,
  config: ResolvedConfig | undefined,
  environment: AotViteEnvironment,
): void {
  const resolved = requireResolvedConfig(config);
  assertSupportedEnvironment(environment.name, environment.config.consumer);
  const state = registry.for(environment);
  state.sessionPromise ??= options.provider.openBuild({
    root: resolved.root,
    mode: resolved.mode,
    environmentName: environment.name,
    sourcemap: environment.config.build.sourcemap,
    ...(options.nominatedEntry === undefined ? {} : { nominatedEntry: options.nominatedEntry }),
  });
}

function requireBuildSession(
  state: EnvironmentState,
  sourcePath: string,
): Promise<AotBuildSession> {
  if (state.sessionPromise === undefined) {
    throw new AotViteError(
      "AOT_VITE_SESSION_NOT_STARTED",
      `The AOT build session was not started before processing '${sourcePath}'.`,
      sourcePath,
    );
  }
  return state.sessionPromise;
}

function authoredSourcePath(id: string): string | null {
  if (id.startsWith("\0") || isAotTemplateId(id)) {
    return null;
  }
  const queryAt = id.search(/[?#]/u);
  if (queryAt >= 0) {
    return null;
  }
  return authoredModuleExtension.test(id) ? id : null;
}

function resolvedVirtualId(specifier: string): string {
  return `${AOT_RESOLVED_VIRTUAL_PREFIX}${specifier}`;
}

function specifierFromResolvedVirtualId(id: string): string | null {
  return id.startsWith(AOT_RESOLVED_VIRTUAL_PREFIX)
    ? id.slice(AOT_RESOLVED_VIRTUAL_PREFIX.length)
    : null;
}

function recordSourceTransform(
  state: EnvironmentState,
  artifact: AotSourceTransformArtifact,
): void {
  const previous = state.sourceTransformDigests.get(artifact.sourcePath);
  if (previous != null && previous !== artifact.digest) {
    throw invalidArtifact(
      artifact.sourcePath,
      "returned two authored-source transform digests in one build session",
    );
  }
  state.sourceTransformDigests.set(artifact.sourcePath, artifact.digest);
}

function claimTransformedResource(
  state: EnvironmentState,
  artifact: AotSourceTransformArtifact,
  resource: AotTransformedResource,
): void {
  claimVirtualModule(state, {
    specifier: resource.payloadSpecifier,
    sourcePath: artifact.sourcePath,
    kind: "payload",
    expectedDigest: resource.payloadDigest,
    compilerVariantKey: resource.compilerVariantKey,
  });

  const receipt: AotReceiptArtifact = {
    sourcePath: artifact.sourcePath,
    virtualId: resolvedVirtualId(resource.payloadSpecifier),
    digest: resource.payloadDigest,
    resourceKey: resource.resourceKey,
    compilerVariantKey: resource.compilerVariantKey,
    definitionName: resource.definitionName,
  };
  const key = `resource:${resource.compilerVariantKey}`;
  const previous = state.artifacts.get(key);
  if (previous != null && !sameReceiptArtifact(previous, receipt)) {
    throw invalidArtifact(
      artifact.sourcePath,
      `returned conflicting resource artifact '${resource.compilerVariantKey}' in one build session`,
    );
  }
  state.artifacts.set(key, receipt);
}

function claimTransformedConfiguration(
  state: EnvironmentState,
  artifact: AotSourceTransformArtifact,
  configuration: AotTransformedConfiguration,
): void {
  claimVirtualModule(state, {
    specifier: configuration.moduleSpecifier,
    sourcePath: artifact.sourcePath,
    kind: "configuration",
    expectedDigest: configuration.expectedDigest,
    compilerVariantKey: undefined,
  });
}

function claimVirtualModule(state: EnvironmentState, claim: VirtualModuleClaim): void {
  const previous = state.virtualClaims.get(claim.specifier);
  if (previous == null) {
    state.virtualClaims.set(claim.specifier, claim);
    return;
  }
  const compatible = previous.kind === claim.kind
    && previous.expectedDigest === claim.expectedDigest
    && previous.compilerVariantKey === claim.compilerVariantKey;
  if (!compatible) {
    throw invalidArtifact(
      claim.sourcePath,
      `returned conflicting claims for virtual module '${claim.specifier}'`,
    );
  }
}

function recordVirtualDigest(
  state: EnvironmentState,
  artifact: AotVirtualModuleArtifact,
  claim: VirtualModuleClaim,
): void {
  const previous = state.virtualDigests.get(artifact.specifier);
  if (previous != null && previous !== artifact.digest) {
    throw invalidArtifact(
      claim.sourcePath,
      `returned two digests for virtual module '${artifact.specifier}' in one build session`,
    );
  }
  state.virtualDigests.set(artifact.specifier, artifact.digest);
}

function sameReceiptArtifact(left: AotReceiptArtifact, right: AotReceiptArtifact): boolean {
  return left.sourcePath === right.sourcePath
    && left.virtualId === right.virtualId
    && left.digest === right.digest
    && left.resourceKey === right.resourceKey
    && left.compilerVariantKey === right.compilerVariantKey
    && left.definitionName === right.definitionName;
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

function validateSourceTransformArtifact(
  artifact: AotSourceTransformArtifact,
  sourcePath: string,
): void {
  if (artifact == null || typeof artifact !== "object") {
    throw invalidArtifact(sourcePath, "returned no authored-source transform object");
  }
  if (artifact.sourcePath !== sourcePath) {
    throw new AotViteError(
      "AOT_VITE_SOURCE_AUTHORITY",
      `AOT source transform '${artifact.sourcePath}' does not match requested source '${sourcePath}'.`,
      sourcePath,
    );
  }
  if (typeof artifact.code !== "string") {
    throw invalidArtifact(sourcePath, "returned non-string authored-source code");
  }
  assertDigest(artifact.digest, sourcePath, "authored-source transform");
  if (artifact.map === undefined) {
    throw invalidArtifact(sourcePath, "omitted the authored-source transform map");
  }
  if (
    !isArrayValue(artifact.resources)
    || !isArrayValue(artifact.configurations)
  ) {
    throw invalidArtifact(sourcePath, "omitted authored-source transform evidence");
  }
  if (artifact.resources.length === 0 && artifact.configurations.length === 0) {
    throw invalidArtifact(sourcePath, "returned an authored-source transform without resources or configurations");
  }
  if (artifact.resources.length === 0) {
    if (artifact.runtimeModuleSpecifier !== null) {
      throw invalidArtifact(sourcePath, "returned a compiler-patch runtime for a configuration-only transform");
    }
  } else {
    if (artifact.runtimeModuleSpecifier == null) {
      throw invalidArtifact(sourcePath, "omitted the compiler-patch runtime for transformed resources");
    }
    assertVirtualSpecifier(artifact.runtimeModuleSpecifier, sourcePath, "runtime");
  }

  const resourceKeys = new Set<string>();
  const compilerVariantKeys = new Set<string>();
  const payloadSpecifiers = new Set<string>();
  for (const resource of artifact.resources) {
    validateTransformedResource(resource, sourcePath);
    if (resourceKeys.has(resource.resourceKey)) {
      throw invalidArtifact(sourcePath, `returned duplicate resource key '${resource.resourceKey}'`);
    }
    if (compilerVariantKeys.has(resource.compilerVariantKey)) {
      throw invalidArtifact(sourcePath, `returned duplicate compiler variant '${resource.compilerVariantKey}'`);
    }
    if (payloadSpecifiers.has(resource.payloadSpecifier)) {
      throw invalidArtifact(sourcePath, `returned duplicate payload module '${resource.payloadSpecifier}'`);
    }
    if (resource.payloadSpecifier === artifact.runtimeModuleSpecifier) {
      throw invalidArtifact(sourcePath, "used the runtime module specifier for a resource payload");
    }
    resourceKeys.add(resource.resourceKey);
    compilerVariantKeys.add(resource.compilerVariantKey);
    payloadSpecifiers.add(resource.payloadSpecifier);
  }

  for (const configuration of artifact.configurations) {
    validateTransformedConfiguration(configuration, sourcePath);
  }
}

function validateTransformedResource(resource: AotTransformedResource, sourcePath: string): void {
  if (resource == null || typeof resource !== "object") {
    throw invalidArtifact(sourcePath, "returned a non-object transformed resource");
  }
  assertNonBlank(resource.resourceKey, sourcePath, "resource key");
  assertNonBlank(resource.compilerVariantKey, sourcePath, "compiler variant key");
  assertNonBlank(resource.definitionName, sourcePath, "definition name");
  assertNonBlank(resource.carrierKind, sourcePath, "carrier kind");
  assertDigest(resource.payloadDigest, sourcePath, "resource payload");
  assertVirtualSpecifier(resource.payloadSpecifier, sourcePath, "payload");
  if (
    !Number.isInteger(resource.carrierStart)
    || !Number.isInteger(resource.carrierEnd)
    || resource.carrierStart < 0
    || resource.carrierEnd < resource.carrierStart
  ) {
    throw invalidArtifact(sourcePath, `returned invalid carrier offsets for '${resource.resourceKey}'`);
  }
}

function validateTransformedConfiguration(
  configuration: AotTransformedConfiguration,
  sourcePath: string,
): void {
  if (configuration == null || typeof configuration !== "object") {
    throw invalidArtifact(sourcePath, "returned a non-object transformed configuration");
  }
  assertVirtualSpecifier(configuration.moduleSpecifier, sourcePath, "configuration");
  assertDigest(configuration.expectedDigest, sourcePath, "configuration module");
  assertNonBlank(configuration.exportName, sourcePath, "configuration export name");
  assertNonBlank(configuration.localName, sourcePath, "configuration local name");
  if (
    !Number.isInteger(configuration.valueStart)
    || !Number.isInteger(configuration.valueEnd)
    || configuration.valueStart < 0
    || configuration.valueEnd < configuration.valueStart
  ) {
    throw invalidArtifact(sourcePath, "returned invalid configuration value offsets");
  }
}

function validateVirtualModuleArtifact(
  artifact: AotVirtualModuleArtifact,
  claim: VirtualModuleClaim,
): void {
  if (artifact == null || typeof artifact !== "object") {
    throw invalidArtifact(claim.sourcePath, `returned no virtual module object for '${claim.specifier}'`);
  }
  if (artifact.specifier !== claim.specifier) {
    throw new AotViteError(
      "AOT_VITE_SOURCE_AUTHORITY",
      `AOT virtual module '${artifact.specifier}' does not match claimed specifier '${claim.specifier}'.`,
      claim.sourcePath,
    );
  }
  if (typeof artifact.code !== "string") {
    throw invalidArtifact(claim.sourcePath, `returned non-string code for virtual module '${claim.specifier}'`);
  }
  assertDigest(artifact.digest, claim.sourcePath, `virtual module '${claim.specifier}'`);
  if (claim.expectedDigest != null && artifact.digest !== claim.expectedDigest) {
    throw invalidArtifact(
      claim.sourcePath,
      `returned digest '${artifact.digest}' for claimed module '${claim.specifier}', expected '${claim.expectedDigest}'`,
    );
  }
  if (artifact.map === undefined) {
    throw invalidArtifact(claim.sourcePath, `omitted the map for virtual module '${claim.specifier}'`);
  }
}

function assertVirtualSpecifier(value: string, sourcePath: string, label: string): void {
  assertNonBlank(value, sourcePath, `${label} virtual module specifier`);
  if (!value.startsWith("virtual:") || value.startsWith(AOT_RESOLVED_VIRTUAL_PREFIX)) {
    throw invalidArtifact(sourcePath, `returned non-virtual ${label} module specifier '${value}'`);
  }
}

function assertDigest(value: string, sourcePath: string, label: string): void {
  assertNonBlank(value, sourcePath, `${label} digest`);
}

function assertNonBlank(value: string, sourcePath: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidArtifact(sourcePath, `returned a blank ${label}`);
  }
}

function isArrayValue(value: unknown): boolean {
  return Array.isArray(value);
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
