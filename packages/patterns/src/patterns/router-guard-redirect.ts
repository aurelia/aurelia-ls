import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerGuardRedirectPattern: AureliaPatternExample = {
  patternId: 'router.guard-redirect',
  title: 'Route guard redirect',
  guidance: {
    summary: 'Use `canLoad` to decide route entry and return a navigation instruction when the user should be redirected.',
    whenToUse: [
      'A route parameter or permission check should decide whether a page may enter.',
      'The redirect is part of the route transaction.',
      'The guard can answer quickly from route params and injected state or service data.'
    ],
    whenNotToUse: [
      'The page may render first and load secondary content afterward.',
      'The route needs long data preparation that belongs in `loading()` after entry is allowed.',
      'The decision belongs to a shared state/service class used outside routing too.'
    ]
  },
  source: {
    files: [
      {
        path: 'project-access-service.ts',
        language: 'ts',
        contents: `import { DI } from 'aurelia';

export class ProjectAccessService {
  private readonly allowedProjectIds = new Set(['release-readiness', 'docs-refresh']);

  canOpen(projectId: string): boolean {
    return this.allowedProjectIds.has(projectId);
  }
}

export interface IProjectAccessService extends ProjectAccessService {}

export const IProjectAccessService = DI.createInterface<IProjectAccessService>(
  'IProjectAccessService',
  (x) => x.singleton(ProjectAccessService)
);
`
      },
      {
        path: 'project-routes.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { ProjectList } from './project-list';
import { ProjectGate } from './project-gate';

@route({
  routes: [
    { path: ['', 'projects'], component: ProjectList, title: 'Projects' },
    { path: 'projects/:id', component: ProjectGate, title: 'Project' }
  ]
})
export class ProjectRoutes {}
`
      },
      {
        path: 'project-routes.html',
        language: 'html',
        contents: `<au-viewport></au-viewport>
`
      },
      {
        path: 'project-list.ts',
        language: 'ts',
        contents: `export class ProjectList {
  readonly projects = [
    { id: 'release-readiness', name: 'Release readiness', path: 'projects/release-readiness' },
    { id: 'unknown-project', name: 'Unknown project', path: 'projects/unknown-project' }
  ];
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
      <a href.bind="project.path">\${project.name}</a>
    </li>
  </ul>
</section>
`
      },
      {
        path: 'project-gate.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import type { IRouteViewModel, NavigationInstruction, Params } from '@aurelia/router';
import { IProjectAccessService } from './project-access-service';

export class ProjectGate implements IRouteViewModel {
  private readonly access = resolve(IProjectAccessService);

  projectId = '';

  canLoad(params: Params): boolean | NavigationInstruction {
    const projectId = String(params.id ?? '');
    return this.access.canOpen(projectId) ? true : 'projects';
  }

  loading(params: Params): void {
    this.projectId = String(params.id ?? '');
  }
}
`
      },
      {
        path: 'project-gate.html',
        language: 'html',
        contents: `<article>
  <h1>Project \${projectId}</h1>
  <p>The route guard allowed this project to open.</p>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The guard can decide from fast local state or an already-available service.'
      },
      {
        summary: 'Denied entry should redirect instead of rendering a partial page.'
      },
      {
        summary: 'Critical data loading remains a separate `loading()` concern.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep `canLoad` focused on entry decisions.',
        action: 'Return `true`, `false`, or a navigation instruction from `canLoad`; put setup work that should run after approval in `loading()`.'
      },
      {
        summary: 'Move reusable decision state behind DI.',
        action: 'If the same permission or availability state is needed outside the route, keep it in an injected service instead of duplicating route logic.'
      },
      {
        summary: 'Pair with shell navigation progress for visible waits.',
        action: 'When guards or loading hooks do async work, use a shell-level router progress pattern so the user sees the navigation transaction.'
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
      }
    ]
  }
};
