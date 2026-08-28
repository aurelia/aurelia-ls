import {
  KernelPublicationDecisionKind,
  sameKernelFieldProvenance,
  sameKernelRecordWitness,
  type KernelComparablePublicationDecision,
  type KernelPublicationComparisonContext,
} from '../kernel/publication-comparison.js';
import { HtmlIrNodeKind } from './html-ir.js';
import {
  BrowserEffectiveTemplateAttribute,
  CompilerTransformedTemplateAttribute,
  TemplateStructuralTreeKind,
  type BrowserEffectiveTemplateNode,
  type BrowserEffectiveTemplateElement,
  type BrowserEffectiveTemplateTree,
  type CompilerTransformedTemplateNode,
  type TemplateStructuralAttribute,
  type TemplateStructuralAttributeReference,
  type TemplateStructuralNode,
  type TemplateStructuralNodeReference,
  type TemplateStructuralTree,
  type TemplateStructuralTreeReference,
} from './template-structure.js';
import type { TemplateSourceReference } from './compilation-unit.js';
import type {
  TemplateStructureDerivation,
  TemplateStructureDerivationTerm,
  TemplateStructureReference,
} from './template-structure-derivation.js';

export function compareStructuralTreeDetails(
  previous: TemplateStructuralTree,
  next: TemplateStructuralTree,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  const commonSemantic = sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.treeKind,
    next.treeKind,
  )
    && sameTemplateSourceSemantics(previous.templateSource, next.templateSource);
  const semantic = commonSemantic && sameStructuralTreeVariantSemantics(previous, next);
  if (!semantic) {
    return KernelPublicationDecisionKind.Replace;
  }
  const commonWitness = sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameKernelRecordWitness(
      previous.templateSource.sourceAddressHandle,
      next.templateSource.sourceAddressHandle,
      context,
    )
    && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context);
  const witness = commonWitness && sameStructuralTreeVariantWitness(previous, next, context);
  return witnessDecision(witness);
}

export function compareStructuralNodeDetails(
  previous: TemplateStructuralNode,
  next: TemplateStructuralNode,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.nodeKind,
      next.nodeKind,
    )
    || !sameStructuralTreeReferenceSemantics(previous.tree, next.tree)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  if (isBrowserEffectiveNode(previous)) {
    return isBrowserEffectiveNode(next)
      ? compareBrowserEffectiveNodeVariant(previous, next, context)
      : KernelPublicationDecisionKind.Replace;
  }
  return isCompilerTransformedNode(next)
    ? compareCompilerTransformedNodeVariant(previous, next, context)
    : KernelPublicationDecisionKind.Replace;
}

