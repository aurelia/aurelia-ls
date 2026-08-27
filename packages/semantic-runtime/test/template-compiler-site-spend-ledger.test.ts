import { describe, expect, test, vi } from 'vitest';

import type { ProductHandle } from '../src/kernel/handles.js';
import { HtmlCommentSemanticKind, HtmlNamespaceKind } from '../src/template/html-ir.js';
import {
  TemplateCompilerNormalizedDownstreamInstructionInventory,
  TemplateCompilerNormalizedOutcomeInventory,
  TemplateCompilerNormalizedOwnershipLedger,
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedSiteCardinality,
  TemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedTextSite,
} from '../src/template/template-compiler-normalized-site-index.js';
import {
  TemplateCompilerExecutionSession,
  TemplateCompilerOperation,
} from '../src/template/template-compiler-execution.js';
import type {
  TemplateCompilerExecutionLaneReference,
  TemplateCompilerInvocationBootstrapClosure,
} from '../src/template/template-compiler-execution.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerDoctypeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerNodeOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerOccurrenceGeneration,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import type { TemplateCompilerFragmentOccurrence } from '../src/template/template-compiler-occurrence.js';
import {
  executeTemplateCompilerLocalExtraction,
  type TemplateCompilerLocalDefinitionReservation,
} from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import {
  TemplateCompilerOccurrenceOnlyDisposition,
  TemplateCompilerLocalSiteExclusionAuthority,
  TemplateCompilerSiteSpend,
  TemplateCompilerSiteSpendCompletion,
  TemplateCompilerSiteSpendConflict,
  TemplateCompilerSiteSpendConflictKind,
  TemplateCompilerSiteSpendDisposition,
  TemplateCompilerSiteSpendLedger,
  TemplateCompilerSiteSpendLedgerState,
} from '../src/template/template-compiler-site-spend-ledger.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('template compiler site spend ledger', () => {
  test('accounts exact attribute and text spends once and finishes repeatably', () => {
    const attributeSite = normalizedAttributeSite('exact-attribute');
    const textSite = normalizedTextSite('exact-text');
    const inertSite = normalizedTextSite('inert-text');
    const index = normalizedIndex([attributeSite], [textSite, inertSite]);
    const ledger = new TemplateCompilerSiteSpendLedger(index);
    const attribute = attributeOccurrence('exact-attribute');
    const text = textOccurrence('exact-text');

    const attributeSpend = ledger.bind(
      attributeSite,
      attribute,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      0,
    );
    const textSpend = ledger.bind(
      textSite,
      text,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      1,
    );
    const inertSpend = ledger.exclude(
      inertSite,
      textOccurrence('inert-text'),
      TemplateCompilerSiteSpendDisposition.InertTemplateContent,
    );

    expect(attributeSpend).toBeInstanceOf(TemplateCompilerSiteSpend);
    expect(textSpend).toBeInstanceOf(TemplateCompilerSiteSpend);
    expect(inertSpend).toBeInstanceOf(TemplateCompilerSiteSpend);
    expect(ledger.spendForBundle(attributeSite)).toBe(attributeSpend);
    expect(ledger.spendForProductHandle(textSite.textProductHandle)).toBe(textSpend);
    expect(ledger.rowForOccurrence(text)).toBe(textSpend);
    expect(() => ledger.finish(TemplateCompilerSiteSpendCompletion.complete(
      ledger.nextSiteEventOrdinal + 1,
    ))).toThrow(/current event/);
    const completion = TemplateCompilerSiteSpendCompletion.complete(ledger.nextSiteEventOrdinal);
    const result = ledger.finish(completion);
    expect(result).toMatchObject({
      state: TemplateCompilerSiteSpendLedgerState.AllSitesAccounted,
      spends: [attributeSpend, textSpend, inertSpend],
      conflicts: [],
      rawUnspent: [],
      blockedByFrontier: [],
      completion,
    });
    expect(ledger.finish(completion)).toBe(result);
    expect(() => ledger.finish({
      completionKind: 'complete',
      frontierKind: null,
      nextSiteEventOrdinal: ledger.nextSiteEventOrdinal,
    } as never)).toThrow(/nominal completion/);
    expect(() => ledger.finish(
      TemplateCompilerSiteSpendCompletion.complete(ledger.nextSiteEventOrdinal),
    )).toThrow(/another completion/);
    expect(() => ledger.bind(
      attributeSite,
      attributeOccurrence('late'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      2,
    )).toThrow(/already finished/);
  });

  test('keeps terminal let content distinct from inert template content', () => {
    const inert = normalizedTextSite('inert-template-content');
    const letChild = normalizedTextSite('let-content');
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex([], [inert, letChild]));

    const inertSpend = ledger.exclude(
      inert,
      textOccurrence('inert-template-content'),
      TemplateCompilerSiteSpendDisposition.InertTemplateContent,
    );
    const letSpend = ledger.exclude(
      letChild,
      textOccurrence('let-content'),
      TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
    );

    expect(inertSpend).toMatchObject({
      disposition: TemplateCompilerSiteSpendDisposition.InertTemplateContent,
      causeOperation: null,
      siteEventOrdinal: null,
    });
    expect(letSpend).toMatchObject({
      disposition: TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
      causeOperation: null,
      siteEventOrdinal: null,
    });
    expect(ledger.finish(
      TemplateCompilerSiteSpendCompletion.complete(ledger.nextSiteEventOrdinal),
    ).state).toBe(TemplateCompilerSiteSpendLedgerState.AllSitesAccounted);
  });

  test('reports both exclusive-spend directions and event collisions', () => {
    const first = normalizedAttributeSite('first');
    const second = normalizedAttributeSite('second');
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex([first, second], []));
    const firstOccurrence = attributeOccurrence('first');

    ledger.bind(first, firstOccurrence, TemplateCompilerSiteSpendDisposition.BrowserCompatible, 0);
    const repeatedSite = ledger.bind(
      first,
      attributeOccurrence('peer'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      1,
    );
    const repeatedOccurrence = ledger.bind(
      second,
      firstOccurrence,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      2,
    );
    const repeatedEvent = ledger.recordOccurrenceOnly(
      textOccurrence('static'),
      TemplateCompilerOccurrenceOnlyDisposition.StaticTextPassThrough,
      0,
    );

    expect(repeatedSite).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.SiteAlreadySpent,
    });
    expect(repeatedOccurrence).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.OccurrenceAlreadySpent,
    });
    expect(repeatedEvent).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.SiteEventOrdinalMismatch,
    });
    expect(ledger.finish(
      TemplateCompilerSiteSpendCompletion.complete(ledger.nextSiteEventOrdinal),
    ).state).toBe(TemplateCompilerSiteSpendLedgerState.Mismatch);
  });

  test('requires contiguous ledger-local site-event ordinals without advancing failed attempts', () => {
    const first = normalizedAttributeSite('event-first');
    const second = normalizedAttributeSite('event-second');
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex([first, second], []));

    expect(ledger.bind(
      first,
      attributeOccurrence('event-gap'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      1,
    )).toMatchObject({ conflictKind: TemplateCompilerSiteSpendConflictKind.SiteEventOrdinalMismatch });
    expect(ledger.nextSiteEventOrdinal).toBe(0);
    expect(ledger.bind(
      first,
      attributeOccurrence('event-first'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      0,
    )).toBeInstanceOf(TemplateCompilerSiteSpend);
    expect(ledger.bind(
      second,
      attributeOccurrence('event-old'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      0,
    )).toMatchObject({ conflictKind: TemplateCompilerSiteSpendConflictKind.SiteEventOrdinalMismatch });
    expect(ledger.nextSiteEventOrdinal).toBe(1);
    expect(ledger.bind(
      second,
      attributeOccurrence('event-second'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      1,
    )).toBeInstanceOf(TemplateCompilerSiteSpend);
  });

  test('rejects foreign bundles, occurrence-kind mismatches, and bad event ordinals', () => {
    const attributeSite = normalizedAttributeSite('owned');
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex([attributeSite], []));
    const foreign = normalizedAttributeSiteWithHandle(attributeSite.attributeProductHandle);

    const foreignAttempt = ledger.bind(
      foreign,
      attributeOccurrence('foreign'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      0,
    );
    const kindAttempt = ledger.bind(
      attributeSite,
      textOccurrence('wrong-kind'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      1,
    );
    const ordinalAttempt = ledger.bind(
      attributeSite,
      attributeOccurrence('bad-ordinal'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      -1,
    );

    expect(foreignAttempt).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.ForeignIndexBundle,
    });
    expect(kindAttempt).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.SiteOccurrenceKindMismatch,
    });
    expect(ordinalAttempt).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidEventOrdinal,
    });
  });

  test('uses one nominal closure snapshot for exact declaration, bindable, and carrier transfer exclusions', () => {
    const fixture = new LocalExclusionFixture('site-spend-transfer', [
      '<template as-custom-element="child">',
      '  <bindable name="value"></bindable>',
      '  <span title="transferred" data-other="other"></span>',
      '</template>',
      '<div></div>',
    ].join(''));
    const authority = TemplateCompilerLocalSiteExclusionAuthority.capture(
      fixture.execution,
      fixture.closure,
    );
    const extraction = fixture.extraction.completedExtractions[0]!;
    const metadataOccurrence = extraction.bindables[0]?.nameAttribute ?? null;
    const transferOccurrence = extraction.content.readChildren()
      .filter((node): node is TemplateCompilerElementOccurrence => node instanceof TemplateCompilerElementOccurrence)
      .flatMap((element) => element.readAttributes())
      .find((attribute) => attribute.name === 'title') ?? null;
    const wrongDispositionOccurrence = extraction.content.readChildren()
      .filter((node): node is TemplateCompilerElementOccurrence => node instanceof TemplateCompilerElementOccurrence)
      .flatMap((element) => element.readAttributes())
      .find((attribute) => attribute.name === 'data-other') ?? null;
    if (metadataOccurrence == null || transferOccurrence == null || wrongDispositionOccurrence == null) {
      throw new Error('Expected exact bindable and transferred attributes.');
    }
    const sites = Array.from({ length: 5 }, (_, index) => normalizedAttributeSite(`extraction-${index}`));
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex(sites, []));

    try {
      const declarationSpend = ledger.exclude(
        sites[0]!,
        extraction.declarationAttribute,
        TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed,
        authority,
      );
      const metadataSpend = ledger.exclude(
        sites[1]!,
        metadataOccurrence,
        TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed,
        authority,
      );
      const transferSpend = ledger.exclude(
        sites[2]!,
        transferOccurrence,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        authority,
      );
      expect(declarationSpend).toMatchObject({
        causeOperation: expect.any(TemplateCompilerOperation),
        destinationLane: null,
      });
      expect(metadataSpend).toMatchObject({
        causeOperation: extraction.bindables[0]?.detachmentOperation,
        destinationLane: null,
      });
      expect(transferSpend).toMatchObject({
        causeOperation: extraction.carrierDetachmentOperation,
        destinationLane: extraction.invocationLane,
      });
      expect(ledger.exclude(
        sites[3]!,
        attributeOccurrence('missing-authority'),
        TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed,
      )).toMatchObject({
        conflictKind: TemplateCompilerSiteSpendConflictKind.MissingLocalExclusionAuthority,
      });
      expect(ledger.exclude(
        sites[4]!,
        wrongDispositionOccurrence,
        TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed,
        authority,
      )).toMatchObject({
        conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidLocalExclusionAuthority,
      });
    } finally {
      fixture.dispose();
    }
  });

  test('rejects foreign, stale, and structurally forged local exclusion authority', () => {
    const markup = '<template as-custom-element="child"><span title="value"></span></template><main></main>';
    const first = new LocalExclusionFixture('site-spend-authority-first', markup);
    const second = new LocalExclusionFixture('site-spend-authority-second', markup);
    try {
      expect(() => TemplateCompilerLocalSiteExclusionAuthority.capture(
        first.execution,
        second.closure,
      )).toThrow();

      const firstAuthority = TemplateCompilerLocalSiteExclusionAuthority.capture(
        first.execution,
        first.closure,
      );
      const secondTransferAttribute = transferredAttribute(second, 'title');
      const firstTransferAttribute = transferredAttribute(first, 'title');
      const sites = Array.from({ length: 4 }, (_, index) => normalizedAttributeSite(`authority-${index}`));
      const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex(sites, []));
      expect(ledger.exclude(
        sites[0]!,
        secondTransferAttribute,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        firstAuthority,
      )).toMatchObject({
        conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidLocalExclusionAuthority,
      });
      expect(ledger.exclude(
        sites[1]!,
        firstTransferAttribute,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        first.extraction.completedExtractions[0]!.carrierDetachmentOperation as never,
      )).toMatchObject({
        conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidLocalExclusionAuthority,
      });
      expect(ledger.exclude(
        sites[2]!,
        firstTransferAttribute,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        first.extraction.completedExtractions[0]!.invocationLane as never,
      )).toMatchObject({
        conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidLocalExclusionAuthority,
      });

      const childLane = first.extraction.completedExtractions[0]!.invocationLane!;
      const childHook = new TemplateCompilerHookBootstrapResult(
        childLane,
        TemplateCompilerHookBootstrapState.Exact,
        [],
        null,
        null,
      );
      const childExtraction = executeTemplateCompilerLocalExtraction({
        execution: first.execution,
        lane: childLane,
        hookBootstrap: childHook,
        ownerName: 'child',
        ownerCauseHandles: [product('authority-child-owner')],
        reserveDefinition: () => {
          throw new Error('No nested local definition should be reserved.');
        },
      });
      first.execution.closeInvocationBootstrap(childHook, childExtraction);
      expect(() => TemplateCompilerLocalSiteExclusionAuthority.capture(
        first.execution,
        first.closure,
      )).toThrow(/current pre-child/);
      expect(ledger.exclude(
        sites[3]!,
        firstTransferAttribute,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        firstAuthority,
      )).toBeInstanceOf(TemplateCompilerSiteSpend);

      second.forest.rewriteAttributeValue(secondTransferAttribute, 'advanced-before-capture');
      expect(() => TemplateCompilerLocalSiteExclusionAuthority.capture(
        second.execution,
        second.closure,
      )).toThrow(/current pre-child/);
    } finally {
      first.dispose();
      second.dispose();
    }
  });

  test('keeps occurrence-only semantic gaps distinct from harmless pass-through rows', () => {
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex([], []));
    const generated = generatedTextOccurrence('generated');

    expect(ledger.recordOccurrenceOnly(
      textOccurrence('static'),
      TemplateCompilerOccurrenceOnlyDisposition.StaticTextPassThrough,
      0,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);
    expect(ledger.recordOccurrenceOnly(
      elementOccurrence('implied'),
      TemplateCompilerOccurrenceOnlyDisposition.BrowserImpliedElementPassThrough,
      1,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);
    expect(ledger.recordOccurrenceOnly(
      commentOccurrence('comment'),
      TemplateCompilerOccurrenceOnlyDisposition.IgnoredComment,
      2,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);
    expect(ledger.recordOccurrenceOnly(
      doctypeOccurrence('doctype'),
      TemplateCompilerOccurrenceOnlyDisposition.IgnoredDoctype,
      3,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);
    expect(ledger.recordOccurrenceOnly(
      generated,
      TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering,
      4,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);
    expect(ledger.recordOccurrenceOnly(
      attributeOccurrence('non-singular'),
      TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin,
      5,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);
    expect(ledger.recordOccurrenceOnly(
      attributeOccurrence('live-assembled'),
      TemplateCompilerOccurrenceOnlyDisposition.LiveAttributeAssembled,
      6,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);
    expect(ledger.recordOccurrenceOnly(
      elementOccurrence('live-element'),
      TemplateCompilerOccurrenceOnlyDisposition.LiveElementAssembled,
      7,
    )).not.toBeInstanceOf(TemplateCompilerSiteSpendConflict);

    const result = ledger.finish(
      TemplateCompilerSiteSpendCompletion.complete(ledger.nextSiteEventOrdinal),
    );
    expect(result).toMatchObject({
      state: TemplateCompilerSiteSpendLedgerState.Open,
      occurrenceOnlyRows: expect.arrayContaining([
        expect.objectContaining({ disposition: TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering }),
        expect.objectContaining({ disposition: TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin }),
        expect.objectContaining({ disposition: TemplateCompilerOccurrenceOnlyDisposition.LiveAttributeAssembled }),
        expect.objectContaining({ disposition: TemplateCompilerOccurrenceOnlyDisposition.LiveElementAssembled }),
      ]),
    });

    const invalidLedger = new TemplateCompilerSiteSpendLedger(normalizedIndex([], []));
    const invalid = invalidLedger.recordOccurrenceOnly(
      elementOccurrence('not-text'),
      TemplateCompilerOccurrenceOnlyDisposition.StaticTextPassThrough,
      8,
    );
    expect(invalid).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidOccurrenceDisposition,
    });
    expect(invalidLedger.finish(
      TemplateCompilerSiteSpendCompletion.complete(invalidLedger.nextSiteEventOrdinal),
    ).state).toBe(TemplateCompilerSiteSpendLedgerState.Mismatch);
  });

  test('keeps authored remainder evidence, raw unspent, and frontier blocking separate', () => {
    const spent = normalizedAttributeSite('spent');
    const blocked = normalizedAttributeSite('blocked');
    const remainder = normalizedTextSite('remainder');
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex([spent, blocked], [remainder]));
    ledger.bind(
      spent,
      attributeOccurrence('spent'),
      TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
      0,
    );
    const evidence = ledger.recordAuthoredRemainder(
      remainder,
      'browser-discarded-authored-site',
      'The browser did not retain one singular live occurrence.',
    );

    const completion = TemplateCompilerSiteSpendCompletion.blocked(
      'test-frontier',
      ledger.nextSiteEventOrdinal,
    );
    const result = ledger.finish(completion);
    expect(result).toMatchObject({
      state: TemplateCompilerSiteSpendLedgerState.Open,
      authoredRemainderEvidence: [evidence],
      rawUnspent: [blocked, remainder],
      blockedByFrontier: [{ bundle: blocked, completion }],
      completion,
    });
    expect(ledger.finish(completion)).toBe(result);
    expect(() => ledger.finish(TemplateCompilerSiteSpendCompletion.blocked(
      'test-frontier',
      ledger.nextSiteEventOrdinal,
    ))).toThrow(/another completion/);
  });

  test('binds 512 attribute and 512 text sites without scanning either index per bind', () => {
    const attributeSites = Array.from({ length: 512 }, (_, index) => normalizedAttributeSite(`wide-a-${index}`));
    const textSites = Array.from({ length: 512 }, (_, index) => normalizedTextSite(`wide-t-${index}`));
    const reads = { count: 0 };
    const index = normalizedIndex(tracked(attributeSites, reads), tracked(textSites, reads));
    const ledger = new TemplateCompilerSiteSpendLedger(index);
    reads.count = 0;

    attributeSites.forEach((site, siteEventOrdinal) => ledger.bind(
      site,
      attributeOccurrence(`wide-a-${siteEventOrdinal}`),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      siteEventOrdinal,
    ));
    textSites.forEach((site, ordinal) => ledger.bind(
      site,
      textOccurrence(`wide-t-${ordinal}`),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      attributeSites.length + ordinal,
    ));
    const result = ledger.finish(
      TemplateCompilerSiteSpendCompletion.complete(ledger.nextSiteEventOrdinal),
    );

    expect(result.state).toBe(TemplateCompilerSiteSpendLedgerState.AllSitesAccounted);
    expect(result.spends).toHaveLength(1024);
    expect(reads.count).toBeLessThanOrEqual(1024 * 2);
  });

  test('indexes one transferred subtree once before repeated descendant exclusions', () => {
    const depth = 64;
    const markup = [
      '<template as-custom-element="child">',
      ...Array.from({ length: depth }, (_, index) => `<div data-depth-${index}="${index}">`),
      ...Array.from({ length: depth }, () => '</div>'),
      '</template>',
      '<main></main>',
    ].join('');
    const fixture = new LocalExclusionFixture('site-spend-deep-transfer', markup);
    const carrier = fixture.extraction.completedExtractions[0]?.carrier ?? null;
    if (carrier?.templateContent == null) throw new Error('Expected one extracted local carrier.');
    const attributes = fixture.forest.readAttributes().filter((attribute) => attribute.name.startsWith('data-depth-'));
    const sites = attributes.map((_, index) => normalizedAttributeSite(`deep-${index}`));
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex(sites, []));
    const readChildren = vi.spyOn(TemplateCompilerNodeOccurrence.prototype, 'readChildren');
    const readAttributes = vi.spyOn(TemplateCompilerElementOccurrence.prototype, 'readAttributes');

    try {
      const authority = TemplateCompilerLocalSiteExclusionAuthority.capture(
        fixture.execution,
        fixture.closure,
      );
      fixture.forest.rewriteAttributeValue(attributes[0]!, 'later-child-value');
      attributes.forEach((attribute, index) => {
        expect(ledger.exclude(
          sites[index]!,
          attribute,
          TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
          authority,
        )).toBeInstanceOf(TemplateCompilerSiteSpend);
      });
      expect(ledger.finish(
        TemplateCompilerSiteSpendCompletion.complete(ledger.nextSiteEventOrdinal),
      ).state).toBe(TemplateCompilerSiteSpendLedgerState.AllSitesAccounted);
      expect(readChildren).toHaveBeenCalledTimes(depth + 2);
      expect(readAttributes).toHaveBeenCalledTimes(depth + 1);
    } finally {
      readChildren.mockRestore();
      readAttributes.mockRestore();
      fixture.dispose();
    }
  });
});

