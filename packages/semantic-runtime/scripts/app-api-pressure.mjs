import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticProjectShapeKind,
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
  defaultRoots,
  envRootNames: ['SEMANTIC_RUNTIME_PRESSURE_ROOTS'],
  usageName: 'pnpm --filter @aurelia-ls/semantic-runtime pressure:app-api',
  label: 'app-api pressure',
  fixtureHelp: 'Use --fixture pressure-name or pressure:<name> for focused fixture pressure.',
};
const cliOptions = parsePressureRootCliOptions(process.argv.slice(2), pressureRootSelectionConfig);
const roots = pressureRootsForOptions(cliOptions, pressureRootSelectionConfig);
const analysisDepth = process.env.SEMANTIC_RUNTIME_PRESSURE_ANALYSIS_DEPTH ?? 'binding-observation';
const queryPageSize = integerEnv('SEMANTIC_RUNTIME_PRESSURE_QUERY_PAGE_SIZE', 40);
const projectShapeFilter = pressureProjectShapeFilter();

console.log('semantic-runtime app API pressure');
console.log('scope: transient current API pressure; project keys, paths, and source text are omitted');
console.log(`analysis-depth: ${analysisDepth}`);
console.log(`fixture-filter: ${cliOptions.fixtureNames.length === 0 ? 'all' : cliOptions.fixtureNames.join(',')}`);
console.log(`root-filter: ${cliOptions.rootEntries.length === 0 ? 'all' : `${cliOptions.rootEntries.length} selected`}`);
console.log(`project-shapes: ${projectShapeFilter == null ? 'all' : [...projectShapeFilter].join(',')}`);
console.log(`inputs: ${roots.length}`);

const started = performance.now();
const results = [];
for (const root of roots) {
  results.push(await readPressureForRoot(root));
}

const aggregate = combineResults(results);
console.log(JSON.stringify({
  ok: aggregate.failures === 0,
  elapsedMilliseconds: Math.round(performance.now() - started),
  roots: aggregate.roots,
  openedApps: aggregate.openedApps,
  skippedProjects: aggregate.skippedProjects,
  failures: aggregate.failures,
  outcomes: Object.fromEntries(aggregate.outcomes),
  counts: Object.fromEntries(aggregate.counts),
  diagnostics: Object.fromEntries(aggregate.diagnostics),
}, null, 2));

if (aggregate.failures > 0) {
  process.exitCode = 1;
}

async function readPressureForRoot(root) {
  const label = fixtureRootLabel(root);
  const storeKey = `app-api-pressure:${safeStoreKey(label)}`;
  const result = {
    label,
    openedApps: 0,
    skippedProjects: 0,
    failures: 0,
    outcomes: new Map(),
    counts: new Map(),
    diagnostics: new Map(),
  };
  try {
    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey,
    });
    const app = await runtime.openApp({ analysisDepth });
    if (!projectShapeAllowed(app.summary().value.projectShapeKind)) {
      result.skippedProjects += 1;
      return result;
    }
    result.openedApps += 1;
    for (const query of pressureQueries()) {
      const answer = app.ask(query);
      increment(result.outcomes, `${query.kind}:${answer.outcome}`);
      observeAnswer(result, query.kind, answer.value);
      observeContinuations(result, query.kind, answer.continuations ?? []);
    }
  } catch (error) {
    result.failures += 1;
    increment(result.outcomes, `error:${error?.name ?? 'unknown'}`);
  }
  return result;
}

function pressureQueries() {
  return [
    { kind: SemanticAppQueryKind.Summary },
    { kind: SemanticAppQueryKind.AppOverview },
    { kind: SemanticAppQueryKind.SourceFiles, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.AppDiagnosticSummary, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.TypeScriptDiagnostics, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.TemplateDiagnostics, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.OpenSeams, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.OpenSeamSummary, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.AppTopology, includeTypeSurfaces: true },
    { kind: SemanticAppQueryKind.ResourceDefinitions, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.ResourceIssues, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.RuntimeControllers, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.RuntimeWatchers, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.BindingValueChannelSummary, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.BindingDataFlowSummary, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.BindingObservedDependencySummary, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.StateStores, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.I18nTranslationKeys, page: { size: queryPageSize } },
    { kind: SemanticAppQueryKind.RouterOverview, rowPageSize: Math.min(queryPageSize, 20) },
  ];
}

function observeAnswer(result, queryKind, value) {
  if (value == null || typeof value !== 'object') {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child)) {
      increment(result.counts, `${queryKind}:${key}`, child.length);
    } else if (key === 'rows' && Array.isArray(child)) {
      increment(result.counts, `${queryKind}:rows`, child.length);
    } else if (typeof child === 'number') {
      increment(result.counts, `${queryKind}:${key}`, child);
    }
  }
  const diagnosticRows = Array.isArray(value.rows)
    ? value.rows.filter((row) => row != null && typeof row === 'object' && 'diagnosticKind' in row)
    : [];
  for (const row of diagnosticRows) {
    increment(result.diagnostics, `${queryKind}:${row.diagnosticKind ?? 'unknown'}`);
  }
}

function observeContinuations(result, queryKind, continuations) {
  increment(result.counts, `${queryKind}:continuations`, continuations.length);
  for (const continuation of continuations) {
    increment(result.counts, `${queryKind}:continuation:${continuation.kind}`);
  }
}

function combineResults(results) {
  const aggregate = {
    roots: results.length,
    openedApps: 0,
    skippedProjects: 0,
    failures: 0,
    outcomes: new Map(),
    counts: new Map(),
    diagnostics: new Map(),
  };
  for (const result of results) {
    aggregate.openedApps += result.openedApps;
    aggregate.skippedProjects += result.skippedProjects;
    aggregate.failures += result.failures;
    addCounts(aggregate.outcomes, result.outcomes);
    addCounts(aggregate.counts, result.counts);
    addCounts(aggregate.diagnostics, result.diagnostics);
  }
  return aggregate;
}

function addCounts(target, source) {
  for (const [key, count] of source) {
    increment(target, key, count);
  }
}

function increment(map, key, count = 1) {
  map.set(key, (map.get(key) ?? 0) + count);
}

function projectShapeAllowed(shapeKind) {
  if (projectShapeFilter == null) {
    return true;
  }
  return projectShapeFilter.has(shapeKind);
}

function pressureProjectShapeFilter() {
  const raw = process.env.SEMANTIC_RUNTIME_PRESSURE_PROJECT_SHAPES;
  if (raw == null || raw.trim().length === 0 || raw.trim() === 'all') {
    return null;
  }
  const values = new Set(raw
    .split(/[;,]/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0));
  return values.size === 0
    ? new Set([SemanticProjectShapeKind.AureliaApp])
    : values;
}

function fixtureRootLabel(root) {
  const relative = path.relative(pressureFixtureRoot, path.resolve(root));
  return relative.length > 0 && !relative.startsWith('..')
    ? `pressure:${relative.split(path.sep)[0]}`
    : 'input';
}

function integerEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function safeStoreKey(value) {
  return value.replace(/[^a-z0-9._:-]/gi, '_');
}
