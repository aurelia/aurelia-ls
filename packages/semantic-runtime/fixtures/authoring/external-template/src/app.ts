import { customElement } from '@aurelia/runtime-html';
import template from './app.html';

@customElement({
  name: 'authoring-app',
  template,
})
export class AuthoringApp {
  message = 'Hello semantic runtime';
}
