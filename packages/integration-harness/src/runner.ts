import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { performance } from "node:perf_hooks";
import * as ts from "typescript";
import { DiagnosticsRuntime } from "@aurelia-ls/compiler/diagnostics/runtime.js";
import { buildSemanticsArtifacts } from "@aurelia-ls/compiler/project-semantics/assemble/build.js";
import { createReplayConvergenceOverrides } from "@aurelia-ls/compiler/project-semantics/definition/candidate-overrides.js";
import type { AnalysisResult } from "@aurelia-ls/compiler/project-semantics/evaluate/types.js";
import { analyzePackage } from "@aurelia-ls/compiler/project-semantics/npm/index.js";
import type { PackageAnalysis } from "@aurelia-ls/compiler/project-semantics/npm/types.js";
import type { FileSystemContext } from "@aurelia-ls/compiler/project-semantics/project/context.js";
import { createMockFileSystem } from "@aurelia-ls/compiler/project-semantics/project/mock-context.js";
import { createNodeFileSystem } from "@aurelia-ls/compiler/project-semantics/project/node-context.js";
import { buildRegistrationPlan, type UsageByScope } from "@aurelia-ls/compiler/project-semantics/register/plan.js";
import {
  discoverProjectSemantics,
  type ProjectSemanticsDiscoveryConfig,
  type ProjectSemanticsDiscoveryDiagnostic,
  type ProjectSemanticsDiscoveryResult,
} from "@aurelia-ls/compiler/project-semantics/resolve.js";
import { buildApiSurfaceSnapshot } from "@aurelia-ls/compiler/project-semantics/snapshot/api-surface-snapshot.js";
import { buildSemanticSnapshot } from "@aurelia-ls/compiler/project-semantics/snapshot/semantic-snapshot.js";
import { compileAot, type CompileAotResult } from "@aurelia-ls/compiler/facade-aot.js";
import { compileTemplate, type TemplateCompilation } from "@aurelia-ls/compiler/facade.js";
import { createSemanticModel } from "@aurelia-ls/compiler/schema/model.js";
import { buildTemplateSyntaxRegistry, prepareProjectSemantics } from "@aurelia-ls/compiler/schema/registry.js";
import { buildResourceGraphFromSemantics } from "@aurelia-ls/compiler/schema/resource-graph.js";
import { unwrapSourced } from "@aurelia-ls/compiler/schema/sourced.js";
import type {
  ApiSurfaceSnapshot,
  Bindable,
  BindableDef,
  BindingBehaviorDef,
  CustomAttributeDef,
  CustomElementDef,
  FeatureUsageSet,
  MaterializedSemantics,
  ResourceCatalog,
  ResourceCollections,
  ResourceDef,
  ResourceGraph,
  ResourceScopeId,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  TypeRef,
  ValueConverterDef,
} from "@aurelia-ls/compiler/schema/types.js";
import type { ModuleResolver } from "@aurelia-ls/compiler/shared/module-resolver.js";
import type { AotCodeResult } from "@aurelia-ls/compiler/synthesis/aot/types.js";
import {
  ensureCompileTarget,
  normalizeScenario,
} from "./scenario.js";
import { createMemoryTracker, type MemoryTrace } from "./memory.js";
import { mergePackageRoots, resolveExternalPackageSpec } from "./fixtures.js";
import type {
  AssertionFailure,
  CompileTargetSpec,
  ExternalPackageSpec,
  ExternalResourcePolicy,
  IntegrationScenario,
  NormalizedScenario,
} from "./schema.js";

export interface ExternalPackageResult {
  spec: ExternalPackageSpec;
  analysis?: AnalysisResult<PackageAnalysis>;
  resources: readonly ResourceDef[];
}

export interface CompileRunResult {
  id: string;
  templatePath: string;
  markup: string;
  scopeId: ResourceScopeId;
  aot?: CompileAotResult;
  overlay?: TemplateCompilation;
  usage?: FeatureUsageSet;
}

export interface IntegrationSnapshots {
  semantic: ReturnType<typeof buildSemanticSnapshot>;
  apiSurface: ApiSurfaceSnapshot;
}

export interface IntegrationTimings {
  totalMs: number;
  discoveryMs: number;
  externalMs: number;
  compileMs: number;
}

export interface IntegrationRun {
  scenario: NormalizedScenario;
  program?: ts.Program;
  fileSystem?: FileSystemContext;
  discovery: ProjectSemanticsDiscoveryResult;
  semantics: MaterializedSemantics;
  resourceGraph: ResourceGraph;
  catalog: ResourceCatalog;
  syntax: TemplateSyntaxRegistry;
  external: readonly ExternalPackageResult[];
  compile: Readonly<Record<string, CompileRunResult>>;
  snapshots: IntegrationSnapshots;
  diagnostics: readonly ProjectSemanticsDiscoveryDiagnostic[];
  usageByScope?: UsageByScope;
  registrationPlan?: ReturnType<typeof buildRegistrationPlan>;
  timings: IntegrationTimings;
  memory?: MemoryTrace;
}

