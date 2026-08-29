import type {
  TemplateCompilerExecutionLaneReference,
  TemplateCompilerExtractedInvocationTransfer,
  TemplateCompilerInvocationBootstrapClosure,
} from './template-compiler-execution.js';
import {
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-index.js';
import {
  type TemplateCompilerLocalSiteExclusionAuthority,
  type TemplateCompilerLocalSiteExclusionReceipt,
  type TemplateCompilerNormalizedSiteBundle,
  TemplateCompilerSiteSpendDisposition,
  type TemplateCompilerSpendOccurrence,
} from './template-compiler-site-spend-ledger.js';
import { TemplateCompilerTextOccurrence } from './template-compiler-occurrence.js';
import type {
  TemplateCompilerOccurrencePrecedentInvocationBinding,
  TemplateCompilerRootSiteInvocationIngress,
} from './template-compiler-site-invocation.js';

const normalizedSiteLaneFamilyAuthority = {};
const extractedNormalizedSiteIngressAuthority = {};
const normalizedSiteLanePartitionAuthority = {};

export const enum TemplateCompilerNormalizedSiteLaneResultState {
  Exact = 'exact',
  Open = 'open',
  Mismatch = 'mismatch',
}

export const enum TemplateCompilerNormalizedSiteLaneReasonKind {
  CurrentnessLost = 'currentness-lost',
  CanonicalOccurrenceMissing = 'canonical-occurrence-missing',
  CanonicalOccurrenceAmbiguous = 'canonical-occurrence-ambiguous',
  ExclusionOutsideIncomingView = 'exclusion-outside-incoming-view',
}

export class TemplateCompilerNormalizedSiteLaneReason {
  constructor(
    readonly reasonKind: TemplateCompilerNormalizedSiteLaneReasonKind,
    readonly summary: string,
    readonly bundle: TemplateCompilerNormalizedSiteBundle | null,
    readonly occurrences: readonly TemplateCompilerSpendOccurrence[] = [],
  ) {}
}

/** One canonical seeded browser occurrence joined to its exact raw normalized bundle. */
export class TemplateCompilerNormalizedSiteLaneSite {
  constructor(
    readonly bundle: TemplateCompilerNormalizedSiteBundle,
    readonly occurrence: TemplateCompilerSpendOccurrence,
  ) {}
}

/** Exact temporal arrival of one normalized-site subset into an extracted local invocation. */
export class TemplateCompilerExtractedNormalizedSiteIngress {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly parentView: TemplateCompilerNormalizedSiteLaneView,
    readonly parentClosure: TemplateCompilerInvocationBootstrapClosure,
    readonly exclusionAuthority: TemplateCompilerLocalSiteExclusionAuthority,
    readonly transfer: TemplateCompilerExtractedInvocationTransfer,
  ) {
    if (authority !== extractedNormalizedSiteIngressAuthority) {
      throw new Error('Extracted normalized-site ingress is a module-constructed capability.');
    }
    this.#authority = authority;
  }

  get childLane(): TemplateCompilerExecutionLaneReference {
    return this.transfer.childLane;
  }

  isModuleConstructed(): boolean {
    return this.#authority === extractedNormalizedSiteIngressAuthority;
  }
}

export type TemplateCompilerNormalizedSiteLaneIngress =
  | TemplateCompilerRootSiteInvocationIngress
  | TemplateCompilerExtractedNormalizedSiteIngress;

