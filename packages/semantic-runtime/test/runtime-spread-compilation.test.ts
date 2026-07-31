import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { sourceSpanAddressForAddress } from '../src/kernel/source-address.js';
import { capturedAttributeSyntaxForDynamicInstruction } from '../src/template/runtime-resource-ownership.js';

describe('runtime captured-attribute compilation', () => {
  test('publishes complete dynamic instruction groups and discards rejected prefixes', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-spread-capture-semantics');
    const templateFile = path.join(fixtureRoot, 'src/template-spread-capture-semantics-app.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:runtime-spread-compilation',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const resource = app.emission.templates.resources.find((candidate) =>
      candidate.compilation.definition.name === 'template-spread-capture-semantics-app'
    );
    if (resource == null) {
      throw new Error('Expected the spread/capture app template resource.');
    }

    const capturedSyntaxSpans = resource.runtimeAnalysis.runtimeRendering.dynamicInstructions.flatMap((instruction) => {
      const syntax = capturedAttributeSyntaxForDynamicInstruction(resource, instruction);
      const span = syntax == null
        ? null
        : sourceSpanAddressForAddress(runtime.workspace.store, syntax.sourceAddressHandle);
      return span == null ? [] : [span];
    });
    const firstCaptureStart = resource.compilation.unit.templateSource.markup.indexOf('<capture-shell');
    const secondCaptureStart = resource.compilation.unit.templateSource.markup.indexOf(
      '<capture-shell',
      firstCaptureStart + 1,
    );
    const firstCaptureEnd = resource.compilation.unit.templateSource.markup.indexOf('</capture-shell>', firstCaptureStart);
    const secondCaptureEnd = resource.compilation.unit.templateSource.markup.indexOf('</capture-shell>', secondCaptureStart);

    expect(capturedSyntaxSpans.some((span) => firstCaptureStart <= span.start && span.end <= firstCaptureEnd)).toBe(true);
    expect(capturedSyntaxSpans.some((span) => secondCaptureStart <= span.start && span.end <= secondCaptureEnd)).toBe(false);

    const controllers = [
      resource.runtimeAnalysis.runtimeRendering.rootController,
      ...resource.runtimeAnalysis.runtimeRendering.controllers,
    ];
    const nestedEnvironmentBindings = resource.runtimeAnalysis.runtimeRendering.dynamicInstructions.flatMap((instruction) => {
      const context = resource.runtimeAnalysis.runtimeRendering.readDynamicInstructionContext(instruction.productHandle);
      if (context == null) {
        return [];
      }
      const sourceController = controllers.find((controller) =>
        controller.productHandle === context.hydrationContext.controller.productHandle
      ) ?? null;
      const requestor = app.emission.templates.resources.find((candidate) =>
        candidate.compilation.definition.productHandle === context.requestorDefinitionProductHandle
      ) ?? null;
      if (sourceController == null || requestor == null) {
        return [];
      }
      return resource.runtimeAnalysis.runtimeRendering.bindings.flatMap((binding) => {
        if (binding.instructionProductHandle !== instruction.productHandle) {
          return [];
        }
        const renderContext = resource.runtimeAnalysis.runtimeRendering.requireRenderContextForBinding(
          binding.productHandle,
        );
        return renderContext.renderingController.productHandle === sourceController.productHandle
          ? []
          : [{ renderContext, sourceController, requestor }];
      });
    });
    expect(nestedEnvironmentBindings.length).toBeGreaterThan(0);
    for (const { renderContext, sourceController, requestor } of nestedEnvironmentBindings) {
      expect(renderContext.sourceController.productHandle).toBe(sourceController.productHandle);
      expect(renderContext.resourceScope.productHandle).toBe(
        requestor.compilation.compilerWorld.resourceScope.productHandle,
      );
      expect(renderContext.requireActiveContainer().identityHandle).toBe(
        sourceController.containerFrame?.identityHandle,
      );
    }

    const diagnostics = await runtime.templateDiagnostics({
      sourceFile: { filePath: templateFile },
    });
    expect(diagnostics.value?.rows).toHaveLength(8);
    expect(diagnostics.value?.rows.filter((row) =>
      row.diagnosticKind === 'binding-target-assignment-strictness'
    )).toHaveLength(2);
    expect(diagnostics.value?.rows.some((row) => row.diagnosticKind === 'missing-expression-member')).toBe(false);
    expect(diagnostics.value?.rows.some((row) => row.frameworkErrorCode === 'AUR0101')).toBe(true);
    expect(diagnostics.value?.rows.some((row) => row.frameworkErrorCode === 'AUR9998')).toBe(true);
  }, 45_000);
});
