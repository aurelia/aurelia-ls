/* global document, HTMLAnchorElement, HTMLSpanElement, HTMLTableElement, HTMLTableRowElement, HTMLTableSectionElement */

import type { Page } from 'playwright';

import type { Sha256 } from './contracts.js';
import {
  computeManifestFileSetSha256,
  type AuthoredSourceIdentity,
  type ScenarioManifestEntry,
} from './manifest.js';
import type { TachometerMeasurement } from './tachometer.js';

export const KEYED_TABLE_WORKLOAD_VERSION = 'r3-v0.1';
export const KEYED_TABLE_WORKLOAD_ID = 'r3-industry-optics-keyed-table';

export type KeyedTableOperationId =
  | 'keyed-create-1k'
  | 'keyed-replace-1k'
  | 'keyed-update-tenth-10k'
  | 'keyed-select-1k'
  | 'keyed-swap-1k'
  | 'keyed-remove-1k'
  | 'keyed-create-10k'
  | 'keyed-append-1k-to-10k'
  | 'keyed-clear-10k';

export type KeyedTableUpstreamOperationId =
  | '01_run1k'
  | '02_replace1k'
  | '03_update10th1k_x16'
  | '04_select1k'
  | '05_swap1k'
  | '06_remove-one-1k'
  | '07_create10k'
  | '08_create1k-after1k_x2'
  | '09_clear1k_x8';

export type KeyedTableIdentityLaw =
  | 'create'
  | 'replace'
  | 'preserve-and-update'
  | 'preserve-and-select'
  | 'preserve-and-swap'
  | 'preserve-survivors'
  | 'append'
  | 'clear';

export interface KeyedTableBrowserAction {
  readonly selector: string;
  readonly resultingRowCount: number;
}

export interface KeyedTableOperationDescriptor {
  readonly id: KeyedTableOperationId;
  readonly upstreamId: KeyedTableUpstreamOperationId;
  readonly label: string;
  readonly preparation: readonly KeyedTableBrowserAction[];
  readonly action: KeyedTableBrowserAction;
  readonly identityLaw: KeyedTableIdentityLaw;
  readonly selectedRowIndex: number | null;
  readonly removedRowIndex: number | null;
}

const clear: KeyedTableBrowserAction = { selector: '#clear', resultingRowCount: 0 };
const run: KeyedTableBrowserAction = { selector: '#run', resultingRowCount: 1_000 };
const runLots: KeyedTableBrowserAction = { selector: '#runlots', resultingRowCount: 10_000 };

