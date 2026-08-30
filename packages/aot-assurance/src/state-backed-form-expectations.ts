import assert from 'node:assert/strict';

import type {
  AotBuildEvidence,
  LaneTranscript,
  StateBackedFormApplicationObservation,
  StateBackedFormObservation,
} from './contract.js';

const checkpointLabels = [
  'initial-request-1',
  'missing-name',
  'missing-email',
  'edited-and-submitted',
  'request-2',
  'restored-request-1',
] as const;

const requestOptions = ['request-1', 'request-2'];
const primaryTopicOptions = ['Choose...', 'Hardware', 'Billing', 'Support'];
const assigneeOptions = ['Unassigned', 'Ada', 'Grace'];
const topicOptions = ['Hardware', 'Billing', 'Support'];

export function assertStateBackedFormBuildEvidence(evidence: AotBuildEvidence): void {
  assert.deepEqual(
    evidence.artifacts.map((artifact) => artifact.definitionName).sort(),
    ['app-root', 'field-shell', 'state-backed-form'],
    'state-backed form did not emit its exact custom-element cohort',
  );
  assert.equal(evidence.runtimeConfiguration.modules.length, 1);
  // Runtime-spread closure currently selects conservative registration groups. This functional golden deliberately
  // leaves their breadth provisional so a later exact-leaf projection does not become an assurance regression.
}

export function assertStateBackedFormExpectations(transcript: LaneTranscript): void {
  assert.equal(transcript.probes, null, `${transcript.lane} state-backed form unexpectedly installed G0 probes`);
  assert.deepEqual(transcript.semantic.console, [], `${transcript.lane} state-backed form wrote to the browser console`);
  assert.deepEqual(transcript.semantic.pageErrors, [], `${transcript.lane} state-backed form raised a page error`);
  assert.equal(transcript.semantic.teardownEvents, null);
  assert.deepEqual(transcript.semantic.checkpoints.map((checkpoint) => checkpoint.label), checkpointLabels);

  assertForm(observation(transcript, 'initial-request-1'), formState({
    request: 'request-1',
    name: 'Ada Lovelace',
    email: 'ada.lovelace@example.test',
    formClass: 'form-ready',
    urgent: false,
    contact: 'Email',
    primaryTopic: 'Choose...',
    assignee: 'Unassigned',
    topics: null,
    notes: '',
    submissions: 0,
  }));
  assertForm(observation(transcript, 'missing-name'), formState({
    request: 'request-1',
    name: '',
    email: 'ada.lovelace@example.test',
    formClass: 'form-pending',
    urgent: false,
    contact: 'Email',
    primaryTopic: 'Choose...',
    assignee: 'Unassigned',
    topics: null,
    notes: '',
    submissions: 0,
  }));
  assertForm(observation(transcript, 'missing-email'), formState({
    request: 'request-1',
    name: 'Ada Lovelace',
    email: '',
    formClass: 'form-pending',
    urgent: false,
    contact: 'Email',
    primaryTopic: 'Choose...',
    assignee: 'Unassigned',
    topics: null,
    notes: '',
    submissions: 0,
  }));
  const edited = formState({
    request: 'request-1',
    name: 'Augusta King',
    email: 'augusta.king@example.test',
    formClass: 'form-ready',
    urgent: true,
    contact: 'Phone',
    primaryTopic: 'Billing',
    assignee: 'Grace',
    topics: ['Hardware', 'Billing'],
    notes: 'Call after 5pm',
    submissions: 1,
  });
  assertForm(observation(transcript, 'edited-and-submitted'), edited);
  assertForm(observation(transcript, 'request-2'), formState({
    request: 'request-2',
    name: 'Grace Hopper',
    email: 'grace.hopper@example.test',
    formClass: 'form-ready',
    urgent: false,
    contact: 'Email',
    primaryTopic: 'Choose...',
    assignee: 'Unassigned',
    topics: ['Support'],
    notes: '',
    submissions: 1,
  }));
  assertForm(observation(transcript, 'restored-request-1'), edited);
}

