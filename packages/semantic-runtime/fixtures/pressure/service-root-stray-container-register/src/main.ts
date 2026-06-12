import { DI, resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { DialogConfiguration, IDialogService } from '@aurelia/dialog';

const strayContainer = DI.createContainer();
strayContainer.register(DialogConfiguration);

@customElement({
  name: 'service-root-stray-container-register-app',
  template: '<section>${message}</section>',
})
export class ServiceRootStrayContainerRegisterApp {
  message = 'service root stray container register';
  private readonly dialogService = resolve(IDialogService);

  open(): void {
    void this.dialogService.open({});
  }
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ServiceRootStrayContainerRegisterApp,
  })
  .start();
