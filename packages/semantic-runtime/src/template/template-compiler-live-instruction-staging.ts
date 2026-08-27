import { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { camelCaseAttributeName } from './attribute-mapper.js';
import { AttributeClassificationKind } from './attribute-syntax.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadObservation,
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import {
  HtmlAttributeReference,
  HtmlIrNodeKind,
  HtmlNodeReference,
  type HtmlAttributeReference as HtmlAttributeReferenceType,
  type HtmlNodeReference as HtmlNodeReferenceType,
} from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import type {
  TemplateCompilerLiveAttributeContribution,
  TemplateCompilerLiveAttributeOwnerResult,
  TemplateCompilerLiveAttributeSyntax,
} from './template-compiler-live-attribute-assembly.js';
import {
  TemplateCompilerElementInstructionBuckets,
  type TemplateCompilerElementInstructionStagingResult,
  TemplateCompilerElementInstructionStagingState,
  TemplateCompilerHydrateAttributeStagingRequest,
  TemplateCompilerHydrateTemplateControllerDraft,
  type TemplateCompilerInstructionStagingAuthority,
  TemplateCompilerSpreadInstructionStagingRequest,
  TemplateCompilerStaticAttributePolicy,
  TemplateCompilerValueInstructionLane,
  TemplateCompilerValueInstructionStagingRequest,
  stageTemplateCompilerHydrateAttributeInstruction,
  stageTemplateCompilerSpreadInstruction,
  stageTemplateCompilerValueInstruction,
} from './template-compiler-instruction-staging.js';

export class TemplateCompilerCapturedAttributeStaging {
  constructor(
    readonly siteKey: string,
    readonly contribution: TemplateCompilerLiveAttributeContribution,
    readonly syntax: TemplateCompilerLiveAttributeSyntax,
  ) {}
}

export type TemplateCompilerLiveElementInstructionStagingResult =
  TemplateCompilerElementInstructionStagingResult<TemplateCompilerCapturedAttributeStaging>;

export interface TemplateCompilerLiveInstructionStagingOwner {
  readonly element: TemplateCompilerLiveAttributeOwnerResult['element'];
  readonly completion: 'complete' | 'invalid' | 'open';
  readonly contributions: TemplateCompilerLiveAttributeOwnerResult['contributions'];
  readonly structuralEffects: TemplateCompilerLiveAttributeOwnerResult['structuralEffects'];
  readonly finalOwnerView: TemplateCompilerLiveAttributeOwnerResult['finalOwnerView'];
}

export class TemplateCompilerLiveInstructionStagingRequest {
  constructor(
    readonly owner: TemplateCompilerLiveInstructionStagingOwner,
    readonly compilerReads: TemplateCompilerReadView,
    readonly authority: TemplateCompilerInstructionStagingAuthority,
  ) {}
}

/** Live reached-owner adapter over the neutral instruction and bucket laws. */
export function stageTemplateCompilerLiveAttributeOwner(
  request: TemplateCompilerLiveInstructionStagingRequest,
): TemplateCompilerLiveElementInstructionStagingResult {
  const state = request.owner.completion === 'complete'
    ? TemplateCompilerElementInstructionStagingState.Complete
    : request.owner.completion === 'invalid'
      ? TemplateCompilerElementInstructionStagingState.Invalid
      : TemplateCompilerElementInstructionStagingState.Open;
  const buckets = new TemplateCompilerElementInstructionBuckets<TemplateCompilerCapturedAttributeStaging>(
    request.owner.structuralEffects,
  );
  if (state !== TemplateCompilerElementInstructionStagingState.Complete) {
    return buckets.finish(state, request.owner.element, request.owner.finalOwnerView);
  }

  const reads: TemplateCompilerReadObservation[] = [];
  let resolveResources: TemplateCompilerObservedValue<boolean> | null = null;
  for (const contribution of request.owner.contributions) {
    const syntax = contribution.syntax;
    if (syntax == null) continue;
    const siteKey = liveSiteKey(request.owner.element.occurrenceKey, contribution);
    const node = nodeReference(contribution);
    const attribute = attributeReference(contribution);
    const existing = contribution.instructions;
    switch (contribution.classification.classificationKind) {
      case AttributeClassificationKind.Bindable:
        buckets.elementBindableInstructions.push(...existing);
        if (existing.length === 0) {
          const instruction = liveValueInstruction(
            request,
            contribution,
            siteKey,
            node,
            attribute,
            TemplateCompilerValueInstructionLane.ElementBindable,
          );
          if (instruction != null) buckets.elementBindableInstructions.push(instruction);
        }
        break;
      case AttributeClassificationKind.Spread: {
        const target = syntax.target === '...$attrs'
          ? buckets.plainInstructions
          : buckets.elementBindableInstructions;
        target.push(...existing);
        if (existing.length === 0) {
          const instruction = stageTemplateCompilerSpreadInstruction(new TemplateCompilerSpreadInstructionStagingRequest(
            request.authority,
            siteKey,
            contribution.frame.attribute.occurrenceKey,
            node,
            attribute,
            syntax,
            contribution.valueParse?.expressionProductHandle ?? null,
            syntax.sourceAddressHandle,
          ));
          if (instruction != null) target.push(instruction);
        }
        break;
      }
      case AttributeClassificationKind.CustomAttribute: {
        const props = existing.length > 0
          ? existing
          : nullableInstruction(liveValueInstruction(
            request,
            contribution,
            siteKey,
            node,
            attribute,
            TemplateCompilerValueInstructionLane.CustomAttribute,
          ));
        resolveResources ??= request.compilerReads.readResolveResources();
        retainRead(reads, resolveResources.observation);
        buckets.attributeBindingInstructions.push(...props);
        buckets.hydrateAttributes.push(stageTemplateCompilerHydrateAttributeInstruction(
          new TemplateCompilerHydrateAttributeStagingRequest(
            request.authority,
            siteKey,
            contribution.frame.attribute.occurrenceKey,
            node,
            attribute,
            syntax.target,
            resolveResources.value ? contribution.classification.resource?.toReference() ?? null : null,
            props,
            syntax.sourceAddressHandle,
          ),
        ));
        break;
      }
      case AttributeClassificationKind.TemplateController: {
        const props = existing.length > 0
          ? existing
          : nullableInstruction(liveValueInstruction(
            request,
            contribution,
            siteKey,
            node,
            attribute,
            TemplateCompilerValueInstructionLane.TemplateController,
          ));
        resolveResources ??= request.compilerReads.readResolveResources();
        retainRead(reads, resolveResources.observation);
        buckets.templateControllers.push(new TemplateCompilerHydrateTemplateControllerDraft(
          siteKey,
          contribution.frame.attribute.occurrenceKey,
          node,
          attribute,
          syntax.target,
          resolveResources.value ? contribution.classification.resource?.toReference() ?? null : null,
          props,
          syntax.sourceAddressHandle,
        ));
        break;
      }
      case AttributeClassificationKind.Plain:
        buckets.plainInstructions.push(...existing);
        if (existing.length === 0) {
          const instruction = liveValueInstruction(
            request,
            contribution,
            siteKey,
            node,
            attribute,
            TemplateCompilerValueInstructionLane.Plain,
            reads,
          );
          if (instruction != null) buckets.plainInstructions.push(instruction);
        }
        break;
      case AttributeClassificationKind.BindingCommand:
      case AttributeClassificationKind.Ref:
        buckets.plainInstructions.push(...existing);
        break;
      case AttributeClassificationKind.Captured:
        buckets.captures.push(new TemplateCompilerCapturedAttributeStaging(siteKey, contribution, syntax));
        break;
      case AttributeClassificationKind.CompilerControl:
        break;
      case AttributeClassificationKind.Open:
        throw new Error('A complete live attribute owner cannot contain an open classification.');
    }
  }
  return buckets.finish(state, request.owner.element, request.owner.finalOwnerView, reads);
}

function liveValueInstruction(
  request: TemplateCompilerLiveInstructionStagingRequest,
  contribution: TemplateCompilerLiveAttributeContribution,
  siteKey: string,
  node: HtmlNodeReferenceType,
  attribute: HtmlAttributeReferenceType,
  lane: TemplateCompilerValueInstructionLane,
  reads: TemplateCompilerReadObservation[] = [],
): TemplateInstruction | null {
  const syntax = contribution.syntax;
  if (syntax == null) return null;
  const valueParse = contribution.valueParse;
  let target = contribution.classification.bindable?.definition.name
    ?? (contribution.classification.resolvedDefinition instanceof CustomAttributeDefinition
      ? contribution.classification.resolvedDefinition.defaultProperty
      : syntax.target);
  if (lane === TemplateCompilerValueInstructionLane.Plain && valueParse != null) {
    const mapped = request.compilerReads.readMappedAttribute(contribution.frame.liveSite.ownerView, syntax.target);
    retainRead(reads, mapped.observation);
    target = mapped.value ?? camelCaseAttributeName(syntax.target);
  }
  return stageTemplateCompilerValueInstruction(new TemplateCompilerValueInstructionStagingRequest(
    request.authority,
    siteKey,
    contribution.frame.attribute.occurrenceKey,
    node,
    attribute,
    syntax,
    lane,
    target,
    valueParse?.expressionProductHandle ?? null,
    valueParse?.read.value ?? null,
    contribution.valueSelection?.emptyValueBindingPolicy ?? null,
    TemplateCompilerStaticAttributePolicy.Preserve,
    contribution.frame.scalar.qualifiedName,
    syntax.sourceAddressHandle,
  ));
}

function liveSiteKey(
  elementOccurrenceKey: string,
  contribution: TemplateCompilerLiveAttributeContribution,
): string {
  return `element:${elementOccurrenceKey}:attribute:${contribution.frame.attribute.occurrenceKey}`;
}

function nodeReference(contribution: TemplateCompilerLiveAttributeContribution): HtmlNodeReferenceType {
  return contribution.frame.source.authoredElement?.toReference()
    ?? new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null);
}

function attributeReference(contribution: TemplateCompilerLiveAttributeContribution): HtmlAttributeReferenceType {
  return contribution.frame.source.authoredAttribute?.toReference()
    ?? new HtmlAttributeReference(null, null, contribution.frame.scalar.qualifiedName);
}

function nullableInstruction(instruction: TemplateInstruction | null): readonly TemplateInstruction[] {
  return instruction == null ? [] : [instruction];
}

function retainRead(
  reads: TemplateCompilerReadObservation[],
  read: TemplateCompilerReadObservation,
): void {
  if (!reads.includes(read)) reads.push(read);
}
