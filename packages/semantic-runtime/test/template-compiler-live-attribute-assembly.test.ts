import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  BrowserEffectiveTemplateMaterializer,
  type BrowserEffectiveTemplateEmission,
} from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import {
  PropertyBindingInstruction,
  TemplateBindingMode,
} from '../src/template/instruction-ir.js';
import { TemplateCompilerExecutionSession } from '../src/template/template-compiler-execution.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import {
  assembleTemplateCompilerLiveAttributeOwner,
  TemplateCompilerLiveAttributeCompletion,
  TemplateCompilerLiveAttributeOpenReasonKind,
  TemplateCompilerLiveAttributeSourceKind,
  TemplateCompilerLiveAttributeStructuralEffectKind,
  type TemplateCompilerLiveAttributeOwnerResult,
} from '../src/template/template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from '../src/template/template-compiler-live-attribute-owner.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceForest,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkRemainderAuthority,
  TemplateCompilerPreWalkRemainderKind,
} from '../src/template/template-compiler-prewalk-remainder.js';
import { TemplateCompilerReachedSiteSemanticResolver } from '../src/template/template-compiler-reached-site-semantics.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingState,
  type TemplateCompilerSiteInvocationBinding,
} from '../src/template/template-compiler-site-invocation.js';
import { runtimeElementLookupName } from '../src/template/runtime-dom-name.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler live attribute owner assembly', () => {
  let fixture: LiveAttributeAssemblyFixture;

  beforeAll(async () => {
    fixture = await LiveAttributeAssemblyFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture?.dispose();
  });

  test('reassembles browser duplicate survivors against the reached owner instead of authored owner shape', () => {
    const run = fixture.run('cursor-live-duplicate');
    const [canonical, ownerSensitive] = elements(run.binding.execution.forest, 'div');
    if (canonical == null || ownerSensitive == null) throw new Error('Expected duplicate-pressure divs.');

    const canonicalResult = run.assemble(canonical);
    expect(canonicalResult.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(canonicalResult.contributions).toHaveLength(1);
    expect(canonicalResult.contributions[0]?.frame.source.sourceKind)
      .toBe(TemplateCompilerLiveAttributeSourceKind.AuthoredExact);
    expect(canonicalResult.contributions[0]?.instructions).toEqual([
      expect.objectContaining({
        instructionKind: 'property-binding',
        targetProperty: 'title',
        bindingMode: TemplateBindingMode.ToView,
      }),
    ]);
    const dropped = run.preWalk.readAll().filter((receipt) =>
      receipt.remainderKind === TemplateCompilerPreWalkRemainderKind.HtmlTreeBuilderDropped
    );
    expect(dropped).toHaveLength(2);
    expect(dropped.every((receipt) => receipt.retainedPredecessorProductHandle != null)).toBe(true);

    const ownerResult = run.assemble(ownerSensitive);
    expect(ownerResult.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(ownerResult.contributions.map((entry) => entry.disposition)).toEqual([
      TemplateCompilerLiveAttributeDisposition.Removed,
      TemplateCompilerLiveAttributeDisposition.Removed,
    ]);
    const textContent = ownerResult.contributions[1]!;
    const liveInstruction = textContent.instructions[0];
    expect(liveInstruction).toBeInstanceOf(PropertyBindingInstruction);
    expect(liveInstruction).toMatchObject({
      targetProperty: 'textContent',
      bindingMode: TemplateBindingMode.ToView,
    });
    expect(textContent.frame.liveSite.ownerView.hasAttribute('contenteditable')).toBe(false);
    expect(textContent.frame.source.authoredPrecedent?.command?.instructions[0]).toMatchObject({
      bindingMode: TemplateBindingMode.TwoWay,
    });
    expect(ownerResult.compilerReadsAreClosedAndCurrent()).toBe(true);
  });

  test('records empty template-controller no-binding policy without suppressing the JIT parser call', () => {
    const run = fixture.run('cursor-live-empty');
    const element = elements(run.binding.execution.forest, 'div')[0];
    if (element == null) throw new Error('Expected empty template-controller host.');

    const result = run.assemble(element);
    const contribution = result.contributions[0]!;
    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(contribution.valueSelection).toMatchObject({
      siteKind: 'template-controller-value',
      emptyValueBindingPolicy: 'no-binding',
    });
    expect(contribution.valueParse?.read.value.kind).toBe(ExpressionParseResultKind.InterpolationAbsent);
    expect(contribution.instructions).toEqual([]);
    expect(contribution.disposition).toBe(TemplateCompilerLiveAttributeDisposition.Removed);
  });

  test('keeps non-exact scalar history terminally open before parser or classifier execution', () => {
    const run = fixture.run('cursor-progression', (forest) => {
      const attribute = forest.readAttributes().find((candidate) => candidate.name === 'contenteditable');
      if (attribute == null) throw new Error('Expected contenteditable occurrence.');
      forest.rewriteAttributeValue(attribute, `${attribute.value}:unledgered`);
    });
    const element = elements(run.binding.execution.forest, 'div')[0];
    if (element == null) throw new Error('Expected progression div.');

    const result = run.assemble(element);
    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Open);
    expect(result.contributions).toHaveLength(1);
    expect(result.terminalContribution?.reason?.reasonKind)
      .toBe(TemplateCompilerLiveAttributeOpenReasonKind.SourceAuthorityOpen);
    expect(result.terminalContribution?.syntax).toBeNull();
    expect(result.terminalContribution?.frame.source.sourceKind)
      .toBe(TemplateCompilerLiveAttributeSourceKind.Open);
  });

  test('lowers each non-singular browser reconstruction without selecting an arbitrary authored bundle', () => {
    const run = fixture.run('cursor-live-nonsingular');
    const reconstructed = elements(run.binding.execution.forest, 'i');
    expect(reconstructed).toHaveLength(2);

    const results = reconstructed.map((element) => run.assemble(element));
    expect(results.map((result) => result.completion)).toEqual([
      TemplateCompilerLiveAttributeCompletion.Complete,
      TemplateCompilerLiveAttributeCompletion.Complete,
    ]);
    expect(results.map((result) => result.contributions[0]?.frame.source.sourceKind)).toEqual([
      TemplateCompilerLiveAttributeSourceKind.AuthoredNonSingular,
      TemplateCompilerLiveAttributeSourceKind.AuthoredNonSingular,
    ]);
    expect(results.map((result) => result.contributions[0]?.frame.source.authoredPrecedent)).toEqual([null, null]);
    expect(results.map((result) => result.contributions[0]?.instructions[0])).toEqual([
      expect.objectContaining({ targetProperty: 'title', bindingMode: TemplateBindingMode.ToView }),
      expect.objectContaining({ targetProperty: 'title', bindingMode: TemplateBindingMode.ToView }),
    ]);
    expect(results[0]?.contributions[0]?.frame.attribute).not.toBe(results[1]?.contributions[0]?.frame.attribute);
  });

  test('preserves special-attribute effects without invoking the attribute parser', () => {
    const run = fixture.run('cursor-as-element-empty');
    const element = elements(run.binding.execution.forest, 'div')[0];
    if (element == null) throw new Error('Expected as-element div.');

    const result = run.assemble(element);
    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(result.lookupName).toBe('');
    expect(result.contributions[0]).toMatchObject({
      syntax: null,
      structuralEffects: [TemplateCompilerLiveAttributeStructuralEffectKind.AsElementLookup],
      disposition: TemplateCompilerLiveAttributeDisposition.Removed,
    });
  });

  test('keeps a wide reached owner linear and command-complete', () => {
    const ordinal = vi.spyOn(TemplateCompilerAttributeOccurrence.prototype, 'readOwnerOrdinal');
    try {
      const run = fixture.run('cursor-wide');
      const element = elements(run.binding.execution.forest, 'div')[0];
      if (element == null) throw new Error('Expected wide div.');
      const result = run.assemble(element);

      expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
      expect(result.contributions).toHaveLength(128);
      expect(result.contributions.every((entry) =>
        entry.frame.liveSite.simulatedLiveOrdinal === 0
        && entry.instructions[0] instanceof PropertyBindingInstruction
      )).toBe(true);
      expect(ordinal).not.toHaveBeenCalled();
    } finally {
      ordinal.mockRestore();
    }
  }, 30_000);
});

