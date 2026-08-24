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

import { AuthoredSourceBoundary } from '../src/boot/source-boundary.js';
import {
  DefaultEvaluationModuleResolutionPolicy,
  FileSystemEvaluationModuleSourceHost,
  ResolvedEvaluationModuleSourceScope,
} from '../src/evaluation/module-host.js';
import { normalizeModuleKey } from '../src/evaluation/module-graph.js';
import {
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputReadKind,
} from '../src/kernel/project-input.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('evaluation module package origin', () => {
  test.each([false, true])(
    'retains linked package origin and exact module identity with preserveSymlinks=%s',
    (preserveSymlinks) => {
      const fixtureRoot = temporaryRoot();
      const appRoot = path.join(fixtureRoot, 'app');
      const packageRoot = path.join(fixtureRoot, 'packages', 'aurelia-toolkit');
      const sharedPackageRoot = path.join(fixtureRoot, 'packages', 'shared-config');
      const logicalPackageRoot = path.join(appRoot, 'node_modules', '@acme', 'aurelia-toolkit');
      const logicalSharedPackageRoot = path.join(
        logicalPackageRoot,
        'node_modules',
        '@acme',
        'shared-config',
      );
      const entryFile = path.join(appRoot, 'src', 'main.ts');
      const packageEntry = path.join(packageRoot, 'src', 'index.ts');
      const packageConfig = path.join(packageRoot, 'src', 'config.ts');
      const sharedPackageEntry = path.join(sharedPackageRoot, 'src', 'index.ts');
      const expectedPackageEntry = preserveSymlinks
        ? path.join(logicalPackageRoot, 'src', 'index.ts')
        : path.resolve(packageEntry);
      const expectedPackageConfig = preserveSymlinks
        ? path.join(logicalPackageRoot, 'src', 'config.ts')
        : path.resolve(packageConfig);
      const expectedSharedPackageEntry = preserveSymlinks
        ? path.join(logicalSharedPackageRoot, 'src', 'index.ts')
        : path.resolve(sharedPackageEntry);
      const escapedRelativeFile = preserveSymlinks
        ? path.join(appRoot, 'node_modules', '@acme', 'outside.ts')
        : path.join(fixtureRoot, 'packages', 'outside.ts');
      const escapedRootedFile = path.join(fixtureRoot, 'rooted-leak.ts');

      writeText(entryFile, "import { toolkitConfig } from '@acme/aurelia-toolkit';\n");
      writeJson(path.join(packageRoot, 'package.json'), {
        name: '@acme/aurelia-toolkit',
        version: '0.0.0',
        type: 'module',
        dependencies: {
          '@acme/shared-config': '0.0.0',
          aurelia: '2.0.0',
        },
        exports: {
          '.': {
            types: './dist/types/index.d.ts',
            import: './dist/esm/index.js',
          },
          './config': {
            types: './dist/types/config.d.ts',
            import: './dist/esm/config.js',
          },
        },
        imports: {
          '#config': './src/config.ts',
          '#external': '@acme/shared-config',
        },
      });
      writeText(
        path.join(packageRoot, 'dist', 'types', 'index.d.ts'),
        'export declare const toolkitConfig: { marker: string };\n',
      );
      writeText(
        path.join(packageRoot, 'dist', 'types', 'config.d.ts'),
        'export declare const toolkitConfig: { marker: string };\n',
      );
      writeText(
        path.join(packageRoot, 'dist', 'esm', 'index.js'),
        "export { toolkitConfig } from './config.js';\n",
      );
      writeText(
        path.join(packageRoot, 'dist', 'esm', 'config.js'),
        "export const toolkitConfig = { marker: 'runtime' };\n",
      );
      writeText(
        packageEntry,
        [
          "export { toolkitConfig } from './config.js';",
          "export { toolkitConfig as importedConfig } from '#config';",
          '',
        ].join('\n'),
      );
      writeText(packageConfig, "export const toolkitConfig = { marker: 'linked-source' };\n");
      writeJson(path.join(sharedPackageRoot, 'package.json'), {
        name: '@acme/shared-config',
        version: '0.0.0',
        type: 'module',
        dependencies: { aurelia: '2.0.0' },
        exports: {
          '.': {
            types: './dist/types/index.d.ts',
            import: './dist/esm/index.js',
          },
        },
      });
      writeText(
        path.join(sharedPackageRoot, 'dist', 'types', 'index.d.ts'),
        'export declare const sharedConfig: { marker: string };\n',
      );
      writeText(sharedPackageEntry, "export const sharedConfig = { marker: 'shared' };\n");
      writeText(escapedRelativeFile, "export const leaked = 'outside-package';\n");
      writeText(escapedRootedFile, "export const rootedLeak = 'outside-package';\n");
      linkDirectory(
        sharedPackageRoot,
        path.join(packageRoot, 'node_modules', '@acme', 'shared-config'),
      );
      linkDirectory(packageRoot, logicalPackageRoot);

      const { host, readScope } = evaluationHost(appRoot, { preserveSymlinks });
      const resolvedPackageEntry = host.resolveModuleSpecifier(entryFile, '@acme/aurelia-toolkit');

      expect(resolvedPackageEntry).not.toBeNull();
      expectModuleIdentity(appRoot, resolvedPackageEntry!, expectedPackageEntry);
      expect(
        sameHostPath(
          absoluteModulePath(appRoot, resolvedPackageEntry!),
          preserveSymlinks
            ? realpathSync(packageEntry)
            : path.join(logicalPackageRoot, 'src', 'index.ts'),
        ),
      ).toBe(false);

      const resolvedRelative = host.resolveModuleSpecifier(resolvedPackageEntry!, './config.js');
      const resolvedPackageImport = host.resolveModuleSpecifier(resolvedPackageEntry!, '#config');
      const resolvedSelfReference = host.resolveModuleSpecifier(
        resolvedPackageEntry!,
        '@acme/aurelia-toolkit/config',
      );
      const resolvedExternalPackageImport = host.resolveModuleSpecifier(
        resolvedPackageEntry!,
        '#external',
      );

      expect(resolvedRelative).not.toBeNull();
      expectModuleIdentity(appRoot, resolvedRelative!, expectedPackageConfig);
      expect(resolvedPackageImport).not.toBeNull();
      expectModuleIdentity(appRoot, resolvedPackageImport!, expectedPackageConfig);
      expect(resolvedSelfReference).not.toBeNull();
      expectModuleIdentity(appRoot, resolvedSelfReference!, expectedPackageConfig);
      expect(resolvedExternalPackageImport).not.toBeNull();
      expectModuleIdentity(appRoot, resolvedExternalPackageImport!, expectedSharedPackageEntry);

      const entryOrigin = host.readPackageOrigin(resolvedPackageEntry!);
      const relativeOrigin = host.readPackageOrigin(resolvedRelative!);
      const packageImportOrigin = host.readPackageOrigin(resolvedPackageImport!);
      const selfReferenceOrigin = host.readPackageOrigin(resolvedSelfReference!);
      const externalPackageImportOrigin = host.readPackageOrigin(resolvedExternalPackageImport!);

      expect(entryOrigin).toMatchObject({
        packageRelativePath: 'src/index.ts',
        buildLinks: [expect.objectContaining({
          containingFile: path.resolve(entryFile),
          moduleSpecifier: '@acme/aurelia-toolkit',
          logicalDeclarationPath: expect.stringContaining('dist'),
          logicalSourcePath: expect.stringContaining('src'),
          logicalRuntimePath: expect.stringContaining('dist'),
        })],
        packageInstance: {
          name: '@acme/aurelia-toolkit',
          version: '0.0.0',
        },
      });
      if (preserveSymlinks) {
        expect(entryOrigin?.packageInstance.locatorRootDir).not.toBeNull();
        expect(sameHostPath(entryOrigin!.packageInstance.locatorRootDir!, logicalPackageRoot)).toBe(
          true,
        );
        expect(entryOrigin?.packageInstance.locatorKey).toMatch(/^path:/u);
      } else {
        expect(entryOrigin?.packageInstance.locatorRootDir).toBeNull();
        expect(entryOrigin?.packageInstance.locatorKey).toBeNull();
        expect(entryOrigin?.packageInstance.instanceKey).toBe(
          entryOrigin?.packageInstance.owner.ownerKey,
        );
      }
      expect(
        sameHostPath(entryOrigin!.packageInstance.physicalRootDir, realpathSync(packageRoot)),
      ).toBe(true);
      expect(sameHostPath(
        entryOrigin!.buildLinks[0]!.physicalRuntimePath,
        path.join(packageRoot, 'dist', 'esm', 'index.js'),
      )).toBe(true);
      expect(relativeOrigin?.packageInstance.instanceKey).toBe(
        entryOrigin?.packageInstance.instanceKey,
      );
      expect(packageImportOrigin?.packageInstance.instanceKey).toBe(
        entryOrigin?.packageInstance.instanceKey,
      );
      expect(selfReferenceOrigin?.packageInstance.instanceKey).toBe(
        entryOrigin?.packageInstance.instanceKey,
      );
      expect(externalPackageImportOrigin).toMatchObject({
        packageRelativePath: 'src/index.ts',
        packageInstance: {
          name: '@acme/shared-config',
          version: '0.0.0',
        },
      });
      expect(externalPackageImportOrigin?.packageInstance.instanceKey).not.toBe(
        entryOrigin?.packageInstance.instanceKey,
      );

      const relativeEscapeSpecifier = emittedJavaScriptRelativeSpecifier(
        expectedPackageEntry,
        escapedRelativeFile,
      );
      expectRejectedPackageEscape(host, resolvedPackageEntry!, relativeEscapeSpecifier);
      expectRejectedPackageEscape(
        host,
        resolvedPackageEntry!,
        normalizeModuleKey(path.resolve(escapedRootedFile)),
      );
      expect(readScope.readRegisteredInputs()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: SemanticRuntimeProjectInputReadKind.Realpath,
            readKey: expect.stringContaining(normalizeModuleKey(logicalPackageRoot).toLowerCase()),
          }),
        ]),
      );
    },
  );

  test('retains distinct import and require runtime targets beside one declaration/source identity', () => {
    const appRoot = temporaryRoot();
    const entryFile = path.join(appRoot, 'src', 'main.ts');
    const packageRoot = path.join(appRoot, 'node_modules', '@acme', 'aurelia-modes');
    const sourceEntry = path.join(packageRoot, 'src', 'index.ts');
    writeText(entryFile, "import { marker } from '@acme/aurelia-modes';\n");
    writeJson(path.join(packageRoot, 'package.json'), {
      name: '@acme/aurelia-modes',
      version: '1.0.0',
      type: 'module',
      dependencies: { aurelia: '2.0.0' },
      exports: {
        '.': {
          types: './dist/types/index.d.ts',
          import: './dist/esm/index.js',
          require: './dist/cjs/index.cjs',
        },
      },
    });
    writeText(path.join(packageRoot, 'dist', 'types', 'index.d.ts'), 'export declare const marker: string;\n');
    writeText(path.join(packageRoot, 'dist', 'esm', 'index.js'), "export const marker = 'import';\n");
    writeText(path.join(packageRoot, 'dist', 'cjs', 'index.cjs'), "exports.marker = 'require';\n");
    writeText(sourceEntry, "export const marker = 'source';\n");

    const { host } = evaluationHost(appRoot);
    const imported = host.resolveModuleSpecifier(
      entryFile,
      '@acme/aurelia-modes',
      ts.ModuleKind.ESNext,
    );
    const required = host.resolveModuleSpecifier(
      entryFile,
      '@acme/aurelia-modes',
      ts.ModuleKind.CommonJS,
    );

    expect(imported).not.toBeNull();
    expect(required).toBe(imported);
    const origin = host.readPackageOrigin(imported!);
    expect(origin?.buildLinks).toHaveLength(2);
    expect(new Set(origin!.buildLinks.map((link) => link.resolutionMode))).toEqual(new Set([
      ts.ModuleKind.ESNext,
      ts.ModuleKind.CommonJS,
    ]));
    expect(new Set(origin!.buildLinks.map((link) =>
      normalizeModuleKey(path.relative(packageRoot, link.physicalRuntimePath))
    ))).toEqual(new Set(['dist/esm/index.js', 'dist/cjs/index.cjs']));
  });

  test('honors an authored TypeScript paths target before an opaque node_modules homonym', () => {
    const appRoot = temporaryRoot();
    const entryFile = path.join(appRoot, 'src', 'main.ts');
    const authoredTarget = path.join(appRoot, 'src', 'toolkit.ts');
    const opaquePackageRoot = path.join(appRoot, 'node_modules', 'toolkit');

    writeText(entryFile, "import { localValue } from 'toolkit';\n");
    writeText(authoredTarget, "export const localValue = 'authored';\n");
    writeJson(path.join(opaquePackageRoot, 'package.json'), {
      name: 'toolkit',
      version: '0.0.0',
      types: './dist/index.d.ts',
    });
    writeText(
      path.join(opaquePackageRoot, 'dist', 'index.d.ts'),
      'export declare const packageValue: string;\n',
    );

    const { host } = evaluationHost(appRoot, {
      baseUrl: appRoot,
      paths: {
        toolkit: ['./src/toolkit.ts'],
      },
    });
    const resolved = host.resolveModuleSpecifier(entryFile, 'toolkit');

    expect(resolved).not.toBeNull();
    expectModuleIdentity(appRoot, resolved!, authoredTarget);
    expect(host.readPackageOrigin(resolved!)).toBeNull();
    expect(host.snapshotProfile().moduleResolutions.typeScriptCalls).toBe(1);
  });

  test('allows app baseUrl resolution but requires explicit paths for a package edge to leave its package', () => {
    const fixtureRoot = temporaryRoot();
    const appRoot = path.join(fixtureRoot, 'app');
    const packageRoot = path.join(fixtureRoot, 'packages', 'aurelia-toolkit');
    const logicalPackageRoot = path.join(appRoot, 'node_modules', '@acme', 'aurelia-toolkit');
    const entryFile = path.join(appRoot, 'src', 'main.ts');
    const baseUrlTarget = path.join(appRoot, 'src', 'workspace-tool.ts');
    const packageEntry = path.join(packageRoot, 'src', 'index.ts');

    writeText(entryFile, "import { workspaceValue } from 'workspace-tool';\n");
    writeText(baseUrlTarget, "export const workspaceValue = 'workspace';\n");
    writeJson(path.join(packageRoot, 'package.json'), {
      name: '@acme/aurelia-toolkit',
      version: '0.0.0',
      type: 'module',
      dependencies: { aurelia: '2.0.0' },
      exports: {
        '.': {
          types: './dist/types/index.d.ts',
          import: './dist/esm/index.js',
        },
      },
    });
    writeText(
      path.join(packageRoot, 'dist', 'types', 'index.d.ts'),
      'export declare const value: string;\n',
    );
    writeText(packageEntry, "export const value = 'package';\n");
    linkDirectory(packageRoot, logicalPackageRoot);

    const { host: baseUrlHost } = evaluationHost(appRoot, {
      baseUrl: path.join(appRoot, 'src'),
    });
    const appResolvedByBaseUrl = baseUrlHost.resolveModuleSpecifier(entryFile, 'workspace-tool');
    const packageResolvedWithBaseUrl = baseUrlHost.resolveModuleSpecifier(
      entryFile,
      '@acme/aurelia-toolkit',
    );

    expect(appResolvedByBaseUrl).not.toBeNull();
    expectModuleIdentity(appRoot, appResolvedByBaseUrl!, baseUrlTarget);
    expect(packageResolvedWithBaseUrl).not.toBeNull();
    expectRejectedPackageEscape(baseUrlHost, packageResolvedWithBaseUrl!, 'workspace-tool');

    const { host: pathsHost } = evaluationHost(appRoot, {
      baseUrl: appRoot,
      paths: {
        'workspace-tool': ['./src/workspace-tool.ts'],
      },
    });
    const packageResolvedWithPaths = pathsHost.resolveModuleSpecifier(
      entryFile,
      '@acme/aurelia-toolkit',
    );
    expect(packageResolvedWithPaths).not.toBeNull();
    const escapedThroughAuthoredPaths = pathsHost.resolveModuleSpecifier(
      packageResolvedWithPaths!,
      'workspace-tool',
    );
    expect(escapedThroughAuthoredPaths).not.toBeNull();
    expectModuleIdentity(appRoot, escapedThroughAuthoredPaths!, baseUrlTarget);
    expect(pathsHost.readPackageOrigin(escapedThroughAuthoredPaths!)).toBeNull();
  });

  test('keeps own package imports and self exports in authored-project package scope', () => {
    const appRoot = temporaryRoot();
    const entryFile = path.join(appRoot, 'src', 'main.ts');
    const configFile = path.join(appRoot, 'src', 'config.ts');
    const selfExportSource = path.join(appRoot, 'src', 'foo.ts');

    writeJson(path.join(appRoot, 'package.json'), {
      name: '@acme/app',
      version: '1.0.0',
      type: 'module',
      imports: {
        '#config': './src/config.ts',
      },
      exports: {
        './foo': {
          types: './dist/types/foo.d.ts',
          import: './dist/esm/foo.js',
        },
      },
    });
    writeText(
      entryFile,
      ["import { config } from '#config';", "import { foo } from '@acme/app/foo';", ''].join('\n'),
    );
    writeText(configFile, "export const config = 'project-config';\n");
    writeText(selfExportSource, "export const foo = 'project-self-export';\n");
    writeText(
      path.join(appRoot, 'dist', 'types', 'foo.d.ts'),
      'export declare const foo: string;\n',
    );

    const authoredSources = new AuthoredSourceBoundary(appRoot, [
      path.join(appRoot, 'node_modules'),
    ]);
    const { host } = evaluationHost(appRoot, {}, authoredSources);
    const resolvedConfig = host.resolveModuleSpecifier(entryFile, '#config');
    const resolvedSelfExport = host.resolveModuleSpecifier(entryFile, '@acme/app/foo');

    expect(resolvedConfig).not.toBeNull();
    expectModuleIdentity(appRoot, resolvedConfig!, configFile);
    expect(resolvedSelfExport).not.toBeNull();
    expectModuleIdentity(appRoot, resolvedSelfExport!, selfExportSource);

    expect(host.readPackageOrigin(resolvedConfig!)).toMatchObject({
      packageRelativePath: 'src/config.ts',
      sourceScope: ResolvedEvaluationModuleSourceScope.AuthoredProject,
      packageInstance: {
        name: '@acme/app',
        version: '1.0.0',
      },
    });
    expect(host.readPackageOrigin(resolvedSelfExport!)).toMatchObject({
      packageRelativePath: 'src/foo.ts',
      sourceScope: ResolvedEvaluationModuleSourceScope.AuthoredProject,
      packageInstance: {
        name: '@acme/app',
        version: '1.0.0',
      },
    });
    expect(host.snapshotProfile().moduleResolutions).toMatchObject({
      packageExternalBoundaries: 0,
      packagePolicyHits: 0,
      packagePolicyMisses: 0,
    });
  });

  test.each([false, true])(
    'canonicalizes two aliases to one physical package only with preserveSymlinks=%s',
    (preserveSymlinks) => {
      const fixtureRoot = temporaryRoot();
      const appRoot = path.join(fixtureRoot, 'app');
      const packageRoot = path.join(fixtureRoot, 'packages', 'aliased-toolkit');
      const aliasARoot = path.join(appRoot, 'node_modules', 'toolkit-a');
      const aliasBRoot = path.join(appRoot, 'node_modules', 'toolkit-b');
      const entryFile = path.join(appRoot, 'src', 'main.ts');
      const packageEntry = path.join(packageRoot, 'src', 'index.ts');

      writeText(
        entryFile,
        [
          "import { value as valueA } from 'toolkit-a';",
          "import { value as valueB } from 'toolkit-b';",
          '',
        ].join('\n'),
      );
      writeJson(path.join(packageRoot, 'package.json'), {
        name: '@acme/aurelia-aliased-toolkit',
        version: '0.0.0',
        type: 'module',
        dependencies: { aurelia: '2.0.0' },
        exports: {
          '.': {
            types: './dist/types/index.d.ts',
            import: './dist/esm/index.js',
          },
        },
      });
      writeText(
        path.join(packageRoot, 'dist', 'types', 'index.d.ts'),
        'export declare const value: string;\n',
      );
      writeText(packageEntry, "export const value = 'aliased';\n");
      linkDirectory(packageRoot, aliasARoot);
      linkDirectory(packageRoot, aliasBRoot);

      const { host } = evaluationHost(appRoot, { preserveSymlinks });
      const resolvedA = host.resolveModuleSpecifier(entryFile, 'toolkit-a');
      const resolvedB = host.resolveModuleSpecifier(entryFile, 'toolkit-b');

      expect(resolvedA).not.toBeNull();
      expect(resolvedB).not.toBeNull();
      expectModuleIdentity(
        appRoot,
        resolvedA!,
        preserveSymlinks ? path.join(aliasARoot, 'src', 'index.ts') : realpathSync(packageEntry),
      );
      expectModuleIdentity(
        appRoot,
        resolvedB!,
        preserveSymlinks ? path.join(aliasBRoot, 'src', 'index.ts') : realpathSync(packageEntry),
      );

      const originA = host.readPackageOrigin(resolvedA!);
      const originB = host.readPackageOrigin(resolvedB!);
      expect(originA?.packageInstance.name).toBe('@acme/aurelia-aliased-toolkit');
      expect(originB?.packageInstance.name).toBe('@acme/aurelia-aliased-toolkit');
      expect(
        sameHostPath(originA!.packageInstance.physicalRootDir, realpathSync(packageRoot)),
      ).toBe(true);
      expect(
        sameHostPath(originB!.packageInstance.physicalRootDir, realpathSync(packageRoot)),
      ).toBe(true);
      if (preserveSymlinks) {
        expect(resolvedA).not.toBe(resolvedB);
        expect(originA?.packageInstance.instanceKey).not.toBe(originB?.packageInstance.instanceKey);
      } else {
        expect(resolvedA).toBe(resolvedB);
        expect(originA?.packageInstance.instanceKey).toBe(originB?.packageInstance.instanceKey);
      }
    },
  );

  test.each([false, true])(
    'keeps equal package metadata at distinct physical roots separate with preserveSymlinks=%s',
    (preserveSymlinks) => {
      const fixtureRoot = temporaryRoot();
      const appRoot = path.join(fixtureRoot, 'app');
      const packageRootA = path.join(fixtureRoot, 'packages', 'toolkit-a');
      const packageRootB = path.join(fixtureRoot, 'packages', 'toolkit-b');
      const aliasARoot = path.join(appRoot, 'node_modules', 'toolkit-a');
      const aliasBRoot = path.join(appRoot, 'node_modules', 'toolkit-b');
      const entryFile = path.join(appRoot, 'src', 'main.ts');
      const packageEntryA = writeAdmittedPackage(
        packageRootA,
        '@acme/aurelia-duplicated-toolkit',
        'physical-a',
      );
      const packageEntryB = writeAdmittedPackage(
        packageRootB,
        '@acme/aurelia-duplicated-toolkit',
        'physical-b',
      );

      writeText(
        entryFile,
        [
          "import { value as valueA } from 'toolkit-a';",
          "import { value as valueB } from 'toolkit-b';",
          '',
        ].join('\n'),
      );
      linkDirectory(packageRootA, aliasARoot);
      linkDirectory(packageRootB, aliasBRoot);

      const { host } = evaluationHost(appRoot, { preserveSymlinks });
      const resolvedA = host.resolveModuleSpecifier(entryFile, 'toolkit-a');
      const resolvedB = host.resolveModuleSpecifier(entryFile, 'toolkit-b');

      expect(resolvedA).not.toBeNull();
      expect(resolvedB).not.toBeNull();
      expectModuleIdentity(
        appRoot,
        resolvedA!,
        preserveSymlinks ? path.join(aliasARoot, 'src', 'index.ts') : packageEntryA,
      );
      expectModuleIdentity(
        appRoot,
        resolvedB!,
        preserveSymlinks ? path.join(aliasBRoot, 'src', 'index.ts') : packageEntryB,
      );

      const originA = host.readPackageOrigin(resolvedA!);
      const originB = host.readPackageOrigin(resolvedB!);
      expect(originA).toMatchObject({
        packageInstance: {
          name: '@acme/aurelia-duplicated-toolkit',
          version: '0.0.0',
        },
      });
      expect(originB).toMatchObject({
        packageInstance: {
          name: '@acme/aurelia-duplicated-toolkit',
          version: '0.0.0',
        },
      });
      expect(originA?.packageInstance.owner.ownerKey).not.toBe(
        originB?.packageInstance.owner.ownerKey,
      );
      expect(originA?.packageInstance.instanceKey).not.toBe(originB?.packageInstance.instanceKey);
      expect(
        sameHostPath(originA!.packageInstance.physicalRootDir, realpathSync(packageRootA)),
      ).toBe(true);
      expect(
        sameHostPath(originB!.packageInstance.physicalRootDir, realpathSync(packageRootB)),
      ).toBe(true);
    },
  );

  test.each([false, true])(
    'keeps a package import target in its nested node_modules owner with preserveSymlinks=%s',
    (preserveSymlinks) => {
      const appRoot = temporaryRoot();
      const outerPackageRoot = path.join(appRoot, 'node_modules', '@acme', 'aurelia-toolkit');
      const innerPackageRoot = path.join(
        outerPackageRoot,
        'node_modules',
        '@acme',
        'shared-config',
      );
      const entryFile = path.join(appRoot, 'src', 'main.ts');
      const outerPackageEntry = path.join(outerPackageRoot, 'src', 'index.ts');
      const innerPackageEntry = path.join(innerPackageRoot, 'src', 'index.ts');
      const innerQuerySource = path.join(innerPackageRoot, 'src', 'query.ts');

      writeText(entryFile, "import { toolkitConfig } from '@acme/aurelia-toolkit';\n");
      writeJson(path.join(outerPackageRoot, 'package.json'), {
        name: '@acme/aurelia-toolkit',
        version: '0.0.0',
        type: 'module',
        dependencies: {
          '@acme/shared-config': '0.0.0',
          aurelia: '2.0.0',
        },
        exports: {
          '.': {
            types: './dist/types/index.d.ts',
            import: './dist/esm/index.js',
          },
        },
        imports: {
          '#external': '@acme/shared-config',
        },
      });
      writeText(
        path.join(outerPackageRoot, 'dist', 'types', 'index.d.ts'),
        'export declare const toolkitConfig: string;\n',
      );
      writeText(
        outerPackageEntry,
        "export { sharedConfig as toolkitConfig } from '#external';\n",
      );
      writeAdmittedPackage(innerPackageRoot, '@acme/shared-config', 'nested');
      writeText(innerQuerySource, "export const query = 'nested';\n");

      const { host } = evaluationHost(appRoot, { preserveSymlinks });
      const resolvedOuter = host.resolveModuleSpecifier(entryFile, '@acme/aurelia-toolkit');
      expect(resolvedOuter).not.toBeNull();
      expectModuleIdentity(appRoot, resolvedOuter!, outerPackageEntry);

      const resolvedInner = host.resolveModuleSpecifier(resolvedOuter!, '#external');
      expect(resolvedInner).not.toBeNull();
      expectModuleIdentity(appRoot, resolvedInner!, innerPackageEntry);

      const outerOrigin = host.readPackageOrigin(resolvedOuter!);
      const innerOrigin = host.readPackageOrigin(resolvedInner!);
      expect(innerOrigin).toMatchObject({
        packageRelativePath: 'src/index.ts',
        packageInstance: {
          name: '@acme/shared-config',
          version: '0.0.0',
        },
      });
      expect(innerOrigin?.packageInstance.instanceKey).not.toBe(
        outerOrigin?.packageInstance.instanceKey,
      );
      expect(
        sameHostPath(innerOrigin!.packageInstance.physicalRootDir, innerPackageRoot),
      ).toBe(true);
      expectRejectedPackageEscape(
        host,
        resolvedOuter!,
        '../node_modules/@acme/shared-config/src/query.ts?raw',
      );
    },
  );

  test('invalidates captured package reads when a logical locator is retargeted', () => {
    const fixtureRoot = temporaryRoot();
    const appRoot = path.join(fixtureRoot, 'app');
    const packageRootA = path.join(fixtureRoot, 'packages', 'toolkit-a');
    const packageRootB = path.join(fixtureRoot, 'packages', 'toolkit-b');
    const logicalPackageRoot = path.join(appRoot, 'node_modules', '@acme', 'aurelia-toolkit');
    const entryFile = path.join(appRoot, 'src', 'main.ts');

    writeText(entryFile, "import { value } from '@acme/aurelia-toolkit';\n");
    writeAdmittedPackage(packageRootA, '@acme/aurelia-toolkit', 'same-content');
    writeAdmittedPackage(packageRootB, '@acme/aurelia-toolkit', 'same-content');
    linkDirectory(packageRootA, logicalPackageRoot);

    const { generation, host, readScope } = evaluationHost(appRoot, { preserveSymlinks: true });
    const resolved = host.resolveModuleSpecifier(entryFile, '@acme/aurelia-toolkit');

    expect(resolved).not.toBeNull();
    expectModuleIdentity(appRoot, resolved!, path.join(logicalPackageRoot, 'src', 'index.ts'));
    expect(
      sameHostPath(
        host.readPackageOrigin(resolved!)!.packageInstance.physicalRootDir,
        packageRootA,
      ),
    ).toBe(true);
    const locatorRealpathReads = readScope
      .readRegisteredInputs()
      .filter(
        (read) =>
          read.kind === SemanticRuntimeProjectInputReadKind.Realpath &&
          read.readKey.toLowerCase().includes(normalizeModuleKey(logicalPackageRoot).toLowerCase()),
      );
    expect(locatorRealpathReads.length).toBeGreaterThan(0);
    expect(generation.validateRegisteredInputValues().isCurrent).toBe(true);

    unlinkSync(logicalPackageRoot);
    linkDirectory(packageRootB, logicalPackageRoot);
    expect(sameHostPath(realpathSync(logicalPackageRoot), packageRootB)).toBe(true);

    expect(locatorRealpathReads.some((read) => !read.validateObservedValue().isCurrent)).toBe(true);
    expect(generation.validateRegisteredInputValues()).toMatchObject({
      isCurrent: false,
      changedFacets: expect.arrayContaining([SemanticRuntimeProjectInputReadKind.Realpath]),
    });
  });
});