export interface HarnessRunOptions {
  logger?: {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
  memory?: {
    enabled?: boolean;
    logSamples?: boolean;
    logDeltas?: boolean;
  };
  retain?: {
    program?: boolean;
    fileSystem?: boolean;
    discoveryFacts?: boolean;
    discoveryRegistration?: boolean;
    externalAnalysis?: boolean;
  };
}

const externalResourceCache = new Map<string, readonly ResourceDef[]>();
const externalAnalysisCache = new Map<string, AnalysisResult<PackageAnalysis>>();

export async function runIntegrationScenario(
  scenario: IntegrationScenario,
  options: HarnessRunOptions = {},
): Promise<IntegrationRun> {
  const normalized = normalizeScenario(scenario);
  const resolvedScenario = resolveScenarioFixtures(normalized);
  const retention = resolveRetentionOptions(options.retain);
  const timings: IntegrationTimings = {
    totalMs: 0,
    discoveryMs: 0,
    externalMs: 0,
    compileMs: 0,
  };
  const startTotal = performance.now();
  const memoryTracker = createMemoryTracker({
    enabled: options.memory?.enabled ?? process.env.AURELIA_HARNESS_MEMORY === "1",
    logger: options.logger,
    logSamples: options.memory?.logSamples ?? process.env.AURELIA_HARNESS_MEMORY_LOG === "1",
    logDeltas: options.memory?.logDeltas ?? process.env.AURELIA_HARNESS_MEMORY_DELTAS === "1",
  });
  memoryTracker.mark("start");

  const { program, fileSystem, fileMap } = createProgramFromScenario(resolvedScenario);
  const moduleResolver = createModuleResolver(program, fileMap);
  memoryTracker.mark("program");

  const discoveryStart = performance.now();
  const diagnostics = new DiagnosticsRuntime();
  const baseDiscovery = discoverProjectSemantics(
    program,
    { ...buildProjectSemanticsDiscoveryConfig(resolvedScenario, fileSystem), diagnostics: diagnostics.forSource("project") },
    options.logger,
  );
  const discovery = baseDiscovery;
  timings.discoveryMs = performance.now() - discoveryStart;
  memoryTracker.mark("discovery");

  const externalStart = performance.now();
  const external = await analyzeExternalPackages(resolvedScenario.externalPackages, retention.externalAnalysis);
  timings.externalMs = performance.now() - externalStart;
  memoryTracker.mark("external");

  const merged = applyExternalResources(
    discovery,
    external.flatMap((pkg) => pkg.resources),
    resolvedScenario.externalResourcePolicy,
  );
  const augmented = applyExplicitResources(merged, resolvedScenario.discovery.explicitResources);
  memoryTracker.mark("merge");

  const compileStart = performance.now();
  const compile = compileTargets(resolvedScenario, discovery, augmented, moduleResolver, fileMap, {
    computeUsage: !!resolvedScenario.expect?.registrationPlan,
  });
  timings.compileMs = performance.now() - compileStart;
  memoryTracker.mark("compile");

  const snapshots = buildSnapshots(augmented, resolvedScenario);
  memoryTracker.mark("snapshots");

  const usageByScope = resolvedScenario.expect?.registrationPlan
    ? collectUsageByScope(compile)
    : undefined;
  const registrationPlan = usageByScope
    ? buildRegistrationPlan(augmented.resourceGraph, usageByScope)
    : undefined;
  memoryTracker.mark("registration");

  timings.totalMs = performance.now() - startTotal;
  memoryTracker.mark("done");
  const memory = memoryTracker.trace();
  const trimmedDiscovery = trimProjectSemanticsDiscoveryResult(discovery, retention);

  return {
    scenario: resolvedScenario,
    program: retention.program ? program : undefined,
    fileSystem: retention.fileSystem ? fileSystem : undefined,
    discovery: trimmedDiscovery,
    semantics: augmented.semantics,
    resourceGraph: augmented.resourceGraph,
    catalog: augmented.catalog,
    syntax: augmented.syntax,
    external,
    compile,
    snapshots,
    diagnostics: trimmedDiscovery.diagnostics,
    usageByScope,
    registrationPlan,
    timings,
    memory,
  };
}

function resolveScenarioFixtures(scenario: NormalizedScenario): NormalizedScenario {
  if (scenario.externalPackages.length === 0) return scenario;

  const externalPackages = scenario.externalPackages.map(resolveExternalPackageSpec);
  const packageRoots = mergePackageRoots(scenario.discovery.packageRoots, externalPackages);

  return {
    ...scenario,
    externalPackages,
    discovery: {
      ...scenario.discovery,
      packageRoots,
    },
  };
}

export function collectAssertionFailures(
  failures: readonly AssertionFailure[] | undefined,
): readonly AssertionFailure[] {
  return failures ?? [];
}

function createProgramFromScenario(
  scenario: NormalizedScenario,
): { program: ts.Program; fileSystem?: FileSystemContext; fileMap?: Record<string, string> } {
  if (scenario.source.kind === "memory") {
    const fileMap = normalizeFileMap(scenario.source.files);
    const program = createProgramFromMemory(
      fileMap,
      scenario.source.rootNames,
      scenario.source.compilerOptions,
    );
    const fileSystem = scenario.discovery.fileSystem === "mock"
      ? createMockFileSystem({ files: fileMap })
      : undefined;
    return { program, fileSystem, fileMap };
  }

  const program = createProgramFromTsconfig(scenario.source.tsconfigPath);
  const fileSystem = scenario.discovery.fileSystem === "node"
    ? createNodeFileSystem({ root: dirname(scenario.source.tsconfigPath) })
    : undefined;
  return { program, fileSystem };
}

function createModuleResolver(
  program: ts.Program,
  fileMap?: Record<string, string>,
): ModuleResolver {
  const compilerOptions = program.getCompilerOptions();
  const mem = fileMap ? new Map(Object.entries(fileMap)) : null;
  const base = ts.sys;

  const host: ts.ModuleResolutionHost = {
    fileExists: (fileName) => {
      const key = normalizePath(fileName);
      return (mem?.has(key) ?? false) || base.fileExists(fileName);
    },
    readFile: (fileName) => {
      const key = normalizePath(fileName);
      return mem?.get(key) ?? base.readFile(fileName);
    },
    directoryExists: base.directoryExists?.bind(base),
    realpath: base.realpath?.bind(base),
    getCurrentDirectory: () => base.getCurrentDirectory ? base.getCurrentDirectory() : process.cwd(),
    getDirectories: base.getDirectories?.bind(base),
  };

  return (specifier: string, containingFile: string) => {
    const resolved = ts.resolveModuleName(specifier, containingFile, compilerOptions, host).resolvedModule;
    if (!resolved?.resolvedFileName) return null;
    return normalizePath(resolved.resolvedFileName);
  };
}

function buildProjectSemanticsDiscoveryConfig(
  scenario: NormalizedScenario,
  fileSystem?: FileSystemContext,
): Omit<ProjectSemanticsDiscoveryConfig, "diagnostics"> {
  const packagePath = scenario.discovery.packagePath
    ?? (scenario.source.kind === "tsconfig" ? dirname(scenario.source.tsconfigPath) : undefined);
  return {
    conventions: scenario.discovery.conventions,
    defines: scenario.discovery.defines,
    fileSystem,
    templateExtensions: scenario.discovery.templateExtensions,
    styleExtensions: scenario.discovery.styleExtensions,
    packageRoots: scenario.discovery.packageRoots,
    packagePath,
    stripSourcedNodes: process.env.AURELIA_RESOLUTION_STRIP_SOURCED_NODES === "1",
  };
}

function resolveRetentionOptions(
  overrides?: HarnessRunOptions["retain"],
): Required<NonNullable<HarnessRunOptions["retain"]>> {
  const trimAll = readEnvFlag("AURELIA_HARNESS_TRIM") ?? false;
  const defaultRetain = !trimAll;
  return {
    program: resolveRetention("AURELIA_HARNESS_RETAIN_PROGRAM", overrides?.program, defaultRetain),
    fileSystem: resolveRetention("AURELIA_HARNESS_RETAIN_FILESYSTEM", overrides?.fileSystem, defaultRetain),
    discoveryFacts: resolveRetention("AURELIA_HARNESS_RETAIN_FACTS", overrides?.discoveryFacts, defaultRetain),
    discoveryRegistration: resolveRetention(
      "AURELIA_HARNESS_RETAIN_REGISTRATION",
      overrides?.discoveryRegistration,
      defaultRetain,
    ),
    externalAnalysis: resolveRetention("AURELIA_HARNESS_RETAIN_EXTERNAL", overrides?.externalAnalysis, defaultRetain),
  };
}

function resolveRetention(
  envKey: string,
  explicit: boolean | undefined,
  fallback: boolean,
): boolean {
  if (explicit !== undefined) return explicit;
  const env = readEnvFlag(envKey);
  return env ?? fallback;
}

function readEnvFlag(key: string): boolean | undefined {
  const value = process.env[key];
  if (value === "1") return true;
  if (value === "0") return false;
  return undefined;
}

function trimProjectSemanticsDiscoveryResult(
  result: ProjectSemanticsDiscoveryResult,
  retention: Required<NonNullable<HarnessRunOptions["retain"]>>,
): ProjectSemanticsDiscoveryResult {
  if (retention.discoveryFacts && retention.discoveryRegistration) {
    return result;
  }

  return {
    ...result,
    facts: retention.discoveryFacts ? result.facts : new Map(),
    registration: retention.discoveryRegistration
      ? result.registration
      : { sites: [], orphans: [], unresolved: [], activatedPlugins: [] },
  };
}

async function analyzeExternalPackages(
  specs: readonly ExternalPackageSpec[],
  retainAnalysis: boolean,
): Promise<ExternalPackageResult[]> {
  const results: ExternalPackageResult[] = [];
  for (const spec of specs) {
    if (!spec.path) {
      throw new Error("External package spec missing path after fixture resolution.");
    }
    const cacheKey = `${spec.path}::${spec.preferSource ? "source" : "bundle"}`;
    let analysis: AnalysisResult<PackageAnalysis> | undefined;
    let resources = externalResourceCache.get(cacheKey);

    if (retainAnalysis) {
      analysis = externalAnalysisCache.get(cacheKey);
    }

    if (!resources || (retainAnalysis && !analysis)) {
      analysis = analysis ?? await analyzePackage(spec.path, { preferSource: spec.preferSource });
      resources = analysis.value.resources.map((entry) => entry.resource);
      externalResourceCache.set(cacheKey, resources);
      if (retainAnalysis) {
        externalAnalysisCache.set(cacheKey, analysis);
      }
    }

    results.push({
      spec,
      resources,
      ...(retainAnalysis ? { analysis } : {}),
    });
  }
  return results;
}

function applyExternalResources(
  base: ProjectSemanticsDiscoveryResult,
  external: readonly ResourceDef[],
  policy: ExternalResourcePolicy,
): {
  semantics: MaterializedSemantics;
  resourceGraph: ResourceGraph;
  catalog: ResourceCatalog;
  syntax: TemplateSyntaxRegistry;
} {
  if (policy === "none" || external.length === 0) {
    return {
      semantics: base.semantics,
      resourceGraph: base.resourceGraph,
      catalog: base.catalog,
      syntax: base.syntax,
    };
  }

  const mergedResources = [...base.definition.evidence, ...external];
  const candidateOverrides = createReplayConvergenceOverrides(
    mergedResources,
    base.definition.convergence,
    base.packagePath,
  );
  const artifacts = buildSemanticsArtifacts(
    mergedResources,
    base.semantics,
    candidateOverrides.size > 0 ? { candidateOverrides } : undefined,
  );

  if (policy === "rebuild-graph") {
    const graph = buildResourceGraphFromSemantics(artifacts.semantics);
    return {
      semantics: artifacts.semantics,
      resourceGraph: graph,
      catalog: artifacts.catalog,
      syntax: artifacts.syntax,
    };
  }

  if (policy === "semantics") {
    return {
      semantics: artifacts.semantics,
      resourceGraph: base.resourceGraph,
      catalog: artifacts.catalog,
      syntax: artifacts.syntax,
    };
  }

  const overlay = collectResourceOverlay(external);
  const graph = mergeIntoRootScope(base.resourceGraph, overlay);

  return {
    semantics: artifacts.semantics,
    resourceGraph: graph,
    catalog: artifacts.catalog,
    syntax: artifacts.syntax,
  };
}

function compileTargets(
  scenario: NormalizedScenario,
  discovery: ProjectSemanticsDiscoveryResult,
  merged: {
    semantics: MaterializedSemantics;
    resourceGraph: ResourceGraph;
    catalog: ResourceCatalog;
    syntax: TemplateSyntaxRegistry;
  },
  moduleResolver: ModuleResolver,
  fileMap?: Record<string, string>,
  options: { computeUsage?: boolean } = {},
): Record<string, CompileRunResult> {
  const results: Record<string, CompileRunResult> = {};
  const targets = scenario.compile.map(ensureCompileTarget);

  // Build a SemanticModel from the merged discovery result.
  // This patches the original discovery with post-merge fields so that
  // the query-based compile API sees external resources.
  const model = createSemanticModel({
    ...discovery,
    semantics: merged.semantics,
    catalog: merged.catalog,
    syntax: merged.syntax,
    resourceGraph: merged.resourceGraph,
  });

  for (const target of targets) {
    const { markup, templatePath } = resolveTemplateSource(target, scenario, fileMap);
    const scopeId = resolveScopeId(target, scenario, discovery, merged.resourceGraph);
    const localImports = target.localImports ? [...target.localImports] : undefined;

    const compileResult: CompileRunResult = {
      id: target.id,
      templatePath,
      markup,
      scopeId,
    };

    const needsAnalysis = options.computeUsage || target.overlay;
    if (needsAnalysis) {
      const query = model.query({ scope: scopeId, localImports });
      const analysis = compileTemplate({
        html: markup,
        templateFilePath: templatePath,
        isJs: false,
        vm: createDefaultVmReflection(),
        query,
        moduleResolver,
      });
      compileResult.usage = analysis.usage;
      if (target.overlay) {
        compileResult.overlay = analysis;
      }
    }

    if (target.aot !== false) {
      // TODO(tech-debt): migrate this direct facade call to workspace/program
      // orchestration once AOT integration paths are unified.
      compileResult.aot = compileAot(markup, {
        name: target.id,
        templatePath,
        semantics: merged.semantics,
        catalog: merged.catalog,
        syntax: merged.syntax,
        resourceGraph: merged.resourceGraph,
        resourceScope: scopeId,
        localImports,
        moduleResolver,
      });
    }

    results[target.id] = compileResult;
  }

  return results;
}

function resolveTemplateSource(
  target: CompileTargetSpec,
  scenario: NormalizedScenario,
  fileMap?: Record<string, string>,
): { markup: string; templatePath: string } {
  if (target.markup !== undefined) {
    const templatePath = target.templatePath ?? `/${target.id}.html`;
    return { markup: target.markup, templatePath };
  }

  if (!target.templatePath) {
    throw new Error(`Compile target "${target.id}" must provide markup or templatePath.`);
  }

  if (scenario.source.kind === "memory") {
    const normalized = normalizePath(target.templatePath);
    const contents = fileMap?.[normalized];
    if (!contents) {
      throw new Error(`Template not found in scenario files: ${target.templatePath}`);
    }
    return { markup: contents, templatePath: normalized };
  }

  const fullPath = resolvePath(dirname(scenario.source.tsconfigPath), target.templatePath);
  const contents = readFileSync(fullPath, "utf-8");
  return { markup: contents, templatePath: fullPath };
}

function resolveScopeId(
  target: CompileTargetSpec,
  scenario: NormalizedScenario,
  discovery: ProjectSemanticsDiscoveryResult,
  graph: ResourceGraph,
): ResourceScopeId {
  const scope = target.scope;
  if (!scope || scope === "root") {
    return graph.root;
  }

  if (typeof scope === "string") {
    return scope as ResourceScopeId;
  }

  const localOf = scope.localOf;
  const normalizedLocal = normalizePath(localOf);
  const byPath = discovery.templates.find((t) => t.componentPath === normalizedLocal);
  if (byPath) {
    return `local:${byPath.componentPath}` as ResourceScopeId;
  }
  const byName = discovery.templates.find((t) => t.resourceName === localOf);
  if (byName) {
    return `local:${byName.componentPath}` as ResourceScopeId;
  }

  const localScopeId = `local:${normalizedLocal}` as ResourceScopeId;
  if (graph.scopes[localScopeId]) {
    return localScopeId;
  }

  return graph.root;
}

function buildSnapshots(
  merged: {
    semantics: MaterializedSemantics;
    resourceGraph: ResourceGraph;
    catalog: ResourceCatalog;
  },
  scenario: NormalizedScenario,
): IntegrationSnapshots {
  const semantic = buildSemanticSnapshot(merged.semantics, {
    graph: merged.resourceGraph,
    catalog: merged.catalog,
    packageRoots: scenario.discovery.packageRoots,
  });
  const apiSurface = buildApiSurfaceSnapshot(merged.semantics, {
    packageRoots: scenario.discovery.packageRoots,
  });
  return { semantic, apiSurface };
}

function collectUsageByScope(compiles: Record<string, CompileRunResult>): UsageByScope {
  const usageByScope: Record<ResourceScopeId, FeatureUsageSet> = {};

  for (const compile of Object.values(compiles)) {
    const usage = compile.usage;
    if (!usage) continue;
    const scope = compile.scopeId;
    usageByScope[scope] = mergeUsageSets(usageByScope[scope], usage);
  }

  return usageByScope;
}

function mergeUsageSets(
  base: FeatureUsageSet | undefined,
  next: FeatureUsageSet,
): FeatureUsageSet {
  if (!base) return next;

  return {
    elements: mergeUsageList(base.elements, next.elements),
    attributes: mergeUsageList(base.attributes, next.attributes),
    controllers: mergeUsageList(base.controllers, next.controllers),
    commands: mergeUsageList(base.commands, next.commands),
    patterns: mergeUsageList(base.patterns, next.patterns),
    valueConverters: mergeUsageList(base.valueConverters, next.valueConverters),
    bindingBehaviors: mergeUsageList(base.bindingBehaviors, next.bindingBehaviors),
    ...(mergeUsageFlags(base.flags, next.flags) ?? {}),
  };
}

function mergeUsageFlags(
  base: FeatureUsageSet["flags"] | undefined,
  next: FeatureUsageSet["flags"] | undefined,
): FeatureUsageSet["flags"] | undefined {
  if (!base && !next) return undefined;
  return {
    usesCompose: base?.usesCompose || next?.usesCompose || undefined,
    usesDynamicCompose: base?.usesDynamicCompose || next?.usesDynamicCompose || undefined,
    usesTemplateControllers: base?.usesTemplateControllers || next?.usesTemplateControllers || undefined,
  };
}

function mergeUsageList(base: readonly string[], next: readonly string[]): string[] {
  const merged = new Set<string>(base);
  for (const entry of next) merged.add(entry);
  return Array.from(merged).sort((a, b) => a.localeCompare(b));
}

function applyExplicitResources(
  merged: {
    semantics: MaterializedSemantics;
    resourceGraph: ResourceGraph;
    catalog: ResourceCatalog;
    syntax: TemplateSyntaxRegistry;
  },
  explicit: Partial<ResourceCollections> | undefined,
): {
  semantics: MaterializedSemantics;
  resourceGraph: ResourceGraph;
  catalog: ResourceCatalog;
  syntax: TemplateSyntaxRegistry;
} {
  if (!explicit || !hasExplicitResources(explicit)) {
    return merged;
  }

  const mergedResources = mergeResourceCollections(merged.semantics.resources, explicit);
  const rootId = merged.resourceGraph.root;
  const rootScope = merged.resourceGraph.scopes[rootId];
  const mergedRootResources = mergeScopeResources(rootScope?.resources, explicit);
  const nextGraph: ResourceGraph = {
    ...merged.resourceGraph,
    scopes: {
      ...merged.resourceGraph.scopes,
      [rootId]: {
        id: rootId,
        parent: rootScope?.parent ?? null,
        ...(rootScope?.label ? { label: rootScope.label } : {}),
        resources: mergedRootResources,
      },
    },
  };

  const semantics = prepareProjectSemantics(
    { ...merged.semantics, resourceGraph: nextGraph },
    { resources: mergedResources },
  );
  const syntax = buildTemplateSyntaxRegistry(semantics);

  return {
    semantics,
    catalog: semantics.catalog,
    syntax,
    resourceGraph: nextGraph,
  };
}

function normalizeFileMap(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    out[normalizePath(path)] = content;
  }
  return out;
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/")) return normalized;
  if (/^[A-Za-z]:\//.test(normalized)) return normalized;
  return "/" + normalized;
}

function createProgramFromMemory(
  files: Record<string, string>,
  rootNames?: readonly string[],
  options: ts.CompilerOptions = {},
): ts.Program {
  const opts: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    allowJs: true,
    experimentalDecorators: true,
    ...options,
  };

