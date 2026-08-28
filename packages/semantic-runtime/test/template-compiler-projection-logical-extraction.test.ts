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
  TemplateCompilerExecutionSession,
} from '../src/template/template-compiler-execution.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import type { TemplateCompilerHydrateElementEnvelopeDraft } from '../src/template/template-compiler-hydrate-element-staging.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  type TemplateCompilerNodeOccurrence,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkBrowserOriginState,
  TemplateCompilerPreWalkRemainderAuthority,
} from '../src/template/template-compiler-prewalk-remainder.js';
import {
  prepareTemplateCompilerProjectionLogicalExtraction,
  realizeTemplateCompilerProjectionLogicalExtraction,
  type TemplateCompilerProjectionLogicalExtractionPreparation,
} from '../src/template/template-compiler-projection-logical-extraction.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingState,
  type TemplateCompilerSiteInvocationBinding,
} from '../src/template/template-compiler-site-invocation.js';
import {
  executeTemplateCompilerRootSiteCursor,
  TemplateCompilerSiteCursorContextKind,
  TemplateCompilerSiteCursorResultState,
  TemplateCompilerSiteCursorTaskSession,
  type TemplateCompilerSiteCursorTaskSelection,
  type TemplateCompilerSiteCursorTranscript,
} from '../src/template/template-compiler-site-cursor.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
type CandidateRun = ReturnType<
  Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']
>;

describe('template compiler projection logical extraction', () => {
  let fixture: ProjectionLogicalExtractionFixture;

  beforeAll(async () => {
    fixture = await ProjectionLogicalExtractionFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture?.dispose();
  });

  test('prepares mixed-parent, empty, discarded, and slot-consumption plans from the attested transcript', () => {
    const run = fixture.run('projection-logical-host');
    const startRevision = run.binding.forest.mutationRevision;
    const startOperationCount = run.binding.execution.sequence.readOperations().length;
    const schedulerCapture = vi.spyOn(
      TemplateCompilerSiteCursorTaskSession.prototype,
      'capturePhysicalChildren',
    );
    let preparation: TemplateCompilerProjectionLogicalExtractionPreparation;
    try {
      preparation = run.prepare();
    } finally {
      expect(schedulerCapture).not.toHaveBeenCalled();
      schedulerCapture.mockRestore();
    }

    expect(preparation.isModuleConstructed()).toBe(true);
    expect(preparation.isCurrent()).toBe(true);
    expect(preparation.reachedElement).toBe(run.envelope.reachedElement);
    expect(preparation.reachedSelectionEvent).toBe(run.envelope.reachedElement.reachedSelectionEvent);
    expect(preparation.taskSession).toBe(run.envelope.reachedElement.reachedSelectionEvent.session);
    expect(preparation.sourceSelection).toBe(run.envelope.reachedElement.reachedSelectionEvent.selection);
    expect(preparation.elementEvent).toBe(run.envelope.reachedElement.elementEvent);
    expect(preparation.plannedEntrantBands.map((band) => [
      band.group.slotName,
      band.entrants.map((entrant) => occurrenceLabel(entrant.node)),
    ])).toEqual([
      ['default', ['span']],
      ['named', ['b', 'i']],
      ['empty', []],
    ]);

    const named = preparation.plannedEntrantBands[1]!;
    expect(named.entrants.map((entrant) => [
      occurrenceLabel(entrant.source.parent),
      entrant.source.sourceOrdinal,
      entrant.source.capturedSuccessor == null ? null : occurrenceLabel(entrant.source.capturedSuccessor),
      entrant.logicalOrdinal,
      entrant.logicalSuccessor == null ? null : occurrenceLabel(entrant.logicalSuccessor),
    ])).toEqual([
      ['projection-logical-leaf', 2, 'template', 0, 'i'],
      ['#fragment', 0, null, 1, null],
    ]);
    expect(preparation.discardedWhitespace.map((receipt) => [
      occurrenceLabel(receipt.source.parent),
      receipt.source.sourceOrdinal,
      occurrenceLabel(receipt.source.capturedSuccessor!),
      receipt.source.origin.browserOriginState,
    ])).toEqual([[
      'projection-logical-leaf',
      1,
      'b',
      TemplateCompilerPreWalkBrowserOriginState.Singular,
    ]]);
    expect(preparation.unwrappedWrappers.map((receipt) => [
      receipt.contributor.slotName,
      receipt.contentSource.children.map(occurrenceLabel),
      receipt.wrapperSource.sourceOrdinal,
      receipt.wrapperSource.capturedSuccessor == null
        ? null
        : occurrenceLabel(receipt.wrapperSource.capturedSuccessor),
    ])).toEqual([
      ['named', ['i'], 3, 'template'],
      ['empty', [], 4, null],
    ]);
    expect(preparation.slotConsumptions.map((receipt) => [
      receipt.element.tagName,
      receipt.attribute.value,
      receipt.physicalOrdinal,
      receipt.origin.browserOriginState,
    ])).toEqual([
      ['b', 'named', 0, TemplateCompilerPreWalkBrowserOriginState.Singular],
      ['template', 'named', 0, TemplateCompilerPreWalkBrowserOriginState.Singular],
      ['template', 'empty', 0, TemplateCompilerPreWalkBrowserOriginState.Singular],
    ]);
    expect(preparation.residuals).toEqual([]);
    expect(run.binding.forest.mutationRevision).toBe(startRevision);
    expect(run.binding.execution.sequence.readOperations()).toHaveLength(startOperationCount);
  });

  test('retains explicit-shadow residual order without turning residuals into entrants', () => {
    const preparation = fixture.run('projection-logical-shadow-host').prepare();

    expect(preparation.plannedEntrantBands.map((band) => [
      band.group.slotName,
      band.entrants.map((entrant) => occurrenceLabel(entrant.node)),
    ])).toEqual([['named', ['b']]]);
    expect(preparation.residuals.map((receipt) => [
      occurrenceLabel(receipt.source.node),
      occurrenceLabel(receipt.source.parent),
      receipt.source.sourceOrdinal,
      occurrenceLabel(receipt.source.capturedSuccessor!),
    ])).toEqual([['span', 'projection-logical-shadow-leaf', 0, 'b']]);
    expect(preparation.discardedWhitespace).toEqual([]);
  });

  test('rejects realization replay through a fresh task session', () => {
    const run = fixture.run('projection-logical-host');
    const preparation = run.prepare();
    const session = TemplateCompilerSiteCursorTaskSession.createRoot(run.binding.lane.localKey);
    const forest = run.binding.forest;
    session.startRoot(forest.compilerContent, forest.compilerContent.readChildren());
    const selection = requireHostSelection(session, run.envelope.element);
    const continuation = session.pushStagedElementContinuation(
      session.rootContext,
      selection.visit,
      preparation,
    );
    const contexts = preparation.plannedEntrantBands.map((band, ordinal) => ({
      group: band.group,
      context: session.createChildContext(
        session.rootContext,
        `fresh-replay:projection:${ordinal}`,
        TemplateCompilerSiteCursorContextKind.Projection,
      ),
    }));

    expect(() => realizeTemplateCompilerProjectionLogicalExtraction({
      preparation,
      continuation,
      contexts,
    })).toThrow(/attested continuation/u);
  });

});

