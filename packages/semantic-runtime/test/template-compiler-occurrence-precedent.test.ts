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
  type TemplateCompilerInvocationBootstrapClosure,
} from '../src/template/template-compiler-execution.js';
import {
  executeTemplateCompilerHookBootstrap,
} from '../src/template/template-compiler-hook-bootstrap.js';
import {
  executeTemplateCompilerLocalExtraction,
  TemplateCompilerLocalExtractionState,
} from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerLocalSiteExclusionAuthority,
  TemplateCompilerSiteSpendDisposition,
} from '../src/template/template-compiler-site-spend-ledger.js';

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

    const mismatchedCompilation = new TemplateResourceCompilationEmission(
      `${root.compilation.localKey}:mismatch-control`,
      root.compilation.familyOwnerHandle,
      root.compilation.analysisContextProductHandle,
      root.compilation.appRootDefinitionProductHandle,
      root.compilation.parentCompilerWorld,
      root.compilation.compilerWorld,
      root.compilation.definition,
      root.compilation.unit,
      root.compilation.html,
      rootRuntime.attributeSyntax,
      root.compilation.attributeClassification,
      root.compilation.valueSites,
      root.compilation.bindingCommandLowering,
      root.compilation.compiledTemplate,
      root.compilation.registeredReads,
    );
    const mismatched = new TemplateCompilerOccurrencePrecedentEmission(
      mismatchedCompilation,
      root.preLocalCompilerWorld,
      root.sourceRevision,
      root.admissionKind,
    );
    expect(mismatched.normalizedSites.state).toBe('mismatch');
    expect(mismatched.normalizedSites.mismatches.length).toBeGreaterThan(0);
  });

  test('partitions raw authored bundles through root, sibling, and nested local transfers', () => {
    const root = requirePrecedent(family, 'template-local-template-semantics-app');
    const rootRuntime = requireCompilation(family, 'template-local-template-semantics-app');
    const modePanelRuntime = requireCompilation(family, 'mode-panel');
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
      const bundleOccurrences = rawBundleOccurrences(root, forest);
      const rootViews = transferBundleViews(bundleOccurrences, rootExclusions, rootClosure);

      expect([...rootViews.keys()].sort()).toEqual(['local-icon', 'mode-panel']);
      const modePanelView = rootViews.get('mode-panel')!;
      const localIconView = rootViews.get('local-icon')!;
      expect(modePanelView.size).toBeGreaterThan(0);
      expect(localIconView.size).toBeGreaterThan(0);
      expect([...modePanelView].some((product) => localIconView.has(product))).toBe(false);
      const nestedDeclaration = index.attributeSites.find((site) =>
        site.attribute.rawName === 'as-custom-element' && site.attribute.rawValue === 'nested-note'
      );
      expect(nestedDeclaration).not.toBeNull();
      expect(modePanelView.has(nestedDeclaration!.attributeProductHandle)).toBe(true);
      expect(localIconView.has(nestedDeclaration!.attributeProductHandle)).toBe(false);

      const modePanelTransfer = rootClosure.childLaneTransfers.find((transfer) =>
        transfer.extraction.name === 'mode-panel'
      );
      if (modePanelTransfer == null) throw new Error('Expected mode-panel child transfer.');
      const childHook = executeTemplateCompilerHookBootstrap({
        execution,
        lane: modePanelTransfer.childLane,
        compilerWorld: modePanelRuntime.parentCompilerWorld,
        executionOpenSeamHandle: run.handles.openSeam('mode-panel-hook-open'),
      });
      const childExtraction = executeTemplateCompilerLocalExtraction({
        execution,
        lane: modePanelTransfer.childLane,
        hookBootstrap: childHook,
        ownerName: 'mode-panel',
        ownerCauseHandles: [modePanelTransfer.extraction.definitionReservation.productHandle],
        reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
      });
      const childClosure = execution.closeInvocationBootstrap(childHook, childExtraction);
      const childExclusions = TemplateCompilerLocalSiteExclusionAuthority.capture(execution, childClosure);
      const childViews = transferBundleViews(bundleOccurrences, childExclusions, childClosure);
      expect([...childViews.keys()]).toEqual(['nested-note']);
      const nestedView = childViews.get('nested-note')!;
      expect(nestedView.size).toBeGreaterThan(0);
      expect([...nestedView].every((product) => modePanelView.has(product))).toBe(true);
      expect(nestedView.size).toBeLessThan(modePanelView.size);

      const declarationReceipts = bundleOccurrences.filter(({ occurrence }) =>
        rootExclusions.receiptFor(occurrence)?.disposition
          === TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
      );
      const metadataReceipts = bundleOccurrences.filter(({ occurrence }) =>
        rootExclusions.receiptFor(occurrence)?.disposition
          === TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
      );
      expect(declarationReceipts).toHaveLength(2);
      expect(metadataReceipts.length).toBeGreaterThan(0);
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
      } finally {
        run.abort();
      }
    } finally {
      deepRuntime.retireWorkspaceIncarnation();
    }
  }, 30_000);

  test('carries unchanged occurrence precedent products into a deeper app generation', async () => {
    const previous = requirePrecedent(family, 'template-local-template-semantics-app');
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
  }, 30_000);
});