function compareBrowserEffectiveNodeVariant(
  previous: BrowserEffectiveTemplateNode,
  next: BrowserEffectiveTemplateNode,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  let semantic = true;
  switch (previous.nodeKind) {
    case HtmlIrNodeKind.Fragment: {
      if (next.nodeKind !== HtmlIrNodeKind.Fragment) return KernelPublicationDecisionKind.Replace;
      semantic = sameArrays(previous.children, next.children, sameStructuralNodeReferenceSemantics);
      break;
    }
    case HtmlIrNodeKind.Element: {
      if (next.nodeKind !== HtmlIrNodeKind.Element) return KernelPublicationDecisionKind.Replace;
      semantic = sameValues(
        previous.tagName,
        next.tagName,
        previous.namespace,
        next.namespace,
        previous.namespaceUri,
        next.namespaceUri,
      )
        && sameArrays(previous.attributes, next.attributes, sameStructuralAttributeReferenceSemantics)
        && sameArrays(previous.children, next.children, sameStructuralNodeReferenceSemantics)
        && sameNullable(previous.templateContent, next.templateContent, sameStructuralNodeReferenceSemantics);
      break;
    }
    case HtmlIrNodeKind.Text: {
      if (next.nodeKind !== HtmlIrNodeKind.Text) return KernelPublicationDecisionKind.Replace;
      semantic = previous.text === next.text;
      break;
    }
    case HtmlIrNodeKind.Comment: {
      if (next.nodeKind !== HtmlIrNodeKind.Comment) return KernelPublicationDecisionKind.Replace;
      semantic = previous.text === next.text;
      break;
    }
    case HtmlIrNodeKind.Doctype: {
      if (next.nodeKind !== HtmlIrNodeKind.Doctype) return KernelPublicationDecisionKind.Replace;
      semantic = sameValues(
        previous.name,
        next.name,
        previous.publicId,
        next.publicId,
        previous.systemId,
        next.systemId,
      );
      break;
    }
  }
  if (!semantic) {
    return KernelPublicationDecisionKind.Replace;
  }
  const commonWitness = sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameStructuralTreeReferenceWitness(previous.tree, next.tree, context)
    && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context);
  let variantWitness = true;
  switch (previous.nodeKind) {
    case HtmlIrNodeKind.Fragment: {
      const candidate = next as typeof previous;
      variantWitness = sameArrays(previous.children, candidate.children, (left, right) =>
        sameStructuralNodeReferenceWitness(left, right, context));
      break;
    }
    case HtmlIrNodeKind.Element: {
      const candidate = next as typeof previous;
      variantWitness = sameParserLocationState(previous, candidate)
        && sameArrays(previous.attributes, candidate.attributes, (left, right) =>
          sameStructuralAttributeReferenceWitness(left, right, context))
        && sameArrays(previous.children, candidate.children, (left, right) =>
          sameStructuralNodeReferenceWitness(left, right, context))
        && sameNullable(previous.templateContent, candidate.templateContent, (left, right) =>
          sameStructuralNodeReferenceWitness(left, right, context));
      break;
    }
    case HtmlIrNodeKind.Text:
    case HtmlIrNodeKind.Comment:
    case HtmlIrNodeKind.Doctype:
      variantWitness = sameParserLocationState(previous, next as typeof previous);
      break;
  }
  return witnessDecision(commonWitness && variantWitness);
}

function compareCompilerTransformedNodeVariant(
  previous: CompilerTransformedTemplateNode,
  next: CompilerTransformedTemplateNode,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  let semantic = true;
  switch (previous.nodeKind) {
    case HtmlIrNodeKind.Fragment:
      semantic = next.nodeKind === HtmlIrNodeKind.Fragment
        && sameArrays(previous.children, next.children, sameStructuralNodeReferenceSemantics);
      break;
    case HtmlIrNodeKind.Element:
      semantic = next.nodeKind === HtmlIrNodeKind.Element
        && sameValues(
          previous.tagName,
          next.tagName,
          previous.namespace,
          next.namespace,
          previous.namespaceUri,
          next.namespaceUri,
        )
        && sameArrays(previous.attributes, next.attributes, sameStructuralAttributeReferenceSemantics)
        && sameArrays(previous.children, next.children, sameStructuralNodeReferenceSemantics)
        && sameNullable(previous.templateContent, next.templateContent, sameStructuralNodeReferenceSemantics);
      break;
    case HtmlIrNodeKind.Text:
      semantic = next.nodeKind === HtmlIrNodeKind.Text
        && previous.text === next.text
        && previous.textKind === next.textKind;
      break;
    case HtmlIrNodeKind.Comment:
      semantic = next.nodeKind === HtmlIrNodeKind.Comment
        && previous.text === next.text
        && previous.semanticKind === next.semanticKind;
      break;
  }
  if (!semantic) return KernelPublicationDecisionKind.Replace;
  const commonWitness = sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameStructuralTreeReferenceWitness(previous.tree, next.tree, context)
    && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context);
  let variantWitness = true;
  switch (previous.nodeKind) {
    case HtmlIrNodeKind.Fragment:
      variantWitness = next.nodeKind === HtmlIrNodeKind.Fragment
        && sameArrays(previous.children, next.children, (left, right) =>
          sameStructuralNodeReferenceWitness(left, right, context));
      break;
    case HtmlIrNodeKind.Element:
      variantWitness = next.nodeKind === HtmlIrNodeKind.Element
        && sameArrays(previous.attributes, next.attributes, (left, right) =>
          sameStructuralAttributeReferenceWitness(left, right, context))
        && sameArrays(previous.children, next.children, (left, right) =>
          sameStructuralNodeReferenceWitness(left, right, context))
        && sameNullable(previous.templateContent, next.templateContent, (left, right) =>
          sameStructuralNodeReferenceWitness(left, right, context));
      break;
    case HtmlIrNodeKind.Text:
      variantWitness = next.nodeKind === HtmlIrNodeKind.Text;
      break;
    case HtmlIrNodeKind.Comment:
      variantWitness = next.nodeKind === HtmlIrNodeKind.Comment;
      break;
  }
  return witnessDecision(commonWitness && variantWitness);
}

