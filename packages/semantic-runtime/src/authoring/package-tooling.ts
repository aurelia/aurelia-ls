import type { AuthoringSourceTextAuthority } from './source-plan.js';

export type AuthoringPackageManager =
  | 'host-selected'
  | 'pnpm'
  | 'npm'
  | 'yarn';

export type AuthoringBuildToolPolicy =
  | 'not-modeled'
  | 'host-owned'
  | 'recipe-baseline';

export type AuthoringPackageDependencyScope =
  | 'dependency'
  | 'devDependency';

export type AuthoringProjectToolingFileKind =
  | 'package-manifest'
  | 'typescript-config'
  | 'module-declaration';

export type AuthoringProjectToolingLanguage =
  | 'json'
  | 'typescript';

export class AuthoringPackageDependency {
  readonly kind = 'authoring-package-dependency' as const;

  constructor(
    readonly specifier: string,
    readonly versionRange: string,
    readonly scope: AuthoringPackageDependencyScope = 'dependency',
  ) {}
}

export class AuthoringPackageScript {
  readonly kind = 'authoring-package-script' as const;

  constructor(
    readonly name: string,
    readonly command: string,
  ) {}
}

export class AuthoringProjectToolingFile {
  readonly kind = 'authoring-project-tooling-file' as const;

  constructor(
    readonly path: string,
    readonly fileKind: AuthoringProjectToolingFileKind,
    readonly language: AuthoringProjectToolingLanguage,
    readonly text: string,
    readonly textAuthority: AuthoringSourceTextAuthority = 'semantic-runtime-recipe',
  ) {}
}

export class AuthoringProjectToolingPlan {
  readonly kind = 'authoring-project-tooling-plan' as const;

  constructor(
    readonly packageManager: AuthoringPackageManager,
    readonly buildToolPolicy: AuthoringBuildToolPolicy,
    readonly dependencies: readonly AuthoringPackageDependency[],
    readonly scripts: readonly AuthoringPackageScript[],
    readonly files: readonly AuthoringProjectToolingFile[],
  ) {}

  get hasCompleteFileText(): boolean {
    return this.files.every((file) => file.text.length > 0);
  }
}

export interface AureliaRecipeProjectToolingModel {
  readonly appName: string;
  readonly dependencySpecifiers?: readonly string[];
}

export function aureliaRecipeProjectToolingPlan(
  model: AureliaRecipeProjectToolingModel,
): AuthoringProjectToolingPlan {
  const dependencies = packageDependencies(model.dependencySpecifiers ?? []);
  const scripts = [
    new AuthoringPackageScript('check', 'tsc -p tsconfig.json --noEmit'),
  ];
  return new AuthoringProjectToolingPlan(
    'host-selected',
    'not-modeled',
    dependencies,
    scripts,
    [
      new AuthoringProjectToolingFile(
        'package.json',
        'package-manifest',
        'json',
        packageManifestText(model.appName, dependencies, scripts),
      ),
      new AuthoringProjectToolingFile(
        'tsconfig.json',
        'typescript-config',
        'json',
        tsconfigText(),
      ),
      new AuthoringProjectToolingFile(
        'src/aurelia-assets.d.ts',
        'module-declaration',
        'typescript',
        moduleDeclarationText(),
      ),
    ],
  );
}

function packageDependencies(
  dependencySpecifiers: readonly string[],
): readonly AuthoringPackageDependency[] {
  const specifiers = new Set<string>([
    '@aurelia/runtime-html',
    ...dependencySpecifiers,
  ]);
  const dependencies = [...specifiers].map((specifier) =>
    new AuthoringPackageDependency(specifier, aureliaPackageVersion(specifier), 'dependency')
  );
  dependencies.push(new AuthoringPackageDependency('typescript', '^6.0.3', 'devDependency'));
  return dependencies.sort((left, right) =>
    dependencyScopeRank(left.scope) - dependencyScopeRank(right.scope)
    || left.specifier.localeCompare(right.specifier)
  );
}

function aureliaPackageVersion(specifier: string): string {
  return specifier.startsWith('@aurelia/') ? '^2.0.0-rc.1' : '*';
}

function dependencyScopeRank(scope: AuthoringPackageDependencyScope): number {
  switch (scope) {
    case 'dependency':
      return 0;
    case 'devDependency':
      return 1;
  }
}

function packageManifestText(
  appName: string,
  dependencies: readonly AuthoringPackageDependency[],
  scripts: readonly AuthoringPackageScript[],
): string {
  return jsonText({
    name: packageNameForAppName(appName),
    private: true,
    type: 'module',
    scripts: Object.fromEntries(scripts.map((script) => [script.name, script.command])),
    dependencies: dependencyObject(dependencies, 'dependency'),
    devDependencies: dependencyObject(dependencies, 'devDependency'),
  });
}

function dependencyObject(
  dependencies: readonly AuthoringPackageDependency[],
  scope: AuthoringPackageDependencyScope,
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
  return normalized.length === 0 ? 'aurelia-authoring-app' : normalized;
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
