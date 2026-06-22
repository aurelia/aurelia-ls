import type { AureliaPatternExample } from '../pattern-contract.js';

export const componentBindableBasicPattern: AureliaPatternExample = {
  patternId: 'component.bindable-basic',
  title: 'Bindable presenter component',
  guidance: {
    summary: 'Use a small child custom element with @bindable inputs when a parent should pass display data into a reusable presenter component.',
    whenToUse: [
      'You need reusable UI that accepts data from a parent component.',
      'The child component should render data it receives rather than fetch or own shared state.',
      'Default one-way parent-to-child flow is enough.'
    ],
    whenNotToUse: [
      'The child needs to own a direct UI action output rather than only render parent-supplied input.',
      'The component interaction represents shared feature state or commands needed by more than one component.',
      'The component needs slots, attribute capture, Shadow DOM, or component-library packaging.',
      'The component needs router access, async loading, or validation-plugin integration.'
    ]
  },
  source: {
    files: [
      {
        path: 'project-overview.ts',
        language: 'ts',
        contents: `export class ProjectOverview {
  readonly project = {
    name: 'Release readiness',
    owner: 'Platform team',
    status: 'attention' as const
  };
}
`
      },
      {
        path: 'project-overview.html',
        language: 'html',
        contents: `<import from="./project-status-badge"></import>

<section>
  <h1>Project overview</h1>
  <project-status-badge
    name.bind="project.name"
    owner.bind="project.owner"
    status.bind="project.status">
  </project-status-badge>
</section>
`
      },
      {
        path: 'project-status-badge.ts',
        language: 'ts',
        contents: `import { bindable } from 'aurelia';

export type ProjectStatus = 'healthy' | 'attention' | 'blocked';

export class ProjectStatusBadge {
  @bindable name = '';
  @bindable owner = '';
  @bindable status: ProjectStatus = 'healthy';

  get statusLabel(): string {
    switch (this.status) {
      case 'healthy':
        return 'Healthy';
      case 'attention':
        return 'Needs attention';
      case 'blocked':
        return 'Blocked';
    }
  }

  get summary(): string {
    return \`\${this.name} is \${this.statusLabel.toLowerCase()} and owned by \${this.owner}.\`;
  }
}
`
      },
      {
        path: 'project-status-badge.html',
        language: 'html',
        contents: `<article aria-label.attr="summary">
  <h2>\${name}</h2>
  <dl>
    <dt>Owner</dt>
    <dd>\${owner}</dd>
    <dt>Status</dt>
    <dd>\${statusLabel}</dd>
  </dl>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'Bindable values are provided by the parent and are not read in the child constructor.'
      },
      {
        summary: 'Primitive values that must remain booleans or numbers are passed with `.bind` or handled by a later coercion pattern.'
      },
      {
        summary: 'The child is a presenter component, so it does not fetch data or mutate shared application state.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Add explicit output behavior only when the child truly needs to notify the parent.',
        action: 'Use a narrow DOM CustomEvent for one visible parent-child UI action; use an injected state/service class when the behavior becomes shared feature state.'
      },
      {
        summary: 'Keep bindable values out of constructor-dependent setup.',
        action: 'Use getters, `binding`, `bound`, or change callbacks when logic depends on values supplied by the parent.'
      },
      {
        summary: 'Reach for slots or attribute capture only after explicit inputs become too restrictive.',
        action: 'Start with named bindables; promote to slots or `$attrs` when consumers need custom content or many native attributes.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Bindable Properties',
        url: 'https://docs.aurelia.io/components/bindable-properties'
      },
      {
        title: 'Component Basics',
        url: 'https://docs.aurelia.io/components/components'
      },
      {
        title: 'Components',
        url: 'https://docs.aurelia.io/essentials/components'
      }
    ]
  }
};
