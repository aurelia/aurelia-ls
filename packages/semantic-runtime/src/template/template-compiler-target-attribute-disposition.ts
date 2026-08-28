import type { ClaimEndpointHandle } from '../kernel/claim.js';
import { AttributeClassificationKind } from './attribute-syntax.js';
import type { HydrateElementInstruction, TemplateInstruction } from './instruction-ir.js';
import { TemplateCompilerLiveAttributeTargetLane } from './template-compiler-live-attribute-assembly.js';
import type { TemplateCompilerAllocatedCaptureSyntaxReference } from './template-compiler-hydrate-element-funding.js';
import type { TemplateCompilerOccurrenceAttributeDispositionDraft } from './template-compiler-occurrence-row-assembly.js';

export interface TemplateCompilerTargetHydrateElementDispositionFunding {
  readonly instruction: HydrateElementInstruction;
  readonly captures: readonly TemplateCompilerAllocatedCaptureSyntaxReference[];
  readonly bindableInstructions: readonly TemplateInstruction[];
}

/** Allocation-resolved final causes for one reached attribute disposition. */
export class TemplateCompilerTargetAttributeDispositionMapping {
  constructor(
    readonly draft: TemplateCompilerOccurrenceAttributeDispositionDraft,
    readonly causeHandles: readonly ClaimEndpointHandle[],
  ) {
    if (causeHandles.length === 0 || new Set(causeHandles).size !== causeHandles.length) {
      throw new Error(`Attribute disposition '${draft.stableSlotKey}' has no unique final causes.`);
    }
  }
}

export function templateCompilerTargetAttributeDispositionCauses(
  draft: TemplateCompilerOccurrenceAttributeDispositionDraft,
  hydrateElement: TemplateCompilerTargetHydrateElementDispositionFunding | null,
  additionalInstructionCauses: readonly ClaimEndpointHandle[] = [],
): readonly ClaimEndpointHandle[] {
  if (hydrateElement == null) {
    return [...new Set<ClaimEndpointHandle>([
      ...additionalInstructionCauses,
      ...draft.causeHandles,
    ])];
  }
  const contribution = draft.contribution;
  const capture = hydrateElement.captures.find((candidate) =>
    candidate.draft.capture.contribution === contribution
  ) ?? null;
  const hydrateElementOwnsDisposition =
    contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.ElementBindable
    || contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.Capture
    || contribution.classification.classificationKind === AttributeClassificationKind.CompilerControl;
  if (!hydrateElementOwnsDisposition && additionalInstructionCauses.length === 0) return draft.causeHandles;
  const [inputCause, ...existingCauses] = draft.causeHandles;
  return [...new Set<ClaimEndpointHandle>([
    ...(inputCause == null ? [] : [inputCause]),
    ...(hydrateElementOwnsDisposition ? [hydrateElement.instruction.productHandle] : []),
    ...(capture == null ? [] : [capture.productHandle]),
    ...templateCompilerBindableInstructionsForDisposition(draft, hydrateElement)
      .map((instruction) => instruction.productHandle),
    ...additionalInstructionCauses,
    ...existingCauses,
  ])];
}

export function templateCompilerBindableInstructionsForDisposition(
  draft: TemplateCompilerOccurrenceAttributeDispositionDraft,
  hydrateElement: TemplateCompilerTargetHydrateElementDispositionFunding,
): readonly TemplateInstruction[] {
  if (draft.contribution.targetLane !== TemplateCompilerLiveAttributeTargetLane.ElementBindable) return [];
  return hydrateElement.bindableInstructions.filter((instruction) => {
    if (!('attribute' in instruction)) return false;
    const instructionAttribute = instruction.attribute;
    if (instructionAttribute == null) return false;
    const authoredAttribute = draft.contribution.frame.source.authoredAttribute;
    return authoredAttribute == null
      ? instructionAttribute.productHandle == null
        && instructionAttribute.rawName === draft.contribution.frame.scalar.qualifiedName
      : instructionAttribute.productHandle === authoredAttribute.productHandle;
  });
}
