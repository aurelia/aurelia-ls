const expectedItemCount = 500;
const expectedSeasonalCount = 125;
const detailItemOrdinal = 251;
const detailItemId = `item-${detailItemOrdinal}`;

const asyncMajorGc = { type: 'major', execution: 'async' };

export async function loadStorefrontVariant() {
  const parameters = new URL(globalThis.location.href).searchParams;
  const explicitSpecifier = parameters.get('module');
  const variant = parameters.get('variant');
  const specifier = explicitSpecifier == null || explicitSpecifier.length === 0
    ? variant === 'base' || variant === 'candidate'
      ? `../results/variants/${variant}/storefront/app.js`
      : null
    : explicitSpecifier;
  if (specifier == null) {
    throw new Error('Storefront benchmark page requires `module` or a base/candidate `variant` query parameter.');
  }
  const module = await import(/* @vite-ignore */ new URL(specifier, globalThis.location.href).href);
  if (
    typeof module.createStorefrontBenchmarkApplication !== 'function'
    || typeof module.tasksSettled !== 'function'
  ) {
    throw new Error('Storefront variant does not expose the benchmark application factory and task settlement API.');
  }
  return module;
}

export function appendStorefrontHost() {
  const host = document.createElement('div');
  host.setAttribute('data-storefront-benchmark-host', '');
  document.body.append(host);
  return host;
}

export async function settleStorefrontList(module, aurelia, host, expectedCount = expectedItemCount) {
  for (let attempt = 0; attempt < 32; attempt++) {
    await module.tasksSettled();
    const state = storefrontState(aurelia);
    if (
      state.items.isLoading === false
      && state.items.visibleItems.length === expectedCount
      && renderedRows(host).length === expectedCount
    ) {
      return;
    }
    await Promise.resolve();
  }
  throw new Error(`Storefront did not settle to ${expectedCount} rendered rows.`);
}

export async function settleStorefrontDetail(module, host) {
  for (let attempt = 0; attempt < 32; attempt++) {
    await module.tasksSettled();
    const detail = host.querySelector('.item-detail');
    if (detail?.querySelector('h1')?.textContent?.trim() === `Title ${detailItemOrdinal}`) {
      return detail;
    }
    await Promise.resolve();
  }
  throw new Error(`Storefront did not settle to detail route '${detailItemId}'.`);
}

export function seasonalFilterSelect(host) {
  const select = host.querySelector('.catalog-filters select');
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error('Storefront badge-filter workload has no badge select.');
  }
  const labels = [...select.options].map((option) => option.textContent?.trim());
  if (!labels.includes('standard')) {
    throw new Error('Storefront benchmark lost the standard empty-result filter option.');
  }
  const seasonalIndex = [...select.options].findIndex((option) => option.textContent?.trim() === 'seasonal');
  if (seasonalIndex < 0) {
    throw new Error('Storefront badge-filter workload has no seasonal option.');
  }
  select.selectedIndex = seasonalIndex;
  return select;
}

