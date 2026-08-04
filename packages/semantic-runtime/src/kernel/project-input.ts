import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import {
  ComputationReadValidationScope,
  type ComputationRead,
  type ComputationReadValidation,
} from './computation-lifecycle.js';
import {
  combineGenerationCurrentnessWitnesses,
  GenerationCurrentnessClock,
  type GenerationAuthority,
  type GenerationCurrentnessWitness,
} from './generation-authority.js';
import { sourceTextContentRevision } from './source-text-revision.js';

/** Optional non-filesystem source values layered over the host filesystem, such as open editor documents. */
export interface SemanticRuntimeSourceTextOverlay {
  /** Return complete source text, or `undefined` when this overlay has no value for the path. */
  readFile(fileName: string): string | undefined;
  /** Return explicit overlay existence, or `undefined` when filesystem authority should decide. */
  fileExists(fileName: string): boolean | undefined;
}

/** Complete host view consumed by one captured project-input generation. */
export interface SemanticRuntimeProjectInputHost {
  readFile(fileName: string): string | undefined;
  fileExists(fileName: string): boolean;
  readDirectory(directoryName: string): readonly string[];
  directoryExists(directoryName: string): boolean;
  realpath(fileName: string): string;
  matchFiles(
    rootDir: string,
    extensions?: readonly string[],
    excludes?: readonly string[],
    includes?: readonly string[],
    depth?: number,
  ): readonly string[];
}

/** Uncaptured Node host used for boot topology and as the live source behind a runtime input authority. */
export class NodeSemanticRuntimeProjectInputHost implements SemanticRuntimeProjectInputHost {
  constructor(
    private readonly sourceTextOverlay: SemanticRuntimeSourceTextOverlay | null = null,
  ) {}

  readFile(fileName: string): string | undefined {
    const overlayExists = this.sourceTextOverlay?.fileExists(fileName);
    if (overlayExists === false) {
      return undefined;
    }
    const overlayText = this.sourceTextOverlay?.readFile(fileName);
    if (overlayText !== undefined) {
      return overlayText;
    }
    if (overlayExists === true) {
      return undefined;
    }
    try {
      return readFileSync(fileName, 'utf8');
    } catch {
      return undefined;
    }
  }

  fileExists(fileName: string): boolean {
    const overlayExists = this.sourceTextOverlay?.fileExists(fileName);
    return overlayExists ?? existsSync(fileName);
  }

  readDirectory(directoryName: string): readonly string[] {
    try {
      return readdirSync(directoryName).sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
  }

  directoryExists(directoryName: string): boolean {
    try {
      return statSync(directoryName).isDirectory();
    } catch {
      return false;
    }
  }

  realpath(fileName: string): string {
    try {
      return realpathSync.native(fileName);
    } catch {
      return resolveProjectInputPath(fileName);
    }
  }

  matchFiles(
    rootDir: string,
    extensions: readonly string[] = [],
    excludes: readonly string[] = [],
    includes: readonly string[] = [],
    depth?: number,
  ): readonly string[] {
    return ts.sys.readDirectory(rootDir, extensions, excludes, includes, depth);
  }
}

export const nodeSemanticRuntimeProjectInputHost = new NodeSemanticRuntimeProjectInputHost();

/** Stable boot-level project identity used to capture a source/config generation. */
export interface SemanticRuntimeProjectInputScope {
  readonly projectKey: string;
  readonly rootDir: string;
}

/** Stable workspace-level identity used to capture project/source discovery before project keys exist. */
export interface SemanticRuntimeWorkspaceInputScope {
  readonly workspaceInputKey: string;
  readonly rootDir: string;
}

export const enum SemanticRuntimeProjectInputReadKind {
  /** Complete file text, including a negative read when the file is absent or unreadable. */
  FileContent = 'file-content',
  /** Effective file existence after applying the admitted source overlay. */
  FileExistence = 'file-existence',
  /** Immediate directory entry membership. */
  DirectoryEntries = 'directory-entries',
  /** Directory existence. */
  DirectoryExistence = 'directory-existence',
  /** Canonical host path for an existing path. */
  Realpath = 'realpath',
  /** Recursive host file match used by configuration parsing. */
  MatchedFiles = 'matched-files',
}

export interface SemanticRuntimeProjectInputFileContentReadDescriptor {
  readonly kind: SemanticRuntimeProjectInputReadKind.FileContent;
  readonly fileName: string;
}

export interface SemanticRuntimeProjectInputFileExistenceReadDescriptor {
  readonly kind: SemanticRuntimeProjectInputReadKind.FileExistence;
  readonly fileName: string;
}

export interface SemanticRuntimeProjectInputDirectoryEntriesReadDescriptor {
  readonly kind: SemanticRuntimeProjectInputReadKind.DirectoryEntries;
  readonly directoryName: string;
}

export interface SemanticRuntimeProjectInputDirectoryExistenceReadDescriptor {
  readonly kind: SemanticRuntimeProjectInputReadKind.DirectoryExistence;
  readonly directoryName: string;
}

export interface SemanticRuntimeProjectInputRealpathReadDescriptor {
  readonly kind: SemanticRuntimeProjectInputReadKind.Realpath;
  readonly fileName: string;
}

export interface SemanticRuntimeProjectInputMatchedFilesReadDescriptor {
  readonly kind: SemanticRuntimeProjectInputReadKind.MatchedFiles;
  readonly rootDir: string;
  readonly extensions: readonly string[];
  readonly excludes: readonly string[];
  readonly includes: readonly string[];
  readonly depth: number | null;
}

/** Complete, immutable host request classified by project-input currentness policy. */
export type SemanticRuntimeProjectInputReadDescriptor =
  | SemanticRuntimeProjectInputFileContentReadDescriptor
  | SemanticRuntimeProjectInputFileExistenceReadDescriptor
  | SemanticRuntimeProjectInputDirectoryEntriesReadDescriptor
  | SemanticRuntimeProjectInputDirectoryExistenceReadDescriptor
  | SemanticRuntimeProjectInputRealpathReadDescriptor
  | SemanticRuntimeProjectInputMatchedFilesReadDescriptor;

export const enum SemanticRuntimeProjectInputCurrentnessMode {
  /** Mutable host input is reread and compared exactly on every independent currentness proof. */
  PullValidated = 'pull-validated',
  /** The host guarantees that every mutation affecting this exact request revokes the event generation. */
  PushObserved = 'push-observed',
  /** The exact request is immutable for the lifetime of one explicitly identified session snapshot. */
  SessionSnapshot = 'session-snapshot',
}

export interface SemanticRuntimeProjectInputPullValidatedCurrentness {
  readonly mode: SemanticRuntimeProjectInputCurrentnessMode.PullValidated;
}

export interface SemanticRuntimeProjectInputPushObservedCurrentness {
  readonly mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved;
}

export interface SemanticRuntimeProjectInputSessionSnapshotCurrentness {
  readonly mode: SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot;
  readonly snapshotIdentity: string;
}

/** Closed authority attached to one exact project-input read. */
export type SemanticRuntimeProjectInputReadCurrentness =
  | SemanticRuntimeProjectInputPullValidatedCurrentness
  | SemanticRuntimeProjectInputPushObservedCurrentness
  | SemanticRuntimeProjectInputSessionSnapshotCurrentness;

/**
 * Host-supplied evidence for reads that can safely avoid the pull-validated default.
 *
 * Classification must remain deterministic for one event generation. A mode or snapshot-identity transition must be
 * synchronized with `advance()` so no capture or validation can observe it before revocation; same-generation
 * validation deliberately does not re-enter host policy. A snapshot identity names immutable input output, not merely
 * the mutable session that happens to expose it.
 */
export interface SemanticRuntimeProjectInputCurrentnessPolicy {
  readonly authorityForRead: (
    descriptor: SemanticRuntimeProjectInputReadDescriptor,
  ) => SemanticRuntimeProjectInputReadCurrentness | null | undefined;
}

/** Semantic impact carried by one explicit host-input event. */
export const enum SemanticRuntimeProjectInputChangeKind {
  /**
   * Content at one exact file path may have changed, or currentness transferred between an overlay and its host.
   * File identity, directory entries, matched files, project roots, and authored-source membership did not change.
   */
  FileValue = 'file-value',
  /**
   * A create/delete or topology-bearing configuration value may have changed workspace/source membership.
   * This remains deliberately broad until a host can prove narrower directory-membership consequences.
   */
  StructuralMembership = 'structural-membership',
}

/** One owner-declared project-input change, normalized into the host identity space used by captured reads. */
export class SemanticRuntimeProjectInputChange {
  readonly path: string;
  readonly pathKey: string;

