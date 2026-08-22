import {
  SourceFileAddress,
  type SourceFileRole,
} from '../kernel/address.js';
import type {
  ComputationGenerationAuthority,
  ComputationLifecycleRegistry,
  ComputationLocus,
} from '../kernel/computation-lifecycle.js';
import {
  computationCommitCurrentnessError,
  ComputationCommitState,
} from '../kernel/computation-lifecycle.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { KernelRecordHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import { KernelPublicationSurface } from '../kernel/publication-surface.js';
import { referencedKernelRecordHandles } from '../kernel/record-comparison.js';
import {
  externalizeSourceFileRole,
  inferSourceLanguage,
} from '../kernel/source-classification.js';
import { workspaceSourcePathForHostPath } from '../boot/source-ownership.js';
import { normalizeHostPath } from '../kernel/source-address.js';
import { canonicalTypeSystemSourcePath } from './source-file-path.js';
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

/** Program-source catalog bound to one exact admitted TypeSystem project generation. */
export interface TypeSystemProgramSourceGenerationCatalog extends TypeSystemProgramSourceCatalog {
  readonly borrowerKey: string;
}

/** Analysis-lifetime retirement surface for a stateful workspace program-source catalog. */
export interface TypeSystemProgramSourceRetentionCatalog extends TypeSystemProgramSourceCatalog {
  /** Bind every later checker-source observation to one exact TypeSystem project generation. */
  forProjectGeneration(projectKey: string, borrowerKey: string): TypeSystemProgramSourceGenerationCatalog;
  /** Retire identities not referenced by any currently retained TypeSystem project generation. */
  compactForActiveGenerations(activeBorrowerKeys: readonly string[]): TypeSystemProgramSourceCompaction;
  /** Number of materialized checker-only physical source identities retained by this catalog. */
  readProgramSourceEntryCount(): number;
}

/** Observable outcome of one best-effort checker-source retirement pass. */
export interface TypeSystemProgramSourceCompaction {
  readonly retiredEntries: number;
  readonly retainedReferencedEntries: number;
  readonly remainingEntries: number;
}

class TypeSystemProgramSourceEntry {
  readonly borrowerKeys = new Set<string>();

  constructor(
    readonly address: SourceFileAddress,
    readonly authority: ComputationGenerationAuthority,
    readonly recordHandles: ReadonlySet<KernelRecordHandle>,
    borrowerKey: string,
  ) {
    this.borrowerKeys.add(borrowerKey);
  }
}

class TypeSystemProgramSourceGenerationView implements TypeSystemProgramSourceGenerationCatalog {
  constructor(
    private readonly authority: TypeSystemProgramSourceAuthority,
    private readonly projectKey: string,
    readonly borrowerKey: string,
  ) {}

  sourceFile(
    publication: KernelPublicationContext,
    projectKey: string,
    fileName: string,
    role: SourceFileRole,
  ): TypeSystemProgramSourcePublication {
    if (projectKey !== this.projectKey) {
      throw new Error(
        `TypeSystem program-source generation ${this.borrowerKey} belongs to '${this.projectKey}', not '${projectKey}'.`,
      );
    }
    return this.authority.sourceFileForBorrower(publication, projectKey, this.borrowerKey, fileName, role);
  }
}

/**
 * Owns canonical physical checker-only source locations across retained TypeSystem generations in one analysis lifetime.
 *
 * Source text and TypeScript objects remain in their existing hosts and checker epochs. This authority owns only the
 * stable navigable file identity so no app generation becomes the first-owner of dependency or library locations.
 */
