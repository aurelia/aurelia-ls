import { customElement } from 'aurelia';
import { TaskList } from './task-list';
import template from './app.html';

@customElement({
  name: 'app',
  template,
  dependencies: [TaskList],
})
export class App {
  readonly title = 'Host';
}
