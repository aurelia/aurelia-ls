import type { AureliaPatternExample } from '../pattern-contract.js';

export const componentCustomEventPattern: AureliaPatternExample = {
  patternId: 'component.custom-event',
  title: 'Custom event component output',
  guidance: {
    summary: 'Use a bubbling CustomEvent when a reusable child component needs to emit one DOM-like action to the parent template that renders it.',
    whenToUse: [
      'A child component owns the button or local interaction while the visible parent owns the one resulting operation.',
      'The output is a discrete UI event with a small explicit payload.',
      'The listener is declared in the parent template, so the relationship stays easy to trace.'
    ],
    whenNotToUse: [
      'The child only needs to receive values from the parent; use plain bindables for input-only components.',
      'The interaction represents shared or long-lived feature state that multiple components need to read or update.',
      'The sender and receiver are unrelated feature collaborators rather than a visible parent-child UI boundary.'
    ]
  },
  source: {
    files: [
      {
        path: 'approval-list.ts',
        language: 'ts',
        contents: `import type { ApprovalProject, ApprovalRequestedDetail } from './approval-request-card';

export class ApprovalList {
  readonly projects: readonly ApprovalProject[] = [
    {
      id: 'roadmap',
      name: 'Roadmap refresh',
      owner: 'Design systems'
    },
    {
      id: 'billing',
      name: 'Billing cleanup',
      owner: 'Platform'
    }
  ];

  lastApprovalMessage = '';

  handleApprovalRequested(event: CustomEvent<ApprovalRequestedDetail>): void {
    const request = event.detail;
    this.lastApprovalMessage = \`\${request.projectName} is queued for approval by \${request.owner}.\`;
  }
}
`
      },
      {
        path: 'approval-list.html',
        language: 'html',
        contents: `<import from="./approval-request-card"></import>

<section>
  <h1>Approvals</h1>

  <approval-request-card
    repeat.for="project of projects; key.bind: project.id"
    project.bind="project"
    approval-requested.trigger="handleApprovalRequested($event)">
  </approval-request-card>

  <p if.bind="lastApprovalMessage" role="status">\${lastApprovalMessage}</p>
</section>
`
      },
      {
        path: 'approval-request-card.ts',
        language: 'ts',
        contents: `import { bindable, resolve } from 'aurelia';
import { INode } from '@aurelia/runtime-html';

export interface ApprovalProject {
  id: string;
  name: string;
  owner: string;
}

export interface ApprovalRequestedDetail {
  projectId: string;
  projectName: string;
  owner: string;
}

export class ApprovalRequestCard {
  @bindable project!: ApprovalProject;

  private readonly host = resolve(INode) as HTMLElement;

  requestApproval(): void {
    this.host.dispatchEvent(new CustomEvent<ApprovalRequestedDetail>('approval-requested', {
      bubbles: true,
      detail: {
        projectId: this.project.id,
        projectName: this.project.name,
        owner: this.project.owner
      }
    }));
  }
}
`
      },
      {
        path: 'approval-request-card.html',
        language: 'html',
        contents: `<article>
  <h2>\${project.name}</h2>
  <p>Owner: \${project.owner}</p>
  <button type="button" click.trigger="requestApproval()">
    Request approval
  </button>
</article>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The child component is used by a parent that binds the required input before the button can be used.'
      },
      {
        summary: 'The event payload is small, explicit, and owned by the child component contract.'
      },
      {
        summary: 'The event only needs to bubble through normal DOM ancestry, not across unrelated app features.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep output events named after the action the parent should handle.',
        action: 'Use specific event names such as `approval-requested`, `item-selected`, or `dialog-closed` instead of generic names like `change` for component outputs.'
      },
      {
        summary: 'Move operation work to the parent or an injected service.',
        action: 'Let the child dispatch the event; perform persistence, routing, toast messages, or shared state updates from the parent boundary that owns them.'
      },
      {
        summary: 'Promote shared feature behavior to DI instead of stretching component output events.',
        action: 'When multiple components need the same command or result, move state and mutations into an injected state/service class.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Event Binding',
        url: 'https://docs.aurelia.io/templates/template-syntax/event-binding'
      },
      {
        title: 'Bindable Properties',
        url: 'https://docs.aurelia.io/components/bindable-properties'
      },
      {
        title: 'Component Basics',
        url: 'https://docs.aurelia.io/components/components'
      }
    ]
  }
};