function evaluationHost(
  rootDir: string,
  compilerOptions: ts.CompilerOptions = {},
  authoredSources: AuthoredSourceBoundary | null = null,
): {
  readonly generation: ReturnType<SemanticRuntimeProjectInputAuthority['capture']>;
  readonly host: FileSystemEvaluationModuleSourceHost;
  readonly readScope: ReturnType<
    ReturnType<SemanticRuntimeProjectInputAuthority['capture']>['createReadScope']
  >;
} {
  const generation = new SemanticRuntimeProjectInputAuthority().capture({
    projectKey: 'evaluation-module-package-origin',
    rootDir,
  });
  const readScope = generation.createReadScope('evaluation-module-package-origin');
  return {
    generation,
    host: new FileSystemEvaluationModuleSourceHost(
      rootDir,
      readScope.host,
      {
        allowJs: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        ...compilerOptions,
      },
      {
        ...DefaultEvaluationModuleResolutionPolicy,
        admitSourceShippedPackageEntrypoints: true,
      },
      authoredSources,
    ),
    readScope,
  };
}

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-evaluation-package-origin-'));
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

function writeAdmittedPackage(rootDir: string, packageName: string, marker: string): string {
  const entryFile = path.join(rootDir, 'src', 'index.ts');
  writeJson(path.join(rootDir, 'package.json'), {
    name: packageName,
    version: '0.0.0',
    type: 'module',
    dependencies: { aurelia: '2.0.0' },
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
        import: './dist/esm/index.js',
      },
    },
  });
  writeText(
    path.join(rootDir, 'dist', 'types', 'index.d.ts'),
    'export declare const value: string;\n',
  );
  writeText(entryFile, `export const value = '${marker}';\n`);
  return entryFile;
}

