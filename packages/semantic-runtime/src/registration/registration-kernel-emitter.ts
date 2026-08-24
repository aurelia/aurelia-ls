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
  type DiKeyIdentityKind,
  RegistrationIdentity,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import {
  aggregateFieldProvenance,
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
  EvaluatedRegistrationCarrier,
  RegistrationCarrierKind,
  RegistrationKeyObservationKind,
  RegistrationRecognitionOpen,
  type RegistrationAdmissionObservation,
  type RegistrationKeyObservation,
  type RegistrationValueObservation,
} from './registration-observation.js';
import {
  RegistrationKeyReference,
  RegistrationValueKind,
  RegistrationValueReference,
} from './registration-reference.js';
import {
  DiKeyExpressionIdentityRequest,
  type DiKeyIdentityEmission,
  DiKeyIdentityEmitter,
} from '../di/di-key-identity-emitter.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  sourceSpanForCheckerDeclaration,
  type DeclarationSourcePublication,
} from '../type-system/declaration-source.js';

export const enum RegistrationEmissionScope {
  /** Source-level registration recognition for inquiry or lower-level analysis. */
  SourceModule = 'source-module',
  /** Registration admission owned by a configuration step in an app-world sequence. */
  ConfigurationStep = 'configuration-step',
  /** Conditional registration admission owned by a reached DI registration operation. */
  DiRegistrationOperation = 'di-registration-operation',
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
    /** Exact source-file address for every admitted node used by this emission. */
    private readonly sourceFileAddressHandleForNode_: (node: ts.Node) => AddressHandle | null,
    /** Project identity used to scope primitive DI keys in a shared kernel store. */
    readonly projectKey: string | null,
    /** Shared TypeChecker epoch used to canonicalize imported and reexported key declarations. */
    readonly typeSystem: TypeSystemProject | null,
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

  sourceFileAddressHandleForNode(node: ts.Node): AddressHandle {
    const handle = this.sourceFileAddressHandleForNode_(node);
    if (handle != null) {
      return handle;
    }
    if (node.getSourceFile() === this.sourceFile) {
      return this.sourceFileAddressHandle;
    }
    throw new Error('Registration emission cannot attach a foreign node to the caller source-file address.');
  }
}

/** Result of emitting registration observations into the kernel. */
export class RegistrationKernelEmission {
  constructor(
    /** Typed registration admissions produced for caller-owned product indexes. */
    readonly admissions: readonly RegistrationAdmissionProduct[],
    /** Kernel records committed for these admissions. */
    readonly records: readonly KernelStoreRecord[],
    /** Candidate-local evaluator values and their exact source occurrences, indexed by emitted admission product. */
    readonly evaluatedCarriersByAdmissionProduct: ReadonlyMap<ProductHandle, EvaluatedRegistrationCarrier>,
    /** Exact source carrier nodes retained for candidate-local occurrence joins. */
    readonly sourceNodesByAdmissionProduct: ReadonlyMap<ProductHandle, ts.Node>,
    /** Exact source nodes for the runtime values offered by each admission. */
    readonly runtimeValueSourceNodesByAdmissionProduct: ReadonlyMap<ProductHandle, ts.Node>,
    /** Admission-local recognition pressure retained without reconstructing materialization envelopes. */
    readonly openSeamsByAdmissionProduct: ReadonlyMap<ProductHandle, readonly OpenSeam[]>,
  ) {}
}

/**
 * Kernel support for one reached runtime registration value without publishing another source-admission product.
 * DI uses this when candidate-local evaluator evidence closes a generic source admission.
 */
export class RegistrationValueSupportEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly sourceAddressHandle: AddressHandle,
    readonly sourceProvenanceHandle: ProvenanceHandle,
    readonly key: RegistrationKeyReference,
    readonly value: RegistrationValueReference | null,
    readonly registryParameters: readonly RegistrationValueReference[],
    readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[],
    readonly openSeams: readonly OpenSeam[],
  ) {}
}

