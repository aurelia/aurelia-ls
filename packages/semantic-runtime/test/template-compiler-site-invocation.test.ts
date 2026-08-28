import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { OpenSeam, OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import {
  BrowserEffectiveTemplateEmission,
  BrowserEffectiveTemplateMaterializer,
} from '../src/template/browser-effective-template-materializer.js';
import { BrowserTemplateCorrespondenceDraft } from '../src/template/browser-template-correspondence.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import { TemplateCompilerWorldEmission } from '../src/template/compiler-world-materializer.js';
import { LocalTemplateDefinitionMaterializer } from '../src/template/local-template-definition-materializer.js';
import {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  type TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';
import {
  TemplateCompilerInvocationBootstrapClosure,
  TemplateCompilerExecutionSession,
} from '../src/template/template-compiler-execution.js';
import {
  executeTemplateCompilerHookBootstrap,
  TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import {
  executeTemplateCompilerLocalExtraction,
} from '../src/template/template-compiler-local-extraction.js';
import { TemplateCompilerOccurrenceForest } from '../src/template/template-compiler-occurrence.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexResult,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingReasonKind,
  TemplateCompilerSiteInvocationBindingState,
  TemplateCompilerSiteInvocationIngressKind,
  TemplateCompilerSiteInvocationMembershipLane,
} from '../src/template/template-compiler-site-invocation.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler site invocation binding', () => {
  let fixture: RootInvocationFixture;

  beforeAll(async () => {
    fixture = await RootInvocationFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture.dispose();
  });

  test('binds one exact current no-local root invocation', () => {
    const result = fixture.bind();
    expect(result.state).toBe(TemplateCompilerSiteInvocationBindingState.Exact);
    expect(result.reasons).toEqual([]);
    const binding = result.binding;
    if (binding == null) throw new Error('Expected exact root invocation binding.');

    expect(binding.isModuleConstructed()).toBe(true);
    expect(binding.membershipLane).toBe(TemplateCompilerSiteInvocationMembershipLane.App);
    expect(binding.execution).toBe(fixture.execution);
    expect(binding.bootstrapClosure).toBe(fixture.closure);
    expect(binding.lane).toBe(fixture.lane);
    expect(binding.forest).toBe(fixture.forest);
    expect(binding.browserEmission).toBe(fixture.browserEmission);
    expect(binding.ingress.ingressKind).toBe(TemplateCompilerSiteInvocationIngressKind.RootBrowser);
    expect(binding.ingress.isModuleConstructed()).toBe(true);
    expect(binding.browserEmission.isModuleConstructed()).toBe(true);
    expect(binding.browserEmission.publication).toBe(fixture.browserRun);
    expect(binding.graphExact).toBe(fixture.graphExact);
    expect(binding.index).toBe(fixture.graphExact.index);
    expect(binding.compilation).toBe(fixture.compilation);
    expect(binding.definition).toBe(fixture.compilation.definition);
    expect(binding.unit).toBe(fixture.compilation.unit);
    expect(binding.source).toBe(fixture.compilation.unit.templateSource);
    expect(binding.compilerWorld).toBe(fixture.compilation.compilerWorld);
    expect(binding.currentFrontDoor).toBe(fixture.frontDoor);
    expect(binding.currentFamily).toBe(fixture.family);
  });

  test('rejects foreign family and front-door membership', () => {
    const foreignFamily = new TemplateCompilationFamilyFrontDoorEmission(
      fixture.family.ownerHandle,
      fixture.family.cohortKeys,
      [],
      [],
    );
    const familyResult = fixture.bind({ currentFamily: foreignFamily });
    expect(familyResult.state).toBe(TemplateCompilerSiteInvocationBindingState.Mismatch);
    expect(familyResult.reasons.map((reason) => reason.reasonKind)).toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.CurrentFrontDoorMembershipMismatch,
    );

    const foreignFrontDoor = new TemplateCompilationFrontDoorEmission(
      fixture.frontDoor.plan,
      [],
      fixture.frontDoor.profile,
    );
    const frontDoorResult = fixture.bind({ currentFrontDoor: foreignFrontDoor });
    expect(frontDoorResult.state).toBe(TemplateCompilerSiteInvocationBindingState.Mismatch);
    expect(frontDoorResult.reasons.map((reason) => reason.reasonKind)).toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.CurrentFrontDoorMembershipMismatch,
    );
  });

  test('rejects a foreign browser tree even when source content is the same', () => {
    const foreignBrowser = fixture.materializeBrowser('foreign-browser');
    const result = fixture.bind({ browserEmission: foreignBrowser });
    expect(result.state).toBe(TemplateCompilerSiteInvocationBindingState.Mismatch);
    expect(result.reasons.map((reason) => reason.reasonKind)).toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.BrowserTreeMismatch,
    );

    const correspondence = fixture.browserEmission.correspondence;
    const wrongRevision = new BrowserTemplateCorrespondenceDraft(
      correspondence.occurrenceIdentityKey,
      correspondence.templateIdentity,
      `${correspondence.sourceRevision}:stale`,
      correspondence.correspondenceKey,
      correspondence.markupDigest,
      correspondence.nodeDerivations,
      correspondence.attributeDerivations,
      correspondence.impliedNodes,
      correspondence.reconstructionCohorts,
      correspondence.movedNodes,
      correspondence.droppedAuthoredNodes,
      correspondence.droppedAuthoredAttributes,
      correspondence.unresolvedPartitions,
      correspondence.compilerCarrier,
      correspondence.factoryDiscards,
    );
    const wrongRevisionBrowser = fixture.browserEmission.withCorrespondence(wrongRevision);
    const revisionResult = fixture.bind({ browserEmission: wrongRevisionBrowser });
    expect(revisionResult.reasons.map((reason) => reason.reasonKind)).toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.BrowserSourceMismatch,
    );
    expect(revisionResult.reasons.map((reason) => reason.reasonKind)).not.toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.BrowserTreeMismatch,
    );
  });

  test('retains browser correspondence frontiers for the later cursor', () => {
    const seam = new OpenSeam(
      fixture.browserRun.handles.openSeam('browser-frontier'),
      KernelVocabulary.Template.OpenStructureCorrespondence.key,
      'Synthetic correspondence frontier retained after invocation binding.',
      null,
      null,
      [OpenSeamReasonKind.TemplateStructureCorrespondenceOpen],
    );
    const browser = fixture.browserEmission.withOpenSeams([seam]);
    const result = fixture.bind({ browserEmission: browser });
    expect(result.state).toBe(TemplateCompilerSiteInvocationBindingState.Exact);
    expect(result.binding?.browserEmission.openSeams).toEqual([seam]);
  });

  test('rejects a foreign closure and compiler-world object', () => {
    const world = fixture.compilation.compilerWorld;
    const foreignWorld = new TemplateCompilerWorldEmission(
      world.container,
      world.world,
      world.resourceScope,
      world.templateCompiler,
      world.compilerHooks,
      world.cssClassMapping,
      world.resourceResolver,
      world.expressionParser,
      world.attributeMapper,
      world.rendering,
      world.attributeParser,
      world.attributeParserMachine,
      world.bindingCommandResolver,
      world.attributePatterns,
      world.bindingCommands,
      world.runtimeRenderers,
      world.callableBindings,
      world.issues,
      world.syntaxResources,
      world.records,
    );
    const foreignHook = new TemplateCompilerHookBootstrapResult(
      fixture.lane,
      TemplateCompilerHookBootstrapState.Exact,
      fixture.closure.hookBootstrap.operations,
      null,
      null,
      foreignWorld,
    );
    const foreignClosure = new TemplateCompilerInvocationBootstrapClosure(
      {},
      fixture.lane,
      foreignHook,
      fixture.closure.localExtraction,
      fixture.closure.forestMutationRevision,
      fixture.closure.laneOperationCount,
      [],
    );
    const result = fixture.bind({ bootstrapClosure: foreignClosure });
    expect(result.state).toBe(TemplateCompilerSiteInvocationBindingState.Mismatch);
    expect(result.reasons.map((reason) => reason.reasonKind)).toEqual(expect.arrayContaining([
      TemplateCompilerSiteInvocationBindingReasonKind.ExecutionClosureMismatch,
      TemplateCompilerSiteInvocationBindingReasonKind.CompilerWorldMismatch,
    ]));

    const corruptHook = new TemplateCompilerHookBootstrapResult(
      fixture.lane,
      TemplateCompilerHookBootstrapState.Open,
      fixture.closure.hookBootstrap.operations,
      0,
      'corrupt exact-bootstrap receipt',
      fixture.compilation.compilerWorld,
    );
    const corruptClosure = new TemplateCompilerInvocationBootstrapClosure(
      {},
      fixture.lane,
      corruptHook,
      fixture.closure.localExtraction,
      fixture.closure.forestMutationRevision,
      fixture.closure.laneOperationCount,
      [],
    );
    const corruptResult = fixture.bind({ bootstrapClosure: corruptClosure });
    expect(corruptResult.reasons.map((reason) => reason.reasonKind)).toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.BootstrapMismatch,
    );
    expect(corruptResult.reasons.map((reason) => reason.reasonKind)).not.toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.LocalTemplatesUnsupported,
    );
  });

  test('rejects a carried-equivalent compilation absent by object identity from the current family', () => {
    const carried = fixture.compilation.forGeneration(
      fixture.compilation.parentCompilerWorld,
      fixture.compilation.compilerWorld,
      fixture.compilation.definition,
      fixture.compilation.registeredReads,
    );
    const graphExact = buildTemplateCompilerNormalizedSiteIndex(carried);
    expect(graphExact.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const result = fixture.bind({ graphExact });
    expect(result.state).toBe(TemplateCompilerSiteInvocationBindingState.Mismatch);
    expect(result.reasons.map((reason) => reason.reasonKind)).toContain(
      TemplateCompilerSiteInvocationBindingReasonKind.CurrentFrontDoorMembershipMismatch,
    );
  });

  test('rejects an absent GraphExact precedent without constructing a partial binding', () => {
    const result = fixture.bind({ graphExact: new TemplateCompilerNormalizedSiteIndexResult(null, []) });
    expect(result.state).toBe(TemplateCompilerSiteInvocationBindingState.Mismatch);
    expect(result.binding).toBeNull();
    expect(result.reasons.map((reason) => reason.reasonKind)).toEqual([
      TemplateCompilerSiteInvocationBindingReasonKind.GraphPrecedentMismatch,
    ]);
  });

  test('rejects a real local-bearing root at the occurrence-ingress frontier', () => {
    const local = new BrowserEffectiveTemplateFixture('site-invocation-local-frontier');
    try {
      const browser = local.materialize(
        'site-invocation-local-frontier',
        '<template as-custom-element="local-card"><span></span></template><div></div>',
      ).emission;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browser);
      const execution = TemplateCompilerExecutionSession.createForForest('site-invocation-local-frontier', forest);
      const lane = execution.admitRootInvocation('site-invocation-local-frontier');
      const hook = executeTemplateCompilerHookBootstrap({
        execution,
        lane,
        compilerWorld: fixture.compilation.compilerWorld,
        executionOpenSeamHandle: local.run.handles.openSeam('hook-open'),
      });
      const definitions = new LocalTemplateDefinitionMaterializer(local.run);
      const extraction = executeTemplateCompilerLocalExtraction({
        execution,
        lane,
        hookBootstrap: hook,
        ownerName: fixture.compilation.definition.name,
        ownerCauseHandles: [fixture.compilation.definition.productHandle!],
        reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
      });
      const closure = execution.closeInvocationBootstrap(hook, extraction);
      const result = fixture.bind({ execution, bootstrapClosure: closure, browserEmission: browser });
      expect(result.state).toBe(TemplateCompilerSiteInvocationBindingState.Mismatch);
      expect(result.reasons.map((reason) => reason.reasonKind)).toContain(
        TemplateCompilerSiteInvocationBindingReasonKind.LocalTemplatesUnsupported,
      );
      expect(result.reasons.map((reason) => reason.reasonKind)).not.toContain(
        TemplateCompilerSiteInvocationBindingReasonKind.BootstrapMismatch,
      );

      const childLane = closure.childLaneTransfers[0]?.childLane;
      if (childLane == null) throw new Error('Expected one extracted child invocation lane.');
      const childHook = executeTemplateCompilerHookBootstrap({
        execution,
        lane: childLane,
        compilerWorld: fixture.compilation.compilerWorld,
        executionOpenSeamHandle: local.run.handles.openSeam('child-hook-open'),
      });
      const childLocal = executeTemplateCompilerLocalExtraction({
        execution,
        lane: childLane,
        hookBootstrap: childHook,
        ownerName: 'local-card',
        ownerCauseHandles: [closure.childLaneTransfers[0]!.extraction.definitionReservation.productHandle],
        reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
      });
      const childClosure = execution.closeInvocationBootstrap(childHook, childLocal);
      const childResult = fixture.bind({ execution, bootstrapClosure: childClosure, browserEmission: browser });
      expect(childResult.reasons.map((reason) => reason.reasonKind)).toContain(
        TemplateCompilerSiteInvocationBindingReasonKind.RootLaneMismatch,
      );
      expect(childResult.reasons.map((reason) => reason.reasonKind)).not.toContain(
        TemplateCompilerSiteInvocationBindingReasonKind.ExecutionClosureMismatch,
      );
    } finally {
      local.dispose();
    }
  });

});

