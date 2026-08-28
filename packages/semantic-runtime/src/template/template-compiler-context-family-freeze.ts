import { createHash } from 'node:crypto';

import type { AddressHandle } from '../kernel/handles.js';
import type { TemplateCompilerTargetContextPlan, TemplateCompilerTargetRowPlan } from './compiler-target-plan.js';
import type { TemplateCompilerContextFamilyTargetPlanPreparation } from './template-compiler-context-family-target-plan.js';
import type { TemplateCompilerContextFamilyTargetExecution } from './template-compiler-context-family-target-execution.js';
import type { TemplateCompilerOperation } from './template-compiler-execution.js';
import {
  type TemplateCompilerAttributeOccurrence,
  TemplateCompilerDoctypeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  type TemplateCompilerNodeOccurrence,
  type TemplateCompilerOccurrenceForest,
} from './template-compiler-occurrence.js';
import {
  type TemplateCompilerLiveAllocationNamespaceCounts,
  TemplateCompilerLiveAllocationLedgerState,
  type TemplateCompilerLivePreparedAllocationSnapshot,
  type TemplateCompilerLiveProductReservation,
  TemplateCompilerLiveProductReservationRole,
} from './template-compiler-live-allocation.js';
import type {
  TemplateCompilerContextStructure,
  TemplateCompilerTargetGeometry,
} from './template-compiler-structural-execution.js';
import {
  type TemplateCompilerRootCompilationState,
  TemplateCompilerRootCompilationStateKind,
} from './template-compiler-root-state.js';

const contextFamilyFreezePreparationAuthority = {};
const freezePreparations = new WeakMap<
  TemplateCompilerContextFamilyTargetExecution,
  TemplateCompilerContextFamilyFreezePreparation
>();
const childPathSegment = 0;
const templateContentPathSegment = 1;

export const enum TemplateCompilerContextFamilyFreezePreparationState {
  Exact = 'exact',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerContextFamilyFreezeReasonKind {
  ForeignExecution = 'foreign-execution',
  UnsealedExecution = 'unsealed-execution',
  StaleExecution = 'stale-execution',
  StalePreparation = 'stale-preparation',
  UnsupportedDoctype = 'unsupported-doctype',
}

export class TemplateCompilerContextFamilyFreezeReason {
  constructor(
    readonly reasonKind: TemplateCompilerContextFamilyFreezeReasonKind,
    readonly summary: string,
    readonly occurrenceKey: string | null = null,
  ) {}
}

/** One final live attribute and its pre-funded transformed product. */
export class TemplateCompilerContextFamilyFreezeAttributeReservation {
  constructor(
    readonly occurrence: TemplateCompilerAttributeOccurrence,
    readonly owner: TemplateCompilerContextFamilyFreezeNodeReservation,
    readonly ordinal: number,
    readonly browserInputAddressHandle: AddressHandle | null,
    readonly authoredSourceAddressHandle: AddressHandle | null,
    readonly reservation: TemplateCompilerLiveProductReservation,
  ) {
    if (
      !(owner.occurrence instanceof TemplateCompilerElementOccurrence)
      || occurrence.owner !== owner.occurrence
      || owner.occurrence.readAttributes()[ordinal] !== occurrence
      || browserInputAddressHandle !== (occurrence.inputReference?.addressHandle ?? null)
      || (occurrence.generation != null && authoredSourceAddressHandle != null)
      || reservation.role !== TemplateCompilerLiveProductReservationRole.CompilerTransformedAttribute
      || reservation.addressHandle != null
    ) {
      throw new Error(`Transformed attribute '${occurrence.occurrenceKey}' lost owner, order, or reservation authority.`);
    }
  }
}

/** One final live node path and its pre-funded transformed product/address. */
export class TemplateCompilerContextFamilyFreezeNodeReservation {
  private attributes: readonly TemplateCompilerContextFamilyFreezeAttributeReservation[] = [];
  private attributesBound = false;

  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly occurrence: TemplateCompilerNodeOccurrence,
    readonly path: readonly number[],
    readonly preorderOrdinal: number,
    readonly browserInputAddressHandle: AddressHandle | null,
    readonly authoredSourceAddressHandle: AddressHandle | null,
    readonly reservation: TemplateCompilerLiveProductReservation,
  ) {
    if (
      path.length === 0
      || !Number.isSafeInteger(preorderOrdinal)
      || preorderOrdinal < 0
      || browserInputAddressHandle !== (occurrence.inputReference?.addressHandle ?? null)
      || (occurrence.generation != null && authoredSourceAddressHandle != null)
      || reservation.role !== TemplateCompilerLiveProductReservationRole.CompilerTransformedNode
      || reservation.addressHandle == null
    ) {
      throw new Error(`Transformed node '${occurrence.occurrenceKey}' lost path or reservation authority.`);
    }
  }

  bindAttributes(attributes: readonly TemplateCompilerContextFamilyFreezeAttributeReservation[]): void {
    if (
      this.attributesBound
      || attributes.length !== (this.occurrence instanceof TemplateCompilerElementOccurrence
        ? this.occurrence.readAttributes().length
        : 0)
      || attributes.some((attribute, ordinal) =>
        attribute.owner !== this
        || attribute.ordinal !== ordinal
      )
    ) {
      throw new Error(`Transformed node '${this.occurrence.occurrenceKey}' lost attribute reservation coverage.`);
    }
    this.attributes = attributes;
    this.attributesBound = true;
  }

  readAttributes(): readonly TemplateCompilerContextFamilyFreezeAttributeReservation[] {
    return this.attributes;
  }
}