class ProjectionFixtureRun {
  constructor(
    readonly fixture: ProjectionLogicalExtractionFixture,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly binding: TemplateCompilerSiteInvocationBinding,
    readonly preWalk: TemplateCompilerPreWalkRemainderAuthority,
    readonly transcript: TemplateCompilerSiteCursorTranscript,
  ) {}

  get envelope(): TemplateCompilerHydrateElementEnvelopeDraft {
    const envelope = this.transcript.hydrateElementEnvelopes[0]?.draft ?? null;
    if (envelope == null) throw new Error(`Expected projection envelope for '${this.compilation.definition.name}'.`);
    return envelope;
  }

  prepare(): TemplateCompilerProjectionLogicalExtractionPreparation {
    return prepareTemplateCompilerProjectionLogicalExtraction({
      forest: this.binding.forest,
      preWalk: this.preWalk,
      envelope: this.envelope,
    });
  }
}

class ProjectionLogicalExtractionFixture {
  private readonly runs = new Map<string, ProjectionFixtureRun>();

  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly candidate: CandidateRun,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
  ) {}

  static async create(): Promise<ProjectionLogicalExtractionFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-projection-logical-extraction'),
      storeKey: 'contract:template-compiler-projection-logical-extraction',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const candidate = runtime.computationLifecycle.begin({
      kind: 'template-compiler-projection-logical-extraction-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Minimal live projection extraction fixture.',
    });
    return new ProjectionLogicalExtractionFixture(runtime, candidate, app.emission.templates.frontDoor);
  }

  run(name: string): ProjectionFixtureRun {
    const existing = this.runs.get(name);
    if (existing != null) return existing;
    const compilation = compilationFor(this.frontDoor, name);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current projection family '${name}'.`);
    const binding = bindProjectionFixture(
      compilation,
      family,
      this.frontDoor,
      this.candidate,
      `projection-logical-extraction:${name}`,
    );
    const preWalk = TemplateCompilerPreWalkRemainderAuthority.capture(binding);
    const result = executeTemplateCompilerRootSiteCursor({
      binding,
      compilerReads: new TemplateCompilerReadView(
        this.runtime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(compilation.compilerWorld),
      ),
      preWalkAuthority: preWalk,
    });
    if (result.state !== TemplateCompilerSiteCursorResultState.Transcript || result.transcript == null) {
      throw new Error(`Expected projection transcript: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    const run = new ProjectionFixtureRun(this, compilation, binding, preWalk, result.transcript);
    this.runs.set(name, run);
    return run;
  }

  dispose(): void {
    this.candidate.abort();
    this.runtime.retireWorkspaceIncarnation();
  }
}

