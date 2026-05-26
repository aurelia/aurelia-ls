import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  FixtureVerificationRequest,
  createSemanticRuntime,
  readFixtureVerificationSnapshot,
  verifyFixtureEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const defaultManifestRoots = [
  path.join(packageRoot, 'fixtures/pressure'),
];

const requestedRoots = process.argv.slice(2).map((arg) =>
  path.isAbsolute(arg) ? path.resolve(arg) : path.resolve(workspaceRoot, arg)
);
const manifests = requestedRoots.length > 0
  ? await discoverManifestFiles(requestedRoots)
  : await discoverManifestFiles(defaultManifestRoots);
const results = [];

for (const manifestPath of manifests) {
  results.push(await verifyFixtureManifest(manifestPath));
}

const failed = results.filter((result) => !result.ok);
const summary = {
  ok: failed.length === 0,
  fixtureCount: results.length,
  fixtures: results,
};

if (failed.length > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary, null, 2));
}

async function discoverManifestFiles(roots) {
  const discovered = [];
  for (const root of roots) {
    await collectManifestFiles(root, discovered);
  }
  return discovered.sort();
}

async function collectManifestFiles(root, discovered) {
  if (path.basename(root) === 'semantic-fixture.json') {
    discovered.push(root);
    return;
  }
  for (const entry of await readdirIfExists(root)) {
    const childPath = path.join(root, entry.name);
    if (entry.isFile() && entry.name === 'semantic-fixture.json') {
      discovered.push(childPath);
    } else if (entry.isDirectory()) {
      await collectManifestFiles(childPath, discovered);
    }
  }
}

async function verifyFixtureManifest(manifestPath) {
  const rootDir = path.dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const expectedEffects = (manifest.expectedEffects ?? []).map(expectedEffectFromManifestRow);
  const projectKey = safeProjectKey(path.basename(rootDir));
  const runtime = await createSemanticRuntime({
    workspaceRoot,
    storeKey: `fixture-manifest:${projectKey}`,
    projects: [{
      rootDir: slash(path.relative(workspaceRoot, rootDir)),
      projectKey,
    }],
  });
  const app = await runtime.openApp({
    projectKey,
    analysisDepth: 'binding-observation',
  });
  const verification = verifyFixtureEffects(
    new FixtureVerificationRequest(null, expectedEffects),
    readFixtureVerificationSnapshot(app),
  );
  const failures = verification.effectResults
    .filter((result) => result.outcome !== 'satisfied')
    .map((result) => ({
      outcome: result.outcome,
      effectKind: result.expectedEffect.effectKind,
      summary: result.summary,
    }));

  return {
    fixture: slash(path.relative(workspaceRoot, rootDir)),
    ok: failures.length === 0,
    expectedEffects: expectedEffects.length,
    failures,
  };
}

function expectedEffectFromManifestRow(row) {
  return new ExpectedSemanticEffect(
    String(row.summary ?? ''),
    row.topologyNodeKind ?? null,
    row.effectKind,
    row.scope ?? 'app',
    row.cardinality ?? 'present',
    row.count ?? null,
    (row.filters ?? []).map((filter) => new ExpectedSemanticEffectFilter(filter.field, filter.value)),
    row.role ?? 'baseline',
  );
}

async function readdirIfExists(dirPath) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return [];
    }
    throw error;
  }
}

function slash(value) {
  return value.replaceAll(path.sep, '/');
}

function safeProjectKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}
