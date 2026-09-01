import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import { readDiResolveCallSites } from '../src/di/resolve-call-recognition.js';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  RuntimeRegistrationRequirementReasonKind,
  RuntimeRegistrationRequirementSelectionKind,
  type SemanticAppRuntimeRegistrationRequirements,
} from '../src/template/browser-template.js';
import { resourceLocalRuntimeSpreadCompilations } from '../src/template/runtime-resource-ownership.js';
import type { RuntimeSpreadCompilation } from '../src/template/runtime-spread-compilation.js';
import type { TemplateInstruction } from '../src/template/instruction-ir.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const helloWorldRoot = path.resolve(packageRoot, '../../fixtures/hello-world');
const storefrontRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
const stateBackedFormRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-state-backed-form');
const stateBackedFormTemplate = path.join(stateBackedFormRoot, 'src/components/state-backed-form.html');
const minimalRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-convention-minimal-app');
const virtualizationRoot = path.join(packageRoot, 'fixtures/pressure/ui-virtualization-template-controller');
const routeConfigIdentityRoot = path.join(packageRoot, 'fixtures/pressure/router-route-config-identity');
const routeConfigValidationRoot = path.join(packageRoot, 'fixtures/pressure/router-route-config-validation-errors');

describe('runtime registration requirements', () => {
  test('spends imported framework intrinsic identity before a broad local declaration', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: helloWorldRoot,
      projectDiscovery: 'single-root',
      storeKey: 'runtime-registration-requirements:hello-world-intrinsic-resolve',
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        telemetry: { inquiryProfile: 'aot' },
      });
      const resolveSite = readDiResolveCallSites(app.project, app.emission.typeSystem).find((site) =>
        site.sourcePath.replaceAll('\\', '/').endsWith('src/attributes/display-hint.ts')
      );
      expect(resolveSite).toMatchObject({
        keyExpressionText: 'INode',
        keyDeclarationKind: 'variable',
        keyDeclarationName: 'INode',
        keyDeclarationSourcePath: 'src/aurelia-shim.d.ts',
        keyImportModuleSpecifier: 'aurelia',
        keyImportName: 'INode',
        keyImportKind: 'named',
      });

      const requirements = materializeSemanticAppTemplateCompilerHandoffs({ app })
        .runtimeRegistrationRequirements;
      expect(requirements.resources.selectionKind)
        .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
      expect(requirements.resources.leaves.map((leaf) => leaf.exportName)).toEqual(['If', 'Repeat']);
      expect(requirements.renderers.selectionKind)
        .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
      expect(requirements.eventModifier.selectionKind)
        .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);

  test('uses the imported export identity through a local alias and broad declaration', async () => {
    const overlay = broadAureliaResolveOverlay([
      "import Aurelia, { INode as HostNode, resolve } from 'aurelia';",
      "import { MyApp } from './my-app';",
      '',
      'class HostConsumer {',
      '  readonly host = resolve(HostNode);',
      '}',
      'void HostConsumer;',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'aliased-intrinsic-resolve');

    expect(requirements.resources.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    expect(requirements.resources.reasons).toEqual([]);
  }, 20_000);

  test('keeps a non-framework any-typed resolve key conservative despite its intrinsic-like name', async () => {
    const overlay = broadAureliaResolveOverlay([
      "import Aurelia, { resolve } from 'aurelia';",
      "import { INode as LocalNode, MyApp } from './my-app';",
      '',
      'class HostConsumer {',
      '  readonly host = resolve(LocalNode);',
      '}',
      'void HostConsumer;',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));
    overlay.write(path.join(minimalRoot, 'src/my-app.ts'), [
      'export const INode: any = {};',
      "export class MyApp { message = 'Hello semantic runtime'; }",
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'non-framework-any-intrinsic-lookalike');

    expect(requirements.resources.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
    expect(requirements.resources.reasons).toEqual([
      expect.objectContaining({
        reasonKind: RuntimeRegistrationRequirementReasonKind.ProgrammaticRuntimeRegistrationUse,
        stableKeys: expect.arrayContaining(['resolve', 'resolve-resource-key-use']),
      }),
    ]);
  }, 20_000);

  test('projects the routed storefront to exact runtime-html leaves in framework order', async () => {
    const requirements = await readRequirements(storefrontRoot, null, 'storefront');

    expect(requirements.resources.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    expect(requirements.resources.leaves.map((leaf) => leaf.exportName)).toEqual([
      'DebounceBindingBehavior',
      'If',
      'Else',
      'Repeat',
      'Switch',
      'Case',
      'DefaultCase',
      'PromiseTemplateController',
      'PendingTemplateController',
      'FulfilledTemplateController',
      'RejectedTemplateController',
    ]);
    expect(requirements.resources.leaves.every((leaf) =>
      leaf.moduleSpecifier === '@aurelia/runtime-html'
      && leaf.productHandle != null
      && leaf.identityHandle != null
      && leaf.definitionProductHandle != null
      && leaf.definitionIdentityHandle != null
      && leaf.catalogProductHandle != null
      && leaf.providerAdmissionProductHandle != null
      && leaf.providerAdmissionIdentityHandle != null
      && leaf.staticUseCount > 0
    )).toBe(true);

    expect(requirements.renderers.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    expect(requirements.renderers.leaves.map((leaf) => leaf.exportName)).toEqual([
      'PropertyBindingRenderer',
      'IteratorBindingRenderer',
      'InterpolationBindingRenderer',
      'SetPropertyRenderer',
      'CustomElementRenderer',
      'CustomAttributeRenderer',
      'TemplateControllerRenderer',
      'LetElementRenderer',
      'ListenerBindingRenderer',
      'AttributeBindingRenderer',
      'TextBindingRenderer',
    ]);
    expect(requirements.eventModifier).toMatchObject({
      selectionKind: RuntimeRegistrationRequirementSelectionKind.ExactLeaves,
      leaves: [],
      reasons: [],
    });
  }, 30_000);

  test('spends exact runtime spread closures and reopens incomplete dynamic instruction coverage', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: stateBackedFormRoot,
      projectDiscovery: 'single-root',
      storeKey: 'runtime-registration-requirements:state-backed-form-spread-closure',
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        telemetry: { inquiryProfile: 'aot' },
      });
      const exact = materializeSemanticAppTemplateCompilerHandoffs({ app })
        .runtimeRegistrationRequirements;
      expect([
        exact.resources.selectionKind,
        exact.renderers.selectionKind,
        exact.eventModifier.selectionKind,
      ]).toEqual([
        RuntimeRegistrationRequirementSelectionKind.ExactLeaves,
        RuntimeRegistrationRequirementSelectionKind.ExactLeaves,
        RuntimeRegistrationRequirementSelectionKind.ExactLeaves,
      ]);
      expect(exact.resources.leaves.map((leaf) => leaf.exportName)).toEqual(['If', 'Else', 'Repeat']);
      expect(exact.renderers.leaves.map((leaf) => leaf.exportName)).toEqual([
        'PropertyBindingRenderer',
        'IteratorBindingRenderer',
        'SetPropertyRenderer',
        'CustomElementRenderer',
        'TemplateControllerRenderer',
        'LetElementRenderer',
        'ListenerBindingRenderer',
        'SetAttributeRenderer',
        'TextBindingRenderer',
        'SpreadRenderer',
      ]);
      expect(exact.renderers.leaves.find((leaf) => leaf.exportName === 'SetAttributeRenderer')?.staticUseCount)
        .toBe(2);
      expect(exact.eventModifier.leaves).toEqual([]);

      const resource = app.emission.templates.resources.find((candidate) =>
        candidate.compilation.definition.name === 'state-backed-form'
      );
      if (resource == null) throw new Error('Expected the state-backed form template resource.');
      const spreadCompilations = resource.runtimeAnalysis.runtimeRendering
        .spreadCompilations as RuntimeSpreadCompilation[];
      const original = resourceLocalRuntimeSpreadCompilations(resource).find((compilation) =>
        compilation.createdInstructionProductHandles.length > 0
      );
      if (original == null) throw new Error('Expected an exact state-form runtime spread compilation.');
      const index = spreadCompilations.indexOf(original);
      spreadCompilations.splice(index, 1);
      try {
        const open = materializeSemanticAppTemplateCompilerHandoffs({ app })
          .runtimeRegistrationRequirements;
        for (const selection of [open.resources, open.renderers, open.eventModifier]) {
          expect(selection.selectionKind)
            .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
          expect(selection.reasons).toEqual(expect.arrayContaining([
            expect.objectContaining({
              reasonKind: RuntimeRegistrationRequirementReasonKind.RuntimeSpreadCompilationRequired,
              stableKeys: expect.arrayContaining(['spread-invocation-coverage-incomplete']),
            }),
          ]));
        }
      } finally {
        spreadCompilations.splice(index, 0, original);
      }

      const dynamicInstructions = resource.runtimeAnalysis.runtimeRendering
        .dynamicInstructions as TemplateInstruction[];
      const missingInstructionIndex = dynamicInstructions.findIndex((instruction) =>
        instruction.productHandle === original.createdInstructionProductHandles[0]
      );
      const [missingInstruction] = dynamicInstructions.splice(missingInstructionIndex, 1);
      if (missingInstruction == null) throw new Error('Expected one dynamic instruction to falsify.');
      try {
        const open = materializeSemanticAppTemplateCompilerHandoffs({ app })
          .runtimeRegistrationRequirements;
        for (const selection of [open.resources, open.renderers, open.eventModifier]) {
          expect(selection.selectionKind)
            .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
          expect(selection.reasons).toEqual(expect.arrayContaining([
            expect.objectContaining({
              reasonKind: RuntimeRegistrationRequirementReasonKind.RuntimeSpreadCompilationRequired,
              stableKeys: expect.arrayContaining(['spread-compilation-product-unavailable']),
            }),
          ]));
        }
      } finally {
        dynamicInstructions.splice(missingInstructionIndex, 0, missingInstruction);
      }
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 45_000);

  test('counts event modifiers created inside an exact runtime spread closure', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(
      stateBackedFormTemplate,
      readFileSync(stateBackedFormTemplate, 'utf8').replace(
        '      type="text"\n      value.bind="request.customerName">',
        '      type="text"\n      click.trigger:prevent="state.submitRequest(requestId)"\n'
          + '      value.bind="request.customerName">',
      ),
    );
    const requirements = await readRequirements(
      stateBackedFormRoot,
      overlay,
      'state-backed-form-dynamic-event-modifier',
    );

    expect(requirements.resources.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    expect(requirements.renderers.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    expect(requirements.eventModifier).toMatchObject({
      selectionKind: RuntimeRegistrationRequirementSelectionKind.ExactLeaves,
      leaves: [expect.objectContaining({
        exportName: 'EventModifierRegistration',
        staticUseCount: 1,
      })],
      reasons: [],
    });
  }, 30_000);

  test('uses selected resource identity so a local shadow does not retain the built-in leaf', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/my-app.ts'), [
      "import { customAttribute } from '@aurelia/runtime-html';",
      '',
      "@customAttribute('if')",
      'class LocalIf { value = false; }',
      '',
      'export class MyApp {',
      '  static dependencies = [LocalIf];',
      '  value = true;',
      '}',
    ].join('\n'));
    overlay.write(path.join(minimalRoot, 'src/my-app.html'), '<main><div if.bind="value"></div></main>');

    const requirements = await readRequirements(minimalRoot, overlay, 'local-shadow');

    expect(requirements.resources.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    expect(requirements.resources.leaves.map((leaf) => leaf.exportName)).not.toContain('If');
  }, 20_000);

  test('keeps renderer selection conservative for custom IRenderer pressure without reopening resources', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import { Aurelia, IRenderer, renderer } from '@aurelia/runtime-html';",
      "import { Registration } from '@aurelia/kernel';",
      "import { MyApp } from './my-app';",
      '',
      '@renderer',
      'class CustomRenderer {',
      '  target = 240;',
      '  render() {}',
      '}',
      '',
      'new Aurelia()',
      '  .register(Registration.singleton(IRenderer, CustomRenderer))',
      '  .app({ host: document.body, component: MyApp })',
      '  .start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'custom-renderer');

    expect(requirements.renderers.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
    expect(requirements.renderers.reasons.map((reason) => reason.reasonKind)).toContain(
      RuntimeRegistrationRequirementReasonKind.ProgrammaticRuntimeRegistrationUse,
    );
    expect(requirements.resources.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
  }, 20_000);

  test('keeps resource and renderer groups for an opaque registration carrier', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia from 'aurelia';",
      "import { MyApp } from './my-app';",
      '',
      'declare const runtimeRegistry: object;',
      'Aurelia',
      '  .register(runtimeRegistry)',
      '  .app(MyApp)',
      '  .start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'open-registration');

    expect(requirements.resources.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
    expect(requirements.renderers.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
    expect(requirements.resources.reasons.map((reason) => reason.reasonKind)).toContain(
      RuntimeRegistrationRequirementReasonKind.RegistrationPressureOpen,
    );
  }, 20_000);

  test('keeps runtime groups for instance-based Aurelia enhance compilation', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia from 'aurelia';",
      "import { MyApp } from './my-app';",
      '',
      'const aurelia = new Aurelia();',
      'void aurelia.enhance({ host: document.body, component: new MyApp() });',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'instance-enhance');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(selection.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
      );
    }
  }, 20_000);

  test('keeps runtime groups for direct compiler and parser API use', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia from 'aurelia';",
      "import { ExpressionParser, IExpressionParser, parseExpression } from '@aurelia/expression-parser';",
      "import { AttributePattern, isInstruction } from '@aurelia/template-compiler';",
      "import { MyApp } from './my-app';",
      '',
      'void ExpressionParser;',
      'void IExpressionParser;',
      'void parseExpression;',
      'void AttributePattern;',
      'void isInstruction;',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'programmatic-expression-parser');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(selection.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
      );
      expect(selection.reasons.flatMap((reason) => reason.stableKeys)).toEqual(
        expect.arrayContaining([
          'ExpressionParser',
          'IExpressionParser',
          'parseExpression',
          'AttributePattern',
          'isInstruction',
        ]),
      );
    }
  }, 20_000);

  test('keeps exact groups for explicitly preserved compiler-package runtime ABI values', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia from 'aurelia';",
      "import type { ExpressionType } from '@aurelia/expression-parser';",
      "import { CustomExpression, createAccessScopeExpression, createInterpolation } from '@aurelia/expression-parser';",
      "import type { Instruction } from '@aurelia/template-compiler';",
      "import { AttrSyntax, BindingMode, itPropertyBinding } from '@aurelia/template-compiler';",
      "import { MyApp } from './my-app';",
      '',
      'type PreservedTypes = ExpressionType | Instruction;',
      'void (null as PreservedTypes | null);',
      'void CustomExpression;',
      'void createAccessScopeExpression;',
      'void createInterpolation;',
      'void AttrSyntax;',
      'void BindingMode;',
      'void itPropertyBinding;',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'preserved-compiler-runtime-abi');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
      expect(selection.reasons.map((reason) => reason.reasonKind)).not.toContain(
        RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
      );
    }
  }, 20_000);

  test('keeps runtime groups for computed and escaped compiler-package namespaces', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia from 'aurelia';",
      "import * as expressionParser from '@aurelia/expression-parser';",
      "import * as templateCompiler from '@aurelia/template-compiler';",
      "import { MyApp } from './my-app';",
      '',
      "void expressionParser['createAccessScopeExpression'];",
      'function pass(value: unknown): unknown { return value; }',
      'void pass(templateCompiler);',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'open-compiler-package-namespace');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(selection.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
      );
      expect(selection.reasons.flatMap((reason) => reason.stableKeys)).toEqual(
        expect.arrayContaining(['namespace-computed-access', 'namespace-escape']),
      );
    }
  }, 20_000);

  test('keeps runtime groups for compiler values re-exported by aurelia', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia, { IExpressionParser as ParserToken } from 'aurelia';",
      "import { MyApp } from './my-app';",
      '',
      'void ParserToken;',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'aurelia-reexported-compiler-api');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(selection.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired,
      );
      expect(selection.reasons.flatMap((reason) => reason.stableKeys)).toContain('IExpressionParser');
    }
  }, 20_000);

  test('retains groups for re-exported runtime tokens, decorators, and resource keys', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/runtime-api-barrel.ts'), [
      'export {',
      '  CustomAttribute as AttributeResource,',
      '  IEventModifier as EventModifierToken,',
      '  IRenderer as RendererToken,',
      '  renderer as runtimeRenderer,',
      "} from '@aurelia/runtime-html';",
    ].join('\n'));
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia from 'aurelia';",
      "import { IContainer, resolve } from '@aurelia/kernel';",
      "import { MyApp } from './my-app';",
      'import {',
      '  AttributeResource,',
      '  EventModifierToken,',
      '  RendererToken,',
      '  runtimeRenderer,',
      "} from './runtime-api-barrel';",
      '',
      '@runtimeRenderer',
      'class CustomRenderer {',
      '  target = 240;',
      '  render() {}',
      '}',
      '',
      'const AttributeResourceAlias = AttributeResource;',
      "void resolve(IContainer).get(AttributeResourceAlias.keyFrom('if'));",
      "void resolve('au:resource:custom-attribute:if');",
      'void RendererToken;',
      'void EventModifierToken;',
      'void CustomRenderer;',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 're-exported-runtime-api');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(selection.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.ProgrammaticRuntimeRegistrationUse,
      );
    }
    expect(requirements.resources.reasons.flatMap((reason) => reason.stableKeys)).toEqual(
      expect.arrayContaining([
        'resource-key-construction',
        'container-resource-key-use',
        'resolve-resource-key-use',
      ]),
    );
  }, 20_000);

  test('retains groups when a reachable route can add members outside the compiler cohort', async () => {
    const requirements = await readRequirements(routeConfigIdentityRoot, null, 'open-route-cohort');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(selection.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
      );
    }
  }, 30_000);

  test('keeps a statically resolved lazy route inside the exact compiler cohort', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(routeConfigValidationRoot, 'src/router-route-config-validation-errors-app.ts'), [
      "import { customElement } from '@aurelia/runtime-html';",
      "import { route } from '@aurelia/router';",
      '',
      "@route({ routes: [{ path: 'lazy', component: import('./routes/lazy-child-route') }] })",
      '@customElement({',
      "  name: 'router-route-config-validation-errors-app',",
      "  template: '<au-viewport></au-viewport>',",
      '})',
      'export class RouterRouteConfigValidationErrorsApp {}',
    ].join('\n'));

    const requirements = await readRequirements(routeConfigValidationRoot, overlay, 'resolved-lazy-route');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
      expect(selection.reasons.map((reason) => reason.reasonKind)).not.toContain(
        RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
      );
    }
    expect(requirements.resources.leaves).toEqual([]);
    expect(requirements.renderers.leaves.map((leaf) => leaf.exportName)).toEqual(['CustomElementRenderer']);
    expect(requirements.eventModifier.leaves).toEqual([]);
  }, 20_000);

  test('retains groups across an unresolved reachable runtime module edge', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(minimalRoot, 'src/main.ts'), [
      "import Aurelia from 'aurelia';",
      "import './missing-runtime-module';",
      "import { MyApp } from './my-app';",
      '',
      'Aurelia.app(MyApp).start();',
    ].join('\n'));

    const requirements = await readRequirements(minimalRoot, overlay, 'unresolved-runtime-module');

    for (const selection of [requirements.resources, requirements.renderers, requirements.eventModifier]) {
      expect(selection.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(selection.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.ProgrammaticUseOpen,
      );
    }
  }, 20_000);

  test('does not assign plugin ABI type 200 to the runtime-html iterator renderer', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(
      path.join(virtualizationRoot, 'src/ui-virtualization-app.html'),
      '<template><div virtual-repeat.for="item of products">${item.label}</div></template>',
    );

    const requirements = await readRequirements(virtualizationRoot, overlay, 'virtualization');

    expect(requirements.renderers.selectionKind)
      .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
    expect(requirements.renderers.reasons.map((reason) => reason.reasonKind)).toContain(
      RuntimeRegistrationRequirementReasonKind.RuntimeInstructionAbiUnmodeled,
    );
  }, 20_000);
});

