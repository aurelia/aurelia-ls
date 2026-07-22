import { DiKeyIdentityKind, type DiKeyIdentity } from './identity.js';
import type { KernelRecordHandle } from './handles.js';
import {
  sameMaterializedProductValue,
  sameMaterializedProductWitness,
} from './materialization.js';
import {
  KernelPublicationDecisionKind,
  type KernelComparablePublicationDecision,
} from './publication-comparison.js';
import type { KernelStoreRecord } from './store.js';

/**
 * Compare normalized kernel records without collapsing semantic value and witness movement.
 *
 * This switch is deliberately exhaustive. A new kernel record discriminator must choose which fields are semantic
 * and which are source/provenance witnesses before replacement can claim retention.
 */
export function compareKernelRecords(
  previous: KernelStoreRecord,
  next: KernelStoreRecord,
): KernelComparablePublicationDecision {
  // Store comparison sees sealed records, so exact identity proves both semantic and witness equality.
  if (previous === next) {
    return KernelPublicationDecisionKind.Retain;
  }
  if (previous.kind !== next.kind) {
    return KernelPublicationDecisionKind.Replace;
  }

  switch (previous.kind) {
    case 'source-file-address': {
      const candidate = next as typeof previous;
      return sameValues(
        [previous.workspaceKey, previous.path, previous.language, previous.role],
        [candidate.workspaceKey, candidate.path, candidate.language, candidate.role],
      );
    }
    case 'source-span-address': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.fileHandle, previous.role], [candidate.fileHandle, candidate.role]),
        sameValues([previous.start, previous.end], [candidate.start, candidate.end]),
      );
    }
    case 'template-address': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.templateKey, previous.ownerIdentityHandle],
          [candidate.templateKey, candidate.ownerIdentityHandle],
        ),
        sameValues([previous.authoredSourceHandle], [candidate.authoredSourceHandle]),
      );
    }
    case 'template-node-address': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.templateHandle], [candidate.templateHandle]),
        sameArrays(previous.path, candidate.path)
          && previous.authoredSourceHandle === candidate.authoredSourceHandle
          ? KernelPublicationDecisionKind.Retain
          : KernelPublicationDecisionKind.Replace,
      );
    }
    case 'generated-address': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.localKey], [candidate.localKey]),
        sameValues([previous.anchorHandle], [candidate.anchorHandle]),
      );
    }
    case 'external-address': {
      const candidate = next as typeof previous;
      return sameValues(
        [previous.scheme, previous.value, previous.label],
        [candidate.scheme, candidate.value, candidate.label],
      );
    }
    case 'typescript-declaration-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.moduleKey, previous.exportedName, previous.localName],
          [candidate.moduleKey, candidate.exportedName, candidate.localName],
        ),
        sameValues([previous.declarationAddressHandle], [candidate.declarationAddressHandle]),
      );
    }
    case 'aurelia-resource-identity': {
      const candidate = next as typeof previous;
      return sameValues(
        [previous.resourceKind, previous.name, previous.declarationHandle],
        [candidate.resourceKind, candidate.name, candidate.declarationHandle],
      );
    }
    case 'aurelia-attribute-pattern-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.pattern, previous.symbols, previous.declarationHandle],
          [candidate.pattern, candidate.symbols, candidate.declarationHandle],
        ),
        sameValues([previous.definitionAddressHandle], [candidate.definitionAddressHandle]),
      );
    }
    case 'container-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.containerKind, previous.parentHandle, previous.rootHandle, previous.localName],
          [candidate.containerKind, candidate.parentHandle, candidate.rootHandle, candidate.localName],
        ),
        sameValues([previous.sourceAddressHandle], [candidate.sourceAddressHandle]),
      );
    }
    case 'di-product-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.productKindKey, previous.containerHandle, previous.ownerHandle],
          [candidate.productKindKey, candidate.containerHandle, candidate.ownerHandle],
        ),
        sameValues([previous.sourceAddressHandle], [candidate.sourceAddressHandle]),
      );
    }
    case 'di-key-identity':
      return compareDiKeyIdentities(previous, next as DiKeyIdentity);
    case 'registration-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.keyHandle], [candidate.keyHandle]),
        sameValues([previous.sourceAddressHandle], [candidate.sourceAddressHandle]),
      );
    }
    case 'resource-product-identity':
    case 'evaluation-identity':
    case 'observation-identity':
    case 'configuration-identity':
    case 'framework-identity':
    case 'router-identity':
    case 'route-recognizer-identity':
    case 'i18n-identity':
    case 'state-identity':
    case 'validation-identity':
    case 'fetch-client-identity':
    case 'dialog-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.productKindKey, previous.ownerHandle, previous.localName],
          [candidate.productKindKey, candidate.ownerHandle, candidate.localName],
        ),
        sameValues([previous.sourceAddressHandle], [candidate.sourceAddressHandle]),
      );
    }
    case 'compiler-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.productKindKey, previous.ownerHandle, previous.localName],
          [candidate.productKindKey, candidate.ownerHandle, candidate.localName],
        ),
        sameValues([previous.addressHandle], [candidate.addressHandle]),
      );
    }
    case 'template-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.ownerHandle, previous.phase], [candidate.ownerHandle, candidate.phase]),
        sameValues([previous.addressHandle], [candidate.addressHandle]),
      );
    }
    case 'template-node-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.templateHandle, previous.nodeKey], [candidate.templateHandle, candidate.nodeKey]),
        sameValues([previous.addressHandle], [candidate.addressHandle]),
      );
    }
    case 'binding-identity': {
      const candidate = next as typeof previous;
      return sameValues(
        [previous.ownerHandle, previous.bindingKindKey],
        [candidate.ownerHandle, candidate.bindingKindKey],
      );
    }
    case 'instruction-identity': {
      const candidate = next as typeof previous;
      return sameValues(
        [previous.ownerHandle, previous.instructionKindKey],
        [candidate.ownerHandle, candidate.instructionKindKey],
      );
    }
    case 'type-system-identity': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.productKindKey, previous.semanticTypeKey, previous.ownerHandle, previous.display],
          [candidate.productKindKey, candidate.semanticTypeKey, candidate.ownerHandle, candidate.display],
        ),
        sameValues([previous.sourceAddressHandle], [candidate.sourceAddressHandle]),
      );
    }
    case 'evidence-record': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.evidenceKind, previous.summary, previous.identityHandle],
          [candidate.evidenceKind, candidate.summary, candidate.identityHandle],
        ) && sameArrays(previous.roles, candidate.roles)
          ? KernelPublicationDecisionKind.Retain
          : KernelPublicationDecisionKind.Replace,
        sameValues([previous.addressHandle], [candidate.addressHandle]),
      );
    }
    case 'provenance-record': {
      const candidate = next as typeof previous;
      return sameArrays(previous.evidenceHandles, candidate.evidenceHandles)
        ? KernelPublicationDecisionKind.Retain
        : KernelPublicationDecisionKind.RefreshWitness;
    }
    case 'semantic-claim': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.subjectHandle, previous.predicateKey, previous.objectHandle],
          [candidate.subjectHandle, candidate.predicateKey, candidate.objectHandle],
        ),
        sameValues([previous.provenanceHandle], [candidate.provenanceHandle]),
      );
    }
    case 'open-seam': {
      const candidate = next as typeof previous;
      const semantic = previous.seamKindKey === candidate.seamKindKey
        && previous.summary === candidate.summary
        && sameArrays(previous.reasonKinds, candidate.reasonKinds);
      const witness = previous.addressHandle === candidate.addressHandle
        && previous.evidenceHandle === candidate.evidenceHandle
        && sameReasonSources(previous.reasonSources, candidate.reasonSources);
      return semanticThenWitness(
        semantic ? KernelPublicationDecisionKind.Retain : KernelPublicationDecisionKind.Replace,
        witness ? KernelPublicationDecisionKind.Retain : KernelPublicationDecisionKind.Replace,
      );
    }
    case 'materialized-product': {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameMaterializedProductValue(previous, candidate)
          ? KernelPublicationDecisionKind.Retain
          : KernelPublicationDecisionKind.Replace,
        sameMaterializedProductWitness(previous, candidate)
          ? KernelPublicationDecisionKind.Retain
          : KernelPublicationDecisionKind.Replace,
      );
    }
    case 'materialization-record': {
      const candidate = next as typeof previous;
      const same = previous.ownerHandle === candidate.ownerHandle
        && sameArrays(previous.productHandles, candidate.productHandles)
        && sameArrays(previous.claimHandles, candidate.claimHandles)
        && sameArrays(previous.openSeamHandles, candidate.openSeamHandles);
      return same ? KernelPublicationDecisionKind.Retain : KernelPublicationDecisionKind.Replace;
    }
  }
}

