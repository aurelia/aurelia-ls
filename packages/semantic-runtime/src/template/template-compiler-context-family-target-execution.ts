import type { TemplateCompilerTargetContextPlan } from './compiler-target-plan.js';
import {
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerInstructionOperationTarget,
  type TemplateCompilerContextFamilyTargetExecutionClosure,
  type TemplateCompilerContextFamilyTargetAttachment,
  type TemplateCompilerExecutionContextReference,
  type TemplateCompilerOperation,
} from './template-compiler-execution.js';
import {
  TemplateCompilerFamilyAttributeOperationScheduleEntry,
  TemplateCompilerFamilyGeneratedContextOperationScheduleEntry,
  TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry,
  TemplateCompilerFamilyProjectionOperationScheduleEntry,
  TemplateCompilerFamilySurrogateAttributeOperationScheduleEntry,
  TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry,
  TemplateCompilerFamilyTemplateControllerRowOperationScheduleEntry,
  TemplateCompilerFamilyTextOperationScheduleEntry,
} from './template-compiler-context-family-operation-schedule.js';
import { TemplateCompilerFamilyContextInitializationKind } from './template-compiler-context-family-structural-schedule.js';
import {
  HydrateElementProjectionContributorDisposition,
  type TemplateInstruction,
} from './instruction-ir.js';
import type { TemplateCompilerOccurrenceAttributeDispositionDraft } from './template-compiler-occurrence-row-assembly.js';
import {
  assertTemplateCompilerFinalAttributeOwnerState,
  executeTemplateCompilerOrdinaryTargetOperation,
  executeTemplateCompilerRootSurrogateAttributeOperation,
  executeTemplateCompilerTargetAttributeOperation,
  executeTemplateCompilerTextExpansionOperation,
} from './template-compiler-target-operation-execution.js';
import type {
  TemplateCompilerConsumedAttributeDisposition,
  TemplateCompilerConsumedNodeDisposition,
  TemplateCompilerInputNodeTransfer,
  TemplateCompilerInputTextExpansion,
  TemplateCompilerTargetGeometry,
} from './template-compiler-structural-execution.js';

const familyTargetExecutionAuthority = {};
const exactExecutionsByAttachment = new WeakMap<
  TemplateCompilerContextFamilyTargetAttachment,
  TemplateCompilerContextFamilyTargetExecution
>();

