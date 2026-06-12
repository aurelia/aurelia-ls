import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { DialogFrameworkErrorCode } from './framework-error-code.js';

export const enum DialogIssuePhase {
  ConfigurationRegistration = 'configuration-registration',
  ChildServiceResolution = 'child-service-resolution',
  ServiceOpen = 'service-open',
}

export const enum DialogIssueKind {
  ChildSettingsNotFound = 'child-settings-not-found',
  NoEmptyDefaultConfiguration = 'no-empty-default-configuration',
  SettingsInvalid = 'settings-invalid',
}

export type DialogIssueSeverity =
  | 'error';

/** Source-backed @aurelia/dialog issue where configuration or service usage would hit a framework error. */
export class DialogIssue {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly ownerIdentityHandle: IdentityHandle | null,
    readonly phase: DialogIssuePhase,
    readonly issueKind: DialogIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: DialogFrameworkErrorCode,
    readonly localName: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly severity: DialogIssueSeverity = 'error',
  ) {}
}
