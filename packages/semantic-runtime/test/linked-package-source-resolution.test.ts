import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputReadKind,
} from '../src/kernel/project-input.js';
import {
  ProjectModuleResolutionKind,
  ProjectModuleResolutionOpeningKind,
  ProjectModuleResolver,
} from '../src/project-analysis/project-module-resolution.js';
import { externalPackageRootForPath } from '../src/project-analysis/package-topology.js';

const PACKAGE_NAME = '@fixture/linked-toolkit';
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('ProjectModuleResolver linked-package source resolution', () => {
  test('classifies node_modules segments with the host case policy', () => {
    const packageFile = path.resolve(
      'fixture-root',
      'NODE_MODULES',
      '@fixture',
      'linked-toolkit',
      'src',
      'index.ts',
    );
    const expectedRoot = path.resolve(
      'fixture-root',
      'NODE_MODULES',
      '@fixture',
      'linked-toolkit',
    ).replaceAll('\\', '/');

    expect(externalPackageRootForPath(packageFile))
      .toBe(ts.sys.useCaseSensitiveFileNames ? null : expectedRoot);
  });

  test('maps one missing linked declaration to source with deterministic evidence and currentness reads', () => {
    const fixture = linkedPackageFixture();
    const first = capturedResolver(fixture.appRoot, 'exact-linked-source');

    const resolution = first.resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);
    const evidence = readEvidence(first.readScope);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, fixture.sourceFile)).toBe(true);
    expect(resolution.resolvedModule).toMatchObject({
      extension: ts.Extension.Ts,
      isExternalLibraryImport: true,
    });
    expect(resolution.sourceLink).toMatchObject({
      containingFile: path.resolve(fixture.containingFile),
      moduleSpecifier: PACKAGE_NAME,
      logicalPackageRoot: path.resolve(fixture.logicalPackageRoot),
      physicalPackageRoot: path.resolve(fixture.physicalPackageRoot),
      packageConfigPath: path.resolve(fixture.packageConfig),
      logicalDeclarationPath: path.resolve(fixture.logicalDeclaration),
      physicalDeclarationPath: path.resolve(fixture.physicalDeclaration),
      logicalSourcePath: path.resolve(fixture.logicalSource),
      physicalSourcePath: path.resolve(fixture.sourceFile),
      packageInstance: {
        name: PACKAGE_NAME,
        version: '1.0.0',
      },
    });
    expect(first.resolver.readSourceLinks()).toEqual([resolution.sourceLink]);
    expect(first.resolver.readOpenings()).toEqual([]);
    expect(evidence).toEqual([...evidence].sort(compareEvidence));
    expect(new Set(evidence.map((entry) => entry.readKey)).size).toBe(evidence.length);
    expect(evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.Realpath,
        path: path.resolve(fixture.logicalPackageRoot),
      }),
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.FileExistence,
        path: path.resolve(fixture.logicalDeclaration),
        value: false,
      }),
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.FileExistence,
        path: path.resolve(fixture.physicalDeclaration),
        value: false,
      }),
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.FileContent,
        path: path.resolve(fixture.packageConfig),
      }),
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.FileContent,
        path: path.resolve(fixture.physicalPackageRoot, 'tsconfig-base.json'),
      }),
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.FileExistence,
        path: path.resolve(fixture.sourceFile),
        value: true,
      }),
    ]));
    expect(first.generation.validateRegisteredInputValues().isCurrent).toBe(true);
    expect(first.readScope.readRegisteredInputs().every((read) => read.validateObservedValue().isCurrent)).toBe(true);

    const repeated = first.resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);
    expect(repeated).toBe(resolution);
    expect(readEvidence(first.readScope)).toEqual(evidence);

    const second = capturedResolver(fixture.appRoot, 'second-exact-linked-source');
    const independentlyResolved = second.resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);
    expect(independentlyResolved.sourceLink?.revision).toBe(resolution.sourceLink?.revision);
    expect(readEvidence(second.readScope)).toEqual(evidence);
  });

  test('does not infer source fallback for an ordinary non-linked package copy', () => {
    const fixture = linkedPackageFixture({ linkPackage: false });
    const { resolver } = capturedResolver(fixture.appRoot, 'ordinary-package-copy');

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.Unresolved);
    expect(resolution.resolvedModule).toBeUndefined();
    expect(resolution.sourceLink).toBeNull();
    expect(resolution.opening).toBeNull();
    expect(resolver.readSourceLinks()).toEqual([]);
  });

  test('lets an ordinary built declaration win over linked-source fallback', () => {
    const fixture = linkedPackageFixture({ writeDeclaration: true });
    const { resolver } = capturedResolver(fixture.appRoot, 'built-declaration');

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.TypeScript);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, fixture.physicalDeclaration)).toBe(true);
    expect(resolution.resolvedModule?.extension).toBe(ts.Extension.Dts);
    expect(resolution.sourceLink).toBeNull();
    expect(resolution.opening).toBeNull();
    expect(resolver.readSourceLinks()).toEqual([]);
  });

  test('lets an authored paths mapping win over linked-source fallback', () => {
    const fixture = linkedPackageFixture();
    const authoredTarget = path.join(fixture.appRoot, 'src', 'authored-toolkit.ts');
    writeText(authoredTarget, 'export const toolkitValue = "authored";\n');
    const { resolver } = capturedResolver(fixture.appRoot, 'authored-paths', {
      baseUrl: fixture.appRoot,
      paths: {
        [PACKAGE_NAME]: ['src/authored-toolkit.ts'],
      },
    });

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.TypeScript);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, authoredTarget)).toBe(true);
    expect(resolution.sourceLink).toBeNull();
    expect(resolution.opening).toBeNull();
    expect(resolver.readSourceLinks()).toEqual([]);
  });

  test('uses package-export pattern precedence before total key length', () => {
    const fixture = linkedPackageFixture();
    const moduleSpecifier = `${PACKAGE_NAME}/foobarzzzzzz`;
    const preferredSource = path.join(
      fixture.physicalPackageRoot,
      'src',
      'preferred',
      'zzzzzz.ts',
    );
    const lowerPrecedenceSource = path.join(
      fixture.physicalPackageRoot,
      'src',
      'lower-precedence',
      'bar.ts',
    );
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      exports: {
        './foobar*': {
          types: './dist/types/preferred/*.d.ts',
        },
        './foo*zzzzzz': {
          types: './dist/types/lower-precedence/*.d.ts',
        },
      },
    });
    writeText(preferredSource, "export const selectedPattern = 'preferred';\n");
    writeText(lowerPrecedenceSource, "export const selectedPattern = 'lower-precedence';\n");
    const { resolver } = capturedResolver(fixture.appRoot, 'package-export-pattern-precedence');

    const resolution = resolver.resolveModuleName(moduleSpecifier, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, preferredSource)).toBe(true);
    expect(sameHostPath(resolution.sourceLink!.physicalDeclarationPath, path.join(
      fixture.physicalPackageRoot,
      'dist',
      'types',
      'preferred',
      'zzzzzz.d.ts',
    ))).toBe(true);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, lowerPrecedenceSource)).toBe(false);
  });

  test('matches TypeScript export-pattern capture when prefix and suffix overlap', () => {
    const fixture = linkedPackageFixture();
    const moduleSpecifier = `${PACKAGE_NAME}/abc`;
    const selectedSource = path.join(fixture.physicalPackageRoot, 'src', 'overlap', 'b.ts');
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      exports: {
        './ab*bc': {
          types: './dist/types/overlap/*.d.ts',
        },
      },
    });
    writeText(selectedSource, "export const selectedOverlap = 'typescript-substring';\n");
    const { resolver } = capturedResolver(fixture.appRoot, 'overlapping-package-export-pattern');

    const resolution = resolver.resolveModuleName(moduleSpecifier, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, selectedSource)).toBe(true);
    expect(sameHostPath(resolution.sourceLink!.physicalDeclarationPath, path.join(
      fixture.physicalPackageRoot,
      'dist',
      'types',
      'overlap',
      'b.d.ts',
    ))).toBe(true);
  });

  test('lets TypeScript select an applicable versioned types condition', () => {
    const fixture = linkedPackageFixture();
    const versionedSource = path.join(fixture.physicalPackageRoot, 'src', 'versioned.ts');
    const fallbackSource = path.join(fixture.physicalPackageRoot, 'src', 'fallback.ts');
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      exports: {
        '.': {
          'types@>=5.2': './dist/types/versioned.d.ts',
          types: './dist/types/fallback.d.ts',
          import: './dist/esm/index.js',
        },
      },
    });
    writeText(versionedSource, "export const selectedTypesVersion = 'versioned';\n");
    writeText(fallbackSource, "export const selectedTypesVersion = 'fallback';\n");
    const { resolver } = capturedResolver(fixture.appRoot, 'versioned-types-condition');

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, versionedSource)).toBe(true);
    expect(sameHostPath(resolution.sourceLink!.physicalDeclarationPath, path.join(
      fixture.physicalPackageRoot,
      'dist',
      'types',
      'versioned.d.ts',
    ))).toBe(true);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, fallbackSource)).toBe(false);
  });

  test('ignores an existing inactive declaration target after TypeScript selects a missing target', () => {
    const fixture = linkedPackageFixture();
    const selectedSource = path.join(fixture.physicalPackageRoot, 'src', 'selected.ts');
    const inactiveDeclaration = path.join(
      fixture.physicalPackageRoot,
      'dist',
      'types',
      'inactive.d.ts',
    );
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      types: 'dist/types/inactive.d.ts',
      exports: {
        '.': {
          types: './dist/types/selected.d.ts',
          import: './dist/esm/index.js',
        },
      },
    });
    writeText(inactiveDeclaration, 'export declare const inactive: true;\n');
    writeText(selectedSource, "export const selectedDeclaration = 'source';\n");
    const { resolver } = capturedResolver(fixture.appRoot, 'inactive-declaration-target');

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, selectedSource)).toBe(true);
    expect(sameHostPath(resolution.sourceLink!.physicalDeclarationPath, path.join(
      fixture.physicalPackageRoot,
      'dist',
      'types',
      'selected.d.ts',
    ))).toBe(true);
  });

  test('accepts a direct declaration export without a types condition', () => {
    const fixture = linkedPackageFixture();
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      exports: {
        '.': './dist/types/index.d.ts',
      },
    });
    const { resolver } = capturedResolver(fixture.appRoot, 'direct-declaration-export');

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, fixture.sourceFile)).toBe(true);
    expect(sameHostPath(resolution.sourceLink!.physicalDeclarationPath, fixture.physicalDeclaration)).toBe(true);
  });

  test('lets TypeScript ignore an inactive invalid declaration target', () => {
    const fixture = linkedPackageFixture();
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      exports: {
        '.': {
          'types@>=99': '../outside.d.ts',
          types: './dist/types/index.d.ts',
        },
      },
    });
    const { resolver } = capturedResolver(fixture.appRoot, 'inactive-invalid-declaration-target');

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(resolution.resolvedModule!.resolvedFileName, fixture.sourceFile)).toBe(true);
    expect(sameHostPath(resolution.sourceLink!.physicalDeclarationPath, fixture.physicalDeclaration)).toBe(true);
  });

  test('distinguishes an unavailable package config from an unsupported output layout', () => {
    const unavailable = linkedPackageFixture();
    unlinkSync(unavailable.packageConfig);
    const unavailableResolution = capturedResolver(
      unavailable.appRoot,
      'unavailable-package-config',
    ).resolver.resolveModuleName(PACKAGE_NAME, unavailable.containingFile);

    expect(unavailableResolution.kind).toBe(ProjectModuleResolutionKind.Unresolved);
    expect(unavailableResolution.opening?.openingKind)
      .toBe(ProjectModuleResolutionOpeningKind.PackageConfigUnavailable);

    const unsupported = linkedPackageFixture();
    writeJson(unsupported.packageConfig, {
      compilerOptions: {
        rootDirs: ['src', 'generated'],
        declarationDir: 'dist/types',
      },
    });
    const unsupportedResolution = capturedResolver(
      unsupported.appRoot,
      'unsupported-package-config',
    ).resolver.resolveModuleName(PACKAGE_NAME, unsupported.containingFile);

    expect(unsupportedResolution.kind).toBe(ProjectModuleResolutionKind.Unresolved);
    expect(unsupportedResolution.opening?.openingKind)
      .toBe(ProjectModuleResolutionOpeningKind.PackageConfigUnsupported);
  });

  test('reuses an established physical owner for self exports and package imports', () => {
    const fixture = linkedPackageFixture();
    const selfSource = path.join(fixture.physicalPackageRoot, 'src', 'self.ts');
    const importSource = path.join(fixture.physicalPackageRoot, 'src', 'internal.ts');
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      types: 'dist/types/index.d.ts',
      exports: {
        '.': { types: './dist/types/index.d.ts' },
        './self': { types: './dist/types/self.d.ts' },
      },
      imports: {
        '#internal': { types: './dist/types/internal.d.ts' },
      },
    });
    writeText(selfSource, "export const selfMarker = 'self';\n");
    writeText(importSource, "export const internalMarker = 'internal';\n");
    const { resolver } = capturedResolver(fixture.appRoot, 'known-physical-owner');
    expect(resolver.resolveModuleName(`${PACKAGE_NAME}/self`, fixture.sourceFile).kind)
      .toBe(ProjectModuleResolutionKind.Unresolved);
    expect(resolver.resolveModuleName('#internal', fixture.sourceFile).kind)
      .toBe(ProjectModuleResolutionKind.Unresolved);

    const entry = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);
    const self = resolver.resolveModuleName(`${PACKAGE_NAME}/self`, fixture.sourceFile);
    const internal = resolver.resolveModuleName('#internal', fixture.sourceFile);

    expect(entry.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(self.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(internal.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(entry.resolvedModule!.isExternalLibraryImport).toBe(true);
    expect(self.resolvedModule!.isExternalLibraryImport).toBe(false);
    expect(internal.resolvedModule!.isExternalLibraryImport).toBe(false);
    expect(sameHostPath(self.resolvedModule!.resolvedFileName, selfSource)).toBe(true);
    expect(sameHostPath(internal.resolvedModule!.resolvedFileName, importSource)).toBe(true);
    expect(self.sourceLink!.packageInstance.instanceKey)
      .toBe(entry.sourceLink!.packageInstance.instanceKey);
    expect(internal.sourceLink!.packageInstance.instanceKey)
      .toBe(entry.sourceLink!.packageInstance.instanceKey);
    expect(self.sourceLink!.logicalPackageRoot).toBe(self.sourceLink!.physicalPackageRoot);
    expect(internal.sourceLink!.logicalPackageRoot).toBe(internal.sourceLink!.physicalPackageRoot);
  });

  test('keeps established self-reference resolution on the exact preserved locator', () => {
    const fixture = linkedPackageFixture();
    const physicalSelfSource = path.join(fixture.physicalPackageRoot, 'src', 'self.ts');
    const logicalSelfSource = path.join(fixture.logicalPackageRoot, 'src', 'self.ts');
    writeJson(path.join(fixture.physicalPackageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      exports: {
        '.': { types: './dist/types/index.d.ts' },
        './self': { types: './dist/types/self.d.ts' },
      },
    });
    writeText(physicalSelfSource, "export const selfMarker = 'preserved';\n");
    const { resolver } = capturedResolver(fixture.appRoot, 'known-logical-owner', {
      preserveSymlinks: true,
    });

    const entry = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);
    const self = resolver.resolveModuleName(
      `${PACKAGE_NAME}/self`,
      entry.resolvedModule!.resolvedFileName,
    );

    expect(entry.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(self.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(entry.resolvedModule!.resolvedFileName, fixture.logicalSource)).toBe(true);
    expect(sameHostPath(self.resolvedModule!.resolvedFileName, logicalSelfSource)).toBe(true);
    expect(sameHostPath(self.sourceLink!.logicalPackageRoot, fixture.logicalPackageRoot)).toBe(true);
    expect(self.sourceLink!.packageInstance.instanceKey)
      .toBe(entry.sourceLink!.packageInstance.instanceKey);
  });

  test('fails closed when a declaration maps to both TypeScript and TSX sources', () => {
    const fixture = linkedPackageFixture({ sourceExtensions: ['.ts', '.tsx'] });
    const { resolver } = capturedResolver(fixture.appRoot, 'ambiguous-source');

    const resolution = resolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(resolution.kind).toBe(ProjectModuleResolutionKind.Unresolved);
    expect(resolution.resolvedModule).toBeUndefined();
    expect(resolution.sourceLink).toBeNull();
    expect(resolution.opening).toMatchObject({
      openingKind: ProjectModuleResolutionOpeningKind.SourceAmbiguous,
      moduleSpecifier: PACKAGE_NAME,
      logicalPackageRoot: path.resolve(fixture.logicalPackageRoot),
      physicalPackageRoot: path.resolve(fixture.physicalPackageRoot),
      declarationPath: path.resolve(fixture.physicalDeclaration),
    });
    expect(resolution.opening?.sourceCandidates.map((candidate) => path.resolve(candidate)).sort(compareHostPaths)).toEqual([
      path.resolve(fixture.physicalPackageRoot, 'src/index.ts'),
      path.resolve(fixture.physicalPackageRoot, 'src/index.tsx'),
    ].sort(compareHostPaths));
    expect(resolver.readOpenings()).toEqual([resolution.opening]);
  });

  test('invalidates the captured generation when a package junction is retargeted', () => {
    const fixture = linkedPackageFixture();
    const packageRootB = path.join(fixture.root, 'packages', 'linked-toolkit-b');
    const sourceB = writePackage(packageRootB, { marker: 'package-b' });
    const authority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost());
    const firstGeneration = authority.capture({
      projectKey: 'retargeted-junction',
      rootDir: fixture.appRoot,
    });
    const firstScope = firstGeneration.createReadScope('project-module-resolution');
    const firstResolver = new ProjectModuleResolver(
      fixture.appRoot,
      compilerOptions(),
      firstScope.host,
    );
    const firstResolution = firstResolver.resolveModuleName(PACKAGE_NAME, fixture.containingFile);
    const locatorRead = firstScope.readRegisteredInputs().find((read) => {
      const descriptorPath = readPath(read.descriptor);
      return read.kind === SemanticRuntimeProjectInputReadKind.Realpath
        && descriptorPath != null
        && sameHostPath(descriptorPath, fixture.logicalPackageRoot);
    });

    expect(firstResolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(firstResolution.sourceLink!.physicalPackageRoot, fixture.physicalPackageRoot)).toBe(true);
    expect(locatorRead).toBeDefined();
    expect(firstGeneration.validateRegisteredInputValues().isCurrent).toBe(true);

    unlinkSync(fixture.logicalPackageRoot);
    linkDirectory(packageRootB, fixture.logicalPackageRoot);
    expect(sameHostPath(realpathSync(fixture.logicalPackageRoot), packageRootB)).toBe(true);

    expect(locatorRead!.validateObservedValue()).toMatchObject({
      isCurrent: false,
      changedFacets: [SemanticRuntimeProjectInputReadKind.Realpath],
    });
    const staleGeneration = firstGeneration.validateRegisteredInputValues();
    expect(staleGeneration.isCurrent).toBe(false);
    expect(staleGeneration.changedFacets).toContain(SemanticRuntimeProjectInputReadKind.Realpath);

    const secondGeneration = authority.capture({
      projectKey: 'retargeted-junction',
      rootDir: fixture.appRoot,
    });
    const secondScope = secondGeneration.createReadScope('project-module-resolution');
    const secondResolution = new ProjectModuleResolver(
      fixture.appRoot,
      compilerOptions(),
      secondScope.host,
    ).resolveModuleName(PACKAGE_NAME, fixture.containingFile);

    expect(secondGeneration).not.toBe(firstGeneration);
    expect(secondResolution.kind).toBe(ProjectModuleResolutionKind.LinkedSource);
    expect(sameHostPath(secondResolution.resolvedModule!.resolvedFileName, sourceB)).toBe(true);
    expect(sameHostPath(secondResolution.sourceLink!.physicalPackageRoot, packageRootB)).toBe(true);
    expect(secondResolution.sourceLink!.revision).not.toBe(firstResolution.sourceLink!.revision);
  });
});

