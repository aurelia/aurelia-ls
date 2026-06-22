import type { AureliaPatternExample } from '../pattern-contract.js';

export const componentAttributeTransferPattern: AureliaPatternExample = {
  patternId: 'component.attribute-transfer',
  title: 'Native attribute transfer component',
  guidance: {
    summary: 'Use attribute capture and `$attrs` transfer when a wrapper component should forward native attributes to an inner element.',
    whenToUse: [
      'A component wraps a native control but consumers still need attributes such as type, required, autocomplete, or aria labels.',
      'A small explicit set of bindables is not enough because callers need normal native attributes.',
      'The component owns presentation while the caller owns the native control contract.'
    ],
    whenNotToUse: [
      'A few explicit bindables describe the whole component API clearly.',
      'The wrapper needs to reinterpret or validate each incoming option.',
      'The component is a domain workflow rather than a native-control shell.'
    ]
  },
  source: {
    files: [
      {
        path: 'field-shell.ts',
        language: 'ts',
        contents: `import { bindable, customElement } from 'aurelia';

@customElement({
  name: 'field-shell',
  capture: true,
  template: '<label for.bind="inputId">\${label}</label><input id.bind="inputId" ...$attrs>'
})
export class FieldShell {
  @bindable label = '';
  @bindable inputId = '';
}
`
      },
      {
        path: 'profile-contact.ts',
        language: 'ts',
        contents: `export class ProfileContact {
  email = '';
}
`
      },
      {
        path: 'profile-contact.html',
        language: 'html',
        contents: `<import from="./field-shell"></import>

<form>
  <field-shell
    label="Email"
    input-id="profile-email"
    type="email"
    value.bind="email"
    autocomplete="email"
    aria-describedby="profile-email-help"
    required>
  </field-shell>

  <p id="profile-email-help">Use the address for account notices.</p>
</form>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The wrapper forwards native attributes without taking ownership of each one.'
      },
      {
        summary: 'The public component API remains the small set of named bindables plus transferred attributes.'
      },
      {
        summary: 'Callers understand they are configuring the inner native element.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Prefer named bindables for semantic component inputs.',
        action: 'Use `$attrs` for native passthrough, not for hiding a vague component API.'
      },
      {
        summary: 'Document which element receives transferred attributes.',
        action: 'Wrapper components should make it clear whether attributes land on an input, button, root element, or another host.'
      },
      {
        summary: 'Escalate to a custom control only when behavior changes.',
        action: 'If the wrapper starts owning parsing, validation, or multi-element state, split that into a more explicit component pattern.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Attribute Transferring',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/introduction/attribute-transferring'
      },
      {
        title: 'Bindable Properties',
        url: 'https://docs.aurelia.io/components/bindable-properties'
      }
    ]
  }
};
