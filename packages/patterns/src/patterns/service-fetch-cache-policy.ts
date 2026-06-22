import type { AureliaPatternExample } from '../pattern-contract.js';

export const serviceFetchCachePolicyPattern: AureliaPatternExample = {
  patternId: 'service.fetch-cache-policy',
  title: 'Fetch-client cache policy service',
  guidance: {
    summary: 'Use a configured fetch-client cache interceptor when a read service can safely reuse recent responses across component visits.',
    whenToUse: [
      'The endpoint is read-oriented and tolerates a short freshness window.',
      'Several components or route visits ask for the same data.',
      'The cache lifetime is HTTP policy, not component state.'
    ],
    whenNotToUse: [
      'The request must always reflect the latest server state.',
      'The response contains user-entered draft state that belongs in an injected feature service.',
      'The real need is retry, cancellation, authentication, or per-request options.'
    ]
  },
  source: {
    files: [
      {
        path: 'cached-projects-service.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { CacheInterceptor, IHttpClient } from '@aurelia/fetch-client';

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export class CachedProjectsService {
  private readonly http = resolve(IHttpClient);
  private configured = false;

  async listProjects(): Promise<ProjectSummary[]> {
    this.configureCachePolicy();

    const response = await this.http.get('/api/projects');
    if (!response.ok) {
      throw new Error(\`Projects request failed: \${response.status}\`);
    }

    return response.json() as Promise<ProjectSummary[]>;
  }

  private configureCachePolicy(): void {
    if (this.configured) {
      return;
    }

    this.http.configure((config) =>
      config.withInterceptor(
        new CacheInterceptor({
          cacheTime: 5 * 60 * 1000,
          staleTime: 60 * 1000,
          refreshStaleImmediate: false
        })
      )
    );
    this.configured = true;
  }
}

export interface ICachedProjectsService extends CachedProjectsService {}

export const ICachedProjectsService = DI.createInterface<ICachedProjectsService>(
  'ICachedProjectsService',
  (x) => x.singleton(CachedProjectsService)
);
`
      },
      {
        path: 'cached-projects.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { ICachedProjectsService, type ProjectSummary } from './cached-projects-service';

export class CachedProjects {
  private readonly projectsService = resolve(ICachedProjectsService);

  projects: ProjectSummary[] = [];
  isLoading = true;
  errorMessage = '';

  async binding(): Promise<void> {
    try {
      this.projects = await this.projectsService.listProjects();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Projects could not be loaded.';
    } finally {
      this.isLoading = false;
    }
  }
}
`
      },
      {
        path: 'cached-projects.html',
        language: 'html',
        contents: `<section>
  <h1>Projects</h1>

  <p if.bind="isLoading" role="status">Loading projects...</p>
  <p if.bind="errorMessage" role="alert">\${errorMessage}</p>

  <ul if.bind="!isLoading && !errorMessage">
    <li repeat.for="project of projects; key.bind: project.id">
      <strong>\${project.name}</strong>
      <span>Updated \${project.updatedAt}</span>
    </li>
  </ul>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The cached endpoint is safe to reuse for a short, explicit freshness window.'
      },
      {
        summary: 'The configured client is shared by services that should observe the same cache policy.'
      },
      {
        summary: 'Component state only tracks loading, errors, and the current rendered response.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep cache policy close to the HTTP boundary.',
        action: 'Configure the cache interceptor from a service or startup boundary, not from every component binding.'
      },
      {
        summary: 'Use injected state for editable or collaborative data.',
        action: 'When users mutate the data locally, move draft and invalidation behavior into an injected feature service instead of relying on the HTTP cache.'
      },
      {
        summary: 'Avoid duplicate interceptor registration.',
        action: 'Register cache behavior once at the service or startup boundary, and keep repeated component visits from appending the same interceptor again.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Fetch Client Caching',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/caching'
      },
      {
        title: 'Fetch Client Setup and Configuration',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/setting-up'
      },
      {
        title: 'Fetch Client Utilities and Lifecycle',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/utilities-and-lifecycle'
      }
    ]
  }
};
