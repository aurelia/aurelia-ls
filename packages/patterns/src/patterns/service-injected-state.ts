import type { AureliaPatternExample } from '../pattern-contract.js';

export const serviceInjectedStatePattern: AureliaPatternExample = {
  patternId: 'service.injected-state',
  title: 'Injected shared state service',
  guidance: {
    summary: 'Use a plain Aurelia DI singleton service when sibling components need to read and update the same view-level state without introducing a state library.',
    whenToUse: [
      'Two or more components in the same feature need a shared selection, draft, cache, or coordination state.',
      'The state has behavior around it and should not be duplicated through parent plumbing.',
      'A singleton service lifetime is enough for the current feature.'
    ],
    whenNotToUse: [
      'The state belongs entirely to one component view-model.',
      'The feature needs persistence, remote loading, retries, or caching policies at the same time.',
      'The app already needs a formal state/store plugin, scoped container lifetime, or router-owned navigation state.'
    ]
  },
  source: {
    files: [
      {
        path: 'workspace-selection-state.ts',
        language: 'ts',
        contents: `import { DI } from 'aurelia';

export interface WorkspacePanel {
  id: string;
  title: string;
  summary: string;
}

export class WorkspaceSelectionState {
  readonly panels: readonly WorkspacePanel[] = [
    {
      id: 'activity',
      title: 'Activity',
      summary: 'Recent updates from the workspace.'
    },
    {
      id: 'planning',
      title: 'Planning',
      summary: 'Near-term work that needs coordination.'
    },
    {
      id: 'decisions',
      title: 'Decisions',
      summary: 'Choices the team has already made.'
    }
  ];

  selectedPanelId = this.panels[0]!.id;

  get selectedPanel(): WorkspacePanel {
    return this.panels.find((panel) => panel.id === this.selectedPanelId) ?? this.panels[0]!;
  }

  selectPanel(panelId: string): void {
    if (this.panels.some((panel) => panel.id === panelId)) {
      this.selectedPanelId = panelId;
    }
  }
}

export interface IWorkspaceSelectionState extends WorkspaceSelectionState {}

export const IWorkspaceSelectionState = DI.createInterface<IWorkspaceSelectionState>(
  'IWorkspaceSelectionState',
  (x) => x.singleton(WorkspaceSelectionState)
);
`
      },
      {
        path: 'workspace-shell.ts',
        language: 'ts',
        contents: `export class WorkspaceShell {}
`
      },
      {
        path: 'workspace-shell.html',
        language: 'html',
        contents: `<import from="./workspace-nav"></import>
<import from="./workspace-detail"></import>

<section>
  <h1>Workspace</h1>
  <workspace-nav></workspace-nav>
  <workspace-detail></workspace-detail>
</section>
`
      },
      {
        path: 'workspace-nav.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IWorkspaceSelectionState } from './workspace-selection-state';

export class WorkspaceNav {
  readonly selection = resolve(IWorkspaceSelectionState);
}
`
      },
      {
        path: 'workspace-nav.html',
        language: 'html',
        contents: `<nav aria-label="Workspace sections">
  <button
    repeat.for="panel of selection.panels; key.bind: panel.id"
    type="button"
    class.bind="panel.id === selection.selectedPanelId ? 'is-selected' : ''"
    click.trigger="selection.selectPanel(panel.id)">
    \${panel.title}
  </button>
</nav>
`
      },
      {
        path: 'workspace-detail.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IWorkspaceSelectionState } from './workspace-selection-state';

export class WorkspaceDetail {
  readonly selection = resolve(IWorkspaceSelectionState);
}
`
      },
      {
        path: 'workspace-detail.html',
        language: 'html',
        contents: `<article aria-labelledby="workspace-panel-title">
  <h2 id="workspace-panel-title">\${selection.selectedPanel.title}</h2>
  <p>\${selection.selectedPanel.summary}</p>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The shared state is intentionally feature-local behavior, not a global application state model.'
      },
      {
        summary: 'The default DI interface registration provides a singleton service for consumers in the active container.'
      },
      {
        summary: 'The service owns synchronous state only; persistence and remote loading are separate responsibilities.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep state local until more than one component needs it.',
        action: 'Start with a view-model property for single-component state; introduce an injected service when another component must coordinate with it.'
      },
      {
        summary: 'Add persistence or remote loading behind a separate boundary.',
        action: 'Inject a storage or API service into the state service once loading, saving, retries, or cache invalidation becomes real app behavior.'
      },
      {
        summary: 'Promote to a state/store plugin only when coordination pressure justifies it.',
        action: 'Stay with plain DI for simple shared state; revisit @aurelia/state or @aurelia/store when updates need global dispatch, tooling, or cross-feature policy.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Dependency Injection',
        url: 'https://docs.aurelia.io/essentials/dependency-injection'
      },
      {
        title: 'Dependency Injection (DI)',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/dependency-injection'
      },
      {
        title: 'Creating Services',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/dependency-injection-di/creating-services'
      }
    ]
  }
};
