import { IContainer } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

const RecursiveRegistry = {
  register(container: IContainer): void {
    container.register(RecursiveRegistry);
    container.register(StandardConfiguration);
  },
};

@customElement({
  name: 'di-registry-recursive-compiler-block-app',
  template: '<template><p>${message}</p></template>',
})
export class DiRegistryRecursiveCompilerBlockApp {
  message = 'Recursive registry';
}

new Aurelia()
  .register(RecursiveRegistry)
  .app({
    host: document.body,
    component: DiRegistryRecursiveCompilerBlockApp,
  })
  .start();
