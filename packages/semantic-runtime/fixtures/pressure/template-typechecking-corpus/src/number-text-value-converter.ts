import { valueConverter } from 'aurelia';

@valueConverter('numberText')
export class NumberTextValueConverter {
  toView(value: number): string {
    return String(value);
  }

  fromView(value: string): number {
    return Number(value);
  }
}

@valueConverter('toViewOnlyNumber')
export class ToViewOnlyNumberValueConverter {
  toView(value: number): string {
    return String(value);
  }
}
