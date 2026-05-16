import ts from 'typescript';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim, nullableClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  RegistrationIdentity,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  diKeyIdentityRecord,
  type DiKeyIdentityRecord,
  type DiKeyIdentitySeed,
} from '../kernel/di-key-identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { sourceNodeOrdinalLocalKey } from '../kernel/local-key.js';
import {
  recordsForSourceOpenSeams,
} from '../kernel/source-open-seam.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import {
  type RegistrationAdmissionField,
  type RegistrationAdmissionProduct,
  RegistrationKeyRole,
  RegistrationStrategy,
  FrameworkRegistrationAdmission,
  isResolverRegistrationStrategy,
  OpenRegistrationAdmission,
  ParameterizedRegistryAdmission,
  ResourceRegistrationAdmission,
  RegistryRegistrationAdmission,
  ResolverRegistrationAdmission,
} from './registration-admission.js';
import {
  RegistrationAdmissionObservation,
  RegistrationKeyObservation,
  RegistrationKeyObservationKind,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from './registration-observation.js';
import {
  FrameworkRegistrationKind,
  RegistrationKeyReference,
  RegistrationValueKind,
  RegistrationValueReference,
} from './registration-reference.js';
import {
  isFrameworkRegistrationGroupKind,
} from './framework-registration-manifest.js';

export const enum RegistrationEmissionScope {
  /** Source-level registration recognition for inquiry or lower-level analysis. */
  SourceModule = 'source-module',
  /** Registration admission owned by a configuration step in an app-world sequence. */
  ConfigurationStep = 'configuration-step',
}

/** Inputs shared by registration emission for one evaluated source module. */
export class RegistrationEmissionContext {
  constructor(
    /** Parsed source file being inspected. */
    readonly sourceFile: ts.SourceFile,
    /** Module key used by the static evaluator and kernel local handles. */
    readonly moduleKey: string,
    /** Source-file address admitted by boot or host setup. */
    readonly sourceFileAddressHandle: AddressHandle,
    /** Emission scope that owns the emitted registration records. */
    readonly emissionScope: RegistrationEmissionScope = RegistrationEmissionScope.SourceModule,
    /** Scope-local owner key, such as a configuration step local key. */
    readonly ownerKey: string | null = null,
  ) {}

  get recordKeyPrefix(): string {
    return this.ownerKey == null
      ? `${this.moduleKey}:${this.emissionScope}`
      : `${this.moduleKey}:${this.emissionScope}:${this.ownerKey}`;
  }

  get batchLabel(): string {
    return `registration-admission:${this.recordKeyPrefix}`;
  }
}

/** Result of emitting registration observations into the kernel. */
export class RegistrationKernelEmission {
  constructor(
    /** Typed registration admissions produced for caller-owned product indexes. */
    readonly admissions: readonly RegistrationAdmissionProduct[],
    /** Kernel records committed for these admissions. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class RegistrationClaimTarget {
  constructor(
    readonly handle: AddressHandle | IdentityHandle | ProductHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class RegistrationClaimEmission {
  constructor(
    readonly records: readonly SemanticClaim[],
    readonly handles: readonly ClaimHandle[],
  ) {}
}

class RegistrationObservationSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly provenanceHandle: ProvenanceHandle,
    readonly declarationIdentityHandle: IdentityHandle | null = null,
  ) {}
}

class RegistrationKeyEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly reference: RegistrationKeyReference,
    readonly identityHandle: IdentityHandle | null,
    readonly provenanceHandle: ProvenanceHandle | null,
  ) {}
}

class RegistrationValueHandles {
  constructor(
    readonly addressHandle: AddressHandle,
    readonly evidenceHandle: ReturnType<KernelStore['handles']['evidence']>,
    readonly provenanceHandle: ProvenanceHandle,
    readonly identityHandle: IdentityHandle | null,
  ) {}
}

class RegistrationValueEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly reference: RegistrationValueReference | null,
    readonly claimTargetHandle: AddressHandle | IdentityHandle | ProductHandle | null,
    readonly provenanceHandle: ProvenanceHandle | null,
  ) {}
}

class RegistrationAdmissionProductEmission {
  constructor(
    readonly admission: RegistrationAdmissionProduct,
    readonly productKind: ProductKindKey,
  ) {}
}

interface RegistrationObservationProductHandles {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

interface RegistrationObservationProductEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly admission: RegistrationAdmissionProduct;
}

interface RegistrationOpenSeamEmissionSet {
  readonly records: readonly KernelStoreRecord[];
  readonly handles: readonly OpenSeamHandle[];
}

interface RegistrationRegistryParameterEmissionSet {
  readonly records: readonly KernelStoreRecord[];
  readonly references: readonly RegistrationValueReference[];
  readonly claimTargets: readonly RegistrationClaimTarget[];
  readonly provenanceHandles: readonly ProvenanceHandle[];
}

interface RegistrationObservationSupportSet {
  readonly records: readonly KernelStoreRecord[];
  readonly key: RegistrationKeyEmission;
  readonly value: RegistrationValueEmission;
  readonly registryParameters: RegistrationRegistryParameterEmissionSet;
  readonly seams: RegistrationOpenSeamEmissionSet;
}

class RegistrationAdmissionSupportMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(
    context: RegistrationEmissionContext,
    observation: RegistrationAdmissionObservation,
    local: string,
    source: RegistrationObservationSourceSet,
  ): RegistrationObservationSupportSet {
    const key = this.recordsForKey(context, observation.targetKey, local, source.addressHandle);
    const value = this.recordsForValue(context, observation.registeredValue, local);
    const registryParameters = this.recordsForRegistryParameters(context, observation.registryParameters, local);
    const seams = this.recordsForOpenSeams(
      context,
      openSeamsForObservation(observation),
      local,
    );
    return {
      records: [
        ...key.records,
        ...value.records,
        ...registryParameters.records,
        ...seams.records,
      ],
      key,
      value,
      registryParameters,
      seams,
    };
  }

  private recordsForKey(
    context: RegistrationEmissionContext,
    observation: RegistrationKeyObservation | null,
    local: string,
    admissionAddressHandle: AddressHandle,
  ): RegistrationKeyEmission {
    if (observation == null) {
      return this.absentRegistrationKey(admissionAddressHandle);
    }

    const source = this.recordsForKeySource(context, observation, local);
    const identityHandle = this.store.handles.identity(`registration-key:${local}`);
    return new RegistrationKeyEmission(
      [
        ...source.records,
        this.registrationKeyIdentity(identityHandle, observation, source),
      ],
      new RegistrationKeyReference(identityHandle, source.addressHandle, observation.localName),
      identityHandle,
      source.provenanceHandle,
    );
  }

  private absentRegistrationKey(admissionAddressHandle: AddressHandle): RegistrationKeyEmission {
    return new RegistrationKeyEmission(
      [],
      new RegistrationKeyReference(null, admissionAddressHandle, null),
      null,
      null,
    );
  }

  private recordsForKeySource(
    context: RegistrationEmissionContext,
    observation: RegistrationKeyObservation,
    local: string,
  ): RegistrationObservationSourceSet {
    const addressHandle = this.store.handles.address(`registration-key:${local}`);
    const evidenceHandle = this.store.handles.evidence(`registration-key:${local}`);
    const provenanceHandle = this.store.handles.provenance(`registration-key:${local}`);
    const declaration = this.recordsForConstructableKeyDeclaration(observation, local);
    return new RegistrationObservationSourceSet(
      [
        new SourceSpanAddress(
          addressHandle,
          context.sourceFileAddressHandle,
          observation.node.getStart(context.sourceFile),
          observation.node.end,
          SourceSpanRole.Value,
        ),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Registration],
          observation.observationKind === RegistrationKeyObservationKind.Constructable
            ? 'Registration target key expression classified as constructable.'
            : 'Registration target key expression.',
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
        ...declaration.records,
      ],
      addressHandle,
      provenanceHandle,
      declaration.identityHandle,
    );
  }

  private registrationKeyIdentity(
    identityHandle: IdentityHandle,
    observation: RegistrationKeyObservation,
    source: RegistrationObservationSourceSet,
  ): DiKeyIdentityRecord {
    return diKeyIdentityRecord(
      identityHandle,
      registrationKeyIdentitySeed(observation, source.declarationIdentityHandle),
      source.addressHandle,
      `Registration key expression still needs DI key classification: ${observation.localName ?? ts.SyntaxKind[observation.node.kind]}.`,
    );
  }

  private recordsForConstructableKeyDeclaration(
    observation: RegistrationKeyObservation,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly identityHandle: IdentityHandle | null;
  } {
    const constructable = observation.constructableSource;
    if (constructable == null) {
      return { records: [], identityHandle: null };
    }

    const declarationIdentityHandle = this.store.handles.identity(`registration-key:${local}:constructable-declaration`);
    const declarationAddress = constructable.sourceFileAddressHandle == null
      ? null
      : this.constructableDeclarationAddress(constructable.declaration, constructable.sourceFileAddressHandle, local);
    return {
      records: [
        ...(declarationAddress == null ? [] : [declarationAddress]),
        new TypeScriptDeclarationIdentity(
          declarationIdentityHandle,
          constructable.moduleKey,
          null,
          observation.localName ?? ts.getNameOfDeclaration(constructable.declaration)?.getText() ?? null,
          declarationAddress?.handle ?? null,
        ),
      ],
      identityHandle: declarationIdentityHandle,
    };
  }

  private constructableDeclarationAddress(
    declaration: ts.ClassLikeDeclaration | ts.FunctionLikeDeclaration,
    sourceFileAddressHandle: AddressHandle,
    local: string,
  ): SourceSpanAddress {
    const sourceFile = declaration.getSourceFile();
    const addressNode = ts.getNameOfDeclaration(declaration) ?? declaration;
    return new SourceSpanAddress(
      this.store.handles.address(`registration-key:${local}:constructable-declaration`),
      sourceFileAddressHandle,
      addressNode.getStart(sourceFile),
      addressNode.end,
      SourceSpanRole.Name,
    );
  }

  private recordsForValue(
    context: RegistrationEmissionContext,
    observation: RegistrationValueObservation | null,
    local: string,
  ): RegistrationValueEmission {
    if (observation == null) {
      return new RegistrationValueEmission([], null, null, null);
    }

    const handles = this.registrationValueHandles(observation, local);
    return new RegistrationValueEmission(
      this.recordsForValueSource(context, observation, handles),
      this.registrationValueReference(observation, handles),
      observation.productHandle ?? handles.identityHandle ?? handles.addressHandle,
      handles.provenanceHandle,
    );
  }

  private registrationValueHandles(
    observation: RegistrationValueObservation,
    local: string,
  ): RegistrationValueHandles {
    const valueLocal = `registration-value:${local}`;
    const identityHandle = observation.isDeclaration && observation.localName != null
      ? this.store.handles.identity(valueLocal)
      : null;
    return new RegistrationValueHandles(
      this.store.handles.address(valueLocal),
      this.store.handles.evidence(valueLocal),
      this.store.handles.provenance(valueLocal),
      identityHandle,
    );
  }

  private recordsForValueSource(
    context: RegistrationEmissionContext,
    observation: RegistrationValueObservation,
    handles: RegistrationValueHandles,
  ): readonly KernelStoreRecord[] {
    const sourceFile = observation.node.getSourceFile();
    const records: KernelStoreRecord[] = [
      new SourceSpanAddress(
        handles.addressHandle,
        observation.sourceFileAddressHandle ?? context.sourceFileAddressHandle,
        observation.node.getStart(sourceFile),
        observation.node.end,
        observation.isDeclaration ? SourceSpanRole.Name : SourceSpanRole.Value,
      ),
      new EvidenceRecord(
        handles.evidenceHandle,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Registration],
        `Registration value expression classified as ${observation.valueKind}.`,
        handles.addressHandle,
      ),
      new ProvenanceRecord(
        handles.provenanceHandle,
        [handles.evidenceHandle],
      ),
    ];
    const identity = this.registrationValueDeclarationIdentity(context, observation, handles);
    if (identity != null) {
      records.push(identity);
    }
    return records;
  }

  private registrationValueDeclarationIdentity(
    context: RegistrationEmissionContext,
    observation: RegistrationValueObservation,
    handles: RegistrationValueHandles,
  ): TypeScriptDeclarationIdentity | null {
    return handles.identityHandle == null
      ? null
      : new TypeScriptDeclarationIdentity(
        handles.identityHandle,
        observation.moduleKey ?? context.moduleKey,
        null,
        observation.localName,
        handles.addressHandle,
      );
  }

  private registrationValueReference(
    observation: RegistrationValueObservation,
    handles: RegistrationValueHandles,
  ): RegistrationValueReference {
    return new RegistrationValueReference(
      observation.valueKind,
      handles.identityHandle,
      observation.productHandle,
      handles.addressHandle,
      observation.localName,
      observation.frameworkKind,
      observation.registryBody,
    );
  }

  private recordsForRegistryParameters(
    context: RegistrationEmissionContext,
    observations: readonly RegistrationValueObservation[],
    local: string,
  ): RegistrationRegistryParameterEmissionSet {
    const records: KernelStoreRecord[] = [];
    const references: RegistrationValueReference[] = [];
    const claimTargets: RegistrationClaimTarget[] = [];
    const provenanceHandles: ProvenanceHandle[] = [];
    observations.forEach((observation, index) => {
      const value = this.recordsForValue(context, observation, `${local}:registry-param:${index}`);
      records.push(...value.records);
      if (value.reference != null) {
        references.push(value.reference);
      }
      if (value.claimTargetHandle != null && value.provenanceHandle != null) {
        claimTargets.push(new RegistrationClaimTarget(value.claimTargetHandle, value.provenanceHandle));
        provenanceHandles.push(value.provenanceHandle);
      }
    });
    return { records, references, claimTargets, provenanceHandles };
  }

  private recordsForOpenSeams(
    context: RegistrationEmissionContext,
    seams: readonly RegistrationRecognitionOpen[],
    local: string,
  ): RegistrationOpenSeamEmissionSet {
    return recordsForSourceOpenSeams(
      this.store,
      seams.map((seam, index) => ({
        localKey: `registration-open:${local}:${seam.openKind}:${index}`,
        openKind: seam.openKind,
        summary: seam.summary,
        sourceFileAddressHandle: context.sourceFileAddressHandle,
        start: seam.node.getStart(context.sourceFile),
        end: seam.node.end,
        evidenceRoles: [EvidenceRole.Diagnostic, EvidenceRole.Registration],
        includeProvenanceRecord: true,
      })),
    );
  }
}

/** Emits registration observations into the durable kernel graph. */
export class RegistrationKernelEmitter {
  private readonly supportMaterializer: RegistrationAdmissionSupportMaterializer;

  constructor(
    /** Hot analysis store that receives registration-admission records. */
    readonly store: KernelStore,
  ) {
    this.supportMaterializer = new RegistrationAdmissionSupportMaterializer(store);
  }

  emit(
    context: RegistrationEmissionContext,
    observations: readonly RegistrationAdmissionObservation[],
  ): RegistrationKernelEmission {
    const emission = this.materialize(context, observations);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, context.batchLabel));
    }
    return emission;
  }

  /** Materialize registration records without committing them, for larger caller-owned batches. */
  materialize(
    context: RegistrationEmissionContext,
    observations: readonly RegistrationAdmissionObservation[],
  ): RegistrationKernelEmission {
    const records: KernelStoreRecord[] = [];
    const admissions: RegistrationAdmissionProduct[] = [];
    observations.forEach((observation, index) => {
      const emission = this.recordsForObservation(context, observation, index);
      records.push(...emission.records);
      admissions.push(emission.admission);
    });
    return new RegistrationKernelEmission(admissions, records);
  }

  private recordsForObservation(
    context: RegistrationEmissionContext,
    observation: RegistrationAdmissionObservation,
    index: number,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly admission: RegistrationAdmissionProduct;
  } {
    const records: KernelStoreRecord[] = [];
    const local = sourceNodeOrdinalLocalKey({
      prefix: context.recordKeyPrefix,
      sourceFile: context.sourceFile,
      node: observation.sourceNode,
      index,
    });
    const source = this.recordsForObservationSource(context, observation, local);
    records.push(...source.records);

    const support = this.supportMaterializer.materialize(context, observation, local, source);
    records.push(...support.records);

    const admission = this.recordsForObservationProduct(observation, local, source, support);
    records.push(...admission.records);
    return { records, admission: admission.admission };
  }

  private recordsForObservationProduct(
    observation: RegistrationAdmissionObservation,
    local: string,
    source: RegistrationObservationSourceSet,
    support: RegistrationObservationSupportSet,
  ): RegistrationObservationProductEmission {
    const handles = this.registrationObservationProductHandles(local);
    const claims = this.claimsForObservationProduct(observation, local, handles.productHandle, source, support);
    const admission = this.admissionProductForObservation(
      observation,
      handles.productHandle,
      handles.identityHandle,
      source.addressHandle,
      registrationAdmissionFieldProvenance(support.key, support.value, support.registryParameters),
      support.key.reference,
      support.value.reference,
      support.registryParameters.references,
    );
    return this.registrationObservationProductEmission(local, handles, source, support, claims, admission);
  }

  private registrationObservationProductHandles(local: string): RegistrationObservationProductHandles {
    return {
      productHandle: this.store.handles.product(`registration-admission:${local}`),
      identityHandle: this.store.handles.identity(`registration-admission:${local}`),
    };
  }

  private claimsForObservationProduct(
    observation: RegistrationAdmissionObservation,
    local: string,
    productHandle: ProductHandle,
    source: RegistrationObservationSourceSet,
    support: RegistrationObservationSupportSet,
  ): RegistrationClaimEmission {
    return this.recordsForClaims(
      local,
      productHandle,
      observation.keyRole,
      support.key.identityHandle,
      support.key.provenanceHandle ?? source.provenanceHandle,
      support.value.claimTargetHandle,
      support.value.provenanceHandle,
      support.registryParameters.claimTargets,
    );
  }

  private registrationObservationProductEmission(
    local: string,
    handles: RegistrationObservationProductHandles,
    source: RegistrationObservationSourceSet,
    support: RegistrationObservationSupportSet,
    claims: RegistrationClaimEmission,
    admission: RegistrationAdmissionProductEmission,
  ): RegistrationObservationProductEmission {
    return {
      records: [
        this.registrationIdentityForObservation(handles.identityHandle, support.key.identityHandle, source),
        ...claims.records,
        ...this.recordsForAdmissionEnvelope(
          local,
          handles.productHandle,
          handles.identityHandle,
          admission.productKind,
          source,
          claims.handles,
          support.seams.handles,
        ),
      ],
      admission: admission.admission,
    };
  }

  private registrationIdentityForObservation(
    identityHandle: IdentityHandle,
    keyIdentityHandle: IdentityHandle | null,
    source: RegistrationObservationSourceSet,
  ): RegistrationIdentity {
    return new RegistrationIdentity(
      identityHandle,
      keyIdentityHandle,
      source.addressHandle,
    );
  }

  private recordsForAdmissionEnvelope(
    local: string,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    productKind: ProductKindKey,
    source: RegistrationObservationSourceSet,
    claimHandles: readonly ClaimHandle[],
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new MaterializedProduct(
        productHandle,
        productKind,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`registration-admission:${local}`),
        identityHandle,
        [productHandle],
        claimHandles,
        openSeamHandles,
      ),
    ];
  }

  private recordsForObservationSource(
    context: RegistrationEmissionContext,
    observation: RegistrationAdmissionObservation,
    local: string,
  ): RegistrationObservationSourceSet {
    const sourceAddressHandle = this.store.handles.address(`registration-source:${local}`);
    const sourceEvidenceHandle = this.store.handles.evidence(`registration-observation:${local}`);
    const sourceProvenanceHandle = this.store.handles.provenance(`registration-observation:${local}`);
    return new RegistrationObservationSourceSet(
      [
        new SourceSpanAddress(
          sourceAddressHandle,
          context.sourceFileAddressHandle,
          observation.sourceNode.getStart(context.sourceFile),
          observation.sourceNode.end,
          SourceSpanRole.Range,
        ),
        new EvidenceRecord(
          sourceEvidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Registration],
          `${observation.carrierKind} admitted a ${observation.strategy} registration.`,
          sourceAddressHandle,
        ),
        new ProvenanceRecord(
          sourceProvenanceHandle,
          [sourceEvidenceHandle],
        ),
      ],
      sourceAddressHandle,
      sourceProvenanceHandle,
    );
  }

  private admissionProductForObservation(
    observation: RegistrationAdmissionObservation,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    sourceAddressHandle: AddressHandle,
    fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[],
    key: RegistrationKeyReference,
    value: RegistrationValueReference | null,
    registryParameters: readonly RegistrationValueReference[],
  ): RegistrationAdmissionProductEmission {
    const frameworkKind = value?.frameworkKind ?? null;
    if (frameworkKind != null && isFrameworkRegistrationGroupKind(frameworkKind)) {
      return new RegistrationAdmissionProductEmission(
        new FrameworkRegistrationAdmission(
          productHandle,
          identityHandle,
          observation.admissionKind,
          frameworkKind,
          value,
          sourceAddressHandle,
          fieldProvenance,
        ),
        KernelVocabulary.Registration.FrameworkRegistrationAdmission.key,
      );
    }
    if (observation.keyRole === RegistrationKeyRole.RegistryLookupKey) {
      return new RegistrationAdmissionProductEmission(
        new ParameterizedRegistryAdmission(
          productHandle,
          identityHandle,
          observation.admissionKind,
          key,
          registryParameters,
          sourceAddressHandle,
          fieldProvenance,
        ),
        KernelVocabulary.Registration.ParameterizedRegistryAdmission.key,
      );
    }
    if (observation.strategy === RegistrationStrategy.Registry) {
      return new RegistrationAdmissionProductEmission(
        new RegistryRegistrationAdmission(
          productHandle,
          identityHandle,
          observation.admissionKind,
          value,
          sourceAddressHandle,
          fieldProvenance,
        ),
        KernelVocabulary.Registration.RegistryAdmission.key,
      );
    }
    if (observation.strategy === RegistrationStrategy.Resource && isResourceRegistrationReference(value)) {
      return new RegistrationAdmissionProductEmission(
        new ResourceRegistrationAdmission(
          productHandle,
          identityHandle,
          observation.admissionKind,
          value,
          sourceAddressHandle,
          fieldProvenance,
          observation.resourceLookupNameOverride,
        ),
        KernelVocabulary.Registration.ResourceAdmission.key,
      );
    }
    if (isResolverRegistrationStrategy(observation.strategy)) {
      return new RegistrationAdmissionProductEmission(
        new ResolverRegistrationAdmission(
          productHandle,
          identityHandle,
          observation.admissionKind,
          observation.strategy,
          observation.keyRole,
          key,
          value,
          sourceAddressHandle,
          fieldProvenance,
        ),
        KernelVocabulary.Registration.ResolverAdmission.key,
      );
    }
    return new RegistrationAdmissionProductEmission(
      new OpenRegistrationAdmission(
        productHandle,
        identityHandle,
        observation.admissionKind,
        observation.strategy,
        observation.keyRole,
        key,
        value,
        sourceAddressHandle,
        fieldProvenance,
      ),
      KernelVocabulary.Registration.OpenAdmission.key,
    );
  }

  private recordsForClaims(
    local: string,
    productHandle: ProductHandle,
    keyRole: RegistrationKeyRole,
    keyIdentityHandle: IdentityHandle | null,
    keyProvenanceHandle: ProvenanceHandle,
    valueTargetHandle: AddressHandle | IdentityHandle | ProductHandle | null,
    valueProvenanceHandle: ProvenanceHandle | null,
    additionalValueTargets: readonly RegistrationClaimTarget[] = [],
  ): RegistrationClaimEmission {
    const claims = [
      ...nullableClaim(this.admittedKeyClaim(local, productHandle, keyRole, keyIdentityHandle, keyProvenanceHandle)),
      ...nullableClaim(this.primaryValueClaim(local, productHandle, valueTargetHandle, valueProvenanceHandle)),
      ...this.additionalValueClaims(local, productHandle, additionalValueTargets),
    ];
    return new RegistrationClaimEmission(claims, claims.map((claim) => claim.handle));
  }

  private admittedKeyClaim(
    local: string,
    productHandle: ProductHandle,
    keyRole: RegistrationKeyRole,
    keyIdentityHandle: IdentityHandle | null,
    keyProvenanceHandle: ProvenanceHandle,
  ): SemanticClaim | null {
    return keyRole === RegistrationKeyRole.AdmittedKey && keyIdentityHandle != null
      ? new SemanticClaim(
        this.store.handles.claim(`registration-admits-key:${local}`),
        productHandle,
        KernelVocabulary.Registration.AdmitsKey.key,
        keyIdentityHandle,
        keyProvenanceHandle,
      )
      : null;
  }

  private primaryValueClaim(
    local: string,
    productHandle: ProductHandle,
    valueTargetHandle: AddressHandle | IdentityHandle | ProductHandle | null,
    valueProvenanceHandle: ProvenanceHandle | null,
  ): SemanticClaim | null {
    return valueTargetHandle != null && valueProvenanceHandle != null
      ? new SemanticClaim(
        this.store.handles.claim(`registration-uses-value:${local}`),
        productHandle,
        KernelVocabulary.Registration.UsesValue.key,
        valueTargetHandle,
        valueProvenanceHandle,
      )
      : null;
  }

  private additionalValueClaims(
    local: string,
    productHandle: ProductHandle,
    additionalValueTargets: readonly RegistrationClaimTarget[],
  ): readonly SemanticClaim[] {
    return additionalValueTargets.map((target, index) => new SemanticClaim(
      this.store.handles.claim(`registration-uses-value:${local}:additional:${index}`),
      productHandle,
      KernelVocabulary.Registration.UsesValue.key,
      target.handle,
      target.provenanceHandle,
    ));
  }

}

