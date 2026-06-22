import type { AureliaPatternExample } from '../pattern-contract.js';

export const componentDynamicCompositionPattern: AureliaPatternExample = {
  patternId: 'component.dynamic-composition',
  title: 'Dynamic component composition',
  guidance: {
    summary: 'Use `<au-compose>` when a host chooses which component to render from a known set at runtime.',
    whenToUse: [
      'A dashboard, workspace, or panel slot switches among known component types.',
      'The host owns the choice and passes simple data into the composed component.',
      'Static template branching would become noisy or repetitive.'
    ],
    whenNotToUse: [
      'A normal `if.bind`, `switch.bind`, or route would express the choice more clearly.',
      'The component type comes from untrusted or unbounded runtime data.',
      'The composed child needs complicated lifecycle orchestration or direct instance access.'
    ]
  },
  source: {
    files: [
      {
        path: 'dashboard-widgets.ts',
        language: 'ts',
        contents: `import { bindable, customElement } from 'aurelia';

@customElement({
  name: 'summary-widget',
  template: '<article><h2>\${title}</h2><ul><li repeat.for="item of items">\${item}</li></ul></article>'
})
export class SummaryWidget {
  @bindable title = '';
  @bindable items: readonly string[] = [];
}

@customElement({
  name: 'activity-widget',
  template: '<article><h2>\${title}</h2><p repeat.for="item of items">\${item}</p></article>'
})
export class ActivityWidget {
  @bindable title = '';
  @bindable items: readonly string[] = [];
}
`
      },
      {
        path: 'dynamic-dashboard.ts',
        language: 'ts',
        contents: `import { ActivityWidget, SummaryWidget } from './dashboard-widgets';

export interface WidgetChoice {
  id: string;
  label: string;
  title: string;
  component: typeof SummaryWidget | typeof ActivityWidget;
  items: readonly string[];
}

export class DynamicDashboard {
  readonly widgets: WidgetChoice[] = [
    {
      id: 'summary',
      label: 'Summary',
      title: 'Release summary',
      component: SummaryWidget,
      items: ['Docs ready', 'Smoke test scheduled', 'Changelog drafted']
    },
    {
      id: 'activity',
      label: 'Activity',
      title: 'Recent activity',
      component: ActivityWidget,
      items: ['Build finished', 'Review opened', 'Preview published']
    }
  ];

  selectedWidget = this.widgets[0]!;

  selectWidget(widget: WidgetChoice): void {
    this.selectedWidget = widget;
  }
}
`
      },
      {
        path: 'dynamic-dashboard.html',
        language: 'html',
        contents: `<section>
  <nav aria-label="Dashboard widgets">
    <button
      repeat.for="widget of widgets; key.bind: widget.id"
      type="button"
      click.trigger="selectWidget(widget)"
      aria-pressed.attr="selectedWidget.id === widget.id">
      \${widget.label}
    </button>
  </nav>

  <au-compose
    component.bind="selectedWidget.component"
    title.bind="selectedWidget.title"
    items.bind="selectedWidget.items">
  </au-compose>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The possible components are known and imported by the host.'
      },
      {
        summary: 'The host passes plain bindable data into the composed component.'
      },
      {
        summary: 'The selection is local UI state, not route state.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Prefer simpler template control flow when it stays readable.',
        action: 'Use `if.bind` or `switch.bind` for small static alternatives; use `<au-compose>` when the component choice itself is data.'
      },
      {
        summary: 'Keep the component set bounded.',
        action: 'Import or register known components instead of composing arbitrary names or external data directly.'
      },
      {
        summary: 'Use routes for navigation-sized choices.',
        action: 'When the selected component represents a URL, permission, or data-loading transaction, model it as routing instead of local composition.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Dynamic Composition',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/dynamic-composition'
      },
      {
        title: 'Components',
        url: 'https://docs.aurelia.io/components/components'
      }
    ]
  }
};
