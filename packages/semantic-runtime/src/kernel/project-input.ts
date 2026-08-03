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

export const enum SemanticRuntimeProjectInputChangeDetection {
  /** Host values may change without notification, so every currentness proof rereads exact inputs. */
  PullValidation = 0,
  /** The owner calls `advance()` for every admitted host change, so one event sequence proves currentness. */
  ExplicitEvents = 1,
}

/** Granularity carried by an explicit project-input change event. */
export const enum SemanticRuntimeProjectInputChangeKind {
  /** Values owned by one file path may have changed; directory and matched-file membership did not. */
  File = 0,
}

/** One owner-declared project-input change, normalized into the host identity space used by captured reads. */
export class SemanticRuntimeProjectInputChange {
  readonly pathKey: string;

  constructor(
    readonly kind: SemanticRuntimeProjectInputChangeKind,
    fileName: string,
  ) {
    this.pathKey = projectInputPathKey(resolveProjectInputPath(fileName));
    Object.freeze(this);
  }
}

type ProjectInputReadValue = string | boolean | readonly string[] | undefined;

/** Exact positive or negative host read retained by one project-input generation. */
export class SemanticRuntimeProjectInputRead implements ComputationRead {
  readonly domain = 'project-input';
  readonly observedRevision: string;

  constructor(
    private readonly authority: SemanticRuntimeProjectInputAuthority,
    readonly kind: SemanticRuntimeProjectInputReadKind,
    readonly readKey: string,
    private readonly readCurrent: () => ProjectInputReadValue,
    readonly value: ProjectInputReadValue,
    private readonly currentnessWitness: GenerationCurrentnessWitness,
    private readonly changeLocus: string,
    private readonly observedEventSequence: number,
  ) {
    this.observedRevision = projectInputValueRevision(value);
  }

