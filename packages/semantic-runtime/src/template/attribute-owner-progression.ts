import type { ProductHandle } from '../kernel/handles.js';
import type { AttributeClassification, AttributeSyntax } from './attribute-syntax.js';
import type { TemplateAttributeMapperNode } from './attribute-mapper.js';
import {
  type HtmlAttribute,
  type HtmlNamespaceKind,
  type HtmlElementAttributeOwner,
  htmlElementAttributeOwnersByAttributeProduct,
} from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';
import { runtimeAttributeName, runtimeElementResourceName } from './runtime-dom-name.js';
import { compilerRootTemplateElement } from './compiler-root-template.js';

export const enum TemplateCompilerAttributeOwnerProgressionLaneKind {
  OrdinaryElement = 'ordinary-element',
  LetElementOpen = 'let-element-open',
  SurrogateOpen = 'surrogate-open',
  MissingOwnerOpen = 'missing-owner-open',
}

export const enum TemplateCompilerAttributeOwnerProgressionState {
  Exact = 'exact',
  Open = 'open',
}

export const enum TemplateCompilerAttributeOwnerProgressionDisposition {
  Retained = 'retained',
  Removed = 'removed',
  Open = 'open',
}

export const enum TemplateCompilerAttributeOwnerProgressionOpenReasonKind {
  MissingOwner = 'missing-owner',
  DedicatedLetOwner = 'dedicated-let-owner',
  DedicatedSurrogateOwner = 'dedicated-surrogate-owner',
  SemanticPredecessorOpen = 'semantic-predecessor-open',
  CurrentSiteOpen = 'current-site-open',
}

export class TemplateCompilerAttributeOwnerProgressionOpenReason {
  constructor(
    readonly reasonKind: TemplateCompilerAttributeOwnerProgressionOpenReasonKind,
    readonly predecessorAttributeProductHandle: ProductHandle | null,
    readonly summary: string,
  ) {}
}

/** Immutable AttrMapper view immediately before one authored attribute is classified/lowered by the JIT walk. */
export class TemplateCompilerAttributeOwnerSiteView implements TemplateAttributeMapperNode {
  readonly tagName: string;
  readonly namespace: HtmlNamespaceKind;
  readonly attributeStateKey: string;

  constructor(
    private readonly elementState: TemplateCompilerAttributeOwnerElementProgression,
    readonly owner: HtmlElementAttributeOwner,
    readonly version: number,
  ) {
    this.tagName = owner.tagName;
    this.namespace = owner.namespace;
    this.attributeStateKey = `${owner.element.productHandle}:attribute-state:${version}`;
  }

  hasAttribute(name: string): boolean {
    return this.elementState.attributeAt(name, this.version) != null;
  }

  getAttribute(name: string): string | null {
    return this.elementState.attributeAt(name, this.version)?.rawValue ?? null;
  }
}

/** One exact/open owner observation and its completed JIT disposition. */
export class TemplateCompilerAttributeOwnerProgressionSite {
  private completedDisposition: TemplateCompilerAttributeOwnerProgressionDisposition | null = null;
  private completedOpenReason: TemplateCompilerAttributeOwnerProgressionOpenReason | null = null;

  constructor(
    readonly attribute: HtmlAttribute,
    readonly syntax: AttributeSyntax | null,
    readonly classification: AttributeClassification | null,
    readonly owner: HtmlElementAttributeOwner | null,
    readonly laneKind: TemplateCompilerAttributeOwnerProgressionLaneKind,
    readonly ownerOrdinal: number | null,
    readonly state: TemplateCompilerAttributeOwnerProgressionState,
    readonly ownerView: TemplateCompilerAttributeOwnerSiteView | null,
    readonly inheritedOpenReason: TemplateCompilerAttributeOwnerProgressionOpenReason | null,
  ) {}

  get disposition(): TemplateCompilerAttributeOwnerProgressionDisposition | null {
    return this.completedDisposition;
  }

  get openReason(): TemplateCompilerAttributeOwnerProgressionOpenReason | null {
    return this.completedOpenReason ?? this.inheritedOpenReason;
  }

  complete(
    disposition: TemplateCompilerAttributeOwnerProgressionDisposition,
    openReason: TemplateCompilerAttributeOwnerProgressionOpenReason | null,
  ): void {
    if (this.completedDisposition != null) {
      throw new Error(`Attribute owner progression site '${this.attribute.productHandle}' is already completed.`);
    }
    if (
      (disposition === TemplateCompilerAttributeOwnerProgressionDisposition.Open) !== (openReason != null)
      || (
        this.state === TemplateCompilerAttributeOwnerProgressionState.Open
        && disposition !== TemplateCompilerAttributeOwnerProgressionDisposition.Open
      )
    ) {
      throw new Error(`Attribute owner progression site '${this.attribute.productHandle}' has an incoherent completion.`);
    }
    this.completedDisposition = disposition;
    this.completedOpenReason = openReason;
  }
}

