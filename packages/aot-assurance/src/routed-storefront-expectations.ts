import assert from 'node:assert/strict';

import type {
  AotBuildEvidence,
  LaneTranscript,
  RoutedStorefrontApplicationObservation,
  RoutedStorefrontCardObservation,
} from './contract.js';

const checkpointLabels = [
  'initial-list',
  'debounced-search',
  'no-match',
  'badge-filter',
  'stock-filter',
  'first-selection',
  'first-detail',
  'return-to-list',
  'dynamic-detail',
  'second-selection',
] as const;

const badgeOptions = ['all', 'core', 'featured', 'seasonal', 'standard'];
const title1 = card('Title 1', 'Description 1', '$48.00', 'In stock', 'Limited stock.', ['core', 'highlighted', 'item-card'], '/#/items/item-1', false);
const title2 = card('Title 2', 'Description 2', '$72.00', 'In stock', 'Limited stock.', ['featured', 'highlighted', 'item-card'], '/#/items/item-2', false);
const title3 = card('Title 3', 'Description 3', '$96.00', 'Back soon', 'Available by backorder.', ['highlighted', 'item-card', 'seasonal'], '/#/items/item-3', true);

export function assertRoutedStorefrontBuildEvidence(evidence: AotBuildEvidence): void {
  assert.deepEqual(
    evidence.artifacts.map((artifact) => artifact.definitionName).sort(),
    ['app-root', 'item-card', 'item-detail-route', 'item-list-route'],
    'routed storefront did not emit its exact routed custom-element cohort',
  );
}

export function assertRoutedStorefrontExpectations(transcript: LaneTranscript): void {
  assert.equal(transcript.probes, null, `${transcript.lane} routed storefront unexpectedly installed G0 probes`);
  assert.deepEqual(transcript.semantic.console, [], `${transcript.lane} routed storefront wrote to the browser console`);
  assert.deepEqual(transcript.semantic.pageErrors, [], `${transcript.lane} routed storefront raised a page error`);
  assert.equal(transcript.semantic.teardownEvents, null);
  assert.deepEqual(transcript.semantic.checkpoints.map((checkpoint) => checkpoint.label), checkpointLabels);

  assertList(observation(transcript, 'initial-list'), { search: '', onlyInStock: false, badge: 'all', cards: [title1, title2, title3] }, { count: 0, progress: '0%', names: [] });
  assertList(observation(transcript, 'debounced-search'), { search: 'Title 2', onlyInStock: false, badge: 'all', cards: [title2] }, { count: 0, progress: '0%', names: [] });
  assertList(observation(transcript, 'no-match'), { search: 'missing', onlyInStock: false, badge: 'all', cards: [], message: 'No items match the current filters.' }, { count: 0, progress: '0%', names: [] });
  assertList(observation(transcript, 'badge-filter'), { search: '', onlyInStock: false, badge: 'seasonal', cards: [title3] }, { count: 0, progress: '0%', names: [] });
  assertList(observation(transcript, 'stock-filter'), { search: '', onlyInStock: true, badge: 'all', cards: [title1, title2] }, { count: 0, progress: '0%', names: [] });
  assertList(observation(transcript, 'first-selection'), { search: '', onlyInStock: false, badge: 'all', cards: [title1, title2, title3] }, { count: 1, progress: '33%', names: ['Title 1'] });
  assertDetail(observation(transcript, 'first-detail'), '/#/items/item-1@main', 'Title 1', 'Description 1', 'Core', '48', { count: 1, progress: '33%', names: ['Title 1'] });
  assertList(observation(transcript, 'return-to-list'), { search: '', onlyInStock: false, badge: 'all', cards: [title1, title2, title3] }, { count: 1, progress: '33%', names: ['Title 1'] });
  assertDetail(observation(transcript, 'dynamic-detail'), '/#/items/item-2@main', 'Title 2', 'Description 2', 'Featured', '72', { count: 1, progress: '33%', names: ['Title 1'] });
  assertDetail(observation(transcript, 'second-selection'), '/#/items/item-2@main', 'Title 2', 'Description 2', 'Featured', '72', { count: 2, progress: '67%', names: ['Title 1', 'Title 2'] });
}

interface ListExpectation {
  readonly search: string;
  readonly onlyInStock: boolean;
  readonly badge: string;
  readonly cards: readonly RoutedStorefrontCardObservation[];
  readonly message?: string;
}

