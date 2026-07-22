import { alias, customElement } from '@aurelia/runtime-html';
import { route, Route } from '@aurelia/router';
import './configure-cross-module-first';
import './configure-cross-module-second';
import { CrossModuleRoute } from './cross-module-route';
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
  name: 'convention-only-route',
  aliases: ['convention-only-alias'],
  template: '<template>Convention-only route</template>',
})
export class ConventionOnlyRoute {}

@customElement({
  name: 'merged-route',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  id: 'merged-explicit-id',
  path: 'merged-explicit',
  title: 'Merged Explicit Title',
  data: { explicit: true },
  routes: [{ path: 'merged-explicit-child', component: ConfiguredChildRoute }],
})
export class MergedRoute {
  static id = 'merged-static-id';
  static path = 'merged-static';
  static title = 'Merged Static Title';
  static data = { inherited: true, overwritten: 'static' };
  static routes = [{ path: 'merged-static-child', component: StaticChildRoute }];
  static nav = false;
}

@customElement({
  name: 'repeated-route',
  template: '<template>Repeated route</template>',
})
@route({
  id: 'repeated-definition',
  path: 'repeated-definition',
  title: 'Repeated Definition',
})
export class RepeatedRoute {}

@customElement({
  name: 'first-parent-route',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  path: 'first-parent',
  transitionPlan: 'invoke-lifecycles',
  fallback: FallbackRoute,
  routes: [{ id: 'repeated-first-parent', path: 'repeated-first-parent', component: RepeatedRoute }],
})
export class FirstParentRoute {}

@customElement({
  name: 'second-parent-route',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  path: 'second-parent',
  transitionPlan: 'replace',
  routes: [{ id: 'repeated-second-parent', path: 'repeated-second-parent', component: RepeatedRoute }],
})
export class SecondParentRoute {}

@customElement({
  name: 'decorator-order-route',
  template: '<template>Decorator order route</template>',
})
@route({ id: 'topmost-decorator', path: 'topmost-decorator' })
@route({ id: 'bottom-decorator', path: 'bottom-decorator' })
export class DecoratorOrderRoute {}

@customElement({
  name: 'configure-order-route',
  template: '<template>Configure order route</template>',
})
export class ConfigureOrderRoute {}

Route.configure({ id: 'first-configure', path: 'first-configure' }, ConfigureOrderRoute);
Route.configure({ id: 'last-configure', path: 'last-configure' }, ConfigureOrderRoute);

@customElement({
  name: 'conditionally-configured-route',
  template: '<template>Conditionally configured route</template>',
})
export class ConditionallyConfiguredRoute {
  static path = 'conditional-static';
}

const runtimeRouteFlag = globalThis.location.hash.length > 0;
if (runtimeRouteFlag) {
  Route.configure({ id: 'conditional-configure', path: 'conditional-configure' }, ConditionallyConfiguredRoute);
}
if (false) {
  Route.configure({ id: 'dead-configure', path: 'dead-configure' }, ConditionallyConfiguredRoute);
}

@customElement({
  name: 'callback-route',
  template: '<template>Callback route</template>',
})
@route({
  path: 'callback-route',
  title: () => 'Callback title',
  transitionPlan: () => 'replace',
  fallback: () => FallbackRoute,
})
export class CallbackRoute {}

@customElement({
  name: 'dynamic-hook-route',
  template: '<template>Dynamic hook route</template>',
})
@route({
  path: 'dynamic-hook-route',
  title: 'Pre-hook title',
  routes: [{ path: 'pre-hook-child', component: StaticChildRoute }],
})
export class DynamicHookRoute {
  getRouteConfig() {
    return globalThis.location.hash.length > 0
      ? { title: 'Runtime title', routes: [{ path: 'runtime-child', component: ConfiguredChildRoute }] }
      : null;
  }
}

const runtimeStaticTitle = globalThis.document.title;

@customElement({
  name: 'open-static-route',
  template: '<template>Open static route</template>',
})
export class OpenStaticRoute {
  static path = 'open-static-route';
  static title = runtimeStaticTitle;
}

@customElement({
  name: 'recursive-route',
  template: '<template><au-viewport></au-viewport></template>',
})
export class RecursiveRoute {
  static path = 'recursive-route';
  static routes = [{
    id: 'recursive-child',
    path: 'recursive-child',
    component: RecursiveRoute,
  }];
}

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
    {
      id: 'lazy-selected',
      path: 'lazy-selected',
      component: import('./routes/lazy-route').then(module => module.LazyRoute),
    },
    {
      id: 'lazy-selected-element',
      path: 'lazy-selected-element',
      component: import('./routes/lazy-route').then(module => module['LazyRoute']),
    },
    ConventionOnlyRoute,
    MergedRoute,
    {
      id: 'repeated-first-use',
      path: 'repeated-first-use',
      component: RepeatedRoute,
    },
    {
      id: 'repeated-second-use',
      path: 'repeated-second-use',
      component: RepeatedRoute,
      title: 'Repeated Override',
    },
    FirstParentRoute,
    SecondParentRoute,
    DecoratorOrderRoute,
    ConfigureOrderRoute,
    ConditionallyConfiguredRoute,
    CallbackRoute,
    DynamicHookRoute,
    CrossModuleRoute,
    OpenStaticRoute,
    RecursiveRoute,
    StaticDefaultsRoute,
  ],
})
export class RouterRouteConfigIdentityApp {}
