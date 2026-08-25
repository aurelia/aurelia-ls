import { customElement } from 'aurelia';
import { NumberTextValueConverter, ToViewOnlyNumberValueConverter } from './number-text-value-converter';
import { TypeTarget } from './type-target';
import template from './write-bindings.html';

@customElement({
  name: 'write-bindings',
  template,
  dependencies: [NumberTextValueConverter, ToViewOnlyNumberValueConverter, TypeTarget],
})
export class WriteBindings {
  mutableText = 'Mutable';
  readonly readonlyText = 'Readonly';
  nullableText: string | null = null;
  count = 2;
  enabled = true;
  activeKey = 'primary';
  mutableRecord: Record<string, string> = { primary: 'Mutable record' };
  readonly readonlyRecord: Readonly<Record<string, string>> = { primary: 'Readonly record' };

  private accessorValue = 'Accessor';

  get accessorText(): string {
    return this.accessorValue;
  }

  set accessorText(value: string) {
    this.accessorValue = value;
  }

  get getterOnlyText(): string {
    return 'Getter only';
  }
}