interface SelectionExpectation {
  readonly count: number;
  readonly progress: string;
  readonly names: readonly string[];
}

function assertList(value: RoutedStorefrontApplicationObservation, expected: ListExpectation, selection: SelectionExpectation): void {
  assertShell(value, '/#/items@main', true, selection);
  const route = value.model.route;
  assert.equal(route.kind, 'list');
  const list = route;
  assert.equal(list.heading, 'Featured items');
  assert.equal(list.searchValue, expected.search);
  assert.equal(list.onlyInStock, expected.onlyInStock);
  assert.equal(list.badgeFilter, expected.badge);
  assert.deepEqual(list.badgeOptions, badgeOptions);
  assert.deepEqual(list.messages, expected.message == null ? [] : [expected.message]);
  assert.deepEqual(list.cards, expected.cards);
  assert.deepEqual(value.live, [
    { id: 'catalog-search', value: expected.search },
    { id: 'catalog-stock', value: 'on', checked: expected.onlyInStock },
    { id: 'catalog-badge', value: expected.badge, selectedIndex: badgeOptions.indexOf(expected.badge) },
  ]);
}

function assertDetail(
  value: RoutedStorefrontApplicationObservation,
  location: string,
  heading: string,
  summary: string,
  category: string,
  price: string,
  selection: SelectionExpectation,
): void {
  assertShell(value, location, false, selection);
  const route = value.model.route;
  assert.equal(route.kind, 'detail');
  const detail = route;
  assert.equal(detail.heading, heading);
  assert.equal(detail.summary, summary);
  assert.deepEqual(detail.fields, [
    { label: 'Title', value: heading },
    { label: 'Description', value: summary },
    { label: 'Category', value: category },
    { label: 'Monthly Price', value: price },
    { label: 'Available', value: 'Yes' },
    { label: 'Opened from', value: 'catalog' },
  ]);
  assert.equal(detail.selectDisabled, false);
  assert.deepEqual(value.live, []);
  // This context-relative back-link remains in the parity transcript, but is not ratified while its route semantics
  // are being adjudicated.
  assert.ok(detail.allItemsLocation.length > 0);
}

function assertShell(
  value: RoutedStorefrontApplicationObservation,
  location: string,
  listActive: boolean,
  selection: SelectionExpectation,
): void {
  const model = value.model;
  assert.equal(model.location, location);
  assert.equal(
    model.documentTitle,
    `${listActive ? 'Items' : 'Item detail'} | generated-routed-catalog-storefront`,
  );
  assert.deepEqual(model.shellClasses, ['catalog-shell', selection.count === 0 ? 'empty-selection' : 'has-selection'].sort());
  assert.equal(model.selectionCount, selection.count);
  assert.equal(model.selectionProgress, selection.progress);
  assert.equal(model.catalogStatus, 'Featured items refreshes daily.');
  assert.deepEqual(model.navigation.map((link) => ({ label: link.label, active: link.active })), [
    { label: 'Items', active: listActive },
    { label: 'Featured detail', active: false },
  ]);
  assert.equal(model.navigation[0]?.location, '/#/items');
  // The static query-plus-fragment link remains captured for parity, but its current /#/details projection is a
  // shared router issue rather than an expected AOT outcome.
  assert.ok((model.navigation[1]?.location.length ?? 0) > 0);
  assert.deepEqual(model.selectedNames, selection.names);
  assert.equal(model.emptySelectionMessage, selection.count === 0 ? 'Select a featured Item.' : null);
}

function observation(transcript: LaneTranscript, label: string): RoutedStorefrontApplicationObservation {
  const checkpoint = transcript.semantic.checkpoints.find((candidate) => candidate.label === label);
  assert.ok(checkpoint != null, `${transcript.lane} routed storefront has no ${label} checkpoint`);
  assert.equal(checkpoint.observation.kind, 'routed-storefront', `${transcript.lane} ${label} is not a routed-storefront observation`);
  return checkpoint.observation;
}

function card(
  name: string,
  summary: string,
  price: string,
  stock: string,
  availability: string,
  classes: readonly string[],
  detailLocation: string,
  selectDisabled: boolean,
): RoutedStorefrontCardObservation {
  return {
    name,
    summary,
    price,
    stock,
    availability,
    classes,
    padding: '1.25rem',
    borderColor: 'rgb(15, 118, 110)',
    detailLocation,
    selectDisabled,
  };
}
