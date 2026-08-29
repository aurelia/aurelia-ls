import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import {
  BrowserEffectiveTemplateMaterializer,
} from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import { LocalTemplateDefinitionMaterializer } from '../src/template/local-template-definition-materializer.js';
import {
  TemplateCompilerOccurrencePrecedentAdmissionKind,
  TemplateCompilerOccurrencePrecedentEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';
import type { TemplateCompilationFamilyFrontDoorEmission } from '../src/template/template-compilation-project-pass.js';
import {
  TemplateCompilerExecutionSession,
} from '../src/template/template-compiler-execution.js';
import {
  executeTemplateCompilerHookBootstrap,
} from '../src/template/template-compiler-hook-bootstrap.js';
import {
  executeTemplateCompilerLocalExtraction,
  TemplateCompilerLocalExtractionState,
} from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerOccurrenceGeneration,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import {
  createTemplateCompilerNormalizedSiteLaneFamily,
  TemplateCompilerNormalizedSiteLanePartition,
  TemplateCompilerNormalizedSiteLaneResultState,
  type TemplateCompilerNormalizedSiteLaneTransfer,
} from '../src/template/template-compiler-normalized-site-lane-view.js';
import {
  TemplateCompilerLocalSiteExclusionAuthority,
  type TemplateCompilerNormalizedSiteBundle,
  TemplateCompilerSiteSpendDisposition,
} from '../src/template/template-compiler-site-spend-ledger.js';
import {
  bindTemplateCompilerRootOccurrencePrecedentInvocation,
  TemplateCompilerOccurrencePrecedentInvocationBindingState,
  TemplateCompilerSiteInvocationBindingReasonKind,
} from '../src/template/template-compiler-site-invocation.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-local-template-semantics');

