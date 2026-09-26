import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { IterateBinding } from '../src/template/runtime-binding.js';
import { IterateBindingInstruction } from '../src/template/instruction-ir.js';
import { RuntimeRendererKind } from '../src/template/runtime-renderer-reference.js';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const fixtureRoot = path.join(repositoryRoot, 'packages/semantic-runtime/fixtures/pressure/ui-virtualization-template-controller');

describe('native virtualization binding identity', () => {
  test('the native type-200 renderer creates a callback binding, not a property binding', () => {
    const requireFramework = createRequire(path.join(repositoryRoot, 'aurelia/package.json'));
    const { DI } = requireFramework('@aurelia/kernel');
    const { IRenderer } = requireFramework('@aurelia/runtime-html');
    const { ExpressionParser } = requireFramework('@aurelia/expression-parser');
    const { DefaultVirtualizationConfiguration } = requireFramework('@aurelia/ui-virtualization');
    const container = DI.createContainer().register(DefaultVirtualizationConfiguration);
    const renderer = container.getAll(IRenderer).find((value: { target: number }) => value.target === 200);
    const bindings: { constructor: { name: string }; target: object; ast: object }[] = [];
    const target = { handleItemsChangeChange() {} };
    const ast = new ExpressionParser().parse('item of items', 'IsIterator');
    renderer.render({ container, addBinding(binding: typeof bindings[number]) { bindings.push(binding); } },
      { viewModel: target }, { type: 200, forOf: ast, to: 'items', props: [] }, undefined, undefined, {});
    expect(bindings).toHaveLength(1);
    expect(bindings[0]!.constructor.name).toBe('IterateBinding');
    expect(bindings[0]!.target).toBe(target);
    expect(bindings[0]!.ast).toBe(ast);
    container.dispose();
  });

  test('keeps iterator scope and source reads without inventing property accessors for plugin targets', async () => {
    const runtime = await createSemanticRuntime({ workspaceRoot: fixtureRoot, storeKey: 'virtualization-binding-identity' });
    try {
      const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
      const resource = app.emission.templates.resources.find(value => value.compilation.definition.name === 'ui-virtualization-app')!;
      const analysis = resource.runtimeAnalysis;
      const instructions = resource.compilation.compiledTemplate.instructions.filter(value => value instanceof IterateBindingInstruction);
      const bindings = analysis.runtimeRendering.bindings.filter(value => value instanceof IterateBinding);
      expect(instructions).toHaveLength(4);
      expect(bindings).toHaveLength(4);
      for (const binding of bindings) {
        expect(binding.renderer.rendererKind).toBe(RuntimeRendererKind.IterateBinding);
        expect(binding.scopeEffects).toHaveLength(1);
        expect(instructions.some(instruction => instruction.productHandle === binding.instructionProductHandle)).toBe(true);
        expect(analysis.controllerBind.targetAccesses.filter(access => access.binding.productHandle === binding.productHandle)).toEqual([]);
        const flows = analysis.bindingDataFlow.dataFlows.filter(flow => flow.binding.productHandle === binding.productHandle);
        expect(flows).toHaveLength(1);
        expect(flows[0]!.direction).toBe('source-read');
      }
      // Existing virtual-repeat controller observer/lifecycle frontiers remain; exact dispatch must not hide them.
      expect(analysis.runtimeRendering.openSeams.flatMap(seam => seam.reasonKinds))
        .not.toContain('runtime-rendering-renderer-unavailable');
      expect(analysis.runtimeRendering.openSeams.flatMap(seam => seam.reasonKinds))
        .not.toContain('runtime-rendering-product-missing');
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);
});
