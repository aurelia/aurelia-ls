import { customElement } from 'aurelia';
import { corpusItems, type CorpusItem, type CorpusPair } from './model';
import template from './read-expressions.html';

@customElement({ name: 'read-expressions', template })
export class ReadExpressions {
  readonly items = corpusItems;
  readonly definiteItem = corpusItems[0]!;
  readonly maybeItem: CorpusItem | null = corpusItems[1] ?? null;
  readonly unknownValue: unknown = corpusItems[0];
  readonly fallbackLabel = 'Unknown';
  readonly activeId = 'first';
  readonly timestamp = 0;
  readonly itemById: Record<string, CorpusItem> = Object.fromEntries(corpusItems.map((item) => [item.id, item]));
  readonly notCallable = 'not callable';

  acceptItem(item: CorpusItem): string {
    return item.label;
  }

  describe(value: string): string;
  describe(value: number): number;
  describe(value: string | number): string | number {
    return value;
  }

  acceptPredicate(predicate: (item: CorpusItem) => boolean): boolean {
    return this.items.some(predicate);
  }

  sum(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0);
  }

  acceptPair(pair: CorpusPair): string {
    return `${pair.label}:${pair.count}`;
  }
}