function openSeamsForObservation(
  observation: RegistrationAdmissionObservation,
): readonly RegistrationRecognitionOpen[] {
  const seams: RegistrationRecognitionOpen[] = [...observation.openSeams];
  if (
    observation.keyRole !== RegistrationKeyRole.Unknown
    && observation.strategy !== RegistrationStrategy.Registry
    && observation.targetKey == null
    && !hasRegistrationOpen(seams, KernelVocabulary.Registration.OpenKeyExpression.key)
  ) {
    seams.push(new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenKeyExpression.key,
      'Registration admission did not expose a closed target key.',
      observation.sourceNode,
    ));
  }
  if (
    observation.strategy === RegistrationStrategy.Unknown
    && !hasRegistrationOpen(seams, KernelVocabulary.Registration.OpenStrategy.key)
  ) {
    seams.push(new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenStrategy.key,
      'Registration admission did not expose a closed registration strategy.',
      observation.sourceNode,
    ));
  }
  return seams;
}

function registrationAdmissionFieldProvenance(
  key: { readonly provenanceHandle: ProvenanceHandle | null },
  value: { readonly provenanceHandle: ProvenanceHandle | null },
  registryParameters: { readonly provenanceHandles: readonly ProvenanceHandle[] },
): readonly FieldProvenance<RegistrationAdmissionField>[] {
  const registryParametersProvenanceHandle = registryParameters.provenanceHandles[0] ?? null;
  return compactFieldProvenance<RegistrationAdmissionField>([
    key.provenanceHandle == null ? null : new FieldProvenance('targetKey', key.provenanceHandle),
    value.provenanceHandle == null ? null : new FieldProvenance('registeredValue', value.provenanceHandle),
    registryParametersProvenanceHandle == null ? null : new FieldProvenance('registryParameters', registryParametersProvenanceHandle),
  ]);
}

function hasRegistrationOpen(
  seams: readonly RegistrationRecognitionOpen[],
  openKind: OpenSeamKindKey,
): boolean {
  return seams.some((seam) => seam.openKind === openKind);
}

function isResourceRegistrationReference(
  reference: RegistrationValueReference | null,
): reference is RegistrationValueReference {
  return reference?.valueKind === RegistrationValueKind.ResourceDefinition
    && reference.productHandle != null;
}

function stringLiteralValue(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function registrationKeyIdentitySeed(
  observation: RegistrationKeyObservation,
  constructableDeclarationHandle: IdentityHandle | null,
): DiKeyIdentitySeed {
  if (observation.observationKind === RegistrationKeyObservationKind.Constructable) {
    return {
      kind: 'constructable-key',
      candidateName: observation.localName,
      declarationHandle: constructableDeclarationHandle,
    };
  }
  const stringValue = stringLiteralValue(observation.node);
  if (stringValue != null) {
    return {
      kind: 'string-key',
      candidateName: stringValue,
    };
  }
  if (observation.localName != null) {
    return {
      kind: 'identifier-name',
      candidateName: observation.localName,
    };
  }
  return {
    kind: 'open-expression',
    candidateName: null,
  };
}
