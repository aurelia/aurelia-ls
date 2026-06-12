import { IContainer, resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { DialogConfiguration, IDialogService } from '@aurelia/dialog';
import { IValidationRules, ValidationConfiguration } from '@aurelia/validation';

@customElement({
  name: 'provider-app',
  template: '<section>provider</section>',
})
export class ProviderApp {}

@customElement({
  name: 'chain-consumer-app',
  template: '<section>${message}</section>',
})
export class ChainConsumerApp {
  message = 'service root admission chain';
  private readonly siblingDialog = resolve(IDialogService);
  private readonly localValidation = resolve(IValidationRules);

  useServices(): void {
    void this.siblingDialog.open({});
    this.localValidation
      .ensure('message')
      .required();
  }
}

export function resolveFromCallerContainer(container: IContainer): void {
  void container.get(IDialogService).open({});
}

const providerAurelia = new Aurelia();
providerAurelia
  .register(
    StandardConfiguration,
    DialogConfiguration,
  )
  .app({
    host: document.body,
    component: ProviderApp,
  })
  .start();

const consumerAurelia = new Aurelia();
consumerAurelia
  .register(
    StandardConfiguration,
    ValidationConfiguration,
  )
  .app({
    host: document.body,
    component: ChainConsumerApp,
  })
  .start();
