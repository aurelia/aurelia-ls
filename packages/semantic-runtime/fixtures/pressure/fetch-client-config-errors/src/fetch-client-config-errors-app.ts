import { customElement } from '@aurelia/runtime-html';
import {
  HttpClient,
  RetryInterceptor,
  RetryStrategy,
} from '@aurelia/fetch-client';

@customElement({
  name: 'fetch-client-config-errors-app',
  template: '<template><button click.trigger="configure()">Configure</button></template>',
})
export class FetchClientConfigErrorsApp {
  private readonly client = new HttpClient();

  configure(): void {
    this.client.configure(42 as any);
    this.client.configure(() => 1 as any);
    this.client.configure({ headers: new Headers() } as any);
    this.client.configure({ interceptors: [new RetryInterceptor(), new RetryInterceptor()] } as any);
    this.client.configure(config => config.withRetry().withInterceptor({ request: request => request }));
    this.client.configure(config => config.withRetry({ strategy: RetryStrategy.exponential, interval: 1000 } as any));
    this.client.configure(config => config.withRetry({ strategy: 42 } as any));
  }
}
