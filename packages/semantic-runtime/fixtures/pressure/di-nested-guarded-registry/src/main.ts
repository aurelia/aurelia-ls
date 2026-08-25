import {
  Aurelia,
  DI,
  IContainer,
  StandardConfiguration,
  customAttribute,
  customElement,
} from 'aurelia';
import { InnerRegistry } from './guarded-registry';

@customAttribute('first-effect')
class FirstEffectCustomAttribute {}

@customAttribute('second-effect')
class SecondEffectCustomAttribute {}

const MutableRegistry = {
  phase: 'first',
  register(container: IContainer): IContainer {
    if (this.phase === 'first') {
      return container.register(FirstEffectCustomAttribute);
    }
    return container.register(SecondEffectCustomAttribute);
  },
};

function installInnerRegistry(container: IContainer, innerRegistry: any): IContainer {
  return container.register(innerRegistry);
}

function installMutableRegistry(container: IContainer, mutableRegistry: any): IContainer {
  return container.register(mutableRegistry);
}

const OuterRegistry = {
  register(container: IContainer): IContainer {
    installInnerRegistry(container, InnerRegistry);
    installInnerRegistry(container, InnerRegistry);
    installMutableRegistry(container, MutableRegistry);
    MutableRegistry.phase = 'second';
    return installMutableRegistry(container, MutableRegistry);
  },
};

@customElement({
  name: 'nested-guarded-registry-app',
  template: '<div guarded-once></div>',
})
class NestedGuardedRegistryApp {}

const firstContainer = DI.createContainer();
const secondContainer = DI.createContainer();
firstContainer.register(StandardConfiguration, OuterRegistry);
secondContainer.register(StandardConfiguration, InnerRegistry);

new Aurelia(firstContainer).app({
  host: document.body,
  component: NestedGuardedRegistryApp,
});

new Aurelia(secondContainer).app({
  host: document.body,
  component: NestedGuardedRegistryApp,
});
