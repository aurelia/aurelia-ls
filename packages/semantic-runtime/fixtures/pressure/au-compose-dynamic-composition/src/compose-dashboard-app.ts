import { customElement, type ICompositionController } from '@aurelia/runtime-html';
import { ChartWidget } from './widgets/chart-widget';
import { InventoryWidget } from './widgets/inventory-widget';
import { WidgetHost, type WidgetKit } from './widget-host';
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
  dependencies: [ChartWidget, InventoryWidget, WidgetHost],
})
export class ComposeDashboardApp {
  readonly summaryTemplate = '<p>Selected widget summary</p>';
  readonly summaryComponent = {
    activate(model: DashboardWidgetModel): void {
      void model;
    },
  };
  readonly summaryClass = SummaryPanel;
  readonly selectedWidgetId = 'stock';
  composition: ICompositionController | null = null;

  readonly kit: WidgetKit = {
    widgets: [
      {
        id: 'sales',
        component: ChartWidget,
        data: { title: 'Sales trend' },
        isApplicable(id: string): boolean {
          return id === this.id;
        },
      },
      {
        id: 'stock',
        component: InventoryWidget,
        data: { title: 'Inventory' },
        isApplicable(id: string): boolean {
          return id === this.id;
        },
      },
    ],
  };

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
    return this.widgets.find((widget) => widget.id === this.selectedWidgetId) ?? this.widgets[0]!;
  }

  get selectedWidgetComponent(): typeof ChartWidget | typeof InventoryWidget {
    return this.selectedWidget.component;
  }

  getAsyncComponent(): Promise<typeof ChartWidget> {
    return Promise.resolve(ChartWidget);
  }

  getAsyncTemplate(): Promise<string> {
    return Promise.resolve(this.summaryTemplate);
  }
}
