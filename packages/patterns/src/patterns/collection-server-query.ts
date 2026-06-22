import type { AureliaPatternExample } from '../pattern-contract.js';

export const collectionServerQueryPattern: AureliaPatternExample = {
  patternId: 'collection.server-query',
  title: 'Server-backed query collection',
  guidance: {
    summary: 'Use an injected query service plus a small query object when filtering, sorting, and pagination belong to the server instead of a local array.',
    whenToUse: [
      'The collection is too large or too shared for local filtering and pagination.',
      'The server owns filtering, sorting, page size, and total result count.',
      'The current query can be serialized into URL query parameters or an API request.'
    ],
    whenNotToUse: [
      'All items are already local and modest enough for computed getters.',
      'Selection must survive across routes or pages and belongs in shared feature state.',
      'The UI needs infinite scroll, virtualization, optimistic edits, or offline persistence.'
    ]
  },
  source: {
    files: [
      {
        path: 'user-search-service.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { IHttpClient } from '@aurelia/fetch-client';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface UserSearchQuery {
  search: string;
  role: string;
  sort: 'name' | 'email' | 'role';
  direction: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface UserSearchResult {
  rows: readonly UserRow[];
  total: number;
}

export class UserSearchService {
  private readonly http = resolve(IHttpClient);

  async search(query: UserSearchQuery, signal?: AbortSignal): Promise<UserSearchResult> {
    const params = new URLSearchParams({
      search: query.search.trim(),
      role: query.role,
      sort: query.sort,
      direction: query.direction,
      page: String(query.page),
      pageSize: String(query.pageSize)
    });

    const response = await this.http.fetch(\`/api/users?\${params}\`, { signal });
    if (!response.ok) {
      throw new Error('Could not load users.');
    }

    return await response.json() as UserSearchResult;
  }
}

export interface IUserSearchService extends UserSearchService {}

export const IUserSearchService = DI.createInterface<IUserSearchService>(
  'IUserSearchService',
  (x) => x.singleton(UserSearchService)
);
`
      },
      {
        path: 'user-search-page.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IRouter, ICurrentRoute, IRouteContext } from '@aurelia/router';
import {
  IUserSearchService,
  type UserRow,
  type UserSearchQuery
} from './user-search-service';

export class UserSearchPage {
  private readonly users = resolve(IUserSearchService);
  private readonly router = resolve(IRouter);
  private readonly routeContext = resolve(IRouteContext);
  private readonly currentRoute = resolve(ICurrentRoute);

  query: UserSearchQuery = {
    search: '',
    role: '',
    sort: 'name',
    direction: 'asc',
    page: 1,
    pageSize: 25
  };

  rows: readonly UserRow[] = [];
  total = 0;
  isLoading = false;
  errorMessage = '';

  private pendingLoad?: AbortController;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.query.pageSize));
  }

  async loading(): Promise<void> {
    this.hydrateQueryFromUrl();
    await this.loadPage();
  }

  async applyFilters(): Promise<void> {
    this.query = { ...this.query, page: 1 };
    await this.replaceUrlAndLoad();
  }

  async sortBy(sort: UserSearchQuery['sort']): Promise<void> {
    const direction = this.query.sort === sort && this.query.direction === 'asc' ? 'desc' : 'asc';
    this.query = { ...this.query, sort, direction, page: 1 };
    await this.replaceUrlAndLoad();
  }

  async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages || page === this.query.page) {
      return;
    }

    this.query = { ...this.query, page };
    await this.replaceUrlAndLoad();
  }

  private hydrateQueryFromUrl(): void {
    const query = this.routeContext.getRouteParameters<Record<string, unknown>, 'child-first'>({
      mergeStrategy: 'child-first',
      includeQueryParams: true
    });

    this.query = {
      search: this.stringParam(query.search),
      role: this.stringParam(query.role),
      sort: this.sortFromQuery(query.sort),
      direction: this.stringParam(query.direction) === 'desc' ? 'desc' : 'asc',
      page: this.positiveInt(query.page, 1),
      pageSize: this.positiveInt(query.pageSize, 25)
    };
  }

  private async replaceUrlAndLoad(): Promise<void> {
    await this.router.load(this.currentRoute.path, {
      queryParams: this.queryParams(),
      historyStrategy: 'replace'
    });
    await this.loadPage();
  }

  private async loadPage(): Promise<void> {
    this.pendingLoad?.abort();
    const controller = new AbortController();
    this.pendingLoad = controller;
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.users.search(this.query, controller.signal);
      this.rows = result.rows;
      this.total = result.total;
    } catch (error) {
      if (!controller.signal.aborted) {
        this.errorMessage = error instanceof Error ? error.message : 'Could not load users.';
      }
    } finally {
      if (this.pendingLoad === controller) {
        this.pendingLoad = undefined;
        this.isLoading = false;
      }
    }
  }

  private queryParams(): Record<string, string> {
    return {
      search: this.query.search,
      role: this.query.role,
      sort: this.query.sort,
      direction: this.query.direction,
      page: String(this.query.page),
      pageSize: String(this.query.pageSize)
    };
  }

  private sortFromQuery(value: unknown): UserSearchQuery['sort'] {
    return value === 'email' || value === 'role' ? value : 'name';
  }

  private positiveInt(value: unknown, defaultValue: number): number {
    const parsed = Number.parseInt(this.stringParam(value), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  private stringParam(value: unknown): string {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : '';
    }

    return typeof value === 'string' ? value : '';
  }

  get canGoPrevious(): boolean {
    return this.query.page > 1 && !this.isLoading;
  }

  get canGoNext(): boolean {
    return this.query.page < this.totalPages && !this.isLoading;
  }
}
`
      },
      {
        path: 'user-search-page.html',
        language: 'html',
        contents: `<section>
  <h1>Users</h1>

  <form submit.trigger="applyFilters()">
    <label for="user-search">Search</label>
    <input id="user-search" type="search" value.bind="query.search & debounce:300">

    <label for="user-role">Role</label>
    <select id="user-role" value.bind="query.role">
      <option value="">Any role</option>
      <option value="admin">Admin</option>
      <option value="editor">Editor</option>
      <option value="viewer">Viewer</option>
    </select>

    <button type="submit" disabled.bind="isLoading">Apply</button>
  </form>

  <p if.bind="isLoading" role="status">Loading users...</p>
  <p if.bind="errorMessage" role="alert">\${errorMessage}</p>

  <table if.bind="!errorMessage">
    <thead>
      <tr>
        <th><button type="button" click.trigger="sortBy('name')">Name</button></th>
        <th><button type="button" click.trigger="sortBy('email')">Email</button></th>
        <th><button type="button" click.trigger="sortBy('role')">Role</button></th>
      </tr>
    </thead>
    <tbody>
      <tr repeat.for="row of rows; key.bind: row.id">
        <td>\${row.name}</td>
        <td>\${row.email}</td>
        <td>\${row.role}</td>
      </tr>
    </tbody>
  </table>

  <nav aria-label="User pages">
    <button type="button" click.trigger="goToPage(query.page - 1)" disabled.bind="!canGoPrevious">Previous</button>
    <span>Page \${query.page} of \${totalPages}</span>
    <button type="button" click.trigger="goToPage(query.page + 1)" disabled.bind="!canGoNext">Next</button>
  </nav>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The server accepts the query object as URLSearchParams and returns rows plus a total count.'
      },
      {
        summary: 'The route query string is the shareable source of truth for filters and page state.'
      },
      {
        summary: 'Selection across pages is deliberately outside this local page pattern.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Read query state from the route context during loading.',
        action: 'Use `IRouteContext.getRouteParameters({ includeQueryParams: true })` in `loading()`; reserve `ICurrentRoute.path` for replacing the current URL.'
      },
      {
        summary: 'Keep request cancellation near the owner of the visible query.',
        action: 'Abort stale loads when the user changes query state quickly or leaves the route before the response arrives.'
      },
      {
        summary: 'Move cross-page selection into injected state when needed.',
        action: 'Use a feature state service if selected ids must survive filters, pagination, nested routes, or multiple components.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Data Table Recipe',
        url: 'https://docs.aurelia.io/templates/recipes/data-table'
      },
      {
        title: 'Route Parameters',
        url: 'https://docs.aurelia.io/router/route-parameters'
      },
      {
        title: 'Fetch Client',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/setting-up'
      }
    ]
  }
};
