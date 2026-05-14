# Fetch Client

This folder owns semantic-runtime products for source-backed `@aurelia/fetch-client` diagnostics.

The first admitted lane is the static subset of `HttpClient.configure(...)` and `RetryInterceptor` configuration that can be proven from TypeScript source before executing a request. It publishes `FetchClientIssue` products and app diagnostics linked to exact Aurelia framework error codes.

## Claimed Authorities

- `AUR5001` / `http_client_configure_invalid_return`: a configure callback returns a closed non-object value.
- `AUR5002` / `http_client_configure_invalid_config`: `HttpClient.configure(...)` receives no config or a closed primitive/undefined value.
- `AUR5003` / `http_client_configure_invalid_header`: default headers are provided as a `Headers` instance rather than a plain object.
- `AUR5004` / `http_client_more_than_one_retry_interceptor`: static interceptor configuration contains more than one `RetryInterceptor`.
- `AUR5005` / `http_client_retry_interceptor_not_last`: a static `RetryInterceptor` is followed by another interceptor.
- `AUR5007` / `retry_interceptor_invalid_exponential_interval`: exponential retry is configured with an interval less than or equal to one second.
- `AUR5008` / `retry_interceptor_invalid_strategy`: retry strategy is statically outside Aurelia's `RetryStrategy` set.

## Boundaries

`AUR5000` remains intentionally unclaimed until semantic-runtime admits host/global fetch availability or `IFetchFn` activation as a product. `AUR5006` remains intentionally unclaimed until semantic-runtime admits live interceptor-chain execution or a static return-value model for custom interceptors. `AUR0099` is dormant in the framework source.

This lane is diagnostic substrate, not an authoring recommendation. It exists so real apps and fixtures can surface framework-faithful fetch-client pressure without forcing authoring recipes to generate fetch-client usage.