export class TypeSystemProgramSourceAuthority implements TypeSystemProgramSourceRetentionCatalog {
  private readonly entriesByPath = new Map<string, TypeSystemProgramSourceEntry>();

  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
    private readonly workspaceKey: string,
    private readonly workspaceRootDir: string | null = null,
  ) {}

  sourceFile(
    publication: KernelPublicationContext,
    projectKey: string,
    fileName: string,
    role: SourceFileRole,
  ): TypeSystemProgramSourcePublication {
    return this.sourceFileForBorrower(
      publication,
      projectKey,
      `unmanaged-project:${localKeyPart(projectKey)}`,
      fileName,
      role,
    );
  }

  forProjectGeneration(
    projectKey: string,
    borrowerKey: string,
  ): TypeSystemProgramSourceGenerationCatalog {
    return new TypeSystemProgramSourceGenerationView(this, projectKey, borrowerKey);
  }

  sourceFileForBorrower(
    _publication: KernelPublicationContext,
    _projectKey: string,
    borrowerKey: string,
    fileName: string,
    role: SourceFileRole,
  ): TypeSystemProgramSourcePublication {
    const sourceRole = externalizeSourceFileRole(role);
    const path = this.workspaceRootDir == null
      ? normalizeHostPath(fileName)
      : workspaceSourcePathForHostPath(this.workspaceRootDir, fileName);
    const identityPath = canonicalTypeSystemSourcePath(path);
    const existing = this.entriesByPath.get(identityPath) ?? null;
    if (existing?.authority.isCurrent() === true) {
      if (existing.address.role !== sourceRole) {
        throw new Error(
          `Checker-only source '${path}' was requested with conflicting project-independent roles `
          + `'${existing.address.role}' and '${sourceRole}'.`,
        );
      }
      existing.borrowerKeys.add(borrowerKey);
      return { address: existing.address, records: [] };
    }

    const local = typeSystemProgramSourceLocal(this.workspaceKey, identityPath);
    const address = typeSystemProgramSourceAddress(this.store, local, this.workspaceKey, path, sourceRole);
    const records = typeSystemProgramSourceRecords(this.store, local, address);
    const run = this.lifecycle.begin(typeSystemProgramSourceLocus(this.workspaceKey, identityPath));
    run.publish(new KernelPublicationPlan(new KernelStoreBatch(
      records,
      `type-system-program-source:${path}`,
    )));
    const commit = run.commit();
    if (commit.state !== ComputationCommitState.Committed) {
      throw computationCommitCurrentnessError(
        commit,
        `TypeSystem program source ${path} was rejected as ${commit.state}.`,
      );
    }
    const authority = this.lifecycle.admitCommittedGeneration(
      run.computationId,
      run.runSequence,
      'type-system-program-source',
    );
    this.entriesByPath.set(identityPath, new TypeSystemProgramSourceEntry(
      address,
      authority,
      new Set(records.map((record) => record.handle)),
      borrowerKey,
    ));
    return { address, records: [] };
  }

  readProgramSourceEntryCount(): number {
    return this.entriesByPath.size;
  }

  /**
   * Reclaim checker-only identities while retaining every path actually borrowed by an active TypeSystem generation.
   * Exact generation keys let a successful replacement discard its predecessor's obsolete dependency paths even when
   * the same logical project remains active.
   */
  compactForActiveGenerations(activeBorrowerKeys: readonly string[]): TypeSystemProgramSourceCompaction {
    const activeBorrowers = new Set(activeBorrowerKeys);
    let retired = 0;
    let retainedReferenced = 0;
    const retirementCandidates: [string, TypeSystemProgramSourceEntry][] = [];
    for (const candidate of this.entriesByPath) {
      const [, entry] = candidate;
      for (const borrowerKey of entry.borrowerKeys) {
        if (!activeBorrowers.has(borrowerKey)) {
          entry.borrowerKeys.delete(borrowerKey);
        }
      }
      if (entry.borrowerKeys.size > 0) {
        continue;
      }
      this.validateRetirementManifest(entry);
      retirementCandidates.push(candidate);
    }
    const retainedByReference = this.referencedRetirementCandidates(
      retirementCandidates.map(([, entry]) => entry),
    );
    for (const [identityPath, entry] of retirementCandidates) {
      if (retainedByReference.has(entry)) {
        retainedReferenced += 1;
        continue;
      }
      if (!this.lifecycle.retireCommittedGenerationAndForgetLocus(
        entry.authority.computationId,
        entry.authority.runSequence,
      )) {
        throw new Error(
          `Cannot compact checker-only source '${entry.address.path}' before its source generation retires.`,
        );
      }
      this.entriesByPath.delete(identityPath);
      retired += 1;
    }
    return Object.freeze({
      retiredEntries: retired,
      retainedReferencedEntries: retainedReferenced,
      remainingEntries: this.entriesByPath.size,
    });
  }

  /**
   * Exact source-publication preflight. A surviving structural reader is an expected deferral; a mismatched lifecycle
   * manifest is corruption and remains a hard invariant failure before retirement is attempted.
   */
  private validateRetirementManifest(entry: TypeSystemProgramSourceEntry): void {
    const state = this.lifecycle.readState(entry.authority.computationId);
    if (state == null) {
      return;
    }
    if (state.committedRunSequence !== entry.authority.runSequence) {
      throw new Error(
        `Checker-only source '${entry.address.path}' no longer owns its recorded computation generation.`,
      );
    }
    const manifestRecordHandles = new Set(state.publication.recordHandles);
    if (
      state.publication.productDetailHandles.length > 0
      || state.publication.hotDetailHandles.length > 0
      || manifestRecordHandles.size !== entry.recordHandles.size
      || [...manifestRecordHandles].some((handle) => !entry.recordHandles.has(handle))
    ) {
      throw new Error(
        `Checker-only source '${entry.address.path}' retained an unexpected publication manifest.`,
      );
    }
  }

  /** Find expected structural blockers for every retirement candidate in one bounded kernel scan. */
  private referencedRetirementCandidates(
    candidates: readonly TypeSystemProgramSourceEntry[],
  ): ReadonlySet<TypeSystemProgramSourceEntry> {
    if (candidates.length === 0) {
      return new Set();
    }
    const entryByRecordHandle = new Map<KernelRecordHandle, TypeSystemProgramSourceEntry>();
    for (const entry of candidates) {
      for (const handle of entry.recordHandles) {
        entryByRecordHandle.set(handle, entry);
      }
    }
    const retained = new Set<TypeSystemProgramSourceEntry>();
    for (const record of this.store.readAllRecords()) {
      for (const handle of referencedKernelRecordHandles(record)) {
        const entry = entryByRecordHandle.get(handle) ?? null;
        if (entry != null && !entry.recordHandles.has(record.handle)) {
          retained.add(entry);
        }
      }
    }
    for (const references of [
      ...this.store.productDetails.readEntries().map((detail) => detail.references),
      ...this.store.hotDetails.readEntries().map((detail) => detail.references),
    ]) {
      for (const reference of references) {
        if (reference.surface === KernelPublicationSurface.Record) {
          const entry = entryByRecordHandle.get(reference.handle) ?? null;
          if (entry != null) {
            retained.add(entry);
          }
        }
      }
    }
    return retained;
  }
}

/** Project-owned policy for isolated TypeSystem contracts that do not construct a workspace support authority. */
export const projectTypeSystemProgramSources: TypeSystemProgramSourceCatalog = {
  sourceFile(publication, projectKey, fileName, role) {
    const path = normalizeHostPath(fileName);
    const sourceRole = externalizeSourceFileRole(role);
    const local = typeSystemProgramSourceLocal(projectKey, path);
    const address = typeSystemProgramSourceAddress(publication, local, projectKey, path, sourceRole);
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
