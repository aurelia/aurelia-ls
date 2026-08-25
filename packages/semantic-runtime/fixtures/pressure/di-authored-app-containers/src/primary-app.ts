import { Registration } from '@aurelia/kernel';
import { primaryFacade } from './primary-facade';

class PrimaryApp {}

export const configuredPrimaryFacade = primaryFacade
  .register(Registration.instance('primary-app', { marker: 'primary-app' }))
  .app({
    host: document.body,
    component: PrimaryApp,
  });
