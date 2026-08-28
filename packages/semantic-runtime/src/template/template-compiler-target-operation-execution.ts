import type { AddressHandle } from '../kernel/handles.js';
import type { ClaimEndpointHandle } from '../kernel/claim.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  type TemplateCompilerTargetRowPlan,
} from './compiler-target-plan.js';
import {
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  type TemplateCompilerExecutionContextReference,
  type TemplateCompilerExecutionSession,
  type TemplateCompilerOperation,
} from './template-compiler-execution.js';
import { TemplateCompilerOperationKind } from './template-compiler-operation.js';
import type { TemplateCompilerLiveAttributeOwnerResult } from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  type TemplateCompilerNodeOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerTextExpansionOutputKind,
  type TemplateCompilerOccurrenceAttributeDispositionDraft,
  type TemplateCompilerOccurrenceTargetRowDraft,
  type TemplateCompilerTextExpansionDraft,
} from './template-compiler-occurrence-row-assembly.js';
import type {
  TemplateCompilerConsumedAttributeDisposition,
  TemplateCompilerInputTextExpansion,
  TemplateCompilerStructuralExecutionSession,
  TemplateCompilerTargetGeometry,
} from './template-compiler-structural-execution.js';

export interface TemplateCompilerTargetAttributeOperationRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly structural: TemplateCompilerStructuralExecutionSession;
  readonly context: TemplateCompilerExecutionContextReference;
  readonly operationKey: string;
  readonly disposition: TemplateCompilerOccurrenceAttributeDispositionDraft;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly sourceAddressHandle: AddressHandle | null;
}

export class TemplateCompilerTargetAttributeOperationResult {
  constructor(
    readonly operation: TemplateCompilerOperation,
    readonly disposition: TemplateCompilerConsumedAttributeDisposition,
  ) {}
}

/** Prove one reached element's final live attribute collection, values, order, and removed-owner disposition. */
export function assertTemplateCompilerFinalAttributeSiteState(
  owner: TemplateCompilerLiveAttributeOwnerResult,
  dispositions: readonly TemplateCompilerOccurrenceAttributeDispositionDraft[],
): void {
  const element = owner.element;
  const visible = owner.ownerInput.visibleAttributes;
  const retained = dispositions.filter((disposition) =>
    disposition.disposition === TemplateCompilerLiveAttributeDisposition.Retained
  );
  const removed = dispositions.filter((disposition) =>
    disposition.disposition === TemplateCompilerLiveAttributeDisposition.Removed
  );
  const actual = element.readAttributes();
  if (
    dispositions.length !== visible.length
    || dispositions.some((disposition, ordinal) => disposition.attribute !== visible[ordinal])
    || actual.length !== retained.length
    || actual.some((attribute, ordinal) => attribute !== retained[ordinal]?.attribute)
    || retained.some((disposition) =>
      disposition.attribute.owner !== element
      || disposition.attribute.value !== disposition.finalValue
    )
    || removed.some((disposition) => disposition.attribute.owner != null)
    || owner.ownerInput.suppressedAttributes.some((attribute) => attribute.owner != null)
  ) {
    throw new Error(`Element '${element.occurrenceKey}' diverged from its final JIT attribute view.`);
  }
}

/** Execute the one shared live-attribute consumption law for ordinary and context-family targets. */
export function executeTemplateCompilerTargetAttributeOperation(
  request: TemplateCompilerTargetAttributeOperationRequest,
): TemplateCompilerTargetAttributeOperationResult {
  const { execution, structural, context, disposition } = request;
  if (disposition.attribute.readOwnerOrdinal() !== disposition.simulatedLiveOrdinal) {
    throw new Error(`Attribute disposition '${request.operationKey}' lost its JIT-live owner ordinal.`);
  }
  const attempt = execution.beginOperation({
    operationKey: request.operationKey,
    context,
    operationKind: TemplateCompilerOperationKind.AttributeDisposition,
    executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
    target: execution.occurrenceTarget(context, disposition.attribute),
    causeHandles: request.causeHandles,
    sourceAddressHandle: request.sourceAddressHandle,
  });
  const consumed = structural.consumeAttributeForContext(
    disposition.attribute,
    context.targetContext,
    request.causeHandles,
    (attribute) => execution.detachTargetAttribute(attempt, attribute),
  );
  return new TemplateCompilerTargetAttributeOperationResult(
    complete(execution, attempt),
    consumed,
  );
}

export interface TemplateCompilerOrdinaryTargetOperationRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly structural: TemplateCompilerStructuralExecutionSession;
  readonly context: TemplateCompilerExecutionContextReference;
  readonly operationKey: string;
  readonly row: TemplateCompilerTargetRowPlan;
  readonly occurrence: TemplateCompilerNodeOccurrence;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly sourceAddressHandle: AddressHandle | null;
}

