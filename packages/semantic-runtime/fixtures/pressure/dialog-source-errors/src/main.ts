import { DI, IContainer, inject, lazy, optional, resolve } from '@aurelia/kernel';
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
  private readonly erasedContainer = resolve(IContainer) as any;
  private readonly decoratorFactoryIsNotDialogService = inject(IDialogService) as any;
  private readonly lazyDialogServiceCandidate = resolve(lazy(IDialogService));
  private readonly optionalDialogServiceCandidate = resolve(optional(IDialogService));
  private readonly localDialogService = new LocalDialogService();
  private readonly localResolverMap = new Map<unknown, unknown>();
  private readonly localContainer = DI.createContainer();
  private readonly missingChildDialogService = resolve(DialogService.child('missing-child'));
  private readonly configuredChildDialogService = resolve(IDialogService.child('configured-child'));

  constructor(
    private readonly constructorContainer: IContainer,
  ) {
    const shadowedDialogService = resolve(IDialogService);
    void shadowedDialogService;
    {
      const shadowedDialogService = new LocalDialogService();
      void shadowedDialogService.open({});
    }
  }

  openWithoutComponentOrTemplate(): void {
    void this.dialogService.open({});
  }

  openConfiguredChildWithoutComponentOrTemplate(): void {
    void this.configuredChildDialogService.open({ model: { source: 'configured-child' } });
  }

  openViaErasedContainerRoot(): void {
    void this.erasedContainer.get(IDialogService).open({});
    void this.erasedContainer.get(IDialogService.child('missing-container-child'));
  }

  openViaParameterPropertyContainerRoot(): void {
    void this.constructorContainer.get(IDialogService).open({});
  }

  callerDependentResolveStaysCandidate(): void {
    const callerDependentDialog = resolve(IDialogService);
    void callerDependentDialog;
  }

  localLookalikesStayOutOfFrameworkDiagnostics(): void {
    void this.decoratorFactoryIsNotDialogService.open({});
    void this.localDialogService.open({});
    this.localResolverMap.get(IDialogService.child('not-a-container-resolution'));
    this.localContainer.getResolver(IDialogService.child('resolver-only'));
  }
}

class LocalDialogService {
  open(_settings: Record<string, unknown>): void {}
  closeAll(): void {}
  createChild(_settings: Record<string, unknown>): LocalDialogService {
    return this;
  }
}

class ClassicDialogInjectionCandidate {
  static inject = [IDialogService];

  constructor(readonly dialog: unknown) {}
}

void ClassicDialogInjectionCandidate;

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
