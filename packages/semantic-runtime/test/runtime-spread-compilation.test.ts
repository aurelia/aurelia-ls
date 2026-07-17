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
      const syntax = capturedAttributeSyntaxForDynamicInstruction(runtime.workspace.store, instruction);
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

    const diagnostics = await runtime.templateDiagnostics({
      sourceFile: { filePath: templateFile },
    });
    expect(diagnostics.value?.rows).toHaveLength(5);
    expect(diagnostics.value?.rows.some((row) => row.diagnosticKind === 'missing-expression-member')).toBe(false);
    expect(diagnostics.value?.rows.some((row) => row.frameworkErrorCode === 'AUR9998')).toBe(true);
  }, 45_000);
});