async function readRequirements(
  fixtureRoot: string,
  overlay: MutableProjectSourceOverlay | null,
  key: string,
): Promise<SemanticAppRuntimeRegistrationRequirements> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    projectDiscovery: 'single-root',
    storeKey: `runtime-registration-requirements:${key}`,
    projectInputAuthority: overlay == null
      ? undefined
      : new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      telemetry: { inquiryProfile: 'aot' },
    });
    return materializeSemanticAppTemplateCompilerHandoffs({ app }).runtimeRegistrationRequirements;
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}

function broadAureliaResolveOverlay(mainSource: string): MutableProjectSourceOverlay {
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(minimalRoot, 'src/aurelia-assets.d.ts'), [
    "declare module '*.html' {",
    '  const template: string;',
    '  export default template;',
    '}',
    '',
    "declare module '*.css' {",
    '  const css: string;',
    '  export default css;',
    '}',
    '',
    "declare module 'aurelia' {",
    '  export const INode: any;',
    '  export const resolve: any;',
    '  const Aurelia: {',
    '    app(component: unknown): { start(): Promise<void> | void };',
    '  };',
    '  export default Aurelia;',
    '}',
  ].join('\n'));
  overlay.write(path.join(minimalRoot, 'src/main.ts'), mainSource);
  return overlay;
}
