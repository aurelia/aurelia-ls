import { resolve } from '@aurelia/kernel';
import { IDialogService } from '@aurelia/dialog';
import { IValidationRules } from '@aurelia/validation';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'source-service-api-demand-app',
  template: '<section>${message}</section>',
})
export class SourceServiceApiDemandApp {
  message = 'source service API demand';
  private readonly dialogService = resolve(IDialogService);
  private readonly validationRules = resolve(IValidationRules);

  openDialogWithoutRegistration(): void {
    void this.dialogService.open({});
  }

  buildRulesWithoutRegistration(): void {
    this.validationRules
      .ensure('message')
      .withMessage('Message is required.');
  }
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: SourceServiceApiDemandApp,
  })
  .start();
