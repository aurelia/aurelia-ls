import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { performance } from "node:perf_hooks";
import * as ts from "typescript";

import {
  analyzePackage,
  buildApiSurfaceSnapshot,
  buildSemanticSnapshot,
  buildSemanticsArtifacts,
  createMockFileSystem,
  createNodeFileSystem,
  resolve,
  buildRegistrationPlan,
  type AnalysisResult,
  type FileSystemContext,
  type PackageAnalysis,
  type ResolutionConfig,
  type ResolutionDiagnostic,
  type ResolutionResult,
  type UsageByScope,
} from "@aurelia-ls/resolution";
import {
  compileAot,
  compileTemplate,
  buildResourceGraphFromSemantics,
  buildTemplateSyntaxRegistry,
  prepareSemantics,
  type ApiSurfaceSnapshot,
  type AotCodeResult,
  type CompileAotResult,
  type FeatureUsageSet,
  type ResourceCatalog,
  type ResourceCollections,
  type ResourceDef,
  type ResourceGraph,
  type ResourceScopeId,
  type SemanticsWithCaches,
  type TemplateCompilation,
  type TemplateSyntaxRegistry,
  type BindableDef,
  type Bindable,
  type TypeRef,
  type ValueConverterDef,
  type BindingBehaviorDef,
  type CustomElementDef,
  type CustomAttributeDef,
  type TemplateControllerDef,
} from "@aurelia-ls/compiler";

import {
  ensureCompileTarget,
  normalizeScenario,
} from "./scenario.js";
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
  analysis: AnalysisResult<PackageAnalysis>;
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
  resolutionMs: number;
  externalMs: number;
  compileMs: number;
}

export interface IntegrationRun {
  scenario: NormalizedScenario;
  program: ts.Program;
  fileSystem?: FileSystemContext;
  resolution: ResolutionResult;
  semantics: SemanticsWithCaches;
  resourceGraph: ResourceGraph;
  catalog: ResourceCatalog;
  syntax: TemplateSyntaxRegistry;
  external: readonly ExternalPackageResult[];
  compile: Readonly<Record<string, CompileRunResult>>;
  snapshots: IntegrationSnapshots;
  diagnostics: readonly ResolutionDiagnostic[];
  usageByScope?: UsageByScope;
  registrationPlan?: ReturnType<typeof buildRegistrationPlan>;
  timings: IntegrationTimings;
}