  constructor(
    readonly kind: SemanticRuntimeProjectInputChangeKind,
    fileName: string,
  ) {
    this.path = resolveProjectInputPath(fileName);
    this.pathKey = projectInputPathKey(this.path);
    Object.freeze(this);
  }
}

type ProjectInputReadValue = string | boolean | readonly string[] | undefined;

const PULL_VALIDATED_CURRENTNESS: SemanticRuntimeProjectInputPullValidatedCurrentness = Object.freeze({
  mode: SemanticRuntimeProjectInputCurrentnessMode.PullValidated,
});
const PUSH_OBSERVED_CURRENTNESS: SemanticRuntimeProjectInputPushObservedCurrentness = Object.freeze({
  mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved,
});

/** Exact positive or negative host read retained by one project-input generation. */
export class SemanticRuntimeProjectInputRead implements ComputationRead {
  readonly domain = 'project-input';
  readonly observedRevision: string;
  readonly kind: SemanticRuntimeProjectInputReadKind;

  constructor(
    private readonly authority: SemanticRuntimeProjectInputAuthority,
    readonly descriptor: SemanticRuntimeProjectInputReadDescriptor,
    readonly readKey: string,
    private readonly readCurrent: () => ProjectInputReadValue,
    readonly value: ProjectInputReadValue,
    readonly currentnessAuthority: SemanticRuntimeProjectInputReadCurrentness,
    private readonly currentnessWitness: GenerationCurrentnessWitness,
    private readonly observedEventSequence: number,
  ) {
    this.kind = descriptor.kind;
    this.observedRevision = projectInputValueRevision(value);
  }

  validate(): ComputationReadValidation {
    if (!this.currentnessWitness.isCurrent()) {
      return {
        isCurrent: false,
        currentRevision: `event:${this.authority.currentEventSequence}`,
        changedFacets: [this.kind],
      };
    }
    if (this.currentnessAuthority.mode !== SemanticRuntimeProjectInputCurrentnessMode.PullValidated) {
      return {
        isCurrent: true,
        currentRevision: this.observedRevision,
        changedFacets: [],
      };
    }
    const currentValue = freezeProjectInputReadValue(this.readCurrent());
    const isCurrent = sameProjectInputReadValue(this.value, currentValue);
    const currentRevision = isCurrent ? this.observedRevision : projectInputValueRevision(currentValue);
    return {
      isCurrent,
      currentRevision,
      changedFacets: isCurrent ? [] : [this.kind],
    };
  }

  /**
   * Validate the exact observed value independently from the computation generation that first consumed it.
   *
   * Source-world receipts use this boundary because an unrelated project event may retire a computation generation
   * without changing a directory, marker, native exclusion, or source-membership read. Pull-owned values remain exact;
   * push-owned values use the declared read-level event coverage; immutable snapshots use their explicit identity.
   */
  validateObservedValue(): ComputationReadValidation {
    const currentnessAuthority = this.authority.currentnessForRead(this.descriptor);
    if (!sameProjectInputReadCurrentness(this.currentnessAuthority, currentnessAuthority)) {
      const currentValue = freezeProjectInputReadValue(this.readCurrent());
      const isCurrent = sameProjectInputReadValue(this.value, currentValue);
      return {
        isCurrent,
        currentRevision: isCurrent ? this.observedRevision : projectInputValueRevision(currentValue),
        changedFacets: isCurrent ? [] : [this.kind],
      };
    }
    switch (currentnessAuthority.mode) {
      case SemanticRuntimeProjectInputCurrentnessMode.PullValidated: {
        const currentValue = freezeProjectInputReadValue(this.readCurrent());
        const isCurrent = sameProjectInputReadValue(this.value, currentValue);
        return {
          isCurrent,
          currentRevision: isCurrent ? this.observedRevision : projectInputValueRevision(currentValue),
          changedFacets: isCurrent ? [] : [this.kind],
        };
      }
      case SemanticRuntimeProjectInputCurrentnessMode.PushObserved: {
        const isCurrent = !this.authority.mayHaveChanged(this.descriptor, this.observedEventSequence);
        return {
          isCurrent,
          currentRevision: isCurrent ? this.observedRevision : `event:${this.authority.currentEventSequence}`,
          changedFacets: isCurrent ? [] : [this.kind],
        };
      }
      case SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot:
        return {
          isCurrent: true,
          currentRevision: this.observedRevision,
          changedFacets: [],
        };
    }
  }

