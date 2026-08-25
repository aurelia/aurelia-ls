import { IContainer } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

const ConditionalRegistry = {
  register(container: IContainer): void {
    if (window.location.hash === '#compiler') {
      container.register(StandardConfiguration);
    }
    container.register(StandardConfiguration);
  },
};

@customElement({
  name: 'di-registry-open-branch-app',
  template: '<template><p>${message}</p></template>',
})
export class DiRegistryOpenBranchApp {
  message = 'Open registry branch';
}

new Aurelia()
  .register(ConditionalRegistry)
  .app({
    host: document.body,
    component: DiRegistryOpenBranchApp,
  })
  .start();
