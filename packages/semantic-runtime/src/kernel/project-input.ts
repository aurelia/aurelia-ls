import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import type {
  ComputationRead,
  ComputationReadValidation,
} from './computation-lifecycle.js';
import type { GenerationAuthority } from './generation-authority.js';
import { sourceTextContentRevision } from './source-text-snapshot.js';

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
  ) {
    this.observedRevision = projectInputValueRevision(value);
  }

  validate(): ComputationReadValidation {
    const currentRevision = projectInputValueRevision(this.readCurrent());
    return {
      isCurrent: currentRevision === this.observedRevision,
      currentRevision,
      changedFacets: currentRevision === this.observedRevision ? [] : [this.kind],
    };
  }

  /** Owning authority, exposed only for generation-coherence assertions. */
  belongsTo(authority: SemanticRuntimeProjectInputAuthority): boolean {
    return this.authority === authority;
  }
}

/** Exact host reads made by one consumer while sharing its project generation's immutable values. */
export class SemanticRuntimeProjectInputReadScope {
  private readonly readsByKey = new Map<string, SemanticRuntimeProjectInputRead>();
  readonly host: SemanticRuntimeProjectInputHost;

  constructor(
    private readonly generation: SemanticRuntimeProjectInputGeneration,
    readonly key: string,
    createHost: (
      observeRead: (read: SemanticRuntimeProjectInputRead) => void,
    ) => SemanticRuntimeProjectInputHost,
  ) {
    this.host = createHost((read) => this.readsByKey.set(read.readKey, read));
  }

  readRegisteredInputs(): readonly SemanticRuntimeProjectInputRead[] {
    return [...this.readsByKey.values()].sort((left, right) => left.readKey.localeCompare(right.readKey));
  }

  observe(read: SemanticRuntimeProjectInputRead): void {
    this.readsByKey.set(read.readKey, read);
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

  readFile(fileName: string): string | undefined {
    const hostPath = resolveProjectInputPath(fileName);
    return this.read(
      SemanticRuntimeProjectInputReadKind.FileContent,
      projectInputPathKey(hostPath),
      () => this.authority.readLiveFile(hostPath),
    ) as string | undefined;
  }

  fileExists(fileName: string): boolean {
    const hostPath = resolveProjectInputPath(fileName);
    return this.read(
      SemanticRuntimeProjectInputReadKind.FileExistence,
      projectInputPathKey(hostPath),
      () => this.authority.liveFileExists(hostPath),
    ) as boolean;
  }

  readDirectory(directoryName: string): readonly string[] {
    const hostPath = resolveProjectInputPath(directoryName);
    return this.read(
      SemanticRuntimeProjectInputReadKind.DirectoryEntries,
      projectInputPathKey(hostPath),
      () => this.authority.readLiveDirectory(hostPath),
    ) as readonly string[];
  }

  directoryExists(directoryName: string): boolean {
    const hostPath = resolveProjectInputPath(directoryName);
    return this.read(
      SemanticRuntimeProjectInputReadKind.DirectoryExistence,
      projectInputPathKey(hostPath),
      () => this.authority.liveDirectoryExists(hostPath),
    ) as boolean;
  }

  realpath(fileName: string): string {
    const hostPath = resolveProjectInputPath(fileName);
    return this.read(
      SemanticRuntimeProjectInputReadKind.Realpath,
      projectInputPathKey(hostPath),
      () => this.authority.readLiveRealpath(hostPath),
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
    return this.read(
      SemanticRuntimeProjectInputReadKind.MatchedFiles,
      requestKey,
      () => this.authority.matchLiveFiles(hostPath, extensions, excludes, includes, depth),
    ) as readonly string[];
  }

  readAll(): readonly SemanticRuntimeProjectInputRead[] {
    return [...this.readsByKey.values()].sort((left, right) => left.readKey.localeCompare(right.readKey));
  }

  validateAll(): readonly ComputationReadValidation[] {
    return this.readAll().map((read) => read.validate());
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
      read = new SemanticRuntimeProjectInputRead(this.authority, kind, readKey, readCurrent, value);
      this.readsByKey.set(readKey, read);
    }
    this.generation.observeScopedRead(read);
    this.observeRead?.(read);
    return this.valuesByReadKey.get(readKey);
  }
}

/** Coarse event-sequence identity without the generation's cumulative exact-read validation. */
class SemanticRuntimeProjectInputGenerationIdentityRead implements ComputationRead {
  readonly domain = 'project-input-generation-identity';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(private readonly generation: SemanticRuntimeProjectInputGeneration) {
    this.readKey = `project-input-generation-identity:${generation.projectKey}`;
    this.observedRevision = generation.revision;
  }

  validate(): ComputationReadValidation {
    const isCurrent = this.generation.isCurrent();
    return {
      isCurrent,
      currentRevision: isCurrent
        ? this.observedRevision
        : this.generation.currentAuthorityRevision(),
      changedFacets: isCurrent ? [] : ['generation'],
    };
  }
}

/** One current immutable source/config host generation for a booted project. */
export class SemanticRuntimeProjectInputGeneration implements ComputationRead, GenerationAuthority {
  readonly domain = 'project-input-generation';
  readonly readKey: string;
  readonly observedRevision: string;
  readonly host: SemanticRuntimeProjectInputHost;
  private readonly capturedHost: CapturedSemanticRuntimeProjectInputHost;
  private readonly identityRead: ComputationRead;
  private readonly activeReadScopes: SemanticRuntimeProjectInputReadScope[] = [];

