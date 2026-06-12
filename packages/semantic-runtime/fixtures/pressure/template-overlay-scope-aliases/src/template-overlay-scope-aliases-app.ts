import { customElement } from '@aurelia/runtime-html';
import template from './template-overlay-scope-aliases-app.html';

interface AliasChild {
  readonly id: string;
  readonly label: string;
}

class AliasItem {
  constructor(
    readonly id: string,
    readonly label: string,
    readonly children: readonly AliasChild[],
  ) {}

  labelLength(): number {
    return this.label.length;
  }
}

@customElement({
  name: 'template-overlay-scope-aliases-app',
  template,
})
export class TemplateOverlayScopeAliasesApp {
  readonly title = 'Alias pressure';
  readonly items: readonly AliasItem[] = [
    new AliasItem(
      'first',
      'First',
      [
        { id: 'first-child', label: 'First child' },
      ],
    ),
  ];

  readonly itemEntries = new Map<string, AliasItem>([
    ['first', new AliasItem(
      'first',
      'First',
      [
        { id: 'first-child', label: 'First child' },
      ],
    )],
  ]);

  readonly selectedItem: AliasItem = this.items[0]!;

  titleLength(): number {
    return this.title.length;
  }

  selectById(id: string): boolean {
    return this.items.some((item) => item.id === id);
  }
}
