import { customElement } from 'aurelia';
import type { DashboardWidgetModel } from '../state/dashboard-state';
import template from './inventory-widget.html';

@customElement({
  name: 'inventory-widget',
  template,
})
export class InventoryWidget {
  model: DashboardWidgetModel | null = null;

  activate(model: DashboardWidgetModel): void {
    this.model = model;
  }
}
