import {
  ResourceDefinitionMetadataPropertyName,
} from '../resources/resource-definition-source.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';

/** Stable identity of a resource-definition metadata source part. */
export enum AppBuilderResourceMetadataId {
  /** `dependencies: [...]` local resource registration metadata. */
  LocalDependencies = 'local-dependencies',
}

/** One resource-definition metadata part backed by Aurelia resource definition semantics. */
export interface AppBuilderResourceMetadataDescriptor {
  readonly id: AppBuilderResourceMetadataId;
  readonly title: string;
  readonly summary: string;
  /** Resource definition metadata property this part writes. */
  readonly metadataPropertyName: ResourceDefinitionMetadataPropertyName;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus families where this metadata can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-operation family for this resource metadata. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this metadata can lower to source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this metadata may accept for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

export const APP_BUILDER_RESOURCE_METADATA: readonly AppBuilderResourceMetadataDescriptor[] = [
  {
    id: AppBuilderResourceMetadataId.LocalDependencies,
    title: 'Local Resource Dependencies',
    summary: 'Register local resources through a resource definition `dependencies` array.',
    metadataPropertyName: ResourceDefinitionMetadataPropertyName.Dependencies,
    syntaxCue: 'dependencies: [Resource]',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptObjectProperty],
    operationKind: AppBuilderPartOperationKind.ApplyResourceMetadata,
    requiredSlotKinds: [AppBuilderPartSlotKind.ResourceDependencyExpressionList],
    optionalSlotKinds: [],
  },
];

/** Look up a resource metadata descriptor by id. */
export function appBuilderResourceMetadataDescriptor(
  id: AppBuilderResourceMetadataId,
): AppBuilderResourceMetadataDescriptor {
  const metadata = APP_BUILDER_RESOURCE_METADATA.find((candidate) => candidate.id === id);
  if (metadata == null) {
    throw new Error(`Unknown app-builder resource metadata '${id}'.`);
  }
  return metadata;
}
