import { DI, IContainer, Registration } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';

const CaughtInnerRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('caught-inner-before-throw', { reached: true }));
    throw 'caught nested registry failure';
  },
};

const CatchingOuterRegistry = {
  register(container: IContainer): void {
    try {
      container.register(CaughtInnerRegistry);
    } catch (error) {
      if (error === 'caught nested registry failure') {
        container.register(Registration.instance('caught-outer-after-catch', { reached: true }));
      } else {
        container.register(Registration.instance('caught-outer-wrong-value', { reached: false }));
      }
    }
    container.register(StandardConfiguration);
  },
};

const FinallyInnerRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('finally-inner-before-throw', { reached: true }));
    throw 'finally nested registry failure';
  },
};

const FinallyOuterRegistry = {
  register(container: IContainer): void {
    try {
      container.register(FinallyInnerRegistry);
    } finally {
      container.register(Registration.instance('finally-outer-effect', { reached: true }));
    }
    container.register(Registration.instance('finally-unreachable', { reached: false }));
  },
};

const MixedFatalInnerRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('mixed-inner-before-throw', { reached: true }));
    throw 'mixed unhandled nested registry failure';
  },
};

const MixedOuterRegistry = {
  register(container: IContainer): void {
    try {
      container.register(CaughtInnerRegistry);
    } catch {
      container.register(Registration.instance('mixed-outer-after-catch', { reached: true }));
    }
    container.register(MixedFatalInnerRegistry);
  },
};

class ThrowingDeferredHandler {
  constructor() {
    throw 'deferred handler activation failure';
  }

  register(_container: IContainer): void {}
}

const ThrowingDeferredFallbackRegistry = {
  register(_container: IContainer): void {
    throw 'deferred fallback registry failure';
  },
};

const DeferredCatchingOuterRegistry = {
  register(container: IContainer): void {
    container.register(Registration.singleton('.throwing-deferred-handler', ThrowingDeferredHandler));
    try {
      container.register(Registration.defer('.throwing-deferred-handler'));
    } catch (error) {
      if (error === 'deferred handler activation failure') {
        container.register(Registration.instance('deferred-outer-after-catch', { reached: true }));
      } else {
        container.register(Registration.instance('deferred-outer-wrong-value', { reached: false }));
      }
    }
    try {
      container.register(Registration.defer(
        '.missing-deferred-fallback',
        ThrowingDeferredFallbackRegistry,
      ));
    } catch (error) {
      if (error === 'deferred fallback registry failure') {
        container.register(Registration.instance('deferred-fallback-after-catch', { reached: true }));
      } else {
        container.register(Registration.instance('deferred-fallback-wrong-value', { reached: false }));
      }
    }
  },
};

const caughtContainer = DI.createContainer();
const finallyContainer = DI.createContainer();
const mixedContainer = DI.createContainer();
const deferredContainer = DI.createContainer();
caughtContainer.register(CatchingOuterRegistry);
finallyContainer.register(FinallyOuterRegistry);
mixedContainer.register(MixedOuterRegistry);
deferredContainer.register(DeferredCatchingOuterRegistry);

@customElement({ name: 'caught-registry-control-app', template: '<template>caught</template>' })
class CaughtRegistryControlApp {}

@customElement({ name: 'finally-registry-control-app', template: '<template>finally</template>' })
class FinallyRegistryControlApp {}

@customElement({ name: 'mixed-registry-control-app', template: '<template>mixed</template>' })
class MixedRegistryControlApp {}

@customElement({ name: 'deferred-registry-control-app', template: '<template>deferred</template>' })
class DeferredRegistryControlApp {}

new Aurelia(caughtContainer).app({ host: document.body, component: CaughtRegistryControlApp });
new Aurelia(finallyContainer).app({ host: document.body, component: FinallyRegistryControlApp });
new Aurelia(mixedContainer).app({ host: document.body, component: MixedRegistryControlApp });
new Aurelia(deferredContainer).app({ host: document.body, component: DeferredRegistryControlApp });
