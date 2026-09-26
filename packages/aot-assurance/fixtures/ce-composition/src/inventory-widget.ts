import { bindable, customElement } from '@aurelia/runtime-html';
import type { WidgetModel } from './widget-model.js';
import template from './inventory-widget.html';

@customElement({ name: 'inventory-widget', template })
export class InventoryWidget {
  @bindable message = '';
  @bindable id = '';
  model: WidgetModel | null = null;
  activations = 0;

  activate(model: WidgetModel): void {
    this.model = model;
    this.activations++;
  }
}