  const mem = new Map(Object.entries(files));
  const dirs = new Set<string>();
  for (const file of mem.keys()) {
    let dir = file;
    while ((dir = dir.substring(0, dir.lastIndexOf("/"))) && dir !== "") {
      dirs.add(dir);
    }
    dirs.add("/");
  }
  const base = ts.createCompilerHost(opts, true);

  const host: ts.CompilerHost = {
    ...base,
    getCurrentDirectory: () => "/",
    getCanonicalFileName: (fileName) => normalizePath(fileName),
    fileExists: (fileName) => mem.has(normalizePath(fileName)) || base.fileExists(fileName),
    readFile: (fileName) => mem.get(normalizePath(fileName)) ?? base.readFile(fileName),
    directoryExists: (dirName) => {
      const key = normalizePath(dirName);
      return dirs.has(key) || base.directoryExists?.(dirName) || false;
    },
    getSourceFile: (fileName, languageVersion, onError, shouldCreate) => {
      const key = normalizePath(fileName);
      if (mem.has(key)) {
        return ts.createSourceFile(fileName, mem.get(key)!, languageVersion, true);
      }
      return base.getSourceFile(fileName, languageVersion, onError, shouldCreate);
    },
  };

  const roots = rootNames ? [...rootNames] : [...mem.keys()];
  return ts.createProgram(roots, opts, host);
}

