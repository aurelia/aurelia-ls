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

  binding(): void {
    this.displayData = this.data.filter((row) => row.label.length > 0);
  }
}
