import { bindable, customElement } from '@aurelia/runtime-html';
import type { WidgetModel } from './widget-model.js';
import template from './chart-widget.html';

@customElement({ name: 'chart-widget', template })
export class ChartWidget {
  @bindable message = '';
  model: WidgetModel | null = null;
  activations = 0;

  activate(model: WidgetModel): void {
    this.model = model;
    this.activations++;
  }
}
