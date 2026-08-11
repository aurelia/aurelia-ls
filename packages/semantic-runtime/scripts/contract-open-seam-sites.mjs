import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  openSeamSiteKey,
  openSeamSiteRows,
} from '../out/api/open-seam-projections.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/evaluation-open-seam-sites');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'open-seam-sites-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const raw = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 20 },
}).value;
const sites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 20 },
}).value;
const summary = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSummary,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 20 },
}).value;
const rawRollup = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 0 },
}).value;
const siteRollup = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 0 },
}).value;
const summaryRollup = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSummary,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 0 },
}).value;
const selectedClusterRawAnswer = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  openSeamClusterKey: summary.rows[0]?.clusterKey,
  page: { size: 20 },
});
const selectedSiteRawAnswer = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  openSeamSiteKey: sites.rows[0]?.siteKey,
  page: { size: 20 },
});
const filteredBySourceRoleAnswer = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  sourceRole: 'app-source',
  page: { size: 20 },
});
const filteredBySourceRole = filteredBySourceRoleAnswer.value;
const filteredByReasonAnswer = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  openSeamReasonKind: 'static-evaluation-identifier-not-in-environment',
  page: { size: 20 },
});
const filteredByReason = filteredByReasonAnswer.value;
const filteredByOtherRole = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  sourceRole: 'tooling-script',
  page: { size: 20 },
}).value;
const overview = app.ask({
  kind: SemanticAppQueryKind.AppOverview,
  openSeamPageSize: 5,
}).value;
const openSeamCatalogAlias = runtime.appQueryCatalog({
  group: 'open-seams',
}).value;
const authoredFirstCanarySites = openSeamSiteRows([
  ...Array.from({ length: 5 }, (_, index) => syntheticOpenSeamRow({
    summary: `External repeated seam ${index}`,
    sourceRole: 'external-source',
    path: 'node_modules/pkg/index.ts',
    start: 10,
    end: 20,
  })),
  syntheticOpenSeamRow({
    summary: 'External product-pressure wording must not split the causal variant',
    sourceRole: 'external-source',
    path: 'node_modules/pkg/index.ts',
    start: 10,
    end: 20,
    pressureKind: 'product-pressure',
    impacts: [{ impactKey: 'impact:synthetic', products: [{ productKey: 'product:synthetic' }] }],
  }),
  syntheticOpenSeamRow({
    summary: 'Authored single seam',
    sourceRole: 'app-source',
    path: 'src/app.ts',
    start: 30,
    end: 40,
  }),
]);
const workspaceSiteKeyA = openSeamSiteKey(syntheticSource('workspace-a', 'src/app.ts', 1, 2, 'app-source'), 'seam:a');
const workspaceSiteKeyB = openSeamSiteKey(syntheticSource('workspace-b', 'src/app.ts', 1, 2, 'app-source'), 'seam:b');

