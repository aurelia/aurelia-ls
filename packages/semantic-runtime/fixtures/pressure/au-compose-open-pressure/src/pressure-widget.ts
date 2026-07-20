import { customElement } from '@aurelia/runtime-html';
import template from './pressure-widget.html';

export interface PressureWidgetModel {
  readonly message: string;
}

@customElement({ name: 'pressure-widget', template })
export class PressureWidget {
  message = '';

  activate(model: PressureWidgetModel): void {
    this.message = model.message;
  }
}
