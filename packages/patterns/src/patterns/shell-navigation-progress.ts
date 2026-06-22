import type { AureliaPatternExample } from '../pattern-contract.js';

export const shellNavigationProgressPattern: AureliaPatternExample = {
  patternId: 'shell.navigation-progress',
  title: 'Shell navigation progress state',
  guidance: {
    summary: 'Use the typed router events service from an app shell or shell-owned state service to show navigation progress and navigation errors.',
    whenToUse: [
      'A routed app needs one visible progress indicator while route guards, loading hooks, or lazy components run.',
      'The progress state belongs to the application shell rather than one routed page.',
      'You want typed router event subscriptions instead of generic pub/sub wiring.'
    ],
    whenNotToUse: [
      'The async work belongs entirely inside one component and does not affect navigation.',
      'The route should block on critical data; pair this with a route loading pattern rather than moving data work into the shell.',
      'The app needs analytics, breadcrumb policy, or error recovery beyond basic progress and failure feedback.'
    ]
  },
  source: {
    files: [
      {
        path: 'navigation-progress-state.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import type { IDisposable } from '@aurelia/kernel';
import {
  IRouterEvents,
  type NavigationCancelEvent,
  type NavigationEndEvent,
  type NavigationErrorEvent,
  type NavigationStartEvent
} from '@aurelia/router';

export class NavigationProgressState implements IDisposable {
  private readonly events = resolve(IRouterEvents);
  private readonly subscriptions: IDisposable[] = [
    this.events.subscribe('au:router:navigation-start', (event: NavigationStartEvent) => this.begin(event)),
    this.events.subscribe('au:router:navigation-end', (event: NavigationEndEvent) => this.finish(event.id)),
    this.events.subscribe('au:router:navigation-cancel', (event: NavigationCancelEvent) => this.cancel(event)),
    this.events.subscribe('au:router:navigation-error', (event: NavigationErrorEvent) => this.fail(event))
  ];

  isNavigating = false;
  errorMessage = '';
  private currentNavigationId: number | null = null;

  private begin(event: NavigationStartEvent): void {
    this.currentNavigationId = event.id;
    this.isNavigating = true;
    this.errorMessage = '';
  }

  private finish(id: number): void {
    if (this.currentNavigationId === id) {
      this.currentNavigationId = null;
      this.isNavigating = false;
    }
  }

  private cancel(event: NavigationCancelEvent): void {
    this.finish(event.id);
  }

  private fail(event: NavigationErrorEvent): void {
    this.finish(event.id);
    this.errorMessage = 'Navigation failed. Please try again.';
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  dispose(): void {
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
    this.subscriptions.length = 0;
  }
}

export interface INavigationProgressState extends NavigationProgressState {}

export const INavigationProgressState = DI.createInterface<INavigationProgressState>(
  'INavigationProgressState',
  (x) => x.singleton(NavigationProgressState)
);
`
      },
      {
        path: 'app-shell.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { INavigationProgressState } from './navigation-progress-state';

export class AppShell {
  readonly progress = resolve(INavigationProgressState);
}
`
      },
      {
        path: 'app-shell.html',
        language: 'html',
        contents: `<header>
  <nav aria-label="Primary">
    <a href="">Home</a>
    <a href="projects">Projects</a>
    <a href="settings">Settings</a>
  </nav>

  <p if.bind="progress.isNavigating" role="status">
    Loading page...
  </p>

  <p if.bind="progress.errorMessage" role="alert">
    \${progress.errorMessage}
    <button type="button" click.trigger="progress.dismissError()">Dismiss</button>
  </p>
</header>

<main>
  <au-viewport></au-viewport>
</main>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: '@aurelia/router is configured in app startup and the shell owns the top-level viewport.'
      },
      {
        summary: 'Navigation progress is app-shell UI state, not page data or route authorization.'
      },
      {
        summary: 'The example shows progress and error feedback only; analytics and recovery policy are app-specific.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep route data loading inside routed components or data services.',
        action: 'Use shell progress to reflect navigation state; keep critical route data in `loading()` and non-gating async content in a promise/template pattern.'
      },
      {
        summary: 'Dispose subscriptions if the state is not application-lifetime.',
        action: 'The singleton can live for the app lifetime; if you scope this state to a child container or temporary shell, call `dispose()` with that scope.'
      },
      {
        summary: 'Add recovery behavior only after the app owns navigation-error policy.',
        action: 'Route to an error page, log, or show a toast from the shell boundary once those policies exist.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Router Events',
        url: 'https://docs.aurelia.io/router/router-events'
      },
      {
        title: 'Viewports',
        url: 'https://docs.aurelia.io/router/viewports'
      }
    ]
  }
};