/** One row's downstream target and instruction-sequence product reservations. */
export class TemplateCompilerContextFamilyFreezeTargetRowReservation {
  constructor(
    readonly row: TemplateCompilerTargetRowPlan,
    readonly geometry: TemplateCompilerTargetGeometry,
    readonly targetReservation: TemplateCompilerLiveProductReservation,
    readonly sequenceReservation: TemplateCompilerLiveProductReservation,
  ) {
    if (
      geometry.row !== row
      || targetReservation.role !== TemplateCompilerLiveProductReservationRole.RenderTarget
      || sequenceReservation.role !== TemplateCompilerLiveProductReservationRole.InstructionSequence
      || targetReservation.addressHandle != null
      || sequenceReservation.addressHandle != null
    ) {
      throw new Error(`Transformed target row '${row.localKey}' lost geometry or publication reservations.`);
    }
  }
}

/** One operation whose eventual N→M transformed derivation retains exact execution order. */
export class TemplateCompilerContextFamilyFreezeDerivationReservation {
  constructor(
    readonly operation: TemplateCompilerOperation,
    readonly reservation: TemplateCompilerLiveProductReservation,
  ) {
    if (
      reservation.role !== TemplateCompilerLiveProductReservationRole.CompilerStructureDerivation
      || reservation.addressHandle != null
      || reservation.sourceAddressHandle !== operation.sourceAddressHandle
    ) {
      throw new Error(`Compiler operation '${operation.operationKey}' lost derivation reservation authority.`);
    }
  }
}

/** One target context's exact final root inventory before durable product construction. */
export class TemplateCompilerContextFamilyFreezeContextPreparation {
  readonly nodeByOccurrence: ReadonlyMap<TemplateCompilerNodeOccurrence, TemplateCompilerContextFamilyFreezeNodeReservation>;
  readonly attributeByOccurrence: ReadonlyMap<
    TemplateCompilerAttributeOccurrence,
    TemplateCompilerContextFamilyFreezeAttributeReservation
  >;

  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly structure: TemplateCompilerContextStructure,
    readonly treeReservation: TemplateCompilerLiveProductReservation,
    readonly nodes: readonly TemplateCompilerContextFamilyFreezeNodeReservation[],
    readonly attributes: readonly TemplateCompilerContextFamilyFreezeAttributeReservation[],
    readonly rows: readonly TemplateCompilerContextFamilyFreezeTargetRowReservation[],
  ) {
    this.nodeByOccurrence = new Map(nodes.map((node) => [node.occurrence, node] as const));
    this.attributeByOccurrence = new Map(attributes.map((attribute) => [attribute.occurrence, attribute] as const));
    if (
      structure.context !== context
      || treeReservation.role !== TemplateCompilerLiveProductReservationRole.CompilerTransformedTree
      || treeReservation.addressHandle == null
      || nodes.length === 0
      || nodes[0]?.occurrence !== structure.compilerCarrier
      || nodes.some((node, ordinal) =>
        node.context !== context
        || node.preorderOrdinal !== ordinal
      )
      || new Set(nodes.map((node) => node.path.join('/'))).size !== nodes.length
      || this.nodeByOccurrence.size !== nodes.length
      || this.attributeByOccurrence.size !== attributes.length
      || rows.length !== context.readRows().length
      || rows.some((row, ordinal) => row.row !== context.readRows()[ordinal])
    ) {
      throw new Error(`Context '${context.localKey}' lost transformed freeze inventory coverage.`);
    }
  }
}

