import { AuCompose, customElement, valueConverter } from '@aurelia/runtime-html';
import type { IActionHandler } from '@aurelia/state';
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

export interface DashboardState {
  readonly kit: WidgetKit;
}

const dashboardKit: WidgetKit = {
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

export const initialDashboardState: DashboardState = {
  kit: dashboardKit,
};

export const dashboardStateHandler: IActionHandler<DashboardState> = (state) => state;

@valueConverter('stableWidgetKit')
export class StableWidgetKitValueConverter {
  toView(kit: WidgetKit): WidgetKit {
    return kit;
  }
}

@customElement({
  name: 'compose-dashboard-app',
  template,
  dependencies: [ChartWidget, InventoryWidget, WidgetHost, StableWidgetKitValueConverter],
})
export class ComposeDashboardApp {
  readonly summaryTemplate = '<p>Selected widget summary</p>';
  readonly summaryComponent = {
    activate(model: DashboardWidgetModel): void {
      void model;
    },
  };
  readonly nonCallableActivationComponent = {
    activate: 'not callable',
  };
  readonly openActivationComponent: { readonly activate: Function } = {
    activate(): void {},
  };
  readonly summaryClass = SummaryPanel;
  readonly selectedWidgetId = 'stock';
  composition: AuCompose['composition'] | null = null;

  readonly kit: WidgetKit = dashboardKit;

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

  async getOpenTemplate(): Promise<string> {
    return this.summaryTemplate;
  }

  readonly rejectedComponent = Promise.reject('component unavailable');
  readonly rejectedTemplate: Promise<string> = Promise.reject('template unavailable');
  readonly promisedModel = Promise.resolve(this.selectedWidget);
  readonly promisedScopeBehavior = Promise.resolve('scoped' as const);
  readonly promisedTag = Promise.resolve('article');
  readonly promisedFlushMode = Promise.resolve('async' as const);
}
