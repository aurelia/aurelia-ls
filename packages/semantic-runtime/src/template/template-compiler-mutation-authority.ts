import type { ClaimEndpointHandle } from '../kernel/claim.js';
import {
  TemplateCompilerOccurrenceGeneration,
  type TemplateCompilerGeneratedOccurrenceRole,
  type TemplateCompilerOccurrenceForest,
} from './template-compiler-occurrence.js';

const mutationAuthoritiesByForest = new WeakMap<
  TemplateCompilerOccurrenceForest,
  TemplateCompilerForestMutationAuthority
>();

export const enum TemplateCompilerCompletedMutationBatchKind {
  Execution = 'execution',
  NormalizedReplay = 'normalized-replay',
}

/** Pending two-phase mutation boundary opened by `beginOperation`. */
export class TemplateCompilerPendingMutationBatch {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly contextKey: string,
    readonly operationKey: string,
    readonly causeHandles: readonly ClaimEndpointHandle[],
    /** Exact pending mutation overlay that owns this batch. */
    readonly sourceBatch: object,
    readonly initialForestMutationRevision: number,
  ) {
    this.#authority = authority;
  }

  isOwnedBy(authority: object): boolean {
    return this.#authority === authority;
  }
}

/** Completed mutation boundary that can durably authorize generated occurrence inventory. */
export class TemplateCompilerCompletedMutationBatch {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly batchKind: TemplateCompilerCompletedMutationBatchKind,
    readonly contextKey: string,
    readonly operationKey: string,
    readonly causeHandles: readonly ClaimEndpointHandle[],
    readonly sourceBatch: object,
  ) {
    this.#authority = authority;
  }

  isOwnedBy(authority: object): boolean {
    return this.#authority === authority;
  }
}

class TemplateCompilerPendingGenerationRegistration {
  constructor(
    readonly generation: TemplateCompilerOccurrenceGeneration,
    readonly batch: TemplateCompilerPendingMutationBatch,
    readonly tuple: string,
  ) {}
}

class TemplateCompilerGenerationRegistration {
  constructor(
    readonly generation: TemplateCompilerOccurrenceGeneration,
    readonly batch: TemplateCompilerCompletedMutationBatch,
  ) {}
}

/**
 * Forest-first owner for mutation batches and the compiler generations they authorize.
 *
 * Execution mode is strict: generation is reserved during a pending attempt and becomes durable only when that exact
 * batch completes. Open/Abrupt may discard reservations only while the forest mutation epoch still matches begin; full
 * topology rollback remains a later boundary. Direct structural replay uses explicit completed compatibility batches.
 */
export class TemplateCompilerForestMutationAuthority {
  static createForExecution(
    forest: TemplateCompilerOccurrenceForest,
    executionOwner: object,
  ): TemplateCompilerForestMutationAuthority {
    return TemplateCompilerForestMutationAuthority.create(forest, false, executionOwner);
  }

  static createForNormalizedReplay(
    forest: TemplateCompilerOccurrenceForest,
  ): TemplateCompilerForestMutationAuthority {
    return TemplateCompilerForestMutationAuthority.create(forest, true, null);
  }

  private static create(
    forest: TemplateCompilerOccurrenceForest,
    normalizedReplay: boolean,
    executionOwner: object | null,
  ): TemplateCompilerForestMutationAuthority {
    if (mutationAuthoritiesByForest.has(forest)) {
      throw new Error('Compiler occurrence forest already owns a mutation/generation authority.');
    }
    const authority = new TemplateCompilerForestMutationAuthority(
      forest,
      normalizedReplay,
      executionOwner,
    );
    mutationAuthoritiesByForest.set(forest, authority);
    return authority;
  }

  readonly #generationAuthority = {};
  readonly #pendingBatchesByOperation = new Map<string, TemplateCompilerPendingMutationBatch>();
  readonly #completedBatchesByOperation = new Map<string, TemplateCompilerCompletedMutationBatch>();
  readonly #pendingGenerationRegistrations = new Map<
    TemplateCompilerOccurrenceGeneration,
    TemplateCompilerPendingGenerationRegistration
  >();
  readonly #generationRegistrations = new Map<
    TemplateCompilerOccurrenceGeneration,
    TemplateCompilerGenerationRegistration
  >();
  readonly #generationTuples = new Set<string>();
  #executionOwner: object | null;

  private constructor(
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly supportsNormalizedReplay: boolean,
    executionOwner: object | null,
  ) {
    this.#executionOwner = executionOwner;
  }

