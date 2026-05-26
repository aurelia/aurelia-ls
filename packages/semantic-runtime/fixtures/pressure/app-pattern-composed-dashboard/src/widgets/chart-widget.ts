import { customElement } from 'aurelia';
import type { DashboardWidgetModel } from '../state/dashboard-state';
import template from './chart-widget.html';

@customElement({
  name: 'chart-widget',
  template,
})
export class ChartWidget {
  model: DashboardWidgetModel | null = null;

  activate(model: DashboardWidgetModel): void {
    this.model = model;
  }

  get peakLabel(): string {
    const peak = Math.max(0, ...(this.model?.points ?? []));
    return peak === 0 ? 'No samples yet' : `Peak ${peak}`;
  }
}
