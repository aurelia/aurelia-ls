import { customElement } from '@aurelia/runtime-html';
import { ChartWidget } from './chart-widget.js';
import { InventoryWidget } from './inventory-widget.js';
import { CompositionShell } from './composition-shell.js';
import { DeclaringComposeWidget } from './declaring-compose-widget.js';
import type { WidgetModel } from './widget-model.js';
import template from './ce-composition-app.html';

@customElement({
  name: 'ce-composition-app', template,
  dependencies: [ChartWidget, InventoryWidget, CompositionShell, DeclaringComposeWidget],
})
export class CeCompositionApp {
  message = 'alpha';
  hostId = 'first-host';
  model: WidgetModel = { title: 'Initial dashboard', metric: 1 };

  replaceModel(): void {
    this.model = { title: 'Updated dashboard', metric: 2 };
  }
}