function requireHostSelection(
  session: TemplateCompilerSiteCursorTaskSession,
  host: TemplateCompilerElementOccurrence,
): TemplateCompilerSiteCursorTaskSelection {
  const selection = session.next();
  if (selection == null || selection.visit.node !== host) throw new Error('Expected projection host selection.');
  return selection;
}

function bindProjectionFixture(
  compilation: TemplateResourceCompilationEmission,
  family: TemplateCompilationFamilyFrontDoorEmission,
  frontDoor: TemplateCompilationFrontDoorEmission,
  candidate: CandidateRun,
  localKey: string,
): TemplateCompilerSiteInvocationBinding {
  const browserEmission = materializeBrowserFixture(compilation, localKey, candidate);
  const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
  const execution = TemplateCompilerExecutionSession.createForForest(localKey, forest);
  const lane = execution.admitRootInvocation(compilation.localKey);
  const hook = executeTemplateCompilerHookBootstrap({
    execution,
    lane,
    compilerWorld: compilation.compilerWorld,
    executionOpenSeamHandle: candidate.handles.openSeam(`${localKey}:hook-open`),
  });
  const local = executeTemplateCompilerLocalExtraction({
    execution,
    lane,
    hookBootstrap: hook,
    ownerName: compilation.definition.name,
    ownerCauseHandles: [compilation.definition.productHandle!],
    reserveDefinition: () => {
      throw new Error('No-local projection extraction fixture requested a definition reservation.');
    },
  });
  const closure = execution.closeInvocationBootstrap(hook, local);
  const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
  if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact) {
    throw new Error('Expected GraphExact projection extraction precedent.');
  }
  const result = bindTemplateCompilerRootSiteInvocation({
    execution,
    bootstrapClosure: closure,
    browserEmission,
    graphExact,
    currentFrontDoor: frontDoor,
    currentFamily: family,
  });
  if (result.state !== TemplateCompilerSiteInvocationBindingState.Exact || result.binding == null) {
    throw new Error(`Expected exact projection binding: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
  }
  return result.binding;
}

function materializeBrowserFixture(
  compilation: TemplateResourceCompilationEmission,
  localKey: string,
  candidate: CandidateRun,
): BrowserEffectiveTemplateEmission {
  const markup = compilation.unit.templateSource.markup;
  if (markup == null || compilation.html.draft == null) {
    throw new Error('Projection extraction fixture has no retained markup/draft.');
  }
  const browser = parseBrowserTemplateFragmentDraft(markup);
  return new BrowserEffectiveTemplateMaterializer(candidate).materialize({
    localKey,
    sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${localKey}`,
    templateSource: compilation.unit.templateSource,
    authoredHtml: compilation.html,
    browser,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
  });
}

function compilationFor(
  frontDoor: TemplateCompilationFrontDoorEmission,
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = [...frontDoor.appCompilations, ...frontDoor.authoringCompilations].find(
    (candidate) => candidate.definition.name === name,
  );
  if (compilation == null) throw new Error(`Expected projection fixture compilation '${name}'.`);
  return compilation;
}

function occurrenceLabel(occurrence: TemplateCompilerNodeOccurrence): string {
  if (occurrence instanceof TemplateCompilerElementOccurrence) return occurrence.tagName;
  if (occurrence instanceof TemplateCompilerFragmentOccurrence) return '#fragment';
  if (occurrence instanceof TemplateCompilerTextOccurrence) return '#text';
  return occurrence.nodeKind;
}
