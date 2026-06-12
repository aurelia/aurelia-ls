import { customElement } from '@aurelia/runtime-html';
import {
  RowIdValueConverter,
  SyntheticPickerCustomAttribute,
  type SyntheticRow,
} from './synthetic-picker';
import template from './synthetic-writeback-converter-local-app.html';

@customElement({
  name: 'synthetic-writeback-converter-local-app',
  template,
  dependencies: [SyntheticPickerCustomAttribute, RowIdValueConverter],
})
export class SyntheticWritebackConverterLocalApp {
  readonly rows: readonly SyntheticRow[] = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
  ];
}

