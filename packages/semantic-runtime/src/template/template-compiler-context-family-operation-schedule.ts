import type { AddressHandle } from '../kernel/handles.js';
import type { ClaimEndpointHandle } from '../kernel/claim.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  TemplateCompilerProjectionContextStructuralAuthority,
  TemplateCompilerTemplateControllerContextStructuralAuthority,
} from './compiler-target-plan.js';
import type { TemplateCompilerExecutionContextReference } from './template-compiler-execution.js';
import { TemplateCompilerOperationKind } from './template-compiler-operation.js';
import {
  TemplateCompilerFamilyContextInitializationKind,
  type TemplateCompilerContextFamilyStructuralSchedulePreparation,
  type TemplateCompilerFamilyAttributeScheduleEntry,
  type TemplateCompilerFamilyContextExecutionBand,
  type TemplateCompilerFamilyContextInitialization,
  TemplateCompilerFamilyLoweredElementExecutionBand,
  TemplateCompilerFamilyLoweredElementScheduleEntry,
  TemplateCompilerFamilyLetScheduleEntry,
  type TemplateCompilerFamilyProjectionScheduleEntry,
  TemplateCompilerFamilyReachedElementExecutionBand,
  TemplateCompilerFamilyReachedElementScheduleEntry,
  type TemplateCompilerFamilyTemplateControllerScheduleEntry,
  TemplateCompilerFamilyTextScheduleEntry,
} from './template-compiler-context-family-structural-schedule.js';
import type {
  TemplateCompilerContextFamilyOrdinaryTargetRowMapping,
  TemplateCompilerContextFamilyTargetContextMapping,
  TemplateCompilerContextFamilyTemplateControllerTargetRowMapping,
} from './template-compiler-context-family-target-plan.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import type { TemplateCompilerOccurrenceAttributeDispositionDraft } from './template-compiler-occurrence-row-assembly.js';
import type { TemplateInstruction } from './instruction-ir.js';

const familyOperationScheduleAuthority = {};

export const enum TemplateCompilerFamilyOperationScheduleEntryKind {
  GeneratedContext = 'generated-context',
  AttributeDisposition = 'attribute-disposition',
  TemplateControllerRow = 'template-controller-row',
  TemplateControllerRehoming = 'template-controller-rehoming',
  ProjectionExtraction = 'projection-extraction',
  OrdinaryTarget = 'ordinary-target',
  TextExpansion = 'text-expansion',
}

interface TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind: TemplateCompilerFamilyOperationScheduleEntryKind;
  readonly operationKey: string;
  readonly context: TemplateCompilerExecutionContextReference;
  readonly operationKind: TemplateCompilerOperationKind;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly sourceAddressHandle: AddressHandle | null;
}

/** One child compiler context whose carrier pair must be generated in its own mutation batch. */
export class TemplateCompilerFamilyGeneratedContextOperationScheduleEntry
  implements TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind = TemplateCompilerFamilyOperationScheduleEntryKind.GeneratedContext;
  readonly operationKey: string;
  readonly operationKind: TemplateCompilerOperationKind;
  readonly instruction: TemplateInstruction;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly sourceAddressHandle: AddressHandle | null;

  constructor(
    readonly initialization: TemplateCompilerFamilyContextInitialization,
    readonly context: TemplateCompilerExecutionContextReference,
  ) {
    const targetContext = initialization.contextMapping.targetContext;
    const authority = targetContext.structuralAuthority;
    if (authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority) {
      this.operationKind = TemplateCompilerOperationKind.TemplateControllerWrapping;
      this.instruction = authority.instruction;
    } else if (authority instanceof TemplateCompilerProjectionContextStructuralAuthority) {
      this.operationKind = TemplateCompilerOperationKind.ProjectionExtraction;
      this.instruction = authority.instruction;
    } else {
      throw new Error(`Generated family context '${targetContext.localKey}' has no child instruction authority.`);
    }
    this.operationKey = `${targetContext.localKey}:generated-carrier`;
    this.causeHandles = [this.instruction.productHandle];
    this.sourceAddressHandle = targetContext.sourceAddressHandle;
    if (
      initialization.initializationKind !== TemplateCompilerFamilyContextInitializationKind.Generated
      || context.targetContext !== targetContext
    ) {
      throw new Error(`Family context '${targetContext.localKey}' lost generated-context operation ownership.`);
    }
  }
}

