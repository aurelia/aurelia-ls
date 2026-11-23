import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type { CheckerTypeShapeAccess } from '../type-system/checker-type-shape-access.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import { describeAddress, type SemanticSourceReference } from './source-reference.js';

/** A bindable rename can start calling an existing handler even when there was no old handler to rename. */
export function bindableRenameCallbackConflict(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  typeAccess: CheckerTypeShapeAccess,
  oldName: string,
  newName: string,
  isChanged: (source: SemanticSourceReference | null) => boolean,
): string | null {
  const callback = `${newName}Changed`;
  for (const definition of emission.resources.readDefinitions()) {
    if (!('bindables' in definition)) continue;
    for (const bindable of definition.bindables) {
      if (bindable.name !== oldName || bindable.callbackSourceAddressHandle != null
        || bindable.callback !== `${oldName}Changed` || bindable.callbackTarget != null) continue;
      const target = bindable.propertyTarget?.addressHandle ?? bindable.nameSourceAddressHandle ?? bindable.sourceAddressHandle;
      if (!isChanged(describeAddress(store, target))) continue;
      const ownerType = definition.target.targetType;
      const owner = ownerType == null ? null : typeAccess.resolveReference(ownerType);
      const existing = owner == null ? null : typeAccess.memberValueAccess(owner, callback, `rename-callback:${definition.name}:${callback}`).member;
      if (existing != null && !isChanged(describeAddress(store, checkerTypeMemberSourceAddressHandle(store, existing)))) {
        return `Renaming '${oldName}' to '${newName}' would attach the existing '${callback}' callback on '${definition.name}'.`;
      }
    }
  }
  return null;
}
