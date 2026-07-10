import { customElement } from '@aurelia/runtime-html';
import { BuiltInProduct } from './template-controller-built-ins-app';
import template from './template-controller-edge-cases-app.html';

@customElement({
  name: 'template-controller-edge-cases-app',
  template,
})
export class TemplateControllerEdgeCasesApp {
  readonly products: readonly BuiltInProduct[] = [
    new BuiltInProduct('first', 'First product'),
    new BuiltInProduct('second', 'Second product'),
  ];
  readonly unregisteredProductWindow: ArrayLike<BuiltInProduct> = {
    0: this.products[0]!,
    1: this.products[1]!,
    length: 2,
  };
  readonly unsupportedRepeatSource = { first: this.products[0]! };
  readonly maybeProduct: BuiltInProduct | null = this.products[0]!;
  readonly productPromise = Promise.resolve(this.products[1]!);
  portalTarget: string | Element | null = 'body';
  readonly portalMessage = 'Portaled edge content';
}
