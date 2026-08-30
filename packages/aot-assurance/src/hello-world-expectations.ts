import assert from 'node:assert/strict';

import type {
  AotBuildEvidence,
  HelloWorldCardObservation,
  HelloWorldApplicationObservation,
  HelloWorldObservation,
  LaneTranscript,
} from './contract.js';

const blue = card(
  'Blue kettle',
  'Compact kettle with a quiet boil setting.',
  'BK-001',
  '4 in stock',
);
const morning = card(
  'Morning mug',
  'Ceramic mug with a good hand feel.',
  'MG-204',
  'Out of stock',
);
const travel = card(
  'Travel roaster',
  'Portable coffee roaster for small batches.',
  'TR-118',
  '2 in stock',
);

export function assertHelloWorldBuildEvidence(evidence: AotBuildEvidence): void {
  assert.deepEqual(
    evidence.artifacts.map((artifact) => artifact.definitionName).sort(),
    ['my-app', 'product-card', 'stock-badge'],
    'hello-world did not emit its exact custom-element template cohort',
  );
}

export function assertHelloWorldExpectations(transcript: LaneTranscript): void {
  assert.equal(transcript.probes, null, `${transcript.lane} hello-world unexpectedly installed G0 runtime probes`);
  assert.deepEqual(transcript.semantic.console, [], `${transcript.lane} hello-world wrote to the browser console`);
  assert.deepEqual(transcript.semantic.pageErrors, [], `${transcript.lane} hello-world raised a page error`);
  assert.equal(transcript.semantic.teardownEvents, null);

  assertObservation(
    observation(transcript, 'initial'),
    '',
    false,
    [selected(blue), morning, travel],
    preview('Blue kettle', 'Compact kettle with a quiet boil setting.', '4 items ready', '4 available', 'fresh'),
    null,
  );
  assertObservation(
    observation(transcript, 'search'),
    'coffee',
    false,
    [morning, travel],
    preview('Blue kettle', 'Compact kettle with a quiet boil setting.', '4 items ready', '4 available', 'fresh'),
    null,
  );
  assertObservation(
    observation(transcript, 'selection'),
    'coffee',
    false,
    [morning, selected(travel)],
    preview('Travel roaster', 'Portable coffee roaster for small batches.', '2 items ready', '2 available', 'warning'),
    null,
  );
  assertObservation(
    observation(transcript, 'stock-filter'),
    'coffee',
    true,
    [selected(travel)],
    preview('Travel roaster', 'Portable coffee roaster for small batches.', '2 items ready', '2 available', 'warning'),
    null,
  );
  assertObservation(
    observation(transcript, 'empty'),
    'mug',
    true,
    [],
    preview('Travel roaster', 'Portable coffee roaster for small batches.', '2 items ready', '2 available', 'warning'),
    'No products match mug.',
  );
  assertObservation(
    observation(transcript, 'clear'),
    '',
    true,
    [blue, selected(travel)],
    preview('Travel roaster', 'Portable coffee roaster for small batches.', '2 items ready', '2 available', 'warning'),
    null,
  );
  assertObservation(
    observation(transcript, 'restore'),
    '',
    false,
    [blue, morning, selected(travel)],
    preview('Travel roaster', 'Portable coffee roaster for small batches.', '2 items ready', '2 available', 'warning'),
    null,
  );
  assertObservation(
    observation(transcript, 'zero-stock-selection'),
    '',
    false,
    [blue, selected(morning), travel],
    preview('Morning mug', 'Ceramic mug with a good hand feel.', 'sold out', 'Sold out', 'empty'),
    null,
  );
}

function assertObservation(
  value: HelloWorldApplicationObservation,
  searchValue: string,
  onlyInStock: boolean,
  cards: readonly HelloWorldCardObservation[],
  previewValue: HelloWorldObservation['preview'],
  emptyMessage: string | null,
): void {
  const model = value.model;
  assert.equal(model.heading, 'Aurelia IDE playground');
  assert.equal(model.searchValue, searchValue);
  assert.equal(model.onlyInStock, onlyInStock);
  assert.equal(model.headerProgress, '40%');
  assert.deepEqual(model.preview, previewValue);
  assert.deepEqual(model.cards, cards);
  assert.equal(model.emptyMessage, emptyMessage);
  assert.equal(value.live.find((entry) => entry.id === 'search')?.value, searchValue);
  assert.equal(value.live.find((entry) => entry.id === 'only-in-stock')?.checked, onlyInStock);
}

function observation(transcript: LaneTranscript, label: string): HelloWorldApplicationObservation {
  const checkpoint = transcript.semantic.checkpoints.find((candidate) => candidate.label === label);
  assert.ok(checkpoint != null, `${transcript.lane} hello-world has no ${label} checkpoint`);
  assert.equal(
    checkpoint.observation.kind,
    'hello-world',
    `${transcript.lane} ${label} is not a hello-world observation`,
  );
  return checkpoint.observation;
}

function preview(
  name: string,
  description: string,
  stockLabel: string,
  badgeText: string,
  tone: 'fresh' | 'warning' | 'empty',
): HelloWorldObservation['preview'] {
  return {
    classes: [tone, `hint-${tone}`, 'preview'].sort(),
    title: `${name} (${tone})`,
    displayTone: tone,
    name,
    description,
    stockLabel,
    badgeClasses: [tone, 'stock-badge'].sort(),
    badgeText,
  };
}

function card(
  label: string,
  description: string,
  sku: string,
  stockText: string,
): HelloWorldCardObservation {
  return {
    label,
    description,
    sku,
    stockText,
    selected: false,
    progressWidth: '40%',
    svgLabel: 'Progress 40%',
    svgNamespace: 'http://www.w3.org/2000/svg',
    circleStrokeWidth: '40px',
    foreignObjectWidth: '40%',
    foreignObjectHtmlNamespace: 'http://www.w3.org/1999/xhtml',
  };
}

function selected(value: HelloWorldCardObservation): HelloWorldCardObservation {
  return { ...value, selected: true };
}