function absoluteModulePath(rootDir: string, moduleKey: string): string {
  return path.isAbsolute(moduleKey) ? path.resolve(moduleKey) : path.resolve(rootDir, moduleKey);
}

function sameHostPath(left: string, right: string): boolean {
  const normalize = (value: string): string => {
    const normalized = normalizeModuleKey(path.resolve(value));
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  };
  return normalize(left) === normalize(right);
}

function expectModuleIdentity(rootDir: string, moduleKey: string, expectedPath: string): void {
  expect(sameHostPath(absoluteModulePath(rootDir, moduleKey), expectedPath)).toBe(true);
}

function emittedJavaScriptRelativeSpecifier(fromFile: string, toFile: string): string {
  const relative = normalizeModuleKey(path.relative(path.dirname(fromFile), toFile)).replace(
    /\.ts$/u,
    '.js',
  );
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function expectRejectedPackageEscape(
  host: FileSystemEvaluationModuleSourceHost,
  fromModuleKey: string,
  moduleSpecifier: string,
): void {
  const boundariesBefore = host.snapshotProfile().moduleResolutions.packageExternalBoundaries;
  expect(host.resolveModuleSpecifier(fromModuleKey, moduleSpecifier)).toBeNull();
  expect(host.snapshotProfile().moduleResolutions.packageExternalBoundaries).toBe(
    boundariesBefore + 1,
  );
}