export function compareStructuralAttributeDetails(
  previous: TemplateStructuralAttribute,
  next: TemplateStructuralAttribute,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  const semantic = sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.name,
    next.name,
    previous.value,
    next.value,
    previous.namespaceUri,
    next.namespaceUri,
    previous.prefix,
    next.prefix,
  )
    && sameStructuralTreeReferenceSemantics(previous.tree, next.tree)
    && sameStructuralNodeReferenceSemantics(previous.owner, next.owner);
  if (!semantic) {
    return KernelPublicationDecisionKind.Replace;
  }
  const commonWitness = sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameStructuralTreeReferenceWitness(previous.tree, next.tree, context)
    && sameStructuralNodeReferenceWitness(previous.owner, next.owner, context)
    && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context);
  if (previous instanceof BrowserEffectiveTemplateAttribute) {
    if (!(next instanceof BrowserEffectiveTemplateAttribute)) {
      return KernelPublicationDecisionKind.Replace;
    }
    return witnessDecision(commonWitness
      && sameValues(
        previous.locationJoinKind,
        next.locationJoinKind,
        previous.parserLocationKey,
        next.parserLocationKey,
        previous.sourceTokenName,
        next.sourceTokenName,
      )
      && sameSourceLocation(previous.sourceLocation, next.sourceLocation));
  }
  return next instanceof CompilerTransformedTemplateAttribute
    ? witnessDecision(commonWitness)
    : KernelPublicationDecisionKind.Replace;
}

export function compareStructureDerivationDetails(
  previous: TemplateStructureDerivation,
  next: TemplateStructureDerivation,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  const semantic = sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.authority,
    next.authority,
    previous.operationOrdinal,
    next.operationOrdinal,
  )
    && sameArrays(previous.inputs, next.inputs, sameDerivationTermSemantics)
    && sameArrays(previous.outputs, next.outputs, sameDerivationTermSemantics)
    && sameArrays(previous.causeHandles, next.causeHandles, (left, right) => left === right);
  if (!semantic) {
    return KernelPublicationDecisionKind.Replace;
  }
  const witness = sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    && sameArrays(previous.inputs, next.inputs, (left, right) =>
      sameDerivationTermWitness(left, right, context))
    && sameArrays(previous.outputs, next.outputs, (left, right) =>
      sameDerivationTermWitness(left, right, context))
    && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context);
  return witnessDecision(witness);
}

function sameTemplateSourceSemantics(
  previous: TemplateSourceReference,
  next: TemplateSourceReference,
): boolean {
  return sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.sourceKind,
    next.sourceKind,
    previous.phase,
    next.phase,
    previous.templateAddressHandle,
    next.templateAddressHandle,
  );
}

function isBrowserEffectiveNode(
  node: TemplateStructuralNode,
): node is BrowserEffectiveTemplateNode {
  return node.tree.treeKind === TemplateStructuralTreeKind.BrowserEffective;
}

