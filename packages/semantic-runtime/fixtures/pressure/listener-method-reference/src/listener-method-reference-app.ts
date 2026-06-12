import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { ListenerState } from './state/listener-state';
import template from './listener-method-reference-app.html';

@customElement({
  name: 'listener-method-reference-app',
  template,
})
export class ListenerMethodReferenceApp {
  readonly state = resolve(ListenerState);
}
