import type { Export } from '../exports/index.js';
import type { ResourceDefinitionKind } from './contracts.js';

export const RESOURCE_RECOGNITION_PATH_KINDS = [
  'decorator',
  'static-$au',
  'registrable-metadata',
  'register-method',
  'convention',
] as const;

export type ResourceRecognitionPathKind =
  typeof RESOURCE_RECOGNITION_PATH_KINDS[number];

export const RESOURCE_RECOGNITION_STATUSES = [
  'open',
  'matched',
  'not-applicable',
] as const;

export type ResourceRecognitionStatus =
  typeof RESOURCE_RECOGNITION_STATUSES[number];

export const RESOURCE_CARRIER_KINDS = [
  'decorator',
  'static-au',
  'registrable-metadata',
  'configuration-emission',
  'convention',
] as const;

export type ResourceCarrierKind =
  typeof RESOURCE_CARRIER_KINDS[number];

export class ResourceRecognitionPath {
  constructor(
    readonly kind: ResourceRecognitionPathKind,
    readonly status: ResourceRecognitionStatus,
    readonly note: string | null = null,
  ) {}
}

export class ResourceCarrier {
  constructor(
    readonly kind: ResourceCarrierKind,
    readonly note: string | null = null,
  ) {}
}

// This is the missing middle layer between export surfaces and final Aurelia
// resource definitions. It records which recognition paths and carriers are in
// play before convergence/materialization is able to produce a real definition.
export class ResourceCandidate {
  constructor(
    readonly id: string,
    readonly sourceExport: Export,
    readonly possibleKinds: readonly ResourceDefinitionKind[] = [],
    readonly recognitionPaths: readonly ResourceRecognitionPath[] = [],
    readonly carriers: readonly ResourceCarrier[] = [],
  ) {}
}
