import type { Export } from '../exports/export.js';
import type { SourceNodeRef } from '../refs.js';
import type {
  BundleSpread,
  HelperCall,
  RegisterArgument,
} from './configuration-function-analysis.js';

export const REGISTRY_OBJECT_ORIGIN_KINDS = [
  'object-literal',
  'wrapped-object-literal',
  'factory-return',
] as const;

export type RegistryObjectOriginKind =
  typeof REGISTRY_OBJECT_ORIGIN_KINDS[number];

export const REGISTRY_FACTORY_METHOD_ROLE_KINDS = [
  'registry-factory',
  'configuration-customizer',
] as const;

export type RegistryFactoryMethodRoleKind =
  typeof REGISTRY_FACTORY_METHOD_ROLE_KINDS[number];

export class RegistryMethod {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly source: SourceNodeRef,
    readonly bundleSpreads: readonly BundleSpread[] = [],
    readonly directRegisterArguments: readonly RegisterArgument[] = [],
    readonly helperCalls: readonly HelperCall[] = [],
    readonly note: string | null = null,
  ) {}
}

export class RegistryFactoryMethod {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly role: RegistryFactoryMethodRoleKind,
    readonly source: SourceNodeRef,
    // TODO: returned-registry recovery currently stops at "this factory method
    // returns a registry-like value". The returned registry's own register(...)
    // body needs a later seam instead of being flattened into this method.
    readonly returnsRegistry: boolean,
    readonly bundleSpreads: readonly BundleSpread[] = [],
    readonly directRegisterArguments: readonly RegisterArgument[] = [],
    readonly helperCalls: readonly HelperCall[] = [],
    readonly note: string | null = null,
  ) {}
}

export class RegistryObject {
  constructor(
    readonly id: string,
    readonly sourceExport: Export,
    readonly source: SourceNodeRef,
    readonly originKind: RegistryObjectOriginKind,
    readonly registerMethod: RegistryMethod | null,
    readonly factoryMethods: readonly RegistryFactoryMethod[] = [],
    readonly note: string | null = null,
  ) {}
}