/** Handles that must remain resolvable while a normalized record survives replacement. */
export function referencedKernelRecordHandles(record: KernelStoreRecord): readonly KernelRecordHandle[] {
  switch (record.kind) {
    case 'source-file-address':
    case 'external-address':
      return [];
    case 'source-span-address':
      return [record.fileHandle];
    case 'template-address':
      return compactHandles(record.ownerIdentityHandle, record.authoredSourceHandle);
    case 'template-node-address':
      return compactHandles(record.templateHandle, record.authoredSourceHandle);
    case 'generated-address':
      return compactHandles(record.anchorHandle);
    case 'typescript-declaration-identity':
      return compactHandles(record.declarationAddressHandle);
    case 'aurelia-resource-identity':
      return compactHandles(record.declarationHandle);
    case 'aurelia-attribute-pattern-identity':
      return compactHandles(record.declarationHandle, record.definitionAddressHandle);
    case 'container-identity':
      return compactHandles(record.parentHandle, record.rootHandle, record.sourceAddressHandle);
    case 'di-product-identity':
      return compactHandles(record.containerHandle, record.ownerHandle, record.sourceAddressHandle);
    case 'di-key-identity':
      return diKeyIdentityReferences(record);
    case 'registration-identity':
      return compactHandles(record.keyHandle, record.sourceAddressHandle);
    case 'resource-product-identity':
    case 'observation-identity':
    case 'configuration-identity':
    case 'framework-identity':
    case 'router-identity':
    case 'route-recognizer-identity':
    case 'i18n-identity':
    case 'state-identity':
    case 'validation-identity':
    case 'fetch-client-identity':
    case 'dialog-identity':
      return compactHandles(record.ownerHandle, record.sourceAddressHandle);
    case 'evaluation-identity':
      return compactHandles(record.ownerHandle, record.sourceAddressHandle);
    case 'compiler-identity':
      return compactHandles(record.ownerHandle, record.addressHandle);
    case 'template-identity':
      return compactHandles(record.ownerHandle, record.addressHandle);
    case 'template-node-identity':
      return compactHandles(record.templateHandle, record.addressHandle);
    case 'binding-identity':
    case 'instruction-identity':
      return [record.ownerHandle];
    case 'type-system-identity':
      return compactHandles(record.ownerHandle, record.sourceAddressHandle);
    case 'evidence-record':
      return compactHandles(record.addressHandle, record.identityHandle);
    case 'provenance-record':
      return record.evidenceHandles;
    case 'semantic-claim':
      return [record.subjectHandle, record.objectHandle, record.provenanceHandle];
    case 'open-seam':
      return compactHandles(
        record.addressHandle,
        record.evidenceHandle,
        ...record.reasonSources.flatMap((source) => [source.addressHandle, source.evidenceHandle ?? null]),
      );
    case 'materialized-product':
      return compactHandles(record.identityHandle, record.addressHandle, record.provenanceHandle);
    case 'materialization-record':
      return [
        record.ownerHandle,
        ...record.productHandles,
        ...record.claimHandles,
        ...record.openSeamHandles,
      ];
  }
}

