/* global document, location, window, HTMLElement, HTMLAnchorElement, HTMLSpanElement, HTMLTableElement, HTMLTableRowElement, HTMLTableSectionElement, MutationObserver */

const operations = {
  'keyed-create-1k': operation('#clear', 0, '#run', 1_000, 'create'),
  'keyed-replace-1k': operation('#run', 1_000, '#run', 1_000, 'replace'),
  'keyed-update-tenth-10k': operation('#runlots', 10_000, '#update', 10_000, 'update'),
  'keyed-select-1k': operation(
    '#run',
    1_000,
    'tbody > tr:nth-of-type(2) > td:nth-of-type(2) > a',
    1_000,
    'select',
    1,
  ),
  'keyed-swap-1k': operation('#run', 1_000, '#swaprows', 1_000, 'swap'),
  'keyed-remove-1k': operation(
    '#run',
    1_000,
    'tbody > tr:nth-of-type(5) > td:nth-of-type(3) > a > span',
    999,
    'remove',
    null,
    4,
  ),
  'keyed-create-10k': operation('#clear', 0, '#runlots', 10_000, 'create'),
  'keyed-append-1k-to-10k': operation('#runlots', 10_000, '#add', 11_000, 'append'),
  'keyed-clear-10k': operation('#runlots', 10_000, '#clear', 0, 'clear'),
};

export async function runKeyedTableBenchmarkPage(operationId) {
  const benchmark = operations[operationId];
  if (benchmark === undefined) throw new Error(`Unknown keyed-table operation "${operationId}".`);

  await loadVariant();
  await visibleControl('#run');
  await performAndSettle(benchmark.prepareSelector, benchmark.preparedCount, null);
  const before = readTable();

  const settlement = observeOutcome(benchmark, before);
  performance.mark(`${operationId}-start`);
  document.querySelector(benchmark.actionSelector).click();
  await settlement;
  performance.mark(`${operationId}-end`);

  const usedJSHeapSizeBytes = performance.memory?.usedJSHeapSize;
  assertOutcome(operationId, benchmark, before, readTable());
  if (usedJSHeapSizeBytes !== undefined) window.usedJSHeapSizeBytes = usedJSHeapSizeBytes;
  performance.measure(operationId, `${operationId}-start`, `${operationId}-end`);
}

async function loadVariant() {
  const variant = new URLSearchParams(location.search).get('variant');
  if (variant !== 'base' && variant !== 'candidate') {
    throw new Error(`Expected benchmark variant "base" or "candidate", received "${variant}".`);
  }
  const module = await import(`../results/variants/${variant}/keyed-table/app.js`);
  const host = document.querySelector('keyed-table-app');
  if (!(host instanceof HTMLElement)) throw new Error('The keyed-table benchmark host is missing.');
  module.startKeyedTableApplication(host);
}

async function visibleControl(selector) {
  for (;;) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) return element;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function performAndSettle(selector, expectedCount, previous) {
  const action = await visibleControl(selector);
  const settlement = observeCount(expectedCount, previous);
  action.click();
  await settlement;
}

function observeCount(expectedCount, previous) {
  return observeUntil(() => {
    const rows = document.querySelectorAll('table.test-data > tbody > tr');
    if (rows.length !== expectedCount) return false;
    return previous === null || expectedCount === 0 || rows[0] !== previous;
  });
}

function observeOutcome(benchmark, before) {
  return observeUntil(() => {
    const rows = [...document.querySelectorAll('table.test-data > tbody > tr')];
    if (rows.length !== benchmark.resultCount) return false;
    const idAt = (index) => Number(rows[index]?.cells[0]?.textContent.trim());
    switch (benchmark.law) {
      case 'create':
      case 'replace': return rows.length > 0 && idAt(0) > maximumId(before);
      case 'update': return rows[0]?.cells[1]?.textContent.trim() === `${before.rows[0].label} !!!`;
      case 'select': return rows[benchmark.selectedIndex]?.classList.contains('danger') === true;
      case 'swap': return idAt(1) === before.rows[998].id && idAt(998) === before.rows[1].id;
      case 'remove': return !rows.some((row) => idAtRow(row) === before.rows[benchmark.removedIndex].id);
      case 'append': return idAt(before.rows.length) > maximumId(before);
      case 'clear': return rows.length === 0;
    }
  });
}

function observeUntil(predicate) {
  if (predicate()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const body = document.querySelector('table.test-data > tbody') ?? document.body;
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error('The keyed-table DOM did not reach its operation boundary.'));
    }, 30_000);
    const observer = new MutationObserver(() => {
      if (!predicate()) return;
      clearTimeout(timeout);
      observer.disconnect();
      resolve();
    });
    observer.observe(body, { attributes: true, characterData: true, childList: true, subtree: true });
  });
}

