import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type { TemplateInstruction } from './instruction-ir.js';
import type {
  TemplateCompilerLiveAttributeContribution,
  TemplateCompilerLiveAttributeOwnerResult,
} from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';
import type { TemplateCompilerAttributeOccurrence } from './template-compiler-occurrence.js';

/** Shared final JIT disposition for one browser-effective attribute, independent of its logical owner lane. */
export class TemplateCompilerAttributeDispositionDraft {
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly instructionCauseHandles: readonly ClaimEndpointHandle[];
  readonly qualifiedName: string;
  readonly finalValue: string;
  readonly finalOwnerStateKey: string;

  constructor(
    readonly stableSlotKey: string,
    readonly owner: TemplateCompilerLiveAttributeOwnerResult,
    readonly contribution: TemplateCompilerLiveAttributeContribution,
  ) {
    const attribute = contribution.frame.attribute;
    const stagedInstructions = owner.instructionStaging.instructions.filter((instruction) =>
      instructionOwnsContribution(instruction, contribution)
    );
    this.instructionCauseHandles = uniqueHandles([
      ...stagedInstructions,
      ...contribution.instructions,
    ].map((instruction) => instruction.productHandle));
    this.causeHandles = uniqueHandles([
      ...(attribute.inputReference == null ? [] : [attribute.inputReference.productHandle]),
      ...this.instructionCauseHandles,
    ]);
    this.qualifiedName = contribution.frame.scalar.qualifiedName;
    this.finalValue = attribute.value;
    this.finalOwnerStateKey = owner.finalOwnerView.attributeStateKey;
    if (
      stableSlotKey.length === 0
      || !owner.contributions.includes(contribution)
      || contribution.frame.attribute.owner !== owner.element
      || contribution.frame.liveSite.attribute !== contribution.frame.attribute
      || contribution.frame.liveSite.disposition !== contribution.disposition
      || contribution.disposition === TemplateCompilerLiveAttributeDisposition.Open
      || owner.finalOwnerView.hasAttribute(this.qualifiedName)
        !== (contribution.disposition === TemplateCompilerLiveAttributeDisposition.Retained)
      || (contribution.disposition === TemplateCompilerLiveAttributeDisposition.Retained
        && owner.finalOwnerView.getAttribute(this.qualifiedName) !== this.finalValue)
      || this.causeHandles.length === 0
    ) {
      throw new Error(`Attribute disposition '${stableSlotKey}' lost owner, outcome, or cause authority.`);
    }
  }

  get attribute(): TemplateCompilerAttributeOccurrence {
    return this.contribution.frame.attribute;
  }

  get disposition(): TemplateCompilerLiveAttributeDisposition {
    return this.contribution.disposition;
  }

  get originalForestOrdinal(): number {
    return this.contribution.frame.liveSite.originalForestOrdinal;
  }

  get simulatedLiveOrdinal(): number {
    return this.contribution.frame.liveSite.simulatedLiveOrdinal;
  }
}

function instructionOwnsContribution(
  instruction: TemplateInstruction,
  contribution: TemplateCompilerLiveAttributeContribution,
): boolean {
  if (!('attribute' in instruction) || instruction.attribute == null) return false;
  const authoredAttribute = contribution.frame.source.authoredAttribute;
  return authoredAttribute == null
    ? instruction.attribute.productHandle == null
      && instruction.attribute.rawName === contribution.frame.scalar.qualifiedName
    : instruction.attribute.productHandle === authoredAttribute.productHandle;
}

function uniqueHandles(handles: readonly ClaimEndpointHandle[]): readonly ClaimEndpointHandle[] {
  return [...new Set(handles)];
}