/** Immutable incoming normalized-site membership for one run-local compiler invocation lane. */
export class TemplateCompilerNormalizedSiteLaneView {
  readonly sites: readonly TemplateCompilerNormalizedSiteLaneSite[];
  readonly bundles: readonly TemplateCompilerNormalizedSiteBundle[];
  readonly attributeSites: readonly TemplateCompilerNormalizedSite[];
  readonly textSites: readonly TemplateCompilerNormalizedTextSite[];
  readonly #sitesByBundle: ReadonlyMap<TemplateCompilerNormalizedSiteBundle, TemplateCompilerNormalizedSiteLaneSite>;
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly family: TemplateCompilerNormalizedSiteLaneFamily,
    readonly lane: TemplateCompilerExecutionLaneReference,
    readonly ingress: TemplateCompilerNormalizedSiteLaneIngress,
    sites: readonly TemplateCompilerNormalizedSiteLaneSite[],
  ) {
    if (familyAuthority !== normalizedSiteLaneFamilyAuthority) {
      throw new Error('Normalized-site lane views are family-constructed capabilities.');
    }
    this.#familyAuthority = familyAuthority;
    this.sites = sites;
    this.#sitesByBundle = new Map(sites.map((site) => [site.bundle, site]));
    this.bundles = sites.map((site) => site.bundle);
    this.attributeSites = this.bundles.filter(
      (bundle): bundle is TemplateCompilerNormalizedSite => bundle instanceof TemplateCompilerNormalizedSite,
    );
    this.textSites = this.bundles.filter(
      (bundle): bundle is TemplateCompilerNormalizedTextSite => bundle instanceof TemplateCompilerNormalizedTextSite,
    );
    if (this.#sitesByBundle.size !== sites.length) {
      throw new Error(`Normalized-site lane '${lane.localKey}' contains duplicate incoming bundles.`);
    }
  }

  contains(bundle: TemplateCompilerNormalizedSiteBundle): boolean {
    return this.#sitesByBundle.has(bundle);
  }

  siteFor(bundle: TemplateCompilerNormalizedSiteBundle): TemplateCompilerNormalizedSiteLaneSite | null {
    return this.#sitesByBundle.get(bundle) ?? null;
  }

  readSites(): readonly TemplateCompilerNormalizedSiteLaneSite[] {
    return this.sites;
  }

  isOwnedBy(family: TemplateCompilerNormalizedSiteLaneFamily): boolean {
    return this.#familyAuthority === normalizedSiteLaneFamilyAuthority && this.family === family;
  }
}

/** One terminal declaration or bindable-metadata consumption in its owning invocation. */
export class TemplateCompilerNormalizedSiteLaneExclusion {
  constructor(
    authority: object,
    readonly site: TemplateCompilerNormalizedSiteLaneSite,
    readonly receipt: TemplateCompilerLocalSiteExclusionReceipt,
  ) {
    if (authority !== normalizedSiteLanePartitionAuthority || receipt.occurrence !== site.occurrence) {
      throw new Error('Normalized-site lane exclusions are partition-owned capabilities.');
    }
  }
}

/** One temporal parent-to-child transfer; nested transfer views deliberately overlap their ancestor input. */
export class TemplateCompilerNormalizedSiteLaneTransfer {
  constructor(
    authority: object,
    readonly ingress: TemplateCompilerExtractedNormalizedSiteIngress,
    readonly childView: TemplateCompilerNormalizedSiteLaneView,
  ) {
    if (
      authority !== normalizedSiteLanePartitionAuthority
      || ingress.childLane !== childView.lane
      || childView.ingress !== ingress
    ) {
      throw new Error('Normalized-site lane transfer lost its exact child ingress or lane.');
    }
  }

  get transfer(): TemplateCompilerExtractedInvocationTransfer {
    return this.ingress.transfer;
  }
}

