import type { AddressHandle, IdentityHandle } from './handles.js';
import {
  ConstructableDiKeyIdentity,
  InterfaceDiKeyIdentity,
  StringDiKeyIdentity,
  UnknownDiKeyIdentity,
} from './identity.js';
import { isInterfaceKeyName } from './interface-key.js';

export type DiKeyIdentitySeedKind =
  | 'constructable-key'
  | 'string-key'
  | 'identifier-name'
  | 'property-access-name'
  | 'open-expression';

interface ConstructableDiKeyIdentitySeed {
  /** Evaluator- or checker-proven constructable value accepted by Aurelia's container as a key. */
  readonly kind: 'constructable-key';
  readonly candidateName: string | null;
  readonly declarationHandle: IdentityHandle | null;
}

interface StringDiKeyIdentitySeed {
  /** Exact string literal key supplied to a registration or resolver API. */
  readonly kind: 'string-key';
  readonly candidateName: string | null;
}

interface NamedExpressionDiKeyIdentitySeed {
  /** Identifier or property-access name that may resolve to an interface symbol but is not a proven value key. */
  readonly kind: 'identifier-name' | 'property-access-name';
  readonly candidateName: string | null;
}

interface OpenExpressionDiKeyIdentitySeed {
  /** Expression whose runtime DI key shape stayed open. */
  readonly kind: 'open-expression';
  readonly candidateName: null;
}

export type DiKeyIdentitySeed =
  | ConstructableDiKeyIdentitySeed
  | StringDiKeyIdentitySeed
  | NamedExpressionDiKeyIdentitySeed
  | OpenExpressionDiKeyIdentitySeed;

export type DiKeyIdentityRecord =
  | ConstructableDiKeyIdentity
  | StringDiKeyIdentity
  | InterfaceDiKeyIdentity
  | UnknownDiKeyIdentity;

export function diKeyIdentityRecord(
  identityHandle: IdentityHandle,
  seed: DiKeyIdentitySeed,
  addressHandle: AddressHandle,
  unknownSummary: string,
): DiKeyIdentityRecord {
  if (seed.kind === 'constructable-key' && seed.declarationHandle != null) {
    return new ConstructableDiKeyIdentity(identityHandle, seed.declarationHandle, seed.candidateName, addressHandle);
  }
  if (seed.kind === 'string-key' && seed.candidateName != null) {
    return new StringDiKeyIdentity(identityHandle, seed.candidateName, addressHandle);
  }
  if (isInterfaceKeyName(seed.candidateName)) {
    return new InterfaceDiKeyIdentity(identityHandle, seed.candidateName, null, addressHandle);
  }
  return new UnknownDiKeyIdentity(identityHandle, addressHandle, unknownSummary);
}

export function localNameForDiKeyIdentitySeed(
  seed: DiKeyIdentitySeed,
): string | null {
  return seed.kind === 'constructable-key' || seed.kind === 'identifier-name' || seed.kind === 'property-access-name'
    ? seed.candidateName
    : null;
}
