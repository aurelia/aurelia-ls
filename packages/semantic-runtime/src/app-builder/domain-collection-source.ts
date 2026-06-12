import type { AppBuilderDomainDescriptor } from './domain-descriptor.js';
import {
  appBuilderDomainFieldSeedLiteral,
  type AppBuilderDomainFieldSourceModel,
} from './domain-field-source.js';
import {
  appBuilderDomainEntityConstructionExpressionSource,
  AppBuilderDomainEntityConstructionInputStyle,
} from './domain-entity-source.js';
import type { AppBuilderSeedRecord } from './seed-data.js';
import { appBuilderSeedRecordLiteral } from './source-lowering-helpers.js';

/** Formatting knobs for a generated domain-entity array initializer. */
export interface AppBuilderDomainCollectionInitializerSourceOptions {
  /** Indentation before each generated seed row. */
  readonly rowIndent?: string;
  /** Indentation before the closing array bracket. */
  readonly closingIndent?: string;
  readonly constructionInputStyle?: AppBuilderDomainEntityConstructionInputStyle;
  /** Extra constructor properties such as owned children derived from each seed record. */
  readonly extraProperties?: readonly AppBuilderDomainCollectionInitializerExtraPropertySource[];
}

/** Extra constructor property emitted for every generated domain entity seed row. */
export interface AppBuilderDomainCollectionInitializerExtraPropertySource {
  /** Generated entity constructor/member name for this extra property. */
  readonly memberName: string;
  /** Return the TypeScript expression for this property on one seed row. */
  readonly expressionForRecord: (record: AppBuilderSeedRecord, recordIndex: number) => string;
}

/** Build a typed domain-entity array initializer from caller-supplied seed records. */
export function appBuilderDomainCollectionInitializerSource(
  domain: Pick<AppBuilderDomainDescriptor, 'entityTypeName' | 'identityMemberName'>,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  seedRecords: readonly AppBuilderSeedRecord[],
  options: AppBuilderDomainCollectionInitializerSourceOptions = {},
): string {
  if (seedRecords.length === 0) {
    return '[]';
  }
  const rowIndent = options.rowIndent ?? '    ';
  const closingIndent = options.closingIndent ?? '  ';
  const rows = seedRecords.map((record, recordIndex) => {
    const expression = appBuilderDomainSeedRecordConstructionExpressionSource(
      domain,
      fields,
      record,
      { ...options, recordIndex, baseIndent: rowIndent },
    );
    return `${rowIndent}${expression}`;
  });
  return `[\n${rows.join(',\n')},\n${closingIndent}]`;
}

/** Emit one generated domain-entity construction expression from a caller seed record. */
export function appBuilderDomainSeedRecordConstructionExpressionSource(
  domain: Pick<AppBuilderDomainDescriptor, 'entityTypeName' | 'identityMemberName'>,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  record: AppBuilderSeedRecord,
  options: AppBuilderDomainCollectionInitializerSourceOptions & {
    readonly recordIndex?: number;
    readonly baseIndent?: string;
  } = {},
): string {
  const recordIndex = options.recordIndex ?? 0;
  return appBuilderDomainEntityConstructionExpressionSource({
    entityTypeName: domain.entityTypeName,
    fields,
    constructionInputStyle: options.constructionInputStyle,
  }, [
    {
      memberName: domain.identityMemberName,
      expression: appBuilderSeedRecordLiteral(record[domain.identityMemberName]),
    },
    ...fields.map((field) => ({
      memberName: field.memberName,
      expression: appBuilderDomainFieldSeedLiteral(record, field),
    })),
    ...(options.extraProperties ?? []).map((property) => ({
      memberName: property.memberName,
      expression: property.expressionForRecord(record, recordIndex),
    })),
  ], { baseIndent: options.baseIndent });
}
