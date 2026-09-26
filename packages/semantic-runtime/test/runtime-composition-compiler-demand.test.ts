import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  semanticAppNeedsRuntimeCompositionAnalysis,
  RuntimeRegistrationRequirementReasonKind,
  RuntimeRegistrationRequirementSelectionKind,
} from '../src/template/browser-template.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const minimalRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-convention-minimal-app');

test('keeps composition spread handoffs exact after same-runtime source reanalysis', async () => {
  const fixtureRoot = path.resolve(packageRoot, '../aot-assurance/fixtures/ce-composition');
  const scriptFile = path.join(fixtureRoot, 'src/ce-composition-app.ts');
  const script = readFileSync(scriptFile, 'utf8');
  const overlay = new MutableProjectSourceOverlay();
  const authority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay));
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot, projectDiscovery: 'single-root', storeKey: 'test:composition-demand:reanalysis', projectInputAuthority: authority,
  });
  try {
    const options = { analysisDepth: 'binding-observation' as const, includeAuthoringTemplates: false, includeCompilerOccurrencePrecedents: true, telemetry: { inquiryProfile: 'aot' as const } };
    for (const changed of [false, true]) {
      if (changed) {
        overlay.write(scriptFile, script.replace("message = 'alpha'", "message = 'bravo'"));
        authority.advance();
      }
      const app = await runtime.openApp(options);
      const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
      expect(batch.resources.filter((resource) => resource.value?.spreadClosure.state !== 'exact')
        .map((resource) => ({ name: resource.resourceName, handoff: resource.state, spread: resource.value?.spreadClosure })),
      changed ? 'source reanalysis' : 'initial analysis').toEqual([]);
      expect(batch.resources.every((resource) => resource.value?.address.sourceAttachment != null)).toBe(true);
      expect(batch.resources.find((resource) => resource.resourceName === 'ce-composition-app')?.value?.address.sourceAttachment?.targetDeclaration?.oldText)
        .toContain(changed ? "message = 'bravo'" : "message = 'alpha'");
    }
  } finally { runtime.retireWorkspaceIncarnation(); }
}, 60_000);

test('uses shared composition inquiry and retains declaring versus receiving DI resource identity', async () => {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/content-projection-topology'),
    projectDiscovery: 'single-root', storeKey: 'test:composition-demand:projection',
  });
  try {
    const options = { includeAuthoringTemplates: false, includeCompilerOccurrencePrecedents: true, telemetry: { inquiryProfile: 'aot' as const } };
    const shallow = await runtime.openApp({ ...options, analysisDepth: 'runtime-topology' });
    expect(semanticAppNeedsRuntimeCompositionAnalysis(shallow)).toBe(true);
    expect(shallow.emission.templates.resources.every((resource) => resource.runtimeAnalysis.runtimeComposition.contexts.length === 0)).toBe(true);
    const deep = await runtime.openApp({ ...options, analysisDepth: 'binding-observation' });
    for (const resource of deep.emission.templates.resources) {
      expect(deep.emission.templates.frontDoor.appCompilations).toContain(resource.compilation);
      expect(runtime.workspace.store.readProductDetail(ResourceProductDetails.Definition, resource.compilation.definition.productHandle!))
        .toBe(resource.compilation.definition);
    }
    const batch = materializeSemanticAppTemplateCompilerHandoffs({ app: deep });
    expect(batch.resources.every((resource) => resource.value?.address.sourceAttachment != null)).toBe(true);
    expect(batch.runtimeRegistrationRequirements.resources.reasons).toEqual([]);
    expect(batch.runtimeRegistrationRequirements.resources.selectionKind).toBe(RuntimeRegistrationRequirementSelectionKind.ExactLeaves);
    const definitions = deep.emission.templates.resources.flatMap((resource) => resource.runtimeAnalysis.runtimeComposition.controllers
      .flatMap((composition) => composition.resolvedComponents));
    expect(definitions.map((definition) => definition.className)).toEqual(expect.arrayContaining(['DeclaringComposeWidget', 'ReceivingComposeWidget']));
    const selectedOnly = materializeSemanticAppTemplateCompilerHandoffs({ app: deep, templateSourcePaths: ['src/content-projection-topology-app.html'] });
    expect(selectedOnly.runtimeRegistrationRequirements.resources.reasons.map((reason) => reason.summary))
      .toEqual(expect.arrayContaining(['AuCompose selected a definition outside the exact emitted compiler cohort.']));
  } finally { runtime.retireWorkspaceIncarnation(); }
}, 30_000);

