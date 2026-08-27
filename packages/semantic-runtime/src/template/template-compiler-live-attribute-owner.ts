import { createHash } from 'node:crypto';

import type { TemplateAttributeMapperNode } from './attribute-mapper.js';
import type { HtmlNamespaceKind } from './html-ir.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceForest,
} from './template-compiler-occurrence.js';

export const enum TemplateCompilerLiveAttributeDisposition {
  Retained = 'retained',
  Removed = 'removed',
  Open = 'open',
}

const siteDispositions = new WeakMap<
  TemplateCompilerLiveAttributeOwnerSite,
  TemplateCompilerLiveAttributeDisposition | null
>();

/** Immutable DOM-shaped mapper view immediately before one live attribute occurrence is classified. */
export class TemplateCompilerLiveAttributeOwnerView implements TemplateAttributeMapperNode {
  readonly tagName: string;
  readonly namespace: HtmlNamespaceKind;
  readonly attributeStateKey: string;

  constructor(
    private readonly progression: TemplateCompilerLiveAttributeOwnerProgression,
    readonly version: number,
    stateRevision: string,
  ) {
    this.tagName = progression.element.tagName;
    this.namespace = progression.element.namespace;
    this.attributeStateKey = `live-attribute-state:${stateRevision}`;
  }

  hasAttribute(qualifiedName: string): boolean {
    return this.progression.readQualifiedAttribute(qualifiedName, this.version) != null;
  }

  getAttribute(qualifiedName: string): string | null {
    return this.progression.readQualifiedAttribute(qualifiedName, this.version)?.value ?? null;
  }
}

/** One live attribute's original placement and simulated NamedNodeMap placement at JIT reach. */
export class TemplateCompilerLiveAttributeOwnerSite {
  constructor(
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly ownerView: TemplateCompilerLiveAttributeOwnerView,
    readonly originalForestOrdinal: number,
    readonly simulatedLiveOrdinal: number,
  ) {
    siteDispositions.set(this, null);
  }

  get disposition(): TemplateCompilerLiveAttributeDisposition | null {
    return siteDispositions.get(this) ?? null;
  }
}

/**
 * Product-free simulation of one reached element's JIT-live NamedNodeMap.
 *
 * Forest mutation remains external. This state records only which exact occurrence would still be visible after each
 * successful JIT classification step, while preserving historical pre-step views for compiler-read receipts.
 */
export class TemplateCompilerLiveAttributeOwnerProgression {
  private readonly ordinalByAttribute = new Map<TemplateCompilerAttributeOccurrence, number>();
  private readonly attributeByQualifiedName = new Map<string, TemplateCompilerAttributeOccurrence>();
  private readonly removedBeforeVersion = new Map<TemplateCompilerAttributeOccurrence, number>();
  private readonly sites: TemplateCompilerLiveAttributeOwnerSite[] = [];
  private readonly sitesByAttribute = new Map<TemplateCompilerAttributeOccurrence, TemplateCompilerLiveAttributeOwnerSite>();
  private readonly attributeCount: number;
  private nextOriginalOrdinal = 0;
  private nextSimulatedLiveOrdinal = 0;
  private version = 0;
  private stateRevision: string;
  private pending: TemplateCompilerLiveAttributeOwnerSite | null = null;
  private terminalOpen = false;
  private finished = false;

  constructor(
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly element: TemplateCompilerElementOccurrence,
    readonly forestMutationRevision: number,
  ) {
    this.assertForestRevision();
    if (forest.nodeForOccurrenceKey(element.occurrenceKey) !== element) {
      throw new Error(`Live attribute owner '${element.occurrenceKey}' belongs to another occurrence forest.`);
    }
    this.stateRevision = stateDigest([
      forest.inputTree.productHandle,
      element.occurrenceKey,
      String(forestMutationRevision),
    ]);

    const attributes = element.readAttributes();
    this.attributeCount = attributes.length;
    for (let ordinal = 0; ordinal < attributes.length; ordinal++) {
      const attribute = attributes[ordinal]!;
      if (
        forest.attributeForOccurrenceKey(attribute.occurrenceKey) !== attribute
        || attribute.owner !== element
        || this.ordinalByAttribute.has(attribute)
      ) {
        throw new Error(`Live attribute owner '${element.occurrenceKey}' has incoherent attribute identity or order.`);
      }
      const qualifiedName = qualifiedAttributeName(attribute);
      if (this.attributeByQualifiedName.has(qualifiedName)) {
        throw new Error(
          `Live attribute owner '${element.occurrenceKey}' contains duplicate qualified name '${qualifiedName}'.`,
        );
      }
      this.ordinalByAttribute.set(attribute, ordinal);
      this.attributeByQualifiedName.set(qualifiedName, attribute);
    }
  }