  tryRebaseCurrent(): SemanticRuntimeProjectInputRead | null {
    if (!this.currentnessWitness.isCurrent()) {
      return null;
    }
    if (this.currentnessAuthority.mode !== SemanticRuntimeProjectInputCurrentnessMode.PullValidated) {
      return this;
    }
    const currentValue = freezeProjectInputReadValue(this.readCurrent());
    return sameProjectInputReadValue(this.value, currentValue) ? this : null;
  }

  /** Re-capture this exact input under a specific current project generation. */
  tryRebaseForGeneration(
    currentnessWitness: GenerationCurrentnessWitness,
    eventSequence: number,
    currentnessAuthority: SemanticRuntimeProjectInputReadCurrentness,
  ): SemanticRuntimeProjectInputRead | null {
    const canReuseObservedValue = sameProjectInputReadCurrentness(
      this.currentnessAuthority,
      currentnessAuthority,
    ) && (
      currentnessAuthority.mode === SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot
      || (
        currentnessAuthority.mode === SemanticRuntimeProjectInputCurrentnessMode.PushObserved
        && !this.authority.mayHaveChanged(this.descriptor, this.observedEventSequence)
      )
    );
    const currentValue = canReuseObservedValue
      ? this.value
      : freezeProjectInputReadValue(this.readCurrent());
    return sameProjectInputReadValue(this.value, currentValue)
      ? new SemanticRuntimeProjectInputRead(
          this.authority,
          this.descriptor,
          this.readKey,
          this.readCurrent,
          currentValue,
          currentnessAuthority,
          currentnessWitness,
          eventSequence,
        )
      : null;
  }

  /** Owning authority, exposed only for generation-coherence assertions. */
  belongsTo(authority: SemanticRuntimeProjectInputAuthority): boolean {
    return this.authority === authority;
  }
}

/** Stable consumer host whose captured generation may advance only after exact-read validation. */
class RebasableSemanticRuntimeProjectInputHost implements SemanticRuntimeProjectInputHost {
  constructor(private current: SemanticRuntimeProjectInputHost) {}

  rebase(current: SemanticRuntimeProjectInputHost): void {
    this.current = current;
  }

  readFile(fileName: string): string | undefined {
    return this.current.readFile(fileName);
  }

  fileExists(fileName: string): boolean {
    return this.current.fileExists(fileName);
  }

  readDirectory(directoryName: string): readonly string[] {
    return this.current.readDirectory(directoryName);
  }

  directoryExists(directoryName: string): boolean {
    return this.current.directoryExists(directoryName);
  }

  realpath(fileName: string): string {
    return this.current.realpath(fileName);
  }

  matchFiles(
    rootDir: string,
    extensions?: readonly string[],
    excludes?: readonly string[],
    includes?: readonly string[],
    depth?: number,
  ): readonly string[] {
    return this.current.matchFiles(rootDir, extensions, excludes, includes, depth);
  }
}

/** Exact host reads made by one consumer while sharing one input generation's immutable values. */
export class SemanticRuntimeInputReadScope {
  private readonly readsByKey = new Map<string, SemanticRuntimeProjectInputRead>();
  private readonly rebasableHost: RebasableSemanticRuntimeProjectInputHost;
  readonly host: SemanticRuntimeProjectInputHost;

  constructor(
    private generation: SemanticRuntimeInputGeneration,
    readonly key: string,
  ) {
    this.rebasableHost = new RebasableSemanticRuntimeProjectInputHost(
      generation.observedHost((read) => this.observe(read)),
    );
    this.host = this.rebasableHost;
  }

  readRegisteredInputs(): readonly SemanticRuntimeProjectInputRead[] {
    return [...this.readsByKey.values()].sort((left, right) => left.readKey.localeCompare(right.readKey));
  }

  observe(read: SemanticRuntimeProjectInputRead): void {
    const existing = this.readsByKey.get(read.readKey);
    if (existing != null && existing.observedRevision !== read.observedRevision) {
      throw new Error(
        `Project-input read scope ${this.key} observed conflicting revisions for ${read.readKey}: `
        + `${existing.observedRevision} and ${read.observedRevision}.`,
      );
    }
    this.readsByKey.set(read.readKey, read);
  }

  /**
   * Rebind this consumer's stable host to an equivalent current generation after every exact read still matches.
   *
   * This advances an independently admitted semantic computation; it never makes the previous project generation
   * current again.
   */
  tryRebaseCurrent(generation: SemanticRuntimeInputGeneration): boolean {
    if (generation === this.generation) {
      const validationScope = new ComputationReadValidationScope();
      return generation.validate(validationScope).isCurrent
        && this.readRegisteredInputs().every((read) => validationScope.validate(read).isCurrent);
    }
    const validationScope = new ComputationReadValidationScope();
    return this.tryRebaseCurrentInScope(generation, validationScope);
  }

