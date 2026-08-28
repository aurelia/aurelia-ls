import {
  TemplateCompilerAttributeOwnerProgressionDisposition,
  TemplateCompilerAttributeOwnerProgressionLaneKind,
  TemplateCompilerAttributeOwnerProgressionOpenReasonKind,
  TemplateCompilerAttributeOwnerProgressionState,
} from './attribute-owner-progression.js';
import {
  type TemplateCompilerReadView,
} from './compiler-read-view.js';
import type {
  TemplateCompilerReachedAttributeScalarReceipt,
} from './template-compiler-execution.js';
import type {
  TemplateCompilerNormalizedSite,
} from './template-compiler-normalized-site-index.js';
import type { TemplateCompilerLiveAttributeOwnerSite } from './template-compiler-live-attribute-owner.js';
import {
  type TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
} from './template-compiler-occurrence.js';
import {
  type TemplateCompilerPreWalkRemainderAuthority,
} from './template-compiler-prewalk-remainder.js';
import type { TemplateCompilerSiteInvocationBinding } from './template-compiler-site-invocation.js';
import {
  htmlElementAttributeOwnersByElementProduct,
  type HtmlElement,
} from './html-ir.js';
import {
  runtimeAttributeName,
  runtimeElementResourceName,
} from './runtime-dom-name.js';
import {
  TemplateCompilerBrowserOriginRouteKind,
} from './template-compiler-authored-origin-index.js';
import { TemplateCompilerReachedSiteSemanticResolver } from './template-compiler-reached-site-semantics.js';

export class TemplateCompilerCursorElementOwnerRelation {
  constructor(
    readonly exact: boolean,
    readonly authoredElement: HtmlElement | null,
    readonly receipts: ReadonlyMap<TemplateCompilerAttributeOccurrence, TemplateCompilerReachedAttributeScalarReceipt>,
  ) {}
}

/** Exact graph/live compatibility resolver shared by the cursor's traversal phases. */
export class TemplateCompilerSiteCursorSemanticResolver extends TemplateCompilerReachedSiteSemanticResolver {
  private readonly authoredOwnersByElement;

  constructor(
    readonly binding: TemplateCompilerSiteInvocationBinding,
    compilerReads: TemplateCompilerReadView,
    preWalk: TemplateCompilerPreWalkRemainderAuthority,
  ) {
    super({
      execution: binding.execution,
      bootstrapClosure: binding.bootstrapClosure,
      compilerReads,
      preWalk,
      index: binding.index,
    });
    this.authoredOwnersByElement = htmlElementAttributeOwnersByElementProduct(
      binding.compilation.html.nodes,
      binding.compilation.html.attributes,
    );
  }

  elementOwnerRelation(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement | null,
    receipts: ReadonlyMap<TemplateCompilerAttributeOccurrence, TemplateCompilerReachedAttributeScalarReceipt>,
  ): TemplateCompilerCursorElementOwnerRelation {
    const expectedOwner = authoredElement == null
      ? null
      : this.authoredOwnersByElement.get(authoredElement.productHandle) ?? null;
    const liveAttributes = element.readAttributes();
    const expectedAttributesByProduct = new Map(
      (expectedOwner?.attributes ?? []).map((attribute) => [attribute.productHandle, attribute] as const),
    );
    let exact = authoredElement != null
      && expectedOwner != null
      && runtimeElementResourceName(authoredElement.tagName, authoredElement.namespace)
        === runtimeElementResourceName(element.tagName, element.namespace)
      && authoredElement.namespace === element.namespace
      && expectedOwner.attributes.length === liveAttributes.length;

    for (const [ordinal, attribute] of liveAttributes.entries()) {
      const scalar = receipts.get(attribute) ?? null;
      const route = this.originRoute(attribute);
      const authoredAttribute = route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
        ? expectedAttributesByProduct.get(route.exactOrigin!.authored.productHandle) ?? null
        : null;
      const expectedAtPosition = expectedOwner?.attributes[ordinal] ?? null;
      exact &&= scalar != null
        && scalar.isExact()
        && authoredAttribute != null
        && authoredAttribute === expectedAtPosition
        && scalar.qualifiedName === runtimeAttributeName(authoredAttribute.rawName, expectedOwner!.namespace)
        && scalar.currentValue === authoredAttribute.rawValue;
    }
    return new TemplateCompilerCursorElementOwnerRelation(exact, authoredElement, receipts);
  }

