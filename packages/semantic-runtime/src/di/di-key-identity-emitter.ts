import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import {
  InterfaceDiKeyIdentity,
  ResourceDiKeyIdentity,
} from '../kernel/identity.js';
import type {
  KernelStoreReadView,
  KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  frameworkIntrinsicDiKeyForName,
  frameworkIntrinsicDiKeyLocal,
  type FrameworkIntrinsicDiKey,
} from './framework-intrinsic-di-key.js';

export class DiKeyIdentityEmitter {
  private readonly emittedIdentityHandles = new Set<IdentityHandle>();
  private readonly interfaceKeyIdentityHandles = new Map<string, IdentityHandle>();

  constructor(private readonly records: KernelStoreReadView) {}

  reset(): void {
    this.emittedIdentityHandles.clear();
  }

  interfaceKeyIdentityHandle(interfaceName: FrameworkIntrinsicDiKey): IdentityHandle {
    let handle = this.interfaceKeyIdentityHandles.get(interfaceName);
    if (handle === undefined) {
      handle = this.records.handles.identity(frameworkIntrinsicDiKeyLocal(interfaceName));
      this.interfaceKeyIdentityHandles.set(interfaceName, handle);
    }
    return handle;
  }

  frameworkOrLocalInterfaceKeyIdentityHandle(
    interfaceName: string,
    localHandle: IdentityHandle,
  ): IdentityHandle {
    const intrinsic = frameworkIntrinsicDiKeyForName(interfaceName);
    return intrinsic == null ? localHandle : this.interfaceKeyIdentityHandle(intrinsic);
  }

  emitInterfaceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    interfaceName: string,
    addressHandle: AddressHandle | null,
  ): void {
    if (this.emittedIdentityHandles.has(handle) || this.records.read(handle) != null) {
      return;
    }
    this.emittedIdentityHandles.add(handle);
    records.push(new InterfaceDiKeyIdentity(
      handle,
      interfaceName,
      null,
      addressHandle,
    ));
  }

  emitResourceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    resourceIdentityHandle: IdentityHandle,
    resourceKey: string,
    addressHandle: AddressHandle | null,
  ): void {
    if (this.emittedIdentityHandles.has(handle) || this.records.read(handle) != null) {
      return;
    }
    this.emittedIdentityHandles.add(handle);
    records.push(new ResourceDiKeyIdentity(
      handle,
      resourceIdentityHandle,
      resourceKey,
      addressHandle,
    ));
  }
}

/** Stable identity local for one canonical resource identity exposed through one exact runtime key. */
export function resourceDiKeyIdentityLocal(
  resourceIdentityHandle: IdentityHandle,
  resourceKey: string,
): string {
  return `di-key:resource:${localKeyPart(resourceIdentityHandle)}:${localKeyPart(resourceKey)}`;
}