function createProgramFromTsconfig(tsconfigPath: string): ts.Program {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(tsconfigPath),
  );
  if (parsed.errors.length > 0) {
    const message = parsed.errors
      .map((err) => ts.flattenDiagnosticMessageText(err.messageText, "\n"))
      .join("\n");
    throw new Error(message);
  }
  return ts.createProgram(parsed.fileNames, parsed.options);
}

function mergeIntoRootScope(
  graph: ResourceGraph,
  overlay: Partial<ResourceCollections>,
): ResourceGraph {
  const root = graph.root;
  const rootScope = graph.scopes[root];
  const resources = mergeScopeResources(rootScope?.resources, overlay);
  return {
    ...graph,
    scopes: {
      ...graph.scopes,
      [root]: {
        id: root,
        parent: rootScope?.parent ?? null,
        ...(rootScope?.label ? { label: rootScope.label } : {}),
        resources,
      },
    },
  };
}

function mergeScopeResources(
  base: Partial<ResourceCollections> | undefined,
  extra: Partial<ResourceCollections>,
): Partial<ResourceCollections> {
  const merged: MutableResourceCollections = { ...(base ?? {}) };
  if (extra.elements) merged.elements = { ...(base?.elements ?? {}), ...extra.elements };
  if (extra.attributes) merged.attributes = { ...(base?.attributes ?? {}), ...extra.attributes };
  if (extra.controllers) merged.controllers = { ...(base?.controllers ?? {}), ...extra.controllers };
  if (extra.valueConverters) {
    merged.valueConverters = { ...(base?.valueConverters ?? {}), ...extra.valueConverters };
  }
  if (extra.bindingBehaviors) {
    merged.bindingBehaviors = { ...(base?.bindingBehaviors ?? {}), ...extra.bindingBehaviors };
  }
  return merged as Partial<ResourceCollections>;
}