class LocalExclusionFixture {
  readonly browser: BrowserEffectiveTemplateFixture;
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly execution: TemplateCompilerExecutionSession;
  readonly lane: TemplateCompilerExecutionLaneReference;
  readonly hookBootstrap: TemplateCompilerHookBootstrapResult;
  readonly extraction: ReturnType<typeof executeTemplateCompilerLocalExtraction>;
  readonly closure: TemplateCompilerInvocationBootstrapClosure;
  private readonly reservations = new Map<string, TemplateCompilerLocalDefinitionReservation>();

  constructor(localKey: string, markup: string) {
    this.browser = new BrowserEffectiveTemplateFixture(localKey);
    this.forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
      this.browser.materialize('root', markup).emission,
    );
    this.execution = TemplateCompilerExecutionSession.createForForest(`${localKey}:family`, this.forest);
    this.lane = this.execution.admitRootInvocation(`${localKey}:root`);
    this.hookBootstrap = new TemplateCompilerHookBootstrapResult(
      this.lane,
      TemplateCompilerHookBootstrapState.Exact,
      [],
      null,
      null,
    );
    this.extraction = executeTemplateCompilerLocalExtraction({
      execution: this.execution,
      lane: this.lane,
      hookBootstrap: this.hookBootstrap,
      ownerName: 'owner-element',
      ownerCauseHandles: [product(`${localKey}:owner-definition`)],
      reserveDefinition: (invocationKey) => {
        let reservation = this.reservations.get(invocationKey);
        if (reservation == null) {
          reservation = {
            invocationKey,
            productHandle: product(`${localKey}:definition:${invocationKey}`),
            identityHandle: this.browser.run.handles.identity(`${localKey}:definition:${invocationKey}`),
          };
          this.reservations.set(invocationKey, reservation);
        }
        return reservation;
      },
    });
    this.closure = this.execution.closeInvocationBootstrap(this.hookBootstrap, this.extraction);
  }

  dispose(): void {
    this.browser.dispose();
  }
}

