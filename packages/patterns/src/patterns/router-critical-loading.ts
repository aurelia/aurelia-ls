import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerCriticalLoadingPattern: AureliaPatternExample = {
  patternId: 'router.critical-loading',
  title: 'Route critical data loading',
  guidance: {
    summary: 'Use router lifecycle hooks so canLoad decides whether a route may enter, while loading() prepares fast route-critical data before render.',
    whenToUse: [
      'A routed page needs a parameter checked before entry and a small critical record ready before the page renders.',
      'The data belongs to the route activation transaction, not a secondary panel.',
      'A shell navigation-progress pattern can show progress while the router waits.'
    ],
    whenNotToUse: [
      'The data is secondary, optional, or can render after the route is already visible.',
      'The component is not routed or has no URL-shaped entry decision.',
      'The route needs complex auth, caching, streaming, stale-response handling, or global error recovery.'
    ]
  },
  source: {
    files: [
      {
        path: 'project-route-data-service.ts',
        language: 'ts',
        contents: `import { DI } from 'aurelia';

export interface ProjectSummary {
  id: string;
  name: string;
}

export interface ProjectDetail extends ProjectSummary {
  owner: string;
  summary: string;
  milestones: readonly ProjectSummary[];
}

export class ProjectRouteDataService {
  private readonly projects: readonly ProjectDetail[] = [
    {
      id: 'release-readiness',
      name: 'Release readiness',
      owner: 'Platform',
      summary: 'Final checks before the preview release.',
      milestones: [
        { id: 'docs', name: 'Docs reviewed' },
        { id: 'smoke', name: 'Smoke tests passed' }
      ]
    },
    {
      id: 'accessibility-pass',
      name: 'Accessibility pass',
      owner: 'Design systems',
      summary: 'Keyboard and screen-reader review for the new flows.',
      milestones: [
        { id: 'keyboard', name: 'Keyboard paths checked' },
        { id: 'labels', name: 'Form labels checked' }
      ]
    }
  ];

  get projectSummaries(): readonly ProjectSummary[] {
    return this.projects.map((project) => ({
      id: project.id,
      name: project.name
    }));
  }

  canOpenProject(projectId: string): boolean {
    return /^[a-z0-9-]+$/.test(projectId) &&
      this.projects.some((project) => project.id === projectId);
  }

  async getProject(projectId: string): Promise<ProjectDetail> {
    const project = this.projects.find((candidate) => candidate.id === projectId);

    if (project === undefined) {
      throw new Error('Project not found.');
    }

    return await Promise.resolve(project);
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
        path: 'project-area.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { ProjectList } from './project-list';
import { ProjectRoute } from './project-route';

@route({
  routes: [
    {
      path: ['', 'projects'],
      component: ProjectList,
      title: 'Projects'
    },
    {
      path: 'projects/:id',
      component: ProjectRoute,
      title: 'Project'
    }
  ]
})
export class ProjectArea {}
`
      },
      {
        path: 'project-area.html',
        language: 'html',
        contents: `<au-viewport></au-viewport>
`
      },
      {
        path: 'project-list.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IProjectRouteDataService } from './project-route-data-service';

export class ProjectList {
  private readonly routeData = resolve(IProjectRouteDataService);

  get projects() {
    return this.routeData.projectSummaries;
  }
}
`
      },
      {
        path: 'project-list.html',
        language: 'html',
        contents: `<section>
  <h1>Projects</h1>

  <ul>
    <li repeat.for="project of projects; key.bind: project.id">
      <a href.bind="'projects/' + project.id">\${project.name}</a>
    </li>
  </ul>
</section>
`
      },
      {
        path: 'project-route.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import type {
  IRouteViewModel,
  NavigationInstruction,
  Params,
  RouteNode
} from '@aurelia/router';
import {
  IProjectRouteDataService,
  type ProjectDetail
} from './project-route-data-service';

export class ProjectRoute implements IRouteViewModel {
  private readonly routeData = resolve(IProjectRouteDataService);

  project!: ProjectDetail;

  canLoad(params: Params): boolean | NavigationInstruction {
    const projectId = String(params.id ?? '');
    return this.routeData.canOpenProject(projectId) ? true : 'projects';
  }

  async loading(params: Params, _next: RouteNode): Promise<void> {
    this.project = await this.routeData.getProject(String(params.id));
  }
}
`
      },
      {
        path: 'project-route.html',
        language: 'html',
        contents: `<article>
  <nav aria-label="Project navigation">
    <a href="projects">All projects</a>
  </nav>

  <h1>\${project.name}</h1>
  <p>\${project.summary}</p>
  <p>Owner: \${project.owner}</p>

  <h2>Milestones</h2>
  <ul>
    <li repeat.for="milestone of project.milestones; key.bind: milestone.id">
      \${milestone.name}
    </li>
  </ul>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The project id is part of the route path and must be checked before the route enters.'
      },
      {
        summary: 'The critical record is small enough to load during the router transaction.'
      },
      {
        summary: 'The shell can show navigation progress while the router waits for loading().'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep entry decisions in canLoad and setup work in loading().',
        action: 'Use `canLoad` for checks and redirects; use `loading()` for data the route needs before render.'
      },
      {
        summary: 'Move real data access behind an injected service boundary.',
        action: 'Replace the in-memory route data with an API, cache, or repository service without moving HTTP details into the routed component.'
      },
      {
        summary: 'Use promise-bound secondary content for noncritical panels.',
        action: 'Do not block navigation for comments, activity feeds, recommendations, or other content that can appear after the route is visible.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Routing Lifecycle Hooks',
        url: 'https://docs.aurelia.io/router/routing-lifecycle'
      },
      {
        title: 'Configuring Routes',
        url: 'https://docs.aurelia.io/router/configuring-routes'
      },
      {
        title: 'Router Events',
        url: 'https://docs.aurelia.io/router/router-events'
      }
    ]
  }
};
