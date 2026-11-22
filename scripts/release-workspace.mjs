import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceFixture = fileURLToPath(new URL('../fixtures/release-workspace/', import.meta.url));
const conventionFixture = fileURLToPath(new URL(
  '../packages/semantic-runtime/fixtures/pressure/app-pattern-convention-minimal-app/', import.meta.url,
));

/** Stage the same authored files for the installed editor and MCP clients. Callers supply dependencies. */
export function stageReleaseWorkspace(workspaceRoot, { typeScriptVersion } = {}) {
  const conventionRoot = path.join(workspaceRoot, 'apps/convention');
  const inlineRoot = path.join(workspaceRoot, 'apps/inline');
  const libraryRoot = path.join(workspaceRoot, 'vendor/card-kit');
  const copy = { recursive: true, filter: file => path.basename(file) !== 'node_modules' };
  cpSync(workspaceFixture, workspaceRoot, copy);
  for (const entry of ['package.json', 'tsconfig.json', 'vite.config.ts', 'src']) {
    cpSync(path.join(conventionFixture, entry), path.join(conventionRoot, entry), copy);
  }
  if (typeScriptVersion != null) {
    const manifestPath = path.join(conventionRoot, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const inlineManifest = JSON.parse(readFileSync(path.join(inlineRoot, 'package.json'), 'utf8'));
    manifest.dependencies.aurelia = inlineManifest.dependencies.aurelia;
    manifest.devDependencies['@aurelia/vite-plugin'] = inlineManifest.dependencies.aurelia;
    manifest.devDependencies.typescript = typeScriptVersion;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
  return { conventionRoot, inlineRoot, libraryRoot };
}
