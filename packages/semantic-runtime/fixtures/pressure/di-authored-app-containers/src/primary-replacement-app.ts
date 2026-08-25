import { primaryFacade } from './primary-facade';

class PrimaryReplacementApp {}

export const replacementPrimaryFacade = primaryFacade.app({
  host: document.body,
  component: PrimaryReplacementApp,
});