function mergeResourceCollections(
  base: ResourceCollections,
  extra: Partial<ResourceCollections>,
): ResourceCollections {
  return {
    elements: extra.elements ? { ...base.elements, ...extra.elements } : base.elements,
    attributes: extra.attributes ? { ...base.attributes, ...extra.attributes } : base.attributes,
    controllers: extra.controllers ? { ...base.controllers, ...extra.controllers } : base.controllers,
    valueConverters: extra.valueConverters
      ? { ...base.valueConverters, ...extra.valueConverters }
      : base.valueConverters,
    bindingBehaviors: extra.bindingBehaviors
      ? { ...base.bindingBehaviors, ...extra.bindingBehaviors }
      : base.bindingBehaviors,
  };
}

function hasExplicitResources(extra: Partial<ResourceCollections>): boolean {
  return Boolean(
    (extra.elements && Object.keys(extra.elements).length > 0) ||
    (extra.attributes && Object.keys(extra.attributes).length > 0) ||
    (extra.controllers && Object.keys(extra.controllers).length > 0) ||
    (extra.valueConverters && Object.keys(extra.valueConverters).length > 0) ||
    (extra.bindingBehaviors && Object.keys(extra.bindingBehaviors).length > 0),
  );
}

function collectResourceOverlay(resources: readonly ResourceDef[]): Partial<ResourceCollections> {
  const elements: Record<string, ReturnType<typeof resourceToElement>> = {};
  const attributes: Record<string, ReturnType<typeof resourceToAttribute>> = {};
  const valueConverters: Record<string, ReturnType<typeof resourceToValueConverter>> = {};
  const bindingBehaviors: Record<string, ReturnType<typeof resourceToBindingBehavior>> = {};

  for (const resource of resources) {
    switch (resource.kind) {
      case "custom-element": {
        const element = resourceToElement(resource);
        if (element.name) elements[element.name] = element;
        break;
      }
      case "custom-attribute": {
        const attribute = resourceToAttribute(resource);
        if (attribute.name) attributes[attribute.name] = attribute;
        break;
      }
      case "template-controller": {
        const attribute = resourceToTemplateController(resource);
        if (attribute.name) attributes[attribute.name] = attribute;
        break;
      }
      case "value-converter": {
        const converter = resourceToValueConverter(resource);
        if (converter.name) valueConverters[converter.name] = converter;
        break;
      }
      case "binding-behavior": {
        const behavior = resourceToBindingBehavior(resource);
        if (behavior.name) bindingBehaviors[behavior.name] = behavior;
        break;
      }
    }
  }

  const overlay: MutableResourceCollections = {};
  if (Object.keys(elements).length) overlay.elements = elements;
  if (Object.keys(attributes).length) overlay.attributes = attributes;
  if (Object.keys(valueConverters).length) overlay.valueConverters = valueConverters;
  if (Object.keys(bindingBehaviors).length) overlay.bindingBehaviors = bindingBehaviors;
  return overlay as Partial<ResourceCollections>;
}

