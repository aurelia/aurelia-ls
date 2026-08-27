import { describe, expect, test, vi } from 'vitest';

import type { ClaimEndpointHandle } from '../src/kernel/claim.js';
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
  TemplateCompilerAttributeDetachmentMutation,
  TemplateCompilerBootstrapContextReference,
  TemplateCompilerExecutionLaneReference,
  TemplateCompilerMutationBatchState,
  TemplateCompilerNodeDetachmentMutation,
  TemplateCompilerOccurrenceOperationTarget,
  TemplateCompilerOperation,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
  TemplateCompilerOperationMutationBatch,
} from '../src/template/template-compiler-execution.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerDoctypeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerNodeOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerOccurrenceGeneration,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerOccurrenceOnlyDisposition,
  TemplateCompilerSiteSpend,
  TemplateCompilerSiteSpendConflict,
  TemplateCompilerSiteSpendConflictKind,
  TemplateCompilerSiteSpendDisposition,
  TemplateCompilerSiteSpendLedger,
  TemplateCompilerSiteSpendLedgerState,
  type TemplateCompilerSiteSpendFrontier,
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
    const result = ledger.finish();
    expect(result).toMatchObject({
      state: TemplateCompilerSiteSpendLedgerState.Accounted,
      spends: [attributeSpend, textSpend, inertSpend],
      conflicts: [],
      rawUnspent: [],
      blockedByFrontier: [],
      frontier: null,
    });
    expect(ledger.finish()).toBe(result);
    expect(() => ledger.bind(
      attributeSite,
      attributeOccurrence('late'),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      2,
    )).toThrow(/already finished/);
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
      conflictKind: TemplateCompilerSiteSpendConflictKind.EventOrdinalAlreadySpent,
    });
    expect(ledger.finish().state).toBe(TemplateCompilerSiteSpendLedgerState.Mismatch);
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

  test('requires exact extraction causes and a distinct transfer destination', () => {
    const browser = new BrowserEffectiveTemplateFixture('site-spend-transfer');
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
      browser.materialize('root', [
        '<template as-custom-element="child">',
        '  <bindable name="value"></bindable>',
        '  <span title="transferred" data-missing="x" data-same="y"></span>',
        '</template>',
        '<div></div>',
      ].join('')).emission,
    );
    const localCarrier = forest.compilerContent.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
      node instanceof TemplateCompilerElementOccurrence && node.tagName === 'template'
    );
    const bindable = localCarrier?.templateContent?.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
      node instanceof TemplateCompilerElementOccurrence && node.tagName === 'bindable'
    );
    const transferredElement = localCarrier?.templateContent?.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
      node instanceof TemplateCompilerElementOccurrence && node.tagName === 'span'
    );
    const declaration = localCarrier?.readAttributes().find((attribute) => attribute.name === 'as-custom-element') ?? null;
    const metadataOccurrence = bindable?.readAttributes().find((attribute) => attribute.name === 'name') ?? null;
    const transferOccurrence = transferredElement?.readAttributes().find((attribute) => attribute.name === 'title') ?? null;
    const missingDestinationOccurrence = transferredElement?.readAttributes().find((attribute) =>
      attribute.name === 'data-missing'
    ) ?? null;
    const sameDestinationOccurrence = transferredElement?.readAttributes().find((attribute) =>
      attribute.name === 'data-same'
    ) ?? null;
    if (
      localCarrier == null
      || bindable == null
      || declaration == null
      || metadataOccurrence == null
      || transferOccurrence == null
      || missingDestinationOccurrence == null
      || sameDestinationOccurrence == null
    ) {
      throw new Error('Expected exact local declaration, bindable, and transferred carrier occurrences.');
    }
    const sites = Array.from({ length: 7 }, (_, index) => normalizedAttributeSite(`extraction-${index}`));
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex(sites, []));
    const declarationCause = extractionAttributeOperation(declaration);
    const parentLane = laneForCarrier('parent', forest.compilerCarrier, forest.compilerContent);
    const metadataCause = extractionNodeOperation(
      'bindable',
      bindable,
      parentLane,
      localCarrier.templateContent!,
      localCarrier.templateContent!.readChildren().indexOf(bindable),
    );
    const transferCause = extractionNodeOperation(
      'carrier',
      localCarrier,
      parentLane,
      forest.compilerContent,
      forest.compilerContent.readChildren().indexOf(localCarrier),
    );
    const destination = laneForCarrier('child', localCarrier, localCarrier.templateContent!);

    try {
      expect(ledger.exclude(
        sites[0]!,
        declaration,
        TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed,
        declarationCause.operation,
      )).toBeInstanceOf(TemplateCompilerSiteSpend);
      expect(ledger.exclude(
        sites[1]!,
        metadataOccurrence,
        TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed,
        metadataCause.operation,
      )).toBeInstanceOf(TemplateCompilerSiteSpend);
      expect(ledger.exclude(
        sites[2]!,
        missingDestinationOccurrence,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        transferCause.operation,
        destination,
      )).toBeInstanceOf(TemplateCompilerSiteSpend);

      expect(ledger.exclude(
        sites[3]!,
        attributeOccurrence('missing-cause'),
        TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed,
      )).toMatchObject({ conflictKind: TemplateCompilerSiteSpendConflictKind.MissingCauseOperation });
      expect(ledger.exclude(
        sites[4]!,
        attributeOccurrence('wrong-cause'),
        TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed,
        metadataCause.operation,
      )).toMatchObject({ conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidCauseOperation });
      expect(ledger.exclude(
        sites[5]!,
        sameDestinationOccurrence,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        transferCause.operation,
      )).toMatchObject({ conflictKind: TemplateCompilerSiteSpendConflictKind.MissingDestinationLane });
      expect(ledger.exclude(
        sites[6]!,
        transferOccurrence,
        TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
        transferCause.operation,
        transferCause.lane,
      )).toMatchObject({ conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidDestinationLane });
    } finally {
      browser.dispose();
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

    const result = ledger.finish();
    expect(result).toMatchObject({
      state: TemplateCompilerSiteSpendLedgerState.Open,
      occurrenceOnlyRows: expect.arrayContaining([
        expect.objectContaining({ disposition: TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering }),
        expect.objectContaining({ disposition: TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin }),
      ]),
    });

    const invalidLedger = new TemplateCompilerSiteSpendLedger(normalizedIndex([], []));
    const invalid = invalidLedger.recordOccurrenceOnly(
      elementOccurrence('not-text'),
      TemplateCompilerOccurrenceOnlyDisposition.StaticTextPassThrough,
      6,
    );
    expect(invalid).toMatchObject({
      conflictKind: TemplateCompilerSiteSpendConflictKind.InvalidOccurrenceDisposition,
    });
    expect(invalidLedger.finish().state).toBe(TemplateCompilerSiteSpendLedgerState.Mismatch);
  });

  test('keeps authored remainder evidence, raw unspent, and frontier blocking separate', () => {
    const spent = normalizedAttributeSite('spent');
    const blocked = normalizedAttributeSite('blocked');
    const remainder = normalizedTextSite('remainder');
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex([spent, blocked], [remainder]));
    const frontier: TemplateCompilerSiteSpendFrontier = { frontierKind: 'test-frontier' };
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

    const result = ledger.finish(frontier);
    expect(result).toMatchObject({
      state: TemplateCompilerSiteSpendLedgerState.Open,
      authoredRemainderEvidence: [evidence],
      rawUnspent: [blocked, remainder],
      blockedByFrontier: [{ bundle: blocked, frontier }],
      frontier,
    });
    expect(ledger.finish(frontier)).toBe(result);
    expect(() => ledger.finish({ frontierKind: 'another-frontier' })).toThrow(/another frontier/);
  });

  test('binds 512 attribute and 512 text sites without scanning either index per bind', () => {
    const attributeSites = Array.from({ length: 512 }, (_, index) => normalizedAttributeSite(`wide-a-${index}`));
    const textSites = Array.from({ length: 512 }, (_, index) => normalizedTextSite(`wide-t-${index}`));
    const reads = { count: 0 };
    const index = normalizedIndex(tracked(attributeSites, reads), tracked(textSites, reads));
    const ledger = new TemplateCompilerSiteSpendLedger(index);
    reads.count = 0;

    attributeSites.forEach((site, eventOrdinal) => ledger.bind(
      site,
      attributeOccurrence(`wide-a-${eventOrdinal}`),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      eventOrdinal,
    ));
    textSites.forEach((site, ordinal) => ledger.bind(
      site,
      textOccurrence(`wide-t-${ordinal}`),
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      attributeSites.length + ordinal,
    ));
    const result = ledger.finish();

    expect(result.state).toBe(TemplateCompilerSiteSpendLedgerState.Accounted);
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
    const browser = new BrowserEffectiveTemplateFixture('site-spend-deep-transfer');
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
      browser.materialize('root', markup).emission,
    );
    const carrier = forest.compilerContent.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
      node instanceof TemplateCompilerElementOccurrence && node.tagName === 'template'
    );
    if (carrier?.templateContent == null) throw new Error('Expected one local carrier.');
    const attributes = forest.readAttributes().filter((attribute) => attribute.name.startsWith('data-depth-'));
    const sites = attributes.map((_, index) => normalizedAttributeSite(`deep-${index}`));
    const ledger = new TemplateCompilerSiteSpendLedger(normalizedIndex(sites, []));
    const parentLane = laneForCarrier('deep-parent', forest.compilerCarrier, forest.compilerContent);
    const cause = extractionNodeOperation(
      'deep-carrier',
      carrier,
      parentLane,
      forest.compilerContent,
      forest.compilerContent.readChildren().indexOf(carrier),
    );
    const destination = laneForCarrier('deep-child', carrier, carrier.templateContent);
    const readChildren = vi.spyOn(TemplateCompilerNodeOccurrence.prototype, 'readChildren');
    const readAttributes = vi.spyOn(TemplateCompilerElementOccurrence.prototype, 'readAttributes');

    try {
      attributes.forEach((attribute, index) => {
        expect(ledger.exclude(
          sites[index]!,
          attribute,
          TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
          cause.operation,
          destination,
        )).toBeInstanceOf(TemplateCompilerSiteSpend);
      });
      expect(ledger.finish().state).toBe(TemplateCompilerSiteSpendLedgerState.Accounted);
      expect(readChildren).toHaveBeenCalledTimes(depth + 2);
      expect(readAttributes).toHaveBeenCalledTimes(depth + 1);
    } finally {
      readChildren.mockRestore();
      readAttributes.mockRestore();
      browser.dispose();
    }
  });
});

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
    [product(`cause:${localKey}`) as ClaimEndpointHandle],
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