/** Exact completed normalized mechanics for one funded context-family compiler plan. */
export class TemplateCompilerContextFamilyTargetExecution {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly attachment: TemplateCompilerContextFamilyTargetAttachment,
    readonly operations: readonly TemplateCompilerOperation[],
    readonly consumedNodes: readonly TemplateCompilerConsumedNodeDisposition[],
    readonly consumedAttributes: readonly TemplateCompilerConsumedAttributeDisposition[],
    readonly inputTransfers: readonly TemplateCompilerInputNodeTransfer[],
    readonly textExpansions: readonly TemplateCompilerInputTextExpansion[],
    readonly targetGeometries: readonly TemplateCompilerTargetGeometry[],
    readonly closure: TemplateCompilerContextFamilyTargetExecutionClosure,
  ) {
    if (
      authority !== familyTargetExecutionAuthority
      || closure.attachment !== attachment
      || operations.length !== attachment.operationSchedule.entries.length
      || targetGeometries.length !== attachment.target.rowMappings.length
    ) {
      throw new Error('Context-family target execution lost operation, structure, or closure coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === familyTargetExecutionAuthority;
  }
}

/** Execute one committed family schedule in its exact context/child/return order and close the structural result. */
export function executeTemplateCompilerContextFamilyTarget(
  attachment: TemplateCompilerContextFamilyTargetAttachment,
): TemplateCompilerContextFamilyTargetExecution {
  const existing = exactExecutionsByAttachment.get(attachment) ?? null;
  if (existing != null) return existing;
  if (!attachment.isModuleConstructed() || !attachment.isCurrent()) {
    throw new Error('Context-family target execution requires one current module-constructed attachment.');
  }
  const execution = attachment.execution;
  const structural = attachment.structuralExecution;
  const rootContext = attachment.target.targetPlan.root;
  if (
    execution.structuralExecution !== structural
    || structural.readTargetPlans().length !== 1
    || structural.readTargetPlans()[0] !== attachment.target.targetPlan
    || attachment.contexts.some((context) => execution.sequence.readContextOperations(context).length > 0)
    || structural.readContextStructure(rootContext) == null
    || attachment.contexts.slice(1).some((context) =>
      structural.readContextStructure(context.targetContext) != null
    )
    || structural.readConsumedAttributeDispositions().length !== 0
    || structural.readInputNodeTransfers().length !== 0
    || structural.readInputTextExpansions().length !== 0
    || structural.readTargetGeometries(rootContext).length !== 0
  ) {
    throw new Error('Context-family target execution requires its exact untouched attached structural frontier.');
  }

  const executionContextByTarget = new Map(
    attachment.contexts.map((context) => [context.targetContext, context] as const),
  );
  const operations: TemplateCompilerOperation[] = [];
  for (const entry of attachment.operationSchedule.entries) {
    if (entry instanceof TemplateCompilerFamilyGeneratedContextOperationScheduleEntry) {
      const attempt = execution.beginOperation({
        operationKey: entry.operationKey,
        context: entry.context,
        operationKind: entry.operationKind,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: instructionTarget(entry.instruction),
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      structural.createGeneratedContextStructure(entry.context.targetContext, entry.causeHandles);
      operations.push(complete(execution, attempt));
      continue;
    }

    if (
      entry instanceof TemplateCompilerFamilyAttributeOperationScheduleEntry
      || entry instanceof TemplateCompilerFamilySurrogateAttributeOperationScheduleEntry
    ) {
      const executeAttribute = entry instanceof TemplateCompilerFamilySurrogateAttributeOperationScheduleEntry
        ? executeTemplateCompilerRootSurrogateAttributeOperation
        : executeTemplateCompilerTargetAttributeOperation;
      const result = executeAttribute({
        execution,
        structural,
        context: entry.context,
        operationKey: entry.operationKey,
        disposition: entry.draft,
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      operations.push(result.operation);
      continue;
    }

    if (entry instanceof TemplateCompilerFamilyTemplateControllerRowOperationScheduleEntry) {
      const target = entry.occurrence == null
        ? instructionTarget(entry.instruction)
        : execution.occurrenceTarget(entry.context, entry.occurrence);
      const attempt = execution.beginOperation({
        operationKey: entry.operationKey,
        context: entry.context,
        operationKind: entry.operationKind,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target,
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      if (entry.occurrence == null) {
        structural.appendRenderLocationTarget(entry.mapping.row);
      } else {
        structural.realizeRenderLocationTarget(
          entry.mapping.row,
          entry.occurrence,
          [],
          (element) => execution.detachTemplateControllerTarget(attempt, element),
        );
      }
      operations.push(complete(execution, attempt));
      continue;
    }

    if (entry instanceof TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry) {
      const attempt = execution.beginOperation({
        operationKey: entry.operationKey,
        context: entry.context,
        operationKind: entry.operationKind,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: instructionTarget(entry.instruction),
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      rehomeTemplateControllerSource(
        attachment,
        entry,
        executionContextByTarget,
      );
      operations.push(complete(execution, attempt));
      continue;
    }

    if (entry instanceof TemplateCompilerFamilyProjectionOperationScheduleEntry) {
      const attempt = execution.beginOperation({
        operationKey: entry.operationKey,
        context: entry.context,
        operationKind: entry.operationKind,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: instructionTarget(entry.instruction),
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      const scheduledContributors = new Map(entry.projection.groups.flatMap((group) =>
        group.contributors.map((contributor) => [contributor.receipt, group] as const)
      ));
      const discardedContributors = new Map(entry.projection.discardedContributors.map((contributor) =>
        [contributor.receipt, contributor] as const
      ));
      const destinationOrdinals = new Map<TemplateCompilerTargetContextPlan, number>(
        entry.projection.groups.map((group) => [group.contextMapping.targetContext, 0] as const),
      );
      for (const physicalContributor of entry.projection.physicalContributors) {
        const receipt = physicalContributor.receipt;
        const discarded = discardedContributors.get(receipt) ?? null;
        if (discarded != null) {
          structural.consumeNodeForContext(
            receipt.source.node,
            entry.context.targetContext,
            entry.causeHandles,
            (node) => execution.detachProjectionInput(attempt, node),
          );
          continue;
        }
        const scheduled = scheduledContributors.get(receipt) ?? null;
        if (scheduled == null) {
          throw new Error(`Projection contributor '${receipt.source.node.occurrenceKey}' lost its scheduled group.`);
        }
        const targetContext = scheduled.contextMapping.targetContext;
        let destinationOrdinal = destinationOrdinals.get(targetContext) ?? 0;
        const slotAttribute = receipt.slotConsumption?.attribute ?? null;
        if (slotAttribute != null) {
          structural.consumeAttributeForContext(
            slotAttribute,
            entry.context.targetContext,
            entry.causeHandles,
            (attribute) => execution.detachProjectionSlotAttribute(attempt, attribute),
          );
        }
        switch (receipt.contributor.disposition) {
          case HydrateElementProjectionContributorDisposition.RetainedNode:
            structural.moveNodeIntoContext(
              receipt.source.node,
              targetContext,
              destinationOrdinal++,
              entry.causeHandles,
              (node, destinationParent, ordinal) =>
                execution.moveProjectionInput(attempt, node, destinationParent, ordinal),
            );
            break;
          case HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent: {
            const wrapper = receipt.unwrappedWrapper;
            if (wrapper == null) {
              throw new Error('Unwrapped projection contributor lost its wrapper/content receipt.');
            }
            const children = [...wrapper.content.readChildren()];
            structural.consumeNodeForContext(
              wrapper.wrapper,
              targetContext,
              entry.causeHandles,
              (node) => execution.detachProjectionInput(attempt, node),
            );
            for (const child of children) {
              structural.moveNodeIntoContext(
                child,
                targetContext,
                destinationOrdinal++,
                entry.causeHandles,
                (node, destinationParent, ordinal) =>
                  execution.moveProjectionInput(attempt, node, destinationParent, ordinal),
              );
            }
            break;
          }
          case HydrateElementProjectionContributorDisposition.DiscardedWhitespace:
            throw new Error('Discarded projection contributor appeared in a definition-producing group.');
        }
        destinationOrdinals.set(targetContext, destinationOrdinal);
      }
      operations.push(complete(execution, attempt));
      continue;
    }

    if (entry instanceof TemplateCompilerFamilyOrdinaryTargetOperationScheduleEntry) {
      const result = executeTemplateCompilerOrdinaryTargetOperation({
        execution,
        structural,
        context: entry.context,
        operationKey: entry.operationKey,
        row: entry.mapping.row,
        occurrence: entry.occurrence,
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      operations.push(result.operation);
      continue;
    }

    if (!(entry instanceof TemplateCompilerFamilyTextOperationScheduleEntry)) {
      throw new Error('Context-family operation schedule contains an unknown entry.');
    }
    const result = executeTemplateCompilerTextExpansionOperation({
      execution,
      structural,
      context: entry.context,
      operationKey: entry.operationKey,
      expansion: entry.schedule.expansion!,
      mappings: entry.schedule.rows,
      causeHandles: entry.causeHandles,
      sourceAddressHandle: entry.sourceAddressHandle,
    });
    operations.push(result.operation);
  }

  assertFinalAttributeState(attachment);
  const closure = execution.closeContextFamilyTargetExecution(attachment);
  execution.assertCoherent();
  const result = new TemplateCompilerContextFamilyTargetExecution(
    familyTargetExecutionAuthority,
    attachment,
    operations,
    structural.readConsumedNodeDispositions(),
    structural.readConsumedAttributeDispositions(),
    structural.readInputNodeTransfers(),
    structural.readInputTextExpansions(),
    attachment.target.targetPlan.readContexts().flatMap((context) => structural.readTargetGeometries(context)),
    closure,
  );
  exactExecutionsByAttachment.set(attachment, result);
  return result;
}

function rehomeTemplateControllerSource(
  attachment: TemplateCompilerContextFamilyTargetAttachment,
  entry: TemplateCompilerFamilyTemplateControllerRehomingOperationScheduleEntry,
  executionContextByTarget: ReadonlyMap<
    TemplateCompilerExecutionContextReference['targetContext'],
    TemplateCompilerExecutionContextReference
  >,
): void {
  const source = entry.transition.event.host;
  const terminalMapping = entry.transition.terminalLeaf;
  const terminalContext = executionContextByTarget.get(terminalMapping.targetContext) ?? null;
  const initialization = attachment.schedule.contextByCursor.get(terminalMapping.cursorContext)?.initialization ?? null;
  if (terminalContext == null || initialization == null) {
    throw new Error(`Template-controller source '${source.occurrenceKey}' lost its terminal execution context.`);
  }
  const causeHandles = [terminalContext.targetContext.owner.productHandle];
  switch (initialization.initializationKind) {
    case TemplateCompilerFamilyContextInitializationKind.AdoptedInput:
      if (
        initialization.inputCarrier !== source
        || initialization.inputContent == null
      ) {
        throw new Error(`Template-controller source '${source.occurrenceKey}' lost its adopted carrier/content pair.`);
      }
      attachment.structuralExecution.adoptInputContextStructure(
        terminalContext.targetContext,
        source,
        initialization.inputContent,
        causeHandles,
      );
      break;
    case TemplateCompilerFamilyContextInitializationKind.Generated:
      attachment.structuralExecution.moveNodeIntoContext(
        source,
        terminalContext.targetContext,
        0,
        causeHandles,
      );
      break;
    case TemplateCompilerFamilyContextInitializationKind.RootBound:
      throw new Error(`Template-controller source '${source.occurrenceKey}' cannot rehome into the root context.`);
  }
}

function assertFinalAttributeState(attachment: TemplateCompilerContextFamilyTargetAttachment): void {
  const dispositionsBySite = new Map<object, TemplateCompilerOccurrenceAttributeDispositionDraft[]>();
  for (const mapping of attachment.target.attributeDispositionMappings) {
    const site = mapping.draft.site;
    const dispositions = dispositionsBySite.get(site);
    if (dispositions == null) dispositionsBySite.set(site, [mapping.draft]);
    else dispositions.push(mapping.draft);
  }
  const visited = new Set<object>();
  for (const disposition of attachment.target.allocation.rows.reachDispositions) {
    const site = disposition.site;
    if (site.siteKind !== 'element' || visited.has(site)) continue;
    visited.add(site);
    assertTemplateCompilerFinalAttributeOwnerState(
      site.owner,
      dispositionsBySite.get(site) ?? [],
    );
  }
  const rows = attachment.target.allocation.rows;
  const surrogate = rows.receipt.traversal.audit.surrogateClassification?.result.staging ?? null;
  if (surrogate != null) {
    assertTemplateCompilerFinalAttributeOwnerState(
      surrogate.owner,
      rows.surrogateAttributeDispositions,
    );
  }
}

function instructionTarget(instruction: TemplateInstruction): TemplateCompilerInstructionOperationTarget {
  return new TemplateCompilerInstructionOperationTarget(
    instruction.productHandle,
    instruction.identityHandle,
  );
}

function complete(
  execution: TemplateCompilerContextFamilyTargetAttachment['execution'],
  attempt: ReturnType<TemplateCompilerContextFamilyTargetAttachment['execution']['beginOperation']>,
): TemplateCompilerOperation {
  return execution.completeOperation(
    attempt,
    new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
  );
}
