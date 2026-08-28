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
const liveAttributeOwnerInputAuthority = {};

/** Exact semantic authority for a physical-attribute subset hidden before one logical JIT owner walk. */
export interface TemplateCompilerLiveAttributeSuppressionAuthority {
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly element: TemplateCompilerElementOccurrence;
  readonly forestMutationRevision: number;
  readonly suppressedAttributes: readonly TemplateCompilerAttributeOccurrence[];
  isCurrent(): boolean;
}

/** Nominal immutable physical/visible attribute partition for one logical JIT owner walk. */
export class TemplateCompilerLiveAttributeOwnerInput {
  static capture(
    forest: TemplateCompilerOccurrenceForest,
    element: TemplateCompilerElementOccurrence,
    forestMutationRevision: number,
    suppression: TemplateCompilerLiveAttributeSuppressionAuthority | null = null,
  ): TemplateCompilerLiveAttributeOwnerInput {
    return new TemplateCompilerLiveAttributeOwnerInput(
      liveAttributeOwnerInputAuthority,
      forest,
      element,
      forestMutationRevision,
      suppression,
    );
  }

  readonly #authority: object;
  readonly #originalOrdinalByAttribute: ReadonlyMap<TemplateCompilerAttributeOccurrence, number>;
  readonly #suppressed: ReadonlySet<TemplateCompilerAttributeOccurrence>;
  readonly physicalAttributes: readonly TemplateCompilerAttributeOccurrence[];
  readonly visibleAttributes: readonly TemplateCompilerAttributeOccurrence[];
  readonly suppressedAttributes: readonly TemplateCompilerAttributeOccurrence[];

  private constructor(
    authority: object,
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly element: TemplateCompilerElementOccurrence,
    readonly forestMutationRevision: number,
    readonly suppression: TemplateCompilerLiveAttributeSuppressionAuthority | null,
  ) {
    const physicalAttributes = [...element.readAttributes()];
    const originalOrdinalByAttribute = new Map<TemplateCompilerAttributeOccurrence, number>();
    const qualifiedNames = new Set<string>();
    for (const [ordinal, attribute] of physicalAttributes.entries()) {
      const qualifiedName = qualifiedAttributeName(attribute);
      if (
        forest.attributeForOccurrenceKey(attribute.occurrenceKey) !== attribute
        || attribute.owner !== element
        || originalOrdinalByAttribute.has(attribute)
        || qualifiedNames.has(qualifiedName)
      ) {
        throw new Error(`Live attribute owner '${element.occurrenceKey}' has incoherent attribute identity or order.`);
      }
      originalOrdinalByAttribute.set(attribute, ordinal);
      qualifiedNames.add(qualifiedName);
    }
    const suppressedAttributes = suppression?.suppressedAttributes ?? [];
    const suppressed = new Set(suppressedAttributes);
    let nextSuppressedOrdinal = 0;
    for (const attribute of physicalAttributes) {
      if (attribute === suppressedAttributes[nextSuppressedOrdinal]) nextSuppressedOrdinal++;
    }
    if (
      authority !== liveAttributeOwnerInputAuthority
      || forest.mutationRevision !== forestMutationRevision
      || forest.nodeForOccurrenceKey(element.occurrenceKey) !== element
      || (suppression != null && (
        suppression.forest !== forest
        || suppression.element !== element
        || suppression.forestMutationRevision !== forestMutationRevision
        || !suppression.isCurrent()
        || suppressedAttributes.length === 0
        || suppressed.size !== suppressedAttributes.length
        || nextSuppressedOrdinal !== suppressedAttributes.length
        || suppressedAttributes.some((attribute) =>
          originalOrdinalByAttribute.get(attribute) == null
          || forest.attributeForOccurrenceKey(attribute.occurrenceKey) !== attribute
          || attribute.owner !== element
        )
      ))
    ) {
      throw new Error('Live attribute owner input lost forest, owner, revision, or suppression authority.');
    }
    this.#authority = authority;
    this.#originalOrdinalByAttribute = originalOrdinalByAttribute;
    this.#suppressed = suppressed;
    this.physicalAttributes = physicalAttributes;
    this.suppressedAttributes = [...suppressedAttributes];
    this.visibleAttributes = suppression == null
      ? physicalAttributes
      : physicalAttributes.filter((attribute) => !suppressed.has(attribute));
  }

  isModuleConstructed(): boolean {
    return this.#authority === liveAttributeOwnerInputAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.forest.mutationRevision === this.forestMutationRevision
      && (this.suppression?.isCurrent() ?? true);
  }

  originalOrdinalFor(attribute: TemplateCompilerAttributeOccurrence): number | null {
    return this.#originalOrdinalByAttribute.get(attribute) ?? null;
  }