function isCompilerTransformedNode(
  node: TemplateStructuralNode,
): node is CompilerTransformedTemplateNode {
  return node.tree.treeKind === TemplateStructuralTreeKind.CompilerTransformed;
}

function sameStructuralTreeVariantSemantics(
  previous: TemplateStructuralTree,
  next: TemplateStructuralTree,
): boolean {
  if (previous.treeKind !== next.treeKind) return false;
  switch (previous.treeKind) {
    case TemplateStructuralTreeKind.BrowserEffective: {
      if (next.treeKind !== TemplateStructuralTreeKind.BrowserEffective) return false;
      return sameValues(
        previous.carrierKind,
        next.carrierKind,
        previous.carrierReason,
        next.carrierReason,
      )
        && sameParserAuthority(previous.parserAuthority, next.parserAuthority)
        && sameStructuralNodeReferenceSemantics(previous.inputFragment, next.inputFragment)
        && sameStructuralNodeReferenceSemantics(previous.compilerCarrier, next.compilerCarrier)
        && sameNullable(previous.authoredCarrier, next.authoredCarrier, sameStructuralNodeReferenceSemantics)
        && sameStructuralNodeReferenceSemantics(previous.compilerContent, next.compilerContent)
        && sameArrays(previous.discardedInputNodes, next.discardedInputNodes, sameStructuralNodeReferenceSemantics);
    }
    case TemplateStructuralTreeKind.CompilerTransformed: {
      if (next.treeKind !== TemplateStructuralTreeKind.CompilerTransformed) return false;
      return sameStructuralTreeReferenceSemantics(previous.inputTree, next.inputTree)
        && sameStructuralNodeReferenceSemantics(previous.compilerCarrier, next.compilerCarrier)
        && sameStructuralNodeReferenceSemantics(previous.compilerContent, next.compilerContent);
    }
  }
  throw new Error('Unknown structural tree kind.');
}

function sameStructuralTreeVariantWitness(
  previous: TemplateStructuralTree,
  next: TemplateStructuralTree,
  context: KernelPublicationComparisonContext,
): boolean {
  if (previous.treeKind !== next.treeKind) return false;
  switch (previous.treeKind) {
    case TemplateStructuralTreeKind.BrowserEffective: {
      if (next.treeKind !== TemplateStructuralTreeKind.BrowserEffective) return false;
      return sameStructuralNodeReferenceWitness(previous.inputFragment, next.inputFragment, context)
        && sameStructuralNodeReferenceWitness(previous.compilerCarrier, next.compilerCarrier, context)
        && sameNullable(previous.authoredCarrier, next.authoredCarrier, (left, right) =>
          sameStructuralNodeReferenceWitness(left, right, context))
        && sameStructuralNodeReferenceWitness(previous.compilerContent, next.compilerContent, context)
        && sameArrays(previous.discardedInputNodes, next.discardedInputNodes, (left, right) =>
          sameStructuralNodeReferenceWitness(left, right, context));
    }
    case TemplateStructuralTreeKind.CompilerTransformed: {
      if (next.treeKind !== TemplateStructuralTreeKind.CompilerTransformed) return false;
      return sameStructuralTreeReferenceWitness(previous.inputTree, next.inputTree, context)
        && sameStructuralNodeReferenceWitness(previous.compilerCarrier, next.compilerCarrier, context)
        && sameStructuralNodeReferenceWitness(previous.compilerContent, next.compilerContent, context);
    }
  }
  throw new Error('Unknown structural tree kind.');
}

function sameParserAuthority(
  previous: BrowserEffectiveTemplateTree['parserAuthority'],
  next: BrowserEffectiveTemplateTree['parserAuthority'],
): boolean {
  return sameValues(
    previous.schemaVersion,
    next.schemaVersion,
    previous.parser,
    next.parser,
    previous.parserVersion,
    next.parserVersion,
    previous.context,
    next.context,
    previous.scriptingEnabled,
    next.scriptingEnabled,
  );
}