/** Candidate-local admission shape refined from stronger evaluator evidence. */
export class RegistrationAdmissionRefinementEmission {
  constructor(
    readonly support: RegistrationValueSupportEmission,
    /** Operation-local view retaining the source admission's durable product and identity handles. */
    readonly admission: RegistrationAdmissionProduct,
  ) {}

  get records(): readonly KernelStoreRecord[] {
    return this.support.records;
  }

  get openSeams(): readonly OpenSeam[] {
    return this.support.openSeams;
  }
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
  readonly fieldProvenance: FieldProvenance<RegistrationAdmissionField> | null;
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
    private readonly publication: KernelPublicationContext,
    private readonly keyIdentityEmitter: DiKeyIdentityEmitter,
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
    const records = [...source.records];
    const identity = this.keyIdentityEmitter.emitExpressionKeyIdentity(
      records,
      this.publication,
      new DiKeyExpressionIdentityRequest(
        context.projectKey,
        observation.node,
        observation.localName,
        observation.evaluatedValue,
        observation.constructableSource,
        context.typeSystem,
        this.store.handles.identity(`registration-key:${local}`),
        source.addressHandle,
      ),
    );
    return new RegistrationKeyEmission(
      records,
      new RegistrationKeyReference(
        identity.identityHandle,
        source.addressHandle,
        observation.localName,
        identity.keyKind,
      ),
      identity.identityHandle,
      source.provenanceHandle,
    );
  }

  private absentRegistrationKey(admissionAddressHandle: AddressHandle): RegistrationKeyEmission {
    return new RegistrationKeyEmission(
      [],
      new RegistrationKeyReference(null, admissionAddressHandle, null, null),
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
    const sourceFile = observation.node.getSourceFile();
    return new RegistrationObservationSourceSet(
      [
        new SourceSpanAddress(
          addressHandle,
          observation.sourceFileAddressHandle ?? context.sourceFileAddressHandleForNode(observation.node),
          observation.node.getStart(sourceFile),
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
      ],
      addressHandle,
      provenanceHandle,
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
    const records = [...this.recordsForValueSource(context, observation, handles)];
    const declarationSource = this.registrationValueDeclarationSource(context, observation);
    this.keyIdentityEmitter.emitDeclarationSourceRecords(records, declarationSource);
    const keyIdentity = observation.keyObservation == null
      ? null
      : this.keyIdentityEmitter.emitExpressionKeyIdentity(
          records,
          this.publication,
          new DiKeyExpressionIdentityRequest(
            context.projectKey,
            observation.keyObservation.node,
            observation.keyObservation.localName,
            observation.keyObservation.evaluatedValue,
            observation.keyObservation.constructableSource,
            context.typeSystem,
            this.store.handles.identity(`registration-value:${local}:key`),
            handles.addressHandle,
          ),
        );
    const fallbackIdentity = declarationSource == null
      ? this.registrationValueDeclarationIdentity(context, observation, handles)
      : null;
    if (fallbackIdentity != null) {
      records.push(fallbackIdentity);
    }
    const identityHandle = keyIdentity?.identityHandle
      ?? declarationSource?.identity.handle
      ?? fallbackIdentity?.handle
      ?? null;
    return new RegistrationValueEmission(
      records,
      this.registrationValueReference(observation, handles, identityHandle, keyIdentity?.keyKind ?? null),
      observation.productHandle ?? identityHandle ?? handles.addressHandle,
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
        observation.sourceFileAddressHandle ?? context.sourceFileAddressHandleForNode(observation.node),
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
    return records;
  }

  private registrationValueDeclarationSource(
    context: RegistrationEmissionContext,
    observation: RegistrationValueObservation,
  ): DeclarationSourcePublication | null {
    if (context.typeSystem == null || observation.valueKind === RegistrationValueKind.AliasTarget) {
      return null;
    }
    const symbol = context.typeSystem.readProgramAliasedSymbolAtLocation(
      registrationValueSymbolSite(observation.node),
    );
    if (symbol == null) {
      return null;
    }
    const declarations = symbol.declarations ?? (symbol.valueDeclaration == null ? [] : [symbol.valueDeclaration]);
    return sourceSpanForCheckerDeclaration(
      this.publication,
      context.typeSystem.checker,
      symbol,
      declarations,
      SourceSpanRole.Name,
    );
  }

  private registrationValueDeclarationIdentity(
    context: RegistrationEmissionContext,
    observation: RegistrationValueObservation,
    handles: RegistrationValueHandles,
  ): TypeScriptDeclarationIdentity | null {
    const moduleKey = observation.moduleKey
      ?? (observation.sourceFileAddressHandle == null
        || observation.sourceFileAddressHandle === context.sourceFileAddressHandle
        ? context.moduleKey
        : null);
    return handles.identityHandle == null || moduleKey == null
      ? null
      : new TypeScriptDeclarationIdentity(
        handles.identityHandle,
        moduleKey,
        null,
        observation.localName,
        handles.addressHandle,
      );
  }

  private registrationValueReference(
    observation: RegistrationValueObservation,
    handles: RegistrationValueHandles,
    identityHandle: IdentityHandle | null,
    keyKind: DiKeyIdentityKind | null,
  ): RegistrationValueReference {
    return new RegistrationValueReference(
      observation.valueKind,
      identityHandle,
      observation.productHandle,
      handles.addressHandle,
      observation.localName,
      observation.frameworkKind,
      observation.registryBody,
      keyKind,
      observation.resourceLookupKeys,
      observation.resourceKind,
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
      if (value.provenanceHandle != null) {
        provenanceHandles.push(value.provenanceHandle);
      }
      if (value.claimTargetHandle != null && value.provenanceHandle != null) {
        claimTargets.push(new RegistrationClaimTarget(value.claimTargetHandle, value.provenanceHandle));
      }
    });
    const provenanceByHandle = new Map<ProvenanceHandle, ProvenanceRecord>(
      records.flatMap((record) => record instanceof ProvenanceRecord
        ? [[record.handle, record] as const]
        : []),
    );
    const aggregate = aggregateFieldProvenance<RegistrationAdmissionField>(
      'registryParameters',
      provenanceHandles,
      this.store.handles.provenance(`registration-registry-parameters:${local}`),
      (handle) => {
        const localRecord = provenanceByHandle.get(handle);
        if (localRecord != null) {
          return localRecord;
        }
        const published = this.publication.read(handle);
        return published instanceof ProvenanceRecord ? published : null;
      },
    );
    records.push(...aggregate.records);
    return {
      records,
      references,
      claimTargets,
      fieldProvenance: aggregate.fieldProvenance,
    };
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
        sourceFileAddressHandle: context.sourceFileAddressHandleForNode(seam.node),
        start: seam.node.getStart(seam.node.getSourceFile()),
        end: seam.node.end,
        evidenceRoles: [EvidenceRole.Diagnostic, EvidenceRole.Registration],
        reasonKinds: seam.reasonKinds.length === 0
          ? registrationOpenSeamReasonKinds(seam.openKind)
          : seam.reasonKinds,
      })),
    );
  }
}

