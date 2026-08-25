import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { CompiledTemplateState, TemplateRenderTargetKind } from '../src/template/compiled-template.js';
import { HtmlElement } from '../src/template/html-ir.js';
import {
  HydrateElementInstruction,
  HydrateLetElementInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  type TemplateInstruction,
} from '../src/template/instruction-ir.js';

describe('template compiler fidelity', () => {
  test('conserves compiler closure, empty let, containerless targets, and native instruction order', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-compiler-fidelity');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-fidelity',
    });
    const app = await runtime.openApp({ analysisDepth: 'runtime-topology' });
    const resource = app.emission.templates.resources.find((candidate) =>
      candidate.compilation.definition.name === 'template-compiler-fidelity-app'
    );
    expect(resource).toBeDefined();
    if (resource == null) {
      throw new Error('Expected the template compiler fidelity app resource.');
    }

    const compilation = resource.compilation;
    const compiled = compilation.compiledTemplate;
    expect(compilation.bindingCommandLowering.openSeams).toHaveLength(1);
    expect(compilation.bindingCommandLowering.openSeams[0]?.summary)
      .toContain("Binding command 'open-command'");
    expect(compiled.openSeams).toEqual(compilation.bindingCommandLowering.openSeams);
    expect(compiled.compiledTemplate.state).toBe(CompiledTemplateState.Partial);
    expect(compiled.compiledTemplate.needsCompile).toBeNull();

    const emptyLet = compilation.html.nodes.find((node) =>
      node instanceof HtmlElement && node.tagName.toLowerCase() === 'let'
    );
    expect(emptyLet).toBeDefined();
    const hydrateLet = compiled.instructions.find((instruction) =>
      instruction instanceof HydrateLetElementInstruction
    );
    expect(hydrateLet?.node.productHandle).toBe(emptyLet?.productHandle);
    expect(hydrateLet?.instructionProductHandles).toEqual([]);

    const containerlessTarget = compiled.renderTargets.find((target) =>
      instructionsForTarget(compiled.instructions, compiled.instructionSequences, target.instructionSequenceProductHandle)
        .some((instruction) => instruction instanceof HydrateElementInstruction && instruction.containerless)
    );
    expect(containerlessTarget?.targetKind).toBe(TemplateRenderTargetKind.RenderLocation);

    const nodes = new Map(compilation.html.nodes.map((node) => [node.productHandle, node]));
    const targetOrders = compiled.renderTargets.flatMap((target) => {
      const node = target.htmlNode?.productHandle == null ? null : nodes.get(target.htmlNode.productHandle) ?? null;
      if (!(node instanceof HtmlElement)) {
        return [];
      }
      return [{
        tagName: node.tagName.toLowerCase(),
        targets: instructionsForTarget(
          compiled.instructions,
          compiled.instructionSequences,
          target.instructionSequenceProductHandle,
        )
          .map(runtimeInstructionTarget)
          .filter((instructionTarget): instructionTarget is string => instructionTarget != null),
      }];
    });
    expect(targetOrders).toEqual(expect.arrayContaining([
      { tagName: 'select', targets: ['multiple', 'value'] },
      { tagName: 'input', targets: ['value', 'checked'] },
      { tagName: 'input', targets: ['model', 'checked'] },
      { tagName: 'input', targets: ['matcher', 'checked'] },
      { tagName: 'input', targets: ['model', 'disabled', 'checked'] },
    ]));
  }, 30_000);
});

function instructionsForTarget(
  instructions: readonly TemplateInstruction[],
  sequences: readonly { readonly productHandle: string; readonly instructions: readonly { readonly productHandle: string | null }[] }[],
  sequenceProductHandle: string,
): readonly TemplateInstruction[] {
  const instructionsByHandle = new Map(instructions.map((instruction) => [instruction.productHandle, instruction]));
  return sequences.find((sequence) => sequence.productHandle === sequenceProductHandle)?.instructions
    .flatMap((reference) => reference.productHandle == null ? [] : [instructionsByHandle.get(reference.productHandle)!])
    ?? [];
}

function runtimeInstructionTarget(instruction: TemplateInstruction): string | null {
  return instruction instanceof PropertyBindingInstruction
    ? instruction.targetProperty
    : instruction instanceof InterpolationInstruction
      ? instruction.target
      : null;
}