function transferredAttribute(fixture: LocalExclusionFixture, name: string): TemplateCompilerAttributeOccurrence {
  const extraction = fixture.extraction.completedExtractions[0];
  const attribute = extraction?.content.readChildren()
    .filter((node): node is TemplateCompilerElementOccurrence => node instanceof TemplateCompilerElementOccurrence)
    .flatMap((element) => element.readAttributes())
    .find((candidate) => candidate.name === name);
  if (attribute == null) throw new Error(`Expected transferred attribute '${name}'.`);
  return attribute;
}

function normalizedAttributeSite(localKey: string): TemplateCompilerNormalizedSite {
  return normalizedAttributeSiteWithHandle(product(`attribute:${localKey}`));
}

function normalizedAttributeSiteWithHandle(attributeProductHandle: ProductHandle): TemplateCompilerNormalizedSite {
  return new TemplateCompilerNormalizedSite(
    attributeProductHandle,
    null as never,
    null as never,
    null as never,
    null as never,
    null,
    null,
    null,
    null,
    null as never,
    null as never,
  );
}

function normalizedTextSite(localKey: string): TemplateCompilerNormalizedTextSite {
  return new TemplateCompilerNormalizedTextSite(
    product(`text:${localKey}`),
    null as never,
    null as never,
    null as never,
  );
}

