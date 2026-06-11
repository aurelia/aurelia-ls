import { resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import {
  DialogConfiguration,
  DialogConfigurationStandard,
  IDialogService,
  DialogService,
} from '@aurelia/dialog';
import template from './dialog-source-errors-app.html';

@customElement({
  name: 'dialog-source-errors-app',
  template,
})
export class DialogSourceErrorsApp {
  private readonly dialogService = new DialogService();
  private readonly missingChildDialogService = resolve(DialogService.child('missing-child'));
  private readonly configuredChildDialogService = resolve(IDialogService.child('configured-child'));

  openWithoutComponentOrTemplate(): void {
    void this.dialogService.open({});
  }

  openConfiguredChildWithoutComponentOrTemplate(): void {
    void this.configuredChildDialogService.open({ model: { source: 'configured-child' } });
  }
}

new Aurelia()
  .register(
    StandardConfiguration,
    DialogConfiguration,
    DialogConfigurationStandard.withChild('configured-child', () => ({})),
  )
  .app({
    host: document.querySelector('dialog-source-errors-app') ?? document.body,
    component: DialogSourceErrorsApp,
  })
  .start();
