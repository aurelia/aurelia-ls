import {
  DI,
  Registration,
  all,
  allResources,
  factory,
  ignore,
  last,
  lazy,
  newInstanceForScope,
  newInstanceOf,
  optional,
  optionalResource,
  own,
  resolve,
  resource,
} from '@aurelia/kernel';
import {
  optional as aliasedOptional,
  resolve as aliasedResolve,
} from '@aurelia/kernel';
import * as Kernel from '@aurelia/kernel';
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';

export class ScopedService {
  readonly marker = 'scoped-service';
}

export class SingletonConsumer {
  readonly scoped = resolve('scoped-alias');
  readonly pair = resolve('root-only', 'scoped-alias');
}

export class TransientConsumer {
  readonly marker = 'transient-consumer';
}

export class OpenSingleton {
  readonly marker = Math.random();

  constructor() {
    Math.random();
  }
}

export class OpenSingletonConsumer {
  readonly service = resolve(OpenSingleton);
}

const resolverSpreadKeys = ['root-only', 'exact-instance'] as const;
const allSpreadArguments = ['multi', true] as const;

export class ResolverIdentityConsumer {
  readonly missing = aliasedResolve(aliasedOptional('missing'));
  readonly last = Kernel.resolve(Kernel.last('multi'));
  readonly pair = aliasedResolve(...resolverSpreadKeys);
  readonly empty = aliasedResolve();
}

class DefaultSingletonService {
  readonly marker = 'default-singleton';
}

class DefaultTransientService {
  readonly marker = 'default-transient';
}

interface DefaultServiceContract {
  readonly marker: string;
}

const IDefaultSingleton = DI.createInterface<DefaultServiceContract>(
  'IDefaultSingleton',
  (builder) => builder.singleton(DefaultSingletonService),
);
const IDefaultTransient = DI.createInterface<DefaultServiceContract>(
  'IDefaultTransient',
  (builder) => builder.transient(DefaultTransientService),
);
const IDefaultInstance = DI.createInterface<DefaultServiceContract>(
  'IDefaultInstance',
  (builder) => builder.instance({ marker: 'default-instance' }),
);
const IMissingDefault = DI.createInterface<DefaultServiceContract>('IMissingDefault');

const exactInstance = {
  marker: 'exact-instance',
  matchesMarker(value: string): boolean {
    return this.marker === value;
  },
};
const rootOnly = { marker: 'root-only' };
const multiFirst = { marker: 'multi-first' };
const multiSecond = { marker: 'multi-second' };
const partialMulti = { marker: 'partial-multi' };
const lateInstance = { marker: 'late-instance' };
let lexicalInstance = { marker: 'lexical-before' };

function keyWithPressure(): string {
  Math.random();
  return 'exact-instance';
}

function ancestorSearchWithPressure(): boolean {
  Math.random();
  return true;
}

function containerWithPressure(): typeof container {
  Math.random();
  return container;
}

const implicitUndefinedRegistry = {
  register(): void {},
};
const explicitNullRegistry = {
  register(): null {
    return null;
  },
};
const returnedResolverRegistry = {
  register() {
    return {
      resolve() {
        return { marker: 'registry-resolver' };
      },
    };
  },
};
const installingRegistry = {
  register(handler: ReturnType<typeof DI.createContainer>, key: object): null {
    handler.register(Registration.instance(key, { marker: 'registry-installed' }));
    return null;
  },
};

export const container = DI.createContainer();

container.register(
  Registration.instance('exact-instance', exactInstance),
  Registration.instance('root-only', rootOnly),
  Registration.instance('multi', multiFirst),
  Registration.instance('multi', multiSecond),
  Registration.instance('partial-multi', partialMulti),
  Registration.callback('partial-multi', () => Math.random()),
  Registration.singleton(ScopedService, ScopedService),
  Registration.singleton(SingletonConsumer, SingletonConsumer),
  Registration.singleton(OpenSingleton, OpenSingleton),
  Registration.singleton(OpenSingletonConsumer, OpenSingletonConsumer),
  Registration.singleton(ResolverIdentityConsumer, ResolverIdentityConsumer),
  Registration.transient(TransientConsumer, TransientConsumer),
  Registration.aliasTo('exact-instance', 'exact-alias'),
  Registration.aliasTo('exact-alias', 'alias-chain'),
  Registration.aliasTo(ScopedService, 'scoped-alias'),
  Registration.instance('lexical', lexicalInstance),
);