  constructor(
    private readonly authority: SemanticRuntimeProjectInputAuthority,
    readonly projectKey: string,
    readonly rootDir: string,
    readonly eventSequence: number,
    readonly ordinal: number,
  ) {
    this.readKey = `project-input-generation:${projectKey}`;
    this.observedRevision = `${projectKey}@${eventSequence}.${ordinal}`;
    this.capturedHost = new CapturedSemanticRuntimeProjectInputHost(this, authority);
    this.host = this.capturedHost;
    this.identityRead = new SemanticRuntimeProjectInputGenerationIdentityRead(this);
  }

  get revision(): string {
    return this.observedRevision;
  }

  isCurrent(): boolean {
    return this.authority.isCurrent(this);
  }

  requireCurrent(): void {
    if (!this.isCurrent()) {
      throw new Error(`Project-input generation ${this.revision} is no longer current.`);
    }
  }

  validate(): ComputationReadValidation {
    if (!this.isCurrent()) {
      return {
        isCurrent: false,
        currentRevision: this.authority.currentRevision(this.projectKey),
        changedFacets: ['generation'],
      };
    }
    const invalidReads = this.capturedHost.validateAll().filter((validation) => !validation.isCurrent);
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
    return new SemanticRuntimeProjectInputReadScope(
      this,
      key,
      (observeRead) => this.capturedHost.withObserver(observeRead),
    );
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

  /** Read only explicit event/generation identity, excluding the cumulative host-read ledger. */
  readIdentity(): ComputationRead {
    return this.identityRead;
  }

  /** Current authority revision used by the identity read without exposing the authority itself. */
  currentAuthorityRevision(): string {
    return this.authority.currentRevision(this.projectKey);
  }

  /** Read the live effective file value when validating an exact source snapshot. */
  readCurrentFile(fileName: string): string | undefined {
    return this.authority.readLiveFile(resolveProjectInputPath(fileName));
  }

  /** Read live effective existence when validating an exact source snapshot. */
  currentFileExists(fileName: string): boolean {
    return this.authority.liveFileExists(resolveProjectInputPath(fileName));
  }
}

/** Runtime-owned authority for capturing coherent project source/config generations. */
export class SemanticRuntimeProjectInputAuthority {
  private readonly generationsByProjectKey = new Map<string, SemanticRuntimeProjectInputGeneration>();
  private nextGenerationOrdinal = 1;
  private eventSequence = 0;

  constructor(
    private readonly liveHost: SemanticRuntimeProjectInputHost = nodeSemanticRuntimeProjectInputHost,
  ) {}

  /** Synchronously revoke captured generations after an editor/host source event. */
  advance(): number {
    this.eventSequence += 1;
    return this.eventSequence;
  }

  get currentEventSequence(): number {
    return this.eventSequence;
  }

  capture(scope: SemanticRuntimeProjectInputScope): SemanticRuntimeProjectInputGeneration {
    const rootDir = resolveProjectInputPath(scope.rootDir);
    const current = this.generationsByProjectKey.get(scope.projectKey);
    if (
      current != null
      && current.rootDir === rootDir
      && current.eventSequence === this.eventSequence
      && current.validate().isCurrent
    ) {
      return current;
    }
    const generation = new SemanticRuntimeProjectInputGeneration(
      this,
      scope.projectKey,
      rootDir,
      this.eventSequence,
      this.nextGenerationOrdinal++,
    );
    this.generationsByProjectKey.set(scope.projectKey, generation);
    return generation;
  }

  isCurrent(generation: SemanticRuntimeProjectInputGeneration): boolean {
    return generation.eventSequence === this.eventSequence
      && this.generationsByProjectKey.get(generation.projectKey) === generation;
  }

  currentRevision(projectKey: string): string {
    return this.generationsByProjectKey.get(projectKey)?.revision ?? 'absent';
  }

  readLiveFile(fileName: string): string | undefined {
    return this.liveHost.readFile(fileName);
  }

  liveFileExists(fileName: string): boolean {
    return this.liveHost.fileExists(fileName);
  }

  readLiveDirectory(directoryName: string): readonly string[] {
    return this.liveHost.readDirectory(directoryName);
  }

  liveDirectoryExists(directoryName: string): boolean {
    return this.liveHost.directoryExists(directoryName);
  }

  readLiveRealpath(fileName: string): string {
    return this.liveHost.realpath(fileName);
  }

  matchLiveFiles(
    rootDir: string,
    extensions: readonly string[],
    excludes: readonly string[],
    includes: readonly string[],
    depth?: number,
  ): readonly string[] {
    return this.liveHost.matchFiles(rootDir, extensions, excludes, includes, depth);
  }
}

function resolveProjectInputPath(fileName: string): string {
  return path.resolve(fileName).replace(/\\/g, '/');
}

function projectInputPathKey(fileName: string): string {
  return process.platform === 'win32' ? fileName.toLowerCase() : fileName;
}

function freezeProjectInputReadValue(value: ProjectInputReadValue): ProjectInputReadValue {
  return Array.isArray(value) ? Object.freeze([...value]) : value;
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
