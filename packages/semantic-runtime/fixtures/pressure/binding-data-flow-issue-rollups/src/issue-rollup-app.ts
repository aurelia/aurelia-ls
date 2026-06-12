import { customElement } from '@aurelia/runtime-html';
import { LooseTable } from './loose-table';
import template from './issue-rollup-app.html';

interface DeviceRow {
  readonly id: string;
  readonly label: string;
}

interface FilterOption {
  value: string;
  label: string;
}

@customElement({
  name: 'issue-rollup-app',
  template,
  dependencies: [LooseTable],
})
export class IssueRollupApp {
  maybeTitle: string | undefined = undefined;
  requiredFiles!: FileList;

  readonly rows: DeviceRow[] = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'bravo', label: 'Bravo' },
  ];

  readonly filters: FilterOption[] = [
    { value: 'all', label: 'All' },
    { value: 'featured', label: 'Featured' },
  ];
}
