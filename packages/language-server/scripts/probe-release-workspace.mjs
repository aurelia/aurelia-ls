import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [manifestPath, serverPath, projectTypeScript] = process.argv.slice(2);
if (!manifestPath || !serverPath || process.argv.length > 5) {
  throw new Error('Usage: probe-release-workspace.mjs <VSIX manifest.json> <installed dist/server/main.cjs> [project TypeScript version]');
}
const server = path.resolve(serverPath);
const receipt = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.equal(receipt.schemaVersion, 'aurelia-ls/vscode-vsix-artifact/v1');
const expected = receipt.entries.find(entry => entry.path === 'extension/dist/server/main.cjs');
assert.ok(expected, 'the VSIX manifest records its server bundle');
const hash = createHash('sha256').update(readFileSync(server)).digest('hex');
assert.equal(hash, expected.sha256, 'the selected server is the one in the verified VSIX');

const root = fileURLToPath(new URL('../../../', import.meta.url));
for (const version of projectTypeScript ? [projectTypeScript] : ['5.9.3', '6.0.3']) {
  assert.match(version, /^\d+\.\d+\.\d+$/, 'specify an exact project TypeScript version');
  console.log(`VSIX ${receipt.artifact.sha256}, server ${hash}, project TypeScript ${version}`);
  const run = spawnSync(process.execPath, [
    'scripts/run-vitest.mjs', 'packages/language-server/test/integration/release-workspace.test.ts',
  ], {
    cwd: root,
    env: { ...process.env, AURELIA_LS_TEST_SERVER: server, AURELIA_LS_RELEASE_TYPESCRIPT: version },
    stdio: 'inherit',
  });
  if (run.error) throw run.error;
  if (run.status !== 0) process.exit(run.status ?? 1);
}
