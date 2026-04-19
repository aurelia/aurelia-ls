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

export interface Registration {
  readonly kind: RegistrationKind;
  readonly expressionText: string | null;
}

export interface PackageRef {
  readonly name: string;
  readonly dir: string;
  readonly analysisEntrypoint: string;
}

export interface SymbolLocation {
  readonly name: string | null;
  readonly file: string | null;
  readonly line: number | null;
}

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
  readonly registration: Registration | null;
}