function sameStructuralTreeReferenceSemantics(
  previous: TemplateStructuralTreeReference,
  next: TemplateStructuralTreeReference,
): boolean {
  return sameValues(
    previous.treeKind,
    next.treeKind,
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
  );
}

function sameStructuralTreeReferenceWitness(
  previous: TemplateStructuralTreeReference,
  next: TemplateStructuralTreeReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context);
}

function sameStructuralNodeReferenceSemantics(
  previous: TemplateStructuralNodeReference,
  next: TemplateStructuralNodeReference,
): boolean {
  return sameValues(
    previous.treeProductHandle,
    next.treeProductHandle,
    previous.nodeKind,
    next.nodeKind,
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
  );
}

function sameStructuralNodeReferenceWitness(
  previous: TemplateStructuralNodeReference,
  next: TemplateStructuralNodeReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context);
}

function sameStructuralAttributeReferenceSemantics(
  previous: TemplateStructuralAttributeReference,
  next: TemplateStructuralAttributeReference,
): boolean {
  return sameValues(
    previous.treeProductHandle,
    next.treeProductHandle,
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.name,
    next.name,
  );
}

function sameStructuralAttributeReferenceWitness(
  previous: TemplateStructuralAttributeReference,
  next: TemplateStructuralAttributeReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context);
}

function sameDerivationTermSemantics(
  previous: TemplateStructureDerivationTerm,
  next: TemplateStructureDerivationTerm,
): boolean {
  return sameStructureReferenceSemantics(previous.structure, next.structure);
}

function sameDerivationTermWitness(
  previous: TemplateStructureDerivationTerm,
  next: TemplateStructureDerivationTerm,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameStructureReferenceWitness(previous.structure, next.structure, context)
    && sameKernelRecordWitness(previous.segmentAddressHandle, next.segmentAddressHandle, context);
}

function sameStructureReferenceSemantics(
  previous: TemplateStructureReference,
  next: TemplateStructureReference,
): boolean {
  return sameValues(
    previous.productKindKey,
    next.productKindKey,
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
  );
}

function sameStructureReferenceWitness(
  previous: TemplateStructureReference,
  next: TemplateStructureReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context);
}

function sameParserLocationState(
  previous: {
    readonly locationKind: unknown;
    readonly sourceLocation: BrowserEffectiveTemplateElement['sourceLocation'];
    readonly startTagSourceLocation?: BrowserEffectiveTemplateElement['startTagSourceLocation'];
    readonly endTagSourceLocation?: BrowserEffectiveTemplateElement['endTagSourceLocation'];
  },
  next: typeof previous,
): boolean {
  return previous.locationKind === next.locationKind
    && sameSourceLocation(previous.sourceLocation, next.sourceLocation)
    && sameSourceLocation(previous.startTagSourceLocation ?? null, next.startTagSourceLocation ?? null)
    && sameSourceLocation(previous.endTagSourceLocation ?? null, next.endTagSourceLocation ?? null);
}

function sameSourceLocation(
  previous: BrowserEffectiveTemplateElement['sourceLocation'],
  next: BrowserEffectiveTemplateElement['sourceLocation'],
): boolean {
  return previous == null || next == null
    ? previous === next
    : sameValues(
        previous.startLine,
        next.startLine,
        previous.startColumn,
        next.startColumn,
        previous.startOffset,
        next.startOffset,
        previous.endLine,
        next.endLine,
        previous.endColumn,
        next.endColumn,
        previous.endOffset,
        next.endOffset,
      );
}

function witnessDecision(equal: boolean): KernelComparablePublicationDecision {
  return equal
    ? KernelPublicationDecisionKind.Retain
    : KernelPublicationDecisionKind.RefreshWitness;
}

function sameNullable<TValue>(
  previous: TValue | null,
  next: TValue | null,
  compare: (previous: TValue, next: TValue) => boolean,
): boolean {
  return previous == null || next == null ? previous === next : compare(previous, next);
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
    if (values[index] !== values[index + 1]) return false;
  }
  return true;
}
