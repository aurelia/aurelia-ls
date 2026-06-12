import { customElement } from 'aurelia';
import template from './app.html';

@customElement({
  name: 'app',
  template,
})
export class App {
  readonly title = 'Host';
}