  claimExecutionOwner(executionOwner: object): void {
    if (this.#executionOwner != null && this.#executionOwner !== executionOwner) {
      throw new Error('Compiler forest mutation authority already belongs to another execution session.');
    }
    this.#executionOwner = executionOwner;
  }

  beginExecutionBatch(
    executionOwner: object,
    contextKey: string,
    operationKey: string,
    causeHandles: readonly ClaimEndpointHandle[],
    sourceBatch: object,
  ): TemplateCompilerPendingMutationBatch {
    this.requireExecutionOwner(executionOwner);
    requireBatchIdentity(contextKey, operationKey, causeHandles);
    const operationIdentity = mutationOperationIdentity(contextKey, operationKey);
    if (
      this.#pendingBatchesByOperation.has(operationIdentity)
      || this.#completedBatchesByOperation.has(operationIdentity)
    ) {
      throw new Error(`Compiler mutation batch '${operationKey}' is already admitted.`);
    }
    const batch = new TemplateCompilerPendingMutationBatch(
      this.#generationAuthority,
      contextKey,
      operationKey,
      [...causeHandles],
      sourceBatch,
      this.forest.mutationRevision,
    );
    this.#pendingBatchesByOperation.set(operationIdentity, batch);
    return batch;
  }

  finishExecutionBatch(
    executionOwner: object,
    pending: TemplateCompilerPendingMutationBatch,
    committed: boolean,
    completedSourceBatch: object,
  ): TemplateCompilerCompletedMutationBatch | null {
    this.requireExecutionOwner(executionOwner);
    this.requirePendingBatch(pending);
    const registrations = this.pendingRegistrationsForBatch(pending);
    if (!committed) {
      if (pending.initialForestMutationRevision !== this.forest.mutationRevision) {
        throw new Error(
          `Compiler mutation batch '${pending.operationKey}' cannot discard generated or topological output until forest rollback exists.`,
        );
      }
      this.discardPendingBatch(pending, registrations);
      return null;
    }

    const completed = new TemplateCompilerCompletedMutationBatch(
      this.#generationAuthority,
      TemplateCompilerCompletedMutationBatchKind.Execution,
      pending.contextKey,
      pending.operationKey,
      pending.causeHandles,
      completedSourceBatch,
    );
    const operationIdentity = mutationOperationIdentity(pending.contextKey, pending.operationKey);
    this.#pendingBatchesByOperation.delete(operationIdentity);
    this.#completedBatchesByOperation.set(operationIdentity, completed);
    for (const registration of registrations) {
      this.#pendingGenerationRegistrations.delete(registration.generation);
      this.#generationRegistrations.set(
        registration.generation,
        new TemplateCompilerGenerationRegistration(registration.generation, completed),
      );
    }
    return completed;
  }

  readPendingGenerations(
    pending: TemplateCompilerPendingMutationBatch,
  ): readonly TemplateCompilerOccurrenceGeneration[] {
    this.requirePendingBatch(pending);
    return this.pendingRegistrationsForBatch(pending).map((registration) => registration.generation);
  }

  /** Structural mechanics borrow the exact pending execution batch, or an explicit normalized replay batch. */
  createStructuralGeneration(
    contextKey: string,
    batchOperationKey: string,
    role: TemplateCompilerGeneratedOccurrenceRole,
    batchCauseHandles: readonly ClaimEndpointHandle[],
    outputOrdinal: number,
    generationOperationKey: string = batchOperationKey,
    generationCauseHandles: readonly ClaimEndpointHandle[] = batchCauseHandles,
  ): TemplateCompilerOccurrenceGeneration {
    const operationIdentity = mutationOperationIdentity(contextKey, batchOperationKey);
    const pending = this.#pendingBatchesByOperation.get(operationIdentity) ?? null;
    if (pending != null) {
      this.requireBatchCauses(pending, batchCauseHandles);
      return this.reserveGeneration(
        pending,
        role,
        outputOrdinal,
        generationOperationKey,
        generationCauseHandles,
      );
    }
    if (!this.supportsNormalizedReplay) {
      throw new Error(
        `Compiler generation '${batchOperationKey}' has no pending mutation batch in the forest execution authority.`,
      );
    }
    let completed = this.#completedBatchesByOperation.get(operationIdentity) ?? null;
    if (completed == null) {
      requireBatchIdentity(contextKey, batchOperationKey, batchCauseHandles);
      completed = new TemplateCompilerCompletedMutationBatch(
        this.#generationAuthority,
        TemplateCompilerCompletedMutationBatchKind.NormalizedReplay,
        contextKey,
        batchOperationKey,
        [...batchCauseHandles],
        {},
      );
      this.#completedBatchesByOperation.set(operationIdentity, completed);
    }
    this.requireBatchCauses(completed, batchCauseHandles);
    return this.createCompletedGeneration(
      completed,
      role,
      outputOrdinal,
      generationOperationKey,
      generationCauseHandles,
    );
  }

  reserveExecutionGeneration(
    executionOwner: object,
    pending: TemplateCompilerPendingMutationBatch,
    role: TemplateCompilerGeneratedOccurrenceRole,
    outputOrdinal: number,
    generationOperationKey: string = pending.operationKey,
    generationCauseHandles: readonly ClaimEndpointHandle[] = pending.causeHandles,
  ): TemplateCompilerOccurrenceGeneration {
    this.requireExecutionOwner(executionOwner);
    this.requirePendingBatch(pending);
    return this.reserveGeneration(
      pending,
      role,
      outputOrdinal,
      generationOperationKey,
      generationCauseHandles,
    );
  }

  ownsGeneration(generation: TemplateCompilerOccurrenceGeneration): boolean {
    return generation.isOwnedBy(this.#generationAuthority);
  }

  completedBatchForGeneration(
    generation: TemplateCompilerOccurrenceGeneration,
  ): TemplateCompilerCompletedMutationBatch | null {
    return this.#generationRegistrations.get(generation)?.batch ?? null;
  }

  assertRegisteredGeneration(generation: TemplateCompilerOccurrenceGeneration): void {
    const registration = this.#generationRegistrations.get(generation) ?? null;
    const batch = registration?.batch ?? null;
    const tuple = generationTuple(
      generation.contextKey,
      generation.operationKey,
      generation.role,
      generation.outputOrdinal,
    );
    if (
      registration == null
      || batch == null
      || !generation.isOwnedBy(this.#generationAuthority)
      || !batch.isOwnedBy(this.#generationAuthority)
      || batch.contextKey !== generation.contextKey
      || batch.operationKey !== generation.batchOperationKey
      || !isOrderedCauseSubset(generation.causeHandles, batch.causeHandles)
      || !this.#generationTuples.has(tuple)
    ) {
      throw new Error(`Compiler generation '${generation.operationKey}' has no completed mutation authority.`);
    }
  }

  assertGeneratedInventory(): void {
    for (const node of this.forest.readNodes()) {
      if (node.generation == null) continue;
      if (!this.ownsGeneration(node.generation)) {
        throw new Error(`Generated compiler occurrence '${node.occurrenceKey}' belongs to another session.`);
      }
      this.assertRegisteredGeneration(node.generation);
    }
    for (const attribute of this.forest.readAttributes()) {
      if (attribute.generation == null) continue;
      if (!this.ownsGeneration(attribute.generation)) {
        throw new Error(`Generated compiler attribute '${attribute.occurrenceKey}' belongs to another session.`);
      }
      this.assertRegisteredGeneration(attribute.generation);
    }
  }

  private reserveGeneration(
    pending: TemplateCompilerPendingMutationBatch,
    role: TemplateCompilerGeneratedOccurrenceRole,
    outputOrdinal: number,
    generationOperationKey: string = pending.operationKey,
    generationCauseHandles: readonly ClaimEndpointHandle[] = pending.causeHandles,
  ): TemplateCompilerOccurrenceGeneration {
    requireGenerationIdentity(pending, generationOperationKey, generationCauseHandles);
    const tuple = generationTuple(pending.contextKey, generationOperationKey, role, outputOrdinal);
    this.requireUniqueTuple(tuple);
    const generation = new TemplateCompilerOccurrenceGeneration(
      this.#generationAuthority,
      pending.contextKey,
      generationOperationKey,
      role,
      [...generationCauseHandles],
      outputOrdinal,
      pending.operationKey,
    );
    this.#generationTuples.add(tuple);
    this.#pendingGenerationRegistrations.set(
      generation,
      new TemplateCompilerPendingGenerationRegistration(generation, pending, tuple),
    );
    return generation;
  }

  private createCompletedGeneration(
    completed: TemplateCompilerCompletedMutationBatch,
    role: TemplateCompilerGeneratedOccurrenceRole,
    outputOrdinal: number,
    generationOperationKey: string = completed.operationKey,
    generationCauseHandles: readonly ClaimEndpointHandle[] = completed.causeHandles,
  ): TemplateCompilerOccurrenceGeneration {
    requireGenerationIdentity(completed, generationOperationKey, generationCauseHandles);
    const tuple = generationTuple(completed.contextKey, generationOperationKey, role, outputOrdinal);
    this.requireUniqueTuple(tuple);
    const generation = new TemplateCompilerOccurrenceGeneration(
      this.#generationAuthority,
      completed.contextKey,
      generationOperationKey,
      role,
      [...generationCauseHandles],
      outputOrdinal,
      completed.operationKey,
    );
    this.#generationTuples.add(tuple);
    this.#generationRegistrations.set(
      generation,
      new TemplateCompilerGenerationRegistration(generation, completed),
    );
    return generation;
  }

  private discardPendingBatch(
    pending: TemplateCompilerPendingMutationBatch,
    registrations: readonly TemplateCompilerPendingGenerationRegistration[],
  ): void {
    this.#pendingBatchesByOperation.delete(
      mutationOperationIdentity(pending.contextKey, pending.operationKey),
    );
    for (const registration of registrations) {
      this.#pendingGenerationRegistrations.delete(registration.generation);
      this.#generationTuples.delete(registration.tuple);
    }
  }

  private pendingRegistrationsForBatch(
    batch: TemplateCompilerPendingMutationBatch,
  ): readonly TemplateCompilerPendingGenerationRegistration[] {
    return [...this.#pendingGenerationRegistrations.values()].filter((registration) =>
      registration.batch === batch
    );
  }

  private requirePendingBatch(batch: TemplateCompilerPendingMutationBatch): void {
    if (
      !batch.isOwnedBy(this.#generationAuthority)
      || this.#pendingBatchesByOperation.get(
        mutationOperationIdentity(batch.contextKey, batch.operationKey),
      ) !== batch
    ) {
      throw new Error(`Compiler mutation batch '${batch.operationKey}' is not pending in this authority.`);
    }
  }

  private requireExecutionOwner(executionOwner: object): void {
    if (this.#executionOwner !== executionOwner) {
      throw new Error('Compiler forest mutation authority belongs to another execution session.');
    }
  }

  private requireBatchCauses(
    batch: TemplateCompilerPendingMutationBatch | TemplateCompilerCompletedMutationBatch,
    causeHandles: readonly ClaimEndpointHandle[],
  ): void {
    if (!sameOccurrences(batch.causeHandles, causeHandles)) {
      throw new Error(
        `Compiler generation operation '${batch.operationKey}' changed its ordered semantic causes.`,
      );
    }
  }

  private requireUniqueTuple(tuple: string): void {
    if (this.#generationTuples.has(tuple)) {
      throw new Error(`Compiler generation tuple '${tuple}' is not unique.`);
    }
  }
}