lexicalInstance = { marker: 'lexical-after' };

export const exactInstanceRead = container.get('exact-instance');
export const lexicalRead = container.get('lexical');
export const aliasRead = container.get('exact-alias');
export const aliasChainRead = container.get('alias-chain');
export const singletonReadOne = container.get(SingletonConsumer);
export const singletonReadTwo = container.get(SingletonConsumer);
export const transientReadOne = container.get(TransientConsumer);
export const transientReadTwo = container.get(TransientConsumer);
export const openSingletonConsumerRead = container.get(OpenSingletonConsumer);
export const openSingletonReadAfterConsumer = container.get(OpenSingleton);
export const interfaceDefaultSingletonReadOne = container.get(IDefaultSingleton);
export const interfaceDefaultSingletonReadTwo = container.get(IDefaultSingleton);
export const interfaceDefaultTransientReadOne = container.get(IDefaultTransient);
export const interfaceDefaultTransientReadTwo = container.get(IDefaultTransient);
export const interfaceDefaultFreshRead = container.get(newInstanceOf(IDefaultSingleton));
export const interfaceMissingRead = container.get(IMissingDefault);
export const interfaceMissingFreshRead = container.get(newInstanceOf(IMissingDefault));
export const interfaceMissingScopedRead = container.get(newInstanceForScope(IMissingDefault));
export const interfaceInstanceFreshRead = container.get(newInstanceForScope(IDefaultInstance));
export const optionalMissingRead = container.get(optional('missing'));
export const ownRootRead = container.get(own('root-only'));
export const resourceRootRead = container.get(resource('root-only'));
export const optionalResourceMissingRead = container.get(optionalResource('missing'));
export const allMultiRead = container.get(all('multi'));
export const allMultiAncestorsRead = container.get(all('multi', true));
export const allMultiSpreadRead = container.get(all(...allSpreadArguments));
export const allMultiResourcesRead = container.get(allResources('multi'));
export const partialMultiRead = container.get(all('partial-multi'));
export const lastMultiRead = container.get(last('multi'));
export const lazyRead = container.get(lazy('exact-instance'));
export const factoryRead = container.get(factory(TransientConsumer));
export const ignoredRead = container.get(ignore);
export const resolverIdentityConsumerRead = container.get(ResolverIdentityConsumer);
export const newInstanceReadOne = container.get(newInstanceOf(ScopedService));
export const newInstanceReadTwo = container.get(newInstanceOf(ScopedService));
export const scopedInstanceRead = container.get(newInstanceForScope(ScopedService));
export const ownScopedRead = container.get(own(ScopedService));
export const allScopedRead = container.get(all(ScopedService));
export const allScopedAncestorsRead = container.get(all(ScopedService, true));
export const allScopedResourcesRead = container.get(allResources(ScopedService));
export const pressuredKeyRead = container.get(keyWithPressure());
export const pressuredAncestorRead = container.get(all('multi', ancestorSearchWithPressure()));
export const pressuredReceiverRead = containerWithPressure().get('exact-instance');

export const beforeRegistrationRead = container.get('late');
container.register(Registration.instance('late', lateInstance));
export const afterRegistrationRead = container.get('late');
export const registryImplicitUndefinedRead = container.get(implicitUndefinedRegistry as any);
export const registryExplicitNullRead = container.get(explicitNullRegistry as any);
export const registryReturnedResolverRead = container.get(returnedResolverRegistry as any);
export const registryInstallingRead = container.get(installingRegistry as any);

class App {}

new Aurelia()
  .register(StandardConfiguration)
  .app({ host: document.body, component: App });
