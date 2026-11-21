import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';

test.each([
  ['', 'element-property-accessor'],
  ['.register(FullAnalyzer)', 'data-attribute-accessor'],
  ['.register(Registration.instance(ISVGAnalyzer, { isStandardSvgAttribute: () => false }))', 'unknown'],
])('selects the visible SVG analyzer with %s', async (registration, expected) => {
  const root = fileURLToPath(new URL('../fixtures/pressure/app-pattern-minimal-app/', import.meta.url));
  const files = new Map([
    [path.join(root, 'src/main.ts'), `import Aurelia, { Registration } from 'aurelia';
      import { SVGAnalyzer as FullAnalyzer, ISVGAnalyzer } from '@aurelia/runtime-html';
      import { App } from './app'; Aurelia${registration}.app(App).start();`],
    [path.join(root, 'src/app.html'), '<svg><circle fill.bind="message" data-control.bind="message"></circle></svg>'],
  ]);
  const authority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
    readFile: name => files.get(path.resolve(name)),
    fileExists: name => files.has(path.resolve(name)) ? true : undefined,
  }));
  const runtime = await createSemanticRuntime({ workspaceRoot: root, projectInputAuthority: authority, storeKey: `svg-service:${expected}` });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const answer = app.bindingTargetAccesses({ size: 100 });
  expect(answer.page.exhausted).toBe(true);
  expect(answer.value.rows).toContainEqual(expect.objectContaining({ targetProperty: 'fill', strategy: expected }));
  expect(answer.value.rows).toContainEqual(expect.objectContaining({ targetProperty: 'data-control', strategy: 'data-attribute-accessor' }));
});