/** Namespace-invisible complete final-tree/derivation/target publication inventory. */
export class TemplateCompilerContextFamilyFreezePreparation {
  readonly #authority: object;
  readonly rootState: TemplateCompilerRootCompilationState;
  readonly effectiveCaptureReservations: TemplateCompilerContextFamilyTargetPlanPreparation['effectiveCaptureReservations'];
  readonly containerlessHydrateElements: TemplateCompilerContextFamilyTargetPlanPreparation['containerlessHydrateElements'];
  readonly processContentHydrateElements: TemplateCompilerContextFamilyTargetPlanPreparation['processContentHydrateElements'];

  constructor(
    authority: object,
    readonly execution: TemplateCompilerContextFamilyTargetExecution,
    readonly contexts: readonly TemplateCompilerContextFamilyFreezeContextPreparation[],
    readonly derivations: readonly TemplateCompilerContextFamilyFreezeDerivationReservation[],
    readonly preparedAllocation: TemplateCompilerLivePreparedAllocationSnapshot,
    readonly namespaceCountsBefore: TemplateCompilerLiveAllocationNamespaceCounts,
  ) {
    this.rootState = execution.attachment.target.allocation.rows.receipt.traversal.audit.transcript.rootState;
    this.effectiveCaptureReservations = execution.attachment.target.effectiveCaptureReservations;
    this.containerlessHydrateElements = execution.attachment.target.containerlessHydrateElements;
    this.processContentHydrateElements = execution.attachment.target.processContentHydrateElements;
    const targetContexts = execution.attachment.target.targetPlan.readContexts();
    const referencedReservations = [
      ...contexts.flatMap((context) => [
        context.treeReservation,
        ...context.nodes.map((node) => node.reservation),
        ...context.attributes.map((attribute) => attribute.reservation),
        ...context.rows.flatMap((row) => [row.targetReservation, row.sequenceReservation]),
      ]),
      ...derivations.map((derivation) => derivation.reservation),
    ];
    const allNodes = contexts.flatMap((context) => context.nodes);
    if (
      authority !== contextFamilyFreezePreparationAuthority
      || contexts.length !== targetContexts.length
      || contexts.some((context, ordinal) => context.context !== targetContexts[ordinal])
      || preparedAllocation.productReservations.length !== referencedReservations.length
      || referencedReservations.some((reservation, ordinal) =>
        reservation !== preparedAllocation.productReservations[ordinal]
      )
      || new Set(referencedReservations).size !== referencedReservations.length
      || new Set(allNodes.map((node) => node.occurrence)).size !== allNodes.length
      || preparedAllocation.instructionAllocations.length !== 0
      || preparedAllocation.expressionAllocations.length !== 0
      || preparedAllocation.sourceAllocations.length !== 0
      || preparedAllocation.ledger.state !== TemplateCompilerLiveAllocationLedgerState.Prepared
      || !this.rootState.isModuleConstructed()
      || this.rootState.stateKind !== TemplateCompilerRootCompilationStateKind.Complete
    ) {
      throw new Error('Context-family freeze preparation lost context, derivation, or allocation coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === contextFamilyFreezePreparationAuthority;
  }

  isCurrent(): boolean {
    const namespace = this.preparedAllocation.ledger.namespace;
    const counts = namespace.readReservationCounts();
    return this.isModuleConstructed()
      && this.execution.attachment.execution.isSealed
      && this.execution.attachment.committedAllocation.isCurrent()
      && this.preparedAllocation.isCurrent()
      && counts.semanticSlots === this.namespaceCountsBefore.semanticSlots
      && counts.productHandles === this.namespaceCountsBefore.productHandles
      && counts.identityHandles === this.namespaceCountsBefore.identityHandles
      && counts.addressHandles === this.namespaceCountsBefore.addressHandles;
  }
}

export class TemplateCompilerContextFamilyFreezePreparationResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyFreezePreparationState,
    readonly preparation: TemplateCompilerContextFamilyFreezePreparation | null,
    readonly reasons: readonly TemplateCompilerContextFamilyFreezeReason[],
  ) {
    if (
      (state === TemplateCompilerContextFamilyFreezePreparationState.Exact)
        !== (preparation != null && reasons.length === 0)
      || (state === TemplateCompilerContextFamilyFreezePreparationState.Ineligible)
        !== (preparation == null && reasons.length > 0)
    ) {
      throw new Error('Context-family freeze result lost exact/ineligible ownership.');
    }
  }
}

