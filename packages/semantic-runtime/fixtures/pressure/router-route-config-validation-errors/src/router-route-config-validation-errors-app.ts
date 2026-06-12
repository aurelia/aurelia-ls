import { route } from '@aurelia/router';
import { InvalidPathRoute } from './routes/invalid-path-route';
import { NullConfigRoute } from './routes/null-config-route';

@route({
  title: 'Router Route Config Validation Errors Pressure',
  routes: [
    {
      path: 42 as unknown as string,
      component: InvalidPathRoute,
    },
    {
      path: 'unexpected-route-property',
      component: InvalidPathRoute,
      unexpectedRouteProperty: true,
    },
    {
      path: 'redirect-with-extra-property',
      redirectTo: 'unexpected-route-property',
      title: 'Redirects cannot carry route-only fields',
    },
    {
      component: import('./routes/lazy-child-route'),
    },
    {
      path: 'not-a-component',
      component: import('./routes/not-a-component'),
    },
    {
      path: 'missing-string-component',
      component: 'missing-string-route',
      fallback: 'missing-string-fallback',
    },
    NullConfigRoute,
  ],
})
export class RouterRouteConfigValidationErrorsApp {}
