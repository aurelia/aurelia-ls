import {
  createSourceAnalysisSession,
  type SourceAnalysisSession,
} from '../session.js';
import { resolveSourceAnalysisTarget } from '../config.js';
import type {
  SessionOpenArgs,
  SessionStatusEntry,
  SourceAnalysisKind,
  SourceAnalysisOutputByKind,
} from './types.js';

export interface SourceAnalysisHostSessionState {
  readonly sessionId: string;
  readonly repoPath: string;
  readonly target: string;
  readonly warmPrograms: boolean;
  readonly session: SourceAnalysisSession;
  readonly snapshots: Partial<SourceAnalysisOutputByKind>;
  readonly warningsByKind: Partial<Record<SourceAnalysisKind, readonly string[]>>;
  readonly lastRefreshAtByKind: Partial<Record<SourceAnalysisKind, string>>;
  readonly dirtyKinds: Set<SourceAnalysisKind>;
  readonly dirtyFiles: Set<string>;
  invalidationKind: 'none' | 'files' | 'project';
  invalidationCount: number;
}

const ALL_KINDS: readonly SourceAnalysisKind[] = ['deps', 'typerefs', 'exports'];

export class SourceAnalysisHostSessionManager {
  readonly #sessions = new Map<string, SourceAnalysisHostSessionState>();
  #nextSessionId = 1;

  open(args: SessionOpenArgs): SourceAnalysisHostSessionState {
    const selection = resolveSourceAnalysisTarget({
      target: args.target,
      repoPath: args.repoPath,
    });
    const sessionId = args.sessionId?.trim() || `session-${this.#nextSessionId++}`;
    if (this.#sessions.has(sessionId)) {
      throw new Error(`source-analysis host session "${sessionId}" already exists`);
    }

    const session = createSourceAnalysisSession({
      repoPath: selection.repoPath,
      target: selection.target,
      excludedRepoRelativePrefixes: args.excludedRepoRelativePrefixes,
    });

    const state: SourceAnalysisHostSessionState = {
      sessionId,
      repoPath: session.repoPath,
      target: selection.target,
      warmPrograms: args.warmPrograms ?? true,
      session,
      snapshots: {},
      warningsByKind: {},
      lastRefreshAtByKind: {},
      dirtyKinds: new Set(ALL_KINDS),
      dirtyFiles: new Set(),
      invalidationKind: 'project',
      invalidationCount: 1,
    };

    this.#sessions.set(sessionId, state);
    return state;
  }

  get(sessionId: string): SourceAnalysisHostSessionState {
    const state = this.#sessions.get(sessionId);
    if (!state) {
      throw new Error(`source-analysis host session "${sessionId}" was not found`);
    }
    return state;
  }

  close(sessionId: string): boolean {
    return this.#sessions.delete(sessionId);
  }

  list(sessionId?: string): readonly SourceAnalysisHostSessionState[] {
    if (sessionId) {
      return [this.get(sessionId)];
    }
    return [...this.#sessions.values()].sort((left, right) =>
      left.sessionId.localeCompare(right.sessionId),
    );
  }
}

export function toSessionStatusEntry(
  state: SourceAnalysisHostSessionState,
): SessionStatusEntry {
  return {
    sessionId: state.sessionId,
    repoPath: state.repoPath,
    target: state.target,
    warmPrograms: state.warmPrograms,
    dirtyKinds: sortKinds(state.dirtyKinds),
    cachedKinds: sortKinds(Object.keys(state.snapshots) as SourceAnalysisKind[]),
    dirtyFiles: [...state.dirtyFiles].sort(),
    lastRefreshAtByKind: { ...state.lastRefreshAtByKind },
  };
}

export function sortKinds(
  kinds: Iterable<SourceAnalysisKind>,
): readonly SourceAnalysisKind[] {
  const unique = new Set(kinds);
  return ALL_KINDS.filter((kind) => unique.has(kind));
}