export const KEYED_TABLE_PUBLIC_OPERATIONS: readonly KeyedTableOperationDescriptor[] = [
  {
    id: 'keyed-create-1k',
    upstreamId: '01_run1k',
    label: 'Create 1,000 rows',
    preparation: [clear],
    action: run,
    identityLaw: 'create',
    selectedRowIndex: null,
    removedRowIndex: null,
  },
  {
    id: 'keyed-replace-1k',
    upstreamId: '02_replace1k',
    label: 'Replace 1,000 rows',
    preparation: [run],
    action: run,
    identityLaw: 'replace',
    selectedRowIndex: null,
    removedRowIndex: null,
  },
  {
    id: 'keyed-update-tenth-10k',
    upstreamId: '03_update10th1k_x16',
    label: 'Update every tenth row in 10,000 rows',
    preparation: [runLots],
    action: { selector: '#update', resultingRowCount: 10_000 },
    identityLaw: 'preserve-and-update',
    selectedRowIndex: null,
    removedRowIndex: null,
  },
  {
    id: 'keyed-select-1k',
    upstreamId: '04_select1k',
    label: 'Select one row in 1,000 rows',
    preparation: [run],
    action: {
      selector: 'tbody > tr:nth-of-type(2) > td:nth-of-type(2) > a',
      resultingRowCount: 1_000,
    },
    identityLaw: 'preserve-and-select',
    selectedRowIndex: 1,
    removedRowIndex: null,
  },
  {
    id: 'keyed-swap-1k',
    upstreamId: '05_swap1k',
    label: 'Swap rows 1 and 998 in 1,000 rows',
    preparation: [run],
    action: { selector: '#swaprows', resultingRowCount: 1_000 },
    identityLaw: 'preserve-and-swap',
    selectedRowIndex: null,
    removedRowIndex: null,
  },
  {
    id: 'keyed-remove-1k',
    upstreamId: '06_remove-one-1k',
    label: 'Remove one row from 1,000 rows',
    preparation: [run],
    action: {
      selector: 'tbody > tr:nth-of-type(5) > td:nth-of-type(3) > a > span',
      resultingRowCount: 999,
    },
    identityLaw: 'preserve-survivors',
    selectedRowIndex: null,
    removedRowIndex: 4,
  },
  {
    id: 'keyed-create-10k',
    upstreamId: '07_create10k',
    label: 'Create 10,000 rows',
    preparation: [clear],
    action: runLots,
    identityLaw: 'create',
    selectedRowIndex: null,
    removedRowIndex: null,
  },
  {
    id: 'keyed-append-1k-to-10k',
    upstreamId: '08_create1k-after1k_x2',
    label: 'Append 1,000 rows to 10,000 rows',
    preparation: [runLots],
    action: { selector: '#add', resultingRowCount: 11_000 },
    identityLaw: 'append',
    selectedRowIndex: null,
    removedRowIndex: null,
  },
  {
    id: 'keyed-clear-10k',
    upstreamId: '09_clear1k_x8',
    label: 'Clear 10,000 rows',
    preparation: [runLots],
    action: clear,
    identityLaw: 'clear',
    selectedRowIndex: null,
    removedRowIndex: null,
  },
];

const operationsById = new Map(KEYED_TABLE_PUBLIC_OPERATIONS.map((operation) => [operation.id, operation]));

export const KEYED_TABLE_CORE_OPERATIONS: readonly KeyedTableOperationDescriptor[] = [
  readOperation('keyed-create-1k'),
  readOperation('keyed-update-tenth-10k'),
  readOperation('keyed-select-1k'),
  readOperation('keyed-swap-1k'),
  readOperation('keyed-remove-1k'),
];

export interface KeyedTableScenarioPageDescriptor {
  readonly manifest: ScenarioManifestEntry;
  readonly operation: KeyedTableOperationDescriptor;
  readonly pagePath: string;
  readonly measurements: readonly TachometerMeasurement[];
  readonly exposeGc: false;
  readonly sampleSize: null;
}

const keyedTableAuthoredSources: readonly AuthoredSourceIdentity[] = [
  source('packages/aot-benchmarks/fixtures/keyed-table/src/main.ts', 'cfc255460098c01dd8120c110a7ce93da1bc9fc049945b9242590edb33d9d56e'),
  source('packages/aot-benchmarks/fixtures/keyed-table/src/keyed-table-app.ts', '19f082694d97c337da12d7c01b27fff14ec781e902c9fe86a0ce6884f890d0d7'),
  source('packages/aot-benchmarks/fixtures/keyed-table/src/keyed-table-app.html', '05ab6cca7ea5f59c24354d02f9f61cbd5b59a6ce2bfcab5fd04c15548d101d78'),
];

const keyedTableHarnessFiles: readonly AuthoredSourceIdentity[] = [
  source('packages/aot-benchmarks/fixtures/keyed-table/pages/keyed-table-page-harness.js', 'cb7ea20596dc39b1bdcc011a6841261ee8bd6668c8e361900c193185e57332e5'),
  source('packages/aot-benchmarks/fixtures/keyed-table/pages/operation.html', 'bae02eb9a7cc61c7144eb401a030f2325d84f4e99f55f3aba341896cefb96b66'),
];

const keyedTableCoreIds = new Set(KEYED_TABLE_CORE_OPERATIONS.map((operation) => operation.id));

