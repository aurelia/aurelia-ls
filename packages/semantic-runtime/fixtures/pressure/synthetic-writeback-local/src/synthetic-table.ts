import {
  BindingMode,
  bindable,
  customAttribute,
} from '@aurelia/runtime-html';

interface SyntheticRow {
  readonly id: string;
  readonly label: string;
}

@customAttribute('synthetic-table')
export class SyntheticTableCustomAttribute {
  @bindable data: readonly SyntheticRow[] = [];

  @bindable({ mode: BindingMode.twoWay })
  displayData: readonly SyntheticRow[] = [];

  @bindable({ mode: BindingMode.twoWay })
  activeRow: SyntheticRow = { id: 'pending', label: 'Pending' };

  binding(): void {
    this.displayData = this.data.filter((row) => row.label.length > 0);
    this.activeRow = this.displayData[0] ?? this.activeRow;
  }
}