interface ExpectedFormState {
  readonly model: Omit<StateBackedFormObservation, 'topics'>;
  readonly topics: {
    readonly options: readonly string[];
    /** Null keeps the known initial-hydration anomaly parity-only instead of ratifying it. */
    readonly selected: readonly string[] | null;
  };
  readonly live: StateBackedFormApplicationObservation['live'];
}

interface FormStateInput {
  readonly request: 'request-1' | 'request-2';
  readonly name: string;
  readonly email: string;
  readonly formClass: 'form-ready' | 'form-pending';
  readonly urgent: boolean;
  readonly contact: 'Email' | 'Phone';
  readonly primaryTopic: 'Choose...' | 'Hardware' | 'Billing' | 'Support';
  readonly assignee: 'Unassigned' | 'Ada' | 'Grace';
  readonly topics: readonly ('Hardware' | 'Billing' | 'Support')[] | null;
  readonly notes: string;
  readonly submissions: number;
}

function formState(input: FormStateInput): ExpectedFormState {
  const requestIndex = requestOptions.indexOf(input.request);
  const primaryIndex = primaryTopicOptions.indexOf(input.primaryTopic);
  const assigneeIndex = assigneeOptions.indexOf(input.assignee);
  const firstTopic = input.topics?.[0] ?? '';
  const firstTopicIndex = topicOptions.indexOf(firstTopic);
  return {
    model: {
      selectedRequest: input.request,
      requestOptions,
      submissionCount: input.submissions,
      formClasses: [input.formClass],
      submitDisabled: input.formClass === 'form-pending',
      fields: [
        {
          label: 'Name',
          labelFor: 'customer-name',
          id: 'customer-name',
          type: 'text',
          value: input.name,
        },
        {
          label: 'Email',
          labelFor: 'email',
          id: 'email',
          type: 'email',
          value: input.email,
        },
      ],
      notes: input.notes,
      urgent: input.urgent,
      contactPreference: [
        { label: 'Email', checked: input.contact === 'Email' },
        { label: 'Phone', checked: input.contact === 'Phone' },
      ],
      primaryTopic: {
        options: primaryTopicOptions,
        selected: [input.primaryTopic],
      },
      assignee: {
        options: assigneeOptions,
        selected: [input.assignee],
      },
    },
    topics: {
      options: topicOptions,
      selected: input.topics,
    },
    live: [
      { id: 'request-selector', value: input.request, selectedIndex: requestIndex },
      { id: 'customer-name', value: input.name },
      { id: 'email', value: input.email },
      { id: 'primary-topic', value: input.primaryTopic, selectedIndex: primaryIndex },
      { id: 'assignee', value: input.assignee, selectedIndex: assigneeIndex },
      ...(input.topics == null
        ? []
        : [{ id: 'topics', value: firstTopic, selectedIndex: firstTopicIndex }]),
      { id: 'notes', value: input.notes },
    ],
  };
}

function assertForm(
  actual: StateBackedFormApplicationObservation,
  expected: ExpectedFormState,
): void {
  const { topics, ...model } = actual.model;
  assert.deepEqual(model, expected.model);
  assert.deepEqual(topics.options, expected.topics.options);
  if (expected.topics.selected != null) {
    assert.deepEqual(topics.selected, expected.topics.selected);
  }
  assert.deepEqual(
    expected.topics.selected == null
      ? actual.live.filter((entry) => entry.id !== 'topics')
      : actual.live,
    expected.live,
  );
}

function observation(
  transcript: LaneTranscript,
  label: string,
): StateBackedFormApplicationObservation {
  const checkpoint = transcript.semantic.checkpoints.find((candidate) => candidate.label === label);
  assert.ok(checkpoint != null, `${transcript.lane} state-backed form has no ${label} checkpoint`);
  assert.equal(
    checkpoint.observation.kind,
    'state-backed-form',
    `${transcript.lane} ${label} is not a state-backed-form observation`,
  );
  return checkpoint.observation;
}
