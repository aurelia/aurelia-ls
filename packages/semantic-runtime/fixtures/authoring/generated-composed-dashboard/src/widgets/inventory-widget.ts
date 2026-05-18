import { customElement } from '@aurelia/runtime-html';
import type { DashboardWidgetModel } from '../state/dashboard-state';
import template from './inventory-widget.html';

@customElement({
  name: 'inventory-widget',
  template,
})
export class InventoryWidget {
  private model: DashboardWidgetModel | null = null;

  activate(model: DashboardWidgetModel): void {
    this.model = model;
  }

  get items(): DashboardWidgetModel['items'] {
    return this.model?.items ?? [];
  }
}
