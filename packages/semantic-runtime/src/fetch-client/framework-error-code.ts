import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia fetch-client error-code labels that source analysis can cite when it
 * models the same HttpClient.configure(...) or RetryInterceptor branch.
 */
export const FetchClientFrameworkErrorCode = {
  /** `fetch-client ErrorNames.http_client_configure_invalid_return`; a configure callback returned a non-object value. */
  ConfigureInvalidReturn: frameworkErrorCode('fetch-client', 'ErrorNames', 'http_client_configure_invalid_return', 'AUR5001'),
  /** `fetch-client ErrorNames.http_client_configure_invalid_config`; HttpClient.configure(...) received neither object nor function input. */
  ConfigureInvalidConfig: frameworkErrorCode('fetch-client', 'ErrorNames', 'http_client_configure_invalid_config', 'AUR5002'),
  /** `fetch-client ErrorNames.http_client_configure_invalid_header`; defaults.headers was a Headers instance. */
  ConfigureInvalidHeader: frameworkErrorCode('fetch-client', 'ErrorNames', 'http_client_configure_invalid_header', 'AUR5003'),
  /** `fetch-client ErrorNames.http_client_more_than_one_retry_interceptor`; more than one retry interceptor was configured. */
  MoreThanOneRetryInterceptor: frameworkErrorCode('fetch-client', 'ErrorNames', 'http_client_more_than_one_retry_interceptor', 'AUR5004'),
  /** `fetch-client ErrorNames.http_client_retry_interceptor_not_last`; a retry interceptor was followed by another interceptor. */
  RetryInterceptorNotLast: frameworkErrorCode('fetch-client', 'ErrorNames', 'http_client_retry_interceptor_not_last', 'AUR5005'),
  /** `fetch-client ErrorNames.retry_interceptor_invalid_exponential_interval`; exponential retry interval was <= 1000ms. */
  RetryInterceptorInvalidExponentialInterval: frameworkErrorCode('fetch-client', 'ErrorNames', 'retry_interceptor_invalid_exponential_interval', 'AUR5007'),
  /** `fetch-client ErrorNames.retry_interceptor_invalid_strategy`; retry strategy was outside the framework strategy set. */
  RetryInterceptorInvalidStrategy: frameworkErrorCode('fetch-client', 'ErrorNames', 'retry_interceptor_invalid_strategy', 'AUR5008'),
} as const;

export type FetchClientFrameworkErrorCode =
  typeof FetchClientFrameworkErrorCode[keyof typeof FetchClientFrameworkErrorCode];
