import path from 'node:path';
import { expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test.each([
  ['defineConfig(async () => ({plugins:[aurelia()]}))', true],
  ['async () => await Promise.resolve({plugins:[aurelia()]})', true],
  ['Promise.resolve({plugins:[aurelia()]})', true],
  ['async () => ({plugins:[]})', false],
  ['Promise.reject({plugins:[aurelia()]})', false],
  ['({plugins:[aurelia()], then(resolve: (value: object) => void) { resolve({plugins:[]}); }})', false],
] as const)('admits only fulfilled Vite conventions from %s', async (expression, enabled) => {
  const root = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-convention-minimal-app');
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(root, 'vite.config.ts'), [
    "import aurelia from '@aurelia/vite-plugin';",
    "import {defineConfig} from 'vite';",
    `export default ${expression};`,
  ].join('\n'));
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const definitions = (await runtime.openApp()).resourceDefinitions({size:100});
    expect(definitions.value.rows.some(row => row.name === 'my-app')).toBe(enabled);
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
