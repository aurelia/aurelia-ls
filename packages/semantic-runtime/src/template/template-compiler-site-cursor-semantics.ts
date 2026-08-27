import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AttributeClassificationKind,
  AttributeSyntaxKind,
} from './attribute-syntax.js';
import {
  TemplateCompilerAttributeOwnerProgressionDisposition,
  TemplateCompilerAttributeOwnerProgressionLaneKind,
  TemplateCompilerAttributeOwnerProgressionState,
} from './attribute-owner-progression.js';
import { BindingCommandLoweringState } from './binding-command-execution.js';
import {
  TemplateResourceResolutionKind,
  type TemplateResolvedResource,
} from './compiler-world.js';
import { TemplateResourceVisibilityKind } from './compiler-world-reference.js';
import {
  type TemplateCompilerObservedValue,
  type TemplateCompilerReadView,
  TemplateCompilerScopeClosureState,
} from './compiler-read-view.js';
import type { TemplateCompilerReachedAttributeScalarReceipt } from './template-compiler-execution.js';
import type {
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-index.js';
import type { TemplateCompilerLiveAttributeOwnerSite } from './template-compiler-live-attribute-owner.js';
import {
  type TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  type TemplateCompilerNodeOccurrence,
  type TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkBrowserOriginState,
  type TemplateCompilerPreWalkRemainderAuthority,
} from './template-compiler-prewalk-remainder.js';
import type { TemplateCompilerSiteInvocationBinding } from './template-compiler-site-invocation.js';
import {
  TemplateCompilerSiteCursorNormalizedOutcome,
} from './template-compiler-site-cursor-event.js';
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
  type TemplateCompilerBrowserOriginRoute,
} from './template-compiler-authored-origin-index.js';
import { TemplateExpressionParseState } from './value-site.js';

export class TemplateCompilerCursorElementOwnerRelation {
  constructor(
    readonly exact: boolean,
    readonly authoredElement: HtmlElement | null,
    readonly receipts: ReadonlyMap<TemplateCompilerAttributeOccurrence, TemplateCompilerReachedAttributeScalarReceipt>,
  ) {}
}

/** Exact graph/live compatibility resolver shared by the cursor's traversal phases. */
export class TemplateCompilerSiteCursorSemanticResolver {
  private readonly authoredOwnersByElement;
  private readonly elementReadsByName = new Map<
    string,
    TemplateCompilerObservedValue<TemplateResolvedResource | null>
  >();

  constructor(
    readonly binding: TemplateCompilerSiteInvocationBinding,
    readonly compilerReads: TemplateCompilerReadView,
    readonly preWalk: TemplateCompilerPreWalkRemainderAuthority,
  ) {
    this.authoredOwnersByElement = htmlElementAttributeOwnersByElementProduct(
      binding.compilation.html.nodes,
      binding.compilation.html.attributes,
    );
  }

  readElement(lookupName: string): TemplateCompilerObservedValue<TemplateResolvedResource | null> {
    const existing = this.elementReadsByName.get(lookupName);
    if (existing != null) return existing;
    const read = this.compilerReads.readElement(lookupName);
    this.elementReadsByName.set(lookupName, read);
    return read;
  }

  elementReadIsClosed(read: TemplateCompilerObservedValue<TemplateResolvedResource | null>): boolean {
    if (
      !read.observation.validate().isCurrent
      || read.observation.closure.state !== TemplateCompilerScopeClosureState.Closed
    ) return false;
    if (read.value == null) return true;
    return read.value.resolutionKind === TemplateResourceResolutionKind.Definition
      && read.value.resource?.visibilityKind !== TemplateResourceVisibilityKind.Open
      && read.value.resource?.resourceKind === ResourceDefinitionKind.CustomElement
      && read.value.definition instanceof CustomElementDefinition
      && read.value.definition.type === ResourceDefinitionKind.CustomElement;
  }

  closedElementDefinition(
    read: TemplateCompilerObservedValue<TemplateResolvedResource | null>,
  ): CustomElementDefinition | null {
    return this.elementReadIsClosed(read) && read.value?.definition instanceof CustomElementDefinition
      ? read.value.definition
      : null;
  }

  readAsElementScalar(
    element: TemplateCompilerElementOccurrence,
  ): {
    readonly attribute: TemplateCompilerAttributeOccurrence;
    readonly scalar: TemplateCompilerReachedAttributeScalarReceipt;
  } | null {
    for (const [ordinal, attribute] of element.readAttributes().entries()) {
      if (qualifiedAttributeName(attribute) !== 'as-element') continue;
      return {
        attribute,
        scalar: this.binding.execution.captureReachedAttributeScalar(
          this.binding.bootstrapClosure,
          element,
          attribute,
          ordinal,
        ),
      };
    }
    return null;
  }

