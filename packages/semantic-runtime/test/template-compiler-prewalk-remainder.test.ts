import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import type { ProductHandle } from '../src/kernel/handles.js';
import { MaterializedProduct } from '../src/kernel/materialization.js';
import { bindProductDetailEnvelope } from '../src/kernel/product-details.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import { BrowserEffectiveTemplateMaterializer } from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilerAuthoredOriginIndex,
  TemplateCompilerAuthoredOriginRouteKind,
  TemplateCompilerBrowserOriginRouteKind,
} from '../src/template/template-compiler-authored-origin-index.js';
import {
  executeTemplateCompilerHookBootstrap,
} from '../src/template/template-compiler-hook-bootstrap.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';
import { TemplateCompilerOccurrenceForest } from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkBrowserOriginState,
  TemplateCompilerPreWalkRemainderAuthority,
  TemplateCompilerPreWalkRemainderKind,
} from '../src/template/template-compiler-prewalk-remainder.js';
import {
  TemplateCompilerSiteSpendCompletion,
  TemplateCompilerSiteSpendConflict,
  TemplateCompilerSiteSpendConflictKind,
  TemplateCompilerSiteSpendLedger,
  TemplateCompilerSiteSpendLedgerState,
} from '../src/template/template-compiler-site-spend-ledger.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingState,
  type TemplateCompilerSiteInvocationBinding,
} from '../src/template/template-compiler-site-invocation.js';
import { TemplateCompilerExecutionSession } from '../src/template/template-compiler-execution.js';
import {
  TemplateStructureDerivation,
  TemplateStructureDerivationAuthority,
  TemplateStructureDerivationTerm,
  TemplateStructureReference,
} from '../src/template/template-structure-derivation.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler pre-walk remainder authority', () => {
  let fixture: PreWalkFixture;
  let authority: TemplateCompilerPreWalkRemainderAuthority;

  beforeAll(async () => {
    fixture = await PreWalkFixture.create();
    authority = TemplateCompilerPreWalkRemainderAuthority.capture(fixture.binding);
  }, 30_000);

  afterAll(() => fixture.dispose());

  test('composes comment-shield factory discards without inventing occurrences', () => {
    const textSites = fixture.binding.index.textSites;
    const before = textSites.find((site) => site.text.text.includes('${before}')) ?? null;
    const inside = textSites.find((site) => site.text.text.includes('${inside}')) ?? null;
    const after = textSites.find((site) => site.text.text.includes('${after}')) ?? null;
    expect(before).not.toBeNull();
    expect(inside).not.toBeNull();
    expect(after).not.toBeNull();
    if (before == null || inside == null || after == null) throw new Error('Expected three interpolation sites.');

    const beforeReceipt = authority.receiptFor(before);
    const afterReceipt = authority.receiptFor(after);
    expect([beforeReceipt?.remainderKind, afterReceipt?.remainderKind]).toEqual([
      TemplateCompilerPreWalkRemainderKind.TemplateElementFactoryDiscarded,
      TemplateCompilerPreWalkRemainderKind.TemplateElementFactoryDiscarded,
    ]);
    expect(beforeReceipt?.factoryDiscards).toHaveLength(1);
    expect(afterReceipt?.factoryDiscards).toHaveLength(1);
    expect(beforeReceipt?.factoryDiscards[0]?.draft.reason).toBe('carrier-selection-discard');
    expect(authority.receiptFor(inside)).toBeNull();

    const origins = new TemplateCompilerAuthoredOriginIndex(fixture.binding.browserEmission.derivations);
    const beforeRoute = origins.routeForAuthoredProduct(before.textProductHandle);
    const insideRoute = origins.routeForAuthoredProduct(inside.textProductHandle);
    expect(beforeRoute?.routeKind).toBe(TemplateCompilerAuthoredOriginRouteKind.Singular);
    expect(insideRoute?.routeKind).toBe(TemplateCompilerAuthoredOriginRouteKind.Singular);
    expect(fixture.binding.forest.nodesForInputProduct(
      beforeRoute!.exactOrigin!.browserOutput.productHandle,
    )).toEqual([]);
    expect(fixture.binding.forest.nodesForInputProduct(
      insideRoute!.exactOrigin!.browserOutput.productHandle,
    )).toHaveLength(1);
    expect(authority.originStateForBrowserProduct(insideRoute!.exactOrigin!.browserOutput.productHandle))
      .toBe(TemplateCompilerPreWalkBrowserOriginState.Singular);

    expect(fixture.compilation.html.nodes.some((node) => node.nodeKind === 'comment')).toBe(true);
    expect(fixture.compilation.html.nodes.some((node) => node.nodeKind === 'doctype')).toBe(true);
    expect(authority.readAll()).toHaveLength(4);
  });

  test('retains duplicate drops and non-singular reconstruction as distinct remainder causes', () => {
    const duplicate = fixture.binding.index.attributeSites.find((site) =>
      site.attribute.rawName === 'TITLE.BIND'
    ) ?? null;
    const cloned = fixture.binding.index.attributeSites.find((site) =>
      site.attribute.rawName === 'title.bind' && site.attribute.rawValue === 'title'
    ) ?? null;
    expect(duplicate).not.toBeNull();
    expect(cloned).not.toBeNull();
    if (duplicate == null || cloned == null) throw new Error('Expected duplicate and cloned attribute sites.');

    const duplicateReceipt = authority.receiptFor(duplicate);
    const clonedReceipt = authority.receiptFor(cloned);
    expect(duplicateReceipt).toMatchObject({
      remainderKind: TemplateCompilerPreWalkRemainderKind.HtmlTreeBuilderDropped,
      retainedPredecessorProductHandle: expect.any(String),
    });
    expect(duplicateReceipt?.typedDrop).toMatchObject({ reason: 'duplicate-attribute' });
    expect(clonedReceipt?.remainderKind).toBe(
      TemplateCompilerPreWalkRemainderKind.NonSingularBrowserOrigin,
    );
    expect(clonedReceipt?.authoredRoute?.routeKind).toBe(
      TemplateCompilerAuthoredOriginRouteKind.NonSingular,
    );
    expect(clonedReceipt?.authoredRoute?.browserOutputs).toHaveLength(2);
    for (const output of clonedReceipt?.authoredRoute?.browserOutputs ?? []) {
      expect(authority.originStateForBrowserProduct(output.productHandle)).toBe(
        TemplateCompilerPreWalkBrowserOriginState.NonSingular,
      );
      expect(authority.originRouteForBrowserProduct(output.productHandle)).toMatchObject({
        routeKind: TemplateCompilerBrowserOriginRouteKind.NonSingular,
        authoredInputs: [expect.objectContaining({ productHandle: cloned.attributeProductHandle })],
      });
    }
  });

  test('keeps normalized values on the singular origin lane', () => {
    const normalized = fixture.binding.index.attributeSites.find((site) =>
      site.attribute.rawName === 'data-normalized'
    ) ?? null;
    expect(normalized).not.toBeNull();
    if (normalized == null) throw new Error('Expected the normalized static attribute site.');
    expect(fixture.binding.browserEmission.correspondence.unresolvedPartitions).toContainEqual(
      expect.objectContaining({
        kind: 'normalized-attribute-value',
        authoredAttributes: [expect.objectContaining({ rawName: 'data-normalized' })],
      }),
    );
    expect(authority.receiptFor(normalized)).toBeNull();

    const origins = new TemplateCompilerAuthoredOriginIndex(fixture.binding.browserEmission.derivations);
    const route = origins.routeForAuthoredProduct(normalized.attributeProductHandle);
    expect(route?.routeKind).toBe(TemplateCompilerAuthoredOriginRouteKind.Singular);
    expect(authority.originStateForBrowserProduct(route!.exactOrigin!.browserOutput.productHandle)).toBe(
      TemplateCompilerPreWalkBrowserOriginState.Singular,
    );
  });

  test('records only authority-owned no-occurrence evidence in the exact ledger', () => {
    const ledger = new TemplateCompilerSiteSpendLedger(fixture.binding.index);
    const evidence = authority.readAll().map((receipt) =>
      ledger.recordAuthorizedAuthoredRemainder(authority, receipt)
    );
    expect(evidence.every((row) => !(row instanceof TemplateCompilerSiteSpendConflict))).toBe(true);
    expect(evidence.every((row) =>
      !(row instanceof TemplateCompilerSiteSpendConflict) && row.preWalkReceipt != null
    )).toBe(true);

    const result = ledger.finish(TemplateCompilerSiteSpendCompletion.complete(0));
    expect(result.state).toBe(TemplateCompilerSiteSpendLedgerState.Open);
    expect(result.authoredRemainderEvidence).toHaveLength(authority.readAll().length);
    expect(result.blockedByFrontier).toEqual([]);
    expect(result.rawUnspent).toEqual(expect.arrayContaining(authority.readAll().map((receipt) => receipt.bundle)));
  });

  test('rejects foreign bindings, authorities, receipts, and indexes', () => {
    expect(() => TemplateCompilerPreWalkRemainderAuthority.capture({
      isModuleConstructed: () => false,
    } as unknown as TemplateCompilerSiteInvocationBinding)).toThrow(/module-constructed/);

    const secondAuthority = TemplateCompilerPreWalkRemainderAuthority.capture(fixture.binding);
    const receipt = authority.readAll()[0]!;
    const ledger = new TemplateCompilerSiteSpendLedger(fixture.binding.index);
    expect(ledger.recordAuthorizedAuthoredRemainder(secondAuthority, receipt)).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidPreWalkRemainderAuthority,
    });
    const forged = ledger.recordAuthorizedAuthoredRemainder(
      authority,
      {} as Parameters<TemplateCompilerSiteSpendLedger['recordAuthorizedAuthoredRemainder']>[1],
    );
    expect(forged).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidPreWalkRemainderAuthority,
    });

    const carried = fixture.compilation.forGeneration(
      fixture.compilation.parentCompilerWorld,
      fixture.compilation.compilerWorld,
      fixture.compilation.definition,
      fixture.compilation.registeredReads,
    );
    const foreign = buildTemplateCompilerNormalizedSiteIndex(carried);
    expect(foreign.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
    const foreignLedger = new TemplateCompilerSiteSpendLedger(foreign.index!);
    expect(foreignLedger.recordAuthorizedAuthoredRemainder(authority, receipt)).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidPreWalkRemainderAuthority,
    });
  });

  test('preindexes 512 attribute and 512 text origin routes for constant-time access', () => {
    const reads = { count: 0 };
    const derivations = [
      ...Array.from({ length: 512 }, (_, index) => exactDerivation('attribute', index)),
      ...Array.from({ length: 512 }, (_, index) => exactDerivation('text', index)),
    ];
    const origins = new TemplateCompilerAuthoredOriginIndex(tracked(derivations, reads));
    expect(reads.count).toBe(derivations.length);
    reads.count = 0;
    for (let index = 0; index < 512; index++) {
      expect(origins.routeForAuthoredProduct(`product:attribute:authored:${index}` as ProductHandle)?.routeKind)
        .toBe(TemplateCompilerAuthoredOriginRouteKind.Singular);
      expect(origins.routeForAuthoredProduct(`product:text:authored:${index}` as ProductHandle)?.routeKind)
        .toBe(TemplateCompilerAuthoredOriginRouteKind.Singular);
      expect(origins.routeForBrowserProduct(`product:attribute:browser:${index}` as ProductHandle)?.routeKind)
        .toBe(TemplateCompilerBrowserOriginRouteKind.Singular);
      expect(origins.routeForBrowserProduct(`product:text:browser:${index}` as ProductHandle)?.routeKind)
        .toBe(TemplateCompilerBrowserOriginRouteKind.Singular);
    }
    expect(reads.count).toBe(0);
  });

  test('distinguishes one exact implied producer from conflicting zero-input producers', () => {
    const output = 'product:implied:browser' as ProductHandle;
    const exact = zeroToOneDerivation('exact', output);
    expect(new TemplateCompilerAuthoredOriginIndex([exact]).routeForBrowserProduct(output)?.routeKind)
      .toBe(TemplateCompilerBrowserOriginRouteKind.Absent);

    const conflicting = zeroToOneDerivation('conflicting', output);
    expect(new TemplateCompilerAuthoredOriginIndex([exact, conflicting]).routeForBrowserProduct(output)?.routeKind)
      .toBe(TemplateCompilerBrowserOriginRouteKind.NonSingular);
  });
});

