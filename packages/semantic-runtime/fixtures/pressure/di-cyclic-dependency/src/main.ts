import { DI, optional, resolve } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import { container as directContainer } from './container';
import { container as reexportedContainer } from './container-barrel';
import template from './di-cyclic-dependency-app.html';

interface IFoo {
  parent: IFoo | undefined;
}

class Foo implements IFoo {
  parent = resolve(optional(IFoo));
}

const IFoo = DI.createInterface<IFoo>('IFoo', (builder) => builder.singleton(Foo));

directContainer.register(IFoo);
reexportedContainer.get(IFoo);

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
