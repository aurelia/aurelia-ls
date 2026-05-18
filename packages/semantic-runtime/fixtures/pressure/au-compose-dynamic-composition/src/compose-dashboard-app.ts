import { customElement, type ICompositionController } from '@aurelia/runtime-html';
import { ChartWidget } from './widgets/chart-widget';
import { InventoryWidget } from './widgets/inventory-widget';
import template from './compose-dashboard-app.html';

export interface DashboardWidgetModel {
  readonly id: string;
  readonly title: string;
  readonly metric: number;
  readonly component: typeof ChartWidget | typeof InventoryWidget;
}

class SummaryPanel {
  activate(model: DashboardWidgetModel): void {
    void model;
  }
}

@customElement({
  name: 'compose-dashboard-app',
  template,
  dependencies: [ChartWidget, InventoryWidget],
})
export class ComposeDashboardApp {
  readonly summaryTemplate = '<p>Selected widget summary</p>';
  readonly summaryComponent = {
    activate(model: DashboardWidgetModel): void {
      void model;
    },
  };
  readonly summaryClass = SummaryPanel;
  composition: ICompositionController | null = null;

  readonly widgets: readonly DashboardWidgetModel[] = [
    {
      id: 'sales',
      title: 'Sales trend',
      metric: 42,
      component: ChartWidget,
    },
    {
      id: 'stock',
      title: 'Inventory',
      metric: 17,
      component: InventoryWidget,
    },
  ];

  get selectedWidget(): DashboardWidgetModel {
    return this.widgets[0]!;
  }

  getAsyncComponent(): Promise<typeof ChartWidget> {
    return Promise.resolve(ChartWidget);
  }

  getAsyncTemplate(): Promise<string> {
    return Promise.resolve(this.summaryTemplate);
  }
}
