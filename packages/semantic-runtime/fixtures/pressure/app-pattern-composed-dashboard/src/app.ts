import { customElement, resolve } from 'aurelia';
import { ChartWidget } from './widgets/chart-widget';
import { InventoryWidget } from './widgets/inventory-widget';
import { DashboardState } from './state/dashboard-state';
import template from './app.html';

@customElement({
  name: 'dashboard-app',
  template,
  dependencies: [ChartWidget, InventoryWidget],
})
export class DashboardApp {
  readonly state = resolve(DashboardState);
  summaryComposition?: unknown;
  summaryPending?: Promise<void> | void;

  readonly summaryTemplate = '<p class="dashboard-summary">Alert summary is composed at runtime.</p>';

  getAsyncSummaryTemplate(): Promise<string> {
    return Promise.resolve(this.summaryTemplate);
  }

  getAsyncFeaturedComponent(): Promise<typeof InventoryWidget> {
    return Promise.resolve(InventoryWidget);
  }

  binding(): void {
    void this.state.loadDashboard();
  }
}
