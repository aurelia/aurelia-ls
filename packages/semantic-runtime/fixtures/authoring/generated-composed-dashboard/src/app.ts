import { customElement, type ICompositionController } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
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
  summaryComposition?: ICompositionController;
  summaryPending?: Promise<void> | void;

  readonly summaryTemplate = '<p class="dashboard-summary">Alert summary is composed at runtime.</p>';

  get isSummaryLoading(): boolean {
    return this.summaryPending != null;
  }

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
