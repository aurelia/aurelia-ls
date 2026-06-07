import {
  SourcePlan,
  SourcePlanAssembly,
  SourcePlanConflictPolicy,
  SourcePlanFormattingPolicy,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  SourcePlanPackageToolingPolicy,
  SourcePlanFileRole,
  SourcePlanPolicy,
  SourcePlanTextAuthority,
} from '../source-plan/source-plan.js';
import type { AppBuilderDomainDescriptor } from './domain-descriptor.js';
import { appBuilderDomainCollectionInitializerSource } from './domain-collection-source.js';
import { appBuilderDomainEntityClassSource } from './domain-entity-source.js';
import {
  appBuilderDomainFieldOptionPropertySource,
  appBuilderDomainFieldSourceModels,
  appBuilderDomainFiniteOptionFields,
} from './domain-field-source.js';
import type { AppBuilderSeedRecord } from './seed-data.js';

export interface AppBuilderDiStateClassSourcePlanRequest {
  readonly rootDir: string;
  readonly stateModelPath: string;
  readonly domain: AppBuilderDomainDescriptor;
  readonly seedRecords?: readonly AppBuilderSeedRecord[] | null;
}

export function appBuilderDiStateClassSourcePlan(request: AppBuilderDiStateClassSourcePlanRequest): SourcePlan {
  const stateClassName = `${request.domain.entityTypeName}State`;
  const fields = appBuilderDomainFieldSourceModels(request.domain.fields, {
    entityTypeName: request.domain.entityTypeName,
  });
  const domainEntitySource = appBuilderDomainEntityClassSource({
    entityTypeName: request.domain.entityTypeName,
    identityMemberName: request.domain.identityMemberName,
    identityValueKind: request.domain.identityValueKind,
    fields,
  }).trimEnd();
  const finiteOptionProperties = appBuilderDomainFiniteOptionFields(fields)
    .map((field) => `${appBuilderDomainFieldOptionPropertySource(field)}\n`)
    .join('');
  const seedRows = appBuilderDomainCollectionInitializerSource(request.domain, fields, request.seedRecords ?? []);
  const source = [
    domainEntitySource,
    '',
    `export class ${stateClassName} {`,
    finiteOptionProperties.trimEnd(),
    `  readonly ${request.domain.collectionMemberName}: ${request.domain.entityTypeName}[] = ${seedRows};`,
    '}',
    '',
  ]
    .filter((line, index) => line.length > 0 || index !== 3)
    .join('\n');
  return new SourcePlanAssembly(
    request.rootDir,
    new SourcePlanPolicy(
      SourcePlanConflictPolicy.MustNotExist,
      SourcePlanFormattingPolicy.AppBuilderBaseline,
      SourcePlanPackageToolingPolicy.NotModeled,
    ),
    SourcePlanTextAuthority.AppBuilderGenerated,
  ).addFile({
    path: request.stateModelPath,
    role: SourcePlanFileRole.StateModel,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateStateModel,
    text: source,
  }).build();
}
