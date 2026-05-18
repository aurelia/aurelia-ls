import { TypeScriptDeclarationIdentity } from '../kernel/identity.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { CheckerTypeMember } from './type-shape.js';

/**
 * Read the navigable source address for a checker member.
 *
 * Checker-backed members usually carry a declaration identity whose kernel record already owns the declaration source
 * span. Synthetic members and open checker members can still keep a direct source address on the hot member detail.
 */
export function checkerTypeMemberSourceAddressHandle(
  store: KernelStore,
  member: CheckerTypeMember,
): AddressHandle | null {
  if (member.sourceAddressHandle != null) {
    return member.sourceAddressHandle;
  }
  if (member.declarationIdentityHandle == null) {
    return null;
  }
  const identity = store.readIdentity(member.declarationIdentityHandle);
  return identity instanceof TypeScriptDeclarationIdentity
    ? identity.declarationAddressHandle
    : null;
}
