import { customElement } from '@aurelia/runtime-html';
import { IContainer, inject, resolve } from '@aurelia/kernel';
import {
  HttpClient,
  IHttpClient,
  RetryInterceptor,
  RetryStrategy,
} from '@aurelia/fetch-client';

@customElement({
  name: 'fetch-client-config-errors-app',
  template: '<template><button click.trigger="configure()">Configure</button></template>',
})
export class FetchClientConfigErrorsApp {
  private readonly client = new HttpClient();
  private readonly erasedContainer = resolve(IContainer) as any;
  private readonly decoratorFactoryIsNotClient = inject(IHttpClient) as any;
  private readonly localClient = new LocalHttpClient();

  constructor() {
    const shadowedClient = resolve(IHttpClient);
    void shadowedClient;
    {
      const shadowedClient = new LocalHttpClient();
      shadowedClient.configure(42);
    }
  }

  configure(): void {
    this.client.configure(42 as any);
    this.client.configure(() => 1 as any);
    this.client.configure({ headers: new Headers() } as any);
    this.client.configure({ headers: new LocalFetch.Headers() } as any);
    this.client.configure({ interceptors: [new RetryInterceptor(), new RetryInterceptor()] } as any);
    this.client.configure(config => config.withRetry().withInterceptor({ request: request => request }));
    this.client.configure(config => config.withRetry({ strategy: RetryStrategy.exponential, interval: 1000 } as any));
    this.client.configure(config => config.withRetry({ strategy: 42 } as any));
    this.erasedContainer.get(IHttpClient).configure(42 as any);
    this.decoratorFactoryIsNotClient.configure(42);
    this.localClient.configure(42);
  }
}

namespace LocalFetch {
  export class Headers {}
}

class LocalHttpClient {
  readonly interceptors: unknown[] = [];

  configure(_config: unknown): this {
    return this;
  }

  fetch(_input: unknown): Promise<unknown> {
    return Promise.resolve(null);
  }
}
