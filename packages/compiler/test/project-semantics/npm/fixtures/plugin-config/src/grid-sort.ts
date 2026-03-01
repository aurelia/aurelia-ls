import { customAttribute, bindable } from 'aurelia';

/**
 * A sort attribute for grid columns.
 */
@customAttribute({ name: 'grid-sort', defaultProperty: 'key' })
export class GridSortCustomAttribute {
  /** Sort key */
  @bindable()
  key: string = '';

  /** Default sort direction */
  @bindable()
  default: 'asc' | 'desc' | 'none' = 'none';
}
