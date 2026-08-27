import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { AttributeClassificationKind } from '../src/template/attribute-syntax.js';
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
import { TemplateCompilerExecutionSession } from '../src/template/template-compiler-execution.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import { TemplateCompilerLiveAttributeDisposition } from '../src/template/template-compiler-live-attribute-owner.js';
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
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingState,
  type TemplateCompilerSiteInvocationBinding,
} from '../src/template/template-compiler-site-invocation.js';
import {
  executeTemplateCompilerRootSiteCursor,
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorElementEvent,
  TemplateCompilerSiteCursorFrontierKind,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
  TemplateCompilerSiteCursorResultState,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorSurrogateValidationOutcome,
  TemplateCompilerSiteCursorTextEvent,
  type TemplateCompilerSiteCursorTranscript,
} from '../src/template/template-compiler-site-cursor.js';
import {
  TemplateCompilerSiteSpendDisposition,
} from '../src/template/template-compiler-site-spend-ledger.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler root site cursor', () => {
  let fixture: CursorFixture;

  beforeAll(async () => {
    fixture = await CursorFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture?.dispose();
  });

  test('completes a minimal root in exact content-before-surrogate order', () => {
    const transcript = fixture.transcript('cursor-empty');
    expect(transcript.frontier).toBeNull();
    expect(transcript.events.map((event) => event.ordinal))
      .toEqual(transcript.events.map((_, ordinal) => ordinal));
    expect(phaseKinds(transcript)).toEqual([
      TemplateCompilerSiteCursorPhaseKind.PreWalkRemainders,
      TemplateCompilerSiteCursorPhaseKind.ContentStart,
      TemplateCompilerSiteCursorPhaseKind.ContentEnd,
      TemplateCompilerSiteCursorPhaseKind.SurrogateValidationStart,
      TemplateCompilerSiteCursorPhaseKind.SurrogateValidationEnd,
      TemplateCompilerSiteCursorPhaseKind.SurrogateEnd,
    ]);
    expect(elementTags(transcript)).toEqual(['main', 'h1']);
    const texts = eventsOf(transcript, TemplateCompilerSiteCursorTextEvent);
    expect(texts).toHaveLength(2);
    expect(texts.filter((event) => event.bundle != null)).toHaveLength(1);
    expect(texts.find((event) => event.bundle == null)?.occurrenceOnlyRow?.disposition)
      .toBe('static-text-pass-through');
    expect(transcript.nextTranscriptOrdinal).toBe(transcript.events.length);
    expect(transcript.nextSiteEventOrdinal).toBe(transcript.ledger.completion.nextSiteEventOrdinal);
  });

  test('reuses progressive owner-state bundles in the two mode-sensitive orders', () => {
    const transcript = fixture.transcript('cursor-progression');
    expect(transcript.frontier).toBeNull();
    const attributes = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent);
    expect(attributes).toHaveLength(4);
    expect(attributes.map((event) => event.bundle?.classification.classificationKind)).toEqual([
      AttributeClassificationKind.Plain,
      AttributeClassificationKind.BindingCommand,
      AttributeClassificationKind.BindingCommand,
      AttributeClassificationKind.Plain,
    ]);
    expect(attributes.map((event) => event.spend?.disposition)).toEqual([
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
    ]);
    expect(attributes.map((event) => event.jitLiveOrdinal)).toEqual([0, 0, 0, 0]);
    expect(attributes.every((event) =>
      event.liveOwnerSite.disposition === TemplateCompilerLiveAttributeDisposition.Removed
    )).toBe(true);
  });

  test('visits implied table structure, excludes inert content, and stops at let after suppressing its children', () => {
    const transcript = fixture.transcript('cursor-shapes');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.LetElementLoweringRequired);
    const implied = eventsOf(transcript, TemplateCompilerSiteCursorElementEvent).find((event) =>
      event.element.tagName === 'tbody'
    );
    expect(implied?.occurrenceOnlyRow?.disposition).toBe('browser-implied-element-pass-through');
    const exclusions = eventsOf(transcript, TemplateCompilerSiteCursorSubtreeExclusionEvent);
    expect(exclusions.map((event) => event.disposition)).toEqual([
      TemplateCompilerSiteSpendDisposition.InertTemplateContent,
      TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
    ]);
    expect(exclusions[0]?.spends.length).toBeGreaterThanOrEqual(2);
    expect(exclusions[1]?.spends).toHaveLength(1);
    expect(elementTags(transcript)).not.toContain('span');
  });

  test('uses browser foster order rather than authored preorder', () => {
    const transcript = fixture.transcript('cursor-foster');
    expect(transcript.frontier).toBeNull();
    expect(elementTags(transcript).slice(0, 2)).toEqual(['div', 'table']);
  });

  test('primes comment-shield factory remainders before walking selected carrier content', () => {
    const transcript = fixture.transcript('cursor-comment-shield');
    const prewalk = eventsOf(transcript, TemplateCompilerSiteCursorPhaseEvent)[0]!;
    expect(prewalk.phaseKind).toBe(TemplateCompilerSiteCursorPhaseKind.PreWalkRemainders);
    expect(prewalk.remainderReceipts.map((receipt) => receipt.remainderKind)).toContain(
      TemplateCompilerPreWalkRemainderKind.TemplateElementFactoryDiscarded,
    );
    expect(prewalk.remainderEvidence.every((evidence) => evidence.preWalkReceipt != null)).toBe(true);
    expect(elementTags(transcript)).toEqual(['span']);
  });

  test('validates every surrogate attribute before refusing a later invalid target without spends', () => {
    const transcript = fixture.transcript('cursor-surrogate-invalid');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.InvalidSurrogateAttribute);
    const validations = eventsOf(transcript, TemplateCompilerSiteCursorSurrogateValidationEvent);
    expect(validations.map((event) => event.outcome)).toEqual([
      TemplateCompilerSiteCursorSurrogateValidationOutcome.Valid,
      TemplateCompilerSiteCursorSurrogateValidationOutcome.Refused,
    ]);
    expect(validations.map((event) => event.parsed.value.execution.target)).toEqual(['data-ok', 'id']);
    expect(transcript.ledger.spends).toHaveLength(0);
  });

  test('preserves present-empty as-element for the exact empty resource read', () => {
    const transcript = fixture.transcript('cursor-as-element-empty');
    expect(transcript.frontier).toBeNull();
    const element = eventsOf(transcript, TemplateCompilerSiteCursorElementEvent).find((event) =>
      event.element.tagName === 'div'
    );
    expect(element?.lookupName).toBe('');
    expect(element?.asElementScalar?.currentValue).toBe('');
    expect(element?.elementRead?.value).toBeNull();
  });

  test('stops after attributes before projection ownership changes', () => {
    const transcript = fixture.transcript('cursor-projection');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection);
    expect(transcript.frontier?.node).toBeInstanceOf(TemplateCompilerElementOccurrence);
    expect((transcript.frontier?.node as TemplateCompilerElementOccurrence).tagName).toBe('cursor-leaf');
    expect(elementTags(transcript)).not.toContain('span');
  });

  test('stops on an exact authored reserved marker without publishing a local issue', () => {
    const transcript = fixture.transcript('cursor-marker');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AuthoredCompilerMarkerReserved);
    expect(elementTags(transcript)).not.toContain('span');
  });

  test('keeps the central effect and normalized-open frontiers distinct', () => {
    const expected = new Map<string, TemplateCompilerSiteCursorFrontierKind>([
      ['cursor-template-controller', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController],
      ['cursor-process-content', TemplateCompilerSiteCursorFrontierKind.BeforeProcessContent],
      ['cursor-containerless', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless],
      ['cursor-open', TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedOpen],
    ]);
    for (const [name, frontier] of expected) {
      const transcript = fixture.transcript(name);
      expect(transcript.frontier?.frontierKind, name).toBe(frontier);
      expect(transcript.frontier?.frontierKind, name)
        .not.toBe(TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedInvalid);
    }
  });

  test('finishes all-valid surrogate validation before the dedicated classification frontier', () => {
    const transcript = fixture.transcript('cursor-surrogate-valid');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.SurrogateClassificationRequired);
    expect(phaseKinds(transcript)).toContain(TemplateCompilerSiteCursorPhaseKind.SurrogateValidationEnd);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorSurrogateValidationEvent)).toHaveLength(1);
    expect(transcript.ledger.spends).toHaveLength(0);
  });

  test('spends an unledgered pre-bootstrap scalar as live relowering and stops', () => {
    const transcript = fixture.transcriptWithUnledgeredRewrite('cursor-progression', 'contenteditable');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AtLiveAttributeRelowering);
    const attribute = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)[0]!;
    expect(attribute.spend?.disposition)
      .toBe(TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired);
    expect(attribute.scalar.isExact()).toBe(false);
  });

  test('is deterministic and rejects foreign read/prewalk capabilities', () => {
    const run = fixture.run('cursor-empty');
    const first = run.transcript();
    const second = run.transcript();
    expect(transcriptProjection(second)).toEqual(transcriptProjection(first));

    const foreign = fixture.run('cursor-as-element-empty');
    const foreignReads = new TemplateCompilerReadView(
      fixture.runtime.workspace.store,
      TemplateCompilerWorldAuthority.fixed(foreign.compilation.compilerWorld),
    );
    const wrongReads = executeTemplateCompilerRootSiteCursor({
      binding: run.binding,
      compilerReads: foreignReads,
      preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(run.binding),
    });
    expect(wrongReads.state).toBe(TemplateCompilerSiteCursorResultState.Mismatch);

    const wrongPrewalk = executeTemplateCompilerRootSiteCursor({
      binding: run.binding,
      compilerReads: run.reads(),
      preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(foreign.binding),
    });
    expect(wrongPrewalk.state).toBe(TemplateCompilerSiteCursorResultState.Mismatch);
  });

  test('keeps a wide attribute walk linear without consulting indexOf-backed ordinals', () => {
    const nodeOrdinal = vi.spyOn(TemplateCompilerElementOccurrence.prototype, 'readParentOrdinal');
    const attributeOrdinal = vi.spyOn(TemplateCompilerAttributeOccurrence.prototype, 'readOwnerOrdinal');
    try {
      const transcript = fixture.transcript('cursor-wide');
      expect(eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)).toHaveLength(128);
      expect(nodeOrdinal).not.toHaveBeenCalled();
      expect(attributeOrdinal).not.toHaveBeenCalled();
    } finally {
      nodeOrdinal.mockRestore();
      attributeOrdinal.mockRestore();
    }
  }, 30_000);
});

