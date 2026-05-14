import {
  SourceSpanAddress,
  SourceSpanRole,
  type SourceFileAddress,
} from './address.js';
import type { AddressHandle } from './handles.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from './store.js';

export interface SourceSpanSite {
  readonly sourceFileAddressHandle: AddressHandle;
  readonly start: number;
  readonly end: number;
}

export class SourceSpanAddressPublication {
  constructor(
    readonly handle: AddressHandle,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materialize an exact source span when the caller already has the boot-admitted source-file handle. */
export function sourceSpanAddressForSite(
  store: KernelStore,
  localKey: string,
  site: SourceSpanSite,
  role: SourceSpanRole = SourceSpanRole.Primary,
): SourceSpanAddressPublication {
  const handle = store.handles.address(`${localKey}:source`);
  return new SourceSpanAddressPublication(
    handle,
    [
      new SourceSpanAddress(
        handle,
        site.sourceFileAddressHandle,
        site.start,
        site.end,
        role,
      ),
    ],
  );
}

/** Narrow a kernel address to an admitted source-file address. */
export function isSourceFileAddress(address: { readonly kind: string }): address is SourceFileAddress {
  return address.kind === 'source-file-address';
}

/** Match a host-facing file path against a source-file address path. */
export function sourceFilePathMatches(address: SourceFileAddress, filePath: string): boolean {
  return sourcePathMatchesFileName(address.path, filePath);
}

/** Match two host/source path spellings after normalizing path separators. */
export function sourcePathMatchesFileName(sourcePath: string, fileName: string): boolean {
  const normalizedSourcePath = normalizeHostPath(sourcePath);
  const normalizedFileName = normalizeHostPath(fileName);
  return normalizedSourcePath === normalizedFileName
    || normalizedSourcePath.endsWith(`/${normalizedFileName}`)
    || normalizedFileName.endsWith(`/${normalizedSourcePath}`);
}

export function sourceFileAddressHandlesForFileNames(
  store: KernelStore,
  fileNames: readonly string[],
): ReadonlySet<AddressHandle> {
  const handles = new Set<AddressHandle>();
  for (const fileName of fileNames) {
    for (const address of store.readSourceFileAddressesByFileName(fileName)) {
      handles.add(address.handle);
    }
  }
  return handles;
}

export function addressBelongsToSourceFiles(
  store: KernelStore,
  addressHandle: AddressHandle,
  sourceFileHandles: ReadonlySet<AddressHandle>,
): boolean {
  const sourceFileHandle = sourceFileHandleForAddress(store, addressHandle);
  return sourceFileHandle != null && sourceFileHandles.has(sourceFileHandle);
}

export function sourceFileHandleForAddress(
  store: KernelStore,
  addressHandle: AddressHandle | null,
): AddressHandle | null {
  return sourceFileAddressForAddress(store, addressHandle)?.handle ?? null;
}

export function sourceFileAddressForAddress(
  store: KernelStore,
  addressHandle: AddressHandle | null,
  seen: Set<AddressHandle> = new Set(),
): SourceFileAddress | null {
  if (addressHandle == null || seen.has(addressHandle)) {
    return null;
  }
  seen.add(addressHandle);

  const address = store.readAddress(addressHandle);
  if (address == null) {
    return null;
  }

  switch (address.kind) {
    case 'source-file-address':
      return address;
    case 'source-span-address':
      return sourceFileAddressForAddress(store, address.fileHandle, seen);
    case 'template-address':
      return sourceFileAddressForAddress(store, address.authoredSourceHandle, seen);
    case 'template-node-address':
      return sourceFileAddressForAddress(store, address.authoredSourceHandle, seen)
        ?? sourceFileAddressForAddress(store, address.templateHandle, seen);
    case 'generated-address':
      return address.anchorHandle != null && store.readAddress(address.anchorHandle as AddressHandle) != null
        ? sourceFileAddressForAddress(store, address.anchorHandle as AddressHandle, seen)
        : null;
    case 'external-address':
      return null;
  }
}

export function normalizeHostPath(path: string): string {
  return path.replace(/\\/g, '/');
}