interface RawBundleOccurrence {
  readonly productHandle: string;
  readonly occurrence: TemplateCompilerAttributeOccurrence | TemplateCompilerTextOccurrence;
}

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

function rawBundleOccurrences(
  precedent: TemplateCompilerOccurrencePrecedentEmission,
  forest: TemplateCompilerOccurrenceForest,
): readonly RawBundleOccurrence[] {
  const index = precedent.normalizedSites.index;
  if (index == null) throw new Error('Expected GraphExact occurrence precedent.');
  return [
    ...index.attributeSites.map((site) => ({
      productHandle: site.attributeProductHandle,
      occurrence: requireAttributeOccurrence(forest, site.attributeProductHandle),
    })),
    ...index.textSites.map((site) => ({
      productHandle: site.textProductHandle,
      occurrence: requireTextOccurrence(forest, site.textProductHandle),
    })),
  ];
}

function requireAttributeOccurrence(
  forest: TemplateCompilerOccurrenceForest,
  productHandle: string,
): TemplateCompilerAttributeOccurrence {
  const matches = forest.readAttributes().filter((attribute) =>
    forest.exactAuthoredAttributeOrigin(attribute)?.authored.productHandle === productHandle
  );
  if (matches.length !== 1) throw new Error(`Expected one raw attribute occurrence for '${productHandle}'.`);
  return matches[0]!;
}

function requireTextOccurrence(
  forest: TemplateCompilerOccurrenceForest,
  productHandle: string,
): TemplateCompilerTextOccurrence {
  const matches = forest.readNodes().filter((node): node is TemplateCompilerTextOccurrence =>
    node instanceof TemplateCompilerTextOccurrence
    && forest.exactAuthoredNodeOrigin(node)?.authored.productHandle === productHandle
  );
  if (matches.length !== 1) throw new Error(`Expected one raw text occurrence for '${productHandle}'.`);
  return matches[0]!;
}

function transferBundleViews(
  bundles: readonly RawBundleOccurrence[],
  exclusions: TemplateCompilerLocalSiteExclusionAuthority,
  closure: TemplateCompilerInvocationBootstrapClosure,
): ReadonlyMap<string, ReadonlySet<string>> {
  const nameByLane = new Map(closure.childLaneTransfers.map((transfer) => [
    transfer.childLane,
    transfer.extraction.name,
  ]));
  const views = new Map<string, Set<string>>();
  for (const bundle of bundles) {
    const receipt = exclusions.receiptFor(bundle.occurrence);
    if (
      receipt?.disposition !== TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation
      || receipt.destinationLane == null
    ) continue;
    const name = nameByLane.get(receipt.destinationLane);
    if (name == null) throw new Error('Transferred bundle lost its child lane name.');
    const view = views.get(name);
    if (view == null) views.set(name, new Set([bundle.productHandle]));
    else view.add(bundle.productHandle);
  }
  return views;
}
