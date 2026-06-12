import {
  BindingMode,
  bindable,
  customAttribute,
  valueConverter,
} from '@aurelia/runtime-html';

export interface SyntheticRow {
  readonly id: string;
  readonly label: string;
}

@customAttribute('synthetic-picker')
export class SyntheticPickerCustomAttribute {
  @bindable data: readonly SyntheticRow[] = [];

  @bindable({ mode: BindingMode.twoWay })
  selectedRow: SyntheticRow = { id: 'pending', label: 'Pending' };

  binding(): void {
    this.selectedRow = this.data[0] ?? this.selectedRow;
  }
}

@valueConverter('rowId')
export class RowIdValueConverter {
  toView(id: string): SyntheticRow {
    return { id, label: id };
  }

  fromView(row: SyntheticRow): string {
    return row.id;
  }
}