class LiveAttributeAssemblyRun {
  readonly preWalk: TemplateCompilerPreWalkRemainderAuthority;
  readonly reads: TemplateCompilerReadView;

  constructor(
    readonly fixture: LiveAttributeAssemblyFixture,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly binding: TemplateCompilerSiteInvocationBinding,
    readonly localKey: string,
  ) {
    this.preWalk = TemplateCompilerPreWalkRemainderAuthority.capture(binding);
    this.reads = new TemplateCompilerReadView(
      fixture.runtime.workspace.store,
      TemplateCompilerWorldAuthority.fixed(binding.compilerWorld),
    );
  }

  assemble(element: TemplateCompilerElementOccurrence): TemplateCompilerLiveAttributeOwnerResult {
    const reached = new TemplateCompilerReachedSiteSemanticResolver({
      execution: this.binding.execution,
      bootstrapClosure: this.binding.bootstrapClosure,
      compilerReads: this.reads,
      preWalk: this.preWalk,
      index: this.binding.index,
    });
    const asElement = reached.readAsElementScalar(element);
    const lookupName = runtimeElementLookupName(
      element.tagName,
      element.namespace,
      asElement?.scalar.currentValue ?? null,
    );
    return assembleTemplateCompilerLiveAttributeOwner({
      localKey: `${this.localKey}:${element.occurrenceKey}`,
      execution: this.binding.execution,
      bootstrapClosure: this.binding.bootstrapClosure,
      compilerReads: this.reads,
      preWalk: this.preWalk,
      element,
      lookupName,
      handles: this.fixture.browserRun.handles,
    });
  }
}