interface RootInvocationBindingOverrides {
  readonly execution?: TemplateCompilerExecutionSession;
  readonly bootstrapClosure?: TemplateCompilerInvocationBootstrapClosure;
  readonly browserEmission?: BrowserEffectiveTemplateEmission;
  readonly graphExact?: ReturnType<typeof buildTemplateCompilerNormalizedSiteIndex>;
  readonly currentFrontDoor?: TemplateCompilationFrontDoorEmission;
  readonly currentFamily?: TemplateCompilationFamilyFrontDoorEmission;
}

class RootInvocationFixture {
  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly app: Awaited<ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['openApp']>>,
    readonly browserRun: ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']>,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
    readonly family: TemplateCompilationFamilyFrontDoorEmission,
    readonly browserEmission: BrowserEffectiveTemplateEmission,
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly execution: TemplateCompilerExecutionSession,
    readonly lane: ReturnType<TemplateCompilerExecutionSession['admitRootInvocation']>,
    readonly closure: TemplateCompilerInvocationBootstrapClosure,
    readonly graphExact: ReturnType<typeof buildTemplateCompilerNormalizedSiteIndex>,
  ) {}

  static async create(): Promise<RootInvocationFixture> {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-minimal-app');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-site-invocation',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const compilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'app-root'
    )?.compilation ?? null;
    if (compilation == null || compilation.html.draft == null) {
      throw new Error('Expected AOT-profile app-root compilation with retained authored draft.');
    }
    const frontDoor = app.emission.templates.frontDoor;
    const family = frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error('Expected current app-root template family.');
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-site-invocation-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Candidate-local browser and invocation binding fixture.',
    });
    const browserEmission = materializeBrowser(browserRun, compilation, 'root-browser');
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
    const execution = TemplateCompilerExecutionSession.createForForest('root-site-invocation', forest);
    const lane = execution.admitRootInvocation(compilation.localKey);
    const hook = executeTemplateCompilerHookBootstrap({
      execution,
      lane,
      compilerWorld: compilation.compilerWorld,
      executionOpenSeamHandle: browserRun.handles.openSeam('hook-open'),
    });
    const local = executeTemplateCompilerLocalExtraction({
      execution,
      lane,
      hookBootstrap: hook,
      ownerName: compilation.definition.name,
      ownerCauseHandles: [compilation.definition.productHandle!],
      reserveDefinition: () => {
        throw new Error('No-local fixture unexpectedly requested a definition reservation.');
      },
    });
    const closure = execution.closeInvocationBootstrap(hook, local);
    const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
    return new RootInvocationFixture(
      runtime,
      app,
      browserRun,
      compilation,
      frontDoor,
      family,
      browserEmission,
      forest,
      execution,
      lane,
      closure,
      graphExact,
    );
  }

  bind(overrides: RootInvocationBindingOverrides = {}) {
    return bindTemplateCompilerRootSiteInvocation({
      execution: overrides.execution ?? this.execution,
      bootstrapClosure: overrides.bootstrapClosure ?? this.closure,
      browserEmission: overrides.browserEmission ?? this.browserEmission,
      graphExact: overrides.graphExact ?? this.graphExact,
      currentFrontDoor: overrides.currentFrontDoor ?? this.frontDoor,
      currentFamily: overrides.currentFamily ?? this.family,
    });
  }

  materializeBrowser(localKey: string): BrowserEffectiveTemplateEmission {
    return materializeBrowser(this.browserRun, this.compilation, localKey);
  }

  dispose(): void {
    this.browserRun.abort();
  }
}

function materializeBrowser(
  run: RootInvocationFixture['browserRun'],
  compilation: TemplateResourceCompilationEmission,
  localKey: string,
): BrowserEffectiveTemplateEmission {
  const markup = compilation.unit.templateSource.markup;
  if (markup == null || compilation.html.draft == null) {
    throw new Error('Browser materialization requires exact retained compilation markup/draft.');
  }
  const browser = parseBrowserTemplateFragmentDraft(markup);
  return new BrowserEffectiveTemplateMaterializer(run).materialize({
    localKey,
    sourceRevision: compilation.definition.template?.authoredSourceRevision ?? 'test:site-invocation',
    templateSource: compilation.unit.templateSource,
    authoredHtml: compilation.html,
    browser,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
  });
}
