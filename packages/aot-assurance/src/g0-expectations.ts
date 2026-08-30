import assert from 'node:assert/strict';

import type {
  DomNodeTranscript,
  G0ApplicationObservation,
  LaneTranscript,
  LiveElementTranscript,
} from './contract.js';

interface G0Model {
  readonly message: string;
  readonly count: number;
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly items: readonly string[];
  readonly hostRefId: string | null;
}

export function assertG0Expectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.console, [], `${transcript.lane} wrote to the browser console`);
  assert.deepEqual(transcript.semantic.pageErrors, [], `${transcript.lane} raised a page error`);

  const initial = observation(transcript, 'initial');
  const form = observation(transcript, 'form-writeback');
  const checked = observation(transcript, 'checked-class-style');
  const event = observation(transcript, 'event-let');
  const projected = observation(transcript, 'child-event-projection');
  const final = observation(transcript, 'structural-final');

  assert.deepEqual(model(initial), {
    message: 'alpha',
    count: 1,
    enabled: true,
    visible: true,
    items: ['A', 'B'],
    hostRefId: 'surface',
  });
  assert.equal(live(initial, 'name').value, 'alpha');
  assert.equal(live(initial, 'enabled').checked, true);
  assert.equal(textById(initial.dom, 'doubled'), '2');
  assert.equal(initial.browserStructure.parentId, 'browser-recovery');
  assert.equal(initial.browserStructure.nextElementId, 'foster-table');
  assert.equal(initial.svgNamespace, 'http://www.w3.org/2000/svg');

  assert.equal(model(form).message, 'bravo');
  assert.equal(textById(form.dom, 'headline'), 'bravo');
  assert.equal(live(form, 'name').value, 'bravo');

  assert.equal(model(checked).enabled, false);
  assert.equal(attributeById(checked.dom, 'surface', 'class'), 'surface');
  assert.match(attributeById(checked.dom, 'surface', 'style') ?? '', /maroon/);
  assert.equal(live(checked, 'enabled').checked, false);

  assert.equal(model(event).count, 2);
  assert.equal(textById(event.dom, 'doubled'), '4');
  assert.ok(event.events.includes('increment:2'));

  assert.equal(model(projected).message, 'child:bravo');
  assert.equal(textById(projected.dom, 'projection'), 'child:bravo:2');
  assert.equal(live(projected, 'name').value, 'child:bravo');
  assert.ok(projected.events.includes('child:bravo'));

  assert.deepEqual(model(final), {
    message: 'child:bravo',
    count: 2,
    enabled: false,
    visible: false,
    items: ['A', 'B', 'C'],
    hostRefId: 'surface',
  });
  assert.equal(findById(final.dom, 'conditional'), undefined);
  assert.deepEqual(textsByClass(final.dom, 'item'), ['A', 'B', 'C']);
  assert.ok(final.events.includes('toggle:false'));
  assert.ok(final.events.includes('add:C'));
  assert.ok(transcript.semantic.teardownEvents != null, `${transcript.lane} has no teardown transcript`);
  assert.ok(transcript.semantic.teardownEvents.includes('detaching'));
  assert.ok(transcript.semantic.teardownEvents.includes('unbinding'));
}

function observation(transcript: LaneTranscript, label: string): G0ApplicationObservation {
  const checkpoint = transcript.semantic.checkpoints.find(candidate => candidate.label === label);
  assert.ok(checkpoint !== undefined, `${transcript.lane} has no ${label} checkpoint`);
  assert.equal(checkpoint.observation.kind, 'g0', `${transcript.lane} ${label} is not a G0 observation`);
  return checkpoint.observation;
}

function model(observationValue: G0ApplicationObservation): G0Model {
  assert.equal(typeof observationValue.model, 'object');
  assert.notEqual(observationValue.model, null);
  return observationValue.model as G0Model;
}

function live(observationValue: G0ApplicationObservation, id: string): LiveElementTranscript {
  const value = observationValue.live.find(candidate => candidate.id === id);
  assert.ok(value !== undefined, `no live-element observation for #${id}`);
  return value;
}

function findById(nodes: readonly DomNodeTranscript[], id: string): Extract<DomNodeTranscript, { kind: 'element' }> | undefined {
  for (const node of nodes) {
    if (node.kind !== 'element') continue;
    if (node.attributes.some(attribute => attribute.name === 'id' && attribute.value === id)) return node;
    const nested = findById(node.children, id);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function attributeById(nodes: readonly DomNodeTranscript[], id: string, name: string): string | undefined {
  return findById(nodes, id)?.attributes.find(attribute => attribute.name === name)?.value;
}

function textById(nodes: readonly DomNodeTranscript[], id: string): string {
  const node = findById(nodes, id);
  assert.ok(node !== undefined, `#${id} is absent`);
  return text(node);
}

function text(node: DomNodeTranscript): string {
  if (node.kind === 'text') return node.value;
  if (node.kind === 'comment') return '';
  return node.children.map(text).join('');
}

function textsByClass(nodes: readonly DomNodeTranscript[], className: string): readonly string[] {
  const values: string[] = [];
  visit(nodes, node => {
    const classes = node.attributes.find(attribute => attribute.name === 'class')?.value.split(/\s+/) ?? [];
    if (classes.includes(className)) values.push(text(node));
  });
  return values;
}

function visit(
  nodes: readonly DomNodeTranscript[],
  callback: (node: Extract<DomNodeTranscript, { kind: 'element' }>) => void,
): void {
  for (const node of nodes) {
    if (node.kind !== 'element') continue;
    callback(node);
    visit(node.children, callback);
  }
}
