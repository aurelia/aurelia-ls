import { customElement } from '@aurelia/runtime-html';
import type { DashboardWidgetModel } from '../compose-dashboard-app';
import template from './chart-widget.html';

@customElement({
  name: 'chart-widget',
  template,
})
export class ChartWidget {
  private model: DashboardWidgetModel | null = null;

  get title(): string {
    return this.model?.title ?? 'Loading chart';
  }

  get metric(): number {
    return this.model?.metric ?? 0;
  }

  activate(model: { readonly notTheDashboardModel: true }): void;
  activate(model: DashboardWidgetModel): void;
  activate(model: DashboardWidgetModel | { readonly notTheDashboardModel: true }): void {
    if ('metric' in model) {
      this.model = model;
    }
  }
}
