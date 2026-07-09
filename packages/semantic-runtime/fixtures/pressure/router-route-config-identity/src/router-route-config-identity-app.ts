import { alias, customElement } from '@aurelia/runtime-html';
import { route, Route } from '@aurelia/router';
import template from './router-route-config-identity-app.html';

@customElement({
  name: 'fallback-route',
  template: '<template>Fallback route</template>',
})
export class FallbackRoute {}

@customElement({
  name: 'decorator-object-route',
  template: '<template>Decorator object route</template>',
})
export class DecoratorObjectRoute {}

@alias('class-reference-alias')
@customElement({
  name: 'class-reference-route',
  template: '<template>Class reference route</template>',
})
export class ClassReferenceRoute {}

@alias('scoped-child-alias')
@customElement({
  name: 'scoped-child-route',
  template: '<template>Scoped child route</template>',
})
export class ScopedChildRoute {}

@customElement({
  name: 'static-child-route',
  template: '<template>Static child route</template>',
})
export class StaticChildRoute {}

@customElement({
  name: 'configured-child-route',
  template: '<template>Configured child route</template>',
})
export class ConfiguredChildRoute {}

@customElement({
  name: 'configured-route',
  template: '<template><au-viewport></au-viewport></template>',
})
export class ConfiguredRoute {}

Route.configure({
  id: 'configured-id',
  path: ['configured-primary', 'configured-secondary'],
  title: 'Configured Route',
  routes: [
    {
      id: 'configured-child',
      path: 'configured-child',
      component: ConfiguredChildRoute,
    },
  ],
  fallback: FallbackRoute,
}, ConfiguredRoute);

@customElement({
  name: 'decorator-path-route',
  template: '<template>Decorator path route</template>',
})
@route(['decorator-path', 'decorator-alt'])
export class DecoratorPathRoute {
  static title = 'Decorator Path Title';
  static viewport = 'main';
}

@customElement({
  name: 'static-default-route',
  template: '<template><au-viewport></au-viewport></template>',
  dependencies: [ScopedChildRoute],
})
export class StaticDefaultsRoute {
  static id = 'static-default-id';
  static path = ['static-default', 'static-secondary'];
  static title = 'Static Defaults Title';
  static caseSensitive = true;
  static transitionPlan = 'replace';
  static viewport = 'details';
  static data = { source: 'static-defaults' };
  static routes = [
    {
      id: 'static-child',
      path: 'static-child/:childId',
      component: StaticChildRoute,
      title: 'Static Child',
    },
    {
      id: 'static-scoped-child',
      path: 'static-scoped',
      component: 'scoped-child-alias',
    },
  ];
  static fallback = FallbackRoute;
  static nav = false;
}

@customElement({
  name: 'router-route-config-identity-app',
  template,
  dependencies: [ScopedChildRoute],
})
@route({
  title: 'Router Route Config Identity Pressure',
  routes: [
    {
      path: '',
      redirectTo: 'decorator-object',
    },
    {
      id: 'decorator-object',
      path: ['decorator-object', 'decorator-object-alt'],
      component: DecoratorObjectRoute,
      title: 'Decorator Object Child',
      viewport: 'main',
      data: { source: 'decorator-object' },
      caseSensitive: true,
      transitionPlan: 'invoke-lifecycles',
      fallback: FallbackRoute,
      nav: false,
    },
    ClassReferenceRoute,
    {
      id: 'scoped-alias',
      path: 'scoped-alias',
      component: 'scoped-child-alias',
    },
    {
      id: 'lazy-valid',
      path: 'lazy-valid',
      component: import('./routes/lazy-route'),
    },
    StaticDefaultsRoute,
  ],
})
export class RouterRouteConfigIdentityApp {}
