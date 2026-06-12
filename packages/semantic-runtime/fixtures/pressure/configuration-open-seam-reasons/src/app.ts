import { customElement } from 'aurelia';
import template from './app.html';

@customElement({
  name: 'app-root',
  template,
})
export class App {
  message = 'configuration open seam reasons';
}
