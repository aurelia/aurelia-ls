import type {
  InterfaceRecord,
  RegistrationKind,
} from './di-interface-contract.js';
import {
  DI_INTERFACE_SCHEMA_VERSION,
} from './di-interface-contract.js';
import {
  collectDiInterfaceExports,
  type CollectDiInterfaceExportsOptions,
} from './di-interface-discovery.js';
import {
  getRegistrationPrimaryExpression,
} from './registration-shape.js';

export const DI_INTERFACE_LENS_ID = 'di-interfaces' as const;

export interface PackageSummary {
  readonly packageName: string;
  readonly interfaceCount: number;
  readonly aliasedCount: number;
  readonly factoryAliasCount: number;
  readonly registrationCount: number;
}

export interface GoldenRecord {
  readonly packageName: string;
  readonly exportedName: string;
  readonly exportedAt: {
    readonly file: string | null;
    readonly line: number | null;
  };
  readonly interfaceName: string | null;
  readonly interfaceDeclaredAt: {
    readonly name: string | null;
    readonly file: string | null;
    readonly line: number | null;
  } | null;
  readonly exportAliasPath: readonly string[];
  readonly factoryAliasPath: readonly string[];
  readonly registrationKind: RegistrationKind | null;
  readonly registrationExpression: string | null;
}

export interface GoldenSuite {
  readonly schemaVersion: typeof DI_INTERFACE_SCHEMA_VERSION;
  readonly lensId: typeof DI_INTERFACE_LENS_ID;
  readonly summary: {
    readonly packageCount: number;
    readonly interfaceCount: number;
    readonly aliasedCount: number;
    readonly factoryAliasCount: number;
    readonly registrationCount: number;
  };
  readonly packages: readonly PackageSummary[];
  readonly records: readonly GoldenRecord[];
}

export function collectDiInterfaceGoldens(
  options: CollectDiInterfaceExportsOptions,
): GoldenSuite {
  const records = collectDiInterfaceExports(options)
    .slice()
    .sort(compareRows)
    .map(normalizeRow);
  const packages = summarizePackages(records);

  return {
    schemaVersion: DI_INTERFACE_SCHEMA_VERSION,
    lensId: DI_INTERFACE_LENS_ID,
    summary: {
      packageCount: packages.length,
      interfaceCount: records.length,
      aliasedCount: records.filter((row) => row.exportAliasPath.length > 0).length,
      factoryAliasCount: records.filter((row) => row.factoryAliasPath.length > 0).length,
      registrationCount: records.filter((row) => row.registrationKind !== null).length,
    },
    packages,
    records,
  };
}

function summarizePackages(
  records: readonly GoldenRecord[],
): readonly PackageSummary[] {
  const grouped = new Map<string, GoldenRecord[]>();
  for (const record of records) {
    const current = grouped.get(record.packageName);
    if (current) {
      current.push(record);
      continue;
    }
    grouped.set(record.packageName, [record]);
  }

  return [...grouped.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([packageName, packageRecords]) => ({
      packageName,
      interfaceCount: packageRecords.length,
      aliasedCount: packageRecords.filter((row) => row.exportAliasPath.length > 0).length,
      factoryAliasCount: packageRecords.filter((row) => row.factoryAliasPath.length > 0).length,
      registrationCount: packageRecords.filter((row) => row.registrationKind !== null).length,
    }));
}

function normalizeRow(
  row: InterfaceRecord,
): GoldenRecord {
  return {
    packageName: row.package.name,
    exportedName: row.export.name ?? '(anonymous)',
    exportedAt: {
      file: row.export.file,
      line: row.export.line,
    },
    interfaceName: row.surface.name,
    interfaceDeclaredAt: row.surface.declaredAt == null
      ? null
      : {
        name: row.surface.declaredAt.name,
        file: row.surface.declaredAt.file,
        line: row.surface.declaredAt.line,
      },
    exportAliasPath: [...row.surface.exportAliasPath],
    factoryAliasPath: [...row.surface.factoryAliasPath],
    registrationKind: row.registration?.kind ?? null,
    registrationExpression: row.registration == null
      ? null
      : getRegistrationPrimaryExpression(row.registration),
  };
}

function compareRows(
  left: InterfaceRecord,
  right: InterfaceRecord,
): number {
  return left.package.name.localeCompare(right.package.name)
    || (left.export.name ?? '').localeCompare(right.export.name ?? '')
    || (left.export.file ?? '').localeCompare(right.export.file ?? '')
    || (left.surface.declaredAt?.file ?? '').localeCompare(right.surface.declaredAt?.file ?? '');
}
