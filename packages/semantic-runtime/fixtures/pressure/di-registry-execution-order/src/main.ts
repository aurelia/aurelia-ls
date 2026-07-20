import { IContainer, IRegistry, Registration } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

const SourceFirstRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('execution-source-first', { marker: 'source-first' }));
  },
};

const SourceSecondRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('execution-source-second', { marker: 'source-second' }));
  },
};

function installRegistry(container: IContainer, registry: IRegistry): void {
  container.register(registry);
}

const OuterRegistry = {
  register(container: IContainer): void {
    installRegistry(container, SourceSecondRegistry);
    installRegistry(container, SourceFirstRegistry);
    container.register(StandardConfiguration);
  },
};

@customElement({
  name: 'di-registry-execution-order-app',
  template: '<template>Registry execution order</template>',
})
class DiRegistryExecutionOrderApp {}

new Aurelia()
  .register(OuterRegistry)
  .app({
    host: document.body,
    component: DiRegistryExecutionOrderApp,
  })
  .start();
