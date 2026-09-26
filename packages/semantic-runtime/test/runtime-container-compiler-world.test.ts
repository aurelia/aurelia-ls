import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { ResourceDefinitionIndex } from '../src/resources/resource-definition-index.js';
import { TemplateRuntimeAnalysisProjectContext, TemplateRuntimeAnalysisResource } from '../src/template/template-runtime-analysis-context.js';

test('runtime compiler invocation uses native leaf/root resources, not its service world ancestor resources', async () => {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const fixture = path.join(packageRoot, 'fixtures/pressure/template-spread-capture-semantics');
  const main = path.join(fixture, 'src/main.ts');
  const resources = path.join(fixture, 'src/capture-resources.ts');
  const normalize = (file: string) => path.resolve(file).toLowerCase();
  const overlay = new Map([
    [normalize(main), readFileSync(main, 'utf8')
      .replace("new Aurelia()", "import { RootInputMark } from './capture-resources';\nnew Aurelia()")
      .replace('.register(StandardConfiguration)', '.register(StandardConfiguration, RootInputMark)')],
    [normalize(resources), `${readFileSync(resources, 'utf8')}\n@customAttribute('input-mark')\nexport class RootInputMark { @bindable value = ''; }`],
    [normalize(path.join(fixture, 'src/template-spread-capture-semantics-app.html')), '<capture-shell></capture-shell>'],
    [normalize(path.join(fixture, 'src/capture-shell.html')), '<au-compose></au-compose>'],
  ]);
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixture,
    storeKey: 'runtime-container-compiler-world',
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile: file => overlay.get(normalize(file)),
      fileExists: file => overlay.has(normalize(file)) ? true : undefined,
    })),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const appResource = app.emission.templates.resources.find(r => r.compilation.definition.name === 'template-spread-capture-semantics-app')!;
    const shell = app.emission.templates.resources.find(r => r.compilation.definition.name === 'capture-shell')!;
    const compose = appResource.runtimeAnalysis.runtimeRendering.controllers.find(c => c.name === 'au-compose')!;
    const container = compose.containerFrame!;
    const rootDefinition = app.emission.resources.readDefinitions().find(d => d.target.localName === 'RootInputMark')!;
    const localDefinition = app.emission.resources.readDefinitions().find(d => d.target.localName === 'InputMark')!;
    expect(shell.compilation.compilerWorld.resourceResolver.attr('input-mark')?.definitionProductHandle).toBe(localDefinition.productHandle);
    expect(container.find('custom-attribute', 'input-mark').resourceSlot?.resourceProductHandle).toBe(rootDefinition.productHandle);
    const run = runtime.computationLifecycle.begin({ kind: 'runtime-container-world-test', reconciliationKey: 'runtime-container-world-test', summary: 'Actual runtime container compiler world.' });
    try {
      const context = new TemplateRuntimeAnalysisProjectContext(
        run,
        app.emission.templates.resources.map(r => new TemplateRuntimeAnalysisResource(r.compilation)),
        app.emission.appWorld,
        ResourceDefinitionIndex.fromProject(app.emission.resources),
      );
      const world = context.compilerWorldForRuntimeContainer(container, shell.compilation.compilerWorld, 'runtime-container-world-test', compose.sourceAddressHandle);
      expect(world.container).toBe(container);
      expect(world.resourceResolver.attr('input-mark')?.definitionProductHandle).toBe(rootDefinition.productHandle);
      expect(world.resourceResolver.attr('inner-gate')).toBeNull();
      expect(world.bindingCommandResolver.get('bind')).not.toBeNull();
    } finally { run.abort(); }

    const require = createRequire(import.meta.url);
    const { DI } = require(path.join(packageRoot, '../../aurelia/packages/kernel/dist/cjs/index.cjs'));
    const { CustomAttribute } = require(path.join(packageRoot, '../../aurelia/packages/runtime-html/dist/cjs/index.cjs'));
    class NativeRootMark {}
    class NativeLocalMark {}
    const root = DI.createContainer().register(CustomAttribute.define('input-mark', NativeRootMark));
    const parent = root.createChild().register(CustomAttribute.define('input-mark', NativeLocalMark));
    const leaf = parent.createChild();
    expect(CustomAttribute.find(parent, 'input-mark').Type).toBe(NativeLocalMark);
    expect(CustomAttribute.find(leaf, 'input-mark').Type).toBe(NativeRootMark);
  } finally { runtime.retireWorkspaceIncarnation(); }
}, 45_000);
