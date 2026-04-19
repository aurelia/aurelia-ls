import type { SymbolLocation } from './surface-types.js';

export const API_IDS = [
  'di.createInterface',
  'app-task.creating',
  'app-task.hydrating',
  'app-task.hydrated',
  'app-task.activating',
  'app-task.activated',
  'app-task.deactivating',
  'app-task.deactivated',
  'registration.instance',
  'registration.singleton',
  'registration.transient',
  'registration.callback',
  'registration.cachedCallback',
  'registration.aliasTo',
  'createImplementationRegister',
] as const;

export type ApiId =
  typeof API_IDS[number];

export const API_DETECTION_KINDS = [
  'direct-member',
  'simple-alias',
  'destructured-alias',
  'kernel-primitive',
] as const;

export type ApiDetectionKind =
  typeof API_DETECTION_KINDS[number];

export interface ApiDetection {
  readonly apiId: ApiId;
  readonly detectionKind: ApiDetectionKind;
  readonly aliasPath: readonly string[];
  readonly resolvedAt: SymbolLocation | null;
}
