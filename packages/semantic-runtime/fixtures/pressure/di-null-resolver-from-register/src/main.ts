import { DI } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './di-null-resolver-from-register-app.html';

const NullRegistry = {
  register(): null {
    return null;
  },
};

DI.createContainer().get(NullRegistry as any);

@customElement({
  name: 'di-null-resolver-from-register-app',
  template,
})
export class DiNullResolverFromRegisterApp {
  message = 'DI null resolver pressure';
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: DiNullResolverFromRegisterApp,
  })
  .start();
