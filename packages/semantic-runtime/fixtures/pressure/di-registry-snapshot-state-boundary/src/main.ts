import {
  Aurelia,
  DI,
  IContainer,
  StandardConfiguration,
  customAttribute,
  customElement,
} from 'aurelia';

@customAttribute('snapshot-first')
class SnapshotFirstCustomAttribute {}

@customAttribute('snapshot-second')
class SnapshotSecondCustomAttribute {}

@customAttribute('reset-first')
class ResetFirstCustomAttribute {}

@customAttribute('reset-second')
class ResetSecondCustomAttribute {}

@customAttribute('arrow-first')
class ArrowFirstCustomAttribute {}

@customAttribute('arrow-second')
class ArrowSecondCustomAttribute {}

const SnapshotRegistry = {
  phase: 'first',
  register(container: IContainer): IContainer {
    if (this.phase === 'first') {
      return container.register(SnapshotFirstCustomAttribute);
    }
    return container.register(SnapshotSecondCustomAttribute);
  },
};

let resetPhase = 'first';
const initialResetPhase = resetPhase;
const ResetRegistry = {
  register(container: IContainer): IContainer {
    const selected = resetPhase;
    resetPhase = 'second';
    if (selected === 'first') {
      return container.register(ResetFirstCustomAttribute);
    }
    return container.register(ResetSecondCustomAttribute);
  },
};

const ArrowOwner = {
  phase: 'first',
  create() {
    return {
      register: (container: IContainer): IContainer => {
        if (this.phase === 'first') {
          return container.register(ArrowFirstCustomAttribute);
        }
        return container.register(ArrowSecondCustomAttribute);
      },
    };
  },
};
const ArrowRegistry = ArrowOwner.create();

const container = DI.createContainer();
container.register(StandardConfiguration, SnapshotRegistry);
SnapshotRegistry.phase = 'second';
container.register(SnapshotRegistry);
container.register(ResetRegistry);
resetPhase = initialResetPhase;
container.register(ResetRegistry);
container.register(ArrowRegistry);
ArrowOwner.phase = 'second';
container.register(ArrowRegistry);

@customElement({
  name: 'registry-snapshot-state-boundary-app',
  template: '<div snapshot-first></div>',
})
class RegistrySnapshotStateBoundaryApp {}

new Aurelia(container).app({
  host: document.body,
  component: RegistrySnapshotStateBoundaryApp,
});