export class TemplateCompilerFamilyAttributeOperationScheduleEntry
  implements TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind = TemplateCompilerFamilyOperationScheduleEntryKind.AttributeDisposition;
  readonly operationKind = TemplateCompilerOperationKind.AttributeDisposition;

  constructor(
    readonly schedule: TemplateCompilerFamilyAttributeScheduleEntry,
    readonly context: TemplateCompilerExecutionContextReference,
  ) {
    if (context.targetContext !== schedule.contextMapping.targetContext || !schedule.requiresConsumption) {
      throw new Error(`Family attribute '${schedule.draft.stableSlotKey}' lost executable disposition ownership.`);
    }
  }

  get draft(): TemplateCompilerOccurrenceAttributeDispositionDraft {
    return this.schedule.draft;
  }

  get occurrence(): TemplateCompilerAttributeOccurrence {
    return this.draft.attribute;
  }

  get operationKey(): string {
    return this.draft.stableSlotKey;
  }

  get causeHandles(): readonly ClaimEndpointHandle[] {
    return this.schedule.mapping.causeHandles;
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.occurrence.inputReference?.addressHandle ?? null;
  }
}

export class TemplateCompilerFamilyTemplateControllerRowOperationScheduleEntry
  implements TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind = TemplateCompilerFamilyOperationScheduleEntryKind.TemplateControllerRow;
  readonly operationKind = TemplateCompilerOperationKind.TemplateControllerWrapping;
  readonly instruction: TemplateInstruction;

  constructor(
    readonly transition: TemplateCompilerFamilyTemplateControllerScheduleEntry,
    readonly mapping: TemplateCompilerContextFamilyTemplateControllerTargetRowMapping,
    readonly context: TemplateCompilerExecutionContextReference,
  ) {
    this.instruction = mapping.funded.instruction;
    if (
      !transition.rowMappings.includes(mapping)
      || context.targetContext !== mapping.contextMapping.targetContext
    ) {
      throw new Error(`Family TC row '${mapping.row.localKey}' lost executable transition ownership.`);
    }
  }

  get isSourceReplacement(): boolean {
    return this.mapping === this.transition.rowMappings[0];
  }

  get occurrence(): TemplateCompilerElementOccurrence | null {
    return this.isSourceReplacement ? this.transition.event.host : null;
  }

  get operationKey(): string {
    return this.mapping.row.localKey;
  }

  get causeHandles(): readonly ClaimEndpointHandle[] {
    return rowCauseHandles(this.mapping.row.instructions);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.mapping.row.sourceAddressHandle;
  }
}

/** One explicit terminal transfer after every TC source/append row has realized its geometry. */
export class TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry
  implements TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind = TemplateCompilerFamilyOperationScheduleEntryKind.TemplateControllerRehoming;
  readonly operationKind = TemplateCompilerOperationKind.TemplateControllerWrapping;
  readonly operationKey: string;
  readonly instruction: TemplateInstruction;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly sourceAddressHandle: AddressHandle | null;

  constructor(
    readonly transition: TemplateCompilerFamilyTemplateControllerScheduleEntry,
    readonly context: TemplateCompilerExecutionContextReference,
  ) {
    const targetContext = transition.terminalLeaf.targetContext;
    const authority = targetContext.structuralAuthority;
    if (!(authority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)) {
      throw new Error(`Family TC terminal context '${targetContext.localKey}' lost instruction authority.`);
    }
    this.instruction = authority.instruction;
    this.operationKey = `${targetContext.localKey}:template-controller-rehome`;
    this.causeHandles = [this.instruction.productHandle];
    this.sourceAddressHandle = this.instruction.sourceAddressHandle;
    if (context.targetContext !== targetContext) {
      throw new Error(`Family TC transition '${transition.event.host.occurrenceKey}' lost terminal rehoming ownership.`);
    }
  }
}

