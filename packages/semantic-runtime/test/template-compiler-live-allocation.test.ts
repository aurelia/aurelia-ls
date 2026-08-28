import { describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { CompiledTemplateReference } from '../src/template/compiled-template.js';
import { HtmlAttributeReference, HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import {
  AuSlotProcessContentInstructionData,
  HydrateElementProjectionContributor,
  HydrateElementProjectionContributorDisposition,
  HydrateElementProjectionDefinition,
  TemplateInstructionKind,
} from '../src/template/instruction-ir.js';
import {
  fundTemplateCompilerHydrateElements,
  TemplateCompilerEmptyHydrateElementProjectionFundingPlan,
  TemplateCompilerHydrateElementFundingDraft,
  TemplateCompilerHydrateElementProjectionFunding,
  type TemplateCompilerHydrateElementProjectionFundingPlan,
} from '../src/template/template-compiler-hydrate-element-funding.js';
import {
  fundTemplateCompilerHydrateTemplateControllers,
  TemplateCompilerHydrateTemplateControllerChildFunding,
  type TemplateCompilerHydrateTemplateControllerChildFundingPlan,
  TemplateCompilerHydrateTemplateControllerFundingDraft,
} from '../src/template/template-compiler-hydrate-template-controller-funding.js';
import {
  TemplateCompilerLiveAllocationLedgerState,
  TemplateCompilerLiveAllocationNamespace,
  TemplateCompilerLiveAllocationSnapshotState,
  TemplateCompilerLiveProductReservationRole,
  type TemplateCompilerLiveAllocationAuthority,
} from '../src/template/template-compiler-live-allocation.js';
import {
  TemplateCompilerCaptureSyntaxDecisionKind,
  type TemplateCompilerCapturedSyntaxRowDraft,
} from '../src/template/template-compiler-occurrence-row-assembly.js';
import { TemplateCompilerPreparedInstructionFundingAuthority } from '../src/template/template-compiler-prepared-instruction-funding.js';

describe('template compiler live prepared allocation', () => {
  test('freezes one complete local inventory before committing its exact snapshot', () => {
    const authority = new TestAllocationAuthority('exact-commit');
    const namespace = new TemplateCompilerLiveAllocationNamespace(authority);
    const ledger = namespace.preparePhase('prepared');
    ledger.reserveProduct(
      'prepared:generated-template',
      'generated-template',
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      null,
      'prepared:generated-template:product',
    );
    const emptyCounts = namespace.readReservationCounts();

    const prepared = ledger.prepareSnapshot();

    expect(prepared.isModuleConstructed()).toBe(true);
    expect(prepared.isCurrent()).toBe(true);
    expect(prepared.state).toBe(TemplateCompilerLiveAllocationSnapshotState.Complete);
    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(namespace.readReservationCounts()).toEqual(emptyCounts);
    expect(ledger.prepareSnapshot()).toBe(prepared);
    expect(() => ledger.reserveProduct(
      'prepared:late-product',
      'late-product',
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      null,
      'prepared:late-product:product',
    )).toThrow('no longer mutable');

    const committed = ledger.commitPrepared(prepared);

    expect(committed.state).toBe(TemplateCompilerLiveAllocationSnapshotState.Complete);
    expect(committed.prepared).toBe(prepared);
    expect(committed.productReservations).toBe(prepared.productReservations);
    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Committed);
    expect(ledger.finish()).toBe(committed);
    expect(namespace.readReservationCounts()).toMatchObject({
      semanticSlots: 1,
      productHandles: 1,
      identityHandles: 1,
      addressHandles: 0,
    });
    expect(() => ledger.commitPrepared(prepared)).toThrow('exact current prepared snapshot');
  });

  test('leaves an incomplete prepared phase mutable and namespace-invisible', () => {
    const authority = new TestAllocationAuthority('incomplete');
    const namespace = new TemplateCompilerLiveAllocationNamespace(authority);
    const ledger = namespace.preparePhase('prepared');
    ledger.allocateInstruction(
      'prepared:site',
      'hydrate-element',
      TemplateInstructionKind.HydrateElement,
      null,
      'prepared:site:instruction:hydrate-element',
    );
    const emptyCounts = namespace.readReservationCounts();

    expect(() => ledger.prepareSnapshot()).toThrow('incomplete or incoherent');
    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Mutable);
    expect(namespace.readReservationCounts()).toEqual(emptyCounts);
    expect(() => ledger.reserveProduct(
      'prepared:generated-template',
      'generated-template',
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      null,
      'prepared:generated-template:product',
    )).not.toThrow();
    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Mutable);
    expect(namespace.readReservationCounts()).toEqual(emptyCounts);
  });

  test('does not freeze an empty phase that can never commit a namespace batch', () => {
    const authority = new TestAllocationAuthority('empty');
    const namespace = new TemplateCompilerLiveAllocationNamespace(authority);
    const ledger = namespace.preparePhase('prepared');

    expect(() => ledger.prepareSnapshot()).toThrow('incomplete or incoherent');
    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Mutable);
    expect(namespace.readReservationCounts()).toMatchObject({
      semanticSlots: 0,
      productHandles: 0,
      identityHandles: 0,
      addressHandles: 0,
    });
  });

  test('rejects foreign and stale prepared snapshots without exposing either inventory', () => {
    const authority = new TestAllocationAuthority('foreign-stale');
    const namespace = new TemplateCompilerLiveAllocationNamespace(authority);
    const first = preparedProductLedger(namespace, 'first');
    const second = preparedProductLedger(namespace, 'second');
    const firstSnapshot = first.prepareSnapshot();
    const secondSnapshot = second.prepareSnapshot();
    const emptyCounts = namespace.readReservationCounts();

    expect(() => first.commitPrepared(secondSnapshot)).toThrow('exact current prepared snapshot');
    expect(first.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(second.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(firstSnapshot.isCurrent()).toBe(true);
    expect(namespace.readReservationCounts()).toEqual(emptyCounts);

    authority.current = false;
    expect(() => first.commitPrepared(firstSnapshot)).toThrow('exact current prepared snapshot');
    expect(first.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(namespace.readReservationCounts()).toEqual(emptyCounts);
  });

  test('keeps a colliding prepared commit atomic and locally frozen', () => {
    const authority = new TestAllocationAuthority('collision');
    const namespace = new TemplateCompilerLiveAllocationNamespace(authority);
    const preparedLedger = preparedProductLedger(namespace, 'prepared', 'shared-product');
    const prepared = preparedLedger.prepareSnapshot();
    const eagerLedger = namespace.beginPhase('eager');
    eagerLedger.reserveProduct(
      'eager:root-template',
      'root-template',
      TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
      null,
      'shared-product',
    );
    eagerLedger.finish();
    const committedCounts = namespace.readReservationCounts();

    expect(() => preparedLedger.commitPrepared(prepared)).toThrow("already owns 'product:prepared:generated-template");
    expect(preparedLedger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(prepared.isCurrent()).toBe(true);
    expect(namespace.readReservationCounts()).toEqual(committedCounts);
    expect(() => preparedLedger.reserveProduct(
      'prepared:late-product',
      'late-product',
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      null,
      'prepared:late-product:product',
    )).toThrow('no longer mutable');
  });

  test('funds explicit projection, processContent, capture, and usage-containerless wire without committing', () => {
    const authority = new TestAllocationAuthority('neutral-he-funding');
    const namespace = new TemplateCompilerLiveAllocationNamespace(authority);
    const phaseKey = 'neutral-he-funding';
    const ledger = namespace.preparePhase(phaseKey);
    const emptyCounts = namespace.readReservationCounts();
    const node = new HtmlNodeReference(
      HtmlIrNodeKind.Element,
      authority.handles.product('host-node'),
      authority.handles.identity('host-node'),
      authority.handles.address('host-node'),
    );
    const retained = new HydrateElementProjectionContributor(
      node,
      'named',
      null,
      null,
      HydrateElementProjectionContributorDisposition.RetainedNode,
    );
    const discarded = new HydrateElementProjectionContributor(
      node,
      'default',
      null,
      null,
      HydrateElementProjectionContributorDisposition.DiscardedWhitespace,
    );
    const projectionPlan = new TestProjectionFundingPlan('named', retained);
    const site = {};
    const row = { stableSlotKey: 'row:host', site };
    const capture = effectiveCapture('row:host:capture:syntax');
    const metadata = new AuSlotProcessContentInstructionData('outlet', null);
    const draft = new TemplateCompilerHydrateElementFundingDraft(
      row,
      site,
      'row:host:hydrate-element',
      'occurrence:host',
      node,
      authority.handles.identity('owner'),
      'x-host',
      'x-host',
      null,
      projectionPlan,
      [discarded],
      metadata,
      [node],
      [],
      [capture],
      true,
      node.addressHandle,
    );

    const instructionAuthority = TemplateCompilerPreparedInstructionFundingAuthority.create(ledger, phaseKey);
    const funding = fundTemplateCompilerHydrateElements(instructionAuthority, [draft]);
    const head = funding.heads[0]!;

    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Mutable);
    expect(namespace.readReservationCounts()).toEqual(emptyCounts);
    expect(projectionPlan.instructionLocal)
      .toBe(`${phaseKey}:row:host:hydrate-element:instruction:hydrate-element:occurrence:host`);
    expect(head.instruction.projections).toBe(head.projectionFunding.definitions);
    expect(head.instruction.discardedProjectionContributors).toEqual([discarded]);
    expect(head.instruction.auSlotProcessContent).toBe(metadata);
    expect(head.instruction.auSlotProcessContentRemovedChildNodes).toEqual([node]);
    expect(head.instruction.containerless).toBe(true);
    expect(head.instructionOwnerIdentityHandle).toBe(draft.instructionOwnerIdentityHandle);
    expect(funding.productReservations.map((reservation) => reservation.role)).toEqual([
      TemplateCompilerLiveProductReservationRole.EffectiveAttributeSyntax,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
    ]);

    const prepared = ledger.prepareSnapshot();
    expect(namespace.readReservationCounts()).toEqual(emptyCounts);
    expect(prepared.instructionAllocations).toEqual(funding.instructionAllocations);
    expect(prepared.productReservations).toEqual(funding.productReservations);
    ledger.commitPrepared(prepared);
    expect(namespace.readReservationCounts()).toMatchObject({
      semanticSlots: 3,
      productHandles: 3,
      identityHandles: 3,
      addressHandles: 0,
    });
  });

  test('rejects incoherent projection, processContent, and capture funding drafts before allocation', () => {
    const authority = new TestAllocationAuthority('neutral-he-falsifiers');
    const node = new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null);
    const site = {};
    const row = { stableSlotKey: 'row:host', site };
    const discarded = new HydrateElementProjectionContributor(
      node,
      'named',
      null,
      null,
      HydrateElementProjectionContributorDisposition.DiscardedWhitespace,
    );
    const reservation = new TemplateCompilerLiveAllocationNamespace(authority)
      .preparePhase('projection-falsifier')
      .reserveProduct(
        'projection-falsifier:child',
        'child',
        TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
        null,
        'projection-falsifier:child',
      );
    const invalidDefinition = new HydrateElementProjectionDefinition(
      'named',
      new CompiledTemplateReference(reservation.productHandle, reservation.identityHandle),
      [discarded],
      null,
    );
    expect(() => TemplateCompilerHydrateElementProjectionFunding.create(
      [invalidDefinition],
      [reservation],
    )).toThrow('definition/reservation ownership');

    const validPlan = new TestProjectionFundingPlan('named', new HydrateElementProjectionContributor(
      node,
      'named',
      null,
      null,
      HydrateElementProjectionContributorDisposition.RetainedNode,
    ));
    const args = () => [
      row,
      site,
      'row:host:hydrate-element',
      'occurrence:host',
      node,
      authority.handles.identity('owner'),
      'x-host',
      'x-host',
      null,
      validPlan,
      [],
    ] as const;
    expect(() => new TemplateCompilerHydrateElementFundingDraft(
      ...args(),
      null,
      [node],
      [],
      [],
      false,
      null,
    )).toThrow('row, wire, or reservation authority');
    const duplicateCapture = effectiveCapture('duplicate');
    expect(() => new TemplateCompilerHydrateElementFundingDraft(
      ...args(),
      null,
      [],
      [],
      [duplicateCapture, duplicateCapture],
      false,
      null,
    )).toThrow('row, wire, or reservation authority');
  });

  test('shares one chronological prepared instruction authority across HTC and HE funding', () => {
    const allocationAuthority = new TestAllocationAuthority('shared-htc-he');
    const namespace = new TemplateCompilerLiveAllocationNamespace(allocationAuthority);
    const phaseKey = 'shared-htc-he';
    const ledger = namespace.preparePhase(phaseKey);
    const instructionAuthority = TemplateCompilerPreparedInstructionFundingAuthority.create(ledger, phaseKey);
    const emptyCounts = namespace.readReservationCounts();
    const node = new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null);
    const attribute = new HtmlAttributeReference(null, null, 'if.bind');
    const edge = {};
    const rowContext = {};
    const childContext = {};
    const tcRow = { stableSlotKey: 'row:tc', edge, rowContext, childContext };
    const childPlan = new TestChildFundingPlan(childContext);
    const tcDraft = new TemplateCompilerHydrateTemplateControllerFundingDraft(
      tcRow,
      edge,
      rowContext,
      childContext,
      'row:tc:instruction',
      'row:tc',
      node,
      attribute,
      'if',
      null,
      [],
      null,
      childPlan,
    );

    expect(fundTemplateCompilerHydrateTemplateControllers(instructionAuthority, []).edges).toEqual([]);
    const tcFunding = fundTemplateCompilerHydrateTemplateControllers(instructionAuthority, [tcDraft]);
    const heSite = {};
    const heRow = { stableSlotKey: 'row:he', site: heSite };
    const heDraft = new TemplateCompilerHydrateElementFundingDraft(
      heRow,
      heSite,
      'row:he:instruction',
      'occurrence:he',
      node,
      allocationAuthority.handles.identity('he-owner'),
      'x-he',
      'x-he',
      null,
      new TemplateCompilerEmptyHydrateElementProjectionFundingPlan(),
      [],
      null,
      [],
      [],
      [],
      false,
      null,
    );
    const heFunding = fundTemplateCompilerHydrateElements(instructionAuthority, [heDraft]);

    expect(namespace.readReservationCounts()).toEqual(emptyCounts);
    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Mutable);
    expect(childPlan.instructionLocal)
      .toBe(`${phaseKey}:row:tc:instruction:instruction:hydrate-template-controller:row:tc`);
    expect(tcFunding.edges[0]?.childFunding.context).toBe(childContext);
    expect(tcFunding.edges[0]?.instruction.childCompiledTemplate)
      .toBe(tcFunding.edges[0]?.childFunding.compiledTemplate);
    expect(tcFunding.edges[0]?.instructionOwnerIdentityHandle)
      .toBe(tcFunding.instructionAllocations[0]?.identityHandle);
    expect(instructionAuthority.readAllocations()).toEqual([
      tcFunding.instructionAllocations[0],
      heFunding.instructionAllocations[0],
    ]);
    expect(ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Mutable);
  });

  test('rejects foreign HTC row and child-context funding authority', () => {
    const allocationAuthority = new TestAllocationAuthority('htc-falsifiers');
    const namespace = new TemplateCompilerLiveAllocationNamespace(allocationAuthority);
    const ledger = namespace.preparePhase('htc-falsifiers');
    const instructionAuthority = TemplateCompilerPreparedInstructionFundingAuthority.create(
      ledger,
      'htc-falsifiers',
    );
    const edge = {};
    const rowContext = {};
    const childContext = {};
    const row = { stableSlotKey: 'row:tc', edge, rowContext, childContext };
    expect(() => new TemplateCompilerHydrateTemplateControllerFundingDraft(
      row,
      {},
      rowContext,
      childContext,
      'row:tc:instruction',
      'row:tc',
      new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null),
      new HtmlAttributeReference(null, null, 'if.bind'),
      'if',
      null,
      [],
      null,
      new TestChildFundingPlan(childContext),
    )).toThrow('row, edge, context');

    const draft = new TemplateCompilerHydrateTemplateControllerFundingDraft(
      row,
      edge,
      rowContext,
      childContext,
      'row:tc:instruction',
      'row:tc',
      new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null),
      new HtmlAttributeReference(null, null, 'if.bind'),
      'if',
      null,
      [],
      null,
      new TestChildFundingPlan({}),
    );
    expect(() => fundTemplateCompilerHydrateTemplateControllers(instructionAuthority, [draft]))
      .toThrow('foreign context funding');
    expect(namespace.readReservationCounts()).toMatchObject({ semanticSlots: 0 });
  });
});