/** Emits registration observations into the durable kernel graph. */
export class RegistrationKernelEmitter {
  private readonly supportMaterializer: RegistrationAdmissionSupportMaterializer;
  private readonly keyIdentityEmitter: DiKeyIdentityEmitter;

  constructor(
    /** Hot analysis store that receives registration-admission records. */
    readonly store: KernelStore,
    /** Candidate-aware publication used to reuse canonical declaration and key records. */
    readonly publication: KernelPublicationContext,
  ) {
    this.keyIdentityEmitter = new DiKeyIdentityEmitter(publication);
    this.supportMaterializer = new RegistrationAdmissionSupportMaterializer(
      store,
      publication,
      this.keyIdentityEmitter,
    );
  }

  /** Normalize a non-registration carrier, such as AppTask, through the same canonical DI-key corridor. */
  materializeKeyIdentity(
    records: KernelStoreRecord[],
    request: DiKeyExpressionIdentityRequest,
  ): DiKeyIdentityEmission {
    return this.keyIdentityEmitter.emitExpressionKeyIdentity(records, this.publication, request);
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
    const evaluatedCarriersByAdmissionProduct = new Map<ProductHandle, EvaluatedRegistrationCarrier>();
    const sourceNodesByAdmissionProduct = new Map<ProductHandle, ts.Node>();
    const runtimeValueSourceNodesByAdmissionProduct = new Map<ProductHandle, ts.Node>();
    const openSeamsByAdmissionProduct = new Map<ProductHandle, readonly OpenSeam[]>();
    observations.forEach((observation, index) => {
      const emission = this.recordsForObservation(context, observation, index);
      records.push(...emission.records);
      admissions.push(emission.admission);
      sourceNodesByAdmissionProduct.set(emission.admission.productHandle, observation.sourceNode);
      if (observation.registeredValue != null) {
        runtimeValueSourceNodesByAdmissionProduct.set(
          emission.admission.productHandle,
          observation.registeredValue.node,
        );
      }
      const evaluatedValue = observation.evaluatedCarrierValue;
      if (evaluatedValue != null) {
        evaluatedCarriersByAdmissionProduct.set(
          emission.admission.productHandle,
          new EvaluatedRegistrationCarrier(observation.sourceNode, evaluatedValue),
        );
      }
      if (emission.openSeams.length > 0) {
        openSeamsByAdmissionProduct.set(emission.admission.productHandle, emission.openSeams);
      }
    });
    return new RegistrationKernelEmission(
      admissions,
      records,
      evaluatedCarriersByAdmissionProduct,
      sourceNodesByAdmissionProduct,
      runtimeValueSourceNodesByAdmissionProduct,
      openSeamsByAdmissionProduct,
    );
  }

