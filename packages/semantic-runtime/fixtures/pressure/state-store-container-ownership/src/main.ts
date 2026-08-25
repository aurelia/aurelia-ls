import {
  DI,
  Registration,
} from '@aurelia/kernel';
import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import {
  type IStore,
  IStoreRegistry,
  type IStoreRegistry as StoreRegistryContract,
  StateDefaultConfiguration,
} from '@aurelia/state';
import { CustomRegistryApp } from './custom-registry-app';
import { InheritedStateApp } from './inherited-state-app';
import { ShadowedStateApp } from './shadowed-state-app';
import { SiblingAApp } from './sibling-a-app';
import { SiblingBApp } from './sibling-b-app';
import {
  customRegistryParentState,
  inheritedSession,
  inheritedState,
  shadowChildSession,
  shadowChildState,
  shadowParentSession,
  shadowParentState,
  siblingASession,
  siblingAState,
  siblingBSession,
  siblingBState,
} from './states';

const siblingAContainer = DI.createContainer();
const siblingAConfiguration = StateDefaultConfiguration
  .init(siblingAState)
  .withStore('session', siblingASession);
siblingAContainer.register(
  StandardConfiguration,
  siblingAConfiguration,
);
new Aurelia(siblingAContainer).app({
  host: document.body,
  component: SiblingAApp,
});

const siblingBContainer = DI.createContainer();
const siblingBConfiguration = StateDefaultConfiguration
  .init(siblingBState)
  .withStore('session', siblingBSession);
siblingBContainer.register(
  StandardConfiguration,
  siblingBConfiguration,
);
new Aurelia(siblingBContainer).app({
  host: document.body,
  component: SiblingBApp,
});

const inheritedParentContainer = DI.createContainer();
inheritedParentContainer.register(
  StandardConfiguration,
  StateDefaultConfiguration
    .init(inheritedState)
    .withStore('session', inheritedSession),
);
const inheritedChildContainer = inheritedParentContainer.createChild();
new Aurelia(inheritedChildContainer).app({
  host: document.body,
  component: InheritedStateApp,
});

const shadowParentContainer = DI.createContainer();
shadowParentContainer.register(
  StandardConfiguration,
  StateDefaultConfiguration
    .init(shadowParentState)
    .withStore('parent-session', shadowParentSession),
);
const shadowChildContainer = shadowParentContainer.createChild();
shadowChildContainer.register(
  StateDefaultConfiguration
    .init(shadowChildState)
    .withStore('child-session', shadowChildSession),
);
new Aurelia(shadowChildContainer).app({
  host: document.body,
  component: ShadowedStateApp,
});

class RuntimeStoreRegistry implements StoreRegistryContract {
  registerStore<T extends object>(_name: string, _store: IStore<T>): void {}

  getStore<T extends object>(_name: string): IStore<T> {
    throw new Error('Runtime-only registry contents are unavailable to static analysis.');
  }
}

const customRegistryParentContainer = DI.createContainer();
customRegistryParentContainer.register(
  StandardConfiguration,
  StateDefaultConfiguration.init(customRegistryParentState),
);
const customRegistryChildContainer = customRegistryParentContainer.createChild();
customRegistryChildContainer.register(
  Registration.instance(IStoreRegistry, new RuntimeStoreRegistry()),
);
new Aurelia(customRegistryChildContainer).app({
  host: document.body,
  component: CustomRegistryApp,
});
