import path from 'node:path';
import ts from 'typescript';
import type { ComputationRead } from '../kernel/computation-lifecycle.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import type {
  SemanticRuntimeProjectInputGeneration,
  SemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputReadScope,
} from '../kernel/project-input.js';
import { normalizePosixPath } from './host-files.js';
import type { AuthoredSourceBoundary } from './source-boundary.js';

/** Process/toolchain facts that participate in semantic-runtime's effective compiler options. */
export class ProjectCompilerOptionsEnvironment implements ComputationRead {
  readonly domain = 'project-compiler-options-environment';
  readonly readKey = 'project-compiler-options-environment';
  readonly observedRevision: string;

  constructor(
    readonly typeScriptVersion: string,
    readonly useCaseSensitiveFileNames: boolean,
    readonly platform: NodeJS.Platform,
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

export class ProjectCompilerOptionsResult {
  readonly revision: string;

  constructor(
    readonly options: ts.CompilerOptions,
    readonly configFilePath: string | null,
    readonly diagnostics: readonly ts.Diagnostic[],
    readonly rootFileNames: readonly string[] | null,
    private readonly inputReadScope: SemanticRuntimeProjectInputReadScope,
    readonly environment: ProjectCompilerOptionsEnvironment,
  ) {
    this.revision = projectCompilerOptionsRevision(this);
  }

  readRegisteredInputs(): readonly ComputationRead[] {
    return [this.environment, ...this.inputReadScope.readRegisteredInputs()];
  }
}

interface ProjectCompilerOptionsValues {
  readonly options: ts.CompilerOptions;
  readonly configFilePath: string | null;
  readonly diagnostics: readonly ts.Diagnostic[];
  readonly rootFileNames: readonly string[] | null;
}

/** Read compiler options with semantic-runtime defaults and exact-root TypeScript/JavaScript config overrides. */
export function buildProjectCompilerOptionsResult(
  inputGeneration: SemanticRuntimeProjectInputGeneration,
  rootDir: string,
  authoredSources: AuthoredSourceBoundary,
): ProjectCompilerOptionsResult {
  const inputReadScope = inputGeneration.createReadScope('project-compiler-options');
  const environment = readProjectCompilerOptionsEnvironment();
  const values = readProjectCompilerOptions(
    inputReadScope.host,
    rootDir,
    environment,
    authoredSources,
  );
  return new ProjectCompilerOptionsResult(
    values.options,
    values.configFilePath,
    values.diagnostics,
    values.rootFileNames,
    inputReadScope,
    environment,
  );
}

function readProjectCompilerOptions(
  host: SemanticRuntimeProjectInputHost,
  rootDir: string,
  environment: ProjectCompilerOptionsEnvironment,
  authoredSources: AuthoredSourceBoundary,
): ProjectCompilerOptionsValues {
  const defaults = defaultProjectCompilerOptions(environment);
  const configFile = projectCompilerConfigurationFile(host, rootDir);
  if (configFile == null) {
    return {
      options: defaults,
      configFilePath: null,
      diagnostics: [],
      rootFileNames: null,
    };
  }

  const read = ts.readConfigFile(configFile, (fileName) => host.readFile(fileName));
  if (read.error != null || read.config == null) {
    return {
      options: defaults,
      configFilePath: configFile,
      diagnostics: read.error == null ? [] : [read.error],
      rootFileNames: null,
    };
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    {
      useCaseSensitiveFileNames: environment.useCaseSensitiveFileNames,
      readDirectory: (directoryName, extensions, excludes, includes, depth) =>
        [...host.matchFiles(directoryName, extensions, excludes, includes, depth)],
      fileExists: (fileName) => host.fileExists(fileName),
      readFile: (fileName) => host.readFile(fileName),
    },
    path.dirname(configFile),
    undefined,
    configFile,
  );
  const merged = {
    ...defaults,
    ...parsed.options,
  };
  if (parsed.options.lib == null) {
    delete merged.lib;
  }
  return {
    options: merged,
    configFilePath: configFile,
    diagnostics: parsed.errors,
    rootFileNames: parsed.fileNames.filter((fileName) => authoredSources.contains(fileName)),
  };
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
