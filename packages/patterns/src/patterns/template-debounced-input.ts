import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateDebouncedInputPattern: AureliaPatternExample = {
  patternId: 'template.debounced-input',
  title: 'Debounced local input binding',
  guidance: {
    summary: 'Use the built-in debounce binding behavior when local view-model state should update only after the user pauses typing.',
    whenToUse: [
      'A search, filter, or preview input should avoid recalculating on every keystroke.',
      'The delayed value stays local to the component and drives synchronous derived UI.',
      'A small debounce interval is enough without request cancellation or flush signals.'
    ],
    whenNotToUse: [
      'Every input event must update state immediately, such as strict form validation or masks.',
      'Typing starts HTTP requests that need cancellation, stale-response guards, or loading state.',
      'The problem is throttling continuous events, flushing pending updates, or changing updateTrigger events.'
    ]
  },
  source: {
    files: [
      {
        path: 'debounced-filter.ts',
        language: 'ts',
        contents: `export interface KnowledgeArticle {
  id: number;
  title: string;
  section: string;
}

export class DebouncedFilter {
  search = '';

  readonly articles: KnowledgeArticle[] = [
    { id: 1, title: 'Account setup', section: 'Onboarding' },
    { id: 2, title: 'Billing contacts', section: 'Billing' },
    { id: 3, title: 'Release checklist', section: 'Operations' }
  ];

  get matchingArticles(): KnowledgeArticle[] {
    const query = this.search.trim().toLowerCase();

    if (query.length === 0) {
      return this.articles;
    }

    return this.articles.filter((article) =>
      article.title.toLowerCase().includes(query) ||
      article.section.toLowerCase().includes(query)
    );
  }
}
`
      },
      {
        path: 'debounced-filter.html',
        language: 'html',
        contents: `<section>
  <label for="article-search">Search articles</label>
  <input
    id="article-search"
    value.bind="search & debounce:300"
    placeholder="Type and pause"
  >

  <p>\${matchingArticles.length} matching articles</p>

  <ul if.bind="matchingArticles.length">
    <li repeat.for="article of matchingArticles; key.bind: article.id">
      <strong>\${article.title}</strong>
      <span>\${article.section}</span>
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
        summary: 'The debounced value drives local synchronous UI, not immediate validation or remote requests.'
      },
      {
        summary: 'A 300ms delay is acceptable for this interaction.'
      },
      {
        summary: 'The component can tolerate the view-model property lagging briefly behind what the user is typing.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use immediate binding for strict input workflows.',
        action: 'Avoid debounce when every keystroke must update masks, validation, submit eligibility, or accessibility feedback.'
      },
      {
        summary: 'Move remote search behind an async data pattern.',
        action: 'When debounced input starts HTTP work, add request cancellation, stale-response guards, loading/error state, and an injected data service.'
      },
      {
        summary: 'Use other binding behaviors deliberately.',
        action: 'Choose throttle for continuous high-frequency events, updateTrigger for blur/paste timing, and signal only when pending updates need explicit flushing.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Binding Behaviors',
        url: 'https://docs.aurelia.io/templates/binding-behaviors'
      },
      {
        title: 'List Rendering',
        url: 'https://docs.aurelia.io/templates/repeats-and-list-rendering'
      }
    ]
  }
};
