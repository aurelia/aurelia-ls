import { customAttribute, bindable, BindingMode } from 'aurelia';

/**
 * A data grid attribute.
 * Test fixture demonstrating bindable with binding mode.
 */
@customAttribute('data-grid')
export class DataGridCustomAttribute {
  /** The data to display - two-way binding */
  @bindable({ mode: BindingMode.twoWay })
  data: unknown[] = [];

  /** Display data after filtering/sorting - two-way */
  @bindable({ mode: BindingMode.twoWay })
  displayData: unknown[] = [];

  /** Column configuration */
  @bindable()
  columns: unknown[] = [];

  /** Current page number - two-way */
  @bindable({ mode: BindingMode.twoWay })
  page: number = 1;
}
