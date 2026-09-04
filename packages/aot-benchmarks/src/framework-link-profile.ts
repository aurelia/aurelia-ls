import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  AOT_FRAMEWORK_LINK_MAP_POSTURE,
  AOT_FRAMEWORK_LINK_PROTOCOL,
  AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS,
  AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT,
  AOT_RC2_LINK_MODULES_EXPECTATIONS,
  AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT,
} from '@aurelia-ls/aot';
import type {
  AotFrameworkLinkModuleInput,
  AotFrameworkLinkPolicy,
  AotFrameworkLinksOptions,
} from '@aurelia-ls/aot-vite';

import type {
  FrameworkPackageEntryProvenance,
  PreparedFrameworkPackageGraph,
} from './framework-graph.js';

export interface Rc2FrameworkLinkProfileRequest {
  readonly framework: PreparedFrameworkPackageGraph;
  readonly policy?: AotFrameworkLinkPolicy;
}

/**
 * Join the AOT-owned RC2 recipe to one exact benchmark-owned installed graph.
 * This is deliberately not a compatibility matcher: every source and installed
 * entry hash must be the recipe hash before Vite is allowed to request linking.
 */
export function createRc2FrameworkLinkProfile(
  request: Rc2FrameworkLinkProfileRequest,
): AotFrameworkLinksOptions {
  const framework = request.framework;
  const graphFingerprint = framework.provenance.graphFingerprint;
  assertSha256(graphFingerprint, 'prepared framework graph fingerprint');
  if (graphFingerprint !== AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT) {
    throw new Error(
      `RC2 framework-link recipe expects graph '${AOT_RC2_FRAMEWORK_LINK_GRAPH_FINGERPRINT}', `
      + `but the prepared graph is '${graphFingerprint}'.`,
    );
  }
  const packages = indexPackages(framework.provenance.packages);
  const modules = recipeModules(framework, packages, AOT_RC2_FRAMEWORK_LINK_EXPECTATIONS);

  return {
    protocol: AOT_FRAMEWORK_LINK_PROTOCOL,
    graphFingerprint,
    mapPosture: AOT_FRAMEWORK_LINK_MAP_POSTURE,
    policy: request.policy ?? 'require-applied',
    modules,
  };
}

/** Join the temporary RC2 build-only derivation to its published link packages. */
export async function createRc2LinkedModulesProfile(
  request: Rc2FrameworkLinkProfileRequest,
): Promise<AotFrameworkLinksOptions> {
  const framework = request.framework;
  const graphFingerprint = framework.provenance.graphFingerprint;
  if (graphFingerprint !== AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT) {
    throw new Error(
      `RC2 linked-modules recipe expects graph '${AOT_RC2_LINK_MODULES_GRAPH_FINGERPRINT}', `
      + `but the prepared graph is '${graphFingerprint}'.`,
    );
  }
  const entries = indexPackages(framework.provenance.packages);
  const modules = recipeModules(framework, entries, AOT_RC2_LINK_MODULES_EXPECTATIONS);
  const packages = await Promise.all(([
    '@aurelia/kernel', '@aurelia/runtime', '@aurelia/runtime-html',
  ] as const).map(async packageName => {
    const entry = entries.get(packageName)!; // recipeModules has admitted the complete inventory.
    const packageRoot = path.resolve(path.dirname(framework.entryFor(packageName)), '../..');
    const manifestPath = path.join(packageRoot, 'dist/link/manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      readonly schema: string;
      readonly protocol: string;
      readonly package: { readonly name: string; readonly version: string };
      readonly origin: { readonly standardEntry: { readonly path: string; readonly sha256: string } };
      readonly manifestSha256: string;
    };
    if (
      manifest.schema !== 'aurelia-framework-link-package/v1'
      || manifest.protocol !== 'aurelia-framework-link/v1'
      || manifest.package.name !== packageName
      || manifest.package.version !== entry.version
      || manifest.origin.standardEntry.path !== entry.esmEntry
      || manifest.origin.standardEntry.sha256 !== entry.installedEsmSha256
    ) {
      throw new Error(`Link manifest '${manifestPath}' does not describe the prepared package entry.`);
    }
    assertSha256(manifest.manifestSha256, `${packageName} canonical manifest hash`);
    return {
      packageName,
      packageRoot,
      expectedManifestSha256: manifest.manifestSha256,
      expectedStandardEntrySha256: entry.installedEsmSha256,
    };
  }));
  return {
    protocol: AOT_FRAMEWORK_LINK_PROTOCOL,
    graphFingerprint,
    mapPosture: AOT_FRAMEWORK_LINK_MAP_POSTURE,
    policy: request.policy ?? 'require-applied',
    modules,
    packages,
  };
}