interface LinkedPackageFixtureOptions {
  readonly linkPackage?: boolean;
  readonly sourceExtensions?: readonly string[];
  readonly writeDeclaration?: boolean;
}

interface LinkedPackageFixture {
  readonly root: string;
  readonly appRoot: string;
  readonly containingFile: string;
  readonly logicalPackageRoot: string;
  readonly physicalPackageRoot: string;
  readonly packageConfig: string;
  readonly logicalDeclaration: string;
  readonly physicalDeclaration: string;
  readonly logicalSource: string;
  readonly sourceFile: string;
}

function linkedPackageFixture(options: LinkedPackageFixtureOptions = {}): LinkedPackageFixture {
  const root = temporaryRoot();
  const appRoot = path.join(root, 'app');
  const containingFile = path.join(appRoot, 'src', 'main.ts');
  const physicalPackageRoot = path.join(root, 'packages', 'linked-toolkit-a');
  const logicalPackageRoot = path.join(appRoot, 'node_modules', '@fixture', 'linked-toolkit');
  const sourceFile = writePackage(physicalPackageRoot, {
    marker: 'package-a',
    sourceExtensions: options.sourceExtensions,
    writeDeclaration: options.writeDeclaration,
  });
  writeText(containingFile, `import { toolkitValue } from '${PACKAGE_NAME}';\n`);
  if (options.linkPackage === false) {
    writePackage(logicalPackageRoot, {
      marker: 'ordinary-copy',
      sourceExtensions: options.sourceExtensions,
      writeDeclaration: options.writeDeclaration,
    });
  } else {
    linkDirectory(physicalPackageRoot, logicalPackageRoot);
  }
  return {
    root,
    appRoot,
    containingFile,
    logicalPackageRoot,
    physicalPackageRoot,
    packageConfig: path.join(physicalPackageRoot, 'tsconfig.json'),
    logicalDeclaration: path.join(logicalPackageRoot, 'dist', 'types', 'index.d.ts'),
    physicalDeclaration: path.join(physicalPackageRoot, 'dist', 'types', 'index.d.ts'),
    logicalSource: path.join(logicalPackageRoot, 'src', 'index.ts'),
    sourceFile,
  };
}