/** Exact disposition of every incoming normalized bundle at one local-extraction boundary. */
export class TemplateCompilerNormalizedSiteLanePartition {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly incoming: TemplateCompilerNormalizedSiteLaneView,
    readonly closure: TemplateCompilerInvocationBootstrapClosure,
    readonly exclusionAuthority: TemplateCompilerLocalSiteExclusionAuthority,
    readonly terminalSites: readonly TemplateCompilerNormalizedSiteLaneSite[],
    readonly declarationExclusions: readonly TemplateCompilerNormalizedSiteLaneExclusion[],
    readonly bindableMetadataExclusions: readonly TemplateCompilerNormalizedSiteLaneExclusion[],
    readonly transfers: readonly TemplateCompilerNormalizedSiteLaneTransfer[],
  ) {
    const dispositions = [
      ...terminalSites.map((site) => site.bundle),
      ...declarationExclusions.map((exclusion) => exclusion.site.bundle),
      ...bindableMetadataExclusions.map((exclusion) => exclusion.site.bundle),
      ...transfers.flatMap((transfer) => transfer.childView.bundles),
    ];
    if (
      authority !== normalizedSiteLanePartitionAuthority
      || closure.lane !== incoming.lane
      || exclusionAuthority.closure !== closure
      || exclusionAuthority.execution !== incoming.family.binding.execution
      || dispositions.length !== incoming.bundles.length
      || new Set(dispositions).size !== dispositions.length
      || dispositions.some((bundle) => !incoming.contains(bundle))
    ) {
      throw new Error(`Normalized-site lane '${incoming.lane.localKey}' lost exact disposition conservation.`);
    }
    if (
      terminalSites.some((site) => exclusionAuthority.receiptFor(site.occurrence) != null)
      || declarationExclusions.some((exclusion) =>
        !exclusionAuthority.owns(exclusion.receipt)
        || exclusion.receipt.disposition !== TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
        || exclusion.receipt.destinationLane != null
      )
      || bindableMetadataExclusions.some((exclusion) =>
        !exclusionAuthority.owns(exclusion.receipt)
        || exclusion.receipt.disposition !== TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
        || exclusion.receipt.destinationLane != null
      )
      || transfers.length !== closure.childLaneTransfers.length
      || transfers.some((transfer, ordinal) => {
        const expected = closure.childLaneTransfers[ordinal];
        return expected == null
          || !transfer.ingress.isModuleConstructed()
          || transfer.transfer !== expected
          || transfer.ingress.parentView !== incoming
          || transfer.ingress.parentClosure !== closure
          || transfer.ingress.exclusionAuthority !== exclusionAuthority
          || !transfer.childView.isOwnedBy(incoming.family)
          || transfer.childView.sites.some((site) => {
            const receipt = exclusionAuthority.receiptFor(site.occurrence);
            return receipt == null
              || !exclusionAuthority.owns(receipt)
              || receipt.disposition !== TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation
              || receipt.destinationLane !== transfer.childView.lane
              || receipt.extraction !== expected.extraction;
          });
      })
    ) {
      throw new Error(`Normalized-site lane '${incoming.lane.localKey}' lost exact receipt disposition authority.`);
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === normalizedSiteLanePartitionAuthority;
  }
}

export class TemplateCompilerNormalizedSiteLaneFamilyResult {
  readonly state: TemplateCompilerNormalizedSiteLaneResultState;

  constructor(
    readonly family: TemplateCompilerNormalizedSiteLaneFamily | null,
    readonly reasons: readonly TemplateCompilerNormalizedSiteLaneReason[],
  ) {
    this.state = family == null
      ? TemplateCompilerNormalizedSiteLaneResultState.Open
      : TemplateCompilerNormalizedSiteLaneResultState.Exact;
  }
}

export class TemplateCompilerNormalizedSiteLanePartitionResult {
  readonly state: TemplateCompilerNormalizedSiteLaneResultState;

  constructor(
    readonly partition: TemplateCompilerNormalizedSiteLanePartition | null,
    readonly reasons: readonly TemplateCompilerNormalizedSiteLaneReason[],
    unavailableState:
      | TemplateCompilerNormalizedSiteLaneResultState.Open
      | TemplateCompilerNormalizedSiteLaneResultState.Mismatch = TemplateCompilerNormalizedSiteLaneResultState.Open,
  ) {
    this.state = partition == null
      ? unavailableState
      : TemplateCompilerNormalizedSiteLaneResultState.Exact;
  }
}

/** Candidate-owned family aggregate over one raw precedent and one live browser/execution forest. */
export class TemplateCompilerNormalizedSiteLaneFamily {
  readonly rootView: TemplateCompilerNormalizedSiteLaneView;
  readonly #bundlesByOccurrence: ReadonlyMap<TemplateCompilerSpendOccurrence, TemplateCompilerNormalizedSiteBundle>;

  constructor(
    authority: object,
    readonly binding: TemplateCompilerOccurrencePrecedentInvocationBinding,
    sites: readonly TemplateCompilerNormalizedSiteLaneSite[],
  ) {
    if (authority !== normalizedSiteLaneFamilyAuthority) {
      throw new Error('Normalized-site lane families are module-constructed capabilities.');
    }
    const sitesByBundle = new Map(sites.map((site) => [site.bundle, site]));
    this.#bundlesByOccurrence = new Map(sites.map((site) => [site.occurrence, site.bundle]));
    this.rootView = new TemplateCompilerNormalizedSiteLaneView(
      normalizedSiteLaneFamilyAuthority,
      this,
      binding.lane,
      binding.ingress,
      sites,
    );
    if (
      sitesByBundle.size !== sites.length
      || this.#bundlesByOccurrence.size !== sites.length
      || sites.length !== binding.index.attributeSites.length + binding.index.textSites.length
    ) {
      throw new Error('Normalized-site lane family lost singular raw bundle/seeded-occurrence ownership.');
    }
  }

