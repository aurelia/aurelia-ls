import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateValueConverterDisplayPattern: AureliaPatternExample = {
  patternId: 'template.value-converter-display',
  title: 'Reusable display value converter',
  guidance: {
    summary: 'Use a pure value converter when the same display transformation needs to stay reusable across Aurelia templates.',
    whenToUse: [
      'Several templates need the same label, formatting, or display mapping.',
      'The transformation is pure and can be expressed as `toView(value, ...parameters)`.',
      'Template readability improves when the formatting name is explicit in the binding expression.'
    ],
    whenNotToUse: [
      'Only one component needs the value and a view-model getter would be clearer.',
      'The converter needs async work, HTTP, mutable state, caching policy, or access to the caller context.',
      'The problem is localization, validation messages, two-way parsing, or plugin-provided formatting.'
    ]
  },
  source: {
    files: [
      {
        path: 'status-label-value-converter.ts',
        language: 'ts',
        contents: `import { valueConverter } from 'aurelia';

export type ReviewStatus = 'ready' | 'attention' | 'blocked';
export type StatusLabelVariant = 'short' | 'long';

const STATUS_LABELS: Record<ReviewStatus, Record<StatusLabelVariant, string>> = {
  ready: {
    short: 'Ready',
    long: 'Ready for review'
  },
  attention: {
    short: 'Attention',
    long: 'Needs attention'
  },
  blocked: {
    short: 'Blocked',
    long: 'Blocked by an external dependency'
  }
};

@valueConverter('statusLabel')
export class StatusLabelValueConverter {
  toView(
    value: ReviewStatus | null | undefined,
    variant: StatusLabelVariant = 'short'
  ): string {
    if (value === null || value === undefined) {
      return 'Unknown';
    }

    return STATUS_LABELS[value]?.[variant] ?? 'Unknown';
  }
}
`
      },
      {
        path: 'review-status-list.ts',
        language: 'ts',
        contents: `import type { ReviewStatus } from './status-label-value-converter';

export interface ReviewItem {
  id: string;
  title: string;
  status: ReviewStatus;
}

export class ReviewStatusList {
  selectedId = 'accessibility';

  readonly reviews: ReviewItem[] = [
    { id: 'accessibility', title: 'Accessibility pass', status: 'attention' },
    { id: 'release-notes', title: 'Release notes', status: 'ready' },
    { id: 'vendor-approval', title: 'Vendor approval', status: 'blocked' }
  ];

  get selectedReview(): ReviewItem {
    return this.reviews.find((review) => review.id === this.selectedId) ?? this.reviews[0]!;
  }

  selectReview(review: ReviewItem): void {
    this.selectedId = review.id;
  }
}
`
      },
      {
        path: 'review-status-list.html',
        language: 'html',
        contents: `<import from="./status-label-value-converter"></import>

<section>
  <h1>Review status</h1>

  <ul>
    <li repeat.for="review of reviews; key.bind: review.id">
      <button type="button" click.trigger="selectReview(review)">
        <span>\${review.title}</span>
        <span>\${review.status | statusLabel:'short'}</span>
      </button>
    </li>
  </ul>

  <p>
    Current review:
    <strong>\${selectedReview.status | statusLabel:'long'}</strong>
  </p>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The converter is pure: the same input and parameters always produce the same output.'
      },
      {
        summary: 'The converter is registered where the consuming template can resolve it.'
      },
      {
        summary: 'The transformation is reused enough that a converter is clearer than a component getter.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep local-only display logic on the view model.',
        action: 'Use a getter when the formatting depends on one component or on local component state that is not part of the converter input.'
      },
      {
        summary: 'Register the converter deliberately.',
        action: 'Use a local import/dependency for feature-local converters or app startup registration when the converter is truly application-wide.'
      },
      {
        summary: 'Use separate patterns for richer converter behavior.',
        action: 'Treat fromView parsing, signalable converters, caller-context access, i18n, and caching as separate design decisions.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Value Converters',
        url: 'https://docs.aurelia.io/templates/value-converters'
      },
      {
        title: 'AUR0103: Value Converter Not Found',
        url: 'https://docs.aurelia.io/developer-guides/error-messages/runtime-html/aur0103'
      }
    ]
  }
};
