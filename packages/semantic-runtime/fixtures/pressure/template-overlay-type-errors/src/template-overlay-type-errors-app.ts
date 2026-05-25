import { customElement } from '@aurelia/runtime-html';
import template from './template-overlay-type-errors-app.html';

interface OverlayItem {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
}

@customElement({
  name: 'template-overlay-type-errors-app',
  template,
})
export class TemplateOverlayTypeErrorsApp {
  readonly items: readonly OverlayItem[] = [
    { id: 'first', label: 'First', enabled: true },
  ];

  readonly unknownItems: unknown = [
    { id: 'mystery', label: 'Mystery', enabled: false },
  ];

  readonly selectedItem: OverlayItem | null = this.items[0] ?? null;
  readonly maybeItem: OverlayItem | null = null;

  submit(item: OverlayItem | null): boolean {
    return item?.enabled === true;
  }
}
