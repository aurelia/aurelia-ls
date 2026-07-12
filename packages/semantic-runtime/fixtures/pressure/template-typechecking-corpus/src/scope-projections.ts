import { customElement } from 'aurelia';
import { corpusItems, type CorpusItem } from './model';
import template from './scope-projections.html';

@customElement({ name: 'scope-projections', template })
export class ScopeProjections {
  readonly heading = 'Scope projection';
  readonly items = corpusItems;
  readonly entries = new Map(corpusItems.map((item) => [item.id, item] as const));
  readonly selectedItem: CorpusItem | null = corpusItems[0] ?? null;
  readonly itemPromise: Promise<CorpusItem> = Promise.resolve(corpusItems[0]!);
}
