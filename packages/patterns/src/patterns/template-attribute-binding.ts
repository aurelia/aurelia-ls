import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateAttributeBindingPattern: AureliaPatternExample = {
  patternId: 'template.attribute-binding',
  title: 'Explicit HTML attribute binding',
  guidance: {
    summary: 'Use `.attr` or the built-in `attr` behavior when the DOM attribute itself must reflect view-model state.',
    whenToUse: [
      'ARIA, data, SVG, or integration attributes must be present as attributes, not only DOM properties.',
      'The attribute is part of platform semantics or another library reads it from markup.',
      'The state is still simple local view-model state.'
    ],
    whenNotToUse: [
      'A normal property binding already gives the browser behavior you need.',
      'The value belongs in a custom attribute or component API.',
      'The state is shared across multiple components and should move behind an injected service.'
    ]
  },
  source: {
    files: [
      {
        path: 'attribute-panel.ts',
        language: 'ts',
        contents: `export class AttributePanel {
  readonly panelId = 'release-details';
  isExpanded = false;

  get panelState(): string {
    return this.isExpanded ? 'open' : 'closed';
  }

  get buttonLabel(): string {
    return this.isExpanded ? 'Hide details' : 'Show details';
  }

  togglePanel(): void {
    this.isExpanded = !this.isExpanded;
  }
}
`
      },
      {
        path: 'attribute-panel.html',
        language: 'html',
        contents: `<section>
  <button
    type="button"
    click.trigger="togglePanel()"
    aria-expanded.attr="isExpanded"
    aria-controls.attr="panelId"
    data-state.bind="panelState & attr">
    \${buttonLabel}
  </button>

  <article id.bind="panelId" if.bind="isExpanded" data-state.attr="panelState">
    <h2>Release details</h2>
    <p>This panel is \${panelState}.</p>
  </article>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The browser or another consumer needs the attribute value itself.'
      },
      {
        summary: 'The attribute value can be derived from simple view-model state.'
      },
      {
        summary: 'This is not trying to create a reusable component contract.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Prefer ordinary property binding first.',
        action: 'Use `.attr` only for attributes whose DOM-attribute presence or string value matters, such as ARIA, data attributes, or SVG attributes.'
      },
      {
        summary: 'Keep attribute formatting near the state that owns it.',
        action: 'Use a getter for repeated or derived attribute values so templates stay readable.'
      },
      {
        summary: 'Promote repeated attribute policy into a custom attribute later.',
        action: 'When many components repeat the same attribute behavior, move it into a focused custom attribute or presenter component.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Attribute Binding',
        url: 'https://docs.aurelia.io/templates/template-syntax/attribute-binding'
      },
      {
        title: 'Binding Behaviors',
        url: 'https://docs.aurelia.io/templates/binding-behaviors'
      }
    ]
  }
};
