import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerAuthSessionGuardPattern: AureliaPatternExample = {
  patternId: 'router.auth-session-guard',
  title: 'Auth session route guard',
  guidance: {
    summary: 'Use an injected session service plus canLoad route guards when route entry depends on authentication or feature roles.',
    whenToUse: [
      'A routed area should redirect unauthenticated users before entering protected pages.',
      'Route data names the roles or permissions needed for a page.',
      'The same session state is read by the shell, route guards, and page components.'
    ],
    whenNotToUse: [
      'The server API does not enforce the same authorization rules.',
      'The check belongs to a single button or command rather than route entry.',
      'The app needs an external auth SDK flow that owns redirect and token refresh policy.'
    ]
  },
  source: {
    files: [
      {
        path: 'session-state.ts',
        language: 'ts',
        contents: `import { DI } from 'aurelia';

export interface UserSession {
  id: string;
  name: string;
  roles: readonly string[];
}

export class SessionState {
  user: UserSession | null = null;

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  hasRole(role: string): boolean {
    return this.user?.roles.includes(role) ?? false;
  }

  signIn(user: UserSession): void {
    this.user = user;
  }

  signOut(): void {
    this.user = null;
  }
}

export interface ISessionState extends SessionState {}

export const ISessionState = DI.createInterface<ISessionState>(
  'ISessionState',
  (x) => x.singleton(SessionState)
);
`
      },
      {
        path: 'main.ts',
        language: 'ts',
        contents: `import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { AuthGuard } from './auth-guard';
import { ProtectedArea } from './protected-area';
import { ISessionState } from './session-state';

void Aurelia
  .register(RouterConfiguration, ISessionState, AuthGuard)
  .app(ProtectedArea)
  .start();
`
      },
      {
        path: 'auth-guard.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { lifecycleHooks } from '@aurelia/runtime-html';
import type {
  IRouteViewModel,
  NavigationInstruction,
  Params,
  RouteNode
} from '@aurelia/router';
import { ISessionState } from './session-state';

@lifecycleHooks()
export class AuthGuard {
  private readonly session = resolve(ISessionState);

  canLoad(_viewModel: IRouteViewModel, _params: Params, next: RouteNode): boolean | NavigationInstruction {
    if (next.data?.public === true) {
      return true;
    }

    if (!this.session.isAuthenticated) {
      return 'login';
    }

    const requiredRoles = this.requiredRoles(next);
    if (requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.every((role) => this.session.hasRole(role)) ? true : 'forbidden';
  }

  private requiredRoles(next: RouteNode): readonly string[] {
    const roles = next.data?.roles;
    return Array.isArray(roles) && roles.every((role) => typeof role === 'string')
      ? roles
      : [];
  }
}
`
      },
      {
        path: 'protected-area.ts',
        language: 'ts',
        contents: `import { route } from '@aurelia/router';
import { AuthGuard } from './auth-guard';
import { AdminDashboard } from './admin-dashboard';
import { ForbiddenPage } from './forbidden-page';
import { LoginPage } from './login-page';

@route({
  routes: [
    {
      path: 'admin',
      component: AdminDashboard,
      data: { roles: ['admin'] },
      title: 'Admin'
    },
    {
      path: 'login',
      component: LoginPage,
      data: { public: true },
      title: 'Sign in'
    },
    {
      path: 'forbidden',
      component: ForbiddenPage,
      data: { public: true },
      title: 'Forbidden'
    }
  ]
})
export class ProtectedArea {}
`
      },
      {
        path: 'admin-dashboard.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { ISessionState } from './session-state';

export class AdminDashboard {
  private readonly session = resolve(ISessionState);

  get userName(): string {
    return this.session.user?.name ?? 'Unknown user';
  }
}
`
      },
      {
        path: 'admin-dashboard.html',
        language: 'html',
        contents: `<section>
  <h1>Admin</h1>
  <p>Signed in as \${userName}</p>
</section>
`
      },
      {
        path: 'login-page.ts',
        language: 'ts',
        contents: `export class LoginPage {}
`
      },
      {
        path: 'login-page.html',
        language: 'html',
        contents: `<section>
  <h1>Sign in</h1>
  <p>Complete the app-specific sign-in flow before opening protected routes.</p>
</section>
`
      },
      {
        path: 'forbidden-page.ts',
        language: 'ts',
        contents: `export class ForbiddenPage {}
`
      },
      {
        path: 'forbidden-page.html',
        language: 'html',
        contents: `<section>
  <h1>Forbidden</h1>
  <p>You do not have access to this page.</p>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'Client-side route guards improve navigation flow but do not replace server authorization.'
      },
      {
        summary: 'Session state is shared through DI because the shell and routed views both need it.'
      },
      {
        summary: 'Redirect targets such as login and forbidden are marked public so guard redirects terminate.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep auth facts in an injected session boundary.',
        action: 'Load, refresh, and clear session data in a service or state class instead of duplicating auth reads inside every route.'
      },
      {
        summary: 'Use route data only for simple static requirements.',
        action: 'Move complex permission checks into a domain service when the rule depends on fetched records or organization policy.'
      },
      {
        summary: 'Mirror every client guard on the server.',
        action: 'Treat `canLoad` as a UX and routing boundary; make APIs enforce the same authentication and authorization decisions.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Router Hooks',
        url: 'https://docs.aurelia.io/router/router-hooks'
      },
      {
        title: 'Security Guide',
        url: 'https://docs.aurelia.io/developer-guides/security'
      },
      {
        title: 'Route Parameters',
        url: 'https://docs.aurelia.io/router/route-parameters'
      }
    ]
  }
};
