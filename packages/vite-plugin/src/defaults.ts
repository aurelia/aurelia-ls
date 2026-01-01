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
  DevOptions,
  BuildOptions,
  SSROptions,
  CompilerOptions,
  DebugOptions,
  ExperimentalOptions,
  PluginHooks,
  HMROptions,
  InspectorOptions,
  ErrorOverlayOptions,
  BundleAnalyzerOptions,
  SSRManifestOptions,
  SSRHydrationOptions,
  SSRStreamingOptions,
  ThirdPartyOptions,
  TraceOptions,
  DebugChannel,
  // Resolved types
  ResolvedAureliaOptions,
  ResolvedDevOptions,
  ResolvedBuildOptions,
  ResolvedSSRConfig,
  ResolvedConventionOptions,
  ResolvedDebugOptions,
  ResolvedTraceOptions,
  StateProvider,
} from "./types.js";
import type { ResolvedSSGOptions } from "@aurelia-ls/ssg";
import type {
  ConventionConfig,
  SuffixConfig,
  DirectoryConventionConfig,
  TemplatePairingConfig,
  StylesheetPairingConfig,
} from "@aurelia-ls/resolution";
import {
  DEFAULT_CONVENTION_CONFIG,
  DEFAULT_SUFFIXES,
} from "@aurelia-ls/resolution";

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default HMR options.
 */
export const DEFAULT_HMR_OPTIONS: Required<HMROptions> = {
  enabled: true,
  preserveState: true,
  log: false,
};

/**
 * Default inspector options.
 */
export const DEFAULT_INSPECTOR_OPTIONS: Required<InspectorOptions> = {
  enabled: true,
  toggleKeyCombo: "ctrl+shift+i",
  showBoundaries: true,
  openInEditor: true,
  editorUrl: "vscode://file/{file}:{line}:{column}",
};

/**
 * Default error overlay options.
 */
export const DEFAULT_ERROR_OVERLAY_OPTIONS: Required<ErrorOverlayOptions> = {
  enabled: true,
  elmStyle: true,
  showSource: true,
  showStack: false,
};

/**
 * Default development options.
 */
export const DEFAULT_DEV_OPTIONS: ResolvedDevOptions = {
  hmr: DEFAULT_HMR_OPTIONS,
  inspector: DEFAULT_INSPECTOR_OPTIONS,
  errorOverlay: DEFAULT_ERROR_OVERLAY_OPTIONS,
  clearScreen: false,
};

/**
 * Default bundle analyzer options.
 */
export const DEFAULT_BUNDLE_ANALYZER_OPTIONS: Required<BundleAnalyzerOptions> = {
  enabled: false,
  format: "html",
  outputFile: "bundle-analysis.html",
  openReport: false,
};

/**
 * Default build options.
 */
