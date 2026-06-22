import type { AureliaPatternExample } from '../pattern-contract.js';

export const formChoiceControlsPattern: AureliaPatternExample = {
  patternId: 'form.choice-controls',
  title: 'Native choice controls',
  guidance: {
    summary: 'Use native select, radio, and checkbox controls with value.bind, model.bind, and checked.bind for local choice state.',
    whenToUse: [
      'A form needs primitive choice values such as ids, slugs, or enum-like strings.',
      'Checkboxes should add and remove values from a local array.',
      'Radio buttons or a select should hold one selected value.'
    ],
    whenNotToUse: [
      'Choices are objects that need custom equality or matcher.bind.',
      'The control set needs select-all behavior, Sets, Maps, virtualization, or very large lists.',
      'The form needs validation-plugin rules, dynamic schema rendering, or submit behavior in the same pattern.'
    ]
  },
  source: {
    files: [
      {
        path: 'choice-controls-form.ts',
        language: 'ts',
        contents: `type ChannelId = 'email' | 'sms' | 'push';
type RegionId = 'americas' | 'emea' | 'apac';
type DigestId = 'daily' | 'weekly' | 'monthly';

interface ChoiceOption<TValue extends string> {
  id: TValue;
  label: string;
}

export class ChoiceControlsForm {
  readonly channels: readonly ChoiceOption<ChannelId>[] = [
    { id: 'email', label: 'Email' },
    { id: 'sms', label: 'SMS' },
    { id: 'push', label: 'Push notification' }
  ];

  readonly regions: readonly ChoiceOption<RegionId>[] = [
    { id: 'americas', label: 'Americas' },
    { id: 'emea', label: 'Europe, Middle East, and Africa' },
    { id: 'apac', label: 'Asia Pacific' }
  ];

  readonly digests: readonly ChoiceOption<DigestId>[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' }
  ];

  form = {
    channelIds: ['email'] as ChannelId[],
    region: 'emea' as RegionId,
    digest: 'weekly' as DigestId
  };

  get selectedChannelLabels(): readonly string[] {
    return this.channels
      .filter((channel) => this.form.channelIds.includes(channel.id))
      .map((channel) => channel.label);
  }

  get selectedRegionLabel(): string {
    return this.regions.find((region) => region.id === this.form.region)?.label ?? 'Unknown region';
  }

  get selectedDigestLabel(): string {
    return this.digests.find((digest) => digest.id === this.form.digest)?.label ?? 'Unknown cadence';
  }
}
`
      },
      {
        path: 'choice-controls-form.html',
        language: 'html',
        contents: `<form>
  <fieldset>
    <legend>Notification channels</legend>
    <label repeat.for="channel of channels; key.bind: channel.id">
      <input
        type="checkbox"
        model.bind="channel.id"
        checked.bind="form.channelIds"
      >
      \${channel.label}
    </label>
  </fieldset>

  <label for="region">Region</label>
  <select id="region" value.bind="form.region">
    <option repeat.for="region of regions; key.bind: region.id" value.bind="region.id">
      \${region.label}
    </option>
  </select>

  <fieldset>
    <legend>Digest frequency</legend>
    <label repeat.for="digest of digests; key.bind: digest.id">
      <input
        type="radio"
        name="digest"
        model.bind="digest.id"
        checked.bind="form.digest"
      >
      \${digest.label}
    </label>
  </fieldset>

  <section if.bind="selectedChannelLabels.length">
    <h2>Summary</h2>
    <p>Channels: \${selectedChannelLabels.join(', ')}</p>
    <p>Region: \${selectedRegionLabel}</p>
    <p>Digest: \${selectedDigestLabel}</p>
  </section>
</form>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'Choice values are primitive ids, so strict equality is enough.'
      },
      {
        summary: 'Checkbox selections belong in a local array owned by this form component.'
      },
      {
        summary: 'This pattern focuses on choosing values, not submitting or validating the form.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use matcher.bind only when primitive ids are not enough.',
        action: 'If options are objects or reloaded instances, add a matcher that compares stable ids instead of relying on object identity.'
      },
      {
        summary: 'Promote to Sets, Maps, or select-all behavior only for larger selection problems.',
        action: 'Keep small choice forms on arrays and primitive values; use Set/Map patterns when performance or nested permissions require them.'
      },
      {
        summary: 'Layer submit and validation behavior separately.',
        action: 'Combine this with native submit or validation-plugin patterns only after the choice-control state itself is clear.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Collection-Based Form Controls',
        url: 'https://docs.aurelia.io/templates/forms/collections'
      },
      {
        title: 'Forms and Input Handling',
        url: 'https://docs.aurelia.io/templates/forms'
      }
    ]
  }
};
