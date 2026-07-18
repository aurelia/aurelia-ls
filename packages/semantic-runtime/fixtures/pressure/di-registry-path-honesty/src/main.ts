import { IContainer } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

const FalseRegistry = {
  register(_container: IContainer): void {},
};

const ReturnedRegistry = {
  register(_container: IContainer): void {},
};

const NestedRegistry = {
  register(_container: IContainer): void {},
};

const MarkerRegistry = {
  register(_container: IContainer): void {},
};

function installMarker(container: IContainer): void {
  container.register(MarkerRegistry);
}

function returnBeforeRegistration(container: IContainer): void {
  return;
  container.register(ReturnedRegistry);
}

const OuterRegistry = {
  register(container: IContainer): void {
    if (false) {
      container.register(FalseRegistry);
    }

    const nested = {
      register(inner: IContainer): void {
        inner.register(NestedRegistry);
      },
    };

    installMarker(container);
    installMarker(container);
    returnBeforeRegistration(container);
    container.register(StandardConfiguration);
  },
};

@customElement({
  name: 'di-registry-path-honesty-app',
  template: '<template><p>${message}</p></template>',
})
export class DiRegistryPathHonestyApp {
  message = 'Registry path honesty';
}

new Aurelia()
  .register(OuterRegistry)
  .app({
    host: document.body,
    component: DiRegistryPathHonestyApp,
  })
  .start();
