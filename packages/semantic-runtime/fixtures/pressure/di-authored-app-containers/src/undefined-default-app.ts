import { Aurelia } from '@aurelia/runtime-html';

class UndefinedDefaultApp {}

export const undefinedDefaultFacade = new Aurelia(undefined).app({
  host: document.body,
  component: UndefinedDefaultApp,
});