  /** Rebase under an enclosing synchronous proof so shared target reads validate once. */
  tryRebaseCurrentInScope(
    generation: SemanticRuntimeInputGeneration,
    validationScope: ComputationReadValidationScope,
  ): boolean {
    generation.requireCompatibleReadScopeOwner(this.generation);
    this.generation.requireReadScopeInactive(this);
    generation.requireCurrent();
    if (!generation.validate(validationScope).isCurrent) {
      return false;
    }
    const rebasedReads: SemanticRuntimeProjectInputRead[] = [];
    for (const read of this.readRegisteredInputs()) {
      const rebased = generation.tryRebaseRead(read);
      if (rebased == null) {
        return false;
      }
      rebasedReads.push(rebased);
    }
    this.readsByKey.clear();
    for (const read of rebasedReads) {
      this.readsByKey.set(read.readKey, read);
    }
    this.generation = generation;
    this.rebasableHost.rebase(generation.observedHost((read) => this.observe(read)));
    return true;
  }

  belongsTo(generation: SemanticRuntimeInputGeneration): boolean {
    return this.generation === generation;
  }
}

/** Project-owned exact-read scope retained for source compatibility with existing materializers. */
export class SemanticRuntimeProjectInputReadScope extends SemanticRuntimeInputReadScope {}

/** Immutable, memoized host view for one candidate project generation. */
class CapturedSemanticRuntimeProjectInputHost implements SemanticRuntimeProjectInputHost {
  constructor(
    private readonly generation: SemanticRuntimeInputGeneration,
    private readonly authority: SemanticRuntimeProjectInputAuthority,
    private readonly valuesByReadKey: Map<string, ProjectInputReadValue> = new Map(),
    private readonly readsByKey: Map<string, SemanticRuntimeProjectInputRead> = new Map(),
    private readonly pullValidatedReadsByKey: Map<string, SemanticRuntimeProjectInputRead> = new Map(),
    private readonly observeRead: ((read: SemanticRuntimeProjectInputRead) => void) | null = null,
  ) {}

  withObserver(observeRead: (read: SemanticRuntimeProjectInputRead) => void): CapturedSemanticRuntimeProjectInputHost {
    return new CapturedSemanticRuntimeProjectInputHost(
      this.generation,
      this.authority,
      this.valuesByReadKey,
      this.readsByKey,
      this.pullValidatedReadsByKey,
      observeRead,
    );
  }

  readFile(fileName: string): string | undefined {
    return this.read(projectInputFileDescriptor(
      SemanticRuntimeProjectInputReadKind.FileContent,
      fileName,
    )) as string | undefined;
  }

  fileExists(fileName: string): boolean {
    return this.read(projectInputFileDescriptor(
      SemanticRuntimeProjectInputReadKind.FileExistence,
      fileName,
    )) as boolean;
  }

  readDirectory(directoryName: string): readonly string[] {
    return this.read(projectInputDirectoryDescriptor(
      SemanticRuntimeProjectInputReadKind.DirectoryEntries,
      directoryName,
    )) as readonly string[];
  }

  directoryExists(directoryName: string): boolean {
    return this.read(projectInputDirectoryDescriptor(
      SemanticRuntimeProjectInputReadKind.DirectoryExistence,
      directoryName,
    )) as boolean;
  }

  realpath(fileName: string): string {
    return this.read(projectInputFileDescriptor(
      SemanticRuntimeProjectInputReadKind.Realpath,
      fileName,
    )) as string;
  }

  matchFiles(
    rootDir: string,
    extensions: readonly string[] = [],
    excludes: readonly string[] = [],
    includes: readonly string[] = [],
    depth?: number,
  ): readonly string[] {
    return this.read(projectInputMatchedFilesDescriptor(
      rootDir,
      extensions,
      excludes,
      includes,
      depth,
    )) as readonly string[];
  }

  readAll(): readonly SemanticRuntimeProjectInputRead[] {
    return [...this.readsByKey.values()].sort((left, right) => left.readKey.localeCompare(right.readKey));
  }

  validatePullValidatedInScope(validationScope: ComputationReadValidationScope): readonly ComputationReadValidation[] {
    return [...this.pullValidatedReadsByKey.values()]
      .sort((left, right) => left.readKey.localeCompare(right.readKey))
      .map((read) => validationScope.validate(read));
  }

  /** Reuse one generation-owned host sample across every consumer scope rebasing the same logical read. */
  tryRebaseRead(read: SemanticRuntimeProjectInputRead): SemanticRuntimeProjectInputRead | null {
    this.generation.requireCurrent();
    if (!read.belongsTo(this.authority)) {
      throw new Error(`Project-input read ${read.readKey} belongs to another input authority.`);
    }
    let current = this.readsByKey.get(read.readKey);
    if (current == null) {
      const currentnessAuthority = this.authority.currentnessForRead(read.descriptor);
      const rebased = read.tryRebaseForGeneration(
        this.generation.currentnessWitness,
        this.authority.currentEventSequence,
        currentnessAuthority,
      );
      if (rebased == null) {
        return null;
      }
      current = rebased;
      this.valuesByReadKey.set(read.readKey, current.value);
      this.registerRead(current);
    } else if (!sameProjectInputReadDescriptor(current.descriptor, read.descriptor)) {
      throw new Error(`Project-input read key collision for ${read.readKey}.`);
    }
    this.generation.observeScopedRead(current);
    this.observeRead?.(current);
    return current.kind === read.kind && sameProjectInputReadValue(current.value, read.value)
      ? current
      : null;
  }

  private read(
    descriptor: SemanticRuntimeProjectInputReadDescriptor,
  ): ProjectInputReadValue {
    this.generation.requireCurrent();
    const readKey = projectInputReadKey(descriptor);
    let read = this.readsByKey.get(readKey);
    if (read == null) {
      // Rebased reads retain this callback. Capture the long-lived authority and immutable descriptor, never this
      // generation-owned host or caller-owned match arrays.
      const readCurrent = () => readProjectInputValue(this.authority.host, descriptor);
      const currentnessAuthority = this.authority.currentnessForRead(descriptor);
      const value = freezeProjectInputReadValue(readCurrent());
      this.valuesByReadKey.set(readKey, value);
      read = new SemanticRuntimeProjectInputRead(
        this.authority,
        descriptor,
        readKey,
        readCurrent,
        value,
        currentnessAuthority,
        this.generation.currentnessWitness,
        this.authority.currentEventSequence,
      );
      this.registerRead(read);
    }
    this.generation.observeScopedRead(read);
    this.observeRead?.(read);
    return this.valuesByReadKey.get(readKey);
  }