export class TemplateCompilerFamilyProjectionOperationScheduleEntry
  implements TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind = TemplateCompilerFamilyOperationScheduleEntryKind.ProjectionExtraction;
  readonly operationKind = TemplateCompilerOperationKind.ProjectionExtraction;
  readonly instruction: TemplateInstruction;
  readonly operationKey: string;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly sourceAddressHandle: AddressHandle | null;

  constructor(
    readonly projection: TemplateCompilerFamilyProjectionScheduleEntry,
    readonly context: TemplateCompilerExecutionContextReference,
  ) {
    this.instruction = projection.hydrateElement.instruction;
    this.operationKey = `${context.localKey}:${this.instruction.productHandle}:projection-extraction`;
    this.causeHandles = [this.instruction.productHandle];
    this.sourceAddressHandle = this.instruction.sourceAddressHandle;
    if (
      (projection.groups.length === 0 && projection.discardedContributors.length === 0)
      || context.targetContext !== projection.ownerContext.targetContext
    ) {
      throw new Error(`Family projection '${projection.event.host.occurrenceKey}' lost executable extraction ownership.`);
    }
  }
}

export class TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry
  implements TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind = TemplateCompilerFamilyOperationScheduleEntryKind.OrdinaryTarget;
  readonly operationKind: TemplateCompilerOperationKind;

  constructor(
    readonly mapping: TemplateCompilerContextFamilyOrdinaryTargetRowMapping,
    readonly context: TemplateCompilerExecutionContextReference,
  ) {
    this.operationKind = mapping.row.placement instanceof TemplateCompilerContainerlessReplacementPlacement
      ? TemplateCompilerOperationKind.ContainerlessReplacement
      : TemplateCompilerOperationKind.HydrationTargetCreation;
    if (context.targetContext !== mapping.contextMapping.targetContext) {
      throw new Error(`Family target row '${mapping.row.localKey}' lost executable context ownership.`);
    }
  }

  get occurrence(): TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence {
    return this.mapping.draft.occurrence;
  }

  get operationKey(): string {
    return this.mapping.row.localKey;
  }

  get causeHandles(): readonly ClaimEndpointHandle[] {
    return rowCauseHandles(this.mapping.row.instructions);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.mapping.row.sourceAddressHandle;
  }
}

export class TemplateCompilerFamilyTextOperationScheduleEntry
  implements TemplateCompilerFamilyOperationScheduleEntryBase {
  readonly entryKind = TemplateCompilerFamilyOperationScheduleEntryKind.TextExpansion;
  readonly operationKind = TemplateCompilerOperationKind.TextInterpolationExpansion;
  readonly causeHandles: readonly ClaimEndpointHandle[];

  constructor(
    readonly schedule: TemplateCompilerFamilyTextScheduleEntry,
    readonly context: TemplateCompilerExecutionContextReference,
  ) {
    this.causeHandles = schedule.rows.flatMap((mapping) => rowCauseHandles(mapping.row.instructions));
    if (
      schedule.expansion == null
      || schedule.rows.length === 0
      || context.targetContext !== schedule.contextMapping.targetContext
      || this.causeHandles.length === 0
    ) {
      throw new Error(`Family text site lost executable expansion ownership.`);
    }
  }

  get occurrence(): TemplateCompilerTextOccurrence {
    return this.schedule.expansion!.site.event.text;
  }

  get operationKey(): string {
    return `${this.context.localKey}:${this.schedule.expansion!.stableSlotKey}`;
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.occurrence.inputReference?.addressHandle ?? null;
  }
}

export type TemplateCompilerFamilyOperationScheduleEntry =
  | TemplateCompilerFamilyGeneratedContextOperationScheduleEntry
  | TemplateCompilerFamilyAttributeOperationScheduleEntry
  | TemplateCompilerFamilyTemplateControllerRowOperationScheduleEntry
  | TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry
  | TemplateCompilerFamilyProjectionOperationScheduleEntry
  | TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry
  | TemplateCompilerFamilyTextOperationScheduleEntry;