  get precedent() {
    return this.binding.occurrencePrecedent;
  }

  get index() {
    return this.binding.index;
  }

  isCurrent(): boolean {
    return this.binding.isCurrent();
  }

  partition(
    incoming: TemplateCompilerNormalizedSiteLaneView,
    closure: TemplateCompilerInvocationBootstrapClosure,
    exclusionAuthority: TemplateCompilerLocalSiteExclusionAuthority,
  ): TemplateCompilerNormalizedSiteLanePartitionResult {
    if (
      !incoming.isOwnedBy(this)
      || closure.lane !== incoming.lane
      || exclusionAuthority.execution !== this.binding.execution
      || exclusionAuthority.closure !== closure
    ) {
      throw new Error('Normalized-site partition requires one family-owned view and exact lane exclusion snapshot.');
    }
    if (!this.isCurrent()) {
      return new TemplateCompilerNormalizedSiteLanePartitionResult(null, [new TemplateCompilerNormalizedSiteLaneReason(
        TemplateCompilerNormalizedSiteLaneReasonKind.CurrentnessLost,
        'Normalized-site lane family lost its app or browser publication currentness.',
        null,
      )]);
    }

    const outside = exclusionAuthority.readAll().find((receipt) => {
      const bundle = this.#bundlesByOccurrence.get(receipt.occurrence) ?? null;
      return bundle != null && !incoming.contains(bundle);
    }) ?? null;
    if (outside != null) {
      const bundle = this.#bundlesByOccurrence.get(outside.occurrence)!;
      return new TemplateCompilerNormalizedSiteLanePartitionResult(null, [new TemplateCompilerNormalizedSiteLaneReason(
        TemplateCompilerNormalizedSiteLaneReasonKind.ExclusionOutsideIncomingView,
        `Lane '${incoming.lane.localKey}' excluded a normalized bundle outside its incoming transfer view.`,
        bundle,
        [outside.occurrence],
      )], TemplateCompilerNormalizedSiteLaneResultState.Mismatch);
    }

    const terminalSites: TemplateCompilerNormalizedSiteLaneSite[] = [];
    const declarationExclusions: TemplateCompilerNormalizedSiteLaneExclusion[] = [];
    const bindableMetadataExclusions: TemplateCompilerNormalizedSiteLaneExclusion[] = [];
    const sitesByChildLane = new Map<TemplateCompilerExecutionLaneReference, TemplateCompilerNormalizedSiteLaneSite[]>();
    for (const transfer of closure.childLaneTransfers) sitesByChildLane.set(transfer.childLane, []);

    for (const site of incoming.readSites()) {
      const receipt = exclusionAuthority.receiptFor(site.occurrence);
      if (receipt == null) {
        terminalSites.push(site);
        continue;
      }
      if (!exclusionAuthority.owns(receipt)) {
        throw new Error(`Normalized-site exclusion for '${incoming.lane.localKey}' is not authority-owned.`);
      }
      switch (receipt.disposition) {
        case TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed:
          declarationExclusions.push(new TemplateCompilerNormalizedSiteLaneExclusion(
            normalizedSiteLanePartitionAuthority,
            site,
            receipt,
          ));
          break;
        case TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed:
          bindableMetadataExclusions.push(new TemplateCompilerNormalizedSiteLaneExclusion(
            normalizedSiteLanePartitionAuthority,
            site,
            receipt,
          ));
          break;
        case TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation: {
          const sites = receipt.destinationLane == null ? null : sitesByChildLane.get(receipt.destinationLane) ?? null;
          if (sites == null) {
            throw new Error(`Normalized-site transfer from '${incoming.lane.localKey}' lost its destination child lane.`);
          }
          sites.push(site);
          break;
        }
      }
    }

    const transfers = closure.childLaneTransfers.map((transfer) => {
      const ingress = new TemplateCompilerExtractedNormalizedSiteIngress(
        extractedNormalizedSiteIngressAuthority,
        incoming,
        closure,
        exclusionAuthority,
        transfer,
      );
      const childView = new TemplateCompilerNormalizedSiteLaneView(
        normalizedSiteLaneFamilyAuthority,
        this,
        transfer.childLane,
        ingress,
        sitesByChildLane.get(transfer.childLane)!,
      );
      return new TemplateCompilerNormalizedSiteLaneTransfer(
        normalizedSiteLanePartitionAuthority,
        ingress,
        childView,
      );
    });
    return new TemplateCompilerNormalizedSiteLanePartitionResult(
      new TemplateCompilerNormalizedSiteLanePartition(
        normalizedSiteLanePartitionAuthority,
        incoming,
        closure,
        exclusionAuthority,
        terminalSites,
        declarationExclusions,
        bindableMetadataExclusions,
        transfers,
      ),
      [],
    );
  }
}

