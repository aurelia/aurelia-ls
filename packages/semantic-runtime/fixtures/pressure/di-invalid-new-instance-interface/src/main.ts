import { DI, newInstanceOf } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './di-invalid-new-instance-interface-app.html';

interface MissingService {}

const IMissingService = DI.createInterface<MissingService>('IMissingService');

DI.createContainer().get(newInstanceOf(IMissingService));

@customElement({
  name: 'di-invalid-new-instance-interface-app',
  template,
})
export class DiInvalidNewInstanceInterfaceApp {
  message = 'DI invalid new instance interface pressure';
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: DiInvalidNewInstanceInterfaceApp,
  })
  .start();
