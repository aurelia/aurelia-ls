import { Registration } from '@aurelia/kernel';
import { implicitFacade } from './implicit-facade';

class ImplicitApp {}

export const configuredImplicitFacade = implicitFacade
  .register(Registration.instance('implicit-app', { marker: 'implicit-app' }))
  .app({
    host: document.body,
    component: ImplicitApp,
  });