function normalizedIndex(
  attributeSites: readonly TemplateCompilerNormalizedSite[],
  textSites: readonly TemplateCompilerNormalizedTextSite[],
): TemplateCompilerNormalizedSiteIndex {
  return new TemplateCompilerNormalizedSiteIndex(
    null as never,
    attributeSites,
    textSites,
    [],
    [],
    new TemplateCompilerNormalizedOwnershipLedger([], []),
    new TemplateCompilerNormalizedOutcomeInventory([], []),
    new TemplateCompilerNormalizedDownstreamInstructionInventory([], [], [], []),
    new TemplateCompilerNormalizedSiteCardinality(
      0,
      0,
      attributeSites.length,
      attributeSites.length,
      textSites.length,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ),
  );
}

function elementOccurrence(
  localKey: string,
  parent: TemplateCompilerElementOccurrence | TemplateCompilerFragmentOccurrence | null = null,
): TemplateCompilerElementOccurrence {
  return new TemplateCompilerElementOccurrence(
    `occurrence:${localKey}`,
    null,
    null,
    parent,
    parent == null ? TemplateCompilerOccurrenceEdgeKind.Detached : TemplateCompilerOccurrenceEdgeKind.Child,
    'div',
    HtmlNamespaceKind.Html,
    'http://www.w3.org/1999/xhtml',
  );
}

