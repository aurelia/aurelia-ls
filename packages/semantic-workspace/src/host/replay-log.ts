import { stableHash } from "@aurelia-ls/compiler";
import type {
  HostReplayRecord,
  HostReplayRunExport,
  ReplayableCommandInvocation,
  SemanticAuthorityEnvelope,
} from "./types.js";

interface ReplayAppendArgs {
  readonly sessionId: string;
  readonly runId?: string | null;
  readonly commandId: string;
  readonly invocation: ReplayableCommandInvocation;
  readonly envelope: SemanticAuthorityEnvelope<unknown>;
}

export class HostReplayLog {
  readonly #recordsByRun = new Map<string, HostReplayRecord[]>();
  readonly #runsBySession = new Map<string, string[]>();
  readonly #defaultRunBySession = new Map<string, string>();
  #runSequence = 0;
  #recordSequence = 0;

  startRun(sessionId: string, hint = "run"): string {
    this.#runSequence += 1;
    const runId = `${hint}-${String(this.#runSequence).padStart(4, "0")}`;
    this.#registerRun(sessionId, runId);
    return runId;
  }

  append(args: ReplayAppendArgs): HostReplayRecord {
    const runId = args.runId ?? this.#ensureDefaultRun(args.sessionId);
    this.#registerRun(args.sessionId, runId);

    this.#recordSequence += 1;
    const recordId = `record-${String(this.#recordSequence).padStart(6, "0")}`;
    const inputHash = stableHash({
      command: args.invocation.command,
      args: args.invocation.args,
    });
    const resultHash = hashEnvelopeForReplay(args.envelope);
    const record: HostReplayRecord = {
      recordId,
      runId,
      sessionId: args.sessionId,
      commandId: args.commandId,
      command: args.invocation.command,
      invocation: args.invocation,
      inputHash,
      workspaceFingerprint: args.envelope.meta.workspaceFingerprint ?? null,
      resultHash,
      status: args.envelope.status,
      durationMs: args.envelope.meta.durationMs,
      recordedAtUtc: new Date().toISOString(),
    };
    const key = runKey(args.sessionId, runId);
    const records = this.#recordsByRun.get(key) ?? [];
    records.push(record);
    this.#recordsByRun.set(key, records);
    return record;
  }

  exportRun(sessionId: string, runId?: string): HostReplayRunExport | null {
    const targetRunId = runId ?? this.#latestRun(sessionId);
    if (!targetRunId) return null;
    const key = runKey(sessionId, targetRunId);
    const records = this.#recordsByRun.get(key);
    if (!records || records.length === 0) return null;
    return {
      runId: targetRunId,
      sessionId,
      exportedAtUtc: new Date().toISOString(),
      records: records.slice(),
    };
  }

  listRuns(sessionId: string): readonly string[] {
    const runs = this.#runsBySession.get(sessionId);
    return runs ? runs.slice() : [];
  }

  #ensureDefaultRun(sessionId: string): string {
    const existing = this.#defaultRunBySession.get(sessionId);
    if (existing) return existing;
    const created = this.startRun(sessionId, "default");
    this.#defaultRunBySession.set(sessionId, created);
    return created;
  }

  #latestRun(sessionId: string): string | null {
    const runs = this.#runsBySession.get(sessionId);
    if (!runs || runs.length === 0) return null;
    return runs[runs.length - 1] ?? null;
  }

  #registerRun(sessionId: string, runId: string): void {
    const existing = this.#runsBySession.get(sessionId) ?? [];
    if (!existing.includes(runId)) {
      existing.push(runId);
      this.#runsBySession.set(sessionId, existing);
    }
  }
}

export function hashEnvelopeForReplay(
  envelope: SemanticAuthorityEnvelope<unknown>,
): string {
  const replaySafe = {
    schemaVersion: envelope.schemaVersion,
    command: envelope.command,
    status: envelope.status,
    result: envelope.result,
    policy: envelope.policy,
    epistemic: envelope.epistemic,
    errors: envelope.errors,
    meta: {
      workspaceFingerprint: envelope.meta.workspaceFingerprint ?? null,
      cache: envelope.meta.cache,
      invalidation: envelope.meta.invalidation,
      touchedDocumentCount: envelope.meta.touchedDocumentCount,
    },
  };
  return stableHash(replaySafe);
}

function runKey(sessionId: string, runId: string): string {
  return `${sessionId}::${runId}`;
}
