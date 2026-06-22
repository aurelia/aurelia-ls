import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerActiveNavigationPattern: AureliaPatternExample = {
  patternId: 'router.active-navigation',
  title: 'Router active navigation state',
  guidance: {
    summary: 'Use the router navigation model when a shell should render route links and style the active item from router-owned state.',
    whenToUse: [
      'A shell or feature layout should build a menu from configured routes.',
      'Active styling should follow the router state instead of duplicated local selection state.',
      'Routes can opt into or out of the menu through route configuration.'
    ],
    whenNotToUse: [
      'The menu is a small static set of links that does not need route metadata.',
      'Navigation depends on a command result, guard decision, or async workflow.',
      'The UI needs route-critical data loading, auth redirects, or navigation error recovery at the same time.'
    ]
  },
  source: {
    files: [
      {
        path: 'workspace-shell.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { AdminRoute } from './admin-route';
import { ProjectListRoute } from './project-list-route';
import { ReportsRoute } from './reports-route';
import { SettingsRoute } from './settings-route';

@route({
  routes: [
    { path: '', redirectTo: 'projects' },
    { id: 'projects', path: 'projects', component: ProjectListRoute, title: 'Projects' },
    { id: 'reports', path: 'reports', component: ReportsRoute, title: 'Reports' },
    { id: 'settings', path: 'settings', component: SettingsRoute, title: 'Settings' },
    { id: 'admin', path: 'admin', component: AdminRoute, title: 'Admin', nav: false }
  ]
})
export class WorkspaceShell {}
`
      },
      {
        path: 'workspace-shell.html',
        language: 'html',
        contents: `<import from="./workspace-nav"></import>

<workspace-nav></workspace-nav>

<main>
  <au-viewport></au-viewport>
</main>
`
      },
      {
        path: 'workspace-nav.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IRouteContext, type INavigationModel, type INavigationRoute } from '@aurelia/router';

export class WorkspaceNav {
  private readonly routeContext = resolve(IRouteContext);
  private readonly navModel: INavigationModel | null = this.routeContext.routeConfigContext.navigationModel;

  async binding(): Promise<void> {
    await this.navModel?.resolve();
  }

  get routes(): readonly INavigationRoute[] {
    return this.navModel?.routes ?? [];
  }

  pathFor(route: INavigationRoute): string {
    return route.path.find((path) => path.length > 0) ?? '';
  }

  labelFor(route: INavigationRoute): string {
    if (typeof route.title === 'string' && route.title.length > 0) {
      return route.title;
    }
    return route.id ?? this.pathFor(route);
  }
}
`
      },
      {
        path: 'workspace-nav.html',
        language: 'html',
        contents: `<nav aria-label="Workspace">
  <a
    repeat.for="route of routes; key.bind: route.id ?? pathFor(route)"
    href.bind="pathFor(route)"
    active.class="route.isActive"
    aria-current.attr="route.isActive ? 'page' : null">
    \${labelFor(route)}
  </a>
</nav>
`
      },
      {
        path: 'project-list-route.ts',
        language: 'ts',
        contents: `export class ProjectListRoute {}
`
      },
      {
        path: 'reports-route.ts',
        language: 'ts',
        contents: `export class ReportsRoute {}
`
      },
      {
        path: 'settings-route.ts',
        language: 'ts',
        contents: `export class SettingsRoute {}
`
      },
      {
        path: 'admin-route.ts',
        language: 'ts',
        contents: `export class AdminRoute {}
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The router navigation model is enabled, which is the default router configuration.'
      },
      {
        summary: 'Menu entries should come from route configuration rather than duplicated shell arrays.'
      },
      {
        summary: 'The active class is presentational; route hooks and data loading remain route-owned concerns.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep route metadata close to routes.',
        action: 'Use route ids, titles, and `nav: false` to shape the menu instead of maintaining a second navigation list by hand.'
      },
      {
        summary: 'Resolve async route configuration before rendering dynamic menus.',
        action: 'Call `navigationModel.resolve()` during binding when route configuration may include lazy or async entries.'
      },
      {
        summary: 'Keep active styling presentational.',
        action: 'Use active classes for current-route styling; keep guards, loading, and authorization in route code.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Navigation Model',
        url: 'https://docs.aurelia.io/router/navigation-model'
      },
      {
        title: 'Router Configuration',
        url: 'https://docs.aurelia.io/router/router-configuration'
      },
      {
        title: 'Navigating',
        url: 'https://docs.aurelia.io/router/navigating'
      }
    ]
  }
};
