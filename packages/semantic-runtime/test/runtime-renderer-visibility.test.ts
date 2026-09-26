import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { frameworkRegistrationKindForOperation } from '../src/di/container-registration.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import { FrameworkRegistrationKind } from '../src/registration/registration-reference.js';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  RuntimeRegistrationRequirementSelectionKind,
} from '../src/template/browser-template.js';
import { RuntimeHtmlDefaultRenderers } from '../src/template/runtime-renderer.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-convention-minimal-app');

describe('runtime renderer registration visibility', () => {
  // RC2 Rendering stores resolve(IContainer).root and reads its getAll(IRenderer, false), independently of the
  // container in which a template sees plugin syntax/resources. Root registration is the native positive control.
  for (const placement of ['root', 'child', 'sibling'] as const) {
    test(`uses root-owned renderers with ${placement} plugin registration`, async () => {
      const overlay = mainOverlay(containerAppSource(`${placement}.register(StateDefaultConfiguration.init({ title: 'canary' }));`));
      const runtime = await openRuntime(overlay, placement);
      try {
        const app = await runtime.openApp({ analysisDepth: 'runtime-topology' });
        const resource = app.emission.templates.resources.find((candidate) => candidate.compilation.definition.name === 'my-app');
        expect(resource).toBeDefined();
        const world = resource!.compilation.compilerWorld;
        const root = world.container.root;
        expect(world.container.identityHandle).not.toBe(root.identityHandle);
        expect(world.rendering.container.identityHandle).toBe(root.identityHandle);
        expect(world.runtimeRenderers.filter((entry) => entry.renderer.targetInstructionType >= 120)
          .map((entry) => entry.renderer.targetInstructionType)).toEqual(placement === 'root' ? [120, 121] : []);

        // The renderer fix must not make ordinary child registrations or syntax root-only.
        expect(world.bindingCommands.some((command) => command.definition.name === 'state')).toBe(placement !== 'sibling');
        expect(world.resourceScope.resources.some((resource) => resource.name === 'child-widget')).toBe(true);
      } finally {
        runtime.retireWorkspaceIncarnation();
      }
    }, 20_000);
  }

  test('attributes renderer leaves to the root when a child repeats StandardConfiguration', async () => {
    const runtime = await openRuntime(mainOverlay(containerAppSource('child.register(StandardConfiguration);')), 'repeated-defaults');
    try {
      const app = await runtime.openApp({ analysisDepth: 'runtime-topology', telemetry: { inquiryProfile: 'aot' } });
      const world = app.emission.templates.resources.find((candidate) => candidate.compilation.definition.name === 'my-app')!
        .compilation.compilerWorld;
      const rootProvider = app.emission.appWorld.diWorld.registrationOperations.find((operation) =>
        operation.container.identityHandle === world.rendering.container.identityHandle
        && frameworkRegistrationKindForOperation(operation) === FrameworkRegistrationKind.StandardConfiguration
      );
      expect(rootProvider).toBeDefined();
      const requirements = materializeSemanticAppTemplateCompilerHandoffs({ app }).runtimeRegistrationRequirements;
      expect(requirements.renderers.selectionKind, JSON.stringify(requirements.renderers.reasons))
        .toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
      expect(requirements.renderers.leaves.map((leaf) => leaf.exportName)).toContain('TextBindingRenderer');
      expect(requirements.renderers.leaves.every((leaf) =>
        leaf.providerAdmissionProductHandle === rootProvider!.admission.productHandle
      )).toBe(true);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 20_000);

  test('retains standalone library authoring defaults without inventing a runtime app root', async () => {
    const overlay = mainOverlay('export {};');
    overlay.write(path.join(fixtureRoot, 'src/my-app.ts'), [
      "import { customElement } from '@aurelia/runtime-html';",
      "import template from './my-app.html';",
      "@customElement({ name: 'my-app', template })",
      "export class MyApp { message = 'Library authoring'; }",
    ].join('\n'));
    const runtime = await openRuntime(overlay, 'authoring');
    try {
      const app = await runtime.openApp({
        sourceFilePath: path.join(fixtureRoot, 'src/my-app.html'),
        analysisDepth: 'runtime-topology',
        includeAuthoringTemplates: true,
        authoringTemplateSourceFiles: [path.join(fixtureRoot, 'src/my-app.html')],
      });
      expect(app.emission.appWorld.configuration.appRoots).toHaveLength(0);
      expect(app.emission.templates.resources).toHaveLength(0);
      expect(app.emission.templates.authoringResources).toHaveLength(1);
      const world = app.emission.templates.authoringResources[0]!.compilation.compilerWorld;
      expect(world.world.appRoot).toBeNull();
      expect(world.container.parent).toBeNull();
      expect(world.rendering.container.identityHandle).toBe(world.container.identityHandle);
      expect(world.runtimeRenderers.map((entry) => entry.renderer.targetName))
        .toEqual(RuntimeHtmlDefaultRenderers.map((renderer) => renderer.targetName));
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 20_000);
});

function containerAppSource(registration: string): string {
  return [
    "import { DI } from '@aurelia/kernel';",
    "import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';",
    "import { StateDefaultConfiguration } from '@aurelia/state';",
    "import { MyApp } from './my-app';",
    "@customElement({ name: 'child-widget', template: '' })",
    'class ChildWidget {}',
    'const root = DI.createContainer();',
    'root.register(StandardConfiguration);',
    'const child = root.createChild();',
    'const sibling = root.createChild();',
    'child.register(ChildWidget);',
    registration,
    'new Aurelia(child).app({ host: document.body, component: MyApp }).start();',
  ].join('\n');
}

function mainOverlay(source: string): MutableProjectSourceOverlay {
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(fixtureRoot, 'src/main.ts'), source);
  return overlay;
}

async function openRuntime(overlay: MutableProjectSourceOverlay, key: string) {
  return createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    projectDiscovery: 'single-root',
    storeKey: `runtime-renderer-visibility:${key}`,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
}