export class TemplateCompilerOrdinaryTargetOperationResult {
  constructor(
    readonly operation: TemplateCompilerOperation,
    readonly geometry: TemplateCompilerTargetGeometry,
  ) {}
}

/** Execute the shared marker/containerless geometry law after all child-context lowering has returned. */
export function executeTemplateCompilerOrdinaryTargetOperation(
  request: TemplateCompilerOrdinaryTargetOperationRequest,
): TemplateCompilerOrdinaryTargetOperationResult {
  const { execution, structural, context, row, occurrence } = request;
  const isContainerless = row.placement instanceof TemplateCompilerContainerlessReplacementPlacement;
  const attempt = execution.beginOperation({
    operationKey: request.operationKey,
    context,
    operationKind: isContainerless
      ? TemplateCompilerOperationKind.ContainerlessReplacement
      : TemplateCompilerOperationKind.HydrationTargetCreation,
    executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
    target: execution.occurrenceTarget(context, occurrence),
    causeHandles: request.causeHandles,
    sourceAddressHandle: request.sourceAddressHandle,
  });
  let geometry: TemplateCompilerTargetGeometry;
  if (isContainerless) {
    if (!(occurrence instanceof TemplateCompilerElementOccurrence)) {
      throw new Error(`Containerless row '${row.localKey}' lost its element occurrence.`);
    }
    geometry = structural.realizeRenderLocationTarget(
      row,
      occurrence,
      [],
      (element) => execution.detachContainerlessTarget(attempt, element),
    );
  } else {
    if (!(occurrence instanceof TemplateCompilerElementOccurrence) && !(occurrence instanceof TemplateCompilerTextOccurrence)) {
      throw new Error(`Marker row '${row.localKey}' lost its element/text occurrence.`);
    }
    geometry = structural.realizeMarkerTarget(row, occurrence);
  }
  return new TemplateCompilerOrdinaryTargetOperationResult(
    complete(execution, attempt),
    geometry,
  );
}

export interface TemplateCompilerTextTargetRowMapping {
  readonly draft: TemplateCompilerOccurrenceTargetRowDraft;
  readonly row: TemplateCompilerTargetRowPlan;
}

export interface TemplateCompilerTextExpansionOperationRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly structural: TemplateCompilerStructuralExecutionSession;
  readonly context: TemplateCompilerExecutionContextReference;
  readonly operationKey: string;
  readonly expansion: TemplateCompilerTextExpansionDraft;
  readonly mappings: readonly TemplateCompilerTextTargetRowMapping[];
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly sourceAddressHandle: AddressHandle | null;
}

export class TemplateCompilerTextExpansionOperationResult {
  constructor(
    readonly operation: TemplateCompilerOperation,
    readonly expansion: TemplateCompilerInputTextExpansion,
    readonly geometries: readonly TemplateCompilerTargetGeometry[],
  ) {}
}

/** Execute one atomic text split and all of its hole markers under one shared mutation batch. */
export function executeTemplateCompilerTextExpansionOperation(
  request: TemplateCompilerTextExpansionOperationRequest,
): TemplateCompilerTextExpansionOperationResult {
  const { execution, structural, context, expansion, mappings } = request;
  const input = expansion.site.event.text;
  const attempt = execution.beginOperation({
    operationKey: request.operationKey,
    context,
    operationKind: TemplateCompilerOperationKind.TextInterpolationExpansion,
    executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
    target: execution.occurrenceTarget(context, input),
    causeHandles: request.causeHandles,
    sourceAddressHandle: request.sourceAddressHandle,
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
      input.inputReference,
    );
    generatedOutputs.push(generated);
    if (output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole) {
      generatedHoleOutputs.set(output.holeIndex, generated);
    }
  }
  const realizedExpansion = structural.expandTextInput(
    input,
    context.targetContext,
    generatedOutputs,
    request.causeHandles,
    (text) => execution.detachTargetText(attempt, text),
  );
  const geometries = mappings.map((mapping) => {
    const holeIndex = mapping.draft.textOutput!.holeIndex;
    const placeholder = generatedHoleOutputs.get(holeIndex) ?? null;
    if (placeholder == null) {
      throw new Error(`Text expansion '${expansion.stableSlotKey}' lost hole ${holeIndex}.`);
    }
    return structural.realizeMarkerTargetForOperation(
      mapping.row,
      placeholder,
      request.operationKey,
      request.causeHandles,
      0,
      mapping.row.localKey,
      mapping.row.instructions.map((instruction) => instruction.productHandle),
    );
  });
  return new TemplateCompilerTextExpansionOperationResult(
    complete(execution, attempt),
    realizedExpansion,
    geometries,
  );
}

function complete(
  execution: TemplateCompilerExecutionSession,
  attempt: ReturnType<TemplateCompilerExecutionSession['beginOperation']>,
): TemplateCompilerOperation {
  return execution.completeOperation(
    attempt,
    new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
  );
}
