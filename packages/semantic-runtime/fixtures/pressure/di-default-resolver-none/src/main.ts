import { DI, DefaultResolver } from '@aurelia/kernel';
import * as Kernel from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './di-default-resolver-none-app.html';

class MissingService {}
class TransientService {}

const noneResolver = DefaultResolver.none;
const noneConfiguration = {
  inheritParentResources: true,
  defaultResolver: noneResolver,
};
const container = DI.createContainer(noneConfiguration);

container.get(MissingService);
container.has(null as never);
DI.createContainer({ defaultResolver: Kernel.DefaultResolver.none }).getResolver(MissingService, true);

const transientContainer = DI.createContainer({ defaultResolver: DefaultResolver.transient });
transientContainer.get(TransientService);

@customElement({
  name: 'di-default-resolver-none-app',
  template,
})
export class DiDefaultResolverNoneApp {
  message = 'DI default resolver pressure';
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: DiDefaultResolverNoneApp,
  })
  .start();