/** Prepare every downstream durable handle without mutating the closed forest or exposing the namespace. */
export function prepareTemplateCompilerContextFamilyFreeze(
  execution: TemplateCompilerContextFamilyTargetExecution,
): TemplateCompilerContextFamilyFreezePreparationResult {
  if (!execution.isModuleConstructed()) {
    return ineligible(
      TemplateCompilerContextFamilyFreezeReasonKind.ForeignExecution,
      'Context-family freeze requires one module-constructed target execution.',
    );
  }
  const existing = freezePreparations.get(execution) ?? null;
  if (existing != null) {
    return existing.isCurrent()
      ? new TemplateCompilerContextFamilyFreezePreparationResult(
          TemplateCompilerContextFamilyFreezePreparationState.Exact,
          existing,
          [],
        )
      : ineligible(
          TemplateCompilerContextFamilyFreezeReasonKind.StalePreparation,
          'Context-family freeze preparation is stale; rerun the owning compiler candidate.',
        );
  }
  if (!execution.attachment.execution.isSealed) {
    return ineligible(
      TemplateCompilerContextFamilyFreezeReasonKind.UnsealedExecution,
      'Context-family freeze requires terminal execution sealing before durable handle preparation.',
    );
  }
  if (!execution.attachment.committedAllocation.isCurrent()) {
    return ineligible(
      TemplateCompilerContextFamilyFreezeReasonKind.StaleExecution,
      'Context-family freeze execution no longer owns a current committed allocation.',
    );
  }
  const structural = execution.attachment.structuralExecution;
  structural.assertCoherent();
  const targetContexts = execution.attachment.target.targetPlan.readContexts();
  const plannedContexts = targetContexts.map((context) => {
    const structure = structural.readContextStructure(context);
    if (structure == null) throw new Error(`Context '${context.localKey}' has no final structural root.`);
    return planContext(context, structure, execution.attachment.execution.forest);
  });
  const unsupportedDoctype = plannedContexts.flatMap((context) => context.nodes)
    .find((node) => node.occurrence instanceof TemplateCompilerDoctypeOccurrence) ?? null;
  if (unsupportedDoctype != null) {
    return ineligible(
      TemplateCompilerContextFamilyFreezeReasonKind.UnsupportedDoctype,
      'Compiler-transformed template products do not currently admit doctype occurrences.',
      unsupportedDoctype.occurrence.occurrenceKey,
    );
  }

  const namespace = execution.attachment.target.allocation.preparedAllocation.ledger.namespace;
  const namespaceCountsBefore = namespace.readReservationCounts();
  const rootSiteKey = `${execution.attachment.contexts[0]!.lane.localKey}:context-family-freeze`;
  const ledger = namespace.preparePhase(rootSiteKey);
  const contexts = plannedContexts.map((planned, contextOrdinal) => {
    const contextMapping = execution.attachment.target.contextMappings[contextOrdinal];
    if (contextMapping?.targetContext !== planned.context) {
      throw new Error(`Context '${planned.context.localKey}' lost funded definition order.`);
    }
    const compiledLocal = contextMapping.definition.compiledTemplate.productHandle;
    const siteKey = `${rootSiteKey}:context:${stableDigest(compiledLocal)}`;
    const treeLocal = `${compiledLocal}:transformed-tree`;
    const treeReservation = ledger.reserveProduct(
      siteKey,
      'tree',
      TemplateCompilerLiveProductReservationRole.CompilerTransformedTree,
      planned.context.sourceAddressHandle,
      treeLocal,
      treeLocal,
    );
    const nodes = planned.nodes.map((node, nodeOrdinal) => {
      const nodeKey = stableDigest(node.occurrence.occurrenceKey);
      const nodeLocal = `${treeLocal}:node:${nodeKey}`;
      return new TemplateCompilerContextFamilyFreezeNodeReservation(
        planned.context,
        node.occurrence,
        node.path,
        nodeOrdinal,
        node.browserInputAddressHandle,
        node.authoredSourceAddressHandle,
        ledger.reserveProduct(
          siteKey,
          `node:${nodeKey}`,
          TemplateCompilerLiveProductReservationRole.CompilerTransformedNode,
          node.sourceAddressHandle,
          nodeLocal,
          nodeLocal,
        ),
      );
    });
    const nodeByOccurrence = new Map(nodes.map((node) => [node.occurrence, node] as const));
    const attributesByOwner = new Map<
      TemplateCompilerContextFamilyFreezeNodeReservation,
      TemplateCompilerContextFamilyFreezeAttributeReservation[]
    >();
    const attributes = planned.nodes.flatMap((node) => {
      if (!(node.occurrence instanceof TemplateCompilerElementOccurrence)) return [];
      const owner = nodeByOccurrence.get(node.occurrence)!;
      const owned = node.occurrence.readAttributes().map((attribute, attributeOrdinal) => {
        const attributeKey = stableDigest(attribute.occurrenceKey);
        const attributeLocal = `${treeLocal}:attribute:${attributeKey}`;
        return new TemplateCompilerContextFamilyFreezeAttributeReservation(
          attribute,
          owner,
          attributeOrdinal,
          attribute.inputReference?.addressHandle ?? null,
          attribute.generation == null
            ? execution.attachment.execution.forest.exactAuthoredAttributeOrigin(attribute)?.authored.addressHandle ?? null
            : null,
          ledger.reserveProduct(
            siteKey,
            `attribute:${attributeKey}`,
            TemplateCompilerLiveProductReservationRole.CompilerTransformedAttribute,
            attribute.inputReference?.addressHandle ?? null,
            attributeLocal,
          ),
        );
      });
      attributesByOwner.set(owner, owned);
      return owned;
    });
    for (const node of nodes) {
      node.bindAttributes(attributesByOwner.get(node) ?? []);
    }
    const rows = planned.context.readRows().map((row) => {
      const geometry = structural.readTargetGeometry(row);
      if (geometry == null) throw new Error(`Target row '${row.localKey}' has no terminal geometry.`);
      const targetLocal = `${compiledLocal}:target:${row.publicationLocalKey}`;
      return new TemplateCompilerContextFamilyFreezeTargetRowReservation(
        row,
        geometry,
        ledger.reserveProduct(
          siteKey,
          `target:${row.publicationLocalKey}`,
          TemplateCompilerLiveProductReservationRole.RenderTarget,
          row.sourceAddressHandle,
          targetLocal,
        ),
        ledger.reserveProduct(
          siteKey,
          `sequence:${row.publicationLocalKey}`,
          TemplateCompilerLiveProductReservationRole.InstructionSequence,
          row.sourceAddressHandle,
          `${targetLocal}:instructions`,
        ),
      );
    });
    return new TemplateCompilerContextFamilyFreezeContextPreparation(
      planned.context,
      planned.structure,
      treeReservation,
      nodes,
      attributes,
      rows,
    );
  });
  const derivationOperations = structuralDerivationOperations(execution);
  const derivations = derivationOperations.map((operation) => {
    const operationKey = stableDigest(`${operation.context.localKey}:${operation.operationKey}`);
    const siteKey = `${rootSiteKey}:operation:${operationKey}`;
    return new TemplateCompilerContextFamilyFreezeDerivationReservation(
      operation,
      ledger.reserveProduct(
        siteKey,
        'derivation',
        TemplateCompilerLiveProductReservationRole.CompilerStructureDerivation,
        operation.sourceAddressHandle,
        `${rootSiteKey}:derivation:${operationKey}`,
      ),
    );
  });
  const preparedAllocation = ledger.prepareSnapshot();
  const preparation = new TemplateCompilerContextFamilyFreezePreparation(
    contextFamilyFreezePreparationAuthority,
    execution,
    contexts,
    derivations,
    preparedAllocation,
    namespaceCountsBefore,
  );
  freezePreparations.set(execution, preparation);
  return new TemplateCompilerContextFamilyFreezePreparationResult(
    TemplateCompilerContextFamilyFreezePreparationState.Exact,
    preparation,
    [],
  );
}

