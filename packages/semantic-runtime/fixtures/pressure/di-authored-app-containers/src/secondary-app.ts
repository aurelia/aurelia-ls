import { Registration } from '@aurelia/kernel';
import { Aurelia } from '@aurelia/runtime-html';
import { secondaryContainer } from './containers';

class SecondaryApp {}

export const secondaryFacade = new Aurelia(secondaryContainer)
  .register(Registration.instance('secondary-app', { marker: 'secondary-app' }))
  .app({
    host: document.body,
    component: SecondaryApp,
  });