class PreWalkFixture {
  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly browserRun: ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']>,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
    readonly family: TemplateCompilationFamilyFrontDoorEmission,
    readonly binding: TemplateCompilerSiteInvocationBinding,
  ) {}

  static async create(): Promise<PreWalkFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-prewalk-remainder'),
      storeKey: 'contract:template-compiler-prewalk-remainder',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const compilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'prewalk-root'
    )?.compilation ?? null;
    if (compilation == null || compilation.html.draft == null) {
      throw new Error('Expected the AOT pre-walk fixture compilation and retained draft.');
    }
    const frontDoor = app.emission.templates.frontDoor;
    const family = frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error('Expected the current pre-walk template family.');
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-prewalk-remainder-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Candidate-local pre-walk remainder fixture.',
    });
    const markup = compilation.unit.templateSource.markup!;
    const browser = parseBrowserTemplateFragmentDraft(markup);
    const browserEmission = new BrowserEffectiveTemplateMaterializer(browserRun).materialize({
      localKey: 'prewalk-browser',
      sourceRevision: compilation.definition.template?.authoredSourceRevision ?? 'test:prewalk',
      templateSource: compilation.unit.templateSource,
      authoredHtml: compilation.html,
      browser,
      carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
    });
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
    const execution = TemplateCompilerExecutionSession.createForForest('prewalk-root', forest);
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
        throw new Error('No-local pre-walk fixture unexpectedly requested a definition reservation.');
      },
    });
    const closure = execution.closeInvocationBootstrap(hook, local);
    const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
    if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact) {
      throw new Error('Expected GraphExact pre-walk precedent.');
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
      throw new Error(`Expected exact pre-walk root binding: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    return new PreWalkFixture(runtime, browserRun, compilation, frontDoor, family, result.binding);
  }

  dispose(): void {
    this.browserRun.abort();
    this.runtime.retireWorkspaceIncarnation();
  }
}

function exactDerivation(kind: 'attribute' | 'text', index: number): TemplateStructureDerivation {
  const authoredKind = kind === 'attribute'
    ? KernelVocabulary.Template.HtmlAttribute.key
    : KernelVocabulary.Template.HtmlNode.key;
  const browserKind = kind === 'attribute'
    ? KernelVocabulary.Template.StructuralAttribute.key
    : KernelVocabulary.Template.StructuralNode.key;
  const productHandle = `product:${kind}:derivation:${index}` as ProductHandle;
  return bindProductDetailEnvelope(new TemplateStructureDerivation(
    TemplateStructureDerivationAuthority.HtmlTreeBuilder,
    [new TemplateStructureDerivationTerm(new TemplateStructureReference(
      authoredKind,
      `product:${kind}:authored:${index}` as ProductHandle,
      null,
      null,
    ))],
    [new TemplateStructureDerivationTerm(new TemplateStructureReference(
      browserKind,
      `product:${kind}:browser:${index}` as ProductHandle,
      null,
      null,
    ))],
    [],
  ), new MaterializedProduct(
    productHandle,
    KernelVocabulary.Template.StructureDerivation.key,
    `identity:${kind}:derivation:${index}` as never,
    null,
    null,
  ));
}

function zeroToOneDerivation(key: string, output: ProductHandle): TemplateStructureDerivation {
  return bindDerivation(`implied:${key}`, new TemplateStructureDerivation(
    TemplateStructureDerivationAuthority.HtmlTreeBuilder,
    [],
    [new TemplateStructureDerivationTerm(new TemplateStructureReference(
      KernelVocabulary.Template.StructuralNode.key,
      output,
      null,
      null,
    ))],
    [],
  ));
}

function bindDerivation(key: string, derivation: TemplateStructureDerivation): TemplateStructureDerivation {
  return bindProductDetailEnvelope(derivation, new MaterializedProduct(
    `product:${key}` as ProductHandle,
    KernelVocabulary.Template.StructureDerivation.key,
    `identity:${key}` as never,
    null,
    null,
  ));
}

function tracked<TValue>(values: readonly TValue[], reads: { count: number }): readonly TValue[] {
  return new Proxy(values, {
    get(target, key, receiver) {
      if (key === Symbol.iterator) {
        return function* trackedIterator() {
          for (const value of target) {
            reads.count++;
            yield value;
          }
        };
      }
      return Reflect.get(target, key, receiver);
    },
  });
}
