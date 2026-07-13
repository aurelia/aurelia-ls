import { customElement } from 'aurelia';
import { expressionItems, type ExpressionItem } from './model';
import template from './expression-gallery.html';

@customElement({ name: 'expression-gallery', template })
export class ExpressionGallery {
  readonly item = expressionItems[0]!;
  readonly maybeItem: ExpressionItem | null = expressionItems[1] ?? null;
  readonly items = expressionItems;
  readonly itemById: Readonly<Record<string, ExpressionItem>> = Object.fromEntries(
    expressionItems.map((item) => [item.id, item]),
  );
  readonly selectedId = 'first';
  readonly fallback = 'No item';
  readonly limit = 3;
  readonly timestamp = Date.UTC(2026, 0, 1);
  count = 2;
  readonly tuples: readonly (readonly [string, string, number])[] = [['Tuple', 'ignored', 7]];

  format(value: string): string {
    return value.toUpperCase();
  }

  tag(parts: TemplateStringsArray, value: string): string {
    return `${parts[0]}${value}${parts[1]}`;
  }
}
