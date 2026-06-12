import { customElement } from 'aurelia';
import template from './app.html';

export const values = [1, 2, 3].map((value) => missingValue + value);
export const filtered = [1, 2, 3].filter(() => missingFlag);

@customElement({
  name: 'app-root',
  template,
})
export class App {
  values = values;
  filtered = filtered;
}
