import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { SemanticAppQueryKind } from '../src/api/contracts.js';
import { createSemanticRuntime, type SemanticApp } from '../src/api/runtime.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';
import type { AddressHandle, ProductHandle } from '../src/kernel/handles.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import { sourceSpanAddressForAddress } from '../src/kernel/source-address.js';
import type { KernelStoreReadView } from '../src/kernel/store.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import { runtimeBindingSourceExpression } from '../src/observation/runtime-binding-expression.js';
import { RuntimeBindingDataFlowSourceKind } from '../src/observation/runtime-binding-observation.js';
import { RuntimeExpressionOperationKind } from '../src/runtime-expression/runtime-expression-access-use.js';
import { RuntimeOperationReachability } from '../src/runtime-expression/runtime-operation.js';
import {
  CompiledTemplateContextRole,
  CompiledTemplateState,
  TemplateRenderTargetKind,
} from '../src/template/compiled-template.js';
import {
  TemplateCompilerTargetContextRole,
  TemplateCompilerTargetContextState,
  TemplateCompilerTargetRowPosture,
} from '../src/template/compiler-target-plan.js';
import { HtmlElement, HtmlText, type HtmlIrNode } from '../src/template/html-ir.js';
import {
  HydrateElementInstruction,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  TextBindingInstruction,
  type TemplateInstruction,
} from '../src/template/instruction-ir.js';
import { ContentBinding, RuntimeBindingKind } from '../src/template/runtime-binding.js';
import { RuntimeControllerCreationKind } from '../src/template/runtime-controller.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import {
  bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset,
  RuntimeBindingSourceEnvironmentSelectionKind,
  runtimeExpressionBindingsForTemplateExpressionProductHandleAtChain,
} from '../src/template/template-expression-selection.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler fidelity', () => {
  test('conserves compiler closure, nested target contexts, empty let, containerless targets, and native instruction order', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-compiler-fidelity');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-fidelity',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
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
    expect(compiled.openSeams).toHaveLength(3);
    expect(compiled.openSeams).toContain(compilation.bindingCommandLowering.openSeams[0]);
    const textExpansionSeam = compiled.openSeams.find((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.TemplateTextExpansionOpen)
    );
    expect(textExpansionSeam).toBeUndefined();
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

    const containerlessTarget = compiled.compiledTemplate.targets.find((target) =>
      instructionsForTarget(compiled.instructions, compiled.instructionSequences, target.instructionSequenceProductHandle)
        .some((instruction) =>
          instruction instanceof HydrateElementInstruction
            && instruction.elementName === 'containerless-card'
        )
    );
    expect(containerlessTarget?.targetKind).toBe(TemplateRenderTargetKind.RenderLocation);
    const definitionContainerlessInstruction = compiled.instructions.find((instruction) =>
      instruction instanceof HydrateElementInstruction
        && instruction.elementName === 'containerless-card'
    );
    expect(definitionContainerlessInstruction).toEqual(expect.objectContaining({ containerless: false }));

    const nodes = new Map(compilation.html.nodes.map((node) => [node.productHandle, node]));
    const targetOrders = compiled.compiledTemplate.targets.flatMap((target) => {
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
    expect(rootRows).toHaveLength(14);
    expect(compiled.compiledTemplate.targets).toHaveLength(14);
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
      { node: '${first} / ${second}', projectedTargetOrdinal: 9, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: '${first} / ${second}', projectedTargetOrdinal: 10, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.MarkerTarget },
      { node: 'section', projectedTargetOrdinal: 11, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.RenderLocation },
      { node: 'containerless-card', projectedTargetOrdinal: 12, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.RenderLocation },
      { node: 'projection-card', projectedTargetOrdinal: 13, projectedTargetCount: 1, posture: TemplateCompilerTargetRowPosture.Complete, targetKind: TemplateRenderTargetKind.RenderLocation },
    ]);
    expect(targetPlan.root.readFrontiers().map((frontier) => frontier.projectedTargetOrdinal))
      .toEqual([1, 3, 8]);
    rootRows.forEach((row, index) => {
      const target = compiled.compiledTemplate.targets[index]!;
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
    const multiHoleRows = rootRows.filter((row) =>
      row.node instanceof HtmlText && row.node.text === '${first} / ${second}'
    );
    const multiHoleInstructions = multiHoleRows.flatMap((row) => row.instructions)
      .filter((instruction): instruction is TextBindingInstruction => instruction instanceof TextBindingInstruction);
    expect(multiHoleInstructions).toHaveLength(2);
    expect(multiHoleInstructions.map((instruction) => instruction.expressionChainIndex)).toEqual([0, 1]);
    expect(new Set(multiHoleInstructions.map((instruction) => instruction.expressionProductHandle)).size).toBe(1);
    expect(new Set(multiHoleInstructions.map((instruction) => instruction.productHandle)).size).toBe(2);
    expect(multiHoleRows.map((row) => row.sourceAddressHandle)).toEqual(
      multiHoleInstructions.map((instruction) => instruction.sourceAddressHandle),
    );
    expect(multiHoleRows.map((row) => sourceTextForAddress(
      runtime.workspace.store,
      compilation.unit.templateSource.markup,
      row.sourceAddressHandle,
    ))).toEqual(['first', 'second']);
    const multiHoleTargets = multiHoleRows.map((row) => compiled.compiledTemplate.targets[row.ordinal]!);
    const sequencesByHandle = new Map(compiled.instructionSequences.map((sequence) => [
      sequence.productHandle,
      sequence,
    ]));
    expect(multiHoleTargets.map((target) => target.sourceAddressHandle)).toEqual(
      multiHoleRows.map((row) => row.sourceAddressHandle),
    );
    expect(multiHoleTargets.map((target) =>
      sequencesByHandle.get(target.instructionSequenceProductHandle)?.sourceAddressHandle
    )).toEqual(multiHoleRows.map((row) => row.sourceAddressHandle));
    expect(new Set(multiHoleTargets.map((target) => target.productHandle)).size).toBe(2);
    expect(new Set(multiHoleTargets.map((target) => target.instructionSequenceProductHandle)).size).toBe(2);

    const expressionProductHandle = multiHoleInstructions[0]?.expressionProductHandle ?? null;
    const multiHoleParse = compilation.valueSites.parses.find((parse) =>
      parse.productHandle === expressionProductHandle
    );
    if (multiHoleParse == null) throw new Error('Expected the aggregate multi-hole parser product.');
    const multiHoleBindings = resource.runtimeAnalysis.runtimeRendering.bindings
      .filter((binding): binding is ContentBinding =>
        binding instanceof ContentBinding && binding.expressionProductHandle === expressionProductHandle
      );
    expect(multiHoleBindings.map((binding) => binding.expressionChainIndex)).toEqual([0, 1]);
    for (const expressionChainIndex of [0, 1]) {
      expect(runtimeExpressionBindingsForTemplateExpressionProductHandleAtChain(
        resource,
        multiHoleParse.productHandle,
        expressionChainIndex,
      )).toEqual([multiHoleBindings[expressionChainIndex]]);
      const source = sourceSpanAddressForAddress(
        runtime.workspace.store,
        multiHoleRows[expressionChainIndex]?.sourceAddressHandle ?? null,
      );
      if (source == null) throw new Error(`Expected source for interpolation hole ${expressionChainIndex}.`);
      const selection = bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset(
        runtime.workspace.store,
        resource,
        multiHoleParse,
        source.start,
      );
      expect(selection.kind).toBe(RuntimeBindingSourceEnvironmentSelectionKind.Context);
      expect(selection.kind === RuntimeBindingSourceEnvironmentSelectionKind.Context
        ? selection.sourceProjection?.expressionChainIndex
        : null).toBe(expressionChainIndex);
    }
    expect(multiHoleBindings.map((binding) => runtimeBindingSourceExpression(
      runtime.workspace.store,
      binding,
    ))).toEqual([
      expect.objectContaining({ $kind: 'AccessScope', name: expect.objectContaining({ name: 'first' }) }),
      expect.objectContaining({ $kind: 'AccessScope', name: expect.objectContaining({ name: 'second' }) }),
    ]);
    const multiHoleBindingHandles = new Set(multiHoleBindings.map((binding) => binding.productHandle));
    expect(resource.runtimeAnalysis.bindingDataFlow.dataFlows
      .filter((dataFlow) => dataFlow.binding.productHandle != null
        && multiHoleBindingHandles.has(dataFlow.binding.productHandle))
      .map((dataFlow) => ({
        sourceName: dataFlow.sourceName,
        expressionChainIndex: dataFlow.expressionChainIndex,
      }))).toEqual([
      { sourceName: 'first', expressionChainIndex: 0 },
      { sourceName: 'second', expressionChainIndex: 1 },
    ]);
    expect(resource.runtimeAnalysis.expressionAccesses.accessUses
      .filter((accessUse) => multiHoleBindingHandles.has(accessUse.ownerProductHandle))
      .map((accessUse) => ({
        operationKind: accessUse.operationKind,
        operationIndex: accessUse.operationIndex,
        source: sourceTextForAddress(
          runtime.workspace.store,
          compilation.unit.templateSource.markup,
          accessUse.nameSourceAddressHandle,
        ),
      }))).toEqual([
      { operationKind: RuntimeExpressionOperationKind.InterpolationPart, operationIndex: 0, source: 'first' },
      { operationKind: RuntimeExpressionOperationKind.InterpolationPart, operationIndex: 1, source: 'second' },
    ]);
    const publicFlows = app.ask({
      kind: SemanticAppQueryKind.BindingDataFlows,
      detail: 'handles',
      page: { size: 1_000 },
    }).value.rows.filter((row) => row.definitionName === 'template-compiler-fidelity-app');
    expect(publicFlows.some((row) =>
      row.bindingKind === RuntimeBindingKind.Property
        && row.sourceName === 'selection'
        && row.expressionChainIndex === 0
    )).toBe(true);
    expect(publicFlows.filter((row) =>
      row.bindingKind === RuntimeBindingKind.Content
        && row.handles?.expressionProductHandle === multiHoleParse.productHandle
    ).map((row) => ({
      expressionChainIndex: row.expressionChainIndex,
      source: sourceTextForPublicSource(compilation.unit.templateSource.markup, row.expressionSource),
    }))).toEqual([
      { expressionChainIndex: 0, source: 'first' },
      { expressionChainIndex: 1, source: 'second' },
    ]);
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
    expect(compiled.compiledTemplates).toHaveLength(targetContexts.length);
    const reachableNodeOwners = new Map<string, string>();
    for (const context of targetContexts) {
      const contextTemplate = compiled.readCompiledTemplate(context.compiledTemplate.productHandle);
      expect(contextTemplate).toEqual(expect.objectContaining({
        productHandle: context.compiledTemplate.productHandle,
        identityHandle: context.compiledTemplate.identityHandle,
        context: expect.objectContaining({
          role: compiledTemplateRole(context.role),
        }),
      }));
      expect(contextTemplate?.targets).toHaveLength(context.readRows().length);
      if (context.ownerContext != null) {
        const parentClaims = runtime.workspace.store.readClaimsForSubject(
          context.ownerContext.compiledTemplate.productHandle,
        ).map((handle) => runtime.workspace.store.readClaim(handle));
        const instructionClaims = runtime.workspace.store.readClaimsForSubject(
          context.owner.productHandle,
        ).map((handle) => runtime.workspace.store.readClaim(handle));
        expect(parentClaims).toContainEqual(expect.objectContaining({
          predicateKey: KernelVocabulary.Template.ContainsChildCompiledTemplate.key,
          objectHandle: context.compiledTemplate.productHandle,
        }));
        expect(instructionClaims).toContainEqual(expect.objectContaining({
          predicateKey: KernelVocabulary.Instruction.InstructionOwnsChildCompiledTemplate.key,
          objectHandle: context.compiledTemplate.productHandle,
        }));
      }
      context.readRows().forEach((row, rowIndex) => {
        const target = contextTemplate?.targets[rowIndex];
        const sequence = target == null
          ? null
          : sequencesByHandle.get(target.instructionSequenceProductHandle) ?? null;
        expect(target).toEqual(expect.objectContaining({
          targetKind: row.targetKind,
          htmlNode: expect.objectContaining({ productHandle: row.node.productHandle }),
        }));
        expect(sequence?.instructions.map((instruction) => instruction.productHandle)).toEqual(
          row.instructions.map((instruction) => instruction.productHandle),
        );
      });
      for (const productHandle of contextTemplate?.compilerReachableNodeProductHandles ?? []) {
        expect(reachableNodeOwners.has(productHandle)).toBe(false);
        reachableNodeOwners.set(productHandle, contextTemplate!.productHandle);
      }
    }
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
        instruction instanceof HydrateElementInstruction
          && instruction.elementName === 'containerless-card'
      ))
    );
    expect(containerlessContext?.readRows()).toEqual([
      expect.objectContaining({ targetKind: TemplateRenderTargetKind.RenderLocation }),
    ]);
    expect(controllerContexts.every((context) => {
      const ownerInstruction = controllerInstructions.find((instruction) =>
        instruction.productHandle === context.owner.productHandle
      );
      return ownerInstruction?.childCompiledTemplate?.productHandle === context.compiledTemplate.productHandle;
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
    for (const projection of projectionInstruction.projections) {
      const context = projectionContexts.find((candidate) =>
        candidate.owner.productHandle === projectionInstruction.productHandle
        && candidate.slotName === projection.slotName
      );
      expect(context?.compiledTemplate.productHandle)
        .toBe(projection.compiledTemplate.productHandle);
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

    const staticContextResource = requiredTemplateResource(app, 'static-context-probe');
    const staticControllerContext = staticContextResource.compilation.compiledTemplate.targetPlan.readContexts()
      .find((context) => context.role === TemplateCompilerTargetContextRole.TemplateController);
    if (staticControllerContext == null) throw new Error('Expected the static template-controller context.');
    const staticChildTemplate = staticContextResource.compilation.compiledTemplate.readCompiledTemplate(
      staticControllerContext.compiledTemplate.productHandle,
    );
    expect(staticChildTemplate).toEqual(expect.objectContaining({
      state: CompiledTemplateState.Complete,
      needsCompile: false,
      targets: [],
    }));
    expect(htmlNodeLabels(
      staticContextResource.compilation.html.nodes,
      staticChildTemplate?.compilerReachableNodeProductHandles ?? [],
    )).toEqual(['div', 'span', 'static child']);
    const staticViewFactories = staticContextResource.runtimeAnalysis.runtimeRendering.viewFactories.filter(
      (factory) => factory.compiledTemplateProductHandle === staticChildTemplate?.productHandle,
    );
    expect(staticViewFactories).toHaveLength(1);
    expect(staticContextResource.runtimeAnalysis.runtimeRendering.controllers.filter((controller) =>
      controller.creationKind === RuntimeControllerCreationKind.SyntheticView
        && controller.compiledTemplateProductHandle === staticChildTemplate?.productHandle
    )).toEqual([
      expect.objectContaining({
        compiledTemplateProductHandle: staticChildTemplate?.productHandle,
      }),
    ]);

    const staticProjectionResource = requiredTemplateResource(app, 'static-projection-probe');
    const staticProjectionContexts = staticProjectionResource.compilation.compiledTemplate.targetPlan.readContexts()
      .filter((context) => context.role === TemplateCompilerTargetContextRole.Projection);
    expect(staticProjectionContexts.map((context) => context.slotName)).toEqual(['default', 'named']);
    expect(new Set(staticProjectionContexts.map((context) => context.compiledTemplate.productHandle)).size).toBe(2);
    const staticProjectionLabels = new Map<string | null, readonly string[]>();
    for (const context of staticProjectionContexts) {
      const childTemplate = staticProjectionResource.compilation.compiledTemplate.readCompiledTemplate(
        context.compiledTemplate.productHandle,
      );
      expect(childTemplate).toEqual(expect.objectContaining({
        state: CompiledTemplateState.Complete,
        needsCompile: false,
        targets: [],
      }));
      staticProjectionLabels.set(context.slotName, htmlNodeLabels(
        staticProjectionResource.compilation.html.nodes,
        childTemplate?.compilerReachableNodeProductHandles ?? [],
      ));
    }
    expect(Object.fromEntries(staticProjectionLabels)).toEqual({
      default: ['span', 'static default'],
      named: ['template', 'b', 'static named'],
    });

    const openProjectionResource = requiredTemplateResource(app, 'open-projection-probe');
    const openProjectionTemplate = openProjectionResource.compilation.compiledTemplate.compiledTemplates.find(
      (template) => template.context.role === CompiledTemplateContextRole.Projection,
    );
    expect(openProjectionTemplate?.state).toBe(CompiledTemplateState.Open);
    expect(openProjectionResource.runtimeAnalysis.runtimeRendering.contentProjectionViews.find((view) =>
      view.compiledTemplate?.productHandle === openProjectionTemplate?.productHandle
    )?.closureKind).toBe('open');

    const slotResource = requiredTemplateResource(app, 'slot-under-template-controller-probe');
    const slotCompiled = slotResource.compilation.compiledTemplate;
    expect(slotCompiled.compiledTemplate.hasSlots).toBe(true);
    expect(slotCompiled.compiledTemplate.nativeSlotOutlets).toHaveLength(1);
    expect(slotCompiled.compiledTemplates
      .filter((template) => template.context.role !== CompiledTemplateContextRole.Root)
      .every((template) => !template.hasSlots && template.nativeSlotOutlets.length === 0))
      .toBe(true);

    const usageContainerlessResource = requiredTemplateResource(app, 'containerless-usage-probe');
    const usageInstruction = usageContainerlessResource.compilation.compiledTemplate.instructions.find(
      (instruction): instruction is HydrateElementInstruction =>
        instruction instanceof HydrateElementInstruction && instruction.elementName === 'projection-card'
    );
    expect(usageInstruction?.containerless).toBe(true);
    const usageTarget = usageContainerlessResource.compilation.compiledTemplate.compiledTemplate.targets.find((target) =>
      instructionsForTarget(
        usageContainerlessResource.compilation.compiledTemplate.instructions,
        usageContainerlessResource.compilation.compiledTemplate.instructionSequences,
        target.instructionSequenceProductHandle,
      ).includes(usageInstruction!)
    );
    expect(usageTarget?.targetKind).toBe(TemplateRenderTargetKind.RenderLocation);

    const compilerTargetHandles = new Set(app.emission.templates.resources.flatMap((templateResource) =>
      templateResource.compilation.compiledTemplate.compiledTemplates.flatMap((template) =>
        template.targets.map((target) => target.productHandle)
      )
    ));
    expect(new Set(runtime.workspace.store.productDetails.readBySlot(TemplateProductDetails.RenderTarget)
      .map((entry) => entry.productHandle))).toEqual(compilerTargetHandles);
    const compiledTemplateHandles = new Set(app.emission.templates.resources.flatMap((templateResource) =>
      templateResource.compilation.compiledTemplate.compiledTemplates.map((template) => template.productHandle)
    ));
    expect(app.emission.templates.resources.every((templateResource) =>
      templateResource.runtimeAnalysis.runtimeRendering.viewFactories.every((factory) =>
        compiledTemplateHandles.has(factory.compiledTemplateProductHandle)
      )
      && templateResource.runtimeAnalysis.runtimeRendering.controllers
        .filter((controller) => controller.creationKind === RuntimeControllerCreationKind.SyntheticView)
        .every((controller) => controller.compiledTemplateProductHandle != null
          && compiledTemplateHandles.has(controller.compiledTemplateProductHandle))
    )).toBe(true);
  }, 30_000);

  test('keeps resource planning and runtime analysis partitioned by hole across projection render contexts', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/content-projection-topology');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-text-hole-projection-fidelity',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const resource = app.emission.templates.resources.find((candidate) =>
      candidate.compilation.definition.name === 'content-projection-topology-app'
    );
    if (resource == null) throw new Error('Expected the content-projection topology app resource.');

    const node = resource.compilation.html.nodes.find((candidate): candidate is HtmlText =>
      candidate instanceof HtmlText
        && candidate.text === '${message | projectionLabel}: ${$host.exposedLabel}'
    );
    if (node == null) throw new Error('Expected the resource-bearing multi-hole text node.');
    const instructions = resource.compilation.compiledTemplate.instructions
      .filter((instruction): instruction is TextBindingInstruction =>
        instruction instanceof TextBindingInstruction
          && instruction.node.productHandle === node.productHandle
      );
    expect(instructions.map((instruction) => instruction.expressionChainIndex)).toEqual([0, 1]);
    const expressionProductHandle = instructions[0]?.expressionProductHandle ?? null;
    expect(expressionProductHandle).not.toBeNull();
    expect(instructions.every((instruction) =>
      instruction.expressionProductHandle === expressionProductHandle
    )).toBe(true);
    const parse = resource.compilation.valueSites.parses.find((candidate) =>
      candidate.productHandle === expressionProductHandle
    );
    if (parse?.result.kind !== ExpressionParseResultKind.InterpolationSuccess) {
      throw new Error('Expected one successful aggregate interpolation parse.');
    }
    expect(parse.result.ast.expressions.map((expression) => sourceTextForSpan(
      resource.compilation.unit.templateSource.markup,
      expression.span.start,
      expression.span.end,
    ))).toEqual(['message | projectionLabel', '$host.exposedLabel']);

    const instructionHandles = new Set(instructions.map((instruction) => instruction.productHandle));
    const bindings = resource.runtimeAnalysis.runtimeRendering.bindings
      .filter((binding): binding is ContentBinding =>
        binding instanceof ContentBinding
          && binding.node.productHandle === node.productHandle
          && instructionHandles.has(binding.instructionProductHandle)
      );
    expect(bindings).toHaveLength(4);
    expect(bindings.map((binding) => binding.expressionChainIndex).sort()).toEqual([0, 0, 1, 1]);
    const bindingsByController = Map.groupBy(bindings, (binding) =>
      resource.runtimeAnalysis.runtimeRendering
        .requireRenderContextForBinding(binding.productHandle)
        .sourceController.productHandle
    );
    expect(bindingsByController.size).toBe(2);
    expect([...bindingsByController.values()].every((controllerBindings) =>
      controllerBindings.map((binding) => binding.expressionChainIndex).sort().join(',') === '0,1'
    )).toBe(true);
    expect(new Set(bindings.map((binding) =>
      resource.runtimeAnalysis.runtimeRendering
        .requireRenderContextForBinding(binding.productHandle)
        .resourceScope.identityHandle
    )).size).toBe(1);

    const converterExpression = parse.result.ast.expressions[0]!;
    if (converterExpression.$kind !== 'ValueConverter') {
      throw new Error('Expected projectionLabel on interpolation chain zero.');
    }
    const converterEntries = resource.runtimeAnalysis.expressionResourcePlan
      .readValueConverterEntries(parse.productHandle, converterExpression);
    const chainZeroBindingHandles = new Set(bindings
      .filter((binding) => binding.expressionChainIndex === 0)
      .map((binding) => binding.productHandle));
    const bindingHandles = new Set(bindings.map((binding) => binding.productHandle));
    const flows = resource.runtimeAnalysis.bindingDataFlow.dataFlows.filter((dataFlow) =>
      dataFlow.binding.productHandle != null && bindingHandles.has(dataFlow.binding.productHandle)
    );
    const accesses = resource.runtimeAnalysis.expressionAccesses.accessUses.filter((accessUse) =>
      bindingHandles.has(accessUse.ownerProductHandle)
    );
    const dependencies = resource.runtimeAnalysis.bindingDataFlow.observedDependencies.filter((dependency) =>
      dependency.binding.productHandle != null && bindingHandles.has(dependency.binding.productHandle)
    );
    expect(converterEntries).toHaveLength(2);
    expect(flows).toHaveLength(4);
    expect(accesses).toHaveLength(6);
    expect(dependencies).toHaveLength(6);
    for (const binding of bindings) {
      const chainIndex = binding.expressionChainIndex;
      const bindingConverters = converterEntries.filter((entry) =>
        entry.binding.productHandle === binding.productHandle
      );
      const bindingFlows = flows.filter((dataFlow) =>
        dataFlow.binding.productHandle === binding.productHandle
      );
      const bindingAccesses = accesses.filter((accessUse) =>
        accessUse.ownerProductHandle === binding.productHandle
      );
      const bindingDependencies = dependencies.filter((dependency) =>
        dependency.binding.productHandle === binding.productHandle
      );
      expect(bindingConverters).toHaveLength(chainIndex === 0 ? 1 : 0);
      expect(bindingConverters.every((entry) =>
        entry.chainIndex === 0
          && entry.expressionIndex === 0
          && entry.bindReachability === RuntimeOperationReachability.Reached
          && chainZeroBindingHandles.has(entry.binding.productHandle)
      )).toBe(true);
      expect(bindingFlows).toEqual([
        expect.objectContaining({
          expressionChainIndex: chainIndex,
          sourceName: chainIndex === 0 ? 'message' : '$host.exposedLabel',
        }),
      ]);
      expect(bindingAccesses).toHaveLength(chainIndex === 0 ? 1 : 2);
      expect(bindingAccesses.every((accessUse) =>
        accessUse.operationKind === RuntimeExpressionOperationKind.InterpolationPart
          && accessUse.operationIndex === chainIndex
      )).toBe(true);
      expect(bindingDependencies).toHaveLength(chainIndex === 0 ? 1 : 2);
    }
  }, 30_000);

  test('retains authoring scope through explicitly open aggregate text rows without claiming a hole', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-expression-resource-combinators');
    const templatePath = path.join(fixtureRoot, 'src/invalid-expression-gallery.html');
    const ambiguousText = '${label} / ${other |}';
    const templateText = readFileSync(templatePath, 'utf8').replace('${label |}', ambiguousText);
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-text-open-row-fidelity',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost({
          readFile(fileName) {
            return path.resolve(fileName) === templatePath ? templateText : undefined;
          },
          fileExists(fileName) {
            return path.resolve(fileName) === templatePath ? true : undefined;
          },
        }),
      ),
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const resource = app.emission.templates.resources.find((candidate) =>
      candidate.compilation.definition.name === 'invalid-expression-gallery'
    );
    if (resource == null) throw new Error('Expected the invalid expression gallery resource.');

    const invalidTexts = [
      ambiguousText,
      '${label | 1}',
      '${label &}',
      '${label & 1}',
    ];
    const rows = resource.compilation.compiledTemplate.targetPlan.readContexts()
      .flatMap((context) => context.readRows());
    for (const invalidText of invalidTexts) {
      const node = resource.compilation.html.nodes.find((candidate): candidate is HtmlText =>
        candidate instanceof HtmlText && candidate.text === invalidText
      );
      if (node == null) throw new Error(`Expected invalid text node '${invalidText}'.`);
      const row = rows.find((candidate) => candidate.node.productHandle === node.productHandle);
      expect(row).toEqual(expect.objectContaining({
        posture: TemplateCompilerTargetRowPosture.Open,
        projectedTargetCount: 1,
        sourceAddressHandle: node.sourceAddressHandle,
      }));
      expect(row?.openSeamHandles).toHaveLength(1);
      const seam = resource.compilation.compiledTemplate.openSeams.find((candidate) =>
        candidate.handle === row?.openSeamHandles[0]
      );
      expect(seam?.reasonKinds).toContain(OpenSeamReasonKind.TemplateTextExpansionOpen);
      const instruction = row?.instructions[0];
      expect(instruction).toBeInstanceOf(TextBindingInstruction);
      if (!(instruction instanceof TextBindingInstruction)) continue;
      expect(instruction.expressionChainIndex).toBeNull();
      expect(instruction.sourceAddressHandle).toBe(node.sourceAddressHandle);
      const bindings = resource.runtimeAnalysis.runtimeRendering.bindings
        .filter((binding): binding is ContentBinding =>
          binding instanceof ContentBinding
            && binding.instructionProductHandle === instruction.productHandle
        );
      expect(bindings).toHaveLength(1);
      const binding = bindings[0]!;
      expect(binding.expressionChainIndex).toBeNull();
      expect(resource.runtimeAnalysis.expressionResourcePlan
        .readSourceEvaluationReachability(binding.productHandle))
        .toBe(RuntimeOperationReachability.Open);
      expect(resource.runtimeAnalysis.expressionAccesses.accessUses.some((accessUse) =>
        accessUse.ownerProductHandle === binding.productHandle
      )).toBe(false);
      expect(resource.runtimeAnalysis.bindingDataFlow.observedDependencies.some((dependency) =>
        dependency.binding.productHandle === binding.productHandle
      )).toBe(false);
      const dataFlows = resource.runtimeAnalysis.bindingDataFlow.readDataFlowsForBinding(binding.productHandle);
      expect(dataFlows).toEqual([
        expect.objectContaining({
          expressionChainIndex: null,
          sourceKind: RuntimeBindingDataFlowSourceKind.Open,
          sourceName: null,
          sourceEvaluationReachability: RuntimeOperationReachability.Open,
          bindingScope: expect.objectContaining({ productHandle: expect.any(String) }),
        }),
      ]);
      const parse = resource.compilation.valueSites.parses.find((candidate) =>
        candidate.productHandle === instruction.expressionProductHandle
      );
      if (parse == null) throw new Error(`Expected the parser product for '${invalidText}'.`);
      const nodeSource = sourceSpanAddressForAddress(runtime.workspace.store, node.sourceAddressHandle);
      if (nodeSource == null) throw new Error(`Expected the authored source for '${invalidText}'.`);
      expect(bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset(
        runtime.workspace.store,
        resource,
        parse,
        nodeSource.start + 2,
      ).kind).toBe(RuntimeBindingSourceEnvironmentSelectionKind.Context);
    }
    const publicOpenFlows = app.ask({
      kind: SemanticAppQueryKind.BindingDataFlows,
      detail: 'handles',
      page: { size: 1_000 },
    }).value.rows.filter((row) =>
      row.definitionName === 'invalid-expression-gallery'
        && row.bindingKind === RuntimeBindingKind.Content
        && row.expressionChainIndex == null
    );
    expect(publicOpenFlows).toHaveLength(invalidTexts.length);
    expect(publicOpenFlows.every((row) =>
      row.expressionParseResultKind !== ExpressionParseResultKind.InterpolationSuccess
        && invalidTexts.includes(sourceTextForPublicSource(templateText, row.expressionSource) ?? '')
    )).toBe(true);
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

