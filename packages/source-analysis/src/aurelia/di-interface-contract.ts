export const DI_INTERFACE_SCHEMA_VERSION = 'v0alpha2' as const;

export const REGISTRATION_KINDS = [
  'instance',
  'singleton',
  'transient',
  'callback',
  'cachedCallback',
  'aliasTo',
  'unknown',
] as const;

export type RegistrationKind =
  typeof REGISTRATION_KINDS[number];

export const REGISTRATION_TARGET_MODES = [
  'implicit-interface-self',
  'explicit-first-arg',
  'unknown',
] as const;

export type RegistrationTargetMode =
  typeof REGISTRATION_TARGET_MODES[number];

export interface Registration {
  readonly kind: RegistrationKind;
  readonly targetMode: RegistrationTargetMode;
  readonly args: readonly string[];
}
export type {
  PackageRef,
  SymbolLocation,
} from './surface-types.js';
import type {
  PackageRef,
  SymbolLocation,
} from './surface-types.js';
import type {
  ApiDetection,
} from './api-detection-contract.js';

export interface InterfaceSurface {
  readonly name: string | null;
  readonly declaredAt: SymbolLocation | null;
  readonly exportAliasPath: readonly string[];
  readonly factoryAliasPath: readonly string[];
}

export interface InterfaceRecord {
  readonly package: PackageRef;
  readonly export: SymbolLocation;
  readonly surface: InterfaceSurface;
  readonly api: ApiDetection;
  readonly registration: Registration | null;
}
