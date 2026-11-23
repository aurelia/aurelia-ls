import path from 'node:path';
import ts from 'typescript';
import type { ComputationRead } from '../kernel/computation-lifecycle.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import type {
  SemanticRuntimeProjectInputGeneration,
  SemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputReadScope,
} from '../kernel/project-input.js';
import { SourceFileRole } from '../kernel/address.js';
import { inferSourceFileRole } from '../kernel/source-classification.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import { readCompilerConfigInput } from './compiler-config-input.js';
import { isHostPathWithin, normalizePosixPath } from './host-files.js';
import type { AuthoredSourceBoundary } from './source-boundary.js';

/** Process/toolchain facts that participate in semantic-runtime's effective compiler options. */
export class ProjectCompilerOptionsEnvironment implements ComputationRead {
  readonly domain = 'project-compiler-options-environment';
  readonly readKey = 'project-compiler-options-environment';
  readonly observedRevision: string;

  constructor(
    readonly typeScriptVersion: string,
    readonly useCaseSensitiveFileNames: boolean,
    readonly platform: typeof process.platform,
  ) {
    this.observedRevision = compilerOptionsEnvironmentRevision(this);
  }

  validate() {
    const currentRevision = readProjectCompilerOptionsEnvironment().observedRevision;
    return {
      isCurrent: currentRevision === this.observedRevision,
      currentRevision,
      changedFacets: currentRevision === this.observedRevision ? [] : ['toolchain-environment'],
    };
  }

  tryRebaseCurrent(): ComputationRead | null {
    const current = readProjectCompilerOptionsEnvironment();
    return current.observedRevision === this.observedRevision ? current : null;
  }
}

export interface ProjectCompilerConfiguration {
  readonly configFilePath: string;
  readonly options: ts.CompilerOptions;
  readonly rootFileNames: readonly string[];
  readonly explicitFileNames: readonly string[];
  readonly references: readonly string[];
}

export class ProjectCompilerOptionsResult {
  readonly revision: string;

  constructor(
    readonly options: ts.CompilerOptions,
    readonly configFilePath: string | null,
    readonly diagnostics: readonly ts.Diagnostic[],
    readonly rootFileNames: readonly string[] | null,
    private readonly inputReadScope: SemanticRuntimeProjectInputReadScope,
    readonly environment: ProjectCompilerOptionsEnvironment,
    readonly configuredProjects: readonly ProjectCompilerConfiguration[],
    readonly nestedCompilerConfigPaths: readonly string[],
    private readonly configurationsByFile: ReadonlyMap<string, ProjectCompilerConfiguration>,
  ) {
    this.revision = projectCompilerOptionsRevision(this);
  }

  /** Files shared across references follow nearest-config and declared reference order at boot. */
  configurationForFile(fileName: string): ProjectCompilerConfiguration | undefined {
    return this.configurationsByFile.get(canonicalTypeSystemPath(fileName));
  }

  /** Resolve from the configured project owning the importing file, including referenced projects. */
  optionsForFile(fileName: string): ts.CompilerOptions {
    return this.configurationsByFile.size === 0 ? this.options : this.configurationForFile(fileName)?.options ?? this.options;
  }

  /** A single owner needs no additional checker. Distinct projects can differ even in their ambient declarations. */
  get participatingConfigurations(): ReadonlySet<ProjectCompilerConfiguration> {
    return new Set(this.configurationsByFile.values());
  }

  readRegisteredInputs(): readonly ComputationRead[] {
    return [this.environment, ...this.inputReadScope.readRegisteredInputs()];
  }
}

