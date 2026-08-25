import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];

const families = [
  {
    fixture: 'app-pattern-searchable-data-table',
    queryKind: 'binding-observed-dependencies',
    storeKey: 'observed-dependency-conservation-binding',
  },
  {
    fixture: 'watcher-proxy-dependencies',
    queryKind: 'runtime-watcher-observed-dependencies',
    storeKey: 'observed-dependency-conservation-watcher',
  },
  {
    fixture: 'source-observation-effects',
    queryKind: 'runtime-effect-observed-dependencies',
    storeKey: 'observed-dependency-conservation-effect',
  },
  {
    fixture: 'computed-decorator-contexts',
    queryKind: 'computed-observer-observed-dependencies',
    storeKey: 'observed-dependency-conservation-computed',
  },
];

for (const family of families) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure', family.fixture),
    storeKey: family.storeKey,
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const compactAnswer = app.ask({
    kind: family.queryKind,
    page: { size: 400 },
  });
  const detailedAnswer = app.ask({
    kind: family.queryKind,
    detail: 'handles',
    page: { size: 400 },
  });
  const rows = detailedAnswer.value.rows;
  if (rows.length === 0) {
    failures.push(`${family.queryKind}: expected at least one dependency row.`);
    continue;
  }
  assertCompactProjection(family.queryKind, compactAnswer.value.rows, rows);
  for (const row of rows) {
    assertConservedRow(family.queryKind, row);
  }

  const selected = rows.find((row) => row.occurrence.source?.path != null) ?? rows[0];
  const ownerRows = app.ask({
    kind: family.queryKind,
    observedDependencyLocus: {
      kind: 'owner',
      ownerKey: selected.owner.ownerKey,
    },
    page: { size: 400 },
  }).value.rows;
  if (ownerRows.length === 0 || ownerRows.some((row) => row.owner.ownerKey !== selected.owner.ownerKey)) {
    failures.push(`${family.queryKind}: owner locus did not preserve one exact owner.`);
  }

  const selectedRows = app.ask({
    kind: family.queryKind,
    observedDependencyLocus: {
      kind: 'row',
      rowKey: selected.rowKey,
    },
    page: { size: 10 },
  }).value.rows;
  if (selectedRows.length !== 1 || selectedRows[0]?.rowKey !== selected.rowKey) {
    failures.push(`${family.queryKind}: row locus did not select one exact dependency occurrence.`);
  }

  if (selected.occurrence.source?.path != null) {
    const sourceRows = app.ask({
      kind: family.queryKind,
      observedDependencyLocus: {
        kind: 'source-file',
        sourceFile: { filePath: selected.occurrence.source.path },
      },
      page: { size: 400 },
    }).value.rows;
    if (
      sourceRows.length === 0
      || sourceRows.some((row) => row.occurrence.source?.path !== selected.occurrence.source.path)
    ) {
      failures.push(`${family.queryKind}: source-file locus leaked a different authored source.`);
    }
  }

  if (family.queryKind === 'binding-observed-dependencies') {
    const summary = app.ask({
      kind: 'binding-observed-dependency-summary',
      page: { size: 100 },
    }).value;
    if (summary.rows.length === 0) {
      failures.push('binding-observed-dependency-summary: expected at least one cluster.');
    } else {
      const summarizedRows = summary.rows.reduce((count, row) => count + row.count, 0);
      if (summary.totalRows !== rows.length || summarizedRows !== rows.length) {
        failures.push('binding-observed-dependency-summary: cluster counts do not conserve raw dependency rows.');
      }
      for (const cluster of summary.rows) {
        const selectedSummary = app.ask({
          kind: 'binding-observed-dependency-summary',
          observedDependencyLocus: {
            kind: 'cluster',
            clusterKey: cluster.clusterKey,
          },
          page: { size: 10 },
        }).value;
        const selectedRawRows = app.ask({
          kind: family.queryKind,
          observedDependencyLocus: {
            kind: 'cluster',
            clusterKey: cluster.clusterKey,
          },
          page: { size: 400 },
        }).value.rows;
        if (
          selectedSummary.rows.length !== 1
          || selectedSummary.rows[0]?.clusterKey !== cluster.clusterKey
          || selectedSummary.totalRows !== cluster.count
          || selectedRawRows.length !== cluster.count
        ) {
          failures.push(`binding-observed-dependency-summary: cluster ${cluster.clusterKey} did not replay its exact raw rows.`);
        }
      }
    }
  }
}

