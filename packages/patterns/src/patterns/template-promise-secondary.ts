import type { AureliaPatternExample } from '../pattern-contract.js';

export const templatePromiseSecondaryPattern: AureliaPatternExample = {
  patternId: 'template.promise-secondary',
  title: 'Promise-bound secondary content',
  guidance: {
    summary: 'Use promise.bind when secondary async content can render its own pending, success, and error states without blocking component or route activation.',
    whenToUse: [
      'A panel, feed, preview, or recommendation list can appear after the main view is already useful.',
      'The async state belongs to one template region and can be retried from that region.',
      'You want declarative pending, then, and catch UI around a stable Promise property.'
    ],
    whenNotToUse: [
      'The route must not render until the data is available.',
      'The async operation needs cancellation, stale-response guards, caching, or shared request tracking.',
      'Several components need to coordinate the same async state or command.'
    ]
  },
  source: {
    files: [
      {
        path: 'secondary-activity.ts',
        language: 'ts',
        contents: `export interface ActivityItem {
  id: number;
  text: string;
  actor: string;
}

export class SecondaryActivity {
  private readonly activityItems: readonly ActivityItem[] = [
    {
      id: 1,
      text: 'Updated rollout notes',
      actor: 'Docs'
    },
    {
      id: 2,
      text: 'Confirmed smoke test results',
      actor: 'QA'
    },
    {
      id: 3,
      text: 'Queued follow-up review',
      actor: 'Platform'
    }
  ];

  activityPromise: Promise<readonly ActivityItem[]> = this.loadActivity();

  refreshActivity(): void {
    this.activityPromise = this.loadActivity();
  }

  private async loadActivity(): Promise<readonly ActivityItem[]> {
    return await Promise.resolve(this.activityItems);
  }
}
`
      },
      {
        path: 'secondary-activity.html',
        language: 'html',
        contents: `<section aria-labelledby="activity-heading">
  <header>
    <h2 id="activity-heading">Recent activity</h2>
    <button type="button" click.trigger="refreshActivity()">Refresh</button>
  </header>

  <div promise.bind="activityPromise">
    <template pending>
      <p role="status">Loading recent activity...</p>
    </template>

    <template then="items">
      <ul>
        <li repeat.for="item of items; key.bind: item.id">
          <strong>\${item.actor}</strong>
          <span>\${item.text}</span>
        </li>
      </ul>
    </template>

    <template catch="error">
      <p role="alert">Recent activity could not be loaded.</p>
      <button type="button" click.trigger="refreshActivity()">Try again</button>
    </template>
  </div>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The main view remains useful while this secondary content is pending.'
      },
      {
        summary: 'A Promise property is assigned deliberately, then replaced when the user retries or refreshes.'
      },
      {
        summary: 'The async operation is local to this component region.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use router loading for route-critical data.',
        action: 'If the route cannot render honestly without the data, move the work into `loading()` instead of `promise.bind`.'
      },
      {
        summary: 'Move operational async policy into an injected service.',
        action: 'Add cancellation, stale-response guards, cache policy, auth, retries, or shared request tracking behind a service boundary when those concerns become real.'
      },
      {
        summary: 'Keep promise state children directly under the promise controller.',
        action: 'Make `pending`, `then`, and `catch` direct children of the element or template with `promise.bind`.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Template Promises',
        url: 'https://docs.aurelia.io/templates/template-syntax/template-promises'
      },
      {
        title: 'AUR0813: Invalid promise template usage',
        url: 'https://docs.aurelia.io/developer-guides/error-messages/runtime-html/aur0813'
      }
    ]
  }
};