export function dispatchSelectChange(select) {
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

export function nominatedDetailLink(host) {
  const rows = renderedRows(host);
  const row = rows[detailItemOrdinal - 1];
  const link = row?.querySelector('.item-card a');
  if (!(link instanceof HTMLAnchorElement)) {
    throw new Error(`Storefront row ${detailItemOrdinal} has no detail navigation link.`);
  }
  return link;
}

export function assertFullStorefront(aurelia, host) {
  const state = storefrontState(aurelia);
  const items = state.items.visibleItems;
  if (items.length !== expectedItemCount || renderedRows(host).length !== expectedItemCount) {
    throw new Error('Storefront full-list oracle expected exactly 500 model and DOM rows.');
  }
  if (items[0]?.id !== 'item-1' || items.at(-1)?.id !== 'item-500') {
    throw new Error('Storefront full-list oracle lost stable first/last ids.');
  }
  if (items.some((item) => item.badge === 'standard')) {
    throw new Error('Storefront benchmark created an item in the filter-only standard category.');
  }
  assertRenderedTitles(host, items);
}

export function assertSeasonalStorefront(aurelia, host) {
  const state = storefrontState(aurelia);
  const items = state.items.visibleItems;
  if (
    state.items.badgeFilter !== 'seasonal'
    || items.length !== expectedSeasonalCount
    || renderedRows(host).length !== expectedSeasonalCount
  ) {
    throw new Error('Storefront seasonal-filter oracle expected exactly 125 model and DOM rows.');
  }
  for (let index = 0; index < items.length; index++) {
    const expectedOrdinal = (index + 1) * 4;
    const item = items[index];
    if (item?.id !== `item-${expectedOrdinal}` || item.badge !== 'seasonal') {
      throw new Error(`Storefront seasonal-filter oracle failed at result ${index}.`);
    }
  }
  assertRenderedTitles(host, items);
}

export function assertStorefrontDetail(aurelia, host) {
  const state = storefrontState(aurelia);
  const item = state.items.readItem(detailItemId);
  const detail = host.querySelector('.item-detail');
  if (item?.id !== detailItemId || detail == null) {
    throw new Error(`Storefront detail oracle did not retain '${detailItemId}'.`);
  }
  if (host.querySelector('.item-grid') != null || renderedRows(host).length !== 0) {
    throw new Error('Storefront detail oracle retained the list route view.');
  }
  const text = detail.textContent ?? '';
  for (const expected of [item.name, item.summary, item.categoryLabel, item.monthlyPriceLabel, item.availableLabel]) {
    if (!text.includes(expected)) {
      throw new Error(`Storefront detail oracle did not render '${expected}'.`);
    }
  }
}

export function readImmediateUsedJsHeap() {
  const usedJSHeapSizeBytes = performance.memory?.usedJSHeapSize;
  if (!Number.isFinite(usedJSHeapSizeBytes) || usedJSHeapSizeBytes < 0) {
    throw new Error(`Chrome returned an invalid immediate used JS heap value: ${usedJSHeapSizeBytes}.`);
  }
  return usedJSHeapSizeBytes;
}

export function publishDurationMeasurement(name, startMark, endMark, usedJSHeapSizeBytes) {
  globalThis.usedJSHeapSizeBytes = usedJSHeapSizeBytes;
  performance.measure(name, startMark, endMark);
}

export async function measureUsedJsHeapAfterGc() {
  if (typeof globalThis.gc !== 'function') {
    throw new Error('After-GC storefront benchmarks require Chrome with --js-flags=--expose-gc.');
  }
  await yieldTask();
  await globalThis.gc(asyncMajorGc);
  await yieldTask();
  await globalThis.gc(asyncMajorGc);
  await yieldTask();
  const bytes = performance.memory?.usedJSHeapSize;
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error(`Chrome returned an invalid used JS heap value: ${bytes}.`);
  }
  return bytes;
}

export async function stopStorefront(module, aurelia, host) {
  await aurelia.stop(true);
  await module.tasksSettled();
  if (host.childNodes.length !== 0 || '$aurelia' in host) {
    throw new Error('Storefront teardown left the application attached to its host.');
  }
  aurelia.dispose();
  host.remove();
}

function storefrontState(aurelia) {
  const state = aurelia.root.controller.viewModel.state;
  if (state?.items == null || state.selection == null) {
    throw new Error('Storefront benchmark could not read the App CatalogState.');
  }
  return state;
}

function renderedRows(host) {
  return [...host.querySelectorAll('.item-grid > li')];
}

function assertRenderedTitles(host, items) {
  const rows = renderedRows(host);
  for (let index = 0; index < items.length; index++) {
    const rendered = rows[index]?.querySelector('.item-card h3')?.textContent?.trim();
    if (rendered !== items[index]?.name) {
      throw new Error(`Storefront rendered-title oracle failed at row ${index}.`);
    }
  }
}

function yieldTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
