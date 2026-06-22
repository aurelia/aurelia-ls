import type { AureliaPatternExample } from '../pattern-contract.js';

export const serviceFetchClientPattern: AureliaPatternExample = {
  patternId: 'service.fetch-client',
  title: 'Fetch client data service',
  guidance: {
    summary: 'Use an injected service around Aurelia fetch-client when a component needs JSON data from an HTTP API.',
    whenToUse: [
      'A component needs data from an API but should not own the HTTP request details.',
      'The first useful behavior is a typed JSON read with loading and error feedback.',
      'A simple service boundary is enough before adding cache, retry, auth, or router policies.'
    ],
    whenNotToUse: [
      'The data is already local to the component or supplied by a parent.',
      'The route must block navigation until critical data is loaded.',
      'The main problem is authentication, caching, retries, uploads, cancellation, or global request tracking.'
    ]
  },
  source: {
    files: [
      {
        path: 'project-data-service.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { IHttpClient } from '@aurelia/fetch-client';

export interface ProjectSummary {
  id: string;
  name: string;
  owner: string;
}

export class ProjectDataService {
  private readonly http = resolve(IHttpClient);

  async listProjects(): Promise<ProjectSummary[]> {
    const response = await this.http.get('/api/projects');

    if (!response.ok) {
      throw new Error(\`Projects request failed: \${response.status}\`);
    }

    return await response.json() as ProjectSummary[];
  }
}

export interface IProjectDataService extends ProjectDataService {}

export const IProjectDataService = DI.createInterface<IProjectDataService>(
  'IProjectDataService',
  (x) => x.singleton(ProjectDataService)
);
`
      },
      {
        path: 'remote-projects.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IProjectDataService, type ProjectSummary } from './project-data-service';

export class RemoteProjects {
  private readonly projectsApi = resolve(IProjectDataService);

  projects: ProjectSummary[] = [];
  isLoading = false;
  errorMessage = '';

  async binding(): Promise<void> {
    await this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.projects = await this.projectsApi.listProjects();
    } catch {
      this.errorMessage = 'Projects could not be loaded.';
      this.projects = [];
    } finally {
      this.isLoading = false;
    }
  }
}
`
      },
      {
        path: 'remote-projects.html',
        language: 'html',
        contents: `<section>
  <header>
    <h1>Remote projects</h1>
    <button type="button" click.trigger="loadProjects()" disabled.bind="isLoading">
      \${isLoading ? 'Loading...' : 'Refresh'}
    </button>
  </header>

  <p if.bind="isLoading" role="status">Loading projects...</p>
  <p if.bind="errorMessage" role="alert">\${errorMessage}</p>

  <ul if.bind="!isLoading && !errorMessage">
    <li repeat.for="project of projects; key.bind: project.id">
      <strong>\${project.name}</strong>
      <span>\${project.owner}</span>
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
        summary: '@aurelia/fetch-client is installed and `IHttpClient` is available through Aurelia DI.'
      },
      {
        summary: 'The endpoint returns JSON shaped like `ProjectSummary[]`.'
      },
      {
        summary: 'The component can show a non-blocking loading state instead of blocking route navigation.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Configure the HTTP client where application policy belongs.',
        action: 'Add base URL, credentials, default headers, auth, interceptors, retries, or caching in app startup or a dedicated API-service setup, not inside every component.'
      },
      {
        summary: 'Validate and normalize real API payloads before trusting them.',
        action: 'Replace the direct `response.json()` cast with schema validation or mapping once the API contract is real.'
      },
      {
        summary: 'Move route-critical loading into router lifecycle patterns later.',
        action: 'Keep this pattern for non-blocking component data; use router loading/canLoad patterns when navigation must wait for the data.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Fetch Client',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/overview'
      },
      {
        title: 'Fetch Client Setup and Configuration',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/setting-up'
      },
      {
        title: 'Response Types and Data Handling',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/response-types'
      }
    ]
  }
};