export interface HarnessRunOptions {
  logger?: {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
}

export async function runIntegrationScenario(
  scenario: IntegrationScenario,
  options: HarnessRunOptions = {},
): Promise<IntegrationRun> {
  const normalized = normalizeScenario(scenario);
  const timings: IntegrationTimings = {
    totalMs: 0,
    resolutionMs: 0,
    externalMs: 0,
    compileMs: 0,
  };
  const startTotal = performance.now();

  const { program, fileSystem, fileMap } = createProgramFromScenario(normalized);

  const resolutionStart = performance.now();
  const resolution = resolve(program, buildResolutionConfig(normalized, fileSystem), options.logger);
  timings.resolutionMs = performance.now() - resolutionStart;

  const externalStart = performance.now();
  const external = await analyzeExternalPackages(normalized.externalPackages);
  timings.externalMs = performance.now() - externalStart;

  const merged = applyExternalResources(
    resolution,
    external.flatMap((pkg) => pkg.resources),
    normalized.externalResourcePolicy,
  );
  const augmented = applyExplicitResources(merged, normalized.resolution.explicitResources);

  const compileStart = performance.now();
  const compile = compileTargets(normalized, resolution, augmented, fileMap, {
    computeUsage: !!normalized.expect?.registrationPlan,
  });
  timings.compileMs = performance.now() - compileStart;

  const snapshots = buildSnapshots(augmented, normalized);

  const usageByScope = normalized.expect?.registrationPlan
    ? collectUsageByScope(compile)
    : undefined;
  const registrationPlan = usageByScope
    ? buildRegistrationPlan(augmented.resourceGraph, usageByScope)
    : undefined;

  timings.totalMs = performance.now() - startTotal;

  return {
    scenario: normalized,
    program,
    fileSystem,
    resolution,
    semantics: augmented.semantics,
    resourceGraph: augmented.resourceGraph,
    catalog: augmented.catalog,
    syntax: augmented.syntax,
    external,
    compile,
    snapshots,
    diagnostics: resolution.diagnostics,
    usageByScope,
    registrationPlan,
    timings,
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
    const fileSystem = scenario.resolution.fileSystem === "mock"
      ? createMockFileSystem({ files: fileMap })
      : undefined;
    return { program, fileSystem, fileMap };
  }

  const program = createProgramFromTsconfig(scenario.source.tsconfigPath);
  const fileSystem = scenario.resolution.fileSystem === "node"
    ? createNodeFileSystem({ root: dirname(scenario.source.tsconfigPath) })
    : undefined;
  return { program, fileSystem };
}

function buildResolutionConfig(
  scenario: NormalizedScenario,
  fileSystem?: FileSystemContext,
): ResolutionConfig {
  return {
    conventions: scenario.resolution.conventions,
    defines: scenario.resolution.defines,
    fileSystem,
    templateExtensions: scenario.resolution.templateExtensions,
    styleExtensions: scenario.resolution.styleExtensions,
    packageRoots: scenario.resolution.packageRoots,
  };
}

async function analyzeExternalPackages(
  specs: readonly ExternalPackageSpec[],
): Promise<ExternalPackageResult[]> {
  const results: ExternalPackageResult[] = [];
  for (const spec of specs) {
    const analysis = await analyzePackage(spec.path, { preferSource: spec.preferSource });
    const resources = analysis.value.resources.map((entry) => entry.resource);
    results.push({ spec, analysis, resources });
  }
  return results;
}

function applyExternalResources(
  base: ResolutionResult,
  external: readonly ResourceDef[],
  policy: ExternalResourcePolicy,
): {
  semantics: SemanticsWithCaches;
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

  const mergedResources = [...base.resources, ...external];
  const artifacts = buildSemanticsArtifacts(mergedResources, base.semantics);

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
  resolution: ResolutionResult,
  merged: {
    semantics: SemanticsWithCaches;
    resourceGraph: ResourceGraph;
    catalog: ResourceCatalog;
    syntax: TemplateSyntaxRegistry;
  },
  fileMap?: Record<string, string>,
  options: { computeUsage?: boolean } = {},
): Record<string, CompileRunResult> {
  const results: Record<string, CompileRunResult> = {};
  const targets = scenario.compile.map(ensureCompileTarget);

  for (const target of targets) {
    const { markup, templatePath } = resolveTemplateSource(target, scenario, fileMap);
    const scopeId = resolveScopeId(target, scenario, resolution, merged.resourceGraph);
    const localImports = target.localImports ? [...target.localImports] : undefined;

    const compileResult: CompileRunResult = {
      id: target.id,
      templatePath,
      markup,
      scopeId,
    };

    const needsAnalysis = options.computeUsage || target.overlay;
    if (needsAnalysis) {
      const analysis = compileTemplate({
        html: markup,
        templateFilePath: templatePath,
        isJs: false,
        vm: createDefaultVmReflection(),
        semantics: merged.semantics,
        catalog: merged.catalog,
        syntax: merged.syntax,
        resourceGraph: merged.resourceGraph,
        resourceScope: scopeId,
        localImports,
      });
      compileResult.usage = analysis.usage;
      if (target.overlay) {
        compileResult.overlay = analysis;
      }
    }

    if (target.aot !== false) {
      compileResult.aot = compileAot(markup, {
        name: target.id,
        templatePath,
        semantics: merged.semantics,
        catalog: merged.catalog,
        syntax: merged.syntax,
        resourceGraph: merged.resourceGraph,
        resourceScope: scopeId,
        localImports,
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
  resolution: ResolutionResult,
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
  const byPath = resolution.templates.find((t) => t.componentPath === normalizedLocal);
  if (byPath) {
    return `local:${byPath.componentPath}` as ResourceScopeId;
  }
  const byName = resolution.templates.find((t) => t.resourceName === localOf);
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
    semantics: SemanticsWithCaches;
    resourceGraph: ResourceGraph;
    catalog: ResourceCatalog;
  },
  scenario: NormalizedScenario,
): IntegrationSnapshots {
  const semantic = buildSemanticSnapshot(merged.semantics, {
    graph: merged.resourceGraph,
    catalog: merged.catalog,
    packageRoots: scenario.resolution.packageRoots,
  });
  const apiSurface = buildApiSurfaceSnapshot(merged.semantics, {
    packageRoots: scenario.resolution.packageRoots,
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
    semantics: SemanticsWithCaches;
    resourceGraph: ResourceGraph;
    catalog: ResourceCatalog;
    syntax: TemplateSyntaxRegistry;
  },
  explicit: Partial<ResourceCollections> | undefined,
): {
  semantics: SemanticsWithCaches;
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

  const semantics = prepareSemantics(
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

function unwrapSourced<T>(value: { value?: T } | undefined): T | undefined {
  return value?.value;
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
