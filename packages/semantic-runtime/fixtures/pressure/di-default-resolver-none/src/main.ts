import { DI, DefaultResolver } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './di-default-resolver-none-app.html';

class MissingService {}

const container = DI.createContainer({
  defaultResolver: DefaultResolver.none,
});

container.get(MissingService);
DI.createContainer({ defaultResolver: DefaultResolver.none }).getResolver(MissingService, true);

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