function writePackage(
  packageRoot: string,
  options: {
    readonly marker: string;
    readonly sourceExtensions?: readonly string[];
    readonly writeDeclaration?: boolean;
  },
): string {
  writeJson(path.join(packageRoot, 'package.json'), {
    name: PACKAGE_NAME,
    version: '1.0.0',
    type: 'module',
    types: 'dist/types/index.d.ts',
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
        import: './dist/esm/index.js',
      },
    },
  });
  writeJson(path.join(packageRoot, 'tsconfig-base.json'), {
    compilerOptions: {
      rootDir: 'src',
    },
  });
  writeJson(path.join(packageRoot, 'tsconfig.json'), {
    extends: './tsconfig-base.json',
    compilerOptions: {
      declarationDir: 'dist/types',
    },
  });
  const sourceExtensions = options.sourceExtensions ?? ['.ts'];
  for (const extension of sourceExtensions) {
    writeText(
      path.join(packageRoot, 'src', `index${extension}`),
      `export const toolkitValue = '${options.marker}${extension}';\n`,
    );
  }
  if (options.writeDeclaration === true) {
    writeText(
      path.join(packageRoot, 'dist', 'types', 'index.d.ts'),
      'export declare const toolkitValue: string;\n',
    );
  }
  return path.join(packageRoot, 'src', `index${sourceExtensions[0]!}`);
}