function laneForCarrier(
  localKey: string,
  carrier: TemplateCompilerElementOccurrence,
  content: TemplateCompilerFragmentOccurrence,
): TemplateCompilerExecutionLaneReference {
  return new TemplateCompilerExecutionLaneReference(
    {},
    `lane:${localKey}`,
    carrier,
    content,
    0,
  );
}

function extractionAttributeOperation(attribute: TemplateCompilerAttributeOccurrence): {
  readonly operation: TemplateCompilerOperation;
  readonly lane: TemplateCompilerExecutionLaneReference;
} {
  const owner = attribute.owner;
  if (owner == null) throw new Error('Expected an attribute owner.');
  return extractionOperation(attribute, new TemplateCompilerAttributeDetachmentMutation(0, attribute, owner, 0));
}

function extractionNodeOperation(
  localKey: string,
  node: TemplateCompilerElementOccurrence = elementOccurrence(`detached:${localKey}`),
  lane: TemplateCompilerExecutionLaneReference | null = null,
  previousParent: TemplateCompilerElementOccurrence | TemplateCompilerFragmentOccurrence | null = null,
  previousOrdinal = 0,
): {
  readonly operation: TemplateCompilerOperation;
  readonly lane: TemplateCompilerExecutionLaneReference;
  readonly node: TemplateCompilerElementOccurrence;
} {
  return { ...extractionOperation(
    node,
    new TemplateCompilerNodeDetachmentMutation(
      0,
      node,
      previousParent,
      previousParent == null
        ? TemplateCompilerOccurrenceEdgeKind.Root
        : TemplateCompilerOccurrenceEdgeKind.Child,
      previousOrdinal,
    ),
    lane,
  ), node };
}

