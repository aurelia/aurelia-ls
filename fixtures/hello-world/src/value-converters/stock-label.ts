import { valueConverter } from 'aurelia';

@valueConverter('stockLabel')
export class StockLabelValueConverter {
  toView(quantity: number): string {
    return quantity > 0
      ? `${quantity} item${quantity === 1 ? '' : 's'} ready`
      : 'sold out';
  }
}
