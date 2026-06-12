import { customElement } from '@aurelia/runtime-html';
import type { DashboardWidgetModel } from '../compose-dashboard-app';
import template from './inventory-widget.html';

@customElement({
  name: 'inventory-widget',
  template,
})
export class InventoryWidget {
  private model: DashboardWidgetModel | null = null;

  get title(): string {
    return this.model?.title ?? 'Loading inventory';
  }

  get metric(): number {
    return this.model?.metric ?? 0;
  }

  activate(model: DashboardWidgetModel): void {
    this.model = model;
  }
}
