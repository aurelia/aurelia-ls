import type { AureliaPatternExample } from '../pattern-contract.js';

export const collectionVirtualRepeatPattern: AureliaPatternExample = {
  patternId: 'collection.virtual-repeat',
  title: 'Virtualized large collection',
  guidance: {
    summary: 'Use @aurelia/ui-virtualization when a large collection needs a small, recycled DOM instead of local pagination or a full repeat.',
    whenToUse: [
      'The UI must render thousands of similarly sized rows without creating thousands of DOM nodes.',
      'The scroll container can have a fixed height and overflow auto or scroll.',
      'Each row can render from stable item data without relying on DOM position selectors.'
    ],
    whenNotToUse: [
      'The collection is small enough for repeat.for or local pagination.',
      'Rows have complex variable layout that cannot provide usable size constraints.',
      'The problem is server pagination, filtering, or query state rather than DOM volume.'
    ]
  },
  source: {
    files: [
      {
        path: 'main.ts',
        language: 'ts',
        contents: `import Aurelia from 'aurelia';
import { DefaultVirtualizationConfiguration } from '@aurelia/ui-virtualization';
import { LargeAuditLog } from './large-audit-log';

void Aurelia
  .register(DefaultVirtualizationConfiguration)
  .app(LargeAuditLog)
  .start();
`
      },
      {
        path: 'large-audit-log.ts',
        language: 'ts',
        contents: `export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
}

export class LargeAuditLog {
  search = '';
  entries: readonly AuditEntry[] = Array.from({ length: 10000 }, (_unused, index) => ({
    id: String(index + 1),
    actor: index % 2 === 0 ? 'Platform' : 'Operations',
    action: \`Reviewed item \${index + 1}\`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 8, index % 60)).toISOString()
  }));

  get filteredEntries(): readonly AuditEntry[] {
    const term = this.search.trim().toLowerCase();
    if (term.length === 0) {
      return this.entries;
    }

    return this.entries.filter((entry) =>
      entry.actor.toLowerCase().includes(term) ||
      entry.action.toLowerCase().includes(term)
    );
  }

  trackEntry(_index: number, entry: AuditEntry): string {
    return entry.id;
  }
}
`
      },
      {
        path: 'large-audit-log.html',
        language: 'html',
        contents: `<section>
  <h1>Audit log</h1>

  <label for="audit-search">Search</label>
  <input id="audit-search" type="search" value.bind="search & debounce:200">

  <p if.bind="filteredEntries.length === 0">No matching entries.</p>

  <div class="audit-scroll" if.bind="filteredEntries.length > 0">
    <article
      virtual-repeat.for="entry of filteredEntries; item-height: 56; buffer-size: 4"
      class="audit-row"
    >
      <strong>\${entry.actor}</strong>
      <span>\${entry.action}</span>
      <time datetime.attr="entry.createdAt">\${entry.createdAt}</time>
    </article>
  </div>
</section>
`
      },
      {
        path: 'large-audit-log.css',
        language: 'css',
        contents: `.audit-scroll {
  height: 28rem;
  overflow: auto;
}

.audit-row {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 10rem 1fr 14rem;
  gap: 1rem;
  min-height: 56px;
  padding: 0.75rem;
}
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The scroll container has a stable height and overflow so virtual repeat can measure visible rows.'
      },
      {
        summary: 'Rows have predictable height or an explicit item-height option.'
      },
      {
        summary: 'The collection is already available locally; server query ownership is a separate concern.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep the repeated root element measurable.',
        action: 'Do not put another template controller on the same element as `virtual-repeat.for`; move conditions inside or around the virtualized region.'
      },
      {
        summary: 'Use CSS classes instead of positional selectors.',
        action: 'Virtual repeat recycles DOM nodes, so avoid styles or tests that assume `nth-child` maps to the original item index.'
      },
      {
        summary: 'Switch to server query patterns when data volume exceeds client ownership.',
        action: 'Virtualization reduces DOM cost, not API payload size, authorization pressure, or server-owned filtering.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'UI Virtualization',
        url: 'https://docs.aurelia.io/developer-guides/ui-virtualization'
      },
      {
        title: 'Performance Optimization Techniques',
        url: 'https://docs.aurelia.io/advanced-scenarios/performance-optimization-techniques'
      }
    ]
  }
};
