import { DI, IContainer, Registration } from '@aurelia/kernel';
import { Aurelia, customElement } from '@aurelia/runtime-html';

class StatefulRegistryBase {
  private calls = 0;

  register(container: IContainer, data: object, label: string): void {
    this.calls++;
    container.register(Registration.instance(
      `deferred-${label}-${this.calls}`,
      { data, calls: this.calls },
    ));
  }
}

class StatefulRegistry extends StatefulRegistryBase {}

const root = DI.createContainer();
const child = root.createChild();
const sharedData = { marker: 'shared-data' };
const sharedDeferred = Registration.defer('.shared', sharedData, 'shared');

root.register(Registration.singleton('.shared', StatefulRegistry));
root.register(Registration.aliasTo('.shared', '.shared-alias'));
root.register(sharedDeferred);
child.register(sharedDeferred);
root.register(Registration.defer('.shared-alias', sharedData, 'alias'));

root.register(Registration.transient('.transient', StatefulRegistry));
root.register(Registration.defer('.transient', { marker: 'transient-1' }, 'transient-1'));
root.register(Registration.defer('.transient', { marker: 'transient-2' }, 'transient-2'));

const FallbackRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance(
      'fallback-registry-value',
      { marker: 'fallback-registry' },
    ));
  },
};

const fallbackCarrier = {
  nested: Registration.instance(
    'fallback-carrier-value',
    { marker: 'fallback-carrier' },
  ),
};

const ignoredFunction = (): void => {};

root.register(Registration.defer(
  '.missing',
  FallbackRegistry,
  fallbackCarrier,
  null,
  'ignored primitive',
  ignoredFunction,
));

const LateFallbackRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance(
      'late-fallback-value',
      { marker: 'late-fallback' },
    ));
  },
};

root.register(Registration.defer('.late', LateFallbackRegistry));
root.register(Registration.singleton('.late', StatefulRegistry));

root.register(Registration.callback('.callback', () => FallbackRegistry));
root.register(Registration.defer('.callback', { marker: 'callback' }, 'callback'));

@customElement({
  name: 'parameterized-registry-root',
  template: '<template>root</template>',
})
class ParameterizedRegistryRoot {}

@customElement({
  name: 'parameterized-registry-child',
  template: '<template>child</template>',
})
class ParameterizedRegistryChild {}

new Aurelia(root).app({
  host: document.body,
  component: ParameterizedRegistryRoot,
});

new Aurelia(child).app({
  host: document.body,
  component: ParameterizedRegistryChild,
});
