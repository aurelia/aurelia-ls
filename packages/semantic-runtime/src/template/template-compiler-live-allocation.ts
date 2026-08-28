import type { ExpressionType } from '../expression/ast.js';
import type { ExpressionParseResult } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import type {
  AddressHandle,
  IdentityHandle,
  KernelHandleFactory,
  ProductHandle,
} from '../kernel/handles.js';
import type { TemplateCompilerReadObservation } from './compiler-read-view.js';
import type { TemplateInstruction, TemplateInstructionKind } from './instruction-ir.js';
import type { TemplateCompilerTextHoleSourceRange } from './template-compiler-text-instruction-staging.js';

const liveAllocationSnapshotAuthority = {};
const liveAllocationLedgerAuthority = {};

export const enum TemplateCompilerLiveAllocationSnapshotState {
  Complete = 'complete',
  Open = 'open',
}

export const enum TemplateCompilerLiveSourceAllocationRole {
  TextInterpolationHole = 'text-interpolation-hole',
}

export const enum TemplateCompilerLiveProductReservationRole {
  RootCompiledTemplate = 'root-compiled-template',
  EffectiveAttributeSyntax = 'effective-attribute-syntax',
}

/** Forward product/identity funding; publication and product-detail binding remain downstream. */
export class TemplateCompilerLiveProductReservation {
  constructor(
    readonly siteKey: string,
    readonly local: string,
    readonly role: TemplateCompilerLiveProductReservationRole,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

/** Generation-bound owner of every allocation phase in one compiler candidate. */
export interface TemplateCompilerLiveAllocationAuthority {
  readonly handles: KernelHandleFactory;
  isCurrent(): boolean;
}

export class TemplateCompilerLiveAllocationNamespaceCounts {
  constructor(
    readonly semanticSlots: number,
    readonly productHandles: number,
    readonly identityHandles: number,
    readonly addressHandles: number,
  ) {}
}

interface TemplateCompilerLiveReservationProposal {
  readonly semanticSlot: string;
  readonly productHandle: ProductHandle | null;
  readonly identityHandle: IdentityHandle | null;
  readonly addressHandle: AddressHandle | null;
}

export class TemplateCompilerLiveAllocationNamespace {
  readonly handles: KernelHandleFactory;
  private readonly productHandles = new Set<ProductHandle>();
  private readonly identityHandles = new Set<IdentityHandle>();
  private readonly addressHandles = new Set<AddressHandle>();
  private readonly semanticSlots = new Set<string>();

  constructor(readonly authority: TemplateCompilerLiveAllocationAuthority) {
    if (!authority.isCurrent()) {
      throw new Error('Live compiler allocation namespace requires a current publication authority.');
    }
    this.handles = authority.handles;
  }

  isCurrent(): boolean {
    return this.authority.isCurrent();
  }

  readReservationCounts(): TemplateCompilerLiveAllocationNamespaceCounts {
    return new TemplateCompilerLiveAllocationNamespaceCounts(
      this.semanticSlots.size,
      this.productHandles.size,
      this.identityHandles.size,
      this.addressHandles.size,
    );
  }

  beginPhase(rootSiteKey: string): TemplateCompilerLiveAllocationLedger {
    if (!this.isCurrent()) {
      throw new Error('Live compiler allocation namespace is no longer current.');
    }
    return new TemplateCompilerLiveAllocationLedger(
      liveAllocationLedgerAuthority,
      this,
      rootSiteKey,
      false,
    );
  }

  /** Create a phase whose handles become namespace-visible only through one validated commit. */
  preparePhase(rootSiteKey: string): TemplateCompilerLiveAllocationLedger {
    if (!this.isCurrent()) {
      throw new Error('Live compiler allocation namespace is no longer current.');
    }
    return new TemplateCompilerLiveAllocationLedger(
      liveAllocationLedgerAuthority,
      this,
      rootSiteKey,
      true,
    );
  }

  reserveInstruction(authority: object, allocation: TemplateCompilerLiveInstructionAllocation): void {
    this.reserve(authority, {
      semanticSlot: `instruction:${allocation.siteKey}:${allocation.local}`,
      productHandle: allocation.productHandle,
      identityHandle: allocation.identityHandle,
      addressHandle: null,
    });
  }

  reserveExpression(authority: object, allocation: TemplateCompilerLiveExpressionAllocation): void {
    this.reserve(authority, {
      semanticSlot: `expression:${allocation.siteKey}:${allocation.local}`,
      productHandle: allocation.productHandle,
      identityHandle: null,
      addressHandle: null,
    });
  }

  reserveSource(authority: object, allocation: TemplateCompilerLiveSourceAllocation): void {
    this.reserve(authority, {
      semanticSlot: `source:${allocation.siteKey}:${allocation.local}`,
      productHandle: null,
      identityHandle: null,
      addressHandle: allocation.addressHandle,
    });
  }

  reserveProduct(authority: object, reservation: TemplateCompilerLiveProductReservation): void {
    this.reserve(authority, {
      semanticSlot: `product:${reservation.siteKey}:${reservation.local}:${reservation.role}`,
      productHandle: reservation.productHandle,
      identityHandle: reservation.identityHandle,
      addressHandle: null,
    });
  }

  private reserve(
    authority: object,
    proposal: TemplateCompilerLiveReservationProposal,
  ): void {
    this.commitPrepared(authority, [proposal]);
  }

  /** Atomically admit a fully prepared phase after proving all within-batch and namespace uniqueness. */
  commitPrepared(
    authority: object,
    proposals: readonly TemplateCompilerLiveReservationProposal[],
  ): void {
    const localSemanticSlots = new Set<string>();
    const localProductHandles = new Set<ProductHandle>();
    const localIdentityHandles = new Set<IdentityHandle>();
    const localAddressHandles = new Set<AddressHandle>();
    if (
      authority !== liveAllocationLedgerAuthority
      || !this.isCurrent()
      || proposals.length === 0
    ) {
      throw new Error('Live compiler prepared allocation batch is foreign, stale, or empty.');
    }
    for (const proposal of proposals) {
      if (
        proposal.semanticSlot.length === 0
        || this.semanticSlots.has(proposal.semanticSlot)
        || localSemanticSlots.has(proposal.semanticSlot)
        || (proposal.productHandle != null && (
          this.productHandles.has(proposal.productHandle)
          || localProductHandles.has(proposal.productHandle)
        ))
        || (proposal.identityHandle != null && (
          this.identityHandles.has(proposal.identityHandle)
          || localIdentityHandles.has(proposal.identityHandle)
        ))
        || (proposal.addressHandle != null && (
          this.addressHandles.has(proposal.addressHandle)
          || localAddressHandles.has(proposal.addressHandle)
        ))
      ) {
        throw new Error(`Live compiler allocation namespace already owns '${proposal.semanticSlot}'.`);
      }
      localSemanticSlots.add(proposal.semanticSlot);
      if (proposal.productHandle != null) localProductHandles.add(proposal.productHandle);
      if (proposal.identityHandle != null) localIdentityHandles.add(proposal.identityHandle);
      if (proposal.addressHandle != null) localAddressHandles.add(proposal.addressHandle);
    }
    for (const proposal of proposals) {
      this.semanticSlots.add(proposal.semanticSlot);
      if (proposal.productHandle != null) this.productHandles.add(proposal.productHandle);
      if (proposal.identityHandle != null) this.identityHandles.add(proposal.identityHandle);
      if (proposal.addressHandle != null) this.addressHandles.add(proposal.addressHandle);
    }
  }
}

/** Stable semantic slot and candidate-local handles for one reached instruction. */
export class TemplateCompilerLiveInstructionAllocation {
  private boundInstruction: TemplateInstruction | null = null;

  constructor(
    readonly siteKey: string,
    readonly local: string,
    readonly instructionKind: TemplateInstructionKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionLocal: string,
  ) {}

  get instruction(): TemplateInstruction | null {
    return this.boundInstruction;
  }

  bind(authority: object, instruction: TemplateInstruction): void {
    if (
      authority !== liveAllocationLedgerAuthority
      || instruction.productHandle !== this.productHandle
      || instruction.identityHandle !== this.identityHandle
      || instruction.instructionKind !== this.instructionKind
      || instruction.sourceAddressHandle !== this.sourceAddressHandle
      || (this.boundInstruction != null && this.boundInstruction !== instruction)
    ) {
      throw new Error(`Live instruction allocation '${this.instructionLocal}' cannot bind a foreign instruction.`);
    }
    this.boundInstruction = instruction;
  }
}

/** Stable semantic slot and candidate-local product for one reached expression parser call. */
export class TemplateCompilerLiveExpressionAllocation {
  private boundRead: TemplateCompilerReadObservation | null = null;
  private boundResult: ExpressionParseResult | null = null;
  private boundSourceSpan: SourceSpan | null = null;

  constructor(
    readonly siteKey: string,
    readonly local: string,
    readonly entryFamily: ExpressionType,
    readonly expression: string,
    readonly ordinal: number,
    readonly productHandle: ProductHandle,
  ) {}

  get compilerRead(): TemplateCompilerReadObservation | null {
    return this.boundRead;
  }

  get result(): ExpressionParseResult | null {
    return this.boundResult;
  }

  get sourceSpan(): SourceSpan | null {
    return this.boundSourceSpan;
  }

  bind(
    authority: object,
    read: TemplateCompilerReadObservation,
    result: ExpressionParseResult,
    sourceSpan: SourceSpan | null,
  ): void {
    if (
      authority !== liveAllocationLedgerAuthority
      || (this.boundRead != null && this.boundRead !== read)
      || (this.boundResult != null && this.boundResult !== result)
      || (this.boundRead != null && !sameSourceSpan(this.boundSourceSpan, sourceSpan))
    ) {
      throw new Error(`Live expression allocation '${this.local}' cannot bind another parser result.`);
    }
    this.boundRead = read;
    this.boundResult = result;
    this.boundSourceSpan = sourceSpan;
  }
}

function sameSourceSpan(left: SourceSpan | null, right: SourceSpan | null): boolean {
  return left === right || (
    left != null
    && right != null
    && left.start === right.start
    && left.end === right.end
    && left.file?.id === right.file?.id
  );
}

/** Candidate-local source address whose semantic slot and exact bounds must survive until publication. */
export class TemplateCompilerLiveSourceAllocation {
  private boundSource: TemplateCompilerTextHoleSourceRange | null = null;

  constructor(
    readonly siteKey: string,
    readonly local: string,
    readonly role: TemplateCompilerLiveSourceAllocationRole,
    readonly expressionChainIndex: number,
    readonly expressionSpan: SourceSpan,
    readonly carrierSourceAddressHandle: AddressHandle | null,
    readonly addressHandle: AddressHandle,
  ) {}

  get source(): TemplateCompilerTextHoleSourceRange | null {
    return this.boundSource;
  }

  bind(authority: object, source: TemplateCompilerTextHoleSourceRange): void {
    if (
      authority !== liveAllocationLedgerAuthority
      || source.expressionChainIndex !== this.expressionChainIndex
      || source.expressionSpan !== this.expressionSpan
      || source.carrierSourceAddressHandle !== this.carrierSourceAddressHandle
      || source.sourceAddressHandle !== this.addressHandle
      || (this.boundSource != null && this.boundSource !== source)
    ) {
      throw new Error(`Live source allocation '${this.local}' cannot bind a foreign source range.`);
    }
    this.boundSource = source;
  }
}

/**
 * Immutable allocation inventory at one cursor terminal boundary.
 *
 * Arrays preserve within-kind allocation chronology for audit only. Row/site tokens own semantic and publication
 * order; consumers must never publish by iterating this braid.
 */
export class TemplateCompilerLiveAllocationSnapshot {
  readonly #authority: object;
  readonly state: TemplateCompilerLiveAllocationSnapshotState;

  constructor(
    authority: object,
    readonly ledger: TemplateCompilerLiveAllocationLedger,
    readonly instructionAllocations: readonly TemplateCompilerLiveInstructionAllocation[],
    readonly expressionAllocations: readonly TemplateCompilerLiveExpressionAllocation[],
    readonly sourceAllocations: readonly TemplateCompilerLiveSourceAllocation[],
    readonly productReservations: readonly TemplateCompilerLiveProductReservation[],
  ) {
    const productHandles = [
      ...instructionAllocations.map((entry) => entry.productHandle),
      ...expressionAllocations.map((entry) => entry.productHandle),
      ...productReservations.map((entry) => entry.productHandle),
    ];
    this.state = instructionAllocations.every((entry) => entry.instruction != null)
      && expressionAllocations.every((entry) => entry.compilerRead != null && entry.result != null)
      && sourceAllocations.every((entry) => entry.source != null)
      ? TemplateCompilerLiveAllocationSnapshotState.Complete
      : TemplateCompilerLiveAllocationSnapshotState.Open;
    if (
      authority !== liveAllocationSnapshotAuthority
      || ledger.rootSiteKey.length === 0
      || [...instructionAllocations, ...expressionAllocations, ...sourceAllocations, ...productReservations].some((entry) =>
        !entry.siteKey.startsWith(`${ledger.rootSiteKey}:`)
      )
      || new Set(productHandles).size !== productHandles.length
      || new Set([
        ...instructionAllocations.map((entry) => entry.identityHandle),
        ...productReservations.map((entry) => entry.identityHandle),
      ]).size !== instructionAllocations.length + productReservations.length
      || new Set(sourceAllocations.map((entry) => entry.addressHandle)).size !== sourceAllocations.length
    ) {
      throw new Error('Live allocation snapshot lost unique candidate-local handle authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === liveAllocationSnapshotAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.ledger.namespace.isCurrent();
  }
}

/**
 * Cursor-owned allocation namespace.
 *
 * Execution order and durable publication order are independent. This ledger preserves the original semantic slots
 * and exact allocated objects so a later publisher never parses compact handles or replays compiler decisions.
 */
export class TemplateCompilerLiveAllocationLedger {
  private readonly instructionAllocations: TemplateCompilerLiveInstructionAllocation[] = [];
  private readonly expressionAllocations: TemplateCompilerLiveExpressionAllocation[] = [];
  private readonly sourceAllocations: TemplateCompilerLiveSourceAllocation[] = [];
  private readonly productReservations: TemplateCompilerLiveProductReservation[] = [];
  private readonly instructionsByProduct = new Map<ProductHandle, TemplateCompilerLiveInstructionAllocation>();
  private readonly expressionsByProduct = new Map<ProductHandle, TemplateCompilerLiveExpressionAllocation>();
  private readonly sourcesByAddress = new Map<AddressHandle, TemplateCompilerLiveSourceAllocation>();
  private finished: TemplateCompilerLiveAllocationSnapshot | null = null;
  private committed: boolean;

  constructor(
    authority: object,
    readonly namespace: TemplateCompilerLiveAllocationNamespace,
    readonly rootSiteKey: string,
    private readonly prepared: boolean,
  ) {
    if (authority !== liveAllocationLedgerAuthority || rootSiteKey.length === 0) {
      throw new Error('Live compiler allocation phase requires namespace-owned non-empty authority.');
    }
    this.committed = !prepared;
  }

  get handles(): KernelHandleFactory {
    return this.namespace.handles;
  }

  allocateInstruction(
    siteKey: string,
    local: string,
    instructionKind: TemplateInstructionKind,
    sourceAddressHandle: AddressHandle | null,
    instructionLocal: string,
  ): TemplateCompilerLiveInstructionAllocation {
    this.requireMutable();
    const allocation = new TemplateCompilerLiveInstructionAllocation(
      siteKey,
      local,
      instructionKind,
      sourceAddressHandle,
      this.handles.product(instructionLocal),
      this.handles.identity(instructionLocal),
      instructionLocal,
    );
    if (this.instructionsByProduct.has(allocation.productHandle)) {
      throw new Error(`Live instruction slot '${instructionLocal}' was allocated more than once.`);
    }
    if (!this.prepared) this.namespace.reserveInstruction(liveAllocationLedgerAuthority, allocation);
    this.instructionAllocations.push(allocation);
    this.instructionsByProduct.set(allocation.productHandle, allocation);
    return allocation;
  }

  allocateExpression(
    siteKey: string,
    local: string,
    entryFamily: ExpressionType,
    expression: string,
    ordinal: number,
  ): TemplateCompilerLiveExpressionAllocation {
    this.requireMutable();
    const productHandle = this.handles.product(local);
    const allocation = new TemplateCompilerLiveExpressionAllocation(
      siteKey,
      local,
      entryFamily,
      expression,
      ordinal,
      productHandle,
    );
    if (this.expressionsByProduct.has(productHandle)) {
      throw new Error(`Live expression slot '${local}' was allocated more than once.`);
    }
    if (!this.prepared) this.namespace.reserveExpression(liveAllocationLedgerAuthority, allocation);
    this.expressionAllocations.push(allocation);
    this.expressionsByProduct.set(productHandle, allocation);
    return allocation;
  }

  allocateSource(
    siteKey: string,
    local: string,
    role: TemplateCompilerLiveSourceAllocationRole,
    expressionChainIndex: number,
    expressionSpan: SourceSpan,
    carrierSourceAddressHandle: AddressHandle | null,
  ): TemplateCompilerLiveSourceAllocation {
    this.requireMutable();
    const allocation = new TemplateCompilerLiveSourceAllocation(
      siteKey,
      local,
      role,
      expressionChainIndex,
      expressionSpan,
      carrierSourceAddressHandle,
      this.handles.address(local),
    );
    if (this.sourcesByAddress.has(allocation.addressHandle)) {
      throw new Error(`Live source slot '${local}' was allocated more than once.`);
    }
    if (!this.prepared) this.namespace.reserveSource(liveAllocationLedgerAuthority, allocation);
    this.sourceAllocations.push(allocation);
    this.sourcesByAddress.set(allocation.addressHandle, allocation);
    return allocation;
  }

  reserveProduct(
    siteKey: string,
    local: string,
    role: TemplateCompilerLiveProductReservationRole,
    sourceAddressHandle: AddressHandle | null,
    allocationLocal: string,
  ): TemplateCompilerLiveProductReservation {
    this.requireMutable();
    const reservation = new TemplateCompilerLiveProductReservation(
      siteKey,
      local,
      role,
      sourceAddressHandle,
      this.handles.product(allocationLocal),
      this.handles.identity(allocationLocal),
    );
    if (!this.prepared) this.namespace.reserveProduct(liveAllocationLedgerAuthority, reservation);
    this.productReservations.push(reservation);
    return reservation;
  }

  bindSource(source: TemplateCompilerTextHoleSourceRange): void {
    this.requireMutable();
    const addressHandle = source.sourceAddressHandle;
    const allocation = addressHandle == null ? null : this.sourcesByAddress.get(addressHandle) ?? null;
    if (allocation == null) {
      throw new Error('Live text-hole source has no cursor allocation slot.');
    }
    allocation.bind(liveAllocationLedgerAuthority, source);
  }

  bindInstruction(instruction: TemplateInstruction): void {
    this.requireMutable();
    const allocation = this.instructionsByProduct.get(instruction.productHandle) ?? null;
    if (allocation == null) {
      throw new Error(`Live instruction '${instruction.productHandle}' has no cursor allocation slot.`);
    }
    allocation.bind(liveAllocationLedgerAuthority, instruction);
  }

  bindExpression(
    productHandle: ProductHandle,
    read: TemplateCompilerReadObservation,
    result: ExpressionParseResult,
    sourceSpan: SourceSpan | null,
  ): void {
    this.requireMutable();
    const allocation = this.expressionsByProduct.get(productHandle) ?? null;
    if (allocation == null) {
      throw new Error(`Live expression '${productHandle}' has no cursor allocation slot.`);
    }
    allocation.bind(liveAllocationLedgerAuthority, read, result, sourceSpan);
  }

  /** Atomically expose one prepared phase after every object has been constructed and bound. */
  commitPrepared(): TemplateCompilerLiveAllocationSnapshot {
    this.requireMutable();
    if (!this.prepared || this.committed) {
      throw new Error('Live compiler allocation phase is not an uncommitted prepared phase.');
    }
    const snapshot = new TemplateCompilerLiveAllocationSnapshot(
      liveAllocationSnapshotAuthority,
      this,
      this.instructionAllocations,
      this.expressionAllocations,
      this.sourceAllocations,
      this.productReservations,
    );
    this.namespace.commitPrepared(liveAllocationLedgerAuthority, [
      ...this.instructionAllocations.map((allocation): TemplateCompilerLiveReservationProposal => ({
        semanticSlot: `instruction:${allocation.siteKey}:${allocation.local}`,
        productHandle: allocation.productHandle,
        identityHandle: allocation.identityHandle,
        addressHandle: null,
      })),
      ...this.expressionAllocations.map((allocation): TemplateCompilerLiveReservationProposal => ({
        semanticSlot: `expression:${allocation.siteKey}:${allocation.local}`,
        productHandle: allocation.productHandle,
        identityHandle: null,
        addressHandle: null,
      })),
      ...this.sourceAllocations.map((allocation): TemplateCompilerLiveReservationProposal => ({
        semanticSlot: `source:${allocation.siteKey}:${allocation.local}`,
        productHandle: null,
        identityHandle: null,
        addressHandle: allocation.addressHandle,
      })),
      ...this.productReservations.map((reservation): TemplateCompilerLiveReservationProposal => ({
        semanticSlot: `product:${reservation.siteKey}:${reservation.local}:${reservation.role}`,
        productHandle: reservation.productHandle,
        identityHandle: reservation.identityHandle,
        addressHandle: null,
      })),
    ]);
    this.committed = true;
    this.finished = snapshot;
    return snapshot;
  }

  finish(): TemplateCompilerLiveAllocationSnapshot {
    if (!this.committed) {
      throw new Error('Prepared live compiler allocation phase must commit before finishing.');
    }
    return this.finished ??= new TemplateCompilerLiveAllocationSnapshot(
      liveAllocationSnapshotAuthority,
      this,
      this.instructionAllocations,
      this.expressionAllocations,
      this.sourceAllocations,
      this.productReservations,
    );
  }

  private requireMutable(): void {
    if (this.finished != null) throw new Error('Live compiler allocation ledger is already finished.');
  }
}
