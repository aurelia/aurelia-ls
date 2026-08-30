import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  RuntimeRegistrationRequirementReasonKind,
  RuntimeRegistrationRequirementSelectionKind,
  type SemanticAppRuntimeRegistrationRequirements,
} from '../src/template/browser-template.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const storefrontRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
const minimalRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-convention-minimal-app');
const virtualizationRoot = path.join(packageRoot, 'fixtures/pressure/ui-virtualization-template-controller');
const routeConfigIdentityRoot = path.join(packageRoot, 'fixtures/pressure/router-route-config-identity');
const routeConfigValidationRoot = path.join(packageRoot, 'fixtures/pressure/router-route-config-validation-errors');

describe('runtime registration requirements', () => {
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
      RuntimeRegistrationRequirementReasonKind.ProgrammaticUseOpen,
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
        RuntimeRegistrationRequirementReasonKind.ProgrammaticUseOpen,
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
