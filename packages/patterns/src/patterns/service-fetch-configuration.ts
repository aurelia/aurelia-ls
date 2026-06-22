import type { AureliaPatternExample } from '../pattern-contract.js';

export const serviceFetchConfigurationPattern: AureliaPatternExample = {
  patternId: 'service.fetch-configuration',
  title: 'Configured fetch-client service',
  guidance: {
    summary: 'Configure Aurelia fetch-client once where API defaults belong, then inject typed services for actual requests.',
    whenToUse: [
      'Several services should share the same base URL, credentials, or default headers.',
      'Application HTTP policy should be centralized instead of repeated near components.',
      'A simple configured client is enough before adding interceptors, retries, or caching.'
    ],
    whenNotToUse: [
      'A single service can make a plain request without shared defaults.',
      'The main concern is request cancellation, retry, cache, tracing, or authentication policy.',
      'Different API domains need separate clients or explicit service boundaries.'
    ]
  },
  source: {
    files: [
      {
        path: 'api-http-client-setup.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { IHttpClient } from '@aurelia/fetch-client';

export class ApiHttpClientSetupService {
  private readonly http = resolve(IHttpClient);
  private configured = false;

  configure(): void {
    if (this.configured) {
      return;
    }

    this.http.configure((config) => config
      .withBaseUrl('/api/')
      .withDefaults({
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json'
        }
      })
      .rejectErrorResponses());
    this.configured = true;
  }
}

export interface IApiHttpClientSetupService extends ApiHttpClientSetupService {}

export const IApiHttpClientSetupService = DI.createInterface<IApiHttpClientSetupService>(
  'IApiHttpClientSetupService',
  (x) => x.singleton(ApiHttpClientSetupService)
);
`
      },
      {
        path: 'configured-project-api.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { IHttpClient } from '@aurelia/fetch-client';

export interface ConfiguredProject {
  id: string;
  name: string;
}

export class ConfiguredProjectApiService {
  private readonly http = resolve(IHttpClient);

  async listProjects(): Promise<ConfiguredProject[]> {
    const response = await this.http.get('projects');
    return await response.json() as ConfiguredProject[];
  }
}

export interface IConfiguredProjectApiService extends ConfiguredProjectApiService {}

export const IConfiguredProjectApiService = DI.createInterface<IConfiguredProjectApiService>(
  'IConfiguredProjectApiService',
  (x) => x.singleton(ConfiguredProjectApiService)
);
`
      },
      {
        path: 'configured-projects.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IApiHttpClientSetupService } from './api-http-client-setup';
import { IConfiguredProjectApiService, type ConfiguredProject } from './configured-project-api';

export class ConfiguredProjects {
  private readonly setup = resolve(IApiHttpClientSetupService);
  private readonly projectsApi = resolve(IConfiguredProjectApiService);

  projects: ConfiguredProject[] = [];
  isLoading = false;

  async binding(): Promise<void> {
    this.setup.configure();
    this.isLoading = true;
    this.projects = await this.projectsApi.listProjects();
    this.isLoading = false;
  }
}
`
      },
      {
        path: 'configured-projects.html',
        language: 'html',
        contents: `<section>
  <h1>Configured projects</h1>
  <p if.bind="isLoading" role="status">Loading projects...</p>
  <ul if.bind="!isLoading">
    <li repeat.for="project of projects; key.bind: project.id">
      \${project.name}
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
        summary: 'The same HTTP defaults apply to all requests made through this client.'
      },
      {
        summary: 'The app can configure fetch-client before request-owning services need it.'
      },
      {
        summary: 'The endpoint paths are relative to the configured base URL.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Configure the client at an application boundary.',
        action: 'Call the setup service from startup or a feature boundary so components do not repeat HTTP defaults.'
      },
      {
        summary: 'Split clients when API policy differs.',
        action: 'Use separate service boundaries when base URL, credentials, or default headers are not truly shared.'
      },
      {
        summary: 'Add interceptors and retries as explicit later policy.',
        action: 'Do not hide tracing, retry, cache, or authentication behavior inside a generic configuration snippet.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Fetch Client Setup and Configuration',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/setting-up'
      },
      {
        title: 'Fetch Client',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/overview'
      },
      {
        title: 'Utilities and Lifecycle',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/utilities-and-lifecycle'
      }
    ]
  }
};