function compareDiKeyIdentities(
  previous: DiKeyIdentity,
  next: DiKeyIdentity,
): KernelComparablePublicationDecision {
  if (previous.keyKind !== next.keyKind) {
    return KernelPublicationDecisionKind.Replace;
  }
  switch (previous.keyKind) {
    case DiKeyIdentityKind.Unknown: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.summary], [candidate.summary]),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
    case DiKeyIdentityKind.Constructable: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.declarationHandle, previous.localName],
          [candidate.declarationHandle, candidate.localName],
        ),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
    case DiKeyIdentityKind.Interface: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.interfaceName, previous.declarationHandle],
          [candidate.interfaceName, candidate.declarationHandle],
        ),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
    case DiKeyIdentityKind.String: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.value], [candidate.value]),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
    case DiKeyIdentityKind.Symbol: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.symbolKind, previous.declarationHandle, previous.symbolName],
          [candidate.symbolKind, candidate.declarationHandle, candidate.symbolName],
        ),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
    case DiKeyIdentityKind.Object: {
      const candidate = next as typeof previous;
      return sameValues(
        [previous.creationAddressHandle],
        [candidate.creationAddressHandle],
      );
    }
    case DiKeyIdentityKind.Primitive: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues([previous.valueKind, previous.value], [candidate.valueKind, candidate.value]),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
    case DiKeyIdentityKind.Resource: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.resourceHandle, previous.resourceKey],
          [candidate.resourceHandle, candidate.resourceKey],
        ),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
    case DiKeyIdentityKind.ResolverKey: {
      const candidate = next as typeof previous;
      return semanticThenWitness(
        sameValues(
          [previous.resolverKind, previous.innerKeyHandle],
          [candidate.resolverKind, candidate.innerKeyHandle],
        ),
        sameValues([previous.keyAddressHandle], [candidate.keyAddressHandle]),
      );
    }
  }
}

