import { Aurelia } from '@aurelia/runtime-html';
import { readPrimaryContainer } from './containers';

export const primaryFacade = new Aurelia(readPrimaryContainer());
