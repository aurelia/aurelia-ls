import type ts from 'typescript';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  SemanticClaim,
  type ClaimEndpointHandle,
} from '../kernel/claim.js';
import {
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
} from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  recordsForSourceOpenSeams,
} from '../kernel/source-open-seam.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  CheckerTypeMemberProjectionPolicy,
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import {
  appendDeclarationSourceRecords,
  sourceSpanForCheckerDeclaration,
  type DeclarationSourcePublication,
} from '../type-system/declaration-source.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  AttributePatternDefinitionHeader,
  type NamedResourceDefinitionHeader,
} from './resource-definition.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import type { ResourceRecognitionEmissionPhaseName } from './resource-recognition-kernel-emitter.js';
import {
  type AttributePatternObservation,
  type ResourceAliasObservation,
  type ResourceTargetObservation,
  ResourceRecognitionObservation,
  ResourceRecognitionOpen,
} from './resource-observation.js';
import {
  type NamedResourceDefinitionKind,
} from './resource-kind.js';
import { toAureliaResourceDeclarationKind } from './named-resource-kind.js';
import { ResourceTargetReference } from './resource-reference.js';
import {
  sourceSpanAddressForNode,
  sourceSpanRangeForNode,
} from './resource-source-address.js';

class ResourceIdentityPublication {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly identityHandle: IdentityHandle,
    readonly claimHandle: ClaimHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export class ResourceIdentityPublicationSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly primaryIdentityHandle: IdentityHandle | null,
    readonly claimHandles: readonly ClaimHandle[],
    readonly sourceAddressHandles: readonly (AddressHandle | null)[],
  ) {}
}

export class ResourceTargetPublication {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly targetReference: ResourceTargetReference | null,
    readonly identityHandle: IdentityHandle | null,
  ) {}
}

export class ResourceOpenSeamPublicationSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handles: readonly OpenSeamHandle[],
  ) {}
}

type ResourceRecognitionPublicationPhaseRecorder = <TValue>(
  name: ResourceRecognitionEmissionPhaseName,
  read: () => TValue,
) => TValue;

/** Publishes target, resource-identity, alias, pattern, and open-seam records for recognized resource carriers. */
export class ResourceRecognitionPublicationSupport {
  private readonly stagedRecordHandles = new Set<string>();

  constructor(
    readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
    readonly recordPhase: ResourceRecognitionPublicationPhaseRecorder = (_name, read) => read(),
  ) {}

  recordsForTarget(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    local: string,
  ): ResourceTargetPublication {
    const target = observation.definition?.target ?? null;
    if (target == null) {
      return new ResourceTargetPublication([], null, null);
    }

    const declarationIdentity = this.targetDeclarationIdentity(context, target);
    const targetSource = declarationIdentity == null
      ? sourceSpanAddressForNode(
          this.store,
          context,
          target.node,
          `resource-target:${local}`,
          SourceSpanRole.Name,
        )
      : null;
    const declarationSource = sourceSpanAddressForNode(
      this.store,
      context,
      target.declarationNode,
      `resource-target-declaration:${local}`,
      SourceSpanRole.Range,
    );
    const records = [
      ...(targetSource?.records ?? []),
      ...(declarationSource?.records ?? []),
    ];
    const addressHandle = declarationIdentity?.address.handle
      ?? targetSource?.addressHandle
      ?? null;
    const identityHandle = declarationIdentity?.identity.handle ?? null;
    const moduleKey = this.targetModuleKey(context, target);
    const targetReference = this.targetReferenceForObservation(
      context,
      target,
      local,
      addressHandle,
      declarationSource?.addressHandle ?? null,
      identityHandle,
      moduleKey,
    );
    appendDeclarationSourceRecords(
      this.publication,
      records,
      declarationIdentity,
      this.stagedRecordHandles,
    );
    return new ResourceTargetPublication(
      records,
      targetReference,
      identityHandle,
    );
  }

