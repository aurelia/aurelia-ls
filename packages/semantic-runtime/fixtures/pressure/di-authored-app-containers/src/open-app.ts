import { IContainer } from '@aurelia/kernel';
import { Aurelia } from '@aurelia/runtime-html';

class OpenApp {}

export function configureOpenApp(container: IContainer) {
  return new Aurelia(container).app({
    host: document.body,
    component: OpenApp,
  });
}
