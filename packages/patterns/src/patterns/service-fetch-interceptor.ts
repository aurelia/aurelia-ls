import type { AureliaPatternExample } from '../pattern-contract.js';

export const serviceFetchInterceptorPattern: AureliaPatternExample = {
  patternId: 'service.fetch-interceptor',
  title: 'Fetch-client request interceptor',
  guidance: {
    summary: 'Use a fetch-client interceptor when every request through a configured client should receive the same request or response treatment.',
    whenToUse: [
      'A client should add tracing, feature, or format headers consistently.',
      'The behavior belongs to HTTP policy rather than individual data services.',
      'The interceptor stays small and does not own retries, caching, or route state.'
    ],
    whenNotToUse: [
      'Only one request needs a header or option.',
      'The behavior needs feature state that belongs in an injected application service.',
      'The policy is really retry, cache, request cancellation, or authentication.'
    ]
  },
  source: {
    files: [
      {
        path: 'api-tracing-service.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { IHttpClient, type IFetchInterceptor } from '@aurelia/fetch-client';

export class TraceHeaderInterceptor implements IFetchInterceptor {
  request(request: Request): Request {
    const headers = new Headers(request.headers);
    headers.set('X-Client-Feature', 'project-dashboard');

    return new Request(request, { headers });
  }

  response(response: Response): Response {
    return response;
  }
}

export class ApiTracingService {
  private readonly http = resolve(IHttpClient);
  private configured = false;

  configureFeatureHeaders(): void {
    if (this.configured) {
      return;
    }

    this.http.configure((config) => config.withInterceptor(new TraceHeaderInterceptor()));
    this.configured = true;
  }
}

export interface IApiTracingService extends ApiTracingService {}

export const IApiTracingService = DI.createInterface<IApiTracingService>(
  'IApiTracingService',
  (x) => x.singleton(ApiTracingService)
);
`
      },
      {
        path: 'instrumented-projects.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IApiTracingService } from './api-tracing-service';

export class InstrumentedProjects {
  private readonly tracing = resolve(IApiTracingService);

  status = '';

  binding(): void {
    this.tracing.configureFeatureHeaders();
    this.status = 'Project requests include feature headers.';
  }
}
`
      },
      {
        path: 'instrumented-projects.html',
        language: 'html',
        contents: `<section>
  <h1>Project requests</h1>
  <p role="status">\${status}</p>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The same interceptor behavior applies to all requests through this client.'
      },
      {
        summary: 'The interceptor can run without component-specific state.'
      },
      {
        summary: 'The setup runs once at an application or feature boundary.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep request-specific options near the request.',
        action: 'Use interceptors for cross-cutting HTTP policy, not for one-off headers that only one service needs.'
      },
      {
        summary: 'Separate interceptor concerns deliberately.',
        action: 'Model retry, cache, cancellation, and authentication as explicit policy patterns instead of folding them into a generic interceptor.'
      },
      {
        summary: 'Register setup where lifetime is clear.',
        action: 'Configure interceptors from startup or feature setup so repeated component bindings do not stack duplicate interceptors.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Fetch Client Interceptors',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/interceptors'
      },
      {
        title: 'Fetch Client Setup and Configuration',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/setting-up'
      },
      {
        title: 'Utilities and Lifecycle',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/utilities-and-lifecycle'
      }
    ]
  }
};
