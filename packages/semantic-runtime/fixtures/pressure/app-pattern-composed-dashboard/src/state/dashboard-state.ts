import { ChartWidget } from '../widgets/chart-widget';
import { InventoryWidget } from '../widgets/inventory-widget';

export type DashboardWidgetKind = 'chart' | 'inventory';

export interface DashboardInventoryItem {
  readonly sku: string;
  readonly label: string;
  readonly count: number;
}

export interface DashboardWidgetModel {
  readonly id: string;
  readonly kind: DashboardWidgetKind;
  readonly title: string;
  readonly component: typeof ChartWidget | typeof InventoryWidget;
  readonly points: readonly number[];
  readonly items: readonly DashboardInventoryItem[];
}

export class DashboardState {
  readonly widgets: readonly DashboardWidgetModel[] = [
    {
      id: 'orders',
      kind: 'chart',
      title: 'Order Trend',
      component: ChartWidget,
      points: [12, 18, 16, 24],
      items: [],
    },
    {
      id: 'stock',
      kind: 'inventory',
      title: 'Inventory Watch',
      component: InventoryWidget,
      points: [],
      items: [
        { sku: 'lamp-1', label: 'Task lamp', count: 6 },
        { sku: 'chair-1', label: 'Reading chair', count: 2 },
        { sku: 'shelf-1', label: 'Wall shelf', count: 0 },
      ],
    },
  ];

  get featuredWidget(): DashboardWidgetModel {
    return this.widgets.find((widget) => widget.kind === 'inventory') ?? this.widgets[0]!;
  }

  get alertCount(): number {
    return this.widgets
      .flatMap((widget) => widget.items)
      .filter((item) => item.count <= 2).length;
  }

  async loadDashboard(): Promise<void> {
    await Promise.resolve();
  }
}
