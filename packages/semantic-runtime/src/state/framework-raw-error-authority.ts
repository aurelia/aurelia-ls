import { frameworkRawErrorAuthority } from '../kernel/framework-raw-error-authority.js';

/** Raw @aurelia/state Error sites that state semantic products can cite exactly. */
export const StateRawErrorAuthority = {
  /** `StateDefaultConfiguration.withStore`; builder mutation happened after the configuration registered itself. */
  WithStoreAfterRegistration: frameworkRawErrorAuthority(
    'state',
    'raw-new-error',
    'throw',
    'aurelia/packages/state/src/configuration.ts',
    88,
    'new Error(\'withStore can only be called before the configuration is registered.\')',
  ),
  /** `StateDefaultConfiguration.withStore`; `default` is reserved for the initial store. */
  ReservedDefaultStoreName: frameworkRawErrorAuthority(
    'state',
    'raw-new-error',
    'throw',
    'aurelia/packages/state/src/configuration.ts',
    91,
    'new Error(\'The store name "default" is reserved. Please choose a different name for this store.\')',
  ),
  /** `StoreRegistry.registerStore`; a store with the same name has already been registered. */
  DuplicateStoreName: frameworkRawErrorAuthority(
    'state',
    'raw-new-error',
    'throw',
    'aurelia/packages/state/src/store-registry.ts',
    8,
    'new Error(`A store with name "${name}" has already been registered.`)',
  ),
  /** `fromState`; decorator target must be a field or setter context. */
  InvalidFromStateDecoratorUsage: frameworkRawErrorAuthority(
    'state',
    'raw-new-error',
    'throw',
    'aurelia/packages/state/src/state-decorator.ts',
    37,
    'new Error(`Invalid usage. @state can only be used on a field ${target} - ${context.kind}`)',
  ),
  /** `StoreRegistry.getStore`; a named store lookup did not match any registered store. */
  StoreNotFound: frameworkRawErrorAuthority(
    'state',
    'raw-new-error',
    'throw',
    'aurelia/packages/state/src/store-registry.ts',
    16,
    'new Error(`No store registered with name "${name}".`)',
  ),
} as const;

export type StateRawErrorAuthority =
  typeof StateRawErrorAuthority[keyof typeof StateRawErrorAuthority];
