import type { SourceFileAddress } from '../kernel/address.js';

/** Narrow a kernel address to an admitted source-file address. */
export function isSourceFileAddress(address: { readonly kind: string }): address is SourceFileAddress {
  return address.kind === 'source-file-address';
}

/** Match a host-facing file path against a source-file address path. */
export function sourceFilePathMatches(address: SourceFileAddress, filePath: string): boolean {
  const normalized = normalizeHostPath(filePath);
  return address.path === normalized || address.path.endsWith(`/${normalized}`);
}

function normalizeHostPath(path: string): string {
  return path.replace(/\\/g, '/');
}