  /** Materialize source/key/value support for a reached runtime registration value without inventing an admission. */
  materializeValueSupport(
    context: RegistrationEmissionContext,
    observation: RegistrationAdmissionObservation,
    local: string,
  ): RegistrationValueSupportEmission {
    const source = this.recordsForObservationSource(context, observation, local);
    const support = this.supportMaterializer.materialize(context, observation, local, source);
    return new RegistrationValueSupportEmission(
      [
        ...source.records,
        ...support.records,
      ],
      source.addressHandle,
      source.provenanceHandle,
      support.key.reference,
      support.value.reference,
      support.registryParameters.references,
      registrationAdmissionFieldProvenance(support.key, support.value, support.registryParameters),
      support.seams.records.filter((record): record is OpenSeam => record instanceof OpenSeam),
    );
  }

  /**
   * Refine one durable source admission for a concrete DI application without publishing a duplicate admission product.
   */
  materializeAdmissionRefinement(
    context: RegistrationEmissionContext,
    sourceAdmission: RegistrationAdmissionProduct,
    observation: RegistrationAdmissionObservation,
    local: string,
  ): RegistrationAdmissionRefinementEmission {
    const support = this.materializeValueSupport(context, observation, local);
    const product = this.admissionProductForObservation(
      observation,
      sourceAdmission.productHandle,
      sourceAdmission.identityHandle,
      sourceAdmission.sourceAddressHandle ?? support.sourceAddressHandle,
      mergeRegistrationAdmissionFieldProvenance(
        sourceAdmission.fieldProvenance,
        support.fieldProvenance,
      ),
      support.key,
      support.value,
      support.registryParameters,
    );
    return new RegistrationAdmissionRefinementEmission(
      support,
      product.admission,
    );
  }

