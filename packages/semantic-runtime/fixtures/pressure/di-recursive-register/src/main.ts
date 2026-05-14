import { DI, IContainer } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './di-recursive-register-app.html';

const RecursiveRegistry = {
  register(container: IContainer): void {
    container.register(RecursiveRegistry);
  },
};

const container = DI.createContainer();
container.register(RecursiveRegistry);

@customElement({
  name: 'di-recursive-register-app',
  template,
})
export class DiRecursiveRegisterApp {
  message = 'DI recursive register pressure';
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: DiRecursiveRegisterApp,
  })
  .start();
