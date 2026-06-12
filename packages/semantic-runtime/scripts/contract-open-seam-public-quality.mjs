import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
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
    const rawAnswer = app.ask({
      kind: SemanticAppQueryKind.OpenSeams,
      page: { size: 200 },
    });
    const sitesAnswer = app.ask({
      kind: SemanticAppQueryKind.OpenSeamSites,
      page: { size: 200 },
    });
    const summaryAnswer = app.ask({
      kind: SemanticAppQueryKind.OpenSeamSummary,
      page: { size: 200 },
    });
    const raw = rawAnswer.value;
    const sites = sitesAnswer.value;
    const summary = summaryAnswer.value;
    stats.rawRows += raw.rows.length;
    stats.siteRows += sites.rows.length;
    stats.summaryRows += summary.rows.length;
    verifyRawRows(label, rawAnswer);
    verifySiteRows(label, sitesAnswer);
    verifySummaryRows(label, summaryAnswer, sites);
  } catch (error) {
    if (isNoAureliaAppOpenError(error)) {
      stats.skippedProjects += 1;
      return;
    }
    failures.push(`${label}: failed to open app: ${error?.message ?? error}`);
  }
}

function verifyRawRows(label, rawAnswer) {
  const raw = rawAnswer.value;
  if (rawAnswer.page?.nextCursor != null) {
    failures.push(`${label}: open-seams quality page is truncated; increase contract paging before trusting coverage.`);
  }
  for (const row of raw.rows) {
    if (!Array.isArray(row.reasonKinds) || row.reasonKinds.length === 0) {
      failures.push(`${label}: raw ${row.seamKindKey} row has empty reasonKinds at ${sourceLabel(row.source)}.`);
    }
    if (hasExactSource(row.source) && row.sourceRange == null) {
      failures.push(`${label}: raw ${row.seamKindKey} row has exact source without sourceRange at ${sourceLabel(row.source)}.`);
    }
    for (const reasonSource of row.reasonSources ?? []) {
      if (hasExactSource(reasonSource.source) && reasonSource.sourceRange == null) {
        failures.push(`${label}: reason source ${reasonSource.reasonKind} has exact source without sourceRange at ${sourceLabel(reasonSource.source)}.`);
      }
    }
  }
}

function verifySiteRows(label, sitesAnswer) {
  const sites = sitesAnswer.value;
  if (sitesAnswer.page?.nextCursor != null) {
    failures.push(`${label}: open-seam-sites quality page is truncated; increase contract paging before trusting coverage.`);
  }
  if (typeof sites.totalOpenSeamRows !== 'number' || typeof sites.totalOpenSeamSites !== 'number') {
    failures.push(`${label}: open-seam-sites result is missing raw/site totals.`);
  }
  for (const row of sites.rows) {
    if (!Array.isArray(row.reasonKinds) || row.reasonKinds.length === 0) {
      failures.push(`${label}: site ${row.seamKindKey} has empty reasonKinds at ${sourceLabel(row.source)}.`);
    }
    if (hasExactSource(row.source) && row.sourceRange == null) {
      failures.push(`${label}: site ${row.seamKindKey} has exact source without sourceRange at ${sourceLabel(row.source)}.`);
    }
    const originKinds = row.staticEvaluationOrigins.map((origin) => origin.kind);
    if (originKinds.length !== new Set(originKinds).size) {
      failures.push(`${label}: site ${row.seamKindKey} has duplicate staticEvaluationOrigins kinds at ${sourceLabel(row.source)}.`);
    }
  }
}

function verifySummaryRows(label, summaryAnswer, sites) {
  const summary = summaryAnswer.value;
  if (summaryAnswer.page?.nextCursor != null) {
    failures.push(`${label}: open-seam-summary quality page is truncated; increase contract paging before trusting coverage.`);
  }
  if (summary.totalOpenSeamRows !== sites.totalOpenSeamRows || summary.totalOpenSeamSites !== sites.totalOpenSeamSites) {
    failures.push(`${label}: open-seam-summary totals disagree with open-seam-sites totals: summary rows=${summary.totalOpenSeamRows} sites=${summary.totalOpenSeamSites}; sites rows=${sites.totalOpenSeamRows} sites=${sites.totalOpenSeamSites}.`);
  }
  for (const row of summary.rows) {
    if (!Array.isArray(row.reasonKinds) || row.reasonKinds.length === 0) {
      failures.push(`${label}: summary ${row.seamKindKey} cluster has empty reasonKinds.`);
    }
    for (const sample of row.sampleSourceSites ?? []) {
      if (hasExactSource(sample.source) && sample.sourceRange == null) {
        failures.push(`${label}: summary ${row.seamKindKey} sample has exact source without sourceRange at ${sourceLabel(sample.source)}.`);
      }
    }
  }
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
