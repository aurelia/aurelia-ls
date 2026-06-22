import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerRelativeContextNavigationPattern: AureliaPatternExample = {
  patternId: 'router.relative-context-navigation',
  title: 'Route-context relative navigation',
  guidance: {
    summary: 'Use `router.load(..., { context })` when programmatic navigation should be resolved relative to the current route context.',
    whenToUse: [
      'A child route needs to navigate to a sibling or descendant using the current route context.',
      'The navigation target collaborates with route parameters or async route loading.',
      'A command method is clearer than putting the whole instruction in the template.'
    ],
    whenNotToUse: [
      'A plain anchor route expression is enough.',
      'The navigation should be absolute from the application root.',
      'The route data should be read with `IRouteContext.getRouteParameters()` instead of navigating.'
    ]
  },
  source: {
    files: [
      {
        path: 'account-area.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { AccountList } from './account-list';
import { AccountPreferences } from './account-preferences';

@route({
  routes: [
    { path: ['', 'accounts'], component: AccountList, title: 'Accounts' },
    { path: 'accounts/:id/preferences', component: AccountPreferences, title: 'Preferences' }
  ]
})
export class AccountArea {}
`
      },
      {
        path: 'account-area.html',
        language: 'html',
        contents: `<au-viewport></au-viewport>
`
      },
      {
        path: 'account-list.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IRouteContext, IRouter } from '@aurelia/router';

export class AccountList {
  private readonly router = resolve(IRouter);
  private readonly routeContext = resolve(IRouteContext);

  readonly accounts = [
    { id: 'platform', name: 'Platform' },
    { id: 'education', name: 'Education' }
  ];

  async openPreferences(accountId: string): Promise<void> {
    await this.router.load('accounts/' + accountId + '/preferences', {
      context: this.routeContext
    });
  }
}
`
      },
      {
        path: 'account-list.html',
        language: 'html',
        contents: `<section>
  <h1>Accounts</h1>
  <ul>
    <li repeat.for="account of accounts; key.bind: account.id">
      <span>\${account.name}</span>
      <button type="button" click.trigger="openPreferences(account.id)">
        Open preferences
      </button>
    </li>
  </ul>
</section>
`
      },
      {
        path: 'account-preferences.ts',
        language: 'ts',
        contents: `export class AccountPreferences {
  message = 'Preferences route loaded.';
}
`
      },
      {
        path: 'account-preferences.html',
        language: 'html',
        contents: `<article>
  <a href="accounts">Back to accounts</a>
  <p>\${message}</p>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The component is hosted by the route context it navigates from.'
      },
      {
        summary: 'Programmatic navigation is clearer than a static anchor for this action.'
      },
      {
        summary: 'Route parameter aggregation is handled by a separate pattern when data loading needs it.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use anchors for ordinary navigation.',
        action: 'Reach for `router.load` when the action needs TypeScript state, command flow, or explicit context.'
      },
      {
        summary: 'Keep relative context explicit.',
        action: 'Resolve `IRouteContext` where the navigation should be anchored so future route nesting changes remain visible.'
      },
      {
        summary: 'Pair with route-context parameter reads when loading data.',
        action: 'Use `IRouteContext.getRouteParameters()` inside loading or service code when parent and child params both shape the request.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Child Routing',
        url: 'https://docs.aurelia.io/router/child-routing'
      },
      {
        title: 'Navigation',
        url: 'https://docs.aurelia.io/router/navigating'
      },
      {
        title: 'Router API Reference',
        url: 'https://docs.aurelia.io/router/api-reference'
      }
    ]
  }
};