  isSuppressed(attribute: TemplateCompilerAttributeOccurrence): boolean {
    return this.#suppressed.has(attribute);
  }
}

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
  private readonly attributeByQualifiedName = new Map<string, TemplateCompilerAttributeOccurrence>();
  private readonly removedBeforeVersion = new Map<TemplateCompilerAttributeOccurrence, number>();
  private readonly sites: TemplateCompilerLiveAttributeOwnerSite[] = [];
  private readonly sitesByAttribute = new Map<TemplateCompilerAttributeOccurrence, TemplateCompilerLiveAttributeOwnerSite>();
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly element: TemplateCompilerElementOccurrence;
  readonly forestMutationRevision: number;
  private readonly input: TemplateCompilerLiveAttributeOwnerInput;
  private nextVisibleIndex = 0;
  private nextSimulatedLiveOrdinal = 0;
  private version = 0;
  private stateRevision: string;
  private pending: TemplateCompilerLiveAttributeOwnerSite | null = null;
  private terminalOpen = false;
  private finished = false;

  constructor(input: TemplateCompilerLiveAttributeOwnerInput);
  constructor(
    forest: TemplateCompilerOccurrenceForest,
    element: TemplateCompilerElementOccurrence,
    forestMutationRevision: number,
  );
  constructor(
    inputOrForest: TemplateCompilerLiveAttributeOwnerInput | TemplateCompilerOccurrenceForest,
    element?: TemplateCompilerElementOccurrence,
    forestMutationRevision?: number,
  ) {
    if (
      !(inputOrForest instanceof TemplateCompilerLiveAttributeOwnerInput)
      && forestMutationRevision != null
      && inputOrForest.mutationRevision !== forestMutationRevision
    ) {
      throw new Error(
        `Live attribute owner revision drifted from ${forestMutationRevision} to ${inputOrForest.mutationRevision}.`,
      );
    }
    if (
      !(inputOrForest instanceof TemplateCompilerLiveAttributeOwnerInput)
      && element != null
      && inputOrForest.nodeForOccurrenceKey(element.occurrenceKey) !== element
    ) {
      throw new Error(`Live attribute owner '${element.occurrenceKey}' belongs to another occurrence forest.`);
    }
    const input = inputOrForest instanceof TemplateCompilerLiveAttributeOwnerInput
      ? inputOrForest
      : element == null || forestMutationRevision == null
        ? null
        : TemplateCompilerLiveAttributeOwnerInput.capture(
            inputOrForest,
            element,
            forestMutationRevision,
          );
    if (input == null || !input.isCurrent()) {
      throw new Error('Live attribute owner progression requires one current nominal owner input.');
    }
    this.input = input;
    this.forest = input.forest;
    this.element = input.element;
    this.forestMutationRevision = input.forestMutationRevision;
    this.assertForestRevision();
    const stateParts = [
      this.forest.inputTree.productHandle,
      this.element.occurrenceKey,
      String(this.forestMutationRevision),
    ];
    const suppressedAttributes = input.suppressedAttributes;
    if (suppressedAttributes.length > 0) {
      stateParts.push('initial-suppression', ...suppressedAttributes.map((attribute) => attribute.occurrenceKey));
    }
    this.stateRevision = stateDigest(stateParts);

    for (const attribute of input.visibleAttributes) {
      const qualifiedName = qualifiedAttributeName(attribute);
      this.attributeByQualifiedName.set(qualifiedName, attribute);
    }
    for (const attribute of suppressedAttributes) this.removedBeforeVersion.set(attribute, 0);
  }

  readAttributesToVisit(): readonly TemplateCompilerAttributeOccurrence[] {
    this.assertForestRevision();
    return this.input.visibleAttributes;
  }

  get ownerInput(): TemplateCompilerLiveAttributeOwnerInput {
    return this.input;
  }

  begin(attribute: TemplateCompilerAttributeOccurrence): TemplateCompilerLiveAttributeOwnerSite {
    this.assertActive();
    if (this.pending != null) {
      throw new Error(`Live attribute site '${this.pending.attribute.occurrenceKey}' must complete before another begins.`);
    }
    const originalForestOrdinal = this.input.originalOrdinalFor(attribute);
    if (
      originalForestOrdinal == null
      || this.forest.attributeForOccurrenceKey(attribute.occurrenceKey) !== attribute
      || attribute.owner !== this.element
    ) {
      throw new Error(`Attribute '${attribute.occurrenceKey}' does not belong to this live attribute owner.`);
    }
    const expected = this.input.visibleAttributes[this.nextVisibleIndex] ?? null;
    if (expected !== attribute) {
      const expectedOriginalOrdinal = expected == null ? null : this.input.originalOrdinalFor(expected);
      const expectedOrdinal = expectedOriginalOrdinal == null ? 'end' : String(expectedOriginalOrdinal);
      throw new Error(
        `Attribute '${attribute.occurrenceKey}' is at forest ordinal ${originalForestOrdinal}; expected ${expectedOrdinal} at visible index ${this.nextVisibleIndex}.`,
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
    this.nextVisibleIndex += 1;
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
    if (!this.terminalOpen && this.nextVisibleIndex !== this.input.visibleAttributes.length) {
      throw new Error(
        `Live attribute owner '${this.element.occurrenceKey}' stopped at ${this.nextVisibleIndex}/${this.input.visibleAttributes.length}.`,
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
    if (!this.input.isCurrent()) {
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
