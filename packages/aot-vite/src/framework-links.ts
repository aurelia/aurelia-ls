import { createHash, type BinaryLike } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Plugin } from "vite";
import { AotViteError } from "./aot-vite-error.js";
import type {
  AotBuildSession,
  AotFrameworkLinkModuleInput,
  AotFrameworkLinksC0FallbackReason,
  AotFrameworkLinksOptions,
  AotFrameworkLinksReceipt,
  AotLinkedFrameworkModuleArtifact,
  AotObservedFrameworkLinkModule,
  AotPreparedFrameworkLinksResult,
} from "./contracts.js";

interface ObservedFrameworkLinkModule extends AotObservedFrameworkLinkModule {
  loaded: boolean;
}

interface AppliedFrameworkLinkModule extends ObservedFrameworkLinkModule {
  readonly artifact: AotLinkedFrameworkModuleArtifact;
}

type PreparedFrameworkLinksState =
  | {
      readonly disposition: "applied";
      readonly options: AotFrameworkLinksOptions;
      readonly recipeFingerprint: string;
      readonly modules: readonly (AppliedFrameworkLinkModule | ObservedFrameworkLinkModule)[];
      readonly modulesById: ReadonlyMap<string, AppliedFrameworkLinkModule | ObservedFrameworkLinkModule>;
      readonly targetsById: ReadonlyMap<string, AppliedFrameworkLinkModule>;
    }
  | {
      readonly disposition: "c0-fallback";
      readonly options: AotFrameworkLinksOptions;
      readonly reason: AotFrameworkLinksC0FallbackReason;
      readonly modules: readonly ObservedFrameworkLinkModule[];
    };

interface FrameworkLinkEnvironmentState {
  prepared: PreparedFrameworkLinksState | undefined;
  preparation: Promise<void> | undefined;
}

export interface FrameworkLinkPluginHost {
  readonly startBuildSession: (environment: object) => void;
  readonly requireBuildSession: (environment: object) => Promise<AotBuildSession>;
  readonly rejectSsr: (ssr: boolean | undefined) => void;
}

/**
 * Owns the exact-input framework-link lifecycle for every Vite environment.
 *
 * Preparation arms all target replacements together. Transform hooks only
 * consume that prepared plan, and build finalization either proves complete
 * consumption or moves the untouched build to the permitted C0 fallback.
 */
export class FrameworkLinkCoordinator {
  readonly #options: AotFrameworkLinksOptions;
  readonly #states = new WeakMap<object, FrameworkLinkEnvironmentState>();

  public constructor(options: AotFrameworkLinksOptions) {
    this.#options = options;
  }

  public createPlugin(host: FrameworkLinkPluginHost): Plugin {
    const options = this.#options;
    const stateFor = (environment: object): FrameworkLinkEnvironmentState => this.#for(environment);
    const prepare = (
      state: FrameworkLinkEnvironmentState,
      environment: object,
    ): Promise<void> => this.#prepare(state, environment, host);
    const finalizeConsumption = (state: FrameworkLinkEnvironmentState): void => this.#finalizeConsumption(state);
    return {
      name: "aurelia-aot:framework-links",
      enforce: "pre",
      async buildStart() {
        host.startBuildSession(this.environment);
        const state = stateFor(this.environment);
        for (const module of options.modules) this.addWatchFile(module.resolvedId);
        state.preparation ??= prepare(state, this.environment);
        await state.preparation;
      },
      async transform(code, id, transformOptions) {
        host.rejectSsr(transformOptions?.ssr);
        const state = stateFor(this.environment);
        await state.preparation;
        const prepared = state.prepared;
        if (prepared == null) return null;
        if (prepared.disposition === "c0-fallback") {
          const module = prepared.modules.find((candidate) => sourcePathKey(candidate.resolvedId) === sourcePathKey(id));
          if (module != null) module.loaded = true;
          return null;
        }
        const module = prepared.modulesById.get(sourcePathKey(id));
        if (module == null) return null;
        const currentSha256 = sha256(code);
        if (currentSha256 !== module.observedSha256) {
          throw frameworkLinkError(
            `Framework module '${module.packageName}/${module.packageRelativePath}' changed after the atomic link plan was armed: `
            + `${currentSha256} != ${module.observedSha256}.`,
            id,
          );
        }
        module.loaded = true;
        if (module.role === "guard") return null;
        const target = prepared.targetsById.get(sourcePathKey(id));
        if (target == null) {
          throw frameworkLinkError(`Armed framework target '${id}' lost its linked artifact.`, id);
        }
        return { code: target.artifact.code, map: target.artifact.map };
      },
      async buildEnd(error) {
        if (error != null) return;
        const state = stateFor(this.environment);
        await state.preparation;
        finalizeConsumption(state);
      },
    };
  }

