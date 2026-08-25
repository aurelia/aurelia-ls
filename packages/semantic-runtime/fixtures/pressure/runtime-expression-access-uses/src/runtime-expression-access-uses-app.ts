import {
  customElement,
  valueConverter,
} from '@aurelia/runtime-html';
import template from './runtime-expression-access-uses-app.html';

interface AccessUseItem {
  readonly id: string;
  readonly label: string;
}

@valueConverter('suffix')
export class SuffixValueConverter {
  toView(value: string, suffix: string): string {
    return `${value}${suffix}`;
  }

  fromView(value: string, suffix: string): string {
    return value.endsWith(suffix)
      ? value.slice(0, -suffix.length)
      : value;
  }
}

@customElement({
  name: 'runtime-expression-access-uses-app',
  template,
})
export class RuntimeExpressionAccessUsesApp {
  flag = true;
  readonly repeated = {
    name: 'repeated',
  };
  readonly form = {
    name: 'Ada',
  };
  /**
   * Fallback display name retained for legacy listeners.
   * @deprecated Use form.name instead.
   */
  fallbackName = 'Grace';
  converterSuffix = '!';
  behaviorDelay = 25;
  contextualRepeat = true;
  readonly items: readonly AccessUseItem[] = [
    { id: 'one', label: 'One' },
    { id: 'two', label: 'Two' },
  ];

  handle(value: string): void {
    this.fallbackName = value;
  }
}