  validate(): ComputationReadValidation {
    if (this.authority.changeDetection === SemanticRuntimeProjectInputChangeDetection.ExplicitEvents) {
      const isCurrent = this.currentnessWitness.isCurrent();
      return {
        isCurrent,
        currentRevision: isCurrent
          ? this.observedRevision
          : `event:${this.authority.currentEventSequence}`,
        changedFacets: isCurrent ? [] : [this.kind],
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

  tryRebaseCurrent(): SemanticRuntimeProjectInputRead | null {
    if (this.authority.changeDetection === SemanticRuntimeProjectInputChangeDetection.ExplicitEvents) {
      return this.currentnessWitness.isCurrent() ? this : null;
    }
    const currentValue = freezeProjectInputReadValue(this.readCurrent());
    return sameProjectInputReadValue(this.value, currentValue) ? this : null;
  }

  /** Re-capture this exact input under a specific current project generation. */
  tryRebaseForGeneration(
    currentnessWitness: GenerationCurrentnessWitness,
    eventSequence: number,
  ): SemanticRuntimeProjectInputRead | null {
    const currentValue = this.authority.changeDetection === SemanticRuntimeProjectInputChangeDetection.ExplicitEvents
      && !this.authority.mayHaveChanged(this.kind, this.changeLocus, this.observedEventSequence)
      ? this.value
      : freezeProjectInputReadValue(this.readCurrent());
    return sameProjectInputReadValue(this.value, currentValue)
      ? new SemanticRuntimeProjectInputRead(
          this.authority,
          this.kind,
          this.readKey,
          this.readCurrent,
          currentValue,
          currentnessWitness,
          this.changeLocus,
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

/** Exact host reads made by one consumer while sharing its project generation's immutable values. */
export class SemanticRuntimeProjectInputReadScope {
  private readonly readsByKey = new Map<string, SemanticRuntimeProjectInputRead>();
  private readonly rebasableHost: RebasableSemanticRuntimeProjectInputHost;
  readonly host: SemanticRuntimeProjectInputHost;

  constructor(
    private generation: SemanticRuntimeProjectInputGeneration,
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
  tryRebaseCurrent(generation: SemanticRuntimeProjectInputGeneration): boolean {
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
    generation: SemanticRuntimeProjectInputGeneration,
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

  belongsTo(generation: SemanticRuntimeProjectInputGeneration): boolean {
    return this.generation === generation;
  }
}

/** Immutable, memoized host view for one candidate project generation. */
class CapturedSemanticRuntimeProjectInputHost implements SemanticRuntimeProjectInputHost {
  constructor(
    private readonly generation: SemanticRuntimeProjectInputGeneration,
    private readonly authority: SemanticRuntimeProjectInputAuthority,
    private readonly valuesByReadKey: Map<string, ProjectInputReadValue> = new Map(),
    private readonly readsByKey: Map<string, SemanticRuntimeProjectInputRead> = new Map(),
    private readonly observeRead: ((read: SemanticRuntimeProjectInputRead) => void) | null = null,
  ) {}

  withObserver(observeRead: (read: SemanticRuntimeProjectInputRead) => void): CapturedSemanticRuntimeProjectInputHost {
    return new CapturedSemanticRuntimeProjectInputHost(
      this.generation,
      this.authority,
      this.valuesByReadKey,
      this.readsByKey,
      observeRead,
    );
  }

  // Rebased reads retain these callbacks. Capture the long-lived authority, never this generation-owned host.
  readFile(fileName: string): string | undefined {
    const hostPath = resolveProjectInputPath(fileName);
    const authority = this.authority;
    return this.read(
      SemanticRuntimeProjectInputReadKind.FileContent,
      projectInputPathKey(hostPath),
      () => authority.readLiveFile(hostPath),
    ) as string | undefined;
  }

  fileExists(fileName: string): boolean {
    const hostPath = resolveProjectInputPath(fileName);
    const authority = this.authority;
    return this.read(
      SemanticRuntimeProjectInputReadKind.FileExistence,
      projectInputPathKey(hostPath),
      () => authority.liveFileExists(hostPath),
    ) as boolean;
  }

  readDirectory(directoryName: string): readonly string[] {
    const hostPath = resolveProjectInputPath(directoryName);
    const authority = this.authority;
    return this.read(
      SemanticRuntimeProjectInputReadKind.DirectoryEntries,
      projectInputPathKey(hostPath),
      () => authority.readLiveDirectory(hostPath),
    ) as readonly string[];
  }

  directoryExists(directoryName: string): boolean {
    const hostPath = resolveProjectInputPath(directoryName);
    const authority = this.authority;
    return this.read(
      SemanticRuntimeProjectInputReadKind.DirectoryExistence,
      projectInputPathKey(hostPath),
      () => authority.liveDirectoryExists(hostPath),
    ) as boolean;
  }

  realpath(fileName: string): string {
    const hostPath = resolveProjectInputPath(fileName);
    const authority = this.authority;
    return this.read(
      SemanticRuntimeProjectInputReadKind.Realpath,
      projectInputPathKey(hostPath),
      () => authority.readLiveRealpath(hostPath),
    ) as string;
  }

  matchFiles(
    rootDir: string,
    extensions: readonly string[] = [],
    excludes: readonly string[] = [],
    includes: readonly string[] = [],
    depth?: number,
  ): readonly string[] {
    const hostPath = resolveProjectInputPath(rootDir);
    const requestKey = JSON.stringify([projectInputPathKey(hostPath), extensions, excludes, includes, depth ?? null]);
    const authority = this.authority;
    return this.read(
      SemanticRuntimeProjectInputReadKind.MatchedFiles,
      requestKey,
      () => authority.matchLiveFiles(hostPath, extensions, excludes, includes, depth),
    ) as readonly string[];
  }

  readAll(): readonly SemanticRuntimeProjectInputRead[] {
    return [...this.readsByKey.values()].sort((left, right) => left.readKey.localeCompare(right.readKey));
  }

  validateAllInScope(validationScope: ComputationReadValidationScope): readonly ComputationReadValidation[] {
    return this.readAll().map((read) => validationScope.validate(read));
  }

  /** Reuse one generation-owned host sample across every consumer scope rebasing the same logical read. */
  tryRebaseRead(read: SemanticRuntimeProjectInputRead): SemanticRuntimeProjectInputRead | null {
    this.generation.requireCurrent();
    if (!read.belongsTo(this.authority)) {
      throw new Error(`Project-input read ${read.readKey} belongs to another input authority.`);
    }
    let current = this.readsByKey.get(read.readKey);
    if (current == null) {
      const rebased = read.tryRebaseForGeneration(
        this.generation.currentnessWitness,
        this.generation.eventSequence,
      );
      if (rebased == null) {
        return null;
      }
      current = rebased;
      this.valuesByReadKey.set(read.readKey, current.value);
      this.readsByKey.set(read.readKey, current);
    }
    this.generation.observeScopedRead(current);
    this.observeRead?.(current);
    return current.kind === read.kind && current.observedRevision === read.observedRevision
      ? current
      : null;
  }

  private read(
    kind: SemanticRuntimeProjectInputReadKind,
    locus: string,
    readCurrent: () => ProjectInputReadValue,
  ): ProjectInputReadValue {
    this.generation.requireCurrent();
    const readKey = `project-input:${kind}:${locus}`;
    let read = this.readsByKey.get(readKey);
    if (read == null) {
      const value = freezeProjectInputReadValue(readCurrent());
      this.valuesByReadKey.set(readKey, value);
      read = new SemanticRuntimeProjectInputRead(
        this.authority,
        kind,
        readKey,
        readCurrent,
        value,
        this.generation.currentnessWitness,
        locus,
        this.generation.eventSequence,
      );
      this.readsByKey.set(readKey, read);
    }
    this.generation.observeScopedRead(read);
    this.observeRead?.(read);
    return this.valuesByReadKey.get(readKey);
  }
}

/** One current immutable source/config host generation for a booted project. */
export class SemanticRuntimeProjectInputGeneration implements GenerationAuthority {
  readonly revision: string;
  readonly currentnessGuardKey: string;
  readonly host: SemanticRuntimeProjectInputHost;
  private readonly capturedHost: CapturedSemanticRuntimeProjectInputHost;
  private readonly activeReadScopes: SemanticRuntimeProjectInputReadScope[] = [];

  constructor(
    private readonly authority: SemanticRuntimeProjectInputAuthority,
    readonly projectKey: string,
    readonly rootDir: string,
    readonly eventSequence: number,
    readonly ordinal: number,
    readonly currentnessWitness: GenerationCurrentnessWitness,
  ) {
    this.revision = `${projectKey}@${eventSequence}.${ordinal}`;
    this.currentnessGuardKey = `project-input-generation:${projectKey}`;
    this.capturedHost = new CapturedSemanticRuntimeProjectInputHost(this, authority);
    this.host = this.capturedHost;
  }

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
        currentRevision: this.authority.currentRevision(this.projectKey),
        changedFacets: ['generation'],
      };
    }
    const invalidReads = this.capturedHost.validateAllInScope(validationScope)
      .filter((validation) => !validation.isCurrent);
    return {
      isCurrent: invalidReads.length === 0,
      currentRevision: invalidReads.length === 0 ? this.revision : `${this.revision}:inputs-changed`,
      changedFacets: [...new Set(invalidReads.flatMap((validation) => validation.changedFacets))],
    };
  }

  readRegisteredInputs(): readonly SemanticRuntimeProjectInputRead[] {
    return this.capturedHost.readAll();
  }

  /** Create a consumer-local exact-read manifest over the generation's shared immutable host values. */
  createReadScope(key: string): SemanticRuntimeProjectInputReadScope {
    this.requireCurrent();
    return new SemanticRuntimeProjectInputReadScope(this, key);
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

  /** Refuse read-scope rebasing across logical projects or independent input authorities. */
  requireCompatibleReadScopeOwner(previous: SemanticRuntimeProjectInputGeneration): void {
    if (
      this.authority !== previous.authority
      || this.projectKey !== previous.projectKey
      || this.rootDir !== previous.rootDir
    ) {
      throw new Error(
        `Project-input read scope cannot rebase ${previous.revision} to unrelated generation ${this.revision}.`,
      );
    }
  }

  /** A consumer scope cannot change generations while participating in a synchronous owner scope. */
  requireReadScopeInactive(scope: SemanticRuntimeProjectInputReadScope): void {
    if (this.activeReadScopes.includes(scope)) {
      throw new Error(`Project-input read scope ${scope.key} cannot rebase while it is active.`);
    }
  }

  /** Capture every host read made synchronously by one enclosing analysis owner. */
  withReadScope<TValue>(scope: SemanticRuntimeProjectInputReadScope, read: () => TValue): TValue {
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

/** Runtime-owned authority for capturing coherent project source/config generations. */
export class SemanticRuntimeProjectInputAuthority {
  private readonly generationsByProjectKey = new Map<string, SemanticRuntimeProjectInputGeneration>();
  private readonly generationCurrentnessByProjectKey = new Map<string, GenerationCurrentnessClock>();
  private readonly eventCurrentness = new GenerationCurrentnessClock();
  private readonly fileChangeSequenceByPathKey = new Map<string, number>();
  private lastBroadChangeSequence = 0;
  private nextGenerationOrdinal = 1;

  constructor(
    /** Uncaptured host used for workspace topology before project generations exist. */
    readonly host: SemanticRuntimeProjectInputHost = nodeSemanticRuntimeProjectInputHost,
    /** Whether host changes are discovered by exact polling or declared through `advance()`. */
    readonly changeDetection: SemanticRuntimeProjectInputChangeDetection =
      SemanticRuntimeProjectInputChangeDetection.PullValidation,
  ) {}

  /** Synchronously revoke captured generations after exact owner-declared changes, or broadly when detail is absent. */
  advance(changes: readonly SemanticRuntimeProjectInputChange[] | null = null): number {
    const sequence = this.eventCurrentness.advance();
    if (changes == null) {
      this.lastBroadChangeSequence = sequence;
      return sequence;
    }
    for (const change of changes) {
      switch (change.kind) {
        case SemanticRuntimeProjectInputChangeKind.File:
          this.fileChangeSequenceByPathKey.set(change.pathKey, sequence);
          break;
      }
    }
    return sequence;
  }

  get currentEventSequence(): number {
    return this.eventCurrentness.currentOrdinal;
  }

  /** Whether an explicit event since one captured read could have changed that read's value. */
  mayHaveChanged(
    readKind: SemanticRuntimeProjectInputReadKind,
    changeLocus: string,
    observedEventSequence: number,
  ): boolean {
    if (this.lastBroadChangeSequence > observedEventSequence) {
      return true;
    }
    switch (readKind) {
      case SemanticRuntimeProjectInputReadKind.FileContent:
      case SemanticRuntimeProjectInputReadKind.FileExistence:
      case SemanticRuntimeProjectInputReadKind.Realpath:
        return (this.fileChangeSequenceByPathKey.get(changeLocus) ?? 0) > observedEventSequence;
      case SemanticRuntimeProjectInputReadKind.DirectoryEntries:
      case SemanticRuntimeProjectInputReadKind.DirectoryExistence:
      case SemanticRuntimeProjectInputReadKind.MatchedFiles:
        return false;
    }
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

  readLiveFile(fileName: string): string | undefined {
    return this.host.readFile(fileName);
  }

  liveFileExists(fileName: string): boolean {
    return this.host.fileExists(fileName);
  }

  readLiveDirectory(directoryName: string): readonly string[] {
    return this.host.readDirectory(directoryName);
  }

  liveDirectoryExists(directoryName: string): boolean {
    return this.host.directoryExists(directoryName);
  }

  readLiveRealpath(fileName: string): string {
    return this.host.realpath(fileName);
  }

  matchLiveFiles(
    rootDir: string,
    extensions: readonly string[],
    excludes: readonly string[],
    includes: readonly string[],
    depth?: number,
  ): readonly string[] {
    return this.host.matchFiles(rootDir, extensions, excludes, includes, depth);
  }
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