class LiveAttributeAssemblyFixture {
  private runOrdinal = 0;

  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly browserRun: ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']>,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
  ) {}

  static async create(): Promise<LiveAttributeAssemblyFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-site-cursor'),
      storeKey: 'contract:template-compiler-live-attribute-assembly',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-live-attribute-assembly-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Candidate-local live attribute assembly fixtures.',
    });
    return new LiveAttributeAssemblyFixture(runtime, browserRun, app.emission.templates.frontDoor);
  }

  run(
    name: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null = null,
  ): LiveAttributeAssemblyRun {
    const compilation = [...this.frontDoor.appCompilations, ...this.frontDoor.authoringCompilations].find(
      (candidate) => candidate.definition.name === name,
    );
    if (compilation == null) throw new Error(`Expected assembly compilation '${name}'.`);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current assembly family '${name}'.`);
    const localKey = `live-attribute:${name}:${this.runOrdinal++}`;
    return new LiveAttributeAssemblyRun(
      this,
      compilation,
      this.bind(compilation, family, localKey, prepareForest),
      localKey,
    );
  }

  dispose(): void {
    this.browserRun.abort();
    this.runtime.retireWorkspaceIncarnation();
  }

  private bind(
    compilation: TemplateResourceCompilationEmission,
    family: TemplateCompilationFamilyFrontDoorEmission,
    localKey: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null,
  ): TemplateCompilerSiteInvocationBinding {
    const browserEmission = this.materializeBrowser(compilation, localKey);
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
    prepareForest?.(forest);
    const execution = TemplateCompilerExecutionSession.createForForest(localKey, forest);
    const lane = execution.admitRootInvocation(compilation.localKey);
    const hook = executeTemplateCompilerHookBootstrap({
      execution,
      lane,
      compilerWorld: compilation.compilerWorld,
      executionOpenSeamHandle: this.browserRun.handles.openSeam(`${localKey}:hook-open`),
    });
    const local = executeTemplateCompilerLocalExtraction({
      execution,
      lane,
      hookBootstrap: hook,
      ownerName: compilation.definition.name,
      ownerCauseHandles: [compilation.definition.productHandle!],
      reserveDefinition: () => {
        throw new Error(`No-local assembly fixture '${compilation.definition.name}' requested a definition reservation.`);
      },
    });
    const closure = execution.closeInvocationBootstrap(hook, local);
    const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
    if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact) {
      throw new Error(`Expected GraphExact assembly precedent '${compilation.definition.name}'.`);
    }
    const result = bindTemplateCompilerRootSiteInvocation({
      execution,
      bootstrapClosure: closure,
      browserEmission,
      graphExact,
      currentFrontDoor: this.frontDoor,
      currentFamily: family,
    });
    if (result.state !== TemplateCompilerSiteInvocationBindingState.Exact || result.binding == null) {
      throw new Error(`Expected exact assembly binding: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    return result.binding;
  }

  private materializeBrowser(
    compilation: TemplateResourceCompilationEmission,
    localKey: string,
  ): BrowserEffectiveTemplateEmission {
    const markup = compilation.unit.templateSource.markup;
    if (markup == null || compilation.html.draft == null) {
      throw new Error(`Assembly compilation '${compilation.definition.name}' has no retained markup/draft.`);
    }
    const browser = parseBrowserTemplateFragmentDraft(markup);
    return new BrowserEffectiveTemplateMaterializer(this.browserRun).materialize({
      localKey: `browser:${localKey}`,
      sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${localKey}`,
      templateSource: compilation.unit.templateSource,
      authoredHtml: compilation.html,
      browser,
      carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
    });
  }
}

function elements(
  forest: TemplateCompilerOccurrenceForest,
  tagName: string,
): readonly TemplateCompilerElementOccurrence[] {
  return forest.readNodes().filter((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence && node.tagName === tagName
  );
}
