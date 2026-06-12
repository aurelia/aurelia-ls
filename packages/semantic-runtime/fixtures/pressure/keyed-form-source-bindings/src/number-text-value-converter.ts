import type { ICallerContext } from '@aurelia/runtime-html';

export class NumberTextValueConverter {
  toView(value: number): string {
    return String(value);
  }

  fromView(value: string): number {
    return Number(value);
  }
}

export class NumberTextReadonlyValueConverter {
  toView(value: number): string {
    return String(value);
  }
}

export class ContextualNumberTextValueConverter {
  readonly withContext = true;

  toView(value: number): string {
    return String(value);
  }

  fromView(value: string): 'missing-context';
  fromView(value: string, caller: ICallerContext): number;
  fromView(value: string, caller?: ICallerContext): number | 'missing-context' {
    return caller == null ? 'missing-context' : Number(value);
  }
}
