import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const loader = "'@aurelia/webpack-loader'";

async function recognized(configFile: string, config: string, additionalConfigs: Readonly<Record<string, string>> = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-webpack-conventions-'));
  roots.push(root);
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: 'webpack-convention-test', private: true, type: 'module',
    dependencies: { aurelia: '^2.0.0-rc.2' }, devDependencies: { '@aurelia/webpack-loader': '^2.0.0-rc.2' },
  }));
  writeFileSync(path.join(root, configFile), config);
  for (const [name, text] of Object.entries(additionalConfigs)) writeFileSync(path.join(root, name), text);
  for (const [name, className] of [
    ['app-root', 'AppRoot'], ['script-skipped', 'ScriptSkipped'], ['view-skipped', 'ViewSkipped'],
  ] as const) {
    writeFileSync(path.join(root, 'src', `${name}.ts`), `export class ${className} { message = 'yes'; }`);
    writeFileSync(path.join(root, 'src', `${name}.html`), '<template>${message}</template>');
  }
  writeFileSync(path.join(root, 'src/main.ts'), "import Aurelia from 'aurelia'; import { AppRoot } from './app-root'; Aurelia.app(AppRoot).start();");
  const runtime = await createSemanticRuntime({ workspaceRoot: root });
  try {
    const app = await runtime.openApp();
    const names = app.resourceDefinitions({ size: 100 }).value.rows.map(row => row.name);
    const pressure = app.openSeams({ size: 100 }, 'compact', {
      openSeamKindKey: 'resource.open-convention-transform-admission',
    }).value.rows;
    return { names, pressure };
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}

test.each([
  ['webpack.config.cjs', 'module.exports = function(env, {mode}) { return CONFIG; }'],
  ['webpack.config.mjs', 'export default CONFIG'],
] as const)('admits the matching script and view through %s', async (configFile, declaration) => {
  const config = `{ module: { rules: [
    { test: /\\.ts$/, oneOf: [
      { test: /script-skipped/, use: 'ts-loader' },
      { use: ['ts-loader', ${loader}] }
    ] },
    { test: /\\.html$/, rules: [{ exclude: /view-skipped/, loader: ${loader} }] }
  ] } }`;
  const { names, pressure } = await recognized(configFile, declaration.replace('CONFIG', config));
  expect(names).toContain('app-root');
  expect(names).not.toContain('script-skipped');
  expect(names).not.toContain('view-skipped');
  expect(pressure).toHaveLength(0);
});

test('respects disabled webpack conventions without inferring them from the manifest or same-stem files', async () => {
  const { names } = await recognized('webpack.config.cjs', `module.exports = { module: { rules: [
    { test: /\\.ts$/, use: ['ts-loader', { loader: ${loader}, options: { enableConventions: false } }] },
    { test: /\\.html$/, use: ${loader} }
  ] } };`);
  expect(names).not.toContain('app-root');
});

test('preserves an uncertain first match and an independently known adjacent loader rule', async () => {
  const { names, pressure } = await recognized('webpack.config.cjs', `module.exports = { module: { rules: [
    { test: /app-root\\.(ts|html)$/, oneOf: [
      { issuer: /entry/, use: 'unrelated-loader' },
      { loader: ${loader} },
    ] },
    { test: /script-skipped\\.(ts|html)$/, loader: ${loader} },
  ] } };`);
  expect(names).not.toContain('app-root');
  expect(names).toContain('script-skipped');
  expect(pressure.length).toBeGreaterThan(0);
});

test('matches configured CommonJS path filters only in the config directory', async () => {
  const { names } = await recognized('webpack.config.cjs', `const path=require('node:path');
    module.exports={module:{rules:[{test:/\\.(js|ts|html)$/, include:path.resolve(__dirname,'src'),
      exclude:path.join(__dirname,'src','script-skipped'), use:${loader}}]}};`);
  expect(names).toContain('app-root');
  expect(names).toContain('view-skipped');
  expect(names).not.toContain('script-skipped');
});

test('uses webpack CLI default config precedence when two default filenames exist', async () => {
  const { names } = await recognized('webpack.config.js', 'export default {module:{rules:[]}}', {
    'webpack.config.cjs': `module.exports={module:{rules:[{use:${loader}}]}};`,
  });
  expect(names).not.toContain('app-root');
});

test('admits the common reach when configured webpack and Vite providers differ', async () => {
  const { names } = await recognized('webpack.config.cjs', `module.exports={module:{rules:[{exclude:/view-skipped/, use:${loader}}]}};`, {
    'vite.config.ts': "import aurelia from '@aurelia/vite-plugin'; export default {plugins:[aurelia({include:/app-root|view-skipped/})]};",
  });
  expect(names).toContain('app-root');
  expect(names).not.toContain('script-skipped');
  expect(names).not.toContain('view-skipped');
});
