import { customElement } from '@aurelia/runtime-html';
import template from './select-multiple-binding-order-app.html';

@customElement({
  name: 'select-multiple-binding-order-app',
  template,
})
export class SelectMultipleBindingOrderApp {
  readonly selectId = 'ordered-select';
  isMultiple: boolean = true;

  selectedFirst: string[] = [];
  selectedMiddle: string[] = [];
  selectedLast: string[] = [];
  selectedNullable: string[] | null = null;
  selectedSingle = 'alpha';
  selectedDynamic: string | string[] = [];
}
