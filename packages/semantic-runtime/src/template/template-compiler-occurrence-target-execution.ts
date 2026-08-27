import {
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
  type TemplateCompilerOccurrenceTargetExecutionClosure,
  type TemplateCompilerOccurrenceTargetAttachment,
  type TemplateCompilerOperation,
} from './template-compiler-execution.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerGeneratedOccurrenceRole,
  type TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerTextExpansionOutputKind,
  type TemplateCompilerOccurrenceAttributeDispositionDraft,
} from './template-compiler-occurrence-row-assembly.js';
import type { TemplateCompilerCompletedOrdinarySite } from './template-compiler-root-completion.js';
import {
  TemplateCompilerOccurrenceAttributeScheduleEntry,
  TemplateCompilerOccurrenceElementTargetScheduleEntry,
  TemplateCompilerOccurrenceTextExpansionScheduleEntry,
} from './template-compiler-occurrence-target-schedule.js';
import type {
  TemplateCompilerConsumedAttributeDisposition,
  TemplateCompilerInputTextExpansion,
  TemplateCompilerTargetGeometry,
} from './template-compiler-structural-execution.js';

const occurrenceTargetExecutionAuthority = {};
const exactExecutionsByAttachment = new WeakMap<
  TemplateCompilerOccurrenceTargetAttachment,
  TemplateCompilerOccurrenceTargetExecution
>();

