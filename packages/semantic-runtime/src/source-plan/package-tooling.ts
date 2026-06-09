import { uniqueStrings } from '../kernel/collections.js';
import {
  SourcePlan,
  SourcePlanTextAuthority,
  sourcePlanContributionTypeScriptImportRequirements,
} from './source-plan.js';

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
  /** Build tooling follows a semantic-runtime source-plan baseline. */
  SemanticRuntimeBaseline = 'semantic-runtime-baseline',
  /** Build tooling follows the app-builder source-plan baseline. */
  AppBuilderBaseline = 'app-builder-baseline',
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
  /** Root browser document that hosts the Aurelia app shell. */
  RootDocument = 'root-document',
  /** Bundler/build-tool configuration. */
  BuildConfig = 'build-config',
  /** TypeScript project configuration. */
  TypeScriptConfig = 'typescript-config',
  /** TypeScript declaration file for non-TS imports. */
  ModuleDeclaration = 'module-declaration',
}

export enum SourcePlanProjectToolingLanguage {
  /** JSON tooling file. */
  Json = 'json',
  /** HTML root document. */
  Html = 'html',
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
    readonly textAuthority: SourcePlanTextAuthority = SourcePlanTextAuthority.SemanticRuntimeGenerated,
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
  readonly buildToolPolicy?: SourcePlanBuildToolPolicy;
  readonly entrypointPath?: string | null;
  readonly rootElementName?: string | null;
  readonly textAuthority?: SourcePlanTextAuthority;
}

export function aureliaSourcePlanProjectTooling(
  model: AureliaSourcePlanProjectToolingModel,
): SourcePlanProjectTooling {
  const buildToolPolicy = model.buildToolPolicy ?? SourcePlanBuildToolPolicy.NotModeled;
  const usesAppBuilderBuildTooling = buildToolPolicy === SourcePlanBuildToolPolicy.AppBuilderBaseline;
  const dependencies = packageDependencies(model.dependencySpecifiers ?? [], usesAppBuilderBuildTooling);
  const scripts = [
    ...(usesAppBuilderBuildTooling
      ? [
          new SourcePlanPackageScript('dev', 'vite'),
          new SourcePlanPackageScript('build', 'vite build'),
        ]
      : []),
    new SourcePlanPackageScript('check', 'tsc -p tsconfig.json --noEmit'),
  ];
  return new SourcePlanProjectTooling(
    SourcePlanPackageManager.HostSelected,
    buildToolPolicy,
    dependencies,
    scripts,
    [
      new SourcePlanProjectToolingFile(
        'package.json',
        SourcePlanProjectToolingFileKind.PackageManifest,
        SourcePlanProjectToolingLanguage.Json,
        packageManifestText(model.appName, dependencies, scripts),
        model.textAuthority,
      ),
      ...appBuilderBaselineProjectToolingFiles(model, usesAppBuilderBuildTooling),
      new SourcePlanProjectToolingFile(
        'tsconfig.json',
        SourcePlanProjectToolingFileKind.TypeScriptConfig,
        SourcePlanProjectToolingLanguage.Json,
        tsconfigText(),
        model.textAuthority,
      ),
      new SourcePlanProjectToolingFile(
        'src/aurelia-assets.d.ts',
        SourcePlanProjectToolingFileKind.ModuleDeclaration,
        SourcePlanProjectToolingLanguage.TypeScript,
        moduleDeclarationText(),
        model.textAuthority,
      ),
    ],
  );
}

/** Add package tooling to an assembled source plan using its contributed TypeScript package imports as dependency evidence. */
export function sourcePlanWithAureliaProjectTooling(
  sourcePlan: SourcePlan,
  model: AureliaSourcePlanProjectToolingModel,
): SourcePlan {
  return new SourcePlan(
    sourcePlan.rootDir,
    sourcePlan.policy,
    sourcePlan.files,
    aureliaSourcePlanProjectTooling({
      ...model,
      dependencySpecifiers: uniqueStrings([
        ...(model.dependencySpecifiers ?? []),
        ...sourcePlanPackageImportDependencySpecifiers(sourcePlan),
      ], 'sorted'),
    }),
    sourcePlan.pattern,
  );
}

