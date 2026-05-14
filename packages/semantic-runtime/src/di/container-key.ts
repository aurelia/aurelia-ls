import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import {
  RegistrationValueKind,
  type RegistrationKeyReference,
  type RegistrationValueReference,
} from '../registration/registration-reference.js';

export const enum ContainerLookupKeyKind {
  /** Runtime key shape is not closed enough to choose a container branch. */
  Unknown = 'unknown',
  /** A constructable user/framework value. */
  Constructable = 'constructable',
  /** A native constructor/function that Aurelia refuses to construct directly. */
  NativeFunction = 'native-function',
  /** A native intrinsic type name rejected by the container JIT registration path. */
  IntrinsicConstructable = 'intrinsic-constructable',
  /** An IRegistry-shaped object or function. */
  Registry = 'registry',
  /** A resolver object supplied directly as a key. */
  Resolver = 'resolver',
  /** An Aurelia interface symbol key. */
  Interface = 'interface',
  /** A string key. */
  String = 'string',
  /** A JavaScript symbol key. */
  Symbol = 'symbol',
  /** A runtime resource key. */
  Resource = 'resource',
  /** An object key that is not known to be registry/resolver/interface. */
  Object = 'object',
  /** A primitive key value other than string/symbol. */
  Primitive = 'primitive',
  /** A null or undefined key. */
  Nullish = 'nullish',
}

/**
 * Runtime-facing DI key request. The identity handle remains the durable join key; the key kind carries the branch
 * information Aurelia's container uses before falling into default resolver, JIT registration, factory, or invoke paths.
 */
export class ContainerLookupKey {
  constructor(
    /** DI key identity used by modeled container maps and product rows. */
    readonly identityHandle: IdentityHandle,
    /** Runtime key shape that chooses framework container behavior. */
    readonly keyKind: ContainerLookupKeyKind,
    /** Local name or literal preview for diagnostics and traces. */
    readonly localName: string | null = null,
    /** Source address for the expression or declaration that supplied the key. */
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

export function containerLookupKey(
  identityHandle: IdentityHandle,
  keyKind: ContainerLookupKeyKind = ContainerLookupKeyKind.Unknown,
  localName: string | null = null,
  sourceAddressHandle: AddressHandle | null = null,
): ContainerLookupKey {
  return new ContainerLookupKey(identityHandle, keyKind, localName, sourceAddressHandle);
}

export function containerLookupKeyForRegistrationKey(
  key: RegistrationKeyReference,
): ContainerLookupKey | null {
  if (key.identityHandle == null) {
    return null;
  }
  return new ContainerLookupKey(
    key.identityHandle,
    keyKindForRegistrationKey(key),
    key.localName,
    key.addressHandle,
  );
}

export function containerLookupKeyForRegistrationValue(
  value: RegistrationValueReference | null,
): ContainerLookupKey | null {
  if (value?.identityHandle == null) {
    return null;
  }
  return new ContainerLookupKey(
    value.identityHandle,
    keyKindForRegistrationValue(value),
    value.localName,
    value.addressHandle,
  );
}

function keyKindForRegistrationKey(
  key: RegistrationKeyReference,
): ContainerLookupKeyKind {
  if (key.localName != null && intrinsicTypeNames.has(key.localName)) {
    return ContainerLookupKeyKind.IntrinsicConstructable;
  }
  return ContainerLookupKeyKind.Unknown;
}

function keyKindForRegistrationValue(
  value: RegistrationValueReference,
): ContainerLookupKeyKind {
  if (value.localName != null && intrinsicTypeNames.has(value.localName)) {
    return ContainerLookupKeyKind.IntrinsicConstructable;
  }
  switch (value.valueKind) {
    case RegistrationValueKind.Constructable:
    case RegistrationValueKind.PlainClass:
    case RegistrationValueKind.StaticResourceType:
      return ContainerLookupKeyKind.Constructable;
    case RegistrationValueKind.Registry:
    case RegistrationValueKind.FrameworkRegistration:
      return ContainerLookupKeyKind.Registry;
    case RegistrationValueKind.Resolver:
      return ContainerLookupKeyKind.Resolver;
    case RegistrationValueKind.ResourceDefinition:
      return ContainerLookupKeyKind.Resource;
    case RegistrationValueKind.Instance:
    case RegistrationValueKind.Callback:
    case RegistrationValueKind.CachedCallback:
    case RegistrationValueKind.AliasTarget:
    case RegistrationValueKind.Factory:
    case RegistrationValueKind.ObjectMap:
    case RegistrationValueKind.Unknown:
      return ContainerLookupKeyKind.Unknown;
  }
}

const intrinsicTypeNames = new Set<string>([
  'Array',
  'ArrayBuffer',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Map',
  'Number',
  'Object',
  'Promise',
  'RangeError',
  'ReferenceError',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'SyntaxError',
  'TypeError',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'URIError',
  'WeakMap',
  'WeakSet',
]);
