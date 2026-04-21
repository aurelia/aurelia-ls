import type { CompilerAttributeClassification } from './attribute-classification.js';
import type { AuthoredElementNode } from './authored-template.js';
import {
  CompiledTemplateOpenSeam,
  CompilerAnonymousElementDefinition,
  CompilerElementStructuralCarrier,
  CompilerHydrateTemplateControllerInstruction,
  TemplateControllerStructuralLowering,
} from './compiled-template.js';
import type { CompilerAttributeBindingLowering } from './custom-attribute-binding-lowering.js';

export interface TemplateControllerStructuralParticipant {
  readonly classification: CompilerAttributeClassification;
  readonly bindingLowering: CompilerAttributeBindingLowering;
}

let anonymousDefinitionId = 0;

export class TemplateControllerStructuralLowerer {
  lower(
    element: AuthoredElementNode,
    carrier: CompilerElementStructuralCarrier,
    participants: readonly TemplateControllerStructuralParticipant[],
  ): TemplateControllerStructuralLowering | null {
    if (participants.length === 0) {
      return null;
    }

    const openSeams = [
      new CompiledTemplateOpenSeam(
        'template-controller-family-profile-open',
        'This slice closes the generic TC structural carrier only. Builtin family-specific semantics like if/repeat/switch/promise/portal still live in a later layer.',
      ),
      new CompiledTemplateOpenSeam(
        'projection-extraction-open',
        'Projection grouping can now live on the element structural carrier, but runtime still attaches projections to the innermost hydrate-element instruction and coordinates marker placement there. That direct instruction ownership remains a later slice.',
      ),
    ];

    const sourceOrderedInstructions: CompilerHydrateTemplateControllerInstruction[] = [];
    const innermostParticipant = participants[participants.length - 1];
    if (innermostParticipant == null) {
      return null;
    }
    let nextInstruction = this.createInstruction(
      innermostParticipant,
      this.createInnermostDefinition(element, carrier),
    );
    sourceOrderedInstructions.unshift(nextInstruction);

    for (let index = participants.length - 2; index >= 0; index -= 1) {
      const current = participants[index];
      if (current == null) {
        continue;
      }
      const currentDefinition = new CompilerAnonymousElementDefinition(
        generateAnonymousElementName(),
        'marker-only-wrapper',
        null,
        null,
        [],
        [nextInstruction],
        'Outer template-controller wrappers collapse to marker-only anonymous element definitions whose sole nested instruction is the next inner TC.',
      );
      nextInstruction = this.createInstruction(current, currentDefinition);
      sourceOrderedInstructions.unshift(nextInstruction);
    }

    const outermostInstruction = sourceOrderedInstructions[0];
    const innermostInstruction = sourceOrderedInstructions[sourceOrderedInstructions.length - 1];
    if (outermostInstruction == null || innermostInstruction == null) {
      return null;
    }

    return new TemplateControllerStructuralLowering(
      sourceOrderedInstructions,
      outermostInstruction,
      innermostInstruction.definition,
      openSeams,
      'Generic inside-out template-controller structural lowering over authored element compilation.',
    );
  }

  private createInstruction(
    participant: TemplateControllerStructuralParticipant,
    definition: CompilerAnonymousElementDefinition,
  ): CompilerHydrateTemplateControllerInstruction {
    const resource = participant.classification.attributeResource;
    if (resource == null || resource.kind !== 'template-controller') {
      throw new Error('TemplateControllerStructuralLowerer requires template-controller classifications.');
    }

    return new CompilerHydrateTemplateControllerInstruction(
      participant.classification.authored,
      resource,
      participant.bindingLowering.assignments,
      definition,
      participant.classification.provenance?.attributeResourceAdmission ?? null,
      'Generic HydrateTemplateController-like structural instruction over a nested anonymous element definition.',
    );
  }

  private createInnermostDefinition(
    element: AuthoredElementNode,
    carrier: CompilerElementStructuralCarrier,
  ): CompilerAnonymousElementDefinition {
    // TODO: projection ownership and marker placement are still downstream of
    // direct element lowering. This carrier only closes the generic nesting law
    // and the authored-template home of the innermost wrapper.
    if (element.tagName === 'template') {
      return new CompilerAnonymousElementDefinition(
        generateAnonymousElementName(),
        'authored-template-element',
        null,
        carrier,
        carrier.childCompilations,
        [],
        'Innermost TC definition reuses the authored <template> surface directly instead of wrapping it in another template carrier.',
      );
    }

    return new CompilerAnonymousElementDefinition(
      generateAnonymousElementName(),
      'wrapped-authored-element',
      element,
      carrier,
      [],
      [],
      'Innermost TC definition wraps the authored element itself and keeps the element structural carrier attached for later direct lowering.',
    );
  }
}

function generateAnonymousElementName(): string {
  anonymousDefinitionId += 1;
  return `anonymous-tc-${anonymousDefinitionId}`;
}
