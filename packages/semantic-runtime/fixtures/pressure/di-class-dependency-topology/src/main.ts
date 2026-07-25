import {
  DI,
  Registration,
  ignore,
  inject,
  optional,
} from '@aurelia/kernel';
import {
  Aurelia,
  StandardConfiguration,
  customElement,
} from '@aurelia/runtime-html';
import {
  annotate,
  maybe,
} from './di-aliases';
import * as InjectionAliases from './di-aliases';

class FirstDependency {
  readonly marker = 'first-dependency';
}

class SecondDependency {
  readonly marker = 'second-dependency';
}

const firstDependency = new FirstDependency();
const secondDependency = new SecondDependency();

let capturedDependency: unknown = FirstDependency;

@inject(capturedDependency)
class DefinitionTimeConsumer {
  constructor(readonly dependency: unknown) {}
}

capturedDependency = SecondDependency;

class SparseStaticConsumer {
  static inject = [, SecondDependency];

  constructor(
    readonly first: unknown,
    readonly second: unknown,
  ) {}
}

class ExplicitUndefinedStaticConsumer {
  static inject = [undefined, SecondDependency];
}

class InvalidStaticConsumer {
  static inject = 42 as unknown as readonly unknown[];
}

class InheritedGetterBase {
  static dependency: unknown = 'missing-inherited-getter-dependency';

  static get inject(): readonly unknown[] {
    return [this.dependency];
  }
}

class InheritedGetterConsumer extends InheritedGetterBase {
  static dependency = FirstDependency;
  readonly marker = 'inherited-getter-consumer';
}

let getterDependency: unknown = FirstDependency;

class CachedGetterConsumer {
  static get inject(): readonly unknown[] {
    const dependency = getterDependency;
    getterDependency = SecondDependency;
    return [dependency];
  }

  constructor(readonly dependency: unknown) {}
}

@inject(SecondDependency)
class StaticPrecedenceConsumer {
  static inject = [FirstDependency];

  constructor(readonly dependency: unknown) {}
}

@inject(FirstDependency)
class UndefinedStaticConsumer {
  static inject = undefined;

  constructor(readonly dependency: unknown) {}
}

@inject(FirstDependency)
@inject(SecondDependency)
class StackedDecoratorConsumer {
  constructor(readonly dependency: unknown) {}
}

@inject(undefined, SecondDependency)
class SparseDecoratorConsumer {
  constructor(
    readonly first: unknown,
    readonly second: unknown,
  ) {}
}

@inject('missing-inherited-dependency')
class AnnotatedBase {}

class FieldMetadataConsumer extends AnnotatedBase {
  @inject(SecondDependency)
  fieldDependency: unknown;
}

@annotate(FirstDependency)
class ReexportedAliasConsumer {
  constructor(readonly dependency: unknown) {}
}

@InjectionAliases.annotate(SecondDependency)
class NamespaceAliasConsumer {
  constructor(readonly dependency: unknown) {}
}

@maybe('missing-optional-dependency')
class ReexportedResolverConsumer {
  constructor(readonly dependency: unknown) {}
}

@ignore
class BareResolverConsumer {
  constructor(readonly dependency: unknown) {}
}

@inject(optional(FirstDependency))
class NestedResolverConsumer {
  constructor(readonly dependency: unknown) {}
}

class UnreachedThirdDependency {
  static inject = [UnreachedThirdDependency];
}

@inject(FirstDependency, 'missing-middle-dependency', UnreachedThirdDependency)
class LeftToRightFailureConsumer {}

export const container = DI.createContainer();

container.register(
  StandardConfiguration,
  Registration.instance(FirstDependency, firstDependency),
  Registration.instance(SecondDependency, secondDependency),
  Registration.transient(DefinitionTimeConsumer, DefinitionTimeConsumer),
  Registration.transient(SparseStaticConsumer, SparseStaticConsumer),
  Registration.transient(ExplicitUndefinedStaticConsumer, ExplicitUndefinedStaticConsumer),
  Registration.transient(InvalidStaticConsumer, InvalidStaticConsumer),
  Registration.transient(InheritedGetterConsumer, InheritedGetterConsumer),
  Registration.transient(CachedGetterConsumer, CachedGetterConsumer),
  Registration.transient(StaticPrecedenceConsumer, StaticPrecedenceConsumer),
  Registration.transient(UndefinedStaticConsumer, UndefinedStaticConsumer),
  Registration.transient(StackedDecoratorConsumer, StackedDecoratorConsumer),
  Registration.transient(SparseDecoratorConsumer, SparseDecoratorConsumer),
  Registration.transient(FieldMetadataConsumer, FieldMetadataConsumer),
  Registration.transient(ReexportedAliasConsumer, ReexportedAliasConsumer),
  Registration.transient(NamespaceAliasConsumer, NamespaceAliasConsumer),
  Registration.transient(ReexportedResolverConsumer, ReexportedResolverConsumer),
  Registration.transient(BareResolverConsumer, BareResolverConsumer),
  Registration.transient(NestedResolverConsumer, NestedResolverConsumer),
  Registration.transient(LeftToRightFailureConsumer, LeftToRightFailureConsumer),
);

export const definitionTimeRead = container.get(DefinitionTimeConsumer);
export const sparseStaticRead = container.get(SparseStaticConsumer);
export const explicitUndefinedStaticRead = container.get(ExplicitUndefinedStaticConsumer);
export const invalidStaticRead = container.get(InvalidStaticConsumer);
export const inheritedGetterRead = container.get(InheritedGetterConsumer);
export const cachedGetterReadOne = container.get(CachedGetterConsumer);
export const cachedGetterReadTwo = container.get(CachedGetterConsumer);
export const staticPrecedenceRead = container.get(StaticPrecedenceConsumer);
export const undefinedStaticRead = container.get(UndefinedStaticConsumer);
export const stackedDecoratorRead = container.get(StackedDecoratorConsumer);
export const sparseDecoratorRead = container.get(SparseDecoratorConsumer);
export const fieldMetadataRead = container.get(FieldMetadataConsumer);
export const reexportedAliasRead = container.get(ReexportedAliasConsumer);
export const namespaceAliasRead = container.get(NamespaceAliasConsumer);
export const reexportedResolverRead = container.get(ReexportedResolverConsumer);
export const bareResolverRead = container.get(BareResolverConsumer);
export const nestedResolverRead = container.get(NestedResolverConsumer);
export const leftToRightFailureRead = container.get(LeftToRightFailureConsumer);

@customElement({
  name: 'di-class-dependency-topology-app',
  template: '<template>DI class dependency topology</template>',
})
class DiClassDependencyTopologyApp {}

new Aurelia(container).app({
  host: document.body,
  component: DiClassDependencyTopologyApp,
});
