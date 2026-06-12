import { IContainer } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { IDialogService } from '@aurelia/dialog';

@customElement({
  name: 'service-root-caller-container-unmapped-app',
  template: '<section>${message}</section>',
})
export class ServiceRootCallerContainerUnmappedApp {
  message = 'service root caller container unmapped';
}

export function openDialogFromCallerContainer(container: IContainer): void {
  void container.get(IDialogService).open({});
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ServiceRootCallerContainerUnmappedApp,
  })
  .start();