/** Read package-level import specifiers from TypeScript contributions in a source plan. */
export function sourcePlanPackageImportDependencySpecifiers(
  sourcePlan: SourcePlan,
): readonly string[] {
  return uniqueStrings(
    sourcePlan.files.flatMap((file) =>
      sourcePlanContributionTypeScriptImportRequirements(file.contributions)
        .map((importRequirement) => importRequirement.moduleSpecifier)
        .filter(isPackageModuleSpecifier)),
    'sorted',
  );
}

function packageDependencies(
  dependencySpecifiers: readonly string[],
  includeAppBuilderBuildTooling: boolean,
): readonly SourcePlanPackageDependency[] {
  const specifiers = new Set<string>([
    'aurelia',
    ...appBuilderBuildToolRuntimeDependencySpecifiers(includeAppBuilderBuildTooling),
    ...dependencySpecifiers,
  ]);
  const dependencies = [...specifiers].map((specifier) =>
    new SourcePlanPackageDependency(specifier, aureliaPackageVersion(specifier), SourcePlanPackageDependencyScope.Dependency)
  );
  dependencies.push(new SourcePlanPackageDependency('typescript', '^6.0.3', SourcePlanPackageDependencyScope.DevDependency));
  if (includeAppBuilderBuildTooling) {
    dependencies.push(
      new SourcePlanPackageDependency('@aurelia/vite-plugin', aureliaPackageVersion('@aurelia/vite-plugin'), SourcePlanPackageDependencyScope.DevDependency),
      new SourcePlanPackageDependency('vite', '^7.0.2', SourcePlanPackageDependencyScope.DevDependency),
    );
  }
  return dependencies.sort((left, right) =>
    dependencyScopeRank(left.scope) - dependencyScopeRank(right.scope)
    || left.specifier.localeCompare(right.specifier)
  );
}

function appBuilderBuildToolRuntimeDependencySpecifiers(
  includeAppBuilderBuildTooling: boolean,
): readonly string[] {
  if (!includeAppBuilderBuildTooling) {
    return [];
  }
  return [
    // The Aurelia Vite plugin emits transformed source imports from this package.
    '@aurelia/runtime-html',
  ];
}

function isPackageModuleSpecifier(
  moduleSpecifier: string,
): boolean {
  return !moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/') && !moduleSpecifier.startsWith('node:');
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

function appBuilderBaselineProjectToolingFiles(
  model: AureliaSourcePlanProjectToolingModel,
  enabled: boolean,
): readonly SourcePlanProjectToolingFile[] {
  if (!enabled || model.entrypointPath == null || model.rootElementName == null) {
    return [];
  }
  return [
    new SourcePlanProjectToolingFile(
      'index.html',
      SourcePlanProjectToolingFileKind.RootDocument,
      SourcePlanProjectToolingLanguage.Html,
      rootDocumentText(model.appName, model.rootElementName, model.entrypointPath),
      model.textAuthority,
    ),
    new SourcePlanProjectToolingFile(
      'vite.config.ts',
      SourcePlanProjectToolingFileKind.BuildConfig,
      SourcePlanProjectToolingLanguage.TypeScript,
      viteConfigText(),
      model.textAuthority,
    ),
  ];
}

function rootDocumentText(
  appName: string,
  rootElementName: string,
  entrypointPath: string,
): string {
  const modulePath = `/${entrypointPath.replace(/\\/g, '/').replace(/^\/+/, '')}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtmlText(appName)}</title>
  </head>
  <body>
    <${rootElementName}></${rootElementName}>
    <script type="module" src="${modulePath}"></script>
  </body>
</html>
`;
}

function viteConfigText(): string {
  return `import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  esbuild: {
    target: 'es2022',
  },
  plugins: [aurelia({
    include: ['src/**/*.{ts,js,html}', '**/src/**/*.{ts,js,html}'],
    hmr: false,
  })],
});
`;
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

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
