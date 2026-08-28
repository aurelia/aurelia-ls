import { describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { TemplateInstructionKind } from '../src/template/instruction-ir.js';
import {
  TemplateCompilerLiveAllocationLedgerState,
  TemplateCompilerLiveAllocationNamespace,
  TemplateCompilerLiveAllocationSnapshotState,
  TemplateCompilerLiveProductReservationRole,
  type TemplateCompilerLiveAllocationAuthority,
} from '../src/template/template-compiler-live-allocation.js';

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
});

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