function capturedResolver(
  rootDir: string,
  projectKey: string,
  overrides: ts.CompilerOptions = {},
): {
  readonly generation: ReturnType<SemanticRuntimeProjectInputAuthority['capture']>;
  readonly readScope: ReturnType<
    ReturnType<SemanticRuntimeProjectInputAuthority['capture']>['createReadScope']
  >;
  readonly resolver: ProjectModuleResolver;
} {
  const generation = new SemanticRuntimeProjectInputAuthority(
    new NodeSemanticRuntimeProjectInputHost(),
  ).capture({ projectKey, rootDir });
  const readScope = generation.createReadScope('project-module-resolution');
  return {
    generation,
    readScope,
    resolver: new ProjectModuleResolver(
      rootDir,
      compilerOptions(overrides),
      readScope.host,
    ),
  };
}

function compilerOptions(overrides: ts.CompilerOptions = {}): ts.CompilerOptions {
  return {
    allowJs: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    ...overrides,
  };
}

interface ReadEvidence {
  readonly kind: SemanticRuntimeProjectInputReadKind;
  readonly path: string | null;
  readonly readKey: string;
  readonly observedRevision: string;
  readonly value: unknown;
}

function readEvidence(
  readScope: ReturnType<
    ReturnType<SemanticRuntimeProjectInputAuthority['capture']>['createReadScope']
  >,
): readonly ReadEvidence[] {
  return readScope.readRegisteredInputs().map((read) => {
    const evidencePath = readPath(read.descriptor);
    return {
      kind: read.kind,
      path: evidencePath == null ? null : path.resolve(evidencePath),
      readKey: read.readKey,
      observedRevision: read.observedRevision,
      value: read.value,
    };
  });
}