/** Run-owned progressive DOM attribute authority shared by lowering and later GraphExact validation. */
export class TemplateCompilerAttributeOwnerProgression {
  private readonly ownersByAttributeProduct: ReadonlyMap<ProductHandle, HtmlElementAttributeOwner>;
  private readonly elementStates = new Map<ProductHandle, TemplateCompilerAttributeOwnerElementProgression>();
  private readonly sites: TemplateCompilerAttributeOwnerProgressionSite[] = [];
  private readonly sitesByAttributeProduct = new Map<ProductHandle, TemplateCompilerAttributeOwnerProgressionSite>();
  private finished = false;

  constructor(readonly html: HtmlParseEmission) {
    this.ownersByAttributeProduct = htmlElementAttributeOwnersByAttributeProduct(html.nodes, html.attributes);
    const rootTemplate = compilerRootTemplateElement(html);
    for (const owner of new Set(this.ownersByAttributeProduct.values())) {
      const laneKind = runtimeElementResourceName(owner.tagName, owner.namespace) === 'let'
        ? TemplateCompilerAttributeOwnerProgressionLaneKind.LetElementOpen
        : owner.element === rootTemplate
          ? TemplateCompilerAttributeOwnerProgressionLaneKind.SurrogateOpen
          : TemplateCompilerAttributeOwnerProgressionLaneKind.OrdinaryElement;
      this.elementStates.set(
        owner.element.productHandle,
        new TemplateCompilerAttributeOwnerElementProgression(owner, laneKind),
      );
    }
  }

  begin(
    attribute: HtmlAttribute,
    syntax: AttributeSyntax | null,
    classification: AttributeClassification | null,
  ): TemplateCompilerAttributeOwnerProgressionSite {
    this.requireOpen();
    if (this.sitesByAttributeProduct.has(attribute.productHandle)) {
      throw new Error(`Attribute owner progression site '${attribute.productHandle}' is already admitted.`);
    }
    const owner = this.ownersByAttributeProduct.get(attribute.productHandle) ?? null;
    const elementState = owner == null ? null : this.elementStates.get(owner.element.productHandle) ?? null;
    const site = elementState == null
      ? new TemplateCompilerAttributeOwnerProgressionSite(
          attribute,
          syntax,
          classification,
          null,
          TemplateCompilerAttributeOwnerProgressionLaneKind.MissingOwnerOpen,
          null,
          TemplateCompilerAttributeOwnerProgressionState.Open,
          null,
          new TemplateCompilerAttributeOwnerProgressionOpenReason(
            TemplateCompilerAttributeOwnerProgressionOpenReasonKind.MissingOwner,
            null,
            'Authored attribute has no singular element owner.',
          ),
        )
      : elementState.begin(attribute, syntax, classification);
    this.sites.push(site);
    this.sitesByAttributeProduct.set(attribute.productHandle, site);
    return site;
  }

  complete(
    site: TemplateCompilerAttributeOwnerProgressionSite,
    disposition: TemplateCompilerAttributeOwnerProgressionDisposition,
    openReason: TemplateCompilerAttributeOwnerProgressionOpenReason | null = null,
  ): void {
    this.requireOpen();
    if (this.sitesByAttributeProduct.get(site.attribute.productHandle) !== site) {
      throw new Error(`Attribute owner progression site '${site.attribute.productHandle}' belongs to another run.`);
    }
    site.complete(disposition, openReason);
    if (site.owner != null) {
      this.elementStates.get(site.owner.element.productHandle)!.complete(site);
    }
  }

  finish(): TemplateCompilerAttributeOwnerProgression {
    if (this.finished) return this;
    for (const attribute of this.html.attributes) {
      const site = this.sitesByAttributeProduct.get(attribute.productHandle) ?? null;
      if (site == null || site.disposition == null) {
        throw new Error(`Attribute owner progression omitted '${attribute.productHandle}'.`);
      }
    }
    for (const state of this.elementStates.values()) state.assertComplete();
    this.finished = true;
    return this;
  }

  readSites(): readonly TemplateCompilerAttributeOwnerProgressionSite[] {
    return this.sites;
  }

