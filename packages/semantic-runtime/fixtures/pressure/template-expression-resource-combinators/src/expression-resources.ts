import { bindingBehavior, valueConverter } from 'aurelia';

@valueConverter('numberText')
export class NumberTextValueConverter {
  toView(value: number, prefix: string): string {
    return `${prefix}${value}`;
  }

  fromView(value: string, prefix: string): number {
    return Number(value.slice(prefix.length));
  }
}

@valueConverter('textLength')
export class TextLengthValueConverter {
  toView(value: string): number {
    return value.length;
  }

  fromView(value: number): string {
    return String(value);
  }
}

@valueConverter('identityValue')
export class IdentityValueConverter {}

@bindingBehavior('typedAudit')
export class TypedAuditBindingBehavior {
  bind(_scope: unknown, _binding: unknown, _label: string, _threshold: number): void {}
}

@bindingBehavior('innerAudit')
export class InnerAuditBindingBehavior {
  bind(_scope: unknown, _binding: unknown, _label: string): void {}
}

@bindingBehavior('outerAudit')
export class OuterAuditBindingBehavior {
  bind(_scope: unknown, _binding: unknown, _label: string): void {}
}