/** Exact completed mechanics for one receipt-bound ordinary-root occurrence plan. */
export class TemplateCompilerOccurrenceTargetExecution {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly attachment: TemplateCompilerOccurrenceTargetAttachment,
    readonly operations: readonly TemplateCompilerOperation[],
    readonly attributeDispositions: readonly TemplateCompilerConsumedAttributeDisposition[],
    readonly textExpansions: readonly TemplateCompilerInputTextExpansion[],
    readonly targetGeometries: readonly TemplateCompilerTargetGeometry[],
    readonly closure: TemplateCompilerOccurrenceTargetExecutionClosure,
  ) {
    const rowAssembly = attachment.assembly.rows;
    const removedCount = rowAssembly.attributeDispositions.filter((disposition) =>
      disposition.disposition === TemplateCompilerLiveAttributeDisposition.Removed
    ).length;
    if (
      authority !== occurrenceTargetExecutionAuthority
      || closure.attachment !== attachment
      || attributeDispositions.length !== removedCount
      || textExpansions.length !== rowAssembly.textExpansions.length
      || targetGeometries.length !== rowAssembly.rows.length
      || operations.length !== removedCount + rowAssembly.rows.filter((row) => row.textOutput == null).length
        + rowAssembly.textExpansions.length
    ) {
      throw new Error('Occurrence target execution lost operation, disposition, expansion, or geometry coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrenceTargetExecutionAuthority;
  }
}

/**
 * Execute the exact HE-free ordinary-root plan in completed-site order and close its structural result.
 *
 * Element rows become one marker operation after their removed attributes. A text interpolation remains one atomic
 * expansion operation regardless of hole count; its static segments, placeholders, and markers share that cause band.
 */
export function executeTemplateCompilerOccurrenceTarget(
  attachment: TemplateCompilerOccurrenceTargetAttachment,
): TemplateCompilerOccurrenceTargetExecution {
  const existing = exactExecutionsByAttachment.get(attachment) ?? null;
  if (existing != null) return existing;
  if (!attachment.isModuleConstructed()) {
    throw new Error('Occurrence target execution requires one module-constructed attachment.');
  }
  const assembly = attachment.assembly;
  const rows = assembly.rows;
  const execution = attachment.execution;
  const structural = attachment.structuralExecution;
  const context = attachment.contexts.length === 1 ? attachment.contexts[0] : null;
  if (
    context == null
    || !attachment.isCurrent()
    || context.targetContext !== assembly.targetPlan.root
    || execution.structuralExecution !== structural
    || structural.readTargetPlans().length !== 1
    || structural.readTargetPlans()[0] !== assembly.targetPlan
  ) {
    throw new Error('Ordinary-root occurrence execution requires one exact current attached root context.');
  }
  if (
    execution.sequence.readContextOperations(context).length !== 0
    || structural.readConsumedNodeDispositions(context.targetContext).length !== 0
    || structural.readConsumedAttributeDispositions(context.targetContext).length !== 0
    || structural.readInputNodeTransfers(context.targetContext).length !== 0
    || structural.readInputTextExpansions(context.targetContext).length !== 0
    || structural.readTargetGeometries(context.targetContext).length !== 0
  ) {
    throw new Error('Ordinary-root occurrence execution requires an untouched attached target frontier.');
  }

  const schedule = attachment.schedule;
  const operations: TemplateCompilerOperation[] = [];
  const attributeDispositions: TemplateCompilerConsumedAttributeDisposition[] = [];
  const textExpansions: TemplateCompilerInputTextExpansion[] = [];
  const targetGeometries: TemplateCompilerTargetGeometry[] = [];

  for (const entry of schedule.entries) {
    if (entry instanceof TemplateCompilerOccurrenceAttributeScheduleEntry) {
      const disposition = entry.disposition;
      if (disposition.attribute.readOwnerOrdinal() !== disposition.simulatedLiveOrdinal) {
        throw new Error(
          `Attribute disposition '${disposition.stableSlotKey}' lost its JIT-live owner ordinal.`,
        );
      }
      const attempt = execution.beginOperation({
        operationKey: entry.operationKey,
        context,
        operationKind: TemplateCompilerOperationKind.AttributeDisposition,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.occurrenceTarget(context, disposition.attribute),
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      attributeDispositions.push(structural.consumeAttributeForContext(
        disposition.attribute,
        context.targetContext,
        entry.causeHandles,
        (attribute) => execution.detachTargetAttribute(attempt, attribute),
      ));
      operations.push(execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      ));
      continue;
    }

    if (entry instanceof TemplateCompilerOccurrenceElementTargetScheduleEntry) {
      const mapping = entry.mapping;
      const attempt = execution.beginOperation({
        operationKey: entry.operationKey,
        context,
        operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.occurrenceTarget(context, mapping.draft.occurrence),
        causeHandles: entry.causeHandles,
        sourceAddressHandle: entry.sourceAddressHandle,
      });
      targetGeometries.push(structural.realizeMarkerTarget(mapping.row, mapping.draft.occurrence));
      operations.push(execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      ));
      continue;
    }

    if (!(entry instanceof TemplateCompilerOccurrenceTextExpansionScheduleEntry)) {
      throw new Error('Occurrence target schedule contains an unknown operation entry.');
    }
    const expansion = entry.expansion;
    const mappings = entry.mappings;
    const attempt = execution.beginOperation({
      operationKey: entry.operationKey,
      context,
      operationKind: TemplateCompilerOperationKind.TextInterpolationExpansion,
      executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
      target: execution.occurrenceTarget(context, expansion.site.event.text),
      causeHandles: entry.causeHandles,
      sourceAddressHandle: entry.sourceAddressHandle,
    });
    const generatedOutputs: TemplateCompilerTextOccurrence[] = [];
    const generatedHoleOutputs = new Map<number, TemplateCompilerTextOccurrence>();
    const mappingByHoleIndex = new Map(mappings.map((mapping) => [
      mapping.draft.textOutput!.holeIndex,
      mapping,
    ] as const));
    let staticOrdinal = 0;
    for (const output of expansion.outputs) {
      const role = output.outputKind === TemplateCompilerTextExpansionOutputKind.Static
        ? TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment
        : TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder;
      const mapping = output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole
        ? mappingByHoleIndex.get(output.holeIndex) ?? null
        : null;
      if (output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole && mapping == null) {
        throw new Error(`Text expansion '${expansion.stableSlotKey}' lost hole ${output.holeIndex}.`);
      }
      const generation = output.outputKind === TemplateCompilerTextExpansionOutputKind.Static
        ? execution.createGeneration(attempt, role, staticOrdinal++)
        : execution.createGenerationOutput(
          attempt,
          mapping!.row.localKey,
          mapping!.row.instructions.map((instruction) => instruction.productHandle),
          role,
          0,
        );
      const generated = execution.forest.createGeneratedText(
        generation,
        output.outputKind === TemplateCompilerTextExpansionOutputKind.Static ? output.text : ' ',
        expansion.site.event.text.inputReference,
      );
      generatedOutputs.push(generated);
      if (output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole) {
        generatedHoleOutputs.set(output.holeIndex, generated);
      }
    }
    textExpansions.push(structural.expandTextInput(
      expansion.site.event.text,
      context.targetContext,
      generatedOutputs,
      entry.causeHandles,
      (input) => execution.detachTargetText(attempt, input),
    ));
    for (const mapping of mappings) {
      const holeIndex = mapping.draft.textOutput!.holeIndex;
      const placeholder = generatedHoleOutputs.get(holeIndex) ?? null;
      if (placeholder == null) {
        throw new Error(`Text expansion '${expansion.stableSlotKey}' lost hole ${holeIndex}.`);
      }
      targetGeometries.push(structural.realizeMarkerTargetForOperation(
        mapping.row,
        placeholder,
        entry.operationKey,
        entry.causeHandles,
        0,
        mapping.row.localKey,
        mapping.row.instructions.map((instruction) => instruction.productHandle),
      ));
    }
    operations.push(execution.completeOperation(
      attempt,
      new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
    ));
  }

  for (const site of rows.receipt.elementSites) {
    assertFinalOwnerAttributeState(site, schedule.attributeDispositionsBySite.get(site) ?? []);
  }

  assertDispositionCoverage(rows.attributeDispositions, structural.readConsumedAttributeDispositions());
  const closure = execution.closeOccurrenceTargetExecution(attachment);
  execution.assertCoherent();
  const result = new TemplateCompilerOccurrenceTargetExecution(
    occurrenceTargetExecutionAuthority,
    attachment,
    operations,
    attributeDispositions,
    textExpansions,
    targetGeometries,
    closure,
  );
  exactExecutionsByAttachment.set(attachment, result);
  return result;
}

function assertDispositionCoverage(
  drafts: readonly TemplateCompilerOccurrenceAttributeDispositionDraft[],
  consumed: readonly TemplateCompilerConsumedAttributeDisposition[],
): void {
  const removed = drafts.filter((draft) => draft.disposition === TemplateCompilerLiveAttributeDisposition.Removed);
  const retained = drafts.filter((draft) => draft.disposition === TemplateCompilerLiveAttributeDisposition.Retained);
  if (
    consumed.length !== removed.length
    || consumed.some((disposition, index) => disposition.attribute !== removed[index]?.attribute)
    || retained.some((draft) => draft.attribute.owner !== draft.site.event.element)
  ) {
    throw new Error('Occurrence target execution diverged from final live attribute dispositions.');
  }
}

function assertFinalOwnerAttributeState(
  site: Extract<TemplateCompilerCompletedOrdinarySite, { readonly siteKind: 'element' }>,
  dispositions: readonly TemplateCompilerOccurrenceAttributeDispositionDraft[],
): void {
  const retained = dispositions.filter((disposition) =>
    disposition.disposition === TemplateCompilerLiveAttributeDisposition.Retained
  );
  const actual = site.event.element.readAttributes();
  if (
    actual.length !== retained.length
    || actual.some((attribute, ordinal) => attribute !== retained[ordinal]?.attribute)
    || retained.some((disposition) => disposition.attribute.value !== disposition.finalValue)
  ) {
    throw new Error(`Element '${site.event.element.occurrenceKey}' diverged from its final JIT attribute view.`);
  }
}
