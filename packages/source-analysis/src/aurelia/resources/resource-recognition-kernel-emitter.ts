import type ts from 'typescript';
import {
  AddressStability,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  DerivationPhase,
  OpenSeam,
  OpenSeamSeverity,
} from '../kernel/derivation.js';
import { SemanticClaim } from '../kernel/claim.js';
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
  AureliaAttributePatternIdentity,
  AureliaResourceIdentity,
  IdentityStability,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializationState,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceMode,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  AttributePatternDefinitionHeader,
  type ResourceDefinitionHeader,
  type NamedResourceDefinitionHeader,
} from './resource-definition.js';
import {
  ResourceRecognitionObservation,
  ResourceRecognitionOpen,
} from './resource-observation.js';
import {
  type NamedResourceDefinitionKind,
  toAureliaResourceIdentityKind,
} from './resource-kind.js';
import { ResourceTargetReference } from './resource-reference.js';

/** Typed handle surface for a resource definition header that was admitted into the kernel. */
export class ResourceDefinitionHeaderEmission {
  constructor(
    /** Producer-local key shared by header, target, convergence, and materialization records. */
    readonly localKey: string,
    /** Index of the source observation that produced this header. */
    readonly observationIndex: number,
    /** Product handle for the materialized resource-definition header. */
    readonly productHandle: ProductHandle,
    /** Primary resource identity, when recognition produced one unambiguous identity. */
    readonly primaryIdentityHandle: IdentityHandle | null,
    /** Target reference for the resource implementation, when statically visible. */
    readonly targetReference: ResourceTargetReference | null,
    /** Recognized Aurelia resource kind for this header. */
    readonly resourceKind: ResourceDefinitionHeader['type'],
    /** Runtime lookup names or pattern strings observed for this header. */
    readonly lookupNames: readonly string[],
    /** Source address for the header carrier. */
    readonly sourceAddressHandle: AddressHandle,
    /** Provenance handle for the header recognition observation. */
    readonly provenanceHandle: ProvenanceHandle,
    /** Claims emitted for resource identities and aliases. */
    readonly claimHandles: readonly ClaimHandle[],
  ) {}
}

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
    return new ResourceRecognitionKernelEmission(definitions, records);
  }

  private recordsForObservation(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    index: number,
  ): ResourceObservationEmission {
    const records: KernelStoreRecord[] = [];
    const local = observationLocalKey(context, observation.sourceNode, index);
    const sourceAddressHandle = this.store.handles.address(`resource-source:${local}`);
    const evidenceHandle = this.store.handles.evidence(`resource-observation:${local}`);
    const provenanceHandle = this.store.handles.provenance(`resource-observation:${local}`);
    const sourceAddress = new SourceSpanAddress(
      sourceAddressHandle,
      AddressStability.SourceStable,
      context.sourceFileAddressHandle,
      observation.sourceNode.getStart(context.sourceFile),
      observation.sourceNode.end,
      SourceSpanRole.Range,
    );
    const evidence = new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SourceObservation,
      [EvidenceRole.Declaration],
      `${observation.carrierKind} recognized ${observation.definition?.type ?? 'an open resource kind'}.`,
      sourceAddressHandle,
    );
    const provenance = new ProvenanceRecord(
      provenanceHandle,
      ProvenanceMode.Direct,
      [evidenceHandle],
      [],
      'Resource recognition observation.',
    );

    records.push(sourceAddress, evidence, provenance);

    const target = this.recordsForTarget(context, observation, local);
    records.push(...target.records);

    const productHandle = observation.definition == null
      ? null
      : this.store.handles.product(`resource-definition:${local}`);
    const resourceIdentities = this.recordsForResourceIdentities(
      context,
      observation,
      local,
      productHandle,
      target.identityHandle,
      sourceAddressHandle,
      provenanceHandle,
    );
    records.push(...resourceIdentities.records);
    const openSeams = this.recordsForOpenSeams(context, observation.openSeams, local);
    records.push(...openSeams.records);

    if (productHandle != null) {
      records.push(new MaterializedProduct(
        productHandle,
        KernelVocabulary.Resource.DefinitionHeader.key,
        resourceIdentities.primaryIdentityHandle,
        sourceAddressHandle,
        provenanceHandle,
        resourceIdentities.claimHandles,
      ));
    }
    records.push(new MaterializationRecord(
      this.store.handles.materialization(`resource-recognition:${local}`),
      DerivationPhase.Materialization,
      target.identityHandle ?? sourceAddressHandle,
      materializationStateForObservation(observation, productHandle),
      productHandle == null ? [] : [productHandle],
      resourceIdentities.claimHandles,
      [],
      openSeams.handles,
    ));

    return new ResourceObservationEmission(
      records,
      productHandle == null || observation.definition == null
        ? null
        : new ResourceDefinitionHeaderEmission(
          local,
          index,
          productHandle,
          resourceIdentities.primaryIdentityHandle,
          target.targetReference,
          observation.definition.type,
          lookupNamesForDefinition(observation.definition),
          sourceAddressHandle,
          provenanceHandle,
          resourceIdentities.claimHandles,
        ),
    );
  }

  private recordsForTarget(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly targetReference: ResourceTargetReference | null;
    readonly identityHandle: IdentityHandle | null;
  } {
    const target = observation.definition?.target ?? null;
    if (target == null) {
      return { records: [], targetReference: null, identityHandle: null };
    }

    const addressHandle = this.store.handles.address(`resource-target:${local}`);
    const identityHandle = target.localName == null || !target.isDeclaration
      ? null
      : this.store.handles.identity(`resource-target:${local}`);
    const targetReference = new ResourceTargetReference(identityHandle, addressHandle, target.localName);
    const address = new SourceSpanAddress(
      addressHandle,
      AddressStability.SourceStable,
      context.sourceFileAddressHandle,
      target.node.getStart(context.sourceFile),
      target.node.end,
      SourceSpanRole.Name,
    );
    if (identityHandle == null) {
      return {
        targetReference,
        identityHandle,
        records: [address],
      };
    }
    return {
      identityHandle,
      targetReference,
      records: [
        address,
        new TypeScriptDeclarationIdentity(
          identityHandle,
          IdentityStability.SourceStable,
          context.moduleKey,
          null,
          target.localName,
          addressHandle,
        ),
      ],
    };
  }

  private recordsForResourceIdentities(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    local: string,
    productHandle: ProductHandle | null,
    declarationIdentityHandle: IdentityHandle | null,
    sourceAddressHandle: AddressHandle,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly primaryIdentityHandle: IdentityHandle | null;
    readonly claimHandles: readonly ClaimHandle[];
  } {
    const definition = observation.definition;
    if (definition == null) {
      return { records: [], primaryIdentityHandle: null, claimHandles: [] };
    }
    if (definition instanceof AttributePatternDefinitionHeader) {
      return this.recordsForAttributePatternIdentities(
        context,
        definition,
        local,
        productHandle,
        declarationIdentityHandle,
        sourceAddressHandle,
        provenanceHandle,
      );
    }

    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    let primaryIdentityHandle: IdentityHandle | null = null;
    const resourceKind = definition.type;
    const primaryNames = primaryResourceNames(definition);
    primaryNames.forEach((name, nameIndex) => {
      const identityHandle = this.store.handles.identity(resourceIdentityLocalKey(local, resourceKind, name, nameIndex));
      const claimHandle = this.store.handles.claim(`resource-declares:${local}:${nameIndex}`);
      primaryIdentityHandle ??= identityHandle;
      claimHandles.push(claimHandle);
      records.push(
        new AureliaResourceIdentity(
          identityHandle,
          name == null ? IdentityStability.SourceStable : IdentityStability.SemanticStable,
          toAureliaResourceIdentityKind(resourceKind),
          name,
          declarationIdentityHandle,
        ),
        new SemanticClaim(
          claimHandle,
          productHandle ?? declarationIdentityHandle ?? sourceAddressHandle,
          KernelVocabulary.Resource.Declares.key,
          identityHandle,
          provenanceHandle,
        ),
      );

      if (nameIndex === 0 && name != null) {
        const aliases = this.recordsForAliases(
          definition.aliases,
          resourceKind,
          local,
          identityHandle,
          declarationIdentityHandle,
          provenanceHandle,
        );
        claimHandles.push(...aliases.claimHandles);
        records.push(...aliases.records);
      }
    });

    if (primaryNames.length === 0) {
      const identityHandle = this.store.handles.identity(resourceIdentityLocalKey(local, resourceKind, null, 0));
      const claimHandle = this.store.handles.claim(`resource-declares:${local}:anonymous`);
      primaryIdentityHandle = identityHandle;
      claimHandles.push(claimHandle);
      records.push(
        new AureliaResourceIdentity(
          identityHandle,
          IdentityStability.SourceStable,
          toAureliaResourceIdentityKind(resourceKind),
          null,
          declarationIdentityHandle,
        ),
        new SemanticClaim(
          claimHandle,
          productHandle ?? declarationIdentityHandle ?? sourceAddressHandle,
          KernelVocabulary.Resource.Declares.key,
          identityHandle,
          provenanceHandle,
        ),
      );
    }

    return { records, primaryIdentityHandle, claimHandles };
  }

  private recordsForAttributePatternIdentities(
    context: ResourceRecognitionContext,
    definition: AttributePatternDefinitionHeader,
    local: string,
    productHandle: ProductHandle | null,
    declarationIdentityHandle: IdentityHandle | null,
    sourceAddressHandle: AddressHandle,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly primaryIdentityHandle: IdentityHandle | null;
    readonly claimHandles: readonly ClaimHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    let primaryIdentityHandle: IdentityHandle | null = null;
    definition.patterns.forEach((pattern, patternIndex) => {
      const addressHandle = this.store.handles.address(`resource-attribute-pattern:${local}:${patternIndex}`);
      const identityHandle = this.store.handles.identity(attributePatternIdentityLocalKey(local, pattern.pattern, pattern.symbols, patternIndex));
      const claimHandle = this.store.handles.claim(`resource-declares:${local}:attribute-pattern:${patternIndex}`);
      primaryIdentityHandle ??= identityHandle;
      claimHandles.push(claimHandle);
      records.push(
        new SourceSpanAddress(
          addressHandle,
          AddressStability.SourceStable,
          context.sourceFileAddressHandle,
          pattern.node.getStart(context.sourceFile),
          pattern.node.end,
          SourceSpanRole.Value,
        ),
        new AureliaAttributePatternIdentity(
          identityHandle,
          IdentityStability.SemanticStable,
          pattern.pattern,
          pattern.symbols,
          declarationIdentityHandle,
          addressHandle,
        ),
        new SemanticClaim(
          claimHandle,
          productHandle ?? declarationIdentityHandle ?? sourceAddressHandle,
          KernelVocabulary.Resource.Declares.key,
          identityHandle,
          provenanceHandle,
        ),
      );
    });

    return {
      records,
      primaryIdentityHandle: definition.patterns.length === 1 ? primaryIdentityHandle : null,
      claimHandles,
    };
  }

  private recordsForAliases(
    aliases: readonly string[],
    resourceKind: NamedResourceDefinitionKind,
    local: string,
    canonicalIdentityHandle: IdentityHandle,
    declarationIdentityHandle: IdentityHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly claimHandles: readonly ClaimHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    aliases.forEach((alias, aliasIndex) => {
      const aliasIdentityHandle = this.store.handles.identity(`${resourceIdentityLocalKey(local, resourceKind, alias, aliasIndex)}:alias`);
      const aliasClaimHandle = this.store.handles.claim(`resource-alias:${local}:${aliasIndex}`);
      claimHandles.push(aliasClaimHandle);
      records.push(
        new AureliaResourceIdentity(
          aliasIdentityHandle,
          IdentityStability.SemanticStable,
          toAureliaResourceIdentityKind(resourceKind),
          alias,
          declarationIdentityHandle,
        ),
        new SemanticClaim(
          aliasClaimHandle,
          aliasIdentityHandle,
          KernelVocabulary.Resource.AliasOf.key,
          canonicalIdentityHandle,
          provenanceHandle,
        ),
      );
    });
    return { records, claimHandles };
  }

  private recordsForOpenSeams(
    context: ResourceRecognitionContext,
    seams: readonly ResourceRecognitionOpen[],
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly OpenSeamHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const handles: OpenSeamHandle[] = [];
    seams.forEach((seam, index) => {
      const seamLocal = `resource-open:${local}:${seam.openKind}:${index}`;
      const addressHandle = this.store.handles.address(`${seamLocal}:span`);
      const evidenceHandle = this.store.handles.evidence(seamLocal);
      const provenanceHandle = this.store.handles.provenance(seamLocal);
      const openSeamHandle = this.store.handles.openSeam(seamLocal);
      handles.push(openSeamHandle);
      records.push(
        new SourceSpanAddress(
          addressHandle,
          AddressStability.SourceStable,
          context.sourceFileAddressHandle,
          seam.node.getStart(context.sourceFile),
          seam.node.end,
          SourceSpanRole.Range,
        ),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.Open,
          [EvidenceRole.Diagnostic],
          seam.summary,
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          ProvenanceMode.Open,
          [evidenceHandle],
          [],
          `Resource recognition left an open seam: ${seam.openKind}.`,
        ),
        new OpenSeam(
          openSeamHandle,
          seam.openKind,
          OpenSeamSeverity.Warning,
          seam.summary,
          addressHandle,
          evidenceHandle,
        ),
      );
    });
    return { records, handles };
  }
}

function materializationStateForObservation(
  observation: ResourceRecognitionObservation,
  productHandle: ProductHandle | null,
): MaterializationState {
  if (productHandle == null) {
    return observation.openSeams.length === 0
      ? MaterializationState.Unknown
      : MaterializationState.Open;
  }
  return observation.openSeams.length === 0
    ? MaterializationState.Complete
    : MaterializationState.Partial;
}

function primaryResourceNames(
  definition: NamedResourceDefinitionHeader,
): readonly (string | null)[] {
  return definition.name == null ? [] : [definition.name];
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

function attributePatternIdentityLocalKey(
  local: string,
  pattern: string,
  symbols: string,
  index: number,
): string {
  return `attribute-pattern-identity:${local}:${pattern}:${symbols}:${index}`;
}

function resourceIdentityLocalKey(
  local: string,
  resourceKind: string,
  name: string | null,
  index: number,
): string {
  return `resource-identity:${local}:${resourceKind}:${name ?? 'anonymous'}:${index}`;
}

function observationLocalKey(
  context: ResourceRecognitionContext,
  node: ts.Node,
  index: number,
): string {
  return `${context.moduleKey}:${node.getStart(context.sourceFile)}:${node.end}:${index}`;
}