describe('template compiler raw occurrence precedent', () => {
  let runtime: Awaited<ReturnType<typeof createSemanticRuntime>>;
  let app: Awaited<ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['openApp']>>;
  let family: TemplateCompilationFamilyFrontDoorEmission;

  beforeAll(async () => {
    runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-occurrence-precedent',
    });
    app = await runtime.openApp({
      includeCompilerOccurrencePrecedents: true,
      telemetry: { inquiryProfile: 'aot' },
    });
    family = app.emission.templates.frontDoor.families.find((candidate) =>
      candidate.appCompilations.some((compilation) =>
        compilation.definition.name === 'template-local-template-semantics-app'
      )
    )!;
    if (family == null) throw new Error('Expected local-template semantics compilation family.');
  }, 30_000);

  afterAll(() => {
    runtime?.retireWorkspaceIncarnation();
  });

  test('retains raw whole-source GraphExact products outside runtime compilation membership', () => {
    expect(family.authoringOccurrencePrecedents).toEqual([]);
    expect(family.appOccurrencePrecedents.map((precedent) => precedent.compilation.definition.name))
      .toEqual(['template-local-template-semantics-app']);

    const root = requirePrecedent(family, 'template-local-template-semantics-app');
    const rootRuntime = requireCompilation(family, 'template-local-template-semantics-app');
    const modePanelRuntime = requireCompilation(family, 'mode-panel');
    const rawMarkup = root.compilation.definition.template?.markup;

    expect(root.normalizedSites.index?.compilation).toBe(root.compilation);
    expect(root.admissionKind).toBe(TemplateCompilerOccurrencePrecedentAdmissionKind.LegacyLocalOverlap);
    expect(root.compilation.html.draft).not.toBeNull();
    expect(root.compilation.unit.templateSource.markup).toBe(rawMarkup);
    expect(root.compilation.unit.templateSource.markup).toContain('as-custom-element="mode-panel"');
    expect(rootRuntime.unit.templateSource.markup).not.toBe(rawMarkup);
    expect(rootRuntime.unit.templateSource.markup).not.toContain('as-custom-element="mode-panel"');
    expect(root.preLocalCompilerWorld).toBe(rootRuntime.parentCompilerWorld);
    expect(root.compilation.parentCompilerWorld).toBe(root.preLocalCompilerWorld);
    expect(root.compilation.compilerWorld).toBe(root.preLocalCompilerWorld);
    expect(root.compilation.unit.rootContext.localElementNames).toEqual([]);
    expect(root.compilation.unit.rootContext.dependencyIdentityHandles).toEqual([]);
    expect(rootRuntime.unit.rootContext.localElementNames).toEqual(['mode-panel', 'local-icon']);
    expect(rootRuntime.unit.rootContext.dependencyIdentityHandles).toHaveLength(2);
    expect(modePanelRuntime.unit.rootContext.localElementNames).toEqual(['nested-note']);
    expect(modePanelRuntime.unit.rootContext.dependencyIdentityHandles).toHaveLength(1);

    const ordinary = new Set(family.appCompilations);
    expect(family.appOccurrencePrecedents.every((precedent) => !ordinary.has(precedent.compilation))).toBe(true);
    const rawAttributeProducts = new Set(root.normalizedSites.index?.attributeSites.map((site) =>
      site.attributeProductHandle
    ));
    expect(rootRuntime.html.attributes.some((attribute) => rawAttributeProducts.has(attribute.productHandle)))
      .toBe(false);

    const mismatched = mismatchedPrecedent(root, rootRuntime);
    expect(mismatched.normalizedSites.state).toBe('mismatch');
    expect(mismatched.normalizedSites.mismatches.length).toBeGreaterThan(0);
  });

  test('conserves raw normalized sites through root, sibling, and nested local lanes', () => {
    const root = requirePrecedent(family, 'template-local-template-semantics-app');
    const rootRuntime = requireCompilation(family, 'template-local-template-semantics-app');
    const index = root.normalizedSites.index;
    if (index == null || root.compilation.unit.templateSource.markup == null) {
      throw new Error('Expected exact raw occurrence precedent index.');
    }
    const run = runtime.computationLifecycle.begin({
      kind: 'template-compiler-occurrence-precedent-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Candidate-local raw local-template occurrence partition.',
    });
    try {
      const browser = parseBrowserTemplateFragmentDraft(root.compilation.unit.templateSource.markup);
      const browserEmission = new BrowserEffectiveTemplateMaterializer(run).materialize({
        localKey: 'template-compiler-occurrence-precedent:browser',
        sourceRevision: root.sourceRevision,
        templateSource: root.compilation.unit.templateSource,
        authoredHtml: root.compilation.html,
        browser,
        carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
      });
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
      const cloneSource = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence
        && node.text.includes('${ownerSummary}')
        && node.inputReference != null
      );
      if (cloneSource?.inputReference == null) throw new Error('Expected owner-summary clone source.');
      forest.createGeneratedText(new TemplateCompilerOccurrenceGeneration(
        {},
        'normalized-site-lane-clone-control',
        'normalized-site-lane-clone-control',
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        [cloneSource.inputReference.productHandle],
        0,
      ), cloneSource.text, cloneSource.inputReference);
      const execution = TemplateCompilerExecutionSession.createForForest(
        'template-compiler-occurrence-precedent:family',
        forest,
      );
      const rootLane = execution.admitRootInvocation(rootRuntime.localKey);
      const rootHook = executeTemplateCompilerHookBootstrap({
        execution,
        lane: rootLane,
        compilerWorld: root.preLocalCompilerWorld,
        executionOpenSeamHandle: run.handles.openSeam('root-hook-open'),
      });
      const definitions = new LocalTemplateDefinitionMaterializer(run);
      const rootExtraction = executeTemplateCompilerLocalExtraction({
        execution,
        lane: rootLane,
        hookBootstrap: rootHook,
        ownerName: rootRuntime.definition.name,
        ownerCauseHandles: [rootRuntime.definition.productHandle!],
        reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
      });
      const rootClosure = execution.closeInvocationBootstrap(rootHook, rootExtraction);
      const rootExclusions = TemplateCompilerLocalSiteExclusionAuthority.capture(execution, rootClosure);
      const bindingResult = bindTemplateCompilerRootOccurrencePrecedentInvocation({
        appCurrentness: app,
        execution,
        bootstrapClosure: rootClosure,
        browserEmission,
        occurrencePrecedent: root,
        currentFrontDoor: app.emission.templates.frontDoor,
        currentFamily: family,
      });
      expect(bindingResult.state).toBe(TemplateCompilerOccurrencePrecedentInvocationBindingState.Exact);
      const binding = bindingResult.binding;
      if (binding == null) throw new Error('Expected exact raw occurrence-precedent binding.');
      const laneFamilyResult = createTemplateCompilerNormalizedSiteLaneFamily(binding);
      expect(laneFamilyResult.state).toBe(TemplateCompilerNormalizedSiteLaneResultState.Exact);
      const lanes = laneFamilyResult.family;
      if (lanes == null) throw new Error('Expected exact normalized-site lane family.');
      const rootPartitionResult = lanes.partition(lanes.rootView, rootClosure, rootExclusions);
      expect(rootPartitionResult.state).toBe(TemplateCompilerNormalizedSiteLaneResultState.Exact);
      const rootPartition = rootPartitionResult.partition;
      if (rootPartition == null) throw new Error('Expected exact root normalized-site partition.');
      expect(() => new TemplateCompilerNormalizedSiteLanePartition(
        {},
        rootPartition.incoming,
        rootPartition.closure,
        rootPartition.exclusionAuthority,
        rootPartition.incoming.readSites(),
        [],
        [],
        [],
      )).toThrow(/disposition conservation/);

      const partitionChild = (
        transfer: TemplateCompilerNormalizedSiteLaneTransfer,
      ): TemplateCompilerNormalizedSiteLanePartition => {
        const name = transfer.transfer.extraction.name;
        const compilation = requireCompilation(family, name);
        const hook = executeTemplateCompilerHookBootstrap({
          execution,
          lane: transfer.childView.lane,
          compilerWorld: compilation.parentCompilerWorld,
          executionOpenSeamHandle: run.handles.openSeam(`${name}:hook-open`),
        });
        const extraction = executeTemplateCompilerLocalExtraction({
          execution,
          lane: transfer.childView.lane,
          hookBootstrap: hook,
          ownerName: name,
          ownerCauseHandles: [transfer.transfer.extraction.definitionReservation.productHandle],
          reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
        });
        const closure = execution.closeInvocationBootstrap(hook, extraction);
        const exclusions = TemplateCompilerLocalSiteExclusionAuthority.capture(execution, closure);
        const result = lanes.partition(transfer.childView, closure, exclusions);
        expect(result.state).toBe(TemplateCompilerNormalizedSiteLaneResultState.Exact);
        if (result.partition == null) throw new Error(`Expected exact '${name}' normalized-site partition.`);
        return result.partition;
      };

      expect(rootPartition.transfers.map((transfer) => transfer.transfer.extraction.name))
        .toEqual(['mode-panel', 'local-icon']);
      const modePanelTransfer = rootPartition.transfers[0]!;
      const localIconTransfer = rootPartition.transfers[1]!;
      const modePanelPartition = partitionChild(modePanelTransfer);
      expect(modePanelPartition.transfers.map((transfer) => transfer.transfer.extraction.name))
        .toEqual(['nested-note']);
      const nestedNotePartition = partitionChild(modePanelPartition.transfers[0]!);
      const localIconPartition = partitionChild(localIconTransfer);

      const matrix = [
        ['root', rootPartition, 55, 16, 2, 19, [['mode-panel', 17], ['local-icon', 1]]],
        ['mode-panel', modePanelPartition, 17, 14, 1, 1, [['nested-note', 1]]],
        ['local-icon', localIconPartition, 1, 1, 0, 0, []],
        ['nested-note', nestedNotePartition, 1, 1, 0, 0, []],
      ] as const;
      expect(lanes.rootView.attributeSites).toHaveLength(47);
      expect(lanes.rootView.textSites).toHaveLength(8);
      for (const [name, partition, incoming, terminal, declarations, metadata, transfers] of matrix) {
        expect(partition.isModuleConstructed(), `${name}: nominal partition`).toBe(true);
        expect(partition.incoming.bundles, `${name}: incoming`).toHaveLength(incoming);
        expect(partition.terminalSites, `${name}: terminal`).toHaveLength(terminal);
        expect(partition.declarationExclusions, `${name}: declarations`).toHaveLength(declarations);
        expect(partition.bindableMetadataExclusions, `${name}: metadata`).toHaveLength(metadata);
        expect(partition.transfers.map((transfer) => [
          transfer.transfer.extraction.name,
          transfer.childView.bundles.length,
        ]), `${name}: transfers`).toEqual(transfers);
      }

      const modePanelBundles = new Set(modePanelTransfer.childView.bundles);
      const localIconBundles = new Set(localIconTransfer.childView.bundles);
      const nestedNoteBundles = new Set(modePanelPartition.transfers[0]!.childView.bundles);
      expect([...modePanelBundles].some((bundle) => localIconBundles.has(bundle))).toBe(false);
      expect([...nestedNoteBundles].every((bundle) => modePanelBundles.has(bundle))).toBe(true);
      expect([...nestedNoteBundles].some((bundle) => localIconBundles.has(bundle))).toBe(false);
      expect(new Set(matrix.map(([, partition]) => partition.incoming.lane)).size).toBe(4);

      const terminalByLane = new Map(matrix.map(([name, partition]) => [
        name,
        new Set(partition.terminalSites.map((site) => site.bundle)),
      ]));
      const exemplars = new Map([
        ['root', index.textSites.find((site) => site.text.text.includes('${ownerSummary}'))!],
        ['mode-panel', index.attributeSites.find((site) =>
          site.owner.tagName.toLowerCase() === 'owner-badge' && site.attribute.rawName === 'value.bind'
        )!],
        ['local-icon', index.textSites.find((site) => site.text.text.includes('${value}'))!],
        ['nested-note', index.textSites.find((site) => site.text.text.includes('${note}'))!],
      ]);
      for (const [owner, bundle] of exemplars) {
        expect(bundle, `${owner}: exemplar`).not.toBeNull();
        for (const [laneName, terminal] of terminalByLane) {
          expect(terminal.has(bundle), `${owner} exemplar in ${laneName}`).toBe(laneName === owner);
        }
      }

      const terminalBundles = new Set(matrix.flatMap(([, partition]) =>
        partition.terminalSites.map((site) => site.bundle)
      ));
      const excluded = matrix.flatMap(([, partition]) => [
        ...partition.declarationExclusions,
        ...partition.bindableMetadataExclusions,
      ]);
      const excludedBundles = new Set(excluded.map((entry) => entry.site.bundle));
      expect(terminalBundles.size).toBe(32);
      expect(excludedBundles.size).toBe(23);
      expect([...terminalBundles].some((bundle) => excludedBundles.has(bundle))).toBe(false);
      expect(new Set([...terminalBundles, ...excludedBundles])).toEqual(new Set(lanes.rootView.bundles));
      expect(excluded.filter((entry) =>
        entry.receipt.disposition === TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
      )).toHaveLength(3);
      expect(excluded.filter((entry) =>
        entry.receipt.disposition === TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
      )).toHaveLength(20);

      const mismatched = mismatchedPrecedent(root, rootRuntime);
      const mismatch = bindTemplateCompilerRootOccurrencePrecedentInvocation({
        appCurrentness: app,
        execution,
        bootstrapClosure: rootClosure,
        browserEmission,
        occurrencePrecedent: mismatched,
        currentFrontDoor: app.emission.templates.frontDoor,
        currentFamily: family,
      });
      expect(mismatch.state).toBe(TemplateCompilerOccurrencePrecedentInvocationBindingState.Mismatch);
      expect(mismatch.binding).toBeNull();
      expect(mismatch.reasons.map((reason) => reason.reasonKind)).toEqual([
        TemplateCompilerSiteInvocationBindingReasonKind.GraphPrecedentMismatch,
      ]);
    } finally {
      run.abort();
    }
  });

  test('uses an explicit cached-app product option rather than the telemetry profile', async () => {
    const ordinaryRuntime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-occurrence-precedent:ordinary',
    });
    try {
      const ordinary = await ordinaryRuntime.openApp({ telemetry: { inquiryProfile: 'lsp-diagnostics' } });
      const profileOnly = await ordinaryRuntime.openApp({ telemetry: { inquiryProfile: 'aot' } });
      expect(profileOnly).toBe(ordinary);
      expect(ordinary.emission.templates.frontDoor.families.every((candidate) =>
        candidate.appOccurrencePrecedents.length === 0
        && candidate.authoringOccurrencePrecedents.length === 0
      )).toBe(true);
      const enriched = await ordinaryRuntime.openApp({
        includeCompilerOccurrencePrecedents: true,
      });
      expect(enriched).not.toBe(ordinary);
      expect(enriched.emission.templates.frontDoor.families.flatMap((candidate) =>
        candidate.appOccurrencePrecedents
      )).toHaveLength(1);
      expect(await ordinaryRuntime.openApp()).toBe(enriched);
      const cache = ordinaryRuntime.analysisCacheOverview().value;
      expect(cache.cachedApps).toHaveLength(1);
      expect(cache.cachedApps[0]?.includeCompilerOccurrencePrecedents).toBe(true);
    } finally {
      ordinaryRuntime.retireWorkspaceIncarnation();
    }
  }, 30_000);

  test('retains a lexical candidate when legacy static extraction exceeds its nesting limit', async () => {
    const sourcePath = path.join(fixtureRoot, 'src/template-local-template-semantics-app.html');
    const deepMarkup = [
      '<template>',
      '<div>'.repeat(129),
      'deep',
      '</div>'.repeat(129),
      '<template as-custom-element="deep-local"><span></span></template>',
      '<p></p>',
      '</template>',
    ].join('');
    const authority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile(fileName) {
        return path.resolve(fileName) === sourcePath ? deepMarkup : undefined;
      },
      fileExists(fileName) {
        return path.resolve(fileName) === sourcePath ? true : undefined;
      },
    }));
    const deepRuntime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-occurrence-precedent:deep-local',
      projectInputAuthority: authority,
    });
    try {
      const deepApp = await deepRuntime.openApp({ includeCompilerOccurrencePrecedents: true });
      const deepFamily = deepApp.emission.templates.frontDoor.families.find((candidate) =>
        candidate.appCompilations.some((compilation) =>
          compilation.definition.name === 'template-local-template-semantics-app'
        )
      );
      if (deepFamily == null) throw new Error('Expected deep local-template family.');
      const rootRuntime = requireCompilation(deepFamily, 'template-local-template-semantics-app');
      const precedent = requirePrecedent(deepFamily, 'template-local-template-semantics-app');
      expect(rootRuntime.unit.rootContext.localElementNames).toEqual([]);
      expect(precedent.admissionKind)
        .toBe(TemplateCompilerOccurrencePrecedentAdmissionKind.AuthoredLocalSyntaxCandidate);

      const run = deepRuntime.computationLifecycle.begin({
        kind: 'template-compiler-occurrence-precedent-deep-test',
        reconciliationKey: deepApp.project.projectKey,
        summary: 'Browser extraction beyond the legacy static nesting limit.',
      });
      try {
        const browser = parseBrowserTemplateFragmentDraft(deepMarkup);
        const browserEmission = new BrowserEffectiveTemplateMaterializer(run).materialize({
          localKey: 'template-compiler-occurrence-precedent:deep-browser',
          sourceRevision: precedent.sourceRevision,
          templateSource: precedent.compilation.unit.templateSource,
          authoredHtml: precedent.compilation.html,
          browser,
          carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
        });
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
        const execution = TemplateCompilerExecutionSession.createForForest(
          'template-compiler-occurrence-precedent:deep-family',
          forest,
        );
        const lane = execution.admitRootInvocation(rootRuntime.localKey);
        const hook = executeTemplateCompilerHookBootstrap({
          execution,
          lane,
          compilerWorld: precedent.preLocalCompilerWorld,
          executionOpenSeamHandle: run.handles.openSeam('deep-hook-open'),
        });
        const definitions = new LocalTemplateDefinitionMaterializer(run);
        const extraction = executeTemplateCompilerLocalExtraction({
          execution,
          lane,
          hookBootstrap: hook,
          ownerName: rootRuntime.definition.name,
          ownerCauseHandles: [rootRuntime.definition.productHandle!],
          reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
        });
        expect(extraction.state).toBe(TemplateCompilerLocalExtractionState.Extracted);
        expect(extraction.completedExtractions.map((entry) => entry.name)).toEqual(['deep-local']);
        const closure = execution.closeInvocationBootstrap(hook, extraction);
        const exclusions = TemplateCompilerLocalSiteExclusionAuthority.capture(execution, closure);
        const binding = bindTemplateCompilerRootOccurrencePrecedentInvocation({
          appCurrentness: deepApp,
          execution,
          bootstrapClosure: closure,
          browserEmission,
          occurrencePrecedent: precedent,
          currentFrontDoor: deepApp.emission.templates.frontDoor,
          currentFamily: deepFamily,
        }).binding;
        if (binding == null) throw new Error('Expected exact deep occurrence-precedent binding.');
        const laneFamily = createTemplateCompilerNormalizedSiteLaneFamily(binding).family;
        if (laneFamily == null) throw new Error('Expected exact deep normalized-site lane family.');
        const partition = laneFamily.partition(laneFamily.rootView, closure, exclusions).partition;
        if (partition == null) throw new Error('Expected exact deep normalized-site partition.');
        expect(partition.transfers).toHaveLength(1);
        expect(partition.transfers[0]?.transfer.extraction.name).toBe('deep-local');
        expect(partition.transfers[0]?.childView.bundles).toEqual([]);
      } finally {
        run.abort();
      }
    } finally {
      deepRuntime.retireWorkspaceIncarnation();
    }
  }, 30_000);

  test('carries unchanged occurrence precedent products into a deeper app generation', async () => {
    const previous = requirePrecedent(family, 'template-local-template-semantics-app');
    const prepareView = (
      currentApp: typeof app,
      currentFamily: TemplateCompilationFamilyFrontDoorEmission,
      precedent: TemplateCompilerOccurrencePrecedentEmission,
      key: string,
    ) => {
      const currentRoot = requireCompilation(currentFamily, 'template-local-template-semantics-app');
      const run = runtime.computationLifecycle.begin({
        kind: `template-compiler-occurrence-precedent-carry-${key}`,
        reconciliationKey: currentApp.project.projectKey,
        summary: `Occurrence-precedent carry ${key} view.`,
      });
      const markup = precedent.compilation.unit.templateSource.markup;
      if (markup == null) throw new Error('Expected carried occurrence-precedent markup.');
      const browser = parseBrowserTemplateFragmentDraft(markup);
      const browserEmission = new BrowserEffectiveTemplateMaterializer(run).materialize({
        localKey: `template-compiler-occurrence-precedent:carry:${key}`,
        sourceRevision: precedent.sourceRevision,
        templateSource: precedent.compilation.unit.templateSource,
        authoredHtml: precedent.compilation.html,
        browser,
        carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
      });
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
      const execution = TemplateCompilerExecutionSession.createForForest(`carry:${key}`, forest);
      const lane = execution.admitRootInvocation(currentRoot.localKey);
      const hook = executeTemplateCompilerHookBootstrap({
        execution,
        lane,
        compilerWorld: precedent.preLocalCompilerWorld,
        executionOpenSeamHandle: run.handles.openSeam(`${key}:hook-open`),
      });
      const definitions = new LocalTemplateDefinitionMaterializer(run);
      const extraction = executeTemplateCompilerLocalExtraction({
        execution,
        lane,
        hookBootstrap: hook,
        ownerName: currentRoot.definition.name,
        ownerCauseHandles: [currentRoot.definition.productHandle!],
        reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
      });
      const closure = execution.closeInvocationBootstrap(hook, extraction);
      const frontDoor = currentApp.emission.templates.frontDoor;
      const bindingResult = bindTemplateCompilerRootOccurrencePrecedentInvocation({
        appCurrentness: currentApp,
        execution,
        bootstrapClosure: closure,
        browserEmission,
        occurrencePrecedent: precedent,
        currentFrontDoor: frontDoor,
        currentFamily,
      });
      if (bindingResult.binding == null) throw new Error(`Expected exact carried ${key} binding.`);
      const lanes = createTemplateCompilerNormalizedSiteLaneFamily(bindingResult.binding).family;
      if (lanes == null) throw new Error(`Expected exact carried ${key} lane family.`);
      return { run, execution, closure, browserEmission, frontDoor, binding: bindingResult.binding, lanes };
    };

    const previousView = prepareView(app, family, previous, 'previous');
    try {
      const deeper = await runtime.openApp({
        analysisDepth: 'binding-observation',
        includeCompilerOccurrencePrecedents: true,
        telemetry: { inquiryProfile: 'aot' },
      });
      const nextFamily = deeper.emission.templates.frontDoor.familyForOwner(family.ownerHandle);
      if (nextFamily == null) throw new Error('Expected carried local-template family.');
      const next = requirePrecedent(nextFamily, 'template-local-template-semantics-app');

      expect(next).not.toBe(previous);
      expect(next.compilation).not.toBe(previous.compilation);
      expect(next.compilation.unit).toBe(previous.compilation.unit);
      expect(next.compilation.html).toBe(previous.compilation.html);
      expect(next.compilation.compiledTemplate).toBe(previous.compilation.compiledTemplate);
      expect(next.normalizedSites.index?.compilation).toBe(next.compilation);
      expect(nextFamily.occurrencePrecedentsRequested).toBe(true);
      expect(previousView.binding.isCurrent()).toBe(false);
      expect(previousView.lanes.isCurrent()).toBe(false);
      const stale = bindTemplateCompilerRootOccurrencePrecedentInvocation({
        appCurrentness: app,
        execution: previousView.execution,
        bootstrapClosure: previousView.closure,
        browserEmission: previousView.browserEmission,
        occurrencePrecedent: previous,
        currentFrontDoor: previousView.frontDoor,
        currentFamily: family,
      });
      expect(stale.state).toBe(TemplateCompilerOccurrencePrecedentInvocationBindingState.Open);
      expect(stale.reasons.map((reason) => reason.reasonKind)).toEqual([
        TemplateCompilerSiteInvocationBindingReasonKind.AppGenerationUnavailable,
      ]);
      const crossGeneration = bindTemplateCompilerRootOccurrencePrecedentInvocation({
        appCurrentness: deeper,
        execution: previousView.execution,
        bootstrapClosure: previousView.closure,
        browserEmission: previousView.browserEmission,
        occurrencePrecedent: previous,
        currentFrontDoor: previousView.frontDoor,
        currentFamily: family,
      });
      expect(crossGeneration.state).toBe(TemplateCompilerOccurrencePrecedentInvocationBindingState.Mismatch);
      expect(crossGeneration.reasons.map((reason) => reason.reasonKind)).toEqual([
        TemplateCompilerSiteInvocationBindingReasonKind.AppFrontDoorAuthorityMismatch,
      ]);

      const nextView = prepareView(deeper, nextFamily, next, 'next');
      try {
        expect(nextView.lanes).not.toBe(previousView.lanes);
        expect(nextView.lanes.rootView.lane.localKey).toBe(previousView.lanes.rootView.lane.localKey);
        expect(nextView.lanes.rootView.bundles.every((bundle, index) =>
          bundle !== previousView.lanes.rootView.bundles[index]
        )).toBe(true);
        expect(nextView.lanes.rootView.bundles.map(normalizedBundleProductHandle))
          .toEqual(previousView.lanes.rootView.bundles.map(normalizedBundleProductHandle));
      } finally {
        nextView.run.abort();
      }
    } finally {
      previousView.run.abort();
    }
  }, 30_000);
});

