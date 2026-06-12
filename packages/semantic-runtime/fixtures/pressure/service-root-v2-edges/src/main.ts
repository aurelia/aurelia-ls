import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { IContainer, inject, lazy, newInstanceOf, optional, resolve as r } from '@aurelia/kernel';
import { IDialogService } from '@aurelia/dialog';
import { resolve as localResolve } from './di';
import { exportedDialog } from './service-root';

@customElement({
  name: 'service-root-v2-edges-app',
  template: '<section>${message}</section>',
})
export class ServiceRootV2EdgesApp {
  message = 'service root v2 edges';
  private readonly aliasDialog = r(IDialogService);
  private readonly lazyDialogCandidate = r(lazy(IDialogService));
  private readonly optionalDialogCandidate = r(optional(IDialogService));
  private readonly localBarrelDialogCandidate = localResolve(IDialogService);
  private weakTypedDialog!: IDialogService;

  constructor(private readonly container: IContainer) {}

  openAliasedDialog(): void {
    void this.aliasDialog.open({});
  }

  openExportedDialog(): void {
    void exportedDialog.open({});
  }

  readContainerWrapper(): void {
    void this.container.get(newInstanceOf(IDialogService));
  }

  readLocalBarrel(): void {
    void this.localBarrelDialogCandidate;
  }

  readResolveWrappers(): void {
    void this.lazyDialogCandidate;
    void this.optionalDialogCandidate;
  }

  readWeakTypeRoot(): void {
    void this.weakTypedDialog;
  }
}

@inject(IDialogService)
class DecoratorInjectCandidate {
  constructor(readonly dialog: unknown) {}
}

class GetterInjectCandidate {
  static get inject() {
    return [IDialogService];
  }

  constructor(readonly dialog: unknown) {}
}

void DecoratorInjectCandidate;
void GetterInjectCandidate;

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: ServiceRootV2EdgesApp,
  })
  .start();
