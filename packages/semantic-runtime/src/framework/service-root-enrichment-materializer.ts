import {
  SemanticClaim,
  type ClaimEndpointHandle,
} from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  ClaimHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import { MaterializationRecord } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
} from '../kernel/vocabulary.js';
import { sourceSpanAddressForAddress } from '../kernel/source-address.js';
import { readDiContainerChainFacts, type DiContainerChainFacts } from '../di/container-chain.js';
import {
  FrameworkServiceRoot,
  FrameworkServiceRootBasis,
  FrameworkServiceRootKind,
  frameworkServiceRootBasisResolvesDiKey,
} from './service-root.js';

export class FrameworkServiceRootEnrichmentProjectResult {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly claimHandles: readonly ClaimHandle[],
  ) {}
}

/** Adds post-DI-world claim edges for source-backed framework service-root products. */
export class FrameworkServiceRootEnrichmentMaterializer {
  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {}

  materializeAndEmit(
    projectKey: string,
    roots: readonly FrameworkServiceRoot[],
  ): FrameworkServiceRootEnrichmentProjectResult {
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    const containerFacts = readDiContainerChainFacts(this.publication);
    for (const root of roots) {
      const enrichment = this.recordsForRoot(projectKey, root, containerFacts);
      records.push(...enrichment.records);
      claimHandles.push(...enrichment.claimHandles);
    }
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `framework-service-root-enrichment:${projectKey}`),
    ));
    return new FrameworkServiceRootEnrichmentProjectResult(records, claimHandles);
  }

  private recordsForRoot(
    projectKey: string,
    root: FrameworkServiceRoot,
    containerFacts: DiContainerChainFacts,
  ): FrameworkServiceRootEnrichmentProjectResult {
    const claimSpecs: ClaimSpec[] = [];
    if (frameworkServiceRootBasisResolvesDiKey(root.basis) && root.serviceKeyIdentityHandle != null) {
      claimSpecs.push({
        localSuffix: `resolves-key:${localKeyPart(root.serviceKeyIdentityHandle)}`,
        predicateKey: KernelVocabulary.Framework.RootResolvesDiKey.key,
        objectHandle: root.serviceKeyIdentityHandle,
      });
    }
    if (
      root.rootKind === FrameworkServiceRootKind.Container
      && root.basis === FrameworkServiceRootBasis.DirectConstructor
    ) {
      const source = sourceSpanAddressForAddress(this.publication, root.evidenceSourceAddressHandle);
      const containerProductHandle = source == null
        ? null
        : containerFacts.containerProductHandleForSourceSpan(source.fileHandle, source.start, source.end);
      if (containerProductHandle != null) {
        claimSpecs.push({
          localSuffix: `denotes-container:${localKeyPart(containerProductHandle)}`,
          predicateKey: KernelVocabulary.Framework.ContainerRootDenotesContainer.key,
          objectHandle: containerProductHandle,
        });
      }
    }
    const ownerProductHandle = root.ownerProductHandle;
    const ownerProduct = ownerProductHandle == null
      ? null
      : this.publication.read(ownerProductHandle);
    if (
      ownerProduct?.kind === 'materialized-product'
      && ownerProduct.productKindKey === KernelVocabulary.Framework.ServiceRoot.key
    ) {
      claimSpecs.push({
        localSuffix: `uses-container-root:${localKeyPart(ownerProduct.handle)}`,
        predicateKey: KernelVocabulary.Framework.RootUsesContainerRoot.key,
        objectHandle: ownerProduct.handle,
      });
    }
    if (claimSpecs.length === 0) {
      return new FrameworkServiceRootEnrichmentProjectResult([], []);
    }

    const local = [
      'framework-service-root-enrichment',
      localKeyPart(projectKey),
      localKeyPart(root.productHandle),
    ].join(':');
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const claims = claimSpecs.map((claim) =>
      new SemanticClaim(
        this.store.handles.claim(`${local}:${claim.localSuffix}`),
        root.productHandle,
        claim.predicateKey,
        claim.objectHandle,
        provenanceHandle,
      )
    );
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Diagnostic, EvidenceRole.Registration],
        `Framework service-root ${root.serviceKeyName} was joined to post-app-world DI identity evidence.`,
        root.sourceAddressHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      ...claims,
      new MaterializationRecord(
        this.store.handles.materialization(local),
        root.identityHandle,
        [root.productHandle],
        claims.map((claim) => claim.handle),
      ),
    ];
    return new FrameworkServiceRootEnrichmentProjectResult(
      records,
      claims.map((claim) => claim.handle),
    );
  }
}

interface ClaimSpec {
  readonly localSuffix: string;
  readonly predicateKey: ClaimPredicateKey;
  readonly objectHandle: ClaimEndpointHandle;
}
