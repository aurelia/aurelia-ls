import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerRouteParametersPattern: AureliaPatternExample = {
  patternId: 'router.route-parameters',
  title: 'Route context parameter aggregation',
  guidance: {
    summary: 'Use IRouteContext.getRouteParameters() when parent, child, and query-string route values form one typed identity before loading data.',
    whenToUse: [
      'Nested routes split one route identity across parent and child URL segments.',
      'A route loading hook needs the full identity before it asks an injected service for data.',
      'Query string values are part of the same read boundary, such as a tab, filter, or view mode.'
    ],
    whenNotToUse: [
      'A flat route only needs the Params argument passed into canLoad or loading.',
      'The problem is relative navigation or active-link state rather than parameter aggregation.',
      'The route needs auth, cache, stale-response, or error-recovery policy beyond reading URL identity.'
    ]
  },
  source: {
    files: [
      {
        path: 'admin-routes.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { CompanyRoute } from './company-route';

@route({
  routes: [
    {
      path: 'companies/:companyId',
      component: CompanyRoute,
      title: 'Company projects'
    }
  ]
})
export class AdminRoutes {}
`
      },
      {
        path: 'company-route.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { ProjectDetailRoute } from './project-detail-route';

@route({
  routes: [
    {
      path: 'projects/:projectId',
      component: ProjectDetailRoute,
      title: 'Project'
    }
  ]
})
export class CompanyRoute {}
`
      },
      {
        path: 'company-route.html',
        language: 'html',
        contents: `<au-viewport></au-viewport>
`
      },
      {
        path: 'project-route-identity.ts',
        language: 'ts',
        contents: `export type ProjectRouteIdentity = Record<string, unknown> & {
  companyId: string;
  projectId: string;
  tab?: string | readonly string[];
};
`
      },
      {
        path: 'project-route-data-service.ts',
        language: 'ts',
        contents: `import { DI } from 'aurelia';
import type { ProjectRouteIdentity } from './project-route-identity';

export interface ProjectDetail {
  companyId: string;
  projectId: string;
  name: string;
  owner: string;
  activeTab: string;
}

export class ProjectRouteDataService {
  async getProject(identity: Readonly<ProjectRouteIdentity>): Promise<ProjectDetail> {
    const activeTab = Array.isArray(identity.tab) ? identity.tab[0] : identity.tab;

    return await Promise.resolve({
      companyId: identity.companyId,
      projectId: identity.projectId,
      name: 'Project ' + identity.projectId,
      owner: 'Company ' + identity.companyId,
      activeTab: activeTab ?? 'overview'
    });
  }
}

export interface IProjectRouteDataService extends ProjectRouteDataService {}

export const IProjectRouteDataService = DI.createInterface<IProjectRouteDataService>(
  'IProjectRouteDataService',
  (x) => x.singleton(ProjectRouteDataService)
);
`
      },
      {
        path: 'project-detail-route.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import {
  IRouteContext,
  type IRouteViewModel,
  type Params,
  type RouteNode
} from '@aurelia/router';
import {
  IProjectRouteDataService,
  type ProjectDetail
} from './project-route-data-service';
import type { ProjectRouteIdentity } from './project-route-identity';

export class ProjectDetailRoute implements IRouteViewModel {
  private readonly routeContext = resolve(IRouteContext);
  private readonly routeData = resolve(IProjectRouteDataService);

  project!: ProjectDetail;

  async loading(_params: Params, _next: RouteNode): Promise<void> {
    const identity = this.routeContext.getRouteParameters<ProjectRouteIdentity, 'parent-first'>({
      mergeStrategy: 'parent-first',
      includeQueryParams: true
    });

    this.project = await this.routeData.getProject(identity);
  }
}
`
      },
      {
        path: 'project-detail-route.html',
        language: 'html',
        contents: `<article>
  <nav aria-label="Project navigation">
    <a href.bind="'companies/' + project.companyId">All projects</a>
  </nav>

  <h1>\${project.name}</h1>
  <p>Owner: \${project.owner}</p>
  <p>Current tab: \${project.activeTab}</p>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The route tree captures companyId on a parent route and projectId on a child route.'
      },
      {
        summary: 'The loading hook owns the route-critical data request for this detail page.'
      },
      {
        summary: 'Query parameters are only included because the data boundary treats them as part of the route identity.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Read aggregated parameters at the point of route loading.',
        action: 'Call `getRouteParameters()` inside `loading()` when reused route components may see different route values over time.'
      },
      {
        summary: 'Choose the merge strategy deliberately.',
        action: 'Use `parent-first` for parent-owned identity; use append or by-route when duplicate names need explicit handling.'
      },
      {
        summary: 'Keep parameter reading separate from data policy.',
        action: 'Pass the aggregated identity into an injected service; add auth, cache, stale-response, and error policy there.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Route Parameters Guide',
        url: 'https://docs.aurelia.io/router/route-parameters'
      },
      {
        title: 'Routing Lifecycle Hooks',
        url: 'https://docs.aurelia.io/router/routing-lifecycle'
      },
      {
        title: 'Router API Reference',
        url: 'https://docs.aurelia.io/router/api-reference'
      }
    ]
  }
};