function requirePrecedent(
  family: TemplateCompilationFamilyFrontDoorEmission,
  name: string,
): TemplateCompilerOccurrencePrecedentEmission {
  const precedent = family.appOccurrencePrecedents.find((candidate) =>
    candidate.compilation.definition.name === name
  );
  if (precedent == null) throw new Error(`Expected occurrence precedent '${name}'.`);
  return precedent;
}

function requireCompilation(
  family: TemplateCompilationFamilyFrontDoorEmission,
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = family.appCompilations.find((candidate) => candidate.definition.name === name);
  if (compilation == null) throw new Error(`Expected runtime compilation '${name}'.`);
  return compilation;
}

function mismatchedPrecedent(
  precedent: TemplateCompilerOccurrencePrecedentEmission,
  runtimeCompilation: TemplateResourceCompilationEmission,
): TemplateCompilerOccurrencePrecedentEmission {
  const compilation = precedent.compilation;
  return new TemplateCompilerOccurrencePrecedentEmission(
    new TemplateResourceCompilationEmission(
      `${compilation.localKey}:mismatch-control`,
      compilation.familyOwnerHandle,
      compilation.analysisContextProductHandle,
      compilation.appRootDefinitionProductHandle,
      compilation.parentCompilerWorld,
      compilation.compilerWorld,
      compilation.definition,
      compilation.unit,
      compilation.html,
      runtimeCompilation.attributeSyntax,
      compilation.attributeClassification,
      compilation.valueSites,
      compilation.bindingCommandLowering,
      compilation.compiledTemplate,
      compilation.registeredReads,
    ),
    precedent.preLocalCompilerWorld,
    precedent.sourceRevision,
    precedent.admissionKind,
  );
}

function normalizedBundleProductHandle(bundle: TemplateCompilerNormalizedSiteBundle): string {
  return 'attributeProductHandle' in bundle
    ? bundle.attributeProductHandle
    : bundle.textProductHandle;
}
