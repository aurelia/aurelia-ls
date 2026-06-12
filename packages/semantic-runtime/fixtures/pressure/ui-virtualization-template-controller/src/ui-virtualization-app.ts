import { customElement } from '@aurelia/runtime-html';
import template from './ui-virtualization-app.html';

export class VirtualProduct {
  constructor(
    readonly id: string,
    readonly label: string,
  ) {}
}

@customElement({
  name: 'ui-virtualization-app',
  template,
})
export class UiVirtualizationApp {
  readonly products: readonly VirtualProduct[] = [
    new VirtualProduct('first', 'First product'),
    new VirtualProduct('second', 'Second product'),
  ];
}