  begin(attribute: TemplateCompilerAttributeOccurrence): TemplateCompilerLiveAttributeOwnerSite {
    this.assertActive();
    if (this.pending != null) {
      throw new Error(`Live attribute site '${this.pending.attribute.occurrenceKey}' must complete before another begins.`);
    }
    const originalForestOrdinal = this.ordinalByAttribute.get(attribute) ?? null;
    if (
      originalForestOrdinal == null
      || this.forest.attributeForOccurrenceKey(attribute.occurrenceKey) !== attribute
      || attribute.owner !== this.element
    ) {
      throw new Error(`Attribute '${attribute.occurrenceKey}' does not belong to this live attribute owner.`);
    }
    if (originalForestOrdinal !== this.nextOriginalOrdinal) {
      throw new Error(
        `Attribute '${attribute.occurrenceKey}' is at forest ordinal ${originalForestOrdinal}; expected ${this.nextOriginalOrdinal}.`,
      );
    }
    if (this.element.readAttributes()[originalForestOrdinal] !== attribute || this.sitesByAttribute.has(attribute)) {
      throw new Error(`Attribute '${attribute.occurrenceKey}' was already admitted or its owner order changed.`);
    }

    const site = new TemplateCompilerLiveAttributeOwnerSite(
      attribute,
      new TemplateCompilerLiveAttributeOwnerView(this, this.version, this.stateRevision),
      originalForestOrdinal,
      this.nextSimulatedLiveOrdinal,
    );
    this.pending = site;
    this.sites.push(site);
    this.sitesByAttribute.set(attribute, site);
    return site;
  }

  complete(
    site: TemplateCompilerLiveAttributeOwnerSite,
    disposition: TemplateCompilerLiveAttributeDisposition,
  ): void {
    this.assertActive();
    if (this.sitesByAttribute.get(site.attribute) !== site) {
      throw new Error(`Live attribute site '${site.attribute.occurrenceKey}' belongs to another progression.`);
    }
    if (site.disposition != null) {
      throw new Error(`Live attribute site '${site.attribute.occurrenceKey}' is already completed.`);
    }
    if (this.pending !== site) {
      throw new Error(`Live attribute site '${site.attribute.occurrenceKey}' is outside the pending step.`);
    }
    siteDispositions.set(site, disposition);
    const nextVersion = this.version + 1;
    switch (disposition) {
      case TemplateCompilerLiveAttributeDisposition.Removed:
        this.removedBeforeVersion.set(site.attribute, nextVersion);
        break;
      case TemplateCompilerLiveAttributeDisposition.Retained:
        this.nextSimulatedLiveOrdinal += 1;
        break;
      case TemplateCompilerLiveAttributeDisposition.Open:
        this.terminalOpen = true;
        break;
    }
    this.nextOriginalOrdinal += 1;
    this.version = nextVersion;
    this.stateRevision = stateDigest([
      this.stateRevision,
      site.attribute.occurrenceKey,
      disposition,
    ]);
    this.pending = null;
  }

  finish(): TemplateCompilerLiveAttributeOwnerProgression {
    this.assertForestRevision();
    if (this.pending != null) {
      throw new Error(`Live attribute site '${this.pending.attribute.occurrenceKey}' is still pending.`);
    }
    if (!this.terminalOpen && this.nextOriginalOrdinal !== this.attributeCount) {
      throw new Error(
        `Live attribute owner '${this.element.occurrenceKey}' stopped at ${this.nextOriginalOrdinal}/${this.attributeCount}.`,
      );
    }
    this.finished = true;
    return this;
  }

  readSites(): readonly TemplateCompilerLiveAttributeOwnerSite[] {
    this.assertForestRevision();
    return this.sites;
  }

  /** Immutable DOM-shaped mapper view after every reached site disposition has completed. */
  readFinalView(): TemplateCompilerLiveAttributeOwnerView {
    this.assertForestRevision();
    if (!this.finished) {
      throw new Error(`Live attribute owner '${this.element.occurrenceKey}' has not finished.`);
    }
    return new TemplateCompilerLiveAttributeOwnerView(this, this.version, this.stateRevision);
  }

  siteForAttribute(attribute: TemplateCompilerAttributeOccurrence): TemplateCompilerLiveAttributeOwnerSite | null {
    this.assertForestRevision();
    return this.sitesByAttribute.get(attribute) ?? null;
  }

  readQualifiedAttribute(
    qualifiedName: string,
    version: number,
  ): TemplateCompilerAttributeOccurrence | null {
    this.assertForestRevision();
    if (!Number.isSafeInteger(version) || version < 0 || version > this.version) {
      throw new Error(`Live attribute owner view has invalid version ${version}.`);
    }
    const attribute = this.attributeByQualifiedName.get(qualifiedName) ?? null;
    if (attribute == null) return null;
    const removedBefore = this.removedBeforeVersion.get(attribute) ?? null;
    return removedBefore == null || removedBefore > version ? attribute : null;
  }

  private assertActive(): void {
    this.assertForestRevision();
    if (this.finished) throw new Error('Live attribute owner progression is already finished.');
    if (this.terminalOpen) throw new Error('Live attribute owner progression is terminally open.');
  }

  private assertForestRevision(): void {
    if (this.forest.mutationRevision !== this.forestMutationRevision) {
      throw new Error(
        `Live attribute owner revision drifted from ${this.forestMutationRevision} to ${this.forest.mutationRevision}.`,
      );
    }
  }
}

function qualifiedAttributeName(attribute: TemplateCompilerAttributeOccurrence): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}

function stateDigest(parts: readonly string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(String(part.length));
    hash.update(':');
    hash.update(part);
  }
  return hash.digest('hex');
}
