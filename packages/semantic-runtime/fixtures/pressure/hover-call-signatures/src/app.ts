import { customElement } from 'aurelia';
import template from './app.html';

@customElement({ name: 'app', template })
export class App {
  /** Formats the selected string overload.
   * @deprecated Use display instead.
   */
  format(value: string): string;
  /** Formats the selected number overload. */
  format(value: number): number;
  format(value: string | number): string | number {
    return value;
  }
}
