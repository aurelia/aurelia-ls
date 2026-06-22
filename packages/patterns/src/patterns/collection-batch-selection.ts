import type { AureliaPatternExample } from '../pattern-contract.js';

export const collectionBatchSelectionPattern: AureliaPatternExample = {
  patternId: 'collection.batch-selection',
  title: 'Batch selection with a local Set',
  guidance: {
    summary: 'Use a local `Set` of item ids when a component needs repeatable batch selection over a visible collection.',
    whenToUse: [
      'Selection belongs to the current component workflow.',
      'Rows have stable ids that can be stored independently from row objects.',
      'Batch actions can run from the selected id set.'
    ],
    whenNotToUse: [
      'Selection must persist across routes, tabs, or sessions.',
      'The server owns selected rows across paged result sets.',
      'The selected state is part of a larger shared feature workflow.'
    ]
  },
  source: {
    files: [
      {
        path: 'selectable-project-list.ts',
        language: 'ts',
        contents: `export interface ProjectRow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
}

export class SelectableProjectList {
  readonly projects: ProjectRow[] = [
    { id: 'aurora', name: 'Aurora dashboard', status: 'active' },
    { id: 'beacon', name: 'Beacon search', status: 'paused' },
    { id: 'canopy', name: 'Canopy billing', status: 'active' }
  ];

  readonly selectedIds = new Set<string>();
  statusMessage = '';

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get allVisibleSelected(): boolean {
    return this.projects.length > 0 && this.projects.every((project) => this.selectedIds.has(project.id));
  }

  toggleProject(projectId: string): void {
    if (this.selectedIds.has(projectId)) {
      this.selectedIds.delete(projectId);
      return;
    }

    this.selectedIds.add(projectId);
  }

  toggleAllVisible(): void {
    if (this.allVisibleSelected) {
      this.clearSelection();
      return;
    }

    for (const project of this.projects) {
      this.selectedIds.add(project.id);
    }
  }

  archiveSelected(): void {
    const ids = Array.from(this.selectedIds);
    this.statusMessage = 'Archived ' + ids.length + ' project' + (ids.length === 1 ? '' : 's') + '.';
    this.clearSelection();
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }
}
`
      },
      {
        path: 'selectable-project-list.html',
        language: 'html',
        contents: `<section>
  <h1>Projects</h1>

  <label>
    <input
      type="checkbox"
      checked.to-view="allVisibleSelected"
      change.trigger="toggleAllVisible()">
    Select all visible projects
  </label>

  <ul>
    <li repeat.for="project of projects; key.bind: project.id">
      <label>
        <input
          type="checkbox"
          checked.to-view="selectedIds.has(project.id)"
          change.trigger="toggleProject(project.id)">
        \${project.name} (\${project.status})
      </label>
    </li>
  </ul>

  <footer>
    <span>\${selectedCount} selected</span>
    <button type="button" click.trigger="archiveSelected()" disabled.bind="selectedCount === 0">
      Archive selected
    </button>
    <button type="button" click.trigger="clearSelection()" disabled.bind="selectedCount === 0">
      Clear
    </button>
  </footer>

  <p if.bind="statusMessage" role="status">\${statusMessage}</p>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'Selection is local to the current component view.'
      },
      {
        summary: 'Each selectable row has a stable id.'
      },
      {
        summary: 'Batch actions can operate from selected ids rather than selected row object references.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Promote shared selection to an injected service.',
        action: 'If multiple components need the same selection, move the `Set` and batch methods into a DI-provided feature state class.'
      },
      {
        summary: 'Treat server paging as a different shape.',
        action: 'When selected rows span unloaded pages, store server filters or explicit ids in the data service.'
      },
      {
        summary: 'Keep checkbox state derived from ids.',
        action: 'Use stable item ids in `selectedIds`, bind derived checked state one-way, and let change handlers update the selection set.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Form Collection Controls',
        url: 'https://docs.aurelia.io/templates/forms/collections'
      },
      {
        title: 'Repeats and List Rendering',
        url: 'https://docs.aurelia.io/templates/repeats-and-list-rendering'
      },
      {
        title: 'Watching Data',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/watching-data'
      }
    ]
  }
};
