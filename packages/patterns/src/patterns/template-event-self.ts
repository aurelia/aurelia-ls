import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateEventSelfPattern: AureliaPatternExample = {
  patternId: 'template.event-self',
  title: 'Self-filtered local event',
  guidance: {
    summary: 'Use the built-in `self` behavior when a local event handler should run only for events that start on the bound element.',
    whenToUse: [
      'A container click should clear or close local UI only when the user clicks the container itself.',
      'Child controls inside the container have their own handlers.',
      'The behavior is a local DOM interaction, not shared feature coordination.'
    ],
    whenNotToUse: [
      'The child event should intentionally be handled by an ancestor.',
      'The event represents shared application state or a cross-component command.',
      'The interaction needs keyboard focus management, modal trapping, or global listeners.'
    ]
  },
  source: {
    files: [
      {
        path: 'dismissable-selection.ts',
        language: 'ts',
        contents: `export interface ProjectCard {
  id: string;
  name: string;
  owner: string;
}

export class DismissableSelection {
  selectedCardId: string | null = null;

  readonly cards: ProjectCard[] = [
    { id: 'release', name: 'Release readiness', owner: 'Platform' },
    { id: 'docs', name: 'Docs refresh', owner: 'Education' },
    { id: 'a11y', name: 'Accessibility pass', owner: 'Design systems' }
  ];

  selectCard(cardId: string): void {
    this.selectedCardId = cardId;
  }

  clearSelection(): void {
    this.selectedCardId = null;
  }

  isSelected(cardId: string): boolean {
    return this.selectedCardId === cardId;
  }
}
`
      },
      {
        path: 'dismissable-selection.html',
        language: 'html',
        contents: `<section click.trigger="clearSelection() & self" aria-label="Project cards">
  <article repeat.for="card of cards; key.bind: card.id">
    <h2>\${card.name}</h2>
    <p>\${card.owner}</p>
    <button
      type="button"
      click.trigger="selectCard(card.id)"
      aria-pressed.attr="isSelected(card.id)">
      \${isSelected(card.id) ? 'Selected' : 'Select'}
    </button>
  </article>

  <p if.bind="selectedCardId">Selected card: \${selectedCardId}</p>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The container event is a local affordance for clearing or dismissing UI.'
      },
      {
        summary: 'Child controls should keep their own event handlers.'
      },
      {
        summary: 'No global click listener or shared state service is needed.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep `self` for local event filtering only.',
        action: 'Use it when event origin matters; do not use it to hide unclear ownership between components.'
      },
      {
        summary: 'Move shared coordination into an injected service.',
        action: 'When several components need the same selection or command state, put that state behind an Aurelia DI service and let templates observe it.'
      },
      {
        summary: 'Add keyboard behavior explicitly when dismissal becomes modal-like.',
        action: 'If escape keys, focus return, or focus trapping matter, model those browser interactions directly instead of relying only on pointer events.'
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
        title: 'Binding Behaviors',
        url: 'https://docs.aurelia.io/templates/binding-behaviors'
      }
    ]
  }
};
