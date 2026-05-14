import { customElement } from '@aurelia/runtime-html';
import { SyntheticTableCustomAttribute } from './synthetic-table';
import template from './synthetic-writeback-local-app.html';

interface SyntheticRow {
  readonly id: string;
  readonly label: string;
}

@customElement({
  name: 'synthetic-writeback-local-app',
  template,
  dependencies: [SyntheticTableCustomAttribute],
})
export class SyntheticWritebackLocalApp {
  readonly rows: readonly SyntheticRow[] = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
  ];
}