  private registerRead(read: SemanticRuntimeProjectInputRead): void {
    this.readsByKey.set(read.readKey, read);
    if (read.currentnessAuthority.mode === SemanticRuntimeProjectInputCurrentnessMode.PullValidated) {
      this.pullValidatedReadsByKey.set(read.readKey, read);
    } else {
      this.pullValidatedReadsByKey.delete(read.readKey);
    }
  }
}

/** Shared implementation for project and pre-project workspace input generations. */
abstract class SemanticRuntimeInputGeneration implements GenerationAuthority {
  readonly revision: string;
  readonly currentnessGuardKey: string;
  readonly host: SemanticRuntimeProjectInputHost;
  private readonly capturedHost: CapturedSemanticRuntimeProjectInputHost;
  private readonly activeReadScopes: SemanticRuntimeInputReadScope[] = [];

  protected constructor(
    protected readonly authority: SemanticRuntimeProjectInputAuthority,
    private readonly inputLaneKey: string,
    readonly rootDir: string,
    readonly eventSequence: number,
    readonly ordinal: number,
    readonly currentnessWitness: GenerationCurrentnessWitness,
    revisionPrefix: string,
  ) {
    this.revision = `${revisionPrefix}@${eventSequence}.${ordinal}`;
    this.currentnessGuardKey = `semantic-runtime-input-generation:${inputLaneKey}`;
    this.capturedHost = new CapturedSemanticRuntimeProjectInputHost(this, authority);
    this.host = this.capturedHost;
  }

  protected abstract currentAuthorityRevision(): string;

  isCurrent(): boolean {
    return this.currentnessWitness.isCurrent();
  }

  requireCurrent(): void {
    if (!this.isCurrent()) {
      throw new Error(`Project-input generation ${this.revision} is no longer current.`);
    }
  }

  validate(validationScope: ComputationReadValidationScope = new ComputationReadValidationScope()): ComputationReadValidation {
    if (!this.isCurrent()) {
      return {
        isCurrent: false,
        currentRevision: this.currentAuthorityRevision(),
        changedFacets: ['generation'],
      };
    }
    // The event witness above proves every PushObserved read, and an explicit snapshot identity proves every
    // SessionSnapshot read. Only the compact default PullValidated subset performs live host I/O here.
    const invalidReads = this.capturedHost.validatePullValidatedInScope(validationScope)
      .filter((validation) => !validation.isCurrent);
    // Pull callbacks may synchronously publish an input event after an earlier read validated. Recheck the broad
    // generation witness after every callback has returned so capture() cannot hand out an already-revoked generation.
    const generationCurrent = this.isCurrent();
    const changedFacets = new Set(invalidReads.flatMap((validation) => validation.changedFacets));
    if (!generationCurrent) {
      changedFacets.add('generation');
    }
    return {
      isCurrent: generationCurrent && invalidReads.length === 0,
      currentRevision: !generationCurrent
        ? this.currentAuthorityRevision()
        : invalidReads.length === 0 ? this.revision : `${this.revision}:inputs-changed`,
      changedFacets: [...changedFacets],
    };
  }

  readRegisteredInputs(): readonly SemanticRuntimeProjectInputRead[] {
    return this.capturedHost.readAll();
  }

  /** Validate the captured values by exact read relevance, independently from computation-generation retirement. */
  validateRegisteredInputValues(): ComputationReadValidation {
    const reads = this.readRegisteredInputs();
    const eventSequence = this.authority.currentEventSequence;
    const invalidReads = reads
      .map((read) => read.validateObservedValue())
      .filter((validation) => !validation.isCurrent);
    const reentrantChangedFacets = this.authority.currentEventSequence === eventSequence
      ? []
      : reads
        .filter((read) => this.authority.mayHaveChanged(read.descriptor, eventSequence))
        .map((read) => read.kind);
    const changedFacets = [...new Set([
      ...invalidReads.flatMap((validation) => validation.changedFacets),
      ...reentrantChangedFacets,
    ])];
    return {
      isCurrent: changedFacets.length === 0,
      currentRevision: changedFacets.length === 0 ? this.revision : `${this.revision}:inputs-changed`,
      changedFacets,
    };
  }

  /** Create a consumer-local exact-read manifest over the generation's shared immutable host values. */
  protected createInputReadScope(key: string): SemanticRuntimeInputReadScope {
    this.requireCurrent();
    return new SemanticRuntimeInputReadScope(this, key);
  }

  /** Captured host view for one consumer-local read scope. */
  observedHost(
    observeRead: (read: SemanticRuntimeProjectInputRead) => void,
  ): SemanticRuntimeProjectInputHost {
    this.requireCurrent();
    return this.capturedHost.withObserver(observeRead);
  }

  /** Capture one retained read through this generation's shared immutable host table. */
  tryRebaseRead(read: SemanticRuntimeProjectInputRead): SemanticRuntimeProjectInputRead | null {
    return this.capturedHost.tryRebaseRead(read);
  }

  /** Rebase this domain's computation reads through the current event generation; delegate every other domain. */
  rebaseComputationRead(read: ComputationRead): SemanticRuntimeProjectInputRead | null | undefined {
    return read instanceof SemanticRuntimeProjectInputRead
      ? this.tryRebaseRead(read)
      : undefined;
  }

  /** Refuse read-scope rebasing across logical lanes or independent input authorities. */
  requireCompatibleReadScopeOwner(previous: SemanticRuntimeInputGeneration): void {
    if (
      this.authority !== previous.authority
      || this.inputLaneKey !== previous.inputLaneKey
      || this.rootDir !== previous.rootDir
    ) {
      throw new Error(
        `Project-input read scope cannot rebase ${previous.revision} to unrelated generation ${this.revision}.`,
      );
    }
  }

  /** A consumer scope cannot change generations while participating in a synchronous owner scope. */
  requireReadScopeInactive(scope: SemanticRuntimeInputReadScope): void {
    if (this.activeReadScopes.includes(scope)) {
      throw new Error(`Project-input read scope ${scope.key} cannot rebase while it is active.`);
    }
  }

