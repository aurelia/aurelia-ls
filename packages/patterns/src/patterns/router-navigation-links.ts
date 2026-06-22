import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerNavigationLinksPattern: AureliaPatternExample = {
  patternId: 'router.navigation-links',
  title: 'Router navigation links',
  guidance: {
    summary: 'Use router-aware anchor links with route expressions for ordinary in-app navigation, keeping programmatic router.load calls for command flows.',
    whenToUse: [
      'A shell, sidebar, or routed page needs ordinary declarative links between known routes.',
      'Relative route expressions make the navigation easier to read than imperative router.load calls.',
      'The link should stay visible as platform anchor markup while Aurelia owns route resolution.'
    ],
    whenNotToUse: [
      'Navigation depends on a command result, confirmation, or async authorization decision.',
      'The route needs critical data loading, guards, or parameter aggregation beyond constructing the link.',
      'The problem is global navigation progress, route error recovery, or active-link styling policy.'
    ]
  },
  source: {
    files: [
      {
        path: 'workspace-shell.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { ProjectListRoute } from './project-list-route';
import { ProjectDetailRoute } from './project-detail-route';
import { SettingsRoute } from './settings-route';

@route({
  routes: [
    { path: '', redirectTo: 'projects' },
    { path: 'projects', component: ProjectListRoute, title: 'Projects' },
    { path: 'projects/:projectId', component: ProjectDetailRoute, title: 'Project' },
    { path: 'settings', component: SettingsRoute, title: 'Settings' }
  ]
})
export class WorkspaceShell {
  featuredProjectId = 'alpha';

  projectRoute(projectId: string): string {
    return \`projects/\${projectId}\`;
  }
}
`
      },
      {
        path: 'workspace-shell.html',
        language: 'html',
        contents: `<nav aria-label="Workspace">
  <a load="projects">Projects</a>
  <a href.bind="projectRoute(featuredProjectId)">Featured project</a>
  <a load="settings">Settings</a>
</nav>

<main>
  <au-viewport></au-viewport>
</main>
`
      },
      {
        path: 'project-list-route.ts',
        language: 'ts',
        contents: `export class ProjectListRoute {}
`
      },
      {
        path: 'project-detail-route.ts',
        language: 'ts',
        contents: `export class ProjectDetailRoute {}
`
      },
      {
        path: 'settings-route.ts',
        language: 'ts',
        contents: `export class SettingsRoute {}
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The route table is known at shell authoring time and can be expressed declaratively.'
      },
      {
        summary: 'The links are normal navigation affordances, not hidden command side effects.'
      },
      {
        summary: 'The target routes own their loading, guard, and parameter-reading policy.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep ordinary navigation declarative.',
        action: 'Prefer router-aware anchor attributes in templates when a user is choosing a route directly.'
      },
      {
        summary: 'Use programmatic navigation only for command flows.',
        action: 'Reach for `router.load` when navigation follows a save, confirmation, shortcut, or service-level command rather than a visible link.'
      },
      {
        summary: 'Keep link expressions aligned with route ids and parameters.',
        action: 'When route paths or parameter names change, update each `load` expression and visible link label together.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Navigating',
        url: 'https://docs.aurelia.io/router/navigating'
      },
      {
        title: 'Route Expression Syntax',
        url: 'https://docs.aurelia.io/router/route-expression-syntax'
      },
      {
        title: 'Configuring Routes',
        url: 'https://docs.aurelia.io/router/configuring-routes'
      }
    ]
  }
};
