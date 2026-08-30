import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  projectRuntimeExpressionAstValue,
  RuntimeExpressionAstProjectionState,
} from '../src/expression/runtime-ast-value.js';
import { KernelHandleFactory } from '../src/kernel/handles.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import { sourceSpanAddressForAddress } from '../src/kernel/source-address.js';
import {
  PropertyBindingInstruction,
  SetAttributeInstruction,
  SetPropertyInstruction,
  SpreadElementPropBindingInstruction,
} from '../src/template/instruction-ir.js';
import { HtmlAttributeReference, HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import {
  RuntimeRendererSpreadCompileState,
} from '../src/template/runtime-renderer.js';
import {
  capturedAttributeSyntaxForDynamicInstruction,
  resourceLocalRuntimeSpreadCompilations,
} from '../src/template/runtime-resource-ownership.js';
import { RuntimeSpreadCompilation } from '../src/template/runtime-spread-compilation.js';
import { runtimeSpreadResidualExpressionMatchesParserRequest } from '../src/template/runtime-spread-compilation-handoff.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../src/template/expression-parse-projection.js';
import {
  projectTemplateCompilerRuntimeInstructionClosure,
  TemplateCompilerFrameworkInstructionType,
  TemplateCompilerRuntimeInstructionFamilyState,
  TemplateCompilerRuntimeResourceRepresentation,
} from '../src/template/template-instruction-runtime-value.js';

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
    const closingCaptureTag = '</capture-shell>';
    const firstCaptureEnd = resource.compilation.unit.templateSource.markup.indexOf(
      closingCaptureTag,
      firstCaptureStart,
    ) + closingCaptureTag.length;
    const secondCaptureEnd = resource.compilation.unit.templateSource.markup.indexOf(
      closingCaptureTag,
      secondCaptureStart,
    ) + closingCaptureTag.length;

    const spreadCompilations = resourceLocalRuntimeSpreadCompilations(resource);
    const contextInstructionByProduct = new Map(
      resource.compilation.compiledTemplate.instructions.map((instruction) => [instruction.productHandle, instruction]),
    );
    const compilationContextSpan = (compilation: RuntimeSpreadCompilation) => {
      const handle = compilation.capturedAttributeContextInstructionProductHandle;
      const instruction = handle == null ? null : contextInstructionByProduct.get(handle) ?? null;
      return sourceSpanAddressForAddress(runtime.workspace.store, instruction?.sourceAddressHandle ?? null);
    };
    const compiledFirstCapture = spreadCompilations.find((compilation) => {
      const span = compilationContextSpan(compilation);
      return compilation.state === RuntimeRendererSpreadCompileState.Compiled
        && span != null
        && firstCaptureStart <= span.start
        && span.end <= firstCaptureEnd;
    });
    const invalidSecondCapture = spreadCompilations.find((compilation) => {
      const span = compilationContextSpan(compilation);
      return compilation.state === RuntimeRendererSpreadCompileState.Invalid
        && span != null
        && secondCaptureStart <= span.start
        && span.end <= secondCaptureEnd;
    });

    expect(compiledFirstCapture).toBeDefined();
    expect(compiledFirstCapture?.rootInstructionProductHandles.length).toBeGreaterThan(0);
    expect(compiledFirstCapture?.rootInstructionProductHandles.every((handle) =>
      compiledFirstCapture.createdInstructionProductHandles.includes(handle)
    )).toBe(true);
    expect(compiledFirstCapture?.expressionParseProductHandles.length).toBeGreaterThan(0);
    if (compiledFirstCapture == null) throw new Error('Expected one compiled first-capture invocation.');
    const dynamicInstructionByProduct = new Map(
      resource.runtimeAnalysis.runtimeRendering.dynamicInstructions.map((instruction) => [
        instruction.productHandle,
        instruction,
      ]),
    );
    const rootInstructions = compiledFirstCapture.rootInstructionProductHandles.map((handle) =>
      dynamicInstructionByProduct.get(handle)!
    );
    const createdInstructions = compiledFirstCapture.createdInstructionProductHandles.map((handle) =>
      dynamicInstructionByProduct.get(handle)!
    );
    const projectedClosure = projectTemplateCompilerRuntimeInstructionClosure({
      rootInstructions,
      createdInstructions,
      productDetails: runtime.workspace.store,
      resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
    });
    expect(projectedClosure.state).toBe(TemplateCompilerRuntimeInstructionFamilyState.Exact);
    expect(projectedClosure.value?.roots).toHaveLength(compiledFirstCapture.rootInstructionProductHandles.length);
    expect(invalidSecondCapture).toMatchObject({
      state: RuntimeRendererSpreadCompileState.Invalid,
      rootInstructionProductHandles: [],
      createdInstructionProductHandles: [],
      expressionParseProductHandles: [],
      reasonKinds: [],
    });
    expect(invalidSecondCapture?.summary).toContain('does not allow captured template controller');

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

  test('retains state-backed form spread results as two exact invocation groups', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-state-backed-form');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:runtime-spread-compilation:state-backed-form',
    });
    try {
      const app = await runtime.openApp({ analysisDepth: 'runtime-topology' });
      const resource = app.emission.templates.resources.find((candidate) =>
        candidate.compilation.definition.name === 'state-backed-form'
      );
      if (resource == null) throw new Error('Expected the state-backed form template resource.');

      const rendering = resource.runtimeAnalysis.runtimeRendering;
      const compilations = resourceLocalRuntimeSpreadCompilations(resource);
      expect(compilations).toHaveLength(2);
      expect(compilations.every((compilation) =>
        compilation.state === RuntimeRendererSpreadCompileState.Compiled
        && compilation.capturedSyntaxProductHandles.length === 2
        && compilation.rootInstructionProductHandles.length === 2
        && compilation.createdInstructionProductHandles.length === 2
        && compilation.expressionParseProductHandles.length === 2
        && compilation.targetDefinitionExplicit === false
      )).toBe(true);
      expect(new Set(compilations.map((compilation) => compilation.spreadInstructionProductHandle)).size).toBe(1);
      expect(new Set(compilations.map((compilation) => compilation.targetRenderTargetProductHandle)).size).toBe(1);
      expect(new Set(compilations.map((compilation) =>
        compilation.capturedAttributeContextInstructionProductHandle
      )).size).toBe(2);
      expect(rendering.readSpreadCompilationsForSpreadInstruction(
        compilations[0]!.spreadInstructionProductHandle,
      )).toEqual(compilations);
      for (const compilation of compilations) {
        expect(rendering.readSpreadCompilationsForCapturedAttributeContextInstruction(
          compilation.capturedAttributeContextInstructionProductHandle!,
        )).toEqual([compilation]);
      }

      const syntaxByProduct = new Map(resource.compilation.authoredAttributeSyntaxes.map((syntax) => [
        syntax.productHandle,
        syntax,
      ]));
      expect(compilations.map((compilation) => compilation.capturedSyntaxProductHandles.map((handle) => {
        const syntax = syntaxByProduct.get(handle);
        return [syntax?.rawName, syntax?.rawValue];
      }))).toEqual([
        [['type', 'text'], ['value.bind', 'request.customerName']],
        [['type', 'email'], ['value.bind', 'request.email']],
      ]);

      const instructionByProduct = new Map(rendering.dynamicInstructions.map((instruction) => [
        instruction.productHandle,
        instruction,
      ]));
      const parseByProduct = new Map(rendering.dynamicExpressionParses.map((parse) => [parse.productHandle, parse]));
      for (const [index, compilation] of compilations.entries()) {
        const roots = compilation.rootInstructionProductHandles.map((handle) => instructionByProduct.get(handle));
        expect(roots[0]).toBeInstanceOf(SetAttributeInstruction);
        expect(roots[1]).toBeInstanceOf(PropertyBindingInstruction);
        const property = roots[1];
        if (!(property instanceof PropertyBindingInstruction)) {
          throw new Error('Expected one spread-compiled property binding.');
        }
        expect(property.targetProperty).toBe('value');
        expect(property.bindingMode).toBe('two-way');

        const parses = compilation.expressionParseProductHandles.map((handle) => parseByProduct.get(handle));
        expect(parses.every((parse) => parse != null)).toBe(true);
        const accepted = parses.flatMap((parse) => {
          const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
          return ast == null ? [] : [projectRuntimeExpressionAstValue(ast)];
        });
        expect(accepted).toHaveLength(1);
        expect(accepted[0]).toMatchObject({
          state: RuntimeExpressionAstProjectionState.Exact,
          value: {
            $kind: 'AccessMember',
            object: { $kind: 'AccessScope', name: 'request', ancestor: 0 },
            name: index === 0 ? 'customerName' : 'email',
          },
          reasons: [],
        });

        const sites = parses.map((parse) => parse == null
          ? null
          : runtime.workspace.store.readProductDetail(TemplateProductDetails.ValueSite, parse.site.productHandle)
        );
        expect(sites.map((site) => site?.rawValue)).toEqual(index === 0
          ? ['text', 'request.customerName']
          : ['email', 'request.email']
        );
      }
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 45_000);

  test('keeps open and invalid spread invocations atomically output-free', () => {
    const handles = new KernelHandleFactory('runtime-spread-compilation-atomicity');
    const create = (
      state: RuntimeRendererSpreadCompileState.Open | RuntimeRendererSpreadCompileState.Invalid,
      roots: readonly string[] = [],
      created: readonly string[] = [],
    ) => new RuntimeSpreadCompilation({
      state,
      requestorDefinitionProductHandle: null,
      requestorDefinitionIdentityHandle: null,
      spreadInstructionProductHandle: handles.product('spread'),
      spreadInstructionIdentityHandle: handles.identity('spread'),
      capturedAttributeContextInstructionProductHandle: null,
      capturedAttributeContextInstructionIdentityHandle: null,
      capturedAttributeContextControllerProductHandle: null,
      capturedAttributeContextControllerIdentityHandle: null,
      hydrationContextProductHandle: null,
      hydrationContextIdentityHandle: null,
      targetRenderTargetProductHandle: handles.product('target'),
      targetRenderTargetIdentityHandle: handles.identity('target'),
      targetHtmlNodeProductHandle: null,
      targetHtmlNodeIdentityHandle: null,
      targetDefinitionExplicit: false,
      targetDefinitionProductHandle: null,
      targetDefinitionIdentityHandle: null,
      capturedSyntaxProductHandles: [],
      rootInstructionProductHandles: roots,
      createdInstructionProductHandles: created,
      expressionParseProductHandles: [],
      summary: state,
      reasonKinds: state === RuntimeRendererSpreadCompileState.Open ? ['feature-not-yet-modeled'] : [],
    });

    expect(create(RuntimeRendererSpreadCompileState.Open)).toMatchObject({
      state: RuntimeRendererSpreadCompileState.Open,
      rootInstructionProductHandles: [],
      createdInstructionProductHandles: [],
      expressionParseProductHandles: [],
    });
    expect(create(RuntimeRendererSpreadCompileState.Invalid)).toMatchObject({
      state: RuntimeRendererSpreadCompileState.Invalid,
      rootInstructionProductHandles: [],
      createdInstructionProductHandles: [],
      expressionParseProductHandles: [],
    });
    const instruction = handles.product('instruction');
    expect(() => create(RuntimeRendererSpreadCompileState.Open, [instruction], [instruction]))
      .toThrowError('Runtime spread compilation lost state, root, created-instruction, or expression-parse ownership.');
    expect(() => create(RuntimeRendererSpreadCompileState.Invalid, [instruction], [instruction]))
      .toThrowError('Runtime spread compilation lost state, root, created-instruction, or expression-parse ownership.');
  });

  test('projects spread element-prop wrappers through the shared dynamic instruction core', () => {
    const handles = new KernelHandleFactory('runtime-spread-element-prop-projection');
    const node = new HtmlNodeReference(
      HtmlIrNodeKind.Element,
      handles.identity('node'),
      handles.product('node'),
      handles.address('node'),
    );
    const attribute = new HtmlAttributeReference(
      handles.product('attribute'),
      handles.address('attribute'),
      'label.bind',
    );
    const inner = new SetPropertyInstruction(
      handles.product('inner'),
      handles.identity('inner'),
      node,
      attribute,
      'label',
      'Label',
      handles.address('inner'),
    );
    const wrapper = new SpreadElementPropBindingInstruction(
      handles.product('wrapper'),
      handles.identity('wrapper'),
      node,
      attribute,
      inner.productHandle,
      handles.address('wrapper'),
    );
    const revision = { equals: () => true };
    const projection = projectTemplateCompilerRuntimeInstructionClosure({
      rootInstructions: [wrapper],
      createdInstructions: [wrapper, inner],
      productDetails: {
        readProductDetail: () => null,
        readProjectionRevision: () => revision,
      },
      resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
    });

    expect(projection.state).toBe(TemplateCompilerRuntimeInstructionFamilyState.Exact);
    expect(projection.value?.roots).toEqual([{
      type: TemplateCompilerFrameworkInstructionType.SpreadElementProp,
      instruction: {
        type: TemplateCompilerFrameworkInstructionType.SetProperty,
        value: 'Label',
        to: 'label',
      },
    }]);
  });

  test('admits residual spread expressions only for the exact RC2 parser request', () => {
    const instruction = { value: 'source.items' };
    expect(runtimeSpreadResidualExpressionMatchesParserRequest(instruction, {
      rawValue: 'source.items',
      entryFamily: 'IsProperty',
    })).toBe(true);
    expect(runtimeSpreadResidualExpressionMatchesParserRequest(instruction, {
      rawValue: 'other.items',
      entryFamily: 'IsProperty',
    })).toBe(false);
    expect(runtimeSpreadResidualExpressionMatchesParserRequest(instruction, {
      rawValue: 'source.items',
      entryFamily: 'IsFunction',
    })).toBe(false);
  });

  test('models HTML shorthand case folding while explicit spread values retain TypeScript case', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-spread-capture-semantics');
    const templateFile = path.join(fixtureRoot, 'src/template-spread-capture-semantics-app.html');
    const originalTemplate = readFileSync(templateFile, 'utf8');
    const directShorthandTemplate = originalTemplate.replace(
      "...$bindables='spreadState'",
      '...spreadState',
    );
    expect(directShorthandTemplate).not.toBe(originalTemplate);

    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:runtime-spread-shorthand-browser-case',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost({
          readFile(fileName) {
            return samePath(fileName, templateFile) ? directShorthandTemplate : undefined;
          },
          fileExists(fileName) {
            return samePath(fileName, templateFile) ? true : undefined;
          },
        }),
      ),
    });
    const diagnostics = await runtime.templateDiagnostics({
      sourceFile: { filePath: templateFile },
    });
    const missingMembers = diagnostics.value?.rows.filter((row) =>
      row.diagnosticKind === 'missing-expression-member'
    ) ?? [];

    expect(missingMembers).toHaveLength(1);
    expect(missingMembers[0]?.selectedMemberName).toBe('spreadstate');
  }, 45_000);
});

function samePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}