export const keyedTableScenarioManifestEntries: readonly ScenarioManifestEntry[] =
  KEYED_TABLE_PUBLIC_OPERATIONS.map((operation) => ({
    scenarioId: operation.id,
    workloadId: KEYED_TABLE_WORKLOAD_ID,
    role: 'runtime',
    presets: keyedTableCoreIds.has(operation.id)
      ? ['baseline-promotion', 'targeted']
      : ['baseline-promotion'],
    authoredSources: keyedTableAuthoredSources,
    harnessFiles: keyedTableHarnessFiles,
    harnessSha256: computeManifestFileSetSha256(keyedTableHarnessFiles),
    entry: {
      modulePath: 'packages/aot-benchmarks/fixtures/keyed-table/src/main.ts',
      exportName: 'startKeyedTableApplication',
      arguments: [{ kind: 'host-environment', selector: 'keyed-table-app' }],
      authority: 'user-declared',
    },
    runtimeInputs: [{
      inputId: 'public-keyed-table-operation',
      source: 'authored-application',
      descriptor: {
        upstreamId: operation.upstreamId,
        preparation: operation.preparation.map((step) => ({
          selector: step.selector,
          resultingRowCount: step.resultingRowCount,
        })),
        action: {
          selector: operation.action.selector,
          resultingRowCount: operation.action.resultingRowCount,
        },
        identityLaw: operation.identityLaw,
        selectedRowIndex: operation.selectedRowIndex,
        removedRowIndex: operation.removedRowIndex,
      },
    }],
    scales: [
      { name: 'prepared-row-count', value: operation.preparation.at(-1)?.resultingRowCount ?? 0 },
      { name: 'result-row-count', value: operation.action.resultingRowCount },
    ],
    metrics: [{
      metricId: `${operation.id}-settled-duration`,
      kind: 'settled-duration',
      unit: 'milliseconds',
      timedBoundary: `Immediately before the public ${operation.action.selector} action through its operation-specific observable DOM boundary.`,
      primary: true,
    }],
    oracle: {
      oracleId: 'keyed-table-dom-identity-v1',
      description: 'Exact public table structure, monotonic ids, row order/text, selection cardinality, and operation-specific keyed DOM identity.',
    },
    quiescence: {
      kind: 'custom',
      description: 'An external MutationObserver resolves only at the operation-specific DOM boundary; the full content and identity oracle runs before publication.',
    },
    artifact: { chunking: 'single-minified-esm', initialEagerFiles: ['app.js'] },
  }));

export const keyedTableScenarioPages: readonly KeyedTableScenarioPageDescriptor[] =
  KEYED_TABLE_PUBLIC_OPERATIONS.map((operation, index) => ({
    manifest: keyedTableScenarioManifestEntries[index]!,
    operation,
    pagePath: `fixtures/keyed-table/pages/operation.html?operation=${operation.id}`,
    measurements: [{ name: 'duration', mode: 'performance', entryName: operation.id }],
    exposeGc: false,
    sampleSize: null,
  }));

export interface KeyedTableDomRow {
  readonly id: number;
  readonly label: string;
  readonly selected: boolean;
}

export interface KeyedTableDomSnapshot {
  readonly rows: readonly KeyedTableDomRow[];
  readonly selectedIds: readonly number[];
}

interface KeyedTableOracleRequest {
  readonly phase: 'prime' | 'assert';
  readonly operation: KeyedTableOperationDescriptor;
}

interface KeyedTableBrowserOracleState {
  readonly operationId: KeyedTableOperationId;
  readonly before: KeyedTableDomSnapshot;
  readonly nodes: Map<number, HTMLTableRowElement>;
  readonly greatestObservedId: number;
}

type KeyedTableBrowserGlobal = typeof globalThis & {
  __aureliaKeyedTableOracleV1?: KeyedTableBrowserOracleState;
};

/**
 * Runs entirely in the browser through `page.evaluate`. It retains exact row
 * nodes between the untimed precondition and postcondition without entering
 * either emitted application artifact.
 */
