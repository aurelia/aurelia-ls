import { DI, IContainer, Registration } from '@aurelia/kernel';
import { Aurelia, customElement } from '@aurelia/runtime-html';

declare const runtimeIterable: readonly unknown[];

const partialContainer = DI.createContainer();
const PartialThrowRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('partial-before-throw', { reached: true }));
    throw 'registry failure';
    container.register(Registration.instance('partial-after-throw', { reached: false }));
  },
};
partialContainer.register(
  PartialThrowRegistry,
  Registration.instance('partial-after-registry', { reached: false }),
);

const caughtContainer = DI.createContainer();
const CaughtThrowRegistry = {
  register(container: IContainer): void {
    try {
      throw 'caught registry failure';
    } catch {
      container.register(Registration.instance('caught-inside-catch', { reached: true }));
    }
    container.register(Registration.instance('caught-after-catch', { reached: true }));
  },
};
caughtContainer.register(CaughtThrowRegistry);

const auditContainer = DI.createContainer();
const AuditPressureRegistry = {
  register(container: IContainer): void {
    const auditPressure = [...runtimeIterable];
    container.register(Registration.instance('audit-pressure-effect', { reached: true }));
  },
};
auditContainer.register(AuditPressureRegistry);

const nonCallableContainer = DI.createContainer();
nonCallableContainer.register(Registration.instance('.non-callable-handler', { register: 42 }));
nonCallableContainer.register(
  Registration.defer(
    '.non-callable-handler',
    Registration.instance('non-callable-fallback', { reached: false }),
  ),
  Registration.instance('non-callable-after-defer', { reached: false }),
);

const failedLookupContainer = DI.createContainer();
failedLookupContainer.register(Registration.aliasTo('.missing-handler', '.failed-handler'));
failedLookupContainer.register(
  Registration.defer(
    '.failed-handler',
    Registration.instance('failed-handler-fallback', { reached: false }),
  ),
  Registration.instance('failed-handler-after-defer', { reached: false }),
);

class CyclicRegistryHandler {
  static inject = ['.cyclic-handler'];

  constructor(readonly self: CyclicRegistryHandler) {}

  register(container: IContainer): void {
    container.register(Registration.instance('cyclic-handler-effect', { reached: false }));
  }
}

const cyclicContainer = DI.createContainer();
cyclicContainer.register(Registration.singleton('.cyclic-handler', CyclicRegistryHandler));
cyclicContainer.register(
  Registration.defer(
    '.cyclic-handler',
    Registration.instance('cyclic-handler-fallback', { reached: false }),
  ),
  Registration.instance('cyclic-handler-after-defer', { reached: false }),
);

@customElement({ name: 'partial-registry-app', template: '<template>partial</template>' })
class PartialRegistryApp {}

@customElement({ name: 'caught-registry-app', template: '<template>caught</template>' })
class CaughtRegistryApp {}

@customElement({ name: 'audit-registry-app', template: '<template>audit</template>' })
class AuditRegistryApp {}

@customElement({ name: 'non-callable-registry-app', template: '<template>non-callable</template>' })
class NonCallableRegistryApp {}

@customElement({ name: 'failed-lookup-registry-app', template: '<template>failed-lookup</template>' })
class FailedLookupRegistryApp {}

@customElement({ name: 'cyclic-registry-app', template: '<template>cyclic</template>' })
class CyclicRegistryApp {}

new Aurelia(partialContainer).app({ host: document.body, component: PartialRegistryApp });
new Aurelia(caughtContainer).app({ host: document.body, component: CaughtRegistryApp });
new Aurelia(auditContainer).app({ host: document.body, component: AuditRegistryApp });
new Aurelia(nonCallableContainer).app({ host: document.body, component: NonCallableRegistryApp });
new Aurelia(failedLookupContainer).app({ host: document.body, component: FailedLookupRegistryApp });
new Aurelia(cyclicContainer).app({ host: document.body, component: CyclicRegistryApp });
