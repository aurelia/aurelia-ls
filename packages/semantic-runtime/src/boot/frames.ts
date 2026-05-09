import type { AddressHandle, EvidenceHandle, ProvenanceHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
import type { SourceDiscoveryOptions } from './source-discovery.js';

/** Input source admitted during boot before Aurelia semantics are interpreted. */
export interface BootSourceFileInput {
  /** Absolute, workspace-relative, or project-relative path supplied by the host or discovery. */
  readonly path: string;
  /** Source language when the host already knows it; discovery can infer a default from source identity. */
  readonly language?: SourceLanguage;
  /** Source role when the host already knows it; discovery can infer a conservative default from source identity. */
  readonly role?: SourceFileRole;
  /** Optional host-facing note explaining why this source was admitted. */
  readonly note?: string | null;
}

/** Boot configuration for one project frame inside a workspace. */
export interface BootProjectInput {
  /** Project root directory. */
  readonly rootDir: string;
  /** Stable enough project key for the active store. */
  readonly projectKey?: string;
  /** Source files supplied by the host; omitted means local discovery. */
  readonly sourceFiles?: readonly BootSourceFileInput[];
  /** Discovery options used when source files are not supplied by the host. */
  readonly sourceDiscoveryOptions?: SourceDiscoveryOptions;
}

/** Boot configuration for one active analysis workspace. */
export interface BootWorkspaceInput {
  /** Workspace root directory. */
  readonly rootDir: string;
  /** Store-local key used for handle minting. */
  readonly storeKey?: string;
  /** Existing store to populate; omitted creates a fresh store. */
  readonly store?: KernelStore;
  /** Project frames to boot; omitted creates one project at the workspace root. */
  readonly projects?: readonly BootProjectInput[];
  /** Project discovery strategy used when `projects` is omitted. */
  readonly projectDiscovery?: BootProjectDiscoveryMode | `${BootProjectDiscoveryMode}`;
}

export const enum BootProjectDiscoveryMode {
  /** Treat the workspace root as the single project frame. */
  SingleRoot = 'single-root',
  /** Discover package/tsconfig roots under the workspace and boot one project per root. */
  PackageTsconfig = 'package-tsconfig',
}

/** Source discovery result before TypeScript or Aurelia semantics are interpreted. */
export class SourceDiscoveryResult {
  constructor(
    /** Root directory that was scanned or attempted. */
    readonly rootDir: string,
    /** Source files admitted by the discovery pass. */
    readonly sourceFiles: readonly BootSourceFileInput[],
    /** Whether the root directory existed when discovery ran. */
    readonly rootExists: boolean,
    /** Whether discovery stopped because it reached the configured file limit. */
    readonly truncated: boolean,
    /** Maximum file count used by discovery; null means no explicit file limit. */
    readonly maxFiles: number | null,
  ) {}
}

/** Kernel handles produced when a source file is admitted into the active analysis world. */
export class SourceFileAdmission {
  constructor(
    /** Project key that admitted the source. */
    readonly projectKey: string,
    /** Normalized project-relative path. */
    readonly path: string,
    /** Inferred or host-supplied source language. */
    readonly language: SourceLanguage,
    /** Inferred or host-supplied source role. */
    readonly role: SourceFileRole,
    /** Source-file address handle. */
    readonly addressHandle: AddressHandle,
    /** Evidence handle that explains why this source is in the world. */
    readonly evidenceHandle: EvidenceHandle,
    /** Provenance handle for the admission record. */
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Booted project frame before TypeScript or Aurelia semantics are interpreted. */
export class ProjectBootFrame {
  constructor(
    /** Workspace root that owns this project frame. */
    readonly workspaceRootDir: string,
    /** Project root directory. */
    readonly rootDir: string,
    /** Store-local project key. */
    readonly projectKey: string,
    /** Source admissions owned by this project frame. */
    readonly sourceFiles: readonly SourceFileAdmission[],
    /** Discovery result when boot discovered sources itself; null when the host supplied sources. */
    readonly sourceDiscovery: SourceDiscoveryResult | null = null,
  ) {}
}

/** Booted workspace frame and the hot kernel store it populated. */
export class WorkspaceBootFrame {
  constructor(
    /** Workspace root directory. */
    readonly rootDir: string,
    /** Store-local workspace key. */
    readonly workspaceKey: string,
    /** Kernel store populated by boot. */
    readonly store: KernelStore,
    /** Project frames admitted into this workspace. */
    readonly projects: readonly ProjectBootFrame[],
  ) {}
}
