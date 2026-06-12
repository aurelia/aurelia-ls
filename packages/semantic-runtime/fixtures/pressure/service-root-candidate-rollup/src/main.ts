import { lazy, resolve } from '@aurelia/kernel';
import { IDialogService } from '@aurelia/dialog';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'service-root-candidate-rollup-app',
  template: '<section>${message}</section>',
})
export class ServiceRootCandidateRollupApp {
  message = 'candidate rollup';
  private readonly candidate01 = resolve(lazy(IDialogService));
  private readonly candidate02 = resolve(lazy(IDialogService));
  private readonly candidate03 = resolve(lazy(IDialogService));
  private readonly candidate04 = resolve(lazy(IDialogService));
  private readonly candidate05 = resolve(lazy(IDialogService));
  private readonly candidate06 = resolve(lazy(IDialogService));
  private readonly candidate07 = resolve(lazy(IDialogService));
  private readonly candidate08 = resolve(lazy(IDialogService));
  private readonly candidate09 = resolve(lazy(IDialogService));
  private readonly candidate10 = resolve(lazy(IDialogService));
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ServiceRootCandidateRollupApp,
  })
  .start();
