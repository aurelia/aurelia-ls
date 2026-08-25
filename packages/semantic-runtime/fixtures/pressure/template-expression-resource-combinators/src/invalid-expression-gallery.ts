import { customElement } from 'aurelia';
import { expressionItems } from './model';
import template from './invalid-expression-gallery.html';

@customElement({ name: 'invalid-expression-gallery', template })
export class InvalidExpressionGallery {
  readonly condition = true;
  readonly label = 'Label';
  readonly items = expressionItems;
  readonly maybeItem = expressionItems[0] ?? null;

  format(value: string): string {
    return value;
  }
}
