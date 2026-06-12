import { DI } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { DialogConfiguration, IDialogService } from '@aurelia/dialog';

const standaloneContainer = DI.createContainer();
standaloneContainer.register(DialogConfiguration);

@customElement({
  name: 'service-root-standalone-container-register-app',
  template: '<section>${message}</section>',
})
export class ServiceRootStandaloneContainerRegisterApp {
  message = 'service root standalone container register';
  private readonly dialogService = standaloneContainer.get(IDialogService);

  open(): void {
    void this.dialogService.open({});
  }
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ServiceRootStandaloneContainerRegisterApp,
  })
  .start();
