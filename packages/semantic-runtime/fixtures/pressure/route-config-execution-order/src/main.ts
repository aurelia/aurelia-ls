import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { Route } from '@aurelia/router';

@customElement({
  name: 'configured-route',
  template: '<template>Configured route</template>',
})
class ConfiguredRoute {}

function configure(id: string): void {
  Route.configure({ id, path: id }, ConfiguredRoute);
}

function neverConfigure(): void {
  Route.configure({ id: 'never-executed', path: 'never-executed' }, ConfiguredRoute);
}

configure('first-execution');
configure('second-execution');

@customElement({
  name: 'route-config-execution-order-app',
  template: '<template><configured-route></configured-route></template>',
  dependencies: [ConfiguredRoute],
})
class RouteConfigExecutionOrderApp {}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: RouteConfigExecutionOrderApp,
  })
  .start();
