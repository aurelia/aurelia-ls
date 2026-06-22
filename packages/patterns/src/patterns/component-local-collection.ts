import type { AureliaPatternExample } from '../pattern-contract.js';

export const componentLocalCollectionPattern: AureliaPatternExample = {
  patternId: 'component.local-collection',
  title: 'Searchable local collection component',
  guidance: {
    summary: 'Use a component view-model to own a small local collection, expose a cheap filtered list, and handle row selection through ordinary Aurelia bindings.',
    whenToUse: [
      'You need a non-routed component that displays, searches, and selects records from a small collection.',
      'The collection is local view-lifetime state rather than shared application state.',
      'You want a complete component pair that can be adapted before introducing a data service.'
    ],
    whenNotToUse: [
      'The collection is loaded from a remote API or needs caching, retries, pagination, or persistence.',
      'Multiple routes or components need to share the same collection state.',
      'The list/detail selection should be represented in the URL.'
    ]
  },
  source: {
    files: [
      {
        path: 'local-collection.ts',
        language: 'ts',
        contents: `export interface InventoryItem {
  id: number;
  name: string;
  status: 'available' | 'reserved';
  owner: string;
}

export class LocalCollection {
  search = '';

  readonly items: InventoryItem[] = [
    { id: 1, name: 'Projector', status: 'available', owner: 'Facilities' },
    { id: 2, name: 'Workshop kit', status: 'reserved', owner: 'Learning' },
    { id: 3, name: 'Loaner tablet', status: 'available', owner: 'Support' }
  ];

  selectedItem: InventoryItem = this.items[0]!;

  get filteredItems(): InventoryItem[] {
    const query = this.search.trim().toLowerCase();

    if (query.length === 0) {
      return this.items;
    }

    return this.items.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.owner.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query)
    );
  }

  selectItem(item: InventoryItem): void {
    this.selectedItem = item;
  }
}
`
      },
      {
        path: 'local-collection.html',
        language: 'html',
        contents: `<section>
  <label for="inventory-search">Search inventory</label>
  <input
    id="inventory-search"
    value.bind="search"
    placeholder="Name, owner, or status"
  >

  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Owner</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      <tr repeat.for="item of filteredItems; key: id">
        <td>\${item.name}</td>
        <td>\${item.status}</td>
        <td>\${item.owner}</td>
        <td>
          <button type="button" click.trigger="selectItem(item)">View</button>
        </td>
      </tr>
      <tr if.bind="filteredItems.length === 0">
        <td colspan="4">No inventory items match "\${search}".</td>
      </tr>
    </tbody>
  </table>

  <section aria-labelledby="selected-inventory-heading">
    <h2 id="selected-inventory-heading">\${selectedItem.name}</h2>
    <dl>
      <dt>Status</dt>
      <dd>\${selectedItem.status}</dd>
      <dt>Owner</dt>
      <dd>\${selectedItem.owner}</dd>
    </dl>
  </section>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The collection belongs to one component and can be reset when that component is destroyed.'
      },
      {
        summary: 'The seed records exist only to make the example complete and readable.'
      },
      {
        summary: 'The example uses native HTML controls and leaves visual styling to the application.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Replace seed data before treating the collection as production data.',
        action: 'Move `items` behind your app data boundary or inject a service once records come from persistence, HTTP, or shared state.'
      },
      {
        summary: 'Promote state only when another app area needs to share it.',
        action: 'Keep the collection in the view-model for local UI state; move it to an injected state/domain class when multiple components need the same records or selection.'
      },
      {
        summary: 'Rename the local collection around the real affordance.',
        action: 'After replacing the example domain, rename fields, methods, and empty-state copy together.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'List Rendering',
        url: 'https://docs.aurelia.io/templates/repeats-and-list-rendering'
      },
      {
        title: 'Reactivity',
        url: 'https://docs.aurelia.io/essentials/reactivity'
      },
      {
        title: 'Templates',
        url: 'https://docs.aurelia.io/essentials/templates'
      },
      {
        title: 'Components',
        url: 'https://docs.aurelia.io/essentials/components'
      }
    ]
  }
};
