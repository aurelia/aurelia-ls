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
  bindProductDetailEnvelope,
} from '../kernel/product-details.js';
import { performance } from 'node:perf_hooks';
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

export type ResourceRecognitionEmissionPhaseName =
  | 'kernel-emission:observation-records'
  | 'kernel-emission:source-records'
  | 'kernel-emission:target-type-projection'
  | 'kernel-emission:resource-identity-records'
  | 'kernel-emission:open-seam-records'
  | 'kernel-emission:definition-product-records'
  | 'kernel-emission:batch-commit'
  | 'kernel-emission:definition-header-details';

export interface ResourceRecognitionEmissionPhaseTiming {
  readonly name: ResourceRecognitionEmissionPhaseName;
  readonly milliseconds: number;
}

export interface ResourceRecognitionEmissionProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly ResourceRecognitionEmissionPhaseTiming[];
}

/** Result of emitting resource recognition observations into kernel-backed definition headers. */
export class ResourceRecognitionKernelEmission {
  constructor(
    /** Resource-definition headers that now have kernel product handles. */
    readonly definitions: readonly ResourceDefinitionHeaderEmission[],
    /** Kernel records committed by this emission. */
    readonly records: readonly KernelStoreRecord[],
    /** Internal publication timings for resource-recognition profiling. */
    readonly profile: ResourceRecognitionEmissionProfile,
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
  ) {}

  emit(
    context: ResourceRecognitionContext,
    observations: readonly ResourceRecognitionObservation[],
  ): ResourceRecognitionKernelEmission {
    const started = performance.now();
    const phases: ResourceRecognitionEmissionPhaseTiming[] = [];
    const publication = new ResourceRecognitionPublicationSupport(
      this.store,
      (name, read) => measureResourceRecognitionEmissionPhase(phases, name, read),
    );
    const records: KernelStoreRecord[] = [];
    const definitions: ResourceDefinitionHeaderEmission[] = [];
    measureResourceRecognitionEmissionPhase(phases, 'kernel-emission:observation-records', () => {
      observations.forEach((observation, index) => {
        const emission = this.recordsForObservation(context, publication, observation, index, phases);
        records.push(...emission.records);
        if (emission.definition != null) {
          definitions.push(emission.definition);
        }
      });
    });
    if (records.length === 0) {
      return new ResourceRecognitionKernelEmission(definitions, records, {
        totalMilliseconds: performance.now() - started,
        phases,
      });
    }
    measureResourceRecognitionEmissionPhase(phases, 'kernel-emission:batch-commit', () => {
      this.store.commit(new KernelStoreBatch(records, `resource-recognition:${context.moduleKey}`));
    });
    measureResourceRecognitionEmissionPhase(phases, 'kernel-emission:definition-header-details', () => {
      for (const definition of definitions) {
        this.store.productDetails.add(ResourceProductDetails.DefinitionHeader, definition.productHandle, definition);
      }
    });
    return new ResourceRecognitionKernelEmission(definitions, records, {
      totalMilliseconds: performance.now() - started,
      phases,
    });
  }

  private recordsForObservation(
    context: ResourceRecognitionContext,
    publication: ResourceRecognitionPublicationSupport,
    observation: ResourceRecognitionObservation,
    index: number,
    phases: ResourceRecognitionEmissionPhaseTiming[],
  ): ResourceObservationEmission {
    const local = projectModuleSourceNodeOrdinalLocalKey({
      projectKey: context.projectKey,
      moduleKey: context.moduleKey,
      sourceFile: context.sourceFile,
      node: observation.sourceNode,
      index,
    });
    const parts = this.resourceObservationParts(context, publication, observation, local, phases);

    return new ResourceObservationEmission(
      this.recordsForObservationParts(local, parts, phases),
      this.definitionEmissionForObservation(local, index, observation, parts.source, parts.target.targetReference, parts.productHandle, parts.resourceIdentities),
    );
  }

  private resourceObservationParts(
    context: ResourceRecognitionContext,
    publication: ResourceRecognitionPublicationSupport,
    observation: ResourceRecognitionObservation,
    local: string,
    phases: ResourceRecognitionEmissionPhaseTiming[],
  ): ResourceObservationParts {
    const source = measureResourceRecognitionEmissionPhase(phases, 'kernel-emission:source-records', () =>
      this.recordsForObservationSource(context, observation, local)
    );
    const target = publication.recordsForTarget(context, observation, local);
    const productHandle = observation.definition == null
      ? null
      : this.store.handles.product(`resource-definition:${local}`);
    return {
      source,
      target,
      productHandle,
      resourceIdentities: measureResourceRecognitionEmissionPhase(
        phases,
        'kernel-emission:resource-identity-records',
        () => publication.recordsForResourceIdentities(
          context,
          observation,
          local,
          productHandle,
          target.identityHandle,
          source.sourceAddressHandle,
          source.provenanceHandle,
        ),
      ),
      openSeams: measureResourceRecognitionEmissionPhase(phases, 'kernel-emission:open-seam-records', () =>
        publication.recordsForOpenSeams(context, observation.openSeams, local)
      ),
    };
  }

  private recordsForObservationParts(
    local: string,
    parts: ResourceObservationParts,
    phases: ResourceRecognitionEmissionPhaseTiming[],
  ): readonly KernelStoreRecord[] {
    return [
      ...parts.source.records,
      ...parts.target.records,
      ...parts.resourceIdentities.records,
      ...parts.openSeams.records,
      ...measureResourceRecognitionEmissionPhase(
        phases,
        'kernel-emission:definition-product-records',
        () => this.recordsForDefinitionProduct(local, parts),
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
    parts: ResourceObservationParts,
  ): readonly KernelStoreRecord[] {
    return [
      ...(parts.productHandle == null
        ? []
        : [
          new MaterializedProduct(
            parts.productHandle,
            KernelVocabulary.Resource.DefinitionHeader.key,
            parts.resourceIdentities.primaryIdentityHandle,
            parts.source.sourceAddressHandle,
            parts.source.provenanceHandle,
          ),
        ]),
      new MaterializationRecord(
        this.store.handles.materialization(`resource-recognition:${local}`),
        parts.target.identityHandle ?? parts.source.sourceAddressHandle,
        parts.productHandle == null ? [] : [parts.productHandle],
        parts.resourceIdentities.claimHandles,
        parts.openSeams.handles,
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
      : bindProductDetailEnvelope(new ResourceDefinitionHeaderEmission(
        local,
        index,
        targetReference,
        observation.definition.type,
        lookupNamesForDefinition(observation.definition),
        resourceIdentities.claimHandles,
      ), new MaterializedProduct(
        productHandle,
        KernelVocabulary.Resource.DefinitionHeader.key,
        resourceIdentities.primaryIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ));
  }

}

function measureResourceRecognitionEmissionPhase<TValue>(
  phases: ResourceRecognitionEmissionPhaseTiming[],
  name: ResourceRecognitionEmissionPhaseName,
  read: () => TValue,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
  });
  return value;
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
