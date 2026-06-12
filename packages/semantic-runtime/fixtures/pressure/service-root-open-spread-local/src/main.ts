import { resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { IDialogService } from '@aurelia/dialog';

declare const localRegistrations: readonly unknown[];

@customElement({
  name: 'service-root-open-spread-local-app',
  template: '<section>${message}</section>',
})
export class ServiceRootOpenSpreadLocalApp {
  message = 'service root open spread local';
  private readonly dialogService = resolve(IDialogService);

  open(): void {
    void this.dialogService.open({});
  }
}

new Aurelia()
  .register(
    StandardConfiguration,
    ...localRegistrations,
  )
  .app({
    host: document.body,
    component: ServiceRootOpenSpreadLocalApp,
  })
  .start();
