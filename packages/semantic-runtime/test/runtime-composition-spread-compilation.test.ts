import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { createSemanticRuntime, type SemanticApp } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { HydrateElementInstruction } from '../src/template/instruction-ir.js';
import { materializeSemanticAppTemplateCompilerHandoffs } from '../src/template/browser-template.js';
import { TemplateCompilerFrameworkInstructionType } from '../src/template/template-instruction-runtime-value.js';
import { TemplateCompilerIssueKind } from '../src/template/compiler-issue.js';
import { TemplateCompilerFrameworkErrorCode } from '../src/template/framework-error-code.js';
import { RuntimeRendererSpreadCompileState } from '../src/template/runtime-renderer.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const fixture = path.resolve(fileURLToPath(new URL('../../aot-assurance/fixtures/ce-composition', import.meta.url)));
const appTemplate = path.join(fixture, 'src/ce-composition-app.html');
const inventorySource = path.join(fixture, 'src/inventory-widget.ts');
const chartSource = path.join(fixture, 'src/chart-widget.ts');
const options = { analysisDepth: 'binding-observation' as const, includeAuthoringTemplates: false,
  includeCompilerOccurrencePrecedents: true, telemetry: { inquiryProfile: 'aot' as const } };

test('compiles addressless composition hosts with exact capture partitions and scoped definition identities', async () => {
  const overlay = new MutableProjectSourceOverlay();
  // Capture retains class, while the two actual bindable property names transfer in their original order.
  overlay.write(inventorySource, readFileSync(inventorySource, 'utf8').replace("name: 'inventory-widget', template", "name: 'inventory-widget', template, capture: true"));
  overlay.write(appTemplate, readFileSync(appTemplate, 'utf8').replaceAll(
    'message.bind="message" id.bind="hostId" class="composed-card"',
    'message.bind="message" class="composed-card" id.bind="hostId"',
  ));
  const runtime = await openRuntime('closed', overlay);
  try {
    const app = await runtime.openApp(options);
    const store = runtime.workspace.store;
    const appResource = rootResource(app);
    const rendering = appResource.runtimeAnalysis.runtimeRendering;
    const spreads = appResource.runtimeAnalysis.runtimeComposition.spreads;
    const compilations = spreads.compilations;
    expect(new Set(spreads.hosts.map(host => host.tagName))).toEqual(new Set(['chart-widget', 'inventory-widget', 'scoped-compose-widget']));
    for (const compilation of compilations) {
      expect(compilation.state).toBe(RuntimeRendererSpreadCompileState.Compiled);
      if (compilation.origin.kind !== 'composition-host') throw new Error('Expected composition-host origin.');
      const host = compilation.origin.host;
      expect(store.readProductDetail(TemplateProductDetails.HtmlNode, host.productHandle)).toBe(host);
      expect([host.sourceAddressHandle, host.tagNameAddressHandle, host.closingTagNameAddressHandle]).toEqual([null, null, null]);
      const owner = store.readProductDetail(TemplateProductDetails.Instruction, compilation.capturedAttributeContextInstructionProductHandle!);
      if (!(owner instanceof HydrateElementInstruction)) throw new Error('Expected original capture owner.');
      expect(owner.elementName).toBe('au-compose');
      expect(compilation.spreadInstructionProductHandle).toBe(owner.productHandle);
      const requestor = store.readProductDetail(ResourceProductDetails.Definition, compilation.requestorDefinitionProductHandle!);
      expect(requestor?.name).toBe('au-compose');
      expect(compilation.requestorDefinitionProductHandle).not.toBe(compilation.targetDefinitionProductHandle);
      expect(compilation.requestorDefinitionProductHandle).not.toBe(appResource.compilation.definition.productHandle);
      expect(compilation.targetDefinitionExplicit).toBe(true);
      const created = new Set(compilation.createdInstructionProductHandles);
      expect(rendering.bindings.some(binding => created.has(binding.instructionProductHandle))).toBe(false);
      expect(rendering.records.some(record => record.kind === 'semantic-claim'
        && record.predicateKey === KernelVocabulary.Binding.InstructionUsesRuntimeRenderer.key
        && created.has(record.subjectHandle))).toBe(false);
    }
    const inventory = compilations.find(compilation => compilation.origin.kind === 'composition-host'
      && compilation.origin.host.tagName === 'inventory-widget')!;
    const captureNames = (handles: readonly string[]) => handles.map(handle =>
      store.readProductDetail(TemplateProductDetails.AttributeSyntax, handle)!.rawName);
    expect(captureNames(inventory.capturedSyntaxProductHandles)).toEqual(['message.bind', 'id.bind']);
    if (inventory.origin.kind !== 'composition-host') throw new Error('Expected composition host.');
    expect(captureNames(inventory.origin.retainedCaptureSyntaxProductHandles)).toEqual(['class']);

    const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
    const cases = batch.resources.flatMap(resource => resource.value?.definitions.flatMap(definition =>
      definition.rows.flat().flatMap(instruction => instruction.value.type === TemplateCompilerFrameworkInstructionType.HydrateElement
        ? instruction.value.spreadPlan?.cases ?? [] : [])) ?? []);
    expect(cases.find(entry => entry.target.definitionName === 'inventory-widget')?.captureOrdinals).toEqual([0, 2]);
    const scoped = cases.filter(entry => entry.target.definitionName === 'scoped-compose-widget');
    expect(new Set(scoped.map(entry => entry.target.definitionIdentity))).toEqual(new Set(
      app.emission.resources.readDefinitions().filter(definition =>
        definition.target.localName === 'DeclaringComposeWidget' || definition.target.localName === 'ReceivingComposeWidget')
        .map(definition => definition.identityHandle),
    ));
    expect(scoped.every(entry => entry.requestorName === 'au-compose' && entry.target.targetDefinitionMatch === 'explicit-definition')).toBe(true);
    expect(batch.resources.every(resource => resource.value?.spreadClosure.state === 'exact')).toBe(true);
  } finally { runtime.retireWorkspaceIncarnation(); }
}, 45_000);

