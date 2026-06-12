import { resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { IDialogService } from '@aurelia/dialog';

declare const providerRegistrations: readonly unknown[];

@customElement({
  name: 'open-spread-provider-app',
  template: '<section>provider</section>',
})
export class OpenSpreadProviderApp {}

@customElement({
  name: 'open-spread-consumer-app',
  template: '<section>${message}</section>',
})
export class OpenSpreadConsumerApp {
  message = 'service root open spread sibling';
  private readonly dialogService = resolve(IDialogService);

  open(): void {
    void this.dialogService.open({});
  }
}

const providerAurelia = new Aurelia();
providerAurelia
  .register(
    StandardConfiguration,
    ...providerRegistrations,
  )
  .app({
    host: document.body,
    component: OpenSpreadProviderApp,
  })
  .start();

const consumerAurelia = new Aurelia();
consumerAurelia
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: OpenSpreadConsumerApp,
  })
  .start();
