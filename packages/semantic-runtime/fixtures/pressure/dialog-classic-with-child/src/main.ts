import { resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import * as Dialog from '@aurelia/dialog';
import {
  DialogConfigurationClassic,
  IDialogService,
} from '@aurelia/dialog';
import template from './dialog-classic-with-child-app.html';

@customElement({
  name: 'child-dialog',
  template: '<template><p>Child dialog</p></template>',
})
export class ChildDialog {}

const constChildDialogConfiguration = DialogConfigurationClassic.withChild('configured-child-const', () => ({
  component: () => ChildDialog,
}));

function createFactoryChildDialogConfiguration() {
  return Dialog.DialogConfigurationClassic.withChild('configured-child-factory', () => ({
    component: () => ChildDialog,
  }));
}

@customElement({
  name: 'dialog-classic-with-child-app',
  template,
})
export class DialogClassicWithChildApp {
  private readonly dialogService = resolve(IDialogService);
  private readonly childDialogService = resolve(IDialogService.child('configured-child'));
  private readonly namespaceChildDialogService = resolve(IDialogService.child('configured-child-namespace'));
  private readonly constChildDialogService = resolve(IDialogService.child('configured-child-const'));
  private readonly factoryChildDialogService = resolve(IDialogService.child('configured-child-factory'));

  openDialog(): void {
    void this.dialogService.open({ component: () => ChildDialog });
  }

  openChildDialog(): void {
    void this.childDialogService.open({ model: { source: 'direct-child' } });
  }

  openNamespaceChildDialog(): void {
    void this.namespaceChildDialogService.open({ model: { source: 'namespace-child' } });
  }

  openConstChildDialog(): void {
    void this.constChildDialogService.open({ model: { source: 'const-child' } });
  }

  openFactoryChildDialog(): void {
    void this.factoryChildDialogService.open({ model: { source: 'factory-child' } });
  }
}

new Aurelia()
  .register(
    StandardConfiguration,
    DialogConfigurationClassic.withChild('configured-child', () => ({
      component: () => ChildDialog,
    })),
    Dialog.DialogConfigurationClassic.withChild('configured-child-namespace', () => ({
      component: () => ChildDialog,
    })),
    constChildDialogConfiguration,
    createFactoryChildDialogConfiguration(),
  )
  .app({
    host: document.querySelector('dialog-classic-with-child-app') ?? document.body,
    component: DialogClassicWithChildApp,
  })
  .start();
