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

/** Generation-bound owner of every allocation phase in one compiler candidate. */
export interface TemplateCompilerLiveAllocationAuthority {
  readonly handles: KernelHandleFactory;
  isCurrent(): boolean;
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

  beginPhase(rootSiteKey: string): TemplateCompilerLiveAllocationLedger {
    if (!this.isCurrent()) {
      throw new Error('Live compiler allocation namespace is no longer current.');
    }
    return new TemplateCompilerLiveAllocationLedger(
      liveAllocationLedgerAuthority,
      this,
      rootSiteKey,
    );
  }

  reserveInstruction(authority: object, allocation: TemplateCompilerLiveInstructionAllocation): void {
    this.reserve(
      authority,
      `instruction:${allocation.siteKey}:${allocation.local}`,
      allocation.productHandle,
      allocation.identityHandle,
      null,
    );
  }

  reserveExpression(authority: object, allocation: TemplateCompilerLiveExpressionAllocation): void {
    this.reserve(
      authority,
      `expression:${allocation.siteKey}:${allocation.local}`,
      allocation.productHandle,
      null,
      null,
    );
  }

  reserveSource(authority: object, allocation: TemplateCompilerLiveSourceAllocation): void {
    this.reserve(
      authority,
      `source:${allocation.siteKey}:${allocation.local}`,
      null,
      null,
      allocation.addressHandle,
    );
  }

  private reserve(
    authority: object,
    semanticSlot: string,
    productHandle: ProductHandle | null,
    identityHandle: IdentityHandle | null,
    addressHandle: AddressHandle | null,
  ): void {
    if (
      authority !== liveAllocationLedgerAuthority
      || this.semanticSlots.has(semanticSlot)
      || (productHandle != null && this.productHandles.has(productHandle))
      || (identityHandle != null && this.identityHandles.has(identityHandle))
      || (addressHandle != null && this.addressHandles.has(addressHandle))
    ) {
      throw new Error(`Live compiler allocation namespace already owns '${semanticSlot}'.`);
    }
    this.semanticSlots.add(semanticSlot);
    if (productHandle != null) this.productHandles.add(productHandle);
    if (identityHandle != null) this.identityHandles.add(identityHandle);
    if (addressHandle != null) this.addressHandles.add(addressHandle);
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
  ) {
    const productHandles = [
      ...instructionAllocations.map((entry) => entry.productHandle),
      ...expressionAllocations.map((entry) => entry.productHandle),
    ];
    this.state = instructionAllocations.every((entry) => entry.instruction != null)
      && expressionAllocations.every((entry) => entry.compilerRead != null && entry.result != null)
      && sourceAllocations.every((entry) => entry.source != null)
      ? TemplateCompilerLiveAllocationSnapshotState.Complete
      : TemplateCompilerLiveAllocationSnapshotState.Open;
    if (
      authority !== liveAllocationSnapshotAuthority
      || ledger.rootSiteKey.length === 0
      || [...instructionAllocations, ...expressionAllocations, ...sourceAllocations].some((entry) =>
        !entry.siteKey.startsWith(`${ledger.rootSiteKey}:`)
      )
      || new Set(productHandles).size !== productHandles.length
      || new Set(instructionAllocations.map((entry) => entry.identityHandle)).size !== instructionAllocations.length
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
  private readonly instructionsByProduct = new Map<ProductHandle, TemplateCompilerLiveInstructionAllocation>();
  private readonly expressionsByProduct = new Map<ProductHandle, TemplateCompilerLiveExpressionAllocation>();
  private readonly sourcesByAddress = new Map<AddressHandle, TemplateCompilerLiveSourceAllocation>();
  private finished: TemplateCompilerLiveAllocationSnapshot | null = null;

  constructor(
    authority: object,
    readonly namespace: TemplateCompilerLiveAllocationNamespace,
    readonly rootSiteKey: string,
  ) {
    if (authority !== liveAllocationLedgerAuthority || rootSiteKey.length === 0) {
      throw new Error('Live compiler allocation phase requires namespace-owned non-empty authority.');
    }
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
    this.namespace.reserveInstruction(liveAllocationLedgerAuthority, allocation);
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
    this.namespace.reserveExpression(liveAllocationLedgerAuthority, allocation);
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
    this.namespace.reserveSource(liveAllocationLedgerAuthority, allocation);
    this.sourceAllocations.push(allocation);
    this.sourcesByAddress.set(allocation.addressHandle, allocation);
    return allocation;
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

  finish(): TemplateCompilerLiveAllocationSnapshot {
    return this.finished ??= new TemplateCompilerLiveAllocationSnapshot(
      liveAllocationSnapshotAuthority,
      this,
      this.instructionAllocations,
      this.expressionAllocations,
      this.sourceAllocations,
    );
  }

  private requireMutable(): void {
    if (this.finished != null) throw new Error('Live compiler allocation ledger is already finished.');
  }
}
