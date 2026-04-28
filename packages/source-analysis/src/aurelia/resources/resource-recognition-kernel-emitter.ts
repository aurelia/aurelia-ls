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
import { KernelVocabulary, type KernelVocabularyKey } from '../kernel/vocabulary.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  AttributePatternDefinitionHeader,
  type NamedResourceDefinitionHeader,
} from './resource-definition.js';
import {
  ResourceOpenKind,
  ResourceRecognitionObservation,
  ResourceRecognitionOpen,
} from './resource-observation.js';
import {
  type NamedResourceDefinitionKind,
  toAureliaResourceIdentityKind,
} from './resource-kind.js';

/** Emits source observations from resource recognition into the durable kernel graph. */
export class ResourceRecognitionKernelEmitter {
  constructor(
    /** Hot analysis store that receives resource-recognition records. */
    readonly store: KernelStore,
  ) {}

  emit(
    context: ResourceRecognitionContext,
    observations: readonly ResourceRecognitionObservation[],
  ): void {
    const records: KernelStoreRecord[] = [];
    observations.forEach((observation, index) => {
      records.push(...this.recordsForObservation(context, observation, index));
    });
    if (records.length === 0) {
      return;
    }
    this.store.commit(new KernelStoreBatch(records, `resource-recognition:${context.moduleKey}`));
  }

  private recordsForObservation(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    index: number,
  ): readonly KernelStoreRecord[] {
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

    const declaration = this.recordsForDeclaration(context, observation, local);
    records.push(...declaration.records);

    const productHandle = observation.definition == null
      ? null
      : this.store.handles.product(`resource-definition:${local}`);
    const resourceIdentities = this.recordsForResourceIdentities(
      context,
      observation,
      local,
      productHandle,
      declaration.identityHandle,
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
      declaration.identityHandle ?? sourceAddressHandle,
      materializationStateForObservation(observation, productHandle),
      productHandle == null ? [] : [productHandle],
      resourceIdentities.claimHandles,
      [],
      openSeams.handles,
    ));

    return records;
  }

  private recordsForDeclaration(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly identityHandle: IdentityHandle | null;
  } {
    const target = observation.definition?.target ?? null;
    if (target == null || target.localName == null || !target.isDeclaration) {
      return { records: [], identityHandle: null };
    }

    const addressHandle = this.store.handles.address(`resource-target:${local}`);
    const identityHandle = this.store.handles.identity(`resource-target:${local}`);
    return {
      identityHandle,
      records: [
        new SourceSpanAddress(
          addressHandle,
          AddressStability.SourceStable,
          context.sourceFileAddressHandle,
          target.node.getStart(context.sourceFile),
          target.node.end,
          SourceSpanRole.Name,
        ),
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
          vocabularyForResourceOpen(seam.openKind),
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

function vocabularyForResourceOpen(
  openKind: ResourceOpenKind,
): KernelVocabularyKey {
  switch (openKind) {
    case ResourceOpenKind.Kind:
      return KernelVocabulary.Resource.OpenKindExpression.key;
    case ResourceOpenKind.Name:
      return KernelVocabulary.Resource.OpenNameExpression.key;
    case ResourceOpenKind.Alias:
      return KernelVocabulary.Resource.OpenAliasExpression.key;
    case ResourceOpenKind.Target:
      return KernelVocabulary.Resource.OpenTargetExpression.key;
    case ResourceOpenKind.Pattern:
      return KernelVocabulary.Resource.OpenPatternExpression.key;
  }
}
