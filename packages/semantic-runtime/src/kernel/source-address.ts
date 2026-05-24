import {
  SourceSpanAddress,
  SourceSpanRole,
  type SourceFileAddress,
  type SemanticAddress,
} from './address.js';
import type { AddressHandle, IdentityHandle } from './handles.js';
import type { SemanticIdentity } from './identity.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from './store.js';

export type SourceAnchorHandle = AddressHandle | IdentityHandle;
export type SourceAnchorRecord = SemanticAddress | SemanticIdentity;

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

/** Narrow a kernel record to one of the record families that can anchor generated source. */
export function isSourceAnchorRecord(record: KernelStoreRecord | null): record is SourceAnchorRecord {
  return record != null && (isSemanticAddressRecord(record) || isSemanticIdentityRecord(record));
}

/** Narrow a kernel record to an address record without relying on handle spelling. */
export function isSemanticAddressRecord(record: KernelStoreRecord): record is SemanticAddress {
  switch (record.kind) {
    case 'source-file-address':
    case 'source-span-address':
    case 'template-address':
    case 'template-node-address':
    case 'generated-address':
    case 'external-address':
      return true;
    default:
      return false;
  }
}

/** Narrow a kernel record to an identity record without relying on handle spelling. */
export function isSemanticIdentityRecord(record: KernelStoreRecord): record is SemanticIdentity {
  switch (record.kind) {
    case 'typescript-declaration-identity':
    case 'aurelia-resource-identity':
    case 'aurelia-attribute-pattern-identity':
    case 'di-key-identity':
    case 'container-identity':
    case 'di-product-identity':
    case 'registration-identity':
    case 'resource-product-identity':
    case 'evaluation-identity':
    case 'observation-identity':
    case 'configuration-identity':
    case 'router-identity':
    case 'route-recognizer-identity':
    case 'i18n-identity':
    case 'state-identity':
    case 'validation-identity':
    case 'fetch-client-identity':
    case 'dialog-identity':
    case 'compiler-identity':
    case 'template-identity':
    case 'template-node-identity':
    case 'binding-identity':
    case 'instruction-identity':
    case 'type-system-identity':
      return true;
    default:
      return false;
  }
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

export interface AuthoredSourceAddress {
  readonly sourceFile: SourceFileAddress | null;
  readonly sourceSpan: SourceSpanAddress | null;
}

interface AuthoredSourceAddressSeen {
  readonly addresses: Set<AddressHandle>;
  readonly identities: Set<IdentityHandle>;
}

/** Narrow a kernel address to an exact source span, following template/generated anchors when possible. */
export function sourceSpanAddressForAddress(
  store: KernelStore,
  addressHandle: AddressHandle | null,
): SourceSpanAddress | null {
  return authoredSourceAddressForAddress(store, addressHandle)?.sourceSpan ?? null;
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
): SourceFileAddress | null {
  return authoredSourceAddressForAddress(store, addressHandle)?.sourceFile ?? null;
}

function authoredSourceAddressForAddress(
  store: KernelStore,
  addressHandle: AddressHandle | null,
  seen: AuthoredSourceAddressSeen = createAuthoredSourceAddressSeen(),
): AuthoredSourceAddress | null {
  if (addressHandle == null || seen.addresses.has(addressHandle)) {
    return null;
  }
  seen.addresses.add(addressHandle);

  const address = store.readAddress(addressHandle);
  if (address == null) {
    return null;
  }
  return authoredSourceAddressForStoredAddress(store, address, seen);
}

/** Follow an address or identity handle to the closest authored source anchor when one exists. */
export function authoredSourceAddressForAnchorHandle(
  store: KernelStore,
  handle: SourceAnchorHandle | null,
): AuthoredSourceAddress | null {
  return authoredSourceAddressForAnchor(store, handle, createAuthoredSourceAddressSeen());
}

/** Read an address-or-identity anchor through the store record index and validate the expected record family. */
export function readSourceAnchorRecord(
  store: KernelStore,
  handle: SourceAnchorHandle | null,
): SourceAnchorRecord | null {
  if (handle == null) {
    return null;
  }
  const record = store.read(handle);
  return isSourceAnchorRecord(record) ? record : null;
}

function createAuthoredSourceAddressSeen(): AuthoredSourceAddressSeen {
  return {
    addresses: new Set<AddressHandle>(),
    identities: new Set<IdentityHandle>(),
  };
}

function authoredSourceAddressForAnchor(
  store: KernelStore,
  handle: SourceAnchorHandle | null,
  seen: AuthoredSourceAddressSeen,
): AuthoredSourceAddress | null {
  const record = readSourceAnchorRecord(store, handle);
  if (record == null) {
    return null;
  }
  if (isSemanticAddressRecord(record)) {
    if (seen.addresses.has(record.handle)) {
      return null;
    }
    seen.addresses.add(record.handle);
    return authoredSourceAddressForStoredAddress(store, record, seen);
  }
  return authoredSourceAddressForIdentity(store, record, seen);
}

function authoredSourceAddressForStoredAddress(
  store: KernelStore,
  address: SemanticAddress,
  seen: AuthoredSourceAddressSeen,
): AuthoredSourceAddress | null {
  // This collapses address carriers to their nearest authored source; API display keeps generated/template identity.
  switch (address.kind) {
    case 'source-file-address':
      return { sourceFile: address, sourceSpan: null };
    case 'source-span-address':
      return {
        sourceFile: authoredSourceAddressForAddress(store, address.fileHandle, seen)?.sourceFile ?? null,
        sourceSpan: address,
      };
    case 'template-address':
      return authoredSourceAddressForAddress(store, address.authoredSourceHandle, seen);
    case 'template-node-address':
      return authoredSourceAddressForAddress(store, address.authoredSourceHandle, seen)
        ?? authoredSourceAddressForAddress(store, address.templateHandle, seen);
    case 'generated-address':
      return authoredSourceAddressForAnchor(store, address.anchorHandle, seen);
    case 'external-address':
      return null;
  }
}

function authoredSourceAddressForIdentity(
  store: KernelStore,
  identity: SemanticIdentity,
  seen: AuthoredSourceAddressSeen,
): AuthoredSourceAddress | null {
  if (seen.identities.has(identity.handle)) {
    return null;
  }
  seen.identities.add(identity.handle);

  for (const addressHandle of identityDirectSourceAddressHandles(identity)) {
    const source = authoredSourceAddressForAddress(store, addressHandle, seen);
    if (source != null) {
      return source;
    }
  }
  for (const anchorHandle of identityOwnerAnchorHandles(identity)) {
    const source = authoredSourceAddressForAnchor(store, anchorHandle, seen);
    if (source != null) {
      return source;
    }
  }
  return null;
}

function identityDirectSourceAddressHandles(identity: SemanticIdentity): readonly AddressHandle[] {
  switch (identity.kind) {
    case 'typescript-declaration-identity':
      return compactAddressHandles(identity.declarationAddressHandle);
    case 'aurelia-attribute-pattern-identity':
      return compactAddressHandles(identity.definitionAddressHandle);
    case 'di-key-identity':
      return compactAddressHandles(identity.keyAddressHandle);
    case 'container-identity':
    case 'di-product-identity':
    case 'registration-identity':
    case 'resource-product-identity':
    case 'evaluation-identity':
    case 'observation-identity':
    case 'configuration-identity':
    case 'router-identity':
    case 'route-recognizer-identity':
    case 'i18n-identity':
    case 'state-identity':
    case 'validation-identity':
    case 'fetch-client-identity':
    case 'dialog-identity':
    case 'type-system-identity':
      return compactAddressHandles(identity.sourceAddressHandle);
    case 'compiler-identity':
    case 'template-identity':
    case 'template-node-identity':
      return compactAddressHandles(identity.addressHandle);
    case 'aurelia-resource-identity':
    case 'binding-identity':
    case 'instruction-identity':
      return [];
  }
}

function identityOwnerAnchorHandles(identity: SemanticIdentity): readonly SourceAnchorHandle[] {
  switch (identity.kind) {
    case 'aurelia-resource-identity':
      return compactAnchorHandles(identity.declarationHandle);
    case 'aurelia-attribute-pattern-identity':
      return compactAnchorHandles(identity.declarationHandle);
    case 'di-key-identity':
      switch (identity.keyKind) {
        case 'constructable':
        case 'interface':
        case 'symbol':
          return compactAnchorHandles(identity.declarationHandle);
        case 'resource':
          return compactAnchorHandles(identity.resourceHandle);
        case 'resolver-key':
          return compactAnchorHandles(identity.innerKeyHandle);
        case 'unknown':
        case 'string':
          return [];
      }
    case 'di-product-identity':
      return compactAnchorHandles(identity.ownerHandle, identity.containerHandle);
    case 'resource-product-identity':
    case 'observation-identity':
    case 'configuration-identity':
    case 'router-identity':
    case 'route-recognizer-identity':
    case 'i18n-identity':
    case 'state-identity':
    case 'validation-identity':
    case 'fetch-client-identity':
    case 'dialog-identity':
    case 'compiler-identity':
    case 'template-identity':
    case 'type-system-identity':
      return compactAnchorHandles(identity.ownerHandle);
    case 'evaluation-identity':
      return compactAnchorHandles(identity.ownerHandle);
    case 'template-node-identity':
      return compactAnchorHandles(identity.templateHandle);
    case 'binding-identity':
    case 'instruction-identity':
      return compactAnchorHandles(identity.ownerHandle);
    case 'container-identity':
      return compactAnchorHandles(identity.parentHandle, identity.rootHandle);
    case 'typescript-declaration-identity':
    case 'registration-identity':
      return [];
  }
}

function compactAddressHandles(...handles: readonly (AddressHandle | null)[]): readonly AddressHandle[] {
  return handles.filter((handle): handle is AddressHandle => handle != null);
}

function compactAnchorHandles(...handles: readonly (SourceAnchorHandle | null)[]): readonly SourceAnchorHandle[] {
  return handles.filter((handle): handle is SourceAnchorHandle => handle != null);
}

export function normalizeHostPath(path: string): string {
  return path.replace(/\\/g, '/');
}
