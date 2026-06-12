import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { StateRawErrorAuthority } from './framework-raw-error-authority.js';

export const enum StateIssuePhase {
  StoreConfiguration = 'store-configuration',
  StoreRegistryRegistration = 'store-registry-registration',
  StoreLookup = 'store-lookup',
  FromStateDecorator = 'from-state-decorator',
}

export const enum StateIssueKind {
  WithStoreAfterRegistration = 'with-store-after-registration',
  ReservedDefaultStoreName = 'reserved-default-store-name',
  DuplicateStoreName = 'duplicate-store-name',
  StoreNotFound = 'store-not-found',
  InvalidFromStateDecoratorUsage = 'invalid-from-state-decorator-usage',
}

export type StateIssueSeverity =
  | 'error';

/** Source-backed @aurelia/state issue where framework configuration, store registration, or state binding setup would throw. */
export class StateIssue {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly ownerIdentityHandle: IdentityHandle | null,
    readonly phase: StateIssuePhase,
    readonly issueKind: StateIssueKind,
    readonly message: string,
    readonly frameworkRawErrorAuthority: StateRawErrorAuthority | null,
    readonly storeName: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly severity: StateIssueSeverity = 'error',
  ) {}
}
