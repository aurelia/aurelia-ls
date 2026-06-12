import { DI, optional, resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './di-cyclic-dependency-app.html';

interface IFoo {
  parent: IFoo | undefined;
}

const IFoo = DI.createInterface<IFoo>('IFoo', (builder) => builder.singleton(Foo));

class Foo implements IFoo {
  parent = resolve(optional(IFoo));
}

const container = DI.createContainer();
container.register(IFoo);
container.get(IFoo);

@customElement({
  name: 'di-cyclic-dependency-app',
  template,
})
export class DiCyclicDependencyApp {
  message = 'DI cyclic dependency pressure';
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: DiCyclicDependencyApp,
  })
  .start();
