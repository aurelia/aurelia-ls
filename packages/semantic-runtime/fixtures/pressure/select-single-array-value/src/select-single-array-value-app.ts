import { customElement } from '@aurelia/runtime-html';
import template from './select-single-array-value-app.html';

@customElement({
  name: 'select-single-array-value-app',
  template,
})
export class SelectSingleArrayValueApp {
  selectedTags: string[] = [];
}
