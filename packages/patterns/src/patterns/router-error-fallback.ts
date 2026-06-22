import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerErrorFallbackPattern: AureliaPatternExample = {
  patternId: 'router.error-fallback',
  title: 'Unknown route fallback',
  guidance: {
    summary: 'Configure a router fallback so unknown paths resolve to a deliberate route instead of leaving navigation undefined.',
    whenToUse: [
      'A route tree needs a known destination for unrecognized child paths.',
      'The fallback component can offer recovery links and context.',
      'The fallback is part of route configuration rather than component-local error handling.'
    ],
    whenNotToUse: [
      'A route guard should redirect based on a known denied condition.',
      'A data request failed after the route already loaded.',
      'Server-side 404 handling or deployment rewrite rules are the main issue.'
    ]
  },
  source: {
    files: [
      {
        path: 'help-area.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';

export class HelpHome {}
export class HelpSearch {}

export class HelpNotFound {
  readonly message = 'That help page is not available.';
}

@route({
  routes: [
    { id: 'help-home', path: ['', 'help'], component: HelpHome, title: 'Help' },
    { id: 'help-search', path: 'help/search', component: HelpSearch, title: 'Search' },
    { id: 'help-not-found', path: 'help/not-found', component: HelpNotFound, title: 'Not found' }
  ],
  fallback: HelpNotFound
})
export class HelpArea {}
`
      },
      {
        path: 'help-area.html',
        language: 'html',
        contents: `<nav aria-label="Help navigation">
  <a href="help">Help home</a>
  <a href="help/search">Search</a>
</nav>

<au-viewport></au-viewport>
`
      },
      {
        path: 'help-not-found.html',
        language: 'html',
        contents: `<article>
  <h1>Help page not found</h1>
  <p>\${message}</p>
  <a href="help">Return to help home</a>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The route tree owns a clear fallback destination.'
      },
      {
        summary: 'The fallback component is registered through the route configuration.'
      },
      {
        summary: 'The fallback should help the user recover with ordinary navigation links.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use guards for known denied transitions.',
        action: 'Keep fallback for unknown paths; use `canLoad` when a recognized route should redirect because of state or permissions.'
      },
      {
        summary: 'Keep request errors separate.',
        action: 'Handle failed data loads in route loading or service patterns, not by relying on unknown-route fallback.'
      },
      {
        summary: 'Check deployment rewrites separately.',
        action: 'Client-side fallback does not replace server configuration needed for direct navigation to application routes.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Configuring Routes',
        url: 'https://docs.aurelia.io/router/configuring-routes'
      },
      {
        title: 'Router Error Handling',
        url: 'https://docs.aurelia.io/router/error-handling'
      },
      {
        title: 'Viewports',
        url: 'https://docs.aurelia.io/router/viewports'
      }
    ]
  }
};