  /** Capture every host read made synchronously by one enclosing analysis owner. */
  withReadScope<TValue>(scope: SemanticRuntimeInputReadScope, read: () => TValue): TValue {
    this.requireCurrent();
    if (!scope.belongsTo(this)) {
      throw new Error(`Project-input read scope ${scope.key} belongs to another generation.`);
    }
    this.activeReadScopes.push(scope);
    try {
      const value = read();
      if (value != null && typeof (value as { readonly then?: unknown }).then === 'function') {
        throw new Error(`Project-input read scope ${scope.key} cannot cross an asynchronous boundary.`);
      }
      return value;
    } finally {
      const active = this.activeReadScopes.pop();
      if (active !== scope) {
        throw new Error(`Project-input read scope ${scope.key} closed out of order.`);
      }
    }
  }

  /** Internal host callback that fans one memoized read into every active owner scope. */
  observeScopedRead(read: SemanticRuntimeProjectInputRead): void {
    for (const scope of this.activeReadScopes) {
      scope.observe(read);
    }
  }
}

/** One current immutable source/config host generation for a booted project. */
export class SemanticRuntimeProjectInputGeneration extends SemanticRuntimeInputGeneration {
  constructor(
    authority: SemanticRuntimeProjectInputAuthority,
    readonly projectKey: string,
    rootDir: string,
    eventSequence: number,
    ordinal: number,
    currentnessWitness: GenerationCurrentnessWitness,
  ) {
    super(
      authority,
      `project:${projectKey}`,
      rootDir,
      eventSequence,
      ordinal,
      currentnessWitness,
      projectKey,
    );
  }

  createReadScope(key: string): SemanticRuntimeProjectInputReadScope {
    this.requireCurrent();
    return new SemanticRuntimeProjectInputReadScope(this, key);
  }

  protected currentAuthorityRevision(): string {
    return this.authority.currentRevision(this.projectKey);
  }
}

/** One current immutable workspace-discovery generation before project keys exist. */
export class SemanticRuntimeWorkspaceInputGeneration extends SemanticRuntimeInputGeneration {
  constructor(
    authority: SemanticRuntimeProjectInputAuthority,
    readonly workspaceInputKey: string,
    rootDir: string,
    eventSequence: number,
    ordinal: number,
    currentnessWitness: GenerationCurrentnessWitness,
  ) {
    super(
      authority,
      `workspace:${workspaceInputKey}`,
      rootDir,
      eventSequence,
      ordinal,
      currentnessWitness,
      `workspace:${workspaceInputKey}`,
    );
  }

  createReadScope(key: string): SemanticRuntimeInputReadScope {
    return this.createInputReadScope(key);
  }

  protected currentAuthorityRevision(): string {
    return this.authority.currentWorkspaceRevision(this.workspaceInputKey);
  }
}

/** Runtime-owned authority for capturing coherent project source/config generations. */
export class SemanticRuntimeProjectInputAuthority {
  private readonly generationsByProjectKey = new Map<string, SemanticRuntimeProjectInputGeneration>();
  private readonly generationCurrentnessByProjectKey = new Map<string, GenerationCurrentnessClock>();
  private readonly workspaceGenerationsByKey = new Map<string, SemanticRuntimeWorkspaceInputGeneration>();
  private readonly workspaceGenerationCurrentnessByKey = new Map<string, GenerationCurrentnessClock>();
  private readonly eventCurrentness = new GenerationCurrentnessClock();
  private readonly workspaceStructuralCurrentness = new GenerationCurrentnessClock();
  private readonly fileContentChangeSequenceByPathKey = new Map<string, number>();
  private lastBroadChangeSequence = 0;
  private nextGenerationOrdinal = 1;

  constructor(
    /** Uncaptured host used for workspace topology before project generations exist. */
    readonly host: SemanticRuntimeProjectInputHost = nodeSemanticRuntimeProjectInputHost,
    /** Exact-read evidence supplied by the host; every unclassified mutable read remains pull-validated. */
    readonly currentnessPolicy: SemanticRuntimeProjectInputCurrentnessPolicy | null = null,
  ) {}

  /**
   * Synchronously revoke captured generations after owner-declared changes.
   *
   * Exact file-value/currentness-transfer events leave the workspace source-world lane current. Structural membership
   * events revoke it and conservatively affect every registered input shape. The null form remains the explicit broad
   * fallback for hosts that cannot classify an event.
   */
  advance(changes: readonly SemanticRuntimeProjectInputChange[] | null = null): number {
    const sequence = this.eventCurrentness.advance();
    if (changes == null) {
      this.lastBroadChangeSequence = sequence;
      this.workspaceStructuralCurrentness.advance();
      return sequence;
    }
    let hasStructuralMembershipChange = false;
    for (const change of changes) {
      switch (change.kind) {
        case SemanticRuntimeProjectInputChangeKind.FileValue:
          this.fileContentChangeSequenceByPathKey.set(change.pathKey, sequence);
          break;
        case SemanticRuntimeProjectInputChangeKind.StructuralMembership:
          hasStructuralMembershipChange = true;
          break;
      }
    }
    if (hasStructuralMembershipChange) {
      this.lastBroadChangeSequence = sequence;
      this.workspaceStructuralCurrentness.advance();
    }
    return sequence;
  }

  get currentEventSequence(): number {
    return this.eventCurrentness.currentOrdinal;
  }

  /** Whether an explicit event since one captured read could have changed that read's value. */
  mayHaveChanged(
    descriptor: SemanticRuntimeProjectInputReadDescriptor,
    observedEventSequence: number,
  ): boolean {
    if (this.lastBroadChangeSequence > observedEventSequence) {
      return true;
    }
    switch (descriptor.kind) {
      case SemanticRuntimeProjectInputReadKind.FileContent:
        return (this.fileContentChangeSequenceByPathKey.get(projectInputPathKey(descriptor.fileName)) ?? 0)
          > observedEventSequence;
      case SemanticRuntimeProjectInputReadKind.FileExistence:
      case SemanticRuntimeProjectInputReadKind.Realpath:
      case SemanticRuntimeProjectInputReadKind.DirectoryEntries:
      case SemanticRuntimeProjectInputReadKind.DirectoryExistence:
      case SemanticRuntimeProjectInputReadKind.MatchedFiles:
        return false;
    }
  }