test('admits literal and empty composition but preserves dynamic component and markup demand', async () => {
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(minimalRoot, 'src/my-app.ts'), [
    "import { customElement } from 'aurelia';",
    "import template from './my-app.html';",
    "@customElement({ name: 'known-widget', template: '<p>known widget</p>' })",
    'class KnownWidget {}',
    "@customElement({ name: 'my-app', template, dependencies: [KnownWidget] })",
    "export class MyApp { component = KnownWidget; template = '<p>dynamic</p>'; }",
  ].join('\n'));
  const templateFile = path.join(minimalRoot, 'src/my-app.html');
  overlay.write(templateFile, '<au-compose></au-compose><au-compose component="known-widget"></au-compose>');
  const authority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay));
  let runtime = await createSemanticRuntime({ workspaceRoot: minimalRoot, projectDiscovery: 'single-root', storeKey: 'test:composition-demand:literal', projectInputAuthority: authority });
  try {
    const options = { analysisDepth: 'binding-observation' as const, includeAuthoringTemplates: false, includeCompilerOccurrencePrecedents: true, telemetry: { inquiryProfile: 'aot' as const } };
    const exact = await runtime.openApp(options);
    const exactBatch = materializeSemanticAppTemplateCompilerHandoffs({ app: exact });
    expect(exactBatch.runtimeRegistrationRequirements.resources.reasons).toEqual([]);
    runtime.retireWorkspaceIncarnation();
    overlay.write(templateFile, [
      '<au-compose component.bind="component"></au-compose>',
      '<au-compose component="known-widget" template.bind="template"></au-compose>',
      '<au-compose template="<p>literal markup</p>"></au-compose>',
    ].join('\n'));
    authority.advance();
    runtime = await createSemanticRuntime({ workspaceRoot: minimalRoot, projectDiscovery: 'single-root', storeKey: 'test:composition-demand:dynamic', projectInputAuthority: authority });
    const refused = await runtime.openApp(options);
    const reasons = materializeSemanticAppTemplateCompilerHandoffs({ app: refused }).runtimeRegistrationRequirements.resources.reasons;
    expect(reasons.filter((reason) => reason.reasonKind === RuntimeRegistrationRequirementReasonKind.RuntimeTemplateCompilationRequired)).toHaveLength(3);
    expect(reasons.map((reason) => reason.summary)).toEqual(expect.arrayContaining([
      'AuCompose component/template inputs are not confined to authored literal instructions.',
      'AuCompose template-only markup still requires runtime template compilation.',
    ]));
  } finally { runtime.retireWorkspaceIncarnation(); }
}, 30_000);

test('does not request built-in composition semantics for a same-named user resource', async () => {
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(minimalRoot, 'src/my-app.ts'), [
    "import { customElement } from 'aurelia';",
    "import template from './my-app.html';",
    "@customElement({ name: 'au-compose', template: '<p>user resource</p>' })",
    'class UserCompose {}',
    "@customElement({ name: 'my-app', template, dependencies: [UserCompose] })",
    'export class MyApp {}',
  ].join('\n'));
  overlay.write(path.join(minimalRoot, 'src/my-app.html'), '<au-compose></au-compose>');
  const runtime = await createSemanticRuntime({
    workspaceRoot: minimalRoot, projectDiscovery: 'single-root', storeKey: 'test:composition-demand:shadow',
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation', telemetry: { inquiryProfile: 'aot' } });
    expect(semanticAppNeedsRuntimeCompositionAnalysis(app)).toBe(false);
    expect(app.emission.templates.resources.flatMap((resource) => resource.runtimeAnalysis.runtimeComposition.controllers)).toEqual([]);
    expect(materializeSemanticAppTemplateCompilerHandoffs({ app }).runtimeRegistrationRequirements.resources.reasons).toEqual([]);
  } finally { runtime.retireWorkspaceIncarnation(); }
}, 20_000);
