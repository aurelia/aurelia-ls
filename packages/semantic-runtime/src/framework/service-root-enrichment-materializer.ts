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
import {
  DiKeyIdentityKind,
  type InterfaceDiKeyIdentity,
} from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import { MaterializationRecord } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
} from '../kernel/vocabulary.js';
import {
  FrameworkServiceRoot,
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
  ) {}

  materializeAndEmit(
    projectKey: string,
    roots: readonly FrameworkServiceRoot[],
  ): FrameworkServiceRootEnrichmentProjectResult {
    const keyIdentities = interfaceDiKeyIdentitiesByName(this.store);
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    for (const root of roots) {
      const enrichment = this.recordsForRoot(projectKey, root, keyIdentities);
      records.push(...enrichment.records);
      claimHandles.push(...enrichment.claimHandles);
    }
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `framework-service-root-enrichment:${projectKey}`));
    }
    return new FrameworkServiceRootEnrichmentProjectResult(records, claimHandles);
  }

  private recordsForRoot(
    projectKey: string,
    root: FrameworkServiceRoot,
    keyIdentities: ReadonlyMap<string, readonly InterfaceDiKeyIdentity[]>,
  ): FrameworkServiceRootEnrichmentProjectResult {
    const claimSpecs: ClaimSpec[] = [];
    if (frameworkServiceRootBasisResolvesDiKey(root.basis)) {
      for (const keyIdentity of keyIdentities.get(root.serviceKeyName) ?? []) {
        claimSpecs.push({
          localSuffix: `resolves-key:${localKeyPart(keyIdentity.handle)}`,
          predicateKey: KernelVocabulary.Framework.RootResolvesDiKey.key,
          objectHandle: keyIdentity.handle,
        });
      }
    }
    if (root.ownerProductHandle != null && this.store.readProduct(root.ownerProductHandle)?.productKindKey === KernelVocabulary.Framework.ServiceRoot.key) {
      claimSpecs.push({
        localSuffix: `uses-container-root:${localKeyPart(root.ownerProductHandle)}`,
        predicateKey: KernelVocabulary.Framework.RootUsesContainerRoot.key,
        objectHandle: root.ownerProductHandle,
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

function interfaceDiKeyIdentitiesByName(
  store: KernelStore,
): ReadonlyMap<string, readonly InterfaceDiKeyIdentity[]> {
  const result = new Map<string, InterfaceDiKeyIdentity[]>();
  for (const identity of store.readIdentities()) {
    if (
      identity.kind !== 'di-key-identity'
      || identity.keyKind !== DiKeyIdentityKind.Interface
    ) {
      continue;
    }
    const existing = result.get(identity.interfaceName);
    if (existing == null) {
      result.set(identity.interfaceName, [identity]);
    } else {
      existing.push(identity);
    }
  }
  return result;
}
