import {
  SourceFileAddress,
  SourceFileRole,
} from '../kernel/address.js';
import type {
  ComputationGenerationAuthority,
  ComputationLifecycleRegistry,
  ComputationLocus,
} from '../kernel/computation-lifecycle.js';
import {
  ComputationCommitState,
} from '../kernel/computation-lifecycle.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  inferSourceLanguage,
} from '../kernel/source-classification.js';
import { normalizeHostPath } from '../kernel/source-address.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';

export interface TypeSystemProgramSourcePublication {
  readonly address: SourceFileAddress;
  readonly records: readonly KernelStoreRecord[];
}

/** Ownership policy for checker-only physical source files that boot did not admit as app source. */
export interface TypeSystemProgramSourceCatalog {
  sourceFile(
    publication: KernelPublicationContext,
    projectKey: string,
    fileName: string,
    role: SourceFileRole,
  ): TypeSystemProgramSourcePublication;
}

class TypeSystemProgramSourceEntry {
  constructor(
    readonly address: SourceFileAddress,
    readonly authority: ComputationGenerationAuthority,
  ) {}
}

/**
 * Owns canonical physical checker-only source locations for the workspace lifetime.
 *
 * Source text and TypeScript objects remain in their existing hosts and checker epochs. This authority owns only the
 * stable navigable file identity so no app generation becomes the first-owner of dependency or library locations.
 */
export class TypeSystemProgramSourceAuthority implements TypeSystemProgramSourceCatalog {
  private readonly entriesByPath = new Map<string, TypeSystemProgramSourceEntry>();

  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
    private readonly workspaceKey: string,
  ) {}

  sourceFile(
    _publication: KernelPublicationContext,
    _projectKey: string,
    fileName: string,
    role: SourceFileRole,
  ): TypeSystemProgramSourcePublication {
    const path = normalizeHostPath(fileName);
    const existing = this.entriesByPath.get(path) ?? null;
    if (existing?.authority.isCurrent() === true) {
      return { address: existing.address, records: [] };
    }

    const local = typeSystemProgramSourceLocal(this.workspaceKey, path);
    const address = typeSystemProgramSourceAddress(this.store, local, this.workspaceKey, path, role);
    const run = this.lifecycle.begin(typeSystemProgramSourceLocus(this.workspaceKey, path));
    run.publish(new KernelPublicationPlan(new KernelStoreBatch(
      typeSystemProgramSourceRecords(this.store, local, address),
      `type-system-program-source:${path}`,
    )));
    const commit = run.commit();
    if (commit.state !== ComputationCommitState.Committed) {
      throw new Error(`TypeSystem program source ${path} was rejected as ${commit.state}.`);
    }
    const authority = this.lifecycle.admitCommittedGeneration(
      run.computationId,
      run.runSequence,
      'type-system-program-source',
    );
    this.entriesByPath.set(path, new TypeSystemProgramSourceEntry(address, authority));
    return { address, records: [] };
  }
}

/** Project-owned policy for isolated TypeSystem contracts that do not construct a workspace support authority. */
export const projectTypeSystemProgramSources: TypeSystemProgramSourceCatalog = {
  sourceFile(publication, projectKey, fileName, role) {
    const path = normalizeHostPath(fileName);
    const local = typeSystemProgramSourceLocal(projectKey, path);
    const address = typeSystemProgramSourceAddress(publication, local, projectKey, path, role);
    const existing = publication.read(address.handle);
    return existing instanceof SourceFileAddress
      ? { address: existing, records: [] }
      : {
          address,
          records: typeSystemProgramSourceRecords(publication, local, address),
        };
  },
};

function typeSystemProgramSourceLocus(workspaceKey: string, path: string): ComputationLocus {
  return {
    kind: 'type-system-program-source',
    reconciliationKey: `${workspaceKey}:${path}`,
    summary: `Canonical checker-only source location ${path}.`,
  };
}

function typeSystemProgramSourceLocal(ownerKey: string, path: string): string {
  return `type-system-program-source:${localKeyPart(ownerKey)}:${localKeyPart(path)}`;
}

function typeSystemProgramSourceAddress(
  store: Pick<KernelStore, 'handles'>,
  local: string,
  ownerKey: string,
  path: string,
  role: SourceFileRole,
): SourceFileAddress {
  return new SourceFileAddress(
    store.handles.address(local),
    ownerKey,
    path,
    inferSourceLanguage(path),
    role,
  );
}

function typeSystemProgramSourceRecords(
  store: Pick<KernelStore, 'handles'>,
  local: string,
  address: SourceFileAddress,
): readonly KernelStoreRecord[] {
  const evidenceHandle = store.handles.evidence(local);
  return [
    address,
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SourceObservation,
      [EvidenceRole.Admission],
      'Physical source file observed through a TypeScript Program.',
      address.handle,
    ),
    new ProvenanceRecord(
      store.handles.provenance(local),
      [evidenceHandle],
    ),
  ];
}