type MutableResourceCollections = {
  elements?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  controllers?: Record<string, unknown>;
  valueConverters?: Record<string, unknown>;
  bindingBehaviors?: Record<string, unknown>;
};

function resourceToElement(def: CustomElementDef) {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases.map(unwrapSourced).filter(isString);
  const dependencies = def.dependencies.map(unwrapSourced).filter(isString);
  return {
    kind: "element",
    name,
    bindables: bindableDefsToRecord(def.bindables),
    ...(aliases.length ? { aliases } : {}),
    ...(unwrapSourced(def.containerless) !== undefined ? { containerless: unwrapSourced(def.containerless) } : {}),
    ...(unwrapSourced(def.shadowOptions) !== undefined ? { shadowOptions: unwrapSourced(def.shadowOptions) } : {}),
    ...(unwrapSourced(def.capture) !== undefined ? { capture: unwrapSourced(def.capture) } : {}),
    ...(unwrapSourced(def.processContent) !== undefined ? { processContent: unwrapSourced(def.processContent) } : {}),
    ...(unwrapSourced(def.boundary) !== undefined ? { boundary: unwrapSourced(def.boundary) } : {}),
    ...(dependencies.length ? { dependencies } : {}),
    ...(unwrapSourced(def.className) ? { className: unwrapSourced(def.className) } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToAttribute(def: CustomAttributeDef) {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases.map(unwrapSourced).filter(isString);
  const primary = findPrimaryBindableName(def.bindables) ?? undefined;
  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  return {
    kind: "attribute",
    name,
    bindables: bindableDefsToRecord(def.bindables),
    ...(aliases.length ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    ...(unwrapSourced(def.className) ? { className: unwrapSourced(def.className) } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToTemplateController(def: TemplateControllerDef) {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = (unwrapSourced(def.aliases) ?? []).filter(isString);
  const primary = findPrimaryBindableName(def.bindables) ?? undefined;
  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  return {
    kind: "attribute",
    name,
    bindables: bindableDefsToRecord(def.bindables),
    ...(aliases.length ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    isTemplateController: true,
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    ...(unwrapSourced(def.className) ? { className: unwrapSourced(def.className) } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToValueConverter(def: ValueConverterDef) {
  const name = unwrapSourced(def.name) ?? "";
  return {
    name,
    in: toTypeRef(unwrapSourced(def.fromType)),
    out: toTypeRef(unwrapSourced(def.toType)),
    ...(unwrapSourced(def.className) ? { className: unwrapSourced(def.className) } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function resourceToBindingBehavior(def: BindingBehaviorDef) {
  const name = unwrapSourced(def.name) ?? "";
  return {
    name,
    ...(unwrapSourced(def.className) ? { className: unwrapSourced(def.className) } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
  };
}

function bindableDefsToRecord(bindables: Readonly<Record<string, BindableDef>>): Record<string, Bindable> {
  const record: Record<string, Bindable> = {};
  for (const [key, def] of Object.entries(bindables)) {
    const name = unwrapSourced(def.property) ?? key;
    const attribute = unwrapSourced(def.attribute);
    const mode = unwrapSourced(def.mode);
    const primary = unwrapSourced(def.primary);
    const type = toTypeRefOptional(unwrapSourced(def.type));
    const doc = unwrapSourced(def.doc);
    record[name] = {
      name,
      ...(attribute ? { attribute } : {}),
      ...(mode ? { mode } : {}),
      ...(primary !== undefined ? { primary } : {}),
      ...(type ? { type } : {}),
      ...(doc ? { doc } : {}),
    };
  }
  return record;
}

function findPrimaryBindableName(defs: Readonly<Record<string, BindableDef>>): string | null {
  for (const [key, def] of Object.entries(defs)) {
    const primary = unwrapSourced(def.primary);
    if (primary) return unwrapSourced(def.property) ?? key;
  }
  return null;
}

function toTypeRefOptional(typeName: string | undefined): TypeRef | undefined {
  if (!typeName) return undefined;
  const trimmed = typeName.trim();
  if (!trimmed) return undefined;
  if (trimmed === "any") return { kind: "any" };
  if (trimmed === "unknown") return { kind: "unknown" };
  return { kind: "ts", name: trimmed };
}

function toTypeRef(typeName: string | undefined): TypeRef {
  return toTypeRefOptional(typeName) ?? { kind: "unknown" };
}

function isString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function createDefaultVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

export function extractAotCode(result: CompileRunResult): AotCodeResult | undefined {
  return result.aot?.codeResult;
}