function readPath(
  descriptor: ReturnType<
    ReturnType<SemanticRuntimeProjectInputAuthority['capture']>['readRegisteredInputs']
  >[number]['descriptor'],
): string | null {
  if ('fileName' in descriptor) {
    return descriptor.fileName;
  }
  if ('directoryName' in descriptor) {
    return descriptor.directoryName;
  }
  return descriptor.rootDir;
}

function compareEvidence(left: ReadEvidence, right: ReadEvidence): number {
  return left.readKey.localeCompare(right.readKey);
}

function compareHostPaths(left: string, right: string): number {
  return hostPathKey(left).localeCompare(hostPathKey(right));
}

function sameHostPath(left: string, right: string): boolean {
  return hostPathKey(left) === hostPathKey(right);
}

function hostPathKey(fileName: string): string {
  const normalized = path.resolve(fileName).replaceAll('\\', '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-linked-package-resolution-'));
  temporaryRoots.push(root);
  return root;
}

function writeText(fileName: string, text: string): void {
  mkdirSync(path.dirname(fileName), { recursive: true });
  writeFileSync(fileName, text, 'utf8');
}

function writeJson(fileName: string, value: unknown): void {
  writeText(fileName, `${JSON.stringify(value, null, 2)}\n`);
}

function linkDirectory(target: string, link: string): void {
  mkdirSync(path.dirname(link), { recursive: true });
  symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}
