import { resolve } from 'node:path';

import { createLiveQueryKernel } from '../live-query/runtime.js';
import {
  isAureliaFrameworkPackageName,
} from '../aurelia-framework-goldens.js';
import type {
  PackageExportsSummary,
} from '../exports-contract.js';

export interface LensOptions {
  readonly repoPath: string;
  readonly packageNames?: readonly string[] | null;
}

export interface LensContext {
  readonly repoPath: string;
  readonly kernel: ReturnType<typeof createLiveQueryKernel>;
  readonly session: ReturnType<typeof createLiveQueryKernel>['session'];
  readonly outputs: ReturnType<ReturnType<typeof createLiveQueryKernel>['loadOutputs']>;
  readonly selectedPackages: readonly PackageExportsSummary[];
}

export function createLensContext(
  options: LensOptions,
): LensContext {
  const repoPath = resolve(options.repoPath);
  const kernel = createLiveQueryKernel({ repoPath });
  const session = kernel.session;
  const outputs = kernel.loadOutputs();
  const explicitPackages = options.packageNames
    ? new Set(options.packageNames)
    : null;

  const selectedPackages = outputs.exports.packages
    .filter((pkg) => explicitPackages
      ? explicitPackages.has(pkg.package_name)
      : isAureliaFrameworkPackageName(pkg.package_name))
    .sort((left, right) => left.package_name.localeCompare(right.package_name));

  return {
    repoPath,
    kernel,
    session,
    outputs,
    selectedPackages,
  };
}
