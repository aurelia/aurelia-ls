import { Registration } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

const aurelia = new Aurelia();

function install(name: string): void {
  aurelia.register(Registration.instance(name, { marker: name }));
}

function neverInstall(): void {
  install('global-never-executed');
}

install('global-called-second-in-source');
install('global-called-first-in-source');
aurelia.register(StandardConfiguration);

@customElement({
  name: 'configuration-execution-order-app',
  template: '<template>Configuration execution order</template>',
})
class ConfigurationExecutionOrderApp {}

aurelia
  .app({
    host: document.body,
    component: ConfigurationExecutionOrderApp,
  })
  .start();
