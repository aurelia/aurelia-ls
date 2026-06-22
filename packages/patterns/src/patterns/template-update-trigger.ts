import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateUpdateTriggerPattern: AureliaPatternExample = {
  patternId: 'template.update-trigger',
  title: 'Blur-updated input binding',
  guidance: {
    summary: 'Use `updateTrigger` when an input should update view-model state on specific DOM events such as blur or paste.',
    whenToUse: [
      'Typing should not commit draft state until the user leaves the field or pastes a value.',
      'The control still uses native input semantics and local form state.',
      'The interaction is timing policy, not validation policy.'
    ],
    whenNotToUse: [
      'Every keystroke must update state immediately.',
      'The problem is rate-limiting expensive work rather than choosing commit events.',
      'The form needs validation-plugin rules or remote availability checks in the same slice.'
    ]
  },
  source: {
    files: [
      {
        path: 'email-draft.ts',
        language: 'ts',
        contents: `export class EmailDraft {
  draft = {
    email: '',
    notes: ''
  };

  lastSavedEmail = '';

  get hasEmailChanged(): boolean {
    return this.draft.email.trim() !== this.lastSavedEmail;
  }

  saveEmail(): void {
    this.lastSavedEmail = this.draft.email.trim();
  }
}
`
      },
      {
        path: 'email-draft.html',
        language: 'html',
        contents: `<form submit.trigger="saveEmail()">
  <label for="contact-email">Contact email</label>
  <input
    id="contact-email"
    type="email"
    value.bind="draft.email & updateTrigger:'blur':'paste'"
    autocomplete="email"
  >

  <label for="contact-notes">Notes</label>
  <textarea id="contact-notes" value.bind="draft.notes"></textarea>

  <p if.bind="hasEmailChanged">Email will be saved after review.</p>
  <button type="submit" disabled.bind="!hasEmailChanged">Save email</button>
</form>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The view model should receive the field value only on blur or paste.'
      },
      {
        summary: 'Native browser input behavior remains enough for this field.'
      },
      {
        summary: 'The submit handler can read the committed view-model value.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use immediate updates for live feedback.',
        action: 'Do not use `updateTrigger` when previews, masks, or submit eligibility must react to each keystroke.'
      },
      {
        summary: 'Use debounce or throttle for rate limiting.',
        action: 'Choose those behaviors when the event frequency is the problem, rather than which event commits the value.'
      },
      {
        summary: 'Keep validation policy separate.',
        action: 'Add validation rules and error rendering in a validation-focused pass instead of mixing timing and validation concerns.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Binding Behaviors',
        url: 'https://docs.aurelia.io/templates/binding-behaviors'
      },
      {
        title: 'Forms',
        url: 'https://docs.aurelia.io/templates/forms'
      }
    ]
  }
};
