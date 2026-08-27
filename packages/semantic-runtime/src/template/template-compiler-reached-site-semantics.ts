import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
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
import type {
  TemplateCompilerInvocationBootstrapClosure,
  TemplateCompilerReachedAttributeScalarReceipt,
  TemplateCompilerSiteExecutionDriverReference,
  TemplateCompilerExecutionSession,
} from './template-compiler-execution.js';
import type {
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-index.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerNodeOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkBrowserOriginState,
  type TemplateCompilerPreWalkRemainderAuthority,
} from './template-compiler-prewalk-remainder.js';
import {
  TemplateCompilerBrowserOriginRouteKind,
  type TemplateCompilerBrowserOriginRoute,
} from './template-compiler-authored-origin-index.js';

export interface TemplateCompilerReachedSiteSemanticResolverRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure;
  readonly compilerReads: TemplateCompilerReadView;
  readonly preWalk: TemplateCompilerPreWalkRemainderAuthority | null;
  readonly index: TemplateCompilerNormalizedSiteIndex | null;
}

/**
 * Shared event-time authority for browser-occurrence compiler sites.
 *
 * This layer knows current compiler reads, scalar capture, and authored/browser cardinality. It does not classify,
 * lower, spend, or choose target rows. Root-cursor semantics and live assembly both build on this same authority.
 */
export class TemplateCompilerReachedSiteSemanticResolver {
  private readonly elementReadsByName = new Map<
    string,
    TemplateCompilerObservedValue<TemplateResolvedResource | null>
  >();
  private siteAuthority: TemplateCompilerInvocationBootstrapClosure | TemplateCompilerSiteExecutionDriverReference;

  constructor(readonly request: TemplateCompilerReachedSiteSemanticResolverRequest) {
    const { execution, bootstrapClosure, compilerReads, preWalk, index } = request;
    if (
      execution.bootstrapClosure(bootstrapClosure.lane) !== bootstrapClosure
      || compilerReads.world !== bootstrapClosure.hookBootstrap.compilerWorld
      || (preWalk != null && (
        preWalk.binding.execution !== execution
        || preWalk.binding.bootstrapClosure !== bootstrapClosure
        || preWalk.index !== index
      ))
    ) {
      throw new Error('Reached compiler-site semantics require one exact execution, world, and optional origin basis.');
    }
    this.siteAuthority = bootstrapClosure;
  }

  get execution(): TemplateCompilerExecutionSession {
    return this.request.execution;
  }

  get bootstrapClosure(): TemplateCompilerInvocationBootstrapClosure {
    return this.request.bootstrapClosure;
  }

  get compilerReads(): TemplateCompilerReadView {
    return this.request.compilerReads;
  }

  get preWalk(): TemplateCompilerPreWalkRemainderAuthority | null {
    return this.request.preWalk;
  }

  get index(): TemplateCompilerNormalizedSiteIndex | null {
    return this.request.index;
  }

  useSiteDriver(driver: TemplateCompilerSiteExecutionDriverReference): void {
    if (driver.frontier.bootstrapClosure !== this.bootstrapClosure) {
      throw new Error('Reached compiler-site semantics cannot adopt a foreign site driver.');
    }
    this.execution.assertCurrentSiteExecutionDriver(driver);
    this.siteAuthority = driver;
  }

  captureReachedAttributeScalar(
    owner: TemplateCompilerElementOccurrence,
    attribute: TemplateCompilerAttributeOccurrence,
    liveOrdinal: number,
  ): TemplateCompilerReachedAttributeScalarReceipt {
    return this.execution.captureReachedAttributeScalar(
      this.siteAuthority,
      owner,
      attribute,
      liveOrdinal,
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
        scalar: this.captureReachedAttributeScalar(element, attribute, ordinal),
      };
    }
    return null;
  }

  singularAttributeBundle(attribute: TemplateCompilerAttributeOccurrence): TemplateCompilerNormalizedSite | null {
    const route = this.originRoute(attribute);
    return route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
      ? this.index?.siteForAttribute(route.exactOrigin!.authored.productHandle) ?? null
      : null;
  }

  singularTextBundle(text: TemplateCompilerTextOccurrence): TemplateCompilerNormalizedTextSite | null {
    const route = this.originRoute(text);
    return route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
      ? this.index?.siteForText(route.exactOrigin!.authored.productHandle) ?? null
      : null;
  }

  originRoute(
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerBrowserOriginRoute | null {
    const reference = occurrence.inputReference;
    if (reference == null || this.preWalk == null) return null;
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
    if (occurrence.inputReference == null) {
      return TemplateCompilerPreWalkBrowserOriginState.Absent;
    }
    return this.preWalk == null
      ? TemplateCompilerPreWalkBrowserOriginState.Unknown
      : this.preWalk.originStateForBrowserProduct(occurrence.inputReference.productHandle);
  }
}

function qualifiedAttributeName(attribute: TemplateCompilerAttributeOccurrence): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}
