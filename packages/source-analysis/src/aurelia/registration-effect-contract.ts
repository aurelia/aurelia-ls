import type { ApiDetection } from './api-detection-contract.js';
import type { Registration } from './di-interface-contract.js';
import type { PackageRef, SymbolLocation } from './surface-types.js';

export const REGISTRATION_EFFECT_SCHEMA_VERSION = 'v0alpha1' as const;

export const REGISTRATION_EFFECT_LOCALITIES = [
  'interface-default-builder',
  'static-register-field',
  'static-register-method',
  'static-registry-constructor-method',
  'exported-object-register-method',
  'exported-object-registry-constructor',
  'resource-register-method',
  'local-runtime-call',
] as const;

export type RegistrationEffectLocality =
  typeof REGISTRATION_EFFECT_LOCALITIES[number];

export const REGISTRATION_EFFECT_KINDS = [
  'registration-call',
  'container-register-call',
  'register-emitter',
] as const;

export type RegistrationEffectKind =
  typeof REGISTRATION_EFFECT_KINDS[number];

export const REGISTRATION_OWNER_KINDS = [
  'interface-export',
  'exported-class',
  'exported-object',
] as const;

export type RegistrationOwnerKind =
  typeof REGISTRATION_OWNER_KINDS[number];

export interface RegistrationSurfaceOwner {
  readonly kind: RegistrationOwnerKind;
  readonly location: SymbolLocation;
}

export interface RegistrationEffectRecord {
  readonly package: PackageRef;
  readonly owner: RegistrationSurfaceOwner;
  readonly locality: RegistrationEffectLocality;
  readonly site: SymbolLocation;
  readonly effectKind: RegistrationEffectKind;
  readonly sourceExpressionText: string;
  readonly api: ApiDetection | null;
  readonly registration: Registration | null;
  readonly emitterInterfaceKeyExpressionText: string | null;
  readonly containerRegisterArgumentTexts: readonly string[];
}
