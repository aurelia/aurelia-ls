import { customElement } from '@aurelia/runtime-html';
import type { DashboardWidgetModel } from '../state/dashboard-state';
import template from './chart-widget.html';

@customElement({
  name: 'chart-widget',
  template,
})
export class ChartWidget {
  private model: DashboardWidgetModel | null = null;

  activate(model: DashboardWidgetModel): void {
    this.model = model;
  }

  get points(): readonly number[] {
    return this.model?.points ?? [];
  }

  get peakLabel(): string {
    const peak = Math.max(0, ...this.points);
    return peak === 0 ? 'No samples yet' : `Peak ${peak}`;
  }
}
