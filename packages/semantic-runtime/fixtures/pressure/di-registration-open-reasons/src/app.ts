import { customElement } from 'aurelia';
import template from './app.html';

@customElement({
  name: 'app-root',
  template,
})
export class App {
  message = 'di registration open reasons';
}
