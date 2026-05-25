import { type Constructable } from '@aurelia/kernel';
import { bindable, customElement, valueConverter } from '@aurelia/runtime-html';
import { ChartWidget } from './widgets/chart-widget';
import { InventoryWidget } from './widgets/inventory-widget';
import template from './widget-host.html';

export interface WidgetRegistration {
  readonly id: string;
  readonly component: typeof ChartWidget | typeof InventoryWidget;
  readonly data: {
    readonly title: string;
  };
  isApplicable(id: string): boolean;
}

export interface WidgetKit {
  readonly widgets: readonly WidgetRegistration[];
}

export function resolveWidget(kit: WidgetKit, id: string): readonly [
  Constructable | undefined,
  WidgetRegistration['data'] | undefined,
] {
  const widget = kit.widgets.find((entry) => entry.isApplicable(id));
  return [widget?.component, widget?.data];
}

@valueConverter('stableWidgetKit')
export class WidgetHostStableWidgetKitValueConverter {
  toView(_kit: WidgetKit): WidgetKit {
    return { widgets: [] };
  }
}

@customElement({
  name: 'widget-host',
  template,
  dependencies: [ChartWidget, InventoryWidget, WidgetHostStableWidgetKitValueConverter],
})
export class WidgetHost {
  @bindable()
  kit!: WidgetKit;

  readonly selectedWidgetId = 'stock';

  get component(): Constructable {
    const [component] = resolveWidget(this.kit, this.selectedWidgetId);
    return component ?? ChartWidget;
  }

  get model(): WidgetRegistration['data'] {
    const [, data] = resolveWidget(this.kit, this.selectedWidgetId);
    return data ?? { title: 'Fallback widget' };
  }
}