function requireBatchIdentity(
  contextKey: string,
  operationKey: string,
  causeHandles: readonly ClaimEndpointHandle[],
): void {
  if (contextKey.length === 0 || operationKey.length === 0 || causeHandles.length === 0) {
    throw new Error('Compiler mutation batch requires context, operation, and semantic causes.');
  }
}

function requireGenerationIdentity(
  batch: TemplateCompilerPendingMutationBatch | TemplateCompilerCompletedMutationBatch,
  operationKey: string,
  causeHandles: readonly ClaimEndpointHandle[],
): void {
  if (
    operationKey.length === 0
    || causeHandles.length === 0
    || new Set(causeHandles).size !== causeHandles.length
    || !isOrderedCauseSubset(causeHandles, batch.causeHandles)
  ) {
    throw new Error(
      `Compiler generation '${operationKey}' is not an independently caused output of batch '${batch.operationKey}'.`,
    );
  }
}

function isOrderedCauseSubset(
  subset: readonly ClaimEndpointHandle[],
  superset: readonly ClaimEndpointHandle[],
): boolean {
  let cursor = 0;
  for (const cause of superset) {
    if (cause === subset[cursor]) cursor++;
  }
  return cursor === subset.length;
}

function mutationOperationIdentity(contextKey: string, operationKey: string): string {
  return JSON.stringify([contextKey, operationKey]);
}

function generationTuple(
  contextKey: string,
  operationKey: string,
  role: TemplateCompilerGeneratedOccurrenceRole,
  outputOrdinal: number,
): string {
  return JSON.stringify([contextKey, operationKey, role, outputOrdinal]);
}

function sameOccurrences<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