function sourceTextForAddress(
  store: KernelStoreReadView,
  source: string,
  sourceAddressHandle: AddressHandle | null,
): string | null {
  const address = sourceSpanAddressForAddress(store, sourceAddressHandle);
  return address == null ? null : source.slice(address.start, address.end);
}

function sourceTextForSpan(
  source: string,
  start: number,
  end: number,
): string {
  return source.slice(start, end);
}

function sourceTextForPublicSource(
  source: string,
  reference: { readonly start?: number | null; readonly end?: number | null } | null,
): string | null {
  return reference?.start == null || reference.end == null
    ? null
    : source.slice(reference.start, reference.end);
}

function compiledTemplateRole(
  role: TemplateCompilerTargetContextRole,
): CompiledTemplateContextRole {
  switch (role) {
    case TemplateCompilerTargetContextRole.Root:
      return CompiledTemplateContextRole.Root;
    case TemplateCompilerTargetContextRole.TemplateController:
      return CompiledTemplateContextRole.TemplateController;
    case TemplateCompilerTargetContextRole.Projection:
      return CompiledTemplateContextRole.Projection;
  }
}

function requiredTemplateResource(
  app: SemanticApp,
  definitionName: string,
): SemanticApp['emission']['templates']['resources'][number] {
  const resource = app.emission.templates.resources.find((candidate) =>
    candidate.compilation.definition.name === definitionName
  );
  if (resource == null) throw new Error(`Expected the '${definitionName}' template resource.`);
  return resource;
}

function htmlNodeLabels(
  nodes: readonly HtmlIrNode[],
  productHandles: readonly ProductHandle[],
): readonly string[] {
  const nodesByProduct = new Map(nodes.map((node) => [node.productHandle, node]));
  return productHandles.map((productHandle) => {
    const node = nodesByProduct.get(productHandle);
    return node instanceof HtmlElement
      ? node.tagName
      : node instanceof HtmlText
        ? node.text
        : '#unknown';
  });
}