export const DEFAULT_BUILD_OPTIONS: ResolvedBuildOptions = {
  target: "browser",
  sourcemaps: true,
  minifyTemplates: true,
  analyze: DEFAULT_BUNDLE_ANALYZER_OPTIONS,
  stripDevCode: true,
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
 * Default SSR streaming options.
 */
export const DEFAULT_SSR_STREAMING_OPTIONS: Required<SSRStreamingOptions> = {
  enabled: false,
  chunkSize: 16384,
  firstByteTimeout: 5000,
};

/**
 * Default SSR options.
 */
export const DEFAULT_SSR_OPTIONS: ResolvedSSRConfig = {
  enabled: false,
  state: DEFAULT_STATE_PROVIDER,
  stripMarkers: false,
  include: ["**"],
  exclude: ["/api/**", "/@vite/**", "/@fs/**", "/__vite_ping"],
  htmlShell: DEFAULT_HTML_SHELL,
  baseHref: "/",
  ssrEntry: null,
  register: undefined,
  manifest: DEFAULT_SSR_MANIFEST_OPTIONS,
  hydration: DEFAULT_SSR_HYDRATION_OPTIONS,
  streaming: DEFAULT_SSR_STREAMING_OPTIONS,
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
export const DEFAULT_THIRD_PARTY_OPTIONS: Required<Omit<ThirdPartyOptions, "resources">> & {
  resources: NonNullable<ThirdPartyOptions["resources"]>;
} = {
  scan: false,
  packages: [],
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
 * Uses DEFAULT_CONVENTION_CONFIG from resolution as the base,
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
  "resolve",
  "bind",
  "typecheck",
  "aot",
  "overlay",
  "ssr",
  "transform",
  "resolution",
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
  bundleOptimization: false,
  incrementalCompilation: false,
  partialHydration: false,
  serverComponents: false,
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
 * Normalize inspector options.
 */
export function normalizeInspectorOptions(
  options: boolean | InspectorOptions | undefined,
): Required<InspectorOptions> {
  if (options === undefined || options === true) {
    return { ...DEFAULT_INSPECTOR_OPTIONS };
  }
  if (options === false) {
    return { ...DEFAULT_INSPECTOR_OPTIONS, enabled: false };
  }
  return {
    enabled: options.enabled ?? DEFAULT_INSPECTOR_OPTIONS.enabled,
    toggleKeyCombo: options.toggleKeyCombo ?? DEFAULT_INSPECTOR_OPTIONS.toggleKeyCombo,
    showBoundaries: options.showBoundaries ?? DEFAULT_INSPECTOR_OPTIONS.showBoundaries,
    openInEditor: options.openInEditor ?? DEFAULT_INSPECTOR_OPTIONS.openInEditor,
    editorUrl: options.editorUrl ?? DEFAULT_INSPECTOR_OPTIONS.editorUrl,
  };
}

/**
 * Normalize error overlay options.
 */
export function normalizeErrorOverlayOptions(
  options: boolean | ErrorOverlayOptions | undefined,
): Required<ErrorOverlayOptions> {
  if (options === undefined || options === true) {
    return { ...DEFAULT_ERROR_OVERLAY_OPTIONS };
  }
  if (options === false) {
    return { ...DEFAULT_ERROR_OVERLAY_OPTIONS, enabled: false };
  }
  return {
    enabled: options.enabled ?? DEFAULT_ERROR_OVERLAY_OPTIONS.enabled,
    elmStyle: options.elmStyle ?? DEFAULT_ERROR_OVERLAY_OPTIONS.elmStyle,
    showSource: options.showSource ?? DEFAULT_ERROR_OVERLAY_OPTIONS.showSource,
    showStack: options.showStack ?? DEFAULT_ERROR_OVERLAY_OPTIONS.showStack,
  };
}

/**
 * Normalize dev options.
 */
export function normalizeDevOptions(options: DevOptions | undefined): ResolvedDevOptions {
  if (!options) {
    return { ...DEFAULT_DEV_OPTIONS };
  }
  return {
    hmr: normalizeHMROptions(options.hmr),
    inspector: normalizeInspectorOptions(options.inspector),
    errorOverlay: normalizeErrorOverlayOptions(options.errorOverlay),
    clearScreen: options.clearScreen ?? DEFAULT_DEV_OPTIONS.clearScreen,
  };
}

/**
 * Normalize bundle analyzer options.
 */
export function normalizeBundleAnalyzerOptions(
  options: boolean | BundleAnalyzerOptions | undefined,
): Required<BundleAnalyzerOptions> {
  if (options === undefined || options === false) {
    return { ...DEFAULT_BUNDLE_ANALYZER_OPTIONS };
  }
  if (options === true) {
    return { ...DEFAULT_BUNDLE_ANALYZER_OPTIONS, enabled: true };
  }
  return {
    enabled: options.enabled ?? true, // If object provided, assume enabled
    format: options.format ?? DEFAULT_BUNDLE_ANALYZER_OPTIONS.format,
    outputFile: options.outputFile ?? DEFAULT_BUNDLE_ANALYZER_OPTIONS.outputFile,
    openReport: options.openReport ?? DEFAULT_BUNDLE_ANALYZER_OPTIONS.openReport,
  };
}

/**
 * Normalize build options.
 */
export function normalizeBuildOptions(options: BuildOptions | undefined): ResolvedBuildOptions {
  if (!options) {
    return { ...DEFAULT_BUILD_OPTIONS };
  }
  return {
    target: options.target ?? DEFAULT_BUILD_OPTIONS.target,
    sourcemaps: options.sourcemaps ?? DEFAULT_BUILD_OPTIONS.sourcemaps,
    minifyTemplates: options.minifyTemplates ?? DEFAULT_BUILD_OPTIONS.minifyTemplates,
    analyze: normalizeBundleAnalyzerOptions(options.analyze),
    stripDevCode: options.stripDevCode ?? DEFAULT_BUILD_OPTIONS.stripDevCode,
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
 * Normalize SSR streaming options.
 */
export function normalizeSSRStreamingOptions(
  options: SSRStreamingOptions | undefined,
): Required<SSRStreamingOptions> {
  return {
    enabled: options?.enabled ?? DEFAULT_SSR_STREAMING_OPTIONS.enabled,
    chunkSize: options?.chunkSize ?? DEFAULT_SSR_STREAMING_OPTIONS.chunkSize,
    firstByteTimeout: options?.firstByteTimeout ?? DEFAULT_SSR_STREAMING_OPTIONS.firstByteTimeout,
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
    register: options.register,
    manifest: normalizeSSRManifestOptions(options.manifest, isDev),
    hydration: normalizeSSRHydrationOptions(options.hydration, isDev),
    streaming: normalizeSSRStreamingOptions(options.streaming),
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
 * Converts user-provided ConventionConfig (from resolution package)
 * to the internal ResolvedConventionOptions structure.
 */
export function normalizeConventionOptions(
  options: ConventionConfig | undefined,
  thirdParty?: ThirdPartyOptions,
): ResolvedConventionOptions {
  if (!options) {
    return { ...DEFAULT_CONVENTION_OPTIONS };
  }

  const defaultConfig = DEFAULT_CONVENTION_OPTIONS.config;

  return {
    enabled: options.enabled ?? true,
    config: {
      enabled: options.enabled ?? true,
      suffixes: options.suffixes ?? defaultConfig.suffixes,
      filePatterns: options.filePatterns ?? defaultConfig.filePatterns,
      viewModelExtensions: options.viewModelExtensions ?? defaultConfig.viewModelExtensions,
      templateExtensions: options.templateExtensions ?? defaultConfig.templateExtensions,
      styleExtensions: options.styleExtensions ?? defaultConfig.styleExtensions,
      directories: options.directories ?? defaultConfig.directories,
      templatePairing: {
        preferSibling:
          options.templatePairing?.preferSibling ?? DEFAULT_TEMPLATE_PAIRING_OPTIONS.preferSibling,
      },
      stylesheetPairing: {
        injection:
          options.stylesheetPairing?.injection ?? DEFAULT_STYLESHEET_PAIRING_OPTIONS.injection,
      },
    },
    thirdParty: {
      scan: thirdParty?.scan ?? DEFAULT_THIRD_PARTY_OPTIONS.scan,
      packages: thirdParty?.packages ?? DEFAULT_THIRD_PARTY_OPTIONS.packages,
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
): Omit<ResolvedAureliaOptions, "resolution" | "routeTree"> {
  const isDev = context.command === "serve";
  const opts = options ?? {};

  return {
    entry: opts.entry ?? "./src/my-app.html",
    tsconfig: opts.tsconfig ?? null,
    dev: normalizeDevOptions(opts.dev),
    build: normalizeBuildOptions(opts.build),
    ssr: normalizeSSROptions(opts.ssr, isDev),
    ssg: normalizeSSGOptions(opts.ssg),
    conventions: normalizeConventionOptions(opts.conventions, opts.thirdParty),
    compiler: normalizeCompilerOptions(opts.compiler),
    debug: normalizeDebugOptions(opts.debug, context.root),
    experimental: { ...DEFAULT_EXPERIMENTAL_OPTIONS, ...opts.experimental },
    hooks: { ...DEFAULT_HOOKS, ...opts.hooks },
  };
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
// Config File Loading (Placeholder)
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

/**
 * Load Aurelia config from file.
 * Searches for config files in the project root.
 *
 * TODO: Implement actual config loading with bundling support.
 * This is a placeholder for the config file infrastructure.
 *
 * @param root - Project root directory
 * @returns Loaded config or null if no config file found
 */
export async function loadConfigFile(root: string): Promise<AureliaConfig | null> {
  // Placeholder - actual implementation would:
  // 1. Search for config files in priority order
  // 2. Bundle the config file (for TypeScript support)
  // 3. Execute and return the exported config
  // 4. Handle 'extends' field for config inheritance

  // For now, return null (no config file)
  void root; // Suppress unused parameter warning
  return null;
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

  // Deep merge with inline taking precedence
  // TODO: Implement proper deep merge
  return {
    ...fileConfig,
    ...inlineConfig,
    // Merge nested objects
    dev: { ...fileConfig.dev, ...inlineConfig.dev },
    build: { ...fileConfig.build, ...inlineConfig.build },
    ssr:
      typeof inlineConfig.ssr === "boolean" || typeof fileConfig.ssr === "boolean"
        ? inlineConfig.ssr ?? fileConfig.ssr
        : { ...(fileConfig.ssr as SSROptions), ...(inlineConfig.ssr as SSROptions) },
    conventions: { ...fileConfig.conventions, ...inlineConfig.conventions },
    compiler: { ...fileConfig.compiler, ...inlineConfig.compiler },
    debug: { ...fileConfig.debug, ...inlineConfig.debug },
    experimental: { ...fileConfig.experimental, ...inlineConfig.experimental },
    hooks: { ...fileConfig.hooks, ...inlineConfig.hooks },
  };
}