test('keeps an unexecuted capture predicate and retained downstream spread out of exact handoff', async () => {
  for (const kind of ['predicate', 'downstream'] as const) {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(appTemplate, '<au-compose component="chart-widget" message.bind="message" title.bind="message"></au-compose>');
    overlay.write(chartSource, readFileSync(chartSource, 'utf8').replace("name: 'chart-widget', template",
      kind === 'predicate' ? "name: 'chart-widget', template, capture: (name: string) => name !== 'message'"
        : "name: 'chart-widget', template, capture: true"));
    if (kind === 'downstream') overlay.write(path.join(fixture, 'src/chart-widget.html'), '<div ...$attrs></div>');
    const runtime = await openRuntime(kind, overlay);
    try {
      const app = await runtime.openApp(options);
      const compilation = rootResource(app).runtimeAnalysis.runtimeComposition.spreads.compilations[0]!;
      const resource = materializeSemanticAppTemplateCompilerHandoffs({ app }).resources.find(row => row.resourceName === 'ce-composition-app')!;
      if (kind === 'predicate') {
        expect(compilation.state).toBe(RuntimeRendererSpreadCompileState.Open);
        expect(compilation.createdInstructionProductHandles).toEqual([]);
        expect(compilation.expressionParseProductHandles).toEqual([]);
        expect(resource.value?.spreadClosure.reasons.some(reason => reason.reasonKind === 'spread-compilation-open')).toBe(true);
      } else {
        expect(compilation.state).toBe(RuntimeRendererSpreadCompileState.Compiled);
        expect(resource.value?.spreadClosure.reasons.some(reason => reason.reasonKind === 'composition-forwarded-capture-open')).toBe(true);
      }
    } finally { runtime.retireWorkspaceIncarnation(); }
  }
}, 60_000);

test('rejects a captured template controller atomically and retains its authored compiler diagnostic', async () => {
  const overlay = new MutableProjectSourceOverlay();
  // The declaring component sees an ordinary attribute, so AuCompose captures it. Its own empty child
  // container then resolves the framework's root `if` controller during spread compilation.
  const sourceFile = path.join(fixture, 'src/ce-composition-app.ts');
  overlay.write(sourceFile, readFileSync(sourceFile, 'utf8')
    .replace('import { customElement }', 'import { customElement, customAttribute }')
    .replace('@customElement({', "@customAttribute('if')\nclass DeclaringIf {}\n\n@customElement({")
    .replace('dependencies: [ChartWidget', 'dependencies: [DeclaringIf, ChartWidget'));
  const markup = '<au-compose component="chart-widget" message.bind="message" if.bind="true"></au-compose>';
  overlay.write(appTemplate, markup);
  const runtime = await openRuntime('invalid-tc', overlay);
  try {
    const app = await runtime.openApp(options);
    const spreads = rootResource(app).runtimeAnalysis.runtimeComposition.spreads;
    expect(spreads.compilations[0]?.state).toBe(RuntimeRendererSpreadCompileState.Invalid);
    expect(spreads.compilations[0]?.createdInstructionProductHandles).toEqual([]);
    expect([spreads.instructions, spreads.expressionParses, spreads.valueSites, spreads.bindingIssues]).toEqual([[], [], [], []]);
    expect(spreads.compilerIssues.map(issue => issue.issueKind)).toEqual([TemplateCompilerIssueKind.NoSpreadTemplateController]);
    expect(spreads.compilerIssues[0]?.frameworkErrorCode).toBe(TemplateCompilerFrameworkErrorCode.NoSpreadTemplateController);
    const diagnostics = await runtime.templateDiagnostics({ sourceFile: { filePath: appTemplate } });
    const rows = diagnostics.value?.rows.filter(row => row.frameworkErrorCode === TemplateCompilerFrameworkErrorCode.NoSpreadTemplateController) ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source?.path?.replaceAll('\\', '/')).toBe('src/ce-composition-app.html');
    expect(rows[0]?.source?.start).toBe(markup.indexOf('if.bind'));
  } finally { runtime.retireWorkspaceIncarnation(); }
}, 30_000);

function openRuntime(key: string, overlay: MutableProjectSourceOverlay) {
  return createSemanticRuntime({ workspaceRoot: fixture, projectDiscovery: 'single-root', storeKey: `composition-spread:${key}`,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)) });
}

function rootResource(app: SemanticApp) {
  const resource = app.emission.templates.resources.find(candidate => candidate.compilation.definition.name === 'ce-composition-app');
  if (resource == null) throw new Error('Expected CE composition fixture root.');
  return resource;
}
