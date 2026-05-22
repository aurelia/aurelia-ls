import { customElement } from '@aurelia/runtime-html';
import template from './checked-select-custom-matcher-app.html';

interface MatchableItem {
  readonly id: string;
  readonly label: string;
}

@customElement({
  name: 'checked-select-custom-matcher-app',
  template,
})
export class CheckedSelectCustomMatcherApp {
  readonly items: readonly MatchableItem[] = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
  ];

  selectedItems: MatchableItem[] = [];
  selectedItem: MatchableItem | null = null;
  booleanAcknowledged = false;
  staticChoice: 'alpha' | 'beta' = 'alpha';
  staticTags: string[] = [];
  selectedItemSet = new Set<MatchableItem>();
  selectedItemMap = new Map<MatchableItem, boolean>();
  readonly readonlySelectedItems: readonly MatchableItem[] = [];
  readonly readonlyItemSet: ReadonlySet<MatchableItem> = new Set();
  readonly readonlyItemMap: ReadonlyMap<MatchableItem, boolean> = new Map();
  selectedOption: MatchableItem | null = null;
  selectedOptions: MatchableItem[] = [];

  matchItems(left: MatchableItem | null, right: MatchableItem | null): boolean {
    return left?.id === right?.id;
  }
}
