import {
  KernelPublicationDecisionKind,
  sameKernelFieldProvenance,
  sameKernelRecordWitness,
  type KernelComparablePublicationDecision,
  type KernelPublicationComparisonContext,
} from '../kernel/publication-comparison.js';
import type { HtmlNodeReference } from './html-ir.js';
import type {
  TemplateInstructionReference,
  TemplateInstructionSequence,
} from './instruction-ir.js';
import type { CompiledTemplate, TemplateRenderTarget } from './compiled-template.js';

/** Compare the value embedded by one compiled-template detail without reading a mixed old/new store graph. */
export function compareCompiledTemplateDetails(
  previous: CompiledTemplate,
  next: CompiledTemplate,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  const semantic = sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.htmlDocumentProductHandle,
    next.htmlDocumentProductHandle,
    previous.state,
    next.state,
  )
    && sameArrays(previous.targets, next.targets, sameRenderTargetSemantics)
    && sameNullable(previous.surrogateSequence, next.surrogateSequence, sameInstructionSequenceSemantics);
  if (!semantic) {
    return KernelPublicationDecisionKind.Replace;
  }

  const witness = sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context)
    && sameArrays(previous.targets, next.targets, (left, right) =>
      sameRenderTargetWitnesses(left, right, context))
    && sameNullable(previous.surrogateSequence, next.surrogateSequence, (left, right) =>
      sameInstructionSequenceWitnesses(left, right, context));
  return witness
    ? KernelPublicationDecisionKind.Retain
    : KernelPublicationDecisionKind.RefreshWitness;
}

function sameRenderTargetSemantics(previous: TemplateRenderTarget, next: TemplateRenderTarget): boolean {
  return sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.targetKind,
    next.targetKind,
    previous.instructionSequenceProductHandle,
    next.instructionSequenceProductHandle,
  ) && sameNullable(previous.htmlNode, next.htmlNode, sameHtmlNodeSemantics);
}

function sameRenderTargetWitnesses(
  previous: TemplateRenderTarget,
  next: TemplateRenderTarget,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context)
    && sameNullable(previous.htmlNode, next.htmlNode, (left, right) =>
      sameHtmlNodeWitnesses(left, right, context));
}

function sameHtmlNodeSemantics(previous: HtmlNodeReference, next: HtmlNodeReference): boolean {
  return sameValues(
    previous.nodeKind,
    next.nodeKind,
    previous.identityHandle,
    next.identityHandle,
    previous.productHandle,
    next.productHandle,
  );
}

function sameHtmlNodeWitnesses(
  previous: HtmlNodeReference,
  next: HtmlNodeReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context);
}

function sameInstructionSequenceSemantics(
  previous: TemplateInstructionSequence,
  next: TemplateInstructionSequence,
): boolean {
  return sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.ownerProductHandle,
    next.ownerProductHandle,
  ) && sameArrays(previous.instructions, next.instructions, sameInstructionReferenceSemantics);
}

function sameInstructionSequenceWitnesses(
  previous: TemplateInstructionSequence,
  next: TemplateInstructionSequence,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameArrays(previous.instructions, next.instructions, (left, right) =>
      sameInstructionReferenceWitnesses(left, right, context));
}

function sameInstructionReferenceSemantics(
  previous: TemplateInstructionReference,
  next: TemplateInstructionReference,
): boolean {
  return sameValues(
    previous.instructionKind,
    next.instructionKind,
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
  );
}

function sameInstructionReferenceWitnesses(
  previous: TemplateInstructionReference,
  next: TemplateInstructionReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context);
}

function sameNullable<TValue>(
  previous: TValue | null,
  next: TValue | null,
  compare: (previous: TValue, next: TValue) => boolean,
): boolean {
  return previous == null || next == null
    ? previous === next
    : compare(previous, next);
}

function sameArrays<TValue>(
  previous: readonly TValue[],
  next: readonly TValue[],
  compare: (previous: TValue, next: TValue) => boolean,
): boolean {
  return previous.length === next.length
    && previous.every((value, index) => compare(value, next[index]!));
}

function sameValues(...values: readonly unknown[]): boolean {
  for (let index = 0; index < values.length; index += 2) {
    if (values[index] !== values[index + 1]) {
      return false;
    }
  }
  return true;
}
