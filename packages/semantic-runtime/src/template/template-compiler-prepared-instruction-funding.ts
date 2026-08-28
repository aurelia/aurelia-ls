import type { TemplateInstruction } from './instruction-ir.js';
import {
  TemplateCompilerInstructionStagingAllocation,
  type TemplateCompilerInstructionStagingAllocationRequest,
  type TemplateCompilerInstructionStagingAuthority,
} from './template-compiler-instruction-staging.js';
import {
  TemplateCompilerLiveAllocationLedgerState,
  type TemplateCompilerLiveAllocationLedger,
  type TemplateCompilerLiveInstructionAllocation,
} from './template-compiler-live-allocation.js';

const preparedInstructionFundingAuthority = {};

/** Shared instruction allocator over one mutable namespace-invisible phase. */
export class TemplateCompilerPreparedInstructionFundingAuthority
  implements TemplateCompilerInstructionStagingAuthority {
  static create(
    ledger: TemplateCompilerLiveAllocationLedger,
    phaseKey: string,
  ): TemplateCompilerPreparedInstructionFundingAuthority {
    return new TemplateCompilerPreparedInstructionFundingAuthority(
      preparedInstructionFundingAuthority,
      ledger,
      phaseKey,
    );
  }

  readonly #authority: object;
  readonly #allocations: TemplateCompilerLiveInstructionAllocation[] = [];
  readonly #allocationByInstruction = new Map<TemplateInstruction, TemplateCompilerLiveInstructionAllocation>();

  private constructor(
    authority: object,
    readonly ledger: TemplateCompilerLiveAllocationLedger,
    readonly phaseKey: string,
  ) {
    if (
      authority !== preparedInstructionFundingAuthority
      || !ledger.isPreparedPhase
      || ledger.state !== TemplateCompilerLiveAllocationLedgerState.Mutable
      || ledger.rootSiteKey !== phaseKey
      || phaseKey.length === 0
    ) {
      throw new Error('Prepared instruction funding requires one exact mutable namespace-invisible phase.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === preparedInstructionFundingAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.ledger.isPreparedPhase
      && this.ledger.state === TemplateCompilerLiveAllocationLedgerState.Mutable
      && this.ledger.rootSiteKey === this.phaseKey;
  }

  readAllocations(): readonly TemplateCompilerLiveInstructionAllocation[] {
    return this.#allocations;
  }

  create<TInstruction extends TemplateInstruction>(
    request: TemplateCompilerInstructionStagingAllocationRequest,
    factory: (allocation: TemplateCompilerInstructionStagingAllocation) => TInstruction,
  ): TInstruction {
    if (!this.isCurrent()) throw new Error('Prepared instruction funding authority is no longer current.');
    const siteKey = `${this.phaseKey}:${request.siteKey}`;
    const instructionLocal = `${siteKey}:instruction:${request.local}`;
    const retained = this.ledger.allocateInstruction(
      siteKey,
      request.local,
      request.kind,
      request.sourceAddressHandle,
      instructionLocal,
    );
    const instruction = factory(new TemplateCompilerInstructionStagingAllocation(
      retained.productHandle,
      retained.identityHandle,
      retained.instructionLocal,
    ));
    this.ledger.bindInstruction(instruction);
    this.#allocations.push(retained);
    this.#allocationByInstruction.set(instruction, retained);
    return instruction;
  }

  allocationFor(instruction: TemplateInstruction): TemplateCompilerLiveInstructionAllocation {
    const allocation = this.#allocationByInstruction.get(instruction) ?? null;
    if (allocation == null) throw new Error('Instruction lost its prepared funding allocation.');
    return allocation;
  }
}
