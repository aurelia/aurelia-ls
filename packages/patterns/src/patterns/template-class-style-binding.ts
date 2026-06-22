import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateClassStyleBindingPattern: AureliaPatternExample = {
  patternId: 'template.class-style-binding',
  title: 'State-driven class and style binding',
  guidance: {
    summary: 'Use Aurelia class and style bindings to reflect component state in native HTML without adding DOM manipulation code.',
    whenToUse: [
      'A component needs selected, compact, warning, loading, or similar visual states.',
      'CSS classes should change from simple booleans or comparisons in the template.',
      'A small inline style value, such as width or opacity, should come from view-model state.'
    ],
    whenNotToUse: [
      'The main problem is theming architecture, CSS modules, Shadow DOM isolation, or build-tool scanning.',
      'The class name needs value conversion or i18n/plugin-specific formatting.',
      'The visual state should be represented by validation, router activity, animation orchestration, or a design-system component.'
    ]
  },
  source: {
    files: [
      {
        path: 'status-styles.ts',
        language: 'ts',
        contents: `export interface StatusItem {
  id: string;
  title: string;
  owner: string;
  description: string;
  tone: 'ready' | 'attention' | 'blocked';
  percentComplete: number;
}

export class StatusStyles {
  compact = false;
  selectedId = 'release-notes';

  readonly items: StatusItem[] = [
    {
      id: 'release-notes',
      title: 'Release notes',
      owner: 'Docs',
      description: 'Draft is ready for review.',
      tone: 'ready',
      percentComplete: 90
    },
    {
      id: 'smoke-tests',
      title: 'Smoke tests',
      owner: 'QA',
      description: 'One environment still needs attention.',
      tone: 'attention',
      percentComplete: 65
    },
    {
      id: 'legal-review',
      title: 'Legal review',
      owner: 'Operations',
      description: 'External approval is blocking the release.',
      tone: 'blocked',
      percentComplete: 30
    }
  ];

  get selectedItem(): StatusItem {
    return this.items.find((item) => item.id === this.selectedId) ?? this.items[0]!;
  }

  get isBlocked(): boolean {
    return this.selectedItem.tone === 'blocked';
  }

  get progressLabel(): string {
    return \`\${this.selectedItem.title} is \${this.selectedItem.percentComplete}% complete\`;
  }

  selectItem(item: StatusItem): void {
    this.selectedId = item.id;
  }

  toggleCompact(): void {
    this.compact = !this.compact;
  }
}
`
      },
      {
        path: 'status-styles.html',
        language: 'html',
        contents: `<section class="status-board" compact.class="compact">
  <header>
    <h1>Release readiness</h1>
    <button type="button" click.trigger="toggleCompact()">
      \${compact ? 'Show details' : 'Compact view'}
    </button>
  </header>

  <ul>
    <li
      repeat.for="item of items; key.bind: item.id"
      selected.class="item.id === selectedId"
      attention.class="item.tone === 'attention'"
      blocked.class="item.tone === 'blocked'"
    >
      <button type="button" click.trigger="selectItem(item)">
        <span>\${item.title}</span>
        <span class="owner">\${item.owner}</span>
      </button>
    </li>
  </ul>

  <section aria-labelledby="readiness-heading">
    <h2 id="readiness-heading">\${selectedItem.title}</h2>
    <p>\${selectedItem.description}</p>

    <div class="progress-track" aria-label.attr="progressLabel">
      <div class="progress-value" width.style="selectedItem.percentComplete + '%'"></div>
    </div>

    <p if.bind="isBlocked" warning.class="isBlocked">
      Resolve this item before release.
    </p>
  </section>
</section>
`
      },
      {
        path: 'status-styles.css',
        language: 'css',
        contents: `.status-board {
  display: grid;
  gap: 1rem;
}

.status-board.compact .owner {
  display: none;
}

li.selected {
  font-weight: 700;
}

li.attention {
  border-inline-start: 0.25rem solid #b45309;
}

li.blocked,
p.warning {
  color: #b91c1c;
}

.progress-track {
  background: #e5e7eb;
}

.progress-value {
  background: #2563eb;
  height: 0.5rem;
}
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The visual state is already available as simple view-model properties or getters.'
      },
      {
        summary: 'Named CSS classes live in the component stylesheet or the application design system.'
      },
      {
        summary: 'The inline style value is small, bounded, and safe to derive from component state.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep class names stable when a CSS scanner or design system needs to see them.',
        action: 'Prefer `.class` for named boolean states and use `class.bind` object form only when the class tokens remain discoverable by your build tooling.'
      },
      {
        summary: 'Move complex visual decisions into view-model getters.',
        action: 'If a template expression starts combining many conditions, expose a named getter or typed state value before binding classes to it.'
      },
      {
        summary: 'Use a styling architecture pattern for isolation or theming.',
        action: 'Treat Shadow DOM, CSS modules, global theme variables, and animation orchestration as separate decisions from this basic binding pattern.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'CSS classes and styling',
        url: 'https://docs.aurelia.io/templates/class-and-style-bindings'
      },
      {
        title: 'Class and Style Binding',
        url: 'https://docs.aurelia.io/components/class-and-style-binding'
      }
    ]
  }
};
