import { customElement } from 'aurelia';
import template from './app.html';

@customElement({ name: 'prewalk-root', template })
export class App {
  before = 'before';
  inside = 'inside';
  after = 'after';
  first = 'first';
  second = 'second';
  title = 'title';
}