  public receipt(environment: object): AotFrameworkLinksReceipt | undefined {
    const prepared = this.#states.get(environment)?.prepared;
    return prepared === undefined ? undefined : frameworkLinksReceipt(prepared);
  }

  #for(environment: object): FrameworkLinkEnvironmentState {
    let state = this.#states.get(environment);
    if (state === undefined) {
      state = { prepared: undefined, preparation: undefined };
      this.#states.set(environment, state);
    }
    return state;
  }

  async #prepare(
    state: FrameworkLinkEnvironmentState,
    environment: object,
    host: FrameworkLinkPluginHost,
  ): Promise<void> {
    const options = this.#options;
    const observed = await Promise.all(options.modules.map(readObservedFrameworkModule));
    const mismatch = observed.find((module) => module.observedSha256 !== module.expectedSha256) ?? null;
    if (mismatch != null) {
      this.#applyFallback(state, observed, {
        kind: "input-hash-mismatch",
        summary: `Observed framework input '${mismatch.observedSha256}' does not match exact recipe input '${mismatch.expectedSha256}'.`,
        packageName: mismatch.packageName,
        packageRelativePath: mismatch.packageRelativePath,
      });
      return;
    }

    const session = await host.requireBuildSession(environment);
    if (session.prepareFrameworkLinks == null) {
      this.#applyFallback(state, observed, {
        kind: "recipe-unavailable",
        summary: "The AOT build session does not provide an exact-fingerprinted framework-link recipe.",
      });
      return;
    }

    let result: AotPreparedFrameworkLinksResult;
    try {
      result = await session.prepareFrameworkLinks({
        protocol: 1,
        graphFingerprint: options.graphFingerprint,
        mapPosture: options.mapPosture,
        policy: options.policy,
        modules: observed.map(({ loaded: _loaded, ...module }) => module),
      });
    } catch (cause) {
      throw frameworkLinkError("AOT framework-link preparation failed before the plan could be armed.", undefined, cause);
    }
    validatePreparedFrameworkLinksResult(result);
    if (result.disposition === "c0-fallback") {
      this.#applyFallback(state, observed, result.reason);
      return;
    }

    const artifactsById = new Map<string, AotLinkedFrameworkModuleArtifact>();
    for (const artifact of result.modules) {
      const key = sourcePathKey(artifact.resolvedId);
      if (artifactsById.has(key)) {
        throw frameworkLinkError(`Framework-link recipe returned duplicate artifact '${artifact.resolvedId}'.`, artifact.resolvedId);
      }
      artifactsById.set(key, artifact);
    }

    const armed: Array<AppliedFrameworkLinkModule | ObservedFrameworkLinkModule> = [];
    const modulesById = new Map<string, AppliedFrameworkLinkModule | ObservedFrameworkLinkModule>();
    const targetsById = new Map<string, AppliedFrameworkLinkModule>();
    for (const module of observed) {
      const key = sourcePathKey(module.resolvedId);
      const artifact = artifactsById.get(key) ?? null;
      if (module.role === "guard") {
        if (artifact != null) {
          throw frameworkLinkError(
            `Framework-link recipe returned an artifact for guard-only module '${module.packageName}/${module.packageRelativePath}'.`,
            module.resolvedId,
          );
        }
        armed.push(module);
        modulesById.set(key, module);
        continue;
      }
      if (artifact == null) {
        throw frameworkLinkError(
          `Framework-link recipe omitted target '${module.packageName}/${module.packageRelativePath}'.`,
          module.resolvedId,
        );
      }
      validateLinkedFrameworkModuleArtifact(artifact, module, options.mapPosture);
      const applied: AppliedFrameworkLinkModule = { ...module, artifact };
      armed.push(applied);
      modulesById.set(key, applied);
      targetsById.set(key, applied);
      artifactsById.delete(key);
    }
    if (artifactsById.size > 0) {
      throw frameworkLinkError(
        `Framework-link recipe returned artifact(s) outside the prepared target set: ${[...artifactsById.keys()].join(", ")}.`,
      );
    }
    state.prepared = {
      disposition: "applied",
      options,
      recipeFingerprint: result.recipeFingerprint,
      modules: armed,
      modulesById,
      targetsById,
    };
  }

  #applyFallback(
    state: FrameworkLinkEnvironmentState,
    modules: readonly ObservedFrameworkLinkModule[],
    reason: AotFrameworkLinksC0FallbackReason,
  ): void {
    validateFrameworkLinkFallbackReason(reason);
    if (this.#options.policy === "require-applied") {
      throw frameworkLinkError(`Exact-fingerprinted framework linking is required: ${reason.summary}`);
    }
    state.prepared = {
      disposition: "c0-fallback",
      options: this.#options,
      reason,
      modules,
    };
  }

  #finalizeConsumption(state: FrameworkLinkEnvironmentState): void {
    const prepared = state.prepared;
    if (prepared == null || prepared.disposition === "c0-fallback") return;
    const targets = prepared.modules.filter((module) => module.role === "target");
    const consumed = targets.filter((module) => module.loaded);
    if (consumed.length === targets.length) return;
    if (consumed.length > 0) {
      throw frameworkLinkError(
        `Framework-link plan consumed ${consumed.length} of ${targets.length} target modules; partial linkage cannot fall back to C0.`,
      );
    }
    const reason: AotFrameworkLinksC0FallbackReason = {
      kind: "target-unreached",
      summary: `None of the ${targets.length} prepared framework-link target modules entered the module graph.`,
    };
    if (prepared.options.policy === "require-applied") {
      throw frameworkLinkError(`Exact-fingerprinted framework linking is required: ${reason.summary}`);
    }
    state.prepared = {
      disposition: "c0-fallback",
      options: prepared.options,
      reason,
      modules: prepared.modules,
    };
  }
}

