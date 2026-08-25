import ts from 'typescript';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  EvidenceHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ConfigurationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  ConfigurationRecognitionOpen,
} from './configuration-observation.js';

interface ConfigurationStepClaimSeed {
  readonly productHandle: ProductHandle;
}

export class ConfigurationSourceRecordSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

interface ConfigurationSourceRecordHandles {
  readonly addressHandle: AddressHandle;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
}

interface ConfigurationProductRecordSpec {
  readonly local: string;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly productKindKey: ProductKindKey;
  readonly ownerHandle: IdentityHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly provenanceHandle: ProvenanceHandle;
  readonly localName: string | null;
  readonly claimHandles: readonly ClaimHandle[];
  readonly openSeamHandles: readonly OpenSeamHandle[];
}

export class ConfigurationClaimSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handles: readonly ClaimHandle[],
  ) {}
}

export class ConfigurationStepClaimSet extends ConfigurationClaimSet {
  constructor(
    records: readonly KernelStoreRecord[],
    handles: readonly ClaimHandle[],
    readonly targetClaimHandle: ClaimHandle | null,
    readonly producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ) {
    super(records, handles);
  }

  producerClaimHandleFor(productHandle: ProductHandle): ClaimHandle {
    const handle = this.producerClaimHandlesByProduct.get(productHandle);
    if (handle == null) {
      throw new Error(`Configuration output ${productHandle} has no exact producer claim.`);
    }
    return handle;
  }
}

export class ConfigurationProductHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

export interface ConfigurationOpenSeamEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly handle: OpenSeamHandle;
  readonly seam: OpenSeam;
}

/** Read claims that directly explain one produced configuration product. */
export function claimHandlesForConfigurationProduct(
  records: readonly KernelStoreRecord[],
  productHandle: ProductHandle,
): readonly ClaimHandle[] {
  return records
    .filter((record): record is SemanticClaim => record.kind === 'semantic-claim')
    .filter((claim) => claim.subjectHandle === productHandle || claim.objectHandle === productHandle)
    .map((claim) => claim.handle);
}

/** Shared record-publication primitives for configuration products and source evidence. */
export class ConfigurationKernelPublication {
  constructor(
    readonly store: KernelStore,
  ) {}

  recordsForSource(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    local: string,
    evidenceKind: EvidenceKind,
    evidenceRoles: readonly EvidenceRole[],
    evidenceSummary: string,
    spanRole: SourceSpanRole,
  ): ConfigurationSourceRecordSet {
    const handles = this.sourceRecordHandles(local);
    return new ConfigurationSourceRecordSet(
      this.sourceRecords(context, node, handles, evidenceKind, evidenceRoles, evidenceSummary, spanRole),
      handles.addressHandle,
      handles.evidenceHandle,
      handles.provenanceHandle,
    );
  }