function extractionOperation(
  targetOccurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  mutation: TemplateCompilerNodeDetachmentMutation | TemplateCompilerAttributeDetachmentMutation,
  admittedLane: TemplateCompilerExecutionLaneReference | null = null,
): {
  readonly operation: TemplateCompilerOperation;
  readonly lane: TemplateCompilerExecutionLaneReference;
} {
  const authority = {};
  const lane = admittedLane ?? new TemplateCompilerExecutionLaneReference(
      authority,
      `lane:${targetOccurrence.occurrenceKey}`,
      elementOccurrence(`carrier:${targetOccurrence.occurrenceKey}`),
      new TemplateCompilerFragmentOccurrence(
        `content:${targetOccurrence.occurrenceKey}`,
        null,
        null,
        null,
        TemplateCompilerOccurrenceEdgeKind.Detached,
      ),
      0,
    );
  const context = new TemplateCompilerBootstrapContextReference(authority, lane, 0);
  const operation = new TemplateCompilerOperation(
    authority,
    `operation:${targetOccurrence.occurrenceKey}`,
    0,
    context,
    TemplateCompilerOperationKind.LocalTemplateExtraction,
    TemplateCompilerOperationExecutionMechanism.BuiltIn,
    new TemplateCompilerOccurrenceOperationTarget(authority, context, targetOccurrence),
    new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
    new TemplateCompilerOperationMutationBatch(
      TemplateCompilerMutationBatchState.Committed,
      [],
      [],
      [mutation],
    ),
    [product(`cause:${targetOccurrence.occurrenceKey}`) as ClaimEndpointHandle],
    [],
    null,
  );
  return { operation, lane };
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
