import type { AureliaPatternExample } from '../pattern-contract.js';

export const componentSlottedLayoutPattern: AureliaPatternExample = {
  patternId: 'component.slotted-layout',
  title: 'Slotted layout component',
  guidance: {
    summary: 'Use au-slot when a reusable application component should own the frame while callers provide named content regions without Shadow DOM.',
    whenToUse: [
      'A card, panel, toolbar, or list shell should provide a consistent frame while callers provide actions or body content.',
      'The projected content should keep the caller component scope.',
      'Light-DOM styling and application-owned composition are more important than native Shadow DOM encapsulation.'
    ],
    whenNotToUse: [
      'The component only needs scalar data from its parent; start with ordinary bindables instead.',
      'The component is a web-component-style boundary that intentionally requires native Shadow DOM slots.',
      'Projected content needs slot mutation observation, slotted decorators, or reusable library packaging policy.'
    ]
  },
  source: {
    files: [
      {
        path: 'summary-card.ts',
        language: 'ts',
        contents: `import { bindable } from 'aurelia';

export class SummaryCard {
  @bindable heading = '';
  @bindable tone: 'neutral' | 'success' | 'warning' = 'neutral';

  get toneLabel(): string {
    switch (this.tone) {
      case 'success':
        return 'Good';
      case 'warning':
        return 'Needs attention';
      case 'neutral':
        return 'Neutral';
    }
  }
}
`
      },
      {
        path: 'summary-card.html',
        language: 'html',
        contents: `<article class="summary-card \${tone}" aria-labelledby="summary-card-heading">
  <header>
    <div>
      <p>Status: \${toneLabel}</p>
      <h2 id="summary-card-heading">\${heading}</h2>
    </div>

    <div class="summary-card-actions">
      <au-slot name="actions"></au-slot>
    </div>
  </header>

  <section>
    <au-slot>
      <p>No summary content provided.</p>
    </au-slot>
  </section>
</article>
`
      },
      {
        path: 'dashboard.ts',
        language: 'ts',
        contents: `export class Dashboard {
  readonly cardHeading = 'Release health';
  readonly cardTone = 'warning' as const;
  readonly openRisks = 2;

  reviewRisks(): void {
    // Replace with route navigation or a shared command service in the real app.
  }
}
`
      },
      {
        path: 'dashboard.html',
        language: 'html',
        contents: `<import from="./summary-card"></import>

<summary-card heading.bind="cardHeading" tone.bind="cardTone">
  <button au-slot="actions" type="button" click.trigger="reviewRisks()">
    Review risks
  </button>

  <p>\${openRisks} open risks need attention before release.</p>
</summary-card>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The layout component owns structure and fallback content, while the caller owns projected action behavior and body text.'
      },
      {
        summary: 'The app wants Aurelia light-DOM slotting through au-slot, not native Shadow DOM slot encapsulation.'
      },
      {
        summary: 'Projected content is direct child content of the custom element so the slot target is unambiguous.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Start with bindables before introducing slot composition.',
        action: 'Use slots only when callers need to provide markup or actions; keep simple scalar inputs as named bindables.'
      },
      {
        summary: 'Keep projected content at the custom element boundary.',
        action: 'Place `au-slot` projections on direct children of the component usage, and use template controllers directly on those projected children when needed.'
      },
      {
        summary: 'Use a separate advanced pattern for slot observation.',
        action: 'Do not add `@slotted`, `@children`, or slotchange logic unless the component truly needs to react to projection mutations.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Slotted Content',
        url: 'https://docs.aurelia.io/components/shadow-dom-and-slots'
      },
      {
        title: 'Bindable Properties',
        url: 'https://docs.aurelia.io/components/bindable-properties'
      }
    ]
  }
};