  /** Resolve and normalize the host's authority for one exact immutable read descriptor. */
  currentnessForRead(
    descriptor: SemanticRuntimeProjectInputReadDescriptor,
  ): SemanticRuntimeProjectInputReadCurrentness {
    return normalizeProjectInputReadCurrentness(
      this.currentnessPolicy?.authorityForRead(descriptor),
    );
  }

  /**
   * Canonical key for one exact source-text read without observing the host.
   *
   * Managed consumer operations use this to reuse text already consumed by a semantic answer. The key is derived by
   * the same authority that mints the read, so adapters never need to reproduce path normalization or case policy.
   */
  fileContentReadKey(fileName: string): string {
    return projectInputReadKey(projectInputFileDescriptor(
      SemanticRuntimeProjectInputReadKind.FileContent,
      fileName,
    ));
  }

  /**
   * Capture one generation-neutral exact source-text read for a consumer operation.
   *
   * This deliberately bypasses project and workspace captured-host tables: presentation/mapping reads belong to the
   * final operation receipt, not discovery, project configuration, computation generations, or reusable answer leases.
   * The event witness and sequence are sampled before policy and host callbacks so reentrant invalidation is always
   * conservative. Callers must memoize by `readKey` when one operation asks for the same text more than once.
   */
  captureExactFileContentRead(fileName: string): SemanticRuntimeProjectInputRead {
    const descriptor = projectInputFileDescriptor(
      SemanticRuntimeProjectInputReadKind.FileContent,
      fileName,
    );
    const readKey = projectInputReadKey(descriptor);
    const observedEventSequence = this.currentEventSequence;
    const currentnessWitness = this.eventCurrentness.capture(
      `project-input-operation-read:${readKey}`,
    );
    const currentnessAuthority = this.currentnessForRead(descriptor);
    const readCurrent = () => readProjectInputValue(this.host, descriptor);
    const value = freezeProjectInputReadValue(readCurrent());
    return new SemanticRuntimeProjectInputRead(
      this,
      descriptor,
      readKey,
      readCurrent,
      value,
      currentnessAuthority,
      currentnessWitness,
      observedEventSequence,
    );
  }

  capture(scope: SemanticRuntimeProjectInputScope): SemanticRuntimeProjectInputGeneration {
    const rootDir = resolveProjectInputPath(scope.rootDir);
    const current = this.generationsByProjectKey.get(scope.projectKey);
    if (
      current != null
      && current.rootDir === rootDir
      && current.eventSequence === this.currentEventSequence
      && current.validate().isCurrent
    ) {
      return current;
    }
    let projectCurrentness = this.generationCurrentnessByProjectKey.get(scope.projectKey);
    if (projectCurrentness == null) {
      projectCurrentness = new GenerationCurrentnessClock();
      this.generationCurrentnessByProjectKey.set(scope.projectKey, projectCurrentness);
    }
    projectCurrentness.advance();
    const currentnessGuardKey = `project-input-generation:${scope.projectKey}`;
    const generation = new SemanticRuntimeProjectInputGeneration(
      this,
      scope.projectKey,
      rootDir,
      this.currentEventSequence,
      this.nextGenerationOrdinal++,
      combineGenerationCurrentnessWitnesses([
        this.eventCurrentness.capture(currentnessGuardKey),
        projectCurrentness.capture(currentnessGuardKey),
      ]),
    );
    this.generationsByProjectKey.set(scope.projectKey, generation);
    return generation;
  }

  currentRevision(projectKey: string): string {
    return this.generationsByProjectKey.get(projectKey)?.revision ?? 'absent';
  }

  /** Capture a real workspace-discovery lane without manufacturing a project key before discovery runs. */
  captureWorkspace(scope: SemanticRuntimeWorkspaceInputScope): SemanticRuntimeWorkspaceInputGeneration {
    const rootDir = resolveProjectInputPath(scope.rootDir);
    const current = this.workspaceGenerationsByKey.get(scope.workspaceInputKey);
    if (
      current != null
      && current.rootDir === rootDir
      && current.isCurrent()
      && current.validateRegisteredInputValues().isCurrent
      && current.isCurrent()
    ) {
      return current;
    }
    let workspaceCurrentness = this.workspaceGenerationCurrentnessByKey.get(scope.workspaceInputKey);
    if (workspaceCurrentness == null) {
      workspaceCurrentness = new GenerationCurrentnessClock();
      this.workspaceGenerationCurrentnessByKey.set(scope.workspaceInputKey, workspaceCurrentness);
    }
    workspaceCurrentness.advance();
    const currentnessGuardKey = `workspace-input-generation:${scope.workspaceInputKey}`;
    const generation = new SemanticRuntimeWorkspaceInputGeneration(
      this,
      scope.workspaceInputKey,
      rootDir,
      this.currentEventSequence,
      this.nextGenerationOrdinal++,
      combineGenerationCurrentnessWitnesses([
        this.workspaceStructuralCurrentness.capture(currentnessGuardKey),
        workspaceCurrentness.capture(currentnessGuardKey),
      ]),
    );
    this.workspaceGenerationsByKey.set(scope.workspaceInputKey, generation);
    return generation;
  }

