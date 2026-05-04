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
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  InterfaceDiKeyIdentity,
  RegistrationIdentity,
  StringDiKeyIdentity,
  TypeScriptDeclarationIdentity,
  UnknownDiKeyIdentity,
} from '../kernel/identity.js';
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
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from './registration-observation.js';
import {
  FrameworkRegistrationKind,
  RegistrationKeyReference,
  RegistrationValueKind,
  RegistrationValueReference,
} from './registration-reference.js';

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

/** Emits registration observations into the durable kernel graph. */
export class RegistrationKernelEmitter {
  constructor(
    /** Hot analysis store that receives registration-admission records. */
    readonly store: KernelStore,
  ) {}

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
    const local = observationLocalKey(context, observation.sourceNode, index);
    const sourceAddressHandle = this.store.handles.address(`registration-source:${local}`);
    const sourceEvidenceHandle = this.store.handles.evidence(`registration-observation:${local}`);
    const sourceProvenanceHandle = this.store.handles.provenance(`registration-observation:${local}`);
    const sourceAddress = new SourceSpanAddress(
      sourceAddressHandle,
      context.sourceFileAddressHandle,
      observation.sourceNode.getStart(context.sourceFile),
      observation.sourceNode.end,
      SourceSpanRole.Range,
    );
    const sourceEvidence = new EvidenceRecord(
      sourceEvidenceHandle,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Registration],
      `${observation.carrierKind} admitted a ${observation.strategy} registration.`,
      sourceAddressHandle,
    );
    const sourceProvenance = new ProvenanceRecord(
      sourceProvenanceHandle,
      [sourceEvidenceHandle],
    );
    records.push(sourceAddress, sourceEvidence, sourceProvenance);

    const key = this.recordsForKey(context, observation.targetKey, local, sourceAddressHandle);
    records.push(...key.records);
    const value = this.recordsForValue(context, observation.registeredValue, local);
    records.push(...value.records);
    const registryParameters = this.recordsForRegistryParameters(context, observation.registryParameters, local);
    records.push(...registryParameters.records);
    const seams = this.recordsForOpenSeams(
      context,
      openSeamsForObservation(observation),
      local,
    );
    records.push(...seams.records);

    const productHandle = this.store.handles.product(`registration-admission:${local}`);
    const registrationIdentityHandle = this.store.handles.identity(`registration-admission:${local}`);
    records.push(new RegistrationIdentity(
      registrationIdentityHandle,
      key.identityHandle,
      sourceAddressHandle,
    ));

    const claims = this.recordsForClaims(
      local,
      productHandle,
      observation.keyRole,
      key.identityHandle,
      key.provenanceHandle ?? sourceProvenanceHandle,
      value.claimTargetHandle,
      value.provenanceHandle,
      registryParameters.claimTargets,
    );
    records.push(...claims.records);

    const registryParametersProvenanceHandle = registryParameters.provenanceHandles[0] ?? null;
    const fieldProvenance = compactFieldProvenance<RegistrationAdmissionField>([
      new FieldProvenance('admissionKind', sourceProvenanceHandle),
      new FieldProvenance('strategy', sourceProvenanceHandle),
      new FieldProvenance('keyRole', sourceProvenanceHandle),
      new FieldProvenance('source', sourceProvenanceHandle),
      key.provenanceHandle == null ? null : new FieldProvenance('targetKey', key.provenanceHandle),
      value.provenanceHandle == null ? null : new FieldProvenance('registeredValue', value.provenanceHandle),
      registryParametersProvenanceHandle == null ? null : new FieldProvenance('registryParameters', registryParametersProvenanceHandle),
    ]);
    let admission: RegistrationAdmissionProduct;
    let productKind: ProductKindKey;
    const frameworkKind = value.reference?.frameworkKind ?? null;
    if (frameworkKind != null && isFrameworkRegistrationGroupKind(frameworkKind)) {
      admission = new FrameworkRegistrationAdmission(
        productHandle,
        registrationIdentityHandle,
        observation.admissionKind,
        frameworkKind,
        value.reference,
        sourceAddressHandle,
        fieldProvenance,
      );
      productKind = KernelVocabulary.Registration.FrameworkRegistrationAdmission.key;
    } else if (observation.keyRole === RegistrationKeyRole.RegistryLookupKey) {
      admission = new ParameterizedRegistryAdmission(
        productHandle,
        registrationIdentityHandle,
        observation.admissionKind,
        key.reference,
        registryParameters.references,
        sourceAddressHandle,
        fieldProvenance,
      );
      productKind = KernelVocabulary.Registration.ParameterizedRegistryAdmission.key;
    } else if (observation.strategy === RegistrationStrategy.Registry) {
      admission = new RegistryRegistrationAdmission(
        productHandle,
        registrationIdentityHandle,
        observation.admissionKind,
        value.reference,
        sourceAddressHandle,
        fieldProvenance,
      );
      productKind = KernelVocabulary.Registration.RegistryAdmission.key;
    } else if (observation.strategy === RegistrationStrategy.Resource
      && isResourceRegistrationReference(value.reference)) {
      admission = new ResourceRegistrationAdmission(
        productHandle,
        registrationIdentityHandle,
        observation.admissionKind,
        value.reference,
        sourceAddressHandle,
        fieldProvenance,
      );
      productKind = KernelVocabulary.Registration.ResourceAdmission.key;
    } else if (isResolverRegistrationStrategy(observation.strategy)) {
      admission = new ResolverRegistrationAdmission(
        productHandle,
        registrationIdentityHandle,
        observation.admissionKind,
        observation.strategy,
        observation.keyRole,
        key.reference,
        value.reference,
        sourceAddressHandle,
        fieldProvenance,
      );
      productKind = KernelVocabulary.Registration.ResolverAdmission.key;
    } else {
      admission = new OpenRegistrationAdmission(
        productHandle,
        registrationIdentityHandle,
        observation.admissionKind,
        observation.strategy,
        observation.keyRole,
        key.reference,
        value.reference,
        sourceAddressHandle,
        fieldProvenance,
      );
      productKind = KernelVocabulary.Registration.OpenAdmission.key;
    }

    records.push(
      new MaterializedProduct(
        productHandle,
        productKind,
        registrationIdentityHandle,
        sourceAddressHandle,
        sourceProvenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`registration-admission:${local}`),
        registrationIdentityHandle,
        [productHandle],
        claims.handles,
        seams.handles,
      ),
    );

    return { records, admission };
  }

  private recordsForKey(
    context: RegistrationEmissionContext,
    observation: RegistrationKeyObservation | null,
    local: string,
    admissionAddressHandle: AddressHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly reference: RegistrationKeyReference;
    readonly identityHandle: IdentityHandle | null;
    readonly provenanceHandle: ProvenanceHandle | null;
  } {
    if (observation == null) {
      return {
        records: [],
        reference: new RegistrationKeyReference(null, admissionAddressHandle, null),
        identityHandle: null,
        provenanceHandle: null,
      };
    }

    const addressHandle = this.store.handles.address(`registration-key:${local}`);
    const evidenceHandle = this.store.handles.evidence(`registration-key:${local}`);
    const provenanceHandle = this.store.handles.provenance(`registration-key:${local}`);
    const identityHandle = this.store.handles.identity(`registration-key:${local}`);
    const records: KernelStoreRecord[] = [
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
        'Registration target key expression.',
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    const stringValue = stringLiteralValue(observation.node);
    records.push(stringValue != null
      ? new StringDiKeyIdentity(
        identityHandle,
        stringValue,
        addressHandle,
      )
      : isInterfaceKeyName(observation.localName)
      ? new InterfaceDiKeyIdentity(
        identityHandle,
        observation.localName,
        null,
        addressHandle,
      )
      : new UnknownDiKeyIdentity(
        identityHandle,
        addressHandle,
        `Registration key expression still needs DI key classification: ${observation.localName ?? ts.SyntaxKind[observation.node.kind]}.`,
      ));

    return {
      records,
      reference: new RegistrationKeyReference(identityHandle, addressHandle, observation.localName),
      identityHandle,
      provenanceHandle,
    };
  }

  private recordsForValue(
    context: RegistrationEmissionContext,
    observation: RegistrationValueObservation | null,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly reference: RegistrationValueReference | null;
    readonly claimTargetHandle: AddressHandle | IdentityHandle | ProductHandle | null;
    readonly provenanceHandle: ProvenanceHandle | null;
  } {
    if (observation == null) {
      return {
        records: [],
        reference: null,
        claimTargetHandle: null,
        provenanceHandle: null,
      };
    }

    const addressHandle = this.store.handles.address(`registration-value:${local}`);
    const evidenceHandle = this.store.handles.evidence(`registration-value:${local}`);
    const provenanceHandle = this.store.handles.provenance(`registration-value:${local}`);
    const identityHandle = observation.isDeclaration && observation.localName != null
      ? this.store.handles.identity(`registration-value:${local}`)
      : null;
    const records: KernelStoreRecord[] = [
      new SourceSpanAddress(
        addressHandle,
        context.sourceFileAddressHandle,
        observation.node.getStart(context.sourceFile),
        observation.node.end,
        observation.isDeclaration ? SourceSpanRole.Name : SourceSpanRole.Value,
      ),
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Registration],
        `Registration value expression classified as ${observation.valueKind}.`,
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    if (identityHandle != null) {
      records.push(new TypeScriptDeclarationIdentity(
        identityHandle,
        context.moduleKey,
        null,
        observation.localName,
        addressHandle,
      ));
    }

    return {
      records,
      reference: new RegistrationValueReference(
        observation.valueKind,
        identityHandle,
        observation.productHandle,
        addressHandle,
        observation.localName,
        observation.frameworkKind,
      ),
      claimTargetHandle: observation.productHandle ?? identityHandle ?? addressHandle,
      provenanceHandle,
    };
  }

  private recordsForRegistryParameters(
    context: RegistrationEmissionContext,
    observations: readonly RegistrationValueObservation[],
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly references: readonly RegistrationValueReference[];
    readonly claimTargets: readonly RegistrationClaimTarget[];
    readonly provenanceHandles: readonly ProvenanceHandle[];
  } {
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

  private recordsForClaims(
    local: string,
    productHandle: ProductHandle,
    keyRole: RegistrationKeyRole,
    keyIdentityHandle: IdentityHandle | null,
    keyProvenanceHandle: ProvenanceHandle,
    valueTargetHandle: AddressHandle | IdentityHandle | ProductHandle | null,
    valueProvenanceHandle: ProvenanceHandle | null,
    additionalValueTargets: readonly RegistrationClaimTarget[] = [],
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly ClaimHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const handles: ClaimHandle[] = [];
    if (keyRole === RegistrationKeyRole.AdmittedKey && keyIdentityHandle != null) {
      const keyClaimHandle = this.store.handles.claim(`registration-admits-key:${local}`);
      handles.push(keyClaimHandle);
      records.push(new SemanticClaim(
        keyClaimHandle,
        productHandle,
        KernelVocabulary.Registration.AdmitsKey.key,
        keyIdentityHandle,
        keyProvenanceHandle,
      ));
    }

    if (valueTargetHandle != null && valueProvenanceHandle != null) {
      const valueClaimHandle = this.store.handles.claim(`registration-uses-value:${local}`);
      handles.push(valueClaimHandle);
      records.push(new SemanticClaim(
        valueClaimHandle,
        productHandle,
        KernelVocabulary.Registration.UsesValue.key,
        valueTargetHandle,
        valueProvenanceHandle,
      ));
    }
    additionalValueTargets.forEach((target, index) => {
      const valueClaimHandle = this.store.handles.claim(`registration-uses-value:${local}:additional:${index}`);
      handles.push(valueClaimHandle);
      records.push(new SemanticClaim(
        valueClaimHandle,
        productHandle,
        KernelVocabulary.Registration.UsesValue.key,
        target.handle,
        target.provenanceHandle,
      ));
    });

    return { records, handles };
  }

  private recordsForOpenSeams(
    context: RegistrationEmissionContext,
    seams: readonly RegistrationRecognitionOpen[],
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly OpenSeamHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const handles: OpenSeamHandle[] = [];
    seams.forEach((seam, index) => {
      const seamLocal = `registration-open:${local}:${seam.openKind}:${index}`;
      const addressHandle = this.store.handles.address(`${seamLocal}:span`);
      const evidenceHandle = this.store.handles.evidence(seamLocal);
      const provenanceHandle = this.store.handles.provenance(seamLocal);
      const openSeamHandle = this.store.handles.openSeam(seamLocal);
      handles.push(openSeamHandle);
      records.push(
        new SourceSpanAddress(
          addressHandle,
          context.sourceFileAddressHandle,
          seam.node.getStart(context.sourceFile),
          seam.node.end,
          SourceSpanRole.Range,
        ),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Diagnostic, EvidenceRole.Registration],
          seam.summary,
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
        new OpenSeam(
          openSeamHandle,
          seam.openKind,
          seam.summary,
          addressHandle,
          evidenceHandle,
        ),
      );
    });
    return { records, handles };
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

function hasRegistrationOpen(
  seams: readonly RegistrationRecognitionOpen[],
  openKind: OpenSeamKindKey,
): boolean {
  return seams.some((seam) => seam.openKind === openKind);
}

function isFrameworkRegistrationGroupKind(kind: FrameworkRegistrationKind): boolean {
  switch (kind) {
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return true;
    case FrameworkRegistrationKind.AppTask:
    case FrameworkRegistrationKind.StandardConfiguration:
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return false;
  }
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

function isInterfaceKeyName(name: string | null): name is string {
  return name != null && /^I[A-Z][A-Za-z0-9]*$/.test(name);
}

function observationLocalKey(
  context: RegistrationEmissionContext,
  node: ts.Node,
  index: number,
): string {
  return `${context.recordKeyPrefix}:${node.getStart(context.sourceFile)}:${node.end}:${index}`;
}
