import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateLetVariablesPattern: AureliaPatternExample = {
  patternId: 'template.let-variables',
  title: 'Template-local derived variables',
  guidance: {
    summary: 'Use `<let>` for small template-local names that make repeated derived template expressions easier to read.',
    whenToUse: [
      'A template repeats a simple derived value such as count, label, or selected item name.',
      'The value is display-only and does not need a separate view-model property.',
      'The surrounding component still owns the actual state and filtering logic.'
    ],
    whenNotToUse: [
      'The derived value belongs in TypeScript for testing, reuse, or complex logic.',
      'The variable hides expensive work inside the template.',
      'The same state is shared across routes or components.'
    ]
  },
  source: {
    files: [
      {
        path: 'team-queue.ts',
        language: 'ts',
        contents: `export interface QueueItem {
  id: number;
  title: string;
  status: 'ready' | 'waiting';
}

export class TeamQueue {
  statusFilter: '' | QueueItem['status'] = '';

  readonly items: QueueItem[] = [
    { id: 1, title: 'Review release notes', status: 'ready' },
    { id: 2, title: 'Confirm screenshots', status: 'waiting' },
    { id: 3, title: 'Publish docs', status: 'ready' }
  ];

  get visibleItems(): QueueItem[] {
    if (this.statusFilter === '') {
      return this.items;
    }

    return this.items.filter((item) => item.status === this.statusFilter);
  }
}
`
      },
      {
        path: 'team-queue.html',
        language: 'html',
        contents: `<section>
  <label for="status-filter">Status</label>
  <select id="status-filter" value.bind="statusFilter">
    <option value="">All</option>
    <option value="ready">Ready</option>
    <option value="waiting">Waiting</option>
  </select>

  <let
    visible-count.bind="visibleItems.length"
    filter-label.bind="statusFilter || 'all'">
  </let>

  <p>Showing \${visibleCount} \${filterLabel} items.</p>
  <ul if.bind="visibleItems.length">
    <li repeat.for="item of visibleItems; key.bind: item.id">
      \${item.title} - \${item.status}
    </li>
  </ul>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The `<let>` values are display helpers, not canonical state.'
      },
      {
        summary: 'The expensive or reusable derivation stays in TypeScript.'
      },
      {
        summary: 'The variable names make the template easier to scan.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Move complex derivation back to TypeScript.',
        action: 'Use getters or services when the expression needs tests, reuse, or meaningful branching.'
      },
      {
        summary: 'Keep `<let>` close to where it is read.',
        action: 'Declare template-local variables near the markup that consumes them so the data flow remains obvious.'
      },
      {
        summary: 'Do not use `<let>` as shared state.',
        action: 'When multiple components need the value, expose it through owned TypeScript state or an injected service.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Template Variables',
        url: 'https://docs.aurelia.io/templates/template-syntax/template-variables'
      },
      {
        title: 'List Rendering',
        url: 'https://docs.aurelia.io/templates/repeats-and-list-rendering'
      }
    ]
  }
};
