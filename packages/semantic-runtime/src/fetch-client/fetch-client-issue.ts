import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FetchClientFrameworkErrorCode } from './framework-error-code.js';

export const enum FetchClientIssuePhase {
  HttpClientConfiguration = 'http-client-configuration',
  RetryInterceptorConfiguration = 'retry-interceptor-configuration',
}

export const enum FetchClientIssueKind {
  ConfigureInvalidReturn = 'configure-invalid-return',
  ConfigureInvalidConfig = 'configure-invalid-config',
  ConfigureInvalidHeader = 'configure-invalid-header',
  MoreThanOneRetryInterceptor = 'more-than-one-retry-interceptor',
  RetryInterceptorNotLast = 'retry-interceptor-not-last',
  RetryInterceptorInvalidExponentialInterval = 'retry-interceptor-invalid-exponential-interval',
  RetryInterceptorInvalidStrategy = 'retry-interceptor-invalid-strategy',
}

export type FetchClientIssueSeverity =
  | 'error';

/** Source-backed @aurelia/fetch-client issue where framework configuration or retry policy would throw. */
export class FetchClientIssue {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly ownerIdentityHandle: IdentityHandle | null,
    readonly phase: FetchClientIssuePhase,
    readonly issueKind: FetchClientIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: FetchClientFrameworkErrorCode,
    readonly localName: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly severity: FetchClientIssueSeverity = 'error',
  ) {}
}
