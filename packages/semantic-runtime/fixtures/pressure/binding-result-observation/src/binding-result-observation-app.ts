import { customElement, valueConverter } from '@aurelia/runtime-html';
import template from './binding-result-observation-app.html';

@valueConverter('arrayResult')
export class ArrayResultValueConverter {
  toView(value: unknown): unknown[] {
    return [value];
  }
}

@customElement({
  name: 'binding-result-observation-app',
  template,
  dependencies: [ArrayResultValueConverter],
})
export class BindingResultObservationApp {
  items = ['first'];
  unknownValue: any;
  declaredText: string = 'text';
}
