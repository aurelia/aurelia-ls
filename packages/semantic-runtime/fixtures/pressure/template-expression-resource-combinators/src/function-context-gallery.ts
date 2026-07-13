import { customElement } from 'aurelia';
import { expressionItems, type ExpressionItem } from './model';
import template from './function-context-gallery.html';

@customElement({ name: 'function-context-gallery', template })
export class FunctionContextGallery {
  readonly item = expressionItems[0]!;
  readonly items = expressionItems;
  readonly selectedId = 'selected';
  readonly labels: Record<string, string> = {};
  readonly maybeSelect: ((item: ExpressionItem) => void) | undefined = undefined;
  count = 2;

  select(_item: ExpressionItem): void {}
}
