import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  openSeamBoundaryKindForReason,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  fixtureChildRoots,
  parsePressureRootCliOptions,
  pressureRootsForOptions,
} from './pressure-root-selection.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const pressureFixtureRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/pressure');
const defaultRoots = fixtureChildRoots(pressureFixtureRoot);
const pressureRootSelectionConfig = {
  workspaceRoot,
  pressureFixtureRoot,
  fixtureCollections: [],
  defaultRoots,
  envRootNames: ['SEMANTIC_RUNTIME_OPEN_SEAM_QUALITY_ROOTS'],
  usageName: 'pnpm --filter @aurelia-ls/semantic-runtime contract:open-seam-public-quality',
  label: 'open-seam public quality',
  fixtureHelp: 'Use --fixture pressure-name or pressure:<name> for focused open-seam quality checks.',
};
const cliOptions = parsePressureRootCliOptions(process.argv.slice(2), pressureRootSelectionConfig);
const roots = pressureRootsForOptions(cliOptions, pressureRootSelectionConfig);

const failures = [];
const stats = {
  roots: roots.length,
  openedApps: 0,
  skippedProjects: 0,
  rawRows: 0,
  siteRows: 0,
  summaryRows: 0,
};

for (const root of roots) {
  await verifyRoot(root);
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    stats,
    failures,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    stats,
  }, null, 2));
}

