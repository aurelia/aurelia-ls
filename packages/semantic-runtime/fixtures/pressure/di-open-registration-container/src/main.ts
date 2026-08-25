import { IContainer, Registration } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

declare function runtimeContainer(): IContainer;

const container: IContainer = runtimeContainer();
container.register(Registration.instance('runtime-only', { marker: 'runtime-only' }));

@customElement({
  name: 'di-open-registration-container-app',
  template: '<template>Open registration container</template>',
})
class DiOpenRegistrationContainerApp {}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: DiOpenRegistrationContainerApp,
  })
  .start();
