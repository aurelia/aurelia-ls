import { SourcePlanTextAuthority } from './source-plan.js';

export enum SourcePlanPackageManager {
  /** The host chooses the package manager. */
  HostSelected = 'host-selected',
  /** pnpm owns installation and script execution. */
  Pnpm = 'pnpm',
  /** npm owns installation and script execution. */
  Npm = 'npm',
  /** Yarn owns installation and script execution. */
  Yarn = 'yarn',
}

export enum SourcePlanBuildToolPolicy {
  /** Build tooling is not modeled by this source plan. */
  NotModeled = 'not-modeled',
  /** The host owns build tooling. */
  HostOwned = 'host-owned',
  /** Build tooling follows a recipe/source-plan baseline. */
  RecipeBaseline = 'recipe-baseline',
}

export enum SourcePlanPackageDependencyScope {
  /** Runtime dependency entry in package.json. */
  Dependency = 'dependency',
  /** Development dependency entry in package.json. */
  DevDependency = 'devDependency',
}

export enum SourcePlanProjectToolingFileKind {
  /** package.json style manifest. */
  PackageManifest = 'package-manifest',
  /** TypeScript project configuration. */
  TypeScriptConfig = 'typescript-config',
  /** TypeScript declaration file for non-TS imports. */
  ModuleDeclaration = 'module-declaration',
}

export enum SourcePlanProjectToolingLanguage {
  /** JSON tooling file. */
  Json = 'json',
  /** TypeScript tooling file. */
  TypeScript = 'typescript',
}

export class SourcePlanPackageDependency {
  readonly kind = 'source-plan-package-dependency' as const;

  constructor(
    readonly specifier: string,
    readonly versionRange: string,
    readonly scope: SourcePlanPackageDependencyScope = SourcePlanPackageDependencyScope.Dependency,
  ) {}
}

export class SourcePlanPackageScript {
  readonly kind = 'source-plan-package-script' as const;

  constructor(
    readonly name: string,
    readonly command: string,
  ) {}
}

export class SourcePlanProjectToolingFile {
  readonly kind = 'source-plan-project-tooling-file' as const;

  constructor(
    readonly path: string,
    readonly fileKind: SourcePlanProjectToolingFileKind,
    readonly language: SourcePlanProjectToolingLanguage,
    readonly text: string,
    readonly textAuthority: SourcePlanTextAuthority = SourcePlanTextAuthority.SemanticRuntimeRecipe,
  ) {}
}

export class SourcePlanProjectTooling {
  readonly kind = 'source-plan-project-tooling' as const;

  constructor(
    readonly packageManager: SourcePlanPackageManager,
    readonly buildToolPolicy: SourcePlanBuildToolPolicy,
    readonly dependencies: readonly SourcePlanPackageDependency[],
    readonly scripts: readonly SourcePlanPackageScript[],
    readonly files: readonly SourcePlanProjectToolingFile[],
  ) {}

  get hasCompleteFileText(): boolean {
    return this.files.every((file) => file.text.length > 0);
  }
}

export interface AureliaSourcePlanProjectToolingModel {
  readonly appName: string;
  readonly dependencySpecifiers?: readonly string[];
}

export function aureliaSourcePlanProjectTooling(
  model: AureliaSourcePlanProjectToolingModel,
): SourcePlanProjectTooling {
  const dependencies = packageDependencies(model.dependencySpecifiers ?? []);
  const scripts = [
    new SourcePlanPackageScript('check', 'tsc -p tsconfig.json --noEmit'),
  ];
  return new SourcePlanProjectTooling(
    SourcePlanPackageManager.HostSelected,
    SourcePlanBuildToolPolicy.NotModeled,
    dependencies,
    scripts,
    [
      new SourcePlanProjectToolingFile(
        'package.json',
        SourcePlanProjectToolingFileKind.PackageManifest,
        SourcePlanProjectToolingLanguage.Json,
        packageManifestText(model.appName, dependencies, scripts),
      ),
      new SourcePlanProjectToolingFile(
        'tsconfig.json',
        SourcePlanProjectToolingFileKind.TypeScriptConfig,
        SourcePlanProjectToolingLanguage.Json,
        tsconfigText(),
      ),
      new SourcePlanProjectToolingFile(
        'src/aurelia-assets.d.ts',
        SourcePlanProjectToolingFileKind.ModuleDeclaration,
        SourcePlanProjectToolingLanguage.TypeScript,
        moduleDeclarationText(),
      ),
    ],
  );
}

function packageDependencies(
  dependencySpecifiers: readonly string[],
): readonly SourcePlanPackageDependency[] {
  const specifiers = new Set<string>([
    'aurelia',
    ...dependencySpecifiers,
  ]);
  const dependencies = [...specifiers].map((specifier) =>
    new SourcePlanPackageDependency(specifier, aureliaPackageVersion(specifier), SourcePlanPackageDependencyScope.Dependency)
  );
  dependencies.push(new SourcePlanPackageDependency('typescript', '^6.0.3', SourcePlanPackageDependencyScope.DevDependency));
  return dependencies.sort((left, right) =>
    dependencyScopeRank(left.scope) - dependencyScopeRank(right.scope)
    || left.specifier.localeCompare(right.specifier)
  );
}

function aureliaPackageVersion(specifier: string): string {
  return specifier === 'aurelia' || specifier.startsWith('@aurelia/')
    ? '^2.0.0-rc.1'
    : '*';
}

function dependencyScopeRank(scope: SourcePlanPackageDependencyScope): number {
  switch (scope) {
    case SourcePlanPackageDependencyScope.Dependency:
      return 0;
    case SourcePlanPackageDependencyScope.DevDependency:
      return 1;
  }
}

function packageManifestText(
  appName: string,
  dependencies: readonly SourcePlanPackageDependency[],
  scripts: readonly SourcePlanPackageScript[],
): string {
  return jsonText({
    name: packageNameForAppName(appName),
    private: true,
    type: 'module',
    scripts: Object.fromEntries(scripts.map((script) => [script.name, script.command])),
    dependencies: dependencyObject(dependencies, SourcePlanPackageDependencyScope.Dependency),
    devDependencies: dependencyObject(dependencies, SourcePlanPackageDependencyScope.DevDependency),
  });
}

function dependencyObject(
  dependencies: readonly SourcePlanPackageDependency[],
  scope: SourcePlanPackageDependencyScope,
): Record<string, string> {
  return Object.fromEntries(
    dependencies
      .filter((dependency) => dependency.scope === scope)
      .map((dependency) => [dependency.specifier, dependency.versionRange]),
  );
}

function tsconfigText(): string {
  return jsonText({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      strict: true,
      skipLibCheck: true,
      allowArbitraryExtensions: true,
      noEmit: true,
    },
    include: ['src'],
  });
}

function moduleDeclarationText(): string {
  return [
    "declare module '*.html' {",
    '  const template: string;',
    '  export default template;',
    '}',
    '',
    "declare module '*.css' {",
    '  const css: string;',
    '  export default css;',
    '}',
    '',
  ].join('\n');
}

function packageNameForAppName(appName: string): string {
  const normalized = appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length === 0 ? 'aurelia-source-plan-app' : normalized;
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