const failures = [];
if (raw.rows.length !== 6) {
  failures.push(`Expected 6 raw unresolved-identifier rows from repeated callback evaluation, observed ${raw.rows.length}.`);
}
if (!raw.rows.every((row) => row.sourceRole === 'app-source')) {
  failures.push(`Expected raw seam rows to expose sourceRole=app-source, observed ${raw.rows.map((row) => row.sourceRole).join(', ')}.`);
}
if (!raw.rows.every((row) => row.sourceRange?.start?.line >= 0 && row.sourceRange?.start?.character >= 0)) {
  failures.push(`Expected raw seam rows to expose authored source ranges, observed ${JSON.stringify(raw.rows.map((row) => row.sourceRange))}.`);
}
if (!raw.displayText.includes('src/app.ts:4:48') || !raw.displayText.includes('src/app.ts:5:48')) {
  failures.push(`Expected raw seam display text to include line/column samples for both authored sites, observed: ${raw.displayText}`);
}
if (countOccurrences(raw.displayText, "Identifier 'missingFlag'") !== 1
  || countOccurrences(raw.displayText, "Identifier 'missingValue'") !== 1) {
  failures.push(`Expected raw seam display samples to dedupe repeated derivation rows by authored site, observed: ${raw.displayText}`);
}
if (sites.totalOpenSeamRows !== raw.rows.length) {
  failures.push(`Expected site projection totalOpenSeamRows=${raw.rows.length}, observed ${sites.totalOpenSeamRows}.`);
}
if (sites.totalOpenSeamSites !== 2 || sites.rows.length !== 2) {
  failures.push(`Expected 2 unique authored seam sites, observed total=${sites.totalOpenSeamSites}, rows=${sites.rows.length}.`);
}
for (const row of sites.rows) {
  if (row.rawRowCount !== 3) {
    failures.push(`Expected each seam site to cover 3 raw rows, observed ${row.rawRowCount} for ${row.siteKey}.`);
  }
  if (row.variantCount !== 1 || row.variantSamples.length !== 0) {
    failures.push(`Expected single-variant seam sites to preserve variantCount while omitting duplicate variantSamples, observed variants=${row.variantCount}, samples=${row.variantSamples.length}.`);
  }
  if (row.source?.path?.endsWith('src/app.ts') !== true) {
    failures.push(`Expected seam site source to point at src/app.ts, observed ${JSON.stringify(row.source)}.`);
  }
  if (row.sourceRole !== 'app-source') {
    failures.push(`Expected seam site sourceRole=app-source, observed ${row.sourceRole} for ${row.siteKey}.`);
  }
  if (!row.applicationFileRoles.includes('component-source')) {
    failures.push(`Expected seam site applicationFileRoles to include component-source, observed ${JSON.stringify(row.applicationFileRoles)} for ${row.siteKey}.`);
  }
  const originKinds = row.staticEvaluationOrigins.map((origin) => origin.kind).sort();
  if (!originKinds.includes('static-evaluation-root') || !originKinds.includes('module-graph-dependency')) {
    failures.push(`Expected seam site to expose both root and module-dependency static evaluation origins, observed ${JSON.stringify(row.staticEvaluationOrigins)} for ${row.siteKey}.`);
  }
  if (!row.staticEvaluationOrigins.some((origin) => origin.kind === 'static-evaluation-root' && origin.entrySourcePath === 'src/app.ts')) {
    failures.push(`Expected static-evaluation-root origin to point at src/app.ts, observed ${JSON.stringify(row.staticEvaluationOrigins)}.`);
  }
  if (!row.staticEvaluationOrigins.some((origin) => origin.kind === 'module-graph-dependency' && origin.entrySourcePath === 'src/main.ts')) {
    failures.push(`Expected module-graph-dependency origin to point at src/main.ts, observed ${JSON.stringify(row.staticEvaluationOrigins)}.`);
  }
  if (row.sourceRange == null || row.sourceRange.start.line < 0 || row.sourceRange.start.character < 0) {
    failures.push(`Expected seam site to carry a zero-based sourceRange, observed ${JSON.stringify(row.sourceRange)}.`);
  }
}
if (summary.rows.length !== 1 || summary.rows[0]?.count !== raw.rows.length) {
  failures.push('Expected open-seam-summary to remain a kind/reason cluster over all raw rows.');
}
if (summary.totalOpenSeamRows !== raw.rows.length || summary.totalOpenSeamSites !== sites.totalOpenSeamSites) {
  failures.push(`Expected open-seam-summary totals to expose raw rows=${raw.rows.length} and unique sites=${sites.totalOpenSeamSites}, observed rows=${summary.totalOpenSeamRows}, sites=${summary.totalOpenSeamSites}.`);
}
if (summary.rows[0]?.uniqueSiteCount !== sites.totalOpenSeamSites) {
  failures.push(`Expected open-seam-summary to expose uniqueSiteCount=${sites.totalOpenSeamSites}, observed ${summary.rows[0]?.uniqueSiteCount}.`);
}
for (const [label, rollup] of [
  ['raw', rawRollup],
  ['site', siteRollup],
  ['summary', summaryRollup],
]) {
  if (rollup.rows.length !== 0) {
    failures.push(`Expected ${label} size-zero rollup to return no rows, observed ${rollup.rows.length}.`);
  }
  if (/^(?:Seam|Boundary|Pressure|Source) kinds?: none\.$/mu.test(rollup.displayText)) {
    failures.push(`Expected ${label} size-zero rollup to preserve global dimensions instead of reporting none: ${rollup.displayText}`);
  }
  if (!rollup.displayText.includes('app-source')) {
    failures.push(`Expected ${label} size-zero rollup to preserve app-source coverage: ${rollup.displayText}`);
  }
}
if (selectedClusterRawAnswer.value.rows.length !== raw.rows.length) {
  failures.push(`Expected summary cluster selector to recover all ${raw.rows.length} raw rows, observed ${selectedClusterRawAnswer.value.rows.length}.`);
}
if (!selectedClusterRawAnswer.continuations.every((continuation) =>
  continuation.targetQuery == null || continuation.targetQuery.openSeamClusterKey === summary.rows[0]?.clusterKey
)) {
  failures.push(`Expected cluster-selected continuations to preserve ${summary.rows[0]?.clusterKey}.`);
}
if (selectedSiteRawAnswer.value.rows.length !== sites.rows[0]?.rawRowCount
  || !selectedSiteRawAnswer.value.rows.every((row) => row.siteKey === sites.rows[0]?.siteKey)) {
  failures.push(`Expected site selector to recover exactly the first authored site's raw rows.`);
}
if (!selectedSiteRawAnswer.continuations.every((continuation) =>
  continuation.targetQuery == null || continuation.targetQuery.openSeamSiteKey === sites.rows[0]?.siteKey
)) {
  failures.push(`Expected site-selected continuations to preserve ${sites.rows[0]?.siteKey}.`);
}
if (summary.rows[0]?.sourceRoles[0]?.role !== 'app-source' || summary.rows[0]?.sourceRoles[0]?.count !== raw.rows.length) {
  failures.push(`Expected open-seam-summary to roll up sourceRole=app-source x${raw.rows.length}, observed ${JSON.stringify(summary.rows[0]?.sourceRoles)}.`);
}
if (summary.rows[0]?.sampleSourceSites.some((site) => site.sourceRange?.start?.line === 3 && site.sourceRange.start.character === 47) !== true
  || summary.rows[0]?.sampleSourceSites.some((site) => site.sourceRange?.start?.line === 4 && site.sourceRange.start.character === 47) !== true) {
  failures.push(`Expected open-seam-summary sampleSourceSites to carry ranges for both authored sites, observed ${JSON.stringify(summary.rows[0]?.sampleSourceSites)}.`);
}
if (!summary.displayText.includes('src/app.ts:4:48') || !summary.displayText.includes('src/app.ts:5:48')) {
  failures.push(`Expected open-seam-summary display text to include line/column samples, observed: ${summary.displayText}`);
}
if (!summary.displayText.includes('raw=6 sites=2')) {
  failures.push(`Expected open-seam-summary display text to distinguish raw rows from unique sites, observed: ${summary.displayText}`);
}
if (!summary.displayText.includes('6 raw open seam row(s) across 2 unique authored site(s)')) {
  failures.push(`Expected open-seam-summary headline to distinguish total raw rows from total unique sites, observed: ${summary.displayText}`);
}
if (filteredBySourceRole.totalOpenSeamRows !== raw.rows.length || filteredBySourceRole.totalOpenSeamSites !== sites.totalOpenSeamSites) {
  failures.push(`Expected sourceRole=app-source filter to preserve app-source seam sites, observed rows=${filteredBySourceRole.totalOpenSeamRows}, sites=${filteredBySourceRole.totalOpenSeamSites}.`);
}
if (filteredByOtherRole.totalOpenSeamRows !== 0 || filteredByOtherRole.totalOpenSeamSites !== 0 || filteredByOtherRole.rows.length !== 0) {
  failures.push(`Expected sourceRole=tooling-script filter to exclude app-source seam sites, observed rows=${filteredByOtherRole.totalOpenSeamRows}, sites=${filteredByOtherRole.totalOpenSeamSites}.`);
}
if (!filteredBySourceRole.displayText.includes('sourceRole=app-source')) {
  failures.push(`Expected source-role filter to be echoed in display text, observed: ${filteredBySourceRole.displayText}`);
}
if (!filteredBySourceRoleAnswer.continuations.every((continuation) =>
  continuation.targetQuery == null || continuation.targetQuery.sourceRole === 'app-source'
)) {
  failures.push(`Expected source-role-filtered continuations to preserve sourceRole=app-source, observed ${JSON.stringify(filteredBySourceRoleAnswer.continuations)}.`);
}
if (filteredByReason.totalOpenSeamRows !== raw.rows.length || filteredByReason.totalOpenSeamSites !== sites.totalOpenSeamSites) {
  failures.push(`Expected reason-kind filter to preserve unresolved-identifier seam sites, observed rows=${filteredByReason.totalOpenSeamRows}, sites=${filteredByReason.totalOpenSeamSites}.`);
}
if (!filteredByReason.displayText.includes('reason=static-evaluation-identifier-not-in-environment')
  || !filteredByReason.displayText.includes('openSeamReasonKind')) {
  failures.push(`Expected reason-kind filter and raw-row drill-down affordance in display text, observed: ${filteredByReason.displayText}`);
}
if (!filteredByReasonAnswer.continuations.every((continuation) =>
  continuation.targetQuery == null || continuation.targetQuery.openSeamReasonKind === 'static-evaluation-identifier-not-in-environment'
)) {
  failures.push(`Expected reason-kind-filtered continuations to preserve openSeamReasonKind, observed ${JSON.stringify(filteredByReasonAnswer.continuations)}.`);
}
if (!sites.displayText.includes('unique authored site(s)') || !sites.displayText.includes('raw=3')) {
  failures.push(`Expected open-seam-sites display text to explain site/raw counts, observed: ${sites.displayText}`);
}
if (!sites.displayText.includes('Boundary kinds: static-environment-gap=6')
  || !sites.displayText.includes('Pressure kinds: evidence-only=6')
  || !sites.displayText.includes('Reason kinds: static-evaluation-identifier-not-in-environment=6')) {
  failures.push(`Expected open-seam-sites display text to conserve raw causal counts, observed: ${sites.displayText}`);
}
if (!sites.displayText.includes('Source roles: app-source=2') || !sites.displayText.includes('sourceRole=app-source')) {
  failures.push(`Expected open-seam-sites display text to include source-role evidence, observed: ${sites.displayText}`);
}
if (!sites.displayText.includes('Application roles: component-source=2') || !sites.displayText.includes('appRoles=component-source')) {
  failures.push(`Expected open-seam-sites display text to include application role evidence, observed: ${sites.displayText}`);
}
if (!sites.displayText.includes('Static evaluation origins: module-graph-dependency=2, static-evaluation-root=2') || !sites.displayText.includes('evalOrigins=module-graph-dependency, static-evaluation-root')) {
  failures.push(`Expected open-seam-sites display text to include static evaluation origin evidence, observed: ${sites.displayText}`);
}
if (overview.openSeams.value.rows.length === 0 || overview.openSeams.value.totalOpenSeamRows === 0) {
  failures.push('Expected explicit openSeamPageSize to preserve raw seam audit rows in the typed overview child.');
}
if (overview.analysisLimitations.value.candidateCount !== 0 || overview.analysisLimitations.value.rows.length !== 0) {
  failures.push(`Expected evidence-only evaluator seams to remain outside configured analysis limitations, observed ${JSON.stringify(overview.analysisLimitations.value)}.`);
}
if (!overview.displayText.includes('no diagnostic rows or configured analysis limitations')) {
  failures.push(`Expected normal app overview pressure to lead with configured findings, observed: ${overview.displayText}`);
}
if (/raw derivation|Open seam samples|open seam site\(s\)|src\/app\.ts:4:48|sourceRole=app-source|appRoles=component-source|evalOrigins=/u.test(overview.displayText)) {
  failures.push(`Expected normal app overview text to keep raw seam audit counts and samples quiet, observed: ${overview.displayText}`);
}
const aliasQueryKinds = new Set(openSeamCatalogAlias.rows.map((row) => row.queryKind));
for (const queryKind of [
  SemanticAppQueryKind.OpenSeams,
  SemanticAppQueryKind.OpenSeamSummary,
  SemanticAppQueryKind.OpenSeamSites,
]) {
  if (!aliasQueryKinds.has(queryKind)) {
    failures.push(`Expected app-query catalog group=open-seams alias to include ${queryKind}, observed ${[...aliasQueryKinds].join(', ')}.`);
  }
}
if (openSeamCatalogAlias.rows.some((row) => !row.supportsOpenSeamFilters)) {
  failures.push(`Expected group=open-seams alias to return only open-seam filter-capable rows, observed ${JSON.stringify(openSeamCatalogAlias.rows)}.`);
}
const rawCatalog = openSeamCatalogAlias.rows.find((row) => row.queryKind === SemanticAppQueryKind.OpenSeams);
const summaryCatalog = openSeamCatalogAlias.rows.find((row) => row.queryKind === SemanticAppQueryKind.OpenSeamSummary);
const sitesCatalog = openSeamCatalogAlias.rows.find((row) => row.queryKind === SemanticAppQueryKind.OpenSeamSites);
if (rawCatalog?.supportsDetail !== true || summaryCatalog?.supportsDetail !== false || sitesCatalog?.supportsDetail !== false) {
  failures.push(`Expected only raw open seams to advertise handle detail, observed ${JSON.stringify({ rawCatalog, summaryCatalog, sitesCatalog })}.`);
}
if (authoredFirstCanarySites[0]?.sourceRole !== 'app-source') {
  failures.push(`Expected authored open-seam sites to sort before larger external clusters, observed ${JSON.stringify(authoredFirstCanarySites.map((row) => ({ role: row.sourceRole, rawRowCount: row.rawRowCount, source: row.source?.label })))}`);
}
const repeatedExternalSite = authoredFirstCanarySites.find((row) => row.sourceRole === 'external-source');
if (repeatedExternalSite?.rawRowCount !== 6
  || repeatedExternalSite.variantCount !== 1
  || !repeatedExternalSite.pressureKinds.includes('evidence-only')
  || !repeatedExternalSite.pressureKinds.includes('product-pressure')) {
  failures.push(`Expected prose and pressure changes to remain one typed causal variant while preserving pressure counts, observed ${JSON.stringify(repeatedExternalSite)}.`);
}
if (workspaceSiteKeyA === workspaceSiteKeyB) {
  failures.push(`Expected source workspace identity to participate in exact authored-site keys.`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    raw,
    sites,
    summary,
    openSeamCatalogAlias,
    overviewDisplayText: overview.displayText,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    rawRows: raw.rows.length,
    rawDisplayText: raw.displayText,
    siteRows: sites.rows.map((row) => ({
      seamKindKeys: row.seamKindKeys,
      rawRowCount: row.rawRowCount,
      sourceRole: row.sourceRole,
      applicationFileRoles: row.applicationFileRoles,
      staticEvaluationOrigins: row.staticEvaluationOrigins,
      source: row.source?.label,
      sourceRange: row.sourceRange,
    })),
    sitesDisplayText: sites.displayText,
    overviewDisplayText: overview.displayText,
  }, null, 2));
}

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

function syntheticOpenSeamRow({
  summary,
  sourceRole,
  path: sourcePath,
  start,
  end,
  pressureKind = 'evidence-only',
  impacts = [],
}) {
  const source = syntheticSource('synthetic-workspace', sourcePath, start, end, sourceRole);
  const seamKey = `seam:${summary}`;
  return {
    seam: null,
    seamKey,
    siteKey: openSeamSiteKey(source, seamKey),
    seamKindKey: 'evaluation.dynamic-call',
    summary,
    boundaryKinds: ['runtime-execution-boundary'],
    reasonKinds: ['static-evaluation-dynamic-call'],
    reasonSources: [],
    pressureKind,
    impacts,
    source,
    sourceRole,
  };
}

function syntheticSource(sourceWorkspaceKey, sourcePath, start, end, sourceRole) {
  return {
    kind: 'source-span-address',
    label: `${sourcePath}@${start}..${end}`,
    path: sourcePath,
    start,
    end,
    sourceWorkspaceKey,
    sourceFileRole: sourceRole,
  };
}
