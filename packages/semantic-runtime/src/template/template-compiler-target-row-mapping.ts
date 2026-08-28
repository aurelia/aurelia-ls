import type { HydrateElementInstruction } from './instruction-ir.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  TemplateCompilerMarkerTargetPlacement,
  type TemplateCompilerTargetRowPlan,
  TemplateCompilerTargetRowPlacementKind,
  TemplateCompilerTargetRowPosture,
} from './compiler-target-plan.js';
import type { TemplateCompilerOccurrenceTargetRowDraft } from './template-compiler-occurrence-row-assembly.js';

export interface TemplateCompilerTargetHydrateElementRowFunding {
  readonly row: TemplateCompilerOccurrenceTargetRowDraft;
  readonly instruction: HydrateElementInstruction;
}

/** Shared exact validator for one occurrence-primary row projected into a target context. */
export function validateTemplateCompilerOccurrenceTargetRowMapping(
  draft: TemplateCompilerOccurrenceTargetRowDraft,
  row: TemplateCompilerTargetRowPlan,
  hydrateElement: TemplateCompilerTargetHydrateElementRowFunding | null,
): void {
  const instructions = [
    ...(hydrateElement == null ? [] : [hydrateElement.instruction]),
    ...draft.instructions,
  ];
  const mismatches = [
    (draft.hydrateElement != null) !== (hydrateElement != null) ? 'hydrate-element-presence' : null,
    hydrateElement != null && hydrateElement.row !== draft ? 'hydrate-element-row' : null,
    row.stableSlotKey !== draft.stableSlotKey ? 'stable-slot' : null,
    row.ordinal !== draft.ordinal ? 'ordinal' : null,
    row.projectedTargetOrdinal !== draft.projectedTargetOrdinal ? 'projected-ordinal' : null,
    row.projectedTargetCount !== draft.projectedTargetCount ? 'projected-count' : null,
    row.targetKind !== draft.targetKind ? 'target-kind' : null,
    row.placement.placementKind !== draft.placementKind ? 'placement-kind' : null,
    draft.placementKind === TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement
      && (!(row.placement instanceof TemplateCompilerContainerlessReplacementPlacement)
        || row.placement.instruction !== hydrateElement?.instruction)
      ? 'containerless-placement'
      : null,
    draft.placementKind === TemplateCompilerTargetRowPlacementKind.Marker
      && !(row.placement instanceof TemplateCompilerMarkerTargetPlacement)
      ? 'marker-placement'
      : null,
    row.sourceAddressHandle !== draft.sourceAddressHandle ? 'source-address' : null,
    row.occurrence !== draft.occurrence ? 'occurrence' : null,
    row.node !== draft.authoredNode ? 'authored-node' : null,
    row.inputNode !== draft.occurrence.inputReference ? 'input-node' : null,
    row.expressionChainIndex !== (draft.textOutput?.hole.expressionChainIndex ?? null)
      ? 'expression-chain-index'
      : null,
    row.posture !== TemplateCompilerTargetRowPosture.Complete ? 'posture' : null,
    row.openSeamHandles.length !== 0 ? 'open-seams' : null,
    !sameObjects(row.instructions, instructions) ? 'instructions' : null,
  ].filter((mismatch): mismatch is string => mismatch != null);
  if (mismatches.length > 0) {
    throw new Error(`Occurrence target row '${draft.stableSlotKey}' lost ${mismatches.join(', ')} authority.`);
  }
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}