  currentWorkspaceRevision(workspaceInputKey: string): string {
    return this.workspaceGenerationsByKey.get(workspaceInputKey)?.revision ?? 'absent';
  }

}

type ProjectInputFileReadKind =
  | SemanticRuntimeProjectInputReadKind.FileContent
  | SemanticRuntimeProjectInputReadKind.FileExistence
  | SemanticRuntimeProjectInputReadKind.Realpath;

type ProjectInputDirectoryReadKind =
  | SemanticRuntimeProjectInputReadKind.DirectoryEntries
  | SemanticRuntimeProjectInputReadKind.DirectoryExistence;

function projectInputFileDescriptor(
  kind: ProjectInputFileReadKind,
  fileName: string,
): Extract<SemanticRuntimeProjectInputReadDescriptor, { readonly fileName: string }> {
  return Object.freeze({
    kind,
    fileName: resolveProjectInputPath(fileName),
  }) as Extract<SemanticRuntimeProjectInputReadDescriptor, { readonly fileName: string }>;
}

function projectInputDirectoryDescriptor(
  kind: ProjectInputDirectoryReadKind,
  directoryName: string,
): Extract<SemanticRuntimeProjectInputReadDescriptor, { readonly directoryName: string }> {
  return Object.freeze({
    kind,
    directoryName: resolveProjectInputPath(directoryName),
  }) as Extract<SemanticRuntimeProjectInputReadDescriptor, { readonly directoryName: string }>;
}

function projectInputMatchedFilesDescriptor(
  rootDir: string,
  extensions: readonly string[],
  excludes: readonly string[],
  includes: readonly string[],
  depth: number | undefined,
): SemanticRuntimeProjectInputMatchedFilesReadDescriptor {
  return Object.freeze({
    kind: SemanticRuntimeProjectInputReadKind.MatchedFiles,
    rootDir: resolveProjectInputPath(rootDir),
    extensions: Object.freeze([...extensions]),
    excludes: Object.freeze([...excludes]),
    includes: Object.freeze([...includes]),
    depth: depth ?? null,
  });
}

function projectInputReadKey(descriptor: SemanticRuntimeProjectInputReadDescriptor): string {
  switch (descriptor.kind) {
    case SemanticRuntimeProjectInputReadKind.FileContent:
    case SemanticRuntimeProjectInputReadKind.FileExistence:
    case SemanticRuntimeProjectInputReadKind.Realpath:
      return `project-input:${descriptor.kind}:${projectInputPathKey(descriptor.fileName)}`;
    case SemanticRuntimeProjectInputReadKind.DirectoryEntries:
    case SemanticRuntimeProjectInputReadKind.DirectoryExistence:
      return `project-input:${descriptor.kind}:${projectInputPathKey(descriptor.directoryName)}`;
    case SemanticRuntimeProjectInputReadKind.MatchedFiles:
      return `project-input:${descriptor.kind}:${JSON.stringify([
        projectInputPathKey(descriptor.rootDir),
        descriptor.extensions,
        descriptor.excludes,
        descriptor.includes,
        descriptor.depth,
      ])}`;
  }
}

function readProjectInputValue(
  host: SemanticRuntimeProjectInputHost,
  descriptor: SemanticRuntimeProjectInputReadDescriptor,
): ProjectInputReadValue {
  switch (descriptor.kind) {
    case SemanticRuntimeProjectInputReadKind.FileContent:
      return host.readFile(descriptor.fileName);
    case SemanticRuntimeProjectInputReadKind.FileExistence:
      return host.fileExists(descriptor.fileName);
    case SemanticRuntimeProjectInputReadKind.DirectoryEntries:
      return host.readDirectory(descriptor.directoryName);
    case SemanticRuntimeProjectInputReadKind.DirectoryExistence:
      return host.directoryExists(descriptor.directoryName);
    case SemanticRuntimeProjectInputReadKind.Realpath:
      return host.realpath(descriptor.fileName);
    case SemanticRuntimeProjectInputReadKind.MatchedFiles:
      return host.matchFiles(
        descriptor.rootDir,
        descriptor.extensions,
        descriptor.excludes,
        descriptor.includes,
        descriptor.depth ?? undefined,
      );
  }
}

function sameProjectInputReadDescriptor(
  left: SemanticRuntimeProjectInputReadDescriptor,
  right: SemanticRuntimeProjectInputReadDescriptor,
): boolean {
  return projectInputReadKey(left) === projectInputReadKey(right);
}

function normalizeProjectInputReadCurrentness(
  currentness: SemanticRuntimeProjectInputReadCurrentness | null | undefined,
): SemanticRuntimeProjectInputReadCurrentness {
  if (currentness == null) {
    return PULL_VALIDATED_CURRENTNESS;
  }
  switch (currentness.mode) {
    case SemanticRuntimeProjectInputCurrentnessMode.PullValidated:
      return PULL_VALIDATED_CURRENTNESS;
    case SemanticRuntimeProjectInputCurrentnessMode.PushObserved:
      return PUSH_OBSERVED_CURRENTNESS;
    case SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot: {
      const snapshotIdentity = currentness.snapshotIdentity;
      if (typeof snapshotIdentity !== 'string' || snapshotIdentity.trim().length === 0) {
        throw new Error('Session-snapshot project-input currentness requires a non-empty snapshotIdentity.');
      }
      return Object.freeze({
        mode: SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot,
        snapshotIdentity,
      });
    }
    default:
      throw new Error(
        `Unknown project-input currentness mode '${String((currentness as { readonly mode?: unknown }).mode)}'.`,
      );
  }
}

function sameProjectInputReadCurrentness(
  left: SemanticRuntimeProjectInputReadCurrentness,
  right: SemanticRuntimeProjectInputReadCurrentness,
): boolean {
  if (left.mode !== right.mode) {
    return false;
  }
  return left.mode !== SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot
    || right.mode === SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot
      && left.snapshotIdentity === right.snapshotIdentity;
}

function resolveProjectInputPath(fileName: string): string {
  return path.resolve(fileName).replace(/\\/g, '/');
}

function projectInputPathKey(fileName: string): string {
  return process.platform === 'win32' ? fileName.toLowerCase() : fileName;
}

function freezeProjectInputReadValue(value: ProjectInputReadValue): ProjectInputReadValue {
  return typeof value === 'object' && value != null ? Object.freeze([...value]) : value;
}

function sameProjectInputReadValue(left: ProjectInputReadValue, right: ProjectInputReadValue): boolean {
  if (left === right) {
    return true;
  }
  if (
    typeof left !== 'object'
    || left == null
    || typeof right !== 'object'
    || right == null
    || left.length !== right.length
  ) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function projectInputValueRevision(value: ProjectInputReadValue): string {
  if (value === undefined) {
    return 'absent';
  }
  if (typeof value === 'boolean') {
    return value ? 'present' : 'absent';
  }
  if (typeof value === 'string') {
    return `value:${sourceTextContentRevision(value)}`;
  }
  return `list:${sourceTextContentRevision(JSON.stringify(value))}`;
}
