import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateDomRefPattern: AureliaPatternExample = {
  patternId: 'template.dom-ref',
  title: 'Template DOM element reference',
  guidance: {
    summary: 'Use a plain template ref when a component needs a typed DOM element handle for small browser APIs such as focus or selection.',
    whenToUse: [
      'A component needs to call a narrow DOM method on an element it renders itself.',
      'The element reference is local to the component and does not model application data flow.',
      'Bindings still own the data state, while the ref owns only the imperative browser action.'
    ],
    whenNotToUse: [
      'The same result can be expressed with an ordinary binding or the built-in focus custom attribute.',
      'The parent wants to coordinate child component behavior or shared feature state.',
      'The code needs framework controller access or reusable DOM behavior across many elements.'
    ]
  },
  source: {
    files: [
      {
        path: 'section-jump.ts',
        language: 'ts',
        contents: `interface HelpSection {
  id: string;
  title: string;
}

export class SectionJump {
  searchInput!: HTMLInputElement;
  query = '';

  readonly sections: readonly HelpSection[] = [
    { id: 'overview', title: 'Overview' },
    { id: 'settings', title: 'Settings' },
    { id: 'billing', title: 'Billing' }
  ];

  get filteredSections(): readonly HelpSection[] {
    const query = this.query.trim().toLowerCase();
    if (query.length === 0) {
      return this.sections;
    }
    return this.sections.filter((section) => section.title.toLowerCase().includes(query));
  }

  focusSearch(): void {
    this.searchInput.focus();
    this.searchInput.select();
  }

  clearSearch(): void {
    this.query = '';
    this.focusSearch();
  }
}
`
      },
      {
        path: 'section-jump.html',
        language: 'html',
        contents: `<section>
  <header>
    <h1>Help sections</h1>
    <button type="button" click.trigger="focusSearch()">Focus search</button>
  </header>

  <label for="section-search">Filter sections</label>
  <input
    id="section-search"
    ref="searchInput"
    value.bind="query"
    placeholder="Search help"
  >

  <button type="button" click.trigger="clearSearch()" disabled.bind="query.length === 0">
    Clear
  </button>

  <p if.bind="filteredSections.length === 0" role="status">No matching sections.</p>

  <ul>
    <li repeat.for="section of filteredSections; key.bind: section.id">
      <span>\${section.title}</span>
    </li>
  </ul>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The ref target is rendered by this component before any button can call the ref-backed method.'
      },
      {
        summary: 'The ref is only used for browser element APIs; query and list filtering remain ordinary bindable state.'
      },
      {
        summary: 'The element is a native input with stable focus and selection methods.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep refs local and imperative.',
        action: 'Use refs for narrow DOM APIs such as focus, select, scrollIntoView, or measurement; keep application state in view-model properties or injected services.'
      },
      {
        summary: 'Prefer dedicated bindings when Aurelia already has one.',
        action: 'Use the built-in focus custom attribute for state-driven focus flows; use a DOM ref when an explicit user command needs to call a browser method.'
      },
      {
        summary: 'Do not use advanced refs as a default communication channel.',
        action: 'Avoid reaching through component.ref, custom-attribute.ref, or controller.ref unless you are intentionally building a narrow integration boundary.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Template References',
        url: 'https://docs.aurelia.io/templates/template-syntax/template-references'
      },
      {
        title: 'focus custom attribute',
        url: 'https://docs.aurelia.io/templates/focus'
      }
    ]
  }
};