function diKeyIdentityReferences(identity: DiKeyIdentity): readonly KernelRecordHandle[] {
  switch (identity.keyKind) {
    case DiKeyIdentityKind.Unknown:
    case DiKeyIdentityKind.String:
      return compactHandles(identity.keyAddressHandle);
    case DiKeyIdentityKind.Object:
      return compactHandles(identity.creationAddressHandle);
    case DiKeyIdentityKind.Primitive:
      return compactHandles(identity.keyAddressHandle);
    case DiKeyIdentityKind.Constructable:
      return compactHandles(identity.declarationHandle, identity.keyAddressHandle);
    case DiKeyIdentityKind.Interface:
      return compactHandles(identity.declarationHandle, identity.keyAddressHandle);
    case DiKeyIdentityKind.Symbol:
      return compactHandles(identity.declarationHandle, identity.keyAddressHandle);
    case DiKeyIdentityKind.Resource:
      return compactHandles(identity.resourceHandle, identity.keyAddressHandle);
    case DiKeyIdentityKind.ResolverKey:
      return compactHandles(identity.innerKeyHandle, identity.keyAddressHandle);
  }
}

function semanticThenWitness(
  semantic: KernelComparablePublicationDecision,
  witness: KernelComparablePublicationDecision,
): KernelComparablePublicationDecision {
  if (semantic !== KernelPublicationDecisionKind.Retain) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witness === KernelPublicationDecisionKind.Retain
    ? KernelPublicationDecisionKind.Retain
    : KernelPublicationDecisionKind.RefreshWitness;
}

function sameValues(
  previous: readonly unknown[],
  next: readonly unknown[],
): KernelComparablePublicationDecision {
  return sameArrays(previous, next)
    ? KernelPublicationDecisionKind.Retain
    : KernelPublicationDecisionKind.Replace;
}

function sameArrays<TValue>(previous: readonly TValue[], next: readonly TValue[]): boolean {
  return previous.length === next.length
    && previous.every((value, index) => value === next[index]);
}

function sameReasonSources(
  previous: readonly { readonly reasonKind: string; readonly summary: string; readonly addressHandle: string | null; readonly evidenceHandle?: string | null }[],
  next: readonly { readonly reasonKind: string; readonly summary: string; readonly addressHandle: string | null; readonly evidenceHandle?: string | null }[],
): boolean {
  return previous.length === next.length
    && previous.every((source, index) => {
      const candidate = next[index];
      return candidate != null
        && source.reasonKind === candidate.reasonKind
        && source.summary === candidate.summary
        && source.addressHandle === candidate.addressHandle
        && (source.evidenceHandle ?? null) === (candidate.evidenceHandle ?? null);
    });
}

function compactHandles(
  ...handles: readonly (KernelRecordHandle | null | undefined)[]
): readonly KernelRecordHandle[] {
  return handles.filter((handle): handle is KernelRecordHandle => handle != null);
}