/** Join the raw normalized index to canonical seeded occurrences; generated clones never receive authored membership. */
export function createTemplateCompilerNormalizedSiteLaneFamily(
  binding: TemplateCompilerOccurrencePrecedentInvocationBinding,
): TemplateCompilerNormalizedSiteLaneFamilyResult {
  if (!binding.isModuleConstructed()) {
    throw new Error('Normalized-site lane family requires one module-constructed occurrence-precedent binding.');
  }
  if (!binding.isCurrent()) {
    return new TemplateCompilerNormalizedSiteLaneFamilyResult(null, [new TemplateCompilerNormalizedSiteLaneReason(
      TemplateCompilerNormalizedSiteLaneReasonKind.CurrentnessLost,
      'Occurrence-precedent binding lost its app or browser publication currentness.',
      null,
    )]);
  }

  const candidates = new Map<TemplateCompilerNormalizedSiteBundle, TemplateCompilerSpendOccurrence[]>();
  for (const attribute of binding.forest.readAttributes()) {
    if (binding.forest.seededAttributePlacement(attribute) == null) continue;
    const origin = binding.forest.exactAuthoredAttributeOrigin(attribute);
    const bundle = origin == null ? null : binding.index.siteForAttribute(origin.authored.productHandle);
    if (bundle != null) appendMap(candidates, bundle, attribute);
  }
  for (const node of binding.forest.readNodes()) {
    if (!(node instanceof TemplateCompilerTextOccurrence) || binding.forest.seededNodePlacement(node) == null) continue;
    const origin = binding.forest.exactAuthoredNodeOrigin(node);
    const bundle = origin == null ? null : binding.index.siteForText(origin.authored.productHandle);
    if (bundle != null) appendMap(candidates, bundle, node);
  }

  const reasons: TemplateCompilerNormalizedSiteLaneReason[] = [];
  const sites: TemplateCompilerNormalizedSiteLaneSite[] = [];
  for (const bundle of [...binding.index.attributeSites, ...binding.index.textSites]) {
    const occurrences = candidates.get(bundle) ?? [];
    if (occurrences.length !== 1) {
      reasons.push(new TemplateCompilerNormalizedSiteLaneReason(
        occurrences.length === 0
          ? TemplateCompilerNormalizedSiteLaneReasonKind.CanonicalOccurrenceMissing
          : TemplateCompilerNormalizedSiteLaneReasonKind.CanonicalOccurrenceAmbiguous,
        occurrences.length === 0
          ? 'Raw normalized bundle has no singular canonical seeded browser occurrence.'
          : 'Raw normalized bundle has more than one canonical seeded browser occurrence.',
        bundle,
        occurrences,
      ));
      continue;
    }
    sites.push(new TemplateCompilerNormalizedSiteLaneSite(bundle, occurrences[0]!));
  }
  return reasons.length > 0
    ? new TemplateCompilerNormalizedSiteLaneFamilyResult(null, reasons)
    : new TemplateCompilerNormalizedSiteLaneFamilyResult(
        new TemplateCompilerNormalizedSiteLaneFamily(normalizedSiteLaneFamilyAuthority, binding, sites),
        [],
      );
}

function appendMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const values = map.get(key);
  if (values == null) map.set(key, [value]);
  else values.push(value);
}