  elementOwnerRelation(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement | null,
  ): TemplateCompilerCursorElementOwnerRelation {
    const receipts = new Map<TemplateCompilerAttributeOccurrence, TemplateCompilerReachedAttributeScalarReceipt>();
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
      const scalar = this.binding.execution.captureReachedAttributeScalar(
        this.binding.bootstrapClosure,
        element,
        attribute,
        ordinal,
      );
      receipts.set(attribute, scalar);
      const route = this.originRoute(attribute);
      const authoredAttribute = route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
        ? expectedAttributesByProduct.get(route.exactOrigin!.authored.productHandle) ?? null
        : null;
      const expectedAtPosition = expectedOwner?.attributes[ordinal] ?? null;
      exact &&= scalar.isExact()
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
    return relation.exact
      && relation.authoredElement === authoredElement
      && authoredElement != null
      && bundle.owner.element === authoredElement
      && progression.owner?.element === bundle.owner.element
      && progression.attribute === bundle.attribute
      && progression.syntax === bundle.syntax
      && progression.classification === bundle.classification
      && progression.laneKind === TemplateCompilerAttributeOwnerProgressionLaneKind.OrdinaryElement
      && progression.state === TemplateCompilerAttributeOwnerProgressionState.Exact
      && progression.ownerView != null
      && progression.disposition != null
      && scalar.isExact()
      && scalar.attribute === attribute
      && scalar.owner === element
      && scalar.liveOrdinal === liveSite.originalForestOrdinal
      && scalar.qualifiedName === bundle.syntax.runtimeRawName
      && scalar.inputReference?.name === scalar.qualifiedName
      && scalar.currentValue === bundle.attribute.rawValue
      && scalar.namespaceUri == null
      && scalar.prefix == null;
  }

  normalizedAttributeOutcome(bundle: TemplateCompilerNormalizedSite): TemplateCompilerSiteCursorNormalizedOutcome {
    if (
      bundle.syntax.syntaxKind === AttributeSyntaxKind.Open
      || bundle.classification.classificationKind === AttributeClassificationKind.Open
    ) return TemplateCompilerSiteCursorNormalizedOutcome.Open;
    const parses = bundle.readExpressionParses();
    const lowerings = [
      ...(bundle.command == null ? [] : [bundle.command.lowering]),
      ...(bundle.multiBinding?.commandLowerings ?? []),
      ...(bundle.multiBinding == null ? [] : [bundle.multiBinding.lowering]),
    ];
    const hasInvalid = parses.some((parse) => parse.state === TemplateExpressionParseState.Error)
      || lowerings.some((lowering) => lowering.state === BindingCommandLoweringState.Invalid);
    const hasOpen = parses.some((parse) => parse.state !== TemplateExpressionParseState.Complete
      && parse.state !== TemplateExpressionParseState.Error)
      || lowerings.some((lowering) => lowering.state !== BindingCommandLoweringState.Complete
        && lowering.state !== BindingCommandLoweringState.Invalid);
    if (hasInvalid && hasOpen) return TemplateCompilerSiteCursorNormalizedOutcome.Open;
    if (hasInvalid) return TemplateCompilerSiteCursorNormalizedOutcome.Invalid;
    if (hasOpen) return TemplateCompilerSiteCursorNormalizedOutcome.Open;
    if (
      bundle.ownerProgressionSite.disposition === TemplateCompilerAttributeOwnerProgressionDisposition.Open
      || bundle.ownerProgressionSite.state === TemplateCompilerAttributeOwnerProgressionState.Open
    ) return TemplateCompilerSiteCursorNormalizedOutcome.Open;
    return TemplateCompilerSiteCursorNormalizedOutcome.Complete;
  }

  hasProjectionEffect(
    element: TemplateCompilerElementOccurrence,
    definition: CustomElementDefinition | null,
  ): boolean {
    const children = element.readChildren();
    if (children.length === 0) return false;
    if (definition != null && definition.shadowOptions == null) return true;
    return children.some((child) =>
      child instanceof TemplateCompilerElementOccurrence
      && child.readAttributes().some((attribute) => qualifiedAttributeName(attribute) === 'au-slot')
    );
  }

  singularAttributeBundle(attribute: TemplateCompilerAttributeOccurrence): TemplateCompilerNormalizedSite | null {
    const route = this.originRoute(attribute);
    return route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
      ? this.binding.index.siteForAttribute(route.exactOrigin!.authored.productHandle)
      : null;
  }

  singularTextBundle(text: TemplateCompilerTextOccurrence): TemplateCompilerNormalizedTextSite | null {
    const route = this.originRoute(text);
    return route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
      ? this.binding.index.siteForText(route.exactOrigin!.authored.productHandle)
      : null;
  }

  originRoute(
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerBrowserOriginRoute | null {
    const reference = occurrence.inputReference;
    if (reference == null) return null;
    const route = this.preWalk.originRouteForBrowserProduct(reference.productHandle);
    if (
      route != null
      && (
        route.browser.productHandle !== reference.productHandle
        || route.browser.identityHandle !== reference.identityHandle
        || route.browser.addressHandle !== reference.addressHandle
      )
    ) return null;
    return route;
  }

  originState(
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerPreWalkBrowserOriginState {
    return occurrence.inputReference == null
      ? TemplateCompilerPreWalkBrowserOriginState.Absent
      : this.preWalk.originStateForBrowserProduct(occurrence.inputReference.productHandle);
  }
}

function qualifiedAttributeName(attribute: TemplateCompilerAttributeOccurrence): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}
