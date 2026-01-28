import { valueConverter } from 'aurelia';

@valueConverter('currency')
export class CurrencyValueConverter {
  toView(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  }
}