  attributeIsCompatible(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement | null,
    bundle: TemplateCompilerNormalizedSite,
    attribute: TemplateCompilerAttributeOccurrence,
    scalar: TemplateCompilerReachedAttributeScalarReceipt,
    liveSite: TemplateCompilerLiveAttributeOwnerSite,
    relation: TemplateCompilerCursorElementOwnerRelation,
  ): boolean {
    const progression = bundle.ownerProgressionSite;
    return this.attributeOriginIsCompatible(
      element,
      authoredElement,
      bundle,
      attribute,
      scalar,
      liveSite.originalForestOrdinal,
      relation,
    )
      && progression.laneKind === TemplateCompilerAttributeOwnerProgressionLaneKind.OrdinaryElement
      && progression.state === TemplateCompilerAttributeOwnerProgressionState.Exact
      && progression.ownerView != null
      && progression.disposition != null
      && scalar.liveOrdinal === liveSite.originalForestOrdinal;
  }

  letAttributeIsCompatible(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement,
    bundle: TemplateCompilerNormalizedSite,
    attribute: TemplateCompilerAttributeOccurrence,
    scalar: TemplateCompilerReachedAttributeScalarReceipt,
    originalForestOrdinal: number,
    relation: TemplateCompilerCursorElementOwnerRelation,
  ): boolean {
    const progression = bundle.ownerProgressionSite;
    return this.attributeOriginIsCompatible(
      element,
      authoredElement,
      bundle,
      attribute,
      scalar,
      originalForestOrdinal,
      relation,
    )
      && progression.laneKind === TemplateCompilerAttributeOwnerProgressionLaneKind.LetElementOpen
      && progression.state === TemplateCompilerAttributeOwnerProgressionState.Open
      && progression.ownerView == null
      && progression.disposition === TemplateCompilerAttributeOwnerProgressionDisposition.Open
      && progression.openReason?.reasonKind === TemplateCompilerAttributeOwnerProgressionOpenReasonKind.DedicatedLetOwner;
  }

  surrogateAttributeIsCompatible(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement | null,
    bundle: TemplateCompilerNormalizedSite,
    attribute: TemplateCompilerAttributeOccurrence,
    scalar: TemplateCompilerReachedAttributeScalarReceipt,
    liveSite: TemplateCompilerLiveAttributeOwnerSite,
    relation: TemplateCompilerCursorElementOwnerRelation,
  ): boolean {
    const progression = bundle.ownerProgressionSite;
    return this.attributeOriginIsCompatible(
      element,
      authoredElement,
      bundle,
      attribute,
      scalar,
      liveSite.originalForestOrdinal,
      relation,
    )
      && progression.laneKind === TemplateCompilerAttributeOwnerProgressionLaneKind.SurrogateOpen
      && progression.state === TemplateCompilerAttributeOwnerProgressionState.Open
      && progression.ownerView == null
      && progression.disposition === TemplateCompilerAttributeOwnerProgressionDisposition.Open
      && progression.openReason?.reasonKind
        === TemplateCompilerAttributeOwnerProgressionOpenReasonKind.DedicatedSurrogateOwner;
  }

  /** Native parents only reach this path to preserve the known `[au-slot]`-on-non-CE diagnostic frontier. */
  hasProjectionOnNativeElement(element: TemplateCompilerElementOccurrence): boolean {
    return element.readChildren().some((child) =>
      child instanceof TemplateCompilerElementOccurrence
      && child.readAttributes().some((attribute) => qualifiedAttributeName(attribute) === 'au-slot')
    );
  }

  private attributeOriginIsCompatible(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement | null,
    bundle: TemplateCompilerNormalizedSite,
    attribute: TemplateCompilerAttributeOccurrence,
    scalar: TemplateCompilerReachedAttributeScalarReceipt,
    originalForestOrdinal: number,
    relation: TemplateCompilerCursorElementOwnerRelation,
  ): boolean {
    const progression = bundle.ownerProgressionSite;
    return relation.exact
      && relation.authoredElement === authoredElement
      && authoredElement != null
      && bundle.owner.element === authoredElement
      && progression.owner?.element === bundle.owner.element
      && progression.attribute === bundle.attribute
      && progression.syntax === bundle.syntax
      && progression.classification === bundle.classification
      && progression.ownerOrdinal === originalForestOrdinal
      && scalar.isExact()
      && scalar.attribute === attribute
      && scalar.owner === element
      && scalar.liveOrdinal === originalForestOrdinal
      && scalar.qualifiedName === bundle.syntax.runtimeRawName
      && scalar.inputReference?.name === scalar.qualifiedName
      && scalar.currentValue === bundle.attribute.rawValue
      && scalar.namespaceUri == null
      && scalar.prefix == null;
  }

}

function qualifiedAttributeName(attribute: TemplateCompilerAttributeOccurrence): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}