  siteForAttribute(attributeProductHandle: ProductHandle): TemplateCompilerAttributeOwnerProgressionSite | null {
    return this.sitesByAttributeProduct.get(attributeProductHandle) ?? null;
  }

  private requireOpen(): void {
    if (this.finished) throw new Error('Attribute owner progression is already finished.');
  }
}

export class TemplateCompilerAttributeOwnerElementProgression {
  private readonly attributesByRuntimeName = new Map<string, HtmlAttribute[]>();
  private readonly removedBeforeVersion = new Map<ProductHandle, number>();
  private nextOrdinal = 0;
  private version = 0;
  private openReason: TemplateCompilerAttributeOwnerProgressionOpenReason | null;

  constructor(
    readonly owner: HtmlElementAttributeOwner,
    readonly laneKind: TemplateCompilerAttributeOwnerProgressionLaneKind,
  ) {
    this.openReason = laneKind === TemplateCompilerAttributeOwnerProgressionLaneKind.LetElementOpen
      ? new TemplateCompilerAttributeOwnerProgressionOpenReason(
          TemplateCompilerAttributeOwnerProgressionOpenReasonKind.DedicatedLetOwner,
          null,
          '<let> attributes use the dedicated JIT let grammar and retention rules.',
        )
      : laneKind === TemplateCompilerAttributeOwnerProgressionLaneKind.SurrogateOpen
        ? new TemplateCompilerAttributeOwnerProgressionOpenReason(
            TemplateCompilerAttributeOwnerProgressionOpenReasonKind.DedicatedSurrogateOwner,
            null,
            'Root surrogate attributes require their dedicated all-attribute validation and lowering pass.',
          )
        : null;
    for (const attribute of owner.attributes) {
      const name = runtimeAttributeName(attribute.rawName, owner.namespace);
      const candidates = this.attributesByRuntimeName.get(name);
      if (candidates == null) this.attributesByRuntimeName.set(name, [attribute]);
      else candidates.push(attribute);
    }
  }

  begin(
    attribute: HtmlAttribute,
    syntax: AttributeSyntax | null,
    classification: AttributeClassification | null,
  ): TemplateCompilerAttributeOwnerProgressionSite {
    if (this.owner.attributes[this.nextOrdinal] !== attribute) {
      throw new Error(`Attribute '${attribute.productHandle}' is outside its owner's progressive DOM order.`);
    }
    const state = this.openReason == null
      ? TemplateCompilerAttributeOwnerProgressionState.Exact
      : TemplateCompilerAttributeOwnerProgressionState.Open;
    return new TemplateCompilerAttributeOwnerProgressionSite(
      attribute,
      syntax,
      classification,
      this.owner,
      this.laneKind,
      this.nextOrdinal,
      state,
      state === TemplateCompilerAttributeOwnerProgressionState.Exact
        ? new TemplateCompilerAttributeOwnerSiteView(this, this.owner, this.version)
        : null,
      this.openReason,
    );
  }

  complete(site: TemplateCompilerAttributeOwnerProgressionSite): void {
    if (this.owner.attributes[this.nextOrdinal] !== site.attribute || site.disposition == null) {
      throw new Error(`Attribute '${site.attribute.productHandle}' completed outside progressive DOM order.`);
    }
    const nextVersion = this.version + 1;
    if (site.disposition === TemplateCompilerAttributeOwnerProgressionDisposition.Removed) {
      this.removedBeforeVersion.set(site.attribute.productHandle, nextVersion);
    } else if (
      site.disposition === TemplateCompilerAttributeOwnerProgressionDisposition.Open
      && this.openReason == null
    ) {
      this.openReason = new TemplateCompilerAttributeOwnerProgressionOpenReason(
        TemplateCompilerAttributeOwnerProgressionOpenReasonKind.SemanticPredecessorOpen,
        site.attribute.productHandle,
        `Earlier attribute owner state is open: ${site.openReason?.summary ?? 'unknown semantic gap'}`,
      );
    }
    this.nextOrdinal++;
    this.version = nextVersion;
  }

  attributeAt(name: string, version: number): HtmlAttribute | null {
    const runtimeName = runtimeAttributeName(name, this.owner.namespace);
    for (const attribute of this.attributesByRuntimeName.get(runtimeName) ?? []) {
      const removedBefore = this.removedBeforeVersion.get(attribute.productHandle) ?? null;
      if (removedBefore == null || removedBefore > version) return attribute;
    }
    return null;
  }

  assertComplete(): void {
    if (this.nextOrdinal !== this.owner.attributes.length) {
      throw new Error(`Element '${this.owner.element.productHandle}' has incomplete attribute progression.`);
    }
  }
}