class CursorRun {
  constructor(
    readonly fixture: CursorFixture,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly binding: TemplateCompilerSiteInvocationBinding,
  ) {}

  reads(): TemplateCompilerReadView {
    return new TemplateCompilerReadView(
      this.fixture.runtime.workspace.store,
      TemplateCompilerWorldAuthority.fixed(this.compilation.compilerWorld),
    );
  }

  transcript(): TemplateCompilerSiteCursorTranscript {
    const result = executeTemplateCompilerRootSiteCursor({
      binding: this.binding,
      compilerReads: this.reads(),
      preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(this.binding),
    });
    if (result.state !== TemplateCompilerSiteCursorResultState.Transcript || result.transcript == null) {
      throw new Error(`Expected cursor transcript: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    return result.transcript;
  }
}

class CursorFixture {
  private readonly runs = new Map<string, CursorRun>();

  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly browserRun: ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']>,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
  ) {}

  static async create(): Promise<CursorFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-site-cursor'),
      storeKey: 'contract:template-compiler-site-cursor',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-site-cursor-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Candidate-local browser cursor fixtures.',
    });
    return new CursorFixture(runtime, browserRun, app.emission.templates.frontDoor);
  }

  run(name: string): CursorRun {
    const existing = this.runs.get(name);
    if (existing != null) return existing;
    const compilation = [...this.frontDoor.appCompilations, ...this.frontDoor.authoringCompilations].find(
      (candidate) => candidate.definition.name === name,
    );
    if (compilation == null) throw new Error(`Expected cursor compilation '${name}'.`);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current cursor family '${name}'.`);
    const binding = this.bind(compilation, family, `cursor-browser:${name}`);
    const run = new CursorRun(this, compilation, binding);
    this.runs.set(name, run);
    return run;
  }

  transcript(name: string): TemplateCompilerSiteCursorTranscript {
    return this.run(name).transcript();
  }

  transcriptWithUnledgeredRewrite(name: string, attributeName: string): TemplateCompilerSiteCursorTranscript {
    const compilation = this.compilation(name);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current cursor family '${name}'.`);
    const binding = this.bind(
      compilation,
      family,
      `cursor-browser:${name}:unledgered`,
      (forest) => {
        const attribute = forest.readAttributes().find((candidate) => candidate.name === attributeName);
        if (attribute == null) throw new Error(`Expected live attribute '${attributeName}'.`);
        forest.rewriteAttributeValue(attribute, `${attribute.value}:unledgered`);
      },
    );
    return new CursorRun(this, compilation, binding).transcript();
  }

  dispose(): void {
    this.browserRun.abort();
    this.runtime.retireWorkspaceIncarnation();
  }

  private bind(
    compilation: TemplateResourceCompilationEmission,
    family: TemplateCompilationFamilyFrontDoorEmission,
    localKey: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null = null,
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
        throw new Error(`No-local cursor fixture '${compilation.definition.name}' requested a definition reservation.`);
      },
    });
    const closure = execution.closeInvocationBootstrap(hook, local);
    const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
    if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact) {
      throw new Error(`Expected GraphExact cursor precedent '${compilation.definition.name}'.`);
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
      throw new Error(`Expected exact cursor binding: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    return result.binding;
  }

  private compilation(name: string): TemplateResourceCompilationEmission {
    const compilation = [...this.frontDoor.appCompilations, ...this.frontDoor.authoringCompilations].find(
      (candidate) => candidate.definition.name === name,
    );
    if (compilation == null) throw new Error(`Expected cursor compilation '${name}'.`);
    return compilation;
  }

  private materializeBrowser(
    compilation: TemplateResourceCompilationEmission,
    localKey: string,
  ): BrowserEffectiveTemplateEmission {
    const markup = compilation.unit.templateSource.markup;
    if (markup == null || compilation.html.draft == null) {
      throw new Error(`Cursor compilation '${compilation.definition.name}' has no retained markup/draft.`);
    }
    const browser = parseBrowserTemplateFragmentDraft(markup);
    return new BrowserEffectiveTemplateMaterializer(this.browserRun).materialize({
      localKey,
      sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${localKey}`,
      templateSource: compilation.unit.templateSource,
      authoredHtml: compilation.html,
      browser,
      carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
    });
  }
}

function eventsOf<TEvent>(
  transcript: TemplateCompilerSiteCursorTranscript,
  Type: abstract new (...args: never[]) => TEvent,
): readonly TEvent[] {
  return transcript.events.filter((event): event is TemplateCompilerSiteCursorEvent & TEvent => event instanceof Type);
}

type TemplateCompilerSiteCursorEvent = TemplateCompilerSiteCursorTranscript['events'][number];

function phaseKinds(transcript: TemplateCompilerSiteCursorTranscript): readonly TemplateCompilerSiteCursorPhaseKind[] {
  return eventsOf(transcript, TemplateCompilerSiteCursorPhaseEvent).map((event) => event.phaseKind);
}

function elementTags(transcript: TemplateCompilerSiteCursorTranscript): readonly string[] {
  return eventsOf(transcript, TemplateCompilerSiteCursorElementEvent).map((event) => event.element.tagName);
}

function transcriptProjection(transcript: TemplateCompilerSiteCursorTranscript): unknown {
  return {
    frontier: transcript.frontier?.frontierKind ?? null,
    events: transcript.events.map((event) => ({
      kind: event.eventKind,
      phase: event instanceof TemplateCompilerSiteCursorPhaseEvent ? event.phaseKind : null,
      element: event instanceof TemplateCompilerSiteCursorElementEvent ? event.element.tagName : null,
      attribute: event instanceof TemplateCompilerSiteCursorAttributeEvent ? event.scalar.qualifiedName : null,
    })),
    spends: transcript.ledger.spends.map((spend) => [spend.disposition, spend.siteEventOrdinal]),
  };
}