function recipeModules(
  framework: PreparedFrameworkPackageGraph,
  packages: ReadonlyMap<string, FrameworkPackageEntryProvenance>,
  expectations: readonly Pick<AotFrameworkLinkModuleInput,
    'role' | 'packageName' | 'packageRelativePath' | 'expectedSha256'>[],
): AotFrameworkLinkModuleInput[] {
  return expectations.map((expectation): AotFrameworkLinkModuleInput => {
    const entry = packages.get(expectation.packageName);
    if (entry === undefined) {
      throw new Error(
        `RC2 framework-link recipe requires '${expectation.packageName}', but the prepared graph does not contain it.`,
      );
    }
    assertExactRecipeEntry(entry, expectation.packageRelativePath, expectation.expectedSha256);
    const resolvedId = path.resolve(framework.entryFor(expectation.packageName));
    assertResolvedEntry(
      resolvedId,
      expectation.packageName,
      expectation.packageRelativePath,
    );
    return {
      role: expectation.role,
      packageName: expectation.packageName,
      packageRelativePath: expectation.packageRelativePath,
      resolvedId,
      expectedSha256: expectation.expectedSha256,
    };
  });
}

function indexPackages(
  entries: readonly FrameworkPackageEntryProvenance[],
): ReadonlyMap<string, FrameworkPackageEntryProvenance> {
  const result = new Map<string, FrameworkPackageEntryProvenance>();
  for (const entry of entries) {
    if (result.has(entry.packageName)) {
      throw new Error(`Prepared framework graph repeats package '${entry.packageName}'.`);
    }
    result.set(entry.packageName, entry);
  }
  return result;
}

function assertExactRecipeEntry(
  entry: FrameworkPackageEntryProvenance,
  expectedPath: string,
  expectedSha256: string,
): void {
  assertSha256(expectedSha256, `${entry.packageName} recipe entry hash`);
  if (entry.esmEntry !== expectedPath) {
    throw new Error(
      `RC2 framework-link recipe expects ${entry.packageName}/${expectedPath}, but the prepared graph publishes '${entry.esmEntry}'.`,
    );
  }
  if (
    entry.sourceEsmSha256 !== expectedSha256
    || entry.installedEsmSha256 !== expectedSha256
  ) {
    throw new Error(
      `RC2 framework-link recipe expects ${entry.packageName}/${expectedPath} ${expectedSha256}; `
      + `prepared source/installed hashes are ${entry.sourceEsmSha256}/${entry.installedEsmSha256}.`,
    );
  }
}

function assertResolvedEntry(
  resolvedId: string,
  packageName: string,
  packageRelativePath: string,
): void {
  const normalized = resolvedId.replaceAll('\\', '/');
  const expectedSuffix = `/node_modules/${packageName}/${packageRelativePath}`;
  if (!path.isAbsolute(resolvedId) || !normalized.endsWith(expectedSuffix)) {
    throw new Error(
      `Prepared framework entry for '${packageName}' must end in '${expectedSuffix}'; received '${resolvedId}'.`,
    );
  }
}

function assertSha256(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase sha256 digest.`);
  }
}