function attributeOccurrence(localKey: string): TemplateCompilerAttributeOccurrence {
  return attributeOccurrenceOwnedBy(localKey, elementOccurrence(`owner:${localKey}`));
}

function attributeOccurrenceOwnedBy(
  localKey: string,
  owner: TemplateCompilerElementOccurrence,
): TemplateCompilerAttributeOccurrence {
  return new TemplateCompilerAttributeOccurrence(
    `attribute-occurrence:${localKey}`,
    null,
    null,
    owner,
    `data-${localKey}`,
    localKey,
    null,
    null,
  );
}

function textOccurrence(localKey: string): TemplateCompilerTextOccurrence {
  return new TemplateCompilerTextOccurrence(
    `text-occurrence:${localKey}`,
    null,
    null,
    null,
    TemplateCompilerOccurrenceEdgeKind.Detached,
    localKey,
  );
}

function generatedTextOccurrence(localKey: string): TemplateCompilerTextOccurrence {
  const generation = new TemplateCompilerOccurrenceGeneration(
    {},
    `context:${localKey}`,
    `operation:${localKey}`,
    TemplateCompilerGeneratedOccurrenceRole.Clone,
    [product(`cause:${localKey}`)],
    0,
  );
  return new TemplateCompilerTextOccurrence(
    `generated-text-occurrence:${localKey}`,
    null,
    null,
    null,
    TemplateCompilerOccurrenceEdgeKind.Detached,
    localKey,
    generation,
  );
}

function commentOccurrence(localKey: string): TemplateCompilerCommentOccurrence {
  return new TemplateCompilerCommentOccurrence(
    `comment-occurrence:${localKey}`,
    null,
    null,
    null,
    TemplateCompilerOccurrenceEdgeKind.Detached,
    localKey,
    HtmlCommentSemanticKind.Plain,
  );
}

function doctypeOccurrence(localKey: string): TemplateCompilerDoctypeOccurrence {
  return new TemplateCompilerDoctypeOccurrence(
    `doctype-occurrence:${localKey}`,
    null,
    null,
    null,
    TemplateCompilerOccurrenceEdgeKind.Detached,
    'html',
    '',
    '',
  );
}

function tracked<T>(values: readonly T[], reads: { count: number }): readonly T[] {
  return new Proxy(values, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/u.test(property)) reads.count++;
      return Reflect.get(target, property, receiver);
    },
  });
}

function product(localKey: string): ProductHandle {
  return `test:${localKey}` as ProductHandle;
}
