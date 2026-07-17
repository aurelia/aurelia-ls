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

export class DiKeyIdentityEmitter {
  private readonly emittedIdentityHandles = new Set<IdentityHandle>();
  private readonly interfaceKeyIdentityHandles = new Map<string, IdentityHandle>();

  constructor(private readonly records: KernelStoreReadView) {}

  reset(): void {
    this.emittedIdentityHandles.clear();
  }

  interfaceKeyIdentityHandle(interfaceName: string): IdentityHandle {
    let handle = this.interfaceKeyIdentityHandles.get(interfaceName);
    if (handle === undefined) {
      handle = this.records.handles.identity(`di-key:interface:${interfaceName}`);
      this.interfaceKeyIdentityHandles.set(interfaceName, handle);
    }
    return handle;
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
