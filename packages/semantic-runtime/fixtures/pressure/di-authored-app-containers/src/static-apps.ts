import { Registration } from '@aurelia/kernel';
import { Aurelia } from 'aurelia';

class ChainedStaticApp {}
class IndependentStaticApp {}

export const chainedStaticFacade = Aurelia
  .register(Registration.instance('static-chain', { marker: 'static-chain' }))
  .app({
    host: document.body,
    component: ChainedStaticApp,
  });

export const registrationOnlyFacade = Aurelia.register(
  Registration.instance('static-registration-only', { marker: 'static-registration-only' }),
);

export const independentStaticFacade = Aurelia.app({
  host: document.body,
  component: IndependentStaticApp,
});