  recordsForResourceIdentities(
    context: ResourceRecognitionContext,
    observation: ResourceRecognitionObservation,
    local: string,
    productHandle: ProductHandle | null,
    declarationIdentityHandle: IdentityHandle | null,
    sourceAddressHandle: AddressHandle,
    provenanceHandle: ProvenanceHandle,
  ): ResourceIdentityPublicationSet {
    const definition = observation.definition;
    if (definition == null) {
      return new ResourceIdentityPublicationSet([], null, [], []);
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

    return this.recordsForNamedResourceIdentities(
      definition,
      local,
      productHandle,
      declarationIdentityHandle,
      sourceAddressHandle,
      provenanceHandle,
    );
  }

  recordsForOpenSeams(
    context: ResourceRecognitionContext,
    seams: readonly ResourceRecognitionOpen[],
    local: string,
  ): ResourceOpenSeamPublicationSet {
    const result = recordsForSourceOpenSeams(
      this.store,
      seams.map((seam, index) => ({
        localKey: `resource-open:${local}:${seam.openKind}:${index}`,
        openKind: seam.openKind,
        summary: seam.summary,
        sourceFileAddressHandle: context.sourceFileAddressHandle,
        start: seam.node.getStart(context.sourceFile),
        end: seam.node.end,
        evidenceRoles: [EvidenceRole.Diagnostic],
        reasonKinds: seam.reasonKinds,
      })),
    );
    return new ResourceOpenSeamPublicationSet(result.records, result.handles);
  }

  private targetDeclarationIdentity(
    context: ResourceRecognitionContext,
    target: ResourceTargetObservation,
  ): DeclarationSourcePublication | null {
    if (context.typeSystem == null || target.localName == null || target.declarationNode == null) {
      return null;
    }
    const symbol = context.typeSystem.readProgramAliasedSymbolAtLocation(target.node);
    if (symbol == null) {
      return null;
    }
    const declarations = symbol.declarations
      ?? (symbol.valueDeclaration == null ? [] : [symbol.valueDeclaration]);
    return sourceSpanForCheckerDeclaration(
      this.publication,
      context.typeSystem.checker,
      symbol,
      declarations,
      SourceSpanRole.Name,
    );
  }

  private targetModuleKey(
    context: ResourceRecognitionContext,
    target: ResourceTargetObservation,
  ): string | null {
    return target.declarationNode == null
      ? null
      : context.readAdmittedNodeContext(target.declarationNode)?.moduleKey ?? null;
  }

  private targetReferenceForObservation(
    context: ResourceRecognitionContext,
    target: ResourceTargetObservation,
    local: string,
    addressHandle: AddressHandle | null,
    declarationSourceAddressHandle: AddressHandle | null,
    identityHandle: IdentityHandle | null,
    moduleKey: string | null,
  ): ResourceTargetReference {
    return new ResourceTargetReference(
      identityHandle,
      addressHandle,
      target.localName,
      this.targetTypeReference(context, target, local, addressHandle, identityHandle),
      moduleKey,
      declarationSourceAddressHandle,
    );
  }

  private targetTypeReference(
    context: ResourceRecognitionContext,
    target: ResourceTargetObservation,
    local: string,
    addressHandle: AddressHandle | null,
    identityHandle: IdentityHandle | null,
  ): CheckerTypeReference | null {
    return this.recordPhase('kernel-emission:target-type-projection', () =>
      context.typeSystem == null
        ? null
        : projectTargetType(
          this.store,
          this.publication,
          context.typeSystem,
          target.node,
          local,
          addressHandle,
          identityHandle,
          target.localName,
        )
    );
  }

  private recordsForNamedResourceIdentities(
    definition: NamedResourceDefinitionHeader,
    local: string,
    productHandle: ProductHandle | null,
    declarationIdentityHandle: IdentityHandle | null,
    sourceAddressHandle: AddressHandle,
    provenanceHandle: ProvenanceHandle,
  ): ResourceIdentityPublicationSet {
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    const sourceAddressHandles: (AddressHandle | null)[] = [];
    let primaryIdentityHandle: IdentityHandle | null = null;
    const resourceKind = definition.type;
    const primaryNames = primaryResourceNames(definition);
    primaryNames.forEach((name, nameIndex) => {
      const publication = this.publishNamedResourceIdentity(
        local,
        resourceKind,
        name,
        nameIndex,
        productHandle ?? declarationIdentityHandle ?? sourceAddressHandle,
        declarationIdentityHandle,
        provenanceHandle,
      );
      primaryIdentityHandle ??= publication.identityHandle;
      claimHandles.push(publication.claimHandle);
      sourceAddressHandles.push(publication.sourceAddressHandle);
      records.push(...publication.records);

      if (nameIndex === 0 && name != null) {
        const aliases = this.recordsForAliases(
          definition.aliases,
          resourceKind,
          local,
          publication.identityHandle,
          declarationIdentityHandle,
          provenanceHandle,
        );
        claimHandles.push(...aliases.claimHandles);
        sourceAddressHandles.push(...aliases.sourceAddressHandles);
        records.push(...aliases.records);
      }
    });

    if (primaryNames.length === 0) {
      const publication = this.publishNamedResourceIdentity(
        local,
        resourceKind,
        null,
        0,
        productHandle ?? declarationIdentityHandle ?? sourceAddressHandle,
        declarationIdentityHandle,
        provenanceHandle,
        'anonymous',
      );
      primaryIdentityHandle = publication.identityHandle;
      claimHandles.push(publication.claimHandle);
      sourceAddressHandles.push(publication.sourceAddressHandle);
      records.push(...publication.records);
    }

    return new ResourceIdentityPublicationSet(records, primaryIdentityHandle, claimHandles, sourceAddressHandles);
  }

  private publishNamedResourceIdentity(
    local: string,
    resourceKind: NamedResourceDefinitionKind,
    name: string | null,
    nameIndex: number,
    subjectHandle: ClaimEndpointHandle,
    declarationIdentityHandle: IdentityHandle | null,
    provenanceHandle: ProvenanceHandle,
    claimSuffix: string = String(nameIndex),
  ): ResourceIdentityPublication {
    const identityHandle = this.store.handles.identity(resourceIdentityLocalKey(local, resourceKind, name, nameIndex));
    const claimHandle = this.store.handles.claim(`resource-declares:${local}:${claimSuffix}`);
    return new ResourceIdentityPublication(
      [
        new AureliaResourceIdentity(
          identityHandle,
          toAureliaResourceDeclarationKind(resourceKind),
          name,
          declarationIdentityHandle,
        ),
        new SemanticClaim(
          claimHandle,
          subjectHandle,
          KernelVocabulary.Resource.Declares.key,
          identityHandle,
          provenanceHandle,
        ),
      ],
      identityHandle,
      claimHandle,
      null,
    );
  }

  private recordsForAttributePatternIdentities(
    context: ResourceRecognitionContext,
    definition: AttributePatternDefinitionHeader,
    local: string,
    productHandle: ProductHandle | null,
    declarationIdentityHandle: IdentityHandle | null,
    sourceAddressHandle: AddressHandle,
    provenanceHandle: ProvenanceHandle,
  ): ResourceIdentityPublicationSet {
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    const sourceAddressHandles: (AddressHandle | null)[] = [];
    let primaryIdentityHandle: IdentityHandle | null = null;
    definition.patterns.forEach((pattern, patternIndex) => {
      const publication = this.publishAttributePatternIdentity(
        context,
        pattern,
        patternIndex,
        local,
        productHandle ?? declarationIdentityHandle ?? sourceAddressHandle,
        declarationIdentityHandle,
        provenanceHandle,
      );
      primaryIdentityHandle ??= publication.identityHandle;
      claimHandles.push(publication.claimHandle);
      sourceAddressHandles.push(publication.sourceAddressHandle);
      records.push(...publication.records);
    });

    return new ResourceIdentityPublicationSet(
      records,
      definition.patterns.length === 1 ? primaryIdentityHandle : null,
      claimHandles,
      sourceAddressHandles,
    );
  }

  private publishAttributePatternIdentity(
    context: ResourceRecognitionContext,
    pattern: AttributePatternObservation,
    patternIndex: number,
    local: string,
    subjectHandle: ClaimEndpointHandle,
    declarationIdentityHandle: IdentityHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): ResourceIdentityPublication {
    const addressHandle = this.store.handles.address(`resource-attribute-pattern:${local}:${patternIndex}`);
    const identityHandle = this.store.handles.identity(attributePatternIdentityLocalKey(local, pattern.pattern, pattern.symbols, patternIndex));
    const claimHandle = this.store.handles.claim(`resource-declares:${local}:attribute-pattern:${patternIndex}`);
    return new ResourceIdentityPublication(
      this.recordsForAttributePatternIdentity(
        context,
        pattern,
        addressHandle,
        identityHandle,
        claimHandle,
        subjectHandle,
        declarationIdentityHandle,
        provenanceHandle,
      ),
      identityHandle,
      claimHandle,
      addressHandle,
    );
  }

  private recordsForAttributePatternIdentity(
    context: ResourceRecognitionContext,
    pattern: AttributePatternObservation,
    addressHandle: AddressHandle,
    identityHandle: IdentityHandle,
    claimHandle: ClaimHandle,
    subjectHandle: ClaimEndpointHandle,
    declarationIdentityHandle: IdentityHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    const span = sourceSpanRangeForNode(context.sourceFile, pattern.node);
    if (span == null) {
      throw new Error('Attribute-pattern source node did not produce a valid authored span.');
    }
    return [
      new SourceSpanAddress(
        addressHandle,
        context.sourceFileAddressHandle,
        span.start,
        span.end,
        SourceSpanRole.Value,
      ),
      new AureliaAttributePatternIdentity(
        identityHandle,
        pattern.pattern,
        pattern.symbols,
        declarationIdentityHandle,
        addressHandle,
      ),
      new SemanticClaim(
        claimHandle,
        subjectHandle,
        KernelVocabulary.Resource.Declares.key,
        identityHandle,
        provenanceHandle,
      ),
    ];
  }

  private recordsForAliases(
    aliases: readonly ResourceAliasObservation[],
    resourceKind: NamedResourceDefinitionKind,
    local: string,
    canonicalIdentityHandle: IdentityHandle,
    declarationIdentityHandle: IdentityHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly claimHandles: readonly ClaimHandle[];
    readonly sourceAddressHandles: readonly (AddressHandle | null)[];
  } {
    const records: KernelStoreRecord[] = [];
    const claimHandles: ClaimHandle[] = [];
    const sourceAddressHandles: (AddressHandle | null)[] = [];
    aliases.forEach((alias, aliasIndex) => {
      const publication = this.publishResourceAliasIdentity(
        local,
        resourceKind,
        alias.name,
        aliasIndex,
        canonicalIdentityHandle,
        declarationIdentityHandle,
        provenanceHandle,
      );
      claimHandles.push(publication.claimHandle);
      sourceAddressHandles.push(publication.sourceAddressHandle);
      records.push(...publication.records);
    });
    return { records, claimHandles, sourceAddressHandles };
  }

  private publishResourceAliasIdentity(
    local: string,
    resourceKind: NamedResourceDefinitionKind,
    alias: string,
    aliasIndex: number,
    canonicalIdentityHandle: IdentityHandle,
    declarationIdentityHandle: IdentityHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): ResourceIdentityPublication {
    const identityLocal = `${resourceIdentityLocalKey(local, resourceKind, alias, aliasIndex)}:alias`;
    const aliasIdentityHandle = this.store.handles.identity(identityLocal);
    const aliasClaimHandle = this.store.handles.claim(`resource-alias:${local}:${aliasIndex}`);
    return new ResourceIdentityPublication(
      [
        new AureliaResourceIdentity(
          aliasIdentityHandle,
          toAureliaResourceDeclarationKind(resourceKind),
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
      ],
      aliasIdentityHandle,
      aliasClaimHandle,
      null,
    );
  }
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
  return `attribute-pattern-identity:${local}:${localKeyPart(pattern)}:${localKeyPart(symbols)}:${index}`;
}

function resourceIdentityLocalKey(
  local: string,
  resourceKind: string,
  name: string | null,
  index: number,
): string {
  return `resource-identity:${local}:${resourceKind}:${localKeyPart(name ?? 'anonymous')}:${index}`;
}

function projectTargetType(
  store: KernelStore,
  publication: KernelPublicationContext,
  typeSystem: TypeSystemProject,
  node: ts.Node,
  local: string,
  sourceAddressHandle: AddressHandle | null,
  ownerIdentityHandle: IdentityHandle | null,
  display: string | null,
): CheckerTypeReference | null {
  const type = typeSystem.readRuntimeTargetType(node);
  if (type == null) {
    return null;
  }
  const typeShape = new CheckerTypeProjector(store, publication).ensureProjection({
    localKey: `resource-target:${local}:runtime-type`,
    checker: typeSystem.checker,
    type,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: node,
    sourceAddressHandle,
    ownerIdentityHandle,
    display,
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  } satisfies CheckerTypeProjectionRequest);
  return typeShape.toReference();
}
