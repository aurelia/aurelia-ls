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
  ownedBindableInstructions: readonly TemplateInstruction[] | null = null,
): readonly ClaimEndpointHandle[] {
  if (hydrateElement == null) {
    const [inputCause, ...existingCauses] = draft.causeHandles;
    return [...new Set<ClaimEndpointHandle>([
      ...(inputCause == null ? [] : [inputCause]),
      ...additionalInstructionCauses,
      ...existingCauses,
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
    ...(ownedBindableInstructions ?? templateCompilerBindableInstructionsForDisposition(draft, hydrateElement))
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

/** Index exact element-bindable instruction ownership once for one funded HE site. */
export function indexTemplateCompilerBindableInstructionsByDisposition(
  drafts: readonly TemplateCompilerOccurrenceAttributeDispositionDraft[],
  hydrateElement: TemplateCompilerTargetHydrateElementDispositionFunding,
): ReadonlyMap<TemplateCompilerOccurrenceAttributeDispositionDraft, readonly TemplateInstruction[]> {
  const instructionsByAttribute = new Map<string, TemplateInstruction[]>();
  for (const instruction of hydrateElement.bindableInstructions) {
    if (!('attribute' in instruction) || instruction.attribute == null) continue;
    const key = instruction.attribute.productHandle == null
      ? instruction.attribute.rawName == null ? null : `raw:${instruction.attribute.rawName}`
      : `product:${instruction.attribute.productHandle}`;
    if (key == null) continue;
    const bucket = instructionsByAttribute.get(key);
    if (bucket == null) instructionsByAttribute.set(key, [instruction]);
    else bucket.push(instruction);
  }
  const indexed = new Map<
    TemplateCompilerOccurrenceAttributeDispositionDraft,
    readonly TemplateInstruction[]
  >();
  for (const draft of drafts) {
    if (draft.contribution.targetLane !== TemplateCompilerLiveAttributeTargetLane.ElementBindable) continue;
    const authoredAttribute = draft.contribution.frame.source.authoredAttribute;
    const key = authoredAttribute == null
      ? `raw:${draft.contribution.frame.scalar.qualifiedName}`
      : `product:${authoredAttribute.productHandle}`;
    indexed.set(draft, instructionsByAttribute.get(key) ?? []);
  }
  return indexed;
}
