import type { AureliaPatternExample } from '../pattern-contract.js';

export const serviceFetchCancellationPattern: AureliaPatternExample = {
  patternId: 'service.fetch-cancellation',
  title: 'Cancellable fetch-client request',
  guidance: {
    summary: 'Use `AbortController` with Aurelia fetch-client when a component must cancel stale or leaving-page requests.',
    whenToUse: [
      'A user action can start a newer request before the previous one finishes.',
      'Leaving the component should cancel in-flight work.',
      'The first need is cancellation and stale-result protection, not retry or cache policy.'
    ],
    whenNotToUse: [
      'The request is route-critical and should be owned by router loading instead.',
      'The request should complete in the background after the component leaves.',
      'The main problem is retry, caching, upload progress, or global request tracking.'
    ]
  },
  source: {
    files: [
      {
        path: 'cancellable-project-search.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IHttpClient } from '@aurelia/fetch-client';

export interface SearchResult {
  id: string;
  name: string;
}

export class CancellableProjectSearch {
  private readonly http = resolve(IHttpClient);
  private currentController: AbortController | null = null;

  query = '';
  results: SearchResult[] = [];
  isLoading = false;
  errorMessage = '';

  async search(query: string): Promise<void> {
    this.query = query.trim();
    this.currentController?.abort();

    if (this.query.length < 2) {
      this.results = [];
      this.isLoading = false;
      return;
    }

    const controller = new AbortController();
    this.currentController = controller;
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.http.get(
        '/api/projects?search=' + encodeURIComponent(this.query),
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error('Search failed with status ' + response.status);
      }

      this.results = await response.json() as SearchResult[];
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      this.errorMessage = 'Search could not be completed.';
      this.results = [];
    } finally {
      if (this.currentController === controller) {
        this.currentController = null;
        this.isLoading = false;
      }
    }
  }

  detaching(): void {
    this.currentController?.abort();
    this.currentController = null;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
`
      },
      {
        path: 'cancellable-project-search.html',
        language: 'html',
        contents: `<section>
  <label for="project-search">Search projects</label>
  <input
    id="project-search"
    input.trigger="search($event.target.value)"
    autocomplete="off"
  >

  <p if.bind="isLoading" role="status">Searching...</p>
  <p if.bind="errorMessage" role="alert">\${errorMessage}</p>

  <ul if.bind="results.length">
    <li repeat.for="result of results; key.bind: result.id">
      \${result.name}
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
        summary: 'New searches should cancel older in-flight searches.'
      },
      {
        summary: 'Leaving the component should cancel the active request.'
      },
      {
        summary: 'Abort errors are expected control flow and should not show as user-facing failures.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep route-critical requests in router loading.',
        action: 'Use this pattern for component-owned requests; use router lifecycle patterns when navigation should wait for the data.'
      },
      {
        summary: 'Avoid mixing cancellation with retry policy casually.',
        action: 'Review fetch-client retry behavior separately before combining retry attempts and abort signals.'
      },
      {
        summary: 'Move shared search state behind DI if needed.',
        action: 'If multiple components need the query/results, put the state and cancellation ownership in an injected service.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Request Cancellation with AbortController',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/abort-controller'
      },
      {
        title: 'Fetch Client Setup and Configuration',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/setting-up'
      },
      {
        title: 'Component Lifecycles',
        url: 'https://docs.aurelia.io/components/component-lifecycles'
      }
    ]
  }
};