/** Capture the effective TypeScript projects and source membership once for evaluation and checker consumers. */
export function buildProjectCompilerOptionsResult(
  inputGeneration: SemanticRuntimeProjectInputGeneration,
  rootDir: string,
  authoredSources: AuthoredSourceBoundary,
  nestedCompilerConfigPaths: readonly string[] = [],
): ProjectCompilerOptionsResult {
  const scope = inputGeneration.createReadScope('project-compiler-options');
  const environment = readProjectCompilerOptionsEnvironment();
  const defaults = defaultProjectCompilerOptions(environment);
  const rootConfig = projectCompilerConfigurationFile(scope.host, rootDir);
  const configuredProjects: ProjectCompilerConfiguration[] = [];
  const configsByPath = new Map<string, ProjectCompilerConfiguration | null>();
  const diagnostics: ts.Diagnostic[] = [];
  const configurationsByFile = new Map<string, ProjectCompilerConfiguration>();

  function visit(file: string): void {
    const key = canonicalTypeSystemPath(file);
    if (configsByPath.has(key)) return;
    configsByPath.set(key, null);
    const { parsed, diagnostics: errors } = readCompilerConfigInput(scope.host, file, environment.useCaseSensitiveFileNames);
    diagnostics.push(...errors);
    if (parsed == null) return;
    const options = { ...defaults, ...parsed.options };
    if (parsed.options.lib == null) delete options.lib;
    const raw: unknown = parsed.raw;
    const rawFiles = raw && typeof raw === 'object' && 'files' in raw ? raw.files : null;
    const config = {
      configFilePath: normalizePosixPath(file),
      references: (parsed.projectReferences ?? []).map(reference => ts.resolveProjectReferencePath(reference)),
      options,
      rootFileNames: parsed.fileNames.filter(name => authoredSources.contains(name)),
      explicitFileNames: Array.isArray(rawFiles)
        ? rawFiles.filter((name): name is string => typeof name === 'string')
          .map(name => normalizePosixPath(path.resolve(path.dirname(file), name))).filter(name => authoredSources.contains(name))
        : [],
    };
    configsByPath.set(key, config);
    configuredProjects.push(config);
    for (const ref of config.references) visit(ref);
  }

  if (rootConfig != null) visit(rootConfig);
  for (const nested of nestedCompilerConfigPaths) visit(nested);
  const root = rootConfig == null ? null : configsByPath.get(canonicalTypeSystemPath(rootConfig));
  let primary = root ?? configuredProjects[0];
  if (configuredProjects.length > 1) {
    const appOwners = new Set<ProjectCompilerConfiguration>();
    function assign(file: string, directory: string | null, seen: Set<ProjectCompilerConfiguration>) {
      const config = configsByPath.get(canonicalTypeSystemPath(file));
      if (!config || seen.has(config)) return;
      seen.add(config);
      for (const fileName of config.rootFileNames) {
        const key = canonicalTypeSystemPath(fileName);
        if (configurationsByFile.has(key) || (directory && !isHostPathWithin(fileName, directory))) continue;
        configurationsByFile.set(key, config);
        if (inferSourceFileRole(path.relative(rootDir, fileName)) === SourceFileRole.AppSource) appOwners.add(config);
      }
      for (const ref of config.references) assign(ref, directory, seen);
    }
    // A descendant's inherited glob can also include its siblings. Only files below that
    // physical config can select it as their nearest ancestor. Follow explicit references
    // in their declared order within each search, including the solution's own search.
    for (const nested of [...nestedCompilerConfigPaths].sort((a, b) => b.length - a.length || a.localeCompare(b))) {
      assign(nested, path.dirname(nested), new Set());
    }
    if (rootConfig != null) assign(rootConfig, null, new Set());
    if (appOwners.size && (!primary || !appOwners.has(primary))) primary = appOwners.values().next().value;
  }
  const roots = configuredProjects.length <= 1
    ? configuredProjects[0]?.rootFileNames ?? null
    : [...new Set(configuredProjects.flatMap(config => config.rootFileNames))];
  return new ProjectCompilerOptionsResult(
    primary?.options ?? defaults,
    primary?.configFilePath ?? rootConfig,
    diagnostics,
    roots,
    scope,
    environment,
    configuredProjects,
    nestedCompilerConfigPaths,
    configurationsByFile,
  );
}

function projectCompilerConfigurationFile(
  host: SemanticRuntimeProjectInputHost,
  rootDir: string,
): string | null {
  for (const fileName of ['tsconfig.json', 'jsconfig.json']) {
    const candidate = path.join(rootDir, fileName);
    if (host.fileExists(candidate) && !host.directoryExists(candidate)) {
      return normalizePosixPath(candidate);
    }
  }
  return null;
}

function defaultProjectCompilerOptions(
  environment: ProjectCompilerOptionsEnvironment,
): ts.CompilerOptions {
  return {
    allowJs: true,
    allowArbitraryExtensions: true,
    checkJs: false,
    experimentalDecorators: false,
    ...defaultIgnoreDeprecationsOption(environment.typeScriptVersion),
    jsx: ts.JsxEmit.Preserve,
    lib: [
      'lib.es2024.d.ts',
      'lib.dom.d.ts',
      'lib.dom.iterable.d.ts',
    ],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.Latest,
  };
}

function defaultIgnoreDeprecationsOption(typeScriptVersion: string): Pick<ts.CompilerOptions, 'ignoreDeprecations'> {
  const major = Number(typeScriptVersion.split('.')[0] ?? '0');
  return major >= 6
    ? { ignoreDeprecations: '6.0' }
    : {};
}

function readProjectCompilerOptionsEnvironment(): ProjectCompilerOptionsEnvironment {
  return new ProjectCompilerOptionsEnvironment(
    ts.version,
    ts.sys.useCaseSensitiveFileNames,
    process.platform,
  );
}

function compilerOptionsEnvironmentRevision(environment: ProjectCompilerOptionsEnvironment): string {
  return stableKernelLocalHash(JSON.stringify([
    environment.typeScriptVersion,
    environment.useCaseSensitiveFileNames,
    environment.platform,
  ]));
}

function projectCompilerOptionsRevision(result: ProjectCompilerOptionsResult): string {
  return stableKernelLocalHash(JSON.stringify({
    options: stableCompilerOptionsValue(result.options),
    configFilePath: result.configFilePath,
    diagnostics: result.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: diagnostic.category,
      fileName: diagnostic.file?.fileName ?? null,
      start: diagnostic.start ?? null,
      length: diagnostic.length ?? null,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    })),
    rootFileNames: result.rootFileNames,
    inputs: result.readRegisteredInputs().map((read) => [read.readKey, read.observedRevision]),
  }));
}

function stableCompilerOptionsValue(value: unknown, seen: Set<object> = new Set()): unknown {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'undefined') {
    return '[undefined]';
  }
  if (typeof value !== 'object') {
    return `[${typeof value}]`;
  }
  if (seen.has(value)) {
    return '[circular]';
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => stableCompilerOptionsValue(entry, seen));
    }
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'configFile')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableCompilerOptionsValue(entry, seen)]),
    );
  } finally {
    seen.delete(value);
  }
}
