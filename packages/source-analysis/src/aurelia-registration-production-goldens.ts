import { resolve } from 'node:path';

import { type ExportsOutput } from './exports-contract.js';
import { createLiveQueryKernel } from './live-query/runtime.js';
import {
  ConfigurationRegistrationScanner,
  type ConfigurationRegistrationProduction,
} from './aurelia/index.js';
import {
  buildFrameworkFromExportsOutput,
  resolveAureliaFrameworkRepoPath,
} from './aurelia-configuration-goldens.js';

export const AURELIA_REGISTRATION_PRODUCTION_GOLDEN_SCHEMA_VERSION = 'v0alpha1' as const;
export const AURELIA_REGISTRATION_PRODUCTION_GOLDEN_SUITE_ID = 'aurelia-registration-productions' as const;

export interface AureliaRegistrationProductionGoldenRow {
  readonly packageName: string | null;
  readonly exportName: string;
  readonly declarationFile: string | null;
  readonly methodName: string;
  readonly producerCall: string;
  readonly apiStatus: string;
  readonly apiId: string | null;
  readonly productionKind: string;
}

export interface AureliaRegistrationProductionGoldenSuite {
  readonly schemaVersion: typeof AURELIA_REGISTRATION_PRODUCTION_GOLDEN_SCHEMA_VERSION;
  readonly suiteId: typeof AURELIA_REGISTRATION_PRODUCTION_GOLDEN_SUITE_ID;
  readonly summary: {
    readonly packageCount: number;
    readonly productionCount: number;
  };
  readonly productions: readonly AureliaRegistrationProductionGoldenRow[];
}

export interface CollectAureliaRegistrationProductionGoldensOptions {
  readonly repoPath: string;
  readonly packageNames?: readonly string[] | null;
}

export function collectAureliaRegistrationProductionGoldens(
  options: CollectAureliaRegistrationProductionGoldensOptions,
): AureliaRegistrationProductionGoldenSuite {
  const repoPath = resolve(options.repoPath);
  const kernel = createLiveQueryKernel({ repoPath });
  const outputs = kernel.loadOutputs();
  return collectFromExportsOutput(outputs.exports, {
    packageNames: options.packageNames,
    repoPath,
  });
}

export function collectFromExportsOutput(
  output: ExportsOutput,
  options: {
    readonly packageNames?: readonly string[] | null;
    readonly repoPath: string;
  },
): AureliaRegistrationProductionGoldenSuite {
  const framework = buildFrameworkFromExportsOutput(output, options);
  const scanner = new ConfigurationRegistrationScanner({
    configurations: framework.configurations(),
  });
  const rows = dedupeRows(
    scanner.scanAll()
      .slice()
      .sort(compareProductions)
      .map(normalizeProduction),
    (current) => JSON.stringify(current),
  );

  return {
    schemaVersion: AURELIA_REGISTRATION_PRODUCTION_GOLDEN_SCHEMA_VERSION,
    suiteId: AURELIA_REGISTRATION_PRODUCTION_GOLDEN_SUITE_ID,
    summary: {
      packageCount: framework.readPackageNames().length,
      productionCount: rows.length,
    },
    productions: rows,
  };
}

export {
  resolveAureliaFrameworkRepoPath,
};

function compareProductions(
  left: ConfigurationRegistrationProduction,
  right: ConfigurationRegistrationProduction,
): number {
  return compareNullable(left.ownerConfiguration.sourceExport.sourceFile?.path ?? null, right.ownerConfiguration.sourceExport.sourceFile?.path ?? null)
    || left.ownerConfiguration.sourceExport.name.localeCompare(right.ownerConfiguration.sourceExport.name)
    || left.originMethod.name.localeCompare(right.originMethod.name)
    || left.producerCall.calleeName.localeCompare(right.producerCall.calleeName)
    || left.production.kind.localeCompare(right.production.kind);
}

function compareNullable(
  left: string | null,
  right: string | null,
): number {
  if (left === right) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  return left.localeCompare(right);
}

function dedupeRows<T>(
  rows: readonly T[],
  toKey: (row: T) => string,
): readonly T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const row of rows) {
    const key = toKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

function derivePackageName(
  declarationFile: string | null,
): string | null {
  if (declarationFile == null) {
    return null;
  }

  const normalized = declarationFile.replace(/\\/g, '/');
  const match = normalized.match(/^packages\/([^/]+)\//);
  if (match?.[1] == null) {
    return null;
  }
  return match[1] === 'aurelia'
    ? 'aurelia'
    : `@aurelia/${match[1]}`;
}

function normalizeProduction(
  current: ConfigurationRegistrationProduction,
): AureliaRegistrationProductionGoldenRow {
  const declarationFile = current.ownerConfiguration.sourceExport.sourceFile?.path ?? null;
  return {
    packageName: derivePackageName(declarationFile),
    exportName: current.ownerConfiguration.sourceExport.name,
    declarationFile,
    methodName: current.originMethod.name,
    producerCall: current.producerCall.calleeName,
    apiStatus: current.apiIngress.status,
    apiId: current.apiIngress.api?.id ?? null,
    productionKind: current.production.kind,
  };
}
