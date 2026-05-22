import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { FormState } from './state/form-state';
import template from './keyed-form-source-bindings-app.html';

@customElement({
  name: 'keyed-form-source-bindings-app',
  template,
})
export class KeyedFormSourceBindingsApp {
  readonly state = resolve(FormState);
}
