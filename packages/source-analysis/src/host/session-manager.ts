import {
  createRepoSession,
  type RepoSession,
} from '../repo-session.js';
import type { StructuralClaimGraphRuntime } from '../structural-claim-graph.js';
import {
  SNAPSHOT_KINDS,
  type SnapshotKind,
} from '../snapshots.js';
import type { ParsedTsconfigSourceFileScanResult } from '../tsconfig-source-files.js';
import { resolveSnapshotTarget } from '../snapshot-config.js';
import type {
  SessionOpenArgs,
  SessionStatusEntry,
  SnapshotOutputMap,
} from './types.js';

export interface HostLiveAnalysisState {
  structuralRuntime?: StructuralClaimGraphRuntime;
  sourceFileScan?: ParsedTsconfigSourceFileScanResult;
}

export interface HostSessionState {
  readonly sessionId: string;
  readonly repoPath: string;
  readonly target: string;
  readonly profileId: string;
  readonly profilePath: string | null;
  readonly warmPrograms: boolean;
  readonly session: RepoSession;
  readonly analysisViews: Partial<SnapshotOutputMap>;
  readonly warningsByKind: Partial<Record<SnapshotKind, readonly string[]>>;
  readonly lastRefreshAtByKind: Partial<Record<SnapshotKind, string>>;
  readonly liveAnalysis: HostLiveAnalysisState;
  readonly dirtyKinds: Set<SnapshotKind>;
  readonly dirtyFiles: Set<string>;
  invalidationKind: 'none' | 'files' | 'project';
  invalidationCount: number;
}

export class HostSessionManager {
  readonly #sessions = new Map<string, HostSessionState>();
  #nextSessionId = 1;

  open(args: SessionOpenArgs): HostSessionState {
    const selection = resolveSnapshotTarget({
      target: args.target,
      repoPath: args.repoPath,
      profilePath: args.profilePath,
    });
    const sessionId = args.sessionId?.trim() || `session-${this.#nextSessionId++}`;
    if (this.#sessions.has(sessionId)) {
      throw new Error(`source-analysis host session "${sessionId}" already exists`);
    }

    const session = createRepoSession({
      repoPath: selection.repoPath,
      target: selection.target,
      ...(args.profilePath ? { profilePath: args.profilePath } : {}),
      excludedRepoRelativePrefixes: args.excludedRepoRelativePrefixes,
    });

    const state: HostSessionState = {
      sessionId,
      repoPath: session.repoPath,
      target: selection.target,
      profileId: session.profile.profileId,
      profilePath: session.profile.profilePath,
      warmPrograms: args.warmPrograms ?? true,
      session,
      analysisViews: {},
      warningsByKind: {},
      lastRefreshAtByKind: {},
      liveAnalysis: {},
      dirtyKinds: new Set(SNAPSHOT_KINDS),
      dirtyFiles: new Set(),
      invalidationKind: 'project',
      invalidationCount: 1,
    };

    this.#sessions.set(sessionId, state);
    return state;
  }

  get(sessionId: string): HostSessionState {
    const state = this.#sessions.get(sessionId);
    if (!state) {
      throw new Error(`source-analysis host session "${sessionId}" was not found`);
    }
    return state;
  }

  close(sessionId: string): boolean {
    return this.#sessions.delete(sessionId);
  }

  list(sessionId?: string): readonly HostSessionState[] {
    if (sessionId) {
      return [this.get(sessionId)];
    }
    return [...this.#sessions.values()].sort((left, right) =>
      left.sessionId.localeCompare(right.sessionId),
    );
  }

  findMatching(args: {
    readonly repoPath: string;
    readonly target?: string;
    readonly profilePath?: string;
  }): HostSessionState | undefined {
    const selection = resolveSnapshotTarget({
      repoPath: args.repoPath,
      target: args.target,
      profilePath: args.profilePath,
    });

    return this.list().find((state) =>
      state.repoPath === selection.repoPath
      && state.target === selection.target
      && (state.profilePath ?? null) === (selection.profilePath ?? null),
    );
  }
}

export function toSessionStatusEntry(
  state: HostSessionState,
): SessionStatusEntry {
  return {
    sessionId: state.sessionId,
    repoPath: state.repoPath,
    target: state.target,
    profileId: state.profileId,
    profilePath: state.profilePath,
    warmPrograms: state.warmPrograms,
    dirtyKinds: sortSnapshotKinds(state.dirtyKinds),
    cachedKinds: sortSnapshotKinds(Object.keys(state.analysisViews) as SnapshotKind[]),
    dirtyFiles: [...state.dirtyFiles].sort(),
    lastRefreshAtByKind: { ...state.lastRefreshAtByKind },
  };
}

export function sortSnapshotKinds(
  kinds: Iterable<SnapshotKind>,
): readonly SnapshotKind[] {
  const unique = new Set(kinds);
  return SNAPSHOT_KINDS.filter((kind) => unique.has(kind));
}
