import { customElement } from '@aurelia/runtime-html';
import { BuiltInProduct } from './template-controller-built-ins-app';
import template from './repeat-diagnostic-shadow-app.html';

@customElement({
  name: 'repeat-diagnostic-shadow-app',
  template,
})
export class RepeatDiagnosticShadowApp {
  readonly products: readonly BuiltInProduct[] = [
    new BuiltInProduct('first', 'First product'),
  ];
  readonly unsupportedRepeatSource = { first: this.products[0]! };
}
