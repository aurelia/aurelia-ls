import { Registration } from '@aurelia/kernel';
import { Aurelia } from '@aurelia/runtime-html';
import { childContainer } from './containers';

class ChildApp {}
class ChildAppRegistrationValue {}

export const childFacade = new Aurelia(childContainer)
  .register(Registration.instance('child-order', ChildAppRegistrationValue))
  .register(Registration.instance('child-app', { marker: 'child-app' }))
  .app({
    host: document.body,
    component: ChildApp,
  });