export function keyedTableBrowserOracle(request: KeyedTableOracleRequest): KeyedTableDomSnapshot {
  const browser = globalThis as KeyedTableBrowserGlobal;

  function readSnapshot(): { snapshot: KeyedTableDomSnapshot; nodes: Map<number, HTMLTableRowElement> } {
    const table = document.querySelector('table.table.table-hover.table-striped.test-data');
    const body = table?.querySelector(':scope > tbody');
    if (!(table instanceof HTMLTableElement) || !(body instanceof HTMLTableSectionElement)) {
      throw new Error('The keyed-table benchmark table does not have the upstream table/tbody structure.');
    }

    const rows: KeyedTableDomRow[] = [];
    const nodes = new Map<number, HTMLTableRowElement>();
    const selectedIds: number[] = [];
    for (const candidate of body.children) {
      if (!(candidate instanceof HTMLTableRowElement) || candidate.cells.length !== 4) {
        throw new Error('A keyed-table row does not contain the required four direct table cells.');
      }

      const [idCell, labelCell, removeCell, emptyCell] = Array.from(candidate.cells);
      const labelLink = labelCell?.querySelector(':scope > a');
      const removeLink = removeCell?.querySelector(':scope > a');
      const removeIcon = removeLink?.querySelector(':scope > span.glyphicon.glyphicon-remove');
      const id = Number(idCell?.textContent?.trim());
      const label = labelLink?.textContent?.trim() ?? '';
      if (
        idCell?.className !== 'col-md-1'
        || labelCell?.className !== 'col-md-4'
        || removeCell?.className !== 'col-md-1'
        || emptyCell?.className !== 'col-md-6'
        || !Number.isSafeInteger(id)
        || id <= 0
        || !(labelLink instanceof HTMLAnchorElement)
        || !(removeLink instanceof HTMLAnchorElement)
        || !(removeIcon instanceof HTMLSpanElement)
        || removeIcon.getAttribute('aria-hidden') !== 'true'
        || emptyCell.textContent?.trim() !== ''
        || !/^[a-z]+ [a-z]+ [a-z]+(?: !!!)*$/u.test(label)
      ) {
        throw new Error(`Keyed-table row ${String(idCell?.textContent)} violates the upstream cell contract.`);
      }
      if (nodes.has(id)) throw new Error(`The keyed-table benchmark rendered duplicate id ${id}.`);

      const selected = candidate.classList.contains('danger');
      rows.push({ id, label, selected });
      nodes.set(id, candidate);
      if (selected) selectedIds.push(id);
    }
    return { snapshot: { rows, selectedIds }, nodes };
  }

  const current = readSnapshot();
  if (request.phase === 'prime') {
    const priorGreatest = browser.__aureliaKeyedTableOracleV1?.greatestObservedId ?? 0;
    browser.__aureliaKeyedTableOracleV1 = {
      operationId: request.operation.id,
      before: current.snapshot,
      nodes: current.nodes,
      greatestObservedId: Math.max(priorGreatest, ...current.snapshot.rows.map((row) => row.id)),
    };
    return current.snapshot;
  }

  const state = browser.__aureliaKeyedTableOracleV1;
  if (state == null || state.operationId !== request.operation.id) {
    throw new Error(`The ${request.operation.id} outcome has no matching primed identity oracle.`);
  }

  const before = state.before.rows;
  const after = current.snapshot.rows;
  const beforeIds = before.map((row) => row.id);
  const afterIds = after.map((row) => row.id);
  const expectedSelectedId = request.operation.selectedRowIndex == null
    ? null
    : before[request.operation.selectedRowIndex]?.id ?? null;

  if (after.length !== request.operation.action.resultingRowCount) {
    throw new Error(`${request.operation.id} rendered ${after.length} rows instead of ${request.operation.action.resultingRowCount}.`);
  }
  if (
    (expectedSelectedId == null && current.snapshot.selectedIds.length !== 0)
    || (expectedSelectedId != null && (
      current.snapshot.selectedIds.length !== 1
      || current.snapshot.selectedIds[0] !== expectedSelectedId
    ))
  ) {
    throw new Error(`${request.operation.id} rendered an invalid selected-row set.`);
  }

  const assertSameRows = (expectedIds: readonly number[]): void => {
    if (expectedIds.length !== afterIds.length || expectedIds.some((id, index) => afterIds[index] !== id)) {
      throw new Error(`${request.operation.id} rendered an invalid row order.`);
    }
    for (const id of expectedIds) {
      if (current.nodes.get(id) !== state.nodes.get(id)) {
        throw new Error(`${request.operation.id} replaced keyed DOM row ${id}.`);
      }
    }
  };

  switch (request.operation.identityLaw) {
    case 'create': {
      if (before.length !== 0 || after.some((row) => row.id <= state.greatestObservedId)) {
        throw new Error(`${request.operation.id} did not create a new globally monotonic id cohort.`);
      }
      break;
    }
    case 'replace': {
      if (after.some((row) => row.id <= state.greatestObservedId)) {
        throw new Error(`${request.operation.id} reused an id from the replaced cohort.`);
      }
      for (const node of state.nodes.values()) {
        if (node.isConnected) throw new Error(`${request.operation.id} retained a replaced DOM row.`);
      }
      break;
    }
    case 'preserve-and-update': {
      assertSameRows(beforeIds);
      for (let index = 0; index < before.length; ++index) {
        const expectedLabel = index % 10 === 0 ? `${before[index]!.label} !!!` : before[index]!.label;
        if (after[index]!.label !== expectedLabel) {
          throw new Error(`${request.operation.id} updated the wrong label at row ${index}.`);
        }
      }
      break;
    }
    case 'preserve-and-select': {
      assertSameRows(beforeIds);
      if (before.some((row, index) => row.label !== after[index]!.label)) {
        throw new Error(`${request.operation.id} changed row text while selecting.`);
      }
      break;
    }
    case 'preserve-and-swap': {
      const expectedIds = beforeIds.slice();
      [expectedIds[1], expectedIds[998]] = [expectedIds[998]!, expectedIds[1]!];
      assertSameRows(expectedIds);
      break;
    }
    case 'preserve-survivors': {
      const removedIndex = request.operation.removedRowIndex!;
      const removedId = beforeIds[removedIndex]!;
      const expectedIds = beforeIds.filter((_, index) => index !== removedIndex);
      assertSameRows(expectedIds);
      if (state.nodes.get(removedId)?.isConnected !== false) {
        throw new Error(`${request.operation.id} did not detach the removed keyed DOM row.`);
      }
      break;
    }
    case 'append': {
      const retainedIds = afterIds.slice(0, beforeIds.length);
      if (retainedIds.some((id, index) => id !== beforeIds[index])) {
        throw new Error(`${request.operation.id} changed the original row order while appending.`);
      }
      for (const id of beforeIds) {
        if (current.nodes.get(id) !== state.nodes.get(id)) {
          throw new Error(`${request.operation.id} replaced original keyed DOM row ${id}.`);
        }
      }
      const appended = after.slice(before.length);
      if (
        appended.length !== 1_000
        || appended.some((row) => row.id <= state.greatestObservedId || state.nodes.has(row.id))
      ) {
        throw new Error(`${request.operation.id} did not append one new globally monotonic 1,000-row cohort.`);
      }
      break;
    }
    case 'clear': {
      for (const node of state.nodes.values()) {
        if (node.isConnected) throw new Error(`${request.operation.id} retained a cleared DOM row.`);
      }
      break;
    }
  }

  browser.__aureliaKeyedTableOracleV1 = {
    operationId: request.operation.id,
    before: current.snapshot,
    nodes: current.nodes,
    greatestObservedId: Math.max(state.greatestObservedId, ...afterIds),
  };
  return current.snapshot;
}