  private recordsForObservation(
    context: RegistrationEmissionContext,
    observation: RegistrationAdmissionObservation,
    index: number,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly admission: RegistrationAdmissionProduct;
    readonly openSeams: readonly OpenSeam[];
  } {
    const records: KernelStoreRecord[] = [];
    const local = sourceNodeOrdinalLocalKey({
      prefix: context.recordKeyPrefix,
      sourceFile: observation.sourceNode.getSourceFile(),
      node: observation.sourceNode,
      index,
    });
    const source = this.recordsForObservationSource(context, observation, local);
    records.push(...source.records);

    const support = this.supportMaterializer.materialize(context, observation, local, source);
    records.push(...support.records);

    const admission = this.recordsForObservationProduct(observation, local, source, support);
    records.push(...admission.records);
    return {
      records,
      admission: admission.admission,
      openSeams: support.seams.records.filter((record): record is OpenSeam => record instanceof OpenSeam),
    };
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
          context.sourceFileAddressHandleForNode(observation.sourceNode),
          observation.sourceNode.getStart(observation.sourceNode.getSourceFile()),
          observation.sourceNode.end,
          SourceSpanRole.Range,
        ),
        new EvidenceRecord(
          sourceEvidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Registration],
          observation.carrierKind === RegistrationCarrierKind.RegistrationFactoryCall
            ? `Registration factory produced a ${observation.strategy} runtime registration value.`
            : `${observation.carrierKind} admitted a ${observation.strategy} registration.`,
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
    if (frameworkKind != null && observation.strategy === RegistrationStrategy.FrameworkGroup) {
      return new RegistrationAdmissionProductEmission(
        new FrameworkRegistrationAdmission(
          productHandle,
          identityHandle,
          observation.carrierKind,
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
          observation.carrierKind,
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
          observation.carrierKind,
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
          observation.carrierKind,
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
          observation.carrierKind,
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
        observation.carrierKind,
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

function registrationOpenSeamReasonKinds(
  openKind: OpenSeamKindKey,
): readonly OpenSeamReasonKind[] {
  switch (openKind) {
    case KernelVocabulary.Registration.OpenKeyExpression.key:
      return [OpenSeamReasonKind.RegistrationKeyOpen];
    case KernelVocabulary.Registration.OpenValueExpression.key:
      return [OpenSeamReasonKind.RegistrationValueOpen];
    case KernelVocabulary.Registration.OpenStrategy.key:
      return [OpenSeamReasonKind.RegistrationStrategyOpen];
    case KernelVocabulary.Registration.OpenSpread.key:
      return [OpenSeamReasonKind.RegistrationSpreadOpen];
    case KernelVocabulary.Registration.OpenAliasTarget.key:
      return [OpenSeamReasonKind.RegistrationAliasTargetOpen];
    default:
      return [OpenSeamReasonKind.FeatureNotYetModeled];
  }
}

function registrationAdmissionFieldProvenance(
  key: { readonly provenanceHandle: ProvenanceHandle | null },
  value: { readonly provenanceHandle: ProvenanceHandle | null },
  registryParameters: { readonly fieldProvenance: FieldProvenance<RegistrationAdmissionField> | null },
): readonly FieldProvenance<RegistrationAdmissionField>[] {
  return compactFieldProvenance<RegistrationAdmissionField>([
    key.provenanceHandle == null ? null : new FieldProvenance('targetKey', key.provenanceHandle),
    value.provenanceHandle == null ? null : new FieldProvenance('registeredValue', value.provenanceHandle),
    registryParameters.fieldProvenance,
  ]);
}

function mergeRegistrationAdmissionFieldProvenance(
  source: readonly FieldProvenance<RegistrationAdmissionField>[],
  refined: readonly FieldProvenance<RegistrationAdmissionField>[],
): readonly FieldProvenance<RegistrationAdmissionField>[] {
  const byField = new Map<RegistrationAdmissionField, FieldProvenance<RegistrationAdmissionField>>();
  for (const entry of source) byField.set(entry.field, entry);
  for (const entry of refined) byField.set(entry.field, entry);
  return [...byField.values()];
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
  return (
    reference?.valueKind === RegistrationValueKind.ResourceDefinition
    || reference?.valueKind === RegistrationValueKind.ResourceDefinitionConstraint
  ) && reference.productHandle != null;
}

function registrationValueSymbolSite(node: ts.Node): ts.Node {
  if (
    ts.isClassDeclaration(node)
    || ts.isClassExpression(node)
    || ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
  ) {
    return node.name ?? node;
  }
  return node;
}