/** Exact flat ledger order derived from the recursive structural schedule. */
export class TemplateCompilerContextFamilyOperationSchedule {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly structural: TemplateCompilerContextFamilyStructuralSchedulePreparation,
    readonly contexts: readonly TemplateCompilerExecutionContextReference[],
    readonly entries: readonly TemplateCompilerFamilyOperationScheduleEntry[],
  ) {
    const targetContexts = structural.target.targetPlan.readContexts();
    const executionContextSet = new Set(contexts);
    const scheduledEntries = structural.contexts.flatMap((context) => context.entries);
    const reached = scheduledEntries.filter(
      (entry): entry is TemplateCompilerFamilyReachedElementScheduleEntry =>
        entry instanceof TemplateCompilerFamilyReachedElementScheduleEntry,
    );
    const lowered = scheduledEntries.filter(
      (entry): entry is TemplateCompilerFamilyLoweredElementScheduleEntry =>
        entry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry,
    );
    const texts = scheduledEntries.filter(
      (entry): entry is TemplateCompilerFamilyTextScheduleEntry =>
        entry instanceof TemplateCompilerFamilyTextScheduleEntry,
    );
    const lets = scheduledEntries.filter(
      (entry): entry is TemplateCompilerFamilyLetScheduleEntry =>
        entry instanceof TemplateCompilerFamilyLetScheduleEntry,
    );
    const expectedGenerated = structural.contexts
      .map((context) => context.initialization)
      .filter((initialization) =>
        initialization.initializationKind === TemplateCompilerFamilyContextInitializationKind.Generated
      );
    const expectedAttributes = reached.flatMap((entry) => entry.attributes.filter((attribute) =>
      attribute.requiresConsumption
    ));
    const expectedTransitions = reached.flatMap((entry) =>
      entry.templateController == null ? [] : [entry.templateController]
    );
    const expectedTcRows = expectedTransitions.flatMap((transition) => transition.rowMappings);
    const expectedProjections = lowered.flatMap((entry) => entry.projection == null ? [] : [entry.projection]);
    const expectedOrdinaryRows = [
      ...lowered.flatMap((entry) => entry.targetRow == null ? [] : [entry.targetRow]),
      ...lets.map((entry) => entry.targetRow),
    ];
    const expectedTexts = texts.filter((entry) => entry.expansion != null);
    const generatedEntries = entries.filter(
      (entry): entry is TemplateCompilerFamilyGeneratedContextOperationScheduleEntry =>
        entry instanceof TemplateCompilerFamilyGeneratedContextOperationScheduleEntry,
    );
    const attributeEntries = entries.filter(
      (entry): entry is TemplateCompilerFamilyAttributeOperationScheduleEntry =>
        entry instanceof TemplateCompilerFamilyAttributeOperationScheduleEntry,
    );
    const tcRowEntries = entries.filter(
      (entry): entry is TemplateCompilerFamilyTemplateControllerRowOperationScheduleEntry =>
        entry instanceof TemplateCompilerFamilyTemplateControllerRowOperationScheduleEntry,
    );
    const rehomingEntries = entries.filter(
      (entry): entry is TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry =>
        entry instanceof TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry,
    );
    const projectionEntries = entries.filter(
      (entry): entry is TemplateCompilerFamilyProjectionOperationScheduleEntry =>
        entry instanceof TemplateCompilerFamilyProjectionOperationScheduleEntry,
    );
    const ordinaryEntries = entries.filter(
      (entry): entry is TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry =>
        entry instanceof TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry,
    );
    const textEntries = entries.filter(
      (entry): entry is TemplateCompilerFamilyTextOperationScheduleEntry =>
        entry instanceof TemplateCompilerFamilyTextOperationScheduleEntry,
    );
    if (
      authority !== familyOperationScheduleAuthority
      || contexts.length !== targetContexts.length
      || contexts.some((context, ordinal) => context.targetContext !== targetContexts[ordinal])
      || entries.some((entry) =>
        entry.operationKey.length === 0
        || entry.causeHandles.length === 0
        || !executionContextSet.has(entry.context)
      )
      || new Set(entries.map((entry) => entry.operationKey)).size !== entries.length
      || !sameObjectCoverage(generatedEntries.map((entry) => entry.initialization), expectedGenerated)
      || !sameObjectCoverage(attributeEntries.map((entry) => entry.schedule), expectedAttributes)
      || !sameObjectCoverage(tcRowEntries.map((entry) => entry.mapping), expectedTcRows)
      || !sameObjectCoverage(rehomingEntries.map((entry) => entry.transition), expectedTransitions)
      || !sameObjectCoverage(projectionEntries.map((entry) => entry.projection), expectedProjections)
      || !sameObjectCoverage(ordinaryEntries.map((entry) => entry.mapping), expectedOrdinaryRows)
      || !sameObjectCoverage(textEntries.map((entry) => entry.schedule), expectedTexts)
    ) {
      throw new Error('Context-family operation schedule lost context, operation, or cause authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === familyOperationScheduleAuthority;
  }
}

/** Flatten hierarchical context/child/return order into exact mutation-ledger admission order. */
export function buildTemplateCompilerContextFamilyOperationSchedule(
  structural: TemplateCompilerContextFamilyStructuralSchedulePreparation,
  contexts: readonly TemplateCompilerExecutionContextReference[],
): TemplateCompilerContextFamilyOperationSchedule {
  const executionContextByTarget = new Map(contexts.map((context) => [context.targetContext, context] as const));
  const entries: TemplateCompilerFamilyOperationScheduleEntry[] = [];
  const executionContext = (
    mapping: TemplateCompilerContextFamilyTargetContextMapping,
  ): TemplateCompilerExecutionContextReference => {
    const context = executionContextByTarget.get(mapping.targetContext) ?? null;
    if (context == null) {
      throw new Error(`Family context '${mapping.targetContext.localKey}' has no execution reference.`);
    }
    return context;
  };
  const appendGeneratedInitialization = (initialization: TemplateCompilerFamilyContextInitialization): void => {
    if (initialization.initializationKind !== TemplateCompilerFamilyContextInitializationKind.Generated) return;
    entries.push(new TemplateCompilerFamilyGeneratedContextOperationScheduleEntry(
      initialization,
      executionContext(initialization.contextMapping),
    ));
  };
  const visit = (band: TemplateCompilerFamilyContextExecutionBand): void => {
    for (const entry of band.entries) {
      if (entry instanceof TemplateCompilerFamilyReachedElementExecutionBand) {
        const reached = entry.schedule;
        const ownerContext = executionContext(reached.contextMapping);
        for (const attribute of reached.attributes) {
          if (attribute.requiresConsumption) {
            entries.push(new TemplateCompilerFamilyAttributeOperationScheduleEntry(attribute, ownerContext));
          }
        }
        const transition = entry.templateController;
        if (transition == null) continue;
        for (const contextBand of transition.contextChain) {
          appendGeneratedInitialization(contextBand.schedule.initialization);
        }
        for (const mapping of transition.schedule.rowMappings) {
          entries.push(new TemplateCompilerFamilyTemplateControllerRowOperationScheduleEntry(
            transition.schedule,
            mapping,
            executionContext(mapping.contextMapping),
          ));
        }
        entries.push(new TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry(
          transition.schedule,
          executionContext(transition.schedule.terminalLeaf),
        ));
        visit(transition.terminalLeaf);
        continue;
      }
      if (entry instanceof TemplateCompilerFamilyLoweredElementExecutionBand) {
        const lowered = entry.schedule;
        const projection = lowered.projection;
        if (projection != null) {
          const ownerContext = executionContext(projection.ownerContext);
          for (const group of entry.projectionGroups) {
            appendGeneratedInitialization(group.context.schedule.initialization);
          }
          entries.push(new TemplateCompilerFamilyProjectionOperationScheduleEntry(
            projection,
            ownerContext,
          ));
          for (const group of entry.projectionGroups) {
            visit(group.context);
          }
        }
        if (lowered.targetRow != null) {
          entries.push(new TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry(
            lowered.targetRow,
            executionContext(lowered.targetRow.contextMapping),
          ));
        }
        continue;
      }
      if (entry instanceof TemplateCompilerFamilyLetScheduleEntry) {
        entries.push(new TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry(
          entry.targetRow,
          executionContext(entry.contextMapping),
        ));
        continue;
      }
      if (entry.expansion != null) {
        entries.push(new TemplateCompilerFamilyTextOperationScheduleEntry(
          entry,
          executionContext(entry.contextMapping),
        ));
      }
    }
  };
  visit(structural.rootExecution);
  return new TemplateCompilerContextFamilyOperationSchedule(
    familyOperationScheduleAuthority,
    structural,
    contexts,
    entries,
  );
}

function rowCauseHandles(instructions: readonly TemplateInstruction[]): readonly ClaimEndpointHandle[] {
  return instructions.map((instruction) => instruction.productHandle);
}

function sameObjectCoverage<T>(actual: readonly T[], expected: readonly T[]): boolean {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return actual.length === expected.length
    && actualSet.size === actual.length
    && expectedSet.size === expected.length
    && actual.every((value) => expectedSet.has(value));
}