async function verifyRoot(root) {
  const label = path.basename(root);
  try {
    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: `open-seam-public-quality:${label}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    stats.openedApps += 1;
    const rawAnswer = readPagedAnswer(app, {
      kind: SemanticAppQueryKind.OpenSeams,
    });
    const rawHandlesAnswer = readPagedAnswer(app, {
      kind: SemanticAppQueryKind.OpenSeams,
      detail: 'handles',
    });
    const sitesAnswer = readPagedAnswer(app, {
      kind: SemanticAppQueryKind.OpenSeamSites,
    });
    const summaryAnswer = readPagedAnswer(app, {
      kind: SemanticAppQueryKind.OpenSeamSummary,
    });
    const raw = rawAnswer.value;
    const sites = sitesAnswer.value;
    const summary = summaryAnswer.value;
    stats.rawRows += raw.rows.length;
    stats.siteRows += sites.rows.length;
    stats.summaryRows += summary.rows.length;
    verifyRawRows(label, rawAnswer, rawHandlesAnswer);
    verifySiteRows(label, sitesAnswer, raw);
    verifySummaryRows(label, summaryAnswer, sites, raw);
    verifySelectors(label, app, summary, sites, raw);
  } catch (error) {
    if (isNoAureliaAppOpenError(error)) {
      stats.skippedProjects += 1;
      return;
    }
    failures.push(`${label}: failed to open app: ${error?.message ?? error}`);
  }
}

function verifyRawRows(label, rawAnswer, rawHandlesAnswer) {
  const raw = rawAnswer.value;
  const rawHandles = rawHandlesAnswer.value;
  if (new Set(raw.rows.map((row) => row.seamKey)).size !== raw.rows.length) {
    failures.push(`${label}: compact raw rows do not expose unique answer-local seam keys.`);
  }
  if (raw.rows.some(hasHandleCarrier)) {
    failures.push(`${label}: compact raw rows expose detail-only kernel handles.`);
  }
  if (!sameArray(
    uniqueSorted(raw.rows.map((row) => row.seamKey)),
    uniqueSorted(rawHandles.rows.map((row) => row.seamKey)),
  )) {
    failures.push(`${label}: compact and handle-detail raw answers disagree on answer-local seam keys.`);
  }
  if (rawHandles.rows.some((row) => row.handles == null)) {
    failures.push(`${label}: handle-detail raw answer omitted a seam handle carrier.`);
  }
  for (const row of raw.rows) {
    if (!Array.isArray(row.reasonKinds) || row.reasonKinds.length === 0) {
      failures.push(`${label}: raw ${row.seamKindKey} row has empty reasonKinds at ${sourceLabel(row.source)}.`);
    }
    const expectedBoundaryKinds = uniqueSorted(row.reasonKinds.map(openSeamBoundaryKindForReason));
    if (!sameArray(row.boundaryKinds, expectedBoundaryKinds)) {
      failures.push(`${label}: raw ${row.seamKindKey} boundaries ${JSON.stringify(row.boundaryKinds)} do not derive from reasons ${JSON.stringify(row.reasonKinds)}.`);
    }
    if (row.siteKey.startsWith('kernel:')) {
      failures.push(`${label}: raw ${row.seamKindKey} leaks a kernel handle as site identity.`);
    }
    if (hasExactSource(row.source) && row.sourceRange == null) {
      failures.push(`${label}: raw ${row.seamKindKey} row has exact source without sourceRange at ${sourceLabel(row.source)}.`);
    }
    for (const reasonSource of row.reasonSources ?? []) {
      if (hasExactSource(reasonSource.source) && reasonSource.sourceRange == null) {
        failures.push(`${label}: reason source ${reasonSource.reasonKind} has exact source without sourceRange at ${sourceLabel(reasonSource.source)}.`);
      }
    }
    const impactKeys = row.impacts.map((impact) => impact.impactKey);
    const productKeys = row.impacts.flatMap((impact) => impact.products.map((product) => product.productKey));
    if (impactKeys.length !== new Set(impactKeys).size) {
      failures.push(`${label}: raw ${row.seamKindKey} row repeats a materialization impact key at ${sourceLabel(row.source)}.`);
    }
    if (row.affectedMaterializationCount !== new Set(impactKeys).size) {
      failures.push(`${label}: raw ${row.seamKindKey} materialization count ${row.affectedMaterializationCount} does not conserve ${new Set(impactKeys).size} impacts.`);
    }
    if (row.affectedProductCount !== new Set(productKeys).size) {
      failures.push(`${label}: raw ${row.seamKindKey} product count ${row.affectedProductCount} does not conserve ${new Set(productKeys).size} products.`);
    }
    const expectedPressureKind = impactKeys.length === 0 ? 'evidence-only' : 'product-pressure';
    if (row.pressureKind !== expectedPressureKind) {
      failures.push(`${label}: raw ${row.seamKindKey} pressure ${row.pressureKind} disagrees with ${impactKeys.length} cited materializations.`);
    }
    for (const impact of row.impacts) {
      const expectedOutcome = impact.products.length === 0 ? 'open-without-product' : 'open-with-product';
      if (impact.outcome !== expectedOutcome) {
        failures.push(`${label}: impact ${impact.impactKey} outcome ${impact.outcome} disagrees with ${impact.products.length} products.`);
      }
      const impactProductKeys = impact.products.map((product) => product.productKey);
      if (impactProductKeys.length !== new Set(impactProductKeys).size) {
        failures.push(`${label}: impact ${impact.impactKey} repeats a product key.`);
      }
      if (impact.owner == null
        || typeof impact.owner.ownerKey !== 'string'
        || typeof impact.owner.recordKind !== 'string'
        || typeof impact.owner.label !== 'string') {
        failures.push(`${label}: impact ${impact.impactKey} does not retain a structured materialization owner.`);
      }
    }
  }
}

function verifySiteRows(label, sitesAnswer, raw) {
  const sites = sitesAnswer.value;
  if (typeof sites.totalOpenSeamRows !== 'number' || typeof sites.totalOpenSeamSites !== 'number') {
    failures.push(`${label}: open-seam-sites result is missing raw/site totals.`);
  }
  if (sites.totalOpenSeamRows !== raw.rows.length || sites.totalOpenSeamSites !== new Set(raw.rows.map((row) => row.siteKey)).size) {
    failures.push(`${label}: open-seam-sites totals do not conserve raw rows/sites.`);
  }
  const rawBySiteKey = groupBy(raw.rows, (row) => row.siteKey);
  for (const row of sites.rows) {
    if (!Array.isArray(row.reasonKinds) || row.reasonKinds.length === 0) {
      failures.push(`${label}: site ${row.seamKindKeys.join('+')} has empty reasonKinds at ${sourceLabel(row.source)}.`);
    }
    if (!Array.isArray(row.seamKindKeys) || row.seamKindKeys.length === 0) {
      failures.push(`${label}: site ${row.siteKey} has no seam kinds.`);
    }
    if (!Array.isArray(row.boundaryKinds) || row.boundaryKinds.length === 0) {
      failures.push(`${label}: site ${row.siteKey} has no causal boundary kinds.`);
    }
    if (!Array.isArray(row.pressureKinds) || row.pressureKinds.length === 0) {
      failures.push(`${label}: site ${row.siteKey} has no pressure classification.`);
    }
    if (hasExactSource(row.source) && row.sourceRange == null) {
      failures.push(`${label}: site ${row.seamKindKeys.join('+')} has exact source without sourceRange at ${sourceLabel(row.source)}.`);
    }
    const originKeys = row.staticEvaluationOrigins.map((origin) =>
      `${origin.kind}\0${origin.entryModuleKey}\0${origin.entrySourcePath ?? ''}`
    );
    if (originKeys.length !== new Set(originKeys).size) {
      failures.push(`${label}: site ${row.seamKindKeys.join('+')} has duplicate staticEvaluationOrigins at ${sourceLabel(row.source)}.`);
    }
    const sourceRows = rawBySiteKey.get(row.siteKey) ?? [];
    const expectedImpactKeys = uniqueSorted(sourceRows.flatMap((sourceRow) => sourceRow.impacts.map((impact) => impact.impactKey)));
    const expectedProductKeys = uniqueSorted(sourceRows.flatMap((sourceRow) =>
      sourceRow.impacts.flatMap((impact) => impact.products.map((product) => product.productKey))
    ));
    const expectedVariantCount = new Set(sourceRows.map(openSeamVariantKey)).size;
    const expectedBoundaryCounts = countRows(sourceRows.flatMap((sourceRow) => sourceRow.boundaryKinds));
    const expectedPressureCounts = countRows(sourceRows.map((sourceRow) => sourceRow.pressureKind));
    const expectedReasonCounts = countRows(sourceRows.flatMap((sourceRow) => sourceRow.reasonKinds));
    if (row.rawRowCount !== sourceRows.length
      || row.variantCount !== expectedVariantCount
      || row.affectedMaterializationCount !== expectedImpactKeys.length
      || row.affectedProductCount !== expectedProductKeys.length
      || !sameArray(row.seamKindKeys, uniqueSorted(sourceRows.map((sourceRow) => sourceRow.seamKindKey)))
      || !sameArray(row.boundaryKinds, uniqueSorted(sourceRows.flatMap((sourceRow) => sourceRow.boundaryKinds)))
      || !sameArray(row.pressureKinds, uniqueSorted(sourceRows.map((sourceRow) => sourceRow.pressureKind)))
      || !sameArray(row.reasonKinds, uniqueSorted(sourceRows.flatMap((sourceRow) => sourceRow.reasonKinds)))
      || !sameCountRows(row.boundaryCounts, expectedBoundaryCounts)
      || !sameCountRows(row.pressureCounts, expectedPressureCounts)
      || !sameCountRows(row.reasonCounts, expectedReasonCounts)) {
      failures.push(`${label}: site ${row.siteKey} does not conserve its ${sourceRows.length} raw rows.`);
    }
  }
}

function verifySummaryRows(label, summaryAnswer, sites, raw) {
  const summary = summaryAnswer.value;
  if (summary.totalOpenSeamRows !== sites.totalOpenSeamRows || summary.totalOpenSeamSites !== sites.totalOpenSeamSites) {
    failures.push(`${label}: open-seam-summary totals disagree with open-seam-sites totals: summary rows=${summary.totalOpenSeamRows} sites=${summary.totalOpenSeamSites}; sites rows=${sites.totalOpenSeamRows} sites=${sites.totalOpenSeamSites}.`);
  }
  const rawBySummaryKey = groupBy(raw.rows, openSeamSummaryKey);
  for (const row of summary.rows) {
    if (!Array.isArray(row.reasonKinds) || row.reasonKinds.length === 0) {
      failures.push(`${label}: summary ${row.seamKindKey} cluster has empty reasonKinds.`);
    }
    const sourceRows = rawBySummaryKey.get(openSeamSummaryKey(row)) ?? [];
    const expectedSiteCount = new Set(sourceRows.map((sourceRow) => sourceRow.siteKey)).size;
    const expectedImpactCount = new Set(sourceRows.flatMap((sourceRow) =>
      sourceRow.impacts.map((impact) => impact.impactKey)
    )).size;
    const expectedProductCount = new Set(sourceRows.flatMap((sourceRow) =>
      sourceRow.impacts.flatMap((impact) => impact.products.map((product) => product.productKey))
    )).size;
    const expectedBoundaryCounts = countRows(sourceRows.flatMap((sourceRow) => sourceRow.boundaryKinds));
    const expectedPressureCounts = countRows(sourceRows.map((sourceRow) => sourceRow.pressureKind));
    const expectedReasonCounts = countRows(sourceRows.flatMap((sourceRow) => sourceRow.reasonKinds));
    const evidenceOnlyRowCount = sourceRows.filter((sourceRow) => sourceRow.pressureKind === 'evidence-only').length;
    const productPressureRowCount = sourceRows.length - evidenceOnlyRowCount;
    if (row.count !== sourceRows.length
      || row.uniqueSiteCount !== expectedSiteCount
      || row.affectedMaterializationCount !== expectedImpactCount
      || row.affectedProductCount !== expectedProductCount
      || row.evidenceOnlyRowCount !== evidenceOnlyRowCount
      || row.productPressureRowCount !== productPressureRowCount
      || !sameCountRows(row.boundaryCounts, expectedBoundaryCounts)
      || !sameCountRows(row.pressureCounts, expectedPressureCounts)
      || !sameCountRows(row.reasonCounts, expectedReasonCounts)) {
      failures.push(`${label}: summary ${openSeamSummaryKey(row)} does not conserve its ${sourceRows.length} raw rows.`);
    }
    for (const sample of row.sampleSourceSites ?? []) {
      if (hasExactSource(sample.source) && sample.sourceRange == null) {
        failures.push(`${label}: summary ${row.seamKindKey} sample has exact source without sourceRange at ${sourceLabel(sample.source)}.`);
      }
    }
  }
}

function verifySelectors(label, app, summary, sites, raw) {
  const cluster = summary.rows[0] ?? null;
  if (cluster != null) {
    const selected = readPagedAnswer(app, {
      kind: SemanticAppQueryKind.OpenSeams,
      openSeamClusterKey: cluster.clusterKey,
    });
    const expected = raw.rows.filter((row) => openSeamSummaryKey(row) === openSeamSummaryKey(cluster));
    if (!sameArray(
      uniqueSorted(selected.value.rows.map((row) => row.seamKey)),
      uniqueSorted(expected.map((row) => row.seamKey)),
    )) {
      failures.push(`${label}: cluster selector ${cluster.clusterKey} does not round-trip to its raw causal rows.`);
    }
    if (!selected.continuations.every((continuation) =>
      continuation.targetQuery == null || continuation.targetQuery.openSeamClusterKey === cluster.clusterKey
    )) {
      failures.push(`${label}: cluster-selected continuations do not preserve ${cluster.clusterKey}.`);
    }
  }

  const site = sites.rows[0] ?? null;
  if (site != null) {
    const selected = readPagedAnswer(app, {
      kind: SemanticAppQueryKind.OpenSeams,
      openSeamSiteKey: site.siteKey,
    });
    const expected = raw.rows.filter((row) => row.siteKey === site.siteKey);
    if (!sameArray(
      uniqueSorted(selected.value.rows.map((row) => row.seamKey)),
      uniqueSorted(expected.map((row) => row.seamKey)),
    )) {
      failures.push(`${label}: site selector ${site.siteKey} does not round-trip to its raw rows.`);
    }
    if (!selected.continuations.every((continuation) =>
      continuation.targetQuery == null || continuation.targetQuery.openSeamSiteKey === site.siteKey
    )) {
      failures.push(`${label}: site-selected continuations do not preserve ${site.siteKey}.`);
    }
  }
}

function readPagedAnswer(app, query) {
  const rows = [];
  const cursors = new Set();
  let firstAnswer = null;
  let cursor = null;
  do {
    if (cursor != null && cursors.has(cursor)) {
      throw new Error(`${query.kind} returned a continuation cycle at ${cursor}.`);
    }
    if (cursor != null) {
      cursors.add(cursor);
    }
    const answer = app.ask({
      ...query,
      page: { size: 200, cursor },
    });
    firstAnswer ??= answer;
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return {
    ...firstAnswer,
    value: {
      ...firstAnswer.value,
      rows,
    },
  };
}

function openSeamSummaryKey(row) {
  return [
    row.seamKindKey,
    uniqueSorted(row.reasonKinds).join('|'),
  ].join('\0');
}

function openSeamVariantKey(row) {
  return openSeamSummaryKey(row);
}

function groupBy(rows, keyForRow) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyForRow(row);
    const group = groups.get(key);
    if (group == null) {
      groups.set(key, [row]);
    } else {
      group.push(row);
    }
  }
  return groups;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function countRows(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function sameCountRows(left, right) {
  return left.length === right.length
    && left.every((row, index) =>
      row.key === right[index]?.key
      && row.count === right[index]?.count
    );
}

function hasHandleCarrier(value) {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(value, 'handles')) {
    return true;
  }
  return Object.values(value).some((child) =>
    Array.isArray(child)
      ? child.some(hasHandleCarrier)
      : hasHandleCarrier(child)
  );
}

function sourceLabel(source) {
  return source?.label ?? '(no source)';
}

function hasExactSource(source) {
  return source?.path != null
    && typeof source.start === 'number'
    && typeof source.end === 'number';
}

function isNoAureliaAppOpenError(error) {
  const message = error?.message ?? '';
  return typeof message === 'string' && message.includes('no aurelia-app project was found');
}
