/**
 * Aurelia Vite Plugin - Default Values and Normalization
 *
 * This file contains:
 * 1. Default values for all option groups
 * 2. Normalization functions (expand booleans → objects)
 * 3. Type guards for runtime checks
 * 4. Config file loading utilities
 *
 * @module @aurelia-ls/vite-plugin
 */

import type {
  // User-facing types
  AureliaPluginOptions,
  AureliaConfig,
  SSROptions,
  CompilerOptions,
  DebugOptions,
  ExperimentalOptions,
  PluginHooks,
  HMROptions,
  SSRManifestOptions,
  SSRHydrationOptions,
  ThirdPartyOptions,
  ThirdPartyPackageSpec,
  ThirdPartyPolicy,
  TraceOptions,
  DebugChannel,
  // Resolved types
  ResolvedAureliaOptions,
  ResolvedHMROptions,
  ResolvedSSRConfig,
  ResolvedConventionOptions,
  ResolvedDebugOptions,
  ResolvedTraceOptions,
  StateProvider,
} from "./types.js";
import type { ResolvedSSGOptions } from "@aurelia-ls/ssg";
import type {
  ConventionConfig,
  DirectoryConventionConfig,
  StylesheetPairingConfig,
  SuffixConfig,
  TemplatePairingConfig,
} from "@aurelia-ls/compiler/project-semantics/conventions/types.js";
import { DEFAULT_CONVENTION_CONFIG, DEFAULT_SUFFIXES } from "@aurelia-ls/compiler/project-semantics/conventions/aurelia-defaults.js";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve as resolvePath } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default HMR options.
 */
export const DEFAULT_HMR_OPTIONS: ResolvedHMROptions = {
  enabled: true,
  preserveState: true,
  log: false,
};

/**
 * Default state provider (returns empty object).
 */
export const DEFAULT_STATE_PROVIDER: StateProvider = () => ({});

/**
 * Default HTML shell for SSR.
 */
export const DEFAULT_HTML_SHELL = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aurelia App</title>
</head>
<body>
  <!--ssr-outlet-->
