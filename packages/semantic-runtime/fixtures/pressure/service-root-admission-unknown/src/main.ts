import { IContainer, IRegistry, resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { DialogConfiguration, IDialogService } from '@aurelia/dialog';

class HiddenDialogRegistry implements IRegistry {
  register(container: IContainer): void {
    for (const entry of [DialogConfiguration]) {
      container.register(entry);
    }
  }
}

@customElement({
  name: 'service-root-admission-unknown-app',
  template: '<section>${message}</section>',
})
export class ServiceRootAdmissionUnknownApp {
  message = 'service root admission unknown';
  private readonly dialogService = resolve(IDialogService);

  open(): void {
    void this.dialogService.open({});
  }
}

new Aurelia()
  .register(
    StandardConfiguration,
    new HiddenDialogRegistry(),
  )
  .app({
    host: document.body,
    component: ServiceRootAdmissionUnknownApp,
  })
  .start();