  configurationProductHandles(local: string): ConfigurationProductHandles {
    return new ConfigurationProductHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  configurationProductRecords(
    spec: ConfigurationProductRecordSpec,
  ): readonly KernelStoreRecord[] {
    return [
      new ConfigurationIdentity(
        spec.identityHandle,
        spec.productKindKey,
        spec.ownerHandle,
        spec.sourceAddressHandle,
        spec.localName,
      ),
      new MaterializedProduct(
        spec.productHandle,
        spec.productKindKey,
        spec.identityHandle,
        spec.sourceAddressHandle,
        spec.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(spec.local),
        spec.identityHandle,
        [spec.productHandle],
        spec.claimHandles,
        spec.openSeamHandles,
      ),
    ];
  }

  recordsForOpenSeams(
    context: ConfigurationRecognitionContext,
    seams: readonly ConfigurationRecognitionOpen[],
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly OpenSeamHandle[];
    readonly seams: readonly OpenSeam[];
  } {
    const emissions = seams.map((seam, index) =>
      this.recordsForOpenSeam(context, seam, `${local}:open:${index}`)
    );
    return {
      records: emissions.flatMap((emission) => emission.records),
      handles: emissions.map((emission) => emission.handle),
      seams: emissions.map((emission) => emission.seam),
    };
  }

  recordsForAureliaOwnsContainerClaim(
    local: string,
    aureliaProductHandle: ProductHandle,
    containerProductHandle: ProductHandle,
    provenanceHandle: ProvenanceHandle,
  ): ConfigurationClaimSet {
    const ownsContainerHandle = this.store.handles.claim(`configuration-aurelia-owns-container:${local}`);
    return new ConfigurationClaimSet(
      [new SemanticClaim(
        ownsContainerHandle,
        aureliaProductHandle,
        KernelVocabulary.Configuration.OwnsContainer.key,
        containerProductHandle,
        provenanceHandle,
      )],
      [ownsContainerHandle],
    );
  }

  recordsForAureliaHasAppRootClaim(
    local: string,
    aureliaProductHandle: ProductHandle,
    appRootProductHandle: ProductHandle,
    provenanceHandle: ProvenanceHandle,
  ): ConfigurationClaimSet {
    const hasAppRootHandle = this.store.handles.claim(`configuration-aurelia-has-app-root:${local}`);
    return new ConfigurationClaimSet(
      [new SemanticClaim(
        hasAppRootHandle,
        aureliaProductHandle,
        KernelVocabulary.Configuration.HasAppRoot.key,
        appRootProductHandle,
        provenanceHandle,
      )],
      [hasAppRootHandle],
    );
  }

  recordsForSequenceClaims(
    local: string,
    sequenceProductHandle: ProductHandle,
    steps: readonly ConfigurationStepClaimSeed[],
    provenanceHandle: ProvenanceHandle,
  ): ConfigurationClaimSet {
    const records: KernelStoreRecord[] = [];
    const handles: ClaimHandle[] = [];
    steps.forEach((step, index) => {
      const claimHandle = this.store.handles.claim(`configuration-sequence-contains-step:${local}:${index}`);
      handles.push(claimHandle);
      records.push(new SemanticClaim(
        claimHandle,
        sequenceProductHandle,
        KernelVocabulary.Configuration.ContainsStep.key,
        step.productHandle,
        provenanceHandle,
      ));
    });
    return new ConfigurationClaimSet(records, handles);
  }

  recordsForStepClaims(
    local: string,
    stepProductHandle: ProductHandle,
    targetProductHandle: ProductHandle | null,
    producedProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): ConfigurationStepClaimSet {
    const targetClaim = targetProductHandle == null
      ? new ConfigurationClaimSet([], [])
      : this.recordsForStepOutputClaims(
          [targetProductHandle],
          () => this.store.handles.claim(`configuration-step-targets-product:${local}`),
          stepProductHandle,
          KernelVocabulary.Configuration.TargetsProduct.key,
          provenanceHandle,
        );
    const productClaims = this.recordsForStepProductClaims(local, stepProductHandle, producedProductHandles, provenanceHandle);
    return new ConfigurationStepClaimSet(
      [...targetClaim.records, ...productClaims.records],
      [...targetClaim.handles, ...productClaims.handles],
      targetClaim.handles[0] ?? null,
      new Map(producedProductHandles.map((productHandle, index) => [productHandle, productClaims.handles[index]!])),
    );
  }

  private recordsForOpenSeam(
    context: ConfigurationRecognitionContext,
    seam: ConfigurationRecognitionOpen,
    local: string,
  ): ConfigurationOpenSeamEmission {
    const source = this.recordsForSource(
      context,
      seam.node,
      local,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
      seam.summary,
      SourceSpanRole.Range,
    );
    const openSeamHandle = this.store.handles.openSeam(local);
    const openSeam = new OpenSeam(
      openSeamHandle,
      seam.openKind,
      seam.summary,
      source.addressHandle,
      source.evidenceHandle,
      seam.reasonKinds,
    );
    return {
      records: [
        ...source.records,
        openSeam,
      ],
      handle: openSeamHandle,
      seam: openSeam,
    };
  }

  private sourceRecordHandles(local: string): ConfigurationSourceRecordHandles {
    return {
      addressHandle: this.store.handles.address(`${local}:source`),
      evidenceHandle: this.store.handles.evidence(local),
      provenanceHandle: this.store.handles.provenance(local),
    };
  }

  private sourceRecords(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    handles: ConfigurationSourceRecordHandles,
    evidenceKind: EvidenceKind,
    evidenceRoles: readonly EvidenceRole[],
    evidenceSummary: string,
    spanRole: SourceSpanRole,
  ): readonly KernelStoreRecord[] {
    const sourceFile = node.getSourceFile();
    const sourceFileAddressHandle = context.sourceFileAddressHandleForNode(node);
    if (sourceFileAddressHandle == null) {
      throw new Error(`Configuration evidence references a source outside the admitted project: ${sourceFile.fileName}`);
    }
    return [
      new SourceSpanAddress(
        handles.addressHandle,
        sourceFileAddressHandle,
        node.getStart(sourceFile),
        node.end,
        spanRole,
      ),
      new EvidenceRecord(
        handles.evidenceHandle,
        evidenceKind,
        evidenceRoles,
        evidenceSummary,
        handles.addressHandle,
      ),
      new ProvenanceRecord(handles.provenanceHandle, [handles.evidenceHandle]),
    ];
  }

  private recordsForStepProductClaims(
    local: string,
    stepProductHandle: ProductHandle,
    producedProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): ConfigurationClaimSet {
    return this.recordsForStepOutputClaims(
      producedProductHandles,
      (index) => this.stepProductClaimHandle(local, index),
      stepProductHandle,
      KernelVocabulary.Configuration.ProducesProduct.key,
      provenanceHandle,
    );
  }

  recordsForStepRegistrationClaims(
    local: string,
    stepProductHandle: ProductHandle,
    registrationProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): ConfigurationClaimSet {
    return this.recordsForStepOutputClaims(
      registrationProductHandles,
      (index) => this.store.handles.claim(`configuration-step-admits-registration:${local}:${index}`),
      stepProductHandle,
      KernelVocabulary.Configuration.AdmitsRegistration.key,
      provenanceHandle,
    );
  }

  private recordsForStepOutputClaims(
    productHandles: readonly ProductHandle[],
    claimHandleForIndex: (index: number) => ClaimHandle,
    stepProductHandle: ProductHandle,
    claimKind: ClaimPredicateKey,
    provenanceHandle: ProvenanceHandle,
  ): ConfigurationClaimSet {
    const records: KernelStoreRecord[] = [];
    const handles: ClaimHandle[] = [];
    productHandles.forEach((productHandle, index) => {
      const claimHandle = claimHandleForIndex(index);
      handles.push(claimHandle);
      records.push(new SemanticClaim(
        claimHandle,
        stepProductHandle,
        claimKind,
        productHandle,
        provenanceHandle,
      ));
    });
    return new ConfigurationClaimSet(records, handles);
  }

  private stepProductClaimHandle(local: string, index: number): ClaimHandle {
    return this.store.handles.claim(`configuration-step-produces-product:${local}:${index}`);
  }
}