function readTable() {
  const table = document.querySelector('table.table.table-hover.table-striped.test-data');
  const body = table?.querySelector(':scope > tbody');
  if (!(table instanceof HTMLTableElement) || !(body instanceof HTMLTableSectionElement)) {
    throw new Error('The keyed-table benchmark does not have the upstream table/tbody structure.');
  }

  const rows = [];
  const nodes = new Map();
  for (const node of body.children) {
    if (!(node instanceof HTMLTableRowElement) || node.cells.length !== 4) {
      throw new Error('A keyed-table row does not contain four direct cells.');
    }
    const [idCell, labelCell, removeCell, emptyCell] = [...node.cells];
    const labelLink = labelCell.querySelector(':scope > a');
    const removeLink = removeCell.querySelector(':scope > a');
    const icon = removeLink?.querySelector(':scope > span.glyphicon.glyphicon-remove');
    const id = Number(idCell.textContent.trim());
    const label = labelLink?.textContent.trim() ?? '';
    if (
      idCell.className !== 'col-md-1'
      || labelCell.className !== 'col-md-4'
      || removeCell.className !== 'col-md-1'
      || emptyCell.className !== 'col-md-6'
      || !Number.isSafeInteger(id)
      || id <= 0
      || !(labelLink instanceof HTMLAnchorElement)
      || !(removeLink instanceof HTMLAnchorElement)
      || !(icon instanceof HTMLSpanElement)
      || icon.getAttribute('aria-hidden') !== 'true'
      || emptyCell.textContent.trim() !== ''
      || !/^[a-z]+ [a-z]+ [a-z]+(?: !!!)*$/u.test(label)
      || nodes.has(id)
    ) {
      throw new Error(`Keyed-table row ${id} violates the public DOM contract.`);
    }
    rows.push({ id, label, selected: node.classList.contains('danger'), node });
    nodes.set(id, node);
  }
  return { rows, nodes };
}

function assertOutcome(operationId, benchmark, before, after) {
  if (after.rows.length !== benchmark.resultCount) {
    throw new Error(`${operationId} rendered ${after.rows.length} rows instead of ${benchmark.resultCount}.`);
  }
  const selected = after.rows.filter((row) => row.selected);
  const selectedId = benchmark.selectedIndex === null ? null : before.rows[benchmark.selectedIndex].id;
  if ((selectedId === null && selected.length !== 0) || (selectedId !== null && (selected.length !== 1 || selected[0].id !== selectedId))) {
    throw new Error(`${operationId} rendered an invalid selected-row set.`);
  }

  const beforeIds = before.rows.map((row) => row.id);
  const afterIds = after.rows.map((row) => row.id);
  const preserve = (expectedIds) => {
    if (expectedIds.length !== afterIds.length || expectedIds.some((id, index) => afterIds[index] !== id)) {
      throw new Error(`${operationId} rendered an invalid row order.`);
    }
    for (const id of expectedIds) {
      if (after.nodes.get(id) !== before.nodes.get(id)) throw new Error(`${operationId} replaced keyed row ${id}.`);
    }
  };

  switch (benchmark.law) {
    case 'create':
      if (before.rows.length !== 0 || after.rows.some((row) => row.id <= maximumId(before))) {
        throw new Error(`${operationId} did not create a monotonic id cohort.`);
      }
      break;
    case 'replace':
      if (after.rows.some((row) => row.id <= maximumId(before)) || [...before.nodes.values()].some((node) => node.isConnected)) {
        throw new Error(`${operationId} retained part of the replaced cohort.`);
      }
      break;
    case 'update':
      preserve(beforeIds);
      before.rows.forEach((row, index) => {
        const expected = index % 10 === 0 ? `${row.label} !!!` : row.label;
        if (after.rows[index].label !== expected) throw new Error(`${operationId} updated the wrong row ${index}.`);
      });
      break;
    case 'select':
      preserve(beforeIds);
      if (before.rows.some((row, index) => row.label !== after.rows[index].label)) {
        throw new Error(`${operationId} changed row text while selecting.`);
      }
      break;
    case 'swap': {
      const expected = beforeIds.slice();
      [expected[1], expected[998]] = [expected[998], expected[1]];
      preserve(expected);
      break;
    }
    case 'remove': {
      const removedId = beforeIds[benchmark.removedIndex];
      preserve(beforeIds.filter((_, index) => index !== benchmark.removedIndex));
      if (before.nodes.get(removedId).isConnected) throw new Error(`${operationId} retained the removed row.`);
      break;
    }
    case 'append': {
      const retained = after.rows.slice(0, before.rows.length);
      if (retained.some((row, index) => row.id !== beforeIds[index] || row.node !== before.nodes.get(row.id))) {
        throw new Error(`${operationId} replaced or reordered the original cohort.`);
      }
      const appended = after.rows.slice(before.rows.length);
      if (appended.length !== 1_000 || appended.some((row) => row.id <= maximumId(before) || before.nodes.has(row.id))) {
        throw new Error(`${operationId} did not append one monotonic 1,000-row cohort.`);
      }
      break;
    }
    case 'clear':
      if ([...before.nodes.values()].some((node) => node.isConnected)) throw new Error(`${operationId} retained a cleared row.`);
      break;
  }
}

function maximumId(snapshot) {
  return Math.max(0, ...snapshot.rows.map((row) => row.id));
}

function idAtRow(row) {
  return Number(row.cells[0]?.textContent.trim());
}

function operation(prepareSelector, preparedCount, actionSelector, resultCount, law, selectedIndex = null, removedIndex = null) {
  return { prepareSelector, preparedCount, actionSelector, resultCount, law, selectedIndex, removedIndex };
}