class TestProjectionFundingPlan implements TemplateCompilerHydrateElementProjectionFundingPlan {
  instructionLocal: string | null = null;

  constructor(
    private readonly slotName: string,
    private readonly contributor: HydrateElementProjectionContributor,
  ) {}

  fund(
    instructionLocal: string,
    ledger: ReturnType<TemplateCompilerLiveAllocationNamespace['preparePhase']>,
  ): TemplateCompilerHydrateElementProjectionFunding {
    this.instructionLocal = instructionLocal;
    const local = `${instructionLocal}:projection:${this.slotName}`;
    const reservation = ledger.reserveProduct(
      local,
      `projection:${this.slotName}`,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      null,
      `${local}:compiled-template`,
    );
    return TemplateCompilerHydrateElementProjectionFunding.create(
      [new HydrateElementProjectionDefinition(
        this.slotName,
        new CompiledTemplateReference(reservation.productHandle, reservation.identityHandle),
        [this.contributor],
        null,
      )],
      [reservation],
    );
  }
}

class TestChildFundingPlan implements TemplateCompilerHydrateTemplateControllerChildFundingPlan {
  instructionLocal: string | null = null;

  constructor(private readonly context: object) {}

  fund(
    instructionLocal: string,
    ledger: ReturnType<TemplateCompilerLiveAllocationNamespace['preparePhase']>,
  ): TemplateCompilerHydrateTemplateControllerChildFunding {
    this.instructionLocal = instructionLocal;
    const local = `${instructionLocal}:child-compiled-template`;
    const reservation = ledger.reserveProduct(
      `${instructionLocal}:child`,
      'child-compiled-template',
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      null,
      local,
    );
    return TemplateCompilerHydrateTemplateControllerChildFunding.create(
      instructionLocal,
      this.context,
      reservation,
      new CompiledTemplateReference(reservation.productHandle, reservation.identityHandle),
    );
  }
}

function effectiveCapture(stableSlotKey: string): TemplateCompilerCapturedSyntaxRowDraft {
  return {
    stableSlotKey,
    capture: { syntax: { sourceAddressHandle: null } },
    decisionKind: TemplateCompilerCaptureSyntaxDecisionKind.EffectiveSyntaxRequired,
    authoredSyntax: null,
    instructionAttribute: null,
  } as unknown as TemplateCompilerCapturedSyntaxRowDraft;
}

class TestAllocationAuthority implements TemplateCompilerLiveAllocationAuthority {
  readonly handles: KernelHandleFactory;
  current = true;

  constructor(local: string) {
    this.handles = new KernelHandleFactory(`contract:live-prepared-allocation:${local}`);
  }

  isCurrent(): boolean {
    return this.current;
  }
}

function preparedProductLedger(
  namespace: TemplateCompilerLiveAllocationNamespace,
  rootSiteKey: string,
  allocationLocal = `${rootSiteKey}:generated-template:product`,
) {
  const ledger = namespace.preparePhase(rootSiteKey);
  ledger.reserveProduct(
    `${rootSiteKey}:generated-template`,
    'generated-template',
    TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
    null,
    allocationLocal,
  );
  return ledger;
}
