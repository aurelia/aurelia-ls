import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { projectModuleSourceNodeOrdinalLocalKey } from '../kernel/local-key.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  AttributePatternDefinitionHeader,
  type ResourceDefinitionHeader,
} from './resource-definition.js';
import { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import {
  ResourceRecognitionObservation,
} from './resource-observation.js';
import { ResourceTargetReference } from './resource-reference.js';
import { ResourceProductDetails } from './product-details.js';
import {
  ResourceIdentityPublicationSet,
  ResourceOpenSeamPublicationSet,
  ResourceRecognitionPublicationSupport,
  ResourceTargetPublication,
} from './resource-recognition-publication.js';

/** Result of emitting resource recognition observations into kernel-backed definition headers. */
export class ResourceRecognitionKernelEmission {
  constructor(
    /** Resource-definition headers that now have kernel product handles. */
    readonly definitions: readonly ResourceDefinitionHeaderEmission[],
    /** Kernel records committed by this emission. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class ResourceObservationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly definition: ResourceDefinitionHeaderEmission | null,
  ) {}
}

class ResourceObservationSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly sourceAddressHandle: AddressHandle,
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

interface ResourceObservationParts {
  readonly source: ResourceObservationSourceSet;
  readonly target: ResourceTargetPublication;
  readonly productHandle: ProductHandle | null;
  readonly resourceIdentities: ResourceIdentityPublicationSet;
  readonly openSeams: ResourceOpenSeamPublicationSet;
}

/** Emits source observations from resource recognition into the durable kernel graph. */
export class ResourceRecognitionKernelEmitter {
  constructor(
    /** Hot analysis store that receives resource-recognition records. */
    readonly store: KernelStore,
    readonly publication = new ResourceRecognitionPublicationSupport(store),
  ) {}

  emit(
    context: ResourceRecognitionContext,
    observations: readonly ResourceRecognitionObservation[],
  ): ResourceRecognitionKernelEmission {
    const records: KernelStoreRecord[] = [];
    const definitions: ResourceDefinitionHeaderEmission[] = [];
    observations.forEach((observation, index) => {
      const emission = this.recordsForObservation(context, observation, index);
      records.push(...emission.records);
      if (emission.definition != null) {
        definitions.push(emission.definition);
      }
    });
    if (records.length === 0) {
      return new ResourceRecognitionKernelEmission(definitions, records);
    }
    this.store.commit(new KernelStoreBatch(records, `resource-recognition:${context.moduleKey}`));
    for (const definition of definitions) {
      this.store.productDetails.add(ResourceProductDetails.DefinitionHeader, definition.productHandle, definition);
    }
    return new ResourceRecognitionKernelEmission(definitions, records);
  }

  private recordsForObservation(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    index: number,
  ): ResourceObservationEmission {
    const local = projectModuleSourceNodeOrdinalLocalKey({
      projectKey: context.projectKey,
      moduleKey: context.moduleKey,
      sourceFile: context.sourceFile,
      node: observation.sourceNode,
      index,
    });
    const parts = this.resourceObservationParts(context, observation, local);

    return new ResourceObservationEmission(
      this.recordsForObservationParts(local, parts),
      this.definitionEmissionForObservation(local, index, observation, parts.source, parts.target.targetReference, parts.productHandle, parts.resourceIdentities),
    );
  }

  private resourceObservationParts(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    local: string,
  ): ResourceObservationParts {
    const source = this.recordsForObservationSource(context, observation, local);
    const target = this.publication.recordsForTarget(context, observation, local);
    const productHandle = observation.definition == null
      ? null
      : this.store.handles.product(`resource-definition:${local}`);
    return {
      source,
      target,
      productHandle,
      resourceIdentities: this.publication.recordsForResourceIdentities(
        context,
        observation,
        local,
        productHandle,
        target.identityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      openSeams: this.publication.recordsForOpenSeams(context, observation.openSeams, local),
    };
  }

  private recordsForObservationParts(
    local: string,
    parts: ResourceObservationParts,
  ): readonly KernelStoreRecord[] {
    return [
      ...parts.source.records,
      ...parts.target.records,
      ...parts.resourceIdentities.records,
      ...parts.openSeams.records,
      ...this.recordsForDefinitionProduct(
        local,
        parts.source,
        parts.target.identityHandle,
        parts.productHandle,
        parts.resourceIdentities,
        parts.openSeams,
      ),
    ];
  }

  private recordsForObservationSource(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    local: string,
  ): ResourceObservationSourceSet {
    const sourceAddressHandle = this.store.handles.address(`resource-source:${local}`);
    const evidenceHandle = this.store.handles.evidence(`resource-observation:${local}`);
    const provenanceHandle = this.store.handles.provenance(`resource-observation:${local}`);
    return new ResourceObservationSourceSet(
      [
        new SourceSpanAddress(
          sourceAddressHandle,
          context.sourceFileAddressHandle,
          observation.sourceNode.getStart(context.sourceFile),
          observation.sourceNode.end,
          SourceSpanRole.Range,
        ),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SourceObservation,
          [EvidenceRole.Declaration],
          `${observation.carrierKind} recognized ${observation.definition?.type ?? 'an open resource kind'}.`,
          sourceAddressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      sourceAddressHandle,
      evidenceHandle,
      provenanceHandle,
    );
  }

  private recordsForDefinitionProduct(
    local: string,
    source: ResourceObservationSourceSet,
    targetIdentityHandle: IdentityHandle | null,
    productHandle: ProductHandle | null,
    resourceIdentities: ResourceIdentityPublicationSet,
    openSeams: ResourceOpenSeamPublicationSet,
  ): readonly KernelStoreRecord[] {
    return [
      ...(productHandle == null
        ? []
        : [
          new MaterializedProduct(
            productHandle,
            KernelVocabulary.Resource.DefinitionHeader.key,
            resourceIdentities.primaryIdentityHandle,
            source.sourceAddressHandle,
            source.provenanceHandle,
          ),
        ]),
      new MaterializationRecord(
        this.store.handles.materialization(`resource-recognition:${local}`),
        targetIdentityHandle ?? source.sourceAddressHandle,
        productHandle == null ? [] : [productHandle],
        resourceIdentities.claimHandles,
        openSeams.handles,
      ),
    ];
  }

  private definitionEmissionForObservation(
    local: string,
    index: number,
    observation: ResourceRecognitionObservation,
    source: ResourceObservationSourceSet,
    targetReference: ResourceTargetReference | null,
    productHandle: ProductHandle | null,
    resourceIdentities: ResourceIdentityPublicationSet,
  ): ResourceDefinitionHeaderEmission | null {
    return productHandle == null || observation.definition == null
      ? null
      : new ResourceDefinitionHeaderEmission(
        local,
        index,
        productHandle,
        resourceIdentities.primaryIdentityHandle,
        targetReference,
        observation.definition.type,
        lookupNamesForDefinition(observation.definition),
        source.sourceAddressHandle,
        source.provenanceHandle,
        resourceIdentities.claimHandles,
      );
  }

}

function lookupNamesForDefinition(
  definition: ResourceDefinitionHeader,
): readonly string[] {
  if (definition instanceof AttributePatternDefinitionHeader) {
    return definition.patterns.map((pattern) => pattern.pattern);
  }
  return [
    definition.name,
    ...definition.aliases,
  ].filter((name): name is string => name != null);
}