const preflightRuntime = await createSemanticRuntime({
  workspaceRoot: path.join(packageRoot, 'fixtures/pressure/app-pattern-searchable-data-table'),
  storeKey: 'observed-dependency-conservation-preflight',
});
const invalid = await preflightRuntime.answerAppQuery({
  kind: 'runtime-watcher-observed-dependencies',
  observedDependencyLocus: {
    kind: 'cluster',
    clusterKey: 'not-a-detailed-row-locus',
  },
});
if (invalid.result !== 'unsupported') {
  failures.push(`Expected an unsupported detailed cluster locus to be rejected; got ${invalid.result}.`);
}
const cache = preflightRuntime.analysisCacheOverview();
if (cache.value.cachedAppCount !== 0) {
  failures.push('Invalid observed-dependency locus opened an app epoch before selector preflight.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    families: families.map((family) => family.queryKind),
  }, null, 2));
}

function assertConservedRow(queryKind, row) {
  if (typeof row.rowKey !== 'string' || row.rowKey.length === 0) {
    failures.push(`${queryKind}: dependency row has no rowKey.`);
  }
  if (typeof row.owner?.ownerKey !== 'string' || row.owner.ownerKey.length === 0) {
    failures.push(`${queryKind}: dependency row has no owner key.`);
  }
  if (row.occurrence?.accessUse == null) {
    failures.push(`${queryKind}: dependency row lost its inducing access use.`);
  }
  if (!Object.hasOwn(row.occurrence ?? {}, 'observedMemberSourceState')) {
    failures.push(`${queryKind}: dependency row lost observed-member source state.`);
  }
  if (!Object.hasOwn(row.occurrence ?? {}, 'observedMemberSourceRoute')) {
    failures.push(`${queryKind}: dependency row lost observed-member source route.`);
  }
  if (!Object.hasOwn(row.occurrence ?? {}, 'memberTokenSource')) {
    failures.push(`${queryKind}: dependency row lost member-token source posture.`);
  }
  if (
    row.occurrence?.memberName != null
    && row.occurrence.accessUse?.authored === true
    && row.occurrence.source?.path != null
    && row.occurrence.memberTokenSource == null
  ) {
    failures.push(
      `${queryKind}: authored ${row.occurrence.dependencyKind} '${row.occurrence.memberName}' lost its member-token source.`,
    );
  }
  if (
    row.occurrence?.memberTokenSource != null
    && (
      row.occurrence.memberTokenSource.sourceWorkspaceKey !== row.occurrence.source?.sourceWorkspaceKey
      || row.occurrence.memberTokenSource.sourceFileRole !== row.occurrence.source?.sourceFileRole
    )
  ) {
    failures.push(`${queryKind}: member-token source lost workspace or source-file-role provenance.`);
  }
  if (row.occurrence?.handles?.accessUseProductHandle == null) {
    failures.push(`${queryKind}: dependency occurrence lost its access-use product link.`);
  }
}

function assertCompactProjection(queryKind, compactRows, detailedRows) {
  if (compactRows.length !== detailedRows.length) {
    failures.push(`${queryKind}: compact and handles detail returned different row counts.`);
    return;
  }
  const compactByRowKey = new Map(compactRows.map((row) => [row.rowKey, row]));
  for (const detailed of detailedRows) {
    const compact = compactByRowKey.get(detailed.rowKey);
    if (compact == null) {
      failures.push(`${queryKind}: handles detail changed answer-local row identity.`);
      continue;
    }
    if (compact.owner?.ownerKey !== detailed.owner?.ownerKey) {
      failures.push(`${queryKind}: handles detail changed answer-local owner identity.`);
    }
  }
  if (compactRows.some(containsHandlesCarrier)) {
    failures.push(`${queryKind}: compact projection leaked a handles carrier.`);
  }
  if (JSON.stringify(compactRows).includes('kernel:')) {
    failures.push(`${queryKind}: compact projection leaked a raw kernel handle.`);
  }
  if (compactRows.some((row) =>
    row.rowKey.includes('kernel:')
    || row.owner.ownerKey.includes('kernel:')
  )) {
    failures.push(`${queryKind}: public row or owner identity is a raw kernel handle.`);
  }
}

function containsHandlesCarrier(value) {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  if (Object.hasOwn(value, 'handles')) {
    return true;
  }
  return Object.values(value).some(containsHandlesCarrier);
}
