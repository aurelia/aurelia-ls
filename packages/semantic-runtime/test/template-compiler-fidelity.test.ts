import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import { CompiledTemplateState, TemplateRenderTargetKind } from '../src/template/compiled-template.js';
import {
  TemplateCompilerTargetContextRole,
  TemplateCompilerTargetContextState,
  TemplateCompilerTargetRowPosture,
} from '../src/template/compiler-target-plan.js';
import { HtmlElement } from '../src/template/html-ir.js';
import {
  HydrateElementInstruction,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  type TemplateInstruction,
} from '../src/template/instruction-ir.js';

describe('template compiler fidelity', () => {
  test('conserves compiler closure, nested target contexts, empty let, containerless targets, and native instruction order', async () => {
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
    expect(compiled.openSeams).toHaveLength(4);
    expect(compiled.openSeams).toContain(compilation.bindingCommandLowering.openSeams[0]);
    const textExpansionSeam = compiled.openSeams.find((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.TemplateTextExpansionOpen)
    );
    expect(textExpansionSeam?.summary).toContain('2 holes');
    expect(textExpansionSeam).toEqual(expect.objectContaining({
      seamKindKey: KernelVocabulary.Compiler.OpenTextExpansion.key,
      reasonKinds: [OpenSeamReasonKind.TemplateTextExpansionOpen],
    }));
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

    const targetPlan = compiled.targetPlan;
    targetPlan.assertCoherent();
    expect(targetPlan.isSealed).toBe(true);
    expect(() => JSON.stringify(targetPlan)).not.toThrow();
    const rootRows = targetPlan.root.readRows();
    expect(targetPlan.root.state).toBe(TemplateCompilerTargetContextState.Open);
    expect(targetPlan.root.projectedTargetCount).toBe(14);
    expect(rootRows).toHaveLength(13);
    expect(compiled.renderTargets).toHaveLength(13);
    expect(rootRows.map((row) => ({
      node: row.node instanceof HtmlElement ? row.node.tagName : row.node.text,
      projectedTargetOrdinal: row.projectedTargetOrdinal,
      projectedTargetCount: row.projectedTargetCount,
      posture: row.posture,
      targetKind: row.targetKind,
    }))).toEqual([
      { node: 'let', projectedTargetOrdinal: 0, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'containerless-card', projectedTargetOrdinal: 1, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Open, targetKind: TemplateRenderTargetKind.RenderLocation },
      { node: 'shadow-containerless-card', projectedTargetOrdinal: 2, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.RenderLocation },
      { node: 'select', projectedTargetOrdinal: 3, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'input', projectedTargetOrdinal: 4, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'input', projectedTargetOrdinal: 5, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'input', projectedTargetOrdinal: 6, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'input', projectedTargetOrdinal: 7, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'input', projectedTargetOrdinal: 8, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Open, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: '${first} / ${second}', projectedTargetOrdinal: 9, projectedTargetCount: 2, posture: TemplateCompilerTargetRowPosture.AggregateCompatibility, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'section', projectedTargetOrdinal: 11, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.RenderLocation },
      { node: 'containerless-card', projectedTargetOrdinal: 12, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.RenderLocation },
      { node: 'projection-card', projectedTargetOrdinal: 13, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.RenderLocation },
    ]);
    expect(targetPlan.root.readFrontiers().map((frontier) => frontier.projectedTargetOrdinal))
      .toEqual([1, 3, 8]);
    rootRows.forEach((row, index) => {
      const target = compiled.renderTargets[index]!;
      expect(row.ordinal).toBe(index);
      expect(row.targetKind).toBe(target.targetKind);
      expect(row.node.productHandle).toBe(target.htmlNode?.productHandle);
      expect(row.instructions.map((instruction) => instruction.productHandle)).toEqual(
        instructionsForTarget(
          compiled.instructions,
          compiled.instructionSequences,
          target.instructionSequenceProductHandle,
        ).map((instruction) => instruction.productHandle),
      );
    });
    const firstRootRow = rootRows[0]!;
    expect(() => targetPlan.root.appendRow(
      'late-row',
      firstRootRow.node,
      firstRootRow.instructions,
    )).toThrow(/sealed/);

    const targetContexts = targetPlan.readContexts();
    const controllerContexts = targetContexts.filter((context) =>
      context.role === TemplateCompilerTargetContextRole.TemplateController
    );
    const projectionContexts = targetContexts.filter((context) =>
      context.role === TemplateCompilerTargetContextRole.Projection
    );
    expect(controllerContexts.every((context) => context.state === TemplateCompilerTargetContextState.Complete)).toBe(true);
    expect(projectionContexts.every((context) => context.state === TemplateCompilerTargetContextState.Complete)).toBe(true);
    const controllerInstructions = compiled.instructions.filter((instruction): instruction is HydrateTemplateControllerInstruction =>
      instruction instanceof HydrateTemplateControllerInstruction
    );
    const innerInstruction = controllerInstructions.find((instruction) => instruction.controllerName === 'row-inner');
    const innerContext = controllerContexts.find((context) => context.owner.productHandle === innerInstruction?.productHandle);
    if (innerInstruction == null || innerContext == null) throw new Error('Expected the inner target-plan context.');
    const innerParent = innerContext.ownerContext == null
      ? null
      : targetPlan.contextForLocalKey(innerContext.ownerContext.localKey);
    expect(innerContext.ownerContext?.role).toBe(TemplateCompilerTargetContextRole.TemplateController);
    expect(innerParent?.readRows()).toEqual([
      expect.objectContaining({
        targetKind: TemplateRenderTargetKind.RenderLocation,
        instructions: [innerInstruction],
      }),
    ]);
    expect(innerContext.readRows().map((row) => ({
      targetKind: row.targetKind,
      tagName: row.node instanceof HtmlElement ? row.node.tagName : '#text',
      instructionKinds: row.instructions.map((instruction) => instruction.instructionKind),
    }))).toEqual([
      expect.objectContaining({ targetKind: TemplateRenderTargetKind.MarkerTarget, tagName: 'section' }),
      expect.objectContaining({ targetKind: TemplateRenderTargetKind.MarkerTarget, tagName: '#text' }),
    ]);

    const containerlessContext = controllerContexts.find((context) =>
      context.readRows().some((row) => row.instructions.some((instruction) =>
        instruction instanceof HydrateElementInstruction && instruction.containerless
      ))
    );
    expect(containerlessContext?.readRows()).toEqual([
      expect.objectContaining({ targetKind: TemplateRenderTargetKind.RenderLocation }),
    ]);
    expect(controllerContexts.every((context) => {
      const ownerInstruction = controllerInstructions.find((instruction) =>
        instruction.productHandle === context.owner.productHandle
      );
      return ownerInstruction?.childInstructionSequenceProductHandle != null
        && context.compatibilityInstructionSequenceProductHandle === ownerInstruction.childInstructionSequenceProductHandle
        && context.flattenInstructions().map((instruction) => instruction.productHandle).join('\0')
          === flattenedSequenceInstructionHandles(
            compiled.instructionSequences,
            ownerInstruction.childInstructionSequenceProductHandle,
          ).join('\0');
    })).toBe(true);

    const projectionInstruction = compiled.instructions.find((instruction): instruction is HydrateElementInstruction =>
      instruction instanceof HydrateElementInstruction && instruction.elementName === 'projection-card'
    );
    if (projectionInstruction == null) throw new Error('Expected the projection-card instruction.');
    const projectionCardContexts = projectionContexts.filter((context) =>
      context.owner.productHandle === projectionInstruction.productHandle
    );
    expect(projectionCardContexts
      .map((context) => ({ slotName: context.slotName, rows: context.readRows().length })))
      .toEqual([
        { slotName: 'default', rows: 1 },
        { slotName: 'named', rows: 1 },
      ]);
    expect(projectionCardContexts.every((context) =>
      context.ownerContext?.role === TemplateCompilerTargetContextRole.TemplateController
      && targetPlan.contextForLocalKey(context.ownerContext.localKey)?.readRows().some((row) =>
        row.instructions.includes(projectionInstruction)
        && row.targetKind === TemplateRenderTargetKind.MarkerTarget
      ) === true
    )).toBe(true);
    for (const projection of projectionInstruction.projectionInstructionSequences) {
      const context = projectionContexts.find((candidate) =>
        candidate.owner.productHandle === projectionInstruction.productHandle
        && candidate.slotName === projection.slotName
      );
      expect(context?.flattenInstructions().map((instruction) => instruction.productHandle)).toEqual(
        flattenedSequenceInstructionHandles(compiled.instructionSequences, projection.instructionSequenceProductHandle),
      );
      expect(context?.compatibilityInstructionSequenceProductHandle)
        .toBe(projection.instructionSequenceProductHandle);
    }

    const openClassificationResource = app.emission.templates.resources.find((candidate) =>
      candidate.compilation.definition.name === 'open-classification-probe'
    );
    if (openClassificationResource == null) throw new Error('Expected the open-classification probe resource.');
    const openClassificationPlan = openClassificationResource.compilation.compiledTemplate.targetPlan;
    const openClassificationRows = openClassificationPlan.root.readRows();
    expect(openClassificationPlan.root.state).toBe(TemplateCompilerTargetContextState.Open);
    expect(openClassificationPlan.root.projectedTargetCount).toBe(1);
    expect(openClassificationPlan.root.readFrontiers().map((frontier) => frontier.projectedTargetOrdinal))
      .toEqual([0, 0]);
    expect(openClassificationRows.map((row) => ({
      node: row.node instanceof HtmlElement ? row.node.tagName : row.node.text,
      projectedTargetOrdinal: row.projectedTargetOrdinal,
      posture: row.posture,
      targetKind: row.targetKind,
    }))).toEqual([{
      node: 'div',
      projectedTargetOrdinal: 0,
      posture: TemplateCompilerTargetRowPosture.Complete,
      targetKind: TemplateRenderTargetKind.RenderLocation,
    }]);
    const openClassificationController = openClassificationPlan.readContexts().find((context) =>
      context.role === TemplateCompilerTargetContextRole.TemplateController
    );
    if (openClassificationController == null) throw new Error('Expected the open-classification child context.');
    expect(openClassificationController.state).toBe(TemplateCompilerTargetContextState.Open);
    expect(openClassificationController.projectedTargetCount).toBe(1);
    expect(openClassificationController.readFrontiers()).toEqual([
      expect.objectContaining({ projectedTargetOrdinal: 0 }),
    ]);
    expect(openClassificationController.readRows().map((row) => ({
      node: row.node instanceof HtmlElement ? row.node.tagName : row.node.text,
      projectedTargetOrdinal: row.projectedTargetOrdinal,
      posture: row.posture,
    }))).toEqual([{
      node: 'span',
      projectedTargetOrdinal: 0,
      posture: TemplateCompilerTargetRowPosture.Complete,
    }]);
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

function flattenedSequenceInstructionHandles(
  sequences: readonly { readonly productHandle: string; readonly instructions: readonly { readonly productHandle: string | null }[] }[],
  productHandle: string,
): readonly (string | null)[] {
  return sequences.find((sequence) => sequence.productHandle === productHandle)?.instructions
    .map((instruction) => instruction.productHandle)
    ?? [];
}
