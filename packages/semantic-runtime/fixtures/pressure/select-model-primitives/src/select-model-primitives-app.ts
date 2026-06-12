import { customElement } from '@aurelia/runtime-html';
import template from './select-model-primitives-app.html';

interface Product {
  readonly id: number;
  readonly name: string;
}

@customElement({
  name: 'select-model-primitives-app',
  template,
})
export class SelectModelPrimitivesApp {
  readonly products: readonly Product[] = [
    { id: 0, name: 'Motherboard' },
    { id: 1, name: 'CPU' },
    { id: 2, name: 'Memory' },
  ];

  selectedProductId: number | null = null;
  selectedValueBoundProductId: number | null = null;
  selectedRepeatedValueProductId: number | null = null;
  selectedProduct: Product | null = null;
  likesTacos: boolean | null = null;
  nullableChoice: boolean | null = null;
  numericRadioChoice: number | null = null;
}
