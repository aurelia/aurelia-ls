import type { AddressHandle, IdentityHandle } from './handles.js';
import {
  InterfaceDiKeyIdentity,
  StringDiKeyIdentity,
  UnknownDiKeyIdentity,
} from './identity.js';
import { isInterfaceKeyName } from './interface-key.js';

export type DiKeyIdentitySeedKind =
  | 'string-key'
  | 'identifier-name'
  | 'property-access-name'
  | 'open-expression';

export interface DiKeyIdentitySeed {
  readonly kind: DiKeyIdentitySeedKind;
  readonly candidateName: string | null;
}

export type DiKeyIdentityRecord =
  | StringDiKeyIdentity
  | InterfaceDiKeyIdentity
  | UnknownDiKeyIdentity;

export function diKeyIdentityRecord(
  identityHandle: IdentityHandle,
  seed: DiKeyIdentitySeed,
  addressHandle: AddressHandle,
  unknownSummary: string,
): DiKeyIdentityRecord {
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
  return seed.kind === 'identifier-name' || seed.kind === 'property-access-name'
    ? seed.candidateName
    : null;
}
