import {
  Aurelia,
  customElement,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import type { IContainer } from '@aurelia/kernel';
import {
  route,
  RouterConfiguration,
} from '@aurelia/router';

@customElement({
  name: 'first-child',
  template: '<template>First child</template>',
})
class FirstChild {}

@customElement({
  name: 'first-router-root',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  routes: [
    { path: 'first-child', component: FirstChild },
  ],
})
class FirstRouterRoot {}

@customElement({
  name: 'shared-child',
  template: '<template>Shared child</template>',
})
class SharedChild {}

@customElement({
  name: 'shared-router-root',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  routes: [
    { path: 'shared-child', component: SharedChild },
  ],
})
class SharedRouterRoot {}

@customElement({
  name: 'registry-child',
  template: '<template>Registry child</template>',
})
class RegistryChild {}

@customElement({
  name: 'registry-router-root',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  routes: [
    { path: 'registry-child', component: RegistryChild },
  ],
})
class RegistryRouterRoot {}

@customElement({
  name: 'duplicate-child',
  template: '<template>Duplicate child</template>',
})
class DuplicateChild {}

@customElement({
  name: 'duplicate-router-root',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  routes: [
    { path: 'duplicate-child', component: DuplicateChild },
  ],
})
class DuplicateRouterRoot {}

const sharedRouterConfiguration = RouterConfiguration.customize({
  activeClass: 'shared-active',
  useEagerLoading: false,
});

const unusedRouterConfiguration = RouterConfiguration.customize({
  activeClass: 'unused-active',
  useEagerLoading: true,
});
void unusedRouterConfiguration;

const routerRegistry = {
  register(container: IContainer): void {
    container.register(RouterConfiguration.customize({
      activeClass: 'registry-active',
      useEagerLoading: true,
    }));
  },
};

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration.customize({
      activeClass: 'first-active',
      useEagerLoading: true,
    }),
  )
  .app({ host: document.body, component: FirstRouterRoot });

new Aurelia()
  .register(StandardConfiguration, sharedRouterConfiguration)
  .app({ host: document.body, component: SharedRouterRoot });

new Aurelia()
  .register(StandardConfiguration, sharedRouterConfiguration)
  .app({ host: document.body, component: SharedRouterRoot });

new Aurelia()
  .register(StandardConfiguration, routerRegistry)
  .app({ host: document.body, component: RegistryRouterRoot });

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration.customize({ activeClass: 'duplicate-first' }),
    RouterConfiguration.customize({ activeClass: 'duplicate-second' }),
  )
  .app({ host: document.body, component: DuplicateRouterRoot });
