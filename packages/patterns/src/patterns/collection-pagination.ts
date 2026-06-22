import type { AureliaPatternExample } from '../pattern-contract.js';

export const collectionPaginationPattern: AureliaPatternExample = {
  patternId: 'collection.pagination',
  title: 'Local collection pagination',
  guidance: {
    summary: 'Use view-model pagination getters when a local collection should render a bounded page without introducing server or router state.',
    whenToUse: [
      'The full collection is already available in the component.',
      'Pagination is local presentation state rather than navigation state.',
      'The page size is small enough that normal `repeat.for` stays appropriate.'
    ],
    whenNotToUse: [
      'The server owns the page, cursor, sort, or filter contract.',
      'The page selection needs to be shareable in the URL.',
      'The collection is large enough to need virtualization or streaming.'
    ]
  },
  source: {
    files: [
      {
        path: 'paged-project-list.ts',
        language: 'ts',
        contents: `export interface ProjectRow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
}

export class PagedProjectList {
  readonly pageSize = 5;
  currentPage = 1;

  readonly projects: ProjectRow[] = [
    { id: 'aurora', name: 'Aurora dashboard', status: 'active' },
    { id: 'beacon', name: 'Beacon search', status: 'paused' },
    { id: 'canopy', name: 'Canopy billing', status: 'active' },
    { id: 'delta', name: 'Delta import', status: 'archived' },
    { id: 'ember', name: 'Ember reports', status: 'active' },
    { id: 'fjord', name: 'Fjord analytics', status: 'paused' }
  ];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.projects.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginatedProjects(): ProjectRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.projects.slice(start, start + this.pageSize);
  }

  previousPage(): void {
    this.currentPage = Math.max(1, this.currentPage - 1);
  }

  nextPage(): void {
    this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(this.totalPages, Math.max(1, page));
  }
}
`
      },
      {
        path: 'paged-project-list.html',
        language: 'html',
        contents: `<section>
  <h1>Projects</h1>

  <ol>
    <li repeat.for="project of paginatedProjects; key.bind: project.id">
      <strong>\${project.name}</strong>
      <span>\${project.status}</span>
    </li>
  </ol>

  <nav aria-label="Project pages">
    <button type="button" click.trigger="previousPage()" disabled.bind="currentPage === 1">
      Previous
    </button>

    <button
      repeat.for="page of pageNumbers"
      type="button"
      click.trigger="goToPage(page)"
      aria-current.attr="page === currentPage ? 'page' : null">
      \${page}
    </button>

    <button type="button" click.trigger="nextPage()" disabled.bind="currentPage === totalPages">
      Next
    </button>
  </nav>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The component already has the complete collection in memory.'
      },
      {
        summary: 'Changing pages does not need to update the URL or fetch new data.'
      },
      {
        summary: 'The collection size is modest enough for normal repeat rendering.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Move server-owned page state to a service or route.',
        action: 'If the API owns cursors, sorting, or filtering, model those values in the data service or route parameters instead of slicing a local array.'
      },
      {
        summary: 'Keep page state deterministic after filtering.',
        action: 'When adding search or filters, clamp `currentPage` after the filtered collection changes so the rendered page cannot become empty by accident.'
      },
      {
        summary: 'Escalate large lists deliberately.',
        action: 'Use virtualization or server paging when DOM size or fetch size becomes the bottleneck.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Repeats and List Rendering',
        url: 'https://docs.aurelia.io/templates/repeats-and-list-rendering'
      },
      {
        title: 'Performance Optimization Techniques',
        url: 'https://docs.aurelia.io/advanced-scenarios/performance-optimization-techniques'
      }
    ]
  }
};
