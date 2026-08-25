import {
  DI,
  Registration,
} from '@aurelia/kernel';
import {
  Aurelia,
  CustomElement,
  StandardConfiguration,
} from '@aurelia/runtime-html';

type Constructable = new (...args: never[]) => object;

function legacyClassDecorator<TClass extends Constructable>(target: TClass): TClass {
  return target;
}

class MetadataDependency {
  readonly marker = 'metadata-dependency';
}

@legacyClassDecorator
class MetadataConsumer {
  constructor(readonly dependency: MetadataDependency) {}
}

@legacyClassDecorator
class MetadataBase {
  constructor(readonly dependency: MetadataDependency) {}
}

@legacyClassDecorator
class EmptyMetadataConsumer extends MetadataBase {
  constructor() {
    super(undefined as unknown as MetadataDependency);
  }
}

export const container = DI.createContainer();

container.register(
  StandardConfiguration,
  Registration.singleton(MetadataDependency, MetadataDependency),
  Registration.transient(MetadataConsumer, MetadataConsumer),
  Registration.transient(EmptyMetadataConsumer, EmptyMetadataConsumer),
);

export const metadataRead = container.get(MetadataConsumer);
export const emptyMetadataRead = container.get(EmptyMetadataConsumer);

class DiDesignParamTypesBoundaryApp {}

new Aurelia(container).app({
  host: document.body,
  component: CustomElement.define({
    name: 'di-design-paramtypes-boundary-app',
    template: '<template>DI design:paramtypes boundary</template>',
  }, DiDesignParamTypesBoundaryApp),
});
