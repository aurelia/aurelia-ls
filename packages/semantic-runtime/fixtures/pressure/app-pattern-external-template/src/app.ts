import { customElement } from 'aurelia';
import template from './app.html';

@customElement({
  name: 'authoring-app',
  template,
})
export class AuthoringApp {
  message = 'Hello semantic runtime';
}