/** A small closure-free predicate suitable for Playwright's polling realm. */
export function keyedTableBrowserOutcomeReached(operation: KeyedTableOperationDescriptor): boolean {
  const browser = globalThis as KeyedTableBrowserGlobal;
  const state = browser.__aureliaKeyedTableOracleV1;
  if (state == null || state.operationId !== operation.id) return false;

  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>('table.test-data > tbody > tr'));
  if (rows.length !== operation.action.resultingRowCount) return false;
  const idAt = (index: number): number => Number(rows[index]?.cells[0]?.textContent?.trim());

  switch (operation.identityLaw) {
    case 'create':
    case 'replace':
      return rows.length > 0 && idAt(0) > state.greatestObservedId;
    case 'preserve-and-update':
      return state.before.rows[0] != null
        && rows[0]?.cells[1]?.textContent?.trim() === `${state.before.rows[0].label} !!!`;
    case 'preserve-and-select':
      return rows[operation.selectedRowIndex!]?.classList.contains('danger') === true;
    case 'preserve-and-swap':
      return idAt(1) === state.before.rows[998]?.id && idAt(998) === state.before.rows[1]?.id;
    case 'preserve-survivors':
      return !rows.some((row) => Number(row.cells[0]?.textContent?.trim()) === state.before.rows[operation.removedRowIndex!]?.id);
    case 'append':
      return idAt(state.before.rows.length) > state.greatestObservedId;
    case 'clear':
      return rows.length === 0;
  }
}