export function normalizeFrameworkLinksOptions(input: AotFrameworkLinksOptions): AotFrameworkLinksOptions {
  if (input.protocol !== 1) {
    throw frameworkLinkError(`Unsupported framework-link protocol '${String(input.protocol)}'.`);
  }
  assertSha256(input.graphFingerprint, "framework graph fingerprint");
  if (input.mapPosture !== "performance-no-map" && input.mapPosture !== "mapped") {
    throw frameworkLinkError(`Unsupported framework-link map posture '${String(input.mapPosture)}'.`);
  }
  if (input.policy !== "require-applied" && input.policy !== "allow-c0-fallback") {
    throw frameworkLinkError(`Unsupported framework-link policy '${String(input.policy)}'.`);
  }
  if (input.modules.length === 0) {
    throw frameworkLinkError("Framework-link options require at least one module.");
  }
  const ids = new Set<string>();
  const identities = new Set<string>();
  const modules = input.modules.map((module): AotFrameworkLinkModuleInput => {
    if (module == null || typeof module !== "object") {
      throw frameworkLinkError("Framework-link options contain a non-object module.");
    }
    if (module.role !== "target" && module.role !== "guard") {
      throw frameworkLinkError(`Unsupported framework-link module role '${String(module.role)}'.`);
    }
    if (
      typeof module.packageName !== "string"
      || (module.packageName !== "aurelia" && !module.packageName.startsWith("@aurelia/"))
    ) {
      throw frameworkLinkError(`Invalid framework-link package '${String(module.packageName)}'.`);
    }
    const packageRelativePath = normalizePackageRelativePath(module.packageRelativePath, module.packageName);
    if (
      typeof module.resolvedId !== "string"
      || !path.isAbsolute(module.resolvedId)
      || module.resolvedId.includes("\0")
      || /[?#]/u.test(module.resolvedId)
    ) {
      throw frameworkLinkError(`Framework-link module '${module.packageName}' has a non-exact resolved id.`);
    }
    assertSha256(module.expectedSha256, `${module.packageName} expected input`);
    const resolvedId = path.resolve(module.resolvedId);
    const idKey = sourcePathKey(resolvedId);
    const identityKey = `${module.packageName}\0${packageRelativePath}`;
    if (ids.has(idKey)) throw frameworkLinkError(`Framework-link options repeat resolved id '${resolvedId}'.`, resolvedId);
    if (identities.has(identityKey)) {
      throw frameworkLinkError(`Framework-link options repeat '${module.packageName}/${packageRelativePath}'.`, resolvedId);
    }
    ids.add(idKey);
    identities.add(identityKey);
    return {
      role: module.role,
      packageName: module.packageName,
      packageRelativePath,
      resolvedId,
      expectedSha256: module.expectedSha256,
    };
  }).sort(compareFrameworkLinkModule);
  if (!modules.some((module) => module.role === "target")) {
    throw frameworkLinkError("Framework-link options require at least one target module.");
  }
  return {
    protocol: 1,
    graphFingerprint: input.graphFingerprint,
    mapPosture: input.mapPosture,
    policy: input.policy,
    modules,
  };
}

export function sourcePathKey(value: string): string {
  const slash = value.replaceAll("\\", "/");
  return /^[A-Za-z]:\//u.test(slash)
    ? path.win32.normalize(value).replaceAll("\\", "/").toLowerCase()
    : path.posix.normalize(slash);
}

async function readObservedFrameworkModule(
  module: AotFrameworkLinkModuleInput,
): Promise<ObservedFrameworkLinkModule> {
  let bytes: Buffer;
  try {
    bytes = await readFile(module.resolvedId);
  } catch (cause) {
    throw frameworkLinkError(
      `Cannot read exact framework module '${module.packageName}/${module.packageRelativePath}' at '${module.resolvedId}'.`,
      module.resolvedId,
      cause,
    );
  }
  const code = bytes.toString("utf8");
  if (!Buffer.from(code, "utf8").equals(bytes)) {
    throw frameworkLinkError(`Framework module '${module.resolvedId}' is not canonical UTF-8 JavaScript.`, module.resolvedId);
  }
  return {
    ...module,
    observedSha256: sha256(bytes),
    code,
    loaded: false,
  };
}

function validatePreparedFrameworkLinksResult(
  result: AotPreparedFrameworkLinksResult,
): void {
  if (result == null || typeof result !== "object") {
    throw frameworkLinkError("AOT framework-link preparation returned no result object.");
  }
  if (result.disposition === "c0-fallback") {
    validateFrameworkLinkFallbackReason(result.reason);
    return;
  }
  if (result.disposition !== "applied") {
    throw frameworkLinkError("AOT framework-link preparation returned an unknown disposition.");
  }
  assertSha256(result.recipeFingerprint, "framework-link recipe fingerprint");
  if (!Array.isArray(result.modules)) {
    throw frameworkLinkError("Applied framework-link result omitted module artifacts.");
  }
}

function validateLinkedFrameworkModuleArtifact(
  artifact: AotLinkedFrameworkModuleArtifact,
  module: ObservedFrameworkLinkModule,
  mapPosture: AotFrameworkLinksOptions["mapPosture"],
): void {
  if (artifact == null || typeof artifact !== "object") {
    throw frameworkLinkError(`Framework target '${module.resolvedId}' returned no artifact object.`, module.resolvedId);
  }
  if (
    artifact.packageName !== module.packageName
    || artifact.packageRelativePath !== module.packageRelativePath
    || sourcePathKey(artifact.resolvedId) !== sourcePathKey(module.resolvedId)
  ) {
    throw frameworkLinkError(`Framework-link artifact identity does not match target '${module.resolvedId}'.`, module.resolvedId);
  }
  if (artifact.inputSha256 !== module.observedSha256) {
    throw frameworkLinkError(`Framework-link artifact input digest does not match '${module.resolvedId}'.`, module.resolvedId);
  }
  if (typeof artifact.code !== "string") {
    throw frameworkLinkError(`Framework-link artifact for '${module.resolvedId}' returned non-string code.`, module.resolvedId);
  }
  assertSha256(artifact.linkedSha256, `linked framework module '${module.resolvedId}'`);
  if (sha256(artifact.code) !== artifact.linkedSha256) {
    throw frameworkLinkError(`Framework-link artifact output digest does not match '${module.resolvedId}'.`, module.resolvedId);
  }
  if (artifact.map === undefined) {
    throw frameworkLinkError(`Framework-link artifact for '${module.resolvedId}' omitted its map result.`, module.resolvedId);
  }
  if (mapPosture === "mapped" && !isUsableFrameworkLinkSourceMap(artifact.map)) {
    throw frameworkLinkError(`Mapped framework-link artifact for '${module.resolvedId}' returned no usable source map.`, module.resolvedId);
  }
}

function isUsableFrameworkLinkSourceMap(value: AotLinkedFrameworkModuleArtifact["map"]): boolean {
  let map: unknown = value;
  if (typeof map === "string") {
    try {
      map = JSON.parse(map) as unknown;
    } catch {
      return false;
    }
  }
  return map != null
    && typeof map === "object"
    && "mappings" in map
    && typeof map.mappings === "string"
    && "sources" in map
    && Array.isArray(map.sources)
    && map.sources.length > 0
    && map.sources.every((source) => typeof source === "string" && source.length > 0);
}

function validateFrameworkLinkFallbackReason(reason: AotFrameworkLinksC0FallbackReason): void {
  if (reason == null || typeof reason !== "object") {
    throw frameworkLinkError("Framework-link C0 fallback omitted its typed reason.");
  }
  if (
    reason.kind !== "input-hash-mismatch"
    && reason.kind !== "map-unavailable"
    && reason.kind !== "recipe-unavailable"
    && reason.kind !== "target-unreached"
    && reason.kind !== "unsupported-input"
  ) {
    throw frameworkLinkError(`Framework-link C0 fallback returned unknown reason '${String(reason.kind)}'.`);
  }
  if (typeof reason.summary !== "string" || reason.summary.trim().length === 0) {
    throw frameworkLinkError("Framework-link C0 fallback returned a blank summary.");
  }
}

function normalizePackageRelativePath(value: string, packageName: string): string {
  if (typeof value !== "string") {
    throw frameworkLinkError(`Framework-link package '${packageName}' has a non-string package path.`);
  }
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//u, "");
  if (
    normalized.length === 0
    || normalized.startsWith("/")
    || /^[A-Za-z]:/u.test(normalized)
    || normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw frameworkLinkError(`Framework-link package '${packageName}' has invalid package path '${value}'.`);
  }
  return normalized;
}

function compareFrameworkLinkModule(
  left: Pick<AotFrameworkLinkModuleInput, "packageName" | "packageRelativePath" | "role">,
  right: Pick<AotFrameworkLinkModuleInput, "packageName" | "packageRelativePath" | "role">,
): number {
  return left.packageName.localeCompare(right.packageName)
    || left.packageRelativePath.localeCompare(right.packageRelativePath)
    || left.role.localeCompare(right.role);
}

function frameworkLinksReceipt(state: PreparedFrameworkLinksState): AotFrameworkLinksReceipt {
  const options = state.options;
  if (
    state.disposition === "applied"
    && state.modules.some((module) => module.role === "target" && !module.loaded)
  ) {
    throw frameworkLinkError("Framework-link receipt cannot label an unconsumed target as applied.");
  }
  const modules = state.modules.map((module) => {
    const artifact = state.disposition === "applied" && module.role === "target"
      ? state.targetsById.get(sourcePathKey(module.resolvedId))?.artifact ?? null
      : null;
    return {
      role: module.role,
      packageName: module.packageName,
      packageRelativePath: module.packageRelativePath,
      expectedSha256: module.expectedSha256,
      observedSha256: module.observedSha256,
      linkedSha256: artifact?.linkedSha256 ?? null,
      disposition: state.disposition === "c0-fallback"
        ? "c0-fallback" as const
        : module.role === "guard"
          ? "guard-verified" as const
          : "applied" as const,
      loaded: module.loaded,
      map: artifact?.map == null ? "none" as const : "mapped" as const,
    };
  }).sort(compareFrameworkLinkModule);
  return {
    version: 1,
    protocol: 1,
    graphFingerprint: options.graphFingerprint,
    mapPosture: options.mapPosture,
    policy: options.policy,
    disposition: state.disposition,
    recipeFingerprint: state.disposition === "applied" ? state.recipeFingerprint : null,
    reason: state.disposition === "c0-fallback" ? state.reason : null,
    modules,
  };
}

function assertSha256(value: string, label: string): void {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    throw frameworkLinkError(`Invalid SHA-256 for ${label}.`);
  }
}

function sha256(value: BinaryLike): string {
  return createHash("sha256").update(value).digest("hex");
}

function frameworkLinkError(message: string, sourcePath?: string, cause?: unknown): AotViteError {
  return new AotViteError("AOT_VITE_FRAMEWORK_LINK_FAILED", message, sourcePath, cause);
}
