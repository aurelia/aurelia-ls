import { customElement } from '@aurelia/runtime-html';
import template from './app.html';

@customElement({
  name: 'recursive-custom-element-app',
  template,
})
export class RecursiveCustomElementApp {
  readonly rootId = 'root';
}