</body>
</html>`;

/**
 * Default SSR manifest options.
 */
export const DEFAULT_SSR_MANIFEST_OPTIONS: Required<SSRManifestOptions> = {
  inline: true,
  compress: false,
  debug: false,
};

/**
 * Default SSR hydration options.
 */
export const DEFAULT_SSR_HYDRATION_OPTIONS: Required<SSRHydrationOptions> = {
  strategy: "eager",
  timeout: 10000,
  validate: true,
};

/**
 * Default SSR options.
 */
export const DEFAULT_SSR_OPTIONS: ResolvedSSRConfig = {
  enabled: false,
  state: DEFAULT_STATE_PROVIDER,
  stripMarkers: false,
  include: ["**"],
  exclude: ["/api/**", "/@vite/**", "/@fs/**", "/__vite_ping", "/node_modules/**"],
  htmlShell: DEFAULT_HTML_SHELL,
  baseHref: "/",
  ssrEntry: null,
  register: null,
  defines: {},
  manifest: DEFAULT_SSR_MANIFEST_OPTIONS,
  hydration: DEFAULT_SSR_HYDRATION_OPTIONS,
};

/**
 * Default SSG options.
 */
export const DEFAULT_SSG_OPTIONS: ResolvedSSGOptions = {
  enabled: false,
  entryPoints: [],
  outDir: ".",
  fallback: "404.html",
  additionalRoutes: undefined,
  onBeforeRender: undefined,
  onAfterRender: undefined,
};

/**
 * Default template pairing options.
 */
export const DEFAULT_TEMPLATE_PAIRING_OPTIONS: TemplatePairingConfig = {
  preferSibling: false,
};

/**
 * Default stylesheet pairing options.
 */
export const DEFAULT_STYLESHEET_PAIRING_OPTIONS: StylesheetPairingConfig = {
  injection: "shadow",
};

/**
 * Default third-party options.
 */
export const DEFAULT_THIRD_PARTY_OPTIONS: {
  scan: boolean;
  packages: Array<string | ThirdPartyPackageSpec>;
  policy?: ThirdPartyPolicy;
  resources: NonNullable<ThirdPartyOptions["resources"]>;
} = {
  scan: true,
  packages: [],
  policy: undefined,
  resources: {
    elements: {},
    attributes: {},
    valueConverters: [],
    bindingBehaviors: [],
  },
};

/**
 * Default convention options.
 *
 * Uses DEFAULT_CONVENTION_CONFIG from project semantics as the base,
 * plus vite-plugin specific thirdParty options.
 */
export const DEFAULT_CONVENTION_OPTIONS: ResolvedConventionOptions = {
  enabled: DEFAULT_CONVENTION_CONFIG.enabled ?? true,
  config: {
    enabled: DEFAULT_CONVENTION_CONFIG.enabled ?? true,
    suffixes: DEFAULT_SUFFIXES,
    filePatterns: DEFAULT_CONVENTION_CONFIG.filePatterns ?? {},
    viewModelExtensions: DEFAULT_CONVENTION_CONFIG.viewModelExtensions ?? [".ts", ".js"],
    templateExtensions: DEFAULT_CONVENTION_CONFIG.templateExtensions ?? [".html"],
    styleExtensions: DEFAULT_CONVENTION_CONFIG.styleExtensions ?? [".css", ".scss"],
    directories: {},
    templatePairing: DEFAULT_TEMPLATE_PAIRING_OPTIONS,
    stylesheetPairing: DEFAULT_STYLESHEET_PAIRING_OPTIONS,
  },
  thirdParty: DEFAULT_THIRD_PARTY_OPTIONS,
};

/**
 * Default compiler options.
 */
export const DEFAULT_COMPILER_OPTIONS: Required<CompilerOptions> = {
  strict: false,
  templateExtensions: [".html"],
  deprecationWarnings: true,
  attributeAliases: {},
};

/**
 * Default trace options.
 */
export const DEFAULT_TRACE_OPTIONS: ResolvedTraceOptions = {
  enabled: false,
  output: "console",
  minDurationNs: 0n,
  file: null,
  includeEvents: true,
  summary: true,
};

/**
 * All available debug channels.
 */
export const ALL_DEBUG_CHANNELS: readonly DebugChannel[] = [
  "lower",
  "link",
  "bind",
  "typecheck",
  "aot",
  "overlay",
  "ssr",
  "transform",
  "project",
  "workspace",
  "vite",
];

/**
 * Default debug options.
 */
export const DEFAULT_DEBUG_OPTIONS: ResolvedDebugOptions = {
  channels: [],
  trace: DEFAULT_TRACE_OPTIONS,
  dumpArtifacts: false,
};

/**
 * Default experimental options (all disabled).
 */
export const DEFAULT_EXPERIMENTAL_OPTIONS: ExperimentalOptions = {
  incrementalCompilation: false,
};

/**
 * Default plugin hooks (all undefined).
 */
export const DEFAULT_HOOKS: PluginHooks = {};

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Normalize HMR options.
 * Expands `true` to default options, `false` to disabled.
 */
export function normalizeHMROptions(
  options: boolean | HMROptions | undefined,
): Required<HMROptions> {
  if (options === undefined || options === true) {
    return { ...DEFAULT_HMR_OPTIONS };
  }
  if (options === false) {
    return { ...DEFAULT_HMR_OPTIONS, enabled: false };
  }
  return {
    enabled: options.enabled ?? DEFAULT_HMR_OPTIONS.enabled,
    preserveState: options.preserveState ?? DEFAULT_HMR_OPTIONS.preserveState,
    log: options.log ?? DEFAULT_HMR_OPTIONS.log,
  };
}


/**
 * Normalize SSR manifest options.
 */
export function normalizeSSRManifestOptions(
  options: SSRManifestOptions | undefined,
  isDev: boolean,
): Required<SSRManifestOptions> {
  return {
    inline: options?.inline ?? DEFAULT_SSR_MANIFEST_OPTIONS.inline,
    compress: options?.compress ?? DEFAULT_SSR_MANIFEST_OPTIONS.compress,
    debug: options?.debug ?? isDev, // Default to true in dev mode
  };
}

/**
 * Normalize SSR hydration options.
 */
export function normalizeSSRHydrationOptions(
  options: SSRHydrationOptions | undefined,
  isDev: boolean,
): Required<SSRHydrationOptions> {
  return {
    strategy: options?.strategy ?? DEFAULT_SSR_HYDRATION_OPTIONS.strategy,
    timeout: options?.timeout ?? DEFAULT_SSR_HYDRATION_OPTIONS.timeout,
    validate: options?.validate ?? isDev, // Default to true in dev mode
  };
}

/**
 * Normalize SSR options.
 */
export function normalizeSSROptions(
  options: boolean | SSROptions | undefined,
  isDev: boolean,
): ResolvedSSRConfig {
  if (options === undefined || options === false) {
    return { ...DEFAULT_SSR_OPTIONS };
  }
  if (options === true) {
    return {
      ...DEFAULT_SSR_OPTIONS,
      enabled: true,
      manifest: normalizeSSRManifestOptions(undefined, isDev),
      hydration: normalizeSSRHydrationOptions(undefined, isDev),
    };
  }
  return {
    enabled: options.enabled ?? true, // If object provided, assume enabled
    state: options.state ?? DEFAULT_SSR_OPTIONS.state,
    stripMarkers: options.stripMarkers ?? DEFAULT_SSR_OPTIONS.stripMarkers,
    include: options.include ?? DEFAULT_SSR_OPTIONS.include,
    exclude: options.exclude ?? DEFAULT_SSR_OPTIONS.exclude,
    htmlShell: options.htmlShell ?? DEFAULT_SSR_OPTIONS.htmlShell,
    baseHref: options.baseHref ?? DEFAULT_SSR_OPTIONS.baseHref,
    ssrEntry: options.ssrEntry ?? DEFAULT_SSR_OPTIONS.ssrEntry,
    register: options.register ?? null,
    defines: options.defines ?? DEFAULT_SSR_OPTIONS.defines,
    manifest: normalizeSSRManifestOptions(options.manifest, isDev),
    hydration: normalizeSSRHydrationOptions(options.hydration, isDev),
  };
}

/**
 * Normalize SSG options.
 */
export function normalizeSSGOptions(
  options: boolean | import("@aurelia-ls/ssg").SSGOptions | undefined,
): ResolvedSSGOptions {
  if (options === undefined || options === false) {
    return { ...DEFAULT_SSG_OPTIONS };
  }
  if (options === true) {
    return { ...DEFAULT_SSG_OPTIONS, enabled: true };
  }
  return {
    enabled: options.enabled ?? true, // If object provided, assume enabled
    entryPoints: options.entryPoints ?? DEFAULT_SSG_OPTIONS.entryPoints,
    outDir: options.outDir ?? DEFAULT_SSG_OPTIONS.outDir,
    fallback: options.fallback ?? DEFAULT_SSG_OPTIONS.fallback,
    additionalRoutes: options.additionalRoutes,
    onBeforeRender: options.onBeforeRender,
    onAfterRender: options.onAfterRender,
  };
}

/**
 * Normalize convention options.
 *
 * Converts user-provided ConventionConfig (from compiler project-semantics)
 * to the internal ResolvedConventionOptions structure.
 */
export function normalizeConventionOptions(
  options: ConventionConfig | undefined,
  thirdParty?: ThirdPartyOptions,
): ResolvedConventionOptions {
  if (!options && !thirdParty) {
    return { ...DEFAULT_CONVENTION_OPTIONS };
  }

  const defaultConfig = DEFAULT_CONVENTION_OPTIONS.config;

  return {
    enabled: options?.enabled ?? true,
    config: {
      enabled: options?.enabled ?? true,
      suffixes: options?.suffixes ?? defaultConfig.suffixes,
      filePatterns: options?.filePatterns ?? defaultConfig.filePatterns,
      viewModelExtensions: options?.viewModelExtensions ?? defaultConfig.viewModelExtensions,
      templateExtensions: options?.templateExtensions ?? defaultConfig.templateExtensions,
      styleExtensions: options?.styleExtensions ?? defaultConfig.styleExtensions,
      directories: options?.directories ?? defaultConfig.directories,
      templatePairing: {
        preferSibling:
          options?.templatePairing?.preferSibling ?? DEFAULT_TEMPLATE_PAIRING_OPTIONS.preferSibling,
      },
      stylesheetPairing: {
        injection:
          options?.stylesheetPairing?.injection ?? DEFAULT_STYLESHEET_PAIRING_OPTIONS.injection,
      },
    },
    thirdParty: {
      scan: thirdParty?.scan ?? DEFAULT_THIRD_PARTY_OPTIONS.scan,
      packages: thirdParty?.packages ?? DEFAULT_THIRD_PARTY_OPTIONS.packages,
      policy: thirdParty?.policy ?? DEFAULT_THIRD_PARTY_OPTIONS.policy,
      resources: {
        elements: thirdParty?.resources?.elements ?? {},
        attributes: thirdParty?.resources?.attributes ?? {},
        valueConverters: thirdParty?.resources?.valueConverters ?? [],
        bindingBehaviors: thirdParty?.resources?.bindingBehaviors ?? [],
      },
    },
  };
}

/**
 * Normalize compiler options.
 */
export function normalizeCompilerOptions(
  options: CompilerOptions | undefined,
): Required<CompilerOptions> {
  if (!options) {
    return { ...DEFAULT_COMPILER_OPTIONS };
  }
  return {
    strict: options.strict ?? DEFAULT_COMPILER_OPTIONS.strict,
    templateExtensions: options.templateExtensions ?? DEFAULT_COMPILER_OPTIONS.templateExtensions,
    deprecationWarnings:
      options.deprecationWarnings ?? DEFAULT_COMPILER_OPTIONS.deprecationWarnings,
    attributeAliases: options.attributeAliases ?? DEFAULT_COMPILER_OPTIONS.attributeAliases,
  };
}

/**
 * Normalize trace options.
 */
export function normalizeTraceOptions(
  options: boolean | TraceOptions | undefined,
  projectRoot: string,
): ResolvedTraceOptions {
  // Check environment variable
  const envTrace = process.env["AURELIA_TRACE"];
  const envEnabled = envTrace === "1" || envTrace === "true";

  if (options === undefined || options === false) {
    if (envEnabled) {
      return { ...DEFAULT_TRACE_OPTIONS, enabled: true };
    }
    return { ...DEFAULT_TRACE_OPTIONS };
  }
  if (options === true) {
    return { ...DEFAULT_TRACE_OPTIONS, enabled: true };
  }

  const enabled = options.enabled ?? true; // If object provided, assume enabled
  const minDuration = options.minDuration ?? 0;

  return {
    enabled,
    output: options.output ?? DEFAULT_TRACE_OPTIONS.output,
    minDurationNs: BigInt(minDuration) * 1_000_000n, // Convert ms to ns
    file:
      options.output === "json"
        ? options.file
          ? `${projectRoot}/${options.file}`
          : `${projectRoot}/aurelia-trace.json`
        : null,
    includeEvents: options.includeEvents ?? DEFAULT_TRACE_OPTIONS.includeEvents,
    summary: options.summary ?? DEFAULT_TRACE_OPTIONS.summary,
  };
}

/**
 * Normalize debug channels.
 */
export function normalizeDebugChannels(
  options: boolean | DebugChannel[] | undefined,
): DebugChannel[] {
  // Check environment variable
  const envChannels = process.env["AURELIA_DEBUG"];
  if (envChannels) {
    return envChannels.split(",").filter((c): c is DebugChannel =>
      ALL_DEBUG_CHANNELS.includes(c as DebugChannel),
    );
  }

  if (options === undefined || options === false) {
    return [];
  }
  if (options === true) {
    return [...ALL_DEBUG_CHANNELS];
  }
  return options;
}

/**
 * Normalize debug options.
 */
export function normalizeDebugOptions(
  options: DebugOptions | undefined,
  projectRoot: string,
): ResolvedDebugOptions {
  if (!options) {
    return {
      ...DEFAULT_DEBUG_OPTIONS,
      channels: normalizeDebugChannels(undefined),
      trace: normalizeTraceOptions(undefined, projectRoot),
    };
  }
  return {
    channels: normalizeDebugChannels(options.channels),
    trace: normalizeTraceOptions(options.trace, projectRoot),
    dumpArtifacts:
      options.dumpArtifacts === true
        ? `${projectRoot}/.aurelia-debug/`
        : options.dumpArtifacts === false || options.dumpArtifacts === undefined
          ? false
          : options.dumpArtifacts,
  };
}

// ============================================================================
// Main Normalization
// ============================================================================

/**
 * Options for normalization.
 */
export interface NormalizeOptionsContext {
  /** Vite command ('serve' | 'build') */
  command: "serve" | "build";
  /** Vite mode (e.g., 'development', 'production') */
  mode: string;
  /** Project root directory */
  root: string;
}

/**
 * Normalize plugin options.
 * Applies defaults and expands boolean flags to full option objects.
 *
 * @param options - User-provided options
 * @param context - Normalization context (Vite command, mode, root)
 * @returns Fully resolved options
 */
export function normalizeOptions(
  options: AureliaPluginOptions | undefined,
  context: NormalizeOptionsContext,
): Omit<ResolvedAureliaOptions, "projectSemantics" | "routeTree"> {
  const isDev = context.command === "serve";
  const opts = options ?? {};
  const packagePath = opts.packagePath
    ? resolvePath(context.root, opts.packagePath)
    : context.root;
  const packageRoots = opts.packageRoots
    ? normalizePackageRoots(opts.packageRoots, context.root)
    : undefined;

  return {
    entry: opts.entry ?? "./src/my-app.html",
    tsconfig: opts.tsconfig ?? null,
    packagePath,
    packageRoots,
    useDev: opts.useDev ?? isDev, // Default: true in dev, false in production
    hmr: normalizeHMROptions(opts.hmr),
    ssr: normalizeSSROptions(opts.ssr, isDev),
    ssg: normalizeSSGOptions(opts.ssg),
    conventions: normalizeConventionOptions(opts.conventions, opts.thirdParty),
    compiler: normalizeCompilerOptions(opts.compiler),
    debug: normalizeDebugOptions(opts.debug, context.root),
    experimental: { ...DEFAULT_EXPERIMENTAL_OPTIONS, ...opts.experimental },
    hooks: { ...DEFAULT_HOOKS, ...opts.hooks },
  };
}

function normalizePackageRoots(
  roots: Record<string, string>,
  baseDir: string,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(roots)) {
    normalized[name] = resolvePath(baseDir, value);
  }
  return normalized;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is an SSROptions object (not a boolean).
 */
export function isSSROptionsObject(
  value: boolean | SSROptions | undefined,
): value is SSROptions {
  return typeof value === "object" && value !== null;
}

/**
 * Check if value is a TraceOptions object (not a boolean).
 */
export function isTraceOptionsObject(
  value: boolean | TraceOptions | undefined,
): value is TraceOptions {
  return typeof value === "object" && value !== null;
}

/**
 * Check if SSR is enabled in options.
 */
export function isSSREnabled(options: AureliaPluginOptions | undefined): boolean {
  if (!options?.ssr) return false;
  if (options.ssr === true) return true;
  return options.ssr.enabled !== false;
}

/**
 * Check if SSG is enabled in options.
 */
export function isSSGEnabled(options: AureliaPluginOptions | undefined): boolean {
  if (!options?.ssg) return false;
  if (options.ssg === true) return true;
  return options.ssg.enabled !== false;
}

// ============================================================================
// Config File Loading
// ============================================================================

/**
 * Config file names to search for, in priority order.
 */
export const CONFIG_FILE_NAMES = [
  "aurelia.config.ts",
  "aurelia.config.js",
  "aurelia.config.mjs",
  "aurelia.config.cjs",
] as const;

const CONFIG_EXTENSIONS = [".ts", ".js", ".mjs", ".cjs"] as const;

/**
 * Load Aurelia config from file.
 * Searches for config files walking up from `searchFrom` to `root`.
 *
 * @param root - Workspace root directory
 * @param searchFrom - Entry/tsconfig path to start searching from
 * @returns Loaded config or null if no config file found
 */
export async function loadConfigFile(
  root: string,
  searchFrom?: string,
): Promise<AureliaConfig | null> {
  const rootDir = resolvePath(root);
  const startDir = resolveSearchDir(rootDir, searchFrom);
  const configPath = findConfigFile(startDir, rootDir);
  if (!configPath) {
    return null;
  }

  const visited = new Set<string>();
  return loadConfigWithExtends(configPath, visited);
}

function resolveSearchDir(rootDir: string, searchFrom?: string): string {
  if (!searchFrom) {
    return rootDir;
  }

  const resolved = resolvePath(searchFrom);
  if (existsSync(resolved)) {
    const stat = statSync(resolved);
    if (stat.isFile()) {
      return dirname(resolved);
    }
  }
  return resolved;
}

function findConfigFile(startDir: string, rootDir: string): string | null {
  let current = startDir;
  const stop = resolvePath(rootDir);

  while (true) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = join(current, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    if (current === stop) {
      break;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
}

async function loadConfigWithExtends(
  configPath: string,
  visited: Set<string>,
): Promise<AureliaConfig | null> {
  const resolvedPath = resolvePath(configPath);
  if (visited.has(resolvedPath)) {
    throw new Error(`Circular config extends detected: ${[...visited, resolvedPath].join(" -> ")}`);
  }
  visited.add(resolvedPath);

  const config = await loadConfigModule(resolvedPath);
  if (!config) {
    return null;
  }

  if (!config.extends) {
    return config;
  }

  const baseConfig = await loadExtendedConfig(config.extends, dirname(resolvedPath), visited);
  return mergeConfigs(baseConfig, config);
}

async function loadExtendedConfig(
  specifier: string,
  baseDir: string,
  visited: Set<string>,
): Promise<AureliaConfig | null> {
  const resolved = resolveExtendsSpecifier(specifier, baseDir);
  if (!resolved) {
    return null;
  }

  if (existsSync(resolved) && statSync(resolved).isDirectory()) {
    const configPath = findConfigFile(resolved, resolved);
    if (!configPath) {
      return null;
    }
    return loadConfigWithExtends(configPath, visited);
  }

  if (existsSync(resolved)) {
    return loadConfigWithExtends(resolved, visited);
  }

  // Try adding extensions when given a path without extension.
  if (!extname(resolved)) {
    for (const ext of CONFIG_EXTENSIONS) {
      const candidate = resolved + ext;
      if (existsSync(candidate)) {
        return loadConfigWithExtends(candidate, visited);
      }
    }
  }

  return null;
}

function resolveExtendsSpecifier(specifier: string, baseDir: string): string | null {
  const isPathLike =
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("\\");

  if (isPathLike) {
    return resolvePath(baseDir, specifier);
  }

  try {
    const require = createRequire(join(baseDir, "noop.js"));
    return require.resolve(specifier);
  } catch {
    return null;
  }
}

async function loadConfigModule(configPath: string): Promise<AureliaConfig | null> {
  const ext = extname(configPath).toLowerCase();
  const modulePath = ext === ".ts"
    ? await bundleConfig(configPath)
    : configPath;

  const mod = await import(pathToFileURL(modulePath).href);
  const raw = (mod?.default ?? mod?.config ?? mod) as unknown;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  return raw as AureliaConfig;
}

async function bundleConfig(configPath: string): Promise<string> {
  const cacheDir = join(dirname(configPath), ".aurelia-cache", "config");
  mkdirSync(cacheDir, { recursive: true });

  const source = readFileSync(configPath, "utf-8");
  const hash = createHash("sha256")
    .update(configPath)
    .update(source)
    .digest("hex")
    .slice(0, 8);
  const base = basename(configPath, extname(configPath));
  const outfile = join(cacheDir, `${base}.${hash}.mjs`);

  if (!existsSync(outfile)) {
    const esbuild = await import("esbuild");
    await esbuild.build({
      entryPoints: [configPath],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "es2022",
      outfile,
      sourcemap: false,
      logLevel: "silent",
    });
  }

  return outfile;
}

/**
 * Merge configs with proper precedence.
 * Inline options override config file options.
 *
 * @param fileConfig - Config from aurelia.config.js (lower priority)
 * @param inlineConfig - Inline options from vite.config.ts (higher priority)
 * @returns Merged config
 */
export function mergeConfigs(
  fileConfig: AureliaConfig | null,
  inlineConfig: AureliaPluginOptions,
): AureliaPluginOptions {
  if (!fileConfig) {
    return inlineConfig;
  }

  const merged: AureliaPluginOptions = {
    ...fileConfig,
    ...inlineConfig,
  };

  merged.ssr =
    typeof inlineConfig.ssr === "boolean" || typeof fileConfig.ssr === "boolean"
      ? inlineConfig.ssr ?? fileConfig.ssr
      : { ...(fileConfig.ssr as SSROptions), ...(inlineConfig.ssr as SSROptions) };

  merged.ssg =
    typeof inlineConfig.ssg === "boolean" || typeof fileConfig.ssg === "boolean"
      ? inlineConfig.ssg ?? fileConfig.ssg
      : { ...(fileConfig.ssg ?? {}), ...(inlineConfig.ssg ?? {}) };

  merged.conventions = { ...fileConfig.conventions, ...inlineConfig.conventions };

  merged.thirdParty = mergeThirdPartyOptions(fileConfig.thirdParty, inlineConfig.thirdParty);

  merged.compiler = { ...fileConfig.compiler, ...inlineConfig.compiler };
  merged.debug = { ...fileConfig.debug, ...inlineConfig.debug };
  merged.experimental = { ...fileConfig.experimental, ...inlineConfig.experimental };
  merged.hooks = { ...fileConfig.hooks, ...inlineConfig.hooks };

  merged.packagePath = inlineConfig.packagePath ?? fileConfig.packagePath;
  merged.packageRoots = inlineConfig.packageRoots ?? fileConfig.packageRoots;

  return merged;
}

function mergeThirdPartyOptions(
  base?: AureliaPluginOptions["thirdParty"],
  override?: AureliaPluginOptions["thirdParty"],
): AureliaPluginOptions["thirdParty"] {
  if (!base) return override;
  if (!override) return base;

  return {
    ...base,
    ...override,
    resources: {
      elements: { ...base.resources?.elements, ...override.resources?.elements },
      attributes: { ...base.resources?.attributes, ...override.resources?.attributes },
      valueConverters: mergeStringArray(base.resources?.valueConverters, override.resources?.valueConverters),
      bindingBehaviors: mergeStringArray(base.resources?.bindingBehaviors, override.resources?.bindingBehaviors),
    },
  };
}

function mergeStringArray(
  base?: string[],
  override?: string[],
): string[] | undefined {
  if (!base && !override) return undefined;
  const merged = [...(base ?? []), ...(override ?? [])];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of merged) {
    const key = entry.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}