export async function prepareKeyedTableOperation(
  page: Page,
  operation: KeyedTableOperationDescriptor,
): Promise<void> {
  await page.locator('#run').waitFor({ state: 'visible' });
  for (const step of operation.preparation) {
    const previousGreatest = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('table.test-data > tbody > tr > td:first-child'))
        .map((cell) => Number(cell.textContent?.trim()));
      return Math.max(0, ...ids);
    });
    await page.locator(step.selector).click();
    await page.waitForFunction(
      ({ expectedCount, previousGreatestId, createsRows }) => {
        const rows = document.querySelectorAll('table.test-data > tbody > tr');
        if (rows.length !== expectedCount) return false;
        if (!createsRows || expectedCount === 0) return true;
        return Number(rows[0]?.firstElementChild?.textContent?.trim()) > previousGreatestId;
      },
      {
        expectedCount: step.resultingRowCount,
        previousGreatestId: previousGreatest,
        createsRows: step.selector === '#run' || step.selector === '#runlots' || step.selector === '#add',
      },
    );
  }
}

export async function primeKeyedTableOperation(
  page: Page,
  operation: KeyedTableOperationDescriptor,
): Promise<KeyedTableDomSnapshot> {
  const request: KeyedTableOracleRequest = { phase: 'prime', operation };
  return page.evaluate(keyedTableBrowserOracle, request);
}

export async function triggerKeyedTableOperation(
  page: Page,
  operation: KeyedTableOperationDescriptor,
): Promise<void> {
  await page.locator(operation.action.selector).click();
}

export async function waitForKeyedTableOutcome(
  page: Page,
  operation: KeyedTableOperationDescriptor,
): Promise<void> {
  await page.waitForFunction(keyedTableBrowserOutcomeReached, operation);
}

export async function assertKeyedTableOutcome(
  page: Page,
  operation: KeyedTableOperationDescriptor,
): Promise<KeyedTableDomSnapshot> {
  const request: KeyedTableOracleRequest = { phase: 'assert', operation };
  return page.evaluate(keyedTableBrowserOracle, request);
}

function readOperation(id: KeyedTableOperationId): KeyedTableOperationDescriptor {
  const operation = operationsById.get(id);
  if (operation == null) throw new Error(`Unknown keyed-table operation ${id}.`);
  return operation;
}

function source(path: string, digest: string): AuthoredSourceIdentity {
  return { path, sha256: digest as Sha256 };
}