interface PlannedNode {
  readonly occurrence: TemplateCompilerNodeOccurrence;
  readonly path: readonly number[];
  readonly preorderOrdinal: number;
  readonly browserInputAddressHandle: AddressHandle | null;
  readonly authoredSourceAddressHandle: AddressHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

class PlannedContext {
  constructor(
    readonly context: TemplateCompilerTargetContextPlan,
    readonly structure: TemplateCompilerContextStructure,
    readonly nodes: readonly PlannedNode[],
  ) {}
}

function planContext(
  context: TemplateCompilerTargetContextPlan,
  structure: TemplateCompilerContextStructure,
  forest: TemplateCompilerOccurrenceForest,
): PlannedContext {
  const nodes: PlannedNode[] = [];
  const visit = (occurrence: TemplateCompilerNodeOccurrence, path: readonly number[]): void => {
    const preorderOrdinal = nodes.length;
    nodes.push({
      occurrence,
      path,
      preorderOrdinal,
      browserInputAddressHandle: occurrence.inputReference?.addressHandle ?? null,
      authoredSourceAddressHandle: occurrence.generation == null
        ? forest.exactAuthoredNodeOrigin(occurrence)?.authored.addressHandle ?? null
        : null,
      sourceAddressHandle: sourceAddressForOccurrence(occurrence),
    });
    if (occurrence instanceof TemplateCompilerElementOccurrence) {
      occurrence.readChildren().forEach((child, ordinal) =>
        visit(child, [...path, childPathSegment, ordinal])
      );
      if (occurrence.templateContent != null) {
        visit(occurrence.templateContent, [...path, templateContentPathSegment]);
      }
      return;
    }
    if (occurrence instanceof TemplateCompilerFragmentOccurrence) {
      occurrence.readChildren().forEach((child, ordinal) =>
        visit(child, [...path, childPathSegment, ordinal])
      );
    }
  };
  visit(structure.compilerCarrier, [0]);
  if (!nodes.some((node) => node.occurrence === structure.compilerContent)) {
    throw new Error(`Context '${context.localKey}' traversal lost its compiler content fragment.`);
  }
  return new PlannedContext(context, structure, nodes);
}

function sourceAddressForOccurrence(occurrence: TemplateCompilerNodeOccurrence): AddressHandle | null {
  return occurrence.inputReference?.addressHandle ?? null;
}

function structuralDerivationOperations(
  execution: TemplateCompilerContextFamilyTargetExecution,
): readonly TemplateCompilerOperation[] {
  const targetOperations = new Set(execution.operations);
  const lane = execution.attachment.contexts[0]!.lane;
  return execution.attachment.execution.sequence.readLaneOperations(lane).filter((operation) =>
    targetOperations.has(operation)
    || operation.mutationBatch.attributeValueMutations.length > 0
    || operation.mutationBatch.occurrenceGenerationReservations.length > 0
    || operation.mutationBatch.topologyMutations.length > 0
  );
}

function ineligible(
  reasonKind: TemplateCompilerContextFamilyFreezeReasonKind,
  summary: string,
  occurrenceKey: string | null = null,
): TemplateCompilerContextFamilyFreezePreparationResult {
  return new TemplateCompilerContextFamilyFreezePreparationResult(
    TemplateCompilerContextFamilyFreezePreparationState.Ineligible,
    null,
    [new TemplateCompilerContextFamilyFreezeReason(reasonKind, summary, occurrenceKey)],
  );
}

function stableDigest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}
