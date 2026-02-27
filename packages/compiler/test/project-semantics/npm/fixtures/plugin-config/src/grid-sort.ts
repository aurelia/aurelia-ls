import { customAttribute, bindable } from 'aurelia';

/**
 * A sort attribute for grid columns.
 */
@customAttribute('grid-sort')
export class GridSortCustomAttribute {
  /** Sort key */
  @bindable({ primary: true })
  key: string = '';

  /** Default sort direction */
  @bindable()
  default: 'asc' | 'desc' | 'none' = 'none';
}
