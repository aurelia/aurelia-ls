import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateFocusControlPattern: AureliaPatternExample = {
  patternId: 'template.focus-control',
  title: 'Open panel focus control',
  guidance: {
    summary: 'Use Aurelia focus.to-view when a component opens UI and should move focus to a newly rendered control.',
    whenToUse: [
      'Opening a search panel, dialog-like region, or inline editor should focus the first useful input.',
      'Focus should follow view-model state into the view without blur changing that state.',
      'The focused element is conditionally rendered with ordinary template bindings.'
    ],
    whenNotToUse: [
      'Blur should write back into the same state property; use two-way focus deliberately for that case.',
      'The target element is not naturally focusable and has not been given a valid tabindex.',
      'The behavior needs custom keyboard trapping, roving tabindex, or full dialog focus management.'
    ]
  },
  source: {
    files: [
      {
        path: 'search-panel.ts',
        language: 'ts',
        contents: `export class SearchPanel {
  isOpen = false;
  search = '';

  openSearch(): void {
    this.isOpen = true;
  }

  closeSearch(): void {
    this.isOpen = false;
    this.search = '';
  }

  clearSearch(): void {
    this.search = '';
  }
}
`
      },
      {
        path: 'search-panel.html',
        language: 'html',
        contents: `<section>
  <button type="button" click.trigger="openSearch()" if.bind="!isOpen">
    Open search
  </button>

  <form if.bind="isOpen" submit.trigger="closeSearch()">
    <label for="panel-search">Search records</label>
    <input
      id="panel-search"
      value.bind="search"
      focus.to-view="isOpen"
      placeholder="Type a search term"
    >

    <button type="button" click.trigger="clearSearch()" disabled.bind="search.length === 0">
      Clear
    </button>
    <button type="submit">Done</button>
  </form>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'Opening the panel should focus the input, but blurring the input should not close the panel.'
      },
      {
        summary: 'The target is a native input, so it is focusable without extra tabindex work.'
      },
      {
        summary: 'The panel is local component UI state, not router, validation, or global application state.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use two-way focus only when blur should update state.',
        action: 'Prefer `focus.to-view` for open-and-focus flows; use `focus.bind` or `focus.two-way` only when focus and blur are part of the state model.'
      },
      {
        summary: 'Make non-input targets focusable before binding focus to them.',
        action: 'Add the correct native semantics or `tabindex=\"0\"` when the focused target is not an input, button, link, or other naturally focusable element.'
      },
      {
        summary: 'Use a dedicated accessibility pattern for complex focus management.',
        action: 'Treat focus traps, roving tabindex, escape-key behavior, and modal dialog focus restoration as separate patterns.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'focus custom attribute',
        url: 'https://docs.aurelia.io/templates/focus'
      },
      {
        title: 'Conditional Rendering',
        url: 'https://docs.aurelia.io/templates/conditional-rendering'
      }
    ]
  }
};
