import type { StateStoreConfiguration } from './model.js';

/** Framework-reserved name used for the default @aurelia/state store registration. */
export const DEFAULT_STATE_STORE_NAME = 'default';

/** Human-readable store name used in diagnostics, local keys, and public rows. */
export function stateStoreDisplayName(
  storeName: string | null | undefined,
): string {
  return storeName ?? DEFAULT_STATE_STORE_NAME;
}

/** Resolve a statically named state store, preserving undefined as runtime-dependent. */
export function configuredStateStoreForName(
  stores: readonly StateStoreConfiguration[],
  storeName: string | null | undefined,
): StateStoreConfiguration | null {
  if (storeName === undefined) {
    return null;
  }
  return storeName == null
    ? stores.find((candidate) => candidate.isDefault) ?? null
    : stores.find((candidate) => candidate.name === storeName) ?? null;
}
